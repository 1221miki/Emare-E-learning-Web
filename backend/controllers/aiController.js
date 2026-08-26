const aiService = require('../services/aiService');
const axios = require('axios');
const AiHistory = require('../models/AiHistory');
const AiConversation = require('../models/AiConversation');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);
const DEFAULT_CHAT_TYPE = 'chat';

const resolveConversationId = (conversationId, prefix = 'ai') => {
    if (conversationId) return conversationId;
    return `${prefix}-${Date.now()}-${nanoid()}`;
};

const buildConversationTitle = (courseContext, explicitTitle) => {
    if (explicitTitle) return explicitTitle;
    if (courseContext?.courseName) return `AI Tutor - ${courseContext.courseName}`;
    return 'AI Tutor Session';
};

const saveConversationMeta = async ({ conversationId, userRef, courseContext, lastMessage, title }) => {
    return AiConversation.findOneAndUpdate(
        { conversationId, userRef },
        {
            $set: {
                courseContext,
                lastMessage,
                title,
                lastInteractionAt: new Date()
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

// @desc    Ask a question to the AI TutorBot
// @route   POST /api/ai/ask
// @access  Private/Student
exports.askTutor = async (req, res) => {
    try {
        const { question, courseContext = {}, conversationId, conversationTitle } = req.body;

        if (!question) {
            return res.status(400).json({ success: false, message: 'Please provide a question' });
        }

        const sessionId = resolveConversationId(conversationId, 'chat');
        const historyEntries = conversationId
            ? await AiHistory.find({ userRef: req.user.id, conversationId }).sort({ createdAt: 1 }).lean()
            : [];

        const answer = await aiService.generateChatResponse(question, courseContext, historyEntries);
        const title = buildConversationTitle(courseContext, conversationTitle);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question,
            answer,
            courseContext,
            conversationTitle: title,
            type: DEFAULT_CHAT_TYPE
        });

        await saveConversationMeta({
            conversationId: sessionId,
            userRef: req.user.id,
            courseContext,
            lastMessage: question,
            title
        });

        res.status(200).json({
            success: true,
            data: {
                answer,
                conversationId: sessionId,
                conversationTitle: title,
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
        const { studentContext = {}, conversationId } = req.body;
        const sessionId = resolveConversationId(conversationId, 'learning-path');

        const answer = await aiService.generatePersonalizedLearningPath(studentContext);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Generate personalized learning path',
            answer,
            courseContext: studentContext,
            conversationTitle: 'AI Personalized Learning Path',
            type: 'learning-path'
        });

        await saveConversationMeta({
            conversationId: sessionId,
            userRef: req.user.id,
            courseContext: studentContext,
            lastMessage: 'Generate personalized learning path',
            title: 'AI Personalized Learning Path'
        });

        res.status(200).json({ success: true, data: { answer, conversationId: sessionId, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Recommend courses and learning paths
// @route   POST /api/ai/recommend-courses
// @access  Private/Student
exports.recommendCourses = async (req, res) => {
    try {
        const { studentContext = {}, conversationId } = req.body;
        const sessionId = resolveConversationId(conversationId, 'recommend-courses');

        const answer = await aiService.recommendCourses(studentContext);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Recommend courses',
            answer,
            courseContext: studentContext,
            conversationTitle: 'AI Course Recommendations',
            type: 'course-recommendation'
        });

        await saveConversationMeta({
            conversationId: sessionId,
            userRef: req.user.id,
            courseContext: studentContext,
            lastMessage: 'Recommend courses',
            title: 'AI Course Recommendations'
        });

        res.status(200).json({ success: true, data: { answer, conversationId: sessionId, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate a practice quiz from learning materials
// @route   POST /api/ai/generate-quiz
// @access  Private/Student
exports.generateQuiz = async (req, res) => {
    try {
        const { quizContext = {}, conversationId } = req.body;
        const sessionId = resolveConversationId(conversationId, 'generate-quiz');

        const answer = await aiService.generateQuiz(quizContext);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Generate quiz',
            answer,
            courseContext: quizContext,
            conversationTitle: 'AI Practice Quiz',
            type: 'quiz-generator'
        });

        await saveConversationMeta({
            conversationId: sessionId,
            userRef: req.user.id,
            courseContext: quizContext,
            lastMessage: 'Generate quiz',
            title: 'AI Practice Quiz'
        });

        res.status(200).json({ success: true, data: { answer, conversationId: sessionId, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Provide assignment coaching and feedback guidance
// @route   POST /api/ai/assignment-assistant
// @access  Private/Student
exports.assignmentAssistant = async (req, res) => {
    try {
        const { assignmentContext = {}, conversationId } = req.body;
        const sessionId = resolveConversationId(conversationId, 'assignment-assistant');

        const answer = await aiService.generateAssignmentAssistant(assignmentContext);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Assignment assistant',
            answer,
            courseContext: assignmentContext,
            conversationTitle: 'AI Assignment Guidance',
            type: 'assignment-assistant'
        });

        await saveConversationMeta({
            conversationId: sessionId,
            userRef: req.user.id,
            courseContext: assignmentContext,
            lastMessage: 'Assignment assistant',
            title: 'AI Assignment Guidance'
        });

        res.status(200).json({ success: true, data: { answer, conversationId: sessionId, timestamp: new Date() } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Summarize text or uploaded PDF content
// @route   POST /api/ai/summarize
// @access  Private/Student
exports.summarize = async (req, res) => {
    try {
        const { text = '', courseContext = {}, conversationId } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required to summarize.' });

        const sessionId = resolveConversationId(conversationId, 'summarize');
        const answer = await aiService.summarizeText(text, courseContext);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Summarize content',
            answer,
            courseContext,
            conversationTitle: 'AI Summary',
            type: 'summarize'
        });

        await saveConversationMeta({ conversationId: sessionId, userRef: req.user.id, courseContext, lastMessage: 'Summarize content', title: 'AI Summary' });

        res.status(200).json({ success: true, data: { answer, conversationId: sessionId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate microlearning module
// @route   POST /api/ai/microlesson
// @access  Private/Student
exports.generateMicroLesson = async (req, res) => {
    try {
        const { topicContext = {}, conversationId } = req.body;
        const sessionId = resolveConversationId(conversationId, 'microlesson');

        const answer = await aiService.generateMicroLesson(topicContext);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Generate microlesson',
            answer,
            courseContext: topicContext,
            conversationTitle: 'AI Microlesson',
            type: 'microlesson'
        });

        await saveConversationMeta({ conversationId: sessionId, userRef: req.user.id, courseContext: topicContext, lastMessage: 'Generate microlesson', title: 'AI Microlesson' });

        res.status(200).json({ success: true, data: { answer, conversationId: sessionId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate flashcards from content
// @route   POST /api/ai/flashcards
// @access  Private/Student
exports.generateFlashcards = async (req, res) => {
    try {
        const { content = '', conversationId } = req.body;
        if (!content) return res.status(400).json({ success: false, message: 'Content is required to generate flashcards.' });

        const sessionId = resolveConversationId(conversationId, 'flashcards');
        const cards = await aiService.generateFlashcards(content);

        await AiHistory.create({
            userRef: req.user.id,
            conversationId: sessionId,
            question: 'Generate flashcards',
            answer: JSON.stringify(cards),
            courseContext: {},
            conversationTitle: 'AI Flashcards',
            type: 'flashcards'
        });

        await saveConversationMeta({ conversationId: sessionId, userRef: req.user.id, courseContext: {}, lastMessage: 'Generate flashcards', title: 'AI Flashcards' });

        res.status(200).json({ success: true, data: { cards, conversationId: sessionId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Extract text from the lesson's stored PDF so the AI tutor can
//          answer questions about it without the student manually re-uploading
// @route   POST /api/ai/pdf-context
// @access  Private/Student
exports.getPdfContext = async (req, res) => {
    try {
        const { pdfUrl } = req.body || {};
        if (!pdfUrl || typeof pdfUrl !== 'string') {
            return res.status(400).json({ success: false, message: 'pdfUrl is required.' });
        }

        const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
        const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME || 'emare-ict-hub1221';
        if (!STORAGE_API_KEY) {
            return res.status(500).json({ success: false, message: 'PDF storage not configured.' });
        }

        // Accept full Bunny CDN URLs, proxied paths, or raw storage paths
        let raw = String(pdfUrl).trim();
        raw = raw.replace(/^https?:\/\/[^/]+\/api\/pdf-proxy\//i, '');
        raw = raw.replace(/^https?:\/\/[^/]+\.(b-cdn\.net|mediadelivery\.net)\//i, '');
        raw = raw.replace(/^https?:\/\/storage\.bunnycdn\.com\/[^/]+\//i, '');
        const storagePath = decodeURIComponent(raw).replace(/^\/+/, '')
            .replace(new RegExp(`^${STORAGE_ZONE}/`), '');
        if (!storagePath || !/\.pdf(\?|$)/i.test(storagePath)) {
            return res.status(400).json({ success: false, message: 'A valid lesson PDF URL is required.' });
        }

        // Only allow paths inside the PDF folder
        if (!/^courses\/pdfs\//i.test(storagePath)) {
            return res.status(403).json({ success: false, message: 'Only lesson PDF files can be loaded.' });
        }

        const storageUrl = `https://storage.bunnycdn.com/${STORAGE_ZONE}/${storagePath}`;
        const response = await axios.get(storageUrl, {
            headers: { AccessKey: STORAGE_API_KEY },
            responseType: 'arraybuffer',
            timeout: 30000
        });

        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(response.data);
        let text = (parsed.text || '')
            .replace(/\u00A0/g, ' ')
            .replace(/\r?\n/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 18000);

        const fileName = storagePath.split('/').pop() || 'lesson-notes.pdf';
        res.status(200).json({
            success: true,
            data: { pdfText: text, fileName, url: pdfUrl }
        });
    } catch (err) {
        const status = err.response?.status === 404 ? 404 : 500;
        res.status(status).json({
            success: false,
            message: status === 404 ? 'Lesson PDF file not found.' : `Failed to extract PDF text: ${err.message}`
        });
    }
};
