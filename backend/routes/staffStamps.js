const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is staff
const requireStaff = (req, res, next) => {
  if (req.user.role !== 'staff' && !req.user.is_super_admin) {
    return res.status(403).json({ error: 'Access denied. Staff role required.' });
  }
  next();
};

// Configure multer for staff stamp uploads
const staffStampStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/staff-stamps/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `staff-stamp-${req.user.user_id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const staffStampUpload = multer({ 
  storage: staffStampStorage,
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

// Get staff's stamp
router.get('/stamp', auth, requireStaff, async (req, res) => {
  try {
    const stamp = await pool.query(
      'SELECT * FROM staff_stamps WHERE staff_user_id = $1',
      [req.user.user_id]
    );

    res.json({ stamp: stamp.rows[0] || null });
  } catch (error) {
    console.error('Get staff stamp error:', error);
    res.status(500).json({ error: 'Failed to fetch staff stamp' });
  }
});

// Upload/Update staff stamp
router.post('/stamp', auth, requireStaff, staffStampUpload.single('stamp_image'), async (req, res) => {
  try {
    const { stamp_name, stamp_position } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Stamp image is required' });
    }

    // Check if staff already has a stamp
    const existingStamp = await pool.query(
      'SELECT id FROM staff_stamps WHERE staff_user_id = $1',
      [req.user.user_id]
    );

    let stamp;
    if (existingStamp.rows.length > 0) {
      // Update existing stamp
      stamp = await pool.query(
        'UPDATE staff_stamps SET stamp_name = $1, stamp_image_path = $2, stamp_position = $3 WHERE staff_user_id = $4 RETURNING *',
        [stamp_name, req.file.path, stamp_position, req.user.user_id]
      );
    } else {
      // Create new stamp
      stamp = await pool.query(
        'INSERT INTO staff_stamps (staff_user_id, stamp_name, stamp_image_path, stamp_position) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.user_id, stamp_name, req.file.path, stamp_position]
      );
    }

    // Log the action
    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, `Uploaded staff stamp: ${stamp_name}`, 'staff_stamp', stamp.rows[0].id]
    );

    res.json({ stamp: stamp.rows[0] });
  } catch (error) {
    console.error('Upload staff stamp error:', error);
    res.status(500).json({ error: 'Failed to upload staff stamp' });
  }
});

// Delete staff stamp
router.delete('/stamp', auth, requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM staff_stamps WHERE staff_user_id = $1 RETURNING *',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff stamp not found' });
    }

    await pool.query(
      'INSERT INTO system_audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.user_id, 'Deleted staff stamp', 'staff_stamp', result.rows[0].id]
    );

    res.json({ message: 'Staff stamp deleted successfully' });
  } catch (error) {
    console.error('Delete staff stamp error:', error);
    res.status(500).json({ error: 'Failed to delete staff stamp' });
  }
});

module.exports = router;