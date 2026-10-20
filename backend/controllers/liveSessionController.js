const LiveSession = require('../models/LiveSession');
const LiveRecording = require('../models/LiveRecording');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const meetingService = require('../services/meetingService');
const { uploadVideo } = require('../services/localStorageService');
const cloudinaryService = require('../services/cloudinaryService');

const generateJitsiLink = (title) => {
    const slug = `${(title || 'emare-live-session')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 24) || 'emare-live-session'}-${Date.now().toString(36)}`;
    return `https://meet.jit.si/${slug}`;
};

const generateGoogleMeetLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const r = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
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

const notifyEnrolledStudents = async (courseId, notificationData) => {
    try {
        const enrollments = await Enrollment.find({ courseRef: courseId }).select('studentRef');
        const studentIds = enrollments.map(e => e.studentRef);
        
        if (studentIds.length > 0) {
            const notifications = studentIds.map(studentId => ({
                recipientRef: studentId,
                userRef: studentId,
                ...notificationData
            }));
            await Notification.insertMany(notifications);
        }
        
        return studentIds;
    } catch (err) {
        console.error('Failed to notify students:', err);
        return [];
    }
};

const getIO = () => {
    try {
        return require('../server').io;
    } catch {
        return null;
    }
};

const emitToCourse = (courseId, event, data) => {
    const io = getIO();
    if (io) {
        io.to(`course:${courseId}`).emit(event, data);
    }
};

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

exports.generateSessionMeetingLink = async (req, res) => {
    try {
        const { platform, title = '', startTime, durationMinutes } = req.body || {};
        const normalizedPlatform = ['Zoom', 'Google Meet', 'Jitsi Meet', 'Custom'].includes(platform)
            ? platform
            : 'Jitsi Meet';

        if (normalizedPlatform === 'Custom') {
            return res.status(400).json({
                success: false,
                code: 'MANUAL_LINK_REQUIRED',
                message: 'Custom meetings use a manually entered link. Paste any valid meeting URL in the Meeting Link field.'
            });
        }

        if (normalizedPlatform === 'Google Meet') {
            return res.status(200).json({
                success: true,
                data: { url: generateGoogleMeetLink(), provider: 'googleMeet', generated: true }
            });
        }

        if (normalizedPlatform === 'Jitsi Meet') {
            return res.status(200).json({
                success: true,
                data: { url: generateJitsiLink(title), provider: 'jitsi', generated: true }
            });
        }

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
            try {
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
            } catch (zoomErr) {
                // Handle Zoom API errors specifically - return 503 with clear message instead of 502
                console.error('Zoom API error:', zoomErr?.message);
                const isConfigError = zoomErr?.code === 'PROVIDER_NOT_CONFIGURED' || zoomErr?.message?.includes('not configured') || zoomErr?.message?.includes('credentials');
                if (isConfigError) {
                    const missing = missingZoomEnv();
                    return res.status(400).json({ 
                        success: false, 
                        code: 'ZOOM_NOT_CONFIGURED', 
                        missing, 
                        message: `Zoom is not configured on this server. Missing backend/.env settings: ${missing.join(', ')}.` 
                    });
                }
                // Network/API error - return 503 (service unavailable) with clear message
                return res.status(503).json({
                    success: false,
                    code: 'ZOOM_API_ERROR',
                    message: 'Zoom service is temporarily unavailable. Please try again later, or use Jitsi Meet instead.'
                });
            }
        }
    } catch (err) {
        if (err.code === 'PROVIDER_NOT_CONFIGURED') {
            const missing = missingZoomEnv();
            return res.status(400).json({ success: false, code: 'ZOOM_NOT_CONFIGURED', missing, message: `Zoom is not configured on this server. Missing backend/.env settings: ${missing.join(', ')}.` });
        }
        console.error('Live session meeting link generation error:', err && err.message);
        return res.status(500).json({
            success: false,
            message: (err && err.userMessage) ||
                'The meeting provider failed to create a link. Please try again, or paste an existing meeting link manually.'
        });
    }
};

exports.getCourseSessions = async (req, res) => {
    try {
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

exports.getMyLiveSessions = async (req, res) => {
    try {
        let sessions = [];

        if (req.user.assignedRole === 'Student') {
            const enrollments = await Enrollment.find({ studentRef: req.user.id }).select('courseRef');
            const courseIds = enrollments.map(e => e.courseRef).filter(Boolean);
            if (courseIds.length > 0) {
                sessions = await LiveSession.find({ courseRef: { $in: courseIds } })
                    .populate('instructorRef', 'fullName')
                    .populate('courseRef', 'courseTitle')
                    .sort('startTime');
            }
        } else if (req.user.assignedRole === 'Instructor') {
            sessions = await LiveSession.find({ instructorRef: req.user.id })
                .populate('instructorRef', 'fullName')
                .populate('courseRef', 'courseTitle')
                .sort('startTime');
        } else {
            sessions = await LiveSession.find()
                .populate('instructorRef', 'fullName')
                .populate('courseRef', 'courseTitle')
                .sort('startTime');
        }

        res.status(200).json({ success: true, data: sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getUpcomingSessions = async (req, res) => {
    try {
        const now = new Date();
        const sessions = await LiveSession.find({ startTime: { $gte: now }, status: { $ne: 'cancelled' } })
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

exports.getStudentUpcomingSessions = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: req.user.id }).select('courseRef');
        const courseIds = enrollments.map(e => e.courseRef).filter(Boolean);
        const now = new Date();

        const sessions = await LiveSession.find({ 
            courseRef: { $in: courseIds }, 
            status: 'upcoming',
            startTime: { $gte: now }
        })
            .populate('instructorRef', 'fullName')
            .populate('courseRef', 'courseTitle')
            .sort('startTime');

        res.status(200).json({ success: true, data: sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStudentLiveSessions = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: req.user.id }).select('courseRef');
        const courseIds = enrollments.map(e => e.courseRef).filter(Boolean);
        const now = new Date();

        const sessions = await LiveSession.find({ 
            courseRef: { $in: courseIds }, 
            status: 'live'
        })
            .populate('instructorRef', 'fullName')
            .populate('courseRef', 'courseTitle')
            .sort('startTime');

        res.status(200).json({ success: true, data: sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createLiveSession = async (req, res) => {
    try {
        const { title, platform = 'Jitsi Meet', meetingLink, ...rest } = req.body;
        const normalizedPlatform = ['Zoom', 'Google Meet', 'Jitsi Meet', 'Custom'].includes(platform) ? platform : 'Jitsi Meet';

        let resolvedLink = (meetingLink || '').trim();
        if (!resolvedLink && normalizedPlatform === 'Jitsi Meet') {
            resolvedLink = generateJitsiLink(title);
        } else if (!resolvedLink && normalizedPlatform === 'Google Meet') {
            resolvedLink = generateGoogleMeetLink();
        }
        if (!resolvedLink) {
            return res.status(400).json({
                success: false,
                message: `A meeting link is required for ${normalizedPlatform} sessions. Generate one automatically or paste a valid URL.`
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
            'Google Meet': 'googleMeet',
            'Jitsi Meet': 'jitsi',
            'Custom': 'custom'
        };

        const session = await LiveSession.create({
            ...rest,
            title,
            platform: normalizedPlatform,
            meetingLink: resolvedLink,
            meetingProvider: rest.meetingProvider || PLATFORM_TO_PROVIDER[normalizedPlatform],
            instructorRef: req.user.id,
            status: 'upcoming',
            isLive: false,
            recordingStatus: 'not_started'
        });

        await notifyEnrolledStudents(session.courseRef, {
            type: 'event',
            title: 'New Live Session Scheduled',
            message: `A new live session "${session.title}" has been scheduled for your course.`,
            link: `/live-sessions?course=${session.courseRef}`,
            metadata: { liveSessionId: session._id, courseId: session.courseRef }
        });

        emitToCourse(session.courseRef, 'liveSessionCreated', { session });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.getLiveSessionById = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id)
            .populate('instructorRef', 'fullName avatarUrl')
            .populate('courseRef', 'courseTitle');
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Live session not found' });
        }

        if (req.user.assignedRole === 'Student') {
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: session.courseRef });
            if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        } else if (req.user.assignedRole === 'Instructor') {
            if (session.instructorRef._id.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        res.status(200).json({ success: true, data: session });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const allowedUpdates = ['title', 'description', 'startTime', 'durationMinutes', 'platform', 'meetingLink', 'meetingPassword', 'meetingProvider', 'meetingProviderId'];
        const updates = {};
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (updates.meetingLink && !isValidHttpUrl(updates.meetingLink)) {
            return res.status(400).json({ success: false, message: 'Invalid meeting link URL' });
        }

        Object.assign(session, updates);
        await session.save();

        emitToCourse(session.courseRef, 'liveSessionUpdated', { session });

        res.status(200).json({ success: true, data: session });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const courseId = session.courseRef;
        await session.deleteOne();

        await LiveRecording.deleteMany({ liveSession: session._id });

        emitToCourse(courseId, 'liveSessionDeleted', { sessionId: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

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

exports.startLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle').populate('instructorRef', 'fullName');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef._id.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only the instructor can start the meeting' });
        }

        if (session.status === 'live') {
            return res.status(400).json({ success: false, message: 'Session is already live' });
        }

        if (session.status === 'ended') {
            return res.status(400).json({ success: false, message: 'Session has already ended' });
        }

        session.status = 'live';
        session.isLive = true;
        session.actualStartTime = new Date();
        await session.save();

        await notifyEnrolledStudents(session.courseRef._id, {
            type: 'event',
            title: 'Live Class Started',
            message: `The live session "${session.title}" has started! Join now.`,
            link: `/live-sessions/${session._id}/join`,
            metadata: { liveSessionId: session._id, courseId: session.courseRef._id, action: 'join' }
        });

        emitToCourse(session.courseRef._id, 'liveSessionStarted', { 
            sessionId: session._id, 
            title: session.title,
            meetingLink: session.meetingLink,
            courseId: session.courseRef._id
        });

        res.status(200).json({ success: true, data: session, message: 'Live session started successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.endLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id)
            .populate('courseRef', 'courseTitle')
            .populate('instructorRef', 'fullName');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        if (session.instructorRef._id.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only the instructor can end the meeting' });
        }

        // If already ended, return existing session with recording (handle duplicate requests safely)
        if (session.status === 'ended') {
            let recording = session.recording?.recordingId
                ? await LiveRecording.findById(session.recording.recordingId)
                : null;
            
            return res.status(200).json({
                success: true,
                data: session,
                recording: recording || null,
                message: 'Session already ended.'
            });
        }

        const wasRecording = session.recordingStatus === 'recording';

        session.status = 'ended';
        session.isLive = false;
        session.actualEndTime = new Date();
        session.recordingStatus = 'processing';
        await session.save();

        // ── Auto-create / update recording on session end ─────────────
        let recording = session.recording?.recordingId
            ? await LiveRecording.findById(session.recording.recordingId)
            : null;

        if (!recording) {
            // Use the session's meeting link as the initial recording URL
            // (Jitsi, Zoom, Google Meet links serve as the recording source)
            const initialVideoUrl = session.meetingLink || '';
            const initialStatus = initialVideoUrl ? 'available' : 'processing';

            recording = await LiveRecording.create({
                liveSession: session._id,
                course: session.courseRef._id,
                instructor: session.instructorRef._id,
                title: session.title,
                description: session.description || '',
                videoUrl: initialVideoUrl,
                thumbnailUrl: session.courseRef?.thumbnailUrl || '',
                storageProvider: initialVideoUrl ? 'other' : 'local',
                fileName: '',
                fileSize: 0,
                duration: session.durationMinutes ? session.durationMinutes * 60 : 0,
                status: initialStatus,
                isPublished: true,
                publishedAt: new Date(),
                recordingStartTime: session.actualStartTime,
                recordingEndTime: new Date()
            });

            session.recording = {
                recordingId: recording._id,
                recordingUrl: initialVideoUrl,
                thumbnailUrl: recording.thumbnailUrl,
                fileName: '',
                fileSize: 0,
                duration: recording.duration,
                storageProvider: initialVideoUrl ? 'other' : 'local',
                uploadStatus: initialVideoUrl ? 'completed' : 'pending',
                recordingStartTime: recording.recordingStartTime,
                recordingEndTime: recording.recordingEndTime
            };
            await session.save();
        }

        // Auto-publish if recording already has a video file
        if (recording.videoUrl && recording.status === 'available' && !recording.isPublished) {
            recording.isPublished = true;
            recording.publishedAt = new Date();
            await recording.save();
            session.recordingStatus = 'available';
            await session.save();
        }

        // Notify enrolled students
        await notifyEnrolledStudents(session.courseRef._id, {
            type: 'event',
            title: 'Live Session Ended',
            message: `The session "${session.title}" has ended. The recording is now available.`,
            link: `/student/dashboard?tab=live`,
            metadata: { sessionId: session._id, courseId: session.courseRef._id, action: 'session-ended' }
        });

        emitToCourse(session.courseRef._id, 'liveSessionEnded', {
            sessionId: session._id,
            courseId: session.courseRef._id
        });

        res.status(200).json({
            success: true,
            data: session,
            recording: recording,
            message: 'Live session ended.'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.joinLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        if (req.user.assignedRole === 'Student') {
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: session.courseRef });
            if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
            
            if (session.status !== 'live') {
                return res.status(400).json({ success: false, message: 'Live session is not currently active' });
            }
        }

        const alreadyMarked = (session.attendance || []).some(entry => entry.userRef && entry.userRef.toString() === req.user.id);
        if (!alreadyMarked) {
            session.attendance = session.attendance || [];
            session.attendance.push({
                userRef: req.user.id,
                fullName: req.user.fullName || req.user.accountEmail,
                checkedInAt: new Date()
            });
            await session.save();
        }

        res.status(200).json({ 
            success: true, 
            data: { 
                meetingLink: session.meetingLink,
                meetingPassword: session.meetingPassword,
                platform: session.platform
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.startRecording = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only the instructor can start recording' });
        }

        const now = new Date();
        session.recordingStatus = 'recording';
        if (!session.recording) session.recording = {};
        session.recording.recordingStartTime = now;
        session.recording.uploadStatus = 'pending';

        // Create or update LiveRecording entry in MongoDB Atlas
        let recording = session.recording?.recordingId
            ? await LiveRecording.findById(session.recording.recordingId)
            : null;

        if (!recording) {
            recording = await LiveRecording.create({
                liveSession: session._id,
                course: session.courseRef._id,
                instructor: session.instructorRef,
                title: session.title,
                description: session.description || '',
                videoUrl: '',
                thumbnailUrl: session.courseRef?.thumbnailUrl || '',
                status: 'recording',
                isPublished: false,
                recordingStartTime: now
            });
            session.recording.recordingId = recording._id;
        } else {
            recording.status = 'recording';
            recording.recordingStartTime = now;
            await recording.save();
        }

        await session.save();

        emitToCourse(session.courseRef._id, 'recordingStatusChanged', {
            sessionId: session._id,
            status: 'recording'
        });

        res.status(200).json({ success: true, data: { session, recording }, message: 'Recording started' });
    } catch (err) {
        console.error('[startRecording] Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.stopRecording = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only the instructor can stop recording' });
        }

        const now = new Date();
        session.recordingStatus = 'processing';
        if (!session.recording) session.recording = {};
        session.recording.recordingEndTime = now;

        let recording = session.recording?.recordingId
            ? await LiveRecording.findById(session.recording.recordingId)
            : null;

        if (recording) {
            recording.status = 'processing';
            recording.recordingEndTime = now;
            await recording.save();
        }

        await session.save();

        emitToCourse(session.courseRef._id, 'recordingStatusChanged', {
            sessionId: session._id,
            status: 'processing'
        });

        res.status(200).json({ success: true, data: { session, recording }, message: 'Recording stopped, processing...' });
    } catch (err) {
        console.error('[stopRecording] Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.uploadRecording = async (req, res) => {
    let session = null;
    try {
        session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only the instructor can upload recording' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No recording file provided' });
        }

        // Set status to Processing while uploading to cloud storage
        session.recordingStatus = 'processing';
        if (!session.recording) session.recording = {};
        session.recording.uploadStatus = 'uploading';
        await session.save();

        const fileName = req.file.originalname || `recording-${session._id}-${Date.now()}.mp4`;
        const mimeType = req.file.mimetype || 'video/mp4';

        // 1. Upload to Cloud Storage (Cloudinary)
        let cloudResult = null;
        try {
            console.log(`[Recording] Uploading ${req.file.size} bytes video to Cloudinary cloud storage...`);
            const cRes = await cloudinaryService.uploadBuffer(req.file.buffer, 'live-recordings', 'video');
            if (cRes && (cRes.secure_url || cRes.url)) {
                cloudResult = {
                    url: cRes.secure_url || cRes.url,
                    storageProvider: 'cloudinary',
                    fileName: cRes.original_filename || fileName,
                    size: cRes.bytes || req.file.size,
                    duration: Math.round(cRes.duration || Number(req.body.duration) || 0)
                };
                console.log(`[Recording] Uploaded to Cloudinary successfully: ${cloudResult.url}`);
            }
        } catch (cloudErr) {
            console.warn('[Recording] Cloudinary upload notice:', cloudErr.message);
        }

        // 2. Fallback to local storage if Cloudinary upload was not completed
        if (!cloudResult) {
            const localResult = await uploadVideo(req.file.buffer, fileName, mimeType);
            cloudResult = {
                url: localResult.url,
                storageProvider: 'local',
                fileName: localResult.fileName || fileName,
                size: localResult.size || req.file.size,
                duration: Math.round(Number(req.body.duration) || 0)
            };
        }

        const durationSec = cloudResult.duration || Math.round(Number(req.body.duration) || 0) ||
            (session.recording?.recordingStartTime && session.recording?.recordingEndTime
                ? Math.round((new Date(session.recording.recordingEndTime) - new Date(session.recording.recordingStartTime)) / 1000)
                : (session.durationMinutes ? session.durationMinutes * 60 : 0));

        // 3. Store recording details in MongoDB Atlas
        let recording = session.recording?.recordingId
            ? await LiveRecording.findById(session.recording.recordingId)
            : null;

        if (recording) {
            recording.videoUrl = cloudResult.url;
            recording.fileName = cloudResult.fileName;
            recording.fileSize = cloudResult.size;
            recording.storageProvider = cloudResult.storageProvider;
            recording.duration = durationSec;
            recording.status = 'ready';
            recording.isPublished = true;
            recording.publishedAt = new Date();
            if (req.body.title) recording.title = req.body.title;
            if (req.body.description) recording.description = req.body.description;
            await recording.save();
        } else {
            recording = await LiveRecording.create({
                liveSession: session._id,
                course: session.courseRef._id,
                instructor: req.user.id,
                title: req.body.title || session.title,
                description: req.body.description || session.description || '',
                videoUrl: cloudResult.url,
                thumbnailUrl: session.courseRef?.thumbnailUrl || '',
                storageProvider: cloudResult.storageProvider,
                fileName: cloudResult.fileName,
                fileSize: cloudResult.size,
                duration: durationSec,
                status: 'ready',
                isPublished: true,
                publishedAt: new Date(),
                recordingStartTime: session.recording?.recordingStartTime || session.actualStartTime,
                recordingEndTime: session.recording?.recordingEndTime || new Date()
            });
        }

        // 4. Update LiveSession
        session.recording = {
            ...session.recording,
            recordingId: recording._id,
            recordingUrl: cloudResult.url,
            thumbnailUrl: recording.thumbnailUrl || '',
            fileName: cloudResult.fileName,
            fileSize: cloudResult.size,
            duration: durationSec,
            storageProvider: cloudResult.storageProvider,
            uploadStatus: 'completed'
        };
        session.recordingStatus = 'ready';
        await session.save();

        // 5. Notify enrolled students
        await notifyEnrolledStudents(session.courseRef._id, {
            type: 'event',
            title: 'Recording Ready',
            message: `The recording for "${recording.title}" is now available to watch.`,
            link: `/student/dashboard?tab=live`,
            metadata: { recordingId: recording._id, courseId: session.courseRef._id, action: 'watch' }
        });

        emitToCourse(session.courseRef._id, 'recordingPublished', {
            recordingId: recording._id,
            courseId: session.courseRef._id,
            title: recording.title,
            status: 'ready',
            videoUrl: cloudResult.url
        });

        res.status(200).json({ 
            success: true, 
            data: { session, recording }, 
            message: 'Recording saved to cloud storage and marked Ready' 
        });
    } catch (err) {
        console.error('[uploadRecording] Error:', err);
        if (session) {
            session.recordingStatus = 'failed';
            if (!session.recording) session.recording = {};
            session.recording.uploadStatus = 'failed';
            await session.save().catch(() => {});

            if (session.recording?.recordingId) {
                await LiveRecording.updateOne(
                    { _id: session.recording.recordingId },
                    { status: 'failed' }
                ).catch(() => {});
            }
        }
        res.status(500).json({ success: false, message: err.message || 'Failed to save recording' });
    }
};

exports.getRecordingById = async (req, res) => {
    try {
        const recording = await LiveRecording.findById(req.params.id)
            .populate('instructor', 'fullName avatarUrl')
            .populate('course', 'courseTitle')
            .populate('liveSession', 'title startTime meetingLink platform recordingStatus');

        if (!recording) {
            return res.status(404).json({ success: false, message: 'Recording not found' });
        }

        // Access control: Only enrolled students can watch recordings securely
        if (req.user.assignedRole === 'Student') {
            const courseId = recording.course?._id || recording.course;
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: courseId });
            if (!isEnrolled) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'You must be enrolled in this course to watch this recording.' 
                });
            }

            if (!recording.isPublished && recording.status !== 'ready' && recording.status !== 'available') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'This recording is not yet ready or published.' 
                });
            }
        }

        res.status(200).json({ success: true, data: recording });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getSessionRecording = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        if (req.user.assignedRole === 'Student') {
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: session.courseRef });
            if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        }

        if (!session.recording.recordingId) {
            return res.status(404).json({ success: false, message: 'No recording found for this session' });
        }

        const recording = await LiveRecording.findById(session.recording.recordingId);
        if (!recording) {
            return res.status(404).json({ success: false, message: 'Recording not found' });
        }

        if (req.user.assignedRole === 'Student' && !recording.isPublished) {
            return res.status(403).json({ success: false, message: 'Recording is not published yet' });
        }

        res.status(200).json({ success: true, data: recording });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRecordingsByCourse = async (req, res) => {
    try {
        if (req.user.assignedRole === 'Student') {
            const isEnrolled = await Enrollment.findOne({ studentRef: req.user.id, courseRef: req.params.courseId });
            if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        }

        const query = { course: req.params.courseId };
        if (req.user.assignedRole === 'Student') {
            query.isPublished = true;
        }

        const recordings = await LiveRecording.find(query)
            .populate('instructor', 'fullName avatarUrl')
            .populate('liveSession', 'title startTime meetingLink platform')
            .sort('-createdAt');

        // Self-heal: if videoUrl is missing but liveSession has meetingLink, backfill it
        await Promise.all(recordings.map(async (rec) => {
            if (!rec.videoUrl && rec.liveSession?.meetingLink) {
                rec.videoUrl = rec.liveSession.meetingLink;
                rec.status = 'available';
                await LiveRecording.updateOne({ _id: rec._id }, { videoUrl: rec.videoUrl, status: 'available' }).catch(() => {});
            }
        }));

        res.status(200).json({ success: true, data: recordings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStudentRecordings = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: req.user.id }).select('courseRef');
        const courseIds = enrollments.map(e => e.courseRef).filter(Boolean);

        const recordings = await LiveRecording.find({ 
            course: { $in: courseIds },
            isPublished: true
        })
            .populate('instructor', 'fullName avatarUrl')
            .populate('course', 'courseTitle')
            .populate('liveSession', 'title startTime meetingLink platform')
            .sort('-createdAt');

        // Self-heal: if videoUrl is missing but liveSession has meetingLink, backfill it
        await Promise.all(recordings.map(async (rec) => {
            if (!rec.videoUrl && rec.liveSession?.meetingLink) {
                rec.videoUrl = rec.liveSession.meetingLink;
                rec.status = 'available';
                await LiveRecording.updateOne({ _id: rec._id }, { videoUrl: rec.videoUrl, status: 'available' }).catch(() => {});
            }
        }));

        res.status(200).json({ success: true, data: recordings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateRecording = async (req, res) => {
    try {
        const recording = await LiveRecording.findById(req.params.id).populate('liveSession');
        if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
        
        if (recording.instructor.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const allowedUpdates = ['title', 'description', 'thumbnailUrl', 'videoUrl', 'status'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) recording[field] = req.body[field];
        });

        if (req.body.videoUrl) {
            recording.status = 'available';
            recording.isPublished = true;
            if (!recording.publishedAt) recording.publishedAt = new Date();
        }

        await recording.save();

        if (recording.liveSession) {
            const session = await LiveSession.findById(recording.liveSession);
            if (session) {
                if (session.recording) {
                    session.recording.recordingUrl = recording.videoUrl;
                    session.recording.thumbnailUrl = recording.thumbnailUrl;
                    session.recording.uploadStatus = 'completed';
                }
                session.recordingStatus = 'available';
                await session.save();
            }
        }

        res.status(200).json({ success: true, data: recording });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.publishRecording = async (req, res) => {
    try {
        const recording = await LiveRecording.findById(req.params.id).populate('course', 'courseTitle').populate('liveSession');
        if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
        
        if (recording.instructor.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (recording.status !== 'available') {
            return res.status(400).json({ success: false, message: 'Recording is not ready to publish' });
        }

        recording.isPublished = true;
        recording.publishedAt = new Date();
        recording.status = 'available';
        await recording.save();

        if (recording.liveSession) {
            const session = await LiveSession.findById(recording.liveSession);
            if (session) {
                session.recordingStatus = 'available';
                await session.save();
            }
        }

        await notifyEnrolledStudents(recording.course._id, {
            type: 'event',
            title: 'New Recording Available',
            message: `The recording for "${recording.title}" is now available to watch.`,
            link: `/recordings/${recording._id}`,
            metadata: { recordingId: recording._id, courseId: recording.course._id, action: 'watch' }
        });

        emitToCourse(recording.course._id, 'recordingPublished', { 
            recordingId: recording._id,
            courseId: recording.course._id,
            title: recording.title
        });

        res.status(200).json({ success: true, data: recording, message: 'Recording published successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.unpublishRecording = async (req, res) => {
    try {
        const recording = await LiveRecording.findById(req.params.id).populate('course', 'courseTitle');
        if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
        
        if (recording.instructor.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        recording.isPublished = false;
        recording.publishedAt = null;
        await recording.save();

        emitToCourse(recording.course._id, 'recordingUnpublished', { 
            recordingId: recording._id,
            courseId: recording.course._id
        });

        res.status(200).json({ success: true, data: recording, message: 'Recording unpublished' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteRecording = async (req, res) => {
    try {
        const recording = await LiveRecording.findById(req.params.id).populate('course', 'courseTitle').populate('liveSession');
        if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
        
        if (recording.instructor.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const courseId = recording.course._id;
        const sessionId = recording.liveSession?._id;

        await recording.deleteOne();

        if (sessionId) {
            const session = await LiveSession.findById(sessionId);
            if (session) {
                session.recording = {
                    recordingId: null,
                    recordingUrl: '',
                    thumbnailUrl: '',
                    fileName: '',
                    fileSize: 0,
                    duration: 0,
                    recordingStartTime: null,
                    recordingEndTime: null,
                    storageProvider: '',
                    uploadStatus: 'pending'
                };
                session.recordingStatus = 'not_started';
                await session.save();
            }
        }

        emitToCourse(courseId, 'recordingDeleted', { 
            recordingId: req.params.id,
            courseId: courseId
        });

        res.status(200).json({ success: true, data: {}, message: 'Recording deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getInstructorSessions = async (req, res) => {
    try {
        const sessions = await LiveSession.find({ instructorRef: req.user.id })
            .populate('courseRef', 'courseTitle')
            .sort('-createdAt');
        
        res.status(200).json({ success: true, data: sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getInstructorRecordings = async (req, res) => {
    try {
        const recordings = await LiveRecording.find({ instructor: req.user.id })
            .populate('course', 'courseTitle')
            .populate('liveSession', 'title startTime meetingLink platform')
            .sort('-createdAt');
        
        // Self-heal: if videoUrl is missing but liveSession has meetingLink, backfill it
        await Promise.all(recordings.map(async (rec) => {
            if (!rec.videoUrl && rec.liveSession?.meetingLink) {
                rec.videoUrl = rec.liveSession.meetingLink;
                rec.status = 'available';
                await LiveRecording.updateOne({ _id: rec._id }, { videoUrl: rec.videoUrl, status: 'available' }).catch(() => {});
            }
        }));

        res.status(200).json({ success: true, data: recordings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};