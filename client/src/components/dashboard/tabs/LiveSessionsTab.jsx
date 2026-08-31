import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RadioTower, Video, Film, Clock, CalendarDays, User,
    BookOpen, Play, Tv, Eye, Wifi, WifiOff, RefreshCw, ExternalLink
} from 'lucide-react';
import { liveSessionService } from '../../../services/api';

// ── helpers ───────────────────────────────────────────────
const fmtDate = (d) =>
    new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const fmtTime = (d) =>
    new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const fmtDur = (sec) => {
    if (!sec || sec <= 0) return '—';
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};

/**
 * LiveSessionsTab — shown in the Student Dashboard "live" tab.
 * Shows:
 *  • "Live Now" banner if any enrolled course has an active session
 *  • Upcoming sessions
 *  • Past sessions
 *  • Published recordings (with Watch button → /recordings/:id)
 */
export default function LiveSessionsTab(dash) {
    const {
        colors,
        allLiveSessions,   // sessions from initial dashboard load
        setAllLiveSessions,
        liveFilter,
        setLiveFilter,
        styles,
    } = dash;

    const navigate = useNavigate();
    const [recordings, setRecordings] = useState([]);
    const [recLoading, setRecLoading] = useState(true);
    const [section, setSection] = useState('sessions'); // 'sessions' | 'recordings'
    const [refreshing, setRefreshing] = useState(false);
    const pollRef = useRef(null);

    // ── Fetch recordings once ──────────────────────────────
    useEffect(() => {
        liveSessionService.getStudentRecordings()
            .then(res => setRecordings(res.data?.data || []))
            .catch(() => setRecordings([]))
            .finally(() => setRecLoading(false));
    }, []);

    // ── Poll for live status every 30 s ───────────────────
    const refresh = async (silent = false) => {
        if (!silent) setRefreshing(true);
        try {
            const res = await liveSessionService.getMySessions();
            setAllLiveSessions(res.data?.data || []);
        } catch {/* best-effort */} finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        pollRef.current = setInterval(() => refresh(true), 30000);
        return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Partition sessions ─────────────────────────────────
    const now = new Date();
    const liveSessions     = (allLiveSessions || []).filter(s => s.status === 'live');
    const upcomingSessions = (allLiveSessions || []).filter(s => s.status === 'upcoming')
                                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const endedSessions    = (allLiveSessions || []).filter(s => s.status === 'ended' || s.status === 'cancelled')
                                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    // ── Join handler ───────────────────────────────────────
    const handleJoin = async (session) => {
        try {
            const res = await liveSessionService.joinSession(session._id);
            const link = res.data?.data?.meetingLink || session.meetingLink;
            if (link) window.open(link, '_blank', 'noopener,noreferrer');
        } catch (err) {
            const link = session.meetingLink;
            if (link) window.open(link, '_blank', 'noopener,noreferrer');
            else alert(err?.response?.data?.message || 'Could not join. Please try again.');
        }
    };

    // ── Shared card style ──────────────────────────────────
    const c = colors;
    const card = (accent) => ({
        background: c.bgCard,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${accent || c.border}`,
        borderRadius: '12px',
        padding: '20px 20px 18px',
        marginBottom: 0,
    });

    // ── Session card component ─────────────────────────────
    const SessionCard = ({ session, isLiveCard }) => {
        const startDate = new Date(session.startTime);
        const isUpcoming = session.status === 'upcoming';

        return (
            <div style={card(isLiveCard ? '#ef4444' : isUpcoming ? '#22c55e' : c.border)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            {isLiveCard && (
                                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'lsPulse 1.2s ease-in-out infinite' }} />
                                    LIVE NOW
                                </span>
                            )}
                            {isUpcoming && (
                                <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700' }}>
                                    Upcoming
                                </span>
                            )}
                            {session.status === 'ended' && (
                                <span style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700' }}>
                                    Ended
                                </span>
                            )}
                        </div>

                        <h3 style={{ color: c.text, fontSize: '16px', fontWeight: '800', margin: '0 0 8px' }}>{session.title}</h3>

                        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: c.textMuted, flexWrap: 'wrap' }}>
                            {session.courseRef?.courseTitle && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <BookOpen size={12} /> {session.courseRef.courseTitle}
                                </span>
                            )}
                            {session.instructorRef?.fullName && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <User size={12} /> {session.instructorRef.fullName}
                                </span>
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <CalendarDays size={12} /> {fmtDate(session.startTime)}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={12} /> {fmtTime(session.startTime)}
                                {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                            </span>
                            {session.platform && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Video size={12} /> {session.platform}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action button */}
                    <div style={{ flexShrink: 0 }}>
                        {isLiveCard && (
                            <button
                                onClick={() => handleJoin(session)}
                                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 22px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                            >
                                <RadioTower size={16} /> Join Live Class
                            </button>
                        )}
                        {isUpcoming && session.meetingLink && (
                            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '8px 12px', color: '#4ade80', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                                Starts at {fmtTime(session.startTime)}
                            </div>
                        )}
                        {session.status === 'ended' && session.recordingStatus === 'available' && (
                            <button
                                onClick={() => {
                                    const rec = recordings.find(r =>
                                        (r.liveSession === session._id || r.liveSession?._id === session._id) && r.isPublished
                                    );
                                    if (rec) navigate(`/recordings/${rec._id}`);
                                }}
                                style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '9px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Film size={14} /> Watch Recording
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Recording card component ───────────────────────────
    const RecordingCard = ({ rec }) => (
        <div style={{ ...card('#a5b4fc'), display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Thumbnail */}
            <div style={{ width: '140px', height: '82px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden', background: rec.thumbnailUrl ? `url(${rec.thumbnailUrl}) center/cover` : 'rgba(99,102,241,0.12)', border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!rec.thumbnailUrl && <Film size={28} color="#a5b4fc" />}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ color: c.text, fontSize: '15px', fontWeight: '800', margin: '0 0 6px' }}>{rec.title}</h3>
                {rec.description && (
                    <p style={{ color: c.textMuted, fontSize: '13px', margin: '0 0 8px', lineHeight: 1.5 }}>{rec.description}</p>
                )}
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: c.textMuted, flexWrap: 'wrap' }}>
                    {rec.course?.courseTitle && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <BookOpen size={12} /> {rec.course.courseTitle}
                        </span>
                    )}
                    {rec.instructor?.fullName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <User size={12} /> {rec.instructor.fullName}
                        </span>
                    )}
                    {rec.publishedAt && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CalendarDays size={12} /> {fmtDate(rec.publishedAt)}
                        </span>
                    )}
                    {rec.duration > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={12} /> {fmtDur(rec.duration)}
                        </span>
                    )}
                </div>
            </div>

            {/* Watch button */}
            <div style={{ flexShrink: 0 }}>
                <button
                    onClick={() => navigate(`/recordings/${rec._id}`)}
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                >
                    <Play size={14} fill="#fff" /> Watch Recording
                </button>
            </div>
        </div>
    );

    return (
        <div>
            {/* ── Header ──────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
                        <RadioTower size={20} /> Live Classes &amp; Recordings
                    </h2>
                    <p style={styles.tabSubtitle}>Join live sessions and watch recorded classes from your enrolled courses.</p>
                </div>
                <button
                    onClick={() => refresh(false)}
                    disabled={refreshing}
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', padding: '7px 14px', fontWeight: '600', fontSize: '12px', cursor: refreshing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: refreshing ? 0.6 : 1 }}
                >
                    <RefreshCw size={13} style={{ animation: refreshing ? 'lsSpin .8s linear infinite' : 'none' }} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {/* ── LIVE NOW banner ──────────────────────────── */}
            {liveSessions.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.18),rgba(220,38,38,0.1))', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'lsPulse 1.2s ease-in-out infinite', flexShrink: 0 }} />
                        <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '15px' }}>
                            {liveSessions.length === 1 ? '1 Live Session in Progress' : `${liveSessions.length} Live Sessions in Progress`}
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {liveSessions.map(s => (
                            <SessionCard key={s._id} session={s} isLiveCard />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Sub-tabs ──────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: `1px solid ${c.border}`, paddingBottom: '0' }}>
                {[
                    { key: 'sessions', label: 'Sessions', icon: <Wifi size={14} />, count: (allLiveSessions || []).length },
                    { key: 'recordings', label: 'Recordings', icon: <Film size={14} />, count: recordings.length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSection(tab.key)}
                        style={{
                            background: 'transparent', border: 'none',
                            borderBottom: section === tab.key ? '2px solid #22c55e' : '2px solid transparent',
                            color: section === tab.key ? '#22c55e' : c.textMuted,
                            padding: '8px 16px', fontWeight: '700', fontSize: '14px',
                            cursor: 'pointer', marginBottom: '-1px',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {tab.icon} {tab.label}
                        <span style={{ background: section === tab.key ? 'rgba(34,197,94,0.2)' : c.border, color: section === tab.key ? '#22c55e' : c.textMuted, borderRadius: '20px', padding: '1px 7px', fontSize: '11px' }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* ── SESSIONS SECTION ─────────────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {section === 'sessions' && (
                <div>
                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {[
                            { key: 'upcoming', label: 'Upcoming', icon: <CalendarDays size={12} /> },
                            { key: 'past',     label: 'Past',     icon: <Clock size={12} /> },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setLiveFilter(f.key)}
                                style={{ padding: '7px 16px', borderRadius: '8px', border: `1px solid ${liveFilter === f.key ? '#22c55e' : c.border}`, background: liveFilter === f.key ? 'rgba(34,197,94,0.12)' : 'transparent', color: liveFilter === f.key ? '#22c55e' : c.textMuted, fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Upcoming */}
                    {(liveFilter === 'upcoming') && (
                        upcomingSessions.length === 0 ? (
                            <div style={styles.emptyContent || { textAlign: 'center', padding: '60px 20px' }}>
                                <Tv size={44} color={c.textMuted} style={{ marginBottom: '14px' }} />
                                <p style={{ color: c.textMuted }}>No upcoming live sessions scheduled.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {upcomingSessions.map(s => <SessionCard key={s._id} session={s} isLiveCard={false} />)}
                            </div>
                        )
                    )}

                    {/* Past */}
                    {(liveFilter === 'past') && (
                        endedSessions.length === 0 ? (
                            <div style={styles.emptyContent || { textAlign: 'center', padding: '60px 20px' }}>
                                <Tv size={44} color={c.textMuted} style={{ marginBottom: '14px' }} />
                                <p style={{ color: c.textMuted }}>No past sessions found.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {endedSessions.map(s => <SessionCard key={s._id} session={s} isLiveCard={false} />)}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ── RECORDINGS SECTION ───────────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {section === 'recordings' && (
                <div>
                    {recLoading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: c.textMuted }}>Loading recordings…</div>
                    ) : recordings.length === 0 ? (
                        <div style={styles.emptyContent || { textAlign: 'center', padding: '60px 20px', background: c.bgCard, borderRadius: '12px', border: `1px dashed ${c.border}` }}>
                            <Film size={44} color={c.textMuted} style={{ marginBottom: '14px' }} />
                            <p style={{ color: c.textMuted }}>No recordings available yet.</p>
                            <p style={{ color: c.textMuted, fontSize: '13px' }}>Recordings are published by instructors after live sessions end.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {recordings.map(rec => <RecordingCard key={rec._id} rec={rec} />)}
                        </div>
                    )}
                </div>
            )}

            {/* Animations */}
            <style>{`
                @keyframes lsPulse{0%,100%{opacity:1}50%{opacity:.35}}
                @keyframes lsSpin{to{transform:rotate(360deg)}}
            `}</style>
        </div>
    );
}
