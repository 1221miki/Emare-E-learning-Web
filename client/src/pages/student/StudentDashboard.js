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

                // Fetch payment status (mocking if not available)
                if (enrollmentService.getMyStatus) {
                    const payRes = await enrollmentService.getMyStatus();
                    setPaymentStatusList(payRes.data.data || []);
                }
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
            alert(err?.response?.data?.message || 'Failed to update profile.');
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
    const renderOverview = () => (
        <div>
            {/* Quick Greeting */}
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Dashboard Overview</h2>
                <p style={styles.tabSubtitle}>Your personalized learning command center</p>
            </div>

            {/* Gamification & Progress Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '32px' }}>
                <div style={{ ...styles.panelCard, marginBottom: 0 }}>
                    <h3 style={styles.panelCardTitle}>Learning Progress</h3>
                    <div style={styles.statsGrid}>
                        <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.primary}` }}>
                            <span style={{ ...styles.statValue, color: colors.primary }}>{enrollments.length}</span>
                            <span style={styles.statLabel}>Active Courses</span>
                        </div>
                        <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.success}` }}>
                            <span style={{ ...styles.statValue, color: colors.success }}>{averageProgress}%</span>
                            <span style={styles.statLabel}>Avg Completion</span>
                        </div>
                        <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.accent}` }}>
                            <span style={{ ...styles.statValue, color: colors.accent }}>{completedCoursesCount}</span>
                            <span style={styles.statLabel}>Certificates Won</span>
                        </div>
                    </div>
                </div>

                <div style={{ ...styles.panelCard, marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(${colors.accent} ${xpProgress}%, ${colors.bgInput} 0)` }}>
                        <div style={{ width: '100px', height: '100px', background: colors.bgCard, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '24px', fontWeight: '800', color: colors.text }}>Lv {currentLevel}</span>
                        </div>
                    </div>
                    <h4 style={{ color: colors.text, margin: '16px 0 4px' }}>{xpPoints} XP</h4>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>{nextLevelXP - xpPoints} XP to next level</p>
                </div>
            </div>

            {/* Daily Goals & Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ ...styles.panelCard, marginBottom: 0 }}>
                    <h3 style={styles.panelCardTitle}>Daily Goals</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={styles.goalItem}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.success, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                                <span style={{ color: colors.text, fontSize: '14px' }}>Log in to platform</span>
                            </div>
                            <span style={{ color: colors.success, fontSize: '12px', fontWeight: '700' }}>+10 XP</span>
                        </div>
                        <div style={styles.goalItem}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${colors.border}`, color: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                                <span style={{ color: colors.text, fontSize: '14px' }}>Complete 1 lesson video</span>
                            </div>
                            <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: '700' }}>+50 XP</span>
                        </div>
                        <div style={styles.goalItem}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${colors.border}`, color: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                                <span style={{ color: colors.text, fontSize: '14px' }}>Pass a quiz with 80%+</span>
                            </div>
                            <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: '700' }}>+100 XP</span>
                        </div>
                    </div>
                </div>

                <div style={{ ...styles.panelCard, marginBottom: 0 }}>
                    <h3 style={styles.panelCardTitle}>Recent Badges</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {badges.map((badge, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `${badge.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: `1px solid ${badge.color}30` }}>
                                    {badge.icon}
                                </div>
                                <span style={{ color: colors.text, fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{badge.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recently Active Course */}
            <div style={styles.panelCard}>
                <h3 style={styles.panelCardTitle}>Continue Learning</h3>
                {enrollments.length > 0 ? (
                    (() => {
                        const activeCourse = enrollments[0];
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
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 20px', lineHeight: '1.4' }}>
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
                                            background: grade.isGraded ? `${colors.success}15` : `${colors.warning}15`, 
                                            color: grade.isGraded ? colors.success : colors.warning,
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
                <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px' }}>
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
        goalItem: { padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
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
