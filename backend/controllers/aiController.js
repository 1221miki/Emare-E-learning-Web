const aiService = require('../services/aiService');
const AiHistory = require('../models/AiHistory');

// @desc    Ask a question to the AI TutorBot
// @route   POST /api/ai/ask
// @access  Private/Student
exports.askTutor = async (req, res) => {
    try {
        const { question, courseContext } = req.body;
        
        if (!question) {
            return res.status(400).json({ success: false, message: 'Please provide a question' });
        }

        const answer = await aiService.generateChatResponse(question, courseContext || {});

        await AiHistory.create({
            userRef: req.user.id,
            question,
            answer,
            courseContext: courseContext || {}
        });

        res.status(200).json({
            success: true,
            data: {
                answer,
                timestamp: new Date()
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate a personalized learning path
// @route   POST /api/ai/learning-path
// @access  Private/Student
exports.generateLearningPath = async (req, res) => {
    try {
        const { studentContext } = req.body;

        const answer = await aiService.generatePersonalizedLearningPath(studentContext || {});

        await AiHistory.create({
            userRef: req.user.id,
            question: 'Generate personalized learning path',
            answer,
            courseContext: studentContext || {},
            type: 'learning-path'
        });

        res.status(200).json({ success: true, data: { answer, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Recommend courses and learning paths
// @route   POST /api/ai/recommend-courses
// @access  Private/Student
exports.recommendCourses = async (req, res) => {
    try {
        const { studentContext } = req.body;

        const answer = await aiService.recommendCourses(studentContext || {});

        await AiHistory.create({
            userRef: req.user.id,
            question: 'Recommend courses',
            answer,
            courseContext: studentContext || {},
            type: 'course-recommendation'
        });

        res.status(200).json({ success: true, data: { answer, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate a practice quiz from learning materials
// @route   POST /api/ai/generate-quiz
// @access  Private/Student
exports.generateQuiz = async (req, res) => {
    try {
        const { quizContext } = req.body;

        const answer = await aiService.generateQuiz(quizContext || {});

        await AiHistory.create({
            userRef: req.user.id,
            question: 'Generate quiz',
            answer,
            courseContext: quizContext || {},
            type: 'quiz-generator'
        });

        res.status(200).json({ success: true, data: { answer, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Provide assignment coaching and feedback guidance
// @route   POST /api/ai/assignment-assistant
// @access  Private/Student
exports.assignmentAssistant = async (req, res) => {
    try {
        const { assignmentContext } = req.body;

        const answer = await aiService.generateAssignmentAssistant(assignmentContext || {});

        await AiHistory.create({
            userRef: req.user.id,
            question: 'Assignment assistant',
            answer,
            courseContext: assignmentContext || {},
            type: 'assignment-assistant'
        });

        res.status(200).json({ success: true, data: { answer, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
