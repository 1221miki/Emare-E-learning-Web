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
        meetingLink: '',
        meetingPassword: ''
    });

    const navItems = [
        { label: 'Dashboard', path: `/${user?.assignedRole.toLowerCase()}/dashboard`, key: 'dashboard' },
        { label: 'Direct Messages', path: '/messages', key: 'messages' },
        { label: 'Live Sessions', path: '/live-sessions', key: 'live' }
    ];

    useEffect(() => {
        // Fetch courses user is involved in
        courseService.getAll().then(res => {
            setCourses(res.data.data);
            if (res.data.data.length > 0) {
                handleSelectCourse(res.data.data[0]._id);
            }
        });
    }, []);

    const handleSelectCourse = async (courseId) => {
        setSelectedCourse(courseId);
        try {
            const res = await liveSessionService.getCourseSessions(courseId);
            setSessions(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await liveSessionService.createSession({ ...formData, courseRef: selectedCourse });
            setShowForm(false);
            setFormData({ title: '', description: '', startTime: '', durationMinutes: 60, meetingLink: '', meetingPassword: '' });
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
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Zoom/Meet Link</label>
                            <input type="url" required value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
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
                                        {s.meetingPassword && (
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: colors.textMuted, fontSize: '14px' }}>
                                                <span>🔒</span> Pwd: <span style={{ fontFamily: 'monospace', color: colors.text, background: colors.bgInput, padding: '2px 6px', borderRadius: '4px' }}>{s.meetingPassword}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none', background: colors.primary, color: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                                            Join Meeting
                                        </a>
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
