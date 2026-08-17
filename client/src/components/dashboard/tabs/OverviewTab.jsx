import React from 'react';
import {
    GraduationCap, ClipboardCheck, CreditCard, Video, Trophy,
    BarChart3, Zap, Megaphone, Bell, CheckCircle2, Clock,
    ArrowRight, PlayCircle, Lightbulb, CalendarDays
} from 'lucide-react';

export default function OverviewTab(dash) {
    const {
        user, setActiveTab, enrollments, allCourses, liveSessions,
        assignmentsList, upcomingAssignmentsCount, quizAverage, xpPoints,
        currentLevel, notifications, notificationTab, setNotificationTab,
        handleMarkNotificationAsRead, navigate, completedCoursesCount,
        activeCourses: activeCoursesProp
    } = dash;

    const activeCourses = activeCoursesProp || enrollments.filter(e => (e.completionPercentage || 0) < 100);

    const getGreeting = () => {
        const hr = new Date().getHours();
        if (hr < 12) return 'Good morning';
        if (hr < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const nowMs = Date.now();
    const deadlines = assignmentsList
        .filter(a => a.dueDate && new Date(a.dueDate).getTime() > nowMs)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map(a => ({
            id: a._id,
            title: a.title || 'Assignment Task',
            dueDate: new Date(a.dueDate)
        }));

    const enrolledIds = enrollments.map(e => e.courseRef?._id || e.courseRef);
    const recommendations = allCourses.filter(c => !enrolledIds.includes(c._id)).slice(0, 4);

    const scheduleItems = [
        ...deadlines.map(d => ({
            id: d.id,
            title: d.title,
            kind: 'Assignment',
            time: d.dueDate,
            icon: <ClipboardCheck size={16} className="text-red-500" aria-hidden="true" />,
            badge: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
        })),
        ...(liveSessions || []).map(l => ({
            id: l._id,
            title: l.title || 'Live Class',
            kind: 'Live Class',
            time: new Date(l.startTime),
            icon: <Video size={16} className="text-emerald-500" aria-hidden="true" />,
            badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }))
    ].sort((a, b) => a.time - b.time).slice(0, 6);

    const announcements = notifications.filter(n => n.type === 'announcement' || n.category === 'announcement');
    const alerts = notifications.filter(n => n.type !== 'announcement' && n.category !== 'announcement');
    const showFeed = notificationTab === 'announcements' ? announcements : alerts;
    const feedLabel = notificationTab === 'announcements' ? 'System Announcement' : 'Alert Log';

    const fmtDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const kpis = [
        { label: 'In Progress Courses', value: activeCourses.length, icon: <GraduationCap size={20} aria-hidden="true" />, chip: 'bg-blue-600/10 text-blue-600 dark:text-blue-400' },
        { label: 'Assignments Due', value: upcomingAssignmentsCount, icon: <ClipboardCheck size={20} aria-hidden="true" />, chip: 'bg-purple-600/10 text-purple-600 dark:text-purple-400' },
        { label: 'Quiz Average', value: `${quizAverage}%`, icon: <BarChart3 size={20} aria-hidden="true" />, chip: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400' },
        { label: 'XP Earned', value: xpPoints, icon: <Zap size={20} aria-hidden="true" />, chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
    ];

    const quickActions = [
        { label: 'Tasks', icon: <ClipboardCheck size={15} aria-hidden="true" />, onClick: () => setActiveTab('assignments') },
        { label: 'Tuition', icon: <CreditCard size={15} aria-hidden="true" />, onClick: () => setActiveTab('payments') },
        { label: 'Live', icon: <Video size={15} aria-hidden="true" />, onClick: () => setActiveTab('live') },
        { label: 'Rank', icon: <Trophy size={15} aria-hidden="true" />, onClick: () => setActiveTab('leaderboard') }
    ];

    const card = 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5';

    return (
        <div className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map(k => (
                    <div key={k.label} className={card}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{k.value}</div>
                                <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{k.label}</div>
                            </div>
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${k.chip}`}>{k.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content + actionable sidebar */}
            <div className="grid grid-cols-12 gap-6">
                {/* Main column */}
                <div className="col-span-12 space-y-6 lg:col-span-8">
                    {/* Welcome hero */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 text-white shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{getGreeting()}, {user?.fullName?.split(' ')[0]}!</h2>
                                <p className="mt-1 text-sm text-white/80">Level {currentLevel} Scholar · {completedCoursesCount} completed · {activeCourses.length} in progress</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">Lv {currentLevel}</span>
                                <span className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">{xpPoints} XP</span>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {quickActions.map(a => (
                                <button
                                    key={a.label}
                                    onClick={a.onClick}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                                    aria-label={a.label}
                                >
                                    {a.icon} {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active courses */}
                    <div className={card}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Courses</h3>
                            <button onClick={() => navigate('/courses')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                Browse All <ArrowRight size={14} aria-hidden="true" />
                            </button>
                        </div>
                        {activeCourses.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {activeCourses.slice(0, 4).map(enroll => {
                                    const c = enroll.courseRef || {};
                                    const cid = c._id;
                                    const pct = enroll.completionPercentage || 0;
                                    return (
                                        <div key={enroll._id || cid} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{c.technicalCategory || 'Course'}</span>
                                            <h4 className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{c.courseTitle}</h4>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.estimatedDurationHours || 0}h · {pct}% done</p>
                                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                                <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${pct}%` }} />
                                            </div>
                                            <button
                                                onClick={() => enroll.tuitionClearanceFlag ? navigate(`/student/learn/${cid}`) : setActiveTab('payments')}
                                                className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                                                    enroll.tuitionClearanceFlag
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                }`}
                                            >
                                                <PlayCircle size={14} aria-hidden="true" /> {enroll.tuitionClearanceFlag ? 'Resume' : 'Clear Tuition'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
                                <Lightbulb size={28} className="text-slate-400" aria-hidden="true" />
                                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">You're not learning anything yet</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Explore our catalog and enroll in your first course.</p>
                                <button onClick={() => navigate('/courses')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Explore Courses</button>
                            </div>
                        )}
                    </div>

                    {/* Course recommendations */}
                    <div className={card}>
                        <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Recommended For You</h3>
                        {recommendations.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {recommendations.map(course => (
                                    <div key={course._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                                        <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{course.technicalCategory || 'Development'}</span>
                                        <h4 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{course.courseTitle}</h4>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{course.level || 'Beginner'}</p>
                                        <button onClick={() => navigate(`/courses/${course._id}`)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-600 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-600/10 dark:text-blue-400">
                                            View Details <ArrowRight size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
                                <Lightbulb size={28} className="text-slate-400" aria-hidden="true" />
                                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No recommendations yet</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enrolling in courses helps us tailor suggestions for you.</p>
                                <button onClick={() => navigate('/courses')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Explore Courses</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actionable sidebar */}
                <div className="col-span-12 space-y-6 lg:col-span-4">
                    {/* Upcoming deadlines & schedule */}
                    <div className={card}>
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <CalendarDays size={16} className="text-blue-600 dark:text-blue-400" aria-hidden="true" /> Upcoming Deadlines &amp; Schedule
                        </h3>
                        {scheduleItems.length > 0 ? (
                            <div className="space-y-3">
                                {scheduleItems.map(item => (
                                    <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{item.icon}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">{item.title}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                <Clock size={11} className="mr-1 inline" aria-hidden="true" />{fmtDate(item.time)} · {fmtTime(item.time)}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${item.badge}`}>{item.kind}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
                                <p className="text-xs text-slate-500 dark:text-slate-400">No upcoming deadlines. You're all caught up!</p>
                            </div>
                        )}
                    </div>

                    {/* Announcements / bulletins */}
                    <div className={card}>
                        <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setNotificationTab('announcements')}
                                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold ${
                                    notificationTab === 'announcements'
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 dark:text-slate-400'
                                }`}
                                aria-label="Bulletins"
                            >
                                <Megaphone size={14} aria-hidden="true" /> Bulletins ({announcements.length})
                            </button>
                            <button
                                onClick={() => setNotificationTab('notifications')}
                                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold ${
                                    notificationTab === 'notifications'
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 dark:text-slate-400'
                                }`}
                                aria-label="Alerts"
                            >
                                <Bell size={14} aria-hidden="true" /> Alerts ({alerts.length})
                            </button>
                        </div>
                        <div className="max-h-80 space-y-3 overflow-y-auto">
                            {showFeed.length > 0 ? (
                                showFeed.map((item, idx) => (
                                    <div key={item._id || idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                                        <div className="flex items-start justify-between gap-2">
                                            <strong className="text-[13px] font-bold text-slate-900 dark:text-white">{item.title}</strong>
                                            {item._id && !item.isRead && (
                                                <button onClick={() => handleMarkNotificationAsRead(item._id)} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                    <CheckCircle2 size={12} aria-hidden="true" /> Read
                                                </button>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.message}</p>
                                        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">{feedLabel} · {new Date(item.createdAt || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">No {notificationTab === 'announcements' ? 'announcements' : 'alerts'} yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}