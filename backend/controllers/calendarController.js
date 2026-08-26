const CalendarEvent = require('../models/CalendarEvent');
const googleMeetService = require('../services/googleMeetService');
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

const googleError = (error) => {
    if (error.code === 'PROVIDER_NOT_CONFIGURED') return { status: 400, message: missingEnvMessage(error.provider) || 'The selected meeting provider is not connected.' };
    if (error.code === 'GOOGLE_NOT_AUTHORIZED') return { status: 400, message: error.userMessage || error.message };
    if (error.code === 'GOOGLE_PERMISSION_DENIED') return { status: 403, message: error.userMessage || 'Google denied access.' };
    if (error.code === 'INVALID_MEETING_URL') return { status: 400, message: error.message };
    if (error.code === 'MEET_CREATE_INCOMPLETE') return { status: 502, message: error.message };
    if (error.code === 'GOOGLE_API_ERROR' || error.code === 'GOOGLE_BAD_REQUEST') return { status: 502, message: error.userMessage || 'Google request failed. No meeting link was created and the event was not saved.' };
    return null;
};

// When the admin edits an Online/Hybrid event's date/time, best-effort sync the
// already-created Google Calendar event so its schedule matches — the meeting
// URL itself is preserved (never recreated on a routine edit).
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
        console.warn('calendarController: could not sync Google Calendar event.', err && err.message);
    }
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
        const mapped = googleError(error);
        if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
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

        // Switching a real-provider meeting to Physical → clean up the provider
        // resource (best effort) and never keep a stale meeting URL.
        if (payload.eventType === 'Physical' && current.meetingProvider === 'googleMeet' && current.meetingSpaceName) {
            await deleteProviderResource(current);
        } else {
            await syncGoogleCalendarTime(payload, current);
        }

        const event = await CalendarEvent.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: event });
    } catch (error) {
        const mapped = googleError(error);
        if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
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

// ── Google Meet OAuth (server-side credentials only) ─────────────────────

// GET /api/calendar/google/auth-url — returns the consent URL for the admin to
// authorize the app. Secrets never leave the server.
// Accepts optional ?returnTo=events query param so the OAuth callback knows
// which frontend page to redirect back to.
exports.getGoogleAuthUrl = async (req, res) => {
    try {
        const returnTo = (req.query && req.query.returnTo) || 'calendar';
        // Capture the frontend origin from the request so the OAuth callback
        // redirects to the same host the admin is currently using. This handles
        // both localhost and LAN IP access without changing backend/.env.
        const origin = (req.headers && (req.headers.origin || req.headers.referer))
            ? (() => {
                try {
                    return new URL(req.headers.origin || req.headers.referer).origin;
                } catch { return null; }
            })()
            : null;
        const url = googleMeetService.getAuthUrl(returnTo, origin);
        res.status(200).json({ success: true, data: { url, provider: 'googleMeet' } });
    } catch (error) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') return res.status(400).json({ success: false, message: missingEnvMessage(error.provider) || 'Google Meet is not configured.' });
        res.status(500).json({ success: false, message: 'Failed to build Google authorization URL.' });
    }
};

// GET /api/calendar/google/status — non-sensitive connection status for the UI.
exports.getGoogleStatus = async (req, res) => {
    try {
        res.status(200).json({ success: true, data: googleMeetService.connectStatus() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to read Google Meet connection status.' });
    }
};

// GET /api/calendar/google/callback?code=... — OAuth redirect target. Exchanges
// the authorization code, persists the refresh token server-side, then bounces
// the admin back to either the Events page or the Calendar Management tab,
// depending on which page initiated the OAuth flow (detected via `state` param
// or the `returnTo` query param Google passes through unchanged).
exports.handleGoogleCallback = async (req, res) => {
    const code = req.query && req.query.code;
    // Decode returnTo and origin from the state param that Google echoes back.
    let returnTo = 'calendar';
    let frontendBase = FRONTEND_BASE;
    try {
        const rawState = req.query && req.query.state;
        if (rawState) {
            const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
            if (parsed && parsed.returnTo) returnTo = parsed.returnTo;
            // Use the origin the browser was on when the admin clicked "Connect"
            // so the redirect lands on the correct host (localhost vs LAN IP).
            if (parsed && parsed.origin) frontendBase = parsed.origin;
        }
    } catch { /* ignore malformed state — use defaults */ }

    const redirectTo = (status, reason) => {
        let path;
        if (returnTo === 'events') {
            path = `/admin/events?googleMeet=${status}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
        } else {
            path = `/admin/events?calendar=1&googleMeet=${status}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
        }
        return res.redirect(`${frontendBase}${path}`);
    };
    try {
        if (!code) {
            return redirectTo('error', 'No authorization code received from Google.');
        }
        await googleMeetService.exchangeCode(code);
        redirectTo('connected');
    } catch (error) {
        console.error('Google OAuth callback error:', error && error.message);
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
            redirectTo('error', 'Google Meet is not configured.');
        } else {
            redirectTo('error', 'Google authorization failed. Please try again.');
        }
    }
};
