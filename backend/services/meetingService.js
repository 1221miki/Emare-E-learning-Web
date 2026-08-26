const crypto = require('crypto');
const axios = require('axios');
const { google } = require('googleapis');
const googleMeetService = require('./googleMeetService');

/**
 * Meeting Service — real meeting-provider integration for event meeting links.
 *
 * Providers (provider key → display label → required env vars):
 *   googleMeet       → Google Meet        → GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *                                           GOOGLE_REDIRECT_URI (+ refresh token via
 *                                           GOOGLE_REFRESH_TOKEN or backend/.google-oauth.json)
 *   zoom             → Zoom               → ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 *   microsoftTeams   → Microsoft Teams    → TEAMS_TENANT_ID, TEAMS_CLIENT_ID,
 *                                           TEAMS_CLIENT_SECRET, TEAMS_USER_ID
 *   jitsi            → Jitsi Meet         → (no credentials — public rooms, real & free)
 *   internal         → Internal Join Link → (no credentials — app-domain join URL)
 *   custom           → Manual URL         → (admin pastes an external link)
 *
 * Google Meet uses the OFFICIAL Google Meet REST API (v2) through
 * googleMeetService — a real meeting space is created and the real meet.google.com
 * URI returned by Google is stored. We never construct or fake a Meet URL.
 *
 * If a provider is chosen but not configured, a PROVIDER_NOT_CONFIGURED error is
 * thrown so the caller can tell the admin exactly which env vars are missing —
 * we never silently fall back to a fake link.
 */

const APP_BASE = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

const PROVIDERS = {
    googleMeet: {
        label: 'Google Meet',
        env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']
    },
    zoom: {
        label: 'Zoom',
        env: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET']
    },
    microsoftTeams: {
        label: 'Microsoft Teams',
        env: ['TEAMS_TENANT_ID', 'TEAMS_CLIENT_ID', 'TEAMS_CLIENT_SECRET', 'TEAMS_USER_ID']
    },
    jitsi: {
        label: 'Jitsi Meet',
        env: []
    },
    internal: {
        label: 'Internal Join Link',
        env: []
    },
    custom: {
        label: 'Manual URL',
        env: []
    }
};

const normalizeProvider = (provider) => {
    if (provider && PROVIDERS[provider]) return provider;
    return 'internal';
};

const providerConfigured = (provider) => {
    const key = normalizeProvider(provider);
    if (key === 'googleMeet') {
        return googleMeetService.isConfigured() && googleMeetService.getStatus().authorized;
    }
    return PROVIDERS[key].env.every((name) => Boolean(process.env[name]));
};

const missingProviderEnv = (provider) => {
    const key = normalizeProvider(provider);
    if (key === 'googleMeet') {
        const missing = googleMeetService.missingEnv();
        if (!googleMeetService.getStatus().authorized) missing.push('GOOGLE_REFRESH_TOKEN (authorize from Event Management)');
        return missing;
    }
    return PROVIDERS[key].env.filter((name) => !process.env[name]);
};

const isRealProvider = (provider) => ['googleMeet', 'zoom', 'microsoftTeams'].includes(provider);

const isValidMeetingUrl = (value) => {
    if (!value || typeof value !== 'string') return false;
    try {
        const u = new URL(value.trim());
        return ['http:', 'https:'].includes(u.protocol);
    } catch {
        return false;
    }
};

// Real Google Meet URLs look like https://meet.google.com/abc-defg-hij (lowercase)
const GOOGLE_MEET_URL_PATTERN = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?[a-z0-9&=#._/-]*)?$/;

// Never treat placeholder/example URLs as valid meeting links.
const PLACEHOLDER_PATTERNS = [
    /\/live\b/i,          // "https://.../live" placeholder
    /placeholder/i,
    /example\.(com|org|net)/i,
    /\.\.\./i,
    /your-meeting|your-url|your-.*-meeting/i
];

const isValidGoogleMeetUrl = (value) => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!GOOGLE_MEET_URL_PATTERN.test(trimmed)) return false;
    return !PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
};

const isPlaceholderUrl = (value) =>
    typeof value === 'string' && PLACEHOLDER_PATTERNS.some((re) => re.test(value.trim()));

const normalizeSlug = (slug) =>
    String(slug || 'emare-meeting')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'emare-meeting';

const generateToken = () => crypto.randomBytes(8).toString('hex');

const generateInternalJoinUrl = (slug) => `${APP_BASE}/join/event/${normalizeSlug(slug) || `event-${generateToken()}`}`;

// ── Invitees ───────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const parseInvitees = (value) => {
    if (!value) return [];
    const raw = Array.isArray(value) ? value.join(',') : String(value);
    return raw
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
};

/**
 * Parse, trim, lowercase, deduplicate and validate a comma/newline separated
 * invitee list. Invalid addresses are never persisted — they are returned so
 * the caller can surface a useful validation error.
 * @param {string|string[]} value
 * @returns {{ list: string[], invalid: string[] }}
 */
const validateInvitees = (value) => {
    const seen = new Set();
    const list = [];
    const invalid = [];
    parseInvitees(value).forEach((email) => {
        const e = email.toLowerCase();
        if (!EMAIL_PATTERN.test(e)) {
            invalid.push(email);
            return;
        }
        if (seen.has(e)) return;
        seen.add(e);
        list.push(e);
    });
    return { list, invalid };
};

// Picks the provider-metadata fields that should be persisted on an event.
const meetingFields = (r = {}) => ({
    meetingUrl: r.meetingUrl || '',
    meetingSpaceName: r.meetingSpaceName || '',
    meetingProviderId: r.meetingProviderId || '',
    meetingCreatedAt: r.meetingCreatedAt || null,
    meetingMetadata: r.meetingMetadata || null
});

// ── Provider implementations ─────────────────────────────────────

const createGoogleMeet = async ({ title, startDate, endDate }) => {
    if (!providerConfigured('googleMeet')) {
        const err = new Error('Google Meet is not connected.');
        err.code = 'PROVIDER_NOT_CONFIGURED';
        err.provider = 'googleMeet';
        throw err;
    }
    // A real Google Calendar event is created with a Google Meet conference via
    // conferenceData. The returned hangoutLink is the actual meet.google.com URL.
    const result = await googleMeetService.createCalendarMeet({ title, startDate, endDate });
    return {
        url: result.meetingUrl,
        ...meetingFields(result),
        provider: 'googleMeet',
        generated: true
    };
};

const getZoomToken = async () => {
    const resp = await axios.post('https://zoom.us/oauth/token', null, {
        params: { grant_type: 'account_credentials', account_id: process.env.ZOOM_ACCOUNT_ID },
        auth: { username: process.env.ZOOM_CLIENT_ID, password: process.env.ZOOM_CLIENT_SECRET },
        timeout: 15000
    });
    return resp.data.access_token;
};

const createZoomMeeting = async ({ title, startDate, endDate }) => {
    if (!providerConfigured('zoom')) {
        const err = new Error('Zoom is not connected.');
        err.code = 'PROVIDER_NOT_CONFIGURED';
        err.provider = 'zoom';
        throw err;
    }
    const token = await getZoomToken();
    const userId = process.env.ZOOM_USER_ID || 'me';
    const start = startDate ? new Date(startDate) : new Date(Date.now() + 3600000);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 3600000);
    const durationMinutes = Math.max(30, Math.round((end - start) / 60000));
    const resp = await axios.post(
        `https://api.zoom.us/v2/users/${userId}/meetings`,
        {
            topic: title || 'Emare Meeting',
            type: 2,
            start_time: start.toISOString(),
            duration: durationMinutes,
            timezone: 'UTC',
            settings: { join_before_host: true }
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );
    if (!resp.data.join_url) throw new Error('Zoom did not return a join URL.');
    return { url: resp.data.join_url, provider: 'zoom', generated: true };
};

const getTeamsToken = async () => {
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
        client_id: process.env.TEAMS_CLIENT_ID,
        client_secret: process.env.TEAMS_CLIENT_SECRET
    });
    const resp = await axios.post(
        `https://login.microsoftonline.com/${process.env.TEAMS_TENANT_ID}/oauth2/v2.0/token`,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    return resp.data.access_token;
};

const createTeamsMeeting = async ({ title, startDate, endDate }) => {
    if (!providerConfigured('microsoftTeams')) {
        const err = new Error('Microsoft Teams is not connected.');
        err.code = 'PROVIDER_NOT_CONFIGURED';
        err.provider = 'microsoftTeams';
        throw err;
    }
    const token = await getTeamsToken();
    const start = startDate ? new Date(startDate) : new Date(Date.now() + 3600000);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 3600000);
    const resp = await axios.post(
        `https://graph.microsoft.com/v1.0/users/${process.env.TEAMS_USER_ID}/onlineMeetings`,
        {
            subject: title || 'Emare Meeting',
            startDateTime: start.toISOString(),
            endDateTime: end.toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );
    if (!resp.data.joinUrl) throw new Error('Microsoft Teams did not return a join URL.');
    return { url: resp.data.joinUrl, provider: 'microsoftTeams', generated: true };
};

const createJitsiLink = (slug) => `https://meet.jit.si/${normalizeSlug(slug)}`;

// ── Public API ───────────────────────────────────────────────────

/**
 * Generate a meeting link for a given provider.
 * @param {object} eventData
 * @param {string} eventData.provider     googleMeet | zoom | microsoftTeams | jitsi | internal | custom
 * @param {string} [eventData.title]
 * @param {string} [eventData.slug]
 * @param {string} [eventData.startDate]
 * @param {string} [eventData.endDate]
 * @param {boolean} [eventData.allowFallback=true]  When false, an unconfigured
 *                  provider surfaces its error instead of silently returning a
 *                  Jitsi URL (used by live sessions, which must never receive
 *                  a link from the wrong platform).
 * @returns {Promise<{ url, provider, generated, meetingUrl?, meetingSpaceName?, meetingProviderId?, meetingCreatedAt?, meetingMetadata? }>
 */
const generateMeetingUrl = async (eventData = {}) => {
    const provider = normalizeProvider(eventData.provider);
    const { title, slug, startDate, endDate } = eventData || {};

    let result;
    try {
        switch (provider) {
            case 'googleMeet':
                result = await createGoogleMeet({ title, startDate, endDate });
                break;
            case 'zoom':
                result = await createZoomMeeting({ title, startDate, endDate });
                break;
            case 'microsoftTeams':
                result = await createTeamsMeeting({ title, startDate, endDate });
                break;
            case 'jitsi':
                result = { url: createJitsiLink(slug), provider: 'jitsi', generated: true };
                break;
            case 'custom':
                throw new Error('Cannot auto-generate a link for a manual URL.');
            case 'internal':
            default:
                result = { url: generateInternalJoinUrl(slug), provider: 'internal', generated: true };
                break;
        }
    } catch (error) {
        // Graceful fallback: an unconnected premium provider (e.g. Google Meet
        // that has not been authorized yet) must never block saving an event.
        // Fall back to a free Jitsi room so Online/Hybrid events still get a
        // real, joinable meeting link out of the box.
        const unconfigured =
            error.code === 'PROVIDER_NOT_CONFIGURED' ||
            error.code === 'GOOGLE_NOT_AUTHORIZED' ||
            (provider === 'googleMeet' && /not connected|not configured|authorize/i.test(String(error.message || '')));
        if (unconfigured && eventData.allowFallback !== false) {
            return { url: createJitsiLink(slug || title), provider: 'jitsi', generated: true };
        }
        throw error;
    }
    return result;
};

const missingEnvMessage = (provider) => {
    const key = normalizeProvider(provider);
    if (!isRealProvider(key) && key !== 'googleMeet') return null;
    if (key === 'googleMeet') {
        const missing = googleMeetService.missingEnv();
        if (!googleMeetService.getStatus().authorized) missing.push('GOOGLE_REFRESH_TOKEN (authorize from Event Management)');
        if (missing.length === 0) return null;
        return `Google Meet is not connected yet. Add to backend/.env: ${missing.join(', ')}`;
    }
    const missing = missingProviderEnv(key);
    if (missing.length === 0) return null;
    return `${PROVIDERS[key].label} is not connected yet. Add to backend/.env: ${missing.join(', ')}`;
};

/**
 * Decide the meeting URL that should be persisted, generating when needed.
 * Async because real providers hit external APIs.
 *
 * @param {object} opts
 * @param {string} [opts.existing]   URL currently stored on the event
 * @param {string} [opts.supplied]   URL submitted by the client (may be empty)
 * @param {string} opts.eventType    Online | Physical | Hybrid
 * @param {string} [opts.provider]   Preferred provider
 * @param {string} [opts.title]
 * @param {string} [opts.slug]
 * @param {string} [opts.startDate]
 * @param {string} [opts.endDate]
 * @returns {Promise<{ url, provider, generated, changed, meeting?: object|null }>}
 *   meeting is populated ONLY when a real provider resource was just created.
 *   When a URL already exists it is preserved (changed:false, meeting:null) so
 *   editors never recreate a meeting on every save.
 */
const resolveMeetingUrl = async ({ existing = '', supplied, eventType, provider, title, slug, startDate, endDate }) => {
    const type = eventType || 'Hybrid';
    const manual = typeof supplied === 'string' ? supplied.trim() : '';
    const chosen = normalizeProvider(provider || 'internal');

    if (type === 'Physical') {
        return { url: '', provider: 'internal', generated: false, changed: Boolean(existing), meeting: null };
    }

    if (manual) {
        if (chosen === 'googleMeet') {
            // Real Google Meet links only — never placeholders or fake URLs.
            if (!isValidGoogleMeetUrl(manual)) {
                const err = new Error('That is not a valid Google Meet link. Only real https://meet.google.com/xxx-xxxx-xxx links are accepted.');
                err.code = 'INVALID_MEETING_URL';
                throw err;
            }
            return { url: manual, provider: 'googleMeet', generated: false, changed: manual !== existing, meeting: null };
        }
        if (!isValidMeetingUrl(manual) || isPlaceholderUrl(manual)) {
            const err = new Error('Meeting URL is invalid — use a full http(s) link.');
            err.code = 'INVALID_MEETING_URL';
            throw err;
        }
        return { url: manual, provider: 'custom', generated: false, changed: manual !== existing, meeting: null };
    }

    if (existing && existing.trim()) {
        return { url: existing.trim(), provider: chosen, generated: false, changed: false, meeting: null };
    }

    // Manual-only provider: there is nothing to auto-generate, so leave the URL
    // empty instead of throwing. The event still saves and the validation
    // checklist flags the missing live-stream link for Online/Hybrid events.
    if (chosen === 'custom') {
        return { url: '', provider: 'custom', generated: false, changed: false, meeting: null };
    }

    const result = await generateMeetingUrl({ provider: chosen, title, slug, startDate, endDate });
    return {
        ...result,
        changed: true,
        meeting: result.provider === 'googleMeet' ? meetingFields(result) : null
    };
};

/**
 * Merge the resolved meeting result into a payload/event doc that will be
 * persisted. Rules:
 *  - Physical event → provider resource fields are cleared.
 *  - A freshly created real provider resource (resolved.meeting) → stored with
 *    status 'created'.
 *  - Manual URL → stored without provider metadata (provider 'custom').
 *  - An existing provider resource (edits) → preserved untouched with status
 *    'preserved' so the same meeting URL is kept across saves.
 *  - Everything else (internal/jitsi/zoom/teams URLs) → URL kept, no metadata.
 *
 * @param {object} doc      Payload being built (mutated in place)
 * @param {object} resolved Result of resolveMeetingUrl()
 * @param {object|null} prev Previously stored event doc (edit case)
 */
const mergeMeetingInfo = (doc, resolved = {}, prev = null) => {
    const meeting = resolved.meeting;
    const url = (meeting && meeting.meetingUrl) || resolved.url || '';
    const type = doc.eventType || (prev && prev.eventType) || 'Hybrid';

    if (type === 'Physical' || (!url && !meeting)) {
        doc.meetingUrl = '';
        doc.meetingSpaceName = '';
        doc.meetingProviderId = '';
        doc.meetingCreatedAt = null;
        doc.meetingMetadata = null;
        doc.meetingStatus = 'none';
        doc.meetingProvider = 'internal';
        doc.streamUrl = '';
        return doc;
    }

    if (meeting) {
        doc.meetingUrl = meeting.meetingUrl || url;
        doc.meetingSpaceName = meeting.meetingSpaceName || '';
        doc.meetingProviderId = meeting.meetingProviderId || '';
        doc.meetingCreatedAt = meeting.meetingCreatedAt || new Date();
        doc.meetingMetadata = meeting.meetingMetadata || null;
        doc.meetingStatus = 'created';
        doc.meetingProvider = resolved.provider || 'googleMeet';
        doc.streamUrl = doc.meetingUrl;
        return doc;
    }

    if (resolved.provider === 'custom') {
        doc.meetingUrl = url;
        doc.meetingSpaceName = '';
        doc.meetingProviderId = '';
        doc.meetingCreatedAt = null;
        doc.meetingMetadata = null;
        doc.meetingStatus = 'none';
        doc.meetingProvider = 'custom';
        doc.streamUrl = url;
        return doc;
    }

    // Preserve a previously-created real provider resource (never recreate on edit).
    if (prev && (prev.meetingSpaceName || prev.meetingProviderId || prev.meetingUrl)) {
        doc.meetingUrl = prev.meetingUrl || prev.streamUrl || url;
        doc.meetingSpaceName = prev.meetingSpaceName || '';
        doc.meetingProviderId = prev.meetingProviderId || '';
        doc.meetingCreatedAt = prev.meetingCreatedAt || null;
        doc.meetingMetadata = prev.meetingMetadata || null;
        doc.meetingStatus = 'preserved';
        doc.meetingProvider = prev.meetingProvider || resolved.provider || 'internal';
        doc.streamUrl = doc.meetingUrl;
        return doc;
    }

    // Plain non-provider link (internal / jitsi / zoom / teams URL).
    doc.meetingUrl = url;
    doc.meetingSpaceName = '';
    doc.meetingProviderId = '';
    doc.meetingCreatedAt = null;
    doc.meetingMetadata = null;
    doc.meetingStatus = 'none';
    doc.meetingProvider = resolved.provider || 'internal';
    doc.streamUrl = url;
    return doc;
};

/**
 * Best-effort provider resource cleanup when an event is deleted or switched to
 * Physical. Google Meet has no delete-space API, so we end any active
 * conference and log failures safely — the LMS document is always removed
 * regardless of the provider outcome so the database stays consistent.
 *
 * @param {object} event Previously stored event document
 * @returns {Promise<boolean>}
 */
const deleteProviderResource = async (event = {}) => {
    if (event.meetingProvider === 'googleMeet' && (event.meetingSpaceName || event.meetingProviderId)) {
        return googleMeetService.deleteProviderResource({
            meetingSpaceName: event.meetingSpaceName,
            meetingProviderId: event.meetingProviderId
        });
    }
    return true;
};

module.exports = {
    PROVIDERS,
    normalizeProvider,
    providerConfigured,
    missingEnvMessage,
    isValidMeetingUrl,
    isValidGoogleMeetUrl,
    validateInvitees,
    generateMeetingUrl,
    resolveMeetingUrl,
    mergeMeetingInfo,
    deleteProviderResource
};
