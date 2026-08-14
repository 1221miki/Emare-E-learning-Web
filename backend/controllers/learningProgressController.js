const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const LearningProgress = require('../models/LearningProgress');
const GradeBook = require('../models/GradeBook');
const Submission = require('../models/Submission');

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
//   { quizRequired, quizPassed, assignmentRequired, assignmentSubmitted, canComplete }
// ─────────────────────────────────────────────────────────────────────────────
const checkLessonRequirements = async (studentId, lessonData) => {
    const quizRequired        = lessonData.quizRequired        === true;
    const assignmentRequired  = lessonData.assignmentRequired  === true;
    const linkedQuizId        = lessonData.linkedQuizId;
    const linkedAssignmentId  = lessonData.linkedAssignmentId;

    let quizPassed           = false;
    let assignmentSubmitted  = false;

    // ── Quiz gate ────────────────────────────────────────────────────────────
    if (quizRequired && linkedQuizId) {
        const gradeEntry = await GradeBook.findOne({
            studentRef: studentId,
            assessmentRef: linkedQuizId
        }).lean();
        // A quiz entry is created on any submission; consider it "passed" if
        // it was graded and the score meets the threshold OR the quiz itself
        // doesn't enforce a threshold (entry existence = completion).
        quizPassed = !!(gradeEntry && gradeEntry.isGraded);
    } else if (quizRequired && !linkedQuizId) {
        // Quiz required but no quiz linked yet — block completion
        quizPassed = false;
    } else {
        // Quiz not required — treat as satisfied
        quizPassed = true;
    }

    // ── Assignment gate ──────────────────────────────────────────────────────
    if (assignmentRequired && linkedAssignmentId) {
        const submission = await Submission.findOne({
            assignmentRef: linkedAssignmentId,
            studentRef: studentId
        }).lean();
        assignmentSubmitted = !!(submission);
    } else if (assignmentRequired && !linkedAssignmentId) {
        // Assignment required but none linked yet — block completion
        assignmentSubmitted = false;
    } else {
        // Assignment not required — treat as satisfied
        assignmentSubmitted = true;
    }

    const canComplete = quizPassed && assignmentSubmitted;

    return {
        quizRequired,
        quizPassed,
        assignmentRequired,
        assignmentSubmitted,
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

        const result = await checkLessonRequirements(req.user.id, lessonFound);

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
        const { currentTime = 0, completed = false, documentRead = false, resourceDownloads = 0, lessonTitle = '' } = req.body;

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

        // ── BACKEND GATE: enforce quiz + assignment requirements ─────────────
        if (completed) {
            const reqStatus = await checkLessonRequirements(req.user.id, lessonFound);
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
        let progress = await LearningProgress.findOne({ studentRef: req.user.id, courseRef: courseId });
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
    saveLessonProgress,
    markDocumentViewed,
    trackResourceDownload
};
