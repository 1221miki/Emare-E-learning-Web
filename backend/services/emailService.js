const nodemailer = require('nodemailer');

/**
 * Email Service - Handles all transactional emails
 * Supports both production and development/testing modes
 */

// Create transporter based on environment
const createTransporter = () => {
    // Production: Use Gmail or custom SMTP
    if (process.env.NODE_ENV === 'production') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    // Development: Use Ethereal (test email service) or console logging
    if (process.env.MAIL_HOST) {
        return nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT || 587,
            secure: process.env.MAIL_SECURE === 'true',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });
    }

    // Fallback: Console logging for development
    return {
        sendMail: async (options) => {
            console.log('📧 [DEV MODE] Email would be sent:');
            console.log(`   To: ${options.to}`);
            console.log(`   Subject: ${options.subject}`);
            console.log(`   Body: ${options.html}`);
            return { messageId: `dev_${Date.now()}` };
        }
    };
};

const transporter = createTransporter();

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

module.exports = {
    sendPasswordResetEmail,
    sendPasswordResetConfirmationEmail,
    sendAdminPasswordResetEmail,
    sendAccountCreatedEmail,
    sendCourseEnrollmentEmail
};
