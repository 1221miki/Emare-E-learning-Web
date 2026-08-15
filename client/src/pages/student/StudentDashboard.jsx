import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    LayoutDashboard, GraduationCap, Heart, ClipboardList, BrainCircuit,
    BarChart3, Video, MessageSquare, Trophy, Mail, Award, CreditCard,
    Settings, BookOpen, Library, SendHorizonal, MessagesSquare, Bell, Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
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
    projectService,
    paymentService
} from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import AiAssistant from '../../components/AiAssistant';
import FeaturedCarousel from '../../components/dashboard/FeaturedCarousel';
import MyCoursesHub from '../../components/dashboard/MyCoursesHub';
import CourseDiscoveryChecklist from '../../components/dashboard/CourseDiscoveryChecklist';
import PromptLibrary from '../../components/PromptLibrary';
import AccountProfileChecklist from '../../components/dashboard/AccountProfileChecklist';
import ProgressOverview from '../../components/dashboard/ProgressOverview';
import LearningHistory from '../../components/dashboard/LearningHistory';
import AchievementsPanel from '../../components/dashboard/AchievementsPanel';
import Inbox from '../../components/comm/Inbox';
import ConversationView from '../../components/comm/ConversationView';
import NotificationsPanel from '../../components/comm/NotificationsPanel';
import PaymentHistory from '../../components/payments/PaymentHistory';
import CertificateList from '../../components/certificates/CertificateList';
import MyReviews from '../../components/reviews/MyReviews';

import { getStudentStyles } from '../../components/dashboard/tabs/studentStyles';
import OverviewTab from '../../components/dashboard/tabs/OverviewTab';
import MyLearningTab from '../../components/dashboard/tabs/MyLearningTab';
import WishlistTab from '../../components/dashboard/tabs/WishlistTab';
import AssignmentsTab from '../../components/dashboard/tabs/AssignmentsTab';
import QuizzesTab from '../../components/dashboard/tabs/QuizzesTab';
import GradesTab from '../../components/dashboard/tabs/GradesTab';
import CertificatesTab from '../../components/dashboard/tabs/CertificatesTab';
import LiveSessionsTab from '../../components/dashboard/tabs/LiveSessionsTab';
import DiscussionsTab from '../../components/dashboard/tabs/DiscussionsTab';
import LeaderboardTab from '../../components/dashboard/tabs/LeaderboardTab';
import MessagesTab from '../../components/dashboard/tabs/MessagesTab';
import PaymentsTab from '../../components/dashboard/tabs/PaymentsTab';
import SettingsTab from '../../components/dashboard/tabs/SettingsTab';
export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();
    
    // Tab State
    const [activeTab, setActiveTab] = useState('overview');

    // Allow sidebar links like /student/dashboard?tab=my_courses to open a specific tab.
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const tabMap = {
            dashboard: 'overview',
            my_courses: 'learning',
            overview: 'overview',
            learning: 'learning',
            wishlist: 'wishlist',
            assignments: 'assignments',
            quizzes: 'quizzes',
            grades: 'grades',
            live: 'live',
            discussions: 'discussions',
            leaderboard: 'leaderboard',
            messages: 'messages',
            certificates: 'certificates',
            payments: 'payments',
            settings: 'settings'
        };
        const requested = searchParams.get('tab');
        if (requested && tabMap[requested]) setActiveTab(tabMap[requested]);
    }, [searchParams]);

    // Data States
    const [enrollments, setEnrollments] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [grades, setGrades] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [paymentStatusList, setPaymentStatusList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dashboard Extra States
    const [allCourses, setAllCourses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);
    const [assignmentsList, setAssignmentsList] = useState([]);
    const [projectsList, setProjectsList] = useState([]);
    const [recentPurchases, setRecentPurchases] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [studyTargetHours, setStudyTargetHours] = useState(() => {
        return Number(localStorage.getItem('student_study_target')) || 10;
    });
    const [profile, setProfile] = useState({});
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

    // Messages sub-section state (controls which sub-tab is shown in MessagesTab)
    // Values: 'inbox' | 'sent' | 'discussions' | 'notifications' | 'ai'
    const [messagesSection, setMessagesSection] = useState('inbox');

    // Helper: navigate to Messages tab and open a specific sub-section
    const openMessagesSection = (section) => {
        setMessagesSection(section);
        setActiveTab('messages');
    };
    const [activeConversation, setActiveConversation] = useState(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [messageSending, setMessageSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [selectedConversation, setSelectedConversation] = useState(null);

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

    // Personalization States
    const [hiddenWidgets, setHiddenWidgets] = useState(() => {
        return JSON.parse(localStorage.getItem('student_hidden_widgets') || '{}');
    });
    const [pinnedCourses, setPinnedCourses] = useState(() => {
        return JSON.parse(localStorage.getItem('student_pinned_courses') || '[]');
    });
    const [assistantPrompt, setAssistantPrompt] = useState({ prompt: '', id: null });

    const toggleWidgetVisibility = (widgetKey) => {
        const updated = { ...hiddenWidgets, [widgetKey]: !hiddenWidgets[widgetKey] };
        setHiddenWidgets(updated);
        localStorage.setItem('student_hidden_widgets', JSON.stringify(updated));
    };

    const togglePinCourse = (courseId) => {
        const updated = pinnedCourses.includes(courseId)
            ? pinnedCourses.filter(id => id !== courseId)
            : [...pinnedCourses, courseId];
        setPinnedCourses(updated);
        localStorage.setItem('student_pinned_courses', JSON.stringify(updated));
    };

    const triggerAssistantPrompt = (prompt) => {
        setAssistantPrompt({ prompt, id: Date.now() });
        setActiveTab('overview');
        window.setTimeout(() => {
            document.querySelector('#ai-assistant-root')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 150);
    };

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
        if (!user) return;

        let cancelled = false;
        const setState = (setter) => (value) => { if (!cancelled) setter(value); };

        // Wrap a fetch so a single failure never blocks the rest of the dashboard.
        const safe = (promise, label) => Promise.resolve(promise)
            .then((res) => res?.data?.data ?? [])
            .catch((err) => {
                console.error(`Failed fetching ${label}:`, err);
                return [];
            });

        const fetchDashboardData = async () => {
            // Enrollments drive the per-course fetches below.
            const activeEnrollments = await safe(courseService.getStudentEnrollments(), 'enrollments');
            setState(setEnrollments)(activeEnrollments);

            const courseId = (e) => e.courseRef?._id || e.courseRef;

            // Per-course content (best-effort; empty on failure).
            const perCoursePromises = activeEnrollments.flatMap((e) => [
                safe(assignmentService.getByCourse(courseId(e)), 'course assignments'),
                safe(quizService.getByCourse(courseId(e)), 'course quizzes'),
                safe(discussionService.getByCourse(courseId(e)), 'discussions')
            ]);

            const [
                profile,
                wishlist,
                grades,
                certs,
                payStatus,
                myAssignments,
                mySubmissions,
                projects,
                recentPurchases,
                allCourses,
                notifications,
                leaderboard,
                conversations,
                myLiveSessions,
                ...perCourseResults
            ] = await Promise.all([
                userService.getProfile()
                    .then((res) => res?.data?.data || {})
                    .catch((err) => {
                        console.error('Failed fetching profile:', err);
                        return {};
                    }),
                safe(wishlistService.getMyWishlist(), 'wishlist'),
                safe(gradebookService.getMyGrades(), 'grades'),
                safe(certificateService.getMine(), 'certificates'),
                typeof enrollmentService.getMyStatus === 'function'
                    ? safe(enrollmentService.getMyStatus(), 'payment status')
                    : Promise.resolve([]),
                safe(assignmentService.getMyAssignments(), 'my assignments'),
                safe(assignmentService.getMySubmissions(), 'my submissions'),
                safe(projectService.getMyProjects(), 'projects'),
                safe(paymentService.history(), 'payment history'),
                safe(courseService.getAll(), 'courses'),
                safe(notificationService.getAll(), 'notifications'),
                safe(leaderboardService.getTop(), 'leaderboard'),
                safe(messageService.getConversations(), 'conversations'),
                safe(liveSessionService.getMySessions(), 'live sessions'),
                ...perCoursePromises
            ]);

            // Apply profile details
            if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
                const u = profile;
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
            setState(setProfile)(profile);

            setState(setWishlist)(wishlist);
            setState(setGrades)(grades);
            setState(setCertificates)(certs);
            setState(setPaymentStatusList)(payStatus);
            setState(setMySubmissions)(mySubmissions);
            setState(setProjectsList)(projects);
            setState(setRecentPurchases)(recentPurchases);
            setState(setAllCourses)(allCourses);
            setState(setNotifications)(notifications);
            setState(setLeaderboard)(leaderboard);
            setState(setConversations)(conversations);

            // Load recently viewed from local storage
            try {
                const viewed = JSON.parse(localStorage.getItem('recently_viewed_courses') || '[]');
                setState(setRecentlyViewed)(viewed);
            } catch { /* invalid localStorage data */ }

            // Per-course content is grouped as [assignments, quizzes, discussions] per enrollment.
            if (activeEnrollments.length > 0) {
                const assignmentData = [];
                const quizData = [];
                const discussionData = [];
                activeEnrollments.forEach((e, i) => {
                    const offset = i * 3;
                    assignmentData.push(perCourseResults[offset]);
                    quizData.push(perCourseResults[offset + 1]);
                    discussionData.push(perCourseResults[offset + 2]);
                });

                setState(setLiveSessions)(myLiveSessions);
                setState(setAllLiveSessions)(myLiveSessions);
                setState(setQuizzesList)(quizData.flat());
                setState(setDiscussionsList)(discussionData.flat());
                // Prefer per-course assignments; fall back to the student-wide list if per-course is empty.
                const perCourseAssignments = assignmentData.flat();
                setState(setAssignmentsList)(perCourseAssignments.length > 0 ? perCourseAssignments : myAssignments);
                setState(setSelectedDiscussionCourse)(activeEnrollments[0].courseRef?._id || activeEnrollments[0].courseRef || '');
            } else {
                setState(setLiveSessions)(myLiveSessions);
                setState(setAllLiveSessions)(myLiveSessions);
                setState(setAssignmentsList)(myAssignments);
            }

            setState(setLoading)(false);
        };

        fetchDashboardData();
        return () => { cancelled = true; };
    }, [user]);

    const assignmentCount = assignmentsList.length;
    const quizCount = quizzesList.length;
    const liveSessionCount = liveSessions?.length || 0;
    const unreadMessagesCount = conversations.length;
    const notificationBadgeCount = notifications.filter(n => !n?.isRead && !n?.read).length;
    const activeEnrollmentCount = enrollments.filter(e => (e.completionPercentage || 0) < 100).length;

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

    const xpPoints = profile?.gamificationPoints ?? user?.gamificationPoints ?? 0;
    const currentLevel = profile?.level ?? user?.level ?? 1;
    const nextLevelXP = 2000;
    const xpProgress = Math.min((xpPoints / nextLevelXP) * 100, 100);

    const studyCompletedHours = Math.round(
        enrollments.reduce((sum, e) => sum + ((e.courseRef?.estimatedDurationHours || 0) * ((e.completionPercentage || 0) / 100)), 0) * 10
    ) / 10;

    const currentCourseContext = enrollments[0]?.courseRef?.courseTitle || user?.fullName?.split(' ')[0] || 'General Study';
    const activeCourses = enrollments.filter(e => (e.completionPercentage || 0) < 100);
    const primaryActiveCourse = activeCourses.length > 0 ? activeCourses[0] : enrollments[0] || {};
    const currentCourseTitle = primaryActiveCourse?.courseRef?.courseTitle || currentCourseContext;
    const currentCourseId = primaryActiveCourse?.courseRef?._id || enrollments[0]?.courseRef?._id || null;
    const currentLessonTitle = primaryActiveCourse?.courseRef?.currentLessonTitle || assignmentsList[0]?.title || quizzesList[0]?.title || 'Your latest lesson';
    const currentProgress = Math.round(primaryActiveCourse?.completionPercentage || 0);
    const quizAverage = grades.length ? Math.round(grades.reduce((sum, grade) => sum + (grade.numericalScoreEarned || 0), 0) / grades.length) : 0;
    const upcomingAssignmentsCount = assignmentsList.filter(a => new Date(a.dueDate || Date.now()) >= new Date()).length;
    const courseAwareness = {
        courseName: currentCourseTitle,
        courseId: currentCourseId,
        currentLessonTitle,
        courseProgress: currentProgress,
        quizAverage,
        upcomingAssignmentsCount,
        summary: `You are currently ${currentProgress}% through ${currentCourseTitle}.`
    };

    const badges = profile?.earnedBadges?.length ? profile.earnedBadges : (user?.earnedBadges || []);


    // Theme-aware shared styles (used by every tab component).
    const styles = useMemo(() => getStudentStyles(colors), [colors]);

    // Shared props handed to every dashboard tab.
    const dash = {
        user,
        logout,
        theme,
        toggleTheme,
        colors,
        activeTab,
        setActiveTab,
        searchParams,
        enrollments,
        setEnrollments,
        wishlist,
        setWishlist,
        grades,
        setGrades,
        certificates,
        setCertificates,
        paymentStatusList,
        setPaymentStatusList,
        loading,
        setLoading,
        allCourses,
        setAllCourses,
        searchQuery,
        setSearchQuery,
        notifications,
        setNotifications,
        liveSessions,
        setLiveSessions,
        assignmentsList,
        setAssignmentsList,
        projectsList,
        setProjectsList,
        recentPurchases,
        setRecentPurchases,
        recentlyViewed,
        setRecentlyViewed,
        studyTargetHours,
        setStudyTargetHours,
        studyCompletedHours,
        notificationTab,
        setNotificationTab,
        mySubmissions,
        setMySubmissions,
        assignmentSubmitText,
        setAssignmentSubmitText,
        assignmentFile,
        setAssignmentFile,
        submittingAssignmentId,
        setSubmittingAssignmentId,
        assignmentMsg,
        setAssignmentMsg,
        quizzesList,
        setQuizzesList,
        activeQuiz,
        setActiveQuiz,
        quizAnswers,
        setQuizAnswers,
        quizResult,
        setQuizResult,
        quizSubmitting,
        setQuizSubmitting,
        allLiveSessions,
        setAllLiveSessions,
        liveFilter,
        setLiveFilter,
        discussionsList,
        setDiscussionsList,
        newDiscussionTitle,
        setNewDiscussionTitle,
        newDiscussionBody,
        setNewDiscussionBody,
        selectedDiscussionCourse,
        setSelectedDiscussionCourse,
        replyText,
        setReplyText,
        expandedDiscussion,
        setExpandedDiscussion,
        discussionMsg,
        setDiscussionMsg,
        leaderboard,
        setLeaderboard,
        conversations,
        setConversations,
        activeConversation,
        setActiveConversation,
        conversationMessages,
        setConversationMessages,
        messageInput,
        setMessageInput,
        messageSending,
        setMessageSending,
        selectedConversation,
        setSelectedConversation,
        firstName,
        setFirstName,
        lastName,
        setLastName,
        username,
        setUsername,
        profileEmail,
        setProfileEmail,
        contactPhone,
        setContactPhone,
        gender,
        setGender,
        dateOfBirth,
        setDateOfBirth,
        country,
        setCountry,
        city,
        setCity,
        address,
        setAddress,
        biography,
        setBiography,
        occupation,
        setOccupation,
        company,
        setCompany,
        website,
        setWebsite,
        linkedInUrl,
        setLinkedInUrl,
        githubUrl,
        setGithubUrl,
        currentPassword,
        setCurrentPassword,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        twoFactorEnabled,
        setTwoFactorEnabled,
        avatarUrl,
        setAvatarUrl,
        prefLanguage,
        setPrefLanguage,
        timeZone,
        setTimeZone,
        notifPreferences,
        setNotifPreferences,
        isPublicProfile,
        setIsPublicProfile,
        profileSuccessMsg,
        setProfileSuccessMsg,
        avatarUploading,
        setAvatarUploading,
        settingsSectionTab,
        setSettingsSectionTab,
        hiddenWidgets,
        setHiddenWidgets,
        pinnedCourses,
        setPinnedCourses,
        assistantPrompt,
        setAssistantPrompt,
        navigate,
        messagesEndRef,
        toggleWidgetVisibility,
        togglePinCourse,
        triggerAssistantPrompt,
        handleToggleWishlist,
        handleMarkNotificationAsRead,
        handleUpdateStudyTarget,
        assignmentCount,
        quizCount,
        liveSessionCount,
        unreadMessagesCount,
        notificationBadgeCount,
        activeEnrollmentCount,
        handleLogout,
        handleAvatarFileUpload,
        handleProfileUpdate,
        completedCoursesCount,
        averageProgress,
        xpPoints,
        currentLevel,
        nextLevelXP,
        xpProgress,
        currentCourseContext,
        activeCourses,
        primaryActiveCourse,
        currentCourseTitle,
        currentLessonTitle,
        currentProgress,
        quizAverage,
        upcomingAssignmentsCount,
        courseAwareness,
        badges,
        styles,
        messagesSection,
        setMessagesSection,
        openMessagesSection,
    };

    // Render the active tab. The "learning" tab stays inline in the return below
    // because it composes several standalone widgets (MyCoursesHub, etc.).
    const renderTab = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab {...dash} />;
            case 'wishlist': return <WishlistTab {...dash} />;
            case 'assignments': return <AssignmentsTab {...dash} />;
            case 'quizzes': return <QuizzesTab {...dash} />;
            case 'grades': return <GradesTab {...dash} />;
            case 'live': return <LiveSessionsTab {...dash} />;
            case 'discussions': return <DiscussionsTab {...dash} />;
            case 'leaderboard': return <LeaderboardTab {...dash} />;
            case 'messages': return <MessagesTab {...dash} />;
            case 'certificates': return <CertificatesTab {...dash} />;
            case 'payments': return <PaymentsTab {...dash} />;
            case 'settings': return <SettingsTab {...dash} />;
            default: return <OverviewTab {...dash} />;
        }
    };
    return (
        <div style={{ ...styles.page, background: colors.bg, color: colors.text }}>
            {/* Ai Assistant Mock */}
            <AiAssistant context={courseAwareness} initialPrompt={assistantPrompt} />

            {/* Sidebar Tab Navigation */}
            <Sidebar 
                navItems={[
                    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} aria-hidden="true" /> },
                    { key: 'learning', label: 'My Learning', icon: <GraduationCap size={18} aria-hidden="true" /> },
                    { key: 'wishlist', label: 'Wishlist', icon: <Heart size={18} aria-hidden="true" /> },
                    { key: 'assignments', label: 'Assignments', icon: <ClipboardList size={18} aria-hidden="true" />, badge: assignmentCount > 0 ? `${assignmentCount}` : null },
                    { key: 'quizzes', label: 'Quizzes', icon: <BrainCircuit size={18} aria-hidden="true" />, badge: quizCount > 0 ? `${quizCount}` : null },
                    { key: 'grades', label: 'Grades', icon: <BarChart3 size={18} aria-hidden="true" /> },
                    { key: 'live', label: 'Live Sessions', icon: <Video size={18} aria-hidden="true" />, badge: liveSessionCount > 0 ? `${liveSessionCount}` : null },
                    { key: 'discussions', label: 'Discussions', icon: <MessageSquare size={18} aria-hidden="true" /> },
                    { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={18} aria-hidden="true" /> },
                    // ── Communication section ────────────────────────────────────────────
                    { key: 'messages',       label: 'Inbox',               icon: <Mail size={18} aria-hidden="true" />, badge: unreadMessagesCount > 0 ? `${unreadMessagesCount}` : null },
                    { key: 'msg:sent',        label: 'Sent Messages',        icon: <SendHorizonal size={18} aria-hidden="true" /> },
                    { key: 'msg:discussions', label: 'Course Discussions',   icon: <MessagesSquare size={18} aria-hidden="true" /> },
                    { key: 'msg:notifications', label: 'Notification Center', icon: <Bell size={18} aria-hidden="true" />, badge: notificationBadgeCount > 0 ? `${notificationBadgeCount}` : null },
                    { key: 'msg:ai',          label: 'AI Tutor',             icon: <Bot size={18} aria-hidden="true" /> },
                    // ────────────────────────────────────────────────────────────────────
                    { key: 'certificates', label: 'Certificates', icon: <Award size={18} aria-hidden="true" /> },
                    { key: 'payments', label: 'Payments', icon: <CreditCard size={18} aria-hidden="true" /> },
                    { key: 'settings', label: 'Settings', icon: <Settings size={18} aria-hidden="true" /> }
                ]}
                activeTab={
                    activeTab === 'messages'
                        ? (messagesSection === 'inbox' ? 'messages' : `msg:${messagesSection}`)
                        : activeTab
                }
                onTabChange={(key) => {
                    if (key.startsWith('msg:')) {
                        const section = key.replace('msg:', '');
                        openMessagesSection(section);
                    } else {
                        setActiveTab(key);
                    }
                }}
                    extraBottomButtons={
                    <button onClick={() => navigate('/courses')} style={styles.catalogBtn}>
                        <Library size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} aria-hidden="true" />
                        Course Catalog
                    </button>
                }
            />

            {/* Main Content Area */}
            <main style={styles.main}>
                {/* Header */}
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.greeting}>Hello, {user?.fullName?.split(' ')[0]}</h1>
                        <p style={styles.subGreeting}>Empower your mind through Emare Digital Hub</p>
                    </div>
                    <div style={styles.avatar}>{user?.fullName?.[0]?.toUpperCase() || 'S'}</div>
                </header>

                {/* Loading State */}
                {!loading && (
                    <div>
                        {activeTab === 'learning' ? (
                            <>
                                <MyCoursesHub 
                                    enrollments={enrollments}
                                    allCourses={allCourses}
                                    wishlist={wishlist}
                                    recentlyViewed={recentlyViewed}
                                    setActiveTab={setActiveTab}
                                    togglePinCourse={togglePinCourse}
                                    pinnedCourses={pinnedCourses}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
                                    <ProgressOverview enrollments={enrollments} certificates={certificates} grades={grades} />
                                    <AchievementsPanel certificates={certificates} badges={[]} />
                                </div>

                                <div style={{ marginTop: 20 }}>
                                    <LearningHistory recentlyViewed={recentlyViewed} enrollments={enrollments} />
                                </div>

                                {/* Quick-navigation shortcuts to dedicated tabs */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20 }}>
                                    {[
                                        { label: '📋 Assignments', tab: 'assignments', desc: 'View & submit assignments' },
                                        { label: '💳 Payments',    tab: 'payments',    desc: 'Payment history & invoices' },
                                        { label: '🏆 Certificates',tab: 'certificates',desc: 'Your earned certificates' },
                                        { label: '✉️ Messages',    tab: 'messages',    desc: 'Inbox & notifications' },
                                    ].map(({ label, tab, desc }) => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', color: colors.text }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                                            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            renderTab()
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
