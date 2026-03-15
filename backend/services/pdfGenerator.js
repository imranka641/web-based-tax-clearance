const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    async generateTCCCertificate(certificateData, paymentData = null, townId = null) {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch active government stamp for this town
                let stampBuffer = null;
                let stampPosition = 'bottom_right';
                if (townId) {
                    const stamp = await this.fetchGovernmentStamp(townId);
                    if (stamp) {
                        stampBuffer = stamp.imageBuffer;
                        stampPosition = stamp.position;
                        console.log(`Stamp loaded for town ${townId}, position: ${stampPosition}`);
                    }
                }

                // Generate QR Code with all taxpayer information
                const qrBuffer = await this.generateQRCode({
                    tcc_number: certificateData.tcc_number,
                    taxpayer_name: certificateData.taxpayer_name,
                    tin: certificateData.tin,
                    issue_date: certificateData.issue_date,
                    expiry_date: certificateData.expiry_date
                });

                // Create PDF document
                const doc = new PDFDocument({
                    size: 'A4',
                    layout: 'portrait',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    },
                    info: {
                        Title: `Tax Clearance Certificate - ${certificateData.tcc_number}`,
                        Author: 'Ethiopian Ministry of Revenue',
                        Subject: 'Tax Clearance Certificate',
                        Keywords: 'tax, clearance, certificate, Ethiopia',
                        Creator: 'Ethiopian Tax System',
                        Producer: 'Ministry of Revenue'
                    },
                    autoFirstPage: true,
                    bufferPages: true
                });

                // Collect PDF chunks
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Add decorative border
                this.addBorder(doc);

                // Add Ethiopian flag colors as header
                this.addHeader(doc, certificateData);

                // Add certificate content with complete taxpayer info
                await this.addContent(doc, certificateData, paymentData);

                // Add QR code (right side, above footer)
                if (qrBuffer) {
                    this.addQRCode(doc, qrBuffer);
                }

                // Add government stamp if available (placed strategically)
                if (stampBuffer) {
                    this.addGovernmentStamp(doc, stampBuffer, stampPosition);
                }

                // Add footer with stamp integration
                this.addFooter(doc, certificateData, stampBuffer ? true : false);

                // Finalize the PDF
                doc.end();

            } catch (error) {
                console.error('PDF Generation Error:', error);
                reject(error);
            }
        });
    }

    async fetchGovernmentStamp(townId) {
        try {
            // Fetch active stamp for this town from your backend
            const response = await axios.get(`http://localhost:5000/api/admin/stamps/active?town_id=${townId}`);
            
            if (response.data && response.data.stamp) {
                const stamp = response.data.stamp;
                console.log('Stamp found:', stamp);
                
                // Fetch the image from the server
                const imageResponse = await axios.get(`http://localhost:5000/${stamp.stamp_image_path}`, {
                    responseType: 'arraybuffer'
                });
                
                return {
                    imageBuffer: Buffer.from(imageResponse.data, 'binary'),
                    position: stamp.stamp_position || 'bottom_right',
                    name: stamp.stamp_name
                };
            }
            console.log('No stamp found for town:', townId);
            return null;
        } catch (error) {
            console.error('Error fetching government stamp:', error);
            return null;
        }
    }

    async generateQRCode(data) {
        try {
            // Simple QR code generation using a third-party API
            const qrData = JSON.stringify(data);
            const response = await axios.get(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`, {
                responseType: 'arraybuffer'
            });
            
            return Buffer.from(response.data, 'binary');
        } catch (error) {
            console.error('Error generating QR code:', error);
            return null;
        }
    }

    addBorder(doc) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        
        // Outer border with Ethiopian colors
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
           .lineWidth(2)
           .strokeColor('#078930') // Green
           .stroke();
        
        // Inner border
        doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
           .lineWidth(1)
           .strokeColor('#FCDD09') // Yellow
           .stroke();
        
        // Corner decorations
        const cornerSize = 20;
        
        // Top-left corner
        doc.moveTo(30, 30)
           .lineTo(30 + cornerSize, 30)
           .lineWidth(2)
           .strokeColor('#DA121A') // Red
           .stroke();
        doc.moveTo(30, 30)
           .lineTo(30, 30 + cornerSize)
           .stroke();
        
        // Top-right corner
        doc.moveTo(pageWidth - 30, 30)
           .lineTo(pageWidth - 30 - cornerSize, 30)
           .stroke();
        doc.moveTo(pageWidth - 30, 30)
           .lineTo(pageWidth - 30, 30 + cornerSize)
           .stroke();
        
        // Bottom-left corner
        doc.moveTo(30, pageHeight - 30)
           .lineTo(30 + cornerSize, pageHeight - 30)
           .stroke();
        doc.moveTo(30, pageHeight - 30)
           .lineTo(30, pageHeight - 30 - cornerSize)
           .stroke();
        
        // Bottom-right corner
        doc.moveTo(pageWidth - 30, pageHeight - 30)
           .lineTo(pageWidth - 30 - cornerSize, pageHeight - 30)
           .stroke();
        doc.moveTo(pageWidth - 30, pageHeight - 30)
           .lineTo(pageWidth - 30, pageHeight - 30 - cornerSize)
           .stroke();
    }

    addHeader(doc, data) {
        // Ethiopian flag stripe
        doc.rect(50, 50, 500, 15)
           .fillColor('#078930') // Green
           .fill();
        doc.rect(50, 65, 500, 15)
           .fillColor('#FCDD09') // Yellow
           .fill();
        doc.rect(50, 80, 500, 15)
           .fillColor('#DA121A') // Red
           .fill();

        // Title
        doc.fontSize(14)
           .fillColor('#000000')
           .text('የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ', 50, 110, { align: 'center', width: 500 });
        
        doc.fontSize(16)
           .fillColor('#078930')
           .text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', { align: 'center', width: 500 });
        
        doc.fontSize(14)
           .fillColor('#000000')
           .text('MINISTRY OF REVENUE', { align: 'center', width: 500 });
        
        doc.moveDown(2);

        // Certificate title with background
        doc.rect(150, doc.y, 300, 40)
           .fillColor('#078930')
           .fill();
        
        doc.fontSize(20)
           .fillColor('#FFFFFF')
           .text('TAX CLEARANCE CERTIFICATE', 150, doc.y - 30, { align: 'center', width: 300 });
        
        doc.fillColor('#000000');
        doc.moveDown(2);
    }

    async addContent(doc, data, paymentData) {
        const startY = doc.y;

        // Certificate number and dates box
        doc.rect(70, startY, 460, 100)
           .fillColor('#F5F5F5')
           .fill();
        
        doc.rect(70, startY, 460, 100)
           .lineWidth(1)
           .strokeColor('#078930')
           .stroke();

        doc.fontSize(11)
           .fillColor('#000000');

        // Left column
        doc.font('Helvetica-Bold')
           .text('Certificate No:', 90, startY + 15);
        doc.font('Helvetica')
           .text(data.tcc_number || 'N/A', 200, startY + 15);

        doc.font('Helvetica-Bold')
           .text('Issue Date:', 90, startY + 35);
        doc.font('Helvetica')
           .text(data.issue_date ? new Date(data.issue_date).toLocaleDateString() : 'N/A', 200, startY + 35);

        doc.font('Helvetica-Bold')
           .text('Expiry Date:', 90, startY + 55);
        doc.font('Helvetica')
           .text(data.expiry_date ? new Date(data.expiry_date).toLocaleDateString() : 'N/A', 200, startY + 55);

        // Right column
        doc.font('Helvetica-Bold')
           .text('Application #:', 350, startY + 15);
        doc.font('Helvetica')
           .text(data.application_number || `APP-${data.application_id}`, 440, startY + 15);

        doc.font('Helvetica-Bold')
           .text('Status:', 350, startY + 35);
        doc.font('Helvetica')
           .fillColor('#078930')
           .text('✅ ACTIVE / COMPLIANT', 440, startY + 35);
        
        doc.fillColor('#000000');
        
        doc.font('Helvetica-Bold')
           .text('Verified By:', 350, startY + 55);
        doc.font('Helvetica')
           .text(data.reviewed_by_name || 'Town Administrator', 440, startY + 55);

        doc.moveDown(7);

        // ===== TAXPAYER INFORMATION SECTION =====
        const infoY = doc.y;
        
        // Section title
        doc.rect(70, infoY, 200, 25)
           .fillColor('#DA121A')
           .fill();
        doc.fontSize(12)
           .fillColor('#FFFFFF')
           .text('TAXPAYER INFORMATION', 75, infoY + 5);
        
        doc.fillColor('#000000');
        doc.moveDown(2);

        // Information box
        doc.rect(70, doc.y, 460, 180)
           .lineWidth(1)
           .strokeColor('#078930')
           .stroke();

        const contentY = doc.y + 10;

        // Row 1: Full Name and TIN
        doc.font('Helvetica-Bold')
           .text('Full Name:', 90, contentY);
        doc.font('Helvetica')
           .text(data.taxpayer_name || 'N/A', 180, contentY);

        doc.font('Helvetica-Bold')
           .text('TIN:', 350, contentY);
        doc.font('Helvetica')
           .text(data.tin || 'N/A', 400, contentY);

        // Row 2: Email and Phone
        doc.font('Helvetica-Bold')
           .text('Email:', 90, contentY + 25);
        doc.font('Helvetica')
           .text(data.email || 'N/A', 180, contentY + 25);

        doc.font('Helvetica-Bold')
           .text('Phone:', 350, contentY + 25);
        doc.font('Helvetica')
           .text(data.phone || '+251-XXX-XXXXXX', 400, contentY + 25);

        // Row 3: Business Name and Type
        doc.font('Helvetica-Bold')
           .text('Business Name:', 90, contentY + 50);
        doc.font('Helvetica')
           .text(data.business_name || 'Self Employed', 200, contentY + 50);

        doc.font('Helvetica-Bold')
           .text('Business Type:', 350, contentY + 50);
        doc.font('Helvetica')
           .text('Retail/Trade', 440, contentY + 50);

        // Row 4: Region and Town
        doc.font('Helvetica-Bold')
           .text('Region:', 90, contentY + 75);
        doc.font('Helvetica')
           .text(data.region_name || 'Oromia', 160, contentY + 75);

        doc.font('Helvetica-Bold')
           .text('Town:', 300, contentY + 75);
        doc.font('Helvetica')
           .text(data.town_name || 'Adama', 360, contentY + 75);

        // Row 5: Total Tax Paid
        const totalPaid = paymentData?.total_paid || data.total_paid || 345000;

        doc.font('Helvetica-Bold')
           .text('Total Tax Paid:', 90, contentY + 100);
        doc.font('Helvetica')
           .fillColor('#078930')
           .text(`ETB ${totalPaid.toLocaleString()}`, 200, contentY + 100);

        doc.moveDown(10);

        // ===== CERTIFICATE STATEMENT =====
        const statementY = doc.y;
        
        doc.rect(70, statementY, 460, 80)
           .fillColor('#FDF5E6')
           .fill();
        
        doc.rect(70, statementY, 460, 80)
           .lineWidth(1)
           .strokeColor('#DA121A')
           .stroke();

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('THIS IS TO CERTIFY THAT', 70, statementY + 10, { align: 'center', width: 460 });
        
        doc.fontSize(12)
           .fillColor('#078930')
           .text((data.taxpayer_name || '').toUpperCase(), { align: 'center', width: 460 });
        
        doc.fontSize(9)
           .fillColor('#000000')
           .text(`with TIN ${data.tin || 'N/A'} has fulfilled all tax obligations`, { align: 'center', width: 460 });
        doc.text('and is in good standing with the Ministry of Revenue.', { align: 'center', width: 460 });

        doc.moveDown(4);
    }

    addQRCode(doc, qrBuffer) {
        try {
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            
            // Position QR code at bottom right, above footer
            const qrX = pageWidth - 180;
            const qrY = pageHeight - 220;
            const qrSize = 100;

            // Add white background for QR code
            doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 25)
               .fillColor('#FFFFFF')
               .fill();

            // Add QR code image
            doc.image(qrBuffer, qrX, qrY, {
                width: qrSize,
                height: qrSize
            });

            // Add label
            doc.fontSize(8)
               .fillColor('#000000')
               .text('SCAN TO VERIFY', qrX, qrY + qrSize + 5, {
                   width: qrSize,
                   align: 'center'
               });

            console.log('QR code added to PDF');
        } catch (error) {
            console.error('Error adding QR code:', error);
        }
    }

    addGovernmentStamp(doc, stampBuffer, position) {
        try {
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            
            // Set stamp size
            const stampWidth = 100;
            const stampHeight = 100;
            
            // Calculate position based on position parameter
            let x, y;
            
            switch(position) {
                case 'top_left':
                    x = 70;
                    y = 150;
                    break;
                case 'top_right':
                    x = pageWidth - 170;
                    y = 150;
                    break;
                case 'bottom_left':
                    x = 70;
                    y = pageHeight - 250;
                    break;
                case 'bottom_right':
                default:
                    x = pageWidth - 170;
                    y = pageHeight - 250;
                    break;
            }

            // Add semi-transparent white background
            doc.save();
            doc.rect(x - 5, y - 5, stampWidth + 10, stampHeight + 10)
               .fillColor('#FFFFFF')
               .fillOpacity(0.8)
               .fill();
            doc.restore();

            // Add the stamp image
            doc.save();
            doc.image(stampBuffer, x, y, {
                width: stampWidth,
                height: stampHeight
            });
            doc.restore();

            // Add stamp label
            doc.save();
            doc.fontSize(7)
               .fillColor('#666666')
               .text('OFFICIAL STAMP', x, y + stampHeight + 2, {
                   width: stampWidth,
                   align: 'center'
               });
            doc.restore();

            console.log(`Stamp added at position: ${position} (${x}, ${y})`);
        } catch (error) {
            console.error('Error adding government stamp:', error);
        }
    }

    addFooter(doc, data, hasStamp = false) {
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 120;

        // Left side - Signature
        doc.moveTo(70, footerY)
           .lineTo(270, footerY)
           .lineWidth(1)
           .strokeColor('#000000')
           .stroke();
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text('Authorized Signatory', 70, footerY + 5);
        
        doc.font('Helvetica-Bold')
           .text(data.reviewed_by_name || 'Town Administrator', 70, footerY + 20);
        doc.font('Helvetica')
           .text('Town Administrator', 70, footerY + 35);
        doc.text(data.town_name || 'Adama Town Administration', 70, footerY + 50);

        // Right side - Regional Admin Stamp or QR Code placeholder
        if (hasStamp) {
            // If we already added a stamp elsewhere, just show a note or keep the QR placeholder
            doc.fontSize(8)
               .fillColor('#666666')
               .text('OFFICIAL STAMP', 400, footerY + 35, { 
                   align: 'center', 
                   width: 100 
               });
            
            doc.fontSize(7)
               .text('(Applied above)', 400, footerY + 50, { 
                   align: 'center', 
                   width: 100 
               });
        } else {
            // QR Code placeholder if no stamp
            doc.rect(400, footerY - 20, 100, 100)
               .lineWidth(1)
               .strokeColor('#000000')
               .stroke();
            
            doc.fontSize(8)
               .text('SCAN TO VERIFY', 420, footerY + 85, { align: 'center', width: 60 });
        }

        // Footer text
        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .fillColor('#666666')
           .text(
               'This is an electronically generated certificate. It is valid with official stamp.',
               70, pageHeight - 50,
               { align: 'center', width: 460 }
           );
        
        doc.fontSize(7)
           .text(
               `Generated on ${new Date().toLocaleString()} | Ministry of Revenue - Ethiopian Tax System`,
               { align: 'center', width: 460 }
           );
    }
}

module.exports = new PDFGenerator();