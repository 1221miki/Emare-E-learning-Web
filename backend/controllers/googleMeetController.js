const googleMeetService = require('../services/googleMeetService');
const { missingEnvMessage } = require('../services/meetingService');

// Creates a REAL Google Meet meeting space through the official Google Meet API.
// Credentials stay server-side (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
// GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN / .google-oauth.json token store).
// The returned URL is the real meetingUri from Google — never constructed locally.

exports.createGoogleMeetEvent = async (req, res) => {
    try {
        const { title, startTime, endTime, durationMinutes } = req.body || {};

        const space = await googleMeetService.createMeetingSpace({ title, startTime, endTime, durationMinutes });

        return res.status(200).json({
            success: true,
            data: {
                meetLink: space.url,
                meetingUrl: space.url,
                provider: 'googleMeet',
                meetingSpaceName: space.meetingSpaceName,
                meetingProviderId: space.meetingProviderId,
                meetingCreatedAt: space.meetingCreatedAt,
                metadata: space.metadata,
                message: 'Real Google Meet meeting created successfully.'
            }
        });
    } catch (err) {
        if (err.code === 'PROVIDER_NOT_CONFIGURED') {
            return res.status(400).json({ success: false, message: missingEnvMessage(err.provider) || 'Google Meet is not connected.' });
        }
        if (err.code === 'GOOGLE_NOT_AUTHORIZED') {
            return res.status(400).json({ success: false, message: err.userMessage || err.message });
        }
        if (err.code === 'GOOGLE_PERMISSION_DENIED') {
            return res.status(403).json({ success: false, message: err.userMessage || 'Google denied access.' });
        }
        if (err.code === 'MEET_CREATE_INCOMPLETE') {
            return res.status(502).json({ success: false, message: err.message });
        }
        console.error('Google Meet creation error:', err && err.message);
        res.status(500).json({ success: false, message: 'Failed to create Google Meet meeting. No meeting was created.' });
    }
};

/**
 * GET /api/calendar/google/auth-url
 * Returns the Google OAuth authorization URL the admin opens to authorize the
 * app. The refresh token is stored securely on the backend after the callback.
 */
exports.getGoogleAuthUrl = (req, res) => {
    try {
        const url = googleMeetService.getAuthUrl();
        res.status(200).json({ success: true, data: { url } });
    } catch (err) {
        if (err.code === 'PROVIDER_NOT_CONFIGURED') {
            return res.status(400).json({ success: false, message: missingEnvMessage('googleMeet') || 'Google Meet is not connected.' });
        }
        console.error('Google auth URL error:', err && err.message);
        res.status(500).json({ success: false, message: 'Failed to build Google authorization URL.' });
    }
};

/**
 * GET /api/calendar/google/status
 * Reports whether Google Meet is connected/authorized. Safe to expose — never
 * returns tokens or client secrets.
 */
exports.getGoogleStatus = (req, res) => {
    try {
        res.status(200).json({ success: true, data: googleMeetService.getStatus() });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to read Google Meet connection status.' });
    }
};

/**
 * GET /api/calendar/google/callback?code=...
 * Exchanges the OAuth authorization code for a refresh token and persists it
 * server-side (gitignored file). The token is never returned to the client.
 */
exports.handleGoogleOAuthCallback = async (req, res) => {
    try {
        const { code } = req.query || {};
        if (!code) return res.status(400).json({ success: false, message: 'Authorization code is missing.' });
        const result = await googleMeetService.exchangeCode(code);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error('Google OAuth callback error:', err && err.message);
        res.status(400).json({ success: false, message: 'Google authorization failed. Please try again.' });
    }
};