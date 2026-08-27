import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { liveSessionService, courseService, calendarService } from '../services/api';
import Sidebar from '../components/Sidebar';

export default function LiveSessionsPage() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [showAllSessions, setShowAllSessions] = useState(false);
    
    // Admin/Instructor state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        durationMinutes: 60,
        // Jitsi is the default — it always generates a real link with no setup.
        platform: 'Jitsi Meet',
        meetingLink: '',
        meetingProvider: '',
        meetingProviderId: '',
        meetingPassword: '',
        attendees: ''
    });
    // Small inline status message under the Meeting Link field
    const [linkMsg, setLinkMsg] = useState(null);   // { type:'success'|'error'|'info', text }
    const [generatingLink, setGeneratingLink] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    // Which meeting integrations this server actually has configured
    const [integrations, setIntegrations] = useState({ googleConnected: null, zoomConfigured: null, googleMissingEnv: [], zoomMissingEnv: [] });

    const navItems = [
        { label: 'Dashboard', path: `/${user?.assignedRole.toLowerCase()}/dashboard`, key: 'dashboard' },
        { label: 'Direct Messages', path: '/messages', key: 'messages' },
        { label: 'Live Sessions', path: '/live-sessions', key: 'live' }
    ];

    useEffect(() => {
        // Fetch courses user is involved in based on user role
        const fetchCourses = async () => {
            try {
                let courseList = [];
                let explicitCourseIds = [];

                if (user?.assignedRole === 'Student') {
                    const res = await courseService.getStudentEnrollments();
                    const enrollments = res.data?.data || [];
                    courseList = enrollments
                        .map(e => e.courseRef)
                        .filter(c => c && c._id);
                    explicitCourseIds = courseList.map(c => c._id);
                } else if (user?.assignedRole === 'Instructor') {
                    const res = await courseService.getInstructorCourses();
                    courseList = res.data?.data || [];
                } else {
                    const res = await courseService.getAll();
                    courseList = res.data?.data || [];
                }

                setCourses(courseList);
                if (courseList.length > 0) {
                    handleSelectCourse(courseList[0]._id);
                    setShowAllSessions(false);
                } else {
                    setSelectedCourse(null);
                    setSessions([]);
                    if (user?.assignedRole === 'Student') {
                        setShowAllSessions(true);
                    }
                }

                if (user?.assignedRole === 'Student' && explicitCourseIds.length === 0) {
                    setShowAllSessions(true);
                }
            } catch (err) {
                console.error('Failed to fetch courses for live sessions:', err);
                setCourses([]);
                setSessions([]);
                if (user?.assignedRole === 'Student') {
                    setShowAllSessions(true);
                }
            }
        };

        if (user) {
            fetchCourses();
        }
    }, [user]);

    const handleSelectCourse = async (courseId) => {
        if (!courseId) return;
        setSelectedCourse(courseId);
        setShowAllSessions(false);
        try {
            const res = await liveSessionService.getCourseSessions(courseId);
            setSessions(res.data?.data || []);
        } catch (err) {
            console.error('Failed to get course live sessions:', err);
            setSessions([]);
        }
    };

    const handleShowAllSessions = async () => {
        setSelectedCourse(null);
        setShowAllSessions(true);
        try {
            const res = await liveSessionService.getAllSessions();
            setSessions(res.data?.data || []);
        } catch (err) {
            console.error('Failed to get all live sessions:', err);
            setSessions([]);
        }
    };

    const isValidMeetingLink = (link) => {
        return typeof link === 'string' && link.trim().startsWith('http');
    };

    const getDefaultMeetingLink = (platform, title) => {
        const slug = (title || 'emare-live-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare-live-session';
        if (platform === 'Jitsi Meet') return `https://meet.jit.si/${slug}`;
        if (platform === 'Custom') return null;
        return null;
    };

    const parseDateTimeValue = (value) => {
        if (!value) return null;
        if (typeof value !== 'string') return null;
        const normalized = value.trim();

        // Prefer ISO format if supplied by datetime-local input
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
            const parsed = new Date(normalized);
            return parsed.toString() !== 'Invalid Date' ? parsed : null;
        }

        // Parse common slash-based datetime formats such as mm/dd/yyyy or dd/mm/yyyy
        const slashDateTimeMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
        if (slashDateTimeMatch) {
            const [, part1, part2, year, hour = '00', minute = '00', second = '00', ampm] = slashDateTimeMatch;
            const num1 = Number(part1);
            const num2 = Number(part2);
            let month = num1;
            let day = num2;

            if (num1 > 12 && num2 <= 12) {
                month = num2;
                day = num1;
            }

            let hour24 = Number(hour);
            if (ampm) {
                const upper = ampm.toUpperCase();
                if (upper === 'PM' && hour24 < 12) hour24 += 12;
                if (upper === 'AM' && hour24 === 12) hour24 = 0;
            }

            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
            const parsed = new Date(dateString);
            if (parsed.toString() !== 'Invalid Date') return parsed;
        }

        const parsed = new Date(normalized);
        return parsed.toString() !== 'Invalid Date' ? parsed : null;
    };

    const validateSessionForm = () => {
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
                    : `A meeting link is required for ${formData.platform} sessions.`;
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

    // Fetch the real integration status from the server (no secrets returned).
    const fetchIntegrationStatus = async () => {
        try {
            const res = await liveSessionService.getIntegrationStatus();
            const status = {
                googleConnected: !!res.data?.data?.googleConnected,
                zoomConfigured: !!res.data?.data?.zoomConfigured,
                googleMissingEnv: res.data?.data?.googleMissingEnv || [],
                zoomMissingEnv: res.data?.data?.zoomMissingEnv || []
            };
            setIntegrations(status);
            return status;
        } catch {
            const status = { googleConnected: false, zoomConfigured: false, googleMissingEnv: [], zoomMissingEnv: [] };
            setIntegrations(status);
            return status;
        }
    };

    // Load integration status once for instructors/admins so the helper text is accurate immediately.
    useEffect(() => {
        if (user && user.assignedRole !== 'Student') {
            fetchIntegrationStatus();
        }
    }, [user]);

    const ensureIntegrationStatus = async () => {
        if (integrations.googleConnected !== null && integrations.zoomConfigured !== null) {
            return integrations;
        }
        return fetchIntegrationStatus();
    };

    // Short helper text shown under the Meeting Link input, per platform
    const getPlatformHelperText = () => {
        switch (formData.platform) {
            case 'Zoom':
                return integrations.zoomConfigured === null
                    ? 'Click "Generate Meeting Link" to create a Zoom meeting if Zoom is connected on this server.'
                    : integrations.zoomConfigured
                        ? 'Click "Generate Meeting Link" to create a real Zoom meeting via the configured integration.'
                        : 'Not configured on this server — an administrator must add the Zoom API credentials to backend/.env.';
            case 'Jitsi Meet':
                return 'Click "Generate Meeting Link" to create a free Jitsi room instantly — no account needed.';
            case 'Custom':
                return 'Enter any valid meeting URL manually (Zoom, Teams, YouTube Live, …).';
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
            setLinkMsg({ type: 'info', text: 'Custom meetings use a manual link — paste any valid meeting URL in the Meeting Link field.' });
            return;
        }

        setGeneratingLink(true);
        try {
            // ── Configuration pre-checks: fail with exact missing settings ──
            const status = await ensureIntegrationStatus();
            if (formData.platform === 'Zoom' && !status.zoomConfigured) {
                const missing = status.zoomMissingEnv?.length
                    ? status.zoomMissingEnv.join(', ')
                    : 'ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET';
                setLinkMsg({
                    type: 'error',
                    text: `Configuration error — Zoom meetings cannot be generated. Missing backend/.env settings: ${missing}. An administrator must add the Zoom Server-to-Server OAuth credentials and restart the server.`
                });
                return;
            }

            // ── Real generation through the configured provider ────────────
            const parsedStart = parseDateTimeValue(formData.startTime);
            const res = await liveSessionService.generateLink({
                platform: formData.platform,
                title: formData.title,
                startTime: parsedStart ? parsedStart.toISOString() : undefined,
                durationMinutes: Number(formData.durationMinutes) || 60
            });
            const data = res.data?.data || {};
            const url = data.url || '';
            if (!url) throw new Error('The meeting provider did not return a link.');
            setFormData(prev => ({
                ...prev,
                meetingLink: url,
                meetingProvider: data.provider || '',
                meetingProviderId: data.meetingId || ''
            }));
            setLinkMsg({ type: 'success', text: 'Meeting link generated successfully.' });
        } catch (err) {
            const code = err.response?.data?.code;
            const raw = err.response?.data?.message || err.message || '';
            const missing = err.response?.data?.missing;
            let friendly;
            if (code === 'GOOGLE_NOT_CONFIGURED' || code === 'GOOGLE_NOT_AUTHORIZED') {
                friendly = `Configuration error — ${raw}`;
            } else if (code === 'ZOOM_NOT_CONFIGURED') {
                friendly = `Configuration error — ${raw}`;
            } else if (code === 'PROVIDER_NOT_CONFIGURED') {
                friendly = 'Configuration error — the meeting provider is not configured on this server.';
            } else {
                friendly = raw || 'Could not generate the meeting link. Please try again or paste a link manually.';
            }
            if (Array.isArray(missing) && missing.length > 0 && !/missing/i.test(friendly)) {
                friendly += ` Missing: ${missing.join(', ')}.`;
            }
            setLinkMsg({ type: 'error', text: friendly });
        } finally {
            setGeneratingLink(false);
        }
    };


    const handleCreate = async (e) => {
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
            setFormData({ title: '', description: '', startTime: '', durationMinutes: 60, platform: 'Jitsi Meet', meetingLink: '', meetingProvider: '', meetingProviderId: '', meetingPassword: '', attendees: '' });
            handleSelectCourse(selectedCourse); // refresh
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to schedule session';
            if (/meeting link/i.test(msg)) setFieldErrors(prev => ({ ...prev, meetingLink: msg }));
            else alert(msg);
        }
    };


    const handleDelete = async (id) => {
        if (!window.confirm("Delete this session?")) return;
        try {
            await liveSessionService.deleteSession(id);
            setSessions(prev => prev.filter(s => s._id !== id));
        } catch (err) {
            alert('Failed to delete session');
        }
    };

    const handleMarkAttendance = async (id) => {
        try {
            const res = await liveSessionService.markAttendance(id);
            const updatedSession = res.data?.data;
            if (updatedSession) {
                setSessions(prev => prev.map(s => s._id === id ? { ...s, attendance: updatedSession.attendance || s.attendance } : s));
            }
            alert('Attendance recorded successfully.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record attendance');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="live" />
            
            <main style={{ marginLeft: '260px', padding: '40px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h1 style={{ color: colors.text, fontSize: '32px', fontWeight: '900', margin: 0 }}>Live Sessions & Events</h1>
                    {user?.assignedRole !== 'Student' && selectedCourse && (
                        <button onClick={() => setShowForm(!showForm)} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                            {showForm ? 'Cancel' : '+ Schedule Session'}
                        </button>
                    )}
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <label style={{ color: colors.textMuted, fontSize: '14px', fontWeight: '700', marginRight: '16px' }}>Filter by Course:</label>
                    <select 
                        value={selectedCourse || ''} 
                        onChange={(e) => handleSelectCourse(e.target.value)}
                        style={{ padding: '10px 16px', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '15px' }}
                    >
                        {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                    </select>
                    {user?.assignedRole === 'Student' && !showAllSessions && (
                        <button onClick={handleShowAllSessions} style={{ marginLeft: '16px', padding: '10px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            Show All Live Sessions
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={handleCreate} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '32px', marginBottom: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Session Title</label>
                            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Start Time</label>
                            <input type="datetime-local" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Duration (Minutes)</label>
                            <input type="number" required value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Platform</label>
                            <select value={formData.platform} onChange={e => {
                                const nextPlatform = e.target.value;
                                setLinkMsg(null);
                                setFieldErrors(prev => ({ ...prev, meetingLink: undefined }));
                                setFormData(prev => {
                                    // Keep an existing valid link — only auto-fill Jitsi when empty
                                    const keepLink = prev.meetingLink && prev.meetingLink.startsWith('http')
                                        ? prev.meetingLink
                                        : (nextPlatform === 'Jitsi Meet' ? getDefaultMeetingLink(nextPlatform, prev.title) : '');
                                    return {
                                        ...prev,
                                        platform: nextPlatform,
                                        meetingLink: keepLink,
                                        ...(keepLink ? {} : { meetingProvider: '', meetingProviderId: '' })
                                    };
                                });
                            }} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }}>
                                <option value="Jitsi Meet">Jitsi Meet</option>
                                <option value="Zoom">Zoom</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Meeting Link</label>
                            <input type="url" value={formData.meetingLink} onChange={e => { setFormData({...formData, meetingLink: e.target.value}); setFieldErrors(prev => ({ ...prev, meetingLink: undefined })); }} placeholder="https://…" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${fieldErrors.meetingLink ? '#ef4444' : colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                            {fieldErrors.meetingLink && (
                                <div style={{ marginTop: '6px', fontSize: '12.5px', fontWeight: 600, color: '#ef4444' }}>{fieldErrors.meetingLink}</div>
                            )}
                            {!linkMsg && (
                                <div style={{ marginTop: '6px', fontSize: '12px', color: colors.textMuted }}>{getPlatformHelperText()}</div>
                            )}

                            {linkMsg && (
                                <div style={{
                                    marginTop: '8px', fontSize: '12.5px', fontWeight: 600,
                                    color: linkMsg.type === 'error' ? '#ef4444' : linkMsg.type === 'success' ? '#16a34a' : '#d97706'
                                }} role="status">
                                    {linkMsg.type === 'error' ? '⚠️ ' : linkMsg.type === 'success' ? '✓ ' : 'ℹ️ '}{linkMsg.text}
                                </div>
                            )}

                            {formData.platform !== 'Custom' && (
                                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={handleGenerateMeetingLink} disabled={generatingLink} style={{ padding: '10px 14px', background: colors.accent, color: '#fff', border: 'none', borderRadius: '8px', cursor: generatingLink ? 'wait' : 'pointer', opacity: generatingLink ? 0.7 : 1 }}>
                                        {generatingLink ? 'Generating…' : 'Generate Meeting Link'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Meeting Password (Optional)</label>
                            <input type="text" value={formData.meetingPassword} onChange={e => setFormData({...formData, meetingPassword: e.target.value})} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <button type="submit" style={{ width: '100%', padding: '14px', background: colors.primary, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '16px' }}>Save Session</button>
                        </div>
                    </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {sessions.length === 0 ? (
                        <div style={{ color: colors.textMuted }}>No upcoming sessions for this course.</div>
                    ) : (
                        sessions.map(s => {
                            const isLive = new Date() >= new Date(s.startTime) && new Date() <= new Date(new Date(s.startTime).getTime() + s.durationMinutes * 60000);
                            
                            return (
                                <div key={s._id} style={{ background: colors.bgCard, border: isLive ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px', position: 'relative' }}>
                                    {isLive && (
                                        <div style={{ position: 'absolute', top: '-10px', right: '20px', background: colors.primary, color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }}></span>
                                            LIVE NOW
                                        </div>
                                    )}
                                    <h3 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', margin: '0 0 16px' }}>{s.title}</h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>▦</span> {new Date(s.startTime).toLocaleDateString()}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>⏰</span> {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.durationMinutes} mins)
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>‍◈</span> Instructor: {s.instructorRef?.fullName || 'TBD'}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>◉</span> Platform: <span style={{ color: colors.text, fontWeight: '700' }}>{s.platform || 'Zoom'}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span></span> Attendance: <span style={{ color: colors.text, fontWeight: '700' }}>{s.attendance?.length || 0}</span>
                                        </div>
                                        {s.meetingPassword && (
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                                <span>▣</span> Pwd: <span style={{ fontFamily: 'monospace', color: colors.text, background: colors.bgInput, padding: '2px 6px', borderRadius: '4px' }}>{s.meetingPassword}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        {isValidMeetingLink(s.meetingLink) || s.platform === 'Jitsi Meet' ? (
                                            <a href={isValidMeetingLink(s.meetingLink) ? s.meetingLink : getDefaultMeetingLink(s.platform, s.title)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: '140px', textDecoration: 'none', background: colors.primary, color: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                                                Open Meeting
                                            </a>
                                        ) : null}
                                        {user?.assignedRole === 'Student' && (
                                            <button onClick={() => handleMarkAttendance(s._id)} style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: 'none', padding: '0 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                                                Mark Attendance
                                            </button>
                                        )}
                                        {(user?.assignedRole === 'Instructor' || user?.assignedRole === 'Admin') && (
                                            <button onClick={() => handleDelete(s._id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
