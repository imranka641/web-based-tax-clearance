const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCodeService = require('./qrCodeService');
const pool = require('../config/database');

const generateTCCCertificate = async (certificateData, taxpayerData, applicationData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 50, bottom: 50, left: 40, right: 40 },
        info: {
          Title: `TCC Certificate - ${certificateData.tcc_number}`,
          Author: 'Ethiopian Ministry of Revenue',
          Subject: 'Tax Clearance Certificate',
          Keywords: 'TCC, Tax, Certificate, Ethiopia, Revenue',
          Creator: 'Ethiopian Revenue System',
          CreationDate: new Date()
        }
      });
      
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Get system configuration and active stamp
      const systemSettings = await getSystemSettings();
      const activeStamp = await getActiveGovernmentStamp();

      // ========== TOP COLORED BORDER ==========
      doc.rect(0, 0, 595, 15)
         .fill('#1A5276'); // Dark blue header bar

      // ========== STAMP IN LEFT TOP CORNER ==========
      try {
        if (activeStamp && activeStamp.stamp_image_path) {
          const stampPath = path.join(__dirname, '..', activeStamp.stamp_image_path);
          if (fs.existsSync(stampPath)) {
            doc.image(stampPath, 40, 20, { 
              width: 60, 
              height: 40,
              fit: [60, 40]
            });
          } else {
            addModernStampPlaceholder(doc, 40, 20);
          }
        } else {
          addModernStampPlaceholder(doc, 40, 20);
        }
      } catch (stampError) {
        console.error('Error adding stamp:', stampError);
        addModernStampPlaceholder(doc, 40, 20);
      }

      // ========== MODERN HEADER DESIGN ==========
      // Header text adjusted for stamp
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1A5276')
         .text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', 120, 25, { align: 'center' });
      
      doc.fontSize(12)
         .fillColor('#2E86AB')
         .text('MINISTRY OF REVENUE', 120, 45, { align: 'center' });
      
      // Main certificate title with modern styling
      doc.fontSize(16)
         .fillColor('#1A5276')
         .text('TAX CLEARANCE CERTIFICATE', 120, 70, { align: 'center' });
      
      // Decorative elements around title
      doc.circle(280, 75, 3)
         .fill('#2E86AB');
      doc.circle(315, 75, 3)
         .fill('#2E86AB');

      // ========== CERTIFICATE DETAILS - IMPROVED SPACING ==========
      let yPosition = 120;
      
      // Certificate number in modern badge style
      doc.roundedRect(50, yPosition, 495, 30, 5)
         .fill('#E8F4FD')
         .stroke('#2E86AB')
         .lineWidth(1);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1A5276')
         .text('CERTIFICATE NUMBER:', 60, yPosition + 8);
      
      doc.fontSize(14)
         .fillColor('#2E86AB')
         .text(certificateData.tcc_number, 200, yPosition + 6);
      
      yPosition += 45;
      
      // Dates section with improved spacing
      const dates = [
        { 
          label: 'Issue Date:', 
          value: new Date(certificateData.issue_date).toLocaleDateString('en-ET'),
          color: '#28A745'
        },
        { 
          label: 'Expiry Date:', 
          value: new Date(certificateData.expiry_date).toLocaleDateString('en-ET'),
          color: '#DC3545'
        },
        { 
          label: 'Status:', 
          value: 'ACTIVE',
          color: '#28A745',
          highlight: true
        }
      ];
      
      dates.forEach((date, index) => {
        const boxY = yPosition + (index * 25);
        
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#555555')
           .text(date.label, 50, boxY);
        
        if (date.highlight) {
          // Status badge
          const textWidth = doc.widthOfString(date.value);
          doc.roundedRect(150, boxY - 3, textWidth + 10, 15, 7)
             .fill(date.color)
             .stroke(date.color);
          
          doc.font('Helvetica-Bold')
             .fillColor('#FFFFFF')
             .text(date.value, 155, boxY);
        } else {
          doc.font('Helvetica')
             .fillColor(date.color)
             .text(date.value, 150, boxY);
        }
      });
      
      yPosition += 90;

      // ========== TAXPAYER INFORMATION - MODERN CARD DESIGN ==========
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1A5276')
         .text('TAXPAYER INFORMATION', 50, yPosition);
      
      yPosition += 25;
      
      // Card-style container
      doc.roundedRect(50, yPosition, 495, 140, 8)
         .fill('#FFFFFF')
         .stroke('#E0E0E0')
         .lineWidth(1);
      
      const taxpayerInfo = [
        { label: 'Full Name:', value: taxpayerData.full_name, icon: '👤' },
        { label: 'Tax Identification Number (TIN):', value: taxpayerData.tin, icon: '🔢' },
        { label: 'Business Name:', value: taxpayerData.business_name || 'Not Applicable', icon: '🏢' },
        { label: 'Email:', value: taxpayerData.email || 'Not Provided', icon: '📧' },
        { label: 'Phone:', value: taxpayerData.phone || 'Not Provided', icon: '📞' }
      ];
      
      taxpayerInfo.forEach((info, index) => {
        const itemY = yPosition + 10 + (index * 25);
        
        // Icon
        doc.fontSize(9)
           .fillColor('#2E86AB')
           .text(info.icon, 65, itemY);
        
        // Label
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#555555')
           .text(info.label, 85, itemY);
        
        // Value with proper spacing
        doc.font('Helvetica')
           .fillColor('#333333')
           .text(info.value, 250, itemY, {
             width: 280,
             ellipsis: true
           });
        
        // Separator line
        if (index < taxpayerInfo.length - 1) {
          doc.moveTo(60, itemY + 15)
             .lineTo(535, itemY + 15)
             .lineWidth(0.5)
             .strokeColor('#F0F0F0')
             .stroke();
        }
      });
      
      yPosition += 160;

      // ========== CERTIFICATE PURPOSE - MODERN DESIGN ==========
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1A5276')
         .text('CERTIFICATE PURPOSE', 50, yPosition);
      
      yPosition += 25;
      
      // Modern card with solid color (replaced gradient)
      doc.roundedRect(50, yPosition, 495, 100, 8)
         .fill('#E8F5E8')
         .stroke('#28A745')
         .lineWidth(1);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#155724')
         .text('This certificate confirms that the taxpayer named above has fulfilled all tax obligations as of the date of issue and is in good standing with the Ethiopian Revenue Service.', 65, yPosition + 15, {
           width: 465,
           align: 'left',
           lineGap: 4
         });
      
      // Valid for section with icons
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#155724')
         .text('VALID FOR:', 65, yPosition + 55);
      
      const validFor = [
        { text: 'Public tender participation', icon: '📑' },
        { text: 'Business license renewals', icon: '📋' },
        { text: 'Government contract bidding', icon: '📊' },
        { text: 'Import-export operations', icon: '🚢' }
      ];
      
      let listY = yPosition + 70;
      validFor.forEach(item => {
        doc.fontSize(8)
           .fillColor('#2E86AB')
           .text(item.icon, 75, listY);
        
        doc.font('Helvetica')
           .fillColor('#155724')
           .text(item.text, 90, listY);
        listY += 12;
      });
      
      yPosition = listY + 40;

      // ========== SECURITY & VERIFICATION SECTION ==========
      const securityY = 500;
      
      doc.roundedRect(50, securityY, 495, 120, 8)
         .fill('#F8F9FA')
         .stroke('#DEE2E6')
         .lineWidth(1);
      
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('VERIFICATION & SECURITY', 70, securityY + 15);
      
      // QR Code with modern styling
      try {
        const qrCodeDataURL = await QRCodeService.generateTCCQRCode(
          certificateData.tcc_number,
          taxpayerData.full_name,
          certificateData.issue_date
        );
        
        if (qrCodeDataURL) {
          // QR Code container
          doc.roundedRect(400, securityY + 15, 80, 80, 5)
             .fill('#FFFFFF')
             .stroke('#2E86AB')
             .lineWidth(1.5);
          
          doc.image(qrCodeDataURL, 410, securityY + 25, { width: 60, height: 60 });
          
          doc.fontSize(7)
             .font('Helvetica')
             .fillColor('#666666')
             .text('Scan to verify', 400, securityY + 100, { width: 80, align: 'center' });
        }
      } catch (qrError) {
        console.error('QR code generation failed:', qrError);
        doc.roundedRect(400, securityY + 15, 80, 80, 5)
           .fill('#F9F9F9')
           .stroke('#CCC')
           .lineWidth(1);
        doc.fontSize(6)
           .font('Helvetica')
           .fillColor('#999')
           .text('QR Code\nNot Available', 400, securityY + 45, { width: 80, align: 'center' });
      }

      // Security details with icons
      const securityInfo = [
        { icon: '🆔', text: `Certificate ID: ${certificateData.tcc_number}` },
        { icon: '📅', text: `Issue Date: ${new Date(certificateData.issue_date).toLocaleDateString()}` },
        { icon: '🔒', text: `Security Hash: ${generateSecurityHash(certificateData.tcc_number)}` },
        { icon: '🌐', text: `Verify: tax.gov.et/verify-tcc` }
      ];
      
      let securityTextY = securityY + 35;
      securityInfo.forEach(info => {
        doc.fontSize(8)
           .fillColor('#2E86AB')
           .text(info.icon, 70, securityTextY);
        
        doc.font('Helvetica')
           .fillColor('#555555')
           .text(info.text, 85, securityTextY);
        securityTextY += 18;
      });

      // ========== SIGNATURE SECTION ==========
      const signatureY = securityY + 100;
      
      // Signature area with modern design
      doc.roundedRect(300, signatureY, 180, 50, 5)
         .fill('#FFFFFF')
         .stroke('#2E86AB')
         .lineWidth(1);
      
      doc.moveTo(320, signatureY + 25)
         .lineTo(460, signatureY + 25)
         .lineWidth(1)
         .strokeColor('#333333')
         .stroke();
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Authorized Digital Signature', 300, signatureY + 30, { width: 180, align: 'center' });
      
      doc.fontSize(10)
         .text(systemSettings.issuing_authority_name || 'MINISTRY OF REVENUE', 300, signatureY + 45, { width: 180, align: 'center' });

      // ========== BOTTOM COLORED BORDER ==========
      doc.rect(0, 820, 595, 15)
         .fill('#1A5276'); // Dark blue footer bar

      // ========== MODERN FOOTER ==========
      const footerY = 790;
      
      doc.fontSize(7)
         .font('Helvetica-Oblique')
         .fillColor('#666666')
         .text('This is an electronically generated document. No physical signature is required.', 50, footerY, { align: 'center' });
      
      // Security watermark in background
      doc.opacity(0.03);
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 4; j++) {
          doc.fontSize(8)
             .font('Helvetica-Bold')
             .fillColor('#1A5276')
             .text('OFFICIAL DOCUMENT', 50 + (i * 150), 200 + (j * 150), { 
               width: 140, 
               align: 'center',
               rotation: 45 
             });
        }
      }
      doc.opacity(1);
      
      doc.fontSize(6)
         .font('Helvetica')
         .fillColor('#999999')
         .text(`Generated on: ${new Date().toLocaleDateString()} | System Reference: ${certificateData.tcc_number} | Document ID: ${generateDocumentId()}`, 50, footerY + 12, { align: 'center' });

      doc.end();
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};

// Modern stamp placeholder
function addModernStampPlaceholder(doc, x, y) {
  doc.roundedRect(x, y, 60, 40, 5)
     .fill('#FFFFFF')
     .stroke('#2E86AB')
     .lineWidth(1.5);
  
  doc.fontSize(6)
     .font('Helvetica-Bold')
     .fillColor('#2E86AB')
     .text('OFFICIAL', x, y + 12, { width: 60, align: 'center' });
  
  doc.fontSize(5)
     .font('Helvetica')
     .fillColor('#666666')
     .text('STAMP', x, y + 20, { width: 60, align: 'center' });
  
  // Decorative elements
  doc.circle(x + 15, y + 8, 1)
     .fill('#2E86AB');
  doc.circle(x + 45, y + 8, 1)
     .fill('#2E86AB');
}

// Helper function to get system settings
async function getSystemSettings() {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  } catch (error) {
    console.error('Get system settings error:', error);
    return {};
  }
}

// Helper function to get active government stamp
async function getActiveGovernmentStamp() {
  try {
    const result = await pool.query('SELECT * FROM system_stamps WHERE is_active = true LIMIT 1');
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get government stamp error:', error);
    return null;
  }
}

// Generate security hash
function generateSecurityHash(tccNumber) {
  const hash = Buffer.from(tccNumber + Date.now().toString()).toString('base64').substring(0, 10);
  return hash.toUpperCase();
}

// Generate unique document ID
function generateDocumentId() {
  return 'DOC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

module.exports = { generateTCCCertificate };