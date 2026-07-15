import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';

export default function LandingPage() {
    const [featuredCourses, setFeaturedCourses] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterMsg, setNewsletterMsg] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        courseService.getAll()
            .then(res => {
                const courses = res.data?.data || [];
                setAllCourses(courses);
                setFeaturedCourses(courses.slice(0, 6));
            })
            .catch(console.error);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) navigate(`/courses?search=${encodeURIComponent(searchQuery)}`);
    };

    const handleNewsletter = (e) => {
        e.preventDefault();
        setNewsletterMsg('🎉 Thank you! You have been subscribed to our newsletter.');
        setNewsletterEmail('');
    };

    // Platform Statistics
    const stats = [
        { value: `${allCourses.length}+`, label: 'Professional Courses', icon: '📚' },
        { value: '500+', label: 'Active Students', icon: '🎓' },
        { value: '30+', label: 'Expert Instructors', icon: '👨‍🏫' },
        { value: '95%', label: 'Satisfaction Rate', icon: '⭐' }
    ];

    // Course Categories
    const categories = [
        { name: 'Web Coding', icon: '🌐', color: '#3b82f6', count: allCourses.filter(c => c.technicalCategory === 'Web Coding').length },
        { name: 'Mobile Development', icon: '📱', color: '#8b5cf6', count: allCourses.filter(c => c.technicalCategory === 'Mobile Development').length },
        { name: 'Data Science', icon: '📊', color: '#10b981', count: allCourses.filter(c => c.technicalCategory === 'Data Science').length },
        { name: 'Cyber Security', icon: '🔒', color: '#f59e0b', count: allCourses.filter(c => c.technicalCategory === 'Cyber Security').length },
        { name: 'Cloud Computing', icon: '☁️', color: '#06b6d4', count: allCourses.filter(c => c.technicalCategory === 'Cloud Computing').length },
        { name: 'Artificial Intelligence', icon: '🤖', color: '#ec4899', count: allCourses.filter(c => c.technicalCategory === 'Artificial Intelligence').length },
        { name: 'Network Engineering', icon: '🔗', color: '#14b8a6', count: allCourses.filter(c => c.technicalCategory === 'Network Engineering').length },
        { name: 'Creative Media', icon: '🎨', color: '#a855f7', count: allCourses.filter(c => c.technicalCategory === 'Creative Media').length }
    ];

    // Testimonials
    const testimonials = [
        { name: 'Abeba Tsehay', role: 'Web Developer', text: 'Emare ICT Hub transformed my career. The courses are practical and the instructors are world-class. I landed my first dev job within 3 months!', avatar: 'A' },
        { name: 'Dawit Mekonnen', role: 'Data Analyst', text: 'The Data Science track gave me hands-on skills that I use every day at work. The community support is incredible.', avatar: 'D' },
        { name: 'Hiwot Girma', role: 'Mobile Developer', text: 'I built my first mobile app during the course. The step-by-step projects made complex topics feel simple.', avatar: 'H' }
    ];

    // FAQs
    const faqs = [
        { q: 'How do I enroll in a course?', a: 'Simply create an account, browse our catalog, and click "Enroll Now" on any course. For paid courses, you\'ll be redirected to complete payment before gaining full access.' },
        { q: 'Are there free courses available?', a: 'Yes! We offer several free courses across various categories. Filter by "Free" in the course catalog to find them.' },
        { q: 'Do I receive a certificate after completing a course?', a: 'Absolutely. Upon successfully completing all lessons and achieving the minimum passing score on assessments, you\'ll receive a verifiable digital certificate.' },
        { q: 'Can I access courses on mobile devices?', a: 'Yes, our platform is fully responsive and works on all devices including smartphones, tablets, and desktop computers.' },
        { q: 'How do I become an instructor?', a: 'Register as an instructor on our platform and submit your first course for review. Our admin team will verify your qualifications and approve your account.' },
        { q: 'What payment methods do you accept?', a: 'We accept bank transfers, CBE Birr, Telebirr, and other local Ethiopian payment methods. International payments via card are also supported.' }
    ];

    return (
        <div style={p.page}>
            {/* ═══════════════════════════════════════════════════ */}
            {/* ── NAVIGATION BAR ─────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <nav style={p.navbar}>
                <div style={p.logoBox}>
                    <div style={p.logoMark}>E</div>
                    <span style={p.logoText}>Emare ICT Hub</span>
                </div>
                <div style={p.navCenter}>
                    <a href="#home" style={p.navLink}>Home</a>
                    <Link to="/courses" style={p.navLink}>Courses</Link>
                    <a href="#categories" style={p.navLink}>Categories</a>
                    <a href="#about" style={p.navLink}>About</a>
                    <Link to="/about" style={p.navLink}>About Us</Link>
                    <Link to="/contact" style={p.navLink}>Contact</Link>
                </div>
                <div style={p.navRight}>
                    <Link to="/login" style={p.loginBtn}>Sign In</Link>
                    <Link to="/register" style={p.registerBtn}>Get Started</Link>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── HERO SECTION ───────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section id="home" style={p.hero}>
                <div style={p.heroContent}>
                    <span style={p.heroBadge}>🚀 Ethiopia's Premier E-Learning Platform</span>
                    <h1 style={p.heroTitle}>Master In-Demand<br />Tech Skills</h1>
                    <p style={p.heroSubtitle}>
                        Join thousands of Ethiopian learners building the future with industry-grade courses
                        in Web Development, AI, Data Science, and more — taught by expert instructors at Emare ICT Hub.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} style={p.searchForm}>
                        <input
                            type="text"
                            placeholder="Search for courses, instructors, or topics..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={p.searchInput}
                        />
                        <button type="submit" style={p.searchBtn}>Search</button>
                    </form>

                    <div style={p.heroActions}>
                        <button onClick={() => navigate('/courses')} style={p.primaryBtn}>Explore Courses</button>
                        <button onClick={() => navigate('/register')} style={p.secondaryBtn}>Join for Free</button>
                    </div>
                </div>
                <div style={p.heroGlow1} />
                <div style={p.heroGlow2} />
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── PLATFORM DEMO ────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>See It In Action</span>
                    <h2 style={p.sectionTitle}>Platform Overview</h2>
                    <p style={p.sectionSubtitle}>Watch a quick demo of how Emare ICT Hub works</p>
                </div>
                <div style={p.videoContainer}>
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/NgrXxAPxmEY?start=16" title="Platform Demo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={p.videoFrame}></iframe>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── PLATFORM STATISTICS ────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
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

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── COURSE CATEGORIES ──────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section id="categories" style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Browse by Topic</span>
                    <h2 style={p.sectionTitle}>Explore Categories</h2>
                    <p style={p.sectionSubtitle}>Find the perfect course in your area of interest</p>
                </div>
                <div style={p.categoryGrid}>
                    {categories.map((cat, i) => (
                        <div key={i} onClick={() => navigate('/courses')} style={{ ...p.categoryCard, borderTop: `3px solid ${cat.color}` }}>
                            <span style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }}>{cat.icon}</span>
                            <h3 style={p.categoryName}>{cat.name}</h3>
                            <span style={p.categoryCount}>{cat.count} courses</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── FEATURED COURSES ───────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ ...p.section, background: 'rgba(15,23,42,0.5)' }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Hand-Picked for You</span>
                    <h2 style={p.sectionTitle}>Featured Courses</h2>
                    <p style={p.sectionSubtitle}>Start your learning journey with our most popular courses</p>
                </div>
                {featuredCourses.length === 0 ? (
                    <div style={p.emptyState}>New courses are being published soon. Stay tuned!</div>
                ) : (
                    <div style={p.courseGrid}>
                        {featuredCourses.map(course => (
                            <div key={course._id} onClick={() => navigate(`/courses/${course._id}`)} style={p.courseCard}>
                                <div style={p.courseImage}>
                                    {course.thumbnailUrl
                                        ? <img src={course.thumbnailUrl} alt={course.courseTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontSize: '48px' }}>🎓</span>}
                                </div>
                                <div style={p.courseBody}>
                                    <span style={p.courseBadge}>{course.technicalCategory}</span>
                                    <h3 style={p.courseTitle}>{course.courseTitle}</h3>
                                    <p style={p.courseInstructor}>By {course.creatorRef?.fullName || 'Emare Instructor'}</p>
                                    <div style={p.courseMeta}>
                                        <span style={{ color: '#fbbf24' }}>★ {course.averageRating || '0.0'}</span>
                                        <span style={{ color: '#64748b' }}>({course.totalReviews || 0})</span>
                                        <span style={{ color: '#64748b' }}>· {course.estimatedDurationHours}h</span>
                                        <span style={{ color: '#64748b' }}>· {course.level || 'Beginner'}</span>
                                    </div>
                                    <div style={p.courseFooter}>
                                        <span style={p.coursePrice}>{course.price === 0 ? 'Free' : `${course.price} ETB`}</span>
                                        <span style={p.courseViewBtn}>View Details →</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button onClick={() => navigate('/courses')} style={p.primaryBtn}>Browse All Courses</button>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── HOW IT WORKS ───────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Simple Steps</span>
                    <h2 style={p.sectionTitle}>How It Works</h2>
                    <p style={p.sectionSubtitle}>Get started in three easy steps</p>
                </div>
                <div style={p.stepsGrid}>
                    {[
                        { icon: '📝', title: 'Create an Account', desc: 'Sign up for free and set up your learner profile in under a minute.' },
                        { icon: '🔍', title: 'Find Your Course', desc: 'Browse our catalog, filter by category, level, or language, and choose the perfect course.' },
                        { icon: '🎓', title: 'Start Learning', desc: 'Enroll, watch video lessons, take quizzes, complete assignments, and earn your certificate.' }
                    ].map((step, i) => (
                        <div key={i} style={p.stepCard}>
                            <div style={p.stepNumber}>{i + 1}</div>
                            <span style={{ fontSize: '40px', marginBottom: '16px', display: 'block' }}>{step.icon}</span>
                            <h3 style={p.stepTitle}>{step.title}</h3>
                            <p style={p.stepDesc}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── TESTIMONIALS ───────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ ...p.section, background: 'rgba(15,23,42,0.5)' }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Student Stories</span>
                    <h2 style={p.sectionTitle}>What Our Students Say</h2>
                    <p style={p.sectionSubtitle}>Real success stories from the Emare community</p>
                </div>
                <div style={p.testimonialGrid}>
                    {testimonials.map((t, i) => (
                        <div key={i} style={p.testimonialCard}>
                            <div style={{ fontSize: '32px', color: '#3b82f6', marginBottom: '16px' }}>"</div>
                            <p style={p.testimonialText}>{t.text}</p>
                            <div style={p.testimonialAuthor}>
                                <div style={p.testimonialAvatar}>{t.avatar}</div>
                                <div>
                                    <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '15px' }}>{t.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '13px' }}>{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── FAQ SECTION ────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Common Questions</span>
                    <h2 style={p.sectionTitle}>Frequently Asked Questions</h2>
                    <p style={p.sectionSubtitle}>Everything you need to know about Emare ICT Hub</p>
                </div>
                <div style={p.faqContainer}>
                    {faqs.map((faq, i) => (
                        <div key={i} style={p.faqItem} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                            <div style={p.faqQuestion}>
                                <span>{faq.q}</span>
                                <span style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '700' }}>{activeFaq === i ? '−' : '+'}</span>
                            </div>
                            {activeFaq === i && <p style={p.faqAnswer}>{faq.a}</p>}
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── NEWSLETTER CTA ─────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={p.ctaSection}>
                <div style={p.ctaContent}>
                    <h2 style={p.ctaTitle}>Stay Updated with New Courses</h2>
                    <p style={p.ctaSubtitle}>Subscribe to our newsletter and never miss a new course, promotion, or learning opportunity.</p>
                    {newsletterMsg ? (
                        <div style={{ color: '#10b981', fontWeight: '700', fontSize: '16px' }}>{newsletterMsg}</div>
                    ) : (
                        <form onSubmit={handleNewsletter} style={p.ctaForm}>
                            <input type="email" required placeholder="Enter your email address" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} style={p.ctaInput} />
                            <button type="submit" style={p.ctaBtn}>Subscribe</button>
                        </form>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── FOOTER ─────────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}
            <footer style={p.footer}>
                <div style={p.footerGrid}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={p.logoMark}>E</div>
                            <span style={{ color: '#f1f5f9', fontWeight: '800', fontSize: '18px' }}>Emare ICT Hub</span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, maxWidth: '280px' }}>
                            Empowering Ethiopia's next generation of tech leaders through quality, accessible e-learning from Debre Birhan.
                        </p>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Platform</h4>
                        <Link to="/courses" style={p.footerLink}>Browse Courses</Link>
                        <Link to="/register" style={p.footerLink}>Become a Student</Link>
                        <Link to="/register" style={p.footerLink}>Become an Instructor</Link>
                        <Link to="/leaderboard" style={p.footerLink}>Leaderboard</Link>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Company</h4>
                        <Link to="/about" style={p.footerLink}>About Us</Link>
                        <Link to="/contact" style={p.footerLink}>Contact Us</Link>
                        <Link to="/help" style={p.footerLink}>Help Center</Link>
                    </div>
                    <div>
                        <h4 style={p.footerTitle}>Legal</h4>
                        <Link to="/privacy" style={p.footerLink}>Privacy Policy</Link>
                        <Link to="/terms" style={p.footerLink}>Terms & Conditions</Link>
                        <Link to="/cookies" style={p.footerLink}>Cookie Policy</Link>
                    </div>
                </div>
                <div style={p.footerBottom}>
                    <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan, Ethiopia. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const p = {
    page: { minHeight: '100vh', background: '#090d16', fontFamily: "'Outfit', 'Inter', sans-serif", color: '#f1f5f9', overflowX: 'hidden' },

    // Navbar
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 5%', background: 'rgba(9,13,22,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(30,41,59,0.5)', position: 'sticky', top: 0, zIndex: 100 },
    logoBox: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoMark: { width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '20px' },
    logoText: { fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: '#f1f5f9' },
    navCenter: { display: 'flex', alignItems: 'center', gap: '28px' },
    navLink: { color: '#94a3b8', textDecoration: 'none', fontWeight: '500', fontSize: '14px', transition: 'color 0.2s' },
    navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
    loginBtn: { color: '#f1f5f9', textDecoration: 'none', fontWeight: '600', fontSize: '14px', padding: '8px 16px' },
    registerBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' },

    // Hero
    hero: { position: 'relative', padding: '120px 5% 100px', display: 'flex', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' },
    heroContent: { maxWidth: '800px', zIndex: 2, position: 'relative' },
    heroBadge: { display: 'inline-block', padding: '8px 20px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '30px', fontWeight: '700', fontSize: '14px', marginBottom: '28px', border: '1px solid rgba(59,130,246,0.2)' },
    heroTitle: { fontSize: '60px', fontWeight: '900', lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-2px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSubtitle: { fontSize: '18px', color: '#94a3b8', lineHeight: 1.7, margin: '0 0 32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' },
    searchForm: { display: 'flex', maxWidth: '560px', margin: '0 auto 32px', background: 'rgba(30,41,59,0.6)', borderRadius: '14px', border: '1px solid rgba(51,65,85,0.5)', overflow: 'hidden' },
    searchInput: { flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '16px 20px', fontSize: '15px', outline: 'none' },
    searchBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', padding: '16px 28px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },
    heroActions: { display: 'flex', gap: '16px', justifyContent: 'center' },
    primaryBtn: { background: '#f1f5f9', color: '#0f172a', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s' },
    secondaryBtn: { background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', border: '1px solid rgba(51,65,85,0.6)', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
    heroGlow1: { position: 'absolute', width: '600px', height: '600px', background: '#3b82f6', filter: 'blur(150px)', opacity: 0.12, top: '-200px', left: '-100px', borderRadius: '50%' },
    heroGlow2: { position: 'absolute', width: '500px', height: '500px', background: '#8b5cf6', filter: 'blur(150px)', opacity: 0.12, bottom: '-100px', right: '-100px', borderRadius: '50%' },

    // Video
    videoContainer: { maxWidth: '900px', margin: '0 auto', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
    videoFrame: { width: '100%', height: '100%', display: 'block' },

    // Stats
    statsSection: { padding: '0 5%', marginTop: '-50px', position: 'relative', zIndex: 3 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', maxWidth: '1200px', margin: '0 auto' },
    statBox: { background: 'rgba(14,23,38,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(30,41,59,0.5)', borderRadius: '16px', padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
    statValue: { fontSize: '32px', fontWeight: '900', color: '#f1f5f9' },
    statLabel: { color: '#64748b', fontSize: '13px', fontWeight: '500' },

    // Section Layout
    section: { padding: '100px 5%', maxWidth: '1400px', margin: '0 auto' },
    sectionHeader: { textAlign: 'center', marginBottom: '60px' },
    sectionBadge: { display: 'inline-block', padding: '6px 16px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '20px', fontWeight: '700', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(59,130,246,0.2)' },
    sectionTitle: { fontSize: '36px', fontWeight: '900', margin: '0 0 12px', color: '#f1f5f9' },
    sectionSubtitle: { color: '#64748b', fontSize: '17px', margin: 0 },

    // Categories
    categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
    categoryCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '28px', border: '1px solid rgba(30,41,59,0.5)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s' },
    categoryName: { color: '#f1f5f9', fontSize: '16px', fontWeight: '700', margin: '0 0 6px' },
    categoryCount: { color: '#64748b', fontSize: '13px' },

    // Featured Courses
    courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1200px', margin: '0 auto' },
    courseCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(30,41,59,0.5)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' },
    courseImage: { height: '180px', background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(30,41,59,0.5)' },
    courseBody: { padding: '22px' },
    courseBadge: { display: 'inline-block', background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' },
    courseTitle: { fontSize: '17px', fontWeight: '700', margin: '0 0 6px', lineHeight: 1.4, color: '#f1f5f9' },
    courseInstructor: { color: '#64748b', fontSize: '13px', margin: '0 0 12px' },
    courseMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px' },
    courseFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(30,41,59,0.4)' },
    coursePrice: { fontSize: '20px', fontWeight: '800', color: '#f1f5f9' },
    courseViewBtn: { color: '#3b82f6', fontSize: '13px', fontWeight: '700' },
    emptyState: { textAlign: 'center', padding: '60px', background: 'rgba(14,23,38,0.6)', borderRadius: '16px', color: '#64748b', border: '1px solid rgba(30,41,59,0.4)' },

    // Steps
    stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', maxWidth: '1000px', margin: '0 auto' },
    stepCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '36px 28px', border: '1px solid rgba(30,41,59,0.5)', textAlign: 'center', position: 'relative' },
    stepNumber: { position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' },
    stepTitle: { color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: '0 0 10px' },
    stepDesc: { color: '#64748b', fontSize: '14px', lineHeight: 1.6, margin: 0 },

    // Testimonials
    testimonialGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1200px', margin: '0 auto' },
    testimonialCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(30,41,59,0.5)' },
    testimonialText: { color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, margin: '0 0 24px', fontStyle: 'italic' },
    testimonialAuthor: { display: 'flex', alignItems: 'center', gap: '12px' },
    testimonialAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '16px' },

    // FAQ
    faqContainer: { maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' },
    faqItem: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(30,41,59,0.5)', cursor: 'pointer', transition: 'border-color 0.2s' },
    faqQuestion: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f1f5f9', fontWeight: '600', fontSize: '15px' },
    faqAnswer: { color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, margin: '14px 0 0', paddingTop: '14px', borderTop: '1px solid rgba(30,41,59,0.4)' },

    // Newsletter CTA
    ctaSection: { padding: '80px 5%', background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.08))' },
    ctaContent: { maxWidth: '600px', margin: '0 auto', textAlign: 'center' },
    ctaTitle: { fontSize: '32px', fontWeight: '900', margin: '0 0 12px', color: '#f1f5f9' },
    ctaSubtitle: { color: '#94a3b8', fontSize: '16px', margin: '0 0 28px', lineHeight: 1.6 },
    ctaForm: { display: 'flex', gap: '12px', maxWidth: '480px', margin: '0 auto' },
    ctaInput: { flex: 1, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', color: '#fff', padding: '14px 18px', borderRadius: '10px', fontSize: '14px', outline: 'none' },
    ctaBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },

    // Footer
    footer: { padding: '60px 5% 0', borderTop: '1px solid rgba(30,41,59,0.5)' },
    footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' },
    footerTitle: { color: '#f1f5f9', fontSize: '15px', fontWeight: '700', margin: '0 0 16px' },
    footerLink: { display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '14px', marginBottom: '10px', transition: 'color 0.2s' },
    footerBottom: { borderTop: '1px solid rgba(30,41,59,0.4)', padding: '24px 0', textAlign: 'center', color: '#475569', fontSize: '13px' }
};
