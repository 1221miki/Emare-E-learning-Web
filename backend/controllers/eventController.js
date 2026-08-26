const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { validateEvent } = require('../utils/eventValidation');
const { broadcastEventNotification } = require('./notificationController');
const { resolveMeetingUrl, isValidMeetingUrl, isValidGoogleMeetUrl, generateMeetingUrl, missingEnvMessage, normalizeProvider, mergeMeetingInfo, deleteProviderResource, validateInvitees } = require('../services/meetingService');
const googleMeetService = require('../services/googleMeetService');

const EVENT_CATEGORIES = [
    'Masterclass',
    'Workshop',
    'Live Stream',
    'Webinar',
    'Bootcamp',
    'Academic',
    'Holiday',
    'Training'
];

const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

const ensureUniqueSlug = async (slug) => {
    if (!slug) return slug;
    let candidate = slug;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Event.exists({ slug: candidate })) {
        n += 1;
        candidate = `${slug}-${n}`;
    }
    return candidate;
};

// Shared create/update validation. Returns { error } or null.
const validateEventPayload = (body) => {
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 10) {
        return { error: 'Event title must be at least 10 characters.' };
    }
    if (!body.startDate) return { error: 'Start date is required.' };
    const start = new Date(body.startDate);
    if (Number.isNaN(start.getTime())) return { error: 'Start date is invalid.' };
    if (body.endDate) {
        const end = new Date(body.endDate);
        if (Number.isNaN(end.getTime())) return { error: 'End date is invalid.' };
        if (end.getTime() < start.getTime()) return { error: 'End date/time must be after the start date/time.' };
    }
    const eventType = body.eventType || 'Physical';
    if (!['Online', 'Physical', 'Hybrid'].includes(eventType)) return { error: 'Event type must be Online, Physical, or Hybrid.' };
    if (eventType === 'Physical' && (!body.venue || typeof body.venue !== 'string' || !body.venue.trim())) {
        return { error: 'A location is required for a physical event.' };
    }
    if (body.streamUrl && !isValidMeetingUrl(body.streamUrl)) {
        return { error: 'Meeting URL is invalid — use a full http(s) link.' };
    }
    if (body.meetingProvider === 'googleMeet' && body.streamUrl && !isValidGoogleMeetUrl(body.streamUrl)) {
        return { error: 'Invalid Google Meet link. Only real https://meet.google.com/xxx-xxxx-xxx links are accepted.' };
    }
    if (body.meetingProvider && !['googleMeet', 'zoom', 'microsoftTeams', 'jitsi', 'internal', 'custom'].includes(body.meetingProvider)) {
        return { error: 'Meeting provider is invalid.' };
    }
    if (body.visibility && !['internal', 'public'].includes(body.visibility)) {
        return { error: 'Visibility must be internal or public.' };
    }
    return null;
};

// Best-effort sync of a Google Calendar event when an Online/Hybrid event's
// date/time is edited — the meeting URL is preserved (never recreated).
const syncGoogleCalendarTime = async (payload, prev) => {
    if (!payload || !prev || payload.eventType === 'Physical') return;
    if (payload.meetingProvider !== 'googleMeet' && prev.meetingProvider !== 'googleMeet') return;
    const calendarEventId =
        (payload.meetingMetadata && payload.meetingMetadata.calendarEventId) ||
        (prev.meetingMetadata && prev.meetingMetadata.calendarEventId);
    if (!calendarEventId) return;
    try {
        await googleMeetService.updateCalendarMeet(calendarEventId, {
            title: payload.title || prev.title,
            startDate: payload.startDate || prev.startDate,
            endDate: payload.endDate || prev.endDate
        });
    } catch (err) {
        console.warn('eventController: could not sync Google Calendar event.', err && err.message);
    }
};

const googleError = async (error) => {
    if (error.code === 'PROVIDER_NOT_CONFIGURED') return { status: 400, message: await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.' };
    if (error.code === 'GOOGLE_NOT_AUTHORIZED') return { status: 400, message: error.userMessage || error.message };
    if (error.code === 'GOOGLE_PERMISSION_DENIED') return { status: 403, message: error.userMessage || 'Google denied access.' };
    if (error.code === 'INVALID_MEETING_URL') return { status: 400, message: error.message };
    if (error.code === 'MEET_CREATE_INCOMPLETE') return { status: 502, message: error.message };
    if (error.code === 'GOOGLE_API_ERROR' || error.code === 'GOOGLE_BAD_REQUEST') return { status: 502, message: error.userMessage || 'Google request failed. No meeting link was created and the event was not saved.' };
    return null;
};

const resolveInstructor = async (event) => {
    const ref = event.submittedBy;
    if (ref && typeof ref === 'object' && ref.assignedRole) return ref;
    try {
        return await User.findById(ref).select('fullName accountEmail assignedRole isActive instructorId avatarUrl');
    } catch {
        return null;
    }
};

const registeredCounts = async (eventIds) => {
    const rows = await EventRegistration.aggregate([
        { $match: { eventRef: { $in: eventIds }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$eventRef', count: { $sum: 1 } } }
    ]);
    const map = {};
    rows.forEach((r) => { map[String(r._id)] = r.count; });
    return map;
};

// Auto status: Upcoming / Live / Completed / Cancelled — derived from time, not manually entered
const computeLiveStatus = (event, now = Date.now()) => {
    if (event.status === 'CANCELLED') return 'cancelled';
    const start = event.startDate ? new Date(event.startDate).getTime() : null;
    if (start == null) return 'upcoming';
    if (now < start) return 'upcoming';
    let end = event.endDate ? new Date(event.endDate).getTime() : null;
    if (end == null && event.startTime && event.endTime) {
        const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
        const dur = toMin(event.endTime) - toMin(event.startTime);
        end = dur > 0 ? start + dur * 60000 : null;
    }
    if (end == null) return 'live';
    if (now > end) return 'completed';
    return 'live';
};

const serializePublic = (event, registered = 0) => {
    const slotsLeft = Math.max(0, Number(event.totalSlots || 0) - Number(registered || 0));
    const venue = event.venue || 'Online Live Stream';
    return {
        id: event.slug,
        title: event.title,
        tagline: event.tagline || '',
        category: event.category || 'Masterclass',
        visibility: event.visibility || 'public',
        featured: Boolean(event.isFeatured),
        date: event.startDate ? new Date(event.startDate).toISOString() : null,
        endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
        allDay: Boolean(event.allDay),
        time: event.timeLabel || `${event.startTime || ''} – ${event.endTime || ''}`,
        location: venue,
        city: event.city || '',
        price: event.price || 'FREE',
        slotsLeft,
        totalSlots: event.totalSlots || 0,
        image: event.image || '',
        description: event.description || [],
        speaker: event.speaker || null,
        eventType: event.eventType || 'Hybrid',
        meetingUrl: event.meetingUrl || event.streamUrl || '',
        meetingProvider: event.meetingProvider || 'internal',
        meetingPlatform: event.meetingPlatform || '',
        meetingInvitees: event.meetingInvitees || '',
        meetingPassword: event.meetingPassword || '',
        meetingSpaceName: event.meetingSpaceName || '',
        meetingCreatedAt: event.meetingCreatedAt || null,
        liveStatus: computeLiveStatus(event),
        registrationOpen: event.status === 'APPROVED' && event.registrationEnabled !== false
    };
};

// ────────────────────────────────────────────────────────────
//  ADMIN ENDPOINTS  (/api/admin/events)
// ────────────────────────────────────────────────────────────

exports.getAdminEvents = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (search && search.trim()) {
            const q = search.trim();
            const idMatch = /^[0-9a-fA-F]{24}$/.test(q) ? { _id: q } : null;
            const users = await User.find({
                $or: [
                    { fullName: { $regex: q, $options: 'i' } },
                    { accountEmail: { $regex: q, $options: 'i' } },
                    { instructorId: { $regex: q, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = users.map((u) => u._id);
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { venue: { $regex: q, $options: 'i' } },
                { city: { $regex: q, $options: 'i' } },
                { submittedBy: { $in: userIds } },
                ...(idMatch ? [{ _id: idMatch }] : [])
            ];
        }

        const events = await Event.find(query)
            .populate('submittedBy', 'fullName accountEmail assignedRole isActive instructorId avatarUrl')
            .sort({ createdAt: -1 });

        const counts = await registeredCounts(events.map((e) => e._id));
        const data = events.map((e) => {
            const doc = e.toObject();
            doc.registeredCount = counts[String(e._id)] || 0;
            doc.liveStatus = computeLiveStatus(e);
            return doc;
        });

        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('getAdminEvents error:', error);
        res.status(500).json({ success: false, message: 'Failed to load events.' });
    }
};

exports.getAdminStats = async (req, res) => {
    try {
        const now = Date.now();
        const [total, pending, approved, rejected, draft, cancelled, live] = await Promise.all([
            Event.countDocuments(),
            Event.countDocuments({ status: 'PENDING_REVIEW' }),
            Event.countDocuments({ status: 'APPROVED' }),
            Event.countDocuments({ status: 'REJECTED' }),
            Event.countDocuments({ status: 'DRAFT' }),
            Event.countDocuments({ status: 'CANCELLED' }),
            Event.countDocuments({ status: 'APPROVED', startDate: { $gte: new Date(now) } })
        ]);
        const [eventRegs, courseEnrollments] = await Promise.all([
            EventRegistration.countDocuments({ status: { $ne: 'cancelled' } }),
            Enrollment.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                approved,
                rejected,
                draft,
                cancelled,
                live,
                upcoming: live,
                categories: EVENT_CATEGORIES,
                totalRegistrations: eventRegs + courseEnrollments
            }
        });
    } catch (error) {
        console.error('getAdminStats error:', error);
        res.status(500).json({ success: false, message: 'Failed to load event stats.' });
    }
};

exports.getEventCategories = async (req, res) => {
    res.status(200).json({ success: true, categories: EVENT_CATEGORIES });
};

exports.getAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('submittedBy', 'fullName accountEmail assignedRole isActive instructorId avatarUrl');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        const doc = event.toObject();
        doc.registeredCount = await EventRegistration.countDocuments({ eventRef: event._id, status: { $ne: 'cancelled' } });
        doc.liveStatus = computeLiveStatus(event);
        res.status(200).json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load event.' });
    }
};

exports.createAdminEvent = async (req, res) => {
    try {
        const body = req.body || {};
        const invalid = validateEventPayload(body);
        if (invalid) return res.status(400).json({ success: false, message: invalid.error });

        const slug = await ensureUniqueSlug(body.slug || slugify(body.title || 'event'));
        const doc = {
            ...body,
            slug,
            visibility: body.visibility || 'public',
            allDay: body.allDay === true,
            meetingProvider: normalizeProvider(body.meetingProvider),
            submittedBy: req.user.id,
            reviewedBy: undefined,
            reviewedAt: undefined,
            publishedAt: undefined
        };
        delete doc.reviewedBy;
        delete doc.reviewedAt;
        delete doc.publishedAt;

        // Normalize invitees: trim, dedupe, drop nothing invalid — surface the
        // invalid addresses so the admin can correct them before saving.
        const inviteeInput = doc.invitees ?? doc.meetingInvitees;
        if (inviteeInput !== undefined && inviteeInput !== null) {
            const { list, invalid } = validateInvitees(inviteeInput);
            if (invalid.length) return res.status(400).json({ success: false, message: `Invalid invitee email(s): ${invalid.join(', ')}` });
            doc.invitees = list;
            doc.meetingInvitees = list.join(', ');
        }

        // Auto-generate a meeting link for Online/Hybrid events when none is supplied.
        const meeting = await resolveMeetingUrl({
            existing: '',
            supplied: doc.streamUrl,
            eventType: doc.eventType,
            provider: doc.meetingProvider,
            title: doc.title,
            slug,
            startDate: doc.startDate,
            endDate: doc.endDate
        });
        mergeMeetingInfo(doc, meeting, null);

        const event = await Event.create(doc);
        const instructor = await resolveInstructor(event);
        const validation = validateEvent(event.toObject(), instructor);
        event.lastValidation = {
            passed: validation.passed,
            checkedAt: new Date(),
            checks: validation.checks
        };
        await event.save();

        res.status(201).json({ success: true, data: event });
    } catch (error) {
        const mapped = await googleError(error);
        if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'An event with this slug already exists.' });
        res.status(500).json({ success: false, message: 'Failed to create event.' });
    }
};

exports.updateAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        const body = req.body || {};
        const invalid = validateEventPayload(body);
        if (invalid) return res.status(400).json({ success: false, message: invalid.error });

        const updated = { ...body };

        if (updated.slug && updated.slug !== event.slug) {
            const existing = await Event.findOne({ slug: updated.slug });
            if (existing && String(existing._id) !== String(event._id)) {
                return res.status(400).json({ success: false, message: 'An event with this slug already exists.' });
            }
        }

        // Meeting URL rules: preserve a valid manual URL, otherwise keep the stored
        // URL untouched (never silently regenerate on edit).
        updated.eventType = updated.eventType || event.eventType;

        // Normalize invitees on edit (same rules as create).
        const inviteeInput = updated.invitees ?? updated.meetingInvitees;
        if (inviteeInput !== undefined && inviteeInput !== null) {
            const { list, invalid } = validateInvitees(inviteeInput);
            if (invalid.length) return res.status(400).json({ success: false, message: `Invalid invitee email(s): ${invalid.join(', ')}` });
            updated.invitees = list;
            updated.meetingInvitees = list.join(', ');
        }

        const meeting = await resolveMeetingUrl({
            existing: event.streamUrl || '',
            supplied: typeof updated.streamUrl === 'string' ? updated.streamUrl : event.streamUrl || '',
            eventType: updated.eventType,
            provider: updated.meetingProvider || event.meetingProvider,
            title: updated.title || event.title,
            slug: event.slug,
            startDate: updated.startDate || event.startDate,
            endDate: updated.endDate || event.endDate
        });
        mergeMeetingInfo(updated, meeting, event);

        // Switching a real-provider meeting to Physical → clean up the provider
        // resource (best effort) and never keep a stale meeting URL.
        if (updated.eventType === 'Physical' && event.meetingProvider === 'googleMeet' && event.meetingSpaceName) {
            await deleteProviderResource(event);
        } else {
            await syncGoogleCalendarTime(updated, event);
        }

        Object.assign(event, updated);
        await event.save();

        const instructor = await resolveInstructor(event);
        const validation = validateEvent(event.toObject(), instructor);
        event.lastValidation = { passed: validation.passed, checkedAt: new Date(), checks: validation.checks };
        await event.save();

        const doc = event.toObject();
        doc.registeredCount = await EventRegistration.countDocuments({ eventRef: event._id, status: { $ne: 'cancelled' } });
        doc.liveStatus = computeLiveStatus(event);
        res.status(200).json({ success: true, data: doc, validation });
    } catch (error) {
        const mapped = await googleError(error);
        if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
        res.status(500).json({ success: false, message: 'Failed to update event.' });
    }
};

exports.regenerateMeetingUrl = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        if (!['Online', 'Hybrid'].includes(event.eventType)) {
            return res.status(400).json({ success: false, message: 'Meeting links only apply to Online or Hybrid events.' });
        }

        const provider = normalizeProvider(req.body?.provider || event.meetingProvider || 'internal');
        const result = await generateMeetingUrl({
            provider,
            title: req.body?.title || event.title,
            slug: event.slug,
            startDate: req.body?.startDate || event.startDate,
            endDate: req.body?.endDate || event.endDate
        });

        // The admin intentionally asked for a new meeting — clean up the previous
        // provider resource (best effort) before storing the new one.
        if (result.provider === 'googleMeet' && (event.meetingMetadata?.calendarEventId || event.meetingProviderId)) {
            await googleMeetService.deleteCalendarEvent(event.meetingMetadata?.calendarEventId || event.meetingProviderId).catch(() => {});
        }

        event.streamUrl = result.url;
        event.meetingUrl = result.url;
        event.meetingProvider = result.provider;
        event.meetingSpaceName = result.meetingSpaceName || '';
        event.meetingProviderId = result.meetingProviderId || '';
        event.meetingCreatedAt = result.meetingCreatedAt || null;
        event.meetingStatus = result.url ? 'created' : 'failed';
        event.meetingMetadata = result.metadata || {};
        await event.save();

        res.status(200).json({
            success: true,
            data: {
                streamUrl: event.streamUrl,
                meetingUrl: event.meetingUrl || event.streamUrl,
                provider: event.meetingProvider,
                meetingSpaceName: event.meetingSpaceName,
                meetingProviderId: event.meetingProviderId,
                meetingCreatedAt: event.meetingCreatedAt
            }
        });
    } catch (error) {
        const mapped = await googleError(error);
        if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
        res.status(500).json({ success: false, message: 'Failed to regenerate meeting link.' });
    }
};

// In-place generation for the admin form (generates a link without saving the event).
exports.generateMeetingLink = async (req, res) => {
    try {
        const { provider, title, startDate, endDate } = req.body || {};
        const chosen = normalizeProvider(provider);
        if (chosen === 'custom') {
            return res.status(400).json({ success: false, message: 'Manual URLs are entered directly, not generated.' });
        }
        const result = await generateMeetingUrl({ provider: chosen, title, slug: title, startDate, endDate });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        const mapped = await googleError(error);
        if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
        res.status(500).json({ success: false, message: 'Failed to generate meeting link.' });
    }
};

exports.deleteAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        // Best-effort provider cleanup. Provider failures must never block the
        // database deletion, so the LMS events stay consistent.
        await deleteProviderResource(event);

        await Event.findByIdAndDelete(req.params.id);
        await EventRegistration.deleteMany({ eventRef: event._id });
        res.status(200).json({ success: true, message: 'Event deleted.' });
    } catch (error) {
        console.error('deleteAdminEvent error:', error && error.message);
        res.status(500).json({ success: false, message: 'Failed to delete event.' });
    }
};

const applyApprove = async (event, adminId) => {
    const instructor = await resolveInstructor(event);
    const validation = validateEvent(event.toObject(), instructor);
    if (!validation.passed) {
        const err = new Error('Critical validation checks failed — event cannot be approved.');
        err.status = 400;
        err.validation = validation;
        throw err;
    }
    event.status = 'APPROVED';
    event.reviewNote = '';
    event.reviewedBy = adminId;
    event.reviewedAt = new Date();
    event.publishedAt = event.publishedAt || new Date();
    event.lastValidation = { passed: true, checkedAt: new Date(), checks: validation.checks };
    await event.save();
    broadcastEventNotification({
        title: 'New event published',
        message: `${event.title} is now open for registration. Reserve your spot today!`,
        link: `/events/${event.slug}`
    });
    return { event, validation };
};

const applyCancel = async (event, adminId, reason) => {
    event.status = 'CANCELLED';
    event.reviewNote = reason || 'Cancelled by administrator';
    event.reviewedBy = adminId;
    event.reviewedAt = new Date();
    await event.save();
    broadcastEventNotification({
        title: 'Event cancelled',
        message: `${event.title} has been cancelled${reason ? `: ${reason}` : '.'}`,
        link: `/events/${event.slug}`
    });
    return event;
};

exports.cancelAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        const updated = await applyCancel(event, req.user.id, req.body && req.body.reason);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel event.' });
    }
};

const applyReject = async (event, adminId, reason) => {
    event.status = 'REJECTED';
    event.reviewNote = reason || '';
    event.reviewedBy = adminId;
    event.reviewedAt = new Date();
    await event.save();
    return event;
};

exports.validateAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        const instructor = await resolveInstructor(event);
        const validation = validateEvent(event.toObject(), instructor);
        res.status(200).json({ success: true, ...validation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to validate event.' });
    }
};

exports.approveAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        const { event: updated, validation } = await applyApprove(event, req.user.id);
        res.status(200).json({ success: true, data: updated, validation });
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({ success: false, message: error.message, validation: error.validation });
        }
        res.status(500).json({ success: false, message: 'Failed to approve event.' });
    }
};

exports.rejectAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        const updated = await applyReject(event, req.user.id, req.body && req.body.note);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reject event.' });
    }
};

// PUT /api/events/admin/validate/:id — unified approval/rejection:
// body { status: 'APPROVED' } or { status: 'REJECTED', rejectionReason }
exports.validateStatusAdminEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        const status = (req.body && req.body.status) || '';
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be 'APPROVED' or 'REJECTED'." });
        }

        if (status === 'APPROVED') {
            const { event: updated, validation } = await applyApprove(event, req.user.id);
            return res.status(200).json({ success: true, data: updated, validation });
        }

        const updated = await applyReject(event, req.user.id, req.body && req.body.rejectionReason);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({ success: false, message: error.message, validation: error.validation });
        }
        res.status(500).json({ success: false, message: 'Failed to update event status.' });
    }
};

// ────────────────────────────────────────────────────────────
//  PUBLIC ENDPOINTS  (/api/events)
// ────────────────────────────────────────────────────────────

exports.getPublishedEvents = async (req, res) => {
    try {
        const events = await Event.find({ status: 'APPROVED', visibility: 'public' }).sort({ startDate: 1 });
        const counts = await registeredCounts(events.map((e) => e._id));
        const data = events.map((e) => serializePublic(e.toObject(), counts[String(e._id)] || 0));
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load events.' });
    }
};

exports.getPublishedEvent = async (req, res) => {
    try {
        const ref = req.params.id || req.params.slug;
        const event = await Event.findOne({ slug: ref, status: 'APPROVED', visibility: 'public' });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found or not published.' });
        const registered = await EventRegistration.countDocuments({ eventRef: event._id, status: { $ne: 'cancelled' } });
        res.status(200).json({ success: true, data: serializePublic(event.toObject(), registered) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load event.' });
    }
};

exports.registerForEvent = async (req, res) => {
    try {
        const ref = req.params.id || req.params.slug;
        const event = await Event.findOne({ slug: ref, status: 'APPROVED' });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found or not open for registration.' });
        if (event.registrationEnabled === false) {
            return res.status(400).json({ success: false, message: 'Registration for this event is currently closed.' });
        }

        const { fullName, phone, email, city, selectedDate, selectedSlot } = req.body || {};
        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'Full name and phone number are required.' });
        }

        // Prevent double registration for logged-in users via the registeredUsers array
        if (req.user && req.user.id && event.registeredUsers.some((id) => String(id) === String(req.user.id))) {
            return res.status(400).json({ success: false, message: 'You have already registered for this event.' });
        }

        const registered = await EventRegistration.countDocuments({ eventRef: event._id, status: { $ne: 'cancelled' } });
        if (registered >= event.totalSlots) {
            return res.status(400).json({ success: false, message: 'This event is fully booked.' });
        }

        const bookingRef = `EMR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const registration = await EventRegistration.create({
            eventRef: event._id,
            userId: req.user ? req.user.id : null,
            fullName,
            phone,
            email: email || '',
            city: city || '',
            selectedDate: selectedDate || '',
            selectedSlot: selectedSlot || '',
            bookingRef
        });

        // Track authenticated registrants on the event for seat/dedup purposes
        if (req.user && req.user.id && !event.registeredUsers.some((id) => String(id) === String(req.user.id))) {
            event.registeredUsers.push(req.user.id);
            await event.save();
        }

        res.status(201).json({
            success: true,
            message: 'Registration confirmed.',
            data: {
                bookingRef,
                event: serializePublic(event.toObject(), registered + 1)
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already registered for this slot.' });
        }
        console.error('registerForEvent error:', error);
        res.status(500).json({ success: false, message: 'Failed to register for event.' });
    }
};
