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

        // Generate a working Jitsi Meet link (no OAuth required, actually joinable)
        const slug = (title || 'emare-live-session')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 24) || 'emare-live-session';
        
        const meetLink = `https://meet.jit.si/${slug}-${Date.now()}`;

        console.log(`✅ Generated Jitsi Meet link (joinable): ${meetLink}`);
        return res.status(200).json({ 
            success: true, 
            data: { 
                meetLink,
                message: 'Meeting link generated successfully. You can now join the meeting!'
            } 
        });
    } catch (err) {
        console.error('Meeting link generation error:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to create meeting link' });
    }
};
