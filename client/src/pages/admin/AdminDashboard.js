import React, { useState, useEffect } from 'react';
import { courseService, userService, enrollmentService, analyticsService, systemService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDashboard() {
    const { colors, theme } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [settings, setSettings] = useState({
        websiteName: 'Emare E-Learning', maintenanceMode: false, allowRegistration: true, 
        currency: 'ETB', contactEmail: '', paymentGatewayActive: true, cloudinaryActive: true
    });

    // Modal & action states
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [notificationMsg, setNotificationMsg] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, usersRes, coursesRes, enrollmentsRes, settingsRes] = await Promise.all([
                analyticsService.getOverview().catch(() => ({ data: { data: {} } })),
                userService.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
                courseService.getAll().catch(() => ({ data: { data: [] } })),
                enrollmentService.getAll().catch(() => ({ data: { data: [] } })),
                systemService.getSettings().catch(() => ({ data: { data: {} } }))
            ]);

            setAnalytics(analyticsRes.data.data);
            setUsers(usersRes.data.data);
            setAllCourses(coursesRes.data.data || []);
            setEnrollments(enrollmentsRes.data.data);
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

    const handleRoleChange = async (userId, newRole) => {
        try {
            await userService.update(userId, { assignedRole: newRole });
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, assignedRole: newRole } : u));
            showNotification(`User role updated to ${newRole}`);
        } catch (err) {
            alert('Failed to update role.');
        }
    };

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
        try {
            await userService.resetPassword(selectedUser._id, newPassword);
            showNotification(`Password reset successfully for ${selectedUser.fullName}`);
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setSelectedUser(null);
        } catch (err) {
            alert('Failed to reset password.');
        }
    };

    // ── Course Management ──────────────────────────────────────

    const handleApproveCourse = async (id) => {
        try {
            await courseService.approve(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Active' } : c));
            showNotification('Course approved and published');
        } catch (err) {
            alert('Failed to approve course.');
        }
    };

    const handleRejectCourse = async (id) => {
        try {
            await courseService.unpublish(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Draft' } : c));
            showNotification('Course rejected and sent back to Draft');
        } catch (err) {
            alert('Failed to reject course.');
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
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
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
        reportBtn: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, padding: '16px 24px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }
    };

    const renderOverview = () => {
        const revenueData = [
            { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 5200 }, { name: 'Mar', revenue: 6100 },
            { name: 'Apr', revenue: 8400 }, { name: 'May', revenue: 9200 }, { name: 'Jun', revenue: ((analytics?.clearedEnrollments || 0) * 1500) }
        ];
        
        const roleData = [
            { name: 'Students', value: analytics?.totalStudents || 0 },
            { name: 'Instructors', value: analytics?.totalInstructors || 0 },
            { name: 'Admins', value: 1 }
        ];

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>Overview & Analytics</h2>
                    <p style={s.sectionSub}>High-level view of platform performance.</p>
                </div>
                
                <div style={s.statsGrid}>
                    <StatCard label="Total Users" value={analytics?.totalUsers || 0} color={colors.primary} icon="👥" />
                    <StatCard label="Active Enrollments" value={analytics?.totalEnrollments || 0} color={colors.success} icon="🎓" />
                    <StatCard label="Total Courses" value={allCourses.length} color={colors.accent} icon="📚" />
                    <StatCard label="Revenue (ETB)" value={(analytics?.clearedEnrollments || 0) * 1500} color={colors.warning} icon="💰" />
                </div>
                
                <div style={s.cardGrid}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Revenue Growth (YTD)</h3>
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
                        <h3 style={s.cardTitle}>Platform Demographics</h3>
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
            </div>
        );
    };

    const renderUsers = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>User Management</h2>
                <p style={s.sectionSub}>Manage Students, Instructors, and Admins across the platform.</p>
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
                        {users.map(u => (
                            <tr key={u._id}>
                                <td style={s.td}>{u.fullName}</td>
                                <td style={{ ...s.td, color: colors.textMuted }}>{u.accountEmail}</td>
                                <td style={s.td}>
                                    <select value={u.assignedRole} onChange={(e) => handleRoleChange(u._id, e.target.value)} style={s.select}>
                                        <option value="Student">Student</option>
                                        <option value="Instructor">Instructor</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </td>
                                <td style={s.td}>
                                    <span style={{...s.badge, background: u.isActive ? `${colors.success}15` : `${colors.danger}15`, color: u.isActive ? colors.success : colors.danger}}>
                                        {u.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td style={s.td}>
                                    <button onClick={() => handleToggleUserStatus(u)} style={{...s.actionBtn, color: u.isActive ? colors.danger : colors.success}}>
                                        {u.isActive ? 'Suspend' : 'Activate'}
                                    </button>
                                    <button onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); }} style={{...s.actionBtn, color: colors.primary}}>
                                        Reset Pwd
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSecurity = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Security & Roles</h2>
                <p style={s.sectionSub}>Manage RBAC permissions, audit logs, and system security policies.</p>
            </div>
            <div style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Active Sessions</h3>
                    <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '16px' }}>Currently tracking 45 active user sessions. No anomalies detected.</p>
                    <button style={s.secondaryBtn}>Force Logout All Users</button>
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>IP Blacklist</h3>
                    <textarea placeholder="Enter IPs to block (comma separated)" rows="3" style={s.input}></textarea>
                    <button style={{...s.primaryBtn, marginTop: '12px'}}>Update Blacklist</button>
                </div>
            </div>
            <div style={{...s.card, marginTop: '24px'}}>
                <h3 style={s.cardTitle}>Recent Audit Logs</h3>
                <div style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.8 }}>
                    <div>[2026-07-15 09:12:00] Admin (you) updated system settings.</div>
                    <div>[2026-07-15 08:45:22] Instructor "Abeba" published course "React Basics".</div>
                    <div>[2026-07-15 08:30:11] User "Dawit" failed login attempt (IP: 192.168.1.5).</div>
                </div>
            </div>
        </div>
    );

    const renderCourses = () => {
        const pending = allCourses.filter(c => c.publicationState === 'Pending Audit');
        const active = allCourses.filter(c => c.publicationState === 'Active');

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>Course Management</h2>
                    <p style={s.sectionSub}>Approve pending courses, manage categories, and oversee curriculum.</p>
                </div>

                <h3 style={{ color: colors.text, fontSize: '18px', marginBottom: '16px' }}>Audit Queue ({pending.length})</h3>
                {pending.length === 0 ? (
                    <div style={s.emptyState}>No courses pending review.</div>
                ) : pending.map(course => (
                    <div key={course._id} style={s.listItem}>
                        <div style={{ flex: 1 }}>
                            <span style={{...s.badge, background: `${colors.warning}15`, color: colors.warning, marginBottom: '8px', display: 'inline-block'}}>PENDING AUDIT</span>
                            <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                            <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => handleApproveCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Approve</button>
                            <button onClick={() => handleRejectCourse(course._id)} style={{...s.secondaryBtn, color: colors.danger, borderColor: colors.danger}}>Reject</button>
                        </div>
                    </div>
                ))}

                <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Published Courses ({active.length})</h3>
                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Title</th>
                                <th style={s.th}>Category</th>
                                <th style={s.th}>Price</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.map(c => (
                                <tr key={c._id}>
                                    <td style={s.td}>{c.courseTitle}</td>
                                    <td style={{ ...s.td, color: colors.textMuted }}>{c.technicalCategory}</td>
                                    <td style={s.td}>{c.price === 0 ? 'Free' : `ETB ${c.price}`}</td>
                                    <td style={s.td}>
                                        <button onClick={() => handleRejectCourse(c._id)} style={{...s.actionBtn, color: colors.warning}}>Unpublish</button>
                                        <button style={{...s.actionBtn, color: colors.danger}}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.slice(0,5).map(e => (
                                <tr key={e._id}>
                                    <td style={s.td}>{e.studentRef?.fullName}</td>
                                    <td style={s.td}>{e.courseRef?.courseTitle}</td>
                                    <td style={s.td}>ETB {e.courseRef?.price}</td>
                                    <td style={s.td}>
                                        <span style={{...s.badge, background: e.paymentStatus === 'Cleared' ? `${colors.success}15` : `${colors.warning}15`, color: e.paymentStatus === 'Cleared' ? colors.success : colors.warning}}>
                                            {e.paymentStatus}
                                        </span>
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
                        {activeTab === 'content' && renderContent()}
                        {activeTab === 'assessments' && renderAssessments()}
                        {activeTab === 'finances' && renderFinances()}
                        {activeTab === 'cms' && renderCMS()}
                        {activeTab === 'reports' && renderReports()}
                        {activeTab === 'system' && renderSystem()}
                    </>
                )}
            </main>

            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={`Reset Password for ${selectedUser?.fullName}`}>
                <form onSubmit={handlePasswordReset} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 8 chars)" style={s.input} required minLength={8} />
                    <button type="submit" style={s.primaryBtn}>Force Reset Password</button>
                </form>
            </Modal>
        </div>
    );
}
