import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API, { courseService, subscriptionService, userService, liveSessionService, eventService } from '../services/api.jsx';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import HeroVideoControls from '../components/HeroVideoControls';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, Phone, Mail, Clock, Volume2 } from 'lucide-react';
import { FaFacebookF, FaTiktok, FaTelegramPlane, FaInstagram, FaLinkedinIn } from 'react-icons/fa';

export default function LandingPage() {
    const { colors, theme } = useTheme();
    const { user, isAuthenticated } = useAuth();
    const [allCourses, setAllCourses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [platformStats, setPlatformStats] = useState(null); // real stats from DB
    const [coursesVisible, setCoursesVisible] = useState(8); // pagination: show 8 initially
    const heroVideoRef = useRef(null);
    const [heroMuted,   setHeroMuted]   = useState(true);
    const [contactStatus, setContactStatus] = useState(null);
    // Contact form state — persisted to MongoDB via POST /api/contact
    const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [contactErrors, setContactErrors] = useState({});
    const [contactLoading, setContactLoading] = useState(false);
    const [contactApiError, setContactApiError] = useState('');
    const [upcomingSessions, setUpcomingSessions] = useState([]); // real live sessions from DB
    const [publicEvents, setPublicEvents] = useState([]); // published events created from the admin event form
    const [reservingId, setReservingId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // ── Scroll to a section when arriving via hash (#services, #contact) ────
    useEffect(() => {
        const target = location.state?.scrollTo || (location.hash ? location.hash.replace('#', '') : null);
        if (!target) return;
        const id = window.requestAnimationFrame(() => {
            const el = document.getElementById(target);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
        return () => window.cancelAnimationFrame(id);
    }, [location.state?.scrollTo, location.hash]);

    // Prefill contact form from the authenticated account (still editable)
    useEffect(() => {
        if (isAuthenticated && user) {
            setContactForm(prev => ({
                ...prev,
                name: prev.name || user.fullName || '',
                email: prev.email || user.accountEmail || '',
                phone: prev.phone || user.contactPhone || ''
            }));
        }
    }, [isAuthenticated, user]);

    const handleContactChange = (e) => {
        const { name, value } = e.target;
        const val = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
        setContactForm(prev => ({ ...prev, [name]: val }));
        setContactErrors(prev => ({ ...prev, [name]: undefined }));
        if (contactApiError) setContactApiError('');
    };

    const validateContactForm = () => {
        const errors = {};
        if (!contactForm.name.trim()) errors.name = 'Name is required.';
        if (!contactForm.phone.trim()) errors.phone = 'Phone number is required.';
        else if (!/^(09|07)\d{8}$/.test(contactForm.phone.replace(/[\s-]/g, ''))) errors.phone = 'Phone number must start with 09 or 07 and be exactly 10 digits (e.g. 0912345678).';
        if (!contactForm.email.trim()) errors.email = 'Email is required.';
        else if (!/@gmail\.com$/.test(contactForm.email.trim().toLowerCase()) || !/^[^\s@]+@gmail\.com$/.test(contactForm.email.trim().toLowerCase())) errors.email = 'Please enter a valid Gmail address (must end with @gmail.com).';
        if (contactForm.message.trim().length < 5) errors.message = 'Message must be at least 5 characters.';
        return errors;
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setContactStatus(null);
        setContactApiError('');

        const errors = validateContactForm();
        if (Object.keys(errors).length > 0) {
            setContactErrors(errors);
            return;
        }

        try {
            setContactLoading(true);
            await API.post('/contact', {
                name: contactForm.name,
                phone: contactForm.phone,
                email: contactForm.email,
                message: contactForm.message
            });
            setContactStatus('Your message has been sent successfully. The administrator will respond to you soon — check the Support Messages page in your account (or your email) for the response.');
            setContactForm({ name: '', phone: '', email: '', message: '' });
            setContactErrors({});
        } catch (err) {
            setContactApiError(err.response?.data?.message || 'Failed to send your message. Please try again.');
        } finally {
            setContactLoading(false);
        }
    };

    // ── Subscription state ─────────────────────────────────────────────────
    //
    // subPhase controls exactly what the section renders — no loading skeleton:
    //   'subscribed'    → "You're subscribed!" card
    //   'email_check'   → small "enter email to check status" form (anonymous only)
    //   'form'          → full subscription form
    //
    const [subPhase, setSubPhase] = useState('form');
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
    }, []);

    // ── Email-check handler (anonymous path) ──────────────────────────────
    // Fetch published events so admin-created events appear on the homepage
    useEffect(() => {
        let isMounted = true;
        eventService.getAll()
            .then(res => {
                if (!isMounted) return;
                const events = (res.data?.data || [])
                    .filter(ev => ev.status !== 'CANCELLED')
                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                setPublicEvents(events);
            })
            .catch(() => { /* events section stays empty on failure */ });
        return () => { isMounted = false; };
    }, []);

    const handleCheckEmail = async (e) => {
        e.preventDefault();
        const email = checkEmail.trim().toLowerCase();
        const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
        const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
        // Fetch real courses
        courseService.getAll()
            .then(res => setAllCourses(res.data?.data || []))
            .catch(console.error);

        // Fetch real platform stats (public endpoint — no auth required)
        userService.getPublicStats()
            .then(res => setPlatformStats(res.data?.data || null))
            .catch(() => setPlatformStats(null));
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    };

    // Shared hover feedback for outline ("ghost") buttons
    const ghostBtnHover = (e) => {
        e.currentTarget.style.borderColor = colors.primary;
        e.currentTarget.style.color = colors.primary;
        e.currentTarget.style.background = colors.primarySoft;
    };
    const ghostBtnLeave = (e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.color = colors.text;
        e.currentTarget.style.background = 'transparent';
    };

    const handleHeroVideoUnmute = async () => {
        const video = heroVideoRef.current;
        if (!video) return;

        video.muted = false;
        setHeroMuted(false);
        try {
            if (video.paused) await video.play();
        } catch (err) {
            console.error('Hero video unmute play failed:', err);
        }
    };

    const handleHeroVideoSetMuted = (next) => {
        const video = heroVideoRef.current;
        if (!video) return;
        video.muted = next;
        setHeroMuted(next);
    };

    // ── DATA MOCKS FOR 21 SECTIONS ──────────────────────────────────────────────

    // Real platform stats from the database (GET /api/users/stats/public) — never hardcoded.
    // Falls back to course count from already-loaded allCourses while loading.
    const ps = platformStats || {};
    const fmt = (n) => n != null && n > 0 ? `${n.toLocaleString()}+` : '0+';
    const stats = [
        { value: fmt(ps.totalCourses ?? allCourses.length), label: 'Total Courses',     icon: '▧' },
        { value: fmt(ps.totalStudents),                      label: 'Total Students',    icon: '◈' },
        { value: fmt(ps.totalInstructors),                   label: 'Total Instructors', icon: '◈' },
        { value: fmt(ps.totalCertificates),                  label: 'Certificates Issued', icon: '' },
        { value: fmt(ps.totalEnrollments),                   label: 'Total Enrollments', icon: '⏱️' }
    ];

    const categories = [
        { name: 'Programming', icon: '▧', color: '#22c55e' },
        { name: 'Networking', icon: '', color: '#22c55e' },
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

    const formatLiveDate = (iso) => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return 'Date TBA';
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const handleReserveSeat = async (sessionId) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setReservingId(sessionId);
        try {
            const res = await liveSessionService.reserveSeat(sessionId);
            const updated = res.data?.data;
            if (updated) {
                setUpcomingSessions(prev => prev.map(s => s._id === sessionId ? updated : s));
            }
        } catch (err) {
            console.error('Failed to reserve seat:', err);
            alert(err?.response?.data?.message || 'Could not reserve your seat. Please try again.');
        } finally {
            setReservingId(null);
        }
    };

    const faqs = [
        { q: 'How do I enroll in a course?', a: 'Create an account, browse our catalog, and click "Enroll Now".' },
        { q: 'Are there free courses available?', a: 'Yes! We offer several free courses across various categories.' },
        { q: 'Do I receive a certificate?', a: 'Absolutely. Upon successful completion, you receive a digital certificate.' }
    ];

    // Helper to generate generic course cards to satisfy the visual requirements of 11, 12, 13
    const renderCourseCard = (course, tag, tagColor) => (
        <div key={course._id} onClick={() => navigate(`/courses/${course._id}`)} style={p.courseCard}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 14px 34px -8px rgba(16,24,40,0.22)';
                e.currentTarget.style.borderColor = colors.primary;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = colors.shadowSm;
                e.currentTarget.style.borderColor = colors.border;
            }}>
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
        page: { minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif", overflowX: 'hidden' },
        hero: {
            position: 'relative',
            padding: '120px 5% 100px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '40px',
            overflow: 'hidden',
            minHeight: '700px',
            background: '#0b1325',
        },
        heroOverlay: {
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(100deg, rgba(6,20,14,0.45) 0%, rgba(10,28,20,0.22) 45%, rgba(20,40,28,0.05) 100%)',
            zIndex: 1,
            pointerEvents: 'none'
        },
        heroContent: { flex: '1 1 520px', maxWidth: '700px', zIndex: 2, position: 'relative', textAlign: 'left', minWidth: '280px' },
        heroImageWrapper: { flex: '0 0 auto', width: 'auto', maxWidth: '620px', aspectRatio: '9 / 16', height: 'min(74vh, 680px)', borderRadius: '24px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2, position: 'relative', background: '#0b1325', boxShadow: '0 30px 70px rgba(2,6,23,0.45)', border: '1px solid rgba(148,163,184,0.18)' },
        heroImageOverlay: { position: 'absolute', inset: 0, borderRadius: '24px', background: 'transparent', pointerEvents: 'none' },
        heroImage: { width: '100%', height: '100%', borderRadius: '24px', objectFit: 'cover', objectPosition: 'center center', display: 'block', background: '#020817' },
        // Hero copy always sits on the photo → fixed white for guaranteed AA contrast
        heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', color: '#ffffff', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em', marginBottom: '22px' },
        heroTitle: { fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: '900', lineHeight: 1.08, margin: '0 0 16px', letterSpacing: '-2px', color: '#ffffff', textShadow: '0 2px 24px rgba(2,6,23,0.45)' },
        heroSubtitleAnimated: { fontSize: '30px', fontWeight: '700', lineHeight: 1.22, margin: '0 0 36px', maxWidth: '600px', color: '#86efac', minHeight: '50px', textShadow: '0 2px 18px rgba(2,6,23,0.5)' },
        heroSubtitle: { fontSize: '18px', color: 'rgba(255,255,255,0.88)', lineHeight: 1.7, margin: '0 0 30px', maxWidth: '600px' },
        searchForm: { display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '600px', margin: '0 0 30px', background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: colors.shadow },
        searchInput: { flex: '1 1 260px', background: 'transparent', border: 'none', color: colors.text, padding: '18px 24px', fontSize: '15px', outline: 'none', minWidth: '180px' },
        searchBtn: { background: colors.gradient, color: '#fff', border: 'none', padding: '16px 28px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', flex: '0 0 auto' },
        heroActions: { display: 'flex', gap: '14px', justifyContent: 'flex-start', flexWrap: 'wrap' },
        primaryBtn: { background: colors.gradient, color: '#ffffff', border: 'none', padding: '15px 34px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 26px -6px rgba(22,163,74,0.55)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' },
        secondaryBtn: { background: 'rgba(255,255,255,0.10)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)', padding: '15px 34px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s ease' },
        heroGlow1: { position: 'absolute', width: '600px', height: '600px', background: colors.primary, filter: 'blur(150px)', opacity: 0, top: '-200px', left: '-100px', borderRadius: '50%', pointerEvents: 'none' },
        heroGlow2: { position: 'absolute', width: '500px', height: '500px', background: colors.accent, filter: 'blur(150px)', opacity: 0, bottom: '-100px', right: '-100px', borderRadius: '50%', pointerEvents: 'none' },

        statsSection: { padding: '44px 5%', background: colors.bgCard, borderBottom: `1px solid ${colors.border}` },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', maxWidth: '1400px', margin: '0 auto' },
        statBox: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
        statValue: { fontSize: '26px', fontWeight: '800', color: colors.primary, letterSpacing: '-0.02em' },
        statLabel: { color: colors.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' },

        section: { padding: '88px 5%', maxWidth: '1400px', margin: '0 auto' },
        sectionHeader: { textAlign: 'center', marginBottom: '56px' },
        sectionBadge: { display: 'inline-block', padding: '6px 16px', background: colors.primarySoft, color: colors.primary, borderRadius: '999px', fontWeight: '700', fontSize: '13px', marginBottom: '16px', border: `1px solid ${colors.border}` },
        sectionTitle: { fontSize: 'clamp(28px, 3.4vw, 38px)', fontWeight: '800', margin: '0 0 14px', color: colors.textBright, letterSpacing: '-0.02em' },
        sectionSubtitle: { color: colors.textMuted, fontSize: '17px', margin: 0 },

        grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
        grid6: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '20px' },
        
        cardShadow: colors.shadow,
        categoryCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: colors.shadowSm },
        
        courseCard: { background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: colors.shadowSm },
        courseImage: { height: '180px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${colors.border}` },
        courseBody: { padding: '22px' },
        courseBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' },
        courseTitle: { fontSize: '17px', fontWeight: '700', margin: '0 0 6px', lineHeight: 1.4, color: colors.text },
        courseInstructor: { color: colors.textMuted, fontSize: '13px', margin: '0 0 12px' },
        courseMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px' },
        courseFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: `1px solid ${colors.border}` },
        coursePrice: { fontSize: '20px', fontWeight: '800', color: colors.text },
        enrollBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },

        pathCard: { background: colors.bgCard, borderRadius: '16px', padding: '28px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '20px', boxShadow: colors.shadowSm },
        
        instructorCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, textAlign: 'center', boxShadow: colors.shadowSm, transition: 'transform 0.2s, box-shadow 0.2s' },
        instructorAvatar: { width: '80px', height: '80px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', margin: '0 auto 16px' },

        liveCard: { background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.primary}50`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 20px ${colors.primary}10` },

        faqContainer: { maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' },
        faqItem: { background: colors.bgCard, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: colors.shadowSm },
        faqQuestion: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: '16px', fontWeight: '600', color: colors.text, lineHeight: 1.4 },
        faqAnswer: { margin: '14px 0 0', color: colors.textMuted, fontSize: '15px', lineHeight: 1.65 },
        
        contactSection: { padding: '88px 5%', background: colors.bgDarker },
        contactContainer: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'stretch' },
        contactLeft: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' },
        contactBadge: { letterSpacing: '0.25em', color: colors.primary, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
        contactTitle: { fontSize: 'clamp(30px, 3.6vw, 44px)', fontWeight: '800', color: colors.textBright, margin: '0', lineHeight: 1.12, letterSpacing: '-0.02em' },
        contactSubtitle: { fontSize: '17px', color: colors.textMuted, margin: '0 0 28px' },
        contactForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
        contactRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
        contactInput: { width: '100%', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '14px 18px', borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
        contactTextarea: { width: '100%', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '14px 18px', borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '140px', fontFamily: 'inherit' },
        contactSubmitBtn: { alignSelf: 'flex-start', background: colors.gradient, color: '#ffffff', border: 'none', borderRadius: '12px', padding: '14px 40px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '4px', boxShadow: '0 12px 28px -6px rgba(22,163,74,0.5)' },
        contactSuccess: { background: `${colors.success}14`, color: colors.success, padding: '14px 18px', borderRadius: '12px', border: `1px solid ${colors.success}45`, fontSize: '14px', marginTop: '16px' },
        contactImageWrap: { position: 'relative', borderRadius: '24px', overflow: 'hidden', minHeight: '420px' },
        contactImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '24px', minHeight: '420px' },

        // Contact banner + map now live in the shared SiteFooter component

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
                {/* SVG sharpening filter for the upscaled background photo */}
                <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
                    <defs>
                        <filter id="emare-sharpen">
                            <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -0.6 0 -0.6 3.4 -0.6 0 -0.6 0" />
                        </filter>
                    </defs>
                </svg>

                {/* Background image rendered as <img> so it can be sharpened + brightened */}
                <img
                    src="/images/Real Emare ICT HUB image.png"
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center center',
                        filter: 'url(#emare-sharpen) brightness(1.12) saturate(1.08)',
                        zIndex: 0
                    }}
                />

                {/* Background overlay for better text readability */}
                <div style={p.heroOverlay} />
                
                <div className="landing-hero-content" style={p.heroContent}>
                    <div style={p.heroBadge}>🎓 Trusted by 2,500+ learners across Ethiopia</div>
                    <h1 style={p.heroTitle}>Welcome to Emare ICT Hub</h1>
                    <h2 className="emare-hero-subtitle" style={p.heroSubtitleAnimated}>
                        Master In-Demand Tech Skills, Build Your Future, and Become Job Ready.
                    </h2>
                    <form onSubmit={handleSearch} style={p.searchForm}>
                        <input type="text" placeholder="Search for courses, paths, or instructors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={p.searchInput} />
                        <button type="submit" style={p.searchBtn}>Search Courses</button>
                    </form>
                    <div className="landing-hero-actions" style={p.heroActions}>
                        <button onClick={() => navigate(isAuthenticated ? '/courses' : '/register')} style={p.primaryBtn}>{isAuthenticated ? 'Browse Courses' : 'Register to See All Courses'}</button>
                        {!isAuthenticated ? (
                            <button onClick={() => navigate('/register')} style={p.secondaryBtn}>Start Learning for Free</button>
                        ) : (
                            <button onClick={() => navigate('/student/dashboard')} style={p.secondaryBtn}>Go to My Dashboard</button>
                        )}
                    </div>
                </div>
                <div className="landing-hero-image-wrapper" style={p.heroImageWrapper}>
                    <video
                        ref={heroVideoRef}
                        className="landing-hero-image"
                        src="/videos/emareicthub.mp4#t=0.001"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        style={p.heroImage}
                    />
                    <div style={p.heroImageOverlay} />

                    {heroMuted && (
                        <button
                            type="button"
                            aria-label="Unmute video"
                            onClick={handleHeroVideoUnmute}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: '18px',
                                transform: 'translateX(-50%)',
                                zIndex: 30,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(2, 6, 23, 0.72)',
                                border: '1px solid rgba(148, 163, 184, 0.35)',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                color: '#fff',
                                padding: '8px 16px',
                            }}
                        >
                            <Volume2 size={18} color="#ffffff" aria-hidden="true" />
                            <span style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}>Click to Unmute</span>
                        </button>
                    )}

                    <HeroVideoControls videoRef={heroVideoRef} muted={heroMuted} onSetMuted={handleHeroVideoSetMuted} />
                </div>
            </section>

            {/* 4. Platform Statistics */}
            <section style={p.statsSection}>
                <div className="emare-stats-grid" style={p.statsGrid}>
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
                        background: 'rgba(74,222,128,0.14)',
                        color: '#86efac',
                        border: '1px solid rgba(74,222,128,0.35)',
                        borderRadius: '999px',
                        padding: '6px 18px',
                        fontSize: '12px',
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
                <div className="emare-services-grid" style={{
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
                                e.currentTarget.style.borderColor = 'rgba(74,222,128,0.5)';
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
                                background: `linear-gradient(135deg, rgba(22,163,74,0.18), rgba(21,128,61,0.18))`,
                                border: '1px solid rgba(74,222,128,0.3)',
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
            <section className="emare-section" style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Explore</span>
                    <h2 style={p.sectionTitle}>Popular Categories</h2>
                    <p style={p.sectionSubtitle}>Find courses in your area of interest</p>
                </div>
                <div className="emare-categories-grid" style={p.grid6}>
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
                        onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave}
                        style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                        View All Categories →
                    </button>
                </div>
            </section>

            {/* 6. Explore Our Courses — unified, deduplicated */}
            <section className="emare-section" style={{ ...p.section, background: colors.bgCard }}>
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
                        <div className="emare-courses-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '24px',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            {allCourses.slice(0, isAuthenticated ? coursesVisible : 8).map(c => renderCourseCard(c, c.price === 0 ? 'FREE' : 'COURSE', c.price === 0 ? colors.success : colors.primary))}
                        </div>

                        {/* Guests must sign up to browse the full catalog */}
                        {!isAuthenticated && allCourses.length > 8 && (
                            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                                    background: colors.primarySoft, border: `1px solid ${colors.border}`,
                                    borderRadius: '999px', padding: '10px 20px', marginBottom: '18px',
                                    color: colors.textMuted, fontSize: '14px', fontWeight: '600'
                                }}>
                                    🔒 Sign up free to unlock all {allCourses.length} courses
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => navigate('/register')}
                                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '13px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Register to See All Courses
                                    </button>
                                    <button
                                        onClick={() => navigate('/login')}
                                        onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave}
                                        style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '13px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Login
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Load More / Show Less (logged-in users) */}
                        {isAuthenticated && allCourses.length > 8 && (
                            <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {coursesVisible < allCourses.length && (
                                    <button
                                        onClick={() => setCoursesVisible(v => Math.min(v + 8, allCourses.length))}
                                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '13px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Load More Courses ({allCourses.length - coursesVisible} remaining)
                                    </button>
                                )}
                                {coursesVisible > 8 && (
                                    <button
                                        onClick={() => setCoursesVisible(8)}
                                        onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave}
                                        style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '13px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Show Less
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/courses')}
                                    onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave}
                                    style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '13px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    View Full Catalog →
                                </button>
                            </div>
                        )}
                        {allCourses.length <= 8 && !isAuthenticated && (
                            <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/register')} onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }} style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                                    Register to See All Courses
                                </button>
                                <button onClick={() => navigate('/login')} onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 24px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                    Login
                                </button>
                            </div>
                        )}
                        {allCourses.length <= 8 && isAuthenticated && (
                            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                                <button onClick={() => navigate('/courses')} onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                                    View Full Catalog →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* 14. Upcoming Live Classes */}
            <section className="emare-section" style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Live Interaction</span>
                    <h2 style={p.sectionTitle}>Upcoming Live Classes</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
                    {upcomingSessions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: colors.textMuted, padding: '40px 16px', fontSize: '16px' }}>
                            No upcoming live classes scheduled at the moment. Check back soon!
                        </div>
                    ) : (
                        upcomingSessions.map((live) => {
                            const isReserved = Boolean(live.isReserved);
                            const isReserving = reservingId === live._id;
                            return (
                                <div key={live._id} className="emare-live-card" style={p.liveCard}>
                                    <div>
                                        <h3 style={{ margin: '0 0 8px', color: colors.text, fontSize: '18px' }}>{live.title}</h3>
                                        <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                                            Instructor: {live.instructorRef?.fullName || 'TBD'}
                                        </p>
                                        <p style={{ margin: '6px 0 0', color: colors.textMuted, fontSize: '13px' }}>
                                            {live.reservations?.length || 0} reserved
                                        </p>
                                    </div>
                                    <div className="emare-live-card-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                        <div style={{ color: colors.primary, fontWeight: '700' }}>▦ {formatLiveDate(live.startTime)}</div>
                                        <button
                                            onClick={() => handleReserveSeat(live._id)}
                                            disabled={isReserved || isReserving}
                                            style={{ ...p.primaryBtn, opacity: isReserved ? 0.65 : 1, cursor: isReserved || isReserving ? 'not-allowed' : 'pointer' }}
                                        >
                                            {isReserved ? '✓ Reserved' : isReserving ? 'Reserving...' : 'Reserve Seat'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* 15. Upcoming Events (created from the admin event form) */}
            <section className="emare-section" style={{ ...p.section }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>What's On</span>
                    <h2 style={p.sectionTitle}>Upcoming Events</h2>
                    <p style={{ ...p.sectionSubtitle }}>Masterclasses, workshops and community events — reserve your spot.</p>
                </div>
                {publicEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', color: colors.textMuted, padding: '40px 16px', fontSize: '16px' }}>
                        No upcoming events at the moment. Check back soon!
                    </div>
                ) : (
                    <>
                        <div className="emare-events-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '24px',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            {publicEvents.slice(0, 3).map(ev => {
                                const start = ev.startDate ? new Date(ev.startDate) : null;
                                const dateLabel = start
                                    ? start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                                    : 'Date TBD';
                                const timeLabel = ev.allDay
                                    ? 'All Day'
                                    : (start ? start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '');
                                return (
                                    <Link
                                        key={ev._id}
                                        to={`/events/${ev._id}`}
                                        style={{
                                            display: 'flex', flexDirection: 'column', textDecoration: 'none',
                                            background: colors.bgCard, border: `1px solid ${colors.border}`,
                                            borderRadius: '20px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            color: colors.text
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div style={{ position: 'relative', width: '100%', height: '170px', background: colors.bgInput, flexShrink: 0 }}>
                                            {ev.image ? (
                                                <img src={ev.image} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            ) : null}
                                            {ev.category && (
                                                <span style={{ position: 'absolute', top: '12px', left: '12px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                    {ev.category}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                            <div style={{ color: colors.primary, fontWeight: '700', fontSize: '13px' }}>
                                                📅 {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: colors.text, lineHeight: 1.35 }}>{ev.title}</h3>
                                            {(ev.venue || ev.eventType) && (
                                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>
                                                    📍 {ev.venue || ev.eventType}
                                                </div>
                                            )}
                                            <div style={{ marginTop: 'auto', paddingTop: '10px', color: colors.primary, fontWeight: '700', fontSize: '14px' }}>
                                                View details →
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '36px' }}>
                            <button onClick={() => navigate('/events')} onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                                View All Events →
                            </button>
                        </div>
                    </>
                )}
            </section>

            {/* 18. Frequently Asked Questions */}
            <section className="emare-section" style={{ ...p.section, background: colors.bgCard }}>
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

            {/* 19. Discount Subscription */}
            <section className="emare-subscribe" style={{
                padding: '72px 5%',
                background: theme === 'dark'
                    ? 'linear-gradient(135deg, rgba(22,163,74,0.15) 0%, rgba(21,128,61,0.15) 100%)'
                    : 'linear-gradient(135deg, #f0fdf4 0%, #f5f3ff 100%)',
                borderTop: `1px solid ${colors.border}`,
                borderBottom: `1px solid ${colors.border}`,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>

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
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme === 'dark' ? 'rgba(34,197,94,0.2)' : '#dcfce7', color: theme === 'dark' ? '#86efac' : '#15803d', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
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
                                            background: checkLoading ? colors.textMuted : 'linear-gradient(135deg, #22c55e, #15803d)',
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
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: theme === 'dark' ? 'rgba(34,197,94,0.2)' : '#dcfce7', color: theme === 'dark' ? '#86efac' : '#15803d', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
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
                                            background: subLoading ? colors.textMuted : 'linear-gradient(135deg, #22c55e, #15803d)',
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

            {/* 20. Contact */}
            <section id="contact" style={p.contactSection}>
                <style>{`
                    .contact-field::placeholder { color: #94a3b8; }
                    .contact-field:focus { box-shadow: 0 0 0 3px rgba(34,197,94,0.35); border-color: ${colors.primary} !important; }
                    .contact-submit:hover { filter: brightness(1.1); }
                    @media (max-width: 860px) {
                        .contact-split { grid-template-columns: 1fr; }
                    }
                    @media (max-width: 480px) {
                        .contact-row { grid-template-columns: 1fr; }
                    }
                `}</style>
                <div className="contact-split" style={p.contactContainer}>
                    {/* Left — Contact Form */}
                    <div style={p.contactLeft}>
                        <span style={p.contactBadge}>CONTACT</span>
                        <h2 style={p.contactTitle}>Send your query</h2>
                        <p style={p.contactSubtitle}>Share us your Idea</p>
                        <form onSubmit={handleContactSubmit} style={p.contactForm} noValidate>
                            <div className="contact-row" style={p.contactRow}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <input className="contact-field" type="text" name="name" placeholder="Enter name" value={contactForm.name} onChange={handleContactChange} style={{ ...p.contactInput, border: contactErrors.name ? '1px solid #ef4444' : 'none' }} />
                                    {contactErrors.name && <span style={{ color: '#ef4444', fontSize: '12px' }}>{contactErrors.name}</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <input className="contact-field" type="tel" name="phone" placeholder="Enter phone number (e.g. 0912345678)" inputMode="numeric" maxLength={10} value={contactForm.phone} onChange={handleContactChange} style={{ ...p.contactInput, border: contactErrors.phone ? '1px solid #ef4444' : 'none' }} />
                                    {contactErrors.phone && <span style={{ color: '#ef4444', fontSize: '12px' }}>{contactErrors.phone}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input className="contact-field" type="email" name="email" placeholder="Enter email" value={contactForm.email} onChange={handleContactChange} style={{ ...p.contactInput, border: contactErrors.email ? '1px solid #ef4444' : 'none' }} />
                                {contactErrors.email && <span style={{ color: '#ef4444', fontSize: '12px' }}>{contactErrors.email}</span>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <textarea className="contact-field" name="message" placeholder="Message" value={contactForm.message} onChange={handleContactChange} style={{ ...p.contactTextarea, border: contactErrors.message ? '1px solid #ef4444' : 'none' }}></textarea>
                                {contactErrors.message && <span style={{ color: '#ef4444', fontSize: '12px' }}>{contactErrors.message}</span>}
                            </div>
                            {isAuthenticated && (
                                <Link to="/support/messages" style={{ color: colors.primary, fontSize: '13px', fontWeight: '600', textDecoration: 'underline' }}>
                                    View my support messages →
                                </Link>
                            )}
                            <button type="submit" className="contact-submit" style={{ ...p.contactSubmitBtn, opacity: contactLoading ? 0.7 : 1, cursor: contactLoading ? 'not-allowed' : 'pointer' }} disabled={contactLoading}>
                                {contactLoading ? 'Sending...' : 'Submit'}
                            </button>
                        </form>

                        {contactStatus && <div style={p.contactSuccess}>{contactStatus}</div>}
                        {!contactStatus && contactApiError && <div style={{ ...p.contactSuccess, background: 'rgba(220,38,38,0.08)', color: colors.danger, border: '1px solid rgba(220,38,38,0.35)' }}>{contactApiError}</div>}
                    </div>

                    {/* Right — Feature Image */}
                    <div className="emare-contact-image-wrap" style={p.contactImageWrap}>
                        <img src="/images/contact.jpg" alt="Emare ICT Hub — contact us" style={p.contactImage} />
                    </div>
                </div>
            </section>

            <SiteFooter />
        </div>
    );
}

