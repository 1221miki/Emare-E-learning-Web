const LiveSession = require('../models/LiveSession');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const generateMeetingCode = (title) => {
    const base = (title || 'emare').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = base.slice(0, 10);
    while (code.length < 10) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    code = code.slice(0, 10);
    return `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7, 10)}`;
};

const generateMeetingLink = (platform, title) => {
    const slug = (title || 'emare-live-session')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 24) || 'emare-live-session';

    switch (platform) {
        case 'Google Meet':
            return `https://meet.google.com/${generateMeetingCode(title)}`;
        case 'Jitsi Meet':
            return `https://meet.jit.si/${slug}`;
        case 'Custom':
            return `https://meet.emarehub.com/${slug}`;
        case 'Zoom':
        default:
            return `https://zoom.us/j/1234567890?pwd=${slug.toUpperCase().replace(/-/g, '').slice(0, 8)}`;
    }
};

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

// @desc    Get live sessions for the current user
// @route   GET /api/live-sessions/me
// @access  Private
exports.getMyLiveSessions = async (req, res) => {
    try {
        let sessions = [];

        if (req.user.assignedRole === 'Student') {
            const enrollments = await Enrollment.find({ studentRef: req.user.id }).select('courseRef');
            const courseIds = enrollments.map(e => e.courseRef).filter(Boolean);
            if (courseIds.length > 0) {
                sessions = await LiveSession.find({ courseRef: { $in: courseIds } })
                    .populate('instructorRef', 'fullName')
                    .sort('startTime');
            }
        } else if (req.user.assignedRole === 'Instructor') {
            sessions = await LiveSession.find({ instructorRef: req.user.id })
                .populate('instructorRef', 'fullName')
                .sort('startTime');
        } else {
            sessions = await LiveSession.find()
                .populate('instructorRef', 'fullName')
                .sort('startTime');
        }

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
        const { title, platform = 'Zoom', meetingLink, ...rest } = req.body;
        const normalizedPlatform = ['Zoom', 'Google Meet', 'Jitsi Meet', 'Custom'].includes(platform) ? platform : 'Zoom';
        const resolvedLink = meetingLink || generateMeetingLink(normalizedPlatform, title);

        const session = await LiveSession.create({
            ...rest,
            title,
            platform: normalizedPlatform,
            meetingLink: resolvedLink,
            instructorRef: req.user.id
        });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Get upcoming live sessions for published courses (public landing page)
// @route   GET /api/live-sessions/upcoming
// @access  Public (optionally flags reservations when logged in)
exports.getUpcomingSessions = async (req, res) => {
    try {
        const now = new Date();
        const sessions = await LiveSession.find({ startTime: { $gte: now } })
            .populate('instructorRef', 'fullName')
            .populate('courseRef', 'courseTitle publicationState')
            .sort('startTime')
            .limit(10);

        const published = sessions
            .filter(s => s.courseRef && ['Published', 'Active'].includes(s.courseRef.publicationState))
            .slice(0, 6);

        const data = published.map(s => {
            const obj = s.toObject();
            const isReserved = req.user
                ? (s.reservations || []).some(r => r.userRef && r.userRef.toString() === req.user.id)
                : false;
            return { ...obj, isReserved };
        });

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Reserve a seat for a live session
// @route   POST /api/live-sessions/:id/reserve
// @access  Private (idempotent — no duplicate reservations)
exports.reserveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Live session not found.' });

        const alreadyReserved = (session.reservations || []).some(r => r.userRef && r.userRef.toString() === req.user.id);
        if (!alreadyReserved) {
            session.reservations = session.reservations || [];
            session.reservations.push({ userRef: req.user.id });
            await session.save();
        }

        const populated = await LiveSession.findById(session._id)
            .populate('instructorRef', 'fullName')
            .populate('courseRef', 'courseTitle');
        res.status(200).json({ success: true, data: { ...populated.toObject(), isReserved: true } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Record attendance for a live session
// @route   PUT /api/live-sessions/:id/attendance
// @access  Private
exports.markLiveSessionAttendance = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        if (req.user.assignedRole === 'Student') {
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: session.courseRef });
            if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        }

        const alreadyMarked = (session.attendance || []).some(entry => entry.userRef && entry.userRef.toString() === req.user.id);
        if (alreadyMarked) {
            return res.status(200).json({ success: true, data: session, message: 'Attendance already recorded.' });
        }

        session.attendance = session.attendance || [];
        session.attendance.push({
            userRef: req.user.id,
            fullName: req.user.fullName || req.user.accountEmail,
            checkedInAt: new Date()
        });

        await session.save();
        res.status(200).json({ success: true, data: session });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
