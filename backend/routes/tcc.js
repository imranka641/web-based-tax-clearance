const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const router = express.Router();

// Check TCC eligibility
router.get('/tcc-eligibility', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get taxpayer profile
        const profile = await pool.query(
            'SELECT * FROM taxpayer_profiles WHERE user_id = $1',
            [userId]
        );

        if (profile.rows.length === 0) {
            return res.json({
                eligible: false,
                reasons: ['Profile not verified'],
                total_paid: 0,
                outstanding: 0
            });
        }

        // Get payment history for last 12 months
        const payments = await pool.query(
            `SELECT COALESCE(SUM(paid_amount), 0) as total_paid
             FROM tax_payments 
             WHERE user_id = $1 
             AND payment_status = 'completed'
             AND payment_date >= CURRENT_DATE - INTERVAL '1 year'`,
            [userId]
        );

        // Check outstanding balance
        const outstanding = await pool.query(
            'SELECT outstanding_balance FROM taxpayer_records WHERE tin = (SELECT tin FROM users WHERE id = $1)',
            [userId]
        );

        const totalPaid = parseFloat(payments.rows[0]?.total_paid || 0);
        const outstandingBalance = parseFloat(outstanding.rows[0]?.outstanding_balance || 0);

        const reasons = [];
        if (totalPaid === 0) reasons.push('No tax payments found in the last 12 months');
        if (outstandingBalance > 0) reasons.push(`Outstanding balance of ETB ${outstandingBalance.toLocaleString()}`);
        if (profile.rows[0].verification_status !== 'verified') reasons.push('Profile not verified');

        res.json({
            eligible: reasons.length === 0,
            reasons,
            total_paid: totalPaid,
            outstanding: outstandingBalance
        });

    } catch (error) {
        console.error('TCC eligibility error:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
    }
});
// Download certificate PDF with enhanced quality
// Download certificate PDF with enhanced quality
// Download certificate PDF with enhanced quality and stamp
router.get('/download/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`Download request for certificate ID: ${id} from user: ${req.user.user_id}`);

        // Get certificate data with all necessary information including regional admin stamp
        const cert = await pool.query(
            `SELECT 
                ic.id as certificate_id,
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date,
                ic.pdf_data,
                ta.id as application_id,
                ta.purpose,
                ta.submitted_at,
                u.id as user_id,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                u.email,
                u.phone,
                u.region_id,
                t.name as town_name,
                t.id as town_id,
                t.region_id as town_region_id,
                reviewer.full_name as reviewed_by_name,
                reviewer.id as reviewed_by_id,
                -- Get regional admin stamp
                ra.id as regional_admin_id,
                ra.full_name as regional_admin_name,
                ra.stamp_path,
                ra.stamp_approved,
                r.name as region_name
             FROM issued_certificates ic
             JOIN tcc_applications ta ON ic.application_id = ta.id
             JOIN users u ON ta.user_id = u.id
             JOIN towns t ON u.town_id = t.id
             JOIN regions r ON t.region_id = r.id
             LEFT JOIN users reviewer ON ic.issued_by = reviewer.id
             -- Join with regional admin (user who is regional admin for this region)
             LEFT JOIN users ra ON ra.region_id = t.region_id AND ra.role = 'regional_admin' AND ra.stamp_approved = true
             WHERE ic.id = $1`,
            [id]
        );

        if (cert.rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const certificate = cert.rows[0];
        
        // Check permission
        if (certificate.user_id !== req.user.user_id && 
            req.user.role !== 'town_admin' && 
            !req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        console.log('Certificate data with stamp:', {
            hasStamp: !!certificate.stamp_path,
            stampApproved: certificate.stamp_approved,
            regionalAdmin: certificate.regional_admin_name,
            region: certificate.region_name
        });

        // Generate enhanced PDF with stamp
        const PDFGenerator = require('../services/pdfGenerator');
        const pdfBuffer = await PDFGenerator.generateTCCCertificate(certificate);

        // Save PDF to database for future downloads
        await pool.query(
            'UPDATE issued_certificates SET pdf_data = $1 WHERE id = $2',
            [pdfBuffer, id]
        );

        // Send the PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="TCC-${certificate.tcc_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ error: 'Failed to download certificate' });
    }
});
// Get certificate details (FIXED)
router.get('/certificate/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`Fetching certificate with ID: ${id} for user: ${req.user.user_id}`);

        const certificate = await pool.query(
            `SELECT 
                ic.id as certificate_id,
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date,
                ic.pdf_data,
                ta.id as application_id,
                ta.application_number,
                ta.purpose,
                ta.status as application_status,
                u.id as user_id,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                u.email,
                u.phone,
                t.name as town_name,
                reviewer.full_name as reviewed_by_name
             FROM issued_certificates ic
             JOIN tcc_applications ta ON ic.application_id = ta.id
             JOIN users u ON ta.user_id = u.id
             JOIN towns t ON u.town_id = t.id
             LEFT JOIN users reviewer ON ic.issued_by = reviewer.id
             WHERE ic.id = $1`,
            [id]
        );

        if (certificate.rows.length === 0) {
            console.log(`Certificate with ID ${id} not found`);
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const cert = certificate.rows[0];
        
        // Check if user has permission (either the taxpayer or admin)
        if (cert.user_id !== req.user.user_id && req.user.role !== 'town_admin' && !req.user.is_super_admin) {
            console.log(`Permission denied: user ${req.user.user_id} trying to access certificate of user ${cert.user_id}`);
            return res.status(403).json({ error: 'You do not have permission to view this certificate' });
        }

        console.log(`Certificate found: ${cert.tcc_number}`);
        res.json({ certificate: cert });

    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({ error: 'Failed to fetch certificate' });
    }
});
// Apply for TCC
router.post('/apply', auth, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { purpose, notes } = req.body;
        const userId = req.user.user_id;

        // Check if already has pending application
        const pending = await client.query(
            `SELECT id FROM tcc_applications 
             WHERE user_id = $1 AND status = 'pending'`,
            [userId]
        );

        if (pending.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You already have a pending TCC application' });
        }

        // Get user's town
        const user = await client.query(
            'SELECT town_id FROM users WHERE id = $1',
            [userId]
        );

        // Create application
        const application = await client.query(
            `INSERT INTO tcc_applications 
             (user_id, town_id, purpose, notes, status, submitted_at)
             VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
             RETURNING id`,
            [userId, user.rows[0].town_id, purpose, notes]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'TCC application submitted successfully',
            application_id: application.rows[0].id
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('TCC application error:', error);
        res.status(500).json({ error: 'Failed to submit TCC application' });
    } finally {
        client.release();
    }
});

// Get TCC applications for town admin
router.get('/admin/tcc-applications', auth, async (req, res) => {
    try {
        if (req.user.role !== 'town_admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const applications = await pool.query(
            `SELECT 
                ta.*,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                tc.category_code,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE user_id = u.id 
                    AND payment_status = 'completed'
                    AND payment_date >= CURRENT_DATE - INTERVAL '1 year'
                ), 0) as total_paid
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             LEFT JOIN taxpayer_profiles tp ON u.id = tp.user_id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             WHERE u.town_id = $1
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

// Review TCC application (approve/reject)
router.post('/admin/tcc-review/:id', auth, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { status, notes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update application
        await client.query(
            `UPDATE tcc_applications 
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = $3
             WHERE id = $4`,
            [status, req.user.user_id, notes, id]
        );

        if (status === 'approved') {
            // Get application details
            const app = await client.query(
                `SELECT ta.*, u.full_name, u.business_name, u.tin, u.town_id
                 FROM tcc_applications ta
                 JOIN users u ON ta.user_id = u.id
                 WHERE ta.id = $1`,
                [id]
            );

            // Generate certificate number
            const certNumber = `TCC-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
            
            // Create certificate record
            await client.query(
                `INSERT INTO issued_certificates 
                 (application_id, tcc_number, issue_date, expiry_date, issued_by)
                 VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $3)`,
                [id, certNumber, req.user.user_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `TCC application ${status} successfully`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('TCC review error:', error);
        res.status(500).json({ error: 'Failed to process TCC review' });
    } finally {
        client.release();
    }
});

// Get taxpayer's TCC applications
// Get taxpayer's own TCC applications (UPDATED)
router.get('/my-applications', auth, async (req, res) => {
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
                ic.id as certificate_id,
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date
             FROM tcc_applications ta
             LEFT JOIN issued_certificates ic ON ta.id = ic.application_id
             WHERE ta.user_id = $1 
             ORDER BY ta.submitted_at DESC`,
            [req.user.user_id]
        );

        console.log(`Found ${applications.rows.length} applications for user ${req.user.user_id}`);
        res.json({ applications: applications.rows });

    } catch (error) {
        console.error('Get my TCC applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

module.exports = router;