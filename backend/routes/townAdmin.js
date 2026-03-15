const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Middleware to check if user is town admin
const requireTownAdmin = (req, res, next) => {
    if (req.user.role !== 'town_admin' && !req.user.is_super_admin) {
        return res.status(403).json({ error: 'Access denied. Town admin role required.' });
    }
    next();
};

// ============ TCC REVIEW ENDPOINTS ============

// Get single TCC application for review
router.get('/tcc-review/:id', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        const applicationId = req.params.id;
        
        console.log(`Fetching TCC application ${applicationId} for town ${townId}`);

        if (!townId) {
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        // First, check if the application exists and belongs to this town
        const appCheck = await pool.query(
            `SELECT ta.id, ta.user_id, ta.status, ta.town_id
             FROM tcc_applications ta
             WHERE ta.id = $1`,
            [applicationId]
        );

        if (appCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (appCheck.rows[0].town_id !== townId) {
            return res.status(403).json({ error: 'Application does not belong to your town' });
        }

        // Get full application details
        const application = await pool.query(
            `SELECT 
                ta.id,
                ta.status,
                ta.submitted_at,
                ta.reviewed_at,
                ta.rejection_reason,
                u.id as user_id,
                u.full_name as taxpayer_name,
                u.tin,
                u.email,
                u.phone,
                u.business_name,
                u.last_year_tax_amount,
                COALESCE(tr.has_filed_returns, false) as has_filed_returns,
                COALESCE(tr.has_paid_taxes, false) as has_paid_taxes,
                COALESCE(tr.outstanding_balance, 0) as outstanding_balance,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE user_id = u.id 
                    AND payment_status = 'completed'
                ), 0) as total_tax_paid,
                reviewer.full_name as reviewed_by_name
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             LEFT JOIN taxpayer_records tr ON u.tin = tr.tin
             LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
             WHERE ta.id = $1`,
            [applicationId]
        );

        // Get payment history for this taxpayer
        const paymentHistory = await pool.query(
            `SELECT 
                tp.id,
                tp.paid_amount,
                tp.declared_amount,
                tp.payment_status,
                tp.created_at,
                tp.payment_date,
                COALESCE(tt.name, 'Unknown') as tax_type_name
             FROM tax_payments tp
             LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
             WHERE tp.user_id = $1
             ORDER BY tp.created_at DESC
             LIMIT 10`,
            [appCheck.rows[0].user_id]
        );

        res.json({
            application: application.rows[0],
            payment_history: paymentHistory.rows
        });

    } catch (error) {
        console.error('Get TCC review error:', error);
        res.status(500).json({ error: 'Failed to fetch application details: ' + error.message });
    }
});

// Approve TCC application
// Approve TCC application - UPDATED with better compliance logic
// Approve TCC application - FIXED VERSION with better error handling
router.post('/tcc-review/:id/approve', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { staff_notes } = req.body;
        const townId = req.user.town_id;
        const applicationId = req.params.id;
        
        console.log(`Approving TCC application ${applicationId} for town ${townId}`);

        if (!townId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        // Get application details
        const application = await client.query(
            `SELECT ta.*, u.tin, u.full_name, u.business_name, u.email, u.id as user_id
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.id = $1 AND ta.town_id = $2`,
            [applicationId, townId]
        );

        if (application.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Application not found or not assigned to your town' });
        }

        const appData = application.rows[0];

        // Check if already processed
        if (appData.status !== 'Submitted') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Application already ${appData.status}` });
        }

        // Check if taxpayer has any payment (either completed or under review)
        const paymentCheck = await client.query(
            `SELECT 
                COUNT(*) as payment_count,
                COUNT(*) FILTER (WHERE payment_status = 'completed') as completed_count,
                COUNT(*) FILTER (WHERE payment_status = 'under_review') as pending_count
             FROM tax_payments 
             WHERE user_id = $1`,
            [appData.user_id]
        );

        const hasAnyPayment = paymentCheck.rows[0].payment_count > 0;
        
        console.log('Payment check:', {
            hasAnyPayment,
            completed: paymentCheck.rows[0].completed_count,
            pending: paymentCheck.rows[0].pending_count
        });

        if (!hasAnyPayment) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Taxpayer has no payment records. They need to make a tax payment first.'
            });
        }

        // Check or create taxpayer record
        let compliance = await client.query(
            'SELECT * FROM taxpayer_records WHERE tin = $1',
            [appData.tin]
        );

        if (compliance.rows.length === 0) {
            // Create compliant record
            await client.query(
                `INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance) 
                 VALUES ($1, true, true, 0)`,
                [appData.tin]
            );
        } else {
            // Update existing record to be compliant
            await client.query(
                `UPDATE taxpayer_records 
                 SET has_filed_returns = true,
                     has_paid_taxes = true,
                     outstanding_balance = 0,
                     last_updated = CURRENT_TIMESTAMP
                 WHERE tin = $1`,
                [appData.tin]
            );
        }

        // Update application status
        const updateResult = await client.query(
            `UPDATE tcc_applications 
             SET status = 'Approved', 
                 reviewed_by = $1, 
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = NULL
             WHERE id = $2
             RETURNING *`,
            [req.user.user_id, applicationId]
        );

        console.log('Application updated:', updateResult.rows[0]);

        // Generate TCC number
        const tccNumber = `TCC-${new Date().getFullYear()}-${String(applicationId).padStart(6, '0')}`;
        const issueDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        // Create issued certificate
        const certificate = await client.query(
            `INSERT INTO issued_certificates 
             (application_id, tcc_number, issue_date, expiry_date, issued_by) 
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [applicationId, tccNumber, issueDate, expiryDate, req.user.user_id]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Approved TCC application for TIN: ${appData.tin}`, 'tcc_application', applicationId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'TCC application approved successfully',
            certificate: certificate.rows[0],
            tcc_number: tccNumber
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Approve TCC error:', error);
        res.status(500).json({ error: 'Failed to approve TCC application: ' + error.message });
    } finally {
        client.release();
    }
});
// Reject TCC application
router.post('/tcc-review/:id/reject', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { staff_notes } = req.body;
        const townId = req.user.town_id;
        const applicationId = req.params.id;
        
        console.log(`Rejecting TCC application ${applicationId} for town ${townId}`);

        if (!townId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        if (!staff_notes || staff_notes.trim() === '') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Get application details
        const application = await client.query(
            `SELECT ta.*, u.tin
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.id = $1 AND ta.town_id = $2`,
            [applicationId, townId]
        );

        if (application.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Application not found or not assigned to your town' });
        }

        const appData = application.rows[0];

        // Check if already processed
        if (appData.status !== 'Submitted') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Application already ${appData.status}` });
        }

        // Update application status
        await client.query(
            `UPDATE tcc_applications 
             SET status = 'Rejected', 
                 reviewed_by = $1, 
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = $2
             WHERE id = $3`,
            [req.user.user_id, staff_notes, applicationId]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Rejected TCC application for TIN: ${appData.tin}`, 'tcc_application', applicationId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'TCC application rejected successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Reject TCC error:', error);
        res.status(500).json({ error: 'Failed to reject TCC application: ' + error.message });
    } finally {
        client.release();
    }
});

// ============ DASHBOARD STATS ENDPOINTS ============

// Get town admin dashboard stats
router.get('/stats', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        
        console.log('Fetching stats for town admin:', req.user.user_id, 'town_id:', townId);

        if (!townId) {
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        // Get monthly target from user's tax_target
        const targetResult = await pool.query(
            'SELECT tax_target FROM users WHERE id = $1',
            [req.user.user_id]
        );
        
        // Get monthly collection
        const collectionResult = await pool.query(
            `SELECT COALESCE(SUM(paid_amount), 0) as total 
             FROM tax_payments 
             WHERE town_id = $1 
             AND payment_status = 'completed'
             AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
            [townId]
        );
        
        // Get pending receipts count
        const pendingReceiptsResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM tax_payments 
             WHERE town_id = $1 
             AND payment_status = 'under_review'`,
            [townId]
        );
        
        // Get pending TCC count
        const pendingTCCResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM tcc_applications 
             WHERE town_id = $1 
             AND status = 'Submitted'`,
            [townId]
        );
        
        // Get taxpayer count
        const taxpayerResult = await pool.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE last_login > CURRENT_DATE - INTERVAL '30 days') as active
             FROM users 
             WHERE role = 'taxpayer' AND town_id = $1`,
            [townId]
        );
        
        const monthlyTarget = parseFloat(targetResult.rows[0]?.tax_target || 0);
        const monthlyCollected = parseFloat(collectionResult.rows[0]?.total || 0);
        const targetPercentage = monthlyTarget > 0 ? (monthlyCollected / monthlyTarget) * 100 : 0;
        
        // Get last month's collection for growth calculation
        const lastMonthResult = await pool.query(
            `SELECT COALESCE(SUM(paid_amount), 0) as total 
             FROM tax_payments 
             WHERE town_id = $1 
             AND payment_status = 'completed'
             AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
             AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
            [townId]
        );
        
        const lastMonthCollected = parseFloat(lastMonthResult.rows[0]?.total || 0);
        const monthlyGrowth = lastMonthCollected > 0 
            ? ((monthlyCollected - lastMonthCollected) / lastMonthCollected) * 100 
            : 0;
        
        const stats = {
            monthly_target: monthlyTarget,
            monthly_collected: monthlyCollected,
            target_percentage: Math.round(targetPercentage * 100) / 100,
            monthly_growth: Math.round(monthlyGrowth * 100) / 100,
            pending_reviews: (parseInt(pendingReceiptsResult.rows[0]?.count || 0) + parseInt(pendingTCCResult.rows[0]?.count || 0)),
            pending_receipts: parseInt(pendingReceiptsResult.rows[0]?.count || 0),
            pending_tcc: parseInt(pendingTCCResult.rows[0]?.count || 0),
            total_taxpayers: parseInt(taxpayerResult.rows[0]?.total || 0),
            active_taxpayers: parseInt(taxpayerResult.rows[0]?.active || 0)
        };
        
        console.log('Stats fetched successfully:', stats);
        res.json(stats);

    } catch (error) {
        console.error('Town admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats: ' + error.message });
    }
});
// Debug endpoint to check payments
router.get('/debug/payments', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        
        // Get all pending payments
        const pending = await pool.query(
            `SELECT 
                tp.id,
                u.full_name,
                u.email,
                tp.payment_status,
                tp.created_at,
                tp.town_id
             FROM tax_payments tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.town_id = $1 AND tp.payment_status = 'under_review'
             ORDER BY tp.created_at DESC`,
            [townId]
        );
        
        // Get all payments (including non-pending)
        const all = await pool.query(
            `SELECT 
                tp.id,
                u.full_name,
                tp.payment_status,
                tp.created_at,
                tp.town_id
             FROM tax_payments tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.town_id = $1
             ORDER BY tp.created_at DESC
             LIMIT 10`,
            [townId]
        );
        
        // Get town admin info
        const admin = await pool.query(
            'SELECT id, full_name, email, town_id FROM users WHERE id = $1',
            [req.user.user_id]
        );
        
        res.json({
            town_admin: admin.rows[0],
            town_id: townId,
            pending_count: pending.rows.length,
            pending_payments: pending.rows,
            recent_payments: all.rows
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get pending receipts for town admin
// Get pending receipts for town admin - FIXED VERSION
// Get pending receipts for town admin - ENHANCED VERSION
// Get pending receipts for town admin - ENHANCED VERSION WITH DEBUGGING
router.get('/pending-receipts', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        
        console.log(`🔍 Town Admin ${req.user.user_id} fetching pending receipts for town ID: ${townId}`);

        if (!townId) {
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        // First, check if there are ANY payments for this town
        const countCheck = await pool.query(
            'SELECT COUNT(*) as total FROM tax_payments WHERE town_id = $1',
            [townId]
        );
        
        console.log(`📊 Total payments for town ${townId}: ${countCheck.rows[0].total}`);

        // Get pending receipts
        const receipts = await pool.query(
            `SELECT 
                tp.id,
                tp.user_id,
                tp.declared_amount as amount,
                tp.payment_status as status,
                tp.created_at,
                tp.receipt_file_path,
                tp.account_number,
                u.full_name as taxpayer_name,
                u.tin,
                u.email as taxpayer_email,
                u.phone,
                COALESCE(tt.name, 'Unknown') as tax_type_name,
                pm.name as payment_method_name
             FROM tax_payments tp
             JOIN users u ON tp.user_id = u.id
             LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
             LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
             WHERE tp.town_id = $1 
             AND tp.payment_status = 'under_review'
             ORDER BY tp.created_at DESC`,
            [townId]
        );
        
        console.log(`📋 Found ${receipts.rows.length} pending receipts for town ${townId}`);
        
        // If no pending receipts, check if there are ANY receipts at all
        if (receipts.rows.length === 0) {
            const anyReceipts = await pool.query(
                `SELECT 
                    tp.id,
                    tp.payment_status,
                    tp.created_at,
                    u.full_name
                 FROM tax_payments tp
                 JOIN users u ON tp.user_id = u.id
                 WHERE tp.town_id = $1
                 ORDER BY tp.created_at DESC
                 LIMIT 5`,
                [townId]
            );
            
            console.log('📜 Recent non-pending receipts:', anyReceipts.rows);
        }
        
        res.json({ receipts: receipts.rows });

    } catch (error) {
        console.error('❌ Pending receipts error:', error);
        res.status(500).json({ error: 'Failed to fetch pending receipts: ' + error.message });
    }
});

// Get receipt details for review
router.get('/receipt-review/:id', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        const paymentId = req.params.id;

        console.log(`🔍 Town Admin fetching receipt ${paymentId} for town ${townId}`);

        const payment = await pool.query(
            `SELECT 
                tp.id,
                tp.declared_amount as amount,
                tp.payment_status,
                tp.created_at,
                tp.receipt_file_path,
                tp.account_number,
                tp.staff_decision,
                tp.staff_notes,
                tp.reviewed_at,
                u.id as taxpayer_id,
                u.full_name as taxpayer_name,
                u.tin,
                u.email,
                u.phone,
                u.business_name,
                tt.name as tax_type_name,
                pm.name as payment_method_name,
                reviewer.full_name as reviewed_by_name
             FROM tax_payments tp
             JOIN users u ON tp.user_id = u.id
             LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
             LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
             LEFT JOIN users reviewer ON tp.reviewed_by = reviewer.id
             WHERE tp.id = $1 AND tp.town_id = $2`,
            [paymentId, townId]
        );

        if (payment.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found or not assigned to your town' });
        }

        res.json({ payment: payment.rows[0] });

    } catch (error) {
        console.error('❌ Get receipt review error:', error);
        res.status(500).json({ error: 'Failed to fetch receipt details: ' + error.message });
    }
});
router.get('/tax-categories', auth, requireTownAdmin, async (req, res) => {
    try {
        const categories = await pool.query(
            `SELECT * FROM tax_categories 
             WHERE town_id = $1 AND is_active = true 
             ORDER BY category_code`,
            [req.user.town_id]
        );
        res.json({ categories: categories.rows });
    } catch (error) {
        console.error('Get tax categories error:', error);
        res.status(500).json({ error: 'Failed to fetch tax categories' });
    }
});

// Create new tax category
router.post('/tax-categories', auth, requireTownAdmin, async (req, res) => {
    try {
        const { 
            category_code, category_name, category_name_am, 
            category_name_om, category_name_so, description 
        } = req.body;

        // Check if category code already exists in this town
        const existing = await pool.query(
            'SELECT id FROM tax_categories WHERE town_id = $1 AND category_code = $2',
            [req.user.town_id, category_code]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Category code already exists' });
        }

        const newCategory = await pool.query(
            `INSERT INTO tax_categories 
             (town_id, category_code, category_name, category_name_am, 
              category_name_om, category_name_so, description, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [req.user.town_id, category_code, category_name, category_name_am,
             category_name_om, category_name_so, description, req.user.user_id]
        );

        res.json({ 
            success: true, 
            message: 'Category created successfully',
            category: newCategory.rows[0] 
        });
    } catch (error) {
        console.error('Create tax category error:', error);
        res.status(500).json({ error: 'Failed to create tax category' });
    }
});

// ========== TAX TYPES ==========

// Get all tax types for the town
router.get('/tax-types', auth, requireTownAdmin, async (req, res) => {
    try {
        const taxTypes = await pool.query(
            `SELECT tt.*, tc.category_code, tc.category_name 
             FROM tax_types_town tt
             JOIN tax_categories tc ON tt.category_id = tc.id
             WHERE tt.town_id = $1
             ORDER BY tt.created_at DESC`,
            [req.user.town_id]
        );
        res.json({ tax_types: taxTypes.rows });
    } catch (error) {
        console.error('Get tax types error:', error);
        res.status(500).json({ error: 'Failed to fetch tax types' });
    }
});

// Create new tax type
router.post('/tax-types', auth, requireTownAdmin, async (req, res) => {
    try {
        const {
            category_id, tax_code, tax_name, tax_name_am, tax_name_om, tax_name_so,
            description, calculation_type, fixed_amount, percentage_rate,
            minimum_tax, applicable_to, effective_from
        } = req.body;

        // Check if tax code already exists
        const existing = await pool.query(
            'SELECT id FROM tax_types_town WHERE town_id = $1 AND tax_code = $2',
            [req.user.town_id, tax_code]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Tax code already exists' });
        }

        const newTaxType = await pool.query(
            `INSERT INTO tax_types_town 
             (town_id, category_id, tax_code, tax_name, tax_name_am, tax_name_om, tax_name_so,
              description, calculation_type, fixed_amount, percentage_rate,
              minimum_tax, applicable_to, effective_from, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [req.user.town_id, category_id, tax_code, tax_name, tax_name_am, tax_name_om, tax_name_so,
             description, calculation_type, fixed_amount, percentage_rate,
             minimum_tax, applicable_to, effective_from, req.user.user_id]
        );

        res.json({ 
            success: true, 
            message: 'Tax type created successfully',
            tax_type: newTaxType.rows[0] 
        });
    } catch (error) {
        console.error('Create tax type error:', error);
        res.status(500).json({ error: 'Failed to create tax type' });
    }
});

// ========== TAXPAYERS ==========

// Get all taxpayers in the town
router.get('/taxpayers', auth, requireTownAdmin, async (req, res) => {
    try {
        const taxpayers = await pool.query(
            `SELECT 
                u.id, u.full_name, u.business_name, u.tin, u.email, u.phone,
                u.created_at, u.is_active,
                bt.assigned_category, bt.is_approved, 
                tt.tax_name as tax_type_name,
                tt.id as tax_type_id
             FROM users u
             LEFT JOIN business_tax_profiles bt ON u.id = bt.user_id
             LEFT JOIN tax_types_town tt ON bt.tax_type_id = tt.id
             WHERE u.role = 'taxpayer' AND u.town_id = $1
             ORDER BY u.created_at DESC`,
            [req.user.town_id]
        );
        res.json({ taxpayers: taxpayers.rows });
    } catch (error) {
        console.error('Get taxpayers error:', error);
        res.status(500).json({ error: 'Failed to fetch taxpayers' });
    }
});

// Assign category to taxpayer
router.post('/assign-category/:userId', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { userId } = req.params;
        const { tax_type_id, assigned_category, notes } = req.body;

        // Verify taxpayer belongs to this town
        const taxpayer = await client.query(
            'SELECT id FROM users WHERE id = $1 AND town_id = $2 AND role = $3',
            [userId, req.user.town_id, 'taxpayer']
        );

        if (taxpayer.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Taxpayer not found in your town' });
        }

        // Check if profile exists
        const existing = await client.query(
            'SELECT id FROM business_tax_profiles WHERE user_id = $1',
            [userId]
        );

        if (existing.rows.length > 0) {
            // Update existing profile
            await client.query(
                `UPDATE business_tax_profiles 
                 SET tax_type_id = $1, assigned_category = $2, assigned_by = $3, 
                     assigned_at = CURRENT_TIMESTAMP, is_approved = true,
                     notes = $4
                 WHERE user_id = $5`,
                [tax_type_id, assigned_category, req.user.user_id, notes, userId]
            );
        } else {
            // Create new profile
            await client.query(
                `INSERT INTO business_tax_profiles 
                 (user_id, town_id, tax_type_id, assigned_category, assigned_by, 
                  assigned_at, is_approved, notes)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, true, $6)`,
                [userId, req.user.town_id, tax_type_id, assigned_category, 
                 req.user.user_id, notes]
            );
        }

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            message: 'Category assigned successfully' 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Assign category error:', error);
        res.status(500).json({ error: 'Failed to assign category' });
    } finally {
        client.release();
    }
});

// ========== UNPAID TAXES ==========

// Get unpaid taxes for the town
router.get('/unpaid-taxes', auth, requireTownAdmin, async (req, res) => {
    try {
        const unpaid = await pool.query(
            `SELECT 
                ut.*,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                tt.tax_name as tax_type_name
             FROM unpaid_taxes ut
             JOIN users u ON ut.user_id = u.id
             JOIN tax_types_town tt ON ut.tax_type_id = tt.id
             WHERE u.town_id = $1 AND ut.status IN ('unpaid', 'overdue')
             ORDER BY ut.due_date ASC`,
            [req.user.town_id]
        );
        res.json({ unpaid_taxes: unpaid.rows });
    } catch (error) {
        console.error('Get unpaid taxes error:', error);
        res.status(500).json({ error: 'Failed to fetch unpaid taxes' });
    }
});

// Send reminder for unpaid tax
router.post('/send-reminder/:unpaidId', auth, requireTownAdmin, async (req, res) => {
    try {
        const { unpaidId } = req.params;

        await pool.query(
            `UPDATE unpaid_taxes 
             SET reminder_sent = true, reminder_sent_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [unpaidId]
        );

        res.json({ 
            success: true, 
            message: 'Reminder sent successfully' 
        });
    } catch (error) {
        console.error('Send reminder error:', error);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});

// ========== DASHBOARD STATS ==========

// Get dashboard statistics
router.get('/stats', auth, requireTownAdmin, async (req, res) => {
    try {
        const stats = await pool.query(
            `SELECT 
                (SELECT COUNT(*) FROM tax_types_town WHERE town_id = $1) as total_tax_types,
                (SELECT COUNT(*) FROM tax_categories WHERE town_id = $1) as total_categories,
                (SELECT COUNT(*) FROM users WHERE town_id = $1 AND role = 'taxpayer') as total_taxpayers,
                (SELECT COUNT(*) FROM users WHERE town_id = $1 AND role = 'taxpayer' AND 
                    EXISTS (SELECT 1 FROM business_tax_profiles WHERE user_id = users.id AND is_approved = true)) as approved_taxpayers,
                (SELECT COUNT(*) FROM unpaid_taxes ut 
                 JOIN users u ON ut.user_id = u.id 
                 WHERE u.town_id = $1 AND ut.status = 'unpaid') as unpaid_count,
                COALESCE((
                    SELECT SUM(amount) FROM unpaid_taxes ut 
                    JOIN users u ON ut.user_id = u.id 
                    WHERE u.town_id = $1
                ), 0) as total_unpaid_amount
             FROM (SELECT 1) as dummy`,
            [req.user.town_id]
        );

        res.json({ stats: stats.rows[0] });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
// ========== PENDING VERIFICATIONS ==========

// Get pending taxpayer verifications
router.get('/pending-verifications', auth, requireTownAdmin, async (req, res) => {
    console.log('📋 Fetching pending verifications for town:', req.user.town_id);
    
    try {
        const pendingVerifications = await pool.query(
            `SELECT 
                tp.id,
                tp.user_id,
                tp.last_year_income,
                tp.last_year_tax_paid,
                tp.business_start_date,
                tp.employee_count,
                tp.business_type,
                tp.tax_certificate_path,
                tp.business_license_path,
                tp.financial_statement_path,
                tp.verification_status,
                tp.confidence_score,
                tp.created_at,
                u.full_name,
                u.business_name,
                u.email,
                u.phone,
                u.tin,
                tc.category_code,
                tc.category_name
             FROM taxpayer_profiles tp
             JOIN users u ON tp.user_id = u.id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             WHERE tp.verification_status = 'pending' 
             AND u.town_id = $1
             ORDER BY tp.created_at ASC`,
            [req.user.town_id]
        );

        console.log(`✅ Found ${pendingVerifications.rows.length} pending verifications`);

        res.json({ 
            success: true,
            pending: pendingVerifications.rows 
        });

    } catch (error) {
        console.error('❌ Error fetching pending verifications:', error);
        res.status(500).json({ 
            error: 'Failed to fetch pending verifications',
            details: error.message 
        });
    }
});

// Verify taxpayer profile (DEBUG VERSION)
router.post('/verify-profile/:profileId', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        console.log('='.repeat(50));
        console.log('🔍 VERIFY PROFILE DEBUG');
        console.log('='.repeat(50));
        
        const { profileId } = req.params;
        const { status, notes, override_category } = req.body;

        console.log('📋 Request params:', { profileId, status, notes, override_category });
        console.log('👤 Admin ID:', req.user.user_id);
        console.log('🏛️ Admin Town ID:', req.user.town_id);

        // Step 1: Check if profile exists
        console.log('\n📌 Step 1: Checking profile existence...');
        const profile = await client.query(
            `SELECT tp.*, u.town_id, u.id as user_id, u.email, u.business_name 
             FROM taxpayer_profiles tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.id = $1`,
            [profileId]
        );

        if (profile.rows.length === 0) {
            console.log('❌ Profile not found');
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Profile not found' });
        }

        const profileData = profile.rows[0];
        console.log('✅ Profile found:', {
            id: profileData.id,
            user_id: profileData.user_id,
            town_id: profileData.town_id,
            status: profileData.verification_status,
            income: profileData.last_year_income,
            last_year_tax: profileData.last_year_tax_paid
        });

        // Step 2: Verify town authorization
        console.log('\n📌 Step 2: Verifying town authorization...');
        if (profileData.town_id !== req.user.town_id) {
            console.log('❌ Unauthorized: Town mismatch');
            console.log(`   Profile town: ${profileData.town_id}, Admin town: ${req.user.town_id}`);
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Unauthorized to verify this profile' });
        }
        console.log('✅ Town authorization passed');

        // Step 3: Update verification status
        console.log('\n📌 Step 3: Updating verification status...');
        const updateResult = await client.query(
            `UPDATE taxpayer_profiles 
             SET verification_status = $1,
                 verified_by = $2,
                 verified_at = CURRENT_TIMESTAMP,
                 verification_notes = $3,
                 category_id = COALESCE($4, category_id)
             WHERE id = $5
             RETURNING *`,
            [status, req.user.user_id, notes, override_category, profileId]
        );
        console.log('✅ Verification status updated:', updateResult.rows[0]?.verification_status);

        if (status === 'verified') {
            console.log('\n📌 Step 4: Processing verified profile...');

            // Step 4a: Get category details
            console.log('   Step 4a: Getting category details...');
            const categoryId = override_category || profileData.category_id;
            console.log('   Category ID:', categoryId);

            if (!categoryId) {
                console.log('⚠️ No category assigned, using default');
                // You might want to assign a default category here
            }

            const category = await client.query(
                'SELECT * FROM tax_categories WHERE id = $1',
                [categoryId]
            );

            if (category.rows.length > 0) {
                console.log('   Category found:', category.rows[0].category_code);
            } else {
                console.log('⚠️ Category not found, using default calculation');
            }

            // Step 4b: Calculate tax
            console.log('   Step 4b: Calculating tax...');
            const lastYearTax = profileData.last_year_tax_paid || 0;
            let calculatedTax = lastYearTax;

            if (category.rows.length > 0) {
                const cat = category.rows[0];
                if (cat.formula_type === 'percentage_of_last_year') {
                    calculatedTax = lastYearTax * (cat.multiplier || 1.15);
                } else if (cat.formula_type === 'fixed_amount') {
                    calculatedTax = cat.fixed_amount;
                } else if (cat.formula_type === 'mixed') {
                    calculatedTax = Math.max(
                        lastYearTax * (cat.multiplier || 1.1),
                        cat.fixed_amount || 0
                    );
                }
            }
            console.log('   Calculated tax:', calculatedTax);

            // Step 4c: Create annual tax calculation
            console.log('   Step 4c: Creating annual tax calculation...');
            const currentYear = new Date().getFullYear();
            
            try {
                await client.query(
                    `INSERT INTO annual_tax_calculations 
                     (user_id, tax_year, category_id, base_income, calculated_tax, final_tax, payment_status)
                     VALUES ($1, $2, $3, $4, $5, $5, 'pending')
                     ON CONFLICT (user_id, tax_year) 
                     DO UPDATE SET
                         category_id = EXCLUDED.category_id,
                         base_income = EXCLUDED.base_income,
                         calculated_tax = EXCLUDED.calculated_tax,
                         final_tax = EXCLUDED.final_tax`,
                    [
                        profileData.user_id, 
                        currentYear, 
                        categoryId, 
                        profileData.last_year_income || 0, 
                        calculatedTax
                    ]
                );
                console.log('   ✅ Annual tax calculation created');
            } catch (err) {
                console.error('   ❌ Error creating annual tax:', err.message);
                throw err;
            }

            // Step 4d: Generate prediction
            console.log('   Step 4d: Generating tax prediction...');
            const predictedTax = calculatedTax * 1.1;
            
            try {
                await client.query(
                    `INSERT INTO tax_predictions 
                     (user_id, prediction_year, predicted_amount, confidence_score, based_on_data)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (user_id, prediction_year) 
                     DO UPDATE SET
                         predicted_amount = EXCLUDED.predicted_amount,
                         confidence_score = EXCLUDED.confidence_score`,
                    [
                        profileData.user_id, 
                        currentYear + 1, 
                        predictedTax, 
                        85, 
                        JSON.stringify({ based_on: 'verified_profile', profile_id: profileId })
                    ]
                );
                console.log('   ✅ Tax prediction created');
            } catch (err) {
                console.error('   ❌ Error creating prediction:', err.message);
                throw err;
            }

            // Step 4e: Update verification queue
            console.log('   Step 4e: Updating verification queue...');
            try {
                await client.query(
                    `UPDATE document_verification_queue 
                     SET status = 'processed',
                         reviewed_at = CURRENT_TIMESTAMP,
                         reviewed_by = $1
                     WHERE profile_id = $2`,
                    [req.user.user_id, profileId]
                );
                console.log('   ✅ Verification queue updated');
            } catch (err) {
                console.log('   ⚠️ No verification queue entry found or error:', err.message);
                // Non-critical, continue
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY');

        res.json({ 
            success: true, 
            message: `Profile ${status} successfully`,
            status: status
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERROR IN VERIFICATION:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        
        res.status(500).json({ 
            error: 'Failed to verify profile',
            details: error.message,
            code: error.code
        });
    } finally {
        client.release();
    }
});
// Approve receipt
router.post('/receipt-review/:id/approve', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { staff_notes } = req.body;
        const townId = req.user.town_id;
        const paymentId = req.params.id;

        console.log(`✅ Town Admin approving receipt ${paymentId}`);

        // Get payment details first
        const payment = await client.query(
            'SELECT user_id, declared_amount FROM tax_payments WHERE id = $1 AND town_id = $2',
            [paymentId, townId]
        );

        if (payment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }

        const { user_id, declared_amount } = payment.rows[0];

        // Update payment status
        await client.query(
            `UPDATE tax_payments 
             SET payment_status = 'completed',
                 paid_amount = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 staff_decision = 'approved',
                 staff_notes = $3,
                 payment_date = CURRENT_TIMESTAMP
             WHERE id = $4 AND town_id = $5`,
            [declared_amount, req.user.user_id, staff_notes, paymentId, townId]
        );

        // Update taxpayer record - mark as having paid taxes
        await client.query(
            `UPDATE taxpayer_records 
             SET has_paid_taxes = true,
                 outstanding_balance = GREATEST(0, outstanding_balance - $1),
                 last_updated = CURRENT_TIMESTAMP
             WHERE tin = (SELECT tin FROM users WHERE id = $2)`,
            [declared_amount, user_id]
        );

        // If no taxpayer record exists, create one
        await client.query(
            `INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance)
             SELECT tin, true, true, 0
             FROM users WHERE id = $1
             ON CONFLICT (tin) DO UPDATE SET
                 has_paid_taxes = true,
                 last_updated = CURRENT_TIMESTAMP`,
            [user_id]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Approved payment receipt for taxpayer ID: ${user_id}`, 'tax_payment', paymentId]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            message: 'Payment approved successfully',
            payment_id: paymentId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Approve receipt error:', error);
        res.status(500).json({ error: 'Failed to approve payment: ' + error.message });
    } finally {
        client.release();
    }
});

// Reject receipt
router.post('/receipt-review/:id/reject', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { staff_notes } = req.body;
        const townId = req.user.town_id;
        const paymentId = req.params.id;

        console.log(`❌ Town Admin rejecting receipt ${paymentId}`);

        if (!staff_notes || staff_notes.trim() === '') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Get payment details
        const payment = await client.query(
            'SELECT user_id FROM tax_payments WHERE id = $1 AND town_id = $2',
            [paymentId, townId]
        );

        if (payment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update payment status
        await client.query(
            `UPDATE tax_payments 
             SET payment_status = 'failed',
                 reviewed_by = $1,
                 reviewed_at = CURRENT_TIMESTAMP,
                 staff_decision = 'rejected',
                 staff_notes = $2
             WHERE id = $3 AND town_id = $4`,
            [req.user.user_id, staff_notes, paymentId, townId]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Rejected payment receipt for taxpayer ID: ${payment.rows[0].user_id}`, 'tax_payment', paymentId]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            message: 'Payment rejected successfully',
            payment_id: paymentId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Reject receipt error:', error);
        res.status(500).json({ error: 'Failed to reject payment: ' + error.message });
    } finally {
        client.release();
    }
});

// Get assigned TCC applications
router.get('/assigned-tcc-applications', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        
        if (!townId) {
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        const applications = await pool.query(
            `SELECT 
                ta.id,
                ta.status,
                ta.submitted_at,
                u.full_name as taxpayer_name,
                u.tin,
                u.business_name,
                u.email,
                u.phone
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.town_id = $1 
             AND ta.status = 'Submitted'
             ORDER BY ta.submitted_at ASC`,
            [townId]
        );
        
        res.json({ applications: applications.rows });

    } catch (error) {
        console.error('Assigned TCC applications error:', error);
        res.status(500).json({ error: 'Failed to fetch assigned TCC applications' });
    }
});

// Get performance metrics
router.get('/performance', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        
        if (!townId) {
            return res.status(400).json({ error: 'Town admin has no town assigned' });
        }

        // Get this month's receipts performance
        const receiptPerformance = await pool.query(
            `SELECT 
                COALESCE(COUNT(*), 0) as total_processed,
                COALESCE(COUNT(*) FILTER (WHERE staff_decision = 'approved'), 0) as approved,
                COALESCE(COUNT(*) FILTER (WHERE staff_decision = 'rejected'), 0) as rejected,
                COALESCE(AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600), 0) as avg_response_time
             FROM tax_payments 
             WHERE reviewed_by = $1 
             AND EXTRACT(MONTH FROM reviewed_at) = EXTRACT(MONTH FROM CURRENT_DATE)`,
            [req.user.user_id]
        );
        
        // Get TCC approvals
        const tccApproved = await pool.query(
            `SELECT COUNT(*) as count 
             FROM tcc_applications 
             WHERE reviewed_by = $1 
             AND status = 'Approved'
             AND EXTRACT(MONTH FROM reviewed_at) = EXTRACT(MONTH FROM CURRENT_DATE)`,
            [req.user.user_id]
        );
        
        const approved = parseInt(receiptPerformance.rows[0]?.approved || 0);
        const rejected = parseInt(receiptPerformance.rows[0]?.rejected || 0);
        const total = approved + rejected;
        const approvalRate = total > 0 ? (approved / total) * 100 : 0;
        const avgResponseTime = parseFloat(receiptPerformance.rows[0]?.avg_response_time || 0);
        
        // Calculate efficiency rate (based on response time target of 24 hours)
        const efficiencyRate = avgResponseTime > 0 
            ? Math.max(0, Math.min(100, 100 - ((avgResponseTime / 24) * 100)))
            : 100;
        
        res.json({
            efficiency_rate: Math.round(efficiencyRate),
            approved_receipts: approved,
            rejected_receipts: rejected,
            approved_tcc: parseInt(tccApproved.rows[0]?.count || 0),
            approval_rate: Math.round(approvalRate),
            avg_response_time: Math.round(avgResponseTime * 10) / 10
        });

    } catch (error) {
        console.error('Performance metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
});
router.get('/tcc-applications', auth, requireTownAdmin, async (req, res) => {
    try {
        const applications = await pool.query(
            `SELECT 
                ta.id,
                ta.application_number,
                ta.purpose,
                ta.notes,
                ta.status,
                ta.submitted_at,
                ta.reviewed_at,
                ta.rejection_reason,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                u.email,
                u.phone,
                tc.category_code,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE user_id = u.id 
                    AND payment_status = 'completed'
                    AND payment_date >= CURRENT_DATE - INTERVAL '1 year'
                ), 0) as total_paid,
                COALESCE((
                    SELECT COUNT(*) FROM tax_payments 
                    WHERE user_id = u.id 
                    AND payment_status = 'completed'
                ), 0) as payment_count
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             LEFT JOIN taxpayer_profiles tp ON u.id = tp.user_id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             WHERE ta.town_id = $1
             ORDER BY 
                CASE ta.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'approved' THEN 2 
                    ELSE 3 
                END,
                ta.submitted_at DESC`,
            [req.user.town_id]
        );

        res.json({ applications: applications.rows });

    } catch (error) {
        console.error('Get TCC applications error:', error);
        res.status(500).json({ error: 'Failed to fetch TCC applications' });
    }
});

// Get single TCC application details
router.get('/tcc-applications/:id', auth, requireTownAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const application = await pool.query(
            `SELECT 
                ta.*,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                u.email,
                u.phone,
                u.town_id,
                t.name as town_name,
                tc.category_code,
                tc.category_name,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', tp.id,
                            'date', tp.payment_date,
                            'amount', tp.paid_amount,
                            'status', tp.payment_status
                        )
                    ) FROM tax_payments tp
                    WHERE tp.user_id = u.id 
                    AND tp.payment_status = 'completed'
                    ORDER BY tp.payment_date DESC
                    LIMIT 10
                ) as payment_history
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             JOIN towns t ON u.town_id = t.id
             LEFT JOIN taxpayer_profiles tp ON u.id = tp.user_id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             WHERE ta.id = $1 AND ta.town_id = $2`,
            [id, req.user.town_id]
        );

        if (application.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ application: application.rows[0] });

    } catch (error) {
        console.error('Get TCC application details error:', error);
        res.status(500).json({ error: 'Failed to fetch application details' });
    }
});
// Get town admin statistics
router.get('/stats', auth, requireTownAdmin, async (req, res) => {
    try {
        const townId = req.user.town_id;
        
        const [taxpayers, pendingVerifications, pendingReceipts, pendingTCC, collections, unpaid] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND town_id = $2', ['taxpayer', townId]),
            pool.query('SELECT COUNT(*) FROM taxpayer_profiles WHERE town_id = $1 AND verification_status = $2', [townId, 'pending']),
            pool.query('SELECT COUNT(*) FROM tax_payments WHERE town_id = $1 AND payment_status = $2', [townId, 'under_review']),
            pool.query('SELECT COUNT(*) FROM tcc_applications WHERE town_id = $1 AND status = $2', [townId, 'pending']),
            pool.query('SELECT COALESCE(SUM(paid_amount), 0) FROM tax_payments WHERE town_id = $1 AND payment_status = $2 AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)', [townId, 'completed']),
            pool.query('SELECT COALESCE(SUM(amount), 0) FROM unpaid_taxes ut JOIN users u ON ut.user_id = u.id WHERE u.town_id = $1', [townId])
        ]);

        res.json({
            totalTaxpayers: parseInt(taxpayers.rows[0].count),
            pendingVerifications: parseInt(pendingVerifications.rows[0].count),
            pendingReceipts: parseInt(pendingReceipts.rows[0].count),
            pendingTCC: parseInt(pendingTCC.rows[0].count),
            collectedThisMonth: parseFloat(collections.rows[0].coalesce || 0),
            monthlyTarget: 5000000, // Example target
            unpaidTaxes: parseFloat(unpaid.rows[0].coalesce || 0)
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get pending receipts
router.get('/pending-receipts', auth, requireTownAdmin, async (req, res) => {
    try {
        const receipts = await pool.query(
            `SELECT 
                tp.id,
                tp.declared_amount as amount,
                tp.payment_status,
                tp.created_at,
                tp.receipt_file_path as receipt_path,
                u.full_name as taxpayer_name,
                u.tin,
                u.business_name,
                pm.name as payment_method_name,
                tt.name as tax_type_name
             FROM tax_payments tp
             JOIN users u ON tp.user_id = u.id
             LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
             LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
             WHERE tp.town_id = $1 AND tp.payment_status = 'under_review'
             ORDER BY tp.created_at ASC`,
            [req.user.town_id]
        );
        res.json({ receipts: receipts.rows });
    } catch (error) {
        console.error('Get pending receipts error:', error);
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

// Verify receipt
router.post('/verify-receipt/:id', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { status, notes } = req.body;

        await client.query(
            `UPDATE tax_payments 
             SET payment_status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 staff_notes = $3
             WHERE id = $4 AND town_id = $5`,
            [status === 'approved' ? 'completed' : 'failed', req.user.user_id, notes, id, req.user.town_id]
        );

        if (status === 'approved') {
            // Update taxpayer compliance
            await client.query(
                `UPDATE taxpayer_records 
                 SET has_paid_taxes = true,
                     outstanding_balance = 0,
                     last_updated = CURRENT_TIMESTAMP
                 WHERE tin = (SELECT tin FROM users WHERE id = (SELECT user_id FROM tax_payments WHERE id = $1))`,
                [id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Receipt ${status}` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Verify receipt error:', error);
        res.status(500).json({ error: 'Failed to verify receipt' });
    } finally {
        client.release();
    }
});

// Get pending TCC applications
router.get('/pending-tcc', auth, requireTownAdmin, async (req, res) => {
    try {
        const applications = await pool.query(
            `SELECT 
                ta.*,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.town_id = $1 AND ta.status = 'pending'
             ORDER BY ta.submitted_at ASC`,
            [req.user.town_id]
        );
        res.json({ applications: applications.rows });
    } catch (error) {
        console.error('Get pending TCC error:', error);
        res.status(500).json({ error: 'Failed to fetch TCC applications' });
    }
});

// Verify TCC application
router.post('/verify-tcc/:id', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { status, notes } = req.body;

        await client.query(
            `UPDATE tcc_applications 
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = $3
             WHERE id = $4 AND town_id = $5`,
            [status, req.user.user_id, notes, id, req.user.town_id]
        );

        if (status === 'approved') {
            // Generate certificate
            const certNumber = `TCC-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
            await client.query(
                `INSERT INTO issued_certificates 
                 (application_id, tcc_number, issue_date, expiry_date, issued_by)
                 VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $3)`,
                [id, certNumber, req.user.user_id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `TCC application ${status}` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Verify TCC error:', error);
        res.status(500).json({ error: 'Failed to process TCC' });
    } finally {
        client.release();
    }
}); 
// Get all tax categories for this town
router.get('/categories', auth, requireTownAdmin, async (req, res) => {
    try {
        const categories = await pool.query(
            `SELECT 
                id,
                category_code,
                category_name,
                category_name_am,
                category_name_om,
                category_name_so,
                min_income,
                max_income,
                formula_type,
                base_rate,
                multiplier,
                fixed_amount,
                requires_review,
                auto_approve_threshold,
                is_active,
                created_at
             FROM tax_categories 
             WHERE town_id = $1 AND is_active = true 
             ORDER BY min_income DESC`,
            [req.user.town_id]
        );

        // Add color property based on category code
        const categoriesWithColor = categories.rows.map(cat => {
            let color = 'primary';
            switch(cat.category_code) {
                case 'A': color = 'danger'; break;
                case 'B': color = 'warning'; break;
                case 'C': color = 'info'; break;
                case 'D': color = 'success'; break;
                case 'E': color = 'secondary'; break;
                default: color = 'primary';
            }
            return { ...cat, color };
        });

        res.json({ categories: categoriesWithColor });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create new tax category
router.post('/categories', auth, requireTownAdmin, async (req, res) => {
    try {
        const {
            category_code,
            category_name,
            category_name_am,
            category_name_om,
            category_name_so,
            min_income,
            max_income,
            formula_type,
            base_rate,
            multiplier,
            fixed_amount,
            requires_review,
            auto_approve_threshold
        } = req.body;

        const newCategory = await pool.query(
            `INSERT INTO tax_categories 
             (town_id, category_code, category_name, category_name_am, category_name_om, category_name_so,
              min_income, max_income, formula_type, base_rate, multiplier, fixed_amount,
              requires_review, auto_approve_threshold, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [req.user.town_id, category_code, category_name, category_name_am, category_name_om, category_name_so,
             min_income, max_income, formula_type, base_rate, multiplier, fixed_amount,
             requires_review, auto_approve_threshold, req.user.user_id]
        );

        res.json({ success: true, category: newCategory.rows[0] });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update tax category
router.put('/categories/:id', auth, requireTownAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_code,
            category_name,
            category_name_am,
            category_name_om,
            category_name_so,
            min_income,
            max_income,
            formula_type,
            base_rate,
            multiplier,
            fixed_amount,
            requires_review,
            auto_approve_threshold,
            is_active
        } = req.body;

        const updatedCategory = await pool.query(
            `UPDATE tax_categories 
             SET category_code = $1,
                 category_name = $2,
                 category_name_am = $3,
                 category_name_om = $4,
                 category_name_so = $5,
                 min_income = $6,
                 max_income = $7,
                 formula_type = $8,
                 base_rate = $9,
                 multiplier = $10,
                 fixed_amount = $11,
                 requires_review = $12,
                 auto_approve_threshold = $13,
                 is_active = $14,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $15 AND town_id = $16
             RETURNING *`,
            [category_code, category_name, category_name_am, category_name_om, category_name_so,
             min_income, max_income, formula_type, base_rate, multiplier, fixed_amount,
             requires_review, auto_approve_threshold, is_active, id, req.user.town_id]
        );

        if (updatedCategory.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ success: true, category: updatedCategory.rows[0] });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category (soft delete)
router.delete('/categories/:id', auth, requireTownAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE tax_categories SET is_active = false WHERE id = $1 AND town_id = $2',
            [id, req.user.town_id]
        );

        res.json({ success: true, message: 'Category deactivated successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});
// Approve TCC application
// Approve TCC application (UPDATED with better certificate generation)
router.post('/tcc-applications/:id/approve', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { notes } = req.body;

        // Check if application exists and belongs to admin's town
        const appCheck = await client.query(
            `SELECT ta.*, u.full_name, u.business_name, u.tin, u.id as user_id
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.id = $1 AND ta.town_id = $2`,
            [id, req.user.town_id]
        );

        if (appCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Application not found' });
        }

        const application = appCheck.rows[0];

        // Update application status
        await client.query(
            `UPDATE tcc_applications 
             SET status = 'approved',
                 reviewed_by = $1,
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = NULL
             WHERE id = $2`,
            [req.user.user_id, id]
        );

        // Check if certificate already exists
        const existingCert = await client.query(
            'SELECT id FROM issued_certificates WHERE application_id = $1',
            [id]
        );

        let certificate = null;

        if (existingCert.rows.length === 0) {
            // Generate certificate number
            const certNumber = `TCC-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
            
            // Create certificate record
            const certResult = await client.query(
                `INSERT INTO issued_certificates 
                 (application_id, tcc_number, issue_date, expiry_date, issued_by)
                 VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $3)
                 RETURNING *`,
                [id, certNumber, req.user.user_id]
            );

            certificate = certResult.rows[0];
            console.log(`Certificate created: ${certNumber} for application ${id}`);
        } else {
            certificate = existingCert.rows[0];
            console.log(`Certificate already exists for application ${id}`);
        }

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Approved TCC application for ${application.business_name || application.full_name}`, 'tcc_application', id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'TCC application approved successfully',
            certificate: certificate
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Approve TCC error:', error);
        res.status(500).json({ error: 'Failed to approve TCC application' });
    } finally {
        client.release();
    }
});

// Reject TCC application
router.post('/tcc-applications/:id/reject', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Check if application exists and belongs to admin's town
        const appCheck = await client.query(
            `SELECT ta.*, u.business_name 
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.id = $1 AND ta.town_id = $2 AND ta.status = 'pending'`,
            [id, req.user.town_id]
        );

        if (appCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pending application not found' });
        }

        // Update application status
        await client.query(
            `UPDATE tcc_applications 
             SET status = 'rejected',
                 reviewed_by = $1,
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = $2
             WHERE id = $3`,
            [req.user.user_id, reason, id]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Rejected TCC application for ${appCheck.rows[0].business_name}`, 'tcc_application', id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'TCC application rejected successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Reject TCC error:', error);
        res.status(500).json({ error: 'Failed to reject TCC application' });
    } finally {
        client.release();
    }
});

// Get TCC statistics for town admin dashboard
router.get('/tcc-statistics', auth, requireTownAdmin, async (req, res) => {
    try {
        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_applications,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_applications,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_applications,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_applications,
                COUNT(*) FILTER (WHERE submitted_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days
             FROM tcc_applications
             WHERE town_id = $1`,
            [req.user.town_id]
        );

        res.json({ stats: stats.rows[0] });

    } catch (error) {
        console.error('Get TCC statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch TCC statistics' });
    }
});
module.exports = router;