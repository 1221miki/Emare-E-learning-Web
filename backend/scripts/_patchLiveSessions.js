const fs = require('fs');
const p = '../client/src/pages/LiveSessionsPage.jsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const replacement = `    const validateSessionForm = () => {
        const errors = {};

        if (!formData.title?.trim()) errors.title = 'Please enter a session title.';
        if (!parseDateTimeValue(formData.startTime)) errors.startTime = 'Please enter a valid start time.';
        if (!formData.durationMinutes || Number(formData.durationMinutes) <= 0) errors.durationMinutes = 'Please enter a valid duration.';

        const link = (formData.meetingLink || '').trim();
        if (!link) {
            // Every platform needs a link — the backend no longer invents one
            errors.meetingLink =
                formData.platform === 'Jitsi Meet'
                    ? 'Click "Generate Meeting Link" to create your Jitsi room.'
                    : \`A meeting link is required for \${formData.platform} sessions.\`;
        } else {
            try {
                const u = new URL(link);
                if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
            } catch {
                errors.meetingLink = 'The meeting link must be a valid URL starting with http:// or https://';
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Short helper text shown under the Meeting Link input, per platform
    const getPlatformHelperText = () => {
        switch (formData.platform) {
            case 'Google Meet':
                return integrations.googleConnected
                    ? 'Generate creates a real Google Calendar event with a Meet link.'
                    : 'Requires the admin to connect Google Calendar (Calendar Management page). You can also paste an existing Meet link.';
            case 'Zoom':
                return integrations.zoomConfigured
                    ? 'Generate creates a Zoom meeting via the configured Zoom integration.'
                    : 'Create the meeting on zoom.us and paste its invitation link here.';
            case 'Jitsi Meet':
                return 'Generates a free meeting room instantly — no account needed.';
            case 'Custom':
                return 'Enter any valid meeting URL manually. Automatic generation is not available for Custom.';
            default:
                return '';
        }
    };

    const handleGenerateMeetingLink = async () => {
        setLinkMsg(null);
        setFieldErrors(prev => ({ ...prev, meetingLink: undefined }));

        if (!formData.title?.trim()) {
            setFieldErrors({ title: 'Enter a session title first — it is used to name the meeting.' });
            return;
        }

        // ── Custom: manual entry only ──────────────────────────────────────
        if (formData.platform === 'Custom') {
            setLinkMsg({ type: 'info', text: 'Custom meetings use manual links — paste any valid meeting URL in the Meeting Link field.' });
            return;
        }

        // ── Jitsi: instant, unique, no account needed ─────────────────────
        if (formData.platform === 'Jitsi Meet') {
            const slug = \`\${(formData.title || 'emare-live-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare'}-\${Date.now().toString(36)}\`;
            setFormData(prev => ({ ...prev, meetingLink: \`https://meet.jit.si/\${slug}\` }));
            setLinkMsg({ type: 'success', text: 'Meeting link generated successfully.' });
            return;
        }

        // ── Google Meet: requires connected OAuth account ─────────────────
        if (formData.platform === 'Google Meet') {
            let googleConnected = integrations.googleConnected;
            if (googleConnected === null) {
                try {
                    const res = await liveSessionService.getIntegrationStatus();
                    googleConnected = !!res.data?.data?.googleConnected;
                    setIntegrations(prev => ({ ...prev, googleConnected }));
                } catch {
                    googleConnected = false;
                }
            }
            if (!googleConnected) {
                setLinkMsg({
                    type: 'error',
                    text: 'Google Calendar is not connected yet. An administrator must connect it from the Calendar Management page. Meanwhile, paste an existing Meet link or use Jitsi Meet.'
                });
                return;
            }
            try {
                setGeneratingLink(true);
                const parsedStart = parseDateTimeValue(formData.startTime);
                const startTimeISO = parsedStart ? parsedStart.toISOString() : formData.startTime;
                const res = await liveSessionService.createGoogleMeet({
                    title: formData.title,
                    description: formData.description,
                    startTime: startTimeISO,
                    durationMinutes: Number(formData.durationMinutes),
                    attendees: (formData.attendees || '').split(',').map(s => s.trim()).filter(Boolean)
                });
                const googleLink = res.data?.data?.meetLink;
                if (!googleLink) throw new Error('No Meet link was returned.');
                setFormData(prev => ({ ...prev, meetingLink: googleLink }));
                setLinkMsg({ type: 'success', text: 'Meeting link generated successfully.' });
            } catch (err) {
                const raw = err.response?.data?.message || err.message || '';
                const friendly = /authoriz|token|connect/i.test(raw)
                    ? 'Your Google account is not connected. An administrator must connect Google Calendar from the Calendar Management page.'
                    : raw || 'Google Meet creation failed. Please try again or paste a link manually.';
                setLinkMsg({ type: 'error', text: friendly });
            } finally {
                setGeneratingLink(false);
            }
            return;
        }

        // ── Zoom: auto-create only when the Zoom integration is configured ─
        let zoomConfigured = integrations.zoomConfigured;
        if (zoomConfigured === null) {
            try {
                const res = await liveSessionService.getIntegrationStatus();
                zoomConfigured = !!res.data?.data?.zoomConfigured;
                setIntegrations(prev => ({ ...prev, zoomConfigured }));
            } catch {
                zoomConfigured = false;
            }
        }
        if (!zoomConfigured) {
            setLinkMsg({
                type: 'info',
                text: 'Zoom meetings are created on zoom.us — please copy your Zoom invitation link and paste it in the Meeting Link field.'
            });
            return;
        }
        if (user?.assignedRole !== 'Admin') {
            setLinkMsg({
                type: 'info',
                text: 'Zoom auto-creation is available to administrators. Please paste your Zoom invitation link here.'
            });
            return;
        }
        try {
            setGeneratingLink(true);
            const parsedStart = parseDateTimeValue(formData.startTime);
            const { data: res2 } = await eventService.generateMeetingLink({
                provider: 'zoom',
                title: formData.title,
                startDate: parsedStart ? parsedStart.toISOString() : undefined,
                endDate: parsedStart ? new Date(parsedStart.getTime() + Number(formData.durationMinutes || 60) * 60000).toISOString() : undefined
            });
            const url = res2?.data?.url || res2?.data?.meetingUrl || '';
            if (!url) throw new Error('No Zoom link was returned.');
            setFormData(prev => ({ ...prev, meetingLink: url }));
            setLinkMsg({ type: 'success', text: 'Meeting link generated successfully.' });
        } catch (err) {
            const raw = err.response?.data?.message || err.message || '';
            setLinkMsg({
                type: 'error',
                text: /config|credential|env/i.test(raw)
                    ? 'The Zoom integration is not fully configured on this server. Please paste your Zoom invitation link manually.'
                    : raw || 'Zoom creation failed. Please try again or paste a link manually.'
            });
        } finally {
            setGeneratingLink(false);
        }
    };
`;

// Replace lines 181..265 (1-indexed) → indices 180..264 inclusive
const out = [...lines.slice(0, 180), replacement, ...lines.slice(265)];
fs.writeFileSync(p, out.join('\n'));
console.log('Replaced lines 181-265 OK');
