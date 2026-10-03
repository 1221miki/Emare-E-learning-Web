import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { learningProgressService } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressOverview({ enrollments = [], certificates = [], grades = [] }) {
    const { colors } = useTheme();
    const [resume, setResume] = useState(null);
    const [trendData, setTrendData] = useState([]);

    useEffect(() => {
        let mounted = true;
        learningProgressService.getResumeProgress().then(res => {
            if (mounted && res.data && res.data.success) setResume(res.data.data);
        }).catch(() => {});

        const now = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => ({
            day: new Date(now.getTime() - (6 - i) * 24 * 3600 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            minutes: Math.floor(Math.random() * 60)
        }));
        setTrendData(days);

        return () => { mounted = false; };
    }, []);

    const totalEnrolled = enrollments.length;
    const totalCompleted = enrollments.filter(e => (e.completionPercentage || 0) >= 100).length;
    const lessonsCompleted = enrollments.reduce((acc, e) => acc + (e.lessonsCompleted || 0), 0);

    return (
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                    <h3 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 900 }}>Overall Progress</h3>
                    <p style={{ margin: '6px 0 0', color: colors.textMuted, fontSize: 13 }}>Track your learning momentum and resume where you left off.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: colors.primary, fontWeight: 900, fontSize: 18 }}>{totalEnrolled} Enrolled</div>
                    <div style={{ color: colors.textMuted, fontSize: 12 }}>{totalCompleted} Completed</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: colors.textMuted, fontSize: 12 }}>Course Completion Average</span>
                        <span style={{ color: colors.primary, fontWeight: 800 }}>{Math.round(enrollments.reduce((s,e) => s + (e.completionPercentage||0), 0) / Math.max(enrollments.length,1))}%</span>
                    </div>
                    <div style={{ height: 10, background: colors.bgInput, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(enrollments.reduce((s,e) => s + (e.completionPercentage||0), 0) / Math.max(enrollments.length,1))}%`, height: '100%', background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
                    </div>
                </div>
                <div style={{ width: 160, height: 70 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                            <XAxis dataKey="day" tick={{ fill: colors.textMuted, fontSize: 10 }} />
                            <YAxis hide />
                            <Tooltip />
                            <Line type="monotone" dataKey="minutes" stroke={colors.primary} strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, background: colors.bgInput, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>Lessons Completed</div>
                    <div style={{ fontWeight: 800, color: colors.text, fontSize: 16 }}>{lessonsCompleted}</div>
                </div>
                <div style={{ flex: 1, background: colors.bgInput, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>Certificates</div>
                    <div style={{ fontWeight: 800, color: colors.text, fontSize: 16 }}>{certificates.length}</div>
                </div>
                <div style={{ flex: 1, background: colors.bgInput, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>Avg Quiz Score</div>
                    <div style={{ fontWeight: 800, color: colors.text, fontSize: 16 }}>{grades.length ? Math.round(grades.reduce((s,g) => s + (g.numericalScoreEarned||0),0)/grades.length) : '—'}</div>
                </div>
            </div>

            {resume && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 13, color: colors.textMuted }}>Resume where you left off</div>
                        <div style={{ fontWeight: 800, color: colors.text }}>{resume.courseRef?.courseTitle || '—'}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{resume.lastLessonTitle || 'Last lesson'}</div>
                    </div>
                    <div>
                        <button onClick={() => window.location.href = resume ? `/student/learn/${resume.courseRef?._id}` : '/student/dashboard'} style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 10, fontWeight: 800 }}>Continue</button>
                    </div>
                </div>
            )}
        </div>
    );
}
