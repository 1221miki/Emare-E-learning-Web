const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    getMe,
    socialLogin,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationCode,
    resetEmailCounter,
    getTwoFactorStatus,
    setupTwoFactor,
    verifyTwoFactorSetup,
    sendManagementCode,
    disableTwoFactor,
    verifyTwoFactorLogin,
    resendTwoFactorLoginCode,
    testEmail
} = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);

// Two-Factor Authentication — public login step (validated by a short-lived
// pending token issued only after a correct password). Strictly rate-limited to
// blunt OTP brute-force attempts.
router.post('/2fa/verify-login', authLimiter, verifyTwoFactorLogin);
router.post('/2fa/resend-login-code', authLimiter, resendTwoFactorLoginCode);

// Protected Routes (require valid JWT)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Two-Factor Authentication — account management (require a valid session)
router.get('/2fa/status', protect, getTwoFactorStatus);
router.post('/2fa/setup', protect, setupTwoFactor);
router.post('/2fa/verify-setup', protect, verifyTwoFactorSetup);
router.post('/2fa/send-management-code', protect, sendManagementCode);
router.post('/2fa/disable', protect, disableTwoFactor);

// Admin-only: reset the in-process email daily counter
// (dev & admin use — blocked in production unless ALLOW_EMAIL_COUNTER_RESET=true)
router.post('/reset-email-counter', protect, authorizeRoles('Admin'), resetEmailCounter);

// Admin-only: test SMTP connectivity and diagnose email issues
router.post('/test-email', protect, authorizeRoles('Admin'), testEmail);

module.exports = router;

