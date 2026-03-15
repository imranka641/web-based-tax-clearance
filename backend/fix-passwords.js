const bcrypt = require('bcryptjs');

async function fixPasswords() {
  console.log('=== GENERATING CORRECT PASSWORD HASHES ===\n');
  
  // Passwords for your users
  const passwords = {
    'lekyun@gmail.com': 'lekyun123',
    'mejid@gmail.com': 'mejid123',
    'admin@tax.gov.et': 'password123',
    'john.smith@email.com': 'password123',
    'test@email.com': 'password123'
  };

  console.log('=== SQL UPDATE COMMANDS ===\n');
  
  for (const [email, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`-- Update password for: ${email}`);
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${email}';`);
    console.log(`-- Password: ${password}\n`);
  }

  console.log('=== TEST ACCOUNTS ===');
  console.log('1. Super Admin: lekyun@gmail.com / lekyun123');
  console.log('2. Staff: mejid@gmail.com / mejid123');
  console.log('3. Existing Admin: admin@tax.gov.et / password123');
  console.log('4. Test Taxpayer: john.smith@email.com / password123');
}

fixPasswords().catch(console.error);
