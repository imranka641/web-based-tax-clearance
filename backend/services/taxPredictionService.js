const pool = require('../config/database');

class TaxPredictionService {
    
    // Main prediction function
    async predictTaxpayerTax(userId, taxTypeId, inputData) {
        try {
            const taxpayer = await this.getTaxpayerData(userId);
            const locationFactors = await this.getLocationFactors(taxpayer.town_id);
            const sectorFactors = await this.getSectorFactors(taxpayer.business_sector);
            const economicIndicators = await this.getEconomicIndicators();
            const seasonalFactor = await this.getSeasonalFactor();
            const historicalData = await this.getHistoricalData(userId);
            
            // Calculate base tax
            let baseTax = await this.calculateBaseTax(
                inputData.income || taxpayer.estimated_income,
                taxTypeId
            );
            
            // Apply all factors
            const prediction = this.applyAllFactors({
                baseTax,
                locationFactors,
                sectorFactors,
                economicIndicators,
                seasonalFactor,
                historicalData,
                taxpayer
            });
            
            // Save prediction for ML training
            await this.savePrediction(userId, prediction);
            
            return prediction;
            
        } catch (error) {
            console.error('Tax prediction error:', error);
            throw error;
        }
    }
    
    // Get comprehensive taxpayer data
    async getTaxpayerData(userId) {
        const result = await pool.query(`
            SELECT 
                u.*,
                t.name as town_name,
                r.name as region_name,
                r.id as region_id,
                bs.sector_name,
                bs.tax_rate as sector_tax_rate,
                bs.vat_applicable,
                bs.withholding_rate,
                bs.category,
                COALESCE((
                    SELECT AVG(paid_amount) FROM tax_payments 
                    WHERE user_id = u.id AND payment_status = 'completed'
                ), 0) as avg_payment,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE user_id = u.id AND payment_status = 'completed'
                ), 0) as total_paid
            FROM users u
            LEFT JOIN towns t ON u.town_id = t.id
            LEFT JOIN regions r ON u.region_id = r.id
            LEFT JOIN business_sectors bs ON u.business_sector = bs.sector_code
            WHERE u.id = $1
        `, [userId]);
        
        return result.rows[0];
    }
    
    // Get location-based factors
    async getLocationFactors(townId) {
        const result = await pool.query(`
            SELECT lf.*, r.name as region_name
            FROM location_factors lf
            JOIN regions r ON lf.region_id = r.id
            WHERE lf.town_id = $1
        `, [townId]);
        
        if (result.rows.length === 0) {
            // Default factors if not found
            return {
                urbanization_level: 'semi_urban',
                distance_from_capital_km: 300,
                economic_zone: 'mixed',
                cost_of_living_index: 1.0,
                business_density: 50,
                tax_multiplier: 1.0
            };
        }
        
        return result.rows[0];
    }
    
    // Get sector-specific factors
    async getSectorFactors(sectorCode) {
        if (!sectorCode) return { tax_rate: 15.0, vat_applicable: true };
        
        const result = await pool.query(
            'SELECT * FROM business_sectors WHERE sector_code = $1',
            [sectorCode]
        );
        
        return result.rows[0] || { tax_rate: 15.0, vat_applicable: true };
    }
    
    // Get current economic indicators
    async getEconomicIndicators() {
        const result = await pool.query(`
            SELECT indicator_name, indicator_value 
            FROM economic_indicators 
            ORDER BY recorded_at DESC 
            LIMIT 10
        `);
        
        const indicators = {};
        result.rows.forEach(row => {
            indicators[row.indicator_name] = row.indicator_value;
        });
        
        return indicators;
    }
    
    // Get seasonal factor for current month
    async getSeasonalFactor() {
        const currentMonth = new Date().getMonth() + 1;
        const result = await pool.query(
            'SELECT * FROM seasonal_factors WHERE month = $1',
            [currentMonth]
        );
        
        return result.rows[0] || { multiplier: 1.0, factor_name: 'normal' };
    }
    
    // Get taxpayer's historical tax data
    async getHistoricalData(userId) {
        const result = await pool.query(`
            SELECT 
                EXTRACT(YEAR FROM payment_date) as year,
                SUM(paid_amount) as total,
                COUNT(*) as count,
                AVG(paid_amount) as average
            FROM tax_payments 
            WHERE user_id = $1 AND payment_status = 'completed'
            GROUP BY EXTRACT(YEAR FROM payment_date)
            ORDER BY year DESC
            LIMIT 3
        `, [userId]);
        
        return result.rows;
    }
    
    // Calculate base tax using income brackets
    async calculateBaseTax(monthlyIncome, taxTypeId) {
        if (!monthlyIncome || monthlyIncome <= 0) return 0;
        
        if (taxTypeId == 1) { // Income Tax
            const brackets = await pool.query(
                'SELECT * FROM income_brackets_2025 ORDER BY min_income'
            );
            
            let annualIncome = monthlyIncome * 12;
            let tax = 0;
            let remainingIncome = annualIncome;
            
            for (const bracket of brackets.rows) {
                if (remainingIncome <= 0) break;
                
                const bracketRange = bracket.max_income ? 
                    Math.min(bracket.max_income - bracket.min_income, remainingIncome) : 
                    remainingIncome;
                    
                const taxableInBracket = Math.max(0, Math.min(bracketRange, remainingIncome));
                
                tax += bracket.fixed_amount + (taxableInBracket * (bracket.tax_rate / 100));
                remainingIncome -= taxableInBracket;
            }
            
            return tax / 12; // Return monthly tax
        }
        
        return monthlyIncome * 0.15; // Default 15% for other tax types
    }
    
    // Apply all factors to base tax
    applyAllFactors({ baseTax, locationFactors, sectorFactors, economicIndicators, seasonalFactor, historicalData, taxpayer }) {
        
        // 1. Location factor (15% weight)
        const locationMultiplier = locationFactors.tax_multiplier || 1.0;
        
        // 2. Urbanization factor
        const urbanizationMultiplier = 
            locationFactors.urbanization_level === 'urban' ? 1.2 :
            locationFactors.urbanization_level === 'semi_urban' ? 1.0 : 0.8;
        
        // 3. Sector factor (20% weight)
        const sectorMultiplier = (sectorFactors.tax_rate / 15.0) || 1.0;
        
        // 4. Inflation factor (25% projected)
        const inflationMultiplier = 1 + (economicIndicators['Inflation Rate'] / 100) || 1.25;
        
        // 5. Seasonal factor
        const seasonalMultiplier = seasonalFactor.multiplier || 1.0;
        
        // 6. Historical trend factor (20% weight)
        let historicalMultiplier = 1.0;
        if (historicalData && historicalData.length > 0) {
            const avgHistorical = historicalData.reduce((sum, year) => sum + parseFloat(year.total), 0) / historicalData.length;
            if (avgHistorical > 0 && baseTax > 0) {
                historicalMultiplier = avgHistorical / (baseTax * 12);
            }
        }
        
        // 7. GDP Growth factor (8.1%)
        const growthMultiplier = 1 + (economicIndicators['GDP Growth Rate'] / 100) || 1.081;
        
        // 8. Business density factor
        const densityMultiplier = 1 + (locationFactors.business_density / 1000) || 1.0;
        
        // Calculate final tax with weights
        const finalTax = baseTax 
            * locationMultiplier 
            * urbanizationMultiplier 
            * sectorMultiplier
            * inflationMultiplier
            * seasonalMultiplier
            * growthMultiplier
            * densityMultiplier
            * (historicalMultiplier);
        
        // Calculate confidence score based on data availability
        let confidenceScore = 70; // Base confidence
        
        if (historicalData && historicalData.length >= 3) confidenceScore += 15;
        if (taxpayer.business_sector) confidenceScore += 5;
        if (taxpayer.estimated_income) confidenceScore += 5;
        if (locationFactors.id) confidenceScore += 5;
        
        confidenceScore = Math.min(95, confidenceScore);
        
        // Generate explanation
        const explanation = this.generateExplanation({
            baseTax,
            locationMultiplier,
            urbanizationMultiplier,
            sectorMultiplier,
            inflationMultiplier,
            seasonalMultiplier,
            growthMultiplier,
            densityMultiplier,
            historicalMultiplier,
            locationFactors,
            sectorFactors,
            seasonalFactor
        });
        
        return {
            predicted_tax: Math.round(finalTax * 100) / 100,
            base_tax: Math.round(baseTax * 100) / 100,
            confidence: confidenceScore,
            factors: {
                location: locationMultiplier.toFixed(2),
                urbanization: urbanizationMultiplier.toFixed(2),
                sector: sectorMultiplier.toFixed(2),
                inflation: inflationMultiplier.toFixed(2),
                seasonal: seasonalMultiplier.toFixed(2),
                growth: growthMultiplier.toFixed(2),
                density: densityMultiplier.toFixed(2),
                historical: historicalMultiplier.toFixed(2)
            },
            explanation,
            recommendations: this.generateRecommendations(taxpayer, finalTax, baseTax)
        };
    }
    
    // Generate human-readable explanation
    generateExplanation(factors) {
        const explanations = [];
        
        if (factors.locationMultiplier > 1.1) {
            explanations.push(`• Your location (${factors.locationFactors.region_name}) has higher tax rates due to urbanization and economic activity.`);
        } else if (factors.locationMultiplier < 0.9) {
            explanations.push(`• Your rural location qualifies for reduced tax rates.`);
        }
        
        if (factors.sectorMultiplier > 1.1) {
            explanations.push(`• Your business sector (${factors.sectorFactors.sector_name}) has a higher tax rate.`);
        }
        
        if (factors.inflationMultiplier > 1.2) {
            explanations.push(`• Current inflation (25%) has been factored into your tax calculation.`);
        }
        
        if (factors.seasonalMultiplier > 1.1) {
            explanations.push(`• Current seasonal period (${factors.seasonalFactor.factor_name}) shows increased business activity.`);
        }
        
        if (factors.historicalMultiplier > 1.1) {
            explanations.push(`• Based on your payment history, taxes are trending upward.`);
        } else if (factors.historicalMultiplier < 0.9) {
            explanations.push(`• Your historical payments suggest a downward trend.`);
        }
        
        return explanations;
    }
    
    // Generate personalized recommendations
    generateRecommendations(taxpayer, predictedTax, baseTax) {
        const recommendations = [];
        
        if (predictedTax > baseTax * 1.2) {
            recommendations.push({
                type: 'warning',
                title: 'Higher Tax Burden Expected',
                message: 'Your predicted tax is 20% higher than base rate due to location and sector factors.'
            });
        }
        
        if (!taxpayer.business_sector) {
            recommendations.push({
                type: 'info',
                title: 'Complete Your Business Profile',
                message: 'Adding your business sector will improve prediction accuracy.'
            });
        }
        
        if (taxpayer.total_paid < predictedTax * 0.8) {
            recommendations.push({
                type: 'danger',
                title: 'Potential Underpayment',
                message: 'Your payments are below predicted levels. Consider increasing your tax provisions.'
            });
        }
        
        if (taxpayer.region_id === 1) { // Addis Ababa
            recommendations.push({
                type: 'tip',
                title: 'Addis Ababa Tax Tip',
                message: 'Addis Ababa taxpayers may qualify for certain deductions. Consult your tax advisor.'
            });
        }
        
        return recommendations;
    }
    
    // Save prediction for ML training
    async savePrediction(userId, prediction) {
        try {
            await pool.query(
                `INSERT INTO taxpayer_predictions 
                 (user_id, prediction_date, predicted_tax, confidence_score, factors_used, model_version) 
                 VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)`,
                [userId, prediction.predicted_tax, prediction.confidence, 
                 JSON.stringify(prediction.factors), 'v1.0']
            );
        } catch (error) {
            console.error('Error saving prediction:', error);
        }
    }
}

module.exports = new TaxPredictionService();