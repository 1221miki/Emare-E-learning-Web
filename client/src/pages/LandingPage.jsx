import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService, subscriptionService } from '../services/api.jsx';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
    const { colors, theme } = useTheme();
    const { user, isAuthenticated } = useAuth();
    const [allCourses, setAllCourses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [coursesVisible, setCoursesVisible] = useState(8); // pagination: show 8 initially
    const navigate = useNavigate();

    // ── Subscription state ─────────────────────────────────────────────────
    //
    // subPhase controls exactly what the section renders — prevents any flash:
    //   'loading'       → skeleton / spinner (initial state, shown until DB responds)
    //   'subscribed'    → "You're subscribed!" card
    //   'email_check'   → small "enter email to check status" form (anonymous only)
    //   'form'          → full subscription form
    //
    const [subPhase, setSubPhase] = useState('loading');
    const [subEmail, setSubEmail] = useState('');
    const [subLoading, setSubLoading] = useState(false);
    const [subMessage, setSubMessage] = useState('');
    const [subError, setSubError] = useState('');
    const [subExpiresAt, setSubExpiresAt] = useState(null);

    // Email-check form (anonymous path)
    const [checkEmail, setCheckEmail] = useState('');
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkError, setCheckError] = useState('');

    const statusFetched = useRef(false);

    // ── On mount: hit the backend — database is the source of truth ────────
    useEffect(() => {
        if (statusFetched.current) return;
        statusFetched.current = true;

        subscriptionService.getStatus()
            .then(res => {
                const data = res.data;
                if (data?.isSubscribed) {
                    // Authenticated user OR auth-email matched → subscribed
                    setSubExpiresAt(data.expiresAt || null);
                    setSubPhase('subscribed');
                } else if (data?.requiresEmail) {
                    // Anonymous visitor: backend can't identify them cross-browser
                    // → show a small email-check form so they can verify themselves
                    setSubPhase('email_check');
                } else {
                    // Authenticated user confirmed NOT subscribed
                    setSubPhase('form');
                }
            })
            .catch(() => {
                // Network error — fall back to showing the form (safe default)
                setSubPhase('form');
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Email-check handler (anonymous path) ──────────────────────────────
    const handleCheckEmail = async (e) => {
        e.preventDefault();
        const email = checkEmail.trim().toLowerCase();
        const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!email || !emailRe.test(email)) {
            setCheckError('Please enter a valid email address.');
            return;
        }
        setCheckLoading(true);
        setCheckError('');
        try {
            const res = await subscriptionService.checkEmailStatus(email);
            const data = res.data;
            if (data?.isSubscribed) {
                setSubExpiresAt(data.expiresAt || null);
                setSubPhase('subscribed');
                setSubMessage('Your email is already subscribed. Check your inbox for the coupon code!');
            } else {
                // Not subscribed — pre-fill the subscription form with their email
                setSubEmail(email);
                setSubPhase('form');
            }
        } catch (err) {
            const msg = err?.response?.data?.message;
            if (msg) setCheckError(msg);
            else setCheckError('Could not check status. Please try again.');
        } finally {
            setCheckLoading(false);
        }
    };

    // ── Subscribe handler ──────────────────────────────────────────────────
    const handleSubscribe = async (e) => {
        e.preventDefault();
        const email = subEmail.trim().toLowerCase();
        const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!email) { setSubError('Please enter your email address.'); return; }
        if (!emailRe.test(email)) { setSubError('Please enter a valid email address.'); return; }

        setSubLoading(true);
        setSubError('');

        try {
            const res = await subscriptionService.subscribeForDiscount(email);
            setSubExpiresAt(res.data?.expiresAt || null);
            setSubMessage(res.data?.message || 'Your coupon has been sent to your email!');
            setSubPhase('subscribed');
            setSubEmail('');
        } catch (err) {
            const data = err?.response?.data;
            const code = data?.code;
            if (code === 'EMAIL_ALREADY_SUBSCRIBED' || code === 'ACCOUNT_ALREADY_SUBSCRIBED') {
                setSubPhase('subscribed');
                setSubMessage(data.message || 'This email has already received a discount coupon. Check your inbox!');
            } else if (code === 'DEVICE_ALREADY_SUBSCRIBED') {
                setSubPhase('subscribed');
                setSubMessage(data.message || 'This device has already received a discount coupon.');
            } else if (code === 'RATE_LIMITED') {
                setSubError('Too many attempts. Please wait an hour and try again.');
            } else {
                setSubError(data?.message || 'Something went wrong. Please try again.');
            }
        } finally {
            setSubLoading(false);
        }
    };

    useEffect(() => {
        courseService.getAll()
            .then(res => {
                const courses = res.data?.data || [];
                setAllCourses(courses);
            })
            .catch(console.error);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    };

    // ── DATA MOCKS FOR 21 SECTIONS ──────────────────────────────────────────────

    const stats = [
        { value: `${allCourses.length}+`, label: 'Total Courses', icon: '▧' },
        { value: '25,000+', label: 'Total Students', icon: '◈' },
        { value: '150+', label: 'Total Instructors', icon: '‍◈' },
        { value: '12,000+', label: 'Certificates Issued', icon: '' },
        { value: '1M+', label: 'Learning Hours', icon: '⏱️' },
        { value: '15+', label: 'Countries Reached', icon: '◉' }
    ];

    const categories = [
        { name: 'Programming', icon: '▧', color: '#3b82f6' },
        { name: 'Networking', icon: '', color: '#8b5cf6' },
        { name: 'AI', icon: '⊡', color: '#10b981' },
        { name: 'Cybersecurity', icon: '▣', color: '#f59e0b' },
        { name: 'Web Development', icon: '◉', color: '#06b6d4' },
        { name: 'Mobile Development', icon: '▢', color: '#ec4899' },
        { name: 'Data Science', icon: '▥', color: '#14b8a6' },
        { name: 'Graphic Design', icon: '◆', color: '#a855f7' },
        { name: 'Business', icon: '◈', color: '#84cc16' }
    ];

    const learningPaths = [
        { name: 'Full Stack Developer', icon: '▶', courses: 6, duration: '6 Months' },
        { name: 'UI/UX Designer', icon: '◆', courses: 4, duration: '4 Months' },
        { name: 'AI Engineer', icon: '◎', courses: 8, duration: '8 Months' },
        { name: 'Cybersecurity Specialist', icon: '▣️', courses: 5, duration: '5 Months' },
        { name: 'Data Analyst', icon: '↗', courses: 4, duration: '3 Months' }
    ];

    const whyChooseUs = [
        { title: 'Expert Instructors', desc: 'Learn from industry professionals.', icon: '‍◈' },
        { title: 'Hands-on Projects', desc: 'Build real-world applications.', icon: '◈️' },
        { title: 'Flexible Learning', desc: 'Study at your own pace, anytime.', icon: '⏰' },
        { title: 'Certificates', desc: 'Earn verifiable digital certificates.', icon: '▤' },
        { title: 'Career Support', desc: 'Resume reviews and interview prep.', icon: '⊞' },
        { title: 'Community', desc: 'Join thousands of active learners.', icon: '◉' }
    ];

    const topInstructors = [
        { name: 'Dr. Samuel', skills: 'AI & Data Science', rating: 4.9, students: '12k', avatar: 'S' },
        { name: 'Eng. Bethelhem', skills: 'Full Stack & Mobile', rating: 4.8, students: '15k', avatar: 'B' },
        { name: 'Mr. Dawit', skills: 'Cybersecurity', rating: 4.9, students: '8k', avatar: 'D' },
        { name: 'Ms. Kalkidan', skills: 'UI/UX Design', rating: 4.7, students: '10k', avatar: 'K' }
    ];

    const emareTeam = [
        { name: 'Emare Developers', title: 'Built with dedication and late-night focus', desc: 'Our team worked through the night, often before 9:00 hours, to bring this learning platform to life for Ethiopian students. Every release reflects the passion and persistence of the people behind Emare.', icon: '⚙️' }
    ];

    const testimonials = [
        { name: 'Abeba Tsehay', role: 'Completed: Web Dev Bootcamp', text: 'Emare ICT Hub transformed my career. The courses are practical and the instructors are world-class!', avatar: 'A', rating: 5 },
        { name: 'Yonas Kebede', role: 'Completed: Data Analyst Path', text: 'The hands-on projects helped me build a strong portfolio. Highly recommend this platform.', avatar: 'Y', rating: 5 },
        { name: 'Hiwot Girma', role: 'Completed: UI/UX Masterclass', text: 'Beautiful platform and great learning experience. I landed a job 2 months after finishing.', avatar: 'H', rating: 4 }
    ];

    const liveClasses = [
        { title: 'Advanced React Patterns', date: 'Tomorrow, 6:00 PM', instructor: 'Eng. Bethelhem' },
        { title: 'Intro to Machine Learning', date: 'Friday, 4:00 PM', instructor: 'Dr. Samuel' },
        { title: 'Network Security Basics', date: 'Saturday, 10:00 AM', instructor: 'Mr. Dawit' }
    ];

    const blogArticles = [
        { title: 'Top 5 Tech Skills for 2026', date: 'July 15, 2026', author: 'Admin' },
        { title: 'How to Build a Web App in 10 Days', date: 'July 10, 2026', author: 'Eng. Bethelhem' },
        { title: 'Understanding AI Ethics', date: 'July 05, 2026', author: 'Dr. Samuel' }
    ];

    const faqs = [
        { q: 'How do I enroll in a course?', a: 'Create an account, browse our catalog, and click "Enroll Now".' },
        { q: 'Are there free courses available?', a: 'Yes! We offer several free courses across various categories.' },
        { q: 'Do I receive a certificate?', a: 'Absolutely. Upon successful completion, you receive a digital certificate.' }
    ];

    // Helper to generate generic course cards to satisfy the visual requirements of 11, 12, 13
    const renderCourseCard = (course, tag, tagColor) => (
        <div key={course._id} onClick={() => navigate(`/courses/${course._id}`)} style={p.courseCard}>
            <div style={p.courseImage}>
                {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.courseTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px' }}>◈</span>}
            </div>
            <div style={p.courseBody}>
                <span style={{...p.courseBadge, color: tagColor, background: `${tagColor}15`}}>{tag}</span>
                <h3 style={p.courseTitle}>{course.courseTitle}</h3>
                <p style={p.courseInstructor}>By {course.creatorRef?.fullName || 'Emare Instructor'}</p>
                <div style={p.courseMeta}>
                    <span style={{ color: '#fbbf24' }}> {course.averageRating || '4.8'}</span>
                    <span style={{ color: colors.textMuted }}>({course.totalReviews || 120})</span>
                    <span style={{ color: colors.textMuted }}>· {course.estimatedDurationHours || 5}h</span>
                    <span style={{ color: colors.textMuted }}>· {course.level || 'Beginner'}</span>
                </div>
                <div style={p.courseFooter}>
                    <span style={p.coursePrice}>{course.price === 0 ? 'Free' : `${course.price} ETB`}</span>
                    <button style={p.enrollBtn}>Enroll Now</button>
                </div>
            </div>
        </div>
    );

    // allCourses is the single source — unified grid handles all display logic

    // ── STYLES ──────────────────────────────────────────────────────────────

    const p = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", overflowX: 'hidden' },
        hero: { position: 'relative', padding: '120px 5% 100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '40px', overflow: 'hidden', textAlign: 'center' },
        heroContent: { flex: '1 1 520px', maxWidth: '700px', zIndex: 2, position: 'relative', textAlign: 'left', minWidth: '280px' },
        heroImageWrapper: { flex: '0 0 520px', width: '100%', maxWidth: '520px', minHeight: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2, position: 'relative' },
        heroImageOverlay: { position: 'absolute', inset: 0, borderRadius: '32px', background: 'linear-gradient(180deg, rgba(6,10,78,0.10), rgba(6,10,78,0.35))', pointerEvents: 'none' },
        heroImage: { width: '100%', height: '100%', maxHeight: '620px', minHeight: '360px', borderRadius: '32px', objectFit: 'cover', boxShadow: '0 40px 120px rgba(0,0,0,0.18)', border: `1px solid ${colors.border}` },
        heroTitle: { fontSize: '60px', fontWeight: '900', lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-2px', color: colors.text },
        heroSubtitleAnimated: { fontSize: '32px', fontWeight: '700', lineHeight: 1.2, margin: '0 0 40px', maxWidth: '600px', color: colors.primary, minHeight: '50px' },
        heroSubtitle: { fontSize: '18px', color: colors.textMuted, lineHeight: 1.7, margin: '0 0 32px', maxWidth: '600px' },
        searchForm: { display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '600px', margin: '0 0 32px', background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
        searchInput: { flex: '1 1 260px', background: 'transparent', border: 'none', color: colors.text, padding: '18px 24px', fontSize: '15px', outline: 'none', minWidth: '180px' },
        searchBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '16px 28px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', flex: '0 0 auto' },
        heroActions: { display: 'flex', gap: '16px', justifyContent: 'flex-start', flexWrap: 'wrap' },
        primaryBtn: { background: colors.text, color: colors.bg, border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
        secondaryBtn: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
        heroGlow1: { position: 'absolute', width: '600px', height: '600px', background: colors.primary, filter: 'blur(150px)', opacity: theme === 'dark' ? 0.12 : 0.05, top: '-200px', left: '-100px', borderRadius: '50%' },
        heroGlow2: { position: 'absolute', width: '500px', height: '500px', background: colors.accent, filter: 'blur(150px)', opacity: theme === 'dark' ? 0.12 : 0.05, bottom: '-100px', right: '-100px', borderRadius: '50%' },

        statsSection: { padding: '40px 5%', background: colors.bgCard, borderBottom: `1px solid ${colors.border}` },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '20px', maxWidth: '1400px', margin: '0 auto' },
        statBox: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
        statValue: { fontSize: '24px', fontWeight: '900', color: colors.text },
        statLabel: { color: colors.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },

        section: { padding: '80px 5%', maxWidth: '1400px', margin: '0 auto' },
        sectionHeader: { textAlign: 'center', marginBottom: '50px' },
        sectionBadge: { display: 'inline-block', padding: '6px 16px', background: `${colors.primary}15`, color: colors.primary, borderRadius: '20px', fontWeight: '700', fontSize: '13px', marginBottom: '16px', border: `1px solid ${colors.primary}30` },
        sectionTitle: { fontSize: '36px', fontWeight: '900', margin: '0 0 12px', color: colors.text },
        sectionSubtitle: { color: colors.textMuted, fontSize: '17px', margin: 0 },

        grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
        grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
        grid6: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '20px' },
        
        categoryCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        
        courseCard: { background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
        courseImage: { height: '180px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${colors.border}` },
        courseBody: { padding: '22px' },
        courseBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' },
        courseTitle: { fontSize: '17px', fontWeight: '700', margin: '0 0 6px', lineHeight: 1.4, color: colors.text },
        courseInstructor: { color: colors.textMuted, fontSize: '13px', margin: '0 0 12px' },
        courseMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px' },
        courseFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: `1px solid ${colors.border}` },
        coursePrice: { fontSize: '20px', fontWeight: '800', color: colors.text },
        enrollBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },

        pathCard: { background: colors.bgCard, borderRadius: '16px', padding: '28px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        
        instructorCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        instructorAvatar: { width: '80px', height: '80px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', margin: '0 auto 16px' },

        testimonialCard: { background: colors.bgCard, borderRadius: '16px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },

        liveCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.primary}50`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 20px ${colors.primary}10` },

        blogCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },

        certificateMockup: { background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.bgInput})`, border: `4px solid ${colors.primary}`, borderRadius: '20px', padding: '60px', textAlign: 'center', maxWidth: '800px', margin: '0 auto', boxShadow: `0 20px 50px ${colors.primary}20` },

        faqContainer: { maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' },
        faqItem: { background: colors.bgCard, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'border-color 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
        
        ctaSection: { padding: '80px 5%', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, textAlign: 'center' },
        
        footer: { padding: '80px 5% 0', borderTop: `1px solid ${colors.border}`, background: colors.bgCard },
        footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '40px', maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' },
        footerTitle: { color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 20px' },
        footerLink: { display: 'block', color: colors.textMuted, textDecoration: 'none', fontSize: '14px', marginBottom: '12px', transition: 'color 0.2s' },
        footerBottom: { borderTop: `1px solid ${colors.border}`, padding: '24px 0', textAlign: 'center', color: colors.textMuted, fontSize: '13px' },
        logoMark: { width: '32px', height: '32px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: '900', fontSize: '18px' }
    };

    return (
        <div style={{ ...p.page, background: colors.bg, color: colors.text }}>
            {/* 1 & 2. Top Announcement Bar & Navigation Bar are inside the Navbar Component */}
            <Navbar />

            {/* 3. Hero Section */}
            <section className="landing-hero" style={p.hero}>
                <div className="landing-hero-content" style={p.heroContent}>
                    <h1 style={p.heroTitle}>Welcome to Emare ICT Hub</h1>
                    <h2 style={p.heroSubtitleAnimated}>
                        Master In-Demand Tech Skills, Build Your Future, and Become Job Ready.
                    </h2>
                    <form onSubmit={handleSearch} style={p.searchForm}>
                        <input type="text" placeholder="Search for courses, paths, or instructors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={p.searchInput} />
                        <button type="submit" style={p.searchBtn}>Search Courses</button>
                    </form>
                    <div className="landing-hero-actions" style={p.heroActions}>
                        <button onClick={() => navigate('/courses')} style={p.primaryBtn}>Browse Courses</button>
                        <button onClick={() => navigate('/courses')} style={p.secondaryBtn}>Start Learning for Free</button>
                    </div>
                </div>
                <div className="landing-hero-image-wrapper" style={p.heroImageWrapper}>
                    <img className="landing-hero-image" src="/images/home.avif" alt="Emare ICT Hub home" style={p.heroImage} />
                    <div style={p.heroImageOverlay} />
                </div>
            </section>

            {/* 4. Platform Statistics */}
            <section style={p.statsSection}>
                <div style={p.statsGrid}>
                    {stats.map((s, i) => (
                        <div key={i} style={p.statBox}>
                            <span style={{ fontSize: '32px' }}>{s.icon}</span>
                            <span style={p.statValue}>{s.value}</span>
                            <span style={p.statLabel}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Services Section ─────────────────────────────────────────── */}
            <section id="services" style={{
                background: theme === 'dark' ? '#0d1117' : '#0f1b2d',
                padding: '80px 5%',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Badge */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{
                        display: 'inline-block',
                        background: 'rgba(34,197,94,0.12)',
                        color: '#22c55e',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '999px',
                        padding: '5px 18px',
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                    }}>OUR SERVICES</span>
                </div>

                {/* Heading */}
                <h2 style={{
                    textAlign: 'center',
                    color: '#ffffff',
                    fontSize: 'clamp(28px, 5vw, 44px)',
                    fontWeight: '800',
                    margin: '0 0 56px',
                    lineHeight: 1.2
                }}>
                    Explore unlimited possibilities
                </h2>

                {/* 7 Service Cards — responsive grid */}
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    {[
                        {
                            icon: '💻',
                            title: 'Mobile & Web Development',
                            desc: 'We develop high-quality mobile apps and websites tailored to client requirements.'
                        },
                        {
                            icon: '🎓',
                            title: 'Training Programs',
                            desc: 'Regular courses in software development, web design, graphic design, digital marketing, and more.'
                        },
                        {
                            icon: '🚀',
                            title: 'Business Incubation',
                            desc: 'Support for startups and entrepreneurs through mentorship and access to funding opportunities.'
                        },
                        {
                            icon: '🤝',
                            title: 'Networking Events',
                            desc: 'Opportunities for collaboration and networking among tech professionals and local businesses.'
                        },
                        {
                            icon: '🌍',
                            title: 'Community Outreach',
                            desc: 'Programs targeting schools and communities to promote ICT literacy.'
                        },
                        {
                            icon: '🖥️',
                            title: 'Online Trainings',
                            desc: 'Opportunities for those who want to train online and earn a certificate.'
                        },
                        {
                            icon: '🏢',
                            title: 'Co-working Spaces',
                            desc: 'A collaborative workspace equipped with computers, high-speed internet, and essential software.'
                        }
                    ].map((service, i) => (
                        <div
                            key={i}
                            style={{
                                background: '#161d2b',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '16px',
                                padding: '32px 28px',
                                transition: 'border-color 0.25s, transform 0.25s',
                                cursor: 'default'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'rgba(34,197,94,0.45)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: 'rgba(34,197,94,0.1)',
                                border: '1px solid rgba(34,197,94,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                marginBottom: '20px'
                            }}>
                                {service.icon}
                            </div>

                            {/* Title */}
                            <h3 style={{
                                color: '#ffffff',
                                fontSize: '17px',
                                fontWeight: '700',
                                margin: '0 0 12px'
                            }}>
                                {service.title}
                            </h3>

                            {/* Description */}
                            <p style={{
                                color: '#94a3b8',
                                fontSize: '14px',
                                lineHeight: '1.65',
                                margin: 0
                            }}>
                                {service.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. Popular Categories */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Explore</span>
                    <h2 style={p.sectionTitle}>Popular Categories</h2>
                    <p style={p.sectionSubtitle}>Find courses in your area of interest</p>
                </div>
                <div style={p.grid6}>
                    {categories.slice(0, 6).map((cat, i) => (
                        <div key={i} style={{ ...p.categoryCard, cursor: 'pointer' }}
                            onClick={() => navigate(`/courses?category=${encodeURIComponent(cat.name)}`)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 25px ${cat.color}25`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>{cat.icon}</span>
                            <h3 style={{ color: colors.text, fontSize: '16px', margin: '0 0 4px' }}>{cat.name}</h3>
                            <span style={{ color: cat.color, fontSize: '12px', fontWeight: '600' }}>Browse →</span>
                        </div>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button onClick={() => navigate('/categories')}
                        style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                        View All Categories →
                    </button>
                </div>
            </section>

            {/* 6. Explore Our Courses — unified, deduplicated */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>EXPLORE COURSES</span>
                    <h2 style={p.sectionTitle}>Explore Our Courses</h2>
                    <p style={p.sectionSubtitle}>Discover all available courses — enroll and start learning today</p>
                </div>

                {allCourses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
                        <p style={{ fontSize: '16px' }}>No courses available yet. Check back soon!</p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '24px',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            {allCourses.slice(0, coursesVisible).map(c => renderCourseCard(c, c.price === 0 ? 'FREE' : 'COURSE', c.price === 0 ? colors.success : colors.primary))}
                        </div>

                        {/* Load More / Show Less */}
                        {allCourses.length > 8 && (
                            <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {coursesVisible < allCourses.length && (
                                    <button
                                        onClick={() => setCoursesVisible(v => Math.min(v + 8, allCourses.length))}
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '13px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Load More Courses ({allCourses.length - coursesVisible} remaining)
                                    </button>
                                )}
                                {coursesVisible > 8 && (
                                    <button
                                        onClick={() => setCoursesVisible(8)}
                                        style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '13px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Show Less
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/courses')}
                                    style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '13px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    View Full Catalog →
                                </button>
                            </div>
                        )}
                        {allCourses.length <= 8 && (
                            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                                <button onClick={() => navigate('/courses')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                                    View Full Catalog →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* 14. Upcoming Live Classes */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Live Interaction</span>
                    <h2 style={p.sectionTitle}>Upcoming Live Classes</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
                    {liveClasses.map((live, i) => (
                        <div key={i} style={p.liveCard}>
                            <div>
                                <h3 style={{ margin: '0 0 8px', color: colors.text, fontSize: '18px' }}>{live.title}</h3>
                                <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>Instructor: {live.instructor}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                <div style={{ color: colors.primary, fontWeight: '700' }}>▦ {live.date}</div>
                                <button style={p.primaryBtn}>Reserve Seat</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 15. Student Success Stories */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Impact</span>
                    <h2 style={p.sectionTitle}>Student Success Stories</h2>
                </div>
                <div style={{ maxWidth: '1000px', margin: '0 auto', background: colors.bgCard, borderRadius: '24px', overflow: 'hidden', border: `1px solid ${colors.border}`, display: 'flex' }}>
                    <div style={{ flex: 1, background: colors.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>▶</div>
                    <div style={{ flex: 1, padding: '40px' }}>
                        <div style={{ fontSize: '40px', color: colors.primary, marginBottom: '20px' }}>"</div>
                        <h3 style={{ fontSize: '24px', color: colors.text, margin: '0 0 16px', lineHeight: 1.4 }}>I transitioned from a high school graduate to a Junior Developer in 6 months using Emare ICT Hub.</h3>
                        <p style={{ color: colors.textMuted, margin: '0 0 24px' }}>- Yabsera, Junior Full Stack Developer at TechEth</p>
                        <button style={p.secondaryBtn}>Read Full Story</button>
                    </div>
                </div>
            </section>

            {/* 16. Certificate Showcase */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Achievement</span>
                    <h2 style={p.sectionTitle}>Earn Verifiable Certificates</h2>
                </div>
                <div style={p.certificateMockup}>
                    <h1 style={{ color: colors.primary, fontSize: '40px', margin: '0 0 20px', fontFamily: 'serif' }}>Certificate of Completion</h1>
                    <p style={{ color: colors.text, fontSize: '18px', margin: '0 0 20px' }}>This is to certify that</p>
                    <h2 style={{ color: colors.text, fontSize: '32px', margin: '0 0 20px', textDecoration: 'underline' }}>[Your Name Here]</h2>
                    <p style={{ color: colors.text, fontSize: '18px', margin: '0 0 40px' }}>has successfully completed the <strong>Full Stack Web Development Masterclass</strong>.</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px solid ${colors.border}`, paddingTop: '20px' }}>
                        <div style={{ textAlign: 'left' }}><div style={{ borderBottom: `1px solid ${colors.text}`, width: '150px', marginBottom: '8px' }}></div><span style={{ color: colors.textMuted }}>Date</span></div>
                        <div style={{ width: '80px', height: '80px', background: colors.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '12px', textAlign: 'center' }}>Official<br/>Seal</div>
                        <div style={{ textAlign: 'right' }}><div style={{ borderBottom: `1px solid ${colors.text}`, width: '150px', marginBottom: '8px' }}></div><span style={{ color: colors.textMuted }}>Instructor Signature</span></div>
                    </div>
                </div>
            </section>

            {/* 17. Blog & Learning Articles */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Resources</span>
                    <h2 style={p.sectionTitle}>Blog & Learning Articles</h2>
                </div>
                <div style={p.grid3}>
                    {blogArticles.map((b, i) => (
                        <div key={i} style={p.blogCard}>
                            <div style={{ height: '160px', background: colors.bgInput, borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>▤</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px', marginBottom: '12px' }}>
                                <span>{b.date}</span>
                                <span>By {b.author}</span>
                            </div>
                            <h3 style={{ color: colors.text, fontSize: '18px', margin: '0 0 16px', lineHeight: 1.4 }}>{b.title}</h3>
                            <span style={{ color: colors.primary, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Read Article →</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 18. Frequently Asked Questions */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Support</span>
                    <h2 style={p.sectionTitle}>Frequently Asked Questions</h2>
                </div>
                <div style={p.faqContainer}>
                    {faqs.map((faq, i) => (
                        <div key={i} style={p.faqItem} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                            <div style={p.faqQuestion}>
                                <span>{faq.q}</span>
                                <span style={{ color: colors.primary, fontSize: '20px', fontWeight: '700' }}>{activeFaq === i ? '−' : '+'}</span>
                            </div>
                            {activeFaq === i && <p style={p.faqAnswer}>{faq.a}</p>}
                        </div>
                    ))}
                </div>
            </section>

            {/* 19. Call to Action */}
            <section style={p.ctaSection}>
                <h2 style={p.sectionTitle}>Ready to transform your future?</h2>
                <p style={{ color: colors.textMuted, fontSize: '18px', margin: '0 0 40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Join the premier digital learning platform in Ethiopia. Start learning today or share your knowledge as an instructor.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/courses')} style={{ ...p.primaryBtn, padding: '16px 36px', fontSize: '16px' }}>Start Learning</button>
                    <button onClick={() => navigate('/register')} style={{ ...p.secondaryBtn, padding: '16px 36px', fontSize: '16px' }}>Become an Instructor</button>
                    <button onClick={() => navigate('/contact')} style={{ background: 'transparent', border: 'none', color: colors.text, padding: '16px 36px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>Contact Us</button>
                </div>
            </section>

            {/* 20. Discount Subscription */}
            <section style={{
                padding: '72px 5%',
                background: theme === 'dark'
                    ? 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(124,58,237,0.15) 100%)'
                    : 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
                borderTop: `1px solid ${colors.border}`,
                borderBottom: `1px solid ${colors.border}`,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>

                    {/* ── PHASE: loading ── skeleton, no flash */}
                    {subPhase === 'loading' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
                            <div style={{ width: '120px', height: '20px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0', animation: 'pulse 1.4s ease-in-out infinite' }} />
                            <div style={{ width: '280px', height: '32px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0', animation: 'pulse 1.4s ease-in-out infinite' }} />
                            <div style={{ width: '400px', maxWidth: '90%', height: '16px', borderRadius: '8px', background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0', animation: 'pulse 1.4s ease-in-out infinite' }} />
                            <div style={{ width: '340px', maxWidth: '90%', height: '16px', borderRadius: '8px', background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        </div>
                    )}

                    {/* ── PHASE: subscribed ── shown regardless of browser */}
                    {subPhase === 'subscribed' && (
                        <>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme === 'dark' ? 'rgba(16,185,129,0.2)' : '#d1fae5', color: theme === 'dark' ? '#34d399' : '#065f46', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
                                ✅ Subscribed
                            </div>
                            <div style={{ background: theme === 'dark' ? 'rgba(16,185,129,0.12)' : '#f0fdf4', border: `1.5px solid ${theme === 'dark' ? 'rgba(16,185,129,0.35)' : '#86efac'}`, borderRadius: '16px', padding: '32px 28px' }}>
                                <div style={{ fontSize: '44px', marginBottom: '14px' }}>🎉</div>
                                <h4 style={{ color: theme === 'dark' ? '#34d399' : '#065f46', fontSize: '20px', fontWeight: '800', margin: '0 0 12px' }}>
                                    You're subscribed!
                                </h4>
                                <p style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontSize: '14px', margin: '0 0 10px', lineHeight: 1.65 }}>
                                    {subMessage || 'Your discount coupon code has been sent to your email.'}
                                </p>
                                {subExpiresAt && (
                                    <p style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: '12px', margin: 0 }}>
                                        Coupon expires: {new Date(subExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── PHASE: email_check ── anonymous cross-browser verification */}
                    {subPhase === 'email_check' && (
                        <>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme === 'dark' ? 'rgba(99,102,241,0.2)' : '#e0e7ff', color: theme === 'dark' ? '#a5b4fc' : '#4338ca', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
                                🎁 Limited Time Offer
                            </div>
                            <h3 style={{ color: colors.text, fontSize: '26px', fontWeight: '900', margin: '0 0 10px', lineHeight: 1.25 }}>
                                Get 10% Off Your First Course
                            </h3>
                            <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.7, margin: '0 0 28px' }}>
                                Already subscribed? Enter your email to restore your subscription status, or use a new email to subscribe.
                            </p>
                            <form onSubmit={handleCheckEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '480px', flexWrap: 'wrap' }}>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter your email address"
                                        value={checkEmail}
                                        onChange={e => { setCheckEmail(e.target.value); setCheckError(''); }}
                                        disabled={checkLoading}
                                        style={{
                                            flex: '1 1 220px',
                                            background: colors.bgInput,
                                            border: `1.5px solid ${checkError ? '#ef4444' : colors.border}`,
                                            color: colors.text,
                                            padding: '13px 16px',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            opacity: checkLoading ? 0.7 : 1,
                                            transition: 'border-color 0.2s'
                                        }}
                                        aria-label="Email address to check subscription status"
                                    />
                                    <button
                                        type="submit"
                                        disabled={checkLoading}
                                        style={{
                                            flex: '0 0 auto',
                                            background: checkLoading ? colors.textMuted : 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                                            color: '#fff', border: 'none', borderRadius: '10px',
                                            padding: '13px 24px', fontSize: '14px', fontWeight: '700',
                                            cursor: checkLoading ? 'not-allowed' : 'pointer',
                                            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '7px'
                                        }}
                                        aria-label="Check subscription status"
                                    >
                                        {checkLoading
                                            ? <><span style={{ display: 'inline-block', width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking…</>
                                            : '🔍 Check Status'}
                                    </button>
                                </div>
                                {checkError && (
                                    <p role="alert" style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', margin: 0 }}>⚠ {checkError}</p>
                                )}
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                                    🔒 We only check whether your email is subscribed. No data is shared.
                                </p>
                            </form>
                        </>
                    )}

                    {/* ── PHASE: form ── full subscription form */}
                    {subPhase === 'form' && (
                        <>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme === 'dark' ? 'rgba(99,102,241,0.2)' : '#e0e7ff', color: theme === 'dark' ? '#a5b4fc' : '#4338ca', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
                                🎁 Limited Time Offer
                            </div>
                            <h3 style={{ color: colors.text, fontSize: '28px', fontWeight: '900', margin: '0 0 12px', lineHeight: 1.25 }}>
                                Get 10% Off Your First Course
                            </h3>
                            <p style={{ color: colors.textMuted, fontSize: '15px', lineHeight: 1.7, margin: '0 0 32px' }}>
                                Subscribe to our newsletter and instantly receive an exclusive discount coupon delivered straight to your inbox. No spam — just great courses and learning tips.
                            </p>
                            <form onSubmit={handleSubscribe} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '480px', flexWrap: 'wrap' }}>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter your email address"
                                        value={subEmail}
                                        onChange={e => { setSubEmail(e.target.value); setSubError(''); }}
                                        disabled={subLoading}
                                        style={{
                                            flex: '1 1 220px',
                                            background: colors.bgInput,
                                            border: `1.5px solid ${subError ? '#ef4444' : colors.border}`,
                                            color: colors.text,
                                            padding: '14px 18px',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            opacity: subLoading ? 0.7 : 1,
                                            transition: 'border-color 0.2s'
                                        }}
                                        aria-label="Email address for discount subscription"
                                    />
                                    <button
                                        type="submit"
                                        disabled={subLoading}
                                        style={{
                                            flex: '0 0 auto',
                                            background: subLoading ? colors.textMuted : 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                                            color: '#fff', border: 'none', borderRadius: '10px',
                                            padding: '14px 28px', fontSize: '14px', fontWeight: '700',
                                            cursor: subLoading ? 'not-allowed' : 'pointer',
                                            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                        aria-label="Subscribe to get discount coupon"
                                    >
                                        {subLoading
                                            ? <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Sending…</>
                                            : <>🎁 Get My Coupon</>}
                                    </button>
                                </div>
                                {subError && (
                                    <p role="alert" style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', margin: 0 }}>⚠ {subError}</p>
                                )}
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                                    🔒 No spam, ever. Unsubscribe anytime. One coupon per subscriber.
                                </p>
                            </form>
                        </>
                    )}

                    {/* Feature chips — shown on check and form phases */}
                    {(subPhase === 'form' || subPhase === 'email_check') && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '28px' }}>
                            {[
                                { icon: '🏷️', text: '10% off any course' },
                                { icon: '⚡', text: 'Instant delivery' },
                                { icon: '📅', text: 'Valid 30 days' },
                                { icon: '🔒', text: 'Single use, secure' }
                            ].map(({ icon, text }) => (
                                <span key={text} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff', border: `1px solid ${colors.border}`, borderRadius: '100px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: colors.text }}>
                                    {icon} {text}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `}</style>
            </section>

            {/* 21. Footer */}
            <footer style={p.footer}>
                <div style={p.footerGrid}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={p.logoMark}>E</div>
                            <span style={{ color: colors.text, fontWeight: '800', fontSize: '18px' }}>Emare ICT Hub</span>
                        </div>
                        <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.6, maxWidth: '280px' }}>
                            Empowering Ethiopia's next generation of tech leaders through quality, accessible e-learning.
                        </p>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Quick Links</h4>
                        <Link to="/" style={p.footerLink}>Home</Link>
                        <Link to="/about" style={p.footerLink}>About Us</Link>
                        <Link to="/courses" style={p.footerLink}>Courses</Link>
                        <Link to="/categories" style={p.footerLink}>Categories</Link>
                        <Link to="/search" style={p.footerLink}>Search</Link>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Categories</h4>
                        <Link to="/courses?category=Programming" style={p.footerLink}>Programming</Link>
                        <Link to="/courses?category=Cybersecurity" style={p.footerLink}>Cybersecurity</Link>
                        <Link to="/courses?category=Data Science" style={p.footerLink}>Data Science</Link>
                        <Link to="/courses?free=true" style={p.footerLink}>Free Courses</Link>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Support</h4>
                        <Link to="/help" style={p.footerLink}>Help Center</Link>
                        <Link to="/contact" style={p.footerLink}>Contact Us</Link>
                        <Link to="/contact" style={p.footerLink}>Report Issue</Link>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Legal</h4>
                        <Link to="/privacy" style={p.footerLink}>Privacy Policy</Link>
                        <Link to="/terms" style={p.footerLink}>Terms &amp; Conditions</Link>
                        <Link to="/cookies" style={p.footerLink}>Cookie Policy</Link>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <div style={{ width: '32px', height: '32px', background: colors.bgInput, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}></div>
                            <div style={{ width: '32px', height: '32px', background: colors.bgInput, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>◇</div>
                            <div style={{ width: '32px', height: '32px', background: colors.bgInput, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>◇</div>
                        </div>
                    </div>
                </div>
                <div style={p.footerBottom}>
                    <p>© {new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
