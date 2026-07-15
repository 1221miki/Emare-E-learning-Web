import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    courseService, 
    wishlistService, 
    gradebookService, 
    certificateService, 
    enrollmentService,
    userService 
} from '../../services/api';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
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

    // Profile Settings States
    const [profileName, setProfileName] = useState(user?.fullName || '');
    const [profileEmail, setProfileEmail] = useState(user?.accountEmail || '');
    const [prefLanguage, setPrefLanguage] = useState('English');
    const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

    // Load Dashboard Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch student enrollments
                const enrollRes = await courseService.getStudentEnrollments();
                setEnrollments(enrollRes.data.data || []);

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
                const payRes = await enrollmentService.getMyStatus ? await enrollmentService.getMyStatus() : { data: { data: [] } };
                setPaymentStatusList(payRes.data.data || []);

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
        navigate('/login');
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileSuccessMsg('');
        try {
            await userService.update(user.id, { fullName: profileName, accountEmail: profileEmail });
            setProfileSuccessMsg('Profile updated successfully!');
            // Update local storage user details
            const localUser = JSON.parse(localStorage.getItem('elms_user') || '{}');
            localUser.fullName = profileName;
            localUser.accountEmail = profileEmail;
            localStorage.setItem('elms_user', JSON.stringify(localUser));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update profile.');
        }
    };

    // Calculate Completion Statistics
    const completedCoursesCount = enrollments.filter(e => e.completionPercentage >= 100).length;
    const averageProgress = enrollments.length 
        ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.completionPercentage || 0), 0) / enrollments.length) 
        : 0;

    // Sub-views
    const renderOverview = () => (
        <div>
            {/* Quick Greeting */}
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Dashboard Overview</h2>
                <p style={styles.tabSubtitle}>A snapshot of your learning path and stats</p>
            </div>

            {/* Micro Stats Grid */}
            <div style={styles.statsGrid}>
                <div style={{ ...styles.statCard, borderTop: '3px solid #3b82f6' }}>
                    <span style={{ ...styles.statValue, color: '#3b82f6' }}>{enrollments.length}</span>
                    <span style={styles.statLabel}>Enrolled Courses</span>
                </div>
                <div style={{ ...styles.statCard, borderTop: '3px solid #10b981' }}>
                    <span style={{ ...styles.statValue, color: '#10b981' }}>{averageProgress}%</span>
                    <span style={styles.statLabel}>Average Progress</span>
                </div>
                <div style={{ ...styles.statCard, borderTop: '3px solid #8b5cf6' }}>
                    <span style={{ ...styles.statValue, color: '#8b5cf6' }}>{completedCoursesCount}</span>
                    <span style={styles.statLabel}>Completed Courses</span>
                </div>
            </div>

            {/* Recently Active Course */}
            <div style={styles.panelCard}>
                <h3 style={styles.panelCardTitle}>Continue Learning</h3>
                {enrollments.length > 0 ? (
                    (() => {
                        const activeCourse = enrollments[0]; // Let's take the first one
                        return (
                            <div style={styles.recentCourseBox}>
                                <div style={styles.recentCourseLeft}>
                                    <div style={styles.courseBadge}>{activeCourse.courseRef?.technicalCategory || 'Web Coding'}</div>
                                    <h4 style={styles.recentCourseName}>{activeCourse.courseRef?.courseTitle}</h4>
                                    <p style={styles.recentCourseMeta}>Estimated duration: {activeCourse.courseRef?.estimatedDurationHours || 0} hours</p>
                                </div>
                                <div style={styles.recentCourseRight}>
                                    <div style={styles.progressPercent}>{activeCourse.completionPercentage || 0}% Complete</div>
                                    {activeCourse.tuitionClearanceFlag ? (
                                        <button onClick={() => navigate(`/student/learn/${activeCourse.courseRef?._id}`)} style={styles.resumeBtn}>Resume Learning →</button>
                                    ) : (
                                        <button onClick={() => setActiveTab('payments')} style={styles.lockedBtn}>🔒 Awaiting Clearance</button>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div style={styles.emptyContent}>
                        <p style={styles.emptyText}>You are not actively pursuing any course.</p>
                        <Link to="/courses" style={styles.ctaLink}>Visit Course Catalog</Link>
                    </div>
                )}
            </div>
        </div>
    );

    const renderMyLearning = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>My Courses & Learning Tracks</h2>
                <p style={styles.tabSubtitle}>Access your lectures and check clearance status</p>
            </div>
            {enrollments.length === 0 ? (
                <div style={styles.emptyContent}>
                    <p style={styles.emptyText}>No registered courses yet.</p>
                    <Link to="/courses" style={styles.ctaLink}>Find a Course</Link>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {enrollments.map((enroll) => (
                        <div key={enroll._id} style={styles.courseCard}>
                            <div style={styles.courseBadge}>{enroll.courseRef?.technicalCategory || 'Web Coding'}</div>
                            <h3 style={styles.courseTitle}>{enroll.courseRef?.courseTitle}</h3>
                            <div style={styles.progressBar}>
                                <div style={{ ...styles.progressFill, width: `${enroll.completionPercentage || 0}%` }} />
                            </div>
                            <p style={styles.progressText}>{enroll.completionPercentage || 0}% Complete</p>
                            {enroll.tuitionClearanceFlag ? (
                                <button onClick={() => navigate(`/student/learn/${enroll.courseRef?._id}`)} style={styles.watchBtn}>▶ Continue Learning</button>
                            ) : (
                                <div style={styles.lockedBadge}>🔒 Pending Tuition Settlement</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderWishlist = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>My Course Wishlist</h2>
                <p style={styles.tabSubtitle}>Saved courses that interest you</p>
            </div>
            {wishlist.length === 0 ? (
                <div style={styles.emptyContent}>
                    <p style={styles.emptyText}>Your wishlist is empty.</p>
                    <Link to="/courses" style={styles.ctaLink}>Explore Catalog</Link>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {wishlist.map((course) => (
                        <div key={course._id} style={styles.courseCard}>
                            <div style={styles.courseBadge}>{course.technicalCategory || 'General'}</div>
                            <h3 style={styles.courseTitle}>{course.courseTitle}</h3>
                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.4' }}>
                                {course.descriptionText?.substring(0, 100)}...
                            </p>
                            <button onClick={() => navigate(`/courses/${course._id}`)} style={styles.watchBtn}>View Details</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderGrades = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Grades & Academic Standing</h2>
                <p style={styles.tabSubtitle}>Submit files and verify assessment history</p>
            </div>
            {grades.length === 0 ? (
                <div style={styles.emptyContent}>
                    <p style={styles.emptyText}>No graded submissions yet.</p>
                </div>
            ) : (
                <div style={styles.tableCard}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>Assessment</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Score</th>
                                <th style={styles.th}>Feedback Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grades.map((grade) => (
                                <tr key={grade._id} style={styles.tr}>
                                    <td style={styles.td}><strong>{grade.assessmentRef?.quizTitle || 'Assignment Task'}</strong></td>
                                    <td style={styles.td}>
                                        <span style={{ 
                                            background: grade.isGraded ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                                            color: grade.isGraded ? '#10b981' : '#f59e0b',
                                            padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700'
                                        }}>
                                            {grade.isGraded ? 'Graded' : 'Awaiting Grade'}
                                        </span>
                                    </td>
                                    <td style={styles.tdScore}>
                                        <strong>{grade.isGraded ? `${grade.numericalScoreEarned}/100` : '—'}</strong>
                                    </td>
                                    <td style={styles.td}>{grade.instructorReviewNotes || 'No notes submitted.'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderCertificates = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Earned Credentials</h2>
                <p style={styles.tabSubtitle}>Your certificates of completion</p>
            </div>
            {certificates.length === 0 ? (
                <div style={styles.emptyContent}>
                    <p style={styles.emptyText}>You haven't earned any certificates yet. Complete all lessons and quizzes above 60% average to qualify!</p>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {certificates.map((cert) => (
                        <div key={cert._id} style={styles.certCard}>
                            <div style={styles.certIcon}>🏆</div>
                            <h3 style={styles.certTitle}>{cert.courseRef?.courseTitle || 'Course Shell'}</h3>
                            <p style={styles.certMeta}>Certificate Number: {cert.certificateNumber}</p>
                            <button onClick={() => window.open(cert.certificatePdfUrl, '_blank')} style={styles.downloadBtn}>Download PDF Certificate</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderPayments = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Tuition & Payments Settlement</h2>
                <p style={styles.tabSubtitle}>Submit payment slips to confirm course access</p>
            </div>
            <div style={styles.panelCard}>
                <h3 style={styles.panelCardTitle}>Tuition Status Summary</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                    Access to course lesson streaming requires manual verification of payment. Upload bank transfers or CBE Birr slips to get cleared.
                </p>
                <button onClick={() => navigate('/student/payments')} style={styles.resumeBtn}>Go to Payment Settlement Portal →</button>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Account Preferences</h2>
                <p style={styles.tabSubtitle}>Configure your profile and locale options</p>
            </div>
            <div style={styles.panelCard}>
                {profileSuccessMsg && <div style={styles.successAlert}>{profileSuccessMsg}</div>}
                <form onSubmit={handleProfileUpdate} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input 
                            type="text" 
                            style={styles.input} 
                            value={profileName} 
                            onChange={e => setProfileName(e.target.value)} 
                            required 
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input 
                            type="email" 
                            style={styles.input} 
                            value={profileEmail} 
                            onChange={e => setProfileEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Preferred Language</label>
                        <select 
                            style={styles.select} 
                            value={prefLanguage} 
                            onChange={e => setPrefLanguage(e.target.value)}
                        >
                            <option value="English">English</option>
                            <option value="Amharic">Amharic (አማርኛ)</option>
                            <option value="Afaan Oromo">Afaan Oromo</option>
                        </select>
                    </div>
                    <button type="submit" style={styles.saveBtn}>Save Changes</button>
                </form>
            </div>
        </div>
    );

    return (
        <div style={styles.page}>
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
                        { key: 'grades', label: '📝 Grades & Submissions' },
                        { key: 'certificates', label: '🏆 Certificates' },
                        { key: 'payments', label: '💳 Payments' },
                        { key: 'settings', label: '⚙️ Settings' }
                    ].map((tab) => (
                        <button 
                            key={tab.key} 
                            onClick={() => setActiveTab(tab.key)} 
                            style={{ 
                                ...styles.navItem, 
                                background: activeTab === tab.key ? 'rgba(59,130,246,0.1)' : 'transparent',
                                color: activeTab === tab.key ? '#3b82f6' : '#94a3b8',
                                borderLeft: activeTab === tab.key ? '3px solid #3b82f6' : '3px solid transparent'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => navigate('/courses')} style={styles.catalogBtn}>📚 Course Catalog</button>
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
                    <div style={styles.avatar}>{user?.fullName?.[0]?.toUpperCase()}</div>
                </header>

                {/* Loading State */}
                {loading ? (
                    <div style={styles.loadingBox}>Loading Dashboard...</div>
                ) : (
                    <div>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'learning' && renderMyLearning()}
                        {activeTab === 'wishlist' && renderWishlist()}
                        {activeTab === 'grades' && renderGrades()}
                        {activeTab === 'certificates' && renderCertificates()}
                        {activeTab === 'payments' && renderPayments()}
                        {activeTab === 'settings' && renderSettings()}
                    </div>
                )}
            </main>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#090d16', fontFamily: "'Outfit', sans-serif" },
    sidebar: { width: '260px', background: '#0f1422', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh', zIndex: 10 },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', paddingLeft: '8px' },
    logo: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
    logoText: { color: '#fff', fontWeight: '700', fontSize: '16px' },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
    navItem: { textAlign: 'left', background: 'transparent', border: 'none', color: '#94a3b8', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' },
    catalogBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
    greeting: { color: '#f8fafc', fontSize: '28px', fontWeight: '800', margin: 0 },
    subGreeting: { color: '#64748b', fontSize: '14px', margin: '4px 0 0' },
    avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '20px' },
    loadingBox: { color: '#64748b', fontSize: '16px', textAlign: 'center', padding: '100px 0' },
    tabHeader: { marginBottom: '32px' },
    tabTitle: { color: '#f8fafc', fontSize: '22px', fontWeight: '800', margin: 0 },
    tabSubtitle: { color: '#64748b', fontSize: '14px', margin: '6px 0 0' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' },
    statCard: { background: '#0e1726', borderRadius: '16px', padding: '24px', border: '1px solid #1e293b' },
    statValue: { display: 'block', fontSize: '36px', fontWeight: '800' },
    statLabel: { color: '#64748b', fontSize: '13px', fontWeight: '500', marginTop: '4px', display: 'block' },
    panelCard: { background: '#0e1726', borderRadius: '16px', padding: '32px', border: '1px solid #1e293b', marginBottom: '32px' },
    panelCardTitle: { color: '#f8fafc', fontSize: '18px', fontWeight: '700', margin: '0 0 20px' },
    recentCourseBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    recentCourseLeft: {},
    recentCourseName: { color: '#f8fafc', fontSize: '16px', fontWeight: '700', margin: '8px 0 4px' },
    recentCourseMeta: { color: '#64748b', fontSize: '13px', margin: 0 },
    recentCourseRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
    progressPercent: { color: '#60a5fa', fontSize: '14px', fontWeight: '700' },
    resumeBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
    lockedBtn: { background: '#1e293b', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
    emptyContent: { textAlign: 'center', padding: '60px 24px' },
    emptyText: { color: '#64748b', fontSize: '14px', marginBottom: '20px' },
    ctaLink: { color: '#3b82f6', textDecoration: 'none', fontWeight: '700', fontSize: '14px' },
    courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' },
    courseCard: { background: '#0e1726', borderRadius: '16px', padding: '24px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' },
    courseBadge: { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', alignSelf: 'flex-start', marginBottom: '12px' },
    courseTitle: { color: '#f8fafc', fontSize: '16px', fontWeight: '700', marginBottom: '16px', lineHeight: '1.4' },
    progressBar: { background: '#1e293b', borderRadius: '99px', height: '6px', marginBottom: '8px' },
    progressFill: { background: 'linear-gradient(90deg, #2563eb, #7c3aed)', height: '6px', borderRadius: '99px' },
    progressText: { color: '#64748b', fontSize: '12px', marginBottom: '20px' },
    watchBtn: { width: '100%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
    lockedBadge: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: '8px', padding: '10px', fontSize: '13px', textAlign: 'center', fontWeight: '600' },
    tableCard: { background: '#0e1726', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    thRow: { background: '#0f1422' },
    th: { padding: '16px 24px', color: '#64748b', fontSize: '13px', fontWeight: '700' },
    tr: { borderBottom: '1px solid #1e293b' },
    td: { padding: '16px 24px', color: '#f8fafc', fontSize: '14px' },
    tdScore: { padding: '16px 24px', color: '#3b82f6', fontSize: '14px' },
    certCard: { background: '#0e1726', borderRadius: '16px', padding: '32px', border: '1px solid #1e293b', textAlign: 'center' },
    certIcon: { fontSize: '48px', marginBottom: '16px' },
    certTitle: { color: '#f8fafc', fontSize: '18px', fontWeight: '700', marginBottom: '8px' },
    certMeta: { color: '#64748b', fontSize: '13px', marginBottom: '24px' },
    downloadBtn: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
    successAlert: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: '600' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#94a3b8', fontSize: '13px', fontWeight: '600' },
    input: { background: '#090d16', border: '1px solid #1e293b', color: '#fff', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    select: { background: '#090d16', border: '1px solid #1e293b', color: '#fff', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    saveBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', alignSelf: 'flex-start' }
};
