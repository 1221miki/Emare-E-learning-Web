const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getHistory, getConversations, clearHistory } = require('../controllers/aiHistoryController');

router.get('/', protect, authorizeRoles('Student'), getHistory);
router.get('/conversations', protect, authorizeRoles('Student'), getConversations);
router.delete('/clear', protect, authorizeRoles('Student'), clearHistory);

module.exports = router;
