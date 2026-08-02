import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function LearningHistory({ recentlyViewed = [], enrollments = [] }) {
    const { colors } = useTheme();

    return (
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
            <h4 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 900 }}>Learning History</h4>
            <p style={{ margin: '6px 0 12px', color: colors.textMuted, fontSize: 13 }}>Previously accessed courses and recent activity.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentlyViewed.slice(0,5).map((c, idx) => (
                    <div key={c._id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bgInput, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}` }}>
                        <div>
                            <div style={{ fontWeight: 800, color: colors.text }}>{c.courseTitle}</div>
                            <div style={{ fontSize: 12, color: colors.textMuted }}>{c.technicalCategory || 'Course'}</div>
                        </div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{c.estimatedDurationHours || '—'} hrs</div>
                    </div>
                ))}

                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <a href="/student/learn" style={{ color: colors.primary, fontWeight: 800 }}>View full history →</a>
                </div>
            </div>
        </div>
    );
}
