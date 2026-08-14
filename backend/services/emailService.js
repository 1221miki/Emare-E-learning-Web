const nodemailer = require('nodemailer');

/**
 * Email Service - Handles all transactional emails
 * Supports both production and development/testing modes
 */

let emailConfigured = false;

const invalidCredentialPatterns = ['your-email', 'your-gmail-app-password', 'example.com', 'changeme', 'password'];
const hasRealEmailCredentials = (user, pass) => {
    if (!user || !pass) return false;
    const lowerUser = user.toLowerCase();
    const lowerPass = pass.toLowerCase();
    return !invalidCredentialPatterns.some(pattern => lowerUser.includes(pattern) || lowerPass.includes(pattern));
};

// Create transporter based on environment
const createTransporter = () => {
    // If explicit SMTP settings are provided, use them.
    const smtpHost = process.env.MAIL_HOST || process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpPort = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
    const smtpSecure = process.env.MAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.MAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.MAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

    // Direct SMTP connection (faster than service lookup)
    if (smtpHost && hasRealEmailCredentials(smtpUser, smtpPass)) {
        emailConfigured = true;
        return nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPass
            },
            pool: {
                maxConnections: 10,
                maxMessages: 200,
                rateDelta: 500,
                rateLimit: 10
            },
            socketTimeout: 5000,
            connectionTimeout: 3000,
            greetingTimeout: 3000
        });
    }

    // Support direct email account login for common services such as Gmail
    if (hasRealEmailCredentials(process.env.EMAIL_USER, process.env.EMAIL_PASSWORD)) {
        emailConfigured = true;
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            pool: {
                maxConnections: 10,
                maxMessages: 200,
                rateDelta: 500,
                rateLimit: 10
            },
            socketTimeout: 5000,
            connectionTimeout: 3000,
            greetingTimeout: 3000
        });
    }

    // Fallback: Log email content for debugging when SMTP is not configured.
    // In development mode this allows registration to proceed while still warning that email delivery is not available.
    return {
        sendMail: async (options) => {
            console.warn('📧 [DEV MODE] SMTP is not configured. Email not sent.');
            console.warn(`   To: ${options.to}`);
            console.warn(`   Subject: ${options.subject}`);
            console.warn(`   Body: ${options.html}`);
            return {
                success: true,
                messageId: `dev_${Date.now()}`,
                warning: 'SMTP not configured - email logged to console.',
                fallback: true
            };
        }
    };
};

const transporter = createTransporter();

const logEmailTransportStatus = () => {
    // Run verify in background without blocking
    if (typeof transporter.verify === 'function') {
        setImmediate(() => {
            transporter.verify((error, success) => {
                if (error) {
                    console.warn('📧 Email transporter verification failed:', error.message || error);
                } else {
                    console.log('📧 Email transporter is configured and ready.');
                }
            });
        });
    } else {
        console.warn('📧 Email service is running in fallback mode.');
    }
};

// Non-blocking startup log
setTimeout(logEmailTransportStatus, 100);

/**
 * Send Password Reset Email with Reset Link
 * User receives a secure link to reset their password
 */
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${user.accountEmail}`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>

            <p>We received a request to reset the password for your Emare ELMS account. If you didn't make this request, you can safely ignore this email.</p>

            <p>To reset your password, click the button below:</p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Your Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f9f9f9; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>

            <div class="warning">
              <strong>⏰ This link expires in 15 minutes.</strong> If it expires, you can request a new password reset.
            </div>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>Do not reply to this email. This is an automated message.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: user.accountEmail,
            subject: '🔐 Reset Your Emare ELMS Password',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nReset your password using this link:\n${resetLink}\n\nThis link expires in 15 minutes.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Password reset email sent to ${user.accountEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send password reset email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Password Reset Confirmation Email
 * User receives confirmation that their password was successfully changed
 */
const sendPasswordResetConfirmationEmail = async (user, newPassword) => {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .password-display { 
            background: #f9f9f9; 
            padding: 15px; 
            border-radius: 4px; 
            border: 1px solid #ddd;
            font-family: monospace;
            word-break: break-all;
            margin: 15px 0;
          }
          .security-tip { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>

            <div class="success-box">
              <strong>✅ Your password has been successfully reset!</strong>
            </div>

            <p>Your new temporary password is:</p>

            <div class="password-display">
              <strong>${newPassword}</strong>
            </div>

            <p style="color: #d32f2f;">
              <strong>⚠️ Important:</strong> Please change this password to something memorable after your first login.
            </p>

            <div class="security-tip">
              <strong>🔒 Security Tip:</strong> Never share your password with anyone. Emare ELMS staff will never ask for your password via email or chat.
            </div>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>If you did not request this password reset, please contact support immediately.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: user.accountEmail,
            subject: '✅ Your Emare ELMS Password Has Been Reset',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nYour password has been successfully reset.\n\nYour new temporary password is: ${newPassword}\n\nPlease change this password to something memorable after your first login.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Password confirmation email sent to ${user.accountEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send password confirmation email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

const sendEmailVerification = async (user, verificationCode) => {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .code-box { background: #f9fafb; border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: 700; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>
            <p>Welcome to Emare ELMS! Please verify your email address by entering the code below.</p>

            <div class="code-box">${verificationCode}</div>

            <p>Enter this code on the verification page to activate your account.</p>
            <div class="warning">
              <strong>⏰ This code expires in 15 minutes.</strong>
            </div>

            <p>If you did not create an account with this email, please ignore this message.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>Do not reply to this email. This is an automated message.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: user.accountEmail,
            subject: '🔒 Verify your Emare ELMS email address',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nYour verification code is: ${verificationCode}\n\nThis code expires in 15 minutes.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Email verification sent to ${user.accountEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send verification email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Admin-Initiated Password Reset Email
 * Admin sends reset link to user from admin dashboard
 */
const sendAdminPasswordResetEmail = async (user, resetToken) => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${user.accountEmail}`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hello ${user.fullName || user.accountEmail},</p>

            <div class="info-box">
              <strong>ℹ️ Administrator Password Reset Request</strong><br>
              An administrator has initiated a password reset for your account.
            </div>

            <p>To set a new password, click the button below:</p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Set New Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f9f9f9; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>

            <p style="color: #d32f2f; margin-top: 20px;">
              <strong>⏰ This link expires in 15 minutes.</strong> If it expires, contact your administrator.
            </p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: user.accountEmail,
            subject: '🔐 Admin Initiated: Reset Your Emare ELMS Password',
            html: htmlTemplate,
            text: `Hello ${user.fullName || user.accountEmail},\n\nAn administrator has initiated a password reset for your account.\n\nReset your password using this link:\n${resetLink}\n\nThis link expires in 15 minutes.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Admin password reset email sent to ${user.accountEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send admin password reset email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Welcome/Account Created Email
 * New account created by admin
 */
const sendAccountCreatedEmail = async (user, temporaryPassword) => {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .credentials { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #ddd; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Welcome to Emare ELMS, ${user.fullName}!</p>

            <p>Your account has been successfully created by an administrator. You can now log in and start using the platform.</p>

            <h3>Your Login Credentials:</h3>
            <div class="credentials">
              <p><strong>Email:</strong> ${user.accountEmail}</p>
              <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              <p><strong>Role:</strong> ${user.assignedRole}</p>
            </div>

            <p style="color: #d32f2f;">
              <strong>⚠️ Important:</strong> Please change your password to something memorable after your first login.
            </p>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Sign In to Emare ELMS</a>
            </div>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: user.accountEmail,
            subject: '👋 Welcome to Emare ELMS - Your Account is Ready',
            html: htmlTemplate,
            text: `Welcome to Emare ELMS, ${user.fullName}!\n\nYour account has been created. Your login credentials are:\n\nEmail: ${user.accountEmail}\nTemporary Password: ${temporaryPassword}\n\nPlease change your password after your first login.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Welcome email sent to ${user.accountEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send welcome email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Course Enrollment Confirmation Email
 */
const sendCourseEnrollmentEmail = async (user, course, txRef) => {
    const transporter = createTransporter();
    const amount = typeof course.price !== 'undefined' ? `${course.price} ETB` : 'N/A';
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const courseUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/learn/${course._id}`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
          .receipt { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Enrollment Confirmed! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi ${user.fullName},</p>
          <p>Great news! Your payment was successful and you are now enrolled in <strong>${course.courseTitle || course.title}</strong>.</p>
          
          <div class="receipt">
            <h3 style="margin-top:0">Receipt Summary</h3>
            <p><strong>Course:</strong> ${course.courseTitle || course.title}</p>
            <p><strong>Amount Paid:</strong> ${amount}</p>
            <p><strong>Transaction Ref:</strong> ${txRef}</p>
            <p><strong>Status:</strong> Completed</p>
          </div>

          <p>You can start learning right away. Dive into the course materials, watch the lectures, and take quizzes at your own pace.</p>
          
          <div style="text-align: center;">
            <a href="${courseUrl}" class="button">Start Learning Now</a>
          </div>
          
          <p style="margin-top: 30px;">
            Happy learning!<br>
            <strong>The Emare ELMS Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: user.accountEmail,
            subject: `🎉 Enrollment Confirmed: ${course.courseTitle || course.title}`,
            html: htmlTemplate,
            text: `Hi ${user.fullName},\n\nYour payment for ${course.courseTitle || course.title} was successful (Ref: ${txRef}).\nYou can start learning now: ${courseUrl}\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Enrollment email sent to ${user.accountEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send enrollment email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Discount Coupon Email
 * Sent after a successful homepage newsletter subscription.
 * The coupon code is delivered only via this email — never exposed in the API response.
 */
const sendDiscountEmail = async (toEmail, couponCode, expiresAt) => {
    const expiryStr = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '30 days from now';
    const coursesUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; padding: 20px; }
          .wrapper { max-width: 600px; margin: 0 auto; }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%);
            color: #fff;
            padding: 40px 32px;
            border-radius: 16px 16px 0 0;
            text-align: center;
          }
          .header .logo { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
          .header .tagline { font-size: 13px; opacity: 0.85; margin-top: 6px; }
          .body { background: #ffffff; padding: 36px 32px; border: 1px solid #e2e8f0; }
          .body p { color: #374151; font-size: 15px; line-height: 1.7; margin-bottom: 16px; }
          .coupon-box {
            background: linear-gradient(135deg, #eff6ff, #f5f3ff);
            border: 2px dashed #6366f1;
            border-radius: 12px;
            padding: 28px 24px;
            text-align: center;
            margin: 28px 0;
          }
          .coupon-label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
          .coupon-code {
            font-size: 32px;
            font-weight: 900;
            color: #4f46e5;
            letter-spacing: 0.12em;
            background: #fff;
            border: 2px solid #c7d2fe;
            border-radius: 8px;
            padding: 10px 24px;
            display: inline-block;
            margin: 8px 0 12px;
          }
          .coupon-detail { font-size: 13px; color: #6b7280; margin-top: 4px; }
          .coupon-detail strong { color: #4f46e5; }
          .expiry-note {
            background: #fff7ed;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            padding: 12px 16px;
            font-size: 13px;
            color: #92400e;
            margin: 20px 0;
          }
          .cta-btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #7c3aed);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            margin-top: 8px;
          }
          .how-to { background: #f8fafc; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
          .how-to h4 { color: #1e293b; font-size: 14px; font-weight: 700; margin-bottom: 12px; }
          .how-to ol { padding-left: 18px; color: #475569; font-size: 13px; line-height: 2; }
          .footer {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 16px 16px;
            padding: 20px 32px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="logo">🎓 Emare ICT Hub</div>
            <div class="tagline">E-Learning Management System &mdash; Ethiopia&apos;s Premier Tech Learning Platform</div>
          </div>

          <div class="body">
            <p>Hello,</p>
            <p>
              Thank you for subscribing to <strong>Emare ICT Hub</strong>! 🎉<br>
              As a welcome gift, here is your exclusive <strong>10% discount coupon</strong> valid on any course.
            </p>

            <div class="coupon-box">
              <div class="coupon-label">Your Exclusive Coupon Code</div>
              <div class="coupon-code">${couponCode}</div>
              <div class="coupon-detail">
                <strong>10% OFF</strong> any course &nbsp;&bull;&nbsp; Max discount: 500 ETB
              </div>
              <div class="coupon-detail" style="margin-top:6px;">Single use &nbsp;&bull;&nbsp; Valid until <strong>${expiryStr}</strong></div>
            </div>

            <div class="expiry-note">
              ⏰ <strong>Important:</strong> This coupon expires on <strong>${expiryStr}</strong>.
              Apply it at checkout before it expires!
            </div>

            <div class="how-to">
              <h4>📋 How to use your coupon:</h4>
              <ol>
                <li>Browse our course catalog and pick a course</li>
                <li>Add the course to your cart and proceed to checkout</li>
                <li>Enter the coupon code <strong>${couponCode}</strong> in the discount field</li>
                <li>Your 10% discount will be applied automatically</li>
              </ol>
            </div>

            <div style="text-align:center; margin-top: 28px;">
              <a href="${coursesUrl}" class="cta-btn">Browse Courses Now &rarr;</a>
            </div>

            <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">
              If you did not subscribe on our website, please ignore this email.
              This coupon is personal and linked to your email address.
            </p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p style="margin-top:4px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@emare.com',
            to: toEmail,
            subject: '🎉 Your Exclusive 10% Discount Coupon — Emare ICT Hub',
            html: htmlTemplate,
            text: [
                `Hello,`,
                ``,
                `Thank you for subscribing to Emare ICT Hub!`,
                `Here is your exclusive 10% discount coupon: ${couponCode}`,
                ``,
                `Details:`,
                `  - 10% OFF any course (max 500 ETB)`,
                `  - Single use`,
                `  - Valid until: ${expiryStr}`,
                ``,
                `How to use:`,
                `  1. Go to ${coursesUrl}`,
                `  2. Choose a course and proceed to checkout`,
                `  3. Enter the code ${couponCode} in the discount field`,
                ``,
                `Best regards,`,
                `The Emare ICT Hub Team`
            ].join('\n')
        });

        console.log(`✅ Discount coupon email sent to ${toEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send discount email to ${toEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendPasswordResetConfirmationEmail,
    sendAdminPasswordResetEmail,
    sendAccountCreatedEmail,
    sendEmailVerification,
    sendCourseEnrollmentEmail,
    sendDiscountEmail,
    isEmailConfigured: () => emailConfigured
};
