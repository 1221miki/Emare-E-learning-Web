const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { createNotification } = require('./notificationController');

// @desc    Create a new assignment for a course
// @route   POST /api/assignments
// @access  Private (Instructor)
exports.createAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.create({
            ...req.body,
            instructorRef: req.user.id
        });
        res.status(201).json({ success: true, data: assignment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get assignments for a course
// @route   GET /api/assignments/course/:courseId
// @access  Private
exports.getCourseAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseRef: req.params.courseId, isActive: true })
            .sort('dueDate');
        res.status(200).json({ success: true, data: assignments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Submit an assignment (student uploads file)
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
exports.submitAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        // Check if past due
        if (new Date() > new Date(assignment.dueDate)) {
            return res.status(400).json({ success: false, message: 'Assignment submission deadline has passed' });
        }

        const submission = await Submission.create({
            assignmentRef: req.params.id,
            studentRef: req.user.id,
            fileUrl: req.body.fileUrl,
            fileName: req.body.fileName,
            studentNotes: req.body.studentNotes
        });

        // Notify instructor
        await createNotification({
            recipientRef: assignment.instructorRef,
            type: 'assignment',
            title: 'New Assignment Submission',
            message: `A student submitted "${assignment.title}".`,
            link: '/instructor/dashboard'
        });

        res.status(201).json({ success: true, data: submission });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already submitted this assignment' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get all submissions for an assignment (instructor view)
// @route   GET /api/assignments/:id/submissions
// @access  Private (Instructor)
exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ assignmentRef: req.params.id })
            .populate('studentRef', 'fullName accountEmail avatarUrl')
            .sort('-submittedAt');
        res.status(200).json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Grade a submission
// @route   PATCH /api/assignments/submissions/:submissionId/grade
// @access  Private (Instructor)
exports.gradeSubmission = async (req, res) => {
    try {
        const { grade, feedback, status } = req.body;
        const submission = await Submission.findByIdAndUpdate(
            req.params.submissionId,
            { grade, feedback, status: status || 'Graded', gradedAt: Date.now() },
            { new: true }
        );
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

        // Notify the student
        await createNotification({
            recipientRef: submission.studentRef,
            type: 'grade',
            title: 'Assignment Graded',
            message: `Your assignment has been graded: ${grade}/${100}. Status: ${status || 'Graded'}.`,
            link: '/student/assignments'
        });

        res.status(200).json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get my submissions (student)
// @route   GET /api/assignments/my-submissions
// @access  Private (Student)
exports.getMySubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ studentRef: req.user.id })
            .populate('assignmentRef', 'title dueDate maxScore courseRef')
            .sort('-submittedAt');
        res.status(200).json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
