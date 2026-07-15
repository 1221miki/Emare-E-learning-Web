const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getCourseDiscussions, createDiscussion, addReply, togglePin, deleteDiscussion } = require('../controllers/discussionController');

router.use(protect);
router.get('/course/:courseId', getCourseDiscussions);
router.post('/', createDiscussion);
router.post('/:id/reply', addReply);
router.patch('/:id/pin', authorizeRoles('Instructor', 'Admin'), togglePin);
router.delete('/:id', deleteDiscussion);

module.exports = router;
