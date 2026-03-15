const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { generateTCCCertificateWithStamp } = require('../services/pdfService');
const QRCode = require('qrcode');
const { generateTCCCertificate } = require('../services/pdfService');
const router = express.Router();

// Middleware to check if user is staff
const requireStaff = (req, res, next) => {
  if (req.user.role !== 'staff' && !req.user.is_super_admin) {
    return res.status(403).json({ error: 'Access denied. Staff role required.' });
  }
  next();
};

// Helper function to generate certificate for an application
async function generateCertificateForApplication(applicationId) {
  try {
    console.log('🔄 Generating certificate for application:', applicationId);
    
    const applicationDetails = await pool.query(
      `SELECT ta.*, u.full_name, u.tin, u.business_name, u.email, u.phone, 
              u.region_id, u.town_id, r.name as region_name, t.name as town_name
       FROM tcc_applications ta 
       JOIN users u ON ta.user_id = u.id 
       LEFT JOIN regions r ON u.region_id = r.id
       LEFT JOIN towns t ON u.town_id = t.id
       WHERE ta.id = $1 AND ta.status = 'Approved'`,
      [applicationId]
    );

    if (applicationDetails.rows.length === 0) {
      throw new Error('Application not found or not approved');
    }

    const application = applicationDetails.rows[0];
    
    // Generate TCC number
    const tccNumber = `TCC-${new Date().getFullYear()}-${String(applicationId).padStart(6, '0')}`;
    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const certificateData = {
      tcc_number: tccNumber,
      issue_date: issueDate,
      expiry_date: expiryDate
    };

    const taxpayerData = {
      full_name: application.full_name,
      tin: application.tin,
      business_name: application.business_name,
      email: application.email,
      phone: application.phone,
      region_name: application.region_name,
      town_name: application.town_name
    };

    // Generate PDF
    const pdfBuffer = await generateTCCCertificate(certificateData, taxpayerData, application);

    // Save certificate
    await pool.query(
      `INSERT INTO issued_certificates 
       (application_id, tcc_number, issue_date, expiry_date, pdf_data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [applicationId, tccNumber, issueDate, expiryDate, pdfBuffer]
    );

    console.log('✅ Certificate generated successfully for application:', applicationId);
    return true;
    
  } catch (error) {
    console.error('❌ Certificate generation failed:', error);
    throw error;
  }
}

// Get TCC applications for staff (filtered by their region/town)
router.get('/tcc-applications', auth, requireStaff, async (req, res) => {
  try {
    let applicationsQuery;
    let queryParams = [];

    if (req.user.user_type === 'town_admin') {
      // Town admin sees only applications from their town
      applicationsQuery = `
        SELECT 
          ta.*,
          u.full_name as taxpayer_name,
          u.tin as taxpayer_tin,
          u.email as taxpayer_email,
          u.business_name,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.town_id = $1
        ORDER BY ta.submitted_at DESC`;
      queryParams = [req.user.town_id];
    } else if (req.user.user_type === 'regional_admin') {
      // Regional admin sees applications from their region
      applicationsQuery = `
        SELECT 
          ta.*,
          u.full_name as taxpayer_name,
          u.tin as taxpayer_tin,
          u.email as taxpayer_email,
          u.business_name,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.region_id = $1
        ORDER BY ta.submitted_at DESC`;
      queryParams = [req.user.region_id];
    } else {
      // Super admin or staff sees all applications
      applicationsQuery = `
        SELECT 
          ta.*,
          u.full_name as taxpayer_name,
          u.tin as taxpayer_tin,
          u.email as taxpayer_email,
          u.business_name,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        ORDER BY ta.submitted_at DESC`;
    }

    const applications = await pool.query(applicationsQuery, queryParams);
    res.json({ applications: applications.rows });

  } catch (error) {
    console.error('Get staff applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get all applications for staff (backward compatibility)
router.get('/applications', auth, requireStaff, async (req, res) => {
  try {
    let applicationsQuery;
    let queryParams = [];

    if (req.user.user_type === 'town_admin') {
      applicationsQuery = `
        SELECT 
          ta.id, 
          ta.status, 
          ta.submitted_at, 
          ta.reviewed_at,
          ta.rejection_reason,
          ta.region_id,
          ta.town_id,
          u.full_name as taxpayer_name,
          u.tin,
          u.email,
          u.phone,
          u.business_name,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.town_id = $1
        ORDER BY ta.submitted_at DESC`;
      queryParams = [req.user.town_id];
    } else if (req.user.user_type === 'regional_admin') {
      applicationsQuery = `
        SELECT 
          ta.id, 
          ta.status, 
          ta.submitted_at, 
          ta.reviewed_at,
          ta.rejection_reason,
          ta.region_id,
          ta.town_id,
          u.full_name as taxpayer_name,
          u.tin,
          u.email,
          u.phone,
          u.business_name,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.region_id = $1
        ORDER BY ta.submitted_at DESC`;
      queryParams = [req.user.region_id];
    } else {
      applicationsQuery = `
        SELECT 
          ta.id, 
          ta.status, 
          ta.submitted_at, 
          ta.reviewed_at,
          ta.rejection_reason,
          ta.region_id,
          ta.town_id,
          u.full_name as taxpayer_name,
          u.tin,
          u.email,
          u.phone,
          u.business_name,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        ORDER BY ta.submitted_at DESC`;
    }

    const applications = await pool.query(applicationsQuery, queryParams);

    res.json({
      applications: applications.rows
    });

  } catch (error) {
    console.error('Get staff applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get single application details
router.get('/applications/:id', auth, requireStaff, async (req, res) => {
  try {
    let applicationQuery;
    let queryParams = [req.params.id];

    if (req.user.user_type === 'town_admin') {
      applicationQuery = `
        SELECT 
          ta.*,
          u.full_name as taxpayer_name,
          u.tin,
          u.email,
          u.phone,
          u.business_name,
          u.region_id,
          u.town_id,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.id = $1 AND ta.town_id = $2`;
      queryParams = [req.params.id, req.user.town_id];
    } else if (req.user.user_type === 'regional_admin') {
      applicationQuery = `
        SELECT 
          ta.*,
          u.full_name as taxpayer_name,
          u.tin,
          u.email,
          u.phone,
          u.business_name,
          u.region_id,
          u.town_id,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.id = $1 AND ta.region_id = $2`;
      queryParams = [req.params.id, req.user.region_id];
    } else {
      applicationQuery = `
        SELECT 
          ta.*,
          u.full_name as taxpayer_name,
          u.tin,
          u.email,
          u.phone,
          u.business_name,
          u.region_id,
          u.town_id,
          r.name as region_name,
          t.name as town_name,
          reviewer.full_name as reviewed_by_name
        FROM tcc_applications ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN regions r ON ta.region_id = r.id
        LEFT JOIN towns t ON ta.town_id = t.id
        LEFT JOIN users reviewer ON ta.reviewed_by = reviewer.id
        WHERE ta.id = $1`;
    }

    const application = await pool.query(applicationQuery, queryParams);

    if (application.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get compliance data
    const compliance = await pool.query(
      'SELECT * FROM taxpayer_records WHERE tin = $1',
      [application.rows[0].tin]
    );

    // FIXED: More flexible compliance logic
    let complianceData = null;
    if (compliance.rows.length > 0) {
      const comp = compliance.rows[0];
      const isCompliant = comp.has_filed_returns && comp.has_paid_taxes && comp.outstanding_balance <= 0;
      
      complianceData = {
        ...comp,
        is_compliant: isCompliant,
        compliance_notes: isCompliant ? 
          'Taxpayer is fully compliant' : 
          `Compliance issues: ${!comp.has_filed_returns ? 'Returns not filed' : ''} ${!comp.has_paid_taxes ? 'Taxes not paid' : ''} ${comp.outstanding_balance > 0 ? `Outstanding balance: ETB ${comp.outstanding_balance}` : ''}`
      };
    }

    res.json({
      application: application.rows[0],
      compliance: complianceData
    });

  } catch (error) {
    console.error('Get application details error:', error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
});

// Check taxpayer compliance
router.get('/compliance/:tin', auth, requireStaff, async (req, res) => {
  try {
    const compliance = await pool.query(
      'SELECT * FROM taxpayer_records WHERE tin = $1',
      [req.params.tin]
    );

    if (compliance.rows.length === 0) {
      // Return a default non-compliant record if none exists
      return res.json({
        tin: req.params.tin,
        has_filed_returns: false,
        has_paid_taxes: false,
        outstanding_balance: 0.00,
        is_compliant: false,
        note: 'No compliance record found. Defaulting to non-compliant status.'
      });
    }

    const comp = compliance.rows[0];
    const complianceData = {
      ...comp,
      is_compliant: comp.has_filed_returns && comp.has_paid_taxes && comp.outstanding_balance === 0
    };

    res.json(complianceData);

  } catch (error) {
    console.error('Check compliance error:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// Update TCC application status (for town admins)
router.put('/tcc-applications/:id', auth, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    
    const validStatuses = ['Under Review', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if application belongs to town admin's jurisdiction
    const applicationCheck = await pool.query(
      'SELECT town_id, region_id FROM tcc_applications WHERE id = $1',
      [id]
    );

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (req.user.user_type === 'town_admin' && applicationCheck.rows[0].town_id !== req.user.town_id) {
      return res.status(403).json({ error: 'Access denied. You can only review applications from your town.' });
    }

    if (req.user.user_type === 'regional_admin' && applicationCheck.rows[0].region_id !== req.user.region_id) {
      return res.status(403).json({ error: 'Access denied. You can only review applications from your region.' });
    }

    const updateData = await pool.query(
      `UPDATE tcc_applications 
       SET status = $1, 
           reviewed_by = $2, 
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $3
       WHERE id = $4 
       RETURNING *`,
      [status, req.user.user_id, rejection_reason, id]
    );

    if (status === 'Approved') {
      // Generate certificate
      await generateCertificateForApplication(id);
    }

    res.json({
      message: `Application ${status.toLowerCase()} successfully`,
      application: updateData.rows[0]
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Update application status (backward compatibility)
router.put('/applications/:id', auth, requireStaff, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    
    const validStatuses = ['Under Review', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check jurisdiction access
    const applicationCheck = await pool.query(
      'SELECT town_id, region_id FROM tcc_applications WHERE id = $1',
      [req.params.id]
    );

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (req.user.user_type === 'town_admin' && applicationCheck.rows[0].town_id !== req.user.town_id) {
      return res.status(403).json({ error: 'Access denied. You can only review applications from your town.' });
    }

    if (req.user.user_type === 'regional_admin' && applicationCheck.rows[0].region_id !== req.user.region_id) {
      return res.status(403).json({ error: 'Access denied. You can only review applications from your region.' });
    }

    // Get application details first
    const applicationResult = await pool.query(
      `SELECT ta.*, u.* 
       FROM tcc_applications ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.id = $1`,
      [req.params.id]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applicationResult.rows[0];

    const updateData = await pool.query(
      `UPDATE tcc_applications 
       SET status = $1, 
           reviewed_by = $2, 
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $3
       WHERE id = $4 
       RETURNING *`,
      [status, req.user.user_id, rejection_reason, req.params.id]
    );

    let certificateData = null;

    if (status === 'Approved') {
      // Generate certificate
      await generateCertificateForApplication(req.params.id);
    }

    res.json({
      message: `Application ${status.toLowerCase()} successfully`,
      application: updateData.rows[0],
      certificate: certificateData
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Download TCC certificate - FIXED VERSION
router.get('/certificates/:applicationId/download', auth, requireStaff, async (req, res) => {
  try {
    let certificateQuery;
    let queryParams = [req.params.applicationId];

    if (req.user.user_type === 'town_admin') {
      certificateQuery = `
        SELECT ic.*, u.full_name, u.tin, u.business_name, ta.town_id
        FROM issued_certificates ic
        JOIN tcc_applications ta ON ic.application_id = ta.id
        JOIN users u ON ta.user_id = u.id
        WHERE ic.application_id = $1 AND ta.town_id = $2`;
      queryParams = [req.params.applicationId, req.user.town_id];
    } else if (req.user.user_type === 'regional_admin') {
      certificateQuery = `
        SELECT ic.*, u.full_name, u.tin, u.business_name, ta.region_id
        FROM issued_certificates ic
        JOIN tcc_applications ta ON ic.application_id = ta.id
        JOIN users u ON ta.user_id = u.id
        WHERE ic.application_id = $1 AND ta.region_id = $2`;
      queryParams = [req.params.applicationId, req.user.region_id];
    } else {
      certificateQuery = `
        SELECT ic.*, u.full_name, u.tin, u.business_name
        FROM issued_certificates ic
        JOIN tcc_applications ta ON ic.application_id = ta.id
        JOIN users u ON ta.user_id = u.id
        WHERE ic.application_id = $1`;
    }

    const certificate = await pool.query(certificateQuery, queryParams);

    if (certificate.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = certificate.rows[0];

    // Check if PDF data exists
    if (!cert.pdf_data) {
      return res.status(404).json({ 
        error: 'PDF certificate not generated yet. Please try again in a few moments.' 
      });
    }

    // Verify PDF data is a valid buffer
    if (!Buffer.isBuffer(cert.pdf_data)) {
      return res.status(500).json({ 
        error: 'Invalid PDF data format' 
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TCC-${cert.tcc_number}.pdf"`);
    res.setHeader('Content-Length', cert.pdf_data.length);
    
    // Send the PDF buffer
    res.send(cert.pdf_data);

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

// Add certificate status check endpoint for debugging
router.get('/certificates/:applicationId/status', auth, requireStaff, async (req, res) => {
  try {
    let certificateQuery;
    let queryParams = [req.params.applicationId];

    if (req.user.user_type === 'town_admin') {
      certificateQuery = `
        SELECT 
          ic.*,
          u.full_name,
          u.tin,
          LENGTH(ic.pdf_data) as pdf_size,
          ic.pdf_data IS NOT NULL as has_pdf,
          ta.town_id
        FROM issued_certificates ic
        JOIN tcc_applications ta ON ic.application_id = ta.id
        JOIN users u ON ta.user_id = u.id
        WHERE ic.application_id = $1 AND ta.town_id = $2`;
      queryParams = [req.params.applicationId, req.user.town_id];
    } else if (req.user.user_type === 'regional_admin') {
      certificateQuery = `
        SELECT 
          ic.*,
          u.full_name,
          u.tin,
          LENGTH(ic.pdf_data) as pdf_size,
          ic.pdf_data IS NOT NULL as has_pdf,
          ta.region_id
        FROM issued_certificates ic
        JOIN tcc_applications ta ON ic.application_id = ta.id
        JOIN users u ON ta.user_id = u.id
        WHERE ic.application_id = $1 AND ta.region_id = $2`;
      queryParams = [req.params.applicationId, req.user.region_id];
    } else {
      certificateQuery = `
        SELECT 
          ic.*,
          u.full_name,
          u.tin,
          LENGTH(ic.pdf_data) as pdf_size,
          ic.pdf_data IS NOT NULL as has_pdf
        FROM issued_certificates ic
        JOIN tcc_applications ta ON ic.application_id = ta.id
        JOIN users u ON ta.user_id = u.id
        WHERE ic.application_id = $1`;
    }

    const certificate = await pool.query(certificateQuery, queryParams);

    if (certificate.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = certificate.rows[0];
    
    res.json({
      exists: true,
      tcc_number: cert.tcc_number,
      taxpayer_name: cert.full_name,
      tin: cert.tin,
      has_pdf: cert.has_pdf,
      pdf_size: cert.pdf_size,
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date,
      can_download: cert.has_pdf
    });

  } catch (error) {
    console.error('Certificate status check error:', error);
    res.status(500).json({ error: 'Failed to check certificate status' });
  }
});

// Regenerate certificate for an application (for testing)
router.post('/applications/:id/regenerate-certificate', auth, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check jurisdiction access
    const applicationCheck = await pool.query(
      'SELECT town_id, region_id FROM tcc_applications WHERE id = $1',
      [id]
    );

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (req.user.user_type === 'town_admin' && applicationCheck.rows[0].town_id !== req.user.town_id) {
      return res.status(403).json({ error: 'Access denied. You can only regenerate certificates for applications from your town.' });
    }

    if (req.user.user_type === 'regional_admin' && applicationCheck.rows[0].region_id !== req.user.region_id) {
      return res.status(403).json({ error: 'Access denied. You can only regenerate certificates for applications from your region.' });
    }
    
    // Delete existing certificate
    await pool.query('DELETE FROM issued_certificates WHERE application_id = $1', [id]);
    
    // Generate new certificate
    await generateCertificateForApplication(id);
    
    res.json({ 
      success: true, 
      message: 'Certificate regenerated successfully' 
    });
    
  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({ error: 'Failed to regenerate certificate' });
  }
});

module.exports = router;