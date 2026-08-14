const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getCourseProgress,
    getResumeProgress,
    getLessonRequirementsStatus,
    saveLessonProgress,
    markDocumentViewed,
    trackResourceDownload
} = require('../controllers/learningProgressController');

router.get('/course/:courseId',                                         protect, authorizeRoles('Student'), getCourseProgress);
router.get('/resume',                                                   protect, authorizeRoles('Student'), getResumeProgress);
router.get('/course/:courseId/lesson/:lessonId/requirements',           protect, authorizeRoles('Student'), getLessonRequirementsStatus);
router.post('/course/:courseId/lesson/:lessonId/progress',              protect, authorizeRoles('Student'), saveLessonProgress);
router.post('/course/:courseId/lesson/:lessonId/document',              protect, authorizeRoles('Student'), markDocumentViewed);
router.post('/course/:courseId/lesson/:lessonId/resource',              protect, authorizeRoles('Student'), trackResourceDownload);

module.exports = router;
