const express = require('express');
const {
    createContactMessage,
    getMyMessages
} = require('../controllers/contactController');
const { protect, optionalProtect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/contact
// @desc    Submit a contact message (public — guests allowed; linked to the
//          authenticated user's ID automatically when logged in)
// @access  Public
router.post('/', optionalProtect, createContactMessage);

// @route   GET /api/contact/my-messages
// @desc    Authenticated user's own support messages + admin responses
// @access  Private (any authenticated user)
router.get('/my-messages', protect, getMyMessages);

module.exports = router;
