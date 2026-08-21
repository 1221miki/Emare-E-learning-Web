const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, socialLogin, forgotPassword, resetPassword, verifyEmail, resendVerificationCode, resetEmailCounter } = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);

// Protected Routes (require valid JWT)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Admin-only: reset the in-process email daily counter
// (dev & admin use — blocked in production unless ALLOW_EMAIL_COUNTER_RESET=true)
router.post('/reset-email-counter', protect, authorizeRoles('Admin'), resetEmailCounter);

module.exports = router;

