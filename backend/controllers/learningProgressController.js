const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const LearningProgress = require('../models/LearningProgress');
const GradeBook = require('../models/GradeBook');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');
const { isQuizPassed, isAssignmentApproved } = require('../services/completionService');
const { getSequenceForStudent, getLessonAccess } = require('../services/sequenceService');

const getCourseProgress = async (req, res, next) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId).lean();
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

        const progress = await LearningProgress.findOne({ studentRef: req.user.id, courseRef: courseId }).lean();

        return res.status(200).json({ success: true, data: progress || { courseRef: courseId, completionPercentage: 0, progressItems: [] } });
    } catch (err) {
        next(err);
    }
};

const getResumeProgress = async (req, res, next) => {
    try {
        const resume = await LearningProgress.findOne({ studentRef: req.user.id })
            .sort({ updatedAt: -1 })
            .populate('courseRef', 'courseTitle thumbnailUrl technicalCategory estimatedDurationHours')
            .lean();

        if (!resume) {
            return res.status(200).json({ success: true, data: null });
        }

        const lastItem = resume.progressItems?.find(item => item.lessonId?.toString() === resume.lastLessonRef?.toString()) || {};
        return res.status(200).json({
            success: true,
            data: {
                _id: resume._id,
                courseRef: resume.courseRef,
                lastLessonId: resume.lastLessonRef,
                lastLessonTitle: lastItem.lessonTitle,
                lastChapterIndex: resume.lastChapterIndex,
                lastLessonIndex: resume.lastLessonIndex,
                lastWatchedPosition: resume.lastWatchedPosition,
                completionPercentage: resume.completionPercentage,
                updatedAt: resume.updatedAt
            }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: check whether a student has satisfied the quiz + assignment
// requirements for a given lesson.
//
// Returns:
//   { quizRequired, quizPassed, assignmentRequired, assignmentSubmitted,
//     assignmentGraded, assignmentPassed, canComplete, ... }
// ─────────────────────────────────────────────────────────────────────────────
const checkLessonRequirements = async (studentId, lessonData, watchInfo = {}) => {
    const quizRequired        = lessonData.quizRequired        === true;
    const assignmentRequired  = lessonData.assignmentRequired  === true;
    const linkedQuizId        = lessonData.linkedQuizId;
    const linkedAssignmentId  = lessonData.linkedAssignmentId;

    let quizPassed           = false;
    let assignmentSubmitted  = false;
    let assignmentGraded     = false;
    let assignmentPassed     = false;

    // ── In-video checkpoint gate ─────────────────────────────────────────────
    // Every embedded quiz checkpoint in the lesson video must be passed before
    // the lesson can be marked complete.
    const checkpoints = lessonData.quizCheckpoints || [];
    let checkpointsPassed = checkpoints.length === 0;
    if (checkpoints.length > 0) {
        const passedSet = new Set(
            (await InVideoQuizAttempt.find({
                studentRef: studentId,
                lessonId: lessonData._id,
                passed: true
            }).distinct('checkpointId'))
        );
        checkpointsPassed = checkpoints.every(cp => passedSet.has(cp.checkpointId));
    }

    // ── Quiz gate ────────────────────────────────────────────────────────────
    if (quizRequired && linkedQuizId) {
        const [gradeRows, quiz] = await Promise.all([
            // Best-of-attempts policy: a failed retake never revokes an earlier
            // pass, so use the BEST grade row (highest score) for this student.
            GradeBook.find({ studentRef: studentId, assessmentRef: linkedQuizId })
                .sort({ submissionTimestamp: 1 })
                .lean(),
            Quiz.findById(linkedQuizId).lean()
        ]);
        const gradeEntry = gradeRows.reduce(
            (best, g) => !best || (g.numericalScoreEarned ?? 0) >= (best.numericalScoreEarned ?? 0) ? g : best,
            null
        );
        // A GradeBook entry is created on ANY submission (pass or fail), so the
        // quiz's passingScoreThreshold is applied here — a submission alone no
        // longer counts as "passed".
        quizPassed = isQuizPassed(gradeEntry, quiz);
    } else if (quizRequired && !linkedQuizId) {
        // Quiz required but not linked yet — safe default: treat as satisfied
        // so the flow can never dead-lock on an instructor oversight.
        quizPassed = true;
    } else {
        // Quiz not required — treat as satisfied
        quizPassed = true;
    }

    // ── Assignment gate ──────────────────────────────────────────────────────
    if (assignmentRequired && linkedAssignmentId) {
        const [submission, assignment] = await Promise.all([
            Submission.findOne({ assignmentRef: linkedAssignmentId, studentRef: studentId }).lean(),
            Assignment.findById(linkedAssignmentId).lean()
        ]);
        assignmentSubmitted = !!submission;
        assignmentGraded    = !!(submission && submission.status === 'Graded');
        assignmentPassed    = isAssignmentApproved(submission, assignment);
    } else if (assignmentRequired && !linkedAssignmentId) {
        // Assignment required but none linked yet — safe default: treat as
        // satisfied so the flow can never dead-lock on an instructor oversight.
        assignmentSubmitted = true;
        assignmentGraded    = false;
        assignmentPassed    = true;
    } else {
        // Assignment not required — treat as satisfied
        assignmentSubmitted = true;
        assignmentGraded    = false;
        assignmentPassed    = true;
    }

    // ── Video watch-through gate ─────────────────────────────────────────────
    // When the player reports a real duration (HTML5 video mode), the student
    // must have actually PLAYED at least 85% of the video before completion.
    // Watch time accumulates from playback ticks, so seeking ahead doesn't help.
    const videoDurationSeconds = Number(watchInfo.videoDurationSeconds) || 0;
    const watchedSeconds       = Number(watchInfo.watchedSeconds) || 0;
    const videoWatchRequired   = videoDurationSeconds > 30; // iframe-only lessons have no duration → skip
    const videoWatchedPercent  = videoDurationSeconds > 0
        ? Math.min(100, Math.round((watchedSeconds / videoDurationSeconds) * 100))
        : (videoWatchRequired ? 0 : 100);
    const videoWatched         = !videoWatchRequired || watchedSeconds >= videoDurationSeconds * 0.85;

    // ── Completion gate ─────────────────────────────────────────────────
    // "Mark lesson as complete" means the CONTENT is done: the student has
    // worked through the material (watch-through + in-video checkpoints).
    // The linked quiz and assignment are separate steps handled afterwards in
    // the same workspace — the quiz gate (lesson content done) and the
    // assignment gate (quiz passed) live in sequenceService, NOT here.
    const canComplete = checkpointsPassed && videoWatched;

    return {
        quizRequired,
        quizPassed,
        assignmentRequired,
        assignmentSubmitted,
        assignmentGraded,
        assignmentPassed,
        checkpointsRequired: checkpoints.length > 0,
        checkpointsPassed,
        checkpointsTotal: checkpoints.length,
        videoWatchRequired,
        videoWatched,
        videoWatchedPercent,
        watchedSeconds,
        videoDurationSeconds,
        canComplete,
        linkedQuizId:       linkedQuizId       ? linkedQuizId.toString()       : null,
        linkedAssignmentId: linkedAssignmentId ? linkedAssignmentId.toString() : null
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get the requirement + completion status for a specific lesson
// @route   GET /api/learning-progress/course/:courseId/lesson/:lessonId/requirements
// @access  Private (Student)
// ─────────────────────────────────────────────────────────────────────────────
const getLessonRequirementsStatus = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;

        const course = await Course.findById(courseId).lean();
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

        // Find the lesson in the curriculumTree
        let lessonFound = null;
        for (const chapter of (course.curriculumTree || [])) {
            for (const lesson of (chapter.lessons || [])) {
                if (lesson._id.toString() === lessonId) {
                    lessonFound = lesson;
                    break;
                }
            }
            if (lessonFound) break;
        }

        if (!lessonFound) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        // Include persisted watch-through data so the client can display it,
        // merged with the player's LIVE values when provided via query params
        // (duration is known to the client before any heartbeat has persisted).
        const progressDoc = await LearningProgress.findOne(
            { studentRef: req.user.id, courseRef: courseId, 'progressItems.lessonId': lessonId },
            { progressItems: { $elemMatch: { lessonId } } }
        ).lean();
        const storedItem = progressDoc?.progressItems?.[0];
        const watchInfo = {
            watchedSeconds: Math.max(Number(req.query.watchedSeconds) || 0, Number(storedItem?.watchedSeconds) || 0),
            videoDurationSeconds: Math.max(Number(req.query.durationSeconds) || 0, Number(storedItem?.videoDurationSeconds) || 0)
        };

        const result = await checkLessonRequirements(req.user.id, lessonFound, watchInfo);

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Save lesson progress / mark lesson as completed
// @route   POST /api/learning-progress/course/:courseId/lesson/:lessonId/progress
// @access  Private (Student)
//
// BACKEND GATE: When completed=true, verifies quiz + assignment requirements
// before setting the lesson as complete.  Returns 422 with detailed status
// if requirements are not met so the frontend can display exactly what's missing.
// ─────────────────────────────────────────────────────────────────────────────
const saveLessonProgress = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const {
            currentTime = 0,
            completed = false,
            documentRead = false,
            resourceDownloads = 0,
            lessonTitle = '',
            watchedSeconds = 0,
            videoDurationSeconds = 0
        } = req.body;

        const course = await Course.findById(courseId).lean();
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

        const lessonIndices = { chapterIndex: 0, lessonIndex: 0, lessonTitle: '' };
        let lessonFound = null;
        for (let chapterIndex = 0; chapterIndex < (course.curriculumTree || []).length; chapterIndex += 1) {
            const chapter = course.curriculumTree[chapterIndex];
            for (let lessonIndex = 0; lessonIndex < (chapter.lessons || []).length; lessonIndex += 1) {
                const lesson = chapter.lessons[lessonIndex];
                if (lesson._id.toString() === lessonId) {
                    lessonFound = lesson;
                    lessonIndices.chapterIndex = chapterIndex;
                    lessonIndices.lessonIndex = lessonIndex;
                    lessonIndices.lessonTitle = lesson.lessonTitle || lessonTitle || '';
                    break;
                }
            }
            if (lessonFound) break;
        }

        if (!lessonFound) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        // ── BACKEND GATE: sequential unlock — a locked lesson cannot receive any
        // heartbeat/completion write, regardless of what the client sends. ──
        const seqAccess = await getLessonAccess(req.user.id, courseId, lessonId, course);
        if (!seqAccess.granted) {
            return res.status(403).json({
                success: false,
                message: seqAccess.reason,
                lessonLocked: true,
                lockReason: seqAccess.reason
            });
        }

        // Load existing progress first so watch data can be merged across sessions
        let progress = await LearningProgress.findOne({ studentRef: req.user.id, courseRef: courseId });
        const prevItem = progress?.progressItems?.find(item => item.lessonId.toString() === lessonId);
        const watchInfo = {
            watchedSeconds: Math.max(Number(watchedSeconds) || 0, Number(prevItem?.watchedSeconds) || 0),
            videoDurationSeconds: Math.max(Number(videoDurationSeconds) || 0, Number(prevItem?.videoDurationSeconds) || 0)
        };

        // ── BACKEND GATE: enforce quiz + assignment + checkpoint + watch requirements ──
        if (completed) {
            const reqStatus = await checkLessonRequirements(req.user.id, lessonFound, watchInfo);
            if (!reqStatus.canComplete) {
                return res.status(422).json({
                    success: false,
                    message: 'Please complete the required activities before completing this lesson.',
                    requirementsNotMet: true,
                    data: reqStatus
                });
            }
        }

        const totalLessons = course.curriculumTree?.reduce((sum, chapter) => sum + (chapter.lessons?.length || 0), 0) || 0;
        if (!progress) {
            progress = await LearningProgress.create({
                studentRef: req.user.id,
                courseRef: courseId,
                lastLessonRef: lessonId,
                lastChapterIndex: lessonIndices.chapterIndex,
                lastLessonIndex: lessonIndices.lessonIndex,
                lastWatchedPosition: currentTime,
                completionPercentage: 0,
                progressItems: []
            });
        }

        const itemIndex = progress.progressItems.findIndex(item => item.lessonId.toString() === lessonId);
        if (itemIndex >= 0) {
            const existingItem = progress.progressItems[itemIndex];
            existingItem.lastWatchedPosition = Math.max(existingItem.lastWatchedPosition || 0, currentTime);
            existingItem.watchedSeconds = Math.max(existingItem.watchedSeconds || 0, watchInfo.watchedSeconds);
            existingItem.videoDurationSeconds = Math.max(existingItem.videoDurationSeconds || 0, watchInfo.videoDurationSeconds);
            existingItem.completed = completed || existingItem.completed;
            existingItem.documentRead = documentRead || existingItem.documentRead;
            existingItem.resourceDownloads = Math.max(existingItem.resourceDownloads || 0, resourceDownloads || 0);
            existingItem.lessonTitle = existingItem.lessonTitle || lessonIndices.lessonTitle || lessonTitle;
            if (completed && !existingItem.completedAt) existingItem.completedAt = new Date();
        } else {
            progress.progressItems.push({
                lessonId,
                chapterIndex: lessonIndices.chapterIndex,
                lessonIndex: lessonIndices.lessonIndex,
                lessonTitle: lessonIndices.lessonTitle || lessonTitle,
                lastWatchedPosition: currentTime,
                watchedSeconds: watchInfo.watchedSeconds,
                videoDurationSeconds: watchInfo.videoDurationSeconds,
                completed,
                completedAt: completed ? new Date() : undefined,
                documentRead,
                resourceDownloads
            });
        }

        progress.lastLessonRef = lessonId;
        progress.lastChapterIndex = lessonIndices.chapterIndex;
        progress.lastLessonIndex = lessonIndices.lessonIndex;
        progress.lastWatchedPosition = currentTime;

        const completedCount = progress.progressItems.filter(item => item.completed).length;
        progress.completionPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        await progress.save();

        const enrollment = await Enrollment.findOne({ studentRef: req.user.id, courseRef: courseId });
        if (enrollment) {
            enrollment.completionPercentage = progress.completionPercentage;
            await enrollment.save();
        }

        const response = await LearningProgress.findById(progress._id).lean();
        return res.status(200).json({ success: true, data: response });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get the sequential unlock state for every lesson of a course
// @route   GET /api/learning-progress/course/:courseId/sequence
// @access  Private (Student) — used by the Learning Workspace to render locks
//          and to surface per-lesson quiz/assignment status.
// ─────────────────────────────────────────────────────────────────────────────
const getCourseSequence = async (req, res, next) => {
    try {
        const sequence = await getSequenceForStudent(req.params.courseId, req.user.id);
        return res.status(200).json({ success: true, data: { entries: sequence.entries } });
    } catch (err) {
        next(err);
    }
};

const markDocumentViewed = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const reqBody = { documentRead: true };
        req.body = { ...req.body, ...reqBody };
        return saveLessonProgress(req, res, next);
    } catch (err) {
        next(err);
    }
};

const trackResourceDownload = async (req, res, next) => {
    try {
        const { courseId, lessonId } = req.params;
        const currentTime = Number(req.body.currentTime || 0);
        const resourceDownloads = Number(req.body.resourceDownloads || 1);
        req.body = { ...req.body, currentTime, resourceDownloads };
        return saveLessonProgress(req, res, next);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCourseProgress,
    getResumeProgress,
    getLessonRequirementsStatus,
    getCourseSequence,
    saveLessonProgress,
    markDocumentViewed,
    trackResourceDownload,
    checkLessonRequirements
};
