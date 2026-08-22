const express = require('express');
const {
    getAllMessages,
    getUnreadCount,
    getMessageById,
    updateMessageStatus,
    replyToMessage
} = require('../controllers/contactController');

const router = express.Router();

// NOTE: This router is mounted in server.js as:
//   app.use('/api/admin/contact-messages', protect, authorizeRoles('Admin'), ...)
// so every endpoint below is Admin-only.

// Static paths MUST be declared before '/:id' so they are not swallowed
router.get('/', getAllMessages);
router.get('/unread-count', getUnreadCount);
router.get('/:id', getMessageById);
router.put('/:id/status', updateMessageStatus);
router.post('/:id/reply', replyToMessage);

module.exports = router;
