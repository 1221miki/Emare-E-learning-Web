import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    courseService,
    quizService,
    gradebookService,
    reviewService,
    userService,
    enrollmentService
} from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function InstructorDashboard() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const s = {
        // Layout
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" },
        sidebar: { width: '260px', background: 'rgba(15,20,34,0.7)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(30,41,59,0.5)', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh', zIndex: 10 },
        logoBox: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px', paddingLeft: '8px' },
        logo: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
        logoText: { color: '#fff', fontWeight: '700', fontSize: '16px' },
        nav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto' },
        navItem: { textAlign: 'left', background: 'transparent', border: 'none', color: colors.textMuted, padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' },
        catalogBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
        logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

        // Main
        main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' },
        greeting: { color: '#f8fafc', fontSize: '26px', fontWeight: '800', margin: 0 },
        subGreeting: { color: colors.textMuted, fontSize: '14px', margin: '4px 0 0' },
        avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '20px' },
        loadingBox: { color: colors.textMuted, fontSize: '16px', textAlign: 'center', padding: '100px 0' },

        // Tabs
        tabHeader: { marginBottom: '28px' },
        tabTitle: { color: '#f8fafc', fontSize: '22px', fontWeight: '800', margin: 0 },
        tabSubtitle: { color: colors.textMuted, fontSize: '14px', margin: '4px 0 0' },

        // Stats
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
        statCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '22px', border: '1px solid rgba(30,41,59,0.5)' },
        statValue: { display: 'block', fontSize: '32px', fontWeight: '800' },
        statLabel: { color: colors.textMuted, fontSize: '12px', fontWeight: '500', marginTop: '4px', display: 'block' },

        // Cards
        panelCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '28px', border: '1px solid rgba(30,41,59,0.5)', marginBottom: '24px', cursor: 'default', transition: 'border-color 0.2s' },
        panelTitle: { color: colors.text, fontSize: '16px', fontWeight: '700', margin: '0 0 20px' },
        recentItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(30,41,59,0.3)' },
        courseRow: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '24px', border: '1px solid rgba(30,41,59,0.5)', display: 'flex', justifyContent: 'space-between', gap: '20px' },
        badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'inline-block' },
        miniStat: { background: 'rgba(15,23,42,0.4)', padding: '14px 16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' },

        // Empty
        emptyBox: { padding: '48px', textAlign: 'center', background: 'rgba(14,23,38,0.45)', borderRadius: '14px', border: '1px solid rgba(30,41,59,0.4)' },
        emptyText: { color: colors.textMuted, fontSize: '14px', margin: 0 },

        // Table
        tableCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '14px', border: '1px solid rgba(30,41,59,0.5)', overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
        thRow: { background: 'rgba(15,20,34,0.6)' },
        th: { padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
        tr: { borderBottom: '1px solid rgba(30,41,59,0.4)' },
        td: { padding: '14px 20px', color: colors.text, fontSize: '14px' },

        // Buttons
        primaryBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s' },
        actionBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'background 0.2s' },
        actionBtnAlt: { background: 'transparent', border: '1px solid rgba(51,65,85,0.6)', color: colors.text, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'background 0.2s' },
        dangerBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
        textBtn: { background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' },

        // Forms
        formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
        formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
        label: { color: colors.textMuted, fontSize: '12px', fontWeight: '600' },
        input: { background: 'rgba(9,13,22,0.6)', border: '1px solid rgba(30,41,59,0.6)', color: '#fff', padding: '11px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' },
        select: { background: 'rgba(9,13,22,0.6)', border: '1px solid rgba(30,41,59,0.6)', color: '#fff', padding: '11px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
        successAlert: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600' },

        // Modals
        backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
        modal: { background: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(51,65,85,0.6)', borderRadius: '18px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' },
        modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' },
        modalTitle: { color: colors.text, fontSize: '18px', fontWeight: '700', margin: 0 },
        closeBtn: { background: colors.bgInput, border: '1px solid rgba(51,65,85,0.6)', color: colors.textMuted, borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        modalBody: { padding: '20px 24px 24px' }
    };
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // Data States
    const [courses, setCourses] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [reviews, setReviews] = useState([]);

    // Modal & Form States
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [isEditCourseModal, setIsEditCourseModal] = useState(false);

    const [courseForm, setCourseForm] = useState({
        courseTitle: '', subtitle: '', descriptionText: '', technicalCategory: 'Web Coding',
        estimatedDurationHours: 1, level: 'Beginner', language: 'English', price: 0,
        learningObjectives: '', requirements: '', tags: ''
    });
    const [quizForm, setQuizForm] = useState({
        quizTitle: '', allottedDurationMinutes: 15, passingScoreThreshold: 60,
        questions: [{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
    });
    const [gradeForm, setGradeForm] = useState({ numericalScoreEarned: 0, instructorReviewNotes: '' });
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    // Profile States
    const [profileForm, setProfileForm] = useState({
        fullName: user?.fullName || '', biography: '', contactPhone: '',
        qualifications: '', workExperience: '', teachingLanguages: '',
        socialMediaLinks: { linkedin: '', twitter: '', website: '', youtube: '' }
    });
    const [profileMsg, setProfileMsg] = useState('');

    // Settings States
    const [settingsForm, setSettingsForm] = useState({
        notifyEnrollments: true, notifyReviews: true, notifyAssignments: true, notifyPayments: true
    });

    // ── Data Fetching ──────────────────────────────────────────
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [coursesRes, analyticsRes] = await Promise.all([
                courseService.getInstructorCourses(),
                courseService.getInstructorAnalytics()
            ]);
            setCourses(coursesRes.data.data || []);
            setAnalytics(analyticsRes.data.data || {});
            if (coursesRes.data.data?.length > 0) setSelectedCourse(coursesRes.data.data[0]);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // When grading tab or selected course changes, fetch submissions
    useEffect(() => {
        if (activeTab === 'grading' && selectedCourse) {
            gradebookService.getSubmissionsForCourse(selectedCourse._id)
                .then(res => setSubmissions(res.data.data || []))
                .catch(console.error);
        }
    }, [activeTab, selectedCourse]);

    // When reviews tab or selected course changes, fetch reviews
    useEffect(() => {
        if (activeTab === 'reviews' && selectedCourse) {
            reviewService.getCourseReviews(selectedCourse._id)
                .then(res => setReviews(res.data.data || []))
                .catch(console.error);
        }
    }, [activeTab, selectedCourse]);

    const handleLogout = async () => { await logout(); navigate('/'); };

    // ── Course Actions ─────────────────────────────────────────
    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...courseForm,
                learningObjectives: courseForm.learningObjectives.split('\n').filter(Boolean),
                requirements: courseForm.requirements.split('\n').filter(Boolean),
                tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            };
            const res = await courseService.create(payload);
            setCourses([res.data.data, ...courses]);
            setIsCourseModalOpen(false);
            setCourseForm({ courseTitle: '', subtitle: '', descriptionText: '', technicalCategory: 'Web Coding', estimatedDurationHours: 1, level: 'Beginner', language: 'English', price: 0, learningObjectives: '', requirements: '', tags: '' });
        } catch (err) { alert(err.response?.data?.message || 'Failed to create course'); }
    };

    const handleEditCourse = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...courseForm,
                learningObjectives: courseForm.learningObjectives.split('\n').filter(Boolean),
                requirements: courseForm.requirements.split('\n').filter(Boolean),
                tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            };
            const res = await courseService.update(selectedCourse._id, payload);
            setCourses(prev => prev.map(c => c._id === selectedCourse._id ? res.data.data : c));
            setIsEditCourseModal(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to update course'); }
    };

    const handleDeleteCourse = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this course?')) return;
        try {
            await courseService.delete(id);
            setCourses(prev => prev.filter(c => c._id !== id));
        } catch (err) { alert(err.response?.data?.message || 'Failed to delete course'); }
    };

    const handleArchiveCourse = async (id) => {
        try {
            await courseService.archive(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Archived' } : c));
        } catch (err) { alert(err.response?.data?.message || 'Failed to archive'); }
    };

    const handleUnpublishCourse = async (id) => {
        try {
            await courseService.unpublish(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Draft' } : c));
        } catch (err) { alert(err.response?.data?.message || 'Failed to unpublish'); }
    };

    const handleDuplicateCourse = async (id) => {
        try {
            const res = await courseService.duplicate(id);
            setCourses(prev => [res.data.data, ...prev]);
        } catch (err) { alert(err.response?.data?.message || 'Failed to duplicate'); }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await courseService.submitForReview(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Pending Audit' } : c));
        } catch (err) { alert(err.response?.data?.message || 'Submission failed'); }
    };

    // ── Quiz Actions ───────────────────────────────────────────
    const addQuestion = () => {
        setQuizForm(prev => ({
            ...prev,
            questions: [...prev.questions, { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
        }));
    };

    const updateQuestion = (idx, field, value) => {
        setQuizForm(prev => {
            const questions = [...prev.questions];
            questions[idx] = { ...questions[idx], [field]: value };
            return { ...prev, questions };
        });
    };

    const updateOption = (qIdx, oIdx, value) => {
        setQuizForm(prev => {
            const questions = [...prev.questions];
            const options = [...questions[qIdx].options];
            options[oIdx] = value;
            questions[qIdx] = { ...questions[qIdx], options };
            return { ...prev, questions };
        });
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                quizTitle: quizForm.quizTitle,
                courseRef: selectedCourse._id,
                allottedDurationMinutes: quizForm.allottedDurationMinutes,
                passingScoreThreshold: quizForm.passingScoreThreshold,
                submissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                questionArray: quizForm.questions
            };
            await quizService.create(payload);
            alert('Quiz created successfully!');
            setIsQuizModalOpen(false);
            setQuizForm({ quizTitle: '', allottedDurationMinutes: 15, passingScoreThreshold: 60, questions: [{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }] });
        } catch (err) { alert(err.response?.data?.message || 'Failed to create quiz'); }
    };

    // ── Grading Actions ────────────────────────────────────────
    const handleGradeSubmission = async (e) => {
        e.preventDefault();
        try {
            await gradebookService.gradeSubmission(selectedSubmission._id, gradeForm);
            setSubmissions(prev => prev.map(s => s._id === selectedSubmission._id
                ? { ...s, numericalScoreEarned: gradeForm.numericalScoreEarned, isGraded: true } : s));
            setIsGradeModalOpen(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to grade'); }
    };

    // ── Profile Actions ────────────────────────────────────────
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileMsg('');
        try {
            const payload = {
                ...profileForm,
                qualifications: profileForm.qualifications.split('\n').filter(Boolean),
                workExperience: profileForm.workExperience.split('\n').filter(Boolean),
                teachingLanguages: profileForm.teachingLanguages.split(',').map(l => l.trim()).filter(Boolean)
            };
            await userService.updateInstructorProfile(payload);
            setProfileMsg('Profile updated successfully!');
        } catch (err) { alert(err.response?.data?.message || 'Failed to update profile'); }
    };

    // ── Review Reply ───────────────────────────────────────────
    const handleReviewReply = async (reviewId, reply) => {
        try {
            await reviewService.reply(reviewId, reply);
            setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, instructorReply: reply } : r));
        } catch (err) { alert('Failed to reply'); }
    };

    // ── Stat helpers ───────────────────────────────────────────
    const completedCoursesCount = courses.filter(c => c.publicationState === 'Active').length;

    // ═══════════════════════════════════════════════════════════
    // ── TAB RENDERERS ─────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    // ── 1. Overview Tab ────────────────────────────────────────
    const renderOverview = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Dashboard Overview</h2>
                <p style={s.tabSubtitle}>Welcome back, {user?.fullName?.split(' ')[0]}. Here's a summary of your teaching activity.</p>
            </div>
            <div style={s.statsGrid}>
                <div style={{ ...s.statCard, borderTop: '3px solid #3b82f6' }}>
                    <span style={{ ...s.statValue, color: '#3b82f6' }}>{analytics.totalCourses || 0}</span>
                    <span style={s.statLabel}>Total Courses</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #10b981' }}>
                    <span style={{ ...s.statValue, color: '#10b981' }}>{analytics.totalStudents || 0}</span>
                    <span style={s.statLabel}>Enrolled Students</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #f59e0b' }}>
                    <span style={{ ...s.statValue, color: '#f59e0b' }}>{analytics.avgRating || 0}⭐</span>
                    <span style={s.statLabel}>Avg Rating</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #8b5cf6' }}>
                    <span style={{ ...s.statValue, color: '#8b5cf6' }}>{analytics.totalEarnings || 0} ETB</span>
                    <span style={s.statLabel}>Total Earnings</span>
                </div>
            </div>

            {/* Recent Courses */}
            <div style={s.panelCard}>
                <h3 style={s.panelTitle}>Recent Courses</h3>
                {courses.length === 0 ? (
                    <p style={s.emptyText}>No courses yet. Create your first course!</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {courses.slice(0, 3).map(c => (
                            <div key={c._id} style={s.recentItem}>
                                <div>
                                    <span style={{ ...s.badge, background: c.publicationState === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: c.publicationState === 'Active' ? '#10b981' : '#f59e0b' }}>{c.publicationState}</span>
                                    <h4 style={{ color: colors.text, margin: '6px 0 2px', fontSize: '15px', fontWeight: '600' }}>{c.courseTitle}</h4>
                                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{c.technicalCategory} · {c.estimatedDurationHours}h</span>
                                </div>
                                <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '600' }}>{c.totalEnrollments || 0} students</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ── 2. Profile Tab ─────────────────────────────────────────
    const renderProfile = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Profile Management</h2>
                <p style={s.tabSubtitle}>Manage your professional profile, qualifications, and social links</p>
            </div>
            <div style={s.panelCard}>
                {profileMsg && <div style={s.successAlert}>{profileMsg}</div>}
                <form onSubmit={handleProfileUpdate} style={s.formGrid}>
                    <div style={s.formGroup}>
                        <label style={s.label}>Full Name</label>
                        <input style={s.input} value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} required />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Phone Number</label>
                        <input style={s.input} value={profileForm.contactPhone} onChange={e => setProfileForm({ ...profileForm, contactPhone: e.target.value })} placeholder="+251 9XX XXX XXX" />
                    </div>
                    <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                        <label style={s.label}>Biography</label>
                        <textarea style={{ ...s.input, minHeight: '100px' }} value={profileForm.biography} onChange={e => setProfileForm({ ...profileForm, biography: e.target.value })} placeholder="Tell students about yourself..." />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Qualifications (one per line)</label>
                        <textarea style={{ ...s.input, minHeight: '80px' }} value={profileForm.qualifications} onChange={e => setProfileForm({ ...profileForm, qualifications: e.target.value })} placeholder="BSc in Computer Science&#10;Certified AWS Architect" />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Work Experience (one per line)</label>
                        <textarea style={{ ...s.input, minHeight: '80px' }} value={profileForm.workExperience} onChange={e => setProfileForm({ ...profileForm, workExperience: e.target.value })} placeholder="5 years at Google&#10;3 years at Ethio Telecom" />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Teaching Languages (comma separated)</label>
                        <input style={s.input} value={profileForm.teachingLanguages} onChange={e => setProfileForm({ ...profileForm, teachingLanguages: e.target.value })} placeholder="English, Amharic" />
                    </div>

                    {/* Social Links */}
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(30,41,59,0.5)', paddingTop: '20px', marginTop: '8px' }}>
                        <h4 style={{ color: colors.text, margin: '0 0 16px', fontSize: '15px' }}>🔗 Social Media Links</h4>
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>LinkedIn</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.linkedin} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, linkedin: e.target.value } })} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Twitter / X</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.twitter} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, twitter: e.target.value } })} placeholder="https://x.com/..." />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Website</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.website} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, website: e.target.value } })} placeholder="https://yoursite.com" />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>YouTube</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.youtube} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, youtube: e.target.value } })} placeholder="https://youtube.com/@..." />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" style={s.primaryBtn}>Save Profile Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );

    // ── 3. Course Management Tab ───────────────────────────────
    const renderCourses = () => (
        <div>
            <div style={{ ...s.tabHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={s.tabTitle}>Course Management</h2>
                    <p style={s.tabSubtitle}>Create, edit, and manage your course catalog</p>
                </div>
                <button onClick={() => { setCourseForm({ courseTitle: '', subtitle: '', descriptionText: '', technicalCategory: 'Web Coding', estimatedDurationHours: 1, level: 'Beginner', language: 'English', price: 0, learningObjectives: '', requirements: '', tags: '' }); setIsCourseModalOpen(true); }} style={s.primaryBtn}>+ New Course</button>
            </div>

            {/* Stats Row */}
            <div style={{ ...s.statsGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div style={{ ...s.statCard, borderTop: '3px solid #3b82f6' }}>
                    <span style={{ ...s.statValue, color: '#3b82f6', fontSize: '28px' }}>{courses.length}</span>
                    <span style={s.statLabel}>Total Courses</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #10b981' }}>
                    <span style={{ ...s.statValue, color: '#10b981', fontSize: '28px' }}>{courses.filter(c => c.publicationState === 'Active').length}</span>
                    <span style={s.statLabel}>Published</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #f59e0b' }}>
                    <span style={{ ...s.statValue, color: '#f59e0b', fontSize: '28px' }}>{courses.filter(c => c.publicationState === 'Draft').length}</span>
                    <span style={s.statLabel}>Drafts</span>
                </div>
            </div>

            {/* Course Cards */}
            {courses.length === 0 ? (
                <div style={s.emptyBox}><p style={s.emptyText}>You haven't created any courses yet.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {courses.map(c => (
                        <div key={c._id} style={s.courseRow}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                    <span style={{ ...s.badge, background: c.publicationState === 'Active' ? 'rgba(16,185,129,0.15)' : c.publicationState === 'Draft' ? 'rgba(245,158,11,0.15)' : c.publicationState === 'Pending Audit' ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.15)', color: c.publicationState === 'Active' ? '#10b981' : c.publicationState === 'Draft' ? '#f59e0b' : c.publicationState === 'Pending Audit' ? '#60a5fa' : colors.textMuted }}>{c.publicationState}</span>
                                    <h3 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: '700' }}>{c.courseTitle}</h3>
                                </div>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 8px' }}>{c.technicalCategory} · {c.estimatedDurationHours}h · {c.level} · ⭐ {c.averageRating || 0} ({c.totalReviews || 0} reviews)</p>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>{c.descriptionText?.substring(0, 120)}...</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                                {c.publicationState === 'Draft' && (
                                    <>
                                        <button onClick={() => handleSubmitForReview(c._id)} style={s.actionBtn}>📤 Submit for Review</button>
                                        <button onClick={() => { setSelectedCourse(c); setCourseForm({ courseTitle: c.courseTitle, subtitle: c.subtitle || '', descriptionText: c.descriptionText, technicalCategory: c.technicalCategory, estimatedDurationHours: c.estimatedDurationHours, level: c.level || 'Beginner', language: c.language || 'English', price: c.price || 0, learningObjectives: (c.learningObjectives || []).join('\n'), requirements: (c.requirements || []).join('\n'), tags: (c.tags || []).join(', ') }); setIsEditCourseModal(true); }} style={s.actionBtnAlt}>✏️ Edit</button>
                                    </>
                                )}
                                {c.publicationState === 'Active' && (
                                    <>
                                        <button onClick={() => handleArchiveCourse(c._id)} style={s.actionBtnAlt}>📦 Archive</button>
                                        <button onClick={() => handleUnpublishCourse(c._id)} style={s.actionBtnAlt}>⏸ Unpublish</button>
                                    </>
                                )}
                                <button onClick={() => handleDuplicateCourse(c._id)} style={s.actionBtnAlt}>📋 Duplicate</button>
                                <button onClick={() => { setSelectedCourse(c); setIsQuizModalOpen(true); }} style={s.actionBtnAlt}>📝 Add Quiz</button>
                                {c.publicationState !== 'Active' && (
                                    <button onClick={() => handleDeleteCourse(c._id)} style={s.dangerBtn}>🗑 Delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── 4. Student Management Tab ──────────────────────────────
    const renderStudents = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Student Management</h2>
                <p style={s.tabSubtitle}>View enrolled students and their progress</p>
            </div>
            <div style={s.panelCard}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ ...s.label, display: 'block', marginBottom: '8px' }}>Select Course:</label>
                    <select style={s.select} value={selectedCourse?._id || ''} onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value))}>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                    </select>
                </div>
                {selectedCourse && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ ...s.miniStat, borderLeft: '3px solid #3b82f6' }}>
                            <span style={{ color: '#3b82f6', fontSize: '22px', fontWeight: '800' }}>{selectedCourse.totalEnrollments || 0}</span>
                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Enrolled</span>
                        </div>
                        <div style={{ ...s.miniStat, borderLeft: '3px solid #10b981' }}>
                            <span style={{ color: '#10b981', fontSize: '22px', fontWeight: '800' }}>⭐ {selectedCourse.averageRating || 0}</span>
                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Avg Rating</span>
                        </div>
                        <div style={{ ...s.miniStat, borderLeft: '3px solid #8b5cf6' }}>
                            <span style={{ color: '#8b5cf6', fontSize: '22px', fontWeight: '800' }}>{selectedCourse.totalReviews || 0}</span>
                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Reviews</span>
                        </div>
                    </div>
                )}
                <p style={{ color: colors.textMuted, fontSize: '13px' }}>Detailed per-student progress tracking will be available once students begin engaging with the course materials.</p>
            </div>
        </div>
    );

    // ── 5. Grading Portal Tab ──────────────────────────────────
    const renderGrading = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Grading Portal</h2>
                <p style={s.tabSubtitle}>Review and grade student submissions</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
                <label style={{ ...s.label, display: 'block', marginBottom: '8px' }}>Select Course:</label>
                <select style={s.select} value={selectedCourse?._id || ''} onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value))}>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                </select>
            </div>
            {submissions.length === 0 ? (
                <div style={s.emptyBox}><p style={s.emptyText}>No submissions for this course yet.</p></div>
            ) : (
                <div style={s.tableCard}>
                    <table style={s.table}>
                        <thead>
                            <tr style={s.thRow}>
                                <th style={s.th}>Student</th>
                                <th style={s.th}>Assessment</th>
                                <th style={s.th}>Date</th>
                                <th style={s.th}>Status / Score</th>
                                <th style={s.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub._id} style={s.tr}>
                                    <td style={s.td}><strong>{sub.studentRef?.fullName}</strong></td>
                                    <td style={s.td}>{sub.assessmentRef?.quizTitle || 'Assignment'}</td>
                                    <td style={s.td}>{new Date(sub.submissionTimestamp).toLocaleDateString()}</td>
                                    <td style={s.td}>
                                        {sub.isGraded
                                            ? <span style={{ color: '#10b981', fontWeight: '700' }}>{sub.numericalScoreEarned}/100</span>
                                            : <span style={{ ...s.badge, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Needs Grading</span>}
                                    </td>
                                    <td style={s.td}>
                                        <button onClick={() => { setSelectedSubmission(sub); setGradeForm({ numericalScoreEarned: sub.numericalScoreEarned || 0, instructorReviewNotes: sub.instructorReviewNotes || '' }); setIsGradeModalOpen(true); }} style={s.textBtn}>
                                            {sub.isGraded ? '✏️ Edit Grade' : '📝 Grade Now'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // ── 6. Communication Tab ───────────────────────────────────
    const renderCommunication = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Communication Hub</h2>
                <p style={s.tabSubtitle}>Send announcements and communicate with your students</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div style={s.panelCard} onClick={() => navigate('/messages')} role="button">
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Direct Messages</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Send private messages to enrolled students</p>
                </div>
                <div style={s.panelCard}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📢</div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Announcements</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Post announcements visible to all enrolled students</p>
                </div>
                <div style={s.panelCard}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>❓</div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Discussion Forum</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Reply to student questions and discussion posts</p>
                </div>
                <div style={s.panelCard} onClick={() => navigate('/live-sessions')} role="button">
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎥</div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Live Sessions</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Schedule and manage live Q&A sessions</p>
                </div>
            </div>
        </div>
    );

    // ── 7. Reviews Tab ─────────────────────────────────────────
    const renderReviews = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Course Reviews</h2>
                <p style={s.tabSubtitle}>View and respond to student feedback</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
                <label style={{ ...s.label, display: 'block', marginBottom: '8px' }}>Select Course:</label>
                <select style={s.select} value={selectedCourse?._id || ''} onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value))}>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                </select>
            </div>
            {reviews.length === 0 ? (
                <div style={s.emptyBox}><p style={s.emptyText}>No reviews for this course yet.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reviews.map(r => (
                        <div key={r._id} style={s.panelCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div>
                                    <strong style={{ color: colors.text }}>{r.studentRef?.fullName}</strong>
                                    <span style={{ color: colors.textMuted, fontSize: '12px', marginLeft: '12px' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span style={{ color: '#f59e0b', fontWeight: '700' }}>{'⭐'.repeat(r.rating)}</span>
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: '0 0 16px', lineHeight: '1.5' }}>{r.reviewText}</p>
                            {r.instructorReply ? (
                                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                                    <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '700' }}>Your Reply:</span>
                                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0' }}>{r.instructorReply}</p>
                                </div>
                            ) : (
                                <div>
                                    <input id={`reply-${r._id}`} style={{ ...s.input, marginBottom: '8px' }} placeholder="Write a reply..." />
                                    <button onClick={() => { const val = document.getElementById(`reply-${r._id}`).value; if (val) handleReviewReply(r._id, val); }} style={s.actionBtn}>Reply</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── 8. Analytics Tab ───────────────────────────────────────
    const renderAnalytics = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Analytics & Performance</h2>
                <p style={s.tabSubtitle}>Understand your reach, engagement, and revenue</p>
            </div>
            <div style={s.statsGrid}>
                <div style={{ ...s.statCard, borderTop: '3px solid #3b82f6' }}>
                    <span style={{ ...s.statValue, color: '#3b82f6' }}>{analytics.totalStudents || 0}</span>
                    <span style={s.statLabel}>Total Enrollments</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #10b981' }}>
                    <span style={{ ...s.statValue, color: '#10b981' }}>{analytics.clearedStudents || 0}</span>
                    <span style={s.statLabel}>Cleared Students</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #f59e0b' }}>
                    <span style={{ ...s.statValue, color: '#f59e0b' }}>{analytics.avgRating || 0}⭐</span>
                    <span style={s.statLabel}>Average Rating</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #ec4899' }}>
                    <span style={{ ...s.statValue, color: '#ec4899' }}>{analytics.totalReviews || 0}</span>
                    <span style={s.statLabel}>Total Reviews</span>
                </div>
            </div>

            {/* Enrollments by Category */}
            <div style={s.panelCard}>
                <h3 style={s.panelTitle}>Enrollments by Category</h3>
                {analytics.enrollmentsByCategory && Object.keys(analytics.enrollmentsByCategory).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(analytics.enrollmentsByCategory).map(([cat, count]) => (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ color: colors.textMuted, fontSize: '13px', minWidth: '160px' }}>{cat}</span>
                                <div style={{ flex: 1, background: 'rgba(30,41,59,0.5)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '8px', width: `${Math.min((count / (analytics.totalStudents || 1)) * 100, 100)}%` }} />
                                </div>
                                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '700', minWidth: '30px', textAlign: 'right' }}>{count}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={s.emptyText}>No enrollment data available yet.</p>
                )}
            </div>
        </div>
    );

    // ── 9. Earnings Tab ────────────────────────────────────────
    const renderEarnings = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Earnings & Payments</h2>
                <p style={s.tabSubtitle}>Track your revenue and manage payout information</p>
            </div>
            <div style={{ ...s.statsGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div style={{ ...s.statCard, borderTop: '3px solid #10b981' }}>
                    <span style={{ ...s.statValue, color: '#10b981' }}>{analytics.totalEarnings || 0} ETB</span>
                    <span style={s.statLabel}>Total Earnings</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #3b82f6' }}>
                    <span style={{ ...s.statValue, color: '#3b82f6' }}>{analytics.clearedStudents || 0}</span>
                    <span style={s.statLabel}>Paid Students</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #f59e0b' }}>
                    <span style={{ ...s.statValue, color: '#f59e0b' }}>0 ETB</span>
                    <span style={s.statLabel}>Pending Payout</span>
                </div>
            </div>
            <div style={s.panelCard}>
                <h3 style={s.panelTitle}>Revenue Per Course</h3>
                {courses.length === 0 ? (
                    <p style={s.emptyText}>No courses with earnings data.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {courses.map(c => (
                            <div key={c._id} style={s.recentItem}>
                                <div>
                                    <h4 style={{ color: colors.text, margin: 0, fontSize: '14px', fontWeight: '600' }}>{c.courseTitle}</h4>
                                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{c.totalEnrollments || 0} enrollments × {c.price || 0} ETB</span>
                                </div>
                                <span style={{ color: '#10b981', fontSize: '16px', fontWeight: '800' }}>{(c.totalEnrollments || 0) * (c.price || 0)} ETB</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ── 10. Settings Tab ───────────────────────────────────────
    const renderSettings = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Account Settings</h2>
                <p style={s.tabSubtitle}>Configure your preferences and account options</p>
            </div>
            <div style={s.panelCard}>
                <h3 style={s.panelTitle}>Notification Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { key: 'notifyEnrollments', label: 'New Enrollment Notifications', emoji: '🎓' },
                        { key: 'notifyReviews', label: 'New Review Notifications', emoji: '⭐' },
                        { key: 'notifyAssignments', label: 'Assignment Submission Alerts', emoji: '📝' },
                        { key: 'notifyPayments', label: 'Payment Notifications', emoji: '💳' }
                    ].map(pref => (
                        <label key={pref.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={settingsForm[pref.key]} onChange={e => setSettingsForm({ ...settingsForm, [pref.key]: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                            <span style={{ fontSize: '18px' }}>{pref.emoji}</span>
                            <span style={{ color: colors.text, fontSize: '14px' }}>{pref.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div style={s.panelCard}>
                <h3 style={s.panelTitle}>Danger Zone</h3>
                <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px' }}>Permanently deactivate your instructor account. This action cannot be undone.</p>
                <button style={s.dangerBtn}>⚠️ Deactivate Account</button>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════
    // ── MAIN RENDER ───────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    const sidebarTabs = [
        { key: 'overview', label: '🏠 Overview' },
        { key: 'profile', label: '👤 Profile' },
        { key: 'courses', label: '📚 Courses' },
        { key: 'students', label: '🎓 Students' },
        { key: 'grading', label: '📝 Grading' },
        { key: 'communication', label: '💬 Communication' },
        { key: 'reviews', label: '⭐ Reviews' },
        { key: 'analytics', label: '📊 Analytics' },
        { key: 'earnings', label: '💰 Earnings' },
        { key: 'settings', label: '⚙️ Settings' }
    ];

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside style={s.sidebar}>
                <div style={s.logoBox}>
                    <div style={s.logo}>E</div>
                    <span style={s.logoText}>Emare ELMS</span>
                </div>
                <nav style={s.nav}>
                    {sidebarTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                ...s.navItem,
                                background: activeTab === tab.key ? 'rgba(59,130,246,0.12)' : 'transparent',
                                color: activeTab === tab.key ? '#60a5fa' : colors.textMuted,
                                borderLeft: activeTab === tab.key ? '3px solid #3b82f6' : '3px solid transparent'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={toggleTheme} style={s.catalogBtn}>
                        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                    <button onClick={() => navigate('/courses')} style={s.catalogBtn}>📚 Course Catalog</button>
                    <button onClick={() => navigate('/')} style={{ ...s.catalogBtn, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>🏠 Home Page</button>
                    <button onClick={handleLogout} style={s.logoutBtn}>↩ Sign Out</button>
                </div>
            </aside>

            {/* ── Main Content ────────────────────────────────── */}
            <main style={s.main}>
                <header style={s.header}>
                    <div>
                        <h1 style={s.greeting}>Instructor Workspace 🎓</h1>
                        <p style={s.subGreeting}>Empower learners through quality content</p>
                    </div>
                    <div style={s.avatar}>{user?.fullName?.[0]?.toUpperCase()}</div>
                </header>

                {loading ? (
                    <div style={s.loadingBox}>Loading Dashboard...</div>
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'profile' && renderProfile()}
                        {activeTab === 'courses' && renderCourses()}
                        {activeTab === 'students' && renderStudents()}
                        {activeTab === 'grading' && renderGrading()}
                        {activeTab === 'communication' && renderCommunication()}
                        {activeTab === 'reviews' && renderReviews()}
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'earnings' && renderEarnings()}
                        {activeTab === 'settings' && renderSettings()}
                    </>
                )}
            </main>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── MODALS ─────────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}

            {/* Create Course Modal */}
            {isCourseModalOpen && (
                <div style={s.backdrop} onClick={() => setIsCourseModalOpen(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Create New Course</h3>
                            <button onClick={() => setIsCourseModalOpen(false)} style={s.closeBtn}>✕</button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleCreateCourse} style={s.formGrid}>
                                <div style={s.formGroup}><label style={s.label}>Course Title *</label><input style={s.input} required value={courseForm.courseTitle} onChange={e => setCourseForm({ ...courseForm, courseTitle: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Subtitle</label><input style={s.input} value={courseForm.subtitle} onChange={e => setCourseForm({ ...courseForm, subtitle: e.target.value })} /></div>
                                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}><label style={s.label}>Description *</label><textarea style={{ ...s.input, minHeight: '80px' }} required value={courseForm.descriptionText} onChange={e => setCourseForm({ ...courseForm, descriptionText: e.target.value })} /></div>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Category *</label>
                                    <select style={s.select} value={courseForm.technicalCategory} onChange={e => setCourseForm({ ...courseForm, technicalCategory: e.target.value })}>
                                        {['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development', 'Data Science', 'Cyber Security', 'Cloud Computing', 'Artificial Intelligence', 'Business & Marketing'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Difficulty Level</label>
                                    <select style={s.select} value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
                                        {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}><label style={s.label}>Duration (hours) *</label><input style={s.input} type="number" min="1" required value={courseForm.estimatedDurationHours} onChange={e => setCourseForm({ ...courseForm, estimatedDurationHours: e.target.value })} /></div>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Language</label>
                                    <select style={s.select} value={courseForm.language} onChange={e => setCourseForm({ ...courseForm, language: e.target.value })}>
                                        {['English', 'Amharic', 'Afaan Oromo'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}><label style={s.label}>Price (ETB, 0 for Free)</label><input style={s.input} type="number" min="0" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Learning Objectives (one per line)</label><textarea style={{ ...s.input, minHeight: '60px' }} value={courseForm.learningObjectives} onChange={e => setCourseForm({ ...courseForm, learningObjectives: e.target.value })} placeholder="Build responsive websites&#10;Learn React hooks" /></div>
                                <div style={s.formGroup}><label style={s.label}>Prerequisites (one per line)</label><textarea style={{ ...s.input, minHeight: '60px' }} value={courseForm.requirements} onChange={e => setCourseForm({ ...courseForm, requirements: e.target.value })} placeholder="Basic HTML knowledge" /></div>
                                <div style={s.formGroup}><label style={s.label}>Tags (comma separated)</label><input style={s.input} value={courseForm.tags} onChange={e => setCourseForm({ ...courseForm, tags: e.target.value })} placeholder="react, javascript, web" /></div>
                                <div style={{ gridColumn: '1 / -1' }}><button type="submit" style={s.primaryBtn}>Save as Draft</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {isEditCourseModal && (
                <div style={s.backdrop} onClick={() => setIsEditCourseModal(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Edit Course</h3>
                            <button onClick={() => setIsEditCourseModal(false)} style={s.closeBtn}>✕</button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleEditCourse} style={s.formGrid}>
                                <div style={s.formGroup}><label style={s.label}>Course Title</label><input style={s.input} required value={courseForm.courseTitle} onChange={e => setCourseForm({ ...courseForm, courseTitle: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Subtitle</label><input style={s.input} value={courseForm.subtitle} onChange={e => setCourseForm({ ...courseForm, subtitle: e.target.value })} /></div>
                                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}><label style={s.label}>Description</label><textarea style={{ ...s.input, minHeight: '80px' }} required value={courseForm.descriptionText} onChange={e => setCourseForm({ ...courseForm, descriptionText: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Category</label><select style={s.select} value={courseForm.technicalCategory} onChange={e => setCourseForm({ ...courseForm, technicalCategory: e.target.value })}>{['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development', 'Data Science', 'Cyber Security', 'Cloud Computing', 'Artificial Intelligence', 'Business & Marketing'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div style={s.formGroup}><label style={s.label}>Level</label><select style={s.select} value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>{['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                                <div style={s.formGroup}><label style={s.label}>Duration (hours)</label><input style={s.input} type="number" min="1" value={courseForm.estimatedDurationHours} onChange={e => setCourseForm({ ...courseForm, estimatedDurationHours: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Price (ETB)</label><input style={s.input} type="number" min="0" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} /></div>
                                <div style={{ gridColumn: '1 / -1' }}><button type="submit" style={s.primaryBtn}>Update Course</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Builder Modal */}
            {isQuizModalOpen && (
                <div style={s.backdrop} onClick={() => setIsQuizModalOpen(false)}>
                    <div style={{ ...s.modal, maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Create Quiz — {selectedCourse?.courseTitle}</h3>
                            <button onClick={() => setIsQuizModalOpen(false)} style={s.closeBtn}>✕</button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleCreateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={s.formGroup}><label style={s.label}>Quiz Title *</label><input style={s.input} required value={quizForm.quizTitle} onChange={e => setQuizForm({ ...quizForm, quizTitle: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={s.formGroup}><label style={s.label}>Duration (min)</label><input style={s.input} type="number" min="5" max="180" value={quizForm.allottedDurationMinutes} onChange={e => setQuizForm({ ...quizForm, allottedDurationMinutes: e.target.value })} /></div>
                                    <div style={s.formGroup}><label style={s.label}>Passing Score (%)</label><input style={s.input} type="number" min="0" max="100" value={quizForm.passingScoreThreshold} onChange={e => setQuizForm({ ...quizForm, passingScoreThreshold: e.target.value })} /></div>
                                </div>

                                {/* Question Builder */}
                                <div style={{ borderTop: '1px solid rgba(30,41,59,0.5)', paddingTop: '16px' }}>
                                    <h4 style={{ color: colors.text, margin: '0 0 12px', fontSize: '15px' }}>Questions</h4>
                                    {quizForm.questions.map((q, qIdx) => (
                                        <div key={qIdx} style={{ background: colors.bgCard, padding: '16px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(30,41,59,0.5)' }}>
                                            <label style={{ ...s.label, marginBottom: '6px', display: 'block' }}>Q{qIdx + 1}: Question Text</label>
                                            <input style={{ ...s.input, marginBottom: '10px' }} value={q.questionText} onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)} placeholder="Enter question..." />
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <input type="radio" name={`correct-${qIdx}`} checked={q.correctAnswerIndex === oIdx} onChange={() => updateQuestion(qIdx, 'correctAnswerIndex', oIdx)} style={{ accentColor: '#10b981' }} />
                                                    <input style={{ ...s.input, flex: 1 }} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addQuestion} style={s.actionBtnAlt}>+ Add Question</button>
                                </div>
                                <button type="submit" style={s.primaryBtn}>Publish Quiz</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Grade Submission Modal */}
            {isGradeModalOpen && (
                <div style={s.backdrop} onClick={() => setIsGradeModalOpen(false)}>
                    <div style={{ ...s.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Grade Submission</h3>
                            <button onClick={() => setIsGradeModalOpen(false)} style={s.closeBtn}>✕</button>
                        </div>
                        <div style={s.modalBody}>
                            {selectedSubmission?.submittedRepositoryURL && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>Submitted Link:</p>
                                    <a href={selectedSubmission.submittedRepositoryURL} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '13px' }}>{selectedSubmission.submittedRepositoryURL}</a>
                                </div>
                            )}
                            <form onSubmit={handleGradeSubmission} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={s.formGroup}><label style={s.label}>Score (0-100)</label><input style={s.input} type="number" min="0" max="100" required value={gradeForm.numericalScoreEarned} onChange={e => setGradeForm({ ...gradeForm, numericalScoreEarned: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Feedback Notes</label><textarea style={{ ...s.input, minHeight: '100px' }} placeholder="Constructive feedback..." value={gradeForm.instructorReviewNotes} onChange={e => setGradeForm({ ...gradeForm, instructorReviewNotes: e.target.value })} /></div>
                                <button type="submit" style={s.primaryBtn}>Save Grade</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


