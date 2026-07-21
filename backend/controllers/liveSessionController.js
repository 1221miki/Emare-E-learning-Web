const LiveSession = require('../models/LiveSession');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// @desc    Get live sessions for a course
// @route   GET /api/live-sessions/course/:courseId
// @access  Private
exports.getCourseSessions = async (req, res) => {
    try {
        // Simple authorization check for student enrolled
        if (req.user.assignedRole === 'Student') {
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: req.params.courseId });
            if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        }

        const sessions = await LiveSession.find({ courseRef: req.params.courseId })
            .populate('instructorRef', 'fullName')
            .sort('startTime');
            
        res.status(200).json({ success: true, data: sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create a live session
// @route   POST /api/live-sessions
// @access  Private/Instructor
exports.createLiveSession = async (req, res) => {
    try {
        req.body.instructorRef = req.user.id;
        const session = await LiveSession.create(req.body);
        res.status(201).json({ success: true, data: session });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Delete a live session
// @route   DELETE /api/live-sessions/:id
// @access  Private/Instructor
exports.deleteLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        
        await session.remove();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
