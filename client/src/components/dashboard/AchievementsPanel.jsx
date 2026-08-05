import React from 'react';
import { Award, Clock3, Trophy, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AchievementsPanel({ certificates = [], badges = [] }) {
    const { colors } = useTheme();

    const defaultBadges = badges.length ? badges : [
        { name: 'Fast Learner', icon: <Zap size={24} aria-hidden="true" />, unlocked: certificates.length > 0 },
        { name: 'Course Completer', icon: <Trophy size={24} aria-hidden="true" />, unlocked: certificates.length > 0 },
        { name: 'Streak 7 Days', icon: <Clock3 size={24} aria-hidden="true" />, unlocked: false }
    ];

    return (
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
            <h4 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 900 }}>Achievements</h4>
            <p style={{ margin: '6px 0 12px', color: colors.textMuted, fontSize: 13 }}>Badges, certificates and milestones you've earned.</p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {defaultBadges.map((b, i) => (
                    <div key={b.name + i} style={{ minWidth: 120, background: b.unlocked ? `${colors.success}08` : colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 10, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, background: b.unlocked ? `${colors.primary}15` : colors.bgInput, color: b.unlocked ? colors.primary : colors.textMuted, margin: '0 auto' }}>
                            {b.icon}
                        </div>
                        <div style={{ fontWeight: 800, color: b.unlocked ? colors.text : colors.textMuted, marginTop: 8 }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{b.unlocked ? 'Unlocked' : 'Locked'}</div>
                    </div>
                ))}
            </div>

            {certificates.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>Certificates</div>
                    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                        {certificates.slice(0,3).map(c => (
                            <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bgInput, padding: 8, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                                <div style={{ fontWeight: 800, color: colors.text }}>{c.courseRef?.courseTitle || 'Course'}</div>
                                <a href={c.certificatePdfUrl} target="_blank" rel="noreferrer" style={{ color: colors.primary, fontWeight: 800 }}>View</a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
