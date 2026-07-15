const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public Routes
router.post('/register', register);
router.post('/login', login);

// Protected Routes (require valid JWT)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
