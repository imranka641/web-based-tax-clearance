const QRCode = require('qrcode');

class QRCodeService {
    async generateCertificateQRCode(certificateData) {
        try {
            // Create verification data object with all taxpayer information
            const verificationData = {
                // Certificate Information
                certificate: {
                    number: certificateData.tcc_number,
                    issue_date: certificateData.issue_date,
                    expiry_date: certificateData.expiry_date,
                    application_id: certificateData.application_id
                },
                
                // Taxpayer Personal Information
                taxpayer: {
                    full_name: certificateData.taxpayer_name,
                    tin: certificateData.tin,
                    fayda_number: certificateData.fayda_number,
                    national_id_number: certificateData.national_id_number,
                    email: certificateData.email,
                    phone: certificateData.phone
                },
                
                // Business Information
                business: {
                    name: certificateData.business_name || 'Self Employed',
                    type: 'Retail/Trade' // You can make this dynamic
                },
                
                // Location Information
                location: {
                    region: certificateData.region_name,
                    town: certificateData.town_name
                },
                
                // Payment Information
                payment: {
                    total_paid: certificateData.total_paid || 0,
                    last_payment_date: certificateData.last_payment_date
                },
                
                // Verification URL
                verify_url: `http://localhost:3000/verify-certificate/${certificateData.tcc_number}`,
                
                // Timestamp
                generated_at: new Date().toISOString()
            };

            // Convert to JSON string
            const dataString = JSON.stringify(verificationData, null, 2);

            // Generate QR Code as Data URL (for embedding in PDF)
            const qrCodeDataURL = await QRCode.toDataURL(dataString, {
                errorCorrectionLevel: 'H', // High error correction
                margin: 1,
                width: 200,
                color: {
                    dark: '#000000',  // Black dots
                    light: '#FFFFFF' // White background
                }
            });

            // Also generate as buffer for possible storage
            const qrCodeBuffer = await QRCode.toBuffer(dataString, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 200
            });

            return {
                dataURL: qrCodeDataURL,
                buffer: qrCodeBuffer,
                verificationData: verificationData
            };

        } catch (error) {
            console.error('QR Code generation error:', error);
            throw error;
        }
    }

    // Generate a verification URL that shows all taxpayer details
    generateVerificationUrl(certificateNumber) {
        return `http://localhost:3000/verify-certificate/${certificateNumber}`;
    }

    // Decode and verify QR code data
    async verifyQRCode(qrCodeData) {
        try {
            // In a real implementation, you would:
            // 1. Decode the QR code
            // 2. Verify signature/hash
            // 3. Check against database
            // 4. Return verification result
            
            const verificationResult = {
                valid: true,
                message: 'Certificate is valid',
                details: qrCodeData
            };
            
            return verificationResult;
        } catch (error) {
            console.error('QR Code verification error:', error);
            return {
                valid: false,
                message: 'Invalid or tampered certificate',
                error: error.message
            };
        }
    }
}

module.exports = new QRCodeService();