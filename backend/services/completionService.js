/**
 * completionService.js
 *
 * Backend source-of-truth for course completion and certificate eligibility.
 *
 * Eligibility = ALL of the following must be satisfied:
 *   1. Every lesson in the course curriculum is completed.
 *      (Lesson completion is itself gated server-side by video watch-through
 *       and in-video checkpoints, so completed lessons imply them.)
 *   2. Every required linked quiz is PASSED (score >= quiz.passingScoreThreshold).
 *   3. Every required assignment is submitted AND approved/passed
 *      (Submission.status === 'Graded' and grade >= assignment.passingScore).
 *   4. Tuition is cleared (enrollment.tuitionClearanceFlag).
 *
 * buildCompletionReport() returns a detailed report the UI renders as a
 * requirements checklist with an overall completion percentage.
 */

const LearningProgress = require('../models/LearningProgress');
const Quiz             = require('../models/Quiz');
const Assignment       = require('../models/Assignment');
const GradeBook        = require('../models/GradeBook');
const Submission       = require('../models/Submission');

const flattenLessons = (curriculumTree = []) => {
    const flat = [];
    (curriculumTree || []).forEach((chapter) => {
        (chapter.lessons || []).forEach((lesson) => flat.push(lesson));
    });
    return flat;
};

/**
 * A quiz is "passed" when a graded GradeBook entry exists and the earned score
 * meets the quiz's passingScoreThreshold.  A threshold of 0 or missing quiz
 * means any graded submission counts as passed.
 */
const isQuizPassed = (gradeEntry, quiz) => {
    if (!gradeEntry || !gradeEntry.isGraded) return false;
    const threshold = quiz?.passingScoreThreshold ?? 60;
    if (threshold <= 0) return true;
    return (gradeEntry.numericalScoreEarned ?? 0) >= threshold;
};

/**
 * An assignment is "approved/passed" when the latest submission is Graded and
 * its grade meets assignment.passingScore.  A passingScore of 0 means any
 * graded submission counts as passed.
 */
const isAssignmentApproved = (submission, assignment) => {
    if (!submission) return false;
    if (submission.status !== 'Graded') return false;
    const passScore = assignment?.passingScore ?? 0;
    if (passScore <= 0) return true;
    return (submission.grade ?? 0) >= passScore;
};

/**
 * Build a full completion/eligibility report for one student + course.
 *
 * @param {Object} options
 * @param {ObjectId|String} options.studentRef
 * @param {Object} options.course           Course document (mongoose doc or lean)
 * @param {Object} [options.enrollment]     Enrollment document (for tuition flag)
 * @returns {Promise<Object>} detailed report
 */
const buildCompletionReport = async ({ studentRef, course, enrollment }) => {
    const courseDoc = course?.toObject ? course.toObject() : course || {};
    const courseId  = courseDoc._id;

    const curriculumTree = courseDoc.curriculumTree || [];
    const lessons        = flattenLessons(curriculumTree);

    const [progress, gradebookRows, submissions] = await Promise.all([
        LearningProgress.findOne({ studentRef, courseRef: courseId }).lean(),
        GradeBook.find({ studentRef }).lean(),
        Submission.find({ studentRef }).lean()
    ]);

    // ── 1. Lessons ────────────────────────────────────────────────────────────
    const completedLessonIds = new Set(
        (progress?.progressItems || [])
            .filter((item) => item.completed)
            .map((item) => item.lessonId?.toString())
    );
    const totalLessons    = lessons.length;
    const completedLessons = lessons.filter((l) => completedLessonIds.has(l._id?.toString())).length;
    const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons;
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // ── 2. Required linked quizzes ────────────────────────────────────────────
    const quizLinks = lessons
        .filter((l) => l.quizRequired && l.linkedQuizId)
        .map((l) => ({ lesson: l, quizId: String(l.linkedQuizId) }));

    const quizIds     = [...new Set(quizLinks.map((q) => q.quizId))];
    const quizzes     = await Quiz.find({ _id: { $in: quizIds } }).lean();
    const quizById    = new Map(quizzes.map((q) => [String(q._id), q]));
    // Best grade per quiz: a failed retake can never revoke an earlier pass.
    const gradeByQuiz = new Map();
    gradebookRows.forEach((g) => {
        let prev = gradeByQuiz.get(String(g.assessmentRef));
        if (!prev || (g.numericalScoreEarned ?? 0) > (prev.numericalScoreEarned ?? 0)) {
            gradeByQuiz.set(String(g.assessmentRef), g);
        }
    });

    let quizzesRequired = 0;
    let quizzesPassed   = 0;
    const quizRequirementRows = quizLinks.map(({ lesson, quizId }) => {
        quizzesRequired += 1;
        const quiz   = quizById.get(quizId);
        const grade  = gradeByQuiz.get(quizId);
        const passed = isQuizPassed(grade, quiz);
        if (passed) quizzesPassed += 1;
        return {
            key: `quiz-${quizId}`,
            type: 'quiz',
            title: quiz?.quizTitle || 'Required Quiz',
            lessonTitle: lesson.lessonTitle || '',
            done: passed,
            detail: passed
                ? 'Quiz passed'
                : (grade?.isGraded
                    ? `Score ${grade.numericalScoreEarned ?? 0}% — need ${quiz?.passingScoreThreshold ?? 60}% to pass`
                    : 'Quiz not attempted')
        };
    });
    const allQuizzesPassed = quizzesRequired === quizzesPassed;

    // ── 3. Required assignments ───────────────────────────────────────────────
    // Includes lesson-linked assignments AND course-level assignments flagged
    // required:true (these count toward eligibility even when not embedded in
    // a lesson).
    const requiredAssignmentMap = new Map();
    lessons.forEach((lesson) => {
        if (lesson.assignmentRequired && lesson.linkedAssignmentId) {
            requiredAssignmentMap.set(String(lesson.linkedAssignmentId), { lesson, assignmentId: String(lesson.linkedAssignmentId) });
        }
    });

    const courseAssignments = await Assignment.find({ courseRef: courseId, required: true, isActive: true }).lean();
    courseAssignments.forEach((a) => {
        if (!requiredAssignmentMap.has(String(a._id))) {
            requiredAssignmentMap.set(String(a._id), { lesson: null, assignmentId: String(a._id) });
        }
    });

    const assignmentIds = [...requiredAssignmentMap.keys()];
    const assignments   = await Assignment.find({ _id: { $in: assignmentIds } }).lean();
    const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));
    const subByAssignment = new Map(submissions.map((s) => [String(s.assignmentRef), s]));

    let assignmentsRequired = 0;
    let assignmentsApproved = 0;
    const assignmentRequirementRows = [];
    for (const item of requiredAssignmentMap.values()) {
        assignmentsRequired += 1;
        const assignment = assignmentById.get(item.assignmentId);
        const sub        = subByAssignment.get(item.assignmentId);
        const passScore  = assignment?.passingScore ?? 0;
        const approved   = isAssignmentApproved(sub, assignment);
        if (approved) assignmentsApproved += 1;
        assignmentRequirementRows.push({
            key: `assignment-${item.assignmentId}`,
            type: 'assignment',
            title: assignment?.title || 'Required Assignment',
            lessonTitle: item.lesson?.lessonTitle || '',
            done: approved,
            detail: approved
                ? `Approved — ${sub.grade}${assignment?.maxScore != null ? `/${assignment.maxScore}` : ''}`
                : sub
                    ? (sub.status === 'Graded'
                        ? `Graded ${sub.grade ?? '—'}${assignment?.maxScore != null ? `/${assignment.maxScore}` : ''} — needs ${passScore} to pass`
                        : 'Submitted — awaiting instructor approval')
                    : 'Assignment not submitted'
        });
    }
    const allAssignmentsApproved = assignmentsRequired === assignmentsApproved;

    // ── 4. Tuition ────────────────────────────────────────────────────────────
    // Free courses (price === 0) never block a certificate — tuition is treated as
    // cleared automatically. Paid courses require enrollment.tuitionClearanceFlag.
    const isFreeCourse = (courseDoc.price || 0) === 0;
    const tuitionCleared = isFreeCourse || !!(enrollment?.tuitionClearanceFlag);

    // ── Eligibility + checklist ───────────────────────────────────────────────
    const eligible = tuitionCleared && allLessonsCompleted && allQuizzesPassed && allAssignmentsApproved;

    const missingRequirements = [];
    if (!allLessonsCompleted) missingRequirements.push('LESSONS');
    if (quizzesRequired > 0 && !allQuizzesPassed) missingRequirements.push('QUIZZES');
    if (assignmentsRequired > 0 && !allAssignmentsApproved) missingRequirements.push('ASSIGNMENTS');
    if (!tuitionCleared) missingRequirements.push('PAYMENT');

    const requirements = [
        {
            key: 'lessons',
            type: 'lessons',
            title: 'All lessons & videos',
            lessonTitle: '',
            done: allLessonsCompleted,
            detail: `${completedLessons}/${totalLessons} lessons completed`
        },
        ...quizRequirementRows,
        ...assignmentRequirementRows
    ];

    return {
        eligible,
        completionPercentage,
        tuitionCleared,
        totalLessons,
        completedLessons,
        allLessonsCompleted,
        quizzesRequired,
        quizzesPassed,
        allQuizzesPassed,
        assignmentsRequired,
        assignmentsApproved,
        allAssignmentsApproved,
        missingRequirements,
        requirements
    };
};

module.exports = {
    flattenLessons,
    isQuizPassed,
    isAssignmentApproved,
    buildCompletionReport
};