const pool = require('../config/database');

class PaymentService {
  
  // Simulate real payment processing with Ethiopian providers
  async processPayment(paymentData) {
    const { amount, payment_method_id, account_number, user_id } = paymentData;
    
    try {
      // Get payment method details
      const paymentMethod = await pool.query(
        'SELECT * FROM payment_methods WHERE id = $1',
        [payment_method_id]
      );

      if (paymentMethod.rows.length === 0) {
        throw new Error('Invalid payment method');
      }

      const method = paymentMethod.rows[0];

      // Simulate different payment gateway integrations
      let transactionResult;
      switch(method.name.toLowerCase()) {
        case 'telebirr':
          transactionResult = await this.processTelebirrPayment(amount, account_number, method);
          break;
        case 'commercial bank of ethiopia':
          transactionResult = await this.processCBEPayment(amount, account_number, method);
          break;
        case 'awash bank':
          transactionResult = await this.processAwashPayment(amount, account_number, method);
          break;
        case 'dashen bank':
          transactionResult = await this.processDashenPayment(amount, account_number, method);
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      // Update payment record
      await pool.query(
        `UPDATE tax_payments 
         SET payment_status = 'completed', 
             transaction_id = $1,
             paid_amount = $2,
             payment_date = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND payment_status = 'processing'`,
        [transactionResult.transaction_id, amount, user_id]
      );

      // Update taxpayer compliance record
      await this.updateTaxCompliance(user_id, amount);

      return {
        success: true,
        transaction_id: transactionResult.transaction_id,
        message: `Payment of ETB ${amount.toLocaleString()} processed successfully via ${method.name}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Update payment as failed
      await pool.query(
        `UPDATE tax_payments SET payment_status = 'failed' 
         WHERE user_id = $1 AND payment_status = 'processing'`,
        [user_id]
      );

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Simulate Telebirr payment
  async processTelebirrPayment(amount, accountNumber, method) {
    // Simulate API call to Telebirr
    await this.simulateAPICall();
    
    return {
      transaction_id: `TELEBIRR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'Telebirr',
      status: 'completed'
    };
  }

  // Simulate CBE payment
  async processCBEPayment(amount, accountNumber, method) {
    // Simulate API call to CBE
    await this.simulateAPICall();
    
    return {
      transaction_id: `CBE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'Commercial Bank of Ethiopia',
      status: 'completed'
    };
  }

  // Simulate Awash Bank payment
  async processAwashPayment(amount, accountNumber, method) {
    await this.simulateAPICall();
    
    return {
      transaction_id: `AWASH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'Awash Bank',
      status: 'completed'
    };
  }

  // Simulate Dashen Bank payment
  async processDashenPayment(amount, accountNumber, method) {
    await this.simulateAPICall();
    
    return {
      transaction_id: `DASHEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'Dashen Bank',
      status: 'completed'
    };
  }

  // Simulate API delay
  async simulateAPICall() {
    return new Promise(resolve => {
      setTimeout(resolve, 2000 + Math.random() * 3000); // 2-5 second delay
    });
  }

  // Update taxpayer compliance after successful payment
  async updateTaxCompliance(userId, amount) {
    const user = await pool.query('SELECT tin FROM users WHERE id = $1', [userId]);
    
    if (user.rows.length > 0) {
      const tin = user.rows[0].tin;
      
      await pool.query(
        `UPDATE taxpayer_records 
         SET has_paid_taxes = true,
             outstanding_balance = GREATEST(0, outstanding_balance - $1),
             last_updated = CURRENT_TIMESTAMP
         WHERE tin = $2`,
        [amount, tin]
      );
    }
  }
}

module.exports = new PaymentService();