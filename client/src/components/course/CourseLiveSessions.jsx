import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioTower, CalendarDays, Clock, User, Video, Film } from 'lucide-react';
import { liveSessionService } from '../../services/api';

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * CourseLiveSessions
 * Lightweight widget shown on the Course Detail page for enrolled students.
 * Shows upcoming + live + ended sessions.
 */
export default function CourseLiveSessions({ sessions = [], colors }) {
    const navigate = useNavigate();
    const c = colors;

    if (!sessions || sessions.length === 0) return null;

    const handleJoin = async (session) => {
        try {
            const res = await liveSessionService.joinSession(session._id);
            const link = res.data?.data?.meetingLink || session.meetingLink;
            if (link) window.open(link, '_blank', 'noopener,noreferrer');
        } catch {
            if (session.meetingLink) window.open(session.meetingLink, '_blank', 'noopener,noreferrer');
        }
    };

    const sorted = [...sessions].sort((a, b) => {
        const order = { live: 0, upcoming: 1, ended: 2, cancelled: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(a.startTime) - new Date(b.startTime);
    });

    return (
        <section style={{ marginBottom: '48px' }}>
            <h2 style={{ color: c.text, fontSize: '24px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RadioTower size={22} style={{ color: '#22c55e' }} /> Live Classes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sorted.map(session => {
                    const isLive     = session.status === 'live';
                    const isUpcoming = session.status === 'upcoming';
                    const isEnded    = session.status === 'ended';
                    return (
                        <div
                            key={session._id}
                            style={{
                                background: c.bgCard,
                                border: `1px solid ${c.border}`,
                                borderLeft: `4px solid ${isLive ? '#ef4444' : isUpcoming ? '#22c55e' : c.border}`,
                                borderRadius: '12px',
                                padding: '16px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}
                        >
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    {isLive && (
                                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '20px', padding: '2px 9px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'clsPulse 1.2s ease-in-out infinite' }} />
                                            LIVE NOW
                                        </span>
                                    )}
                                    <span style={{ color: c.text, fontSize: '15px', fontWeight: '700' }}>{session.title}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: c.textMuted, flexWrap: 'wrap' }}>
                                    {session.instructorRef?.fullName && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <User size={11} /> {session.instructorRef.fullName}
                                        </span>
                                    )}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <CalendarDays size={11} /> {fmtDate(session.startTime)}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Clock size={11} /> {fmtTime(session.startTime)}
                                        {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                                    </span>
                                    {session.platform && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Video size={11} /> {session.platform}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                {isLive && (
                                    <button
                                        onClick={() => handleJoin(session)}
                                        style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <RadioTower size={14} /> Join Live Class
                                    </button>
                                )}
                                {isUpcoming && (
                                    <span style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700' }}>
                                        Upcoming
                                    </span>
                                )}
                                {isEnded && session.recordingStatus === 'available' && (
                                    <button
                                        onClick={() => navigate('/student/dashboard?tab=live')}
                                        style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '8px 14px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <Film size={13} /> View Recording
                                    </button>
                                )}
                                {isEnded && session.recordingStatus !== 'available' && (
                                    <span style={{ color: c.textMuted, fontSize: '12px' }}>Session ended</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <style>{`@keyframes clsPulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
        </section>
    );
}
