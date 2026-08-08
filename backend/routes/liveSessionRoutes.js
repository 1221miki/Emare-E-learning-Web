const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const { getCourseSessions, getMyLiveSessions, getAllLiveSessions, createLiveSession, markLiveSessionAttendance, deleteLiveSession } = require('../controllers/liveSessionController');
const { createGoogleMeetEvent } = require('../controllers/googleMeetController');

router.use(protect);
router.get('/course/:courseId', getCourseSessions);
router.get('/me', getMyLiveSessions);
router.get('/', getAllLiveSessions);
router.post('/', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), createLiveSession);
router.post('/google/create', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), createGoogleMeetEvent);
router.put('/:id/attendance', markLiveSessionAttendance);
router.delete('/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), deleteLiveSession);

module.exports = router;
