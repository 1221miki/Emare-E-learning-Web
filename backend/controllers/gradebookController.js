const GradeBook = require('../models/GradeBook');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');

// ─────────────────────────────────────────────
// @desc    Submit an assignment (student uploads file/URL)
// @route   POST /api/submissions
// @access  Private (Student only)
// ─────────────────────────────────────────────
const submitAssignment = async (req, res, next) => {
    try {
        const { assessmentRef, submittedRepositoryURL } = req.body;

        if (!assessmentRef) {
            return res.status(400).json({ success: false, message: 'Assessment reference is required.' });
        }

        // Fetch deadline from Quiz or Assignment
        let deadline = null;
        const quiz = await Quiz.findById(assessmentRef);
        if (quiz) {
            deadline = quiz.submissionDeadline;
        } else {
            const assignment = await Assignment.findById(assessmentRef);
            if (assignment) {
                deadline = assignment.dueDate;
            }
        }

        // Enforce BR-03: Hard cutoff after 3 days
        if (deadline) {
            const timePassed = Date.now() - new Date(deadline).getTime();
            const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
            if (timePassed > threeDaysMs) {
                return res.status(400).json({
                    success: false,
                    message: 'Submission rejected. Submissions are not accepted more than 3 days after the deadline.'
                });
            }
        }

        // Prevent duplicate submissions for the same assessment
        const existing = await GradeBook.findOne({ studentRef: req.user.id, assessmentRef });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You have already submitted for this assessment.' });
        }

        const submission = await GradeBook.create({
            studentRef: req.user.id,
            assessmentRef,
            numericalScoreEarned: 0, // Placeholder until instructor grades
            submittedRepositoryURL: submittedRepositoryURL || '',
            submissionTimestamp: Date.now(),
            isGraded: false
        });

        res.status(201).json({ success: true, message: 'Assignment submitted successfully.', data: submission });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all submissions for a course (Instructor view)
// @route   GET /api/submissions/course/:courseId
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const getSubmissionsForCourse = async (req, res, next) => {
    try {
        // Verify the instructor owns this course
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }
        if (course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this course.' });
        }

        // Retrieve all submissions linked to quizzes/assessments of this course
        const submissions = await GradeBook.find()
            .populate({ path: 'studentRef', select: 'fullName accountEmail' })
            .populate({ path: 'assessmentRef', match: { courseRef: req.params.courseId }, select: 'quizTitle courseRef' })
            .sort({ submissionTimestamp: -1 })
            .lean();

        // Filter out entries where assessmentRef didn't match (populate returns null for non-matches)
        const filtered = submissions.filter(s => s.assessmentRef !== null);

        res.status(200).json({ success: true, count: filtered.length, data: filtered });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Grade a student submission
// @route   PATCH /api/submissions/:id/grade
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const gradeSubmission = async (req, res, next) => {
    try {
        const { numericalScoreEarned, instructorReviewNotes } = req.body;

        if (numericalScoreEarned === undefined || numericalScoreEarned < 0 || numericalScoreEarned > 100) {
            return res.status(400).json({ success: false, message: 'Score must be between 0 and 100.' });
        }

        const submission = await GradeBook.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found.' });
        }

        // Fetch deadline to calculate late penalty
        let deadline = null;
        const quiz = await Quiz.findById(submission.assessmentRef);
        if (quiz) {
            deadline = quiz.submissionDeadline;
        } else {
            const assignment = await Assignment.findById(submission.assessmentRef);
            if (assignment) {
                deadline = assignment.dueDate;
            }
        }

        let penaltyAppliedPercent = 0;
        let finalScore = parseFloat(numericalScoreEarned);

        if (deadline) {
            const timePassed = new Date(submission.submissionTimestamp).getTime() - new Date(deadline).getTime();
            if (timePassed > 0) {
                const daysLate = Math.ceil(timePassed / (24 * 60 * 60 * 1000));
                penaltyAppliedPercent = Math.min(daysLate * 10, 30);
                finalScore = parseFloat((numericalScoreEarned * (1 - penaltyAppliedPercent / 100)).toFixed(2));
            }
        }

        submission.numericalScoreEarned = finalScore;
        submission.instructorReviewNotes = instructorReviewNotes || '';
        if (penaltyAppliedPercent > 0) {
            submission.instructorReviewNotes += ` [Late penalty of ${penaltyAppliedPercent}% applied. Original score: ${numericalScoreEarned}]`;
        }
        submission.gradingTimestamp = Date.now();
        submission.isGraded = true;
        await submission.save();

        res.status(200).json({ success: true, message: 'Submission graded successfully.', data: submission });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all grades for the logged-in student
// @route   GET /api/grades/my-grades
// @access  Private (Student only)
// ─────────────────────────────────────────────
const getStudentGrades = async (req, res, next) => {
    try {
        const grades = await GradeBook.find({ studentRef: req.user.id })
            .populate({ path: 'assessmentRef', select: 'quizTitle courseRef allottedDurationMinutes' })
            .sort({ submissionTimestamp: -1 })
            .lean();

        res.status(200).json({ success: true, count: grades.length, data: grades });
    } catch (err) {
        next(err);
    }
};

module.exports = { submitAssignment, getSubmissionsForCourse, gradeSubmission, getStudentGrades };
