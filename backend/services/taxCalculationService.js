const pool = require('../config/database');

class TaxCalculationService {
  
  // Calculate income tax using Ethiopian tax brackets
  async calculateIncomeTax(monthlyIncome) {
    try {
      const brackets = await pool.query(
        'SELECT * FROM tax_brackets WHERE tax_type_id = 1 ORDER BY min_income'
      );
      
      if (brackets.rows.length === 0) {
        throw new Error('No tax brackets found');
      }
      
      let annualIncome = monthlyIncome * 12;
      let tax = 0;
      let remainingIncome = annualIncome;
      
      for (let i = 0; i < brackets.rows.length; i++) {
        const bracket = brackets.rows[i];
        
        if (remainingIncome <= 0) break;
        
        // Calculate taxable amount in this bracket
        let taxableInBracket;
        if (bracket.max_income) {
          taxableInBracket = Math.min(bracket.max_income - bracket.min_income, remainingIncome);
        } else {
          taxableInBracket = remainingIncome; // No upper limit for last bracket
        }
        
        // Ensure we don't go below zero
        taxableInBracket = Math.max(0, taxableInBracket);
        
        // Calculate tax for this bracket
        const bracketTax = bracket.fixed_amount + (taxableInBracket * (bracket.tax_rate / 100));
        tax += bracketTax;
        remainingIncome -= taxableInBracket;
      }
      
      // Return monthly tax amount
      return Math.max(0, tax / 12);
      
    } catch (error) {
      console.error('Calculate income tax error:', error);
      throw error;
    }
  }

  // Calculate VAT
  calculateVAT(salesAmount, purchaseAmount) {
    const vatRate = 0.15;
    const taxableAmount = (parseFloat(salesAmount) || 0) - (parseFloat(purchaseAmount) || 0);
    return Math.max(0, taxableAmount * vatRate);
  }

  // Calculate Business Profit Tax
  calculateBusinessProfitTax(profit) {
    const taxRate = 0.30;
    return (parseFloat(profit) || 0) * taxRate;
  }

  // AI-based calculation using historical data
  calculateUsingHistoricalData(lastYearTax, growthRate = 0.10) {
    return (parseFloat(lastYearTax) || 0) * (1 + growthRate);
  }
}

module.exports = new TaxCalculationService();