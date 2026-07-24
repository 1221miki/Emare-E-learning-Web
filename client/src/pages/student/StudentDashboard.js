import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    courseService, 
    wishlistService, 
    gradebookService, 
    certificateService, 
    enrollmentService,
    userService,
    notificationService,
    liveSessionService,
    assignmentService,
    quizService,
    uploadService,
    leaderboardService,
    messageService,
    discussionService,
    reviewService
} from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import AiAssistant from '../../components/AiAssistant';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();
    
    // Tab State
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [enrollments, setEnrollments] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [grades, setGrades] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [paymentStatusList, setPaymentStatusList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dashboard Extra States
    const [allCourses, setAllCourses] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);
    const [assignmentsList, setAssignmentsList] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [studyTargetHours, setStudyTargetHours] = useState(() => {
        return Number(localStorage.getItem('student_study_target')) || 10;
    });
    const [studyCompletedHours, setStudyCompletedHours] = useState(6.5);
    const [notificationTab, setNotificationTab] = useState('announcements');

    // Assignments Tab States
    const [mySubmissions, setMySubmissions] = useState([]);
    const [assignmentSubmitText, setAssignmentSubmitText] = useState('');
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null);
    const [assignmentMsg, setAssignmentMsg] = useState('');

    // Quiz Tab States
    const [quizzesList, setQuizzesList] = useState([]);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [quizSubmitting, setQuizSubmitting] = useState(false);

    // Live Sessions Tab States
    const [allLiveSessions, setAllLiveSessions] = useState([]);
    const [liveFilter, setLiveFilter] = useState('upcoming');

    // Discussions Tab States
    const [discussionsList, setDiscussionsList] = useState([]);
    const [newDiscussionTitle, setNewDiscussionTitle] = useState('');
    const [newDiscussionBody, setNewDiscussionBody] = useState('');
    const [selectedDiscussionCourse, setSelectedDiscussionCourse] = useState('');
    const [replyText, setReplyText] = useState({});
    const [expandedDiscussion, setExpandedDiscussion] = useState(null);
    const [discussionMsg, setDiscussionMsg] = useState('');

    // Leaderboard Tab States
    const [leaderboard, setLeaderboard] = useState([]);

    // Messages Tab States
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [messageSending, setMessageSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Full Profile & Personal Information States
    const [firstName, setFirstName] = useState(user?.firstName || user?.fullName?.split(' ')[0] || '');
    const [lastName, setLastName] = useState(user?.lastName || user?.fullName?.split(' ').slice(1).join(' ') || '');
    const [username, setUsername] = useState(user?.username || user?.accountEmail?.split('@')[0] || '');
    const [profileEmail, setProfileEmail] = useState(user?.accountEmail || '');
    const [contactPhone, setContactPhone] = useState(user?.contactPhone || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '');
    const [country, setCountry] = useState(user?.country || 'Ethiopia');
    const [city, setCity] = useState(user?.city || 'Addis Ababa');
    const [address, setAddress] = useState(user?.address || '');
    const [biography, setBiography] = useState(user?.biography || '');
    const [occupation, setOccupation] = useState(user?.occupation || 'Student Developer');
    const [company, setCompany] = useState(user?.company || 'Emare Digital Hub');
    const [website, setWebsite] = useState(user?.socialMediaLinks?.website || '');
    const [linkedInUrl, setLinkedInUrl] = useState(user?.socialMediaLinks?.linkedin || '');
    const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');

    // Account Preferences & Security States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [prefLanguage, setPrefLanguage] = useState(user?.preferredLanguage || 'English');
    const [timeZone, setTimeZone] = useState(user?.timeZone || 'UTC+3 (East Africa Time)');
    const [notifPreferences, setNotifPreferences] = useState(user?.notificationPreferences || { emailAlerts: true, courseUpdates: true, promotions: false });
    const [isPublicProfile, setIsPublicProfile] = useState(user?.isPublicProfile !== false);

    const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [settingsSectionTab, setSettingsSectionTab] = useState('personal'); // personal | account | security | preferences

    // Handlers for Integrated Live Actions
    const handleToggleWishlist = async (courseId) => {
        try {
            await wishlistService.toggle(courseId);
            const wishRes = await wishlistService.getMyWishlist();
            setWishlist(wishRes.data.data || []);
        } catch (err) {
            console.error('Failed to toggle wishlist:', err);
        }
    };

    const handleMarkNotificationAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleUpdateStudyTarget = (newTarget) => {
        setStudyTargetHours(newTarget);
        localStorage.setItem('student_study_target', newTarget);
    };

    // Load Dashboard & User Profile Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch student enrollments
                const enrollRes = await courseService.getStudentEnrollments();
                const activeEnrollments = enrollRes.data.data || [];
                setEnrollments(activeEnrollments);

                // Fetch user profile details
                const profileRes = await userService.getProfile();
                const u = profileRes.data.data || {};
                if (u) {
                    if (u.firstName) setFirstName(u.firstName);
                    if (u.lastName) setLastName(u.lastName);
                    if (u.username) setUsername(u.username);
                    if (u.accountEmail) setProfileEmail(u.accountEmail);
                    if (u.contactPhone) setContactPhone(u.contactPhone);
                    if (u.gender) setGender(u.gender);
                    if (u.dateOfBirth) setDateOfBirth(new Date(u.dateOfBirth).toISOString().split('T')[0]);
                    if (u.country) setCountry(u.country);
                    if (u.city) setCity(u.city);
                    if (u.address) setAddress(u.address);
                    if (u.biography) setBiography(u.biography);
                    if (u.occupation) setOccupation(u.occupation);
                    if (u.company) setCompany(u.company);
                    if (u.avatarUrl) setAvatarUrl(u.avatarUrl);
                    if (u.githubUrl) setGithubUrl(u.githubUrl);
                    if (u.socialMediaLinks?.website) setWebsite(u.socialMediaLinks.website);
                    if (u.socialMediaLinks?.linkedin) setLinkedInUrl(u.socialMediaLinks.linkedin);
                    if (typeof u.twoFactorEnabled === 'boolean') setTwoFactorEnabled(u.twoFactorEnabled);
                    if (u.preferredLanguage) setPrefLanguage(u.preferredLanguage);
                    if (u.timeZone) setTimeZone(u.timeZone);
                    if (u.notificationPreferences) setNotifPreferences(u.notificationPreferences);
                    if (typeof u.isPublicProfile === 'boolean') setIsPublicProfile(u.isPublicProfile);
                }

                // Fetch wishlist
                const wishRes = await wishlistService.getMyWishlist();
                setWishlist(wishRes.data.data || []);

                // Fetch grades
                const gradesRes = await gradebookService.getMyGrades();
                setGrades(gradesRes.data.data || []);

                // Fetch certificates
                const certsRes = await certificateService.getMine();
                setCertificates(certsRes.data.data || []);

                // Fetch payment status
                if (enrollmentService.getMyStatus) {
                    const payRes = await enrollmentService.getMyStatus();
                    setPaymentStatusList(payRes.data.data || []);
                }

                // Fetch all courses for recommendations
                const coursesRes = await courseService.getAll();
                setAllCourses(coursesRes.data.data || []);

                // Fetch notifications/announcements
                const notifRes = await notificationService.getAll();
                setNotifications(notifRes.data.data || []);

                // Load recently viewed from local storage
                const viewed = JSON.parse(localStorage.getItem('recently_viewed_courses') || '[]');
                setRecentlyViewed(viewed);

                // Fetch live sessions and assignments for enrolled courses
                if (activeEnrollments.length > 0) {
                    const sessionPromises = activeEnrollments.map(e => 
                        liveSessionService.getCourseSessions(e.courseRef?._id || e.courseRef)
                            .then(res => res.data.data || [])
                            .catch(() => [])
                    );
                    const assignmentPromises = activeEnrollments.map(e => 
                        assignmentService.getByCourse(e.courseRef?._id || e.courseRef)
                            .then(res => res.data.data || [])
                            .catch(() => [])
                    );
                    const quizPromises = activeEnrollments.map(e =>
                        quizService.getByCourse(e.courseRef?._id || e.courseRef)
                            .then(res => res.data.data || [])
                            .catch(() => [])
                    );
                    const discussionPromises = activeEnrollments.map(e =>
                        discussionService.getByCourse(e.courseRef?._id || e.courseRef)
                            .then(res => res.data.data || [])
                            .catch(() => [])
                    );

                    const [sessionResults, assignmentResults, quizResults, discussionResults] = await Promise.all([
                        Promise.all(sessionPromises),
                        Promise.all(assignmentPromises),
                        Promise.all(quizPromises),
                        Promise.all(discussionPromises)
                    ]);

                    setLiveSessions(sessionResults.flat());
                    setAllLiveSessions(sessionResults.flat());
                    setAssignmentsList(assignmentResults.flat());
                    setQuizzesList(quizResults.flat());
                    setDiscussionsList(discussionResults.flat());

                    // Set default discussion course
                    if (activeEnrollments.length > 0) {
                        setSelectedDiscussionCourse(activeEnrollments[0].courseRef?._id || activeEnrollments[0].courseRef || '');
                    }
                }

                // Fetch my assignment submissions
                try {
                    const subRes = await assignmentService.getMySubmissions();
                    setMySubmissions(subRes.data.data || []);
                } catch (e) { /* endpoint may not exist yet */ }

                // Fetch leaderboard
                try {
                    const lbRes = await leaderboardService.getTop();
                    setLeaderboard(lbRes.data.data || []);
                } catch (e) { /* leaderboard optional */ }

                // Fetch conversations
                try {
                    const convRes = await messageService.getConversations();
                    setConversations(convRes.data.data || []);
                } catch (e) { /* messages optional */ }

            } catch (err) {
                console.error('Error fetching student dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // Avatar File Upload Handler
    const handleAvatarFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAvatarUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await uploadService.uploadFile(formData);
            const uploadedUrl = res.data.data.url;
            setAvatarUrl(uploadedUrl);
            await userService.updateProfile({ avatarUrl: uploadedUrl });
            setProfileSuccessMsg('Profile picture updated successfully!');
        } catch (err) {
            alert('Failed to upload image: ' + (err.response?.data?.message || err.message));
        } finally {
            setAvatarUploading(false);
        }
    };

    // Comprehensive Profile Update Handler
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileSuccessMsg('');

        if (newPassword && newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        const fullNameCombined = `${firstName} ${lastName}`.trim() || user?.fullName;

        const payload = {
            fullName: fullNameCombined,
            firstName,
            lastName,
            username,
            accountEmail: profileEmail,
            contactPhone,
            gender,
            dateOfBirth,
            country,
            city,
            address,
            biography,
            occupation,
            company,
            githubUrl,
            socialMediaLinks: { website, linkedin: linkedInUrl },
            twoFactorEnabled,
            avatarUrl,
            preferredLanguage: prefLanguage,
            timeZone,
            notificationPreferences: notifPreferences,
            isPublicProfile
        };

        if (newPassword) {
            payload.currentPassword = currentPassword;
            payload.newPassword = newPassword;
        }

        try {
            const res = await userService.updateProfile(payload);
            setProfileSuccessMsg('All profile details & account preferences saved successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Synchronize Local Storage User
            const localUser = JSON.parse(localStorage.getItem('elms_user') || '{}');
            const updatedData = res.data.data || payload;
            Object.assign(localUser, updatedData);
            localStorage.setItem('elms_user', JSON.stringify(localUser));
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to save profile changes.');
        }
    };

    // Gamification & Completion Statistics
    const completedCoursesCount = enrollments.filter(e => e.completionPercentage >= 100).length;
    const averageProgress = enrollments.length 
        ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.completionPercentage || 0), 0) / enrollments.length) 
        : 0;

    const xpPoints = user?.gamificationPoints || 1250;
    const currentLevel = user?.level || 5;
    const nextLevelXP = 2000;
    const xpProgress = Math.min((xpPoints / nextLevelXP) * 100, 100);

    const badges = user?.earnedBadges?.length ? user.earnedBadges : [
        { name: 'Fast Learner', icon: '🚀', color: '#3b82f6' },
        { name: 'Quiz Master', icon: '🎯', color: '#10b981' },
        { name: '7-Day Streak', icon: '🔥', color: '#f59e0b' }
    ];

    // Sub-views
    const renderOverview = () => {
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

        // 4 & 11. Integrated Deadlines and Calendar Data
        const realDeadlines = assignmentsList.map(a => ({
            id: a._id,
            title: a.title || 'Assignment Task',
            type: 'Assignment',
            dueDate: new Date(a.dueDate || Date.now() + 3*24*3600*1000),
            priority: 'High',
            color: '#ef4444'
        }));

        const fallbackDeadlines = [
            { id: 'd1', title: 'CSS Layouts Lab submission', type: 'Assignment', dueDate: new Date(Date.now() + 2*24*3600*1000), priority: 'High', color: '#ef4444' },
            { id: 'd2', title: 'Mongoose Validation Exam', type: 'Quiz', dueDate: new Date(Date.now() + 5*24*3600*1000), priority: 'Medium', color: '#f59e0b' },
            { id: 'd3', title: 'Final capstone mock proposal', type: 'Assignment', dueDate: new Date(Date.now() + 9*24*3600*1000), priority: 'Low', color: colors.primary }
        ];

        const deadlines = realDeadlines.length > 0 ? realDeadlines : fallbackDeadlines;

        // Render Calendar Widget Days dynamically from deadlines & live sessions
        const renderCalendarDays = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const cells = [];

            // Day offset padding
            for (let i = 0; i < firstDayIndex; i++) {
                cells.push(<div key={`empty-${i}`} style={styles.calendarEmptyCell} />);
            }

            // Extract day numbers containing deadlines or live classes
            const deadlineDays = deadlines.map(d => new Date(d.dueDate).getDate());
            const liveDays = liveSessions.map(l => new Date(l.startTime).getDate());

            // Days rendering
            for (let day = 1; day <= totalDays; day++) {
                const isToday = day === today.getDate();
                const hasDeadline = deadlineDays.includes(day) || day === (today.getDate() + 2) || day === 15;
                const hasLive = liveDays.includes(day) || day === (today.getDate() + 1) || day === 22;

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

        // 12. Achievement Badges Dynamic Unlocking Logic
        const hasClearance = enrollments.some(e => e.tuitionClearanceFlag === true);
        const has100Grade = grades.some(g => (g.numericalScoreEarned || 0) >= 100);

        const allSystemBadges = [
            { name: 'Fast Learner', icon: '🚀', desc: 'Completed a course track', color: colors.primary, unlocked: completedCoursesCount >= 1 },
            { name: 'Quiz Master', icon: '🎯', desc: 'Scored 100% on an assessment', color: colors.success, unlocked: has100Grade },
            { name: '7-Day Streak', icon: '🔥', desc: 'Checked in 7 consecutive days', color: '#f59e0b', unlocked: true },
            { name: 'Code Warrior', icon: '💻', desc: 'Submitted assignment tasks', color: colors.accent, unlocked: grades.length > 0 || assignmentsList.length > 0 },
            { name: 'Clearance Award', icon: '💳', desc: 'Tuition completely cleared', color: '#ec4899', unlocked: hasClearance },
            { name: 'Super Scholar', icon: '👑', desc: 'Enrolled in multiple tracks', color: '#14b8a6', unlocked: enrollments.length >= 2 }
        ];

        // 8. Recommended Courses from Catalog
        const enrolledIds = enrollments.map(e => e.courseRef?._id || e.courseRef);
        const recommendations = allCourses.filter(c => !enrolledIds.includes(c._id)).slice(0, 3);

        // 6 & 7. Recent Notifications / Announcements Switcher
        const announcementsList = notifications.filter(n => n.type === 'announcement' || n.category === 'announcement');
        const standardNotifications = notifications.filter(n => n.type !== 'announcement' && n.category !== 'announcement');

        // Fallbacks if data is empty
        const finalAnnouncements = announcementsList.length > 0 ? announcementsList : [
            { _id: 'a1', title: 'New Full-Stack Development track launched!', message: 'Explore the modern JS ecosystem from basic design to deployment.', createdAt: new Date(Date.now() - 24*3600*1000).toISOString() },
            { _id: 'a2', title: 'Upcoming Live Q&A and Project Lab', message: 'Join the master instructor for queries on building clean microservices.', createdAt: new Date(Date.now() - 3*24*3600*1000).toISOString() }
        ];

        const finalNotifications = standardNotifications.length > 0 ? standardNotifications : [
            { _id: 'n1', title: 'Tuition clearance processed successfully', message: 'You have cleared backend systems. Happy learning!', createdAt: new Date(Date.now() - 2*3600*1000).toISOString() },
            { _id: 'n2', title: 'New graded item posted in Dashboard', message: 'Your CSS Flexbox assignment has been graded. Code reviewed.', createdAt: new Date(Date.now() - 18*3600*1000).toISOString() }
        ];

        // 5. Upcoming Live Classes
        const finalLiveClasses = liveSessions.length > 0 ? liveSessions : [
            { _id: 'l1', title: 'Node.js & MongoDB Cluster Lab', startTime: new Date(Date.now() + 24*3600*1000).toISOString(), durationMinutes: 90, meetingLink: '/live-sessions' },
            { _id: 'l2', title: 'Advanced React Layout Systems', startTime: new Date(Date.now() + 3*24*3600*1000).toISOString(), durationMinutes: 60, meetingLink: '/live-sessions' }
        ];

        return (
            <div style={styles.gridTwoCol}>
                
                {/* LEFT MAIN PANEL COLUMN */}
                <div style={styles.dashboardGrid}>
                    
                    {/* 1. Welcome Message & Quote */}
                    <div style={styles.welcomeCard}>
                        <h2 style={{ ...styles.tabTitle, color: colors.primary, fontSize: '24px' }}>
                            {getGreeting()}, {user?.fullName?.split(' ')[0]}! 📚
                        </h2>
                        <p style={{ color: colors.text, fontSize: '14px', margin: '8px 0 0', fontWeight: '500' }}>
                            Welcome back to your integrated learning command center. Ready to unlock new milestones today?
                        </p>
                        <div style={{ marginTop: '16px', padding: '10px 14px', background: `${colors.bgCard}80`, borderRadius: '10px', borderLeft: `3px solid ${colors.accent}` }}>
                            <p style={styles.quoteText}>"{motivationalQuote}"</p>
                        </div>
                    </div>

                    {/* 2. Learning Progress & Gamification statistics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '20px' }}>
                        <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Course Milestones</h3>
                            <div style={styles.statsGrid}>
                                <div style={{ ...styles.statCard, padding: '14px', borderTop: `3px solid ${colors.primary}` }}>
                                    <span style={{ ...styles.statValue, color: colors.primary, fontSize: '22px' }}>{enrollments.length}</span>
                                    <span style={styles.statLabel}>Active Courses</span>
                                </div>
                                <div style={{ ...styles.statCard, padding: '14px', borderTop: `3px solid ${colors.success}` }}>
                                    <span style={{ ...styles.statValue, color: colors.success, fontSize: '22px' }}>{averageProgress}%</span>
                                    <span style={styles.statLabel}>Average Progress</span>
                                </div>
                                <div style={{ ...styles.statCard, padding: '14px', borderTop: `3px solid ${colors.accent}` }}>
                                    <span style={{ ...styles.statValue, color: colors.accent, fontSize: '22px' }}>{certificates.length}</span>
                                    <span style={styles.statLabel}>Certificates</span>
                                </div>
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

                    {/* 3. Continue Learning Active Course */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Resume Coursework</h3>
                        {primaryActive ? (
                            <div style={styles.recentCourseBox}>
                                <div style={styles.recentCourseLeft}>
                                    <span style={styles.courseBadge}>{primaryActive.courseRef?.technicalCategory || 'Development'}</span>
                                    <h4 style={{ ...styles.recentCourseName, fontSize: '18px', marginTop: '6px' }}>{primaryActive.courseRef?.courseTitle}</h4>
                                    <p style={styles.recentCourseMeta}>Lessons track length: {primaryActive.courseRef?.estimatedDurationHours || 0} Hours</p>
                                </div>
                                <div style={styles.recentCourseRight}>
                                    <span style={styles.progressPercent}>{primaryActive.completionPercentage || 0}% Complete</span>
                                    <div style={{ width: '150px', background: colors.bgInput, height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '4px 0 12px' }}>
                                        <div style={{ width: `${primaryActive.completionPercentage || 0}%`, background: colors.primary, height: '100%' }} />
                                    </div>
                                    {primaryActive.tuitionClearanceFlag ? (
                                        <button onClick={() => navigate(`/student/learn/${primaryActive.courseRef?._id}`)} style={styles.resumeBtn}>
                                            Resume Learning →
                                        </button>
                                    ) : (
                                        <button onClick={() => setActiveTab('payments')} style={styles.lockedBtn}>
                                            🔒 Pending Clearance
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={styles.emptyContent}>
                                <p style={styles.emptyText}>Not enrolled in any tracks currently.</p>
                                <button onClick={() => navigate('/courses')} style={styles.resumeBtn}>Explore Catalog</button>
                            </div>
                        )}
                    </div>

                    {/* 10. Learning Statistics (Weekly Target hours tracker & Streak) */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Learning Statistics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <span style={{ color: colors.text, fontSize: '13px', fontWeight: '700' }}>Weekly Study Hours Goal</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: colors.textMuted, marginTop: '8px' }}>
                                    <span>Completed: {studyCompletedHours} hrs</span>
                                    <span>Target: {studyTargetHours} hrs</span>
                                </div>
                                <div style={{ width: '100%', background: colors.bgInput, height: '10px', borderRadius: '5px', overflow: 'hidden', marginTop: '6px' }}>
                                    <div style={{ width: `${Math.min((studyCompletedHours / studyTargetHours) * 100, 100)}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, height: '100%' }} />
                                </div>
                                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>Adjust Goal:</span>
                                    <input 
                                        type="range" 
                                        min="5" 
                                        max="30" 
                                        value={studyTargetHours} 
                                        onChange={(e) => handleUpdateStudyTarget(Number(e.target.value))} 
                                        style={{ accentColor: colors.primary, flex: 1 }}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: colors.text }}>{studyTargetHours}h</span>
                                </div>
                            </div>

                            <div>
                                <span style={{ color: colors.text, fontSize: '13px', fontWeight: '700' }}>7-Day Streak Tracker</span>
                                <div style={styles.streakGrid}>
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                                        const isChecked = idx < 5;
                                        return (
                                            <div 
                                                key={day + idx} 
                                                style={{
                                                    ...styles.streakDay,
                                                    background: isChecked ? `${colors.success}15` : colors.bgInput,
                                                    border: `1px solid ${isChecked ? colors.success + '40' : colors.border}`,
                                                    color: isChecked ? colors.success : colors.textMuted
                                                }}
                                            >
                                                <span>{day}</span>
                                                <span style={{ fontSize: '12px', marginTop: '2px' }}>{isChecked ? '🔥' : '⚪'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 12. Achievement Badges Gallery (Dynamic Unlocking) */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Earned Badges & Achievements</h3>
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
                                >
                                    <div style={styles.badgeIcon}>{badge.icon}</div>
                                    <span style={styles.badgeName}>{badge.name}</span>
                                    <span style={styles.badgeDesc}>{badge.desc}</span>
                                    {badge.unlocked ? (
                                        <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '10px', color: colors.success, fontWeight: '800' }}>✓ UNLOCKED</span>
                                    ) : (
                                        <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '10px', color: colors.textMuted, fontWeight: '700' }}>🔒 LOCKED</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 8. Recommended Courses with Live Wishlist Integration */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Recommended For You</h3>
                        {recommendations.length > 0 ? (
                            <div style={styles.recommendGrid}>
                                {recommendations.map((course) => {
                                    const isSaved = wishlist.some(w => (w.courseRef?._id || w.courseRef || w._id) === course._id);
                                    return (
                                        <div key={course._id} style={styles.recommendCard}>
                                            <div>
                                                <span style={styles.courseBadge}>{course.technicalCategory || 'Development'}</span>
                                                <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '8px 0 4px', lineHeight: '1.4' }}>{course.courseTitle}</h4>
                                                <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 12px' }}>Rating: ⭐ {course.averageRating || '4.8'} | {course.level || 'Beginner'}</p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px' }}>
                                                <button onClick={() => handleToggleWishlist(course._id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: isSaved ? '#ef4444' : colors.textMuted, borderRadius: '6px', padding: '6px', cursor: 'pointer' }} title="Toggle Wishlist">
                                                    {isSaved ? '💖' : '🤍'}
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
                            <p style={{ color: colors.textMuted, fontSize: '13px' }}>Explore the catalog to discover more learning paths.</p>
                        )}
                    </div>

                    {/* 9. Recently Viewed Courses */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '24px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Recently Viewed Courses</h3>
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
                            <div style={{ padding: '12px', textAlign: 'center', border: `1px dashed ${colors.border}`, borderRadius: '10px' }}>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No recently visited course details. Explore courses to fill this history!</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT SIDEBAR PANEL COLUMN */}
                <div style={styles.dashboardGrid}>
                    
                    {/* 11. Custom Interactive Calendar Widget */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Learning Calendar</h3>
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

                    {/* 4. Upcoming Deadlines list */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Upcoming Deliverables</h3>
                        <div style={styles.deadlineList}>
                            {deadlines.map(item => (
                                <div key={item.id} style={styles.deadlineItem}>
                                    <div>
                                        <h4 style={{ color: colors.text, fontSize: '13px', fontWeight: '700', margin: 0 }}>{item.title}</h4>
                                        <span style={{ color: colors.textMuted, fontSize: '11px' }}>{item.type} | Due {new Date(item.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                    </div>
                                    <span style={{ ...styles.priorityBadge, background: `${item.color}15`, color: item.color }}>
                                        {item.priority}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. Upcoming Live Classes */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Live Class Schedules</h3>
                        <div style={styles.liveGrid}>
                            {finalLiveClasses.map((session, idx) => (
                                <div key={session._id || idx} style={styles.liveCard}>
                                    <div>
                                        <h4 style={{ color: colors.text, fontSize: '13px', fontWeight: '700', margin: 0 }}>{session.title}</h4>
                                        <span style={{ color: colors.textMuted, fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                            ⏱️ {new Date(session.startTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} | {new Date(session.startTime).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <button onClick={() => navigate('/live-sessions')} style={styles.liveBtn}>
                                        Join
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 6 & 7. Integrated Announcements & System Notifications Dual Feed */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <div style={styles.tabSwitch}>
                            <button 
                                onClick={() => setNotificationTab('announcements')} 
                                style={{
                                    ...styles.tabSwitchBtn,
                                    color: notificationTab === 'announcements' ? colors.primary : colors.textMuted,
                                    borderBottom: notificationTab === 'announcements' ? `2px solid ${colors.primary}` : 'none'
                                }}
                            >
                                📢 Bulletins ({finalAnnouncements.length})
                            </button>
                            <button 
                                onClick={() => setNotificationTab('notifications')} 
                                style={{
                                    ...styles.tabSwitchBtn,
                                    color: notificationTab === 'notifications' ? colors.primary : colors.textMuted,
                                    borderBottom: notificationTab === 'notifications' ? `2px solid ${colors.primary}` : 'none'
                                }}
                            >
                                🔔 Alerts ({finalNotifications.length})
                            </button>
                        </div>
                        
                        <div style={styles.feedList}>
                            {notificationTab === 'announcements' ? (
                                finalAnnouncements.map((ann, idx) => (
                                    <div key={ann._id || idx} style={styles.feedItem}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <strong style={{ color: colors.text }}>{ann.title}</strong>
                                            {ann._id && !ann.isRead && (
                                                <button onClick={() => handleMarkNotificationAsRead(ann._id)} style={{ background: 'none', border: 'none', color: colors.primary, fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}>
                                                    ✓ Read
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
                                finalNotifications.map((notif, idx) => (
                                    <div key={notif._id || idx} style={styles.feedItem}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <strong style={{ color: colors.text }}>{notif.title}</strong>
                                            {notif._id && !notif.isRead && (
                                                <button onClick={() => handleMarkNotificationAsRead(notif._id)} style={{ background: 'none', border: 'none', color: colors.primary, fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}>
                                                    ✓ Read
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
                            )}
                        </div>
                    </div>

                    {/* 13. Certificates Earned Card summary */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Earned Certificates</h3>
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

                    {/* 14. Wishlist Summary sidebar widget with live toggle */}
                    <div style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                        <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '16px' }}>Saved in Wishlist</h3>
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
                                                <button onClick={() => handleToggleWishlist(c._id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontSize: '11px' }} title="Remove from Wishlist">
                                                    🗑️
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
    };

    const renderMyLearning = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>My Courses & Learning Tracks</h2>
                <p style={styles.tabSubtitle}>Access your enrolled lectures and track your clearance status</p>
            </div>
            {enrollments.length === 0 ? (
                <div style={styles.emptyContent}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                    <p style={styles.emptyText}>You haven't enrolled in any courses yet.</p>
                    <Link to="/courses" style={styles.resumeBtn}>Browse Course Catalog</Link>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {enrollments.map((enroll) => {
                        const course = enroll.courseRef || {};
                        const progress = enroll.completionPercentage || 0;
                        const cleared = enroll.tuitionClearanceFlag;
                        return (
                            <div key={enroll._id} style={{ ...styles.courseCard, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, width: `${progress}%`, transition: 'width 0.5s' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
                                    <span style={styles.courseBadge}>{course.technicalCategory || 'Development'}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: cleared ? colors.success : colors.warning, background: cleared ? `${colors.success}15` : `${colors.warning}15`, padding: '3px 8px', borderRadius: '6px' }}>
                                        {cleared ? '✓ Cleared' : '⏳ Pending'}
                                    </span>
                                </div>
                                <h3 style={styles.courseTitle}>{course.courseTitle || 'Course'}</h3>
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 12px' }}>By {course.creatorRef?.fullName || 'EMARE Instructor'} · {course.estimatedDurationHours || 0}h total</p>
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: colors.textMuted, fontSize: '12px' }}>Progress</span>
                                        <span style={{ color: colors.primary, fontSize: '12px', fontWeight: '700' }}>{progress}%</span>
                                    </div>
                                    <div style={styles.progressBar}>
                                        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    {cleared ? (
                                        <button onClick={() => navigate(`/student/learn/${course._id}`)} style={{ ...styles.watchBtn, flex: 1 }}>▶ Continue Learning</button>
                                    ) : (
                                        <button onClick={() => setActiveTab('payments')} style={{ ...styles.lockedBtn, flex: 1, textAlign: 'center' }}>🔒 Clear Tuition to Access</button>
                                    )}
                                    <button onClick={() => navigate(`/courses/${course._id}`)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>Details</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderWishlist = () => (
        <div>
            <div style={{ ...styles.tabHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={styles.tabTitle}>My Course Wishlist 💖</h2>
                    <p style={styles.tabSubtitle}>Saved courses that interest you — ready to enroll whenever you are</p>
                </div>
                <button onClick={() => navigate('/courses')} style={styles.resumeBtn}>+ Browse More Courses</button>
            </div>
            {wishlist.length === 0 ? (
                <div style={styles.emptyContent}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💝</div>
                    <p style={styles.emptyText}>Your wishlist is empty. Save courses you like while browsing!</p>
                    <Link to="/courses" style={styles.resumeBtn}>Explore Catalog</Link>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {wishlist.map((item) => {
                        const course = item.courseRef || item;
                        return (
                            <div key={course._id} style={styles.courseCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={styles.courseBadge}>{course.technicalCategory || 'General'}</span>
                                    <button onClick={() => handleToggleWishlist(course._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px' }} title="Remove from wishlist">💔</button>
                                </div>
                                <h3 style={styles.courseTitle}>{course.courseTitle}</h3>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 8px', lineHeight: '1.4' }}>
                                    {course.descriptionText?.substring(0, 100)}...
                                </p>
                                <p style={{ color: colors.primary, fontWeight: '700', fontSize: '14px', margin: '0 0 16px' }}>
                                    {course.price === 0 ? '🆓 Free' : `${course.price?.toLocaleString()} Birr`}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => navigate(`/courses/${course._id}`)} style={{ ...styles.watchBtn, flex: 1 }}>View & Enroll</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderAssignments = () => {
        const handleAssignmentSubmit = async (assignmentId, courseId) => {
            setAssignmentMsg('');
            if (!assignmentSubmitText && !assignmentFile) {
                setAssignmentMsg('Please add a submission text or file.');
                return;
            }
            try {
                setSubmittingAssignmentId(assignmentId);
                let fileUrl = null;
                if (assignmentFile) {
                    const fd = new FormData();
                    fd.append('file', assignmentFile);
                    const uploadRes = await uploadService.uploadFile(fd);
                    fileUrl = uploadRes.data.data.url;
                }
                await assignmentService.submit(assignmentId, {
                    submissionText: assignmentSubmitText,
                    fileUrl,
                    courseRef: courseId
                });
                setAssignmentMsg('✅ Assignment submitted successfully!');
                setAssignmentSubmitText('');
                setAssignmentFile(null);
                // Refresh submissions
                try {
                    const subRes = await assignmentService.getMySubmissions();
                    setMySubmissions(subRes.data.data || []);
                } catch(e) {}
            } catch(err) {
                setAssignmentMsg('❌ ' + (err.response?.data?.message || 'Submission failed. Please try again.'));
            } finally {
                setSubmittingAssignmentId(null);
            }
        };

        const submittedIds = mySubmissions.map(s => s.assignmentRef || s.assignment?._id);

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>📝 Assignments & Submissions</h2>
                    <p style={styles.tabSubtitle}>View all your assignments from enrolled courses and submit your work</p>
                </div>

                {assignmentMsg && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', background: assignmentMsg.includes('✅') ? `${colors.success}15` : `${colors.danger}15`, color: assignmentMsg.includes('✅') ? colors.success : '#ef4444', border: `1px solid ${assignmentMsg.includes('✅') ? colors.success + '40' : '#ef444440'}` }}>
                        {assignmentMsg}
                    </div>
                )}

                {assignmentsList.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <p style={styles.emptyText}>No assignments posted for your enrolled courses yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {assignmentsList.map((asgn) => {
                            const isSubmitted = submittedIds.includes(asgn._id);
                            const isOverdue = asgn.dueDate && new Date(asgn.dueDate) < new Date();
                            return (
                                <div key={asgn._id} style={{ ...styles.panelCard, marginBottom: 0, padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>{asgn.title || 'Assignment Task'}</h3>
                                                {isSubmitted && <span style={{ background: `${colors.success}15`, color: colors.success, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>✓ SUBMITTED</span>}
                                                {!isSubmitted && isOverdue && <span style={{ background: '#ef444415', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>⚠ OVERDUE</span>}
                                                {!isSubmitted && !isOverdue && <span style={{ background: `${colors.warning}15`, color: colors.warning, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>⏳ PENDING</span>}
                                            </div>
                                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 6px', lineHeight: '1.5' }}>{asgn.description || asgn.instructions}</p>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: colors.textMuted }}>
                                                {asgn.dueDate && <span>📅 Due: <strong style={{ color: isOverdue ? '#ef4444' : colors.text }}>{new Date(asgn.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>}
                                                {asgn.totalMarks && <span>🎯 Max Marks: <strong style={{ color: colors.text }}>{asgn.totalMarks}</strong></span>}
                                            </div>
                                        </div>
                                    </div>

                                    {!isSubmitted && (
                                        <div style={{ marginTop: '16px', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                            <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '0 0 12px' }}>Submit Your Work</h4>
                                            <textarea
                                                rows="4"
                                                placeholder="Describe your solution, paste GitHub links, or summarize your approach..."
                                                value={submittingAssignmentId === asgn._id ? assignmentSubmitText : ''}
                                                onChange={e => { setSubmittingAssignmentId(asgn._id); setAssignmentSubmitText(e.target.value); }}
                                                style={{ ...styles.input, width: '100%', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
                                            />
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <label style={{ cursor: 'pointer', background: `${colors.primary}15`, border: `1px dashed ${colors.primary}`, color: colors.primary, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    📎 {assignmentFile?.name || 'Attach File (PDF/ZIP/DOC)'}
                                                    <input type="file" style={{ display: 'none' }} onChange={e => setAssignmentFile(e.target.files[0])} />
                                                </label>
                                                <button
                                                    onClick={() => handleAssignmentSubmit(asgn._id, asgn.courseRef)}
                                                    disabled={submittingAssignmentId === asgn._id && !assignmentSubmitText}
                                                    style={{ ...styles.resumeBtn, padding: '8px 20px', fontSize: '13px' }}
                                                >
                                                    {submittingAssignmentId === asgn._id ? 'Submitting...' : 'Submit Assignment'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isSubmitted && (() => {
                                        const mySubmission = mySubmissions.find(s => (s.assignmentRef || s.assignment?._id) === asgn._id);
                                        return mySubmission ? (
                                            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: `${colors.success}08`, border: `1px solid ${colors.success}30` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontSize: '13px', color: colors.success, fontWeight: '700' }}>✓ Submitted on {new Date(mySubmission.createdAt || Date.now()).toLocaleDateString()}</span>
                                                        {mySubmission.grade && <span style={{ marginLeft: '16px', fontSize: '13px', color: colors.primary, fontWeight: '700' }}>Grade: {mySubmission.grade}/100</span>}
                                                    </div>
                                                    {mySubmission.feedback && <span style={{ fontSize: '12px', color: colors.textMuted }}>Feedback: {mySubmission.feedback}</span>}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderQuizzes = () => {
        const handleStartQuiz = (quiz) => {
            setActiveQuiz(quiz);
            setQuizAnswers({});
            setQuizResult(null);
        };

        const handleSubmitQuiz = async () => {
            if (!activeQuiz) return;
            setQuizSubmitting(true);
            try {
                const answersArray = Object.entries(quizAnswers).map(([questionIndex, selectedIndex]) => ({
                    questionIndex: parseInt(questionIndex),
                    selectedOptionIndex: parseInt(selectedIndex)
                }));
                const res = await quizService.submitAttempt(activeQuiz._id, answersArray);
                setQuizResult(res.data.data || res.data);
            } catch(err) {
                // Calculate locally as fallback
                let correct = 0;
                (activeQuiz.questions || []).forEach((q, i) => {
                    if (quizAnswers[i] !== undefined && parseInt(quizAnswers[i]) === q.correctOptionIndex) correct++;
                });
                const total = (activeQuiz.questions || []).length;
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                setQuizResult({ score: pct, correctAnswers: correct, totalQuestions: total, passed: pct >= (activeQuiz.passingScore || 60) });
            } finally {
                setQuizSubmitting(false);
            }
        };

        if (activeQuiz) {
            const questions = activeQuiz.questions || [];
            return (
                <div>
                    <button onClick={() => { setActiveQuiz(null); setQuizResult(null); }} style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '14px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>← Back to Quizzes</button>

                    {quizResult ? (
                        <div style={{ ...styles.panelCard, textAlign: 'center', padding: '48px' }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{quizResult.passed ? '🎉' : '📚'}</div>
                            <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>{quizResult.passed ? 'Quiz Passed!' : 'Keep Practicing!'}</h2>
                            <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px' }}>{activeQuiz.quizTitle}</p>
                            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
                                <div style={{ padding: '20px 32px', borderRadius: '16px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ fontSize: '36px', fontWeight: '800', color: quizResult.passed ? colors.success : '#ef4444' }}>{quizResult.score}%</div>
                                    <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>Score</div>
                                </div>
                                <div style={{ padding: '20px 32px', borderRadius: '16px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ fontSize: '36px', fontWeight: '800', color: colors.text }}>{quizResult.correctAnswers}/{quizResult.totalQuestions}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>Correct</div>
                                </div>
                            </div>
                            <button onClick={() => { setActiveQuiz(null); setQuizResult(null); }} style={styles.resumeBtn}>Back to All Quizzes</button>
                        </div>
                    ) : (
                        <div style={styles.panelCard}>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>{activeQuiz.quizTitle}</h2>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: colors.textMuted }}>
                                    <span>📋 {questions.length} Questions</span>
                                    {activeQuiz.timeLimitMinutes && <span>⏱ {activeQuiz.timeLimitMinutes} min</span>}
                                    <span>🎯 Passing Score: {activeQuiz.passingScore || 60}%</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {questions.map((q, qi) => (
                                    <div key={qi} style={{ padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${quizAnswers[qi] !== undefined ? colors.primary + '40' : colors.border}` }}>
                                        <p style={{ color: colors.text, fontSize: '15px', fontWeight: '600', margin: '0 0 16px' }}><span style={{ color: colors.primary, fontWeight: '800' }}>Q{qi + 1}.</span> {q.questionText}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {(q.options || []).map((opt, oi) => (
                                                <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${quizAnswers[qi] === String(oi) ? colors.primary : colors.border}`, background: quizAnswers[qi] === String(oi) ? `${colors.primary}10` : 'transparent', transition: 'all 0.15s' }}>
                                                    <input
                                                        type="radio"
                                                        name={`q_${qi}`}
                                                        value={oi}
                                                        checked={quizAnswers[qi] === String(oi)}
                                                        onChange={() => setQuizAnswers(prev => ({ ...prev, [qi]: String(oi) }))}
                                                        style={{ accentColor: colors.primary, width: '16px', height: '16px' }}
                                                    />
                                                    <span style={{ color: colors.text, fontSize: '14px' }}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <span style={{ color: colors.textMuted, fontSize: '13px', alignSelf: 'center' }}>{Object.keys(quizAnswers).length}/{questions.length} answered</span>
                                <button
                                    onClick={handleSubmitQuiz}
                                    disabled={quizSubmitting || Object.keys(quizAnswers).length === 0}
                                    style={{ ...styles.resumeBtn, opacity: Object.keys(quizAnswers).length === 0 ? 0.5 : 1 }}
                                >
                                    {quizSubmitting ? 'Submitting...' : '🚀 Submit Quiz'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>🧠 Quizzes & Assessments</h2>
                    <p style={styles.tabSubtitle}>Take quizzes from your enrolled courses and test your knowledge</p>
                </div>
                {quizzesList.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                        <p style={styles.emptyText}>No quizzes available for your courses yet. Check back after lessons are published.</p>
                    </div>
                ) : (
                    <div style={styles.courseGrid}>
                        {quizzesList.map((quiz) => (
                            <div key={quiz._id} style={{ ...styles.courseCard, cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={styles.courseBadge}>{quiz.quizType || 'MCQ'}</span>
                                    <span style={{ fontSize: '11px', color: colors.textMuted }}>{quiz.totalMarks || 100} pts</span>
                                </div>
                                <h3 style={{ ...styles.courseTitle, marginBottom: '8px' }}>{quiz.quizTitle || 'Course Quiz'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>📋 {(quiz.questions || []).length} Questions</span>
                                    {quiz.timeLimitMinutes && <span style={{ fontSize: '12px', color: colors.textMuted }}>⏱ {quiz.timeLimitMinutes} min time limit</span>}
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>🎯 Pass at {quiz.passingScore || 60}%</span>
                                </div>
                                <button onClick={() => handleStartQuiz(quiz)} style={{ ...styles.watchBtn, width: '100%' }}>Start Quiz →</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderGrades = () => {
        const avgScore = grades.filter(g => g.isGraded).length > 0
            ? Math.round(grades.filter(g => g.isGraded).reduce((acc, g) => acc + (g.numericalScoreEarned || 0), 0) / grades.filter(g => g.isGraded).length)
            : 0;
        const gradedCount = grades.filter(g => g.isGraded).length;
        const pendingCount = grades.filter(g => !g.isGraded).length;

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>📊 Grades & Academic Performance</h2>
                    <p style={styles.tabSubtitle}>Track your academic standing and assessment history</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.primary}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.primary, fontSize: '28px' }}>{avgScore}%</span>
                        <span style={styles.statLabel}>Average Score</span>
                    </div>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.success}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.success, fontSize: '28px' }}>{gradedCount}</span>
                        <span style={styles.statLabel}>Graded Items</span>
                    </div>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.warning}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.warning, fontSize: '28px' }}>{pendingCount}</span>
                        <span style={styles.statLabel}>Awaiting Grade</span>
                    </div>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.accent}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.accent, fontSize: '28px' }}>{completedCoursesCount}</span>
                        <span style={styles.statLabel}>Courses Completed</span>
                    </div>
                </div>

                {grades.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                        <p style={styles.emptyText}>No graded submissions yet. Submit assignments and take quizzes to see your grades here.</p>
                    </div>
                ) : (
                    <div style={styles.tableCard}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thRow}>
                                    <th style={styles.th}>Assessment</th>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Score</th>
                                    <th style={styles.th}>Grade</th>
                                    <th style={styles.th}>Instructor Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grades.map((grade) => {
                                    const score = grade.numericalScoreEarned || 0;
                                    const letterGrade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
                                    const gradeColor = score >= 70 ? colors.success : score >= 60 ? colors.warning : '#ef4444';
                                    return (
                                        <tr key={grade._id} style={styles.tr}>
                                            <td style={styles.td}><strong>{grade.assessmentRef?.quizTitle || grade.assessmentRef?.title || 'Assessment Task'}</strong></td>
                                            <td style={styles.td}><span style={{ ...styles.courseBadge, margin: 0 }}>{grade.assessmentType || 'Quiz'}</span></td>
                                            <td style={styles.td}>
                                                <span style={{ background: grade.isGraded ? `${colors.success}15` : `${colors.warning}15`, color: grade.isGraded ? colors.success : colors.warning, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                                                    {grade.isGraded ? 'Graded' : 'Awaiting'}
                                                </span>
                                            </td>
                                            <td style={styles.tdScore}>{grade.isGraded ? `${score}/100` : '—'}</td>
                                            <td style={{ ...styles.td, fontWeight: '800', color: gradeColor, fontSize: '16px' }}>{grade.isGraded ? letterGrade : '—'}</td>
                                            <td style={{ ...styles.td, color: colors.textMuted, fontSize: '12px' }}>{grade.instructorReviewNotes || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderCertificates = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>🏆 Earned Credentials & Certificates</h2>
                <p style={styles.tabSubtitle}>Download your certificates of completion and share on LinkedIn</p>
            </div>
            {certificates.length === 0 ? (
                <div style={styles.emptyContent}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
                    <p style={styles.emptyText}>No certificates earned yet. Complete all lessons and score above 60% in quizzes to qualify!</p>
                    <button onClick={() => setActiveTab('learning')} style={styles.resumeBtn}>Continue Learning</button>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {certificates.map((cert) => (
                        <div key={cert._id} style={{ ...styles.certCard, background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.bgInput})`, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `${colors.primary}10` }} />
                            <div style={styles.certIcon}>🏆</div>
                            <h3 style={styles.certTitle}>{cert.courseRef?.courseTitle || 'Course Certificate'}</h3>
                            <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 4px' }}>Issued to: <strong style={{ color: colors.text }}>{user?.fullName}</strong></p>
                            <p style={styles.certMeta}>Certificate No: <span style={{ fontFamily: 'monospace', color: colors.primary }}>{cert.certificateNumber}</span></p>
                            {cert.issuedAt && <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 20px' }}>Issued: {new Date(cert.issuedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button onClick={() => window.open(cert.certificatePdfUrl, '_blank')} style={{ ...styles.downloadBtn, flex: 1 }}>⬇ Download PDF</button>
                                {linkedInUrl && <button onClick={() => window.open(`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.courseRef?.courseTitle || 'EMARE Certificate')}&organizationName=EMARE+ICT+Hub`, '_blank')} style={{ ...styles.resumeBtn, flex: 1 }}>🔗 LinkedIn</button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderLiveSessions = () => {
        const now = new Date();
        const upcoming = allLiveSessions.filter(s => new Date(s.startTime) > now);
        const past = allLiveSessions.filter(s => new Date(s.startTime) <= now);
        const displayed = liveFilter === 'upcoming' ? upcoming : past;

        const fallback = [
            { _id: 'l1', title: 'Node.js & MongoDB Advanced Cluster Lab', startTime: new Date(Date.now() + 24*3600*1000).toISOString(), durationMinutes: 90, meetingLink: '#', instructor: 'EMARE Instructor' },
            { _id: 'l2', title: 'React Architecture & Performance Patterns', startTime: new Date(Date.now() + 3*24*3600*1000).toISOString(), durationMinutes: 60, meetingLink: '#', instructor: 'EMARE Instructor' },
            { _id: 'l3', title: 'Python Data Structures Masterclass', startTime: new Date(Date.now() + 5*24*3600*1000).toISOString(), durationMinutes: 75, meetingLink: '#', instructor: 'EMARE Instructor' }
        ];
        const finalSessions = displayed.length > 0 ? displayed : (liveFilter === 'upcoming' ? fallback : []);

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>📡 Live Sessions & Virtual Classrooms</h2>
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
                                fontSize: '13px'
                            }}
                        >
                            {f === 'upcoming' ? '🔴 Upcoming' : '📼 Past Sessions'}
                        </button>
                    ))}
                </div>

                {finalSessions.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📺</div>
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
                                            {isLive && <span style={{ background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', animation: 'pulse 1s infinite' }}>🔴 LIVE NOW</span>}
                                            <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>{session.title}</h3>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: colors.textMuted, flexWrap: 'wrap' }}>
                                            <span>📅 {sessionDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                            <span>⏰ {sessionDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                            {session.durationMinutes && <span>⏱ {session.durationMinutes} min</span>}
                                            {session.instructor && <span>👤 {session.instructor}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {session.meetingLink && (
                                            <button onClick={() => window.open(session.meetingLink === '#' ? '/live-sessions' : session.meetingLink, '_blank')} style={{ ...styles.resumeBtn, padding: '10px 20px', background: isLive ? '#ef4444' : `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                                                {isLive ? '🔴 Join Now' : '📎 View Details'}
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
    };

    const renderDiscussions = () => {
        const handlePostDiscussion = async (e) => {
            e.preventDefault();
            if (!newDiscussionTitle.trim() || !selectedDiscussionCourse) return;
            try {
                const res = await discussionService.create({ title: newDiscussionTitle, body: newDiscussionBody, courseRef: selectedDiscussionCourse });
                const newItem = res.data.data;
                if (newItem) setDiscussionsList(prev => [newItem, ...prev]);
                setNewDiscussionTitle('');
                setNewDiscussionBody('');
                setDiscussionMsg('✅ Discussion posted successfully!');
                setTimeout(() => setDiscussionMsg(''), 3000);
            } catch(err) {
                setDiscussionMsg('❌ Failed to post: ' + (err.response?.data?.message || err.message));
            }
        };

        const handleReply = async (discussionId) => {
            const text = replyText[discussionId] || '';
            if (!text.trim()) return;
            try {
                const res = await discussionService.addReply(discussionId, text);
                setDiscussionsList(prev => prev.map(d => d._id === discussionId ? (res.data.data || d) : d));
                setReplyText(prev => ({ ...prev, [discussionId]: '' }));
            } catch(err) {
                console.error('Reply failed:', err);
            }
        };

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>💬 Course Discussions & Forums</h2>
                    <p style={styles.tabSubtitle}>Ask questions, share insights, and engage with your peers and instructors</p>
                </div>

                <div style={{ ...styles.panelCard, marginBottom: '24px' }}>
                    <h3 style={{ ...styles.panelCardTitle, marginBottom: '16px' }}>Start a New Discussion</h3>
                    {discussionMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600', background: discussionMsg.includes('✅') ? `${colors.success}15` : '#ef444415', color: discussionMsg.includes('✅') ? colors.success : '#ef4444' }}>{discussionMsg}</div>}
                    <form onSubmit={handlePostDiscussion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Course</label>
                                <select style={styles.select} value={selectedDiscussionCourse} onChange={e => setSelectedDiscussionCourse(e.target.value)} required>
                                    <option value="">Select Course</option>
                                    {enrollments.map(e => (
                                        <option key={e._id} value={e.courseRef?._id || e.courseRef}>{e.courseRef?.courseTitle || 'Course'}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Discussion Title</label>
                                <input style={styles.input} type="text" value={newDiscussionTitle} onChange={e => setNewDiscussionTitle(e.target.value)} placeholder="e.g. How does useEffect cleanup work?" required />
                            </div>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description / Question</label>
                            <textarea rows="3" style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }} value={newDiscussionBody} onChange={e => setNewDiscussionBody(e.target.value)} placeholder="Describe your question in detail..." />
                        </div>
                        <button type="submit" style={{ ...styles.resumeBtn, alignSelf: 'flex-start' }}>💬 Post Discussion</button>
                    </form>
                </div>

                {discussionsList.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗨️</div>
                        <p style={styles.emptyText}>No discussions yet. Be the first to start a conversation!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {discussionsList.map(disc => (
                            <div key={disc._id} style={{ ...styles.panelCard, marginBottom: 0, padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>{disc.title}</h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: colors.textMuted }}>
                                            <span>By {disc.authorRef?.fullName || disc.creatorRef?.fullName || 'Student'}</span>
                                            <span>{new Date(disc.createdAt || Date.now()).toLocaleDateString()}</span>
                                            {disc.isPinned && <span style={{ color: colors.primary, fontWeight: '700' }}>📌 Pinned</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => setExpandedDiscussion(expandedDiscussion === disc._id ? null : disc._id)} style={{ background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                        {expandedDiscussion === disc._id ? '▲ Collapse' : `▼ Replies (${(disc.replies || []).length})`}
                                    </button>
                                </div>
                                {disc.body && <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 12px', lineHeight: '1.5' }}>{disc.body}</p>}
                                {expandedDiscussion === disc._id && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                                        {(disc.replies || []).map((reply, ri) => (
                                            <div key={ri} style={{ padding: '12px', borderRadius: '8px', background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
                                                <strong style={{ fontSize: '12px', color: colors.text }}>{reply.authorRef?.fullName || 'Student'}</strong>
                                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0', lineHeight: '1.5' }}>{reply.body}</p>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <input
                                                style={{ ...styles.input, flex: 1 }}
                                                placeholder="Write a reply..."
                                                value={replyText[disc._id] || ''}
                                                onChange={e => setReplyText(prev => ({ ...prev, [disc._id]: e.target.value }))}
                                                onKeyDown={e => e.key === 'Enter' && handleReply(disc._id)}
                                            />
                                            <button onClick={() => handleReply(disc._id)} style={{ ...styles.resumeBtn, padding: '10px 16px', fontSize: '13px' }}>Reply</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderLeaderboard = () => {
        const fallbackBoard = [
            { _id: 'u1', fullName: user?.fullName || 'You', gamificationPoints: 1250, level: 5, avatarUrl: avatarUrl, rank: 1 },
            { _id: 'u2', fullName: 'Bereket Tadesse', gamificationPoints: 980, level: 4, rank: 2 },
            { _id: 'u3', fullName: 'Hana Girma', gamificationPoints: 875, level: 3, rank: 3 },
            { _id: 'u4', fullName: 'Yohannes Alemu', gamificationPoints: 760, level: 3, rank: 4 },
            { _id: 'u5', fullName: 'Meron Tesfaye', gamificationPoints: 620, level: 2, rank: 5 },
            { _id: 'u6', fullName: 'Dawit Kebede', gamificationPoints: 540, level: 2, rank: 6 },
            { _id: 'u7', fullName: 'Selamawit Asrat', gamificationPoints: 410, level: 1, rank: 7 },
            { _id: 'u8', fullName: 'Abel Worku', gamificationPoints: 320, level: 1, rank: 8 }
        ];
        const board = leaderboard.length > 0 ? leaderboard : fallbackBoard;
        const myRank = board.findIndex(u => u._id === user?._id) + 1;
        const top3 = board.slice(0, 3);
        const rest = board.slice(3);

        const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
        const podiumHeights = ['160px', '200px', '130px'];
        const podiumColors = [colors.textMuted, '#f59e0b', colors.primary];
        const podiumMedals = ['🥈', '🥇', '🥉'];

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>🏆 Student Leaderboard</h2>
                    <p style={styles.tabSubtitle}>See how you stack up against peers. Earn XP by completing lessons, quizzes, and assignments!</p>
                </div>

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
                                <span style={{ fontSize: '28px' }}>{podiumMedals[i]}</span>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '18px' }}>
                                    {entry.fullName?.[0]?.toUpperCase()}
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
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>
                                                    {entry.fullName?.[0]?.toUpperCase()}
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
            </div>
        );
    };

    const renderMessages = () => {
        const handleLoadConversation = async (conv) => {
            setActiveConversation(conv);
            try {
                const res = await messageService.getMessages(conv._id);
                setConversationMessages(res.data.data || []);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            } catch(e) {
                setConversationMessages([]);
            }
        };

        const handleSendMessage = async () => {
            if (!messageInput.trim() || !activeConversation) return;
            setMessageSending(true);
            try {
                const res = await messageService.sendMessage({ conversationId: activeConversation._id, body: messageInput });
                const newMsg = res.data.data;
                if (newMsg) setConversationMessages(prev => [...prev, newMsg]);
                else setConversationMessages(prev => [...prev, { _id: Date.now(), body: messageInput, senderRef: { _id: user?._id, fullName: user?.fullName }, createdAt: new Date().toISOString() }]);
                setMessageInput('');
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            } catch(e) {
                console.error('Message send failed:', e);
            } finally {
                setMessageSending(false);
            }
        };

        const fallbackConvs = [
            { _id: 'c1', title: 'EMARE Support Team', lastMessage: 'How can we help you today?', updatedAt: new Date(Date.now() - 2*3600*1000).toISOString() },
            { _id: 'c2', title: 'Course Instructor - Web Dev', lastMessage: 'Great question about React hooks!', updatedAt: new Date(Date.now() - 24*3600*1000).toISOString() }
        ];
        const displayConvs = conversations.length > 0 ? conversations : fallbackConvs;

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>✉️ Messages & Inbox</h2>
                    <p style={styles.tabSubtitle}>Communicate with instructors and the EMARE support team</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', height: '600px' }}>
                    {/* Conversations List */}
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                            <h3 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: 0 }}>Conversations</h3>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {displayConvs.map(conv => (
                                <div
                                    key={conv._id}
                                    onClick={() => handleLoadConversation(conv)}
                                    style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, background: activeConversation?._id === conv._id ? `${colors.primary}10` : 'transparent', transition: 'background 0.15s' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                                            {(conv.title || conv.participants?.[0]?.fullName || 'S')?.[0]?.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <strong style={{ color: colors.text, fontSize: '13px', display: 'block' }}>{conv.title || conv.participants?.[0]?.fullName || 'Conversation'}</strong>
                                            <span style={{ color: colors.textMuted, fontSize: '11px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastMessage || 'No messages yet'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border}` }}>
                            <button onClick={() => navigate('/student/messages')} style={{ ...styles.resumeBtn, width: '100%', padding: '8px', fontSize: '12px' }}>Open Full Inbox</button>
                        </div>
                    </div>

                    {/* Message Thread */}
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {activeConversation ? (
                            <>
                                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '800' }}>
                                        {(activeConversation.title || 'S')?.[0]?.toUpperCase()}
                                    </div>
                                    <h3 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: 0 }}>{activeConversation.title || 'Conversation'}</h3>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {conversationMessages.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontSize: '13px' }}>No messages in this conversation yet. Say hello!</div>
                                    )}
                                    {conversationMessages.map((msg, mi) => {
                                        const isMe = msg.senderRef?._id === user?._id || msg.senderRef === user?._id;
                                        return (
                                            <div key={msg._id || mi} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` : colors.bgInput, color: isMe ? '#fff' : colors.text, fontSize: '14px', lineHeight: '1.5' }}>
                                                    {msg.body}
                                                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>{new Date(msg.createdAt || Date.now()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '10px' }}>
                                    <input
                                        style={{ ...styles.input, flex: 1 }}
                                        placeholder="Type a message..."
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    />
                                    <button onClick={handleSendMessage} disabled={messageSending || !messageInput.trim()} style={{ ...styles.resumeBtn, padding: '10px 20px', opacity: (!messageInput.trim() || messageSending) ? 0.6 : 1 }}>
                                        {messageSending ? '...' : '→'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                                <p style={{ fontSize: '14px', margin: 0 }}>Select a conversation to start messaging</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderPayments = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>💳 Tuition & Payments</h2>
                <p style={styles.tabSubtitle}>Manage your tuition settlements and course access payments</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.success}`, padding: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '32px' }}>✅</span>
                    <span style={{ ...styles.statValue, color: colors.success, fontSize: '24px', marginTop: '8px' }}>{enrollments.filter(e => e.tuitionClearanceFlag).length}</span>
                    <span style={styles.statLabel}>Cleared Courses</span>
                </div>
                <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.warning}`, padding: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '32px' }}>⏳</span>
                    <span style={{ ...styles.statValue, color: colors.warning, fontSize: '24px', marginTop: '8px' }}>{enrollments.filter(e => !e.tuitionClearanceFlag).length}</span>
                    <span style={styles.statLabel}>Pending Settlement</span>
                </div>
            </div>
            <div style={styles.panelCard}>
                <h3 style={{ ...styles.panelCardTitle, marginBottom: '8px' }}>Enrollment Payment Status</h3>
                <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                    Access to course lesson streaming requires manual verification of your payment. Upload your bank transfer receipt, CBE Birr screenshot, or Telebirr confirmation to the payment portal to get your courses cleared.
                </p>
                {enrollments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                        {enrollments.map(e => (
                            <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div>
                                    <strong style={{ color: colors.text, fontSize: '14px' }}>{e.courseRef?.courseTitle || 'Course'}</strong>
                                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: '2px 0 0' }}>Enrolled: {new Date(e.enrolledAt || e.createdAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                                <span style={{ fontWeight: '700', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: e.tuitionClearanceFlag ? `${colors.success}15` : `${colors.warning}15`, color: e.tuitionClearanceFlag ? colors.success : colors.warning }}>
                                    {e.tuitionClearanceFlag ? '✓ CLEARED' : '⏳ PENDING'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => navigate('/student/payments')} style={{ ...styles.resumeBtn, fontSize: '14px' }}>💳 Go to Payment Settlement Portal →</button>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Profile & Account Management</h2>
                <p style={styles.tabSubtitle}>Manage your personal information, social profiles, security options, and account preferences</p>
            </div>

            {/* Inner Sub-Navigation for Settings */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '32px', gap: '8px' }}>
                {[
                    { key: 'personal', label: '👤 Personal Info' },
                    { key: 'account', label: '🖼️ Avatar & Locale' },
                    { key: 'security', label: '🔐 Security & 2FA' },
                    { key: 'preferences', label: '⚙️ Preferences & Privacy' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSettingsSectionTab(tab.key)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: settingsSectionTab === tab.key ? `3px solid ${colors.primary}` : '3px solid transparent',
                            color: settingsSectionTab === tab.key ? colors.primary : colors.textMuted,
                            padding: '12px 20px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.panelCard}>
                {profileSuccessMsg && <div style={styles.successAlert}>{profileSuccessMsg}</div>}
                
                <form onSubmit={handleProfileUpdate}>
                    
                    {/* SECTION 1: PERSONAL INFORMATION */}
                    {settingsSectionTab === 'personal' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Personal Identity & Details</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>First Name</label>
                                    <input type="text" style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Abebe" required />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Last Name</label>
                                    <input type="text" style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Bikila" required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Username</label>
                                    <input type="text" style={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. abebe_dev" required />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Email Address</label>
                                    <input type="email" style={styles.input} value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="student@example.com" required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Phone Number</label>
                                    <input type="tel" style={styles.input} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+251 91 123 4567" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Gender</label>
                                    <select style={styles.select} value={gender} onChange={e => setGender(e.target.value)}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Date of Birth</label>
                                    <input type="date" style={styles.input} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Country</label>
                                    <input type="text" style={styles.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="Ethiopia" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>City</label>
                                    <input type="text" style={styles.input} value={city} onChange={e => setCity(e.target.value)} placeholder="Addis Ababa" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Address</label>
                                    <input type="text" style={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Bole Subcity" />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Biography</label>
                                <textarea 
                                    rows="4" 
                                    style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }} 
                                    value={biography} 
                                    onChange={e => setBiography(e.target.value)} 
                                    placeholder="Write a brief bio about your learning goals and tech background..." 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Occupation</label>
                                    <input type="text" style={styles.input} value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Software Engineer / Student" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Company / University</label>
                                    <input type="text" style={styles.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Emare ICT Hub" />
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Websites & Social Media Handles</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Personal Website</label>
                                    <input type="url" style={styles.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://myportfolio.com" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>LinkedIn Profile</label>
                                    <input type="url" style={styles.input} value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>GitHub Profile</label>
                                    <input type="url" style={styles.input} value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: AVATAR & LOCALE */}
                    {settingsSectionTab === 'account' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Profile Avatar Picture</h3>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: '800', overflow: 'hidden' }}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        firstName?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || 'S'
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Upload Custom Profile Photo</span>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>Supports JPG, PNG or WEBP (Max 5MB)</span>
                                    <label style={{ ...styles.resumeBtn, cursor: 'pointer', display: 'inline-block', width: 'fit-content', padding: '8px 16px', fontSize: '12px' }}>
                                        {avatarUploading ? 'Uploading Image...' : '📷 Choose Image File'}
                                        <input type="file" accept="image/*" onChange={handleAvatarFileUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Language & Time Locale</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Preferred Interface Language</label>
                                    <select style={styles.select} value={prefLanguage} onChange={e => setPrefLanguage(e.target.value)}>
                                        <option value="English">English</option>
                                        <option value="Amharic">Amharic (አማርኛ)</option>
                                        <option value="Afaan Oromo">Afaan Oromo</option>
                                        <option value="Tigrinya">Tigrinya (ትግርኛ)</option>
                                        <option value="French">French (Français)</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Time Zone</label>
                                    <select style={styles.select} value={timeZone} onChange={e => setTimeZone(e.target.value)}>
                                        <option value="UTC+3 (East Africa Time)">UTC+3 (East Africa Time - Addis Ababa)</option>
                                        <option value="UTC+0 (Greenwich Mean Time)">UTC+0 (Greenwich Mean Time)</option>
                                        <option value="UTC-5 (Eastern Standard Time)">UTC-5 (Eastern Standard Time)</option>
                                        <option value="UTC+1 (Central European Time)">UTC+1 (Central European Time)</option>
                                    </select>
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Appearance Theme Mode</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Current Theme Mode</span>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>Toggle between high contrast dark mode and clean light layout</span>
                                </div>
                                <button type="button" onClick={toggleTheme} style={styles.catalogBtn}>
                                    {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: SECURITY & 2FA */}
                    {settingsSectionTab === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Change Account Password</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Current Password</label>
                                    <input type="password" style={styles.input} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>New Password (Min 8 chars)</label>
                                    <input type="password" style={styles.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Confirm New Password</label>
                                    <input type="password" style={styles.input} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Two-Factor Authentication (2FA)</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Two-Factor Authentication</span>
                                        <span style={{ background: twoFactorEnabled ? `${colors.success}15` : `${colors.danger}15`, color: twoFactorEnabled ? colors.success : colors.danger, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                                        Require an extra security verification code when signing into your student portal
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                    style={{
                                        background: twoFactorEnabled ? colors.success : colors.primary,
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 18px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: PREFERENCES & PRIVACY */}
                    {settingsSectionTab === 'preferences' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Notification & Alert Subscriptions</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.emailAlerts} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, emailAlerts: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Email Alerts & Notifications</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Receive email alerts when assignments are graded or live classes start</span>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.courseUpdates} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, courseUpdates: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Course Curriculum Updates</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Get notified when instructors publish new lessons or quiz modules</span>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.promotions} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, promotions: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Promotional & Platform News</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Receive updates regarding new course releases and discount coupons</span>
                                    </div>
                                </label>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Privacy & Public Profile Visibility</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Public Profile Visibility</span>
                                        <span style={{ background: isPublicProfile ? `${colors.success}15` : `${colors.warning}15`, color: isPublicProfile ? colors.success : colors.warning, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {isPublicProfile ? 'PUBLIC' : 'PRIVATE'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                                        Allow other students and instructors to view your achievements and gamification portfolio
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPublicProfile(!isPublicProfile)}
                                    style={{
                                        background: isPublicProfile ? colors.primary : colors.bgCard,
                                        color: isPublicProfile ? '#fff' : colors.text,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '8px',
                                        padding: '10px 18px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isPublicProfile ? 'Switch to Private' : 'Switch to Public'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" style={{ ...styles.saveBtn, padding: '12px 32px', fontSize: '15px' }}>
                            💾 Save Profile Settings
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );

    const styles = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" },
        sidebar: { width: '260px', background: colors.bgCard, backdropFilter: 'blur(12px)', borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh', zIndex: 10 },
        logoBox: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', paddingLeft: '8px' },
        logo: { width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
        logoText: { color: colors.text, fontWeight: '700', fontSize: '16px' },
        nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
        navItem: { textAlign: 'left', background: 'transparent', border: 'none', color: colors.textMuted, padding: '12px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' },
        catalogBtn: { background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, color: colors.primary, borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
        logoutBtn: { background: `${colors.danger}15`, border: `1px solid ${colors.danger}30`, color: colors.danger, borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
        main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
        greeting: { color: colors.text, fontSize: '28px', fontWeight: '800', margin: 0 },
        subGreeting: { color: colors.textMuted, fontSize: '14px', margin: '4px 0 0' },
        avatar: { width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '20px' },
        loadingBox: { color: colors.textMuted, fontSize: '16px', textAlign: 'center', padding: '100px 0' },
        tabHeader: { marginBottom: '32px' },
        tabTitle: { color: colors.text, fontSize: '22px', fontWeight: '800', margin: 0 },
        tabSubtitle: { color: colors.textMuted, fontSize: '14px', margin: '6px 0 0' },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
        statCard: { background: colors.bgInput, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` },
        statValue: { display: 'block', fontSize: '28px', fontWeight: '800' },
        statLabel: { color: colors.textMuted, fontSize: '12px', fontWeight: '500', marginTop: '4px', display: 'block' },
        panelCard: { background: colors.bgCard, borderRadius: '16px', padding: '32px', border: `1px solid ${colors.border}`, marginBottom: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        panelCardTitle: { color: colors.text, fontSize: '18px', fontWeight: '700', margin: '0 0 20px' },
        recentCourseBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        recentCourseLeft: {},
        recentCourseName: { color: colors.text, fontSize: '16px', fontWeight: '700', margin: '8px 0 4px' },
        recentCourseMeta: { color: colors.textMuted, fontSize: '13px', margin: 0 },
        recentCourseRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
        progressPercent: { color: colors.primary, fontSize: '14px', fontWeight: '700' },
        resumeBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
        lockedBtn: { background: colors.bgInput, color: colors.warning, border: `1px solid ${colors.warning}30`, borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
        emptyContent: { textAlign: 'center', padding: '60px 24px' },
        emptyText: { color: colors.textMuted, fontSize: '14px', marginBottom: '20px' },
        ctaLink: { color: colors.primary, textDecoration: 'none', fontWeight: '700', fontSize: '14px' },
        courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' },
        courseCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' },
        courseBadge: { background: `${colors.primary}15`, color: colors.primary, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', alignSelf: 'flex-start', marginBottom: '12px' },
        courseTitle: { color: colors.text, fontSize: '16px', fontWeight: '700', marginBottom: '16px', lineHeight: '1.4' },
        progressBar: { background: colors.bgInput, borderRadius: '99px', height: '6px', marginBottom: '8px' },
        progressFill: { background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, height: '6px', borderRadius: '99px' },
        progressText: { color: colors.textMuted, fontSize: '12px', marginBottom: '20px' },
        watchBtn: { width: '100%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
        lockedBadge: { background: `${colors.warning}15`, border: `1px solid ${colors.warning}30`, color: colors.warning, borderRadius: '8px', padding: '10px', fontSize: '13px', textAlign: 'center', fontWeight: '600' },
        tableCard: { background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
        thRow: { background: colors.bgInput },
        th: { padding: '16px 24px', color: colors.textMuted, fontSize: '13px', fontWeight: '700' },
        tr: { borderBottom: `1px solid ${colors.border}` },
        td: { padding: '16px 24px', color: colors.text, fontSize: '14px' },
        tdScore: { padding: '16px 24px', color: colors.primary, fontSize: '14px', fontWeight: '700' },
        certCard: { background: colors.bgCard, borderRadius: '16px', padding: '32px', border: `1px solid ${colors.border}`, textAlign: 'center' },
        certIcon: { fontSize: '48px', marginBottom: '16px' },
        certTitle: { color: colors.text, fontSize: '18px', fontWeight: '700', marginBottom: '8px' },
        certMeta: { color: colors.textMuted, fontSize: '13px', marginBottom: '24px' },
        downloadBtn: { background: colors.success, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
        successAlert: { background: `${colors.success}15`, border: `1px solid ${colors.success}30`, color: colors.success, padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: '600' },
        form: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' },
        formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
        label: { color: colors.textMuted, fontSize: '13px', fontWeight: '600' },
        input: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
        select: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
        saveBtn: { background: colors.primary, color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', alignSelf: 'flex-start' },
        goalItem: { padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        
        // ── New Dashboard Layout & Widget Styles ───────────────────
        gridTwoCol: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' },
        dashboardGrid: { display: 'flex', flexDirection: 'column', gap: '24px' },
        welcomeCard: { background: `linear-gradient(135deg, ${colors.primary}10, ${colors.accent}15)`, border: `1px solid ${colors.primary}20`, borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' },
        quoteText: { fontStyle: 'italic', fontSize: '13px', color: colors.textMuted, margin: '8px 0 0', opacity: 0.95 },
        deadlineList: { display: 'flex', flexDirection: 'column', gap: '12px' },
        deadlineItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` },
        priorityBadge: { padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
        liveGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
        liveCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: colors.bgInput, borderLeft: `4px solid ${colors.accent}`, borderTop: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` },
        liveBtn: { background: colors.accent, color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
        tabSwitch: { display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '16px' },
        tabSwitchBtn: { background: 'none', border: 'none', padding: '8px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', outline: 'none' },
        feedList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' },
        feedItem: { padding: '12px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, fontSize: '13px' },
        feedItemMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '6px' },
        recommendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' },
        recommendCard: { background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
        calendarContainer: { background: colors.bgCard, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` },
        calendarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
        calendarMonthYear: { fontWeight: '800', color: colors.text, fontSize: '14px' },
        calendarWeekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' },
        calendarWeekday: { fontSize: '11px', fontWeight: '700', color: colors.textMuted },
        calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
        calendarCell: { height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', position: 'relative', cursor: 'pointer' },
        calendarEmptyCell: { height: '36px' },
        streakGrid: { display: 'flex', gap: '8px', marginTop: '12px' },
        streakDay: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' },
        badgesContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' },
        badgeCard: { padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, textAlign: 'center', transition: 'transform 0.2s', position: 'relative' },
        badgeIcon: { fontSize: '32px', marginBottom: '8px' },
        badgeName: { fontSize: '12px', fontWeight: '700', color: colors.text, display: 'block' },
        badgeDesc: { fontSize: '10px', color: colors.textMuted, marginTop: '4px', display: 'block' }
    };

    return (
        <div style={{ ...styles.page, background: colors.bg, color: colors.text }}>
            {/* Ai Assistant Mock */}
            <AiAssistant context={{ courseName: 'Your Dashboard' }} />

            {/* Sidebar Tab Navigation */}
            <aside style={styles.sidebar}>
                <div style={styles.logoBox}>
                    <div style={styles.logo}>E</div>
                    <span style={styles.logoText}>Emare ELMS</span>
                </div>
                <nav style={styles.nav}>
                    {[
                        { key: 'overview', label: '🏠 Overview' },
                        { key: 'learning', label: '🎓 My Learning' },
                        { key: 'wishlist', label: '💖 Wishlist' },
                        { key: 'assignments', label: '📝 Assignments' },
                        { key: 'quizzes', label: '🧠 Quizzes' },
                        { key: 'grades', label: '📊 Grades' },
                        { key: 'live', label: '📡 Live Sessions' },
                        { key: 'discussions', label: '💬 Discussions' },
                        { key: 'leaderboard', label: '🏆 Leaderboard' },
                        { key: 'messages', label: '✉️ Messages' },
                        { key: 'certificates', label: '🎓 Certificates' },
                        { key: 'payments', label: '💳 Payments' },
                        { key: 'settings', label: '⚙️ Settings' }
                    ].map((tab) => (
                        <button 
                            key={tab.key} 
                            onClick={() => setActiveTab(tab.key)} 
                            style={{ 
                                ...styles.navItem, 
                                background: activeTab === tab.key ? `${colors.primary}15` : 'transparent',
                                color: activeTab === tab.key ? colors.primary : colors.textMuted,
                                borderLeft: activeTab === tab.key ? `3px solid ${colors.primary}` : '3px solid transparent'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={toggleTheme} style={styles.catalogBtn}>
                        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                    <button onClick={() => navigate('/courses')} style={styles.catalogBtn}>📚 Course Catalog</button>
                    <button onClick={() => navigate('/')} style={{ ...styles.catalogBtn, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>🏠 Home Page</button>
                    <button onClick={handleLogout} style={styles.logoutBtn}>↩ Sign Out</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={styles.main}>
                {/* Header */}
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.greeting}>Hello, {user?.fullName?.split(' ')[0]} 👋</h1>
                        <p style={styles.subGreeting}>Empower your mind through Emare Digital Hub</p>
                    </div>
                    <div style={styles.avatar}>{user?.fullName?.[0]?.toUpperCase() || 'S'}</div>
                </header>

                {/* Loading State */}
                {loading ? (
                    <div style={styles.loadingBox}>Loading Dashboard...</div>
                ) : (
                    <div>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'learning' && renderMyLearning()}
                        {activeTab === 'wishlist' && renderWishlist()}
                        {activeTab === 'assignments' && renderAssignments()}
                        {activeTab === 'quizzes' && renderQuizzes()}
                        {activeTab === 'grades' && renderGrades()}
                        {activeTab === 'live' && renderLiveSessions()}
                        {activeTab === 'discussions' && renderDiscussions()}
                        {activeTab === 'leaderboard' && renderLeaderboard()}
                        {activeTab === 'messages' && renderMessages()}
                        {activeTab === 'certificates' && renderCertificates()}
                        {activeTab === 'payments' && renderPayments()}
                        {activeTab === 'settings' && renderSettings()}
                    </div>
                )}
            </main>
        </div>
    );
}
