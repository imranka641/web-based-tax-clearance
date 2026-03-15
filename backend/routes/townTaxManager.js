const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/taxpayer-docs/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Middleware to check if user is town admin
const requireTownAdmin = (req, res, next) => {
    if (req.user.role !== 'town_admin' && !req.user.is_super_admin) {
        return res.status(403).json({ error: 'Access denied. Town admin required.' });
    }
    next();
};

// ========== CATEGORY MANAGEMENT ==========

// Get all tax categories for this town
router.get('/categories', auth, requireTownAdmin, async (req, res) => {
    try {
        const categories = await pool.query(
            `SELECT * FROM tax_categories 
             WHERE town_id = $1 AND is_active = true 
             ORDER BY min_income DESC`,
            [req.user.town_id]
        );
        res.json({ categories: categories.rows });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create or update category
router.post('/categories', auth, requireTownAdmin, async (req, res) => {
    try {
        const {
            category_code, category_name, min_income, max_income,
            formula_type, base_rate, multiplier, fixed_amount,
            requires_review, auto_approve_threshold
        } = req.body;

        // Check if category already exists
        const existing = await pool.query(
            'SELECT id FROM tax_categories WHERE town_id = $1 AND category_code = $2',
            [req.user.town_id, category_code]
        );

        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(
                `UPDATE tax_categories SET
                    category_name = $1, min_income = $2, max_income = $3,
                    formula_type = $4, base_rate = $5, multiplier = $6,
                    fixed_amount = $7, requires_review = $8,
                    auto_approve_threshold = $9, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $10`,
                [category_name, min_income, max_income, formula_type,
                 base_rate, multiplier, fixed_amount, requires_review,
                 auto_approve_threshold, existing.rows[0].id]
            );
            res.json({ success: true, message: 'Category updated' });
        } else {
            // Create new
            const newCategory = await pool.query(
                `INSERT INTO tax_categories 
                 (town_id, category_code, category_name, min_income, max_income,
                  formula_type, base_rate, multiplier, fixed_amount,
                  requires_review, auto_approve_threshold, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [req.user.town_id, category_code, category_name, min_income, max_income,
                 formula_type, base_rate, multiplier, fixed_amount,
                 requires_review, auto_approve_threshold, req.user.user_id]
            );
            res.json({ success: true, category: newCategory.rows[0] });
        }
    } catch (error) {
        console.error('Save category error:', error);
        res.status(500).json({ error: 'Failed to save category' });
    }
});

// ========== PENDING VERIFICATIONS ==========

// Get pending taxpayer verifications
// Get pending taxpayer verifications
router.get('/pending-verifications', auth, requireTownAdmin, async (req, res) => {
    try {
        const pending = await pool.query(
            `SELECT 
                tp.id,
                tp.user_id,
                tp.last_year_income,
                tp.last_year_tax_paid,
                tp.business_type,
                tp.employee_count,
                tp.assigned_category,
                tp.verification_status,
                tp.created_at,
                u.full_name,
                u.email,
                u.phone,
                u.business_name,
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
        
        console.log(`Found ${pending.rows.length} pending verifications`);
        res.json({ pending: pending.rows });
    } catch (error) {
        console.error('Get pending verifications error:', error);
        res.status(500).json({ error: 'Failed to fetch pending verifications' });
    }
});
// Verify taxpayer profile
// Verify taxpayer profile
// Verify taxpayer profile - UPDATED VERSION
// Verify taxpayer profile
router.post('/verify-profile/:profileId', auth, requireTownAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { profileId } = req.params;
        const { status, notes, override_category } = req.body;

        console.log('Verifying profile:', { profileId, status, notes, override_category });

        // Validate inputs
        if (!profileId || !status) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Profile ID and status are required' });
        }

        // Get profile details with user info
        const profile = await client.query(
            `SELECT tp.*, u.id as user_id, u.email, u.full_name, u.town_id
             FROM taxpayer_profiles tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.id = $1`,
            [profileId]
        );

        if (profile.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Profile not found' });
        }

        const profileData = profile.rows[0];

        // Handle override_category - convert empty string to null
        let categoryId = profileData.category_id;
        if (override_category && override_category !== '') {
            categoryId = parseInt(override_category);
            if (isNaN(categoryId)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Invalid category ID' });
            }
        }

        // Update verification status
        await client.query(
            `UPDATE taxpayer_profiles 
             SET verification_status = $1,
                 verified_by = $2,
                 verified_at = CURRENT_TIMESTAMP,
                 verification_notes = $3,
                 category_id = $4
             WHERE id = $5`,
            [status, req.user.user_id, notes || null, categoryId, profileId]
        );

        if (status === 'verified') {
            // Get user ID
            const userId = profileData.user_id;
            const currentYear = new Date().getFullYear();
            
            // Get category details with complete information
            const category = await client.query(
                `SELECT * FROM tax_categories WHERE id = $1`,
                [categoryId]
            );

            if (category.rows.length === 0) {
                console.error('Category not found:', categoryId);
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Category not found' });
            }

            const cat = category.rows[0];
            const lastYearTax = parseFloat(profileData.last_year_tax_paid) || 0;
            const lastYearIncome = parseFloat(profileData.last_year_income) || 0;
            let calculatedTax = lastYearTax;

            // Apply formula based on category type
            console.log('Applying category formula:', cat);
            
            switch(cat.formula_type) {
                case 'percentage_of_last_year':
                    const multiplier = parseFloat(cat.multiplier) || 1.15;
                    calculatedTax = lastYearTax * multiplier;
                    console.log(`Percentage of last year: ${lastYearTax} × ${multiplier} = ${calculatedTax}`);
                    break;
                    
                case 'percentage_of_income':
                    const rate = parseFloat(cat.base_rate) || 0;
                    calculatedTax = lastYearIncome * (rate / 100);
                    console.log(`Percentage of income: ${lastYearIncome} × ${rate}% = ${calculatedTax}`);
                    break;
                    
                case 'fixed_amount':
                    calculatedTax = parseFloat(cat.fixed_amount) || 0;
                    console.log(`Fixed amount: ${calculatedTax}`);
                    break;
                    
                case 'mixed':
                    const mixMultiplier = parseFloat(cat.multiplier) || 1.0;
                    const mixFixed = parseFloat(cat.fixed_amount) || 0;
                    calculatedTax = Math.max(lastYearTax * mixMultiplier, mixFixed);
                    console.log(`Mixed: max(${lastYearTax} × ${mixMultiplier}, ${mixFixed}) = ${calculatedTax}`);
                    break;
                    
                default:
                    // Default to 115% of last year
                    calculatedTax = lastYearTax * 1.15;
                    console.log(`Default formula: ${lastYearTax} × 1.15 = ${calculatedTax}`);
            }

            // Ensure minimum tax if set
            if (cat.minimum_tax > 0 && calculatedTax < cat.minimum_tax) {
                calculatedTax = cat.minimum_tax;
                console.log(`Applied minimum tax: ${calculatedTax}`);
            }

            // Check if annual calculation already exists
            const existingCalc = await client.query(
                'SELECT id FROM annual_tax_calculations WHERE user_id = $1 AND tax_year = $2',
                [userId, currentYear]
            );

            if (existingCalc.rows.length === 0) {
                // Create new annual record
                await client.query(
                    `INSERT INTO annual_tax_calculations 
                     (user_id, tax_year, category_id, base_income, calculated_tax, final_tax, payment_status)
                     VALUES ($1, $2, $3, $4, $5, $5, 'pending')`,
                    [userId, currentYear, categoryId, lastYearIncome, calculatedTax]
                );
                console.log('Created new annual tax calculation for user:', userId);
            } else {
                // Update existing record
                await client.query(
                    `UPDATE annual_tax_calculations 
                     SET calculated_tax = $1,
                         category_id = $2,
                         base_income = $3
                     WHERE user_id = $4 AND tax_year = $5`,
                    [calculatedTax, categoryId, lastYearIncome, userId, currentYear]
                );
                console.log('Updated existing annual tax calculation');
            }

            // Generate predictions for next 3 years
            const years = [1, 2, 3];
            for (const offset of years) {
                const predictionYear = currentYear + offset;
                const predictedAmount = calculatedTax * Math.pow(1.1, offset); // 10% growth each year
                
                await client.query(
                    `INSERT INTO tax_predictions 
                     (user_id, prediction_year, predicted_amount, confidence_score, based_on_years)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (user_id, prediction_year) 
                     DO UPDATE SET 
                         predicted_amount = EXCLUDED.predicted_amount,
                         confidence_score = EXCLUDED.confidence_score`,
                    [
                        userId, 
                        predictionYear, 
                        predictedAmount, 
                        Math.max(90 - (offset * 5), 75), // Confidence decreases with years
                        [currentYear]
                    ]
                );
            }
            console.log('Generated predictions for next 3 years');
        }

        // Update verification queue
        await client.query(
            `UPDATE document_verification_queue 
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 notes = $3
             WHERE profile_id = $4`,
            [status === 'verified' ? 'approved' : status, req.user.user_id, notes, profileId]
        );

        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: `Profile ${status === 'verified' ? 'verified' : status} successfully`,
            profile_id: profileId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Verify profile error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to verify profile: ' + error.message });
    } finally {
        client.release();
    }
});
// ========== TAXPAYER MANAGEMENT ==========

// Get all verified taxpayers with their categories
router.get('/taxpayers', auth, requireTownAdmin, async (req, res) => {
    try {
        const taxpayers = await pool.query(
            `SELECT 
                u.id, u.full_name, u.business_name, u.email, u.tin,
                tp.last_year_income, tp.last_year_tax_paid,
                tc.category_code, tc.category_name,
                act.calculated_tax as current_year_tax,
                act.payment_status
             FROM users u
             JOIN taxpayer_profiles tp ON u.id = tp.user_id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             LEFT JOIN annual_tax_calculations act ON u.id = act.user_id 
                 AND act.tax_year = $1
             WHERE u.role = 'taxpayer' AND u.town_id = $2
             ORDER BY tc.category_code, u.business_name`,
            [new Date().getFullYear(), req.user.town_id]
        );
        res.json({ taxpayers: taxpayers.rows });
    } catch (error) {
        console.error('Get taxpayers error:', error);
        res.status(500).json({ error: 'Failed to fetch taxpayers' });
    }
});
// Get profile documents
router.get('/profile-documents/:profileId', auth, requireTownAdmin, async (req, res) => {
    try {
        const { profileId } = req.params;

        const profile = await pool.query(
            `SELECT 
                tax_certificate_path,
                business_license_path,
                financial_statement_path
             FROM taxpayer_profiles 
             WHERE id = $1`,
            [profileId]
        );

        if (profile.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const docs = profile.rows[0];
        
        res.json({
            documents: {
                tax_certificate: docs.tax_certificate_path || null,
                business_license: docs.business_license_path || null,
                financial_statement: docs.financial_statement_path || null
            }
        });

    } catch (error) {
        console.error('Get profile documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
// ========== STATISTICS AND REPORTS ==========

// Get tax statistics
router.get('/statistics', auth, requireTownAdmin, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        
        const stats = await pool.query(
            `SELECT 
                COUNT(DISTINCT u.id) as total_taxpayers,
                COUNT(DISTINCT CASE WHEN tp.verification_status = 'verified' THEN u.id END) as verified_taxpayers,
                COUNT(DISTINCT CASE WHEN tp.verification_status = 'pending' THEN u.id END) as pending_taxpayers,
                COALESCE(SUM(CASE WHEN act.payment_status = 'paid' THEN act.final_tax END), 0) as total_collected,
                COALESCE(SUM(CASE WHEN act.payment_status = 'overdue' THEN act.final_tax END), 0) as total_overdue,
                COUNT(DISTINCT tc.category_code) as category_count
             FROM users u
             LEFT JOIN taxpayer_profiles tp ON u.id = tp.user_id
             LEFT JOIN tax_categories tc ON tp.category_id = tc.id
             LEFT JOIN annual_tax_calculations act ON u.id = act.user_id AND act.tax_year = $1
             WHERE u.role = 'taxpayer' AND u.town_id = $2`,
            [currentYear, req.user.town_id]
        );
        
        // Get category breakdown
        const categoryBreakdown = await pool.query(
            `SELECT 
                tc.category_code,
                tc.category_name,
                COUNT(u.id) as taxpayer_count,
                COALESCE(SUM(act.final_tax), 0) as total_tax
             FROM tax_categories tc
             LEFT JOIN taxpayer_profiles tp ON tc.id = tp.category_id
             LEFT JOIN users u ON tp.user_id = u.id AND u.town_id = $2
             LEFT JOIN annual_tax_calculations act ON u.id = act.user_id AND act.tax_year = $1
             WHERE tc.town_id = $2
             GROUP BY tc.id, tc.category_code, tc.category_name
             ORDER BY tc.category_code`,
            [currentYear, req.user.town_id]
        );
        
        res.json({
            overview: stats.rows[0],
            category_breakdown: categoryBreakdown.rows
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;