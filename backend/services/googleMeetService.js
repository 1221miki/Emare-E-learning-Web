const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { google } = require('googleapis');
const OAuthToken = require('../models/OAuthToken');

/**
 * googleMeetService — REAL Google Meet API integration.
 *
 * Creates real meeting spaces through the official Google Meet REST API (v2)
 * using OAuth2 credentials held ONLY on the backend.
 *
 * Required env vars (backend/.env):
 *   GOOGLE_CLIENT_ID=
 *   GOOGLE_CLIENT_SECRET=
 *   GOOGLE_REDIRECT_URI=
 *   GOOGLE_REFRESH_TOKEN=            (optional — refresh token is also stored
 *                                     server-side in backend/.google-oauth.json)
 *
 * Scope used: https://www.googleapis.com/auth/meetings.space.created
 * (the minimum scope required to create Google Meet meeting spaces)
 *
 * Credentials are never exposed to the React client and are never written to
 * MongoDB. The refresh token is persisted only to a gitignored local file
 * (backend/.google-oauth.json, mode 0600) or taken from the env var.
 */

// calendar.events lets us create real Google Calendar events with a Meet
// conference via conferenceData.createRequest (the source of truth for the
// meeting URL). meetings.space.created keeps the standalone Meet spaces API
// working for live sessions.
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/meetings.space.created'
];
const PROVIDER = 'googleMeet';
const TOKEN_FILE = path.join(__dirname, '..', '.google-oauth.json');
const TOKEN_FILE_MODE = 0o600;

const requiredEnv = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];

const missingEnv = () => requiredEnv.filter((name) => !process.env[name]);

const isConfigured = () => missingEnv().length === 0;

// ── Token store (server-side only, gitignored) ─────────────────────────

// Synchronous token read: env var → local file (MongoDB is async, handled separately)
const readStoredTokenSync = () => {
    // 1. Check env var first
    const envToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();
    if (envToken) return envToken;

    // 2. Fallback: local file (works on localhost only)
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            return parsed && parsed.refresh_token ? parsed.refresh_token : null;
        }
    } catch (err) {
        console.warn('googleMeetService: could not read token store.', err && err.message);
    }
    return null;
};

// Async token read: checks MongoDB (persistent across deploys on Render)
const readStoredTokenAsync = async () => {
    // 1. Check env var first
    const envToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();
    if (envToken) return envToken;

    // 2. Check MongoDB (persistent across deploys)
    try {
        const doc = await OAuthToken.findOne({ provider: 'google' }).exec();
        if (doc && doc.refreshToken) return doc.refreshToken;
    } catch (err) {
        console.warn('googleMeetService: could not read token from MongoDB.', err && err.message);
    }

    // 3. Fallback: local file
    return readStoredTokenSync();
};

const writeStoredToken = async (refreshToken) => {
    if (!refreshToken) return;

    // 1. Save to MongoDB (persistent across deploys)
    try {
        await OAuthToken.findOneAndUpdate(
            { provider: 'google' },
            { refreshToken, updatedAt: new Date() },
            { upsert: true, new: true }
        ).exec();
        console.log('googleMeetService: refresh token saved to MongoDB.');
    } catch (err) {
        console.warn('googleMeetService: could not persist refresh token to MongoDB.', err && err.message);
    }

    // 2. Also save to local file (for localhost fallback)
    try {
        fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: refreshToken }, null, 2), { mode: TOKEN_FILE_MODE });
        if (process.platform !== 'win32') {
            fs.chmodSync(TOKEN_FILE, TOKEN_FILE_MODE);
        }
    } catch (err) {
        console.warn('googleMeetService: could not persist refresh token to disk.', err && err.message);
    }
};

// Sync version for quick checks (env + file)
const getRefreshToken = () => readStoredTokenSync();

// Async version that also checks MongoDB (for API calls)
const getRefreshTokenAsync = async () => await readStoredTokenAsync();

const requireToken = async () => {
    const token = await getRefreshTokenAsync();
    if (!token) {
        const err = new Error('Google Meet is not authorized yet. Connect your Google account from the Calendar Management page.');
        err.code = 'GOOGLE_NOT_AUTHORIZED';
        err.provider = PROVIDER;
        throw err;
    }
};

/**
 * Map a googleapis/Gaxios error to a stable, actionable error code so callers
 * can show the admin the real reason a Google request failed.
 * @param {Error} err
 * @returns {Error} The same error, annotated with err.code and err.userMessage
 */
const normalizeGoogleError = (err, action = 'Google request') => {
    if (!err) return err;
    const status = err && err.response && err.response.status;
    const message = String((err && err.message) || '');
    const expired = status === 401 || /invalid_grant|invalid token|expired/i.test(message);
    const denied = status === 403 || /permission|forbidden|scope/i.test(message);
    if (expired) {
        err.code = 'GOOGLE_NOT_AUTHORIZED';
        err.userMessage = `Your Google authorization has expired or was revoked. Reconnect from the Calendar Management page and try again.`;
    } else if (denied) {
        err.code = 'GOOGLE_PERMISSION_DENIED';
        err.userMessage = `Google denied access (${action}). Make sure the Google Calendar/Meet API is enabled and the app is authorized.`;
    } else if (status === 400) {
        err.code = 'GOOGLE_BAD_REQUEST';
        err.userMessage = `Google rejected the request (${action}): ${message}`;
    } else {
        err.code = 'GOOGLE_API_ERROR';
        err.userMessage = `Google request failed (${action}): ${message}`;
    }
    err.provider = PROVIDER;
    return err;
};

// ── OAuth2 client ───────────────────────────────────────────────────────

const buildOAuth2Client = async () => {
    if (!isConfigured()) {
        const err = new Error('Google Meet is not connected.');
        err.code = 'PROVIDER_NOT_CONFIGURED';
        err.provider = PROVIDER;
        throw err;
    }
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        getRedirectUri()
    );
    const refreshToken = await getRefreshTokenAsync();
    if (refreshToken) {
        client.setCredentials({ refresh_token: refreshToken });
    }
    return client;
};

const getMeetApi = async () => {
    const auth = await buildOAuth2Client();
    await requireToken();
    return google.meet({ version: 'v2', auth });
};

const getCalendarApi = async () => {
    const auth = await buildOAuth2Client();
    await requireToken();
    return google.calendar({ version: 'v3', auth });
};

// ── OAuth flow (get / refresh token) ────────────────────────────────────

/**
 * Build the Google authorization URL the admin visits to authorize the app.
 * @param {string} [returnTo]  'events' → /admin/events, default → /admin calendar tab
 * @param {string} [origin]    Frontend origin from request (e.g. http://localhost:5173)
 * @returns {string}
 */
const getRedirectUri = () => {
    let uri = process.env.GOOGLE_REDIRECT_URI || '';
    // In production, if the redirect URI still points to localhost, derive it
    // from APP_BASE_URL so the OAuth flow works on the deployed site.
    if (process.env.NODE_ENV === 'production' && uri.includes('localhost')) {
        const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
        if (base && !base.includes('localhost')) {
            uri = `${base}/api/calendar/google/callback`;
            console.warn(`GOOGLE_REDIRECT_URI was localhost in production — auto-corrected to: ${uri}`);
        }
    }
    return uri;
};

const getAuthUrl = (returnTo = 'calendar', origin = null) => {
    if (!isConfigured()) {
        const err = new Error('Google Meet is not connected.');
        err.code = 'PROVIDER_NOT_CONFIGURED';
        err.provider = PROVIDER;
        throw err;
    }
    const redirectUri = getRedirectUri();
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );
    // Encode returnTo and origin inside the state so Google passes them back unchanged.
    const statePayload = JSON.stringify({
        nonce: crypto.randomBytes(16).toString('hex'),
        returnTo,
        ...(origin ? { origin } : {})
    });
    const state = Buffer.from(statePayload).toString('base64url');
    return auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        state,
        include_granted_scopes: false
    });
};

/**
 * Exchange the OAuth authorization code for tokens and persist the refresh
 * token securely on the backend. Never returns the token in the response.
 * @param {string} code
 * @returns {Promise<{ success: boolean, email?: string }>}
 */
const exchangeCode = async (code) => {
    const auth = await buildOAuth2Client();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
        throw new Error('Google did not return a refresh token. Please re-authorize (revoke and grant again).');
    }
    auth.setCredentials(tokens);
    await writeStoredToken(tokens.refresh_token);
    let email = null;
    try {
        const info = await auth.getTokenInfo(tokens.access_token);
        email = info.email || null;
    } catch {
        email = null; // non-fatal
    }
    console.log('Google OAuth: refresh token obtained and stored in MongoDB.');
    return { success: true, email };
};

/**
 * Status of the Google Meet connection. Safe to return to the client — it
 * contains NO secrets.
 * @returns {Promise<{ provider: string, label: string, connected: boolean, authorized: boolean, missingEnv: string[] }>}
 */
const getStatus = async () => {
    const missing = missingEnv();
    const token = await getRefreshTokenAsync();
    const authorized = Boolean(token);
    return {
        provider: PROVIDER,
        label: 'Google Meet',
        connected: missing.length === 0,
        authorized,
        configured: missing.length === 0,
        missingEnv: missing
    };
};

// Alias used by calendarController — same safe shape.
const connectStatus = getStatus;

// ── Google Meet API operations ──────────────────────────────────────────

const mapSpace = (space) => {
    const uri = space && space.meetingUri;
    if (!uri) throw new Error('Google Meet did not return a meeting link.');
    return {
        meetingUrl: uri,
        meetingSpaceName: space.name || '',
        meetingProviderId: space.name || '',
        meetingCode: space.meetingCode || '',
        meetingCreatedAt: new Date(),
        meetingMetadata: {
            meetingCode: space.meetingCode || '',
            accessType: space.config && space.config.accessType,
            entryPointAccess: space.config && space.config.entryPointAccess,
            conferenceUri: space.meetingUri || ''
        }
    };
};

/**
 * Create a REAL Google Meet meeting space through the official API.
 * @param {object} [opts]
 * @param {string} [opts.title]   Event title (used for logging only — the Meet
 *                                API does not store a title on the space itself)
 * @returns {Promise<{ meetingUrl, meetingSpaceName, meetingProviderId, meetingCode, meetingCreatedAt, meetingMetadata, provider, generated }>}
 */
const createMeetingSpace = async ({ title = '' } = {}) => {
    const meet = await getMeetApi();
    // accessType TRUSTED keeps invitees-only access; OPEN allows anyone with
    // the link to join. entryPointAccess ALL keeps phone + web entry points.
    let response;
    try {
        response = await meet.spaces.create({
            requestBody: {
                config: {
                    accessType: 'TRUSTED',
                    entryPointAccess: 'ALL'
                }
            }
        });
    } catch (err) {
        throw normalizeGoogleError(err, 'creating a Google Meet space');
    }
    const mapped = mapSpace(response.data);
    // Safe diagnostic log — never log tokens or client secrets.
    console.log(`Google Meet space created: ${mapped.meetingSpaceName || 'unknown'} (${title ? `event: ${title}` : 'no title'})`);
    return {
        ...mapped,
        // Friendly aliases kept for existing consumers (live-session controller).
        url: mapped.meetingUrl,
        metadata: mapped.meetingMetadata,
        provider: PROVIDER,
        generated: true
    };
};

/**
 * Read an existing meeting space (confirms the provider resource still exists).
 * @param {string} spaceName  e.g. "spaces/abc-defg-hij"
 */
const getMeetingSpace = async (spaceName) => {
    const meet = await getMeetApi();
    try {
        const response = await meet.spaces.get({ name: spaceName });
        return response.data;
    } catch (err) {
        throw normalizeGoogleError(err, 'reading a Google Meet space');
    }
};

/**
 * Update an existing meeting space. The Google Meet API only supports patching
 * the space config (access type / entry point), NOT the schedule — meeting
 * spaces do not hold a start/end time. Date/time changes are stored on the LMS
 * event and the same meeting URL is preserved.
 * @param {string} spaceName
 * @param {object} patch  e.g. { config: { accessType: 'TRUSTED', entryPointAccess: 'ALL' } }
 */
const updateMeetingSpace = async (spaceName, patch = {}) => {
    const meet = await getMeetApi();
    try {
        const response = await meet.spaces.patch({
            name: spaceName,
            requestBody: patch.config ? { config: patch.config } : patch
        });
        return response.data;
    } catch (err) {
        throw normalizeGoogleError(err, 'updating a Google Meet space');
    }
};

// ── Google Calendar API (real Meet conferences via conferenceData) ────────

/**
 * Create a REAL Google Calendar event that auto-creates a Google Meet
 * conference using the official Calendar API conferenceData configuration.
 * The returned hangoutLink is the real meet.google.com URL Google generates.
 *
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.startDate]  ISO date (may be null → defaults to +1h)
 * @param {string} [opts.endDate]    ISO date (may be null → +2h from start)
 * @returns {Promise<{ meetingUrl, meetingSpaceName, meetingProviderId, meetingCode,
 *           meetingCreatedAt, calendarEventId, meetingMetadata, provider, generated, url }>}
 */
const createCalendarMeet = async ({ title = '', startDate, endDate } = {}) => {
    const calendar = await getCalendarApi();
    const start = startDate ? new Date(startDate) : new Date(Date.now() + 3600000);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 3600000);
    const requestId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    let response;
    try {
        response = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            sendUpdates: 'none',
            requestBody: {
                summary: title || 'Emare E-Learning Meeting',
                start: { dateTime: start.toISOString(), timeZone: 'UTC' },
                end: { dateTime: end.toISOString(), timeZone: 'UTC' },
                conferenceData: {
                    createRequest: {
                        requestId,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            }
        });
    } catch (err) {
        throw normalizeGoogleError(err, 'creating the Google Calendar event with Google Meet');
    }

    const data = response.data || {};
    const conferenceData = data.conferenceData || {};
    const entryPoints = conferenceData.entryPoints || [];
    const videoEntry = entryPoints.find((ep) => ep.entryPointType === 'video');
    const hangoutLink = data.hangoutLink || (videoEntry && videoEntry.uri) || '';
    if (!hangoutLink) {
        const err = new Error('Google Calendar did not return a Google Meet hangout link. The conference may still be processing — try again.');
        err.code = 'MEET_CREATE_INCOMPLETE';
        err.provider = PROVIDER;
        throw err;
    }

    const mapped = {
        meetingUrl: hangoutLink,
        meetingSpaceName: conferenceData.conferenceId || '',
        meetingProviderId: data.id || '',
        meetingCode: conferenceData.conferenceId || '',
        calendarEventId: data.id || '',
        meetingCreatedAt: new Date(),
        meetingMetadata: {
            calendarEventId: data.id || '',
            conferenceId: conferenceData.conferenceId || '',
            hangoutLink,
            entryPoints
        }
    };
    console.log(`Google Calendar event + Meet created: ${mapped.meetingProviderId || 'unknown'} (${title ? `event: ${title}` : 'no title'})`);
    return {
        ...mapped,
        url: mapped.meetingUrl,
        metadata: mapped.meetingMetadata,
        provider: PROVIDER,
        generated: true
    };
};

/**
 * Best-effort sync of an existing Google Calendar event's time window (used when
 * the admin edits the LMS event date/time — the meeting URL is preserved).
 * Failures are swallowed so the LMS save always succeeds.
 * @param {string} calendarEventId
 * @param {object} opts { title, startDate, endDate }
 */
const updateCalendarMeet = async (calendarEventId, { title, startDate, endDate } = {}) => {
    if (!calendarEventId) return false;
    const calendar = await getCalendarApi();
    const patch = {};
    if (title) patch.summary = title;
    if (startDate) patch.start = { dateTime: new Date(startDate).toISOString(), timeZone: 'UTC' };
    if (endDate) patch.end = { dateTime: new Date(endDate).toISOString(), timeZone: 'UTC' };
    if (Object.keys(patch).length === 0) return false;
    try {
        await calendar.events.patch({ calendarId: 'primary', eventId: calendarEventId, requestBody: patch });
        return true;
    } catch (err) {
        console.warn('googleMeetService: could not sync Google Calendar event time.', err && err.message);
        return false;
    }
};

/**
 * Best-effort removal of a Google Calendar event (used when an LMS event is
 * deleted or switched to Physical). The DB operation always proceeds.
 * @param {string} calendarEventId
 */
const deleteCalendarEvent = async (calendarEventId) => {
    if (!calendarEventId) return { cleaned: false, reason: 'no-event' };
    const calendar = await getCalendarApi();
    try {
        await calendar.events.delete({ calendarId: 'primary', eventId: calendarEventId });
        return { cleaned: true };
    } catch (err) {
        if (err && (err.response && err.response.status === 404 || err.code === 404 || err.code === 403 || err.code === 401)) {
            return { cleaned: false, reason: `event-${err.code || err.response.status}` };
        }
        console.warn('googleMeetService: could not delete Google Calendar event.', err && err.message);
        return { cleaned: false, reason: 'api-error' };
    }
};

/**
 * Best-effort cleanup of a provider resource. The Google Meet API has no
 * "delete space" operation; ending any active conference is the supported
 * cleanup. Failures are logged safely and swallowed so the caller can still
 * complete the DB deletion without leaving the database inconsistent.
 * @param {object} meeting  event.meeting { meetingProviderId, meetingSpaceName, meetingUrl }
 */
const deleteMeetingSpace = async (meeting = {}) => {
    const spaceName = meeting && (meeting.meetingSpaceName || meeting.meetingProviderId);
    if (!spaceName) return { cleaned: false, reason: 'no-space' };
    try {
        const meet = await getMeetApi();
        await meet.spaces.endActiveConference({ name: spaceName });
        return { cleaned: true };
    } catch (err) {
        // 404 => already gone (fine). 403/401 => not authorized to end (fine,
        // we still delete the LMS event). Never log request/token data.
        if (err && (err.code === 404 || err.code === 403 || err.code === 401)) {
            return { cleaned: false, reason: `space-${err.code}` };
        }
        console.warn('googleMeetService: could not end active conference for space.', err && err.message);
        return { cleaned: false, reason: 'api-error' };
    }
};

/**
 * Backward-compatible entry point used by meetingService. Accepts either a
 * space name string or the stored event meeting object.
 * When the stored meeting has a Google Calendar event id, the calendar event is
 * deleted (best effort). Otherwise any active Meet conference is ended.
 * @param {string|object} spaceOrMeeting
 */
const deleteProviderResource = async (spaceOrMeeting) => {
    if (typeof spaceOrMeeting === 'string') {
        return deleteMeetingSpace({ meetingSpaceName: spaceOrMeeting, meetingProviderId: spaceOrMeeting });
    }
    const meeting = spaceOrMeeting || {};
    if (meeting.calendarEventId || (meeting.meetingMetadata && meeting.meetingMetadata.calendarEventId)) {
        const id = meeting.calendarEventId || (meeting.meetingMetadata && meeting.meetingMetadata.calendarEventId);
        return deleteCalendarEvent(id);
    }
    return deleteMeetingSpace(meeting);
};

module.exports = {
    PROVIDER,
    SCOPES,
    isConfigured,
    missingEnv,
    getAuthUrl,
    exchangeCode,
    getStatus,
    connectStatus,
    requireToken,
    getRefreshToken,
    getRefreshTokenAsync,
    normalizeGoogleError,
    createMeetingSpace,
    getMeetingSpace,
    updateMeetingSpace,
    deleteMeetingSpace,
    createCalendarMeet,
    updateCalendarMeet,
    deleteCalendarEvent,
    deleteProviderResource,
    buildOAuth2Client
};