const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Transaction = require('../models/Transaction');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { validateEvent } = require('../utils/eventValidation');
const { broadcastEventNotification } = require('./notificationController');
const { resolveMeetingUrl, isValidMeetingUrl, generateMeetingUrl, missingEnvMessage, normalizeProvider, mergeMeetingInfo, deleteProviderResource, validateInvitees } = require('../services/meetingService');
const chapa = require('../services/chapaService');
const eventPayment = require('../services/eventPaymentService');

// Roles allowed to register for an event. Students are the primary audience but
// staff attend too, so this is an explicit allow-list rather than "any account".
const REGISTRATION_ROLES = ['Student', 'Instructor', 'Admin'];

// Event.price is a free-text column ("FREE", "500", "500 ETB", ...). Every code
// path that needs a number goes through the shared service so the amount charged
// can never disagree with the amount we expect back from Chapa.
const parseEventPrice = eventPayment.parseEventPrice;

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
    if (body.meetingProvider && !['zoom', 'microsoftTeams', 'jitsi', 'internal', 'custom'].includes(body.meetingProvider)) {
        return { error: 'Meeting provider is invalid.' };
    }
    if (body.visibility && !['internal', 'public'].includes(body.visibility)) {
        return { error: 'Visibility must be internal or public.' };
    }
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

/**
 * Per-event registration tallies.
 *   registered     → rows currently holding a seat (confirmed + live pending)
 *   settled        → confirmed attendees (payment verified or free event)
 *   awaitingPayment→ PENDING_PAYMENT rows whose payment window is still open
 */
const registeredCounts = async (eventIds) => {
    if (!eventIds || eventIds.length === 0) return {};
    const now = new Date();

    // A row holds a seat when it is not cancelled/expired and, if it is still
    // awaiting payment, its payment window has not elapsed.
    const HOLDS_SEAT = {
        $and: [
            { $not: { $in: ['$status', ['CANCELLED', 'EXPIRED', 'cancelled', 'expired']] } },
            {
                $or: [
                    { $ne: ['$status', 'PENDING_PAYMENT'] },
                    { $eq: [{ $ifNull: ['$paymentExpiresAt', null] }, null] },
                    { $gt: ['$paymentExpiresAt', now] }
                ]
            }
        ]
    };

    const rows = await EventRegistration.aggregate([
        { $match: { eventRef: { $in: eventIds } } },
        {
            $group: {
                _id: '$eventRef',
                count: { $sum: { $cond: [HOLDS_SEAT, 1, 0] } },
                settled: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $in: ['$status', ['CONFIRMED', 'PAID', 'WAITLISTED', 'confirmed', 'waitlisted']] },
                                    {
                                        $or: [
                                            { $lte: [{ $ifNull: ['$amountDue', null] }, 0] },
                                            { $eq: ['$paymentStatus', 'completed'] }
                                        ]
                                    }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                awaitingPayment: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$status', 'PENDING_PAYMENT'] },
                                    {
                                        $or: [
                                            { $gt: ['$paymentExpiresAt', now] },
                                            { $eq: [{ $ifNull: ['$paymentExpiresAt', null] }, null] }
                                        ]
                                    }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
    const map = {};
    rows.forEach((r) => {
        map[String(r._id)] = {
            registered: r.count,
            settled: r.settled,
            awaitingPayment: r.awaitingPayment
        };
    });
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

/**
 * Public, unauthenticated view of an event.
 *
 * Meeting credentials (URL / password / provider ids) are intentionally NOT
 * included here. They are only released by `getEventAccess`, which sits behind
 * `protect` + `requireEventAccess`.
 */
const serializePublic = (event, stats = {}) => {
    const counts = typeof stats === 'number' ? { registered: stats } : (stats || {});
    const totalSlots = Number(event.totalSlots || 0);
    const registered = Number(counts.registered || 0);
    const slotsLeft = Math.max(0, totalSlots - registered);
    const amount = parseEventPrice(event);
    const requiresPayment = amount > 0;
    const venue = event.venue || 'Online Live Stream';
    const liveStatus = computeLiveStatus(event);
    return {
        _id: event._id,
        id: event.slug,
        slug: event.slug,
        title: event.title,
        tagline: event.tagline || '',
        category: event.category || 'Masterclass',
        visibility: event.visibility || 'public',
        featured: Boolean(event.isFeatured),
        date: event.startDate ? new Date(event.startDate).toISOString() : null,
        startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
        endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
        allDay: Boolean(event.allDay),
        time: event.timeLabel || `${event.startTime || ''} – ${event.endTime || ''}`,
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        location: venue,
        city: event.city || '',
        // ── Pricing ──────────────────────────────────────────────────────
        price: event.price || 'FREE',
        amount,
        currency: event.currency || 'ETB',
        requiresPayment,
        isFree: !requiresPayment,
        // ── Capacity ─────────────────────────────────────────────────────
        slotsLeft,
        totalSlots,
        registeredCount: registered,
        seatsConfirmed: Number(counts.settled || 0),
        awaitingPayment: Number(counts.awaitingPayment || 0),
        image: event.image || '',
        gallery: event.gallery || [],
        description: event.description || [],
        speaker: event.speaker || null,
        eventType: event.eventType || 'Hybrid',
        meetingProvider: event.meetingProvider || 'internal',
        // Tells the UI a live link exists without leaking the link itself.
        hasStream: Boolean(event.meetingUrl || event.streamUrl),
        liveStatus,
        status: event.status || 'DRAFT',
        registrationOpen: event.status === 'APPROVED'
            && event.registrationEnabled !== false
            && event.visibility !== 'internal'
            && liveStatus !== 'cancelled'
            && liveStatus !== 'completed'
    };
};

/**
 * The viewer's own registration for an event — drives the
 * "Register → Awaiting payment → Paid → Join" state machine in the UI.
 * Always computed on the server; the client cannot influence it.
 */
const serializeRegistration = (registration) => {
    if (!registration) {
        return {
            registered: false,
            registrationStatus: null,
            paymentStatus: null,
            accessGranted: false,
            requiresPayment: false,
            message: 'You have not registered for this event yet.'
        };
    }
    const status = eventPayment.normalizeStatus(registration);
    const accessGranted = eventPayment.hasAccess(registration);
    const expired = eventPayment.isExpired(registration);
    const amountDue = Number(registration.amountDue || 0);

    let message;
    if (status === 'CONFIRMED' && accessGranted) {
        message = registration.paymentStatus === 'completed'
            ? 'Payment verified — your seat is confirmed.'
            : 'Registration confirmed — this event is free to attend.';
    } else if (status === 'PENDING_PAYMENT' || status === 'PAID') {
        message = expired
            ? 'Your payment window expired. Register again to get a fresh checkout link.'
            : 'Awaiting payment — complete checkout to unlock the event.';
    } else if (status === 'EXPIRED') {
        message = 'Your payment window expired. Register again to get a fresh checkout link.';
    } else if (status === 'CANCELLED') {
        message = 'Your registration was cancelled.';
    } else {
        message = 'Complete your payment to unlock the event.';
    }

    return {
        registered: true,
        id: String(registration._id),
        bookingRef: registration.bookingRef || null,
        registrationStatus: status,
        paymentStatus: registration.paymentStatus || 'none',
        accessGranted,
        requiresPayment: amountDue > 0,
        amountDue,
        amountPaid: Number(registration.amountPaid || 0),
        currency: registration.currency || '',
        selectedDate: registration.selectedDate || '',
        selectedSlot: registration.selectedSlot || '',
        paymentExpiresAt: registration.paymentExpiresAt || null,
        paidAt: registration.paidAt || null,
        txRef: registration.txRef || '',
        lastVerificationError: registration.lastVerificationError || '',
        message
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
            const stat = counts[String(e._id)] || { registered: 0, settled: 0, awaitingPayment: 0 };
            doc.registeredCount = stat.registered;
            doc.confirmedCount = stat.settled;
            doc.awaitingPaymentCount = stat.awaitingPayment;
            doc.amount = parseEventPrice(e);
            doc.requiresPayment = doc.amount > 0;
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
        await eventPayment.releaseExpiredSeats(event._id);
        doc.registeredCount = await eventPayment.countActiveSeats(event._id);
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

        // "Publish now" — the admin creates and publishes in a single action so
        // the event shows up on the public Home Page immediately.
        const publishNow = body.status === 'APPROVED' || body.publishNow === true || body.publishNow === 'true';

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
            publishedAt: undefined,
            // Never let the payload smuggle in moderation/registration bookkeeping.
            registeredUsers: undefined,
            lastValidation: undefined
        };
        delete doc.reviewedBy;
        delete doc.reviewedAt;
        delete doc.publishedAt;
        delete doc.registeredUsers;
        delete doc.lastValidation;
        doc.status = publishNow ? 'DRAFT' : (body.status || 'DRAFT');

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

        let event = await Event.create(doc);
        const instructor = await resolveInstructor(event);
        const validation = validateEvent(event.toObject(), instructor);
        event.lastValidation = {
            passed: validation.passed,
            checkedAt: new Date(),
            checks: validation.checks
        };
        await event.save();

        // Publish through the same validated path used by the approve endpoint.
        if (publishNow) {
            try {
                ({ event } = await applyApprove(event, req.user.id));
            } catch (approvalError) {
                // The event exists but cannot go live yet — keep it as a draft and
                // tell the admin exactly what is missing.
                event.status = 'DRAFT';
                await event.save();
                return res.status(400).json({
                    success: false,
                    message: approvalError.message,
                    validation: approvalError.validation,
                    data: event
                });
            }
        }

        res.status(201).json({ success: true, published: publishNow, data: event, validation });
    } catch (error) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            const msg = await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.';
            return res.status(400).json({ success: false, message: msg });
        }
        if (error.code === 'INVALID_MEETING_URL') return res.status(400).json({ success: false, message: error.message });
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

        Object.assign(event, updated);
        await event.save();

        const instructor = await resolveInstructor(event);
        const validation = validateEvent(event.toObject(), instructor);
        event.lastValidation = { passed: validation.passed, checkedAt: new Date(), checks: validation.checks };
        await event.save();

        const doc = event.toObject();
        doc.registeredCount = await eventPayment.countActiveSeats(event._id);
        doc.liveStatus = computeLiveStatus(event);
        res.status(200).json({ success: true, data: doc, validation });
    } catch (error) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            const msg = await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.';
            return res.status(400).json({ success: false, message: msg });
        }
        if (error.code === 'INVALID_MEETING_URL') return res.status(400).json({ success: false, message: error.message });
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
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            const msg = await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.';
            return res.status(400).json({ success: false, message: msg });
        }
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
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            const msg = await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.';
            return res.status(400).json({ success: false, message: msg });
        }
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

/**
 * Resolve an event by slug *or* ObjectId, without leaking internal events to
 * anonymous callers.
 */
const findPublicEvent = async (ref, { allowStaff = false } = {}) => {
    if (!ref) return null;
    const or = [{ slug: String(ref) }];
    if (mongoose.isValidObjectId(String(ref))) or.push({ _id: String(ref) });
    const visibility = allowStaff ? { $in: ['public', 'internal'] } : 'public';
    return Event.findOne({ $or: or, status: 'APPROVED', visibility });
};

const attachViewerState = async (events, user) => {
    if (!user || !user._id || events.length === 0) return;
    const ids = events.map((e) => e._id);
    const rows = await EventRegistration.find({
        eventRef: { $in: ids },
        userId: user._id,
        status: { $nin: ['CANCELLED', 'cancelled'] }
    }).sort({ createdAt: -1 });
    const byEvent = new Map();
    rows.forEach((r) => {
        if (!byEvent.has(String(r.eventRef))) byEvent.set(String(r.eventRef), r);
    });
    events.forEach((e) => {
        e.myRegistration = serializeRegistration(byEvent.get(String(e._id)) || null);
    });
};

/**
 * GET /api/events  ·  GET /api/events/published
 * All published (APPROVED + public) events. No login required.
 * Query params:
 *   ?upcoming=1  → only events that have not finished yet
 *   ?includePast=1 (default) → past events are returned after upcoming ones
 */
exports.getPublishedEvents = async (req, res) => {
    try {
        const now = new Date();
        const query = { status: 'APPROVED', visibility: 'public' };
        if (req.query.upcoming === '1' || req.query.upcoming === 'true') {
            query.$or = [{ endDate: null }, { endDate: { $gte: now } }, { startDate: { $gte: now } }];
        }

        const events = await Event.find(query).sort({ startDate: 1 });
        // Free up seats abandoned at checkout before reporting availability.
        await Promise.all(events.slice(0, 60).map((e) => eventPayment.releaseExpiredSeats(e._id)));

        const counts = await registeredCounts(events.map((e) => e._id));
        const data = events.map((e) => serializePublic(e.toObject(), counts[String(e._id)]));
        await attachViewerState(data, req.user);

        // Upcoming first (soonest at the top), then the most recent past events.
        data.sort((a, b) => {
            const aPast = a.liveStatus === 'completed';
            const bPast = b.liveStatus === 'completed';
            if (aPast !== bPast) return aPast ? 1 : -1;
            const at = a.startDate ? new Date(a.startDate).getTime() : 0;
            const bt = b.startDate ? new Date(b.startDate).getTime() : 0;
            return aPast ? bt - at : at - bt;
        });

        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('getPublishedEvents error:', error);
        res.status(500).json({ success: false, message: 'Failed to load events.' });
    }
};

/**
 * GET /api/events/:slug — public event detail. Viewers can browse without an
 * account; when logged in the response also carries their own registration state.
 */
exports.getPublishedEvent = async (req, res) => {
    try {
        const ref = req.params.id || req.params.slug;
        const isStaff = Boolean(req.user && req.user.assignedRole && req.user.assignedRole !== 'Student');
        const event = await findPublicEvent(ref, { allowStaff: isStaff });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found or not published.' });

        await eventPayment.releaseExpiredSeats(event._id);
        const counts = await registeredCounts([event._id]);
        const data = serializePublic(event.toObject(), counts[String(event._id)]);
        await attachViewerState([data], req.user);

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getPublishedEvent error:', error);
        res.status(500).json({ success: false, message: 'Failed to load event.' });
    }
};

// ────────────────────────────────────────────────────────────
//  STUDENT REGISTRATION  (authentication required)
// ────────────────────────────────────────────────────────────

const FRONTEND_FALLBACK = 'http://localhost:5173';

// The callback returns to the generic payment page, but it carries the event
// slug so the browser can call the protected, ownership-checked verify endpoint.
const buildCallbackUrl = (txRef, req, eventSlug) => {
    const frontendUrl = process.env.FRONTEND_URL || req.get('origin') || FRONTEND_FALLBACK;
    const slug = eventSlug ? `&event=${encodeURIComponent(eventSlug)}` : '';
    return `${frontendUrl}/payment/callback?tx_ref=${encodeURIComponent(txRef)}&type=event${slug}`;
};

const buildWebhookUrl = (req) => {
    const backendUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return `${backendUrl}/api/payments/chapa/webhook`;
};

/**
 * POST /api/events/:slug/register
 *
 * Authenticated students register as follows:
 *   free event  → registration CONFIRMED immediately, access granted
 *   paid event  → registration PENDING_PAYMENT (seat held, no access yet) and a
 *                 Chapa checkout URL is returned. Access is granted ONLY after
 *                 the backend verifies the transaction with Chapa.
 *
 * The amount is always recomputed from the event document — the client can never
 * choose what it pays, and cannot claim it already paid.
 */
exports.registerForEvent = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in to register for this event.' });
        }
        if (!REGISTRATION_ROLES.includes(user.assignedRole)) {
            return res.status(403).json({ success: false, code: 'ROLE_NOT_ALLOWED', message: 'Your account type cannot register for events.' });
        }

        const ref = req.params.id || req.params.slug;
        const event = await findPublicEvent(ref);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found or not open for registration.' });
        }
        if (event.registrationEnabled === false) {
            return res.status(400).json({ success: false, code: 'REGISTRATION_CLOSED', message: 'Registration for this event is currently closed.' });
        }

        const liveStatus = computeLiveStatus(event);
        if (liveStatus === 'cancelled') {
            return res.status(409).json({ success: false, code: 'EVENT_CANCELLED', message: 'This event has been cancelled.' });
        }
        if (liveStatus === 'completed') {
            return res.status(409).json({ success: false, code: 'EVENT_ENDED', message: 'This event has already taken place.' });
        }

        // Release seats from abandoned checkouts so capacity is truthful.
        await eventPayment.releaseExpiredSeats(event._id);

        // ── Contact details: prefer the account, fall back to the form ─────
        const body = req.body || {};
        const fullName = String(body.fullName || user.fullName || '').trim();
        const phone = String(body.phone || user.phoneNumber || user.phone || '').trim();
        const email = String(body.email || user.accountEmail || user.email || '').trim().toLowerCase();
        const city = String(body.city || user.city || '').trim();
        if (!fullName) {
            return res.status(400).json({ success: false, message: 'Full name is required.' });
        }
        if (!phone) {
            return res.status(400).json({ success: false, message: 'A phone number is required to hold your seat.' });
        }

        const selectedDate = String(body.selectedDate || '').trim();
        const selectedSlot = String(body.selectedSlot || '').trim();

        const amount = parseEventPrice(event);
        const requiresPayment = amount > 0;
        const currency = event.currency || 'ETB';

        // ── Find or create this user's registration for the event ─────────
        let registration = await EventRegistration.findOne({
            eventRef: event._id,
            userId: user._id
        }).sort({ createdAt: -1 });

        // An EXPIRED or CANCELLED row can be revived (maintains 1 record per user/event).
        const currentRegStatus = registration ? eventPayment.normalizeStatus(registration) : null;
        if (registration && (currentRegStatus === 'EXPIRED' || currentRegStatus === 'CANCELLED')) {
            registration.status = requiresPayment ? 'PENDING_PAYMENT' : 'CONFIRMED';
            registration.paymentStatus = requiresPayment ? 'pending' : 'none';
            registration.lastVerificationError = '';
        }

        // Already paid & confirmed → idempotent success (never charge twice).
        if (registration && eventPayment.hasAccess(registration)) {
            return res.status(200).json({
                success: true,
                alreadyRegistered: true,
                requiresPayment: false,
                message: 'You are already registered and your payment is verified.',
                data: {
                    registration: serializeRegistration(registration),
                    event: serializePublic(event.toObject(), { registered: await eventPayment.countActiveSeats(event._id) })
                }
            });
        }

        const totalSlots = Number(event.totalSlots || 0);
        const seatsHeld = await eventPayment.countActiveSeats(event._id);
        // A live PENDING_PAYMENT row for this user already holds a seat.
        const alreadyHoldingSeat = registration
            && eventPayment.normalizeStatus(registration) === 'PENDING_PAYMENT'
            && !eventPayment.isExpired(registration);

        if (!alreadyHoldingSeat && totalSlots > 0 && seatsHeld >= totalSlots) {
            return res.status(409).json({
                success: false,
                code: 'EVENT_FULL',
                message: 'This event is fully booked. Please check back for cancellations.'
            });
        }

        if (!registration) {
            registration = await EventRegistration.create({
                eventRef: event._id,
                userId: user._id,
                fullName,
                phone,
                email,
                city,
                selectedDate,
                selectedSlot,
                bookingRef: eventPayment.buildBookingRef(),
                amountDue: amount,
                amountPaid: 0,
                currency: requiresPayment ? currency : '',
                status: requiresPayment ? 'PENDING_PAYMENT' : 'CONFIRMED',
                paymentStatus: requiresPayment ? 'pending' : 'none',
                paymentExpiresAt: requiresPayment ? eventPayment.paymentDeadline() : null,
                registeredVia: 'web'
            });
        } else {
            registration.fullName = fullName;
            registration.phone = phone;
            registration.email = email || registration.email;
            registration.city = city || registration.city;
            if (selectedDate) registration.selectedDate = selectedDate;
            if (selectedSlot) registration.selectedSlot = selectedSlot;
            registration.amountDue = amount;
            registration.status = requiresPayment ? 'PENDING_PAYMENT' : 'CONFIRMED';
            registration.paymentStatus = requiresPayment ? 'pending' : 'none';
            registration.paymentExpiresAt = requiresPayment ? eventPayment.paymentDeadline() : null;
            registration.lastVerificationError = '';
            await registration.save();
        }

        // ── FREE EVENT: confirm now, no gateway ───────────────────────────
        if (!requiresPayment) {
            registration.paymentStatus = 'none';
            registration.status = 'CONFIRMED';
            registration.paidAt = registration.paidAt || new Date();
            registration.accessGrantedAt = registration.accessGrantedAt || new Date();
            registration.verifiedAt = new Date();
            registration.verificationSource = 'free-event';
            registration.paymentExpiresAt = null;
            await registration.save();
            await Event.updateOne(
                { _id: event._id, registeredUsers: { $ne: user._id } },
                { $addToSet: { registeredUsers: user._id } }
            );
            broadcastEventNotification({
                title: 'Event registration confirmed',
                message: `You are registered for ${event.title}.`,
                link: `/events/${event.slug}`
            });
            return res.status(201).json({
                success: true,
                requiresPayment: false,
                message: 'Registration confirmed — this event is free.',
                data: {
                    registration: serializeRegistration(registration),
                    event: serializePublic(event.toObject(), { registered: await eventPayment.countActiveSeats(event._id) })
                }
            });
        }

        // ── PAID EVENT: seat held, access NOT granted yet ────────────────
        // Fail fast (before any transaction row exists) when the payer cannot
        // actually be charged, so we never strand a Pending transaction.
        eventPayment.resolveChapaEmail(user, { email });

        const tx_ref = eventPayment.buildTxRef(registration._id);

        // Void any older pending attempt so only one checkout can succeed.
        // Matched on the typed refs, not `metadata.registrationId`, which is
        // stored as a string and would never equal the ObjectId.
        await Transaction.updateMany(
            { eventRef: event._id, studentRef: user._id, status: 'Pending' },
            { $set: { status: 'Cancelled', 'metadata.replacedBy': tx_ref } }
        );

        const tx = await Transaction.create({
            studentRef: user._id,
            courseRef: null,
            eventRef: event._id,
            amount,
            currency,
            provider: 'chapa',
            status: 'Pending',
            txRef: tx_ref,
            metadata: {
                tx_ref,
                eventSlug: event.slug,
                eventTitle: event.title,
                registrationId: String(registration._id),
                bookingRef: registration.bookingRef,
                userId: String(user._id),
                userEmail: email,
                userPhone: phone,
                userName: fullName,
                kind: 'event'
            }
        });

        registration.txRef = tx_ref;
        registration.paymentStatus = 'pending';
        registration.paymentExpiresAt = eventPayment.paymentDeadline();
        await registration.save();

        const payload = eventPayment.buildChapaPayload({
            registration,
            event,
            amount,
            currency,
            user,
            callbackUrl: buildCallbackUrl(tx_ref, req, event.slug),
            webhookUrl: buildWebhookUrl(req)
        });

        try {
            const chapaRes = await chapa.initialize(payload);
            const checkoutUrl = chapaRes?.data?.data?.checkout_url || chapaRes?.data?.checkout_url;
            if (!checkoutUrl) {
                console.error('Chapa response missing checkout_url:', JSON.stringify(chapaRes?.data));
                registration.paymentStatus = 'failed';
                registration.lastVerificationError = 'Payment gateway did not return a checkout URL.';
                await registration.save();
                return res.status(502).json({
                    success: false,
                    code: 'PAYMENT_INIT_FAILED',
                    message: 'Payment gateway did not return a checkout URL. Please try again.'
                });
            }

            return res.status(201).json({
                success: true,
                requiresPayment: true,
                message: 'Payment required to confirm your seat.',
                data: {
                    registration: serializeRegistration(registration),
                    paymentUrl: checkoutUrl,
                    tx_ref,
                    transactionId: String(tx._id),
                    amount,
                    currency,
                    paymentExpiresAt: registration.paymentExpiresAt,
                    expiresInMinutes: eventPayment.PAYMENT_WINDOW_MINUTES,
                    event: serializePublic(event.toObject(), { registered: seatsHeld })
                }
            });
        } catch (err) {
            console.error('Chapa init error for event payment:', err.response ? err.response.data : err.message);
            registration.paymentStatus = 'failed';
            registration.lastVerificationError = 'Payment could not be started. Please try again.';
            await registration.save();
            return res.status(502).json({
                success: false,
                code: 'PAYMENT_INIT_FAILED',
                message: 'Payment could not be started. Please try again in a moment.'
            });
        }
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                code: 'DUPLICATE_REGISTRATION',
                message: 'You already have a registration for this event.'
            });
        }
        if (error && error.code === 'PAYMENT_EMAIL_INVALID') {
            return res.status(400).json({
                success: false,
                code: error.code,
                message: error.message
            });
        }
        console.error('registerForEvent error:', error);
        res.status(500).json({ success: false, message: 'Failed to register for event.' });
    }
};

// ────────────────────────────────────────────────────────────
//  PAYMENT VERIFICATION  (server-side Chapa check, idempotent)
// ────────────────────────────────────────────────────────────

const verifyEventPayment = async (tx, result) => {
    const registration = result.event && tx.metadata?.registrationId
        ? await EventRegistration.findById(tx.metadata.registrationId)
        : null;

    const verified = result.verified === true;
    return {
        verified,
        transactionStatus: (tx.status || '').toLowerCase(),
        providerStatus: result.status,
        alreadySettled: Boolean(result.alreadySettled),
        bookingRef: tx.metadata?.bookingRef || registration?.bookingRef || null,
        eventSlug: tx.metadata?.eventSlug || null,
        eventTitle: tx.metadata?.eventTitle || null,
        registrationId: tx.metadata?.registrationId || null,
        amount: tx.amount,
        currency: tx.currency,
        registration: registration ? serializeRegistration(registration) : null
    };
};

/**
 * POST /api/events/:slug/payments/verify   body: { tx_ref }
 *
 * Re-checks the transaction with Chapa from the server and settles the
 * registration from the provider's answer only. Safe to call repeatedly: an
 * already-settled transaction short-circuits without touching the gateway.
 */
exports.verifyEventPayment = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in to complete payment verification.' });
        }

        const tx_ref = String((req.body && req.body.tx_ref) || req.params.tx_ref || '').trim();
        if (!tx_ref) return res.status(400).json({ success: false, message: 'Transaction reference is required.' });

        const tx = await Transaction.findOne({
            $or: [{ txRef: tx_ref }, { 'metadata.tx_ref': tx_ref }]
        });
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });

        // Ownership is decided from the stored transaction, never from the client.
        const isOwner = tx.studentRef && String(tx.studentRef) === String(user._id);
        const isAdmin = user.assignedRole === 'Admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, code: 'NOT_TRANSACTION_OWNER', message: 'You cannot verify this transaction.' });
        }
        if (!tx.eventRef) {
            return res.status(400).json({ success: false, message: 'This transaction is not an event booking.' });
        }

        const ref = req.params.id || req.params.slug;
        if (ref) {
            const event = await findPublicEvent(ref, { allowStaff: true });
            if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
            if (String(event._id) !== String(tx.eventRef)) {
                return res.status(400).json({ success: false, message: 'Transaction does not belong to this event.' });
            }
        }

        const { tx: settledTx, result } = await eventPayment.verifyWithProvider({
            tx_ref,
            source: 'user-verify'
        });

        if (settledTx.status === 'Completed' && !settledTx.paidAt) {
            settledTx.paidAt = new Date();
            await settledTx.save();
        }

        const payload = await verifyEventPayment(settledTx, result);

        if (payload.verified && !result.alreadySettled) {
            broadcastEventNotification({
                title: 'Event payment confirmed',
                message: `Payment received for ${settledTx.metadata?.eventTitle || 'your event'}. Your seat is confirmed.`,
                link: `/events/${settledTx.metadata?.eventSlug || ''}`
            });
        }

        return res.status(200).json({ success: true, ...payload });
    } catch (err) {
        console.error('verifyEventPayment error:', err);
        res.status(err.status === 404 ? 404 : 500).json({
            success: false,
            verified: false,
            message: err.status === 404 ? err.message : 'Failed to verify payment.'
        });
    }
};

/**
 * GET /api/events/:slug/registration
 * The viewer's own registration state, computed on the server.
 * When a payment is still pending the backend opportunistically re-checks Chapa
 * so the status self-heals even if the user closed the checkout tab.
 */
exports.getMyEventRegistration = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in.' });

        const event = await findPublicEvent(req.params.id || req.params.slug, { allowStaff: true });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        await eventPayment.releaseExpiredSeats(event._id);

        let registration = await EventRegistration.findOne({
            eventRef: event._id,
            userId: user._id,
            status: { $nin: ['CANCELLED', 'cancelled'] }
        }).sort({ createdAt: -1 });

        // Self-heal a pending payment that Chapa has already settled.
        const needsReconcile = registration
            && !eventPayment.hasAccess(registration)
            && eventPayment.normalizeStatus(registration) === 'PENDING_PAYMENT'
            && registration.txRef
            && !eventPayment.isExpired(registration);

        if (needsReconcile) {
            try {
                const { tx, result } = await eventPayment.verifyWithProvider({
                    tx_ref: registration.txRef,
                    source: 'status-reconcile'
                });
                if (result.verified) {
                    registration = await EventRegistration.findById(registration._id);
                } else if (tx.status === 'Failed') {
                    registration = await EventRegistration.findById(registration._id);
                }
            } catch (err) {
                // A provider outage must not break the status page.
                console.error('registration reconcile error:', err.message);
            }
        }

        const counts = await registeredCounts([event._id]);
        res.status(200).json({
            success: true,
            data: {
                registration: serializeRegistration(registration),
                event: serializePublic(event.toObject(), counts[String(event._id)])
            }
        });
    } catch (error) {
        console.error('getMyEventRegistration error:', error);
        res.status(500).json({ success: false, message: 'Failed to load your registration.' });
    }
};

/**
 * GET /api/events/me/registrations — every event booking for the signed-in user.
 */
exports.getMyEventRegistrations = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in.' });

        const rows = await EventRegistration.find({
            userId: user._id,
            status: { $nin: ['CANCELLED', 'cancelled'] }
        }).sort({ createdAt: -1 });

        const data = [];
        for (const reg of rows) {
            const event = await Event.findById(reg.eventRef).lean();
            if (!event) continue;
            data.push({
                registration: serializeRegistration(reg),
                event: serializePublic(event, { registered: 0 })
            });
        }

        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('getMyEventRegistrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to load your event registrations.' });
    }
};

/**
 * GET /api/events/:slug/access   (protect + requireEventAccess)
 *
 * The ONLY endpoint that releases meeting credentials. Blocked unless the
 * caller is authenticated, registered, and — for paid events — verified by Chapa.
 * Typing the URL directly grants nothing.
 */
exports.getEventAccess = async (req, res) => {
    try {
        const { event, eventRegistration } = req;
        const joinUrl = event.meetingUrl || event.streamUrl || '';
        res.status(200).json({
            success: true,
            data: {
                granted: true,
                event: serializePublic(event.toObject(), { registered: 0 }),
                registration: serializeRegistration(eventRegistration),
                access: {
                    joinUrl,
                    meetingUrl: event.meetingUrl || '',
                    streamUrl: event.streamUrl || '',
                    meetingProvider: event.meetingProvider || 'internal',
                    meetingPlatform: event.meetingPlatform || '',
                    meetingPassword: event.meetingPassword || '',
                    meetingSpaceName: event.meetingSpaceName || '',
                    meetingCreatedAt: event.meetingCreatedAt || null,
                    venue: event.venue || '',
                    city: event.city || '',
                    liveStatus: computeLiveStatus(event)
                }
            }
        });
    } catch (error) {
        console.error('getEventAccess error:', error);
        res.status(500).json({ success: false, message: 'Failed to load event access.' });
    }
};

/**
 * POST /api/events/:slug/registration/cancel
 * Releases the seat and voids any pending checkout.
 */
exports.cancelMyEventRegistration = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in.' });

        const event = await findPublicEvent(req.params.id || req.params.slug, { allowStaff: true });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        const registration = await EventRegistration.findOne({
            eventRef: event._id,
            userId: user._id,
            status: { $nin: ['CANCELLED', 'cancelled'] }
        }).sort({ createdAt: -1 });

        if (!registration) {
            return res.status(404).json({ success: false, message: 'You have no active registration for this event.' });
        }
        if (eventPayment.hasAccess(registration)) {
            return res.status(400).json({
                success: false,
                code: 'ALREADY_PAID',
                message: 'Your payment is already confirmed. Contact support if you need to cancel.'
            });
        }

        registration.status = 'CANCELLED';
        registration.lastVerificationError = 'Cancelled by the attendee.';
        await registration.save();

        await Transaction.updateMany(
            { eventRef: event._id, studentRef: user._id, status: 'Pending' },
            { $set: { status: 'Cancelled', 'metadata.cancelledBy': 'attendee' } }
        );
        await Event.updateOne({ _id: event._id }, { $pull: { registeredUsers: user._id } });

        res.status(200).json({
            success: true,
            message: 'Your registration has been cancelled and the seat released.',
            data: { registration: serializeRegistration(registration) }
        });
    } catch (error) {
        console.error('cancelMyEventRegistration error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel your registration.' });
    }
};

// ────────────────────────────────────────────────────────────
//  ADMIN — REGISTRATION ROSTER
// ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/events/:id/registrations
 */
exports.getEventRegistrations = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        await eventPayment.releaseExpiredSeats(event._id);

        const rows = await EventRegistration.find({ eventRef: event._id })
            .populate('userId', 'fullName accountEmail phoneNumber assignedRole')
            .sort({ createdAt: -1 });

        const data = rows.map((r) => ({
            ...serializeRegistration(r),
            fullName: r.fullName,
            phone: r.phone,
            email: r.email,
            city: r.city,
            createdAt: r.createdAt,
            user: r.userId ? { id: String(r.userId._id || r.userId), name: r.userId.fullName, email: r.userId.accountEmail, role: r.userId.assignedRole } : null
        }));

        res.status(200).json({
            success: true,
            count: data.length,
            data,
            summary: {
                total: data.length,
                confirmed: data.filter((d) => d.accessGranted).length,
                awaitingPayment: data.filter((d) => d.registrationStatus === 'PENDING_PAYMENT').length,
                revenue: data.reduce((sum, d) => sum + (d.paymentStatus === 'completed' ? Number(d.amountPaid || 0) : 0), 0)
            }
        });
    } catch (error) {
        console.error('getEventRegistrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to load registrations.' });
    }
};
