const router = require('express').Router();
const { protect, optionalProtect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { 
    getUpcomingSessions, 
    getCourseSessions, 
    getMyLiveSessions, 
    createLiveSession, 
    markLiveSessionAttendance, 
    deleteLiveSession, 
    reserveSession, 
    getIntegrationStatus, 
    generateSessionMeetingLink,
    getStudentUpcomingSessions,
    getStudentLiveSessions,
    getLiveSessionById,
    updateLiveSession,
    startLiveSession,
    endLiveSession,
    joinLiveSession,
    startRecording,
    stopRecording,
    uploadRecording,
    getSessionRecording,
    getRecordingsByCourse,
    getStudentRecordings,
    updateRecording,
    publishRecording,
    unpublishRecording,
    deleteRecording,
    getInstructorSessions,
    getInstructorRecordings
} = require('../controllers/liveSessionController');

router.get('/upcoming', optionalProtect, getUpcomingSessions);
router.post('/:id/reserve', protect, denySuspendedActions, reserveSession);

router.use(protect);

router.get('/course/:courseId', getCourseSessions);
router.get('/me', getMyLiveSessions);
router.get('/instructor/sessions', authorizeRoles('Instructor', 'Admin'), getInstructorSessions);
router.get('/instructor/recordings', authorizeRoles('Instructor', 'Admin'), getInstructorRecordings);
router.get('/student/upcoming', authorizeRoles('Student'), getStudentUpcomingSessions);
router.get('/student/live', authorizeRoles('Student'), getStudentLiveSessions);
router.get('/:id', getLiveSessionById);

router.post('/', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), createLiveSession);
router.put('/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), updateLiveSession);
router.delete('/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), deleteLiveSession);

router.get('/integrations/status', authorizeRoles('Instructor', 'Admin'), getIntegrationStatus);
router.post('/generate-link', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), generateSessionMeetingLink);

router.post('/:id/start', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), startLiveSession);
router.post('/:id/end', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), endLiveSession);
router.post('/:id/join', joinLiveSession);

router.post('/:id/recording/start', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), startRecording);
router.post('/:id/recording/stop', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), stopRecording);
router.post('/:id/recording/upload', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), upload.single('recording'), uploadRecording);
router.get('/:id/recording', getSessionRecording);

router.get('/recordings/course/:courseId', getRecordingsByCourse);
router.get('/recordings/student', authorizeRoles('Student'), getStudentRecordings);
router.put('/recordings/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), updateRecording);
router.post('/recordings/:id/publish', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), publishRecording);
router.post('/recordings/:id/unpublish', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), unpublishRecording);
router.delete('/recordings/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), deleteRecording);

router.put('/:id/attendance', markLiveSessionAttendance);

module.exports = router;