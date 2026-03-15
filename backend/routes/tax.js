const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Calculate income tax using bracket system
async function calculateIncomeTax(monthlyIncome) {
  try {
    const brackets = await pool.query(
      'SELECT * FROM tax_brackets WHERE tax_type_id = 1 ORDER BY min_income'
    );
    
    let annualIncome = monthlyIncome * 12;
    let tax = 0;
    let remainingIncome = annualIncome;
    
    for (let i = 0; i < brackets.rows.length; i++) {
      const bracket = brackets.rows[i];
      
      if (remainingIncome <= 0) break;
      
      const bracketRange = bracket.max_income ? 
        Math.min(bracket.max_income - bracket.min_income, remainingIncome) : 
        remainingIncome;
        
      const taxableInBracket = Math.max(0, Math.min(bracketRange, remainingIncome));
      
      tax += bracket.fixed_amount + (taxableInBracket * (bracket.tax_rate / 100));
      remainingIncome -= taxableInBracket;
    }
    
    return tax / 12; // Return monthly tax amount

  } catch (error) {
    console.error('Calculate income tax error:', error);
    return 0;
  }
}

// ========== TAX TYPES & PAYMENT METHODS ==========

// Get all tax types
router.get('/tax-types', auth, async (req, res) => {
  try {
    const taxTypes = await pool.query('SELECT * FROM tax_types WHERE id IS NOT NULL ORDER BY name');
    res.json({ tax_types: taxTypes.rows });
  } catch (error) {
    console.error('Get tax types error:', error);
    res.status(500).json({ error: 'Failed to fetch tax types' });
  }
});

// Get specific tax type
router.get('/tax-types/:id', auth, async (req, res) => {
  try {
    const taxType = await pool.query('SELECT * FROM tax_types WHERE id = $1', [req.params.id]);
    
    if (taxType.rows.length === 0) {
      return res.status(404).json({ error: 'Tax type not found' });
    }

    res.json({ tax_type: taxType.rows[0] });
  } catch (error) {
    console.error('Get tax type error:', error);
    res.status(500).json({ error: 'Failed to fetch tax type' });
  }
});

// Get payment methods
router.get('/payment-methods', auth, async (req, res) => {
  try {
    const methods = await pool.query('SELECT * FROM payment_methods WHERE is_active = true ORDER BY name');
    res.json({ payment_methods: methods.rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Get tax periods for specific tax type
router.get('/tax-periods/:taxTypeId', auth, async (req, res) => {
  try {
    const periods = await pool.query(
      `SELECT tp.*, tt.name as tax_type_name 
       FROM tax_periods tp 
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id 
       WHERE tp.tax_type_id = $1 AND tp.is_active = true 
       ORDER BY tp.due_date DESC`,
      [req.params.taxTypeId]
    );
    
    res.json({ tax_periods: periods.rows });
  } catch (error) {
    console.error('Get tax periods error:', error);
    res.status(500).json({ error: 'Failed to fetch tax periods' });
  }
});

// ========== TAX CALCULATION ==========

// Calculate tax amount
// Calculate tax amount
router.post('/calculate', auth, async (req, res) => {
  try {
    const { tax_type_id, last_year_tax_amount, current_year_income, business_profit, sales_amount, purchase_amount } = req.body;

    let calculatedTax = 0;
    let calculationMethod = 'default';
    let breakdown = {};

    // Method 1: Use last year's amount with growth
    if (last_year_tax_amount && last_year_tax_amount > 0) {
      const growthRate = 0.10; // 10% default growth
      calculatedTax = parseFloat(last_year_tax_amount) * (1 + growthRate);
      calculationMethod = 'historical_growth';
      breakdown = {
        last_year_tax: last_year_tax_amount,
        growth_rate: '10%',
        calculated_amount: calculatedTax
      };
    }

    // Method 2: Use tax brackets if current year income is provided (Income Tax)
    if (current_year_income && current_year_income > 0 && tax_type_id == 1) {
      const monthlyIncome = parseFloat(current_year_income) / 12;
      calculatedTax = await calculateIncomeTax(monthlyIncome);
      calculationMethod = 'bracket_system';
      breakdown = {
        annual_income: current_year_income,
        monthly_income: monthlyIncome,
        calculated_tax: calculatedTax
      };
    }

    // Method 3: VAT Calculation
    if (tax_type_id == 2 && sales_amount) {
      const vatRate = 0.15;
      const taxableAmount = parseFloat(sales_amount) - (parseFloat(purchase_amount) || 0);
      calculatedTax = Math.max(0, taxableAmount * vatRate);
      calculationMethod = 'vat_calculation';
      breakdown = {
        sales_amount: sales_amount,
        purchase_amount: purchase_amount || 0,
        taxable_amount: taxableAmount,
        vat_rate: '15%',
        calculated_vat: calculatedTax
      };
    }

    // Method 4: Business Profit Tax
    if (tax_type_id == 3 && business_profit) {
      const taxRate = 0.30;
      calculatedTax = parseFloat(business_profit) * taxRate;
      calculationMethod = 'profit_tax_calculation';
      breakdown = {
        business_profit: business_profit,
        tax_rate: '30%',
        calculated_tax: calculatedTax
      };
    }

    // Method 5: If no data provided, use minimum tax amount
    if (calculatedTax <= 0) {
      calculatedTax = 100; // Minimum tax amount
      calculationMethod = 'minimum_default';
      breakdown = {
        minimum_tax: calculatedTax,
        reason: 'No sufficient data provided'
      };
    }

    // Save calculation history
    await pool.query(
      'INSERT INTO tax_calculations (user_id, tax_type_id, income, calculated_tax, calculation_data) VALUES ($1, $2, $3, $4, $5)',
      [req.user.user_id, tax_type_id, current_year_income, calculatedTax, JSON.stringify(breakdown)]
    );

    res.json({
      calculated_tax: calculatedTax.toFixed(2),
      calculation_method: calculationMethod,
      breakdown: breakdown,
      message: `Tax calculated using ${calculationMethod.replace(/_/g, ' ')}`
    });

  } catch (error) {
    console.error('Tax calculation error:', error);
    
    // Provide a fallback calculation
    const fallbackTax = 500; // Default fallback amount
    res.json({
      calculated_tax: fallbackTax.toFixed(2),
      calculation_method: 'fallback',
      breakdown: {
        reason: 'Calculation service temporarily unavailable',
        fallback_amount: fallbackTax
      },
      message: 'Using default calculation'
    });
  }
});

// ========== MANUAL PAYMENT PROCESSING ==========

// Process payment with receipt upload (manual staff review)
// Process payment with receipt upload (manual staff review)
router.post('/process-payment-manual', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { 
      tax_type_id, 
      tax_amount, 
      payment_method_id, 
      account_number
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Payment receipt is required' });
    }

    // Validate required fields
    if (!tax_type_id || !tax_amount || !payment_method_id || !account_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const taxAmount = parseFloat(tax_amount);

    // Create payment record for manual review
    const paymentRecord = await pool.query(
      `INSERT INTO tax_payments 
       (user_id, tax_type_id, declared_amount, payment_method_id, account_number,
        receipt_file_path, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'under_review') 
       RETURNING *`,
      [
        req.user.user_id, 
        tax_type_id, 
        taxAmount, 
        payment_method_id, 
        account_number,
        req.file.path
      ]
    );

    res.json({
      success: true,
      payment_status: 'under_review',
      message: 'Payment submitted for staff review. You will be notified when it is processed.',
      payment_id: paymentRecord.rows[0].id
    });

  } catch (error) {
    console.error('Process payment manual error:', error);
    res.status(500).json({ error: 'Payment submission failed: ' + error.message });
  }
});
// ========== PAYMENT HISTORY & MANAGEMENT ==========

// Get payment history
router.get('/payment-history', auth, async (req, res) => {
  try {
    const payments = await pool.query(
      `SELECT 
        tp.*,
        tt.name as tax_type_name,
        pm.name as payment_method_name
       FROM tax_payments tp
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
       WHERE tp.user_id = $1
       ORDER BY tp.created_at DESC`,
      [req.user.user_id]
    );

    res.json({ payments: payments.rows });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get payment details by ID
router.get('/payment/:id', auth, async (req, res) => {
  try {
    const payment = await pool.query(
      `SELECT 
        tp.*,
        tt.name as tax_type_name,
        pm.name as payment_method_name,
        pm.account_number as payment_account_number
       FROM tax_payments tp
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
       WHERE tp.id = $1 AND tp.user_id = $2`,
      [req.params.id, req.user.user_id]
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

// ========== DEADLINES & TAX PERIODS ==========

// Get upcoming deadlines
router.get('/upcoming-deadlines', auth, async (req, res) => {
  try {
    const deadlines = await pool.query(
      `SELECT 
        tp.*, 
        tt.name as tax_type_name,
        CASE 
          WHEN tp.due_date < CURRENT_DATE THEN 'overdue'
          WHEN tp.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
          ELSE 'upcoming'
        END as deadline_status
       FROM tax_periods tp
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       WHERE tp.is_active = true AND tp.due_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY tp.due_date ASC
       LIMIT 10`
    );

    res.json({ tax_periods: deadlines.rows });
  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
});

// Get all deadlines with pagination
router.get('/deadlines', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const deadlines = await pool.query(
      `SELECT 
        tp.*, 
        tt.name as tax_type_name,
        CASE 
          WHEN tp.due_date < CURRENT_DATE THEN 'overdue'
          WHEN tp.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
          ELSE 'upcoming'
        END as deadline_status
       FROM tax_periods tp
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       WHERE tp.is_active = true
       ORDER BY tp.due_date ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM tax_periods WHERE is_active = true'
    );

    res.json({
      tax_periods: deadlines.rows,
      pagination: {
        page: page,
        limit: limit,
        total: parseInt(totalResult.rows[0].count),
        pages: Math.ceil(parseInt(totalResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Get all deadlines error:', error);
    res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
});

// ========== USER TAX PROFILE MANAGEMENT ==========

// Update user's last year tax amount
router.put('/update-last-year-tax', auth, async (req, res) => {
  try {
    const { last_year_tax_amount } = req.body;

    if (!last_year_tax_amount || last_year_tax_amount <= 0) {
      return res.status(400).json({ error: 'Valid last year tax amount is required' });
    }

    await pool.query(
      'UPDATE users SET last_year_tax_amount = $1 WHERE id = $2',
      [last_year_tax_amount, req.user.user_id]
    );

    res.json({ 
      message: 'Last year tax amount updated successfully',
      last_year_tax_amount: parseFloat(last_year_tax_amount)
    });
  } catch (error) {
    console.error('Update last year tax error:', error);
    res.status(500).json({ error: 'Failed to update last year tax amount' });
  }
});

// Process payment with receipt upload (manual staff review) - FIXED VERSION
// Process payment with receipt upload - FIXED VERSION
// Process payment with receipt upload - COMPLETELY FIXED VERSION
// Process payment with receipt upload - COMPLETELY FIXED VERSION
router.post('/process-payment-manual', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { 
      tax_type_id, 
      tax_amount, 
      payment_method_id, 
      account_number
    } = req.body;

    console.log('📝 Processing payment for user:', req.user.user_id);

    if (!req.file) {
      return res.status(400).json({ error: 'Payment receipt is required' });
    }

    const taxAmount = parseFloat(tax_amount);

    // Get user's COMPLETE information - THIS IS CRITICAL
    const userInfo = await pool.query(
      'SELECT id, town_id, region_id, email, full_name FROM users WHERE id = $1',
      [req.user.user_id]
    );

    console.log('👤 User info:', userInfo.rows[0]);

    if (!userInfo.rows[0]) {
      return res.status(400).json({ error: 'User not found' });
    }

    const userTownId = userInfo.rows[0].town_id;
    const userRegionId = userInfo.rows[0].region_id;

    if (!userTownId) {
      return res.status(400).json({ 
        error: 'Your account does not have a town assigned. Please update your profile or contact support.' 
      });
    }

    // Check if town admin exists for this town
    const townAdminCheck = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND town_id = $2',
      ['town_admin', userTownId]
    );

    if (townAdminCheck.rows.length === 0) {
      console.log('⚠️ Warning: No town admin found for town_id:', userTownId);
    }

    // Create payment record - EXPLICITLY SET EVERY FIELD
    const paymentRecord = await pool.query(
      `INSERT INTO tax_payments 
       (user_id, tax_type_id, declared_amount, payment_method_id, account_number,
        receipt_file_path, payment_status, town_id, region_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING *`,
      [
        req.user.user_id,                 // $1
        parseInt(tax_type_id),             // $2
        taxAmount,                         // $3
        parseInt(payment_method_id),        // $4
        account_number || '',               // $5
        req.file.path,                      // $6
        'under_review',                     // $7
        userTownId,                         // $8 - THIS MUST BE THE USER'S TOWN
        userRegionId                        // $9
      ]
    );

    console.log('✅ Payment created with town_id:', userTownId);
    console.log('✅ Payment record:', paymentRecord.rows[0]);

    // Double-check that it was saved correctly
    const verifyPayment = await pool.query(
      'SELECT id, user_id, town_id, payment_status FROM tax_payments WHERE id = $1',
      [paymentRecord.rows[0].id]
    );

    console.log('🔍 Verification - Payment in DB:', verifyPayment.rows[0]);

    res.json({
      success: true,
      payment_status: 'under_review',
      message: `Payment submitted successfully and sent to your town administrator for review.`,
      payment_id: paymentRecord.rows[0].id,
      town_id: userTownId
    });

  } catch (error) {
    console.error('❌ Process payment manual error:', error);
    res.status(500).json({ error: 'Payment submission failed: ' + error.message });
  }
});
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('Fetching tax profile for user:', req.user.user_id); // Debug log
    
    // Get user basic information
    const userResult = await pool.query(
      'SELECT id, full_name, tin, email, phone, business_name, last_year_tax_amount FROM users WHERE id = $1',
      [req.user.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get payment statistics
    const paymentStats = await pool.query(
      `SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COUNT(*) FILTER (WHERE payment_status = 'completed') as completed_payments,
        COUNT(*) FILTER (WHERE payment_status = 'under_review') as pending_review,
        COUNT(*) FILTER (WHERE payment_status = 'failed') as failed_payments
       FROM tax_payments 
       WHERE user_id = $1`,
      [req.user.user_id]
    );

    // Get taxpayer compliance status
    const complianceResult = await pool.query(
      `SELECT 
        has_filed_returns,
        has_paid_taxes,
        outstanding_balance,
        last_updated
       FROM taxpayer_records 
       WHERE tin = $1`,
      [userResult.rows[0].tin]
    );

    const responseData = {
      user: userResult.rows[0],
      payment_stats: paymentStats.rows[0],
      compliance: complianceResult.rows[0] || null
    };

    console.log('Tax profile data:', responseData); // Debug log
    res.json(responseData);

  } catch (error) {
    console.error('Get tax profile error:', error);
    res.status(500).json({ error: 'Failed to fetch tax profile: ' + error.message });
  }
});

module.exports = router;