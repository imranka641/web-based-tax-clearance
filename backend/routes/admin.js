const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer'); // Add this import
const path = require('path'); // Add this import
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: 'Access denied. Super admin role required.' });
  }
  next();
};

// Configure multer for stamp uploads
// Government stamp management
// Government stamp management routes
const stampStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/stamps/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'stamp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const stampUpload = multer({ 
  storage: stampStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});
// ========== REGIONAL MANAGEMENT ROUTES ==========

// Get all regions
router.get('/regions', auth, requireSuperAdmin, async (req, res) => {
    try {
        const regions = await pool.query(
            `SELECT 
                r.*,
                COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'regional_admin') as admin_count,
                COUNT(DISTINCT t.id) as town_count,
                COALESCE(SUM(u.tax_target) FILTER (WHERE u.role = 'regional_admin'), 0) as total_target,
                COALESCE((
                    SELECT SUM(tp.paid_amount) 
                    FROM tax_payments tp
                    JOIN towns twn ON tp.town_id = twn.id
                    WHERE twn.region_id = r.id AND tp.payment_status = 'completed'
                ), 0) as total_collected
             FROM regions r
             LEFT JOIN users u ON u.region_id = r.id
             LEFT JOIN towns t ON t.region_id = r.id
             GROUP BY r.id
             ORDER BY r.name`
        );

        // Calculate achievement percentage
        const regionsWithStats = regions.rows.map(region => {
            const achievement = region.total_target > 0 
                ? (region.total_collected / region.total_target) * 100 
                : 0;
            return {
                ...region,
                achievement: Math.round(achievement * 100) / 100
            };
        });

        res.json({ regions: regionsWithStats });

    } catch (error) {
        console.error('Get regions error:', error);
        res.status(500).json({ error: 'Failed to fetch regions: ' + error.message });
    }
});

// Create new region
router.post('/regions/create', auth, requireSuperAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { name, name_am, name_om, name_so, code, capital, population } = req.body;

        // Check if code already exists
        const codeCheck = await client.query(
            'SELECT id FROM regions WHERE code = $1',
            [code]
        );

        if (codeCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Region code already exists' });
        }

        // Create region
        const newRegion = await client.query(
            `INSERT INTO regions 
             (name, name_am, name_om, name_so, code, capital, population, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, true) 
             RETURNING *`,
            [name, name_am, name_om, name_so, code, capital, population]
        );

        // Log action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Created new region: ${name}`, 'region', newRegion.rows[0].id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Region created successfully',
            region: newRegion.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create region error:', error);
        res.status(500).json({ error: 'Failed to create region: ' + error.message });
    } finally {
        client.release();
    }
});

// Update region
router.put('/regions/:id/update', auth, requireSuperAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { name, name_am, name_om, name_so, code, capital, population, is_active } = req.body;

        // Check if code already exists for another region
        if (code) {
            const codeCheck = await client.query(
                'SELECT id FROM regions WHERE code = $1 AND id != $2',
                [code, id]
            );

            if (codeCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Region code already exists' });
            }
        }

        // Update region
        const updatedRegion = await client.query(
            `UPDATE regions 
             SET name = COALESCE($1, name),
                 name_am = COALESCE($2, name_am),
                 name_om = COALESCE($3, name_om),
                 name_so = COALESCE($4, name_so),
                 code = COALESCE($5, code),
                 capital = COALESCE($6, capital),
                 population = COALESCE($7, population),
                 is_active = COALESCE($8, is_active)
             WHERE id = $9
             RETURNING *`,
            [name, name_am, name_om, name_so, code, capital, population, is_active, id]
        );

        // Log action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Updated region: ${name || updatedRegion.rows[0].name}`, 'region', id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Region updated successfully',
            region: updatedRegion.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update region error:', error);
        res.status(500).json({ error: 'Failed to update region: ' + error.message });
    } finally {
        client.release();
    }
});

// Delete region
router.delete('/regions/:id/delete', auth, requireSuperAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;

        // Check if region has admins
        const adminCheck = await client.query(
            'SELECT id FROM users WHERE role = $1 AND region_id = $2',
            ['regional_admin', id]
        );

        if (adminCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Cannot delete region because it has regional administrators assigned.' 
            });
        }

        // Check if region has towns
        const townCheck = await client.query(
            'SELECT id FROM towns WHERE region_id = $1 LIMIT 1',
            [id]
        );

        if (townCheck.rows.length > 0) {
            // Soft delete
            await client.query(
                'UPDATE regions SET is_active = false WHERE id = $1',
                [id]
            );
            
            await client.query('COMMIT');
            
            return res.json({ 
                success: true,
                message: 'Region has been deactivated (has existing towns)',
                deactivated: true
            });
        }

        // No records, safe to delete
        await client.query('DELETE FROM regions WHERE id = $1', [id]);

        await client.query('COMMIT');

        res.json({ 
            success: true,
            message: 'Region deleted successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete region error:', error);
        res.status(500).json({ error: 'Failed to delete region: ' + error.message });
    } finally {
        client.release();
    }
});

// Get all regional admins
router.get('/regional-admins', auth, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.tax_target,
                u.is_active,
                u.created_at,
                r.name as region_name,
                r.id as region_id,
                COALESCE((
                    SELECT SUM(paid_amount) FROM tax_payments tp
                    JOIN towns t ON tp.town_id = t.id
                    WHERE t.region_id = u.region_id AND tp.payment_status = 'completed'
                    AND EXTRACT(MONTH FROM tp.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                ), 0) as monthly_collection
             FROM users u
             LEFT JOIN regions r ON u.region_id = r.id
             WHERE u.role = 'regional_admin'
             ORDER BY u.created_at DESC`
        );

        // Calculate performance
        const adminsWithPerformance = admins.rows.map(admin => {
            const target = parseFloat(admin.tax_target || 0) / 12; // Monthly target
            const collected = parseFloat(admin.monthly_collection || 0);
            const performance = target > 0 ? (collected / target) * 100 : 0;
            return {
                ...admin,
                performance: Math.min(100, Math.round(performance * 100) / 100)
            };
        });

        res.json({ admins: adminsWithPerformance });

    } catch (error) {
        console.error('Get regional admins error:', error);
        res.status(500).json({ error: 'Failed to fetch regional admins: ' + error.message });
    }
});

// Create regional admin
router.post('/regional-admins/create', auth, requireSuperAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { full_name, email, password, phone, region_id, tax_target } = req.body;

        // Check if email exists
        const emailCheck = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create admin
        const newAdmin = await client.query(
            `INSERT INTO users 
             (full_name, email, password_hash, phone, role, region_id, tax_target, tax_target_period, is_active) 
             VALUES ($1, $2, $3, $4, 'regional_admin', $5, $6, 'annual', true) 
             RETURNING id, full_name, email, role, region_id`,
            [full_name, email, password_hash, phone, region_id, tax_target]
        );

        // Log action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Created regional admin: ${full_name}`, 'user', newAdmin.rows[0].id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Regional admin created successfully',
            admin: newAdmin.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create regional admin error:', error);
        res.status(500).json({ error: 'Failed to create regional admin: ' + error.message });
    } finally {
        client.release();
    }
});

// Update regional admin
router.put('/regional-admins/:id/update', auth, requireSuperAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { full_name, email, phone, region_id, tax_target, is_active } = req.body;

        // Check if email exists for another user
        if (email) {
            const emailCheck = await client.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, id]
            );

            if (emailCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        // Update admin
        const updatedAdmin = await client.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 phone = COALESCE($3, phone),
                 region_id = COALESCE($4, region_id),
                 tax_target = COALESCE($5, tax_target),
                 is_active = COALESCE($6, is_active)
             WHERE id = $7 AND role = 'regional_admin'
             RETURNING id, full_name, email, role, region_id`,
            [full_name, email, phone, region_id, tax_target, is_active, id]
        );

        if (updatedAdmin.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Regional admin not found' });
        }

        // Log action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Updated regional admin: ${full_name || updatedAdmin.rows[0].full_name}`, 'user', id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Regional admin updated successfully',
            admin: updatedAdmin.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update regional admin error:', error);
        res.status(500).json({ error: 'Failed to update regional admin: ' + error.message });
    } finally {
        client.release();
    }
});

// Delete regional admin
router.delete('/regional-admins/:id/delete', auth, requireSuperAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;

        // Check if admin has town admins under them
        const townAdminCheck = await client.query(
            'SELECT id FROM users WHERE assigned_by = $1',
            [id]
        );

        if (townAdminCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Cannot delete admin because they have town administrators assigned. Please reassign them first.' 
            });
        }

        // Soft delete - deactivate instead of deleting
        await client.query(
            'UPDATE users SET is_active = false, role = NULL WHERE id = $1 AND role = $2',
            [id, 'regional_admin']
        );

        // Log action
        await client.query(
            'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, `Deactivated regional admin ID: ${id}`, 'user', id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Regional admin deactivated successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete regional admin error:', error);
        res.status(500).json({ error: 'Failed to delete regional admin: ' + error.message });
    } finally {
        client.release();
    }
});

// Toggle regional admin status
router.put('/regional-admins/:id/toggle-status', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        await pool.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 AND role = $3',
            [is_active, id, 'regional_admin']
        );

        res.json({
            success: true,
            message: `Regional admin ${is_active ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('Toggle admin status error:', error);
        res.status(500).json({ error: 'Failed to update admin status' });
    }
});
// Get all stamps
router.get('/stamps', auth, requireSuperAdmin, async (req, res) => {
  try {
    const stamps = await pool.query('SELECT * FROM system_stamps ORDER BY created_at DESC');
    res.json({ stamps: stamps.rows });
  } catch (error) {
    console.error('Get stamps error:', error);
    res.status(500).json({ error: 'Failed to fetch stamps' });
  }
});

// Upload new stamp
router.post('/stamps', auth, requireSuperAdmin, stampUpload.single('stamp_image'), async (req, res) => {
  try {
    const { stamp_name, stamp_position } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Stamp image is required' });
    }

    const newStamp = await pool.query(
      'INSERT INTO system_stamps (stamp_name, stamp_image_path, stamp_position, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [stamp_name, req.file.path, stamp_position, req.user.user_id]
    );

    // Log the action
    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Uploaded government stamp: ${stamp_name}`, 'stamp', newStamp.rows[0].id]
    );

    res.json({ stamp: newStamp.rows[0] });
  } catch (error) {
    console.error('Upload stamp error:', error);
    res.status(500).json({ error: 'Failed to upload stamp' });
  }
});

// Update stamp
router.put('/stamps/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updatedStamp = await pool.query(
      'UPDATE system_stamps SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Updated stamp status: ${is_active ? 'Activated' : 'Deactivated'}`, 'stamp', id]
    );

    res.json({ stamp: updatedStamp.rows[0] });
  } catch (error) {
    console.error('Update stamp error:', error);
    res.status(500).json({ error: 'Failed to update stamp' });
  }
});

// Delete stamp
router.delete('/stamps/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get stamp info for logging
    const stamp = await pool.query('SELECT stamp_name FROM system_stamps WHERE id = $1', [id]);

    await pool.query('DELETE FROM system_stamps WHERE id = $1', [id]);

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Deleted government stamp: ${stamp.rows[0]?.stamp_name}`, 'stamp', id]
    );

    res.json({ message: 'Stamp deleted successfully' });
  } catch (error) {
    console.error('Delete stamp error:', error);
    res.status(500).json({ error: 'Failed to delete stamp' });
  }
});
// Get system statistics
router.get('/system-stats', auth, requireSuperAdmin, async (req, res) => {
  try {
    const [
      usersCount,
      revenueResult,
      pendingApps,
      aiVerifications,
      failedPayments,
      complianceResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments WHERE payment_status = $1', ['completed']),
      pool.query('SELECT COUNT(*) FROM tcc_applications WHERE status = $1', ['Submitted']),
      pool.query('SELECT COUNT(*) FROM tax_payments WHERE ai_verification_status IS NOT NULL'),
      pool.query('SELECT COUNT(*) FROM tax_payments WHERE payment_status = $1', ['failed']),
      pool.query(`SELECT 
        (COUNT(*) FILTER (WHERE has_filed_returns AND has_paid_taxes AND outstanding_balance = 0) * 100.0 / 
        GREATEST(COUNT(*), 1)) as compliance_rate 
        FROM taxpayer_records`)
    ]);

    res.json({
      total_users: parseInt(usersCount.rows[0].count),
      total_revenue: parseFloat(revenueResult.rows[0].total),
      pending_applications: parseInt(pendingApps.rows[0].count),
      ai_verifications: parseInt(aiVerifications.rows[0].count),
      failed_payments: parseInt(failedPayments.rows[0].count),
      compliance_rate: parseFloat(complianceResult.rows[0].compliance_rate).toFixed(1)
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Get system health
router.get('/system-health', auth, requireSuperAdmin, async (req, res) => {
  try {
    // Simulate system health checks
    const healthData = {
      server_uptime: 95,
      database_performance: 88,
      payment_gateway_health: 92,
      ai_system_health: 85,
      alerts: [
        // { message: 'Database response time is slow', level: 'warning' }
      ]
    };

    res.json(healthData);
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// Get recent activities
router.get('/recent-activities', auth, requireSuperAdmin, async (req, res) => {
  try {
    const activities = await pool.query(
      `SELECT sal.*, u.full_name as user_name
       FROM system_audit_log sal
       LEFT JOIN users u ON sal.user_id = u.id
       ORDER BY sal.created_at DESC
       LIMIT 20`
    );

    res.json({ activities: activities.rows });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

// ========== TAX MANAGEMENT ROUTES ==========

// Get all tax types
router.get('/tax-types', auth, requireSuperAdmin, async (req, res) => {
  try {
    const taxTypes = await pool.query('SELECT * FROM tax_types ORDER BY name');
    res.json({ tax_types: taxTypes.rows });
  } catch (error) {
    console.error('Get tax types error:', error);
    res.status(500).json({ error: 'Failed to fetch tax types' });
  }
});

// Create new tax type
router.post('/tax-types', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, formula } = req.body;
    
    const newTaxType = await pool.query(
      'INSERT INTO tax_types (name, description, formula) VALUES ($1, $2, $3) RETURNING *',
      [name, description, formula]
    );

    // Log the action
    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Created tax type: ${name}`, 'tax_type', newTaxType.rows[0].id]
    );

    res.json({ tax_type: newTaxType.rows[0] });
  } catch (error) {
    console.error('Create tax type error:', error);
    res.status(500).json({ error: 'Failed to create tax type' });
  }
});

// Update tax type
// Update tax type - FIXED VERSION
router.put('/tax-types/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, formula, is_active } = req.body;
    
    // First, check if the column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tax_types' AND column_name='is_active'
    `);
    
    let query;
    if (checkColumn.rows.length > 0) {
      // is_active column exists
      query = 'UPDATE tax_types SET name = COALESCE($1, name), description = COALESCE($2, description), formula = COALESCE($3, formula), is_active = COALESCE($4, is_active) WHERE id = $5 RETURNING *';
    } else {
      // is_active column doesn't exist - don't try to update it
      query = 'UPDATE tax_types SET name = COALESCE($1, name), description = COALESCE($2, description), formula = COALESCE($3, formula) WHERE id = $4 RETURNING *';
    }
    
    const values = checkColumn.rows.length > 0 
      ? [name, description, formula, is_active, id]
      : [name, description, formula, id];
    
    const updatedTaxType = await pool.query(query, values);

    if (updatedTaxType.rows.length === 0) {
      return res.status(404).json({ error: 'Tax type not found' });
    }

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Updated tax type: ${name}`, 'tax_type', id]
    );

    res.json({ tax_type: updatedTaxType.rows[0] });
  } catch (error) {
    console.error('Update tax type error:', error);
    res.status(500).json({ error: 'Failed to update tax type: ' + error.message });
  }
});

// Get tax periods
router.get('/tax-periods', auth, requireSuperAdmin, async (req, res) => {
  try {
    const taxPeriods = await pool.query(
      `SELECT tp.*, tt.name as tax_type_name 
       FROM tax_periods tp
       LEFT JOIN tax_types tt ON tp.tax_type_id = tt.id
       ORDER BY tp.due_date DESC`
    );
    res.json({ tax_periods: taxPeriods.rows });
  } catch (error) {
    console.error('Get tax periods error:', error);
    res.status(500).json({ error: 'Failed to fetch tax periods' });
  }
});

// Create tax period
router.post('/tax-periods', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { tax_type_id, period_name, start_date, end_date, due_date, grace_period_days } = req.body;
    
    const newPeriod = await pool.query(
      `INSERT INTO tax_periods (tax_type_id, period_name, start_date, end_date, due_date, grace_period_days) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tax_type_id, period_name, start_date, end_date, due_date, grace_period_days]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Created tax period: ${period_name}`, 'tax_period', newPeriod.rows[0].id]
    );

    res.json({ tax_period: newPeriod.rows[0] });
  } catch (error) {
    console.error('Create tax period error:', error);
    res.status(500).json({ error: 'Failed to create tax period' });
  }
});

// Get tax brackets
router.get('/tax-brackets', auth, requireSuperAdmin, async (req, res) => {
  try {
    const taxBrackets = await pool.query(
      `SELECT tb.*, tt.name as tax_type_name 
       FROM tax_brackets tb
       LEFT JOIN tax_types tt ON tb.tax_type_id = tt.id
       ORDER BY tb.min_income`
    );
    res.json({ tax_brackets: taxBrackets.rows });
  } catch (error) {
    console.error('Get tax brackets error:', error);
    res.status(500).json({ error: 'Failed to fetch tax brackets' });
  }
});

// ========== PAYMENT MANAGEMENT ROUTES ==========

// Get payment methods
router.get('/payment-methods', auth, requireSuperAdmin, async (req, res) => {
  try {
    const paymentMethods = await pool.query('SELECT * FROM payment_methods ORDER BY name');
    res.json({ payment_methods: paymentMethods.rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Create payment method
router.post('/payment-methods', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, account_number, account_name, is_active } = req.body;
    
    const newMethod = await pool.query(
      'INSERT INTO payment_methods (name, account_number, account_name, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, account_number, account_name, is_active]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Created payment method: ${name}`, 'payment_method', newMethod.rows[0].id]
    );

    res.json({ payment_method: newMethod.rows[0] });
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json({ error: 'Failed to create payment method' });
  }
});

// Update payment method
// Update payment method - FIXED VERSION
router.put('/payment-methods/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, account_number, account_name, is_active } = req.body;
    
    // Validate required fields
    if (!name || !account_number || !account_name) {
      return res.status(400).json({ 
        error: 'Name, account number, and account name are required' 
      });
    }
    
    const updatedMethod = await pool.query(
      `UPDATE payment_methods 
       SET name = $1, account_number = $2, account_name = $3, is_active = COALESCE($4, is_active) 
       WHERE id = $5 
       RETURNING *`,
      [name, account_number, account_name, is_active, id]
    );

    if (updatedMethod.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Updated payment method: ${name}`, 'payment_method', id]
    );

    res.json({ payment_method: updatedMethod.rows[0] });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method: ' + error.message });
  }
});

// ========== AI MANAGEMENT ROUTES ==========

// Get AI configurations
router.get('/ai-configs', auth, requireSuperAdmin, async (req, res) => {
  try {
    const aiConfigs = await pool.query(
      `SELECT amc.*, tt.name as tax_type_name 
       FROM ai_model_configs amc
       LEFT JOIN tax_types tt ON amc.tax_type_id = tt.id
       ORDER BY amc.model_name`
    );
    res.json({ ai_configs: aiConfigs.rows });
  } catch (error) {
    console.error('Get AI configs error:', error);
    res.status(500).json({ error: 'Failed to fetch AI configurations' });
  }
});

// Update AI configuration
router.put('/ai-configs/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_threshold, growth_rate_multiplier, under_reporting_tolerance, is_active } = req.body;
    
    const updatedConfig = await pool.query(
      `UPDATE ai_model_configs 
       SET verification_threshold = $1, growth_rate_multiplier = $2, under_reporting_tolerance = $3, is_active = $4 
       WHERE id = $5 RETURNING *`,
      [verification_threshold, growth_rate_multiplier, under_reporting_tolerance, is_active, id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Updated AI configuration`, 'ai_config', id]
    );

    res.json({ ai_config: updatedConfig.rows[0] });
  } catch (error) {
    console.error('Update AI config error:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Get system settings
router.get('/system-settings', auth, requireSuperAdmin, async (req, res) => {
  try {
    const settings = await pool.query('SELECT * FROM system_settings');
    
    const settingsObject = {};
    settings.rows.forEach(setting => {
      settingsObject[setting.setting_key] = {
        setting_value: setting.setting_value,
        description: setting.description
      };
    });

    res.json({ settings: settingsObject });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system setting
router.put('/system-settings', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    
    await pool.query(
      'UPDATE system_settings SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $3',
      [value, req.user.user_id, key]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Updated system setting: ${key}`, 'system_setting', null]
    );

    res.json({ message: 'System setting updated successfully' });
  } catch (error) {
    console.error('Update system setting error:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
});

// ========== STAMP MANAGEMENT ROUTES ==========

// Get government stamps
router.get('/government-stamps', auth, requireSuperAdmin, async (req, res) => {
  try {
    const stamps = await pool.query('SELECT * FROM government_stamps ORDER BY is_active DESC, created_at DESC');
    res.json({ stamps: stamps.rows });
  } catch (error) {
    console.error('Get government stamps error:', error);
    res.status(500).json({ error: 'Failed to fetch government stamps' });
  }
});

// Upload government stamp
router.post('/government-stamps', auth, requireSuperAdmin, stampUpload.single('stamp_image'), async (req, res) => {
  try {
    const { stamp_name, stamp_position } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Stamp image is required' });
    }

    // Deactivate all other stamps
    await pool.query('UPDATE government_stamps SET is_active = false');

    // Create new stamp
    const newStamp = await pool.query(
      'INSERT INTO government_stamps (stamp_name, stamp_image_path, stamp_position, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [stamp_name, req.file.path, stamp_position, true, req.user.user_id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Uploaded government stamp: ${stamp_name}`, 'government_stamp', newStamp.rows[0].id]
    );

    res.json({ stamp: newStamp.rows[0] });
  } catch (error) {
    console.error('Upload government stamp error:', error);
    res.status(500).json({ error: 'Failed to upload government stamp' });
  }
});

// Activate stamp
router.put('/government-stamps/:id/activate', auth, requireSuperAdmin, async (req, res) => {
  try {
    // Deactivate all stamps first
    await pool.query('UPDATE government_stamps SET is_active = false');
    
    // Activate the selected stamp
    await pool.query(
      'UPDATE government_stamps SET is_active = true WHERE id = $1',
      [req.params.id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, 'Activated government stamp', 'government_stamp', req.params.id]
    );

    res.json({ message: 'Stamp activated successfully' });
  } catch (error) {
    console.error('Activate stamp error:', error);
    res.status(500).json({ error: 'Failed to activate stamp' });
  }
});

// Deactivate stamp
router.put('/government-stamps/:id/deactivate', auth, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE government_stamps SET is_active = false WHERE id = $1',
      [req.params.id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, 'Deactivated government stamp', 'government_stamp', req.params.id]
    );

    res.json({ message: 'Stamp deactivated successfully' });
  } catch (error) {
    console.error('Deactivate stamp error:', error);
    res.status(500).json({ error: 'Failed to deactivate stamp' });
  }
});

// ========== USER MANAGEMENT ROUTES ==========

// Get all users
router.get('/users', auth, requireSuperAdmin, async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, full_name, email, tin, role, is_super_admin, is_active, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json({ users: users.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user
router.post('/users', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { full_name, email, tin, password, role, is_super_admin } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, tin, password_hash, role, is_super_admin) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, tin, role, is_super_admin, created_at`,
      [full_name, email, tin, password_hash, role, is_super_admin]
    );

    // Create taxpayer record if role is taxpayer
    if (role === 'taxpayer' && tin) {
      await pool.query(
        'INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance) VALUES ($1, true, true, 0)',
        [tin]
      );
    }

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Created user: ${full_name}`, 'user', newUser.rows[0].id]
    );

    res.json({ user: newUser.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const updatedUser = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, full_name, email, tin, role, is_super_admin, is_active, created_at',
      [is_active, id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Updated user status: ${is_active ? 'Activated' : 'Deactivated'}`, 'user', id]
    );

    res.json({ user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ========== REPORTS & ANALYTICS ROUTES ==========

// Get reports
router.get('/reports', auth, requireSuperAdmin, async (req, res) => {
  try {
    const reports = await pool.query(
      `SELECT tr.*, u.full_name as generated_by_name 
       FROM tax_reports tr
       LEFT JOIN users u ON tr.generated_by = u.id
       ORDER BY tr.generated_at DESC
       LIMIT 10`
    );
    res.json({ reports: reports.rows });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Generate report
// Generate report - FIXED VERSION
router.post('/generate-report', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { report_type, start_date, end_date } = req.body;
    
    // Validate dates
    let startDate = start_date;
    let endDate = end_date;
    
    if (!start_date || !end_date) {
      // Default to current month if dates not provided
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    }
    
    // Calculate report data based on type
    let reportData = {};
    let totalCollected = 0;
    let totalTransactions = 0;

    if (report_type === 'monthly') {
      const revenueResult = await pool.query(
        `SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as count 
         FROM tax_payments 
         WHERE payment_status = 'completed' 
         AND payment_date::date >= $1::date 
         AND payment_date::date <= $2::date`,
        [startDate, endDate]
      );
      totalCollected = parseFloat(revenueResult.rows[0].total);
      totalTransactions = parseInt(revenueResult.rows[0].count);
    }

    // Create report record
    const newReport = await pool.query(
      `INSERT INTO tax_reports 
       (report_type, period_start, period_end, total_collected, total_transactions, generated_by) 
       VALUES ($1, $2::date, $3::date, $4, $5, $6) RETURNING *`,
      [report_type, startDate, endDate, totalCollected, totalTransactions, req.user.user_id]
    );

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Generated report: ${report_type}`, 'report', newReport.rows[0].id]
    );

    res.json({ report: newReport.rows[0] });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report: ' + error.message });
  }
}); 


// Get analytics data
router.get('/analytics', auth, requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalRevenue,
      monthlyRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      activeTaxpayers,
      complianceRate,
      topTaxTypes
    ] = await Promise.all([
      // Total revenue
      pool.query("SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments WHERE payment_status = 'completed'"),
      // Monthly revenue
      pool.query("SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments WHERE payment_status = 'completed' AND payment_date >= date_trunc('month', CURRENT_DATE)"),
      // Today's revenue
      pool.query("SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments WHERE payment_status = 'completed' AND payment_date >= CURRENT_DATE"),
      // This week's revenue
      pool.query("SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments WHERE payment_status = 'completed' AND payment_date >= date_trunc('week', CURRENT_DATE)"),
      // This month's revenue
      pool.query("SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments WHERE payment_status = 'completed' AND payment_date >= date_trunc('month', CURRENT_DATE)"),
      // Active taxpayers
      pool.query("SELECT COUNT(DISTINCT user_id) as count FROM tax_payments WHERE payment_status = 'completed' AND payment_date >= date_trunc('month', CURRENT_DATE)"),
      // Compliance rate
      pool.query(`SELECT 
        (COUNT(*) FILTER (WHERE has_filed_returns AND has_paid_taxes AND outstanding_balance = 0) * 100.0 / 
        GREATEST(COUNT(*), 1)) as rate FROM taxpayer_records`),
      // Top tax types
      pool.query(`SELECT tt.name, COALESCE(SUM(tp.paid_amount), 0) as amount 
        FROM tax_types tt
        LEFT JOIN tax_payments tp ON tt.id = tp.tax_type_id AND tp.payment_status = 'completed'
        GROUP BY tt.id, tt.name
        ORDER BY amount DESC
        LIMIT 5`)
    ]);

    res.json({
      total_revenue: parseFloat(totalRevenue.rows[0].total),
      monthly_revenue: parseFloat(monthlyRevenue.rows[0].total),
      today_revenue: parseFloat(todayRevenue.rows[0].total),
      week_revenue: parseFloat(weekRevenue.rows[0].total),
      month_revenue: parseFloat(monthRevenue.rows[0].total),
      active_taxpayers: parseInt(activeTaxpayers.rows[0].count),
      compliance_rate: parseFloat(complianceRate.rows[0].rate).toFixed(1),
      top_tax_types: topTaxTypes.rows
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
// Get active stamp for a town
//router.get('/stamps/active', auth, async (req, res) => {
   // Get active stamp for a town
router.get('/stamps/active', auth, async (req, res) => {
    try {
        const { town_id } = req.query;
        
        console.log('Fetching active stamp for town:', town_id);
        
        let query = 'SELECT * FROM government_stamps WHERE is_active = true';
        let params = [];
        
        if (town_id) {
            query += ' AND town_id = $1 ORDER BY created_at DESC LIMIT 1';
            params = [town_id];
        } else {
            query += ' ORDER BY created_at DESC LIMIT 1';
        }
        
        const stamp = await pool.query(query, params);
        
        if (stamp.rows.length === 0) {
            console.log('No active stamp found for town:', town_id);
            return res.json({ stamp: null });
        }
        
        console.log('Active stamp found:', stamp.rows[0]);
        res.json({ stamp: stamp.rows[0] });
    } catch (error) {
        console.error('Get active stamp error:', error);
        res.status(500).json({ error: 'Failed to fetch active stamp' });
    }
});

module.exports = router;