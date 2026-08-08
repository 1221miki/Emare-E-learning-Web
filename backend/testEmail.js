require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration...\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-5) : 'NOT SET');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error('\n❌ Email Configuration Failed:');
        console.error(error.message);
    } else {
        console.log('\n✅ Email Configuration Successful!');
        console.log('Ready to send emails.');
        
        // Try sending a test email
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'Test Email from Emare ELMS',
            html: `
            <h2>Email Configuration Test</h2>
            <p>This is a test email to verify your Gmail SMTP is working correctly.</p>
            <p><strong>Code:</strong> 123456</p>
            `
        };
        
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('\n❌ Failed to send test email:');
                console.error(err.message);
            } else {
                console.log('\n✅ Test email sent successfully!');
                console.log('Message ID:', info.messageId);
            }
            process.exit(0);
        });
    }
});
