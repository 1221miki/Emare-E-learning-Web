const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getMyNotifications, markAsRead, markAllAsRead, deleteNotification, sendAdminNotification, getAdminNotificationSummary } = require('../controllers/notificationController');

router.use(protect);
router.get('/', getMyNotifications);
router.get('/admin/summary', authorizeRoles('Admin'), getAdminNotificationSummary);
router.post('/admin/send', authorizeRoles('Admin'), sendAdminNotification);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
