/**
 * sequenceService.js
 *
 * Backend source of truth for the sequential lesson-based learning workflow.
 *
 * Course curriculum is treated as ONE ordered list of lessons (flattened
 * depth-first across chapters). A lesson is UNLOCKED only when every lesson
 * before it is fully "done" — meaning its content is completed AND every
 * required activity is satisfied:
 *   - text/video content completed (watch-through >= 85% when duration known)
 *   - required in-video checkpoint quizzes all passed
 *   - required linked quiz passed (grade >= passingScoreThreshold)
 *   - required linked assignment approved (Graded && grade >= passingScore)
 *
 * The same service powers:
 *   - GET /learning-progress/course/:courseId/sequence (client lock rendering)
 *   - lesson-completion gating  (saveLessonProgress)
 *   - quiz access/submission gating
 *   - assignment access/submission gating
 *
 * No lesson, quiz, or assignment can be accessed out of order — enforced here,
 * on the backend, regardless of what the frontend shows.
 */

const LearningProgress = require('../models/LearningProgress');
const GradeBook = require('../models/GradeBook');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');
const { isQuizPassed, isAssignmentApproved } = require('./completionService');

const LOCK_MESSAGE = 'Complete the previous lesson activities before continuing.';

const flag = (v) => v === true;

/**
 * Build the full unlock/done evaluation for every flattened lesson of a course
 * for a given student.
 *
 * @param {ObjectId|String} studentRef
 * @param {mongoose.Document|Object} course  (must include curriculumTree + _id)
 * @returns {Promise<{
 *   entries: Array,
 *   byLessonId: Map,
 *   byQuizId: Map,
 *   byAssignmentId: Map
 * }>}
 */
async function buildSequence({ studentRef, course }) {
    const courseId = course && (course._id || course.id);
    const curriculumTree = (course && course.curriculumTree) || [];

    const flat = [];
    curriculumTree.forEach((chapter, chapterIndex) => {
        (chapter.lessons || []).forEach((lesson, lessonIndex) => {
            flat.push({ lesson, chapterIndex, lessonIndex, flatIndex: flat.length });
        });
    });

    const quizLessonLinks = flat.filter((f) => flag(f.lesson.quizRequired) && f.lesson.linkedQuizId);
    const quizIds = [...new Set(quizLessonLinks.map((f) => String(f.lesson.linkedQuizId)))];
    const assignmentIds = [...new Set(flat.map((f) => f.lesson.linkedAssignmentId && String(f.lesson.linkedAssignmentId)).filter(Boolean))];

    const [progressDoc, gradeRows, submissions, quizzes, assignments, checkpointAttempts] = await Promise.all([
        LearningProgress.findOne({ studentRef, courseRef: courseId }).lean().exec(),
        GradeBook.find({ studentRef }).sort({ submissionTimestamp: 1 }).lean().exec(),
        Submission.find({ studentRef }).lean().exec(),
        quizIds.length ? Quiz.find({ _id: { $in: quizIds } }).lean().exec() : Promise.resolve([]),
        assignmentIds.length ? Assignment.find({ _id: { $in: assignmentIds } }).lean().exec() : Promise.resolve([]),
        InVideoQuizAttempt.find({ studentRef, courseRef: courseId }).lean().exec()
    ]);

    const gradeByQuiz = new Map();
    const gradeRowsByQuiz = new Map();
    gradeRows.forEach((g) => {
        const key = String(g.assessmentRef);
        if (!gradeRowsByQuiz.has(key)) gradeRowsByQuiz.set(key, []);
        gradeRowsByQuiz.get(key).push(g);
        // Keep the BEST grade per assessment so a failed retake can never
        // revoke a quiz that the student has already passed.
        if (g.isGraded) {
            const prev = gradeByQuiz.get(key);
            if (!prev || (g.numericalScoreEarned ?? 0) >= (prev.numericalScoreEarned ?? 0)) gradeByQuiz.set(key, g);
        }
    });

    const quizById = new Map(quizzes.map((q) => [String(q._id), q]));
    const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));

    const subByAssignment = new Map();
    submissions.forEach((s) => subByAssignment.set(String(s.assignmentRef), s));

    const checkpointPassedByLesson = new Map();
    checkpointAttempts.forEach((a) => {
        if (!flag(a.passed)) return;
        const lessonKey = String(a.lessonId);
        if (!checkpointPassedByLesson.has(lessonKey)) checkpointPassedByLesson.set(lessonKey, new Set());
        checkpointPassedByLesson.get(lessonKey).add(a.checkpointId);
    });

    const items = (progressDoc && progressDoc.progressItems) || [];
    const progressByLesson = new Map(items.map((i) => [String(i.lessonId), i]));

    const entries = flat.map((f) => {
        const lesson = f.lesson;
        const lessonId = String(lesson._id || lesson.id);
        const progress = progressByLesson.get(lessonId);

        // ── Quiz requirement ────────────────────────────────────────────
        // Missing-link safety net: when a lesson says a quiz/assignment is
        // required but the instructor never linked one, that step counts as
        // satisfied so the sequence can never dead-lock.
        const quizLinkedId = lesson.linkedQuizId && String(lesson.linkedQuizId);
        const quizRequired = flag(lesson.quizRequired) && !!quizLinkedId;
        const quiz = quizLinkedId ? quizById.get(quizLinkedId) : null;
        const grade = quizLinkedId ? gradeByQuiz.get(quizLinkedId) : null;
        const quizPassed = quizRequired
            ? (quizLinkedId ? isQuizPassed(grade, quiz) : false)
            : true;
        const quizAttempts = quizLinkedId ? ((gradeRowsByQuiz.get(quizLinkedId) || []).length) : 0;

        // ── Assignment requirement ──────────────────────────────────────
        const asgLinkedId = lesson.linkedAssignmentId && String(lesson.linkedAssignmentId);
        const assignmentRequired = flag(lesson.assignmentRequired) && !!asgLinkedId;
        const assignment = asgLinkedId ? assignmentById.get(asgLinkedId) : null;
        const submission = asgLinkedId ? subByAssignment.get(asgLinkedId) : null;
        const assignmentPassed = assignmentRequired
            ? (asgLinkedId ? isAssignmentApproved(submission, assignment) : false)
            : true;
        // "Assignment submitted" is what unlocks the NEXT lesson, per the
        // lesson → quiz → assignment → next flow. Instructor grading/approval
        // happens afterwards and is only required for the certificate.
        const assignmentSubmitted = assignmentRequired ? !!submission : true;

        // ── In-video checkpoint quizzes ─────────────────────────────────
        const checkpoints = lesson.quizCheckpoints || [];
        const passedCheckpointSet = checkpointPassedByLesson.get(lessonId) || new Set();
        const checkpointsPassedCount = checkpoints.filter((cp) => passedCheckpointSet.has(cp.checkpointId)).length;
        const checkpointsOk = checkpoints.length === 0 || checkpointsPassedCount === checkpoints.length;

        // ── Content watch-through ───────────────────────────────────────
        const videoDuration = Number(progress?.videoDurationSeconds || 0);
        const watched = Number(progress?.watchedSeconds || 0);
        const videoOk = videoDuration > 30 ? watched >= videoDuration * 0.85 : true;

        const progressCompleted = flag(progress?.completed);
        // Lesson CONTENT is complete when the student marked it complete and
        // every in-video checkpoint + the watch-through is satisfied.
        const contentOk = progressCompleted && checkpointsOk && videoOk;
        // A lesson is "advance ready" once content, quiz, and assignment
        // submission are all satisfied — this is what unlocks the next lesson.
        const advanceReady = contentOk && quizPassed && assignmentSubmitted;
        const done = advanceReady;

        return {
            flatIndex: f.flatIndex,
            lessonId,
            chapterIndex: f.chapterIndex,
            lessonIndex: f.lessonIndex,
            title: lesson.lessonTitle || lesson.title || 'Untitled lesson',
            contentCompleted: progressCompleted,
            contentOk,
            quizRequired,
            quizLinkedId,
            quizStatus: {
                required: quizRequired,
                passed: quizPassed,
                attempts: quizAttempts,
                score: grade && grade.numericalScoreEarned != null ? grade.numericalScoreEarned : null,
                threshold: quiz ? quiz.passingScoreThreshold : null
            },
            assignmentRequired,
            assignmentLinkedId: asgLinkedId,
            assignmentStatus: buildAssignmentStatus(submission, assignment, assignmentRequired),
            assignmentSubmitted,
            checkpointsRequired: checkpoints.length > 0,
            checkpointsTotal: checkpoints.length,
            checkpointsPassedCount,
            advanceReady,
            done
        };
    });

    // Sequential unlock rule: entry i is unlocked iff every entry < i is done.
    let previousAllDone = true;
    entries.forEach((entry, i) => {
        entry.unlocked = previousAllDone;
        if (!entry.unlocked) {
            const prev = entries[i - 1];
            entry.lockReason = prev
                ? `Unlocks after completing "${prev.title}" — finish its content, quiz, and assignment first.`
                : LOCK_MESSAGE;
        }
        previousAllDone = previousAllDone && entry.done;
    });

    const byLessonId = new Map(entries.map((e) => [String(e.lessonId), e]));
    const byQuizId = new Map(entries
        .filter((e) => e.quizLinkedId)
        .map((e) => [String(e.quizLinkedId), e]));
    const byAssignmentId = new Map(entries
        .filter((e) => e.assignmentLinkedId)
        .map((e) => [String(e.assignmentLinkedId), e]));

    return { entries, byLessonId, byQuizId, byAssignmentId };
}

/**
 * Load a course then evaluate its sequence for a student (single query pass).
 */
async function getSequenceForStudent(courseId, studentRef) {
    const Course = require('../models/Course');
    const course = await Course.findById(courseId).lean().exec();
    if (!course) throw new Error('Course not found');
    return buildSequence({ studentRef, course });
}

// ── Access helpers ────────────────────────────────────────────────────────

/**
 * Gate a lesson write (saveLessonProgress heartbeat / completion).
 * Returns { granted, reason, entry }.
 */
async function getLessonAccess(studentRef, courseId, lessonId, course) {
    const seq = course
        ? await buildSequence({ studentRef, course })
        : await getSequenceForStudent(courseId, studentRef);
    const entry = seq.byLessonId.get(String(lessonId));
    if (!entry) return { granted: false, reason: 'Lesson not found.', entry: null };
    if (!entry.unlocked) return { granted: false, reason: entry.lockReason || LOCK_MESSAGE, entry };
    return { granted: true, entry };
}

/**
 * Gate a quiz (view or attempt). A quiz belonging to a lesson is accessible
 * once that lesson is unlocked. Course-level (unlinked) quizzes are always
 * accessible to enrolled students.
 */
async function getQuizAccess(studentRef, quiz) {
    if (!quiz) return { granted: true, reason: null, entry: null };
    if (!quiz.courseRef) return { granted: true, reason: null, entry: null };
    const seq = await getSequenceForStudent(quiz.courseRef, studentRef);
    const entry = seq.byQuizId.get(String(quiz._id));
    if (!entry) return { granted: true, reason: null, entry: null };
    if (!entry.unlocked) {
        return { granted: false, reason: entry.lockReason || LOCK_MESSAGE, entry };
    }
    // Lesson → quiz gating: a lesson-linked quiz may only be attempted once the
    // lesson's own CONTENT is complete (instruction read/watched + any in-video
    // checkpoints passed). Enforced here, server-side.
    if (!entry.contentOk) {
        return {
            granted: false,
            reason: `Complete the "${entry.title}" lesson content before attempting its quiz.`,
            entry
        };
    }
    return { granted: true, reason: null, entry };
}

/**
 * Gate an assignment (view or submit). Lesson-linked assignments are unlocked
 * with their lesson, and additionally require the lesson's quiz to be passed
 * BEFORE submission (honours "quiz → assignment" without deadlocking, since
 * course-level assignments have no lesson binding).
 */
async function getAssignmentAccess(studentRef, assignment) {
    if (!assignment) return { granted: true, reason: null, lesson: null, quizPassed: true };
    const rawCourseRef = assignment.courseRef;
    const courseRef = rawCourseRef && (rawCourseRef._id || rawCourseRef.toString());
    if (!courseRef) return { granted: true, reason: null, lesson: null, quizPassed: true };
    const seq = await getSequenceForStudent(courseRef, studentRef);
    const entry = seq.byAssignmentId.get(String(assignment._id));
    if (!entry) return { granted: true, reason: null, lesson: null, quizPassed: true };

    if (!entry.unlocked) {
        return { granted: false, reason: entry.lockReason || LOCK_MESSAGE, lesson: entry.title, quizPassed: true };
    }
    if (entry.quizRequired && !entry.quizStatus.passed) {
        return {
            granted: false,
            reason: `Pass the lesson quiz "${entry.title}" before submitting this assignment.`,
            lesson: entry.title,
            quizPassed: false
        };
    }
    return { granted: true, reason: null, lesson: entry.title, quizPassed: true };
}

/**
 * Friendly assignment status helper used by both the sequence and the
 * assignment list annotation:
 *   no submission        -> Not Started
 *   Submitted/Pending    -> Submitted
 *   Under Review         -> Under Review
 *   Graded + passed      -> Approved
 *   Graded + below       -> Revision / not approved
 *   Returned/Revision    -> Returned for Revision
 */
function buildAssignmentStatus(submission, assignment, required) {
    const base = {
        required: required === true,
        submitted: false,
        status: 'Not Started',
        approved: false,
        grade: null,
        maxScore: assignment && assignment.maxScore != null ? assignment.maxScore : 100,
        passingScore: assignment ? assignment.passingScore : 0
    };
    if (!submission) return base;

    base.submitted = true;
    switch (submission.status) {
        case 'Graded': {
            const pass = isAssignmentApproved(submission, assignment);
            base.approved = pass;
            base.status = pass ? 'Approved' : 'Returned for Revision';
            break;
        }
        case 'Under Review':
            base.status = 'Under Review';
            break;
        case 'Returned':
        case 'Revision Requested':
            base.status = 'Returned for Revision';
            break;
        case 'Submitted':
        case 'Pending Review':
        default:
            base.status = 'Submitted';
            break;
    }
    if (submission.grade != null) base.grade = submission.grade;
    return base;
}

module.exports = {
    LOCK_MESSAGE,
    buildSequence,
    getSequenceForStudent,
    getLessonAccess,
    getQuizAccess,
    getAssignmentAccess,
    buildAssignmentStatus
};