const CalendarEvent = require('../models/CalendarEvent');
const {
    resolveMeetingUrl,
    normalizeProvider,
    missingEnvMessage,
    mergeMeetingInfo,
    deleteProviderResource,
    validateInvitees
} = require('../services/meetingService');

const FRONTEND_BASE = (() => {
    // Prefer the explicit FRONTEND_URL. Fall back to APP_BASE_URL.
    // Strip any trailing slash so redirect paths append cleanly.
    const base = (process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    return base;
})();

// Ensure an Online/Hybrid internal event always carries a real meeting link.
// `previous` is the existing document during edits so an already-created
// provider resource is preserved instead of being recreated on every save.
const withMeetingUrl = async (body, previous = null) => {
    const prev = previous && typeof previous.toObject === 'function' ? previous.toObject() : previous;
    const eventType = body.eventType || prev?.eventType || 'Hybrid';
    const resolved = await resolveMeetingUrl({
        existing: prev?.streamUrl || '',
        supplied: typeof body.streamUrl === 'string' ? body.streamUrl : '',
        eventType,
        provider: body.meetingProvider || prev?.meetingProvider,
        title: body.title || prev?.title,
        startDate: body.startDate || prev?.startDate,
        endDate: body.endDate || prev?.endDate
    });
    const doc = { ...body, eventType };
    mergeMeetingInfo(doc, resolved, prev);
    return doc;
};

exports.getCalendarEvents = async (req, res) => {
    try {
        const { category, from, to } = req.query;
        const query = {};

        if (category) query.category = category;
        if (from || to) {
            query.startDate = {};
            if (from) query.startDate.$gte = new Date(from);
            if (to) query.startDate.$lte = new Date(to);
        }

        const events = await CalendarEvent.find(query).populate('createdBy', 'fullName accountEmail').sort({ startDate: 1 });
        res.status(200).json({ success: true, count: events.length, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load calendar events.' });
    }
};

exports.createCalendarEvent = async (req, res) => {
    try {
        const payload = await withMeetingUrl(req.body || {});
        payload.visibility = payload.visibility || 'internal';
        payload.meetingProvider = normalizeProvider(payload.meetingProvider);

        // Normalize invitees: trim, dedupe, validate — surface invalid addresses.
        const inviteeInput = payload.invitees ?? payload.meetingInvitees;
        if (inviteeInput !== undefined && inviteeInput !== null) {
            const { list, invalid } = validateInvitees(inviteeInput);
            if (invalid.length) return res.status(400).json({ success: false, message: `Invalid invitee email(s): ${invalid.join(', ')}` });
            payload.invitees = list;
            payload.meetingInvitees = list.join(', ');
        }

        const event = await CalendarEvent.create({
            ...payload,
            createdBy: req.user?.id
        });
        res.status(201).json({ success: true, data: event });
    } catch (error) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            const msg = await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.';
            return res.status(400).json({ success: false, message: msg });
        }
        console.error('createCalendarEvent error:', error && error.message);
        res.status(500).json({ success: false, message: 'Failed to create calendar event.' });
    }
};

exports.updateCalendarEvent = async (req, res) => {
    try {
        const current = await CalendarEvent.findById(req.params.id);
        if (!current) return res.status(404).json({ success: false, message: 'Calendar event not found.' });
        const payload = await withMeetingUrl(req.body || {}, current);

        // Normalize invitees on edit (same rules as create).
        const inviteeInput = payload.invitees ?? payload.meetingInvitees;
        if (inviteeInput !== undefined && inviteeInput !== null) {
            const { list, invalid } = validateInvitees(inviteeInput);
            if (invalid.length) return res.status(400).json({ success: false, message: `Invalid invitee email(s): ${invalid.join(', ')}` });
            payload.invitees = list;
            payload.meetingInvitees = list.join(', ');
        }

        const event = await CalendarEvent.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: event });
    } catch (error) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            const msg = await missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.';
            return res.status(400).json({ success: false, message: msg });
        }
        console.error('updateCalendarEvent error:', error && error.message);
        res.status(500).json({ success: false, message: 'Failed to update calendar event.' });
    }
};

exports.deleteCalendarEvent = async (req, res) => {
    try {
        const event = await CalendarEvent.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Calendar event not found.' });

        // Best-effort provider cleanup. Provider failures must never block the
        // database deletion, so the LMS calendar stays consistent.
        await deleteProviderResource(event);

        await CalendarEvent.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Calendar event deleted.' });
    } catch (error) {
        console.error('deleteCalendarEvent error:', error && error.message);
        res.status(500).json({ success: false, message: 'Failed to delete calendar event.' });
    }
};
