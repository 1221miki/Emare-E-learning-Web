const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, socialLogin, forgotPassword, resetPassword, verifyEmail, resendVerificationCode } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

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

module.exports = router;

