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
    
    // Admin/Instructor state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        durationMinutes: 60,
        platform: 'Zoom',
        meetingLink: '',
        meetingPassword: ''
    });

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
                if (user?.assignedRole === 'Student') {
                    const res = await courseService.getStudentEnrollments();
                    const enrollments = res.data?.data || [];
                    courseList = enrollments
                        .map(e => e.courseRef)
                        .filter(c => c && c._id);
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
                } else {
                    setSelectedCourse(null);
                    setSessions([]);
                }
            } catch (err) {
                console.error('Failed to fetch courses for live sessions:', err);
                setCourses([]);
                setSessions([]);
            }
        };

        if (user) {
            fetchCourses();
        }
    }, [user]);

    const handleSelectCourse = async (courseId) => {
        if (!courseId) return;
        setSelectedCourse(courseId);
        try {
            const res = await liveSessionService.getCourseSessions(courseId);
            setSessions(res.data?.data || []);
        } catch (err) {
            console.error('Failed to get course live sessions:', err);
            setSessions([]);
        }
    };

    const getDefaultMeetingLink = (platform, title) => {
        const slug = (title || 'emare-live-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare-live-session';
        if (platform === 'Google Meet') return `https://meet.google.com/${slug.replace(/-/g, '')}`;
        if (platform === 'Jitsi Meet') return `https://meet.jit.si/${slug}`;
        if (platform === 'Custom') return `https://meet.emarehub.com/${slug}`;
        return `https://zoom.us/j/1234567890?pwd=${slug.toUpperCase().replace(/-/g, '').slice(0, 8)}`;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                courseRef: selectedCourse,
                meetingLink: formData.meetingLink || getDefaultMeetingLink(formData.platform, formData.title)
            };
            await liveSessionService.createSession(payload);
            setShowForm(false);
            setFormData({ title: '', description: '', startTime: '', durationMinutes: 60, platform: 'Zoom', meetingLink: '', meetingPassword: '' });
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
                            <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }}>
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
                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={async () => {
                                        if (!formData.title || !formData.startTime) return alert('Please fill title and start time first');
                                        try {
                                            const payload = {
                                                title: formData.title,
                                                description: formData.description,
                                                startTime: formData.startTime,
                                                durationMinutes: formData.durationMinutes,
                                                attendees: (formData.attendees || '').split(',').map(s => s.trim()).filter(Boolean)
                                            };
                                            const res = await liveSessionService.createGoogleMeet(payload);
                                            if (res.data?.data?.meetLink) {
                                                setFormData(prev => ({ ...prev, meetingLink: res.data.data.meetLink }));
                                                alert('Google Meet link created and set to Meeting Link field');
                                            } else {
                                                alert(res.data?.message || 'Google Meet created but no link returned');
                                            }
                                        } catch (err) {
                                            if (err.response?.status === 501) {
                                                alert('Google Meet integration is not configured on the server. Falling back to auto-generated link.');
                                                setFormData(prev => ({ ...prev, meetingLink: getDefaultMeetingLink('Google Meet', prev.title) }));
                                            } else {
                                                alert(err.response?.data?.message || 'Failed to create Google Meet link');
                                            }
                                        }
                                    }} style={{ padding: '10px 14px', background: colors.success, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Create Google Meet Link</button>
                                </div>
                            </div>
                        )}
                        <div>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Meeting Link</label>
                            <input type="url" value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} placeholder="Leave blank to auto-generate a starter link" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
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
                                            <span>📅</span> {new Date(s.startTime).toLocaleDateString()}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>⏰</span> {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.durationMinutes} mins)
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>👨‍🏫</span> Instructor: {s.instructorRef?.fullName || 'TBD'}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>📡</span> Platform: <span style={{ color: colors.text, fontWeight: '700' }}>{s.platform || 'Zoom'}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                            <span>✅</span> Attendance: <span style={{ color: colors.text, fontWeight: '700' }}>{s.attendance?.length || 0}</span>
                                        </div>
                                        {s.meetingPassword && (
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                                <span>🔒</span> Pwd: <span style={{ fontFamily: 'monospace', color: colors.text, background: colors.bgInput, padding: '2px 6px', borderRadius: '4px' }}>{s.meetingPassword}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <a href={s.meetingLink || getDefaultMeetingLink(s.platform || 'Zoom', s.title)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: '140px', textDecoration: 'none', background: colors.primary, color: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                                            Open Meeting
                                        </a>
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
