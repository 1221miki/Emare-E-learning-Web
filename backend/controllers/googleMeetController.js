const { google } = require('googleapis');

// Creates a Google Calendar event with conferenceData (Google Meet link)
// Requires the following env vars to be set in backend/.env:
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN

const createOAuth2Client = () => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    if (process.env.GOOGLE_REFRESH_TOKEN) {
        oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    }
    return oAuth2Client;
};

exports.createGoogleMeetEvent = async (req, res) => {
    try {
        const { title, description, startTime, durationMinutes = 60, attendees = [] } = req.body;

        if (!title || !startTime) return res.status(400).json({ success: false, message: 'Missing title or startTime' });

        // If no Google credentials available, return 501 so client can fallback
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
            return res.status(501).json({ success: false, message: 'Google Meet integration not configured on server' });
        }

        const auth = createOAuth2Client();
        const calendar = google.calendar({ version: 'v3', auth });

        const start = new Date(startTime).toISOString();
        const end = new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString();

        const event = {
            summary: title,
            description: description || '',
            start: { dateTime: start },
            end: { dateTime: end },
            attendees: (attendees || []).filter(Boolean).map(email => ({ email })),
            conferenceData: { createRequest: { requestId: `emare-${Date.now()}` } }
        };

        const created = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
            sendUpdates: 'none'
        });

        const meetLink = (created.data.conferenceData && created.data.conferenceData.entryPoints)
            ? (created.data.conferenceData.entryPoints.find(e => e.entryPointType === 'video') || {}).uri
            : (created.data.hangoutLink || '');

        res.status(200).json({ success: true, data: { event: created.data, meetLink } });
    } catch (err) {
        console.error('Google Meet creation error:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to create Google Meet event' });
    }
};
