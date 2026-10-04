const fs = require('fs');
const p = '../client/src/pages/LiveSessionsPage.jsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const replacement = `    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateSessionForm()) return;

        const parsedStart = parseDateTimeValue(formData.startTime);
        const startTimeISO = parsedStart ? parsedStart.toISOString() : formData.startTime;
        const meetingLink = (formData.meetingLink || '').trim();

        const payload = {
            ...formData,
            courseRef: selectedCourse,
            meetingLink,
            startTime: startTimeISO,
            durationMinutes: Number(formData.durationMinutes),
            attendees: (formData.attendees || '').split(',').map(s => s.trim()).filter(Boolean)
        };

        try {
            await liveSessionService.createSession(payload);
            setShowForm(false);
            setLinkMsg(null);
            setFormData({ title: '', description: '', startTime: '', durationMinutes: 60, platform: 'Zoom', meetingLink: '', meetingPassword: '', attendees: '' });
            handleSelectCourse(selectedCourse); // refresh
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to schedule session';
            if (/meeting link/i.test(msg)) setFieldErrors(prev => ({ ...prev, meetingLink: msg }));
            else alert(msg);
        }
    };
`;

// Replace lines 349..399 (1-indexed) → indices 348..398
const out = [...lines.slice(0, 348), replacement, ...lines.slice(399)];
fs.writeFileSync(p, out.join('\n'));
console.log('handleCreate replaced OK');
