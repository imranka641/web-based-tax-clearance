const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Verify TCC by QR code
router.get('/tcc/:tccNumber', async (req, res) => {
  try {
    const { tccNumber } = req.params;

    const tccData = await pool.query(
      `SELECT 
        ic.*,
        u.full_name as taxpayer_full_name,
        u.tin as taxpayer_tin,
        u.business_name as taxpayer_business_name,
        tt.name as tax_type_name,
        s.full_name as staff_name,
        s.id as staff_id
       FROM issued_certificates ic
       JOIN users u ON ic.taxpayer_tin = u.tin
       LEFT JOIN tax_types tt ON ic.tax_type_id = tt.id
       LEFT JOIN users s ON ic.staff_reviewed_by = s.id
       WHERE ic.tcc_number = $1`,
      [tccNumber]
    );

    if (tccData.rows.length === 0) {
      return res.status(404).json({ error: 'TCC certificate not found' });
    }

    const certificate = tccData.rows[0];
    
    // Determine certificate status
    let status = 'Valid';
    if (new Date(certificate.expiry_date) < new Date()) {
      status = 'Expired';
    }

    const verificationData = {
      tcc_number: certificate.tcc_number,
      issue_date: certificate.issue_date,
      expiry_date: certificate.expiry_date,
      status: status,
      taxpayer_full_name: certificate.taxpayer_full_name,
      taxpayer_tin: certificate.taxpayer_tin,
      taxpayer_business_name: certificate.taxpayer_business_name,
      tax_amount: certificate.tax_amount,
      tax_type_name: certificate.tax_type_name,
      security_hash: generateSecurityHash(certificate.tcc_number)
    };

    // Add staff approval data if available
    if (certificate.staff_name) {
      verificationData.staff_approval = {
        staff_name: certificate.staff_name,
        staff_id: certificate.staff_id,
        approval_date: certificate.staff_reviewed_at || certificate.issue_date
      };
    }

    res.json(verificationData);

  } catch (error) {
    console.error('TCC verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Generate security hash for verification
function generateSecurityHash(tccNumber) {
  return Buffer.from(tccNumber + 'ETHIOPIA_REVENUE').toString('base64').substring(0, 20);
}

module.exports = router;