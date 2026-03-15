const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const PaymentService = require('../services/paymentService');

const router = express.Router();

// Middleware to check if user is staff
const requireStaff = (req, res, next) => {
  if (req.user.role !== 'staff' && !req.user.is_super_admin) {
    return res.status(403).json({ error: 'Access denied. Staff role required.' });
  }
  next();
};

// Get receipt review queue
router.get('/receipt-review-queue', auth, requireStaff, async (req, res) => {
  try {
    const reviewQueue = await pool.query(
      `SELECT * FROM receipt_review_queue`
    );

    res.json({ review_queue: reviewQueue.rows });
  } catch (error) {
    console.error('Get receipt review queue error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt review queue' });
  }
});

// Get payment details for receipt review
router.get('/receipt-review/:id', auth, requireStaff, async (req, res) => {
  try {
    const payment = await pool.query(
      `SELECT 
        tp.*,
        u.full_name as taxpayer_name,
        u.tin as taxpayer_tin,
        u.email as taxpayer_email,
        tt.name as tax_type_name,
        pm.name as payment_method_name,
        reviewer.full_name as staff_reviewed_by_name
       FROM tax_payments tp
       JOIN users u ON tp.user_id = u.id
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
       LEFT JOIN users reviewer ON tp.staff_reviewed_by = reviewer.id
       WHERE tp.id = $1`,
      [req.params.id]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment: payment.rows[0] });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// Approve payment receipt
router.post('/receipt-review/:id/approve', auth, requireStaff, async (req, res) => {
  try {
    const { staff_notes } = req.body;
    
    // Get payment details first
    const payment = await pool.query(
      'SELECT * FROM tax_payments WHERE id = $1',
      [req.params.id]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentData = payment.rows[0];

    // Get taxpayer data
    const taxpayer = await pool.query(
      'SELECT full_name, tin, business_name FROM users WHERE id = $1',
      [paymentData.user_id]
    );

    if (taxpayer.rows.length === 0) {
      return res.status(404).json({ error: 'Taxpayer not found' });
    }

    const taxpayerData = taxpayer.rows[0];

    // Get tax type name
    const taxType = await pool.query(
      'SELECT name FROM tax_types WHERE id = $1',
      [paymentData.tax_type_id]
    );
    const taxTypeName = taxType.rows[0]?.name || 'Unknown Tax Type';

    // Process actual payment
    const paymentResult = await PaymentService.processPayment({
      amount: paymentData.declared_amount,
      payment_method_id: paymentData.payment_method_id,
      account_number: paymentData.account_number,
      user_id: paymentData.user_id
    });

    if (!paymentResult.success) {
      return res.status(400).json({ error: 'Payment processing failed: ' + paymentResult.error });
    }

    // Generate TCC number
    const tccNumber = `TCC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create certificate data
    const certificateData = {
      tcc_number: tccNumber,
      user_id: paymentData.user_id,
      tax_payment_id: req.params.id,
      issue_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      status: 'active'
    };

    // Create TCC certificate
    await pool.query(
      `INSERT INTO tcc_certificates 
       (tcc_number, user_id, tax_payment_id, issue_date, expiry_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        certificateData.tcc_number,
        certificateData.user_id,
        certificateData.tax_payment_id,
        certificateData.issue_date,
        certificateData.expiry_date,
        certificateData.status
      ]
    );

    // In the approve route, update the certificate creation:
    const staffData = {
      staff_name: req.user.full_name,
      staff_id: req.user.user_id,
      approval_date: new Date().toISOString(),
      tcc_number: certificateData.tcc_number
    };

    // Update issued_certificates with enhanced data
    await pool.query(
      `UPDATE issued_certificates 
       SET taxpayer_full_name = $1,
           taxpayer_tin = $2,
           taxpayer_business_name = $3,
           tax_amount = $4,
           tax_type_name = $5,
           staff_reviewed_by = $6
       WHERE tcc_number = $7`,
      [
        taxpayerData.full_name,
        taxpayerData.tin,
        taxpayerData.business_name,
        paymentData.declared_amount,
        taxTypeName,
        req.user.user_id,
        certificateData.tcc_number
      ]
    );

    // Update payment record with staff approval
    await pool.query(
      `UPDATE tax_payments 
       SET payment_status = 'completed',
           paid_amount = $1,
           transaction_id = $2,
           staff_reviewed_by = $3,
           staff_reviewed_at = CURRENT_TIMESTAMP,
           staff_decision = 'approved',
           staff_notes = $4,
           receipt_verified = true,
           payment_date = CURRENT_TIMESTAMP,
           tcc_number = $5
       WHERE id = $6`,
      [
        paymentData.declared_amount,
        paymentResult.transaction_id,
        req.user.user_id,
        staff_notes,
        certificateData.tcc_number,
        req.params.id
      ]
    );

    // Update taxpayer compliance record
    await pool.query(
      `UPDATE taxpayer_records 
       SET has_paid_taxes = true,
           outstanding_balance = GREATEST(0, outstanding_balance - $1),
           last_updated = CURRENT_TIMESTAMP
       WHERE tin = (SELECT tin FROM users WHERE id = $2)`,
      [paymentData.declared_amount, paymentData.user_id]
    );

    // Log the action
    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Approved payment receipt for TIN: ${taxpayerData.tin} and issued TCC: ${certificateData.tcc_number}`, 'tax_payment', req.params.id]
    );

    res.json({
      success: true,
      message: 'Payment approved successfully and TCC certificate issued',
      transaction_id: paymentResult.transaction_id,
      tcc_number: certificateData.tcc_number
    });

  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

// Reject payment receipt
router.post('/receipt-review/:id/reject', auth, requireStaff, async (req, res) => {
  try {
    const { staff_notes } = req.body;
    
    // Update payment record with staff rejection
    await pool.query(
      `UPDATE tax_payments 
       SET payment_status = 'failed',
           staff_reviewed_by = $1,
           staff_reviewed_at = CURRENT_TIMESTAMP,
           staff_decision = 'rejected',
           staff_notes = $2
       WHERE id = $3`,
      [req.user.user_id, staff_notes, req.params.id]
    );

    // Get taxpayer info for logging
    const payment = await pool.query(
      'SELECT u.tin FROM tax_payments tp JOIN users u ON tp.user_id = u.id WHERE tp.id = $1',
      [req.params.id]
    );

    // Log the action
    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Rejected payment receipt for TIN: ${payment.rows[0]?.tin}`, 'tax_payment', req.params.id]
    );

    res.json({
      success: true,
      message: 'Payment rejected successfully'
    });

  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// Get receipt review statistics
router.get('/receipt-review-stats', auth, requireStaff, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_pending,
        COUNT(*) FILTER (WHERE receipt_verified = true) as receipts_verified,
        COUNT(*) FILTER (WHERE ai_verification_status = 'approved') as ai_approved,
        COUNT(*) FILTER (WHERE ai_verification_status = 'rejected') as ai_rejected,
        COUNT(*) FILTER (WHERE staff_decision = 'approved') as staff_approved,
        COUNT(*) FILTER (WHERE staff_decision = 'rejected') as staff_rejected
      FROM receipt_review_queue
    `);

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Get receipt review stats error:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

module.exports = router;