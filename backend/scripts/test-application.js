const pool = require('../config/database');

async function testApplication() {
  try {
    console.log('Testing database connection and application submission...');
    
    // Test with a known user ID (get from your users table)
    const testUserId = 1; // Change this to an actual user ID from your database
    
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
    console.log('User found:', userCheck.rows[0] ? 'Yes' : 'No');
    
    if (userCheck.rows[0]) {
      console.log('User details:', userCheck.rows[0]);
      
      // Try to insert an application
      const result = await pool.query(
        'INSERT INTO tcc_applications (user_id, status) VALUES ($1, $2) RETURNING *',
        [testUserId, 'Submitted']
      );
      
      console.log('✅ Application inserted successfully:', result.rows[0]);
    } else {
      console.log('❌ User not found with ID:', testUserId);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    pool.end();
  }
}

testApplication();