const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Public verification endpoint (no auth required)
router.get('/certificate/:tccNumber', async (req, res) => {
    try {
        const { tccNumber } = req.params;

        const certificate = await pool.query(
            `SELECT 
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                t.name as town_name
             FROM issued_certificates ic
             JOIN tcc_applications ta ON ic.application_id = ta.id
             JOIN users u ON ta.user_id = u.id
             JOIN towns t ON u.town_id = t.id
             WHERE ic.tcc_number = $1`,
            [tccNumber]
        );

        if (certificate.rows.length === 0) {
            return res.status(404).json({ 
                valid: false, 
                message: 'Certificate not found' 
            });
        }

        const cert = certificate.rows[0];
        const now = new Date();
        const expiryDate = new Date(cert.expiry_date);
        const isValid = now <= expiryDate;

        res.json({
            valid: isValid,
            certificate: {
                number: cert.tcc_number,
                taxpayer: cert.taxpayer_name,
                business: cert.business_name,
                tin: cert.tin,
                issueDate: cert.issue_date,
                expiryDate: cert.expiry_date,
                town: cert.town_name,
                status: isValid ? 'ACTIVE' : 'EXPIRED'
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ 
            valid: false, 
            error: 'Verification failed' 
        });
    }
});

module.exports = router;