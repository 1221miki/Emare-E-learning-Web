import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { liveSessionService, courseService } from '../services/api';
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
        platform: 'Zoom',
        meetingLink: '',
        meetingPassword: '',
        attendees: ''
    });
    // Inline guidance for meeting-link generation (replaces blocking alerts).
    // Shape: { type: 'info' | 'warning' | 'error', title: string, steps: string[] }
    const [linkNotice, setLinkNotice] = useState(null);

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

    const generateGoogleMeetCode = (title) => {
        const base = (title || 'emare').toLowerCase().replace(/[^a-z0-9]+/g, '');
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = base.slice(0, 10);
        while (code.length < 10) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        code = code.slice(0, 10);
        return `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7, 10)}`;
    };

    const isValidMeetingLink = (link) => {
        return typeof link === 'string' && link.trim().startsWith('http');
    };

    const getDefaultMeetingLink = (platform, title) => {
        const slug = (title || 'emare-live-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare-live-session';
        if (platform === 'Google Meet') return null;
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
        if (!formData.title?.trim()) {
            alert('Please enter a session title.');
            return false;
        }

        const parsedStartTime = parseDateTimeValue(formData.startTime);
        if (!parsedStartTime) {
            alert('Please enter a valid start time.');
            return false;
        }

        if (!formData.durationMinutes || Number(formData.durationMinutes) <= 0) {
            alert('Please enter a valid duration.');
            return false;
        }

        if (!formData.meetingLink?.trim() && ['Zoom', 'Custom'].includes(formData.platform)) {
            alert(`Please enter a real meeting link for ${formData.platform} sessions.`);
            return false;
        }

        return true;
    };

    const handleGenerateMeetingLink = async () => {
        setLinkNotice(null);
        if (!formData.title?.trim()) {
            return alert('Please enter a session title before generating a meeting link.');
        }

        if (formData.platform === 'Google Meet') {
            try {
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
                if (!googleLink) {
                    return setLinkNotice({
                        type: 'error',
                        title: 'Google Meet link could not be created.',
                        steps: ['Enter a real Google Meet link manually in the field below.', 'Or switch the platform to Jitsi Meet, which generates a link instantly with no external account needed.']
                    });
                }
                setFormData(prev => ({ ...prev, meetingLink: googleLink }));
                return;
            } catch (err) {
                return setLinkNotice({
                    type: 'error',
                    title: err.response?.data?.message || 'Google Meet integration is not configured.',
                    steps: [
                        'Connect your Google Account first (Calendar Management → Connect Google Account), then come back and click Generate again.',
                        'Or paste an existing Google Meet link manually in the field below.',
                        'Or switch the platform to Jitsi Meet — links generate instantly without any Google login.'
                    ]
                });
            }
        }

        if (formData.platform === 'Jitsi Meet') {
            setFormData(prev => ({
                ...prev,
                meetingLink: getDefaultMeetingLink(prev.platform, prev.title)
            }));
            setLinkNotice({ type: 'info', title: 'Jitsi Meet link generated — no account needed. You can edit it or save the session.' });
            return;
        }

        // Zoom / Custom — auto-generation is intentionally unavailable
        setLinkNotice({
            type: 'warning',
            title: `Automatic generation is only available for Jitsi Meet and Google Meet — not for ${formData.platform}.`,
            steps: [
                `Create the meeting manually on ${formData.platform} and copy its invitation URL.`,
                'Paste the URL directly into the Meeting Link field below.',
                'Alternatively, switch the Platform dropdown to Jitsi Meet to auto-generate a free link instantly without any external login.'
            ]
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateSessionForm()) return;

        const parsedStart = parseDateTimeValue(formData.startTime);
        const startTimeISO = parsedStart ? parsedStart.toISOString() : formData.startTime;

        try {
            let meetingLink = (formData.meetingLink || '').trim();

            if (!meetingLink && formData.platform === 'Google Meet') {
                try {
                    const res = await liveSessionService.createGoogleMeet({
                        title: formData.title,
                        description: formData.description,
                        startTime: startTimeISO,
                        durationMinutes: Number(formData.durationMinutes),
                        attendees: (formData.attendees || '').split(',').map(s => s.trim()).filter(Boolean)
                    });
                    meetingLink = res.data?.data?.meetLink;
                    if (!meetingLink) {
                        throw new Error('Google Meet link could not be created.');
                    }
                } catch (err) {
                    alert(err.response?.data?.message || 'Google Meet integration failed. Please enter a valid meeting link.');
                    return;
                }
            }

            if (!meetingLink && ['Zoom', 'Custom'].includes(formData.platform)) {
                alert(`Please enter a valid ${formData.platform} meeting link.`);
                return;
            }

            const payload = {
                ...formData,
                courseRef: selectedCourse,
                meetingLink,
                startTime: startTimeISO,
                durationMinutes: Number(formData.durationMinutes),
                attendees: (formData.attendees || '').split(',').map(s => s.trim()).filter(Boolean)
            };

            await liveSessionService.createSession(payload);
            setShowForm(false);
            setFormData({ title: '', description: '', startTime: '', durationMinutes: 60, platform: 'Zoom', meetingLink: '', meetingPassword: '', attendees: '' });
            handleSelectCourse(selectedCourse); // refresh
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to schedule session');
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
                                setLinkNotice(null);
                                setFormData(prev => ({
                                    ...prev,
                                    platform: nextPlatform,
                                    meetingLink: nextPlatform === 'Jitsi Meet' ? getDefaultMeetingLink(nextPlatform, prev.title) : ''
                                }));
                            }} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }}>
                                <option value="Zoom">Zoom</option>
                                <option value="Google Meet">Google Meet</option>
                                <option value="Jitsi Meet">Jitsi Meet</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                        {formData.platform === 'Google Meet' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Invitees (comma separated emails)</label>
                                <input type="text" value={formData.attendees || ''} onChange={e => setFormData({...formData, attendees: e.target.value})} placeholder="e.g. student1@example.com,student2@example.com" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                            </div>
                        )}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Meeting Link</label>
                            <input type="url" value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} placeholder="Enter a meeting link or generate one automatically" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                            {linkNotice && (
                                <div role="alert" style={{
                                    marginTop: '12px',
                                    borderRadius: '10px',
                                    padding: '14px 16px',
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    background: linkNotice.type === 'error'
                                        ? '#fef2f2'
                                        : linkNotice.type === 'warning'
                                            ? '#fffbeb'
                                            : '#f0fdf4',
                                    border: `1px solid ${linkNotice.type === 'error' ? 'rgba(239,68,68,0.4)' : linkNotice.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'}`,
                                    color: colors.text
                                }}>
                                    <div style={{ fontWeight: 800, marginBottom: 6, color: linkNotice.type === 'error' ? '#ef4444' : linkNotice.type === 'warning' ? '#d97706' : '#16a34a' }}>
                                        {linkNotice.type === 'error' ? '⚠️ ' : linkNotice.type === 'warning' ? '💡 ' : '✓ '}{linkNotice.title}
                                    </div>
                                    {(linkNotice.steps || []).length > 0 && (
                                        <ol style={{ margin: 0, paddingLeft: 20 }}>
                                            {linkNotice.steps.map((step, i) => <li key={i} style={{ marginBottom: 4 }}>{step}</li>)}
                                        </ol>
                                    )}
                                </div>
                            )}
                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button type="button" onClick={handleGenerateMeetingLink} style={{ padding: '10px 14px', background: colors.accent, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    Generate Meeting Link
                                </button>
                            </div>
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
