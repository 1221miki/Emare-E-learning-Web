/**
 * socraticRoutes.js
 * 
 * Routes for Socratic AI Tutoring endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { assertAiTutorAllowed } = require('../middleware/aiTutorGuard');
const socraticTutorController = require('../controllers/socraticTutorController');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/socratic/session/:courseId/start
 * @desc    Start a new Socratic tutoring session
 * @access  Private/Student
 */
router.post('/session/:courseId/start', assertAiTutorAllowed, socraticTutorController.startSocraticSession);

/**
 * @route   POST /api/socratic/ask
 * @desc    Stream Socratic tutoring response (SSE)
 * @access  Private/Student
 */
router.post('/ask', assertAiTutorAllowed, socraticTutorController.streamSocraticResponse);

/**
 * @route   POST /api/socratic/evaluate
 * @desc    Evaluate student response with feedback
 * @access  Private/Student
 */
router.post('/evaluate', socraticTutorController.evaluateStudentResponse);

/**
 * @route   GET /api/socratic/sessions/:courseId
 * @desc    Get all Socratic sessions for a course
 * @access  Private/Student
 */
router.get('/sessions/:courseId', socraticTutorController.getSocraticSessions);

/**
 * @route   GET /api/socratic/session/:sessionId
 * @desc    Get full session details and conversation history
 * @access  Private/Student
 */
router.get('/session/:sessionId', socraticTutorController.getSessionDetails);

/**
 * @route   POST /api/socratic/session/:sessionId/end
 * @desc    End Socratic session and generate summary
 * @access  Private/Student
 */
router.post('/session/:sessionId/end', socraticTutorController.endSocraticSession);

module.exports = router;
