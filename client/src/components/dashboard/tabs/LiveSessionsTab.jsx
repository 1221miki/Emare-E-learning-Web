import React from 'react';
import { Video, CalendarDays, Clock, User, RadioTower, Film, Tv } from 'lucide-react';

export default function LiveSessionsTab(dash) {
    const { colors, allLiveSessions, liveFilter, setLiveFilter, styles } = dash;
        const now = new Date();
        const upcoming = allLiveSessions.filter(s => new Date(s.startTime) > now);
        const past = allLiveSessions.filter(s => new Date(s.startTime) <= now);
        const displayed = liveFilter === 'upcoming' ? upcoming : past;
        const finalSessions = displayed;

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RadioTower size={20} aria-hidden="true" /> Live Sessions &amp; Virtual Classrooms
                    </h2>
                    <p style={styles.tabSubtitle}>Join scheduled instructor-led live sessions and interactive labs</p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {['upcoming', 'past'].map(f => (
                        <button
                            key={f}
                            onClick={() => setLiveFilter(f)}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: `1px solid ${liveFilter === f ? colors.primary : colors.border}`,
                                background: liveFilter === f ? `${colors.primary}15` : 'transparent',
                                color: liveFilter === f ? colors.primary : colors.textMuted,
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {f === 'upcoming'
                                ? <><Video size={15} aria-hidden="true" /> Upcoming</>
                                : <><Film size={15} aria-hidden="true" /> Past Sessions</>
                            }
                        </button>
                    ))}
                </div>

                {finalSessions.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <Tv size={48} color={colors.textMuted} style={{ marginBottom: '16px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>{liveFilter === 'upcoming' ? 'No upcoming live sessions scheduled.' : 'No past session recordings available.'}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {finalSessions.map((session) => {
                            const sessionDate = new Date(session.startTime);
                            const isLive = Math.abs(Date.now() - sessionDate.getTime()) < 3600000;
                            return (
                                <div key={session._id} style={{ ...styles.panelCard, marginBottom: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderLeft: `4px solid ${isLive ? '#ef4444' : colors.accent}` }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            {isLive && <span style={{ background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', animation: 'pulse 1s infinite', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><RadioTower size={12} aria-hidden="true" /> LIVE NOW</span>}
                                            <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>{session.title}</h3>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: colors.textMuted, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarDays size={14} aria-hidden="true" /> {sessionDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} aria-hidden="true" /> {sessionDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                            {session.durationMinutes && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} aria-hidden="true" /> {session.durationMinutes} min</span>}
                                            {session.instructorRef?.fullName && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} aria-hidden="true" /> {session.instructorRef.fullName}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {session.meetingLink && (
                                            <button onClick={() => window.open(session.meetingLink === '#' ? '/live-sessions' : session.meetingLink, '_blank')} style={{ ...styles.resumeBtn, padding: '10px 20px', background: isLive ? '#ef4444' : `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', gap: '6px' }} aria-label={isLive ? 'Join live session' : 'View session details'}>
                                                {isLive ? <><RadioTower size={16} aria-hidden="true" /> Join Now</> : <><Video size={16} aria-hidden="true" /> View Details</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
}
