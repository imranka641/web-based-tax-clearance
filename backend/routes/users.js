const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Update user profile
router.put('/update-profile', auth, async (req, res) => {
    try {
        const { phone, business_name } = req.body;
        const userId = req.user.user_id;

        console.log('Updating profile for user:', userId, { phone, business_name });

        const updatedUser = await pool.query(
            `UPDATE users 
             SET phone = COALESCE($1, phone),
                 business_name = COALESCE($2, business_name),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, full_name, email, phone, business_name, tin, role, region_id, town_id`,
            [phone, business_name, userId]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get region and town names if applicable
        const user = updatedUser.rows[0];
        let regionName = null;
        let townName = null;

        if (user.region_id) {
            const region = await pool.query('SELECT name FROM regions WHERE id = $1', [user.region_id]);
            regionName = region.rows[0]?.name;
        }

        if (user.town_id) {
            const town = await pool.query('SELECT name FROM towns WHERE id = $1', [user.town_id]);
            townName = town.rows[0]?.name;
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                ...user,
                region_name: regionName,
                town_name: townName
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile: ' + error.message });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const user = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.business_name,
                u.tin,
                u.role,
                u.region_id,
                u.town_id,
                u.last_year_tax_amount,
                u.created_at,
                u.last_login,
                r.name as region_name,
                t.name as town_name
             FROM users u
             LEFT JOIN regions r ON u.region_id = r.id
             LEFT JOIN towns t ON u.town_id = t.id
             WHERE u.id = $1`,
            [userId]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get payment stats
        const paymentStats = await pool.query(
            `SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(paid_amount), 0) as total_paid,
                COUNT(*) FILTER (WHERE payment_status = 'completed') as completed_payments,
                COUNT(*) FILTER (WHERE payment_status = 'under_review') as pending_reviews
             FROM tax_payments 
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            user: user.rows[0],
            payment_stats: paymentStats.rows[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update last year tax amount
router.put('/update-last-year-tax', auth, async (req, res) => {
    try {
        const { last_year_tax_amount } = req.body;
        const userId = req.user.user_id;

        if (!last_year_tax_amount || last_year_tax_amount <= 0) {
            return res.status(400).json({ error: 'Valid last year tax amount is required' });
        }

        await pool.query(
            'UPDATE users SET last_year_tax_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [last_year_tax_amount, userId]
        );

        // Update or insert into taxpayer_records
        await pool.query(
            `INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance)
             SELECT tin, true, true, 0 FROM users WHERE id = $1
             ON CONFLICT (tin) 
             DO UPDATE SET last_updated = CURRENT_TIMESTAMP`,
            [userId]
        );

        res.json({ 
            message: 'Last year tax amount updated successfully',
            last_year_tax_amount: parseFloat(last_year_tax_amount)
        });

    } catch (error) {
        console.error('Update last year tax error:', error);
        res.status(500).json({ error: 'Failed to update last year tax amount' });
    }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.user_id;

        // Get current password hash
        const user = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(current_password, user.rows[0].password_hash);

        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, userId]
        );

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;