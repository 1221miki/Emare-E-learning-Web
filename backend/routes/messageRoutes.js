const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');

router.use(protect);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getMessages);
router.post('/', sendMessage);

module.exports = router;
