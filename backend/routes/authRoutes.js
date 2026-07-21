const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../middleware/validator');

// Public Routes with Rate Limiting & Input Validation
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', authLimiter, refresh);

// Protected Routes (require valid JWT)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
