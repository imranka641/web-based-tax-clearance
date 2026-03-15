const pool = require('../config/database');

class AITaxVerification {
  
  // Calculate expected tax amount based on various factors
  async calculateExpectedTax(userId, taxTypeId, declaredAmount, incomeDetails) {
    try {
      const userProfile = await this.getUserTaxProfile(userId, taxTypeId);
      const taxType = await this.getTaxType(taxTypeId);
      
      let expectedAmount = 0;
      
      switch(taxType.formula) {
        case 'bracket_system':
          expectedAmount = await this.calculateByBracketSystem(incomeDetails.monthly_income);
          break;
        case 'percentage:0.15':
          expectedAmount = this.calculateVAT(incomeDetails.sales_amount, incomeDetails.purchase_amount);
          break;
        case 'percentage:0.30':
          expectedAmount = this.calculateBusinessTax(incomeDetails.profit);
          break;
        default:
          expectedAmount = await this.calculateUsingAIHistory(userProfile, declaredAmount, taxTypeId);
      }
      
      return this.verifyPayment(declaredAmount, expectedAmount, userProfile, taxType);
      
    } catch (error) {
      console.error('AI Verification Error:', error);
      return {
        approved: false,
        expected_amount: declaredAmount,
        warning: 'AI system temporarily unavailable. Payment requires manual review.',
        confidence: 0
      };
    }
  }

  // Calculate income tax using bracket system
  async calculateByBracketSystem(monthlyIncome) {
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
  }

  // Calculate VAT
  calculateVAT(salesAmount, purchaseAmount) {
    const vatRate = 0.15;
    return (salesAmount - purchaseAmount) * vatRate;
  }

  // Calculate Business Profit Tax
  calculateBusinessTax(profit) {
    const taxRate = 0.30;
    return profit * taxRate;
  }

  // AI learning from historical data
  async calculateUsingAIHistory(userProfile, declaredAmount, taxTypeId) {
    if (!userProfile || !userProfile.last_year_tax_paid) {
      return declaredAmount; // No historical data, trust user input
    }
    
    // Simple AI: Expected growth based on previous year + admin logic
    const growthRate = userProfile.expected_growth_rate || 0.1; // 10% default growth
    const expectedAmount = userProfile.last_year_tax_paid * (1 + growthRate);
    
    return expectedAmount;
  }

  // Verify if payment amount is correct
  verifyPayment(declaredAmount, expectedAmount, userProfile, taxType) {
    const difference = Math.abs(declaredAmount - expectedAmount);
    const percentageDiff = (difference / expectedAmount) * 100;
    
    let approved = true;
    let warning = '';
    let confidence = 100;

    // AI Verification Rules
    if (percentageDiff > 50) {
      approved = false;
      warning = `🚨 SERIOUS DISCREPANCY: You declared ETB ${declaredAmount.toLocaleString()} but should pay ETB ${expectedAmount.toLocaleString()} based on your income bracket. This is a ${percentageDiff.toFixed(1)}% difference. Please review your calculations or contact tax office.`;
      confidence = 10;
    } else if (percentageDiff > 20) {
      approved = false;
      warning = `⚠️ SIGNIFICANT DIFFERENCE: You declared ETB ${declaredAmount.toLocaleString()} but expected amount is ETB ${expectedAmount.toLocaleString()}. Difference: ${percentageDiff.toFixed(1)}%. Please verify your income details.`;
      confidence = 40;
    } else if (percentageDiff > 10) {
      approved = true;
      warning = `ℹ️ MINOR VARIATION: You declared ETB ${declaredAmount.toLocaleString()} while calculated amount is ETB ${expectedAmount.toLocaleString()}. Within acceptable range.`;
      confidence = 80;
    } else {
      approved = true;
      warning = `✅ ACCURATE PAYMENT: Your declared amount matches the expected calculation.`;
      confidence = 95;
    }

    // Check if user has history of under-reporting
    if (userProfile && declaredAmount < expectedAmount && userProfile.under_reporting_count > 2) {
      approved = false;
      warning += `\n\n🚩 PATTERN DETECTED: Multiple under-reporting instances detected. This payment requires manual review.`;
      confidence = 5;
    }

    return {
      approved,
      expected_amount: expectedAmount,
      declared_amount: declaredAmount,
      difference: difference,
      percentage_difference: percentageDiff,
      warning,
      confidence,
      required_action: !approved ? 'manual_review' : 'auto_approve'
    };
  }

  async getUserTaxProfile(userId, taxTypeId) {
    const result = await pool.query(
      'SELECT * FROM user_tax_profiles WHERE user_id = $1 AND tax_type_id = $2',
      [userId, taxTypeId]
    );
    return result.rows[0] || null;
  }

  async getTaxType(taxTypeId) {
    const result = await pool.query('SELECT * FROM tax_types WHERE id = $1', [taxTypeId]);
    return result.rows[0];
  }
}

module.exports = new AITaxVerification();