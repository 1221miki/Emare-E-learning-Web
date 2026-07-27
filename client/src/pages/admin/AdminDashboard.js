import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService, quizService, assignmentService, userService, enrollmentService, analyticsService, systemService, notificationService, authService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDashboard() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [settings, setSettings] = useState({
        websiteName: 'Emare E-Learning', maintenanceMode: false, allowRegistration: true, 
        currency: 'ETB', contactEmail: '', paymentGatewayActive: true, cloudinaryActive: true
    });

    // Modal & action states
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [notificationMsg, setNotificationMsg] = useState('');
    const [userFilter, setUserFilter] = useState('All');
    const [createForm, setCreateForm] = useState({ fullName: '', accountEmail: '', securedPassword: '', assignedRole: 'Student' });
    const [editForm, setEditForm] = useState({ fullName: '', accountEmail: '' });
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [selectedCourseForReview, setSelectedCourseForReview] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [reviewQuizzes, setReviewQuizzes] = useState([]);
    const [reviewAssignments, setReviewAssignments] = useState([]);
    const [isLoadingReviewDetails, setIsLoadingReviewDetails] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, usersRes, coursesRes, enrollmentsRes, settingsRes, notificationsRes] = await Promise.all([
                analyticsService.getOverview().catch(() => ({ data: { data: {} } })),
                userService.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
                courseService.getAdminAll().catch(() => ({ data: { data: [] } })),
                enrollmentService.getAll().catch(() => ({ data: { data: [] } })),
                systemService.getSettings().catch(() => ({ data: { data: {} } })),
                notificationService.getAll().catch(() => ({ data: { data: [] } }))
            ]);

            setAnalytics(analyticsRes.data.data);
            setUsers(usersRes.data.data);
            setAllCourses(coursesRes.data.data || []);
            setEnrollments(enrollmentsRes.data.data);
            setNotifications(notificationsRes.data.data || []);
            if(settingsRes.data?.data) setSettings(settingsRes.data.data);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (msg) => {
        setNotificationMsg(msg);
        setTimeout(() => setNotificationMsg(''), 3000);
    };

    // ── User Management ────────────────────────────────────────

    const handleToggleUserStatus = async (user) => {
        try {
            const newStatus = !user.isActive;
            await userService.update(user._id, { isActive: newStatus });
            setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: newStatus } : u));
            showNotification(`User ${newStatus ? 'activated' : 'deactivated'}`);
        } catch (err) {
            alert('Failed to update user status.');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            // If password is provided, directly set it. Otherwise, send reset email
            const response = await userService.resetPassword(selectedUser._id, newPassword || null);
            showNotification(response.data?.message || `Password reset sent to ${selectedUser.fullName}`);
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setSelectedUser(null);
            setShowResetPassword(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reset password.');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                fullName: createForm.fullName.trim(),
                accountEmail: createForm.accountEmail.trim().toLowerCase(),
                securedPassword: createForm.securedPassword,
                assignedRole: createForm.assignedRole || 'Student'
            };

            const response = await authService.register(payload);
            if (response?.data?.success) {
                showNotification('Student account created successfully');
                setIsCreateModalOpen(false);
                setCreateForm({ fullName: '', accountEmail: '', securedPassword: '' });
                setShowCreatePassword(false);
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create user account.');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            const response = await userService.update(selectedUser._id, {
                fullName: editForm.fullName.trim(),
                accountEmail: editForm.accountEmail.trim().toLowerCase()
            });
            if (response?.data?.success) {
                setUsers(prev => prev.map(user => user._id === selectedUser._id ? { ...user, fullName: editForm.fullName.trim(), accountEmail: editForm.accountEmail.trim().toLowerCase() } : user));
                showNotification('Account updated successfully');
                setIsEditModalOpen(false);
                setSelectedUser(null);
                setEditForm({ fullName: '', accountEmail: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update account.');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Delete ${user.fullName}? This action cannot be undone.`)) {
            return;
        }
        try {
            await userService.deactivate(user._id);
            setUsers(prev => prev.filter(item => item._id !== user._id));
            showNotification(`${user.fullName} has been deleted.`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete account.');
        }
    };

    // ── Course Management ──────────────────────────────────────

    const handleApproveCourse = async (id) => {
        try {
            await courseService.approve(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Published' } : c));
            showNotification('Course approved and published');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve course.');
        }
    };

    const handleRequestRevision = async (id, message = '') => {
        try {
            const res = await courseService.requestRevision(id, message);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course sent back for revisions');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to request revision.');
        }
    };

    const handleRejectCourse = async (id, message = '') => {
        try {
            const res = await courseService.reject(id, message);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course rejected and reverted to Draft');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject course.');
        }
    };

    const handleSendCourseFeedback = async (id, message) => {
        if (!message || !message.trim()) {
            alert('Feedback message is required.');
            return;
        }
        try {
            const res = await courseService.sendFeedback(id, message.trim());
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            setReviewFeedback('');
            showNotification('Feedback sent to instructor');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send feedback.');
        }
    };

    const handleOpenCourseReview = async (course) => {
        setSelectedCourseForReview(course);
        setIsReviewModalOpen(true);
        setReviewFeedback('');
        setReviewQuizzes([]);
        setReviewAssignments([]);
        setIsLoadingReviewDetails(true);

        try {
            const [courseRes, quizRes, assignmentRes] = await Promise.all([
                courseService.getById(course._id).catch(() => ({ data: { data: course } })),
                quizService.getByCourse(course._id).catch(() => ({ data: { data: [] } })),
                assignmentService.getByCourse(course._id).catch(() => ({ data: { data: [] } }))
            ]);

            setSelectedCourseForReview(courseRes.data.data);
            setReviewQuizzes(quizRes.data.data || []);
            setReviewAssignments(assignmentRes.data.data || []);
        } catch (err) {
            console.error('Failed to load review details', err);
        } finally {
            setIsLoadingReviewDetails(false);
        }
    };

    const handleCloseReviewModal = () => {
        setIsReviewModalOpen(false);
        setSelectedCourseForReview(null);
        setReviewQuizzes([]);
        setReviewAssignments([]);
        setReviewFeedback('');
    };

    const handleRequestRevisionWithPrompt = async (id) => {
        const message = window.prompt('Enter revision instructions for the instructor:');
        if (!message) return;
        await handleRequestRevision(id, message);
    };

    const handleRejectCourseWithPrompt = async (id) => {
        const message = window.prompt('Enter rejection notes for the instructor:');
        if (!message) return;
        await handleRejectCourse(id, message);
    };

    const handleArchiveCourse = async (id) => {
        try {
            const res = await courseService.archive(id);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course archived successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to archive course.');
        }
    };

    const handleUnpublishCourse = async (id) => {
        try {
            const res = await courseService.unpublish(id);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course unpublished and moved to Draft');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to unpublish course.');
        }
    };

    const handleRestoreCourse = async (id) => {
        try {
            await courseService.restore(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Draft' } : c));
            showNotification('Course restored to Draft');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to restore course.');
        }
    };

    const handleToggleFeatured = async (id, currentValue) => {
        try {
            const res = await courseService.feature(id, { isFeatured: !currentValue });
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification(res.data.message || `Course ${!currentValue ? 'featured' : 'unfeatured'}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update featured state.');
        }
    };

    const handleAssignInstructor = async (id) => {
        const instructorId = window.prompt('Enter the instructor ID to assign to this course:');
        if (!instructorId) return;
        try {
            const res = await courseService.assignInstructor(id, instructorId.trim());
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Instructor assigned successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign instructor.');
        }
    };

    const handleRemoveInstructor = async (id) => {
        if (!window.confirm('Remove assigned instructor from this course?')) return;
        try {
            const res = await courseService.removeInstructor(id);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Instructor removed successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove instructor.');
        }
    };

    const handleChangeCategory = async (id) => {
        const technicalCategory = window.prompt('Enter the new category for this course:');
        if (!technicalCategory) return;
        try {
            const res = await courseService.changeCategory(id, technicalCategory.trim());
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course category updated successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update category.');
        }
    };

    const handleApprovePayment = async (enrollmentId) => {
        try {
            const response = await enrollmentService.approvePayment(enrollmentId);
            setEnrollments(prev => prev.map(e => e._id === enrollmentId ? { ...e, paymentStatus: response.data.data.paymentStatus, tuitionClearanceFlag: response.data.data.tuitionClearanceFlag } : e));
            showNotification('Payment approved and tuition cleared.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve payment.');
        }
    };

    const handleRejectPayment = async (enrollmentId) => {
        try {
            const response = await enrollmentService.rejectPayment(enrollmentId);
            setEnrollments(prev => prev.map(e => e._id === enrollmentId ? { ...e, paymentStatus: response.data.data.paymentStatus, tuitionClearanceFlag: response.data.data.tuitionClearanceFlag } : e));
            showNotification('Payment rejected and student notified.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject payment.');
        }
    };

    // ── System Management ──────────────────────────────────────

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        try {
            await systemService.updateSettings(settings);
            showNotification('System settings updated successfully');
        } catch (err) {
            alert('Failed to update settings');
        }
    };

    const handleBackup = async () => {
        try {
            const res = await systemService.createBackup();
            showNotification(res.data.message);
        } catch (err) {
            alert('Backup failed');
        }
    };

    const handleClearCache = async () => {
        try {
            const res = await systemService.clearCache();
            showNotification(res.data.message);
        } catch (err) {
            alert('Cache clear failed');
        }
    };

    // ── RENDERERS ──────────────────────────────────────────────

    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg },
        main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
        header: { marginBottom: '32px' },
        greeting: { color: colors.text, fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' },
        notification: { position: 'fixed', top: '24px', right: '24px', background: colors.success, color: '#fff', padding: '16px 24px', borderRadius: '12px', fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1000, animation: 'fadeIn 0.3s ease-out' },
        tabContent: { animation: 'fadeIn 0.3s ease-in-out' },
        sectionHeader: { marginBottom: '32px' },
        sectionTitle: { color: colors.text, fontSize: '24px', fontWeight: '800', margin: '0 0 8px' },
        sectionSub: { color: colors.textMuted, fontSize: '15px', margin: 0 },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' },
        cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', alignItems: 'start' },
        card: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '28px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        cardTitle: { color: colors.text, fontSize: '18px', fontWeight:'700', margin:'0 0 20px' },
        tableContainer: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '16px', border: `1px solid ${colors.border}`, overflowX: 'auto', padding: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: colors.text },
        th: { padding: '16px 24px', color: colors.textMuted, fontSize: '13px', fontWeight: '700', borderBottom: `1px solid ${colors.border}` },
        td: { padding: '16px 24px', fontSize: '14px', borderBottom: `1px solid ${colors.border}` },
        badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' },
        select: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 14px', outline: 'none', width: '100%' },
        actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: '600', padding: '0 8px' },
        emptyState: { padding: '40px', textAlign: 'center', color: colors.textMuted, background: colors.bgInput, borderRadius: '12px', border: `1px dashed ${colors.border}` },
        listItem: { background: colors.bgCard, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${colors.border}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        input: { background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text, padding: '12px 16px', width: '100%', boxSizing:'border-box', outline: 'none' },
        label: { display: 'block', color: colors.textMuted, fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
        primaryBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.1s' },
        secondaryBtn: { background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '12px 24px', fontWeight: '600', cursor: 'pointer' },
        iconBtn: { background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' },
        reportBtn: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, padding: '16px 24px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }
    };

    const renderOverview = () => {
        const revenueData = [
            { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 5200 }, { name: 'Mar', revenue: 6100 },
            { name: 'Apr', revenue: 8400 }, { name: 'May', revenue: 9200 }, { name: 'Jun', revenue: (analytics?.revenueEstimate || 0) }
        ];

        const roleData = [
            { name: 'Students', value: analytics?.totalStudents || 0 },
            { name: 'Instructors', value: analytics?.totalInstructors || 0 },
            { name: 'Admins', value: analytics?.totalAdmins || 0 }
        ];

        const recentUsers = [...users]
            .sort((a, b) => new Date(b.creationTimestamp || 0) - new Date(a.creationTimestamp || 0))
            .slice(0, 5);

        const recentNotifications = [...notifications]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 4);

        const instructorPerformance = [...users.filter((u) => u.assignedRole === 'Instructor')]
            .map((instructor) => {
                const authoredCourses = allCourses.filter((course) => course.creatorRef?._id === instructor._id || course.creatorRef === instructor._id);
                return {
                    name: instructor.fullName,
                    courseCount: authoredCourses.length,
                    enrollments: authoredCourses.reduce((sum, course) => sum + (course.totalEnrollments || 0), 0),
                    rating: authoredCourses.length ? (authoredCourses.reduce((sum, course) => sum + (course.averageRating || 0), 0) / authoredCourses.length).toFixed(1) : '0.0'
                };
            })
            .sort((a, b) => b.enrollments - a.enrollments)
            .slice(0, 4);

        const activityHighlights = [
            { label: 'Published courses', value: analytics?.activeCourses || 0, color: colors.success },
            { label: 'Pending reviews', value: analytics?.pendingCourses || 0, color: colors.warning },
            { label: 'Monthly enrollments', value: analytics?.monthlyEnrollments || 0, color: colors.primary },
            { label: 'Certificates issued', value: analytics?.certificatesIssued || 0, color: colors.accent }
        ];

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>System Overview</h2>
                    <p style={s.sectionSub}>Monitor platform performance, growth, and admin priorities in one place.</p>
                </div>

                <div style={s.statsGrid}>
                    <StatCard label="Total students" value={analytics?.totalStudents || 0} color={colors.primary} icon="🎓" />
                    <StatCard label="Total instructors" value={analytics?.totalInstructors || 0} color={colors.accent} icon="👩‍🏫" />
                    <StatCard label="Total visitors" value={analytics?.totalVisitors || 0} color={colors.success} icon="🌐" />
                    <StatCard label="Total courses" value={analytics?.totalCourses || allCourses.length} color={colors.warning} icon="📚" />
                    <StatCard label="Published courses" value={analytics?.activeCourses || 0} color={colors.success} icon="✅" />
                    <StatCard label="Pending courses" value={analytics?.pendingCourses || 0} color={colors.warning} icon="⏳" />
                    <StatCard label="Draft courses" value={analytics?.draftCourses || 0} color={colors.primary} icon="📝" />
                    <StatCard label="Archived courses" value={analytics?.archivedCourses || 0} color={colors.danger} icon="🗂️" />
                    <StatCard label="Active enrollments" value={analytics?.clearedEnrollments || 0} color={colors.success} icon="🔐" />
                    <StatCard label="Completed courses" value={analytics?.completedCourses || 0} color={colors.accent} icon="🏁" />
                    <StatCard label="Certificates issued" value={analytics?.certificatesIssued || 0} color={colors.primary} icon="🏅" />
                    <StatCard label="Revenue (ETB)" value={analytics?.revenueEstimate || 0} color={colors.warning} icon="💰" />
                </div>

                <div style={s.cardGrid}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Growth and participation</h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={colors.success} stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                                    <XAxis dataKey="name" stroke={colors.textMuted} axisLine={false} tickLine={false} />
                                    <YAxis stroke={colors.textMuted} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Area type="monotone" dataKey="revenue" stroke={colors.success} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Platform demographics</h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                        <Cell fill={colors.primary} />
                                        <Cell fill={colors.accent} />
                                        <Cell fill={colors.success} />
                                    </Pie>
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: colors.text }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div style={{ ...s.cardGrid, marginTop: '24px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Platform activity</h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {activityHighlights.map((item) => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: colors.bgInput }}>
                                    <span style={{ color: colors.textMuted, fontSize: '14px' }}>{item.label}</span>
                                    <span style={{ color: item.color, fontWeight: '800', fontSize: '16px' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '16px', color: colors.textMuted, fontSize: '14px' }}>
                            Student completion rate: <strong style={{ color: colors.text }}>{analytics?.studentCompletionRate || analytics?.completionRate || 0}%</strong>
                        </div>
                    </div>

                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Recent registrations</h3>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {recentUsers.length === 0 ? (
                                <div style={s.emptyState}>No recent registrations yet.</div>
                            ) : recentUsers.map((user) => (
                                <div key={user._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                                    <div>
                                        <div style={{ color: colors.text, fontWeight: '700' }}>{user.fullName}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{user.accountEmail}</div>
                                    </div>
                                    <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{user.assignedRole}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ ...s.cardGrid, marginTop: '24px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Instructor performance</h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {instructorPerformance.length === 0 ? (
                                <div style={s.emptyState}>No instructor activity recorded yet.</div>
                            ) : instructorPerformance.map((item) => (
                                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: colors.bgInput }}>
                                    <div>
                                        <div style={{ color: colors.text, fontWeight: '700' }}>{item.name}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.courseCount} course{item.courseCount === 1 ? '' : 's'} • {item.enrollments} enrollments</div>
                                    </div>
                                    <span style={{ color: colors.accent, fontWeight: '800' }}>{item.rating}/5</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Notifications & quick actions</h3>
                        <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                            {recentNotifications.length === 0 ? (
                                <div style={s.emptyState}>No recent notifications.</div>
                            ) : recentNotifications.map((item) => (
                                <div key={item._id} style={{ padding: '10px 12px', borderRadius: '10px', background: colors.bgInput }}>
                                    <div style={{ color: colors.text, fontWeight: '700', marginBottom: '4px' }}>{item.title}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.message}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <button onClick={() => setActiveTab('users')} style={{ ...s.primaryBtn, padding: '10px 16px' }}>Manage users</button>
                            <button onClick={() => setActiveTab('courses')} style={{ ...s.secondaryBtn, padding: '10px 16px' }}>Review courses</button>
                            <button onClick={() => setActiveTab('finances')} style={{ ...s.secondaryBtn, padding: '10px 16px' }}>View payments</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        const filteredUsers = users.filter((user) => userFilter === 'All' || user.assignedRole === userFilter);
        const activeStudents = users.filter((u) => u.assignedRole === 'Student' && u.isActive);
        const activeInstructors = users.filter((u) => u.assignedRole === 'Instructor' && u.isActive);
        const activeAdmins = users.filter((u) => u.assignedRole === 'Admin' && u.isActive);

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>User Management</h2>
                    <p style={s.sectionSub}>Create, review, edit, suspend, activate, and manage students, instructors, and administrators.</p>
                </div>

                <div style={{ ...s.card, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: colors.text, fontWeight: '800', marginBottom: '6px' }}>Account overview</div>
                            <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                                Students: {activeStudents.length} • Instructors: {activeInstructors.length} • Admins: {activeAdmins.length}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={s.select}>
                                <option value="All">All accounts</option>
                                <option value="Student">Students</option>
                                <option value="Instructor">Instructors</option>
                                <option value="Admin">Admins</option>
                            </select>
                            <button onClick={() => setIsCreateModalOpen(true)} style={s.primaryBtn}>Create account</button>
                        </div>
                    </div>
                </div>

                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Name</th>
                                <th style={s.th}>Email</th>
                                <th style={s.th}>Role</th>
                                <th style={s.th}>Status</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => (
                                <tr key={u._id}>
                                    <td style={s.td}>{u.fullName}</td>
                                    <td style={{ ...s.td, color: colors.textMuted }}>{u.accountEmail}</td>
                                    <td style={s.td}>
                                        <span style={{ color: colors.text, fontWeight: '700' }}>{u.assignedRole}</span>
                                    </td>
                                    <td style={s.td}>
                                        <span style={{...s.badge, background: u.isActive ? `${colors.success}15` : `${colors.danger}15`, color: u.isActive ? colors.success : colors.danger}}>
                                            {u.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => navigate(`/admin/users/${u._id}`)} style={{...s.actionBtn, color: colors.accent}}>
                                                View Profile
                                            </button>
                                            <button onClick={() => handleToggleUserStatus(u)} style={{...s.actionBtn, color: u.isActive ? colors.danger : colors.success}}>
                                                {u.isActive ? 'Suspend' : 'Activate'}
                                            </button>
                                            <button onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); }} style={{...s.actionBtn, color: colors.primary}}>
                                                Reset password
                                            </button>
                                            <button onClick={() => handleDeleteUser(u)} style={{...s.actionBtn, color: colors.danger}}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderSecurity = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Security & Roles</h2>
                <p style={s.sectionSub}>Manage RBAC permissions, audit logs, and system security policies.</p>
            </div>
            <div style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>RBAC Enforcement</h3>
                    <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '16px' }}>
                        All protected API endpoints are guarded by role-based middleware. Only Administrators can manage users, system settings, and platform-wide policies.
                    </p>
                    <ul style={{ paddingLeft: '18px', color: colors.textMuted, fontSize: '14px', lineHeight: 1.7 }}>
                        <li>Create / update / delete user roles</li>
                        <li>Assign permissions to accounts</li>
                        <li>Enforce module, page and action access</li>
                    </ul>
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Login Restrictions</h3>
                    <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '16px' }}>
                        Suspended or deactivated users cannot perform protected actions. The login flow is secured by JWT tokens stored in HTTP-only cookies.
                    </p>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ ...s.badge, background: `${colors.warning}15`, color: colors.warning }}>Account suspension</div>
                        <div style={{ ...s.badge, background: `${colors.danger}15`, color: colors.danger }}>Deactivated login blocked</div>
                        <div style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>Session invalidation support</div>
                    </div>
                </div>
            </div>
            <div style={{ ...s.card, marginTop: '24px' }}>
                <h3 style={s.cardTitle}>Permission Matrix</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
                    <thead>
                        <tr>
                            <th style={{ ...s.th, textAlign: 'left' }}>Scope</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>Student</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>Instructor</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={s.td}>Page access</td>
                            <td style={s.td}>Student dashboard</td>
                            <td style={s.td}>Instructor dashboard</td>
                            <td style={s.td}>Admin dashboard</td>
                        </tr>
                        <tr>
                            <td style={s.td}>Module access</td>
                            <td style={s.td}>Courses, quizzes</td>
                            <td style={s.td}>Course authoring</td>
                            <td style={s.td}>User & system control</td>
                        </tr>
                        <tr>
                            <td style={s.td}>Action permissions</td>
                            <td style={s.td}>Enroll / review</td>
                            <td style={s.td}>Publish / grade</td>
                            <td style={s.td}>Manage users / settings</td>
                        </tr>
                        <tr>
                            <td style={s.td}>API permissions</td>
                            <td style={s.td}>Student-only endpoints</td>
                            <td style={s.td}>Instructor-only endpoints</td>
                            <td style={s.td}>Admin-only endpoints</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{...s.card, marginTop: '24px'}}>
                <h3 style={s.cardTitle}>Audit Logs</h3>
                <div style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.8 }}>
                    <div>[2026-07-15 09:12:00] Admin (you) updated system settings.</div>
                    <div>[2026-07-15 08:45:22] Instructor "Abeba" published course "React Basics".</div>
                    <div>[2026-07-15 08:30:11] User "Dawit" failed login attempt (IP: 192.168.1.5).</div>
                </div>
            </div>
        </div>
    );

    const renderProgress = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Student Progress Monitoring</h2>
                <p style={s.sectionSub}>Track learning progress, completion, assessments, attendance, certificates, and performance trends.</p>
            </div>

            <div style={s.statsGrid}>
                <StatCard label="Active students" value={analytics?.totalStudents || 0} color={colors.primary} icon="👥" />
                <StatCard label="Completion rate" value={`${analytics?.completionRate || 0}%`} color={colors.success} icon="📈" />
                <StatCard label="Attendance rate" value={`${analytics?.attendanceRate || 0}%`} color={colors.accent} icon="🕒" />
                <StatCard label="Top performers" value={(analytics?.topPerformers || []).length} color={colors.warning} icon="🏅" />
                <StatCard label="Failed assessments" value={analytics?.failedAssessments || 0} color={colors.danger} icon="❌" />
                <StatCard label="Certificates issued" value={analytics?.certificatesIssued || 0} color={colors.success} icon="🎓" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Assessment Summary</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Total quiz attempts</span>
                            <strong style={{ color: colors.text }}>{analytics?.totalQuizAttempts || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Average quiz score</span>
                            <strong style={{ color: colors.text }}>{analytics?.averageAssessmentScore || 0}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Graded assignments</span>
                            <strong style={{ color: colors.text }}>{analytics?.gradedAssignments || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Average assignment score</span>
                            <strong style={{ color: colors.text }}>{analytics?.averageAssignmentScore || 0}%</strong>
                        </div>
                    </div>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Performance and Risk</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Students at risk</span>
                            <strong style={{ color: colors.danger }}>{analytics?.studentsAtRisk || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Learning history records</span>
                            <strong style={{ color: colors.text }}>{(analytics?.learningHistory?.recentEnrollments?.length || 0) + (analytics?.learningHistory?.recentAssessments?.length || 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Recent enrollments</span>
                            <strong style={{ color: colors.text }}>{analytics?.learningHistory?.recentEnrollments?.length || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Recent graded assessments</span>
                            <strong style={{ color: colors.text }}>{analytics?.learningHistory?.recentAssessments?.length || 0}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Top performers</h3>
                    {analytics?.topPerformers?.length ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {analytics.topPerformers.map((student, index) => (
                                <div key={index} style={{ padding: '14px', background: colors.bgInput, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text, fontWeight: '700' }}>{student.studentName}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{student.avgScore}% avg • {student.totalAttempts} attempts</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={s.emptyState}>No top performer data available.</div>
                    )}
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Latest certificates</h3>
                    {analytics?.certificatesIssued ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ padding: '14px', background: colors.bgInput, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                <div style={{ color: colors.text, fontWeight: '700' }}>Certificates issued</div>
                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{analytics.certificatesIssued} certificates have been granted to learners.</div>
                            </div>
                            <div style={{ padding: '14px', background: colors.bgInput, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                <div style={{ color: colors.text, fontWeight: '700' }}>Earned credential coverage</div>
                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>Track how many enrolled learners complete their course awards.</div>
                            </div>
                        </div>
                    ) : (
                        <div style={s.emptyState}>No certificate activity yet.</div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '18px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Recent learning history</h3>
                    {analytics?.learningHistory?.recentEnrollments?.length || analytics?.learningHistory?.recentAssessments?.length ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {analytics.learningHistory?.recentEnrollments?.map((item, idx) => (
                                <div key={`enroll-${idx}`} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <strong style={{ color: colors.text }}>{item.studentName}</strong> enrolled in <strong>{item.courseTitle}</strong>
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.completionPercentage}% complete</div>
                                </div>
                            ))}
                            {analytics.learningHistory?.recentAssessments?.map((item, idx) => (
                                <div key={`assess-${idx}`} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <strong style={{ color: colors.text }}>{item.studentName}</strong> scored <strong>{item.score}%</strong> on {item.assessmentTitle}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={s.emptyState}>No recent learning history available.</div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderCourses = () => {
        const drafts = allCourses.filter(c => c.publicationState === 'Draft');
        const pending = allCourses.filter(c => c.publicationState === 'Pending Review');
        const revisionNeeded = allCourses.filter(c => c.publicationState === 'Revision Needed');
        const published = allCourses.filter(c => ['Published', 'Active'].includes(c.publicationState));
        const archived = allCourses.filter(c => c.publicationState === 'Archived');

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>Course Management</h2>
                    <p style={s.sectionSub}>Approve pending courses, manage categories, assign instructors, and oversee the full lifecycle.</p>
                </div>

                <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Draft</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{drafts.length} course(s) still in draft and awaiting author completion.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Pending Review</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{pending.length} course(s) awaiting admin approval.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Revision Needed</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{revisionNeeded.length} course(s) requiring instructor updates.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Published</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{published.length} active courses visible to learners.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Archived</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{archived.length} archived courses.</p>
                    </div>
                </div>

                {drafts.length > 0 && (
                    <>
                        <h3 style={{ color: colors.text, fontSize: '18px', margin: '0 0 16px' }}>Draft Courses ({drafts.length})</h3>
                        {drafts.map(course => (
                            <div key={course._id} style={s.listItem}>
                                <div style={{ flex: 1 }}>
                                    <span style={{...s.badge, background: `${colors.warning}15`, color: colors.warning, marginBottom: '8px', display: 'inline-block'}}>DRAFT</span>
                                    <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleAssignInstructor(course._id)} style={{...s.secondaryBtn, color: colors.primary, borderColor: colors.primary}}>Assign Instructor</button>
                                    <button onClick={() => handleChangeCategory(course._id)} style={{...s.secondaryBtn, color: colors.accent, borderColor: colors.accent}}>Change Category</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <h3 style={{ color: colors.text, fontSize: '18px', marginBottom: '16px' }}>Review Queue ({pending.length})</h3>
                {pending.length === 0 ? (
                    <div style={s.emptyState}>No courses pending review.</div>
                ) : pending.map(course => (
                    <div key={course._id} style={s.listItem}>
                        <div style={{ flex: 1 }}>
                            <span style={{...s.badge, background: `${colors.warning}15`, color: colors.warning, marginBottom: '8px', display: 'inline-block'}}>PENDING REVIEW</span>
                            <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                            <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleOpenCourseReview(course)} style={{...s.secondaryBtn, color: colors.primary, borderColor: colors.primary}}>Review</button>
                            <button onClick={() => handleApproveCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Approve</button>
                            <button onClick={() => handleRequestRevisionWithPrompt(course._id)} style={{...s.secondaryBtn, color: colors.warning, borderColor: colors.warning}}>Request Revision</button>
                            <button onClick={() => handleRejectCourseWithPrompt(course._id)} style={{...s.secondaryBtn, color: colors.danger, borderColor: colors.danger}}>Reject</button>
                        </div>
                    </div>
                ))}

                {revisionNeeded.length > 0 && (
                    <>
                        <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Revision Needed ({revisionNeeded.length})</h3>
                        {revisionNeeded.map(course => (
                            <div key={course._id} style={s.listItem}>
                                <div style={{ flex: 1 }}>
                                    <span style={{...s.badge, background: `${colors.danger}15`, color: colors.danger, marginBottom: '8px', display: 'inline-block'}}>REVISION NEEDED</span>
                                    <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleApproveCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Publish</button>
                                    <button onClick={() => handleRejectCourse(course._id)} style={{...s.secondaryBtn, color: colors.danger, borderColor: colors.danger}}>Revert to Draft</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Published Courses ({published.length})</h3>
                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Title</th>
                                <th style={s.th}>Status</th>
                                <th style={s.th}>Category</th>
                                <th style={s.th}>Instructor</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {published.map(c => (
                                <tr key={c._id}>
                                    <td style={s.td}>{c.courseTitle}</td>
                                    <td style={s.td}><span style={{ ...s.badge, background: `${colors.success}15`, color: colors.success }}>{c.publicationState}</span></td>
                                    <td style={s.td}>{c.technicalCategory}</td>
                                    <td style={s.td}>{c.assignedInstructorRef?.fullName || c.creatorRef?.fullName || 'Unassigned'}</td>
                                    <td style={s.td}>
                                        <button onClick={() => handleUnpublishCourse(c._id)} style={{...s.actionBtn, color: colors.warning}}>Unpublish</button>
                                        <button onClick={() => handleArchiveCourse(c._id)} style={{...s.actionBtn, color: colors.danger}}>Archive</button>
                                        <button onClick={() => handleToggleFeatured(c._id, c.isFeatured)} style={{...s.actionBtn, color: colors.primary}}>{c.isFeatured ? 'Unfeature' : 'Feature'}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {archived.length > 0 && (
                    <>
                        <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Archived Courses ({archived.length})</h3>
                        {archived.map(course => (
                            <div key={course._id} style={s.listItem}>
                                <div style={{ flex: 1 }}>
                                    <span style={{...s.badge, background: `${colors.danger}15`, color: colors.danger, marginBottom: '8px', display: 'inline-block'}}>ARCHIVED</span>
                                    <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Category: {course.technicalCategory} | Instructor: {course.assignedInstructorRef?.fullName || course.creatorRef?.fullName}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleRestoreCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Restore</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        );
    };

    const renderContent = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Content & Moderation</h2>
                <p style={s.sectionSub}>Manage videos, files, and moderate user-generated content (reviews, discussions).</p>
            </div>
            <div style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Reported Reviews</h3>
                    <div style={s.emptyState}>No reviews have been flagged for moderation.</div>
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Discussion Moderation</h3>
                    <div style={s.emptyState}>No spam detected in discussion forums.</div>
                </div>
            </div>
        </div>
    );

    const renderAssessments = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Assessments & Certificates</h2>
                <p style={s.sectionSub}>Oversee quizzes, assignments, and manage certificate templates.</p>
            </div>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Certificate Templates</h3>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ width: '200px', height: '140px', background: `linear-gradient(135deg, ${colors.bgInput}, ${colors.bgCard})`, border: `2px solid ${colors.primary}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.primary, fontWeight: 'bold' }}>Standard Template</div>
                    <div style={{ width: '200px', height: '140px', background: colors.bgInput, border: `2px dashed ${colors.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, cursor: 'pointer' }}>+ New Template</div>
                </div>
            </div>
        </div>
    );

    const renderFinances = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Finances & Revenue</h2>
                <p style={s.sectionSub}>Manage payments, manual clearings, instructor payouts, and refunds.</p>
            </div>
            <div style={s.statsGrid}>
                <StatCard label="Total Revenue" value={`ETB ${(analytics?.clearedEnrollments || 0) * 1500}`} color={colors.success} icon="💵" />
                <StatCard label="Pending Payouts" value="ETB 0" color={colors.warning} icon="⏳" />
                <StatCard label="Refunds Processed" value="0" color={colors.danger} icon="↩️" />
            </div>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Recent Transactions</h3>
                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Student</th>
                                <th style={s.th}>Course</th>
                                <th style={s.th}>Amount</th>
                                <th style={s.th}>Status</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.slice(0,5).map(e => (
                                <tr key={e._id}>
                                    <td style={s.td}>{e.studentRef?.fullName}</td>
                                    <td style={s.td}>{e.courseRef?.courseTitle}</td>
                                    <td style={s.td}>ETB {e.courseRef?.price}</td>
                                    <td style={s.td}>
                                        <span style={{...s.badge, background: e.paymentStatus === 'Cleared' ? `${colors.success}15` : e.paymentStatus === 'Pending Verification' ? `${colors.warning}15` : `${colors.danger}15`, color: e.paymentStatus === 'Cleared' ? colors.success : e.paymentStatus === 'Pending Verification' ? colors.warning : colors.danger}}>
                                            {e.paymentStatus}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        {e.paymentStatus === 'Pending Verification' ? (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleApprovePayment(e._id)} style={{ ...s.actionBtn, color: colors.success, borderColor: colors.success }}>
                                                    Approve
                                                </button>
                                                <button onClick={() => handleRejectPayment(e._id)} style={{ ...s.actionBtn, color: colors.danger, borderColor: colors.danger }}>
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: colors.textMuted, fontSize: '13px' }}>No action</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderCMS = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>CMS & Communications</h2>
                <p style={s.sectionSub}>Send announcements, manage homepage content, and email broadcasts.</p>
            </div>
            <div style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>System Announcement</h3>
                    <textarea placeholder="Write a broadcast message to all users..." rows="4" style={s.input}></textarea>
                    <button style={{...s.primaryBtn, marginTop: '12px'}}>Send Broadcast</button>
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Homepage Banners</h3>
                    <div style={s.emptyState}>No custom banners configured.</div>
                    <button style={{...s.secondaryBtn, marginTop: '12px'}}>Upload Banner</button>
                </div>
            </div>
        </div>
    );

    const renderReports = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Reports & Exports</h2>
                <p style={s.sectionSub}>Generate and export PDF/CSV reports for platform analytics.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button style={s.reportBtn}>📄 Export User Report (CSV)</button>
                <button style={s.reportBtn}>📄 Export Revenue Report (CSV)</button>
                <button style={s.reportBtn}>📄 Export Course Completion (PDF)</button>
            </div>
        </div>
    );

    const renderSystem = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>System Settings</h2>
                <p style={s.sectionSub}>Global configuration, integrations, API keys, and backups.</p>
            </div>
            
            <form onSubmit={handleUpdateSettings} style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>General Settings</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Website Name</label>
                        <input type="text" value={settings.websiteName} onChange={e => setSettings({...settings, websiteName: e.target.value})} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Contact Email</label>
                        <input type="email" value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Currency</label>
                        <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} style={s.select}>
                            <option value="ETB">ETB (Ethiopian Birr)</option>
                            <option value="USD">USD (US Dollar)</option>
                        </select>
                    </div>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>System Toggles</h3>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                        Enable Maintenance Mode
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={settings.allowRegistration} onChange={e => setSettings({...settings, allowRegistration: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                        Allow New User Registration
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={settings.requireEmailVerification} onChange={e => setSettings({...settings, requireEmailVerification: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                        Require Email Verification
                    </label>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px' }}>
                    <button type="submit" style={s.primaryBtn}>Save Configuration</button>
                    <button type="button" onClick={handleBackup} style={{...s.secondaryBtn, borderColor: colors.success, color: colors.success}}>Trigger DB Backup</button>
                    <button type="button" onClick={handleClearCache} style={{...s.secondaryBtn, borderColor: colors.danger, color: colors.danger}}>Clear System Cache</button>
                </div>
            </form>
        </div>
    );

    const sidebarItems = [
        { key: 'overview', label: '🏠 Overview' },
        { key: 'users', label: '👥 User Management' },
        { key: 'security', label: '🛡️ Security & Roles' },
        { key: 'courses', label: '📚 Course Management' },
        { key: 'progress', label: '📊 Student Progress' },
        { key: 'content', label: '💬 Content & Moderation' },
        { key: 'assessments', label: '📝 Assessments & Certs' },
        { key: 'finances', label: '💰 Finances & Revenue' },
        { key: 'cms', label: '📢 CMS & Comms' },
        { key: 'reports', label: '📊 Reports & Exports' },
        { key: 'system', label: '⚙️ System Settings' }
    ];

    return (
        <div style={s.page}>
            <Sidebar navItems={sidebarItems} activeTab={activeTab} onTabChange={setActiveTab} />
            
            <main style={s.main}>
                <header style={s.header}>
                    <h1 style={s.greeting}>Admin Portal</h1>
                </header>

                {notificationMsg && (
                    <div style={s.notification}>
                        {notificationMsg}
                    </div>
                )}

                {loading ? (
                    <div style={{padding:'40px', color:colors.textMuted}}>Loading system data...</div>
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'security' && renderSecurity()}
                        {activeTab === 'courses' && renderCourses()}
                        {activeTab === 'progress' && renderProgress()}
                        {activeTab === 'content' && renderContent()}
                        {activeTab === 'assessments' && renderAssessments()}
                        {activeTab === 'finances' && renderFinances()}
                        {activeTab === 'cms' && renderCMS()}
                        {activeTab === 'reports' && renderReports()}
                        {activeTab === 'system' && renderSystem()}
                    </>
                )}
            </main>

            <Modal isOpen={isReviewModalOpen} onClose={handleCloseReviewModal} title="Review Course">
                {isLoadingReviewDetails ? (
                    <div style={{ padding: '24px', color: colors.textMuted }}>Loading course review details...</div>
                ) : selectedCourseForReview ? (
                    <div style={{ display: 'grid', gap: '18px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 8px', color: colors.text }}>{selectedCourseForReview.courseTitle}</h3>
                            <p style={{ color: colors.textMuted, margin: 0 }}>{selectedCourseForReview.courseShortDescription || selectedCourseForReview.courseDescription}</p>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ ...s.badge, background: `${colors.warning}15`, color: colors.warning }}>{selectedCourseForReview.publicationState}</span>
                                <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{selectedCourseForReview.technicalCategory}</span>
                                <span style={{ ...s.badge, background: `${colors.accent}15`, color: colors.accent }}>{selectedCourseForReview.creatorRef?.fullName || selectedCourseForReview.assignedInstructorRef?.fullName || 'Unknown Instructor'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {selectedCourseForReview.previewVideoUrl ? (
                                <div>
                                    <div style={{ marginBottom: '8px', color: colors.text, fontWeight: '700' }}>Preview video</div>
                                    <video src={selectedCourseForReview.previewVideoUrl} controls style={{ width: '100%', borderRadius: '12px', background: '#000' }} />
                                </div>
                            ) : (
                                <div style={s.emptyState}>No preview video provided for this course.</div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 8px', color: colors.text }}>Course description</h4>
                                <p style={{ color: colors.textMuted, lineHeight: 1.7 }}>{selectedCourseForReview.courseDescription || 'No description available.'}</p>
                            </div>

                            <div>
                                <h4 style={{ margin: '0 0 8px', color: colors.text }}>Curriculum overview</h4>
                                {selectedCourseForReview.curriculumTree?.length ? (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {selectedCourseForReview.curriculumTree.map((section, idx) => (
                                            <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                                <div style={{ fontWeight: '700', color: colors.text, marginBottom: '8px' }}>{section.sectionTitle || `Section ${idx + 1}`}</div>
                                                <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                                                    {section.lessons?.map((lesson, lessonIdx) => (
                                                        <div key={lessonIdx} style={{ marginBottom: '6px' }}>
                                                            • {lesson.lessonTitle || 'Untitled lesson'} ({lesson.durationMinutes || '---'} min)
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={s.emptyState}>No curriculum details published.</div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '10px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', color: colors.text }}>Quizzes</h4>
                                    {reviewQuizzes.length ? (
                                        reviewQuizzes.map((quiz) => (
                                            <div key={quiz._id} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
                                                <strong style={{ color: colors.text }}>{quiz.title}</strong>
                                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{quiz.questionCount || quiz.questions?.length || 'Unknown'} questions</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={s.emptyState}>No quizzes attached to this course.</div>
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 8px', color: colors.text }}>Assignments</h4>
                                    {reviewAssignments.length ? (
                                        reviewAssignments.map((assignment) => (
                                            <div key={assignment._id} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
                                                <strong style={{ color: colors.text }}>{assignment.title}</strong>
                                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>Due in {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={s.emptyState}>No assignments attached to this course.</div>
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 8px', color: colors.text }}>Resources</h4>
                                    {selectedCourseForReview.resources?.length ? (
                                        <ul style={{ margin: 0, paddingLeft: '18px', color: colors.textMuted }}>
                                            {selectedCourseForReview.resources.map((resource, idx) => (
                                                <li key={idx}>{resource.name || resource.title || 'Resource item'}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={s.emptyState}>No course resources listed.</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Send feedback / request changes</label>
                                    <textarea value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder="Enter guidance or revision instructions" style={{ ...s.input, minHeight: '100px' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => handleSendCourseFeedback(selectedCourseForReview._id, reviewFeedback)} style={{ ...s.primaryBtn }}>Send Feedback</button>
                                    <button type="button" onClick={() => handleRequestRevision(selectedCourseForReview._id, reviewFeedback || 'Please revise the course content.')} style={{ ...s.secondaryBtn, borderColor: colors.warning, color: colors.warning }}>Request Revision</button>
                                    <button type="button" onClick={() => handleApproveCourse(selectedCourseForReview._id)} style={{ ...s.secondaryBtn, borderColor: colors.success, color: colors.success }}>Approve</button>
                                    <button type="button" onClick={() => handleRejectCourse(selectedCourseForReview._id, reviewFeedback || 'Course does not meet quality standards.')} style={{ ...s.secondaryBtn, borderColor: colors.danger, color: colors.danger }}>Reject</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '24px', color: colors.textMuted }}>No course selected for review.</div>
                )}
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Account">
                <form onSubmit={handleCreateUser} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div>
                        <label style={s.label}>Full name</label>
                        <input type="text" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="Enter full name" style={s.input} required />
                    </div>
                    <div>
                        <label style={s.label}>Email address</label>
                        <input type="email" value={createForm.accountEmail} onChange={(e) => setCreateForm({ ...createForm, accountEmail: e.target.value })} placeholder="Enter email" style={s.input} required />
                    </div>
                    <div>
                        <label style={s.label}>Temporary password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showCreatePassword ? 'text' : 'password'} value={createForm.securedPassword} onChange={(e) => setCreateForm({ ...createForm, securedPassword: e.target.value })} placeholder="Minimum 8 characters" style={{ ...s.input, paddingRight: '44px' }} required minLength={8} />
                            <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} style={{ ...s.iconBtn, position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>{showCreatePassword ? '🙈' : '👁️'}</button>
                        </div>
                    </div>
                    <div>
                        <label style={s.label}>Role</label>
                        <select value={createForm.assignedRole} onChange={(e) => setCreateForm({ ...createForm, assignedRole: e.target.value })} style={s.select}>
                            <option value="Student">Student</option>
                            <option value="Instructor">Instructor</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" style={s.primaryBtn}>Create Account</button>
                </form>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); setEditForm({ fullName: '', accountEmail: '' }); }} title={`Edit Account - ${selectedUser?.fullName || ''}`}>
                <form onSubmit={handleEditUser} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div>
                        <label style={s.label}>Full name</label>
                        <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} style={s.input} required />
                    </div>
                    <div>
                        <label style={s.label}>Email address</label>
                        <input type="email" value={editForm.accountEmail} onChange={(e) => setEditForm({ ...editForm, accountEmail: e.target.value })} style={s.input} required />
                    </div>
                    <button type="submit" style={s.primaryBtn}>Save Changes</button>
                </form>
            </Modal>

            <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setSelectedUser(null); setNewPassword(''); setShowResetPassword(false); }} title={`Reset Password for ${selectedUser?.fullName}`}>
                <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <p style={{color:'#666', fontSize:'14px', margin:'0 0 12px'}}>Choose how to reset the password:</p>
                    
                    {/* Option 1: Send Reset Email */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            setNewPassword('');
                            handlePasswordReset(e);
                        }}
                        style={{...s.primaryBtn, background:'#10b981', marginBottom:'12px'}}
                    >
                        📧 Send Password Reset Email
                    </button>
                    <p style={{textAlign:'center', color:'#999', fontSize:'12px'}}>User receives email with reset link (expires in 15 mins)</p>

                    <div style={{borderTop:'1px solid #eee', padding:'12px 0', textAlign:'center', color:'#999', fontSize:'12px'}}>
                        OR
                    </div>

                    {/* Option 2: Force Reset */}
                    <form onSubmit={handlePasswordReset} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        <label style={{fontSize:'13px', fontWeight:'500', color:'#333'}}>Force Reset with New Password:</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showResetPassword ? 'text' : 'password'} 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="Enter new temporary password (min 8 chars)" 
                                style={{ ...s.input, paddingRight: '44px' }} 
                                minLength={8} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowResetPassword(!showResetPassword)} 
                                style={{ ...s.iconBtn, position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                            >
                                {showResetPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <button type="submit" style={{...s.primaryBtn, background:'#f59e0b', opacity: newPassword.length >= 8 ? 1 : 0.5}} disabled={newPassword.length < 8}>
                            🔄 Force Reset Password
                        </button>
                    </form>
                    <p style={{fontSize:'12px', color:'#d32f2f', marginTop:'8px'}}>⚠️ Direct reset: User account is immediately changed. A confirmation email will be sent.</p>
                </div>
            </Modal>
        </div>
    );
}
