const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getCourseSessions, createLiveSession, deleteLiveSession } = require('../controllers/liveSessionController');

router.use(protect);
router.get('/course/:courseId', getCourseSessions);
router.post('/', authorizeRoles('Instructor', 'Admin'), createLiveSession);
router.delete('/:id', authorizeRoles('Instructor', 'Admin'), deleteLiveSession);

module.exports = router;
