const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { nanoid } = require('nanoid');

async function generateCertificatePdf({ studentName, courseName, issuerName, issueDate, certificateId, logoUrl, signatureImage, template }) {
    const certificatesDir = path.join(__dirname, '..', 'public', 'certificates');
    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir, { recursive: true });

    const filename = `${certificateId}.pdf`;
    const filePath = path.join(certificatesDir, filename);

    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Background (if provided)
            if (template && template.backgroundUrl) {
                // For simplicity, skip embedding remote images in this implementation
            }

            // Header - logo
            doc.image(logoUrl || path.join(__dirname, '..', 'public', 'images', 'logo.png'), 50, 50, { width: 100, height: 50 });

            doc.fontSize(24).fillColor('#333').text('Certificate of Completion', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(18).text(studentName, { align: 'center', underline: true });
            doc.moveDown(0.5);

            doc.fontSize(14).text(`has successfully completed the course`, { align: 'center' });
            doc.moveDown(0.5);

            doc.fontSize(16).text(courseName, { align: 'center', bold: true });
            doc.moveDown(1);

            doc.fontSize(12).text(`Issued by ${issuerName}`, { align: 'left' });
            doc.text(`Issue Date: ${new Date(issueDate).toLocaleDateString()}`, { align: 'left' });
            doc.text(`Certificate ID: ${certificateId}`, { align: 'left' });

            // Signature
            if (signatureImage) {
                try { doc.image(signatureImage, doc.page.width - 200, doc.y + 10, { width: 120 }); } catch (e) { }
            }

            // QR code - verification link
            const verifyUrl = `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/certificates/verify/${certificateId}`;
            const qrDataUrl = await qrcode.toDataURL(verifyUrl);
            const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, '');
            const qrBuffer = Buffer.from(qrImage, 'base64');
            doc.image(qrBuffer, doc.page.width - 140, doc.page.height - 200, { width: 100 });

            doc.end();
            stream.on('finish', () => resolve({ filePath, filename, verifyUrl }));
        } catch (err) { reject(err); }
    });
}

function generateCertificateId() { return `CERT-${nanoid(10).toUpperCase()}`; }

module.exports = { generateCertificatePdf, generateCertificateId };
