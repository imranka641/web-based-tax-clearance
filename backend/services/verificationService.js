const pool = require('../config/database');
const axios = require('axios');

class VerificationService {
    
    // ========== MAIN VERIFICATION ENTRY POINT ==========
    
    async verifyTaxpayer(userId, submittedData) {
        const results = {
            user_id: userId,
            overall_status: 'pending',
            verifications: [],
            flags: [],
            confidence_score: 0,
            risk_level: 'low'
        };
        
        try {
            // Run all verifications in parallel
            const [
                tinResult,
                incomeResult,
                businessResult,
                locationResult,
                historicalResult,
                peerResult
            ] = await Promise.all([
                this.verifyTIN(submittedData.tin, userId),
                this.verifyIncome(submittedData, userId),
                this.verifyBusiness(submittedData, userId),
                this.verifyLocation(userId),
                this.verifyHistoricalPatterns(userId),
                this.verifyPeerComparison(userId, submittedData)
            ]);
            
            results.verifications = [
                tinResult,
                incomeResult,
                businessResult,
                locationResult,
                historicalResult,
                peerResult
            ];
            
            // Collect all flags
            results.flags = results.verifications
                .filter(v => v.flags && v.flags.length > 0)
                .flatMap(v => v.flags);
            
            // Calculate overall confidence score
            const validScores = results.verifications
                .filter(v => v.confidence_score !== null && v.confidence_score !== undefined)
                .map(v => v.confidence_score);
            
            results.confidence_score = validScores.length > 0 ?
                validScores.reduce((a, b) => a + b, 0) / validScores.length : 50;
            
            // Determine risk level
            results.risk_level = this.calculateRiskLevel(results.flags, results.confidence_score);
            
            // Determine overall status
            results.overall_status = results.flags.length === 0 ? 'verified' :
                results.flags.some(f => f.severity === 'critical') ? 'blocked' :
                results.flags.some(f => f.severity === 'high') ? 'flagged' : 'pending';
            
            // Save verification log
            await this.saveVerificationLog(userId, results, submittedData);
            
            // Update fraud detection score
            await this.updateFraudScore(userId, results);
            
            return results;
            
        } catch (error) {
            console.error('Verification error:', error);
            throw error;
        }
    }
    
    // ========== TIN VERIFICATION ==========
    
    async verifyTIN(tin, userId) {
        const result = {
            type: 'tin_verification',
            status: 'pending',
            confidence_score: 0,
            flags: []
        };
        
        try {
            // 1. Format validation
            if (!tin || !/^[0-9]{10}$/.test(tin)) {
                result.flags.push({
                    type: 'tin_format',
                    severity: 'critical',
                    message: 'Invalid TIN format - must be exactly 10 digits'
                });
                result.status = 'failed';
                result.confidence_score = 0;
                return result;
            }
            
            // 2. Checksum validation (Mod11 algorithm)
            const isValidChecksum = this.validateTINChecksum(tin);
            if (!isValidChecksum) {
                result.flags.push({
                    type: 'tin_checksum',
                    severity: 'critical',
                    message: 'TIN failed checksum validation - possible fake TIN'
                });
                result.status = 'failed';
                result.confidence_score = 0;
                return result;
            }
            
            // 3. Check for duplicates
            const duplicateCheck = await pool.query(
                'SELECT COUNT(*) FROM users WHERE tin = $1 AND id != $2',
                [tin, userId]
            );
            
            if (parseInt(duplicateCheck.rows[0].count) > 0) {
                result.flags.push({
                    type: 'tin_duplicate',
                    severity: 'critical',
                    message: 'TIN already registered to another taxpayer'
                });
                result.status = 'failed';
                result.confidence_score = 0;
                return result;
            }
            
            // 4. External API verification (mock)
            const apiVerification = await this.verifyTINWithAPI(tin);
            if (!apiVerification.valid) {
                result.flags.push({
                    type: 'tin_api_failure',
                    severity: 'high',
                    message: 'TIN could not be verified with Ministry database'
                });
                result.status = 'flagged';
                result.confidence_score = 50;
                return result;
            }
            
            result.status = 'verified';
            result.confidence_score = 95;
            result.verified_data = apiVerification.data;
            
        } catch (error) {
            console.error('TIN verification error:', error);
            result.flags.push({
                type: 'tin_verification_error',
                severity: 'medium',
                message: 'Error during TIN verification'
            });
        }
        
        return result;
    }
    
    validateTINChecksum(tin) {
        // Ethiopian TIN Mod11 checksum algorithm
        const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4]; // First 9 digits weights
        let sum = 0;
        
        for (let i = 0; i < 9; i++) {
            sum += parseInt(tin[i]) * weights[i];
        }
        
        const remainder = sum % 11;
        const checkDigit = remainder === 10 ? 0 : remainder;
        
        return checkDigit === parseInt(tin[9]);
    }
    
    async verifyTINWithAPI(tin) {
        // Mock API call - in production, call actual Ministry API
        await this.sleep(500); // Simulate API delay
        
        // For demo: assume 90% of TINs are valid
        const isValid = Math.random() < 0.9;
        
        return {
            valid: isValid,
            data: isValid ? {
                registered_name: 'Sample Business PLC',
                registration_date: '2020-01-15',
                status: 'active',
                tax_office: 'Addis Ababa Large Taxpayers Office'
            } : null
        };
    }
    
    // ========== INCOME VERIFICATION ==========
    
    async verifyIncome(submittedData, userId) {
        const result = {
            type: 'income_verification',
            status: 'pending',
            confidence_score: 0,
            flags: []
        };
        
        try {
            const income = parseFloat(submittedData.monthly_income) || 0;
            
            if (income <= 0) {
                result.flags.push({
                    type: 'income_invalid',
                    severity: 'medium',
                    message: 'Income must be greater than zero'
                });
                result.status = 'failed';
                return result;
            }
            
            // Get user's sector and location
            const userData = await pool.query(
                `SELECT u.business_sector, u.region_id, u.town_id 
                 FROM users u WHERE u.id = $1`,
                [userId]
            );
            
            if (userData.rows.length > 0) {
                const user = userData.rows[0];
                
                // Check against sector benchmarks
                const benchmarks = await pool.query(
                    `SELECT * FROM income_benchmarks 
                     WHERE sector_code = $1 
                     AND (region_id = $2 OR region_id IS NULL)
                     ORDER BY region_id NULLS LAST
                     LIMIT 1`,
                    [user.business_sector, user.region_id]
                );
                
                if (benchmarks.rows.length > 0) {
                    const bench = benchmarks.rows[0];
                    
                    // Check if income is within normal range
                    if (income < bench.min_income) {
                        result.flags.push({
                            type: 'income_below_min',
                            severity: 'medium',
                            message: `Income is below minimum for this sector (ETB ${bench.min_income})`
                        });
                    }
                    
                    if (income > bench.max_income * 2) {
                        result.flags.push({
                            type: 'income_exceptionally_high',
                            severity: 'high',
                            message: `Income is unusually high for this sector (max: ETB ${bench.max_income})`
                        });
                    } else if (income > bench.max_income) {
                        result.flags.push({
                            type: 'income_above_max',
                            severity: 'low',
                            message: `Income is above typical range for this sector`
                        });
                    }
                    
                    // Calculate deviation from average
                    const deviation = ((income - bench.average_income) / bench.average_income) * 100;
                    
                    if (Math.abs(deviation) > 200) {
                        result.flags.push({
                            type: 'income_extreme_deviation',
                            severity: 'high',
                            message: `Income deviates ${Math.round(deviation)}% from sector average`
                        });
                    } else if (Math.abs(deviation) > 100) {
                        result.flags.push({
                            type: 'income_significant_deviation',
                            severity: 'medium',
                            message: `Income deviates ${Math.round(deviation)}% from sector average`
                        });
                    }
                    
                    // Adjust confidence based on deviation
                    result.confidence_score = Math.max(0, 100 - Math.abs(deviation) / 2);
                } else {
                    // No benchmarks found, use default confidence
                    result.confidence_score = 70;
                }
            }
            
            // Check against previous years
            const historical = await pool.query(
                `SELECT paid_amount FROM tax_payments 
                 WHERE user_id = $1 AND payment_status = 'completed'
                 ORDER BY payment_date DESC LIMIT 3`,
                [userId]
            );
            
            if (historical.rows.length > 0) {
                const avgHistorical = historical.rows.reduce((sum, row) => 
                    sum + parseFloat(row.paid_amount), 0) / historical.rows.length;
                
                const historicalDeviation = ((income * 12 - avgHistorical) / avgHistorical) * 100;
                
                if (Math.abs(historicalDeviation) > 100) {
                    result.flags.push({
                        type: 'income_historical_discrepancy',
                        severity: 'high',
                        message: `Income differs significantly from historical payments`
                    });
                }
            }
            
            result.status = result.flags.length === 0 ? 'verified' : 
                result.flags.some(f => f.severity === 'high') ? 'flagged' : 'pending';
            
        } catch (error) {
            console.error('Income verification error:', error);
            result.flags.push({
                type: 'income_verification_error',
                severity: 'medium',
                message: 'Error during income verification'
            });
        }
        
        return result;
    }
    
    // ========== BUSINESS VERIFICATION ==========
    
    async verifyBusiness(submittedData, userId) {
        const result = {
            type: 'business_verification',
            status: 'pending',
            confidence_score: 0,
            flags: []
        };
        
        try {
            // Check if business license exists
            if (submittedData.business_license) {
                const licenseValid = await this.verifyBusinessLicense(
                    submittedData.business_license,
                    submittedData.business_name
                );
                
                if (!licenseValid.valid) {
                    result.flags.push({
                        type: 'invalid_license',
                        severity: 'high',
                        message: 'Business license could not be verified'
                    });
                } else {
                    result.confidence_score = 80;
                }
            }
            
            // Check business name against TIN registry
            const tinData = await pool.query(
                'SELECT full_name FROM users WHERE id = $1',
                [userId]
            );
            
            if (tinData.rows.length > 0) {
                const nameSimilarity = this.calculateNameSimilarity(
                    tinData.rows[0].full_name,
                    submittedData.business_name
                );
                
                if (nameSimilarity < 0.5) {
                    result.flags.push({
                        type: 'name_mismatch',
                        severity: 'medium',
                        message: 'Business name does not match registered owner name'
                    });
                }
            }
            
            result.status = result.flags.length === 0 ? 'verified' : 'flagged';
            
        } catch (error) {
            console.error('Business verification error:', error);
            result.flags.push({
                type: 'business_verification_error',
                severity: 'medium',
                message: 'Error during business verification'
            });
        }
        
        return result;
    }
    
    async verifyBusinessLicense(licenseNumber, businessName) {
        // Mock API call
        await this.sleep(300);
        
        return {
            valid: Math.random() < 0.85,
            data: {
                registered_name: businessName,
                license_type: 'commercial',
                expiry_date: '2025-12-31'
            }
        };
    }
    
    // ========== LOCATION VERIFICATION ==========
    
    async verifyLocation(userId) {
        const result = {
            type: 'location_verification',
            status: 'pending',
            confidence_score: 0,
            flags: []
        };
        
        try {
            const userData = await pool.query(
                `SELECT u.*, t.name as town_name, r.name as region_name
                 FROM users u
                 LEFT JOIN towns t ON u.town_id = t.id
                 LEFT JOIN regions r ON u.region_id = r.id
                 WHERE u.id = $1`,
                [userId]
            );
            
            if (userData.rows.length === 0) {
                result.flags.push({
                    type: 'location_missing',
                    severity: 'medium',
                    message: 'Location information incomplete'
                });
                return result;
            }
            
            const user = userData.rows[0];
            
            // Check for multiple users at same location
            if (user.address) {
                const duplicateLocation = await pool.query(
                    `SELECT COUNT(*) FROM users 
                     WHERE town_id = $1 AND region_id = $2 
                     AND address ILIKE $3 AND id != $4`,
                    [user.town_id, user.region_id, `%${user.address}%`, userId]
                );
                
                if (parseInt(duplicateLocation.rows[0].count) > 3) {
                    result.flags.push({
                        type: 'location_crowded',
                        severity: 'low',
                        message: 'Multiple businesses registered at this location'
                    });
                }
            }
            
            result.status = 'verified';
            result.confidence_score = 90;
            
        } catch (error) {
            console.error('Location verification error:', error);
            result.flags.push({
                type: 'location_verification_error',
                severity: 'medium',
                message: 'Error during location verification'
            });
        }
        
        return result;
    }
    
    // ========== HISTORICAL PATTERN VERIFICATION ==========
    
    async verifyHistoricalPatterns(userId) {
        const result = {
            type: 'historical_verification',
            status: 'verified',
            confidence_score: 0,
            flags: []
        };
        
        try {
            // Get payment history
            const payments = await pool.query(
                `SELECT payment_date, paid_amount, payment_status
                 FROM tax_payments
                 WHERE user_id = $1
                 ORDER BY payment_date DESC`,
                [userId]
            );
            
            if (payments.rows.length > 0) {
                // Check for payment consistency
                const amounts = payments.rows.map(p => parseFloat(p.paid_amount));
                const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
                const stdDev = this.calculateStdDev(amounts);
                
                // High variance might indicate inconsistency
                if (stdDev > avgAmount * 0.5) {
                    result.flags.push({
                        type: 'inconsistent_payments',
                        severity: 'medium',
                        message: 'Payment history shows high variance'
                    });
                }
                
                // Check for payment gaps
                const dates = payments.rows.map(p => new Date(p.payment_date));
                for (let i = 0; i < dates.length - 1; i++) {
                    const monthsDiff = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24 * 30);
                    if (monthsDiff > 6) {
                        result.flags.push({
                            type: 'payment_gap',
                            severity: 'low',
                            message: 'Significant gap in payment history detected'
                        });
                        break;
                    }
                }
                
                result.confidence_score = Math.max(0, 100 - (stdDev / avgAmount) * 100);
            } else {
                result.confidence_score = 70; // New taxpayer, less history
            }
            
        } catch (error) {
            console.error('Historical verification error:', error);
            result.flags.push({
                type: 'historical_verification_error',
                severity: 'medium',
                message: 'Error during historical verification'
            });
        }
        
        return result;
    }
    
    // ========== PEER COMPARISON VERIFICATION ==========
    
    async verifyPeerComparison(userId, submittedData) {
        const result = {
            type: 'peer_comparison',
            status: 'verified',
            confidence_score: 0,
            flags: []
        };
        
        try {
            const userData = await pool.query(
                'SELECT business_sector, region_id FROM users WHERE id = $1',
                [userId]
            );
            
            if (userData.rows.length > 0 && submittedData.monthly_income) {
                const user = userData.rows[0];
                const income = parseFloat(submittedData.monthly_income);
                
                // Only proceed if business_sector exists
                if (user.business_sector) {
                    // Get peer data (similar businesses in same region)
                    const peers = await pool.query(
                        `SELECT AVG(estimated_income) as avg_income,
                                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY estimated_income) as median_income
                         FROM users
                         WHERE business_sector = $1 
                         AND region_id = $2
                         AND estimated_income > 0
                         AND id != $3`,
                        [user.business_sector, user.region_id, userId]
                    );
                    
                    if (peers.rows.length > 0 && peers.rows[0].avg_income) {
                        const peerAvg = parseFloat(peers.rows[0].avg_income);
                        const deviation = ((income - peerAvg) / peerAvg) * 100;
                        
                        if (Math.abs(deviation) > 200) {
                            result.flags.push({
                                type: 'peer_outlier',
                                severity: 'high',
                                message: `Income is ${Math.round(deviation)}% different from peers`
                            });
                        }
                        
                        // Save peer comparison
                        await pool.query(
                            `INSERT INTO peer_comparison 
                             (user_id, peer_group_id, user_value, peer_average, peer_median, deviation_percentage, comparison_date)
                             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
                            [
                                userId,
                                `${user.business_sector}_${user.region_id}`,
                                income * 12,
                                peerAvg * 12,
                                (peers.rows[0].median_income || 0) * 12,
                                deviation
                            ]
                        );
                    }
                }
            }
            
        } catch (error) {
            console.error('Peer comparison error:', error);
            result.flags.push({
                type: 'peer_comparison_error',
                severity: 'low',
                message: 'Could not complete peer comparison'
            });
        }
        
        return result;
    }
    
    // ========== FRAUD DETECTION ==========
    
    calculateRiskLevel(flags, confidenceScore) {
        if (flags.some(f => f.severity === 'critical')) return 'critical';
        if (flags.some(f => f.severity === 'high')) return 'high';
        if (flags.length > 3) return 'high';
        if (flags.length > 1) return 'medium';
        if (flags.length > 0) return 'low';
        if (confidenceScore < 50) return 'medium';
        return 'low';
    }
    
    async updateFraudScore(userId, verificationResults) {
        try {
            const scores = {
                overall_score: 0,
                income_score: 100,
                location_score: 100,
                sector_score: 100,
                historical_score: 100,
                flagged_reasons: verificationResults.flags.map(f => f.message)
            };
            
            // Calculate individual scores
            verificationResults.verifications.forEach(v => {
                if (v.type === 'income_verification') {
                    scores.income_score = v.confidence_score || 50;
                } else if (v.type === 'location_verification') {
                    scores.location_score = v.confidence_score || 50;
                } else if (v.type === 'historical_verification') {
                    scores.historical_score = v.confidence_score || 50;
                }
            });
            
            // Overall score weighted average
            scores.overall_score = Math.min(100, (
                (scores.income_score * 0.4) +
                (scores.location_score * 0.2) +
                (scores.historical_score * 0.2) +
                (100 - (verificationResults.flags.length * 10))
            ));
            
            // Insert into fraud_detection_scores
            await pool.query(
                `INSERT INTO fraud_detection_scores 
                 (user_id, overall_score, income_score, location_score, sector_score, 
                  historical_score, flagged_reasons, risk_level, calculated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
                [
                    userId,
                    scores.overall_score,
                    scores.income_score,
                    scores.location_score,
                    scores.sector_score,
                    scores.historical_score,
                    scores.flagged_reasons,
                    verificationResults.risk_level
                ]
            );
            
        } catch (error) {
            console.error('Error updating fraud score:', error);
        }
    }
    
    async saveVerificationLog(userId, results, submittedData) {
        try {
            await pool.query(
                `INSERT INTO verification_logs 
                 (user_id, verification_type, verification_status, submitted_data, 
                  verified_data, confidence_score, flags, verified_at)
                 VALUES ($1, 'comprehensive', $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                [
                    userId,
                    results.overall_status,
                    JSON.stringify(submittedData),
                    JSON.stringify(results.verifications.reduce((acc, v) => ({
                        ...acc,
                        [v.type]: v.verified_data
                    }), {})),
                    results.confidence_score,
                    JSON.stringify(results.flags)
                ]
            );
        } catch (error) {
            console.error('Error saving verification log:', error);
        }
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    calculateStdDev(values) {
        if (values.length === 0) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }
    
    calculateNameSimilarity(name1, name2) {
        // Simple similarity calculation
        const s1 = (name1 || '').toLowerCase().trim();
        const s2 = (name2 || '').toLowerCase().trim();
        
        if (s1 === s2) return 1.0;
        if (s1.includes(s2) || s2.includes(s1)) return 0.8;
        
        // Basic word matching
        const words1 = s1.split(' ');
        const words2 = s2.split(' ');
        
        const commonWords = words1.filter(w => words2.includes(w));
        
        return commonWords.length / Math.max(words1.length, words2.length);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new VerificationService();