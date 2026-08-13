/**
 * socraticTutorController.js
 * 
 * Controller for Socratic AI Tutoring with SSE (Server-Sent Events)
 * Handles real-time, streaming Socratic dialogue
 */

const socraticAiService = require('../services/socraticAiService');
const aiService = require('../services/aiService');
const SocraticSession = require('../models/SocraticSession');
const ContentEmbedding = require('../models/ContentEmbedding');
const Course = require('../models/Course');
const User = require('../models/User');

/**
 * @desc    Start a Socratic tutoring session with SSE streaming
 * @route   GET /api/socratic/session/:courseId
 * @access  Private/Student
 */
exports.startSocraticSession = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { topic, learningObjectives = [], difficultyLevel = 3 } = req.body;
        
        const userId = req.user.id;

        // Verify user is enrolled in the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Generate unique session ID
        const sessionId = `socratic-${courseId}-${userId}-${Date.now()}`;

        // Create Socratic session
        const session = await SocraticSession.create({
            studentRef: userId,
            courseRef: courseId,
            sessionId,
            title: `${course.courseTitle} - Socratic Session`,
            topic: topic || course.courseTitle,
            learningObjectives,
            socraticSettings: {
                difficultyLevel,
                mode: 'mixed',
                askClarifications: true,
                evaluateResponses: true
            }
        });

        res.json({
            success: true,
            session: {
                sessionId: session.sessionId,
                courseId,
                topic: session.topic
            }
        });
    } catch (error) {
        console.error('Error starting Socratic session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Stream Socratic tutoring response with SSE
 * @route   POST /api/socratic/ask
 * @access  Private/Student
 */
exports.streamSocraticResponse = async (req, res) => {
    try {
        const { sessionId, question, courseId, useHints = false } = req.body;
        const userId = req.user.id;

        // Validate session exists and belongs to user
        const session = await SocraticSession.findOne({
            sessionId,
            studentRef: userId
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to Socratic Tutor' })}\n\n`);

        // Retrieve relevant course content
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Retrieving relevant course material...' })}\n\n`);
        
        const relevantContent = await socraticAiService.retrieveRelevantContent(
            question,
            courseId,
            3
        );

        // Generate Socratic response
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Generating Socratic response...' })}\n\n`);

        let socraticResponse;
        
        if (useHints && session.metrics.hintRequests < 5) {
            // Generate hint
            socraticResponse = await socraticAiService.generateAdaptiveHint(
                question,
                session.comprehensionLevel,
                []
            );

            session.metrics.hintRequests += 1;
        } else {
            // Generate Socratic question
            const questionResult = await socraticAiService.generateSocraticQuestion(
                question,
                {
                    comprehensionLevel: session.comprehensionLevel,
                    difficultyLevel: session.socraticSettings.difficultyLevel
                },
                session.messages.length > 0 ? session.messages[session.messages.length - 1].content : ''
            );

            socraticResponse = questionResult.content;
        }

        // Stream the response
        res.write(`data: ${JSON.stringify({
            type: 'response',
            content: socraticResponse,
            relevantContent: relevantContent.map(item => ({
                lesson: item.lessonTitle,
                chapter: item.chapterTitle,
                preview: item.content.substring(0, 200)
            }))
        })}\n\n`);

        // Save interaction to session
        session.messages.push({
            role: 'student',
            content: question,
            messageType: 'question',
            usedSocraticMethod: false
        });

        session.messages.push({
            role: 'tutor',
            content: socraticResponse,
            messageType: useHints ? 'hint' : 'question',
            usedSocraticMethod: true
        });

        session.metrics.totalQuestions += 1;

        // If student should evaluate, generate evaluation prompt
        if (session.socraticSettings.evaluateResponses && !useHints) {
            res.write(`data: ${JSON.stringify({
                type: 'prompt',
                message: 'Please share your thoughts on this question, and I will provide feedback.'
            })}\n\n`);
        }

        await session.save();

        // Send completion marker
        res.write(`data: ${JSON.stringify({ type: 'done', totalInteractions: session.messages.length })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Error in Socratic response:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

/**
 * @desc    Evaluate student response and provide feedback
 * @route   POST /api/socratic/evaluate
 * @access  Private/Student
 */
exports.evaluateStudentResponse = async (req, res) => {
    try {
        const { sessionId, studentResponse, expectedConcept } = req.body;
        const userId = req.user.id;

        const session = await SocraticSession.findOne({
            sessionId,
            studentRef: userId
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Evaluating your response...' })}\n\n`);

        // Retrieve relevant content for context
        const relevantContent = await socraticAiService.retrieveRelevantContent(
            studentResponse,
            session.courseRef,
            2
        );

        // Evaluate response
        const evaluation = await socraticAiService.evaluateStudentResponse(
            studentResponse,
            expectedConcept,
            {
                comprehensionLevel: session.comprehensionLevel,
                difficultyLevel: session.socraticSettings.difficultyLevel
            },
            relevantContent
        );

        // Update metrics
        if (evaluation.isCorrect === 'yes') {
            session.metrics.correctResponses += 1;
            session.comprehensionLevel = Math.min(5, session.comprehensionLevel + 1);
        } else if (evaluation.isCorrect === 'partial') {
            session.metrics.partialCorrect += 1;
        }

        // Generate follow-up Socratic question
        res.write(`data: ${JSON.stringify({
            type: 'evaluation',
            isCorrect: evaluation.isCorrect,
            feedback: evaluation.feedback,
            comprehensionLevel: evaluation.comprehensionLevel
        })}\n\n`);

        // Send Socratic follow-up question
        if (evaluation.socraticQuestion) {
            res.write(`data: ${JSON.stringify({
                type: 'followup',
                question: evaluation.socraticQuestion,
                misconceptions: evaluation.misconceptions || []
            })}\n\n`);
        }

        // Save interaction
        session.messages.push({
            role: 'student',
            content: studentResponse,
            messageType: 'response',
            usedSocraticMethod: false
        });

        session.messages.push({
            role: 'tutor',
            content: evaluation.feedback,
            messageType: 'evaluation',
            usedSocraticMethod: true
        });

        await session.save();

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Error evaluating response:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

/**
 * @desc    Get Socratic session history
 * @route   GET /api/socratic/sessions/:courseId
 * @access  Private/Student
 */
exports.getSocraticSessions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const sessions = await SocraticSession.find({
            studentRef: userId,
            courseRef: courseId
        })
        .select('sessionId title topic createdAt metrics status comprehensionLevel')
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({
            success: true,
            sessions
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Get session details with full conversation
 * @route   GET /api/socratic/session/:sessionId
 * @access  Private/Student
 */
exports.getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const session = await SocraticSession.findOne({
            sessionId,
            studentRef: userId
        }).populate('courseRef', 'courseTitle').populate('studentRef', 'userName email');

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Error fetching session details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    End Socratic session
 * @route   POST /api/socratic/session/:sessionId/end
 * @access  Private/Student
 */
exports.endSocraticSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const session = await SocraticSession.findOne({
            sessionId,
            studentRef: userId
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        // Calculate session metrics
        const startTime = session.createdAt;
        const endTime = new Date();
        const durationMinutes = (endTime - startTime) / (1000 * 60);

        session.metrics.sessionDuration = durationMinutes;
        session.status = 'completed';
        session.isActive = false;

        await session.save();

        // Calculate learning summary
        const totalMessages = session.messages.length;
        const accuracy = session.metrics.totalQuestions > 0 
            ? ((session.metrics.correctResponses / session.metrics.totalQuestions) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            summary: {
                sessionDuration: durationMinutes,
                totalInteractions: totalMessages,
                totalQuestions: session.metrics.totalQuestions,
                correctResponses: session.metrics.correctResponses,
                partialCorrect: session.metrics.partialCorrect,
                accuracy: `${accuracy}%`,
                comprehensionLevel: session.comprehensionLevel,
                hintsUsed: session.metrics.hintRequests
            }
        });
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = exports;
