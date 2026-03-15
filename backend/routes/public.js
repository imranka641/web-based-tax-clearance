const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Public certificate verification (no authentication required)
router.get('/verify-certificate/:certificateNumber', async (req, res) => {
    try {
        const { certificateNumber } = req.params;

        const certificate = await pool.query(
            `SELECT 
                ic.tcc_number,
                ic.issue_date,
                ic.expiry_date,
                u.full_name as taxpayer_name,
                u.business_name,
                u.tin,
                u.fayda_number,
                u.national_id_number,
                u.email,
                u.phone,
                r.name as region_name,
                t.name as town_name,
                COALESCE((
                    SELECT SUM(paid_amount) 
                    FROM tax_payments 
                    WHERE user_id = u.id 
                    AND payment_status = 'completed'
                ), 0) as total_paid,
                (
                    SELECT MAX(payment_date) 
                    FROM tax_payments 
                    WHERE user_id = u.id 
                    AND payment_status = 'completed'
                ) as last_payment_date
             FROM issued_certificates ic
             JOIN tcc_applications ta ON ic.application_id = ta.id
             JOIN users u ON ta.user_id = u.id
             LEFT JOIN regions r ON u.region_id = r.id
             JOIN towns t ON u.town_id = t.id
             WHERE ic.tcc_number = $1 
             AND ic.expiry_date >= CURRENT_DATE`,
            [certificateNumber]
        );

        if (certificate.rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found or expired' });
        }

        res.json({ 
            valid: true,
            certificate: certificate.rows[0],
            verified_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Certificate verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;