const bcrypt = require('bcryptjs');

async function generateHashedPasswords() {
  const saltRounds = 10;
  
  const password123Hash = await bcrypt.hash('password123', saltRounds);
  
  console.log('=================================');
  console.log('PROPERLY HASHED PASSWORDS:');
  console.log('=================================');
  console.log(`Password: "password123"`);
  console.log(`Hash: ${password123Hash}`);
  console.log('=================================');
  
  return password123Hash;
}

generateHashedPasswords();