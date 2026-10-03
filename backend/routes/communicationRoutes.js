const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const comm = require('../controllers/communicationController');

// Conversations & Messages
router.post('/conversations', protect, comm.createConversation);
router.get('/conversations/my', protect, comm.getMyConversations);
router.post('/conversations/:conversationId/messages', protect, comm.sendMessage);
router.get('/conversations/:conversationId/messages', protect, comm.getMessages);

// Notifications
router.get('/notifications/my', protect, comm.getMyNotifications);
router.patch('/notifications/:id/read', protect, comm.markNotificationRead);

// Announcements
router.post('/announcements', protect, authorizeRoles('Instructor','Admin'), comm.createAnnouncement);
router.get('/announcements', protect, comm.getAnnouncements);

module.exports = router;
