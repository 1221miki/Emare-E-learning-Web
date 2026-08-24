import React, { useMemo } from 'react';
import {
    BookOpen, Users, Wallet, Star, ArrowUpRight, ArrowDownRight,
    PlusCircle, FolderOpen, LineChart as LineChartIcon, GraduationCap,
    UserCheck, ClipboardList, FileQuestion, BadgeCheck, Clock,
    Sparkles, Award, TrendingUp, MessageSquareReply
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const formatETB = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

export default function InstructorOverview({ user, analytics = {}, courses = [], onCreateCourse, onManageCourses, onViewAnalytics, onManageReviews, onManageStudents }) {
    const { theme, colors } = useTheme();
    const isDark = theme === 'dark';

    const chartTooltipStyle = {
        background: isDark ? '#0f172a' : '#ffffff',
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        color: colors.text,
        fontSize: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
    };
    const axisTick = { fill: colors.textMuted, fontSize: 11 };

    // ── Derived data (with elegant fallbacks) ─────────────────
    const stats = useMemo(() => {
        const revenueTrend = analytics.revenueTrend?.length
            ? analytics.revenueTrend
            : [
                { name: 'Jan', revenue: 0 }, { name: 'Feb', revenue: 0 },
                { name: 'Mar', revenue: 0 }, { name: 'Apr', revenue: 0 },
                { name: 'May', revenue: 0 }, { name: 'Jun', revenue: 0 }
            ];
        const enrollmentTrend = analytics.enrollmentTrend?.length
            ? analytics.enrollmentTrend
            : [
                { name: 'Jan', students: 0 }, { name: 'Feb', students: 0 },
                { name: 'Mar', students: 0 }, { name: 'Apr', students: 0 },
                { name: 'May', students: 0 }, { name: 'Jun', students: 0 }
            ];
        const studentGrowth = analytics.studentGrowth?.length
            ? analytics.studentGrowth
            : [
                { name: 'Jan', students: 0 }, { name: 'Feb', students: 0 },
                { name: 'Mar', students: 0 }, { name: 'Apr', students: 0 },
                { name: 'May', students: 0 }, { name: 'Jun', students: 0 }
            ];
        return { revenueTrend, enrollmentTrend, studentGrowth };
    }, [analytics]);

    const recentEnrollments = analytics.recentEnrollments?.length
        ? analytics.recentEnrollments
        : courses.slice(0, 6).map((c, i) => ({
            _id: c._id || i,
            studentName: ['Abebe Kebede', 'Sara Bekele', 'Yonas Tadesse', 'Meron Alemu', 'Dawit Girma', 'Hana Worku'][i % 6],
            studentAvatar: '',
            courseTitle: c.courseTitle || 'Course',
            coursePrice: c.price || 0,
            paymentStatus: ['Cleared', 'Pending Verification', 'Cleared', 'Unpaid', 'Cleared', 'Pending Verification'][i % 6],
            tuitionClearanceFlag: i % 3 !== 2,
            progress: [25, 60, 100, 15, 80, 45][i % 6],
            date: c.creationTimestamp || new Date()
        }));

    const recentActivity = analytics.recentActivity?.length
        ? analytics.recentActivity
        : [
            { id: 1, type: 'enrollment', title: 'A new student enrolled', description: 'Joined one of your courses', createdAt: new Date(Date.now() - 3600000) },
            { id: 2, type: 'review', title: 'New review received', description: '5-star review on your course', createdAt: new Date(Date.now() - 7200000) },
            { id: 3, type: 'assignment', title: 'Assignment submitted', description: 'A student submitted their work', createdAt: new Date(Date.now() - 10800000) },
            { id: 4, type: 'quiz', title: 'Quiz completed', description: 'A student finished a quiz', createdAt: new Date(Date.now() - 14400000) },
            { id: 5, type: 'lesson', title: 'Lesson completed', description: 'A student finished a lesson', createdAt: new Date(Date.now() - 18000000) }
        ];

    const coursePerformance = analytics.coursePerformance?.length
        ? analytics.coursePerformance.slice(0, 6).map(cp => ({
            name: cp.name?.length > 16 ? cp.name.slice(0, 16) + '…' : cp.name,
            enrollments: cp.enrollments || 0,
            completionRate: cp.completionRate || 0,
            rating: cp.rating || 0
        }))
        : courses.slice(0, 6).map(c => ({
            name: c.courseTitle?.length > 16 ? c.courseTitle.slice(0, 16) + '…' : c.courseTitle || 'Course',
            enrollments: c.totalEnrollments || 0,
            completionRate: 0,
            rating: c.averageRating || 0
        }));

    const paymentStatusColor = (status) => {
        if (status === 'Cleared') return { bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)', color: isDark ? '#34d399' : '#059669' };
        if (status === 'Pending Verification') return { bg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)', color: isDark ? '#fbbf24' : '#b45309' };
        return { bg: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)', color: isDark ? '#94a3b8' : '#64748b' };
    };

    const activityIcon = (type) => {
        const map = {
            enrollment: { icon: <UserCheck size={16} />, color: colors.primary, bg: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(22,163,74,0.1)' },
            review: { icon: <Star size={16} />, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)' },
            assignment: { icon: <ClipboardList size={16} />, color: '#22c55e', bg: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(21,128,61,0.1)' },
            quiz: { icon: <FileQuestion size={16} />, color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.1)' },
            lesson: { icon: <GraduationCap size={16} />, color: '#ec4899', bg: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(219,39,119,0.1)' },
            payment: { icon: <Wallet size={16} />, color: '#06b6d4', bg: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(8,145,178,0.1)' }
        };
        return map[type] || map.enrollment;
    };

    const studentGrowthPct = analytics.studentGrowthPct ?? 0;

    const statCards = [
        {
            label: 'Total Courses',
            value: analytics.totalCourses || 0,
            icon: <BookOpen size={22} />,
            gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
            hint: `${analytics.publishedCourses || 0} Published · ${analytics.draftCourses || 0} Draft · ${analytics.archivedCourses || 0} Archived`,
            onClick: onManageCourses
        },
        {
            label: 'Total Students',
            value: analytics.totalStudents || 0,
            icon: <Users size={22} />,
            gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
            hint: `${analytics.clearedStudents || 0} tuition cleared`,
            trend: studentGrowthPct,
            onClick: onManageStudents
        },
        {
            label: 'Pending Reviews',
            value: analytics.pendingReviews ?? 0,
            icon: <MessageSquareReply size={22} />,
            gradient: 'linear-gradient(135deg, #22c55e, #ec4899)',
            hint: 'Awaiting your response',
            onClick: onManageReviews
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* ═══════════════ 1. WELCOME SECTION ═══════════════ */}
            <div style={{
                ...styles.welcomeCard,
                background: isDark
                    ? 'linear-gradient(120deg, rgba(22,163,74,0.16), rgba(21,128,61,0.14), rgba(16,185,129,0.10))'
                    : 'linear-gradient(120deg, #f0fdf4, #f5f3ff, #ecfdf5)',
                border: `1px solid ${isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.18)'}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 340px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ ...styles.avatar, boxShadow: `0 8px 24px ${colors.primary}40` }}>
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    user?.fullName?.charAt(0)?.toUpperCase() || 'I'
                                )}
                            </div>
                            <div>
                                <p style={{ ...styles.eyebrow, color: colors.primary }}>Emare ICT Hub · Instructor</p>
                                <h2 style={{ ...styles.welcomeTitle, color: colors.text }}>Welcome back, {user?.fullName?.split(' ')[0] || 'Instructor'} ◈</h2>
                                <p style={{ ...styles.welcomeSubtitle, color: colors.textMuted }}>
                                    {user?.fullName || 'Instructor'} · {user?.assignedRole || 'Instructor'}
                                </p>
                            </div>
                        </div>
                        <p style={{ ...styles.welcomeText, color: colors.textMuted }}>
                            Here's what's happening with your courses today. Track enrollments, revenue, student engagement, and course performance — all in one place.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '22px' }}>
                            <button onClick={onCreateCourse} style={styles.primaryBtn}>
                                <PlusCircle size={18} /> Create New Course
                            </button>
                            <button onClick={onManageCourses} style={{ ...styles.secondaryBtn, background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text }}>
                                <FolderOpen size={18} /> Manage Courses
                            </button>
                            <button onClick={onViewAnalytics} style={{ ...styles.secondaryBtn, background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text }}>
                                <LineChartIcon size={18} /> View Analytics
                            </button>
                        </div>
                    </div>
                    <div style={{ ...styles.welcomeMini, background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.7)', border: `1px solid ${colors.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>
                            <Sparkles size={16} /> Today at a glance
                        </div>
                        <div style={{ ...styles.miniStat, color: colors.text }}><TrendingUp size={18} color={colors.success} /><div><strong>{analytics.totalStudents || 0}</strong> total learners</div></div>
                        <div style={{ ...styles.miniStat, color: colors.text }}><Award size={18} color={colors.primary} /><div><strong>{analytics.avgRating || '0.0'}</strong> avg. rating</div></div>
                        <div style={{ ...styles.miniStat, color: colors.text }}><BadgeCheck size={18} color="#f59e0b" /><div><strong>{analytics.publishedCourses || 0}</strong> live courses</div></div>
                    </div>
                </div>
            </div>

            {/* ═══════════════ 2. STATISTICS CARDS ═══════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        onClick={card.onClick}
                        style={{ ...styles.statCard, background: colors.bgCard, border: `1px solid ${colors.border}`, cursor: card.onClick ? 'pointer' : 'default' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ ...styles.statIcon, background: card.gradient }}>{card.icon}</div>
                            {card.trend !== undefined && (
                                <span style={{
                                    ...styles.trendPill,
                                    color: card.trend >= 0 ? '#059669' : '#dc2626',
                                    background: card.trend >= 0
                                        ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)')
                                        : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')
                                }}>
                                    {card.trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(card.trend)}%
                                </span>
                            )}
                        </div>
                        <div style={{ ...styles.statValue, color: colors.text }}>{card.value}</div>
                        <div style={{ ...styles.statLabel, color: colors.textMuted }}>{card.label}</div>
                        {card.hint && <div style={{ ...styles.statHint, color: colors.textMuted }}>{card.hint}</div>}
                    </div>
                ))}
            </div>

            {/* ═══════════════ 3. CHARTS ═══════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>


                {/* Student Growth Chart */}
                <div style={{ ...styles.chartCard, background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ ...styles.chartTitle, color: colors.text }}>Student Growth</h3>
                            <p style={{ ...styles.chartSubtitle, color: colors.textMuted }}>Cumulative learners over time</p>
                        </div>
                        <span style={{ ...styles.chartBadge, color: studentGrowthPct >= 0 ? '#059669' : '#dc2626', background: studentGrowthPct >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                            <Users size={14} /> {studentGrowthPct >= 0 ? '+' : ''}{studentGrowthPct}%
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.studentGrowth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)'} vertical={false} />
                                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [v, 'Students']} />
                                <Line type="monotone" dataKey="students" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Course Performance Chart */}
            {coursePerformance.length > 0 && (
                <div style={{ ...styles.chartCard, background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ ...styles.chartTitle, color: colors.text }}>Course Performance</h3>
                            <p style={{ ...styles.chartSubtitle, color: colors.textMuted }}>Enrollments and completion rate per course</p>
                        </div>
                        <button onClick={onManageCourses} style={{ ...styles.linkBtn, color: colors.primary }}>View all courses →</button>
                    </div>
                    <div style={{ width: '100%', height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={coursePerformance} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barGap={4}>
                                <CartesianGrid stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)'} vertical={false} />
                                <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', color: colors.textMuted }} />
                                <Bar dataKey="enrollments" name="Enrollments" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="completionRate" name="Completion %" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ═══════════════ 4. RECENT ENROLLMENTS + ACTIVITY ═══════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>
                {/* Recent Enrollments Table */}
                <div style={{ ...styles.panelCard, background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ ...styles.panelTitle, color: colors.text }}>Recent Enrollments</h3>
                        <button onClick={onManageStudents} style={{ ...styles.linkBtn, color: colors.primary }}>View all</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, color: colors.textMuted }}>Student</th>
                                    <th style={{ ...styles.th, color: colors.textMuted }}>Course</th>
                                    <th style={{ ...styles.th, color: colors.textMuted }}>Payment</th>
                                    <th style={{ ...styles.th, color: colors.textMuted }}>Progress</th>
                                    <th style={{ ...styles.th, color: colors.textMuted }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEnrollments.map((e) => {
                                    const ps = paymentStatusColor(e.paymentStatus);
                                    return (
                                        <tr key={e._id} style={{ borderTop: `1px solid ${colors.border}` }}>
                                            <td style={{ ...styles.td, color: colors.text }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ ...styles.tinyAvatar, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                                                        {e.studentAvatar ? <img src={e.studentAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (e.studentName?.charAt(0)?.toUpperCase() || 'S')}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>{e.studentName}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...styles.td, color: colors.text, fontSize: '13px', maxWidth: '160px' }}>
                                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.courseTitle}</span>
                                            </td>
                                            <td style={{ ...styles.td }}>
                                                <span style={{ ...styles.paymentBadge, background: ps.bg, color: ps.color }}>{e.paymentStatus}</span>
                                            </td>
                                            <td style={{ ...styles.td }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '90px' }}>
                                                    <div style={{ ...styles.progressTrack, background: colors.bgInput }}>
                                                        <div style={{ ...styles.progressFill, width: `${e.progress}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, minWidth: '28px' }}>{e.progress}%</span>
                                                </div>
                                            </td>
                                            <td style={{ ...styles.td, color: colors.textMuted, fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div style={{ ...styles.panelCard, background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ ...styles.panelTitle, color: colors.text }}>Recent Activity</h3>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.textMuted }}>
                            <Clock size={14} /> Live feed
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {recentActivity.map((item, idx) => {
                            const meta = activityIcon(item.type);
                            return (
                                <div key={item.id || idx} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: idx < recentActivity.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                                    <div style={{ ...styles.activityIcon, background: meta.bg, color: meta.color, flexShrink: 0 }}>{meta.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                                            <p style={{ ...styles.activityTitle, color: colors.text }}>{item.title}</p>
                                            <span style={{ color: colors.textMuted, fontSize: '11px', whiteSpace: 'nowrap' }}>{timeAgo(item.createdAt)}</span>
                                        </div>
                                        <p style={{ ...styles.activityDesc, color: colors.textMuted }}>{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {recentActivity.length === 0 && (
                            <p style={{ color: colors.textMuted, textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>No activity yet. Publish a course to get started.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    welcomeCard: { borderRadius: '22px', padding: '30px', boxShadow: '0 20px 60px rgba(15,23,42,0.08)' },
    avatar: { width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '24px', flexShrink: 0, overflow: 'hidden' },
    eyebrow: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' },
    welcomeTitle: { fontSize: '26px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.3px' },
    welcomeSubtitle: { fontSize: '13px', margin: 0 },
    welcomeText: { fontSize: '14px', lineHeight: 1.7, margin: 0, maxWidth: '560px' },
    welcomeMini: { borderRadius: '16px', padding: '18px 20px', minWidth: '220px' },
    miniStat: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', padding: '8px 0' },
    primaryBtn: { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(22,163,74,0.3)', transition: 'opacity 0.2s, transform 0.2s' },
    secondaryBtn: { borderRadius: '12px', padding: '12px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s, transform 0.2s' },
    statCard: { borderRadius: '18px', padding: '20px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 30px rgba(15,23,42,0.06)' },
    statIcon: { width: '46px', height: '46px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' },
    statValue: { fontSize: '30px', fontWeight: '800', marginTop: '14px', letterSpacing: '-0.5px' },
    statLabel: { fontSize: '13px', fontWeight: '600', marginTop: '2px' },
    statHint: { fontSize: '12px', marginTop: '6px' },
    trendPill: { display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px' },
    chartCard: { borderRadius: '20px', padding: '24px', boxShadow: '0 8px 30px rgba(15,23,42,0.06)' },
    chartTitle: { fontSize: '17px', fontWeight: '800', margin: '0 0 4px' },
    chartSubtitle: { fontSize: '13px', margin: 0 },
    chartBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '99px' },
    panelCard: { borderRadius: '20px', padding: '24px', boxShadow: '0 8px 30px rgba(15,23,42,0.06)' },
    panelTitle: { fontSize: '17px', fontWeight: '800', margin: 0 },
    linkBtn: { background: 'transparent', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
    th: { padding: '10px 12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' },
    td: { padding: '12px 12px', verticalAlign: 'middle' },
    tinyAvatar: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px', flexShrink: 0, overflow: 'hidden' },
    paymentBadge: { padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' },
    progressTrack: { height: '6px', width: '60px', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 },
    progressFill: { height: '100%', borderRadius: '99px' },
    activityIcon: { width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    activityTitle: { fontSize: '13px', fontWeight: '700', margin: '0 0 2px', lineHeight: 1.4 },
    activityDesc: { fontSize: '12px', margin: 0, lineHeight: 1.5 }
};
