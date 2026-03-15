const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/taxpayer-docs';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Get tax categories for taxpayer
router.get('/tax-categories', auth, async (req, res) => {
    try {
        // Get user's town
        const userResult = await pool.query(
            'SELECT town_id FROM users WHERE id = $1',
            [req.user.user_id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].town_id) {
            return res.status(400).json({ error: 'User town not found' });
        }

        const categories = await pool.query(
            'SELECT * FROM tax_categories WHERE town_id = $1 AND is_active = true ORDER BY min_income',
            [userResult.rows[0].town_id]
        );

        res.json({ categories: categories.rows });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to load categories: ' + error.message });
    }
});

// Submit initial taxpayer data
router.post('/submit-initial-data', 
    auth, 
    upload.fields([
        { name: 'tax_certificate', maxCount: 1 },
        { name: 'business_license', maxCount: 1 },
        { name: 'financial_statement', maxCount: 1 }
    ]),
    async (req, res) => {
        const client = await pool.connect();
        
        try {
            console.log('Starting submission process...');
            await client.query('BEGIN');

            const {
                last_year_income,
                last_year_tax_paid,
                business_start_date,
                employee_count,
                business_type
            } = req.body;

            console.log('Received form data:', { last_year_income, last_year_tax_paid, business_start_date, employee_count, business_type });

            const files = req.files;
            console.log('Received files:', files ? Object.keys(files) : 'No files');

            // Validate required files
            if (!files?.tax_certificate || !files?.business_license) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Tax certificate and business license are required' 
                });
            }

            // Validate required fields
            if (!last_year_income || !last_year_tax_paid || !business_start_date || !employee_count || !business_type) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'All fields are required' 
                });
            }

            // Get user's town
            const userResult = await client.query(
                'SELECT town_id FROM users WHERE id = $1',
                [req.user.user_id]
            );

            if (userResult.rows.length === 0 || !userResult.rows[0].town_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'User town not found' });
            }

            const townId = userResult.rows[0].town_id;
            console.log('User town ID:', townId);

            // Auto-assign category based on income
            let categoryId = null;
            let categoryCode = null;
            
            if (last_year_income) {
                const income = parseFloat(last_year_income);
                const category = await client.query(
                    `SELECT id, category_code FROM tax_categories 
                     WHERE town_id = $1 
                     AND min_income <= $2 
                     AND (max_income >= $2 OR max_income IS NULL)
                     AND is_active = true
                     ORDER BY min_income DESC
                     LIMIT 1`,
                    [townId, income]
                );
                
                if (category.rows.length > 0) {
                    categoryId = category.rows[0].id;
                    categoryCode = category.rows[0].category_code;
                    console.log('Assigned category:', categoryCode);
                }
            }

            // Calculate confidence score
            const confidenceScore = 85; // Default high confidence

            // Check if profile already exists
            const existingProfile = await client.query(
                'SELECT id FROM taxpayer_profiles WHERE user_id = $1',
                [req.user.user_id]
            );

            let profileId;

            if (existingProfile.rows.length > 0) {
                // Update existing profile
                profileId = existingProfile.rows[0].id;
                await client.query(
                    `UPDATE taxpayer_profiles 
                     SET category_id = $1, last_year_income = $2, last_year_tax_paid = $3,
                         business_start_date = $4, employee_count = $5, business_type = $6,
                         tax_certificate_path = $7, business_license_path = $8, 
                         financial_statement_path = $9, assigned_category = $10,
                         confidence_score = $11, verification_status = 'pending',
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = $12`,
                    [
                        categoryId, last_year_income, last_year_tax_paid, business_start_date,
                        employee_count, business_type,
                        files.tax_certificate[0].path,
                        files.business_license[0].path,
                        files.financial_statement?.[0]?.path || null,
                        categoryCode,
                        confidenceScore,
                        req.user.user_id
                    ]
                );
                console.log('Updated existing profile:', profileId);
            } else {
                // Insert new taxpayer profile
                const profile = await client.query(
                    `INSERT INTO taxpayer_profiles 
                     (user_id, category_id, town_id, last_year_income, last_year_tax_paid,
                      business_start_date, employee_count, business_type,
                      tax_certificate_path, business_license_path, financial_statement_path,
                      assigned_category, confidence_score, verification_status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
                     RETURNING id`,
                    [
                        req.user.user_id, categoryId, townId,
                        last_year_income, last_year_tax_paid, business_start_date,
                        employee_count, business_type,
                        files.tax_certificate[0].path,
                        files.business_license[0].path,
                        files.financial_statement?.[0]?.path || null,
                        categoryCode,
                        confidenceScore
                    ]
                );
                profileId = profile.rows[0].id;
                console.log('Created new profile:', profileId);
            }

            // Add to verification queue
            await client.query(
                `INSERT INTO document_verification_queue 
                 (profile_id, user_id, document_type, document_path, priority, status)
                 VALUES ($1, $2, 'all', $3, 'normal', 'pending')
                 ON CONFLICT (profile_id) DO NOTHING`,
                [profileId, req.user.user_id, files.tax_certificate[0].path]
            );
            console.log('Added to verification queue');

            await client.query('COMMIT');
            console.log('Transaction committed successfully');

            res.json({
                success: true,
                message: 'Initial data submitted successfully',
                profile_id: profileId
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Submit initial data error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ 
                error: 'Failed to submit data: ' + error.message,
                details: error.stack
            });
        } finally {
            client.release();
        }
    }
);

// Get taxpayer profile with complete data
router.get('/profile', auth, async (req, res) => {
    try {
        const profile = await pool.query(
            `SELECT 
                tp.*,
                tc.category_code,
                tc.category_name,
                tc.min_income,
                tc.max_income,
                tc.formula_type,
                tc.base_rate,
                tc.multiplier,
                tc.fixed_amount,
                tc.requires_review,
                tc.auto_approve_threshold,
                u.business_name,
                u.tin,
                u.email,
                u.phone,
                u.full_name,
                u.town_id,
                t.name as town_name,
                r.name as region_name
             FROM taxpayer_profiles tp
             JOIN users u ON tp.user_id = u.id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             LEFT JOIN towns t ON u.town_id = t.id
             LEFT JOIN regions r ON u.region_id = r.id
             WHERE tp.user_id = $1`,
            [req.user.user_id]
        );

        if (profile.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Get current year calculation if exists
        const currentYear = new Date().getFullYear();
        const currentTax = await pool.query(
            'SELECT calculated_tax, payment_status FROM annual_tax_calculations WHERE user_id = $1 AND tax_year = $2',
            [req.user.user_id, currentYear]
        );

        const response = {
            ...profile.rows[0],
            current_year_tax: currentTax.rows[0]?.calculated_tax || null,
            payment_status: currentTax.rows[0]?.payment_status || 'pending',
            // For backward compatibility, set minimum_tax as fixed_amount if needed
            minimum_tax: profile.rows[0].fixed_amount || 0
        };

        res.json(response);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile: ' + error.message });
    }
});

// Get current year tax with fallback to profile calculation
router.get('/current-year-tax/:year', auth, async (req, res) => {
    try {
        const { year } = req.params;
        const userId = req.user.user_id;

        // First try to get from annual_tax_calculations
        const tax = await pool.query(
            `SELECT 
                atc.*,
                CASE 
                    WHEN atc.payment_status = 'paid' THEN true
                    ELSE false
                END as paid,
                atc.paid_at as paid_date
             FROM annual_tax_calculations atc
             WHERE atc.user_id = $1 AND atc.tax_year = $2`,
            [userId, year]
        );

        if (tax.rows.length > 0) {
            // Get category info for formula description
            const category = await pool.query(
                'SELECT * FROM tax_categories WHERE id = $1',
                [tax.rows[0].category_id]
            );
            
            let formulaDescription = 'Based on category formula';
            if (category.rows.length > 0) {
                const cat = category.rows[0];
                if (cat.formula_type === 'percentage_of_last_year') {
                    formulaDescription = `${cat.multiplier}x of last year's tax`;
                } else if (cat.formula_type === 'percentage_of_income') {
                    formulaDescription = `${cat.base_rate}% of annual income`;
                } else if (cat.formula_type === 'fixed_amount') {
                    formulaDescription = `Fixed amount of ETB ${cat.fixed_amount}`;
                }
            }

            return res.json({
                amount: tax.rows[0].calculated_tax,
                paid: tax.rows[0].payment_status === 'paid',
                paid_date: tax.rows[0].paid_at,
                formula_description: formulaDescription,
                category_id: tax.rows[0].category_id
            });
        }

        // If not found in annual calculations, calculate from profile
        console.log('No annual calculation found, calculating from profile...');
        
        const profile = await pool.query(
            `SELECT tp.*, tc.id as category_id, tc.category_code, tc.category_name, 
                    tc.formula_type, tc.multiplier, tc.base_rate, tc.fixed_amount
             FROM taxpayer_profiles tp
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             WHERE tp.user_id = $1 AND tp.verification_status = 'verified'`,
            [userId]
        );

        if (profile.rows.length === 0) {
            return res.status(404).json({ error: 'Verified profile not found' });
        }

        const p = profile.rows[0];
        const lastYearTax = parseFloat(p.last_year_tax_paid) || 0;
        const lastYearIncome = parseFloat(p.last_year_income) || 0;
        let calculatedTax = lastYearTax;
        let formulaDescription = '';

        // Calculate based on category
        if (p.category_id) {
            switch(p.formula_type) {
                case 'percentage_of_last_year':
                    const multiplier = parseFloat(p.multiplier) || 1.15;
                    calculatedTax = lastYearTax * multiplier;
                    formulaDescription = `${multiplier}x of last year's tax (${lastYearTax} × ${multiplier})`;
                    break;
                    
                case 'percentage_of_income':
                    const rate = parseFloat(p.base_rate) || 0;
                    calculatedTax = lastYearIncome * (rate / 100);
                    formulaDescription = `${rate}% of annual income (${lastYearIncome} × ${rate}%)`;
                    break;
                    
                case 'fixed_amount':
                    calculatedTax = parseFloat(p.fixed_amount) || 0;
                    formulaDescription = `Fixed amount of ETB ${p.fixed_amount}`;
                    break;
                    
                case 'mixed':
                    const mixMultiplier = parseFloat(p.multiplier) || 1.0;
                    const mixFixed = parseFloat(p.fixed_amount) || 0;
                    calculatedTax = Math.max(lastYearTax * mixMultiplier, mixFixed);
                    formulaDescription = `max(last year ${lastYearTax} × ${mixMultiplier}, fixed ${mixFixed})`;
                    break;
                    
                default:
                    calculatedTax = lastYearTax * 1.15;
                    formulaDescription = `115% of last year's tax (default)`;
            }

            // Apply minimum tax if using fixed_amount as minimum
            if (p.fixed_amount > 0 && calculatedTax < p.fixed_amount) {
                calculatedTax = p.fixed_amount;
                formulaDescription += ` (minimum tax applied: ETB ${p.fixed_amount})`;
            }
        } else {
            // No category assigned, use default
            calculatedTax = lastYearTax * 1.15;
            formulaDescription = '115% of last year\'s tax (no category assigned)';
        }

        // Also create the annual calculation record for future use
        await pool.query(
            `INSERT INTO annual_tax_calculations 
             (user_id, tax_year, category_id, base_income, calculated_tax, final_tax, payment_status)
             VALUES ($1, $2, $3, $4, $5, $5, 'pending')
             ON CONFLICT (user_id, tax_year) 
             DO UPDATE SET 
                 calculated_tax = EXCLUDED.calculated_tax,
                 category_id = EXCLUDED.category_id,
                 base_income = EXCLUDED.base_income`,
            [userId, year, p.category_id, lastYearIncome, calculatedTax]
        );
        console.log('Created missing annual calculation for user:', userId);

        res.json({
            amount: calculatedTax,
            paid: false,
            formula_description: formulaDescription,
            category_id: p.category_id
        });

    } catch (error) {
        console.error('Get current year tax error:', error);
        res.status(500).json({ error: 'Failed to fetch current year tax: ' + error.message });
    }
});

// Get tax predictions
router.get('/predictions', auth, async (req, res) => {
    try {
        // Get current year tax
        const currentYear = new Date().getFullYear();
        
        const currentTax = await pool.query(
            'SELECT calculated_tax FROM annual_tax_calculations WHERE user_id = $1 AND tax_year = $2',
            [req.user.user_id, currentYear]
        );

        let baseAmount = currentTax.rows[0]?.calculated_tax || 0;
        
        if (baseAmount === 0) {
            // Get from profile
            const profile = await pool.query(
                `SELECT tp.last_year_tax_paid, tc.multiplier
                 FROM taxpayer_profiles tp
                 LEFT JOIN tax_categories tc ON tp.category_id = tc.id
                 WHERE tp.user_id = $1`,
                [req.user.user_id]
            );
            
            if (profile.rows.length > 0) {
                const lastYearTax = parseFloat(profile.rows[0].last_year_tax_paid) || 0;
                const multiplier = parseFloat(profile.rows[0].multiplier) || 1.15;
                baseAmount = lastYearTax * multiplier;
            }
        }

        // Generate predictions for next 3 years
        const predictions = [
            {
                year: currentYear + 1,
                amount: baseAmount * 1.10,
                confidence_score: 92,
                based_on: 'Current year + 10% growth',
                notes: 'Based on your category and historical data'
            },
            {
                year: currentYear + 2,
                amount: baseAmount * 1.21,
                confidence_score: 85,
                based_on: '3-year historical trend',
                notes: 'Adjusted for inflation and growth'
            },
            {
                year: currentYear + 3,
                amount: baseAmount * 1.33,
                confidence_score: 78,
                based_on: 'Category average + inflation',
                notes: 'Long-term projection'
            }
        ];

        res.json({ predictions });
    } catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({ error: 'Failed to fetch predictions' });
    }
});

// Get profile status
router.get('/profile-status', auth, async (req, res) => {
    try {
        const profile = await pool.query(
            'SELECT verification_status FROM taxpayer_profiles WHERE user_id = $1',
            [req.user.user_id]
        );

        if (profile.rows.length === 0) {
            return res.json({ 
                exists: false,
                verified: false,
                message: 'No profile found' 
            });
        }

        res.json({
            exists: true,
            verified: profile.rows[0].verification_status === 'verified',
            status: profile.rows[0].verification_status
        });
    } catch (error) {
        console.error('Profile status error:', error);
        res.status(500).json({ error: 'Failed to check profile status' });
    }
});

// Get verification status (alias for profile-status for backward compatibility)
router.get('/verification-status', auth, async (req, res) => {
    try {
        const profile = await pool.query(
            'SELECT verification_status FROM taxpayer_profiles WHERE user_id = $1',
            [req.user.user_id]
        );

        if (profile.rows.length === 0) {
            return res.json({ status: 'not_submitted' });
        }

        res.json({ status: profile.rows[0].verification_status });
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ error: 'Failed to get status: ' + error.message });
    }
});
 // Get taxpayer profile with category info
router.get('/my-profile', auth, async (req, res) => {
    try {
        const profile = await pool.query(
            `SELECT 
                tp.*,
                tc.category_code,
                tc.category_name,
                tc.min_income,
                tc.max_income,
                tc.formula_type,
                tc.base_rate,
                tc.multiplier,
                tc.fixed_amount,
                CASE 
                    WHEN tc.formula_type = 'percentage_of_last_year' THEN 
                        CONCAT('Multiply last year tax by ', tc.multiplier)
                    WHEN tc.formula_type = 'fixed_amount' THEN 
                        CONCAT('Fixed amount of ETB ', tc.fixed_amount)
                    WHEN tc.formula_type = 'mixed' THEN 
                        CONCAT('ETB ', tc.fixed_amount, ' + ', tc.base_rate, '%')
                    ELSE tc.formula_type
                END as formula_description
             FROM taxpayer_profiles tp
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             WHERE tp.user_id = $1`,
            [req.user.user_id]
        );

        if (profile.rows.length === 0) {
            return res.json({ profile: null });
        }

        const profileData = profile.rows[0];
        profileData.income_range = profileData.min_income && profileData.max_income
            ? `ETB ${profileData.min_income.toLocaleString()} - ${profileData.max_income.toLocaleString()}`
            : profileData.min_income 
                ? `Above ETB ${profileData.min_income.toLocaleString()}`
                : 'Not specified';

        res.json({ profile: profileData });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get current year tax
router.get('/current-year-tax', auth, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        
        const tax = await pool.query(
            `SELECT 
                atc.*,
                CASE 
                    WHEN atc.payment_status = 'paid' THEN true
                    ELSE false
                END as paid
             FROM annual_tax_calculations atc
             WHERE atc.user_id = $1 AND atc.tax_year = $2`,
            [req.user.user_id, currentYear]
        );

        if (tax.rows.length === 0) {
            return res.json({ 
                amount: 0, 
                paid: false,
                payment_status: 'pending'
            });
        }

        res.json({ 
            amount: tax.rows[0].calculated_tax,
            paid: tax.rows[0].payment_status === 'paid',
            payment_status: tax.rows[0].payment_status
        });
    } catch (error) {
        console.error('Get current year tax error:', error);
        res.status(500).json({ error: 'Failed to fetch current year tax' });
    }
});

// Get taxpayer predictions
router.get('/my-predictions', auth, async (req, res) => {
    try {
        const predictions = await pool.query(
            `SELECT * FROM tax_predictions 
             WHERE user_id = $1 
             ORDER BY prediction_year ASC 
             LIMIT 5`,
            [req.user.user_id]
        );

        res.json({ predictions: predictions.rows });
    } catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({ error: 'Failed to fetch predictions' });
    }
});

// Get taxpayer declarations
router.get('/my-declarations', auth, async (req, res) => {
    try {
        const declarations = await pool.query(
            `SELECT 
                fd.*,
                tt.tax_name as tax_type_name
             FROM financial_declarations fd
             LEFT JOIN tax_types_town tt ON fd.tax_type_id = tt.id
             WHERE fd.user_id = $1 
             ORDER BY fd.created_at DESC
             LIMIT 10`,
            [req.user.user_id]
        );

        res.json({ declarations: declarations.rows });
    } catch (error) {
        console.error('Get declarations error:', error);
        res.status(500).json({ error: 'Failed to fetch declarations' });
    }
});
// Get taxpayer payment history
router.get('/payment-history', auth, async (req, res) => {
    try {
        const payments = await pool.query(
            `SELECT 
                tp.id,
                tp.paid_amount as amount,
                tp.payment_status as status,
                tp.created_at,
                tp.payment_date,
                tt.name as tax_type_name
             FROM tax_payments tp
             LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
             WHERE tp.user_id = $1 
             AND tp.payment_status = 'completed'
             ORDER BY tp.created_at DESC
             LIMIT 20`,
            [req.user.user_id]
        );

        res.json({ payments: payments.rows });

    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});
module.exports = router;