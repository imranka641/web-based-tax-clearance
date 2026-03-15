const axios = require('axios');

async function testRoutes() {
    try {
        // First, login to get token
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'bole.admin@tax.gov.et', // Use your town admin email
            password: 'password123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful, token obtained');

        // Test the TCC review endpoint
        try {
            const response = await axios.get('http://localhost:5000/api/town-admin/tcc-review/95', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ TCC review endpoint works:', response.data);
        } catch (error) {
            console.error('❌ TCC review endpoint failed:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
    }
}

testRoutes();