import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
    const { colors, theme } = useTheme();
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
            })
            .catch(console.error);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    };

    const handleNewsletter = (e) => {
        e.preventDefault();
        setNewsletterMsg('🎉 Thank you! You have been subscribed to our newsletter.');
        setNewsletterEmail('');
    };

    // ── DATA MOCKS FOR 21 SECTIONS ──────────────────────────────────────────────

    const stats = [
        { value: `${allCourses.length}+`, label: 'Total Courses', icon: '📚' },
        { value: '25,000+', label: 'Total Students', icon: '🎓' },
        { value: '150+', label: 'Total Instructors', icon: '👨‍🏫' },
        { value: '12,000+', label: 'Certificates Issued', icon: '🏅' },
        { value: '1M+', label: 'Learning Hours', icon: '⏱️' },
        { value: '15+', label: 'Countries Reached', icon: '🌍' }
    ];

    const categories = [
        { name: 'Programming', icon: '💻', color: '#3b82f6' },
        { name: 'Networking', icon: '🔗', color: '#8b5cf6' },
        { name: 'AI', icon: '🤖', color: '#10b981' },
        { name: 'Cybersecurity', icon: '🔒', color: '#f59e0b' },
        { name: 'Web Development', icon: '🌐', color: '#06b6d4' },
        { name: 'Mobile Development', icon: '📱', color: '#ec4899' },
        { name: 'Data Science', icon: '📊', color: '#14b8a6' },
        { name: 'Graphic Design', icon: '🎨', color: '#a855f7' },
        { name: 'Business', icon: '💼', color: '#84cc16' }
    ];

    const learningPaths = [
        { name: 'Full Stack Developer', icon: '🚀', courses: 6, duration: '6 Months' },
        { name: 'UI/UX Designer', icon: '🎨', courses: 4, duration: '4 Months' },
        { name: 'AI Engineer', icon: '🧠', courses: 8, duration: '8 Months' },
        { name: 'Cybersecurity Specialist', icon: '🛡️', courses: 5, duration: '5 Months' },
        { name: 'Data Analyst', icon: '📈', courses: 4, duration: '3 Months' }
    ];

    const whyChooseUs = [
        { title: 'Expert Instructors', desc: 'Learn from industry professionals.', icon: '👨‍🏫' },
        { title: 'Hands-on Projects', desc: 'Build real-world applications.', icon: '🛠️' },
        { title: 'Flexible Learning', desc: 'Study at your own pace, anytime.', icon: '⏰' },
        { title: 'Certificates', desc: 'Earn verifiable digital certificates.', icon: '📜' },
        { title: 'Career Support', desc: 'Resume reviews and interview prep.', icon: '🤝' },
        { title: 'Community', desc: 'Join thousands of active learners.', icon: '🌐' }
    ];

    const topInstructors = [
        { name: 'Dr. Samuel', skills: 'AI & Data Science', rating: 4.9, students: '12k', avatar: 'S' },
        { name: 'Eng. Bethelhem', skills: 'Full Stack & Mobile', rating: 4.8, students: '15k', avatar: 'B' },
        { name: 'Mr. Dawit', skills: 'Cybersecurity', rating: 4.9, students: '8k', avatar: 'D' },
        { name: 'Ms. Kalkidan', skills: 'UI/UX Design', rating: 4.7, students: '10k', avatar: 'K' }
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
                {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.courseTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px' }}>🎓</span>}
            </div>
            <div style={p.courseBody}>
                <span style={{...p.courseBadge, color: tagColor, background: `${tagColor}15`}}>{tag}</span>
                <h3 style={p.courseTitle}>{course.courseTitle}</h3>
                <p style={p.courseInstructor}>By {course.creatorRef?.fullName || 'Emare Instructor'}</p>
                <div style={p.courseMeta}>
                    <span style={{ color: '#fbbf24' }}>★ {course.averageRating || '4.8'}</span>
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

    const featuredList = allCourses.slice(0, 4);
    const freeList = allCourses.slice(4, 8); // Mock slice
    const newList = allCourses.slice(0, 4);  // Mock slice
    const trendingList = allCourses.slice(2, 6); // Mock slice

    // ── STYLES ──────────────────────────────────────────────────────────────

    const p = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", overflowX: 'hidden' },
        hero: { position: 'relative', padding: '120px 5% 100px', display: 'flex', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' },
        heroContent: { maxWidth: '800px', zIndex: 2, position: 'relative' },
        heroTitle: { fontSize: '60px', fontWeight: '900', lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-2px', color: colors.text },
        heroSubtitle: { fontSize: '18px', color: colors.textMuted, lineHeight: 1.7, margin: '0 0 32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' },
        searchForm: { display: 'flex', maxWidth: '600px', margin: '0 auto 32px', background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
        searchInput: { flex: 1, background: 'transparent', border: 'none', color: colors.text, padding: '18px 24px', fontSize: '15px', outline: 'none' },
        searchBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '16px 32px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },
        heroActions: { display: 'flex', gap: '16px', justifyContent: 'center' },
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
            <section style={p.hero}>
                <div style={p.heroContent}>
                    <span style={p.sectionBadge}>🚀 Empowering Africa's Tech Future</span>
                    <h1 style={p.heroTitle}>Master In-Demand<br />Tech Skills Today</h1>
                    <p style={p.heroSubtitle}>
                        Join thousands of learners building the future with industry-grade courses, live classes, and interactive learning paths.
                    </p>
                    <form onSubmit={handleSearch} style={p.searchForm}>
                        <input type="text" placeholder="Search for courses, paths, or instructors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={p.searchInput} />
                        <button type="submit" style={p.searchBtn}>Search Courses</button>
                    </form>
                    <div style={p.heroActions}>
                        <button onClick={() => navigate('/courses')} style={p.primaryBtn}>Browse Courses</button>
                        <button onClick={() => navigate('/register')} style={p.secondaryBtn}>Start Learning for Free</button>
                    </div>
                </div>
                <div style={p.heroGlow1} />
                <div style={p.heroGlow2} />
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

            {/* 6. Featured Courses */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Top Rated</span>
                    <h2 style={p.sectionTitle}>Featured Courses</h2>
                </div>
                <div style={p.grid4}>
                    {featuredList.map(c => renderCourseCard(c, 'FEATURED', colors.primary))}
                </div>
            </section>

            {/* 7. Learning Paths */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Career Goals</span>
                    <h2 style={p.sectionTitle}>Curated Learning Paths</h2>
                    <p style={p.sectionSubtitle}>Follow a structured path to land your dream job.</p>
                </div>
                <div style={p.grid3}>
                    {learningPaths.map((path, i) => (
                        <div key={i} style={p.pathCard}>
                            <div style={{ fontSize: '48px' }}>{path.icon}</div>
                            <div>
                                <h3 style={{ margin: '0 0 4px', color: colors.text, fontSize: '18px' }}>{path.name}</h3>
                                <p style={{ margin: 0, color: colors.textMuted, fontSize: '13px' }}>{path.courses} Courses · {path.duration}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 8. Why Choose Emare ICT Hub */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Benefits</span>
                    <h2 style={p.sectionTitle}>Why Choose Emare ICT Hub</h2>
                </div>
                <div style={p.grid3}>
                    {whyChooseUs.map((w, i) => (
                        <div key={i} style={p.categoryCard}>
                            <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{w.icon}</span>
                            <h3 style={{ color: colors.text, fontSize: '18px', margin: '0 0 8px' }}>{w.title}</h3>
                            <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{w.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 9. Top Instructors */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Experts</span>
                    <h2 style={p.sectionTitle}>Learn from the Best</h2>
                </div>
                <div style={p.grid4}>
                    {topInstructors.map((inst, i) => (
                        <div key={i} style={{ ...p.instructorCard, cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => navigate('/search?tab=instructors')}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div style={p.instructorAvatar}>{inst.avatar}</div>
                            <h3 style={{ color: colors.text, fontSize: '17px', fontWeight: '700', margin: '0 0 4px' }}>{inst.name}</h3>
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 12px' }}>{inst.skills}</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px' }}>
                                <span style={{ color: '#fbbf24' }}>★ {inst.rating}</span>
                                <span style={{ color: colors.textMuted }}>{inst.students} students</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 10. Student Testimonials */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Success Stories</span>
                    <h2 style={p.sectionTitle}>Student Testimonials</h2>
                </div>
                <div style={p.grid3}>
                    {testimonials.map((t, i) => (
                        <div key={i} style={p.testimonialCard}>
                            <div style={{ color: '#fbbf24', fontSize: '20px', marginBottom: '16px' }}>{'★'.repeat(t.rating)}</div>
                            <p style={{ color: colors.text, fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px', fontStyle: 'italic' }}>"{t.text}"</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>{t.avatar}</div>
                                <div>
                                    <div style={{ color: colors.text, fontWeight: '700', fontSize: '15px' }}>{t.name}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '12px' }}>{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 11. Free Courses */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Start For Free</span>
                    <h2 style={p.sectionTitle}>Free Courses</h2>
                </div>
                <div style={p.grid4}>
                    {freeList.map(c => renderCourseCard(c, 'FREE', colors.success))}
                </div>
            </section>

            {/* 12. New Courses */}
            <section style={{ ...p.section, background: colors.bgCard }}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Just Added</span>
                    <h2 style={p.sectionTitle}>New Courses</h2>
                </div>
                <div style={p.grid4}>
                    {newList.map(c => renderCourseCard(c, 'NEW', colors.accent))}
                </div>
            </section>

            {/* 13. Trending Courses */}
            <section style={p.section}>
                <div style={p.sectionHeader}>
                    <span style={p.sectionBadge}>Hot Right Now</span>
                    <h2 style={p.sectionTitle}>Trending Courses</h2>
                </div>
                <div style={p.grid4}>
                    {trendingList.map(c => renderCourseCard(c, 'TRENDING', colors.warning))}
                </div>
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
                                <div style={{ color: colors.primary, fontWeight: '700' }}>📅 {live.date}</div>
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
                    <div style={{ flex: 1, background: colors.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>🎥</div>
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
                            <div style={{ height: '160px', background: colors.bgInput, borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📝</div>
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
                    <button onClick={() => navigate('/register')} style={{ ...p.primaryBtn, padding: '16px 36px', fontSize: '16px' }}>Start Learning</button>
                    <button onClick={() => navigate('/register')} style={{ ...p.secondaryBtn, padding: '16px 36px', fontSize: '16px' }}>Become an Instructor</button>
                    <button onClick={() => navigate('/contact')} style={{ background: 'transparent', border: 'none', color: colors.text, padding: '16px 36px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>Contact Us</button>
                </div>
            </section>

            {/* 20. Newsletter Subscription */}
            <section style={{ padding: '60px 5%', background: colors.bgCard, borderTop: `1px solid ${colors.border}`, textAlign: 'center' }}>
                <h3 style={{ color: colors.text, fontSize: '24px', margin: '0 0 16px' }}>Subscribe to our Newsletter</h3>
                <p style={{ color: colors.textMuted, marginBottom: '32px' }}>Get the latest updates on new courses, tech news, and exclusive discounts.</p>
                {newsletterMsg ? (
                    <div style={{ color: colors.success, fontWeight: '700', fontSize: '16px' }}>{newsletterMsg}</div>
                ) : (
                    <form onSubmit={handleNewsletter} style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto' }}>
                        <input type="email" required placeholder="Email address" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} style={{ flex: 1, background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '14px 20px', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                        <button type="submit" style={p.enrollBtn}>Subscribe</button>
                    </form>
                )}
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
                            <div style={{ width: '32px', height: '32px', background: colors.bgInput, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>📘</div>
                            <div style={{ width: '32px', height: '32px', background: colors.bgInput, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🐦</div>
                            <div style={{ width: '32px', height: '32px', background: colors.bgInput, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>📸</div>
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
