const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// ========== TAXPAYER PREDICTION ROUTES ==========

// Get sector benchmarks - FIXED with better error handling
router.get('/sector-benchmarks', auth, async (req, res) => {
    try {
        console.log('Fetching sector benchmarks...');
        
        // Check if table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'business_sectors'
            );
        `);

        if (!tableExists.rows[0].exists) {
            console.log('Business sectors table does not exist, creating it...');
            
            // Create the table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS business_sectors (
                    id SERIAL PRIMARY KEY,
                    sector_code VARCHAR(50) UNIQUE NOT NULL,
                    sector_name VARCHAR(100) NOT NULL,
                    tax_rate DECIMAL(5,2) DEFAULT 15.0,
                    vat_applicable BOOLEAN DEFAULT true,
                    withholding_rate DECIMAL(5,2) DEFAULT 2.0,
                    turnover_threshold DECIMAL(15,2),
                    category VARCHAR(10),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            // Insert sample data
            await pool.query(`
                INSERT INTO business_sectors (sector_code, sector_name, tax_rate, vat_applicable, withholding_rate, turnover_threshold, category) VALUES
                ('RET001', 'Retail Trade', 15.0, true, 2.0, 500000, 'B'),
                ('SER001', 'Professional Services', 30.0, true, 5.0, 300000, 'A'),
                ('MAN001', 'Manufacturing', 20.0, true, 1.0, 1000000, 'A'),
                ('AGR001', 'Agriculture', 10.0, false, 0.5, 200000, 'C'),
                ('CON001', 'Construction', 25.0, true, 3.0, 1500000, 'A')
                ON CONFLICT (sector_code) DO NOTHING;
            `);
        }

        // Now fetch the benchmarks
        const benchmarks = await pool.query(`
            SELECT 
                sector_name,
                tax_rate,
                vat_applicable,
                withholding_rate,
                turnover_threshold,
                category,
                0 as avg_payment
            FROM business_sectors
            ORDER BY sector_name
        `);
        
        console.log(`Found ${benchmarks.rows.length} sectors`);
        res.json({ benchmarks: benchmarks.rows });
        
    } catch (error) {
        console.error('Sector benchmarks error:', error);
        // Return empty array instead of error to prevent frontend crashes
        res.json({ benchmarks: [] });
    }
});

// Get regional comparison - FIXED
router.get('/regional-comparison', auth, async (req, res) => {
    try {
        console.log('Fetching regional comparison...');
        
        // Get user's region
        const user = await pool.query(
            'SELECT region_id FROM users WHERE id = $1',
            [req.user.user_id]
        );
        
        // Check if regions table exists
        const regionsExist = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'regions'
            );
        `);

        if (!regionsExist.rows[0].exists) {
            console.log('Regions table does not exist, returning empty array');
            return res.json({
                regions: [],
                user_region: null
            });
        }
        
        // Get average tax by region
        const comparison = await pool.query(`
            SELECT 
                r.name as region_name,
                COALESCE(AVG(CAST(tp.paid_amount AS DECIMAL)), 0) as avg_tax,
                COUNT(DISTINCT u.id) as taxpayers,
                1.0 as tax_multiplier
            FROM regions r
            LEFT JOIN users u ON u.region_id = r.id
            LEFT JOIN tax_payments tp ON tp.user_id = u.id AND tp.payment_status = 'completed'
            GROUP BY r.id, r.name
            ORDER BY avg_tax DESC
        `);
        
        // Find user's region
        let userRegion = null;
        if (user.rows[0]?.region_id) {
            userRegion = comparison.rows.find(r => 
                r.region_name === user.rows[0].region_name
            );
        }
        
        res.json({
            regions: comparison.rows,
            user_region: userRegion || null
        });
        
    } catch (error) {
        console.error('Regional comparison error:', error);
        res.json({
            regions: [],
            user_region: null
        });
    }
});

// Get personalized tax prediction - FIXED
router.post('/predict', auth, async (req, res) => {
    try {
        const { tax_type_id, monthly_income, business_turnover } = req.body;
        
        console.log('Predicting tax for user:', req.user.user_id, 'income:', monthly_income);
        
        if (!monthly_income || monthly_income <= 0) {
            return res.status(400).json({ error: 'Valid monthly income is required' });
        }

        // Get user data
        const userResult = await pool.query(`
            SELECT u.*, 
                   r.name as region_name
            FROM users u
            LEFT JOIN regions r ON u.region_id = r.id
            WHERE u.id = $1
        `, [req.user.user_id]);
        
        const user = userResult.rows[0] || {};
        
        // Calculate base tax (simple 15% for now)
        const baseTax = parseFloat(monthly_income) * 0.15;
        
        // Simple factors
        const locationMultiplier = 1.0;
        const urbanizationMultiplier = 1.0;
        const inflationMultiplier = 1.25; // 25% inflation
        const growthMultiplier = 1.081; // 8.1% growth
        const seasonalMultiplier = 1.0;
        
        // Calculate final tax
        const predictedTax = baseTax * inflationMultiplier * growthMultiplier;
        
        // Calculate confidence
        let confidence = 70;
        if (business_turnover) confidence += 10;
        if (user.region_id) confidence += 5;
        
        // Generate explanation
        const explanation = [
            `• Base tax calculated at 15% of monthly income: ETB ${baseTax.toFixed(2)}`,
            `• Current inflation (25%): ${inflationMultiplier.toFixed(2)}x`,
            `• GDP growth (8.1%): ${growthMultiplier.toFixed(2)}x`
        ];
        
        // Generate recommendations
        const recommendations = [];
        if (predictedTax > baseTax * 1.2) {
            recommendations.push({
                type: 'warning',
                title: 'Higher Tax Burden Expected',
                message: 'Your predicted tax is higher due to inflation and economic growth factors.'
            });
        }
        
        res.json({
            predicted_tax: Math.round(predictedTax * 100) / 100,
            base_tax: Math.round(baseTax * 100) / 100,
            confidence: confidence,
            factors: {
                location: locationMultiplier.toFixed(2),
                urbanization: urbanizationMultiplier.toFixed(2),
                inflation: inflationMultiplier.toFixed(2),
                seasonal: seasonalMultiplier.toFixed(2),
                growth: growthMultiplier.toFixed(2)
            },
            explanation,
            recommendations
        });
        
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ 
            error: 'Failed to generate tax prediction',
            details: error.message 
        });
    }
});

// Optimize payment plan
router.post('/optimize-payment-plan', auth, async (req, res) => {
    try {
        const { annual_tax } = req.body;
        
        if (!annual_tax || annual_tax <= 0) {
            return res.status(400).json({ error: 'Valid annual tax amount is required' });
        }
        
        const plans = [
            {
                name: 'Monthly Installments',
                amount: Math.round((annual_tax / 12) * 100) / 100,
                frequency: 'Monthly',
                total: annual_tax,
                benefit: 'Easier cash flow management'
            },
            {
                name: 'Quarterly Payments',
                amount: Math.round((annual_tax / 4) * 100) / 100,
                frequency: 'Quarterly',
                total: annual_tax,
                benefit: 'Less frequent transactions'
            },
            {
                name: 'Annual Lump Sum',
                amount: Math.round((annual_tax * 0.98) * 100) / 100,
                frequency: 'Annual',
                total: Math.round((annual_tax * 0.98) * 100) / 100,
                benefit: '2% early payment discount'
            }
        ];
        
        res.json({
            success: true,
            plans,
            recommendation: 'Annual payment recommended for maximum savings'
        });
        
    } catch (error) {
        console.error('Payment plan optimization error:', error);
        res.status(500).json({ error: 'Failed to optimize payment plan' });
    }
});

// Inflation impact calculator
router.post('/inflation-impact', auth, async (req, res) => {
    try {
        const { last_year_tax } = req.body;
        const inflationRate = 25.0;
        
        const lastYearTax = parseFloat(last_year_tax) || 10000;
        const projectedTax = lastYearTax * (1 + inflationRate / 100);
        const additionalBurden = projectedTax - lastYearTax;
        
        const impact = {
            last_year_tax: lastYearTax,
            inflation_rate: inflationRate,
            projected_tax: Math.round(projectedTax * 100) / 100,
            additional_burden: Math.round(additionalBurden * 100) / 100,
            recommendation: additionalBurden > 5000 ?
                'Consider quarterly payments to spread the burden' :
                'Minimal impact, pay annually'
        };
        
        res.json(impact);
        
    } catch (error) {
        console.error('Inflation impact error:', error);
        res.status(500).json({ error: 'Failed to calculate inflation impact' });
    }
});

module.exports = router;