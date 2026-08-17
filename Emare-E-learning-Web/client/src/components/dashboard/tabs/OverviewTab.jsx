import React from 'react';
import {
    GraduationCap, ShieldCheck, ShieldAlert, ClipboardCheck, CreditCard,
    Video, Trophy, Award, MessagesSquare, Bot, BookOpen, TrendingUp,
    Pin, PinOff, CalendarDays, Megaphone, Bell, Lightbulb, BarChart3,
    CheckCircle2, XCircle, Star, Zap, Heart, Trash2
} from 'lucide-react';

export default function OverviewTab(dash) {
    const { user, colors, setActiveTab, enrollments, wishlist, grades, certificates, allCourses, notifications, liveSessions, assignmentsList, recentlyViewed, studyTargetHours, studyCompletedHours, notificationTab, setNotificationTab, leaderboard, hiddenWidgets, pinnedCourses, navigate, toggleWidgetVisibility, togglePinCourse, triggerAssistantPrompt, handleToggleWishlist, handleMarkNotificationAsRead, handleUpdateStudyTarget, completedCoursesCount, averageProgress, xpPoints, currentLevel, nextLevelXP, xpProgress, currentCourseTitle, currentLessonTitle, currentProgress, quizAverage, upcomingAssignmentsCount, badges, styles } = dash;
        // Dynamic Greeting
        const getGreeting = () => {
            const hr = new Date().getHours();
            if (hr < 12) return 'Good morning';
            if (hr < 18) return 'Good afternoon';
            return 'Good evening';
        };

        // Motivational Quote
        const motivationalQuote = "The beautiful thing about learning is that no one can take it away from you. — B.B. King";

        // Statistics computation
        const activeCourses = enrollments.filter(e => e.completionPercentage < 100);
        const primaryActive = activeCourses.length > 0 ? activeCourses[0] : enrollments[0];

        // Deadlines (real assignments with future due dates only)
        const nowMs = Date.now();
        const realDeadlines = assignmentsList
            .filter(a => a.dueDate && new Date(a.dueDate).getTime() > nowMs)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5)
            .map(a => ({
                id: a._id,
                title: a.title || 'Assignment Task',
                type: 'Assignment',
                dueDate: new Date(a.dueDate),
                priority: 'High',
                color: '#ef4444'
            }));

        const deadlines = realDeadlines;

        // Render Calendar Widget Days
        const renderCalendarDays = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const cells = [];

            for (let i = 0; i < firstDayIndex; i++) {
                cells.push(<div key={`empty-${i}`} style={styles.calendarEmptyCell} />);
            }

            const deadlineDays = deadlines
                .map(d => (new Date(d.dueDate).getMonth() === month && new Date(d.dueDate).getFullYear() === year) ? new Date(d.dueDate).getDate() : -1);
            const liveDays = liveSessions
                .map(l => (new Date(l.startTime).getMonth() === month && new Date(l.startTime).getFullYear() === year) ? new Date(l.startTime).getDate() : -1);

            for (let day = 1; day <= totalDays; day++) {
                const isToday = day === today.getDate();
                const hasDeadline = deadlineDays.includes(day);
                const hasLive = liveDays.includes(day);

                cells.push(
                    <div 
                        key={`day-${day}`} 
                        style={{
                            ...styles.calendarCell,
                            background: isToday ? `${colors.primary}20` : 'transparent',
                            border: isToday ? `1px solid ${colors.primary}` : `1px solid ${colors.border}20`,
                            fontWeight: isToday ? '700' : '500',
                            color: isToday ? colors.primary : colors.text
                        }}
                    >
                        <span>{day}</span>
                        <div style={{ display: 'flex', gap: '3px', position: 'absolute', bottom: '4px' }}>
                            {hasDeadline && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />}
                            {hasLive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: colors.success }} />}
                        </div>
                    </div>
                );
            }
            return cells;
        };

        const hasClearance = enrollments.some(e => e.tuitionClearanceFlag === true);
        const has100Grade = grades.some(g => (g.numericalScoreEarned || 0) >= 100);

        const allSystemBadges = [
            { name: 'Fast Learner', icon: <Star size={20} aria-hidden="true" />, desc: 'Completed a course track', color: colors.primary, unlocked: completedCoursesCount >= 1 },
            { name: 'Quiz Master', icon: <Trophy size={20} aria-hidden="true" />, desc: 'Scored 100% on an assessment', color: colors.success, unlocked: has100Grade },
            { name: '7-Day Streak', icon: <Zap size={20} aria-hidden="true" />, desc: 'Checked in 7 consecutive days', color: '#f59e0b', unlocked: false },
            { name: 'Code Warrior', icon: <BookOpen size={20} aria-hidden="true" />, desc: 'Submitted assignment tasks', color: colors.accent, unlocked: grades.length > 0 || assignmentsList.length > 0 },
            { name: 'Clearance Award', icon: <ShieldCheck size={20} aria-hidden="true" />, desc: 'Tuition completely cleared', color: '#ec4899', unlocked: hasClearance },
            { name: 'Super Scholar', icon: <GraduationCap size={20} aria-hidden="true" />, desc: 'Enrolled in multiple tracks', color: '#14b8a6', unlocked: enrollments.length >= 2 }
        ];

        const enrolledIds = enrollments.map(e => e.courseRef?._id || e.courseRef);
        const recommendations = allCourses.filter(c => !enrolledIds.includes(c._id)).slice(0, 3);

        const announcementsList = notifications.filter(n => n.type === 'announcement' || n.category === 'announcement');
        const standardNotifications = notifications.filter(n => n.type !== 'announcement' && n.category !== 'announcement');

        const finalAnnouncements = announcementsList;
        const finalNotifications = standardNotifications;
        const finalLiveClasses = liveSessions;

        // Circular progress SVG component
        const CircularProgress = ({ value, color, label, size = 80, strokeWidth = 6, icon }) => {
            const radius = (size - strokeWidth) / 2;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (Math.min(value, 100) / 100) * circumference;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative', width: size, height: size }}>
                        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size / 2} cy={size / 2} r={radius} stroke={`${color}15`} strokeWidth={strokeWidth} fill="transparent" />
                            <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {icon && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
                            <span style={{ fontSize: '13px', fontWeight: '800', color: colors.text }}>{value}%</span>
                        </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: colors.textMuted }}>{label}</span>
                </div>
            );
        };

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px', alignItems: 'start', maxWidth: '100%' }}>
                
                {/* LEFT MAIN PANEL COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Welcome Card & Hero Section */}
                    <div style={{ ...styles.welcomeCard, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', boxShadow: '0 6px 16px rgba(59,130,246,0.25)', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0, overflow: 'hidden' }}>
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    user?.fullName?.[0]?.toUpperCase() || 'S'
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: '240px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
                                            {getGreeting()}, {user?.fullName?.split(' ')[0]}!
                                        </h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ color: colors.primary, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', background: `${colors.primary}12`, border: `1px solid ${colors.primary}25`, padding: '4px 10px', borderRadius: '6px' }}>
                                                Level {currentLevel} Scholar
                                            </span>
                                            {/* Tuition Clearance Badge */}
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: hasClearance ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${hasClearance ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`, padding: '4px 10px', borderRadius: '6px' }}>
                                                {hasClearance
                                                    ? <ShieldCheck size={14} color={colors.success} aria-hidden="true" />
                                                    : <ShieldAlert size={14} color="#f59e0b" aria-hidden="true" />
                                                }
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: hasClearance ? colors.success : '#f59e0b' }}>
                                                    {hasClearance ? 'Tuition Cleared' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ background: `${colors.success}08`, border: `1px solid ${colors.success}20`, borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                        <GraduationCap size={18} color={colors.success} aria-hidden="true" />
                                        <div>
                                            <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: colors.success }}>{completedCoursesCount} Completed</span>
                                            <span style={{ display: 'block', fontSize: '10px', color: colors.textMuted }}>{activeCourses.length} in progress</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Action Shortcuts */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '2px' }}>
                            <button onClick={() => setActiveTab('assignments')} style={{ background: `${colors.primary}12`, border: `1px solid ${colors.primary}25`, color: colors.primary, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'transform 0.15s' }} aria-label="Submit Tasks">
                                <ClipboardCheck size={14} aria-hidden="true" /> Tasks
                            </button>
                            <button onClick={() => setActiveTab('payments')} style={{ background: `${colors.accent}12`, border: `1px solid ${colors.accent}25`, color: colors.accent, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'transform 0.15s' }} aria-label="Tuition Portal">
                                <CreditCard size={14} aria-hidden="true" /> Tuition
                            </button>
                            <button onClick={() => setActiveTab('live')} style={{ background: `${colors.success}12`, border: `1px solid ${colors.success}25`, color: colors.success, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'transform 0.15s' }} aria-label="Live Classes">
                                <Video size={14} aria-hidden="true" /> Live
                            </button>
                            <button onClick={() => setActiveTab('leaderboard')} style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'transform 0.15s' }} aria-label="Leaderboard">
                                <Trophy size={14} aria-hidden="true" /> Rank
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Personalization Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bgCard, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: colors.text }}>Show/Hide</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { key: 'stats', label: 'Stats', icon: <BarChart3 size={13} aria-hidden="true" /> },
                                { key: 'calendar', label: 'Calendar', icon: <CalendarDays size={13} aria-hidden="true" /> },
                                { key: 'badges', label: 'Badges', icon: <Award size={13} aria-hidden="true" /> },
                                { key: 'recs', label: 'Suggestions', icon: <Lightbulb size={13} aria-hidden="true" /> }
                            ].map(widget => {
                                const isHidden = hiddenWidgets[widget.key];
                                return (
                                    <button 
                                        key={widget.key} 
                                        onClick={() => toggleWidgetVisibility(widget.key)} 
                                        style={{ 
                                            padding: '5px 10px', 
                                            borderRadius: '18px', 
                                            fontSize: '10px', 
                                            fontWeight: '700', 
                                            cursor: 'pointer', 
                                            background: isHidden ? colors.bgInput : `${colors.primary}12`, 
                                            border: `1px solid ${isHidden ? colors.border : colors.primary}20`,
                                            color: isHidden ? colors.textMuted : colors.primary,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                        aria-label={`${isHidden ? 'Show' : 'Hide'} ${widget.label}`}
                                    >
                                        {widget.icon}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI Study Assistant */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '14px', borderLeft: `3px solid ${colors.accent}` }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.text, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bot size={15} color={colors.accent} aria-hidden="true" />
                            AI Coach
                        </h3>
                        <p style={{ color: colors.textMuted, fontSize: '10px', margin: '0 0 8px' }}>Learn smarter</p>
                        <button onClick={() => triggerAssistantPrompt('What should I work on next?')} style={{ ...styles.aiActionBtn, marginTop: '8px', padding: '5px 12px', fontSize: '11px' }}>
                            Chat
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                            <div style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px' }}>
                                <span style={{ fontSize: '9px', color: colors.textMuted, fontWeight: '600' }}>Course</span>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: colors.text, marginTop: '2px' }}>{currentCourseTitle.substring(0, 20)}...</div>
                            </div>
                            <div style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px' }}>
                                <span style={{ fontSize: '9px', color: colors.textMuted, fontWeight: '600' }}>Progress</span>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: colors.primary, marginTop: '2px' }}>{currentProgress}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Course Milestones & Progress Rings */}
                    {!hiddenWidgets['stats'] && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                                <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Course Milestones</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <CircularProgress value={enrollments.length ? Math.round((completedCoursesCount / enrollments.length) * 100) : 0} color={colors.primary} label="Completed Tracks" icon={<GraduationCap size={12} aria-hidden="true" />} />
                                    <CircularProgress value={averageProgress} color={averageProgress > 0 ? colors.success : colors.textMuted} label={averageProgress > 0 ? "Avg Progress" : "Ready to Start"} icon={<TrendingUp size={12} aria-hidden="true" />} />
                                    <CircularProgress value={Math.round((certificates.length / Math.max(enrollments.length, 1)) * 100)} color={colors.accent} label="Credentials Earned" icon={<Award size={12} aria-hidden="true" />} />
                                </div>
                            </div>

                            <div style={{ ...styles.panelCard, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(${colors.accent} ${xpProgress}%, ${colors.bgInput} 0)` }}>
                                    <div style={{ width: '84px', height: '84px', background: colors.bgCard, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '800', color: colors.text }}>Lv {currentLevel}</span>
                                    </div>
                                </div>
                                <span style={{ color: colors.text, fontWeight: '700', fontSize: '14px', marginTop: '12px' }}>{xpPoints} XP Earned</span>
                                <span style={{ color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>{nextLevelXP - xpPoints} XP to Level {currentLevel + 1}</span>
                            </div>
                        </div>
                    )}

                    {/* Pinned Courses Component */}
                    {pinnedCourses.length > 0 && (
                        <div style={{ ...styles.panelCard, margin: 0, padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pin size={18} color={colors.primary} aria-hidden="true" />
                                Pinned Favorite Courses
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                {enrollments.filter(e => pinnedCourses.includes(e.courseRef?._id || e.courseRef)).map(enroll => {
                                    const c = enroll.courseRef || {};
                                    return (
                                        <div key={c._id} style={{ padding: '16px', background: colors.bgInput, borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ flex: 1, marginRight: '10px' }}>
                                                <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '0 0 4px' }}>{c.courseTitle}</h4>
                                                <span style={{ color: colors.textMuted, fontSize: '11px' }}>{enroll.completionPercentage || 0}% Done</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => togglePinCourse(c._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Unpin course">
                                                <PinOff size={16} color={colors.textMuted} aria-hidden="true" />
                                            </button>
                                                <button onClick={() => navigate(`/student/learn/${c._id}`)} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Learn</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Resume Coursework (Resume / Active Course) */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '14px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '14px', fontWeight: '800', marginBottom: '10px' }}>Now Learning</h3>
                        {primaryActive ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div>
                                    <span style={{ background: `${colors.primary}15`, color: colors.primary, padding: '3px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: '700' }}>{primaryActive.courseRef?.technicalCategory || 'Dev'}</span>
                                    <h4 style={{ color: colors.text, fontSize: '13px', fontWeight: '800', margin: '4px 0 2px' }}>{primaryActive.courseRef?.courseTitle?.substring(0, 35)}</h4>
                                    <p style={{ color: colors.textMuted, fontSize: '10px', margin: 0 }}>{primaryActive.courseRef?.estimatedDurationHours || 0}h · {primaryActive.completionPercentage || 0}% done</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <div style={{ width: '60px', background: colors.bgInput, height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${primaryActive.completionPercentage || 0}%`, background: colors.primary, height: '100%' }} />
                                    </div>
                                    {primaryActive.tuitionClearanceFlag ? (
                                        <button onClick={() => navigate(`/student/learn/${primaryActive.courseRef?._id}`)} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: '5px', padding: '4px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                            Resume
                                        </button>
                                    ) : (
                                        <button onClick={() => setActiveTab('payments')} style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '5px', padding: '4px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                            Clear Tuition
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '12px 8px', background: `${colors.bgInput}40`, borderRadius: '8px' }}>
                                <p style={{ color: colors.textMuted, fontSize: '10px', margin: 0 }}>No active courses</p>
                                <button onClick={() => navigate('/courses')} style={{ background: 'transparent', border: 'none', color: colors.primary, fontSize: '9px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>Browse Courses</button>
                            </div>
                        )}
                    </div>

                    {/* Learning Statistics */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '14px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '14px', fontWeight: '800', marginBottom: '10px' }}>Study Stats</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ background: `${colors.primary}08`, border: `1px solid ${colors.primary}20`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: colors.primary }}>{activeCourses.length}</div>
                                <div style={{ fontSize: '9px', color: colors.textMuted, marginTop: '2px' }}>In Progress</div>
                            </div>
                            <div style={{ background: `${colors.accent}08`, border: `1px solid ${colors.accent}20`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: colors.accent }}>{assignmentsList.length}</div>
                                <div style={{ fontSize: '9px', color: colors.textMuted, marginTop: '2px' }}>Assignments</div>
                            </div>
                            <div style={{ background: `${colors.success}08`, border: `1px solid ${colors.success}20`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: colors.success }}>{quizAverage}%</div>
                                <div style={{ fontSize: '9px', color: colors.textMuted, marginTop: '2px' }}>Quiz Avg</div>
                            </div>
                            <div style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: colors.text }}>{certificates.length}</div>
                                <div style={{ fontSize: '9px', color: colors.textMuted, marginTop: '2px' }}>Certificates</div>
                            </div>
                        </div>
                    </div>

                    {/* Badges Gallery */}
                    {!hiddenWidgets['badges'] && (
                        <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Earned Badges & Achievements</h3>
                            <div style={styles.badgesContainer}>
                                {allSystemBadges.map((badge, idx) => (
                                    <div 
                                        key={badge.name + idx} 
                                        style={{
                                            ...styles.badgeCard,
                                            background: badge.unlocked ? `${badge.color}08` : 'transparent',
                                            borderColor: badge.unlocked ? `${badge.color}40` : `${colors.border}40`,
                                            filter: badge.unlocked ? 'none' : 'grayscale(100%) opacity(50%)'
                                        }}
                                        title={badge.desc}
                                        aria-label={`${badge.name}: ${badge.desc}${badge.unlocked ? ' (Unlocked)' : ' (Locked)'}`}
                                    >
                                        <div style={{ ...styles.badgeIcon, color: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge.icon}</div>
                                        <span style={styles.badgeName}>{badge.name}</span>
                                        <span style={styles.badgeDesc}>{badge.desc}</span>
                                        {badge.unlocked ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '10px', color: colors.success, fontWeight: '800' }}>
                                                <CheckCircle2 size={12} aria-hidden="true" /> UNLOCKED
                                            </span>
                                        ) : (
                                            <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '10px', color: colors.textMuted, fontWeight: '700' }}>LOCKED</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {!hiddenWidgets['recs'] && (
                        <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Recommended For You</h3>
                            {recommendations.length > 0 ? (
                                <div style={styles.recommendGrid}>
                                    {recommendations.map((course) => {
                                        const isSaved = wishlist.some(w => (w.courseRef?._id || w.courseRef || w._id) === course._id);
                                        return (
                                            <div key={course._id} style={styles.recommendCard}>
                                                <div>
                                                    <span style={styles.courseBadge}>{course.technicalCategory || 'Development'}</span>
                                                    <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '8px 0 4px', lineHeight: '1.4' }}>{course.courseTitle}</h4>
                                                    <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 12px' }}>Rating: <Star size={12} style={{ verticalAlign: 'middle', marginRight: '2px' }} aria-hidden="true" />{course.averageRating || '4.8'} | {course.level || 'Beginner'}</p>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px' }}>
                                                    <button onClick={() => handleToggleWishlist(course._id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: isSaved ? '#ef4444' : colors.textMuted, borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Wishlist" aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}>
                                                        {isSaved ? <Heart size={16} fill="#ef4444" color="#ef4444" aria-hidden="true" /> : <Heart size={16} color={colors.textMuted} aria-hidden="true" />}
                                                    </button>
                                                    <button onClick={() => navigate(`/courses/${course._id}`)} style={{ ...styles.resumeBtn, padding: '6px 12px', fontSize: '11px', flex: 1 }}>
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px', background: `${colors.bgInput}40`, borderRadius: '16px', border: `1px dashed ${colors.border}` }}>
                                    <Lightbulb size={32} color={colors.textMuted} style={{ marginBottom: '8px' }} aria-hidden="true" />
                                    <h5 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '0 0 4px' }}>Personalized Suggestions</h5>
                                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 12px' }}>Enrolling in your first course helps us recommend the perfect next steps for you.</p>
                                    <button onClick={() => navigate('/courses')} style={{ ...styles.resumeBtn, padding: '8px 16px', fontSize: '12px' }}>Explore Catalog</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recently Viewed Courses */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Recently Viewed Courses</h3>
                        {recentlyViewed.length > 0 ? (
                            <div style={styles.recommendGrid}>
                                {recentlyViewed.slice(0, 3).map((course) => (
                                    <div key={course._id + '_viewed'} style={styles.recommendCard}>
                                        <div>
                                            <span style={{ ...styles.courseBadge, background: `${colors.accent}15`, color: colors.accent }}>{course.technicalCategory || 'Track'}</span>
                                            <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '8px 0 4px' }}>{course.courseTitle}</h4>
                                        </div>
                                        <div style={{ marginTop: '12px' }}>
                                            <button onClick={() => navigate(`/courses/${course._id}`)} style={{ ...styles.resumeBtn, width: '100%', padding: '6px 12px', fontSize: '11px', background: 'transparent', border: `1px solid ${colors.primary}`, color: colors.primary }}>
                                                Open Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: `${colors.bgInput}40`, borderRadius: '16px', border: `1px dashed ${colors.border}` }}>
                                <BookOpen size={32} color={colors.textMuted} aria-hidden="true" />
                                <div style={{ flex: 1 }}>
                                    <h5 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '0 0 4px' }}>Explore Top Learning Paths</h5>
                                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 10px', lineHeight: 1.4 }}>Discover our top tracks like Web Coding, UI/UX Design, or AI Development.</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {['Web Coding', 'UI/UX Design', 'AI Dev'].map(tag => (
                                            <button key={tag} onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)} style={{ background: `${colors.primary}10`, border: `1px solid ${colors.primary}30`, color: colors.primary, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>#{tag}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR PANEL COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Learning Calendar Widget */}
                    {!hiddenWidgets['calendar'] && (
                        <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Learning Calendar</h3>
                            {renderCalendarDays && (
                                <div style={styles.calendarContainer}>
                                    <div style={styles.calendarHeader}>
                                        <span style={styles.calendarMonthYear}>
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()]} {new Date().getFullYear()}
                                        </span>
                                    </div>
                                    <div style={styles.calendarWeekdays}>
                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                            <div key={day} style={styles.calendarWeekday}>{day}</div>
                                        ))}
                                    </div>
                                    <div style={styles.calendarGrid}>
                                        {renderCalendarDays()}
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px', justifyContent: 'center', fontSize: '11px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                                            <span style={{ color: colors.textMuted }}>Deadlines</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.success }} />
                                            <span style={{ color: colors.textMuted }}>Live Classes</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upcoming Deliverables */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Upcoming Deliverables</h3>
                        <div style={styles.deadlineList}>
                            {deadlines.length > 0 ? (
                                deadlines.map(item => (
                                    <div key={item.id} style={styles.deadlineItem}>
                                        <div>
                                            <h4 style={{ color: colors.text, fontSize: '13px', fontWeight: '700', margin: 0 }}>{item.title}</h4>
                                            <span style={{ color: colors.textMuted, fontSize: '11px' }}>{item.type} | Due {new Date(item.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                        </div>
                                        <span style={{ ...styles.priorityBadge, background: `${item.color}15`, color: item.color }}>
                                            {item.priority}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px 12px', border: `1px dashed ${colors.border}`, borderRadius: '10px' }}>
                                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>No upcoming deadlines. You're all caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Classes */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Live Class Schedules</h3>
                        <div style={styles.liveGrid}>
                            {finalLiveClasses.length > 0 ? (
                                finalLiveClasses.map((session, idx) => (
                                    <div key={session._id || idx} style={styles.liveCard}>
                                        <div>
                                            <h4 style={{ color: colors.text, fontSize: '13px', fontWeight: '700', margin: 0 }}>{session.title}</h4>
                                            <span style={{ color: colors.textMuted, fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                                {new Date(session.startTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} | {new Date(session.startTime).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <button onClick={() => navigate('/live-sessions')} style={styles.liveBtn}>
                                            Join
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px 12px', border: `1px dashed ${colors.border}`, borderRadius: '10px' }}>
                                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>No live classes scheduled yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bulletins & Alerts switcher */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <div style={styles.tabSwitch}>
                            <button 
                                onClick={() => setNotificationTab('announcements')} 
                                style={{
                                    ...styles.tabSwitchBtn,
                                    color: notificationTab === 'announcements' ? colors.primary : colors.textMuted,
                                    borderBottom: notificationTab === 'announcements' ? `2px solid ${colors.primary}` : 'none',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                                aria-label="Bulletins"
                            >
                                <Megaphone size={15} aria-hidden="true" /> Bulletins ({finalAnnouncements.length})
                            </button>
                            <button 
                                onClick={() => setNotificationTab('notifications')} 
                                style={{
                                    ...styles.tabSwitchBtn,
                                    color: notificationTab === 'notifications' ? colors.primary : colors.textMuted,
                                    borderBottom: notificationTab === 'notifications' ? `2px solid ${colors.primary}` : 'none',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                                aria-label="Alerts"
                            >
                                <Bell size={15} aria-hidden="true" /> Alerts ({finalNotifications.length})
                            </button>
                        </div>
                        
                        <div style={styles.feedList}>
                            {notificationTab === 'announcements' ? (
                                finalAnnouncements.length > 0 ? (
                                    finalAnnouncements.map((ann, idx) => (
                                        <div key={ann._id || idx} style={styles.feedItem}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <strong style={{ color: colors.text }}>{ann.title}</strong>
                                                {ann._id && !ann.isRead && (
                                                    <button onClick={() => handleMarkNotificationAsRead(ann._id)} style={{ background: 'none', border: 'none', color: colors.primary, fontSize: '10px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle2 size={12} aria-hidden="true" />
                                                        Read
                                                    </button>
                                                )}
                                            </div>
                                            <p style={{ color: colors.textMuted, margin: '4px 0 0', fontSize: '12px', lineHeight: '1.4' }}>{ann.message}</p>
                                            <div style={styles.feedItemMeta}>
                                                <span>System Announcement</span>
                                                <span>{new Date(ann.createdAt || Date.now()).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                                        <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>No announcements yet.</p>
                                    </div>
                                )
                            ) : (
                                finalNotifications.length > 0 ? (
                                    finalNotifications.map((notif, idx) => (
                                        <div key={notif._id || idx} style={styles.feedItem}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <strong style={{ color: colors.text }}>{notif.title}</strong>
                                                {notif._id && !notif.isRead && (
                                                    <button onClick={() => handleMarkNotificationAsRead(notif._id)} style={{ background: 'none', border: 'none', color: colors.primary, fontSize: '10px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle2 size={12} aria-hidden="true" />
                                                        Read
                                                    </button>
                                                )}
                                            </div>
                                            <p style={{ color: colors.textMuted, margin: '4px 0 0', fontSize: '12px', lineHeight: '1.4' }}>{notif.message}</p>
                                            <div style={styles.feedItemMeta}>
                                                <span>Alert Log</span>
                                                <span>{new Date(notif.createdAt || Date.now()).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                                        <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>No alerts yet.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Earned Certificates */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Earned Certificates</h3>
                        {certificates.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {certificates.slice(0, 2).map((cert, idx) => (
                                    <div key={cert._id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                        <div>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: colors.text, display: 'block' }}>{cert.courseRef?.courseTitle}</span>
                                            <span style={{ fontSize: '11px', color: colors.textMuted }}>ID: {cert.certificateNumber}</span>
                                        </div>
                                        <button onClick={() => window.open(cert.certificatePdfUrl, '_blank')} style={{ ...styles.liveBtn, background: colors.success }}>
                                            PDF
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => setActiveTab('certificates')} style={{ background: 'transparent', border: 'none', color: colors.primary, fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'center', marginTop: '6px' }}>
                                    View All Certificates ({certificates.length})
                                </button>
                            </div>
                        ) : (
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No credentials earned yet. Pass quizzes above 60% average to qualify.</p>
                        )}
                    </div>

                    {/* Saved in Wishlist */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Saved in Wishlist</h3>
                        {wishlist.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {wishlist.slice(0, 3).map((w, idx) => {
                                    const c = w.courseRef || w;
                                    return (
                                        <div key={(c._id || idx) + '_wish'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                            <div style={{ flex: 1, marginRight: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: colors.text, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseTitle}</span>
                                                <span style={{ fontSize: '11px', color: colors.textMuted }}>{c.price === 0 ? 'Free' : `${c.price} Birr`}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => handleToggleWishlist(c._id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Remove from Wishlist" aria-label="Remove from wishlist">
                                                <Trash2 size={14} aria-hidden="true" />
                                            </button>
                                                <button onClick={() => navigate(`/courses/${c._id}`)} style={{ ...styles.liveBtn, background: colors.primary }}>
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={() => setActiveTab('wishlist')} style={{ background: 'transparent', border: 'none', color: colors.primary, fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'center', marginTop: '6px' }}>
                                    Manage Wishlist ({wishlist.length})
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '12px', border: `1px dashed ${colors.border}`, borderRadius: '10px' }}>
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 8px' }}>Your wishlist is empty</p>
                                <button onClick={() => navigate('/courses')} style={{ background: 'none', border: 'none', color: colors.primary, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Explore Courses</button>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        );
}
