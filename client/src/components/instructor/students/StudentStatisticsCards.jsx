import React from 'react';
import { Users, Activity, CheckCircle, Star, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const Skeleton = () => (
    <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(51,65,85,0.4)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: '8px' }} />
);

function StatCard({ icon, color, label, value, sub, badge, loading, colors, theme }) {
    return (
        <div
            style={{
                background: colors.bgCard,
                backdropFilter: 'blur(12px)',
                border: `2px solid ${colors.border}`,
                borderTop: `4px solid ${color}`,
                borderRadius: '16px',
                padding: '22px 24px',
                transition: 'transform 0.18s, box-shadow 0.18s',
                cursor: 'default',
                boxShadow: `0 1px 3px ${theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)'}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 1px 3px ${theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`; }}
        >
            {/* Icon + Label row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${color}18`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {React.cloneElement(icon, { size: 20, color, 'aria-hidden': true })}
                </div>
                {badge && (
                    <span style={{ background: `${badge.color}18`, color: badge.color, border: `2px solid ${badge.color}30`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '700' }}>
                        {badge.text}
                    </span>
                )}
            </div>

            {/* Value */}
            {loading
                ? <><Skeleton /><Skeleton /></>
                : <>
                    <div style={{ color: colors.text, fontSize: '30px', fontWeight: '800', lineHeight: 1, marginBottom: '6px' }}>{value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
                    {sub && <div style={{ color: colors.textMuted, fontSize: '12px' }}>{sub}</div>}
                </>
            }
        </div>
    );
}

export default function StudentStatisticsCards({ analytics = {}, loading }) {
    const { colors, theme } = useTheme();
    const cards = [
        {
            icon: <Users />,
            color: '#3b82f6',
            label: 'Total Students',
            value: loading ? '—' : analytics.total?.toLocaleString() ?? '0',
            sub: `${analytics.active ?? 0} currently active`,
            badge: analytics.total > 0 ? { text: '+Active', color: '#10b981' } : null,
        },
        {
            icon: <Activity />,
            color: '#10b981',
            label: 'Active Learners',
            value: loading ? '—' : analytics.active?.toLocaleString() ?? '0',
            sub: `${analytics.inactive ?? 0} inactive · ${analytics.atRisk ?? 0} at risk`,
        },
        {
            icon: <CheckCircle />,
            color: '#6366f1',
            label: 'Completion Rate',
            value: loading ? '—' : `${analytics.completionRate ?? 0}%`,
            sub: `${analytics.completed ?? 0} completed · Avg ${analytics.avgProgress ?? 0}% progress`,
        },
        {
            icon: <Star />,
            color: '#f59e0b',
            label: 'Average Rating',
            value: loading ? '—' : analytics.avgRating ? analytics.avgRating.toFixed(1) : '—',
            sub: analytics.ratingCount > 0 ? `From ${analytics.ratingCount.toLocaleString()} reviews` : 'No reviews yet',
            badge: analytics.avgRating >= 4.5 ? { text: 'Excellent', color: '#f59e0b' } : null,
        },
        {
            icon: <TrendingUp />,
            color: '#ec4899',
            label: 'Avg Quiz Score',
            value: loading ? '—' : analytics.avgScore ? `${analytics.avgScore}%` : '—',
            sub: 'Across all graded submissions',
        },
        {
            icon: <AlertTriangle />,
            color: '#ef4444',
            label: 'At Risk',
            value: loading ? '—' : analytics.atRisk?.toLocaleString() ?? '0',
            sub: 'Low engagement or no clearance',
            badge: analytics.atRisk > 0 ? { text: 'Needs attention', color: '#ef4444' } : null,
        },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {cards.map((c, i) => <StatCard key={i} {...c} loading={loading} colors={colors} theme={theme} />)}
        </div>
    );
}
