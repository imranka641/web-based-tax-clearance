const bcrypt = require('bcryptjs');

async function generatePasswordHashes() {
  const passwords = {
    // Super Admin
    'superadmin@tax.gov.et': 'Admin123!',
    
    // Regional Admins
    'amhara.admin@tax.gov.et': 'Amhara@2024',
    'oromia.admin@tax.gov.et': 'Oromia@2024',
    'tigray.admin@tax.gov.et': 'Tigray@2024',
    'addis.admin@tax.gov.et': 'Addis@2024',
    'snnp.admin@tax.gov.et': 'Snnp@2024',
    
    // Town Admins - Amhara
    'bahirdar.admin@tax.gov.et': 'Bahirdar@2024',
    'gondar.admin@tax.gov.et': 'Gondar@2024',
    'dessie.admin@tax.gov.et': 'Dessie@2024',
    
    // Town Admins - Oromia
    'adama.admin@tax.gov.et': 'Adama@2024',
    'jimma.admin@tax.gov.et': 'Jimma@2024',
    'bishoftu.admin@tax.gov.et': 'Bishoftu@2024',
    
    // Town Admins - Tigray
    'mekelle.admin@tax.gov.et': 'Mekelle@2024',
    'adwa.admin@tax.gov.et': 'Adwa@2024',
    'axum.admin@tax.gov.et': 'Axum@2024',
    
    // Town Admins - Addis Ababa
    'bole.admin@tax.gov.et': 'Bole@2024',
    'kirkos.admin@tax.gov.et': 'Kirkos@2024',
    'arada.admin@tax.gov.et': 'Arada@2024',
    
    // Town Admins - Southern Nations
    'hawassa.admin@tax.gov.et': 'Hawassa@2024',
    'arbaminch.admin@tax.gov.et': 'Arbaminch@2024',
    'sodo.admin@tax.gov.et': 'Sodo@2024'
  };

  console.log('Generated Password Hashes:');
  console.log('===========================\n');
  
  for (const [email, password] of Object.entries(passwords)) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('---');
  }
}

generatePasswordHashes();