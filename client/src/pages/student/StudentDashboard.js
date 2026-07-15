import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/api';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        courseService.getStudentEnrollments()
            .then(res => setEnrollments(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleLogout = async () => { await logout(); navigate('/login'); };

    return (
        <div style={styles.page}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
                <div style={styles.logoBox}>
                    <div style={styles.logo}>E</div>
                    <span style={styles.logoText}>Emare ELMS</span>
                </div>
                <nav style={styles.nav}>
                    {[{ label: '🏠 Dashboard', path: '/student/dashboard' },
                      { label: '📚 Course Catalog', path: '/courses' },
                      { label: '🎓 My Learning', path: '/student/dashboard' },
                    ].map((item) => (
                        <Link key={item.label} to={item.path} style={styles.navItem}>{item.label}</Link>
                    ))}
                </nav>
                <button onClick={handleLogout} style={styles.logoutBtn}>↩ Sign Out</button>
            </aside>

            {/* Main Content */}
            <main style={styles.main}>
                {/* Header */}
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.greeting}>Welcome back, {user?.fullName?.split(' ')[0]} 👋</h1>
                        <p style={styles.subGreeting}>Continue your learning journey</p>
                    </div>
                    <div style={styles.avatar}>{user?.fullName?.[0]?.toUpperCase()}</div>
                </header>

                {/* Stat Cards */}
                <div style={styles.statsGrid}>
                    {[
                        { label: 'Enrolled Courses', value: enrollments.length, color: '#3b82f6' },
                        { label: 'Courses Cleared', value: enrollments.filter(e => e.tuitionClearanceFlag).length, color: '#10b981' },
                        { label: 'Pending Clearance', value: enrollments.filter(e => !e.tuitionClearanceFlag).length, color: '#f59e0b' },
                    ].map((stat) => (
                        <div key={stat.label} style={{ ...styles.statCard, borderTop: `3px solid ${stat.color}` }}>
                            <span style={{ ...styles.statValue, color: stat.color }}>{stat.value}</span>
                            <span style={styles.statLabel}>{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* Enrolled Courses */}
                <section>
                    <h2 style={styles.sectionTitle}>My Enrolled Courses</h2>
                    {loading ? (
                        <p style={styles.emptyText}>Loading your courses...</p>
                    ) : enrollments.length === 0 ? (
                        <div style={styles.emptyCard}>
                            <p style={styles.emptyText}>You haven't enrolled in any courses yet.</p>
                            <Link to="/courses" style={styles.ctaBtn}>Browse Course Catalog →</Link>
                        </div>
                    ) : (
                        <div style={styles.courseGrid}>
                            {enrollments.map((enroll) => (
                                <div key={enroll._id} style={styles.courseCard}>
                                    <div style={styles.courseBadge}>{enroll.courseRef?.technicalCategory || 'General'}</div>
                                    <h3 style={styles.courseTitle}>{enroll.courseRef?.courseTitle}</h3>
                                    <div style={styles.progressBar}>
                                        <div style={{ ...styles.progressFill, width: `${enroll.completionPercentage || 0}%` }} />
                                    </div>
                                    <p style={styles.progressText}>{enroll.completionPercentage || 0}% Complete</p>
                                    {enroll.tuitionClearanceFlag ? (
                                        <button onClick={() => navigate(`/student/learn/${enroll.courseRef?._id}`)} style={styles.watchBtn}>▶ Continue Learning</button>
                                    ) : (
                                        <div style={styles.lockedBadge}>🔒 Awaiting Payment Clearance</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
    sidebar: { width: '240px', background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh' },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' },
    logo: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
    logoText: { color: '#fff', fontWeight: '700', fontSize: '16px' },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
    navItem: { color: '#94a3b8', textDecoration: 'none', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s' },
    logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    main: { marginLeft: '240px', flex: 1, padding: '40px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
    greeting: { color: '#f1f5f9', fontSize: '28px', fontWeight: '800', margin: 0 },
    subGreeting: { color: '#64748b', fontSize: '14px', margin: '4px 0 0' },
    avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '20px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' },
    statCard: { background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155' },
    statValue: { display: 'block', fontSize: '36px', fontWeight: '800' },
    statLabel: { color: '#64748b', fontSize: '13px', fontWeight: '500', marginTop: '4px', display: 'block' },
    sectionTitle: { color: '#f1f5f9', fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
    courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
    courseCard: { background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155' },
    courseBadge: { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginBottom: '12px' },
    courseTitle: { color: '#f1f5f9', fontSize: '16px', fontWeight: '700', marginBottom: '16px', lineHeight: '1.4' },
    progressBar: { background: '#334155', borderRadius: '99px', height: '6px', marginBottom: '8px' },
    progressFill: { background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', height: '6px', borderRadius: '99px', transition: 'width 0.5s ease' },
    progressText: { color: '#64748b', fontSize: '12px', marginBottom: '16px' },
    watchBtn: { width: '100%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
    lockedBadge: { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: '10px', padding: '10px', fontSize: '13px', textAlign: 'center', fontWeight: '600' },
    emptyCard: { background: '#1e293b', borderRadius: '16px', padding: '48px', textAlign: 'center', border: '1px solid #334155' },
    emptyText: { color: '#64748b', marginBottom: '20px' },
    ctaBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }
};
