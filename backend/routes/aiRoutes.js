const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { askTutor } = require('../controllers/aiController');

router.post('/ask', protect, authorizeRoles('Student'), askTutor);

module.exports = router;
