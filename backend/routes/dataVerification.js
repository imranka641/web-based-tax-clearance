const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const verificationService = require('../services/verificationService');

// ========== TAXPAYER VERIFICATION ROUTES ==========

// Run comprehensive verification
router.post('/verify', auth, async (req, res) => {
    try {
        const submittedData = req.body;
        
        const results = await verificationService.verifyTaxpayer(
            req.user.user_id,
            submittedData
        );
        
        res.json(results);
        
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get verification status
router.get('/status', auth, async (req, res) => {
    try {
        const status = await pool.query(
            `SELECT * FROM verification_logs 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [req.user.user_id]
        );
        
        res.json({ 
            has_verification: status.rows.length > 0,
            latest: status.rows[0] || null
        });
        
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ error: 'Failed to fetch verification status' });
    }
});

// Get fraud detection score
router.get('/fraud-score', auth, async (req, res) => {
    try {
        const score = await pool.query(
            `SELECT * FROM fraud_detection_scores 
             WHERE user_id = $1 
             ORDER BY calculated_at DESC 
             LIMIT 1`,
            [req.user.user_id]
        );
        
        res.json({ 
            has_score: score.rows.length > 0,
            score: score.rows[0] || null
        });
        
    } catch (error) {
        console.error('Get fraud score error:', error);
        res.status(500).json({ error: 'Failed to fetch fraud score' });
    }
});

// ========== TIN VERIFICATION ==========

// Verify TIN format only
router.post('/verify-tin', auth, async (req, res) => {
    try {
        const { tin } = req.body;
        
        // Format validation
        if (!tin || !/^[0-9]{10}$/.test(tin)) {
            return res.json({
                valid: false,
                message: 'Invalid TIN format - must be exactly 10 digits'
            });
        }
        
        // Simple checksum validation
        const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(tin[i]) * weights[i];
        }
        const remainder = sum % 11;
        const checkDigit = remainder === 10 ? 0 : remainder;
        const isValid = checkDigit === parseInt(tin[9]);
        
        res.json({
            valid: isValid,
            message: isValid ? 'TIN format is valid' : 'TIN checksum validation failed'
        });
        
    } catch (error) {
        console.error('TIN verification error:', error);
        res.status(500).json({ error: 'TIN verification failed' });
    }
});

// ========== ADMIN VERIFICATION ROUTES ==========

// Get all flagged taxpayers (for town admin)
router.get('/admin/flagged', auth, async (req, res) => {
    try {
        // Only allow town admins and above
        if (req.user.role !== 'town_admin' && req.user.role !== 'regional_admin' && !req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        let query = `
            SELECT 
                v.id,
                v.user_id,
                v.verification_status,
                v.confidence_score,
                v.flags,
                v.created_at as verification_date,
                u.full_name,
                u.email,
                u.tin,
                u.role,
                u.region_id,
                u.town_id,
                f.risk_level,
                f.overall_score,
                r.name as region_name,
                t.name as town_name
            FROM verification_logs v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN fraud_detection_scores f ON f.user_id = u.id AND f.calculated_at = (
                SELECT MAX(calculated_at) FROM fraud_detection_scores WHERE user_id = u.id
            )
            LEFT JOIN regions r ON u.region_id = r.id
            LEFT JOIN towns t ON u.town_id = t.id
            WHERE v.verification_status IN ('flagged', 'failed')
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Filter by town for town admins
        if (req.user.role === 'town_admin' && req.user.town_id) {
            query += ` AND u.town_id = $${paramIndex}`;
            params.push(req.user.town_id);
            paramIndex++;
        }
        
        // Filter by region for regional admins
        if (req.user.role === 'regional_admin' && req.user.region_id) {
            query += ` AND u.region_id = $${paramIndex}`;
            params.push(req.user.region_id);
            paramIndex++;
        }
        
        query += ` ORDER BY v.created_at DESC LIMIT 100`;
        
        const result = await pool.query(query, params);
        
        res.json({ 
            flagged_count: result.rows.length,
            flagged_taxpayers: result.rows 
        });
        
    } catch (error) {
        console.error('Get flagged taxpayers error:', error);
        res.status(500).json({ error: 'Failed to fetch flagged taxpayers' });
    }
});

// Get verification details for specific taxpayer
router.get('/admin/taxpayer/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check permissions
        if (req.user.role === 'town_admin' && req.user.town_id) {
            const townCheck = await pool.query(
                'SELECT town_id FROM users WHERE id = $1',
                [userId]
            );
            if (townCheck.rows.length === 0 || townCheck.rows[0].town_id !== req.user.town_id) {
                return res.status(403).json({ error: 'Access denied - taxpayer not in your town' });
            }
        }
        
        if (req.user.role === 'regional_admin' && req.user.region_id) {
            const regionCheck = await pool.query(
                'SELECT region_id FROM users WHERE id = $1',
                [userId]
            );
            if (regionCheck.rows.length === 0 || regionCheck.rows[0].region_id !== req.user.region_id) {
                return res.status(403).json({ error: 'Access denied - taxpayer not in your region' });
            }
        }
        
        // Get all verification logs for this user
        const logs = await pool.query(
            `SELECT * FROM verification_logs 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );
        
        // Get latest fraud score
        const fraudScore = await pool.query(
            `SELECT * FROM fraud_detection_scores 
             WHERE user_id = $1 
             ORDER BY calculated_at DESC 
             LIMIT 1`,
            [userId]
        );
        
        // Get taxpayer info
        const taxpayer = await pool.query(
            `SELECT u.*, r.name as region_name, t.name as town_name
             FROM users u
             LEFT JOIN regions r ON u.region_id = r.id
             LEFT JOIN towns t ON u.town_id = t.id
             WHERE u.id = $1`,
            [userId]
        );
        
        res.json({
            taxpayer: taxpayer.rows[0] || null,
            verification_history: logs.rows,
            fraud_score: fraudScore.rows[0] || null
        });
        
    } catch (error) {
        console.error('Get taxpayer verification error:', error);
        res.status(500).json({ error: 'Failed to fetch verification details' });
    }
});

// Manually verify a flagged taxpayer
router.post('/admin/verify/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { notes, verification_status } = req.body;
        
        // Check permissions (only admins can manually verify)
        if (!['town_admin', 'regional_admin', 'super_admin'].includes(req.user.role) && !req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Update verification log
        await pool.query(
            `UPDATE verification_logs 
             SET verification_status = $1, 
                 verified_by = $2, 
                 verified_at = CURRENT_TIMESTAMP,
                 flags = array_append(flags, $3)
             WHERE user_id = $4 
             AND id = (
                 SELECT id FROM verification_logs 
                 WHERE user_id = $4 
                 ORDER BY created_at DESC 
                 LIMIT 1
             )`,
            [verification_status, req.user.user_id, `Manually verified by admin: ${notes}`, userId]
        );
        
        // Log the action
        await pool.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Manually verified taxpayer ID: ${userId} as ${verification_status}`, 'verification', userId]
        );
        
        res.json({
            success: true,
            message: `Taxpayer verification updated to ${verification_status}`
        });
        
    } catch (error) {
        console.error('Manual verification error:', error);
        res.status(500).json({ error: 'Failed to update verification status' });
    }
});

// Get verification statistics
router.get('/admin/stats', auth, async (req, res) => {
    try {
        if (!['town_admin', 'regional_admin', 'super_admin'].includes(req.user.role) && !req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        let baseQuery = `
            SELECT 
                COUNT(*) as total_verifications,
                COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_count,
                COUNT(*) FILTER (WHERE verification_status = 'flagged') as flagged_count,
                COUNT(*) FILTER (WHERE verification_status = 'failed') as failed_count,
                COUNT(*) FILTER (WHERE verification_status = 'pending') as pending_count,
                AVG(confidence_score) as avg_confidence,
                MAX(confidence_score) as max_confidence,
                MIN(confidence_score) as min_confidence
            FROM verification_logs v
            JOIN users u ON v.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Filter by town for town admins
        if (req.user.role === 'town_admin' && req.user.town_id) {
            baseQuery += ` AND u.town_id = $${paramIndex}`;
            params.push(req.user.town_id);
            paramIndex++;
        }
        
        // Filter by region for regional admins
        if (req.user.role === 'regional_admin' && req.user.region_id) {
            baseQuery += ` AND u.region_id = $${paramIndex}`;
            params.push(req.user.region_id);
            paramIndex++;
        }
        
        const stats = await pool.query(baseQuery, params);
        
        // Get risk distribution
        const riskQuery = `
            SELECT 
                f.risk_level,
                COUNT(*) as count
            FROM fraud_detection_scores f
            JOIN users u ON f.user_id = u.id
            WHERE f.calculated_at = (
                SELECT MAX(calculated_at) FROM fraud_detection_scores fs WHERE fs.user_id = f.user_id
            )
        `;
        
        let riskWhere = '';
        if (req.user.role === 'town_admin' && req.user.town_id) {
            riskWhere = ` AND u.town_id = $1`;
        } else if (req.user.role === 'regional_admin' && req.user.region_id) {
            riskWhere = ` AND u.region_id = $1`;
        }
        
        const riskDistribution = await pool.query(
            riskQuery + riskWhere + ` GROUP BY f.risk_level`,
            params
        );
        
        res.json({
            overview: stats.rows[0],
            risk_distribution: riskDistribution.rows
        });
        
    } catch (error) {
        console.error('Get verification stats error:', error);
        res.status(500).json({ error: 'Failed to fetch verification statistics' });
    }
});

module.exports = router;