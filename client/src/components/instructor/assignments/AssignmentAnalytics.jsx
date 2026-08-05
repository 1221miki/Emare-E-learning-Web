import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Star, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { card, C } from './assignmentStyles';

function Bar({ label, value, max, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ color, fontSize: '12px', fontWeight: '700' }}>{value}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(51,65,85,0.4)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
}

function Donut({ data }) {
    const total = data.reduce((a, d) => a + d.value, 0);
    if (total === 0) return <div style={{ color: '#334155', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No data yet</div>;

    let offset = 0;
    const r = 50;
    const circ = 2 * Math.PI * r;
    const cx = 70, cy = 70;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <svg width="140" height="140" viewBox="0 0 140 140" aria-label="Submission status donut chart">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="16" />
                {data.map((d, i) => {
                    const dash = (d.value / total) * circ;
                    const seg = (
                        <circle
                            key={i}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={d.color}
                            strokeWidth="16"
                            strokeDasharray={`${dash} ${circ}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    );
                    offset += dash;
                    return seg;
                })}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="800">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill="#475569" fontSize="10">total</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{d.label}</span>
                        <span style={{ color: d.color, fontSize: '12px', fontWeight: '700', marginLeft: 'auto' }}>{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AssignmentAnalytics({ assignments, allSubmissions }) {
    const stats = useMemo(() => {
        const total    = allSubmissions.length;
        const graded   = allSubmissions.filter(s => s.status === 'Graded');
        const pending  = allSubmissions.filter(s => s.status === 'Submitted').length;
        const scores   = graded.map(s => s.grade || 0);
        const avg      = scores.length ? Math.round(scores.reduce((a, v) => a + v, 0) / scores.length) : null;
        const highest  = scores.length ? Math.max(...scores) : null;
        const lowest   = scores.length ? Math.min(...scores) : null;
        const submRate = assignments.length > 0 ? Math.round((total / (assignments.length * 10)) * 100) : 0;

        // Score distribution buckets
        const buckets = [
            { label: '90–100%', min: 90, max: 100 },
            { label: '80–89%',  min: 80, max: 89 },
            { label: '70–79%',  min: 70, max: 79 },
            { label: '60–69%',  min: 60, max: 69 },
            { label: 'Below 60%', min: 0, max: 59 },
        ].map(b => ({ ...b, count: scores.filter(s => s >= b.min && s <= b.max).length }));

        // Top students by avg score
        const byStudent = {};
        graded.forEach(s => {
            const id = s.studentRef?._id || s.studentRef;
            const name = s.studentRef?.fullName || 'Unknown';
            if (!byStudent[id]) byStudent[id] = { name, scores: [] };
            byStudent[id].scores.push(s.grade || 0);
        });
        const studentList = Object.values(byStudent).map(st => ({
            name: st.name,
            avg: Math.round(st.scores.reduce((a, v) => a + v, 0) / st.scores.length),
            count: st.scores.length,
        })).sort((a, b) => b.avg - a.avg);

        return { total, graded: graded.length, pending, avg, highest, lowest, submRate, buckets, studentList };
    }, [assignments, allSubmissions]);

    const donutData = [
        { label: 'Graded',  value: stats.graded,  color: C.green  },
        { label: 'Pending', value: stats.pending, color: C.orange },
        { label: 'Others',  value: Math.max(0, stats.total - stats.graded - stats.pending), color: C.slate },
    ].filter(d => d.value > 0);

    const kpis = [
        { icon: <BarChart3 />,   color: C.blue,   label: 'Submission Rate', value: `${stats.submRate}%` },
        { icon: <TrendingUp />,  color: C.green,  label: 'Avg Score',       value: stats.avg !== null ? `${stats.avg}%` : '—' },
        { icon: <Star />,        color: C.orange, label: 'Highest Score',   value: stats.highest !== null ? `${stats.highest}%` : '—' },
        { icon: <AlertTriangle />, color: C.red,  label: 'Lowest Score',    value: stats.lowest !== null ? `${stats.lowest}%` : '—' },
        { icon: <CheckCircle />, color: C.purple, label: 'Graded',          value: stats.graded },
        { icon: <Clock />,       color: C.cyan,   label: 'Pending',         value: stats.pending },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px' }}>
                {kpis.map((k, i) => (
                    <div key={i} style={{ ...card, padding: '16px 18px', borderTop: `3px solid ${k.color}` }}>
                        <div style={{ marginBottom: '8px' }}>{React.cloneElement(k.icon, { size: 17, color: k.color, 'aria-hidden': true })}</div>
                        <div style={{ color: '#f8fafc', fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>{k.value}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Submission status donut */}
                <div style={{ ...card, padding: '20px 22px' }}>
                    <h4 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <Users size={15} color={C.blue} aria-hidden="true" /> Submission Status
                    </h4>
                    <Donut data={donutData} />
                </div>

                {/* Score distribution */}
                <div style={{ ...card, padding: '20px 22px' }}>
                    <h4 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <BarChart3 size={15} color={C.purple} aria-hidden="true" /> Score Distribution
                    </h4>
                    {stats.buckets.every(b => b.count === 0)
                        ? <p style={{ color: '#334155', fontSize: '13px' }}>No graded submissions yet.</p>
                        : stats.buckets.map((b, i) => {
                            const colors = [C.green, C.blue, C.cyan, C.orange, C.red];
                            return <Bar key={i} label={b.label} value={b.count} max={Math.max(...stats.buckets.map(x => x.count), 1)} color={colors[i]} />;
                        })
                    }
                </div>
            </div>

            {/* Student performance */}
            <div style={{ ...card, padding: '20px 22px' }}>
                <h4 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <TrendingUp size={15} color={C.green} aria-hidden="true" /> Student Performance
                </h4>
                {stats.studentList.length === 0 ? (
                    <p style={{ color: '#334155', fontSize: '13px' }}>No graded data available yet.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                        {stats.studentList.slice(0, 12).map((st, i) => {
                            const color = st.avg >= 80 ? C.green : st.avg >= 60 ? C.orange : C.red;
                            const isTop = i < 3;
                            return (
                                <div key={i} style={{ background: 'rgba(9,13,22,0.5)', border: `1px solid ${isTop ? color + '30' : 'rgba(51,65,85,0.35)'}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>
                                        {st.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.name}</div>
                                        <div style={{ color: '#475569', fontSize: '11px' }}>{st.count} submission{st.count !== 1 ? 's' : ''}</div>
                                    </div>
                                    <div style={{ color, fontSize: '15px', fontWeight: '800', flexShrink: 0 }}>{st.avg}%</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
