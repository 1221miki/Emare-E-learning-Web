const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    deleteReadNotifications,
    deleteNotifications,
    sendAdminNotification,
    getAdminNotificationSummary
} = require('../controllers/notificationController');

router.use(protect);
router.get('/', getMyNotifications);
router.get('/admin/summary', authorizeRoles('Admin'), getAdminNotificationSummary);
router.post('/admin/send', authorizeRoles('Admin'), sendAdminNotification);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

// Bulk deletion routes (registered before /:id to prevent parameter shadowing)
router.delete('/clear-all', deleteAllNotifications);
router.delete('/clear-read', deleteReadNotifications);
router.delete('/:id', deleteNotification);
router.delete('/', deleteNotifications);

module.exports = router;
