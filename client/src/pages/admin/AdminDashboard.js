import React, { useState, useEffect } from 'react';
import { courseService, userService, enrollmentService, analyticsService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('analytics');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [pendingCourses, setPendingCourses] = useState([]);
    const [activeCourses, setActiveCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);

    // Modal states
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, usersRes, coursesRes, enrollmentsRes] = await Promise.all([
                analyticsService.getOverview().catch(() => ({ data: { data: {} } })),
                userService.getAll({ limit: 50 }).catch(() => ({ data: { data: [] } })),
                courseService.getAll().catch(() => ({ data: { data: [] } })),
                enrollmentService.getAll().catch(() => ({ data: { data: [] } }))
            ]);

            setAnalytics(analyticsRes.data.data);
            setUsers(usersRes.data.data);
            
            // Separate courses by status
            const allCourses = coursesRes.data.data || [];
            setActiveCourses(allCourses.filter(c => c.publicationState === 'Active'));
            setPendingCourses(allCourses.filter(c => c.publicationState === 'Pending Audit'));
            
            setEnrollments(enrollmentsRes.data.data);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    // ── Action Handlers ────────────────────────────────────────

    const handleApproveCourse = async (id) => {
        try {
            await courseService.approve(id);
            const courseToApprove = pendingCourses.find(c => c._id === id);
            setPendingCourses(prev => prev.filter(c => c._id !== id));
            setActiveCourses(prev => [{ ...courseToApprove, publicationState: 'Active' }, ...prev]);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve.');
        }
    };

    const handleToggleUserStatus = async (user) => {
        try {
            const newStatus = !user.isActive;
            await userService.update(user._id, { isActive: newStatus });
            setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: newStatus } : u));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update user status.');
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await userService.update(userId, { assignedRole: newRole });
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, assignedRole: newRole } : u));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update role.');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        try {
            await userService.resetPassword(selectedUser._id, newPassword);
            alert(`Password reset successfully for ${selectedUser.fullName}`);
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setSelectedUser(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reset password.');
        }
    };

    const handleToggleClearance = async (enrollmentId, currentStatus) => {
        try {
            const res = await courseService.toggleClearance(enrollmentId);
            setEnrollments(prev => prev.map(e => e._id === enrollmentId ? { 
                ...e, 
                tuitionClearanceFlag: res.data.data.tuitionClearanceFlag,
                paymentStatus: res.data.data.tuitionClearanceFlag ? 'Cleared' : 'Pending Verification'
            } : e));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to toggle clearance.');
        }
    };

    // ── Renderers ──────────────────────────────────────────────

    const renderAnalytics = () => {
        if (!analytics) return <p>No analytics data available.</p>;

        const revenueData = [
            { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 5200 }, { name: 'Mar', revenue: 6100 },
            { name: 'Apr', revenue: 8400 }, { name: 'May', revenue: 9200 }, { name: 'Jun', revenue: ((analytics.clearedEnrollments || 0) * 1500) }
        ];
        
        const roleData = [
            { name: 'Students', value: analytics.totalStudents || 0 },
            { name: 'Instructors', value: analytics.totalInstructors || 0 },
            { name: 'Admins', value: 1 }
        ];

        const COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];
        
        return (
            <div style={styles.tabContent}>
                <h2 style={styles.sectionTitle}>Platform Overview</h2>
                <div style={styles.statsGrid}>
                    <StatCard label="Total Users" value={analytics.totalUsers || 0} color="#3b82f6" icon="👥" />
                    <StatCard label="Active Enrollments" value={analytics.totalEnrollments || 0} color="#10b981" icon="🎓" />
                    <StatCard label="Avg Completion Rate" value={`${analytics.completionRate || 0}%`} color="#8b5cf6" icon="📈" />
                    <StatCard label="Total Revenue (ETB)" value={(analytics.clearedEnrollments || 0) * 1500} color="#f59e0b" icon="💰" />
                </div>
                
                {/* Advanced Analytics Charts */}
                <div style={styles.cardGrid}>
                    {/* Revenue Area Chart */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Revenue Growth (YTD)</h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* User Roles Pie Chart */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Platform Demographics</h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={roleData}
                                        cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                                        paddingAngle={5} dataKey="value"
                                        stroke="none"
                                    >
                                        {roleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUserManagement = () => (
        <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>User Management</h2>
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>{u.fullName}</td>
                                <td>{u.accountEmail}</td>
                                <td>
                                    <select 
                                        value={u.assignedRole} 
                                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                        style={styles.roleSelect}
                                    >
                                        <option value="Student">Student</option>
                                        <option value="Instructor">Instructor</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </td>
                                <td>
                                    <span style={{...styles.badge, background: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.isActive ? '#10b981' : '#ef4444'}}>
                                        {u.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{display:'flex', gap:'8px'}}>
                                        <button 
                                            onClick={() => handleToggleUserStatus(u)}
                                            style={{...styles.actionBtn, color: u.isActive ? '#ef4444' : '#10b981'}}
                                        >
                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); }}
                                            style={{...styles.actionBtn, color: '#3b82f6'}}
                                        >
                                            Reset Pwd
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

    const renderAuditQueue = () => (
        <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Course Audit Queue</h2>
            {pendingCourses.length === 0 ? (
                <div style={styles.emptyState}>No courses pending review.</div>
            ) : pendingCourses.map(course => (
                <div key={course._id} style={styles.auditCard}>
                    <div style={{ flex: 1 }}>
                        <span style={styles.pendingBadge}>PENDING AUDIT</span>
                        <h3 style={styles.courseTitle}>{course.courseTitle}</h3>
                        <p style={styles.courseMeta}>{course.technicalCategory} · {course.estimatedDurationHours}h</p>
                    </div>
                    <button onClick={() => handleApproveCourse(course._id)} style={styles.approveBtn}>✓ Approve</button>
                </div>
            ))}
        </div>
    );

    const renderPaymentClearance = () => {
        const pendingPayments = enrollments.filter(e => e.paymentStatus === 'Pending Verification');
        
        return (
            <div style={styles.tabContent}>
                <h2 style={styles.sectionTitle}>Financial Settlement</h2>
                {pendingPayments.length === 0 ? (
                    <div style={styles.emptyState}>No pending payment slips to verify.</div>
                ) : (
                    <div style={styles.gridContainer}>
                        {pendingPayments.map(enroll => (
                            <div key={enroll._id} style={styles.paymentCard}>
                                <div style={styles.slipPreview}>
                                    {enroll.paymentSlipUrl ? (
                                        <img src={enroll.paymentSlipUrl} alt="Slip" style={styles.slipImg} />
                                    ) : (
                                        <div style={styles.noSlip}>No Image Uploaded</div>
                                    )}
                                </div>
                                <div style={styles.paymentInfo}>
                                    <h4 style={{margin: '0 0 4px', color:'#f1f5f9'}}>{enroll.studentRef?.fullName}</h4>
                                    <p style={{margin: '0 0 12px', fontSize:'13px', color:'#94a3b8'}}>{enroll.courseRef?.courseTitle}</p>
                                    <div style={{display:'flex', gap:'8px'}}>
                                        <button onClick={() => handleToggleClearance(enroll._id)} style={styles.approveBtn}>Approve & Clear</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const sidebarItems = [
        { key: 'analytics', label: '📊 Analytics Dashboard' },
        { key: 'users', label: '👥 User Management' },
        { key: 'audit', label: '📋 Course Audit Queue' },
        { key: 'payments', label: '💰 Financial Settlement' }
    ];

    return (
        <div style={styles.page}>
            <Sidebar navItems={sidebarItems} activeTab={activeTab} onTabChange={setActiveTab} />
            
            <main style={styles.main}>
                <header style={styles.header}>
                    <h1 style={styles.greeting}>Administrator Dashboard</h1>
                </header>

                {loading ? (
                    <div style={{padding:'40px', color:'#64748b'}}>Loading dashboard data...</div>
                ) : (
                    <>
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'users' && renderUserManagement()}
                        {activeTab === 'audit' && renderAuditQueue()}
                        {activeTab === 'payments' && renderPaymentClearance()}
                    </>
                )}
            </main>

            {/* Password Reset Modal */}
            <Modal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)}
                title={`Reset Password for ${selectedUser?.fullName}`}
            >
                <form onSubmit={handlePasswordReset} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 8 chars)"
                        style={styles.input}
                        required
                        minLength={8}
                    />
                    <button type="submit" style={styles.primaryBtn}>Update Password</button>
                </form>
            </Modal>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
    main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
    header: { marginBottom: '32px' },
    greeting: { color: '#f1f5f9', fontSize: '32px', fontWeight: '900', margin: 0 },
    tabContent: { animation: 'fadeIn 0.3s ease-in-out' },
    sectionTitle: { color: '#f1f5f9', fontSize: '20px', fontWeight: '700', marginBottom: '24px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' },
    cardGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' },
    card: { background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155' },
    cardTitle: { color: '#f1f5f9', fontSize: '18px', fontWeight:'700', marginBottom:'24px' },
    distRow: { display:'flex', justifyContent:'space-between', marginBottom:'12px', color:'#cbd5e1', fontSize:'14px' },
    tableContainer: { background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflowX: 'auto', padding: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f1f5f9' },
    badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' },
    roleSelect: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px' },
    actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: '600' },
    emptyState: { padding: '40px', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' },
    auditCard: { background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pendingBadge: { background: 'rgba(245,158,11,0.1)', color: '#fbbf24', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' },
    courseTitle: { color: '#f1f5f9', margin: '12px 0 8px', fontSize: '20px', fontWeight: '700' },
    courseMeta: { color: '#94a3b8', fontSize: '14px', margin: 0 },
    approveBtn: { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700' },
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
    paymentCard: { background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' },
    slipPreview: { height: '180px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #334155' },
    slipImg: { width: '100%', height: '100%', objectFit: 'cover' },
    noSlip: { color: '#64748b', fontSize: '14px' },
    paymentInfo: { padding: '20px' },
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '14px', width: '100%', boxSizing:'border-box', outline: 'none' },
    primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px', fontWeight: '800', cursor: 'pointer', transition: 'opacity 0.2s' }
};
