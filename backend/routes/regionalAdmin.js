const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Middleware to check if user is regional admin
const requireRegionalAdmin = (req, res, next) => {
    if (req.user.role !== 'regional_admin' && !req.user.is_super_admin) {
        return res.status(403).json({ error: 'Access denied. Regional admin role required.' });
    }
    next();
};
// ========== TOWN MANAGEMENT ROUTES ==========

// Get all towns in region
router.get('/towns/list', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        const towns = await pool.query(
            `SELECT 
                t.id,
                t.name,
                t.name_am,
                t.name_om,
                t.name_so,
                t.code,
                t.woreda,
                t.zone,
                t.population,
                t.is_active,
                t.created_at,
                (SELECT full_name FROM users WHERE role = 'town_admin' AND town_id = t.id LIMIT 1) as admin_name,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM users WHERE role = 'town_admin' AND town_id = t.id) THEN true
                    ELSE false
                END as has_admin
             FROM towns t
             WHERE t.region_id = $1
             ORDER BY t.name`,
            [regionId]
        );

        res.json({ towns: towns.rows });

    } catch (error) {
        console.error('Get towns list error:', error);
        res.status(500).json({ error: 'Failed to fetch towns: ' + error.message });
    }
});

// Create new town
router.post('/towns/create', auth, requireRegionalAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { 
            name, 
            name_am, 
            name_om, 
            name_so, 
            code, 
            woreda, 
            zone, 
            population 
        } = req.body;
        
        const regionId = req.user.region_id;
        
        if (!regionId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Check if town code already exists
        const codeCheck = await client.query(
            'SELECT id FROM towns WHERE code = $1',
            [code]
        );

        if (codeCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Town code already exists' });
        }

        // Create new town
        const newTown = await client.query(
            `INSERT INTO towns 
             (region_id, name, name_am, name_om, name_so, code, woreda, zone, population, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) 
             RETURNING *`,
            [regionId, name, name_am, name_om, name_so, code, woreda, zone, population]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Created new town: ${name}`, 'town', newTown.rows[0].id]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true,
            message: 'Town created successfully',
            town: newTown.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create town error:', error);
        res.status(500).json({ error: 'Failed to create town: ' + error.message });
    } finally {
        client.release();
    }
});

// Update town
router.put('/towns/:id/update', auth, requireRegionalAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { 
            name, 
            name_am, 
            name_om, 
            name_so, 
            code, 
            woreda, 
            zone, 
            population,
            is_active 
        } = req.body;
        
        const regionId = req.user.region_id;
        
        if (!regionId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Verify town belongs to region
        const townCheck = await client.query(
            'SELECT id FROM towns WHERE id = $1 AND region_id = $2',
            [id, regionId]
        );

        if (townCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Town not found in your region' });
        }

        // Check if code already exists for another town
        if (code) {
            const codeCheck = await client.query(
                'SELECT id FROM towns WHERE code = $1 AND id != $2',
                [code, id]
            );

            if (codeCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Town code already exists' });
            }
        }

        // Update town
        const updatedTown = await client.query(
            `UPDATE towns 
             SET name = COALESCE($1, name),
                 name_am = COALESCE($2, name_am),
                 name_om = COALESCE($3, name_om),
                 name_so = COALESCE($4, name_so),
                 code = COALESCE($5, code),
                 woreda = COALESCE($6, woreda),
                 zone = COALESCE($7, zone),
                 population = COALESCE($8, population),
                 is_active = COALESCE($9, is_active)
             WHERE id = $10
             RETURNING *`,
            [name, name_am, name_om, name_so, code, woreda, zone, population, is_active, id]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Updated town: ${name || townCheck.rows[0].name}`, 'town', id]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true,
            message: 'Town updated successfully',
            town: updatedTown.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update town error:', error);
        res.status(500).json({ error: 'Failed to update town: ' + error.message });
    } finally {
        client.release();
    }
});

// Delete town
router.delete('/towns/:id/delete', auth, requireRegionalAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const regionId = req.user.region_id;
        
        if (!regionId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Verify town belongs to region
        const townCheck = await client.query(
            'SELECT id, name FROM towns WHERE id = $1 AND region_id = $2',
            [id, regionId]
        );

        if (townCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Town not found in your region' });
        }

        // Check if town has any town admin assigned
        const adminCheck = await client.query(
            'SELECT id FROM users WHERE role = $1 AND town_id = $2',
            ['town_admin', id]
        );

        if (adminCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Cannot delete town because it has town administrators assigned. Please reassign or deactivate them first.' 
            });
        }

        // Check if town has any tax payments
        const paymentCheck = await client.query(
            'SELECT id FROM tax_payments WHERE town_id = $1 LIMIT 1',
            [id]
        );

        if (paymentCheck.rows.length > 0) {
            // Soft delete - just mark as inactive instead of deleting
            await client.query(
                'UPDATE towns SET is_active = false WHERE id = $1',
                [id]
            );
            
            await client.query('COMMIT');
            
            return res.json({ 
                success: true,
                message: 'Town has been deactivated (has existing payments/records)',
                deactivated: true
            });
        }

        // No records, safe to delete
        await client.query(
            'DELETE FROM towns WHERE id = $1',
            [id]
        );

        // Log the action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Deleted town: ${townCheck.rows[0].name}`, 'town', id]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true,
            message: 'Town deleted successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete town error:', error);
        res.status(500).json({ error: 'Failed to delete town: ' + error.message });
    } finally {
        client.release();
    }
});

// Get single town details
router.get('/towns/:id', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const regionId = req.user.region_id;
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        const town = await pool.query(
            `SELECT 
                t.*,
                (SELECT full_name FROM users WHERE role = 'town_admin' AND town_id = t.id) as admin_name,
                (SELECT email FROM users WHERE role = 'town_admin' AND town_id = t.id) as admin_email,
                (SELECT tax_target FROM users WHERE role = 'town_admin' AND town_id = t.id) as admin_target
             FROM towns t
             WHERE t.id = $1 AND t.region_id = $2`,
            [id, regionId]
        );

        if (town.rows.length === 0) {
            return res.status(404).json({ error: 'Town not found' });
        }

        res.json({ town: town.rows[0] });

    } catch (error) {
        console.error('Get town details error:', error);
        res.status(500).json({ error: 'Failed to fetch town details: ' + error.message });
    }
});
// Get region info
router.get('/region-info', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const region = await pool.query(
            'SELECT * FROM regions WHERE id = $1',
            [req.user.region_id]
        );
        res.json({ region: region.rows[0] });
    } catch (error) {
        console.error('Get region info error:', error);
        res.status(500).json({ error: 'Failed to fetch region info' });
    }
});

// Get regional statistics
router.get('/stats', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        
        const [towns, admins, taxpayers, collections, escalations] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM towns WHERE region_id = $1', [regionId]),
            pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND region_id = $2', ['town_admin', regionId]),
            pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND region_id = $2', ['taxpayer', regionId]),
            pool.query('SELECT COALESCE(SUM(paid_amount), 0) FROM tax_payments WHERE region_id = $1 AND payment_status = $2', [regionId, 'completed']),
            pool.query('SELECT COUNT(*) FROM escalations WHERE region_id = $1 AND status = $2', [regionId, 'pending'])
        ]);

        res.json({
            totalTowns: parseInt(towns.rows[0].count),
            activeTowns: parseInt(towns.rows[0].count), // You might want to calculate this differently
            totalTownAdmins: parseInt(admins.rows[0].count),
            totalTaxpayers: parseInt(taxpayers.rows[0].count),
            totalCollected: parseFloat(collections.rows[0].coalesce || 0),
            monthlyTarget: 50000000, // Example target
            complianceRate: 85.5,
            pendingEscalations: parseInt(escalations.rows[0].count)
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get all towns in region
router.get('/towns', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const towns = await pool.query(
            `SELECT 
                t.*,
                (SELECT COUNT(*) FROM users WHERE role = 'taxpayer' AND town_id = t.id) as taxpayer_count,
                (SELECT full_name FROM users WHERE role = 'town_admin' AND town_id = t.id LIMIT 1) as admin_name,
                (SELECT COALESCE(SUM(paid_amount), 0) FROM tax_payments WHERE town_id = t.id AND payment_status = 'completed') as collected,
                COALESCE((
                    SELECT tax_target FROM users WHERE role = 'town_admin' AND town_id = t.id LIMIT 1
                ), 0) as target,
                EXISTS(SELECT 1 FROM users WHERE role = 'town_admin' AND town_id = t.id) as has_admin,
                t.is_active
             FROM towns t
             WHERE t.region_id = $1
             ORDER BY t.name`,
            [req.user.region_id]
        );
        res.json({ towns: towns.rows });
    } catch (error) {
        console.error('Get towns error:', error);
        res.status(500).json({ error: 'Failed to fetch towns' });
    }
});

// Create new town
router.post('/towns', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const { name, code, target_amount, notes } = req.body;
        
        const newTown = await pool.query(
            `INSERT INTO towns (region_id, name, code, target_amount, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.region_id, name, code, target_amount, notes]
        );

        res.json({ success: true, town: newTown.rows[0] });
    } catch (error) {
        console.error('Create town error:', error);
        res.status(500).json({ error: 'Failed to create town' });
    }
});

// Get town admins
router.get('/town-admins', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const admins = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.tax_target,
                u.is_active,
                t.name as town_name,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE reviewed_by = u.id 
                    AND payment_status = 'completed'
                    AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                ), 0) as monthly_collection,
                COALESCE((
                    SELECT COUNT(*) FROM tax_payments 
                    WHERE reviewed_by = u.id AND payment_status = 'completed'
                ), 0) as processed_count,
                CASE 
                    WHEN u.tax_target > 0 
                    THEN (COALESCE((
                        SELECT SUM(paid_amount) FROM tax_payments 
                        WHERE reviewed_by = u.id 
                        AND payment_status = 'completed'
                        AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                    ), 0) / u.tax_target * 100)
                    ELSE 0
                END as performance
             FROM users u
             JOIN towns t ON u.town_id = t.id
             WHERE u.role = 'town_admin' AND u.region_id = $1
             ORDER BY u.created_at DESC`,
            [req.user.region_id]
        );
        res.json({ admins: admins.rows });
    } catch (error) {
        console.error('Get town admins error:', error);
        res.status(500).json({ error: 'Failed to fetch town admins' });
    }
});

// Create town admin
router.post('/town-admins', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const { full_name, email, password, phone, town_id, tax_target } = req.body;
        
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await pool.query(
            `INSERT INTO users 
             (full_name, email, password_hash, phone, role, region_id, town_id, tax_target, is_active)
             VALUES ($1, $2, $3, $4, 'town_admin', $5, $6, $7, true)
             RETURNING id, full_name, email`,
            [full_name, email, hashedPassword, phone, req.user.region_id, town_id, tax_target]
        );

        res.json({ success: true, admin: newAdmin.rows[0] });
    } catch (error) {
        console.error('Create town admin error:', error);
        res.status(500).json({ error: 'Failed to create town admin' });
    }
});

// Get performance data
router.get('/performance', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const performance = await pool.query(
            `SELECT 
                to_char(date_trunc('month', payment_date), 'Mon YYYY') as month,
                COALESCE(SUM(paid_amount), 0) as collection
             FROM tax_payments
             WHERE region_id = $1
             AND payment_status = 'completed'
             AND payment_date >= CURRENT_DATE - INTERVAL '6 months'
             GROUP BY date_trunc('month', payment_date)
             ORDER BY date_trunc('month', payment_date)`,
            [req.user.region_id]
        );
        res.json({ performance: performance.rows });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({ error: 'Failed to fetch performance data' });
    }
});

// Get escalations
router.get('/escalations', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const escalations = await pool.query(
            `SELECT 
                e.*,
                t.name as town_name,
                u.full_name as reported_by
             FROM escalations e
             JOIN towns t ON e.town_id = t.id
             JOIN users u ON e.reported_by = u.id
             WHERE e.region_id = $1 AND e.status = 'pending'
             ORDER BY e.priority DESC, e.created_at ASC`,
            [req.user.region_id]
        );
        res.json({ escalations: escalations.rows });
    } catch (error) {
        console.error('Get escalations error:', error);
        res.status(500).json({ error: 'Failed to fetch escalations' });
    }
});
// Get regional admin dashboard stats
router.get('/stats', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        
        console.log('Fetching regional stats for:', req.user.user_id, 'region_id:', regionId);

        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Get regional target (sum of all town admin targets)
        const targetResult = await pool.query(
            `SELECT COALESCE(SUM(tax_target), 0) as total_target 
             FROM users 
             WHERE role = 'town_admin' AND region_id = $1`,
            [regionId]
        );
        
        // Get total collected in region
        const collectedResult = await pool.query(
            `SELECT COALESCE(SUM(paid_amount), 0) as total_collected 
             FROM tax_payments 
             WHERE region_id = $1 
             AND payment_status = 'completed'`,
            [regionId]
        );
        
        // Get town stats
        const townsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_towns,
                COUNT(*) FILTER (WHERE EXISTS (
                    SELECT 1 FROM users WHERE role = 'town_admin' AND town_id = towns.id
                )) as towns_with_admins
             FROM towns 
             WHERE region_id = $1`,
            [regionId]
        );
        
        // Get pending actions across region
        const pendingResult = await pool.query(
            `SELECT COUNT(*) as pending_actions
             FROM tax_payments 
             WHERE region_id = $1 AND payment_status = 'under_review'`,
            [regionId]
        );
        
        const regionalTarget = parseFloat(targetResult.rows[0]?.total_target || 0);
        const totalCollected = parseFloat(collectedResult.rows[0]?.total_collected || 0);
        const regionalProgress = regionalTarget > 0 ? (totalCollected / regionalTarget) * 100 : 0;
        
        res.json({
            regional_target: regionalTarget,
            total_collected: totalCollected,
            regional_progress: Math.round(regionalProgress * 100) / 100,
            total_towns: parseInt(townsResult.rows[0]?.total_towns || 0),
            active_towns: parseInt(townsResult.rows[0]?.towns_with_admins || 0),
            towns_with_admins: parseInt(townsResult.rows[0]?.towns_with_admins || 0),
            pending_actions: parseInt(pendingResult.rows[0]?.pending_actions || 0)
        });

    } catch (error) {
        console.error('Regional admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch regional stats: ' + error.message });
    }
});

// Get all towns in region with performance data - FIXED VERSION
router.get('/towns', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        const towns = await pool.query(
            `SELECT 
                t.id,
                t.name,
                t.code,
                (SELECT full_name FROM users WHERE role = 'town_admin' AND town_id = t.id LIMIT 1) as admin_name,
                (SELECT id FROM users WHERE role = 'town_admin' AND town_id = t.id LIMIT 1) as admin_id,
                COALESCE((
                    SELECT tax_target FROM users WHERE role = 'town_admin' AND town_id = t.id LIMIT 1
                ), 0) as target,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE town_id = t.id AND payment_status = 'completed'
                    AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                ), 0) as collected,
                COALESCE((
                    SELECT COUNT(*) FROM tax_payments 
                    WHERE town_id = t.id AND payment_status = 'under_review'
                ), 0) as pending,
                COALESCE((
                    SELECT COUNT(*) FROM tcc_applications 
                    WHERE town_id = t.id AND status = 'Submitted'
                ), 0) as pending_tcc,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM users WHERE role = 'town_admin' AND town_id = t.id) THEN true
                    ELSE false
                END as has_admin
             FROM towns t
             WHERE t.region_id = $1
             ORDER BY t.name`,
            [regionId]
        );
        
        // Calculate percentages
        const townsWithPercentage = towns.rows.map(town => {
            const target = parseFloat(town.target || 0);
            const collected = parseFloat(town.collected || 0);
            const percentage = target > 0 ? (collected / target) * 100 : 0;
            return {
                ...town,
                percentage: Math.round(percentage * 100) / 100,
                collected: collected,
                target: target
            };
        });
        
        res.json({ towns: townsWithPercentage });

    } catch (error) {
        console.error('Get towns error:', error);
        res.status(500).json({ error: 'Failed to fetch towns: ' + error.message });
    }
});

// Get all town admins in region - FIXED VERSION
router.get('/town-admins', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        const admins = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                COALESCE(u.tax_target, 0) as tax_target,
                COALESCE(u.is_active, true) as is_active,
                u.created_at,
                t.name as town_name,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments 
                    WHERE reviewed_by = u.id 
                    AND EXTRACT(MONTH FROM reviewed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                ), 0) as monthly_collection,
                COALESCE((
                    SELECT COUNT(*) FROM tax_payments 
                    WHERE reviewed_by = u.id AND staff_decision = 'approved'
                ), 0) as approved_count
             FROM users u
             LEFT JOIN towns t ON u.town_id = t.id
             WHERE u.role = 'town_admin' AND u.region_id = $1
             ORDER BY u.created_at DESC`,
            [regionId]
        );
        
        // Calculate performance percentage
        const adminsWithPerformance = admins.rows.map(admin => {
            const target = parseFloat(admin.tax_target || 0);
            const collected = parseFloat(admin.monthly_collection || 0);
            const performance = target > 0 ? (collected / target) * 100 : 0;
            return {
                ...admin,
                performance: Math.min(100, Math.round(performance * 100) / 100),
                town_name: admin.town_name || 'Not Assigned'
            };
        });
        
        res.json({ admins: adminsWithPerformance });

    } catch (error) {
        console.error('Get town admins error:', error);
        res.status(500).json({ error: 'Failed to fetch town admins: ' + error.message });
    }
});

// Get regional performance report
router.get('/performance-report', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        const { month, year } = req.query;
        const targetMonth = month || new Date().getMonth() + 1;
        const targetYear = year || new Date().getFullYear();
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Get monthly collection by town
        const monthlyData = await pool.query(
            `SELECT 
                t.name as town_name,
                COALESCE(SUM(tp.paid_amount), 0) as collected,
                COALESCE((
                    SELECT tax_target FROM users 
                    WHERE role = 'town_admin' AND town_id = t.id LIMIT 1
                ), 0) as target,
                COUNT(DISTINCT tp.id) as transactions,
                COUNT(DISTINCT tp.user_id) as taxpayers
             FROM towns t
             LEFT JOIN tax_payments tp ON tp.town_id = t.id 
                 AND tp.payment_status = 'completed'
                 AND EXTRACT(MONTH FROM tp.payment_date) = $1
                 AND EXTRACT(YEAR FROM tp.payment_date) = $2
             WHERE t.region_id = $3
             GROUP BY t.id, t.name
             ORDER BY collected DESC`,
            [targetMonth, targetYear, regionId]
        );
        
        // Get admin performance
        const adminPerformance = await pool.query(
            `SELECT 
                u.full_name,
                t.name as town_name,
                COUNT(tp.id) as processed,
                COUNT(tp.id) FILTER (WHERE tp.staff_decision = 'approved') as approved,
                COALESCE(AVG(EXTRACT(EPOCH FROM (tp.reviewed_at - tp.created_at))/3600), 0) as avg_response_hours
             FROM users u
             JOIN towns t ON u.town_id = t.id
             LEFT JOIN tax_payments tp ON tp.reviewed_by = u.id
                 AND EXTRACT(MONTH FROM tp.reviewed_at) = $1
                 AND EXTRACT(YEAR FROM tp.reviewed_at) = $2
             WHERE u.role = 'town_admin' AND u.region_id = $3
             GROUP BY u.id, u.full_name, t.name`,
            [targetMonth, targetYear, regionId]
        );
        
        // Calculate totals
        const totals = {
            total_collected: monthlyData.rows.reduce((sum, row) => sum + parseFloat(row.collected || 0), 0),
            total_target: monthlyData.rows.reduce((sum, row) => sum + parseFloat(row.target || 0), 0),
            total_transactions: monthlyData.rows.reduce((sum, row) => sum + parseInt(row.transactions || 0), 0),
            total_taxpayers: monthlyData.rows.reduce((sum, row) => sum + parseInt(row.taxpayers || 0), 0)
        };
        
        res.json({
            month: targetMonth,
            year: targetYear,
            totals,
            towns: monthlyData.rows,
            admin_performance: adminPerformance.rows
        });

    } catch (error) {
        console.error('Performance report error:', error);
        res.status(500).json({ error: 'Failed to generate performance report: ' + error.message });
    }
});

// Create town admin - FIXED VERSION
router.post('/create-town-admin', auth, requireRegionalAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { full_name, email, password, phone, town_id, tax_target } = req.body;
        const regionId = req.user.region_id;
        
        if (!regionId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Verify town belongs to admin's region
        const townCheck = await client.query(
            'SELECT id FROM towns WHERE id = $1 AND region_id = $2',
            [town_id, regionId]
        );

        if (townCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Town does not belong to your region' });
        }

        // Check if email already exists
        const emailCheck = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create town admin
        const newAdmin = await client.query(
            `INSERT INTO users 
             (full_name, email, password_hash, phone, role, region_id, town_id, assigned_by, tax_target, tax_target_period, is_active) 
             VALUES ($1, $2, $3, $4, 'town_admin', $5, $6, $7, $8, 'monthly', true) 
             RETURNING id, full_name, email, role, region_id, town_id`,
            [full_name, email, password_hash, phone, regionId, town_id, req.user.user_id, tax_target]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true,
            message: 'Town admin created successfully',
            admin: newAdmin.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create town admin error:', error);
        res.status(500).json({ error: 'Failed to create town admin: ' + error.message });
    } finally {
        client.release();
    }
});

// Deactivate/Reactivate town admin
router.put('/town-admin/:id/toggle-status', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const regionId = req.user.region_id;
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        // Verify admin belongs to this region
        const adminCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND region_id = $2 AND role = $3',
            [id, regionId, 'town_admin']
        );
        
        if (adminCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Town admin not found in your region' });
        }
        
        await pool.query(
            'UPDATE users SET is_active = $1 WHERE id = $2',
            [is_active, id]
        );
        
        res.json({
            success: true,
            message: `Town admin ${is_active ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('Toggle admin status error:', error);
        res.status(500).json({ error: 'Failed to update admin status: ' + error.message });
    }
});

// Get region details
router.get('/region-details', auth, requireRegionalAdmin, async (req, res) => {
    try {
        const regionId = req.user.region_id;
        
        if (!regionId) {
            return res.status(400).json({ error: 'Regional admin has no region assigned' });
        }

        const region = await pool.query(
            'SELECT id, name, name_am, name_om, name_so, code, capital FROM regions WHERE id = $1',
            [regionId]
        );

        res.json({ region: region.rows[0] || null });

    } catch (error) {
        console.error('Get region details error:', error);
        res.status(500).json({ error: 'Failed to fetch region details' });
    }
});

module.exports = router;