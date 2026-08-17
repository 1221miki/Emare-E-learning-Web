import React from 'react';
import { Trophy, Medal } from 'lucide-react';

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];
const MEDAL_LABELS = ['Gold', 'Silver', 'Bronze'];

export default function LeaderboardTab(dash) {
    const { user, colors, leaderboard, avatarUrl, styles } = dash;
        const board = leaderboard;
        const myRank = board.findIndex(u => u._id === user?._id) + 1;
        const top3 = board.slice(0, 3);
        const rest = board.slice(3);

        const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
        const podiumHeights = ['160px', '200px', '130px'];
        const podiumColors = [colors.textMuted, '#f59e0b', colors.primary];
        const podiumMedalColors = [colors.textMuted, '#f59e0b', '#cd7f32'];

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} aria-hidden="true" /> Student Leaderboard
                    </h2>
                    <p style={styles.tabSubtitle}>See how you stack up against peers. Earn XP by completing lessons, quizzes, and assignments!</p>
                </div>

                {board.length === 0 && (
                    <div style={styles.emptyContent}>
                        <Trophy size={48} color={colors.textMuted} style={{ marginBottom: '16px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>No leaderboard data yet. Complete lessons and quizzes to start earning XP!</p>
                    </div>
                )}

                {board.length > 0 && (<>
                {myRank > 0 && (
                    <div style={{ padding: '16px 20px', borderRadius: '12px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}30`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '28px', fontWeight: '800', color: colors.primary }}>#{myRank}</span>
                        <div>
                            <span style={{ color: colors.text, fontWeight: '700', display: 'block' }}>Your Current Rank</span>
                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Keep learning to climb higher! Every completed lesson earns XP.</span>
                        </div>
                    </div>
                )}

                {/* Podium */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '16px', marginBottom: '32px', padding: '24px' }}>
                    {podiumOrder.map((rank, i) => {
                        const entry = top3[rank];
                        if (!entry) return null;
                        return (
                            <div key={entry._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Medal size={28} color={podiumMedalColors[i]} aria-label={MEDAL_LABELS[i]} />
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '18px' }}>
                                    {entry.avatarUrl ? (
                                        <img src={entry.avatarUrl} alt={entry.fullName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        entry.fullName?.[0]?.toUpperCase()
                                    )}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: colors.text, maxWidth: '80px', textAlign: 'center', lineHeight: '1.3' }}>{entry.fullName?.split(' ')[0]}</span>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>{entry.gamificationPoints} XP</span>
                                <div style={{ width: '80px', height: podiumHeights[i], background: `linear-gradient(180deg, ${podiumColors[i]}30, ${podiumColors[i]}10)`, border: `2px solid ${podiumColors[i]}40`, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8px' }}>
                                    <span style={{ fontSize: '20px', fontWeight: '800', color: podiumColors[i] }}>#{rank + 1}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Full Rankings */}
                <div style={styles.tableCard}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>Rank</th>
                                <th style={styles.th}>Student</th>
                                <th style={styles.th}>Level</th>
                                <th style={styles.th}>XP Points</th>
                                <th style={styles.th}>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {board.map((entry, idx) => {
                                const isMe = entry._id === user?._id;
                                const maxXP = board[0]?.gamificationPoints || 1;
                                const pct = Math.round(((entry.gamificationPoints || 0) / maxXP) * 100);
                                return (
                                    <tr key={entry._id} style={{ ...styles.tr, background: isMe ? `${colors.primary}08` : 'transparent' }}>
                                        <td style={{ ...styles.td, fontWeight: '800', color: idx === 0 ? '#f59e0b' : idx === 1 ? colors.textMuted : idx === 2 ? '#cd7f32' : colors.text, fontSize: '16px' }}>
                                            {idx < 3
                                                ? <Medal size={20} color={[MEDAL_COLORS[0], MEDAL_COLORS[1], MEDAL_COLORS[2]][idx]} aria-label={[MEDAL_LABELS[0], MEDAL_LABELS[1], MEDAL_LABELS[2]][idx]} />
                                                : `#${idx + 1}`
                                            }
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>
                                                    {entry.avatarUrl ? (
                                                        <img src={entry.avatarUrl} alt={entry.fullName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        entry.fullName?.[0]?.toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <strong style={{ color: isMe ? colors.primary : colors.text }}>{entry.fullName} {isMe ? '(You)' : ''}</strong>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}><span style={styles.courseBadge}>Lv {entry.level || 1}</span></td>
                                        <td style={{ ...styles.tdScore, fontSize: '15px' }}>{(entry.gamificationPoints || 0).toLocaleString()} XP</td>
                                        <td style={{ ...styles.td, minWidth: '120px' }}>
                                            <div style={{ background: colors.bgInput, borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </>)}
            </div>
        );
}
