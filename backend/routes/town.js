const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is town admin
const requireTownAdmin = (req, res, next) => {
  if (req.user.user_type !== 'town_admin') {
    return res.status(403).json({ error: 'Access denied. Town admin role required.' });
  }
  next();
};

// Get town statistics
router.get('/stats', auth, requireTownAdmin, async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT 
        t.name as town_name,
        r.name as region_name,
        t.target_tax_amount,
        COUNT(DISTINCT u.id) as total_taxpayers,
        COALESCE(SUM(tp.paid_amount), 0) as collected_tax,
        COUNT(DISTINCT tp.id) as total_payments,
        COUNT(DISTINCT ta.id) as total_tcc_applications,
        COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'Approved') as completed_tcc,
        (COUNT(DISTINCT u.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM tax_payments tp2 
          WHERE tp2.user_id = u.id AND tp2.payment_status = 'completed'
        )) * 100.0 / GREATEST(COUNT(DISTINCT u.id), 1)) as compliance_rate
       FROM towns t
       JOIN regions r ON t.region_id = r.id
       LEFT JOIN users u ON t.id = u.town_id AND u.user_type = 'taxpayer'
       LEFT JOIN tax_payments tp ON u.id = tp.user_id AND tp.payment_status = 'completed'
       LEFT JOIN tcc_applications ta ON u.id = ta.user_id
       WHERE t.id = $1
       GROUP BY t.id, t.name, r.name, t.target_tax_amount`,
      [req.user.town_id]
    );

    res.json(stats.rows[0] || {});
  } catch (error) {
    console.error('Get town stats error:', error);
    res.status(500).json({ error: 'Failed to fetch town statistics' });
  }
});

// Get pending TCC applications for this town
router.get('/pending-applications', auth, requireTownAdmin, async (req, res) => {
  try {
    const applications = await pool.query(
      `SELECT 
        ta.id,
        ta.status,
        ta.submitted_at,
        u.full_name as taxpayer_name,
        u.tin as taxpayer_tin,
        u.email as taxpayer_email
       FROM tcc_applications ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.town_id = $1 AND ta.status IN ('Submitted', 'Under Review')
       ORDER BY ta.submitted_at DESC`,
      [req.user.town_id]
    );

    res.json({ applications: applications.rows });
  } catch (error) {
    console.error('Get pending applications error:', error);
    res.status(500).json({ error: 'Failed to fetch pending applications' });
  }
});

// Get pending payment receipts for this town
router.get('/pending-receipts', auth, requireTownAdmin, async (req, res) => {
  try {
    const payments = await pool.query(
      `SELECT 
        tp.id,
        tp.declared_amount,
        tp.created_at,
        tp.receipt_file_path,
        u.full_name as taxpayer_name,
        u.tin as taxpayer_tin,
        tt.name as tax_type_name
       FROM tax_payments tp
       JOIN users u ON tp.user_id = u.id
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       WHERE tp.town_id = $1 AND tp.payment_status = 'under_review'
       ORDER BY tp.created_at DESC`,
      [req.user.town_id]
    );

    res.json({ payments: payments.rows });
  } catch (error) {
    console.error('Get pending receipts error:', error);
    res.status(500).json({ error: 'Failed to fetch pending receipts' });
  }
});

module.exports = router;