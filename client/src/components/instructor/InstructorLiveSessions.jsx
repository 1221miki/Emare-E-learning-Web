import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { liveSessionService } from '../../services/api';
import {
    Video, Plus, Play, Square, Link2, RadioTower,
    Clock, CalendarDays, User, CheckCircle, AlertCircle,
    Film, BookOpen, RefreshCw, Edit3, Trash2
} from 'lucide-react';
import LiveSessionFormModal from './LiveSessionFormModal';

// ── Status badge ───────────────────────────────────────────
const SESSION_STATUS = {
    upcoming:  { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', label: 'Upcoming' },
    live:      { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', label: '🔴 LIVE NOW' },
    ended:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Ended' },
    cancelled: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Cancelled' },
};

const StatusBadge = ({ status }) => {
    const s = SESSION_STATUS[status] || SESSION_STATUS.upcoming;
    return (
        <span style={{
            background: s.bg, color: s.color,
            padding: '3px 10px', borderRadius: '20px',
            fontSize: '11px', fontWeight: '800',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: '3px'
        }}>
            {s.label}
        </span>
    );
};

// ── Main component ─────────────────────────────────────────
export default function InstructorLiveSessions({ courses = [] }) {
    const { colors: c } = useTheme();
    const navigate = useNavigate();

    const [sessions,      setSessions]      = useState([]);
    const [recordings,    setRecordings]    = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [activeTab,     setActiveTab]     = useState('sessions');
    const [liveFilter,    setLiveFilter]    = useState('all');
    const [showForm,      setShowForm]      = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [actionMsg,     setActionMsg]     = useState(null);
    const [processingId,  setProcessingId]  = useState(null);

    const flash = (type, text) => {
        setActionMsg({ type, text });
        setTimeout(() => setActionMsg(null), 4000);
    };

    // ── Fetch ──────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessRes, recRes] = await Promise.all([
                liveSessionService.getInstructorSessions(),
                liveSessionService.getInstructorRecordings(),
            ]);
            setSessions(sessRes.data?.data || []);
            setRecordings(recRes.data?.data || []);
        } catch {
            flash('error', 'Failed to load sessions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Actions ────────────────────────────────────────────
    const handleStart = async (session) => {
        if (!window.confirm(`Start "${session.title}" now? Enrolled students will be notified.`)) return;
        setProcessingId(session._id + '_start');
        try {
            const res = await liveSessionService.startSession(session._id);
            setSessions(prev => prev.map(s => s._id === session._id ? res.data.data : s));
            flash('success', 'Session started — students have been notified.');
            if (session.meetingLink) window.open(session.meetingLink, '_blank');
        } catch (err) {
            flash('error', err.response?.data?.message || 'Failed to start session.');
        } finally { setProcessingId(null); }
    };

    const handleEnd = async (session) => {
        if (!window.confirm(`End "${session.title}"?\n\nThe recording will be automatically available to students.`)) return;
        setProcessingId(session._id + '_end');
        try {
            const res = await liveSessionService.endSession(session._id);
            setSessions(prev => prev.map(s => s._id === session._id ? res.data.data : s));
            flash('success', 'Session ended — recording is now visible to students.');
            // Refresh recordings list
            liveSessionService.getInstructorRecordings()
                .then(r => setRecordings(r.data?.data || []))
                .catch(() => {});
        } catch (err) {
            flash('error', err.response?.data?.message || 'Failed to end session.');
        } finally { setProcessingId(null); }
    };

    const handleDelete = async (session) => {
        if (!window.confirm(`Permanently delete "${session.title}"?`)) return;
        setProcessingId(session._id + '_del');
        try {
            await liveSessionService.deleteSession(session._id);
            setSessions(prev => prev.filter(s => s._id !== session._id));
            flash('success', 'Session deleted.');
        } catch (err) {
            flash('error', err.response?.data?.message || 'Failed to delete.');
        } finally { setProcessingId(null); }
    };

    const handleDeleteRecording = async (rec) => {
        if (!window.confirm(`Delete recording "${rec.title}"?`)) return;
        setProcessingId(rec._id + '_del');
        try {
            await liveSessionService.deleteRecording(rec._id);
            setRecordings(prev => prev.filter(r => r._id !== rec._id));
            flash('success', 'Recording deleted.');
        } catch (err) {
            flash('error', err.response?.data?.message || 'Failed to delete recording.');
        } finally { setProcessingId(null); }
    };

    // ── Form callbacks ─────────────────────────────────────
    const handleFormSuccess = (newSession, isEdit) => {
        if (isEdit) {
            setSessions(prev => prev.map(s => s._id === newSession._id ? newSession : s));
            flash('success', 'Session updated.');
        } else {
            setSessions(prev => [newSession, ...prev]);
            flash('success', 'Live session created — enrolled students have been notified.');
        }
        setShowForm(false);
        setEditingSession(null);
    };

    // ── Filtered sessions ──────────────────────────────────
    const filtered = sessions
        .filter(s => liveFilter === 'all' || s.status === liveFilter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ── Styles ─────────────────────────────────────────────
    const card = { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '20px' };
    const btn  = (bg, color) => ({ background: bg, color, border: 'none', borderRadius: '8px', padding: '7px 13px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' });
    const primaryBtn = btn('linear-gradient(135deg,#16a34a,#15803d)', '#fff');
    const dangerBtn  = btn('rgba(239,68,68,0.12)', '#f87171');

    return (
        <div>
            {/* ── Header ────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ color: c.text, fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>Live Classes</h2>
                    <p style={{ color: c.textMuted, fontSize: '14px', margin: 0 }}>
                        Create sessions, start/end meetings. Recordings appear automatically for students when you end the meeting.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={fetchData} style={{ ...btn('transparent', c.textMuted), border: `1px solid ${c.border}` }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={() => { setEditingSession(null); setShowForm(true); }} style={primaryBtn}>
                        <Plus size={15} /> Create Live Session
                    </button>
                </div>
            </div>

            {/* ── Feedback banner ───────────────────────────── */}
            {actionMsg && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: actionMsg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: actionMsg.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${actionMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    {actionMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {actionMsg.text}
                </div>
            )}

            {/* ── Sub-tabs ──────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: `1px solid ${c.border}` }}>
                {[
                    { key: 'sessions',   label: 'Sessions',   icon: <RadioTower size={15} />, count: sessions.length },
                    { key: 'recordings', label: 'Recordings', icon: <Film size={15} />,       count: recordings.length },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #22c55e' : '2px solid transparent', color: activeTab === tab.key ? '#22c55e' : c.textMuted, padding: '8px 16px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {tab.icon} {tab.label}
                        <span style={{ background: activeTab === tab.key ? 'rgba(34,197,94,0.2)' : c.border, color: activeTab === tab.key ? '#22c55e' : c.textMuted, borderRadius: '20px', padding: '1px 8px', fontSize: '11px' }}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════════════ */}
            {/* SESSIONS TAB                                    */}
            {/* ════════════════════════════════════════════════ */}
            {activeTab === 'sessions' && (
                <div>
                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {['all', 'upcoming', 'live', 'ended'].map(f => (
                            <button key={f} onClick={() => setLiveFilter(f)} style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${liveFilter === f ? '#22c55e' : c.border}`, background: liveFilter === f ? 'rgba(34,197,94,0.15)' : 'transparent', color: liveFilter === f ? '#22c55e' : c.textMuted }}>
                                {f === 'all' ? 'All' : f === 'live' ? '🔴 Live Now' : f.charAt(0).toUpperCase() + f.slice(1)}
                                {f !== 'all' && <span style={{ marginLeft: '5px', opacity: 0.7 }}>({sessions.filter(s => s.status === f).length})</span>}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: c.textMuted }}>Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', ...card, border: `1px dashed ${c.border}` }}>
                            <RadioTower size={48} color={c.border} style={{ marginBottom: '16px' }} />
                            <p style={{ color: c.textMuted, margin: '0 0 16px' }}>No sessions yet.</p>
                            <button onClick={() => setShowForm(true)} style={primaryBtn}><Plus size={14} /> Create Session</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {filtered.map(session => {
                                const isLive     = session.status === 'live';
                                const isUpcoming = session.status === 'upcoming';
                                const isEnded    = session.status === 'ended';
                                const busy       = sfx => processingId === session._id + sfx;
                                const startDate  = new Date(session.startTime);
                                const rec        = recordings.find(r => r.liveSession === session._id || r.liveSession?._id === session._id);

                                return (
                                    <div key={session._id} style={{ ...card, borderLeft: `4px solid ${isLive ? '#ef4444' : isUpcoming ? '#22c55e' : c.border}`, position: 'relative' }}>
                                        {/* LIVE badge */}
                                        {isLive && (
                                            <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.15)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.4)' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'ilsPulse 1.2s infinite' }} />
                                                <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '800' }}>LIVE NOW</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: '240px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <h3 style={{ color: c.text, fontSize: '16px', fontWeight: '800', margin: 0 }}>{session.title}</h3>
                                                    <StatusBadge status={session.status} />
                                                    {isEnded && rec?.isPublished && (
                                                        <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <Film size={10} /> Recording available
                                                        </span>
                                                    )}
                                                </div>
                                                {session.description && <p style={{ color: c.textMuted, fontSize: '13px', margin: '0 0 8px', lineHeight: 1.5 }}>{session.description}</p>}
                                                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: c.textMuted, flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><BookOpen size={12} />{session.courseRef?.courseTitle || '—'}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><CalendarDays size={12} />{startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={12} />{startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><User size={12} />{session.attendance?.length || 0} attended</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                    {isUpcoming && (
                                                        <button onClick={() => handleStart(session)} disabled={busy('_start')} style={{ ...primaryBtn, background: 'linear-gradient(135deg,#22c55e,#16a34a)', opacity: busy('_start') ? 0.6 : 1 }}>
                                                            <Play size={14} /> {busy('_start') ? 'Starting…' : 'Start Meeting'}
                                                        </button>
                                                    )}
                                                    {isLive && (
                                                        <>
                                                            {session.meetingLink && (
                                                                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" style={{ ...btn('rgba(34,197,94,0.15)', '#4ade80'), border: '1px solid rgba(34,197,94,0.4)', textDecoration: 'none' }}>
                                                                    <Link2 size={13} /> Open Meeting
                                                                </a>
                                                            )}
                                                            <button onClick={() => handleEnd(session)} disabled={busy('_end')} style={{ ...dangerBtn, border: '1px solid rgba(239,68,68,0.35)' }}>
                                                                <Square size={13} fill="#f87171" /> {busy('_end') ? 'Ending…' : 'End Meeting'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Edit / Delete */}
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {isUpcoming && (
                                                        <button onClick={() => { setEditingSession(session); setShowForm(true); }} style={{ ...btn('transparent', c.textMuted), border: `1px solid ${c.border}`, fontSize: '11px', padding: '5px 10px' }}>
                                                            <Edit3 size={12} /> Edit
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(session)} disabled={busy('_del')} style={{ ...btn('transparent', '#f87171'), border: '1px solid rgba(239,68,68,0.25)', fontSize: '11px', padding: '5px 10px' }}>
                                                        <Trash2 size={12} /> {busy('_del') ? '…' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ended: recording auto-available notice */}
                                        {isEnded && (
                                            <div style={{ marginTop: '12px', padding: '10px 14px', background: rec?.isPublished ? 'rgba(34,197,94,0.07)' : 'rgba(100,116,139,0.07)', borderRadius: '8px', border: `1px solid ${rec?.isPublished ? 'rgba(34,197,94,0.2)' : c.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Film size={14} color={rec?.isPublished ? '#4ade80' : c.textMuted} />
                                                <span style={{ color: rec?.isPublished ? '#4ade80' : c.textMuted, fontSize: '13px', fontWeight: '600' }}>
                                                    {rec?.isPublished
                                                        ? 'Recording is live — students can watch it now ✓'
                                                        : 'Session ended — recording will appear shortly'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════ */}
            {/* RECORDINGS TAB                                  */}
            {/* ════════════════════════════════════════════════ */}
            {activeTab === 'recordings' && (
                <div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: c.textMuted }}>Loading…</div>
                    ) : recordings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', ...card, border: `1px dashed ${c.border}` }}>
                            <Film size={48} color={c.border} style={{ marginBottom: '16px' }} />
                            <p style={{ color: c.textMuted, margin: '0 0 8px' }}>No recordings yet.</p>
                            <p style={{ color: c.textMuted, fontSize: '13px', margin: 0 }}>Recordings appear automatically when you end a live session.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {recordings.map(rec => (
                                <div key={rec._id} style={{ ...card, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {/* Thumbnail */}
                                    <div style={{ width: '110px', height: '66px', borderRadius: '8px', background: rec.thumbnailUrl ? `url(${rec.thumbnailUrl}) center/cover` : 'rgba(99,102,241,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${c.border}` }}>
                                        {!rec.thumbnailUrl && <Film size={22} color="#a5b4fc" />}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: '180px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                                            <h3 style={{ color: c.text, fontSize: '14px', fontWeight: '700', margin: 0 }}>{rec.title}</h3>
                                            <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                                                Auto-published ✓
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: c.textMuted, flexWrap: 'wrap' }}>
                                            {rec.course?.courseTitle && <span><BookOpen size={11} style={{ marginRight: 3 }} />{rec.course.courseTitle}</span>}
                                            {rec.liveSession?.title && <span><RadioTower size={11} style={{ marginRight: 3 }} />{rec.liveSession.title}</span>}
                                            {rec.publishedAt && <span>Available since {new Date(rec.publishedAt).toLocaleDateString()}</span>}
                                        </div>
                                    </div>

                                    {/* Play + Delete */}
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                        <button
                                            onClick={() => navigate(`/recordings/${rec._id}`)}
                                            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(34,197,94,0.3)' }}
                                        >
                                            <Play size={13} fill="#fff" /> Play Recording
                                        </button>
                                        <button onClick={() => handleDeleteRecording(rec)} disabled={processingId === rec._id + '_del'} style={{ ...btn('transparent', '#f87171'), border: '1px solid rgba(239,68,68,0.25)', fontSize: '11px', padding: '5px 10px' }}>
                                            <Trash2 size={12} /> {processingId === rec._id + '_del' ? '…' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Create / edit session modal ────────────────── */}
            {showForm && (
                <LiveSessionFormModal
                    courses={courses}
                    session={editingSession}
                    onSuccess={handleFormSuccess}
                    onClose={() => { setShowForm(false); setEditingSession(null); }}
                />
            )}

            <style>{`@keyframes ilsPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
    );
}
