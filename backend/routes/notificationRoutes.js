const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getMyNotifications, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notificationController');

router.use(protect);
router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
