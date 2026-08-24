const Course = require('../models/Course');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');
const axios = require('axios');
const {
    getBunnyStorageDomain,
    getBunnyApiKey,
    getBunnyLibraryId
} = require('../services/bunnyService');

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
// Bunny Stream embed URLs must be converted to direct MP4 files so the client
// can use an HTML5 <video> element (needed to pause at checkpoints and block
// seeking). Resolution strategy:
//   1. Parse { libraryId, guid } out of the embed URL
//   2. Resolve the correct CDN host per library (env domain for the current
//      library, Bunny API lookup for older libraries)
//   3. Pick a NORMALIZED quality (480p preferred — keeps file size small while
//      staying watchable) from the video's actually-available renditions
//   4. HEAD-verify the chosen URL before returning it, falling back through
//      qualities if needed. Results are cached per video.
const PLAYBACK_QUALITY_ORDER = ['480p', '360p', '720p', '240p', '1080p'];

const libraryHostCache = new Map();     // libraryId -> CDN hostname
const playbackUrlCache = new Map();     // guid -> resolved direct URL | null

// Fetch the pull-zone hostname for a Bunny Stream library (cached forever —
// pull zone names are stable unless the account is reconfigured).
const resolveLibraryHost = async (libraryId) => {
    if (libraryHostCache.has(libraryId)) return libraryHostCache.get(libraryId);

    // Current upload library → use configured storage/pull domain directly
    if (String(libraryId) === String(getBunnyLibraryId())) {
        const host = getBunnyStorageDomain();
        if (host) { libraryHostCache.set(libraryId, host); return host; }
    }

    try {
        const apiKey = getBunnyApiKey();
        if (!apiKey) return null;
        const res = await axios.get(`https://video.bunnycdn.com/library/${libraryId}`, {
            headers: { AccessKey: apiKey },
            timeout: 10000
        });
        const name = res.data?.PullZoneName;
        const host = name ? `${name}.b-cdn.net` : null;
        libraryHostCache.set(libraryId, host);
        return host;
    } catch {
        libraryHostCache.set(libraryId, null);
        return null;
    }
};

// Ask Bunny which renditions actually exist for this video (e.g. "240p,360p,480p")
const fetchAvailableQualities = async (libraryId, guid) => {
    try {
        const apiKey = getBunnyApiKey();
        if (!apiKey) return null;
        const res = await axios.get(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
            headers: { AccessKey: apiKey },
            timeout: 10000
        });
        const raw = res.data?.availableResolutions || '';
        return String(raw).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } catch {
        return null;
    }
};

let headVerify = async (url) => {
    try {
        const res = await axios.head(url, { timeout: 8000, validateStatus: () => true });
        return res.status >= 200 && res.status < 400;
    } catch {
        return false;
    }
};

// Convert any lesson videoUrl into a verified, size-normalized direct MP4 URL.
// Returns null when no reliable direct playback URL can be produced.
const resolveDirectVideoUrl = async (videoUrl) => {
    try {
        const raw = String(videoUrl || '');

        // Already a direct MP4 on the CDN → normalize quality not possible
        // without knowing the GUID; accept as-is.
        if (/\.mp4($|\?)/i.test(raw) && !raw.includes('mediadelivery')) return raw;

        const match = raw.match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]{36})/i);
        if (!match) return null;
        const [, libraryId, guid] = match;

        if (playbackUrlCache.has(guid)) return playbackUrlCache.get(guid);

        const host = await resolveLibraryHost(libraryId);
        if (!host) { playbackUrlCache.set(guid, null); return null; }

        let candidates = PLAYBACK_QUALITY_ORDER.map(q => `https://${host}/${guid}/play_${q}.mp4`);

        // Prefer qualities the video actually has, keeping our normalized order
        const available = await fetchAvailableQualities(libraryId, guid);
        if (available && available.length > 0) {
            const ranked = PLAYBACK_QUALITY_ORDER.filter(q => available.includes(q));
            const extras = available.filter(q => !PLAYBACK_QUALITY_ORDER.includes(q));
            candidates = [...ranked, ...extras].map(q => `https://${host}/${guid}/play_${q}.mp4`);
        }

        for (const url of candidates) {
            if (await headVerify(url)) {
                playbackUrlCache.set(guid, url);
                return url;
            }
        }

        playbackUrlCache.set(guid, null);
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
            timestampSeconds: cp.timestampSeconds,
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

        res.json({
            success: true,
            data: {
                checkpoints,
                attemptStatus,
                allCheckpointsPassed: checkpoints.length === 0 || Object.values(attemptStatus).every(s => s.passed),
                directVideoUrl: await resolveDirectVideoUrl(lesson.videoUrl)
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
                resumeAtSeconds: checkpoint.timestampSeconds,
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
