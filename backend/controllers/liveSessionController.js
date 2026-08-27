const LiveSession = require('../models/LiveSession');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const meetingService = require('../services/meetingService');

// Jitsi rooms are free and need no account — safe to generate server-side.
const generateJitsiLink = (title) => {
    const slug = `${(title || 'emare-live-session')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 24) || 'emare-live-session'}-${Date.now().toString(36)}`;
    return `https://meet.jit.si/${slug}`;
};

const isValidHttpUrl = (value) => {
    try {
        const u = new URL(String(value).trim());
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
};

const ZOOM_ENV_VARS = ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'];

const missingZoomEnv = () => ZOOM_ENV_VARS.filter((name) => !process.env[name]);

// @desc    Which meeting integrations are configured on this server
// @route   GET /api/live-sessions/integrations/status
// @access  Private/Instructor|Admin
exports.getIntegrationStatus = async (req, res) => {
    try {
        const zoomConfigured = await meetingService.providerConfigured('zoom');
        res.status(200).json({
            success: true,
            data: {
                zoomConfigured,
                zoomMissingEnv: missingZoomEnv()
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Generate a real meeting link for the selected platform
// @route   POST /api/live-sessions/generate-link
// @access  Private/Instructor|Admin
//
// One endpoint for all platforms so frontend and backend agree on what can be
// auto-generated. Never returns fake/placeholder URLs and NEVER substitutes a
// different platform:
//   Jitsi Meet  → always generated (free, no account needed)
//   Zoom        → real Zoom meeting via Server-to-Server OAuth; if the
//                 integration is not configured a detailed configuration error
//                 is returned listing exactly which env vars are missing
//   Custom      → rejected — manual entry only
exports.generateSessionMeetingLink = async (req, res) => {
    try {
        const { platform, title = '', startTime, durationMinutes } = req.body || {};
        const normalizedPlatform = ['Zoom', 'Jitsi Meet', 'Custom'].includes(platform)
            ? platform
            : 'Jitsi Meet';

        if (normalizedPlatform === 'Custom') {
            return res.status(400).json({
                success: false,
                code: 'MANUAL_LINK_REQUIRED',
                message: 'Custom meetings use a manually entered link. Paste any valid meeting URL in the Meeting Link field.'
            });
        }

        if (normalizedPlatform === 'Jitsi Meet') {
            return res.status(200).json({
                success: true,
                data: { url: generateJitsiLink(title), provider: 'jitsi', generated: true }
            });
        }

        // Shared start/end resolution for Zoom.
        let start = null;
        let end = null;
        if (startTime) {
            start = new Date(startTime);
            if (start.toString() === 'Invalid Date') {
                return res.status(400).json({ success: false, code: 'BAD_START_TIME', message: 'Please enter a valid start time before generating a meeting link.' });
            }
            end = new Date(start.getTime() + Math.max(1, Number(durationMinutes) || 60) * 60000);
        }

        if (normalizedPlatform === 'Zoom') {
            if (!await meetingService.providerConfigured('zoom')) {
                const missing = missingZoomEnv();
                return res.status(400).json({
                    success: false,
                    code: 'ZOOM_NOT_CONFIGURED',
                    missing,
                    message: `Zoom is not configured on this server. Missing backend/.env settings: ${missing.join(', ')}. An administrator must add the Zoom Server-to-Server OAuth credentials and restart the server.`
                });
            }
            // allowFallback:false — never silently return a Jitsi URL for Zoom.
            const result = await meetingService.generateMeetingUrl({
                provider: 'zoom',
                title,
                startDate: start ? start.toISOString() : undefined,
                endDate: end ? end.toISOString() : undefined,
                allowFallback: false
            });
            if (!result.url || !/^https:\/\/(us\w*\.)?zoom\.us\//.test(result.url)) {
                throw new Error('Zoom did not return a valid meeting link.');
            }
            return res.status(200).json({
                success: true,
                data: { url: result.url, provider: 'zoom', generated: true }
            });
        }
    } catch (err) {
        if (err.code === 'PROVIDER_NOT_CONFIGURED') {
            const missing = missingZoomEnv();
            return res.status(400).json({ success: false, code: 'ZOOM_NOT_CONFIGURED', missing, message: `Zoom is not configured on this server. Missing backend/.env settings: ${missing.join(', ')}.` });
        }
        console.error('Live session meeting link generation error:', err && err.message);
        return res.status(502).json({
            success: false,
            message: (err && err.userMessage) ||
                'The meeting provider failed to create a link. Please try again, or paste an existing meeting link manually.'
        });
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
        const { title, platform = 'Jitsi Meet', meetingLink, ...rest } = req.body;
        const normalizedPlatform = ['Zoom', 'Jitsi Meet', 'Custom'].includes(platform) ? platform : 'Jitsi Meet';

        // Resolve the meeting link — NEVER invent placeholder URLs in production.
        let resolvedLink = (meetingLink || '').trim();
        if (!resolvedLink && normalizedPlatform === 'Jitsi Meet') {
            // Jitsi rooms are free and require no external account
            resolvedLink = generateJitsiLink(title);
        }
        if (!resolvedLink) {
            return res.status(400).json({
                success: false,
                message: `A meeting link is required for ${normalizedPlatform} sessions. Generate one automatically (Jitsi) or paste a valid URL.`
            });
        }
        if (!isValidHttpUrl(resolvedLink)) {
            return res.status(400).json({
                success: false,
                message: 'The meeting link must be a valid http(s) URL.'
            });
        }

        const PLATFORM_TO_PROVIDER = {
            'Zoom': 'zoom',
            'Jitsi Meet': 'jitsi',
            'Custom': 'custom'
        };

        const session = await LiveSession.create({
            ...rest,
            title,
            platform: normalizedPlatform,
            meetingLink: resolvedLink,
            meetingProvider: rest.meetingProvider || PLATFORM_TO_PROVIDER[normalizedPlatform],
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
        
        await session.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
