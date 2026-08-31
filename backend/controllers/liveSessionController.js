const LiveSession = require('../models/LiveSession');
const LiveRecording = require('../models/LiveRecording');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const meetingService = require('../services/meetingService');
const { uploadVideo } = require('../services/bunnyService');

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
        const normalizedPlatform = ['Zoom', 'Jitsi Meet', 'Custom'].includes(platform) ? platform : 'Jitsi Meet';

        let resolvedLink = (meetingLink || '').trim();
        if (!resolvedLink && normalizedPlatform === 'Jitsi Meet') {
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

        if (session.status === 'ended') {
            return res.status(400).json({ success: false, message: 'Session has already ended' });
        }

        session.status = 'ended';
        session.isLive = false;
        session.actualEndTime = new Date();
        session.recordingStatus = 'available';
        await session.save();

        // ── Auto-create & publish recording immediately on session end ────
        // Re-use existing recording if one was already created (e.g. from a
        // previous upload), otherwise create a new one using the meeting link
        // so students can watch the live replay directly.
        let recording = session.recording?.recordingId
            ? await LiveRecording.findById(session.recording.recordingId)
            : null;

        if (!recording) {
            // No file upload needed — use the meeting link as the video URL.
            // The platform (Jitsi/Zoom/etc.) retains the meeting replay at this URL.
            recording = await LiveRecording.create({
                liveSession: session._id,
                course: session.courseRef._id,
                instructor: session.instructorRef._id,
                title: session.title,
                description: session.description || '',
                videoUrl: session.meetingLink,   // replay link = meeting link
                thumbnailUrl: session.courseRef?.thumbnailUrl || '',
                storageProvider: session.meetingProvider || 'other',
                fileName: '',
                fileSize: 0,
                duration: session.durationMinutes ? session.durationMinutes * 60 : 0,
                status: 'available',
                isPublished: true,
                publishedAt: new Date(),
                recordingStartTime: session.actualStartTime,
                recordingEndTime: new Date()
            });

            // Link back to session
            session.recording = {
                recordingId: recording._id,
                recordingUrl: recording.videoUrl,
                thumbnailUrl: recording.thumbnailUrl,
                fileName: '',
                fileSize: 0,
                duration: recording.duration,
                storageProvider: recording.storageProvider,
                uploadStatus: 'completed',
                recordingStartTime: recording.recordingStartTime,
                recordingEndTime: recording.recordingEndTime
            };
            await session.save();
        } else if (!recording.isPublished) {
            // Existing recording — just auto-publish it
            recording.isPublished = true;
            recording.publishedAt = new Date();
            recording.status = 'available';
            await recording.save();
        }

        // Notify enrolled students
        await notifyEnrolledStudents(session.courseRef._id, {
            type: 'event',
            title: 'Live Class Recording Available',
            message: `The recording for "${session.title}" is now available to watch.`,
            link: `/recordings/${recording._id}`,
            metadata: { recordingId: recording._id, courseId: session.courseRef._id, action: 'watch' }
        });

        emitToCourse(session.courseRef._id, 'liveSessionEnded', {
            sessionId: session._id,
            courseId: session.courseRef._id
        });

        emitToCourse(session.courseRef._id, 'recordingPublished', {
            recordingId: recording._id,
            courseId: session.courseRef._id,
            title: recording.title
        });

        res.status(200).json({
            success: true,
            data: session,
            message: 'Live session ended — recording is now available to students.'
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

        if (session.status !== 'live') {
            return res.status(400).json({ success: false, message: 'Can only start recording during a live session' });
        }

        if (session.recordingStatus === 'recording') {
            return res.status(400).json({ success: false, message: 'Recording is already in progress' });
        }

        session.recordingStatus = 'recording';
        session.recording.recordingStartTime = new Date();
        session.recording.uploadStatus = 'pending';
        await session.save();

        res.status(200).json({ success: true, data: session, message: 'Recording started' });
    } catch (err) {
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

        if (session.recordingStatus !== 'recording') {
            return res.status(400).json({ success: false, message: 'No active recording to stop' });
        }

        session.recordingStatus = 'processing';
        session.recording.recordingEndTime = new Date();
        await session.save();

        res.status(200).json({ success: true, data: session, message: 'Recording stopped, processing...' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.uploadRecording = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id).populate('courseRef', 'courseTitle');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        
        if (session.instructorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only the instructor can upload recording' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No recording file provided' });
        }

        session.recording.uploadStatus = 'uploading';
        await session.save();

        const fileName = req.file.originalname || `recording-${session._id}.mp4`;
        const bunnyResult = await uploadVideo(req.file.buffer, fileName, req.file.mimetype || 'video/mp4');

        const recording = await LiveRecording.create({
            liveSession: session._id,
            course: session.courseRef._id,
            instructor: req.user.id,
            title: req.body.title || session.title,
            description: req.body.description || '',
            videoUrl: bunnyResult.embedUrl || bunnyResult.url || bunnyResult.publicUrl,
            thumbnailUrl: bunnyResult.thumbnailUrl || '',
            storageProvider: 'bunny',
            fileName: fileName,
            fileSize: req.file.size,
            duration: 0,
            status: 'available',
            isPublished: true,           // auto-publish immediately on upload
            publishedAt: new Date(),
            recordingStartTime: session.recording.recordingStartTime,
            recordingEndTime: session.recording.recordingEndTime
        });

        session.recording = {
            ...session.recording,
            recordingId: recording._id,
            recordingUrl: recording.videoUrl,
            thumbnailUrl: recording.thumbnailUrl,
            fileName: recording.fileName,
            fileSize: recording.fileSize,
            duration: recording.duration,
            storageProvider: 'bunny',
            uploadStatus: 'completed'
        };
        session.recordingStatus = 'available';
        await session.save();

        // Notify enrolled students that recording is available
        await notifyEnrolledStudents(session.courseRef._id, {
            type: 'event',
            title: 'Recording Available',
            message: `The recording for "${recording.title}" is now available to watch.`,
            link: `/recordings/${recording._id}`,
            metadata: { recordingId: recording._id, courseId: session.courseRef._id, action: 'watch' }
        });

        emitToCourse(session.courseRef._id, 'recordingPublished', {
            recordingId: recording._id,
            courseId: session.courseRef._id,
            title: recording.title
        });

        res.status(201).json({ success: true, data: { session, recording }, message: 'Recording uploaded and published successfully' });
    } catch (err) {
        if (session) {
            session.recording.uploadStatus = 'failed';
            await session.save();
        }
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
            .populate('liveSession', 'title startTime')
            .sort('-createdAt');

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
            .populate('liveSession', 'title startTime')
            .sort('-createdAt');

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

        const allowedUpdates = ['title', 'description', 'thumbnailUrl'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) recording[field] = req.body[field];
        });

        await recording.save();

        if (recording.liveSession) {
            const session = await LiveSession.findById(recording.liveSession);
            if (session && session.recording.recordingId) {
                session.recording.recordingUrl = recording.videoUrl;
                session.recording.thumbnailUrl = recording.thumbnailUrl;
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
            .populate('liveSession', 'title startTime')
            .sort('-createdAt');
        
        res.status(200).json({ success: true, data: recordings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};