const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all applications for logged-in taxpayer
router.get('/my-applications', auth, async (req, res) => {
    try {
        const applications = await pool.query(
            `SELECT 
                ta.id, 
                ta.application_number,
                ta.status, 
                ta.submitted_at, 
                ta.reviewed_at,
                ta.rejection_reason,
                ta.purpose,
                ta.notes,
                u.full_name as reviewed_by_name,
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date
             FROM tcc_applications ta
             LEFT JOIN users u ON ta.reviewed_by = u.id
             LEFT JOIN issued_certificates ic ON ta.id = ic.application_id
             WHERE ta.user_id = $1 
             ORDER BY ta.submitted_at DESC`,
            [req.user.user_id]
        );

        res.json({
            applications: applications.rows
        });

    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Submit new TCC application
router.post('/', auth, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Check if user already has a pending application
        const pendingApp = await client.query(
            'SELECT id FROM tcc_applications WHERE user_id = $1 AND status = $2',
            [req.user.user_id, 'pending']
        );

        if (pendingApp.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'You already have a pending TCC application. Please wait for it to be processed.' 
            });
        }

        // Get user's town
        const userInfo = await client.query(
            'SELECT town_id FROM users WHERE id = $1',
            [req.user.user_id]
        );

        if (!userInfo.rows[0]?.town_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Your account does not have a town assigned. Please contact support.' 
            });
        }

        const { purpose, notes } = req.body;

        if (!purpose) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Purpose is required' });
        }

        // Generate application number
        const appNumber = `TCC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        // Create new application
        const newApplication = await client.query(
            `INSERT INTO tcc_applications 
             (user_id, town_id, application_number, purpose, notes, status, submitted_at) 
             VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP) 
             RETURNING *`,
            [req.user.user_id, userInfo.rows[0].town_id, appNumber, purpose, notes]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, 'Submitted TCC application', 'tcc_application', newApplication.rows[0].id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'TCC application submitted successfully',
            application: newApplication.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Submit application error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    } finally {
        client.release();
    }
});

// Get single application details
router.get('/:id', auth, async (req, res) => {
    try {
        const application = await pool.query(
            `SELECT 
                ta.*,
                u.full_name as taxpayer_name,
                u.email,
                u.phone,
                u.business_name,
                u.tin,
                reviewer.full_name as reviewed_by_name,
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date
             FROM tcc_applications ta
             JOIN users u ON ta.user_id = u.id
             LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
             LEFT JOIN issued_certificates ic ON ta.id = ic.application_id
             WHERE ta.id = $1 AND ta.user_id = $2`,
            [req.params.id, req.user.user_id]
        );

        if (application.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({
            application: application.rows[0]
        });

    } catch (error) {
        console.error('Get application details error:', error);
        res.status(500).json({ error: 'Failed to fetch application details' });
    }
});

// Download TCC certificate
router.get('/:id/certificate', auth, async (req, res) => {
    try {
        const certificate = await pool.query(
            `SELECT ic.* 
             FROM issued_certificates ic
             JOIN tcc_applications ta ON ic.application_id = ta.id
             WHERE ta.id = $1 AND ta.user_id = $2`,
            [req.params.id, req.user.user_id]
        );

        if (certificate.rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found or not approved' });
        }

        const cert = certificate.rows[0];

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="TCC-${cert.tcc_number}.pdf"`);
        res.send(cert.pdf_data);

    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ error: 'Failed to download certificate' });
    }
});

module.exports = router;