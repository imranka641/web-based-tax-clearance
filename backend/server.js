const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');
require('dotenv').config();

// Import all routes
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const staffRoutes = require('./routes/staff');
const taxRoutes = require('./routes/tax');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/locations');
const townAdminRoutes = require('./routes/townAdmin');
const regionalAdminRoutes = require('./routes/regionalAdmin');
const townTaxManagerRoutes = require('./routes/townTaxManager'); // Add this
const taxpayerRoutes = require('./routes/taxpayer'); // Add this
const tccRoutes = require('./routes/tcc');
const publicRoutes = require('./routes/public');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Register all routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/town-admin', townAdminRoutes);
app.use('/api/regional-admin', regionalAdminRoutes);
app.use('/api/town-tax', townTaxManagerRoutes); // Add this
app.use('/api/taxpayer', taxpayerRoutes); // Add this
app.use('/api/tcc', tccRoutes); 
app.use('/api/public', publicRoutes);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Tax Clearance Backend',
        time: new Date().toISOString(),
        routes: {
            taxpayer: '/api/taxpayer/*',
            townTax: '/api/town-tax/*'
        }
    });
});

// Debug route to list all registered routes (for development)
app.get('/api/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    routes.push({
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    res.json(routes);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📍 Routes list: http://localhost:${PORT}/api/routes`);
    console.log(`📍 Taxpayer routes: http://localhost:${PORT}/api/taxpayer/*`);
    console.log(`📍 Town Tax routes: http://localhost:${PORT}/api/town-tax/*`);
});