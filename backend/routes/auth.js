const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

const router = express.Router();

// Configure multer for ID file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/ids/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'id-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
        }
    }
});

// Register with ID verification
// Register with ID verification - FIXED VERSION
router.post('/register-with-id', upload.single('national_id_file'), async (req, res) => {
    try {
        console.log('📝 Registration attempt received');
        console.log('Request body:', req.body);
        console.log('File:', req.file);

        const { 
            full_name, 
            tin, 
            fayda_number,
            national_id_number,
            email, 
            password, 
            phone, 
            business_name,
            region_id,
            town_id 
        } = req.body;

        // Validation
        if (!full_name || !tin || !fayda_number || !national_id_number || !email || !password || !region_id || !town_id) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                error: 'All required fields must be filled',
                missing: {
                    full_name: !full_name,
                    tin: !tin,
                    fayda_number: !fayda_number,
                    national_id_number: !national_id_number,
                    email: !email,
                    password: !password,
                    region_id: !region_id,
                    town_id: !town_id
                }
            });
        }

        if (!req.file) {
            console.log('❌ No file uploaded');
            return res.status(400).json({ error: 'National ID file is required' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR tin = $2 OR fayda_number = $3 OR national_id_number = $4',
            [email, tin, fayda_number, national_id_number]
        );

        if (existingUser.rows.length > 0) {
            console.log('❌ User already exists');
            return res.status(400).json({ error: 'User with this email, TIN, Fayda number, or National ID already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        console.log('✅ Password hashed');

        // Insert new user with ID information
        const newUser = await pool.query(
            `INSERT INTO users (
                full_name, tin, fayda_number, national_id_number, 
                national_id_file_path, email, password_hash, phone, 
                business_name, region_id, town_id, role
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'taxpayer') 
            RETURNING id, full_name, tin, email, phone, business_name, region_id, town_id, fayda_number`,
            [full_name, tin, fayda_number, national_id_number, req.file.path, email, password_hash, phone, business_name, region_id, town_id]
        );

        console.log('✅ User inserted:', newUser.rows[0].id);

        // Create taxpayer record
        await pool.query(
            'INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance) VALUES ($1, true, true, 0)',
            [tin]
        );

        console.log('✅ Taxpayer record created');

        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: newUser.rows[0].id, 
                email: newUser.rows[0].email,
                role: 'taxpayer',
                region_id: newUser.rows[0].region_id,
                town_id: newUser.rows[0].town_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ JWT token generated');

        res.status(201).json({
            message: 'Registration successful! Your ID will be verified.',
            token,
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error stack:', error.stack);
        
        // Send more detailed error message for debugging
        res.status(500).json({ 
            error: 'Registration failed: ' + error.message,
            details: error.stack
        });
    }
});
// Regular registration (without ID upload - for testing)
router.post('/register', [
    body('full_name').notEmpty(),
    body('tin').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { full_name, tin, email, password, phone, business_name, region_id, town_id } = req.body;

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR tin = $2',
            [email, tin]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const newUser = await pool.query(
            `INSERT INTO users (full_name, tin, email, password_hash, phone, business_name, region_id, town_id, role) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'taxpayer') 
             RETURNING id, full_name, tin, email, phone, business_name, region_id, town_id`,
            [full_name, tin, email, password_hash, phone, business_name, region_id, town_id]
        );

        // Create taxpayer record
        await pool.query(
            'INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance) VALUES ($1, true, true, 0)',
            [tin]
        );

        // Generate token
        const token = jwt.sign(
            { user_id: newUser.rows[0].id, email: newUser.rows[0].email, role: 'taxpayer' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
router.post('/login', [
    body('email').isEmail(),
    body('password').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Get town and region names
        const locationInfo = await pool.query(
            `SELECT t.name as town_name, r.name as region_name 
             FROM towns t 
             JOIN regions r ON t.region_id = r.id 
             WHERE t.id = $1`,
            [user.town_id]
        );

        // Generate token
        const token = jwt.sign(
            { 
                user_id: user.id, 
                email: user.email,
                role: user.role,
                region_id: user.region_id,
                town_id: user.town_id,
                is_super_admin: user.is_super_admin
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                tin: user.tin,
                email: user.email,
                phone: user.phone,
                business_name: user.business_name,
                role: user.role,
                region_id: user.region_id,
                town_id: user.town_id,
                town_name: locationInfo.rows[0]?.town_name,
                region_name: locationInfo.rows[0]?.region_name,
                is_super_admin: user.is_super_admin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;