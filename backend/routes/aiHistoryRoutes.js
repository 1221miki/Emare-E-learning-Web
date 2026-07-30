const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getHistory, clearHistory } = require('../controllers/aiHistoryController');

router.get('/', protect, authorizeRoles('Student'), getHistory);
router.delete('/clear', protect, authorizeRoles('Student'), clearHistory);

module.exports = router;
