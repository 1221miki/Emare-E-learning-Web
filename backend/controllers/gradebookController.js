const GradeBook = require('../models/GradeBook');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');

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

        // No assignment submission deadline: students complete assignments at
        // their own pace once their lesson is reached (enforced by lesson sequence).

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
// @access  Private (Instructor & Admin)
// ─────────────────────────────────────────────
const getSubmissionsForCourse = async (req, res, next) => {
    try {
        // Verify the instructor owns or is assigned to this course (or Admin)
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isOwner = course.creatorRef && course.creatorRef.toString() === req.user.id;
        const isAssigned = course.assignedInstructorRef && course.assignedInstructorRef.toString() === req.user.id;
        const isAdmin = req.user.assignedRole === 'Admin';

        if (!isOwner && !isAssigned && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not teach this course.' });
        }

        // 1. Retrieve all GradeBook submissions linked to this course
        const submissions = await GradeBook.find()
            .populate({ path: 'studentRef', select: 'fullName accountEmail' })
            .populate({ path: 'assessmentRef', match: { courseRef: req.params.courseId }, select: 'quizTitle courseRef' })
            .sort({ submissionTimestamp: -1 })
            .lean();

        const gbFiltered = submissions.filter(s => s.assessmentRef !== null);

        // 2. Retrieve assignment submissions for this course
        const assignments = await Assignment.find({ courseRef: req.params.courseId }).select('_id title maxScore passingScore').lean();
        const assignmentIds = assignments.map(a => a._id);
        const assignMap = new Map(assignments.map(a => [a._id.toString(), a]));

        let mappedAssignSubs = [];
        if (assignmentIds.length > 0) {
            const assignSubs = await Submission.find({ assignmentRef: { $in: assignmentIds } })
                .populate({ path: 'studentRef', select: 'fullName accountEmail' })
                .sort({ submittedAt: -1 })
                .lean();

            mappedAssignSubs = assignSubs.map(s => {
                const assign = assignMap.get(s.assignmentRef.toString()) || {};
                return {
                    _id: s._id,
                    studentRef: s.studentRef,
                    assessmentRef: {
                        _id: s.assignmentRef,
                        quizTitle: assign.title || 'Assignment',
                        courseRef: req.params.courseId
                    },
                    numericalScoreEarned: typeof s.grade === 'number' ? s.grade : 0,
                    isGraded: s.status === 'Graded' || typeof s.grade === 'number',
                    submissionTimestamp: s.submittedAt || s.createdAt,
                    gradingTimestamp: s.gradedAt || s.updatedAt,
                    passingScore: assign.passingScore || 60
                };
            });
        }

        // 3. Retrieve InVideo Quiz attempts for this course
        const inVideoAttempts = await InVideoQuizAttempt.find({ courseRef: req.params.courseId })
            .populate({ path: 'studentRef', select: 'fullName accountEmail' })
            .sort({ createdAt: -1 })
            .lean();

        const mappedQuizSubs = inVideoAttempts.map(q => ({
            _id: q._id,
            studentRef: q.studentRef,
            assessmentRef: {
                _id: q.lessonId,
                quizTitle: `Checkpoint Quiz (${q.checkpointId})`,
                courseRef: req.params.courseId
            },
            numericalScoreEarned: q.scorePercent || 0,
            isGraded: true,
            submissionTimestamp: q.createdAt,
            gradingTimestamp: q.createdAt,
            passingScore: 60
        }));

        const allResults = [...gbFiltered, ...mappedAssignSubs, ...mappedQuizSubs];

        res.status(200).json({ success: true, count: allResults.length, data: allResults });
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

        // No late penalty: assignments no longer have submission deadlines. Students
        // complete and submit at their own pace once their lesson is reached.

        const finalScore = parseFloat(numericalScoreEarned);

        submission.numericalScoreEarned = finalScore;
        submission.instructorReviewNotes = instructorReviewNotes || '';
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
