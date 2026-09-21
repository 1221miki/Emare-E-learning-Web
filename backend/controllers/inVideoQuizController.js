const Course = require('../models/Course');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');
const { resolveLocalPath } = require('../services/localStorageService');

const getUserId = (req) => req.user?.id || req.user?._id;

// Locate a lesson inside the course curriculumTree by its embedded _id
const findLesson = (course, lessonId) => {
    for (const chapter of course.curriculumTree || []) {
        for (const lesson of chapter.lessons || []) {
            if (String(lesson._id) === String(lessonId)) return lesson;
        }
    }
    return null;
};

// ── Direct playback URL resolution ──────────────────────────────────────────
// For local storage, the videoUrl is already a direct path. For YouTube videos,
// return null so the frontend uses the YouTube iframe embed instead.
const resolveDirectVideoUrl = async (videoUrl) => {
    try {
        const raw = String(videoUrl || '');
        if (!raw) return null;

        // YouTube videos — no direct MP4 resolution
        if (/youtube\.com\/|youtu\.be\//i.test(raw) || /iframe\.mediadelivery\.net/i.test(raw)) return null;

        // Already a direct MP4 URL (local storage path like /api/local-storage/videos/...)
        if (/\.mp4($|\?)/i.test(raw) || raw.startsWith('/api/local-storage/')) return raw;

        // Local file path starting with /uploads/ or similar
        if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) return raw;

        return null;
    } catch {
        return null;
    }
};

// ── GET /api/in-video-quiz/:courseId/:lessonId ──────────────────────────────
// Returns the lesson's checkpoints with correct answers stripped, plus this
// student's pass status per checkpoint and a direct playback URL.
exports.getLessonCheckpoints = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const course = await Course.findById(courseId)
            .select('curriculumTree enrolledStudents')
            .lean();
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const lesson = findLesson(course, lessonId);
        if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

        const checkpointsRaw = lesson.quizCheckpoints || [];

        // Strip correct answers — never leak them before submission
        const checkpoints = checkpointsRaw.map((cp, index) => ({
            checkpointIndex: index,
            checkpointId: cp.checkpointId,
            title: cp.title,
            startSeconds: cp.startSeconds ?? 0,       // concept start time for video seek
            timestampSeconds: cp.timestampSeconds,     // concept end time — video pauses here
            passingScorePercent: cp.passingScorePercent ?? 60,
            questionCount: (cp.questions || []).length,
            questions: (cp.questions || []).map(q => ({
                questionText: q.questionText,
                options: q.options
            }))
        }));

        let attempts = [];
        if (checkpoints.length > 0) {
            attempts = await InVideoQuizAttempt.find({
                studentRef: getUserId(req),
                courseRef: courseId,
                lessonId
            }).sort({ createdAt: -1 }).lean();
        }

        // Best (latest passing, else latest) attempt per checkpoint
        const attemptStatus = {};
        for (const cp of checkpointsRaw) {
            const relevant = attempts.filter(a => a.checkpointId === cp.checkpointId);
            const best = relevant.find(a => a.passed) || relevant[0] || null;
            attemptStatus[cp.checkpointId] = best ? {
                passed: !!best.passed,
                scorePercent: best.scorePercent,
                correctCount: best.correctCount,
                totalQuestions: best.totalQuestions,
                attemptsUsed: relevant.length
            } : { passed: false, attemptsUsed: 0 };
        }

        // YouTube videos cannot be resolved to direct MP4 URLs — return null
        // so the frontend uses the YouTube iframe embed instead.
        const isYouTube = lesson.videoSource === 'youtube' ||
            /youtube\.com\/|youtu\.be\//i.test(String(lesson.videoUrl || ''));

        res.json({
            success: true,
            data: {
                checkpoints,
                attemptStatus,
                allCheckpointsPassed: checkpoints.length === 0 || Object.values(attemptStatus).every(s => s.passed),
                directVideoUrl: isYouTube ? null : await resolveDirectVideoUrl(lesson.videoUrl)
            }
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/in-video-quiz/:courseId/:lessonId/submit ──────────────────────
// Body: { checkpointId, answers: [{ questionIndex, selectedIndex }] }
// Grades server-side, stores the attempt, returns score + per-question review.
exports.submitCheckpointAttempt = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const { checkpointId, answers } = req.body;

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ success: false, message: 'Answers are required.' });
        }

        const course = await Course.findById(courseId).select('curriculumTree').lean();
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const lesson = findLesson(course, lessonId);
        if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

        const checkpoints = lesson.quizCheckpoints || [];
        const checkpointIndex = checkpoints.findIndex(cp => cp.checkpointId === checkpointId);
        if (checkpointIndex === -1) {
            return res.status(404).json({ success: false, message: 'Checkpoint not found' });
        }

        const checkpoint = checkpoints[checkpointIndex];
        const questions = checkpoint.questions || [];

        // Every question must be answered — no skipping allowed
        const answeredIdxs = new Set(answers.map(a => a.questionIndex));
        if (answeredIdxs.size !== questions.length) {
            return res.status(400).json({ success: false, message: 'All questions must be answered before submitting.' });
        }

        // Grade server-side against the stored correct answers
        const gradedAnswers = [];
        let correctCount = 0;
        for (let qi = 0; qi < questions.length; qi++) {
            const submitted = answers.find(a => a.questionIndex === qi);
            const selectedIndex = Number(submitted?.selectedIndex);
            const isCorrect = selectedIndex === questions[qi].correctAnswerIndex;
            if (isCorrect) correctCount++;
            gradedAnswers.push({ questionIndex: qi, selectedIndex, isCorrect });
        }

        const totalQuestions = questions.length;
        const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const passingScore = checkpoint.passingScorePercent ?? 60;
        const passed = scorePercent >= passingScore;

        const previousAttempts = await InVideoQuizAttempt.countDocuments({
            studentRef: getUserId(req),
            courseRef: courseId,
            lessonId,
            checkpointId
        });

        await InVideoQuizAttempt.create({
            studentRef: getUserId(req),
            courseRef: courseId,
            lessonId,
            checkpointId,
            checkpointIndex,
            checkpointTimestamp: checkpoint.timestampSeconds,
            checkpointStartSeconds: checkpoint.startSeconds ?? 0,
            answers: gradedAnswers,
            scorePercent,
            correctCount,
            totalQuestions,
            passed,
            attemptNumber: previousAttempts + 1
        });

        // Review payload includes the correct answer index so the UI can show
        // instant feedback after submission.
        const review = questions.map((q, qi) => ({
            questionIndex: qi,
            selectedIndex: gradedAnswers[qi].selectedIndex,
            isCorrect: gradedAnswers[qi].isCorrect,
            correctAnswerIndex: q.correctAnswerIndex
        }));

        res.json({
            success: true,
            data: {
                passed,
                scorePercent,
                correctCount,
                totalQuestions,
                passingScorePercent: passingScore,
                resumeAtSeconds: checkpoint.timestampSeconds,   // resume after passing
                nextConceptStartSeconds: null,                  // filled by client from next checkpoint
                review
            }
        });
    } catch (err) {
        next(err);
    }
};

// Exposed for tests / diagnostics
exports.resolveDirectVideoUrl = resolveDirectVideoUrl;
exports._setHeadVerifier = (fn) => { headVerify = fn; };
