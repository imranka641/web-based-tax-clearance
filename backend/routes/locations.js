const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// ========== PUBLIC LOCATION ROUTES ==========

// Get all regions - FIXED VERSION
router.get('/regions', async (req, res) => {
    try {
        console.log('Fetching regions from database...'); // Debug log
        
        const result = await pool.query(
            'SELECT id, name, code FROM regions WHERE is_active = true ORDER BY name'
        );
        
        console.log('Regions found:', result.rows.length); // Debug log
        console.log('First region:', result.rows[0]); // Debug log
        
        // Make sure we're sending the data in the expected format
        res.status(200).json({ 
            success: true,
            regions: result.rows 
        });
        
    } catch (error) {
        console.error('Get regions error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch regions',
            details: error.message 
        });
    }
});

// Get towns by region - FIXED VERSION
router.get('/towns/:regionId', async (req, res) => {
    try {
        const { regionId } = req.params;
        
        console.log('Fetching towns for region:', regionId); // Debug log
        
        const result = await pool.query(
            'SELECT id, name, code FROM towns WHERE region_id = $1 AND is_active = true ORDER BY name',
            [regionId]
        );
        
        console.log('Towns found:', result.rows.length); // Debug log
        
        res.status(200).json({ 
            success: true,
            towns: result.rows 
        });
        
    } catch (error) {
        console.error('Get towns error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch towns' 
        });
    }
});

module.exports = router;