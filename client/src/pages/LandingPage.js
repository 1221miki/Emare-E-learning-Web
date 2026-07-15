import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage() {
    const [featuredCourses, setFeaturedCourses] = useState([]);
    const navigate = useNavigate();
    const { t, language, changeLanguage } = useLanguage();

    useEffect(() => {
        // Fetch published courses for the featured grid
        courseService.getAll()
            .then(res => {
                const courses = res.data?.data || [];
                setFeaturedCourses(courses.slice(0, 3));
            })
            .catch(console.error);
    }, []);

    return (
        <div style={styles.page}>
            {/* Navbar */}
            <nav style={styles.navbar}>
                <div style={styles.logoBox}>
                    <div style={styles.logoMark}>E</div>
                    <span style={styles.logoText}>Emare ICT Hub</span>
                </div>
                <div style={styles.navLinks}>
                    <select 
                        value={language} 
                        onChange={(e) => changeLanguage(e.target.value)}
                        style={styles.langSelect}
                    >
                        <option value="en">EN</option>
                        <option value="am">አማ</option>
                    </select>
                    <Link to="/courses" style={styles.navLink}>{t('nav_courses')}</Link>
                    <Link to="/login" style={styles.loginBtn}>{t('nav_login')}</Link>
                    <Link to="/register" style={styles.registerBtn}>{t('nav_register')}</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={styles.hero}>
                <div style={styles.heroContent}>
                    <span style={styles.badge}>{t('hero_badge')}</span>
                    <h1 style={styles.heroTitle}>{t('hero_title')}</h1>
                    <p style={styles.heroSubtitle}>{t('hero_subtitle')}</p>
                    <div style={styles.heroActions}>
                        <button onClick={() => navigate('/courses')} style={styles.primaryBtn}>{t('hero_btn_explore')}</button>
                        <button onClick={() => navigate('/register')} style={styles.secondaryBtn}>{t('hero_btn_join')}</button>
                    </div>
                </div>
                <div style={styles.heroGlow1}></div>
                <div style={styles.heroGlow2}></div>
            </section>

            {/* Featured Courses Grid */}
            <section style={styles.featuredSection}>
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>{t('feat_title')}</h2>
                    <p style={styles.sectionSubtitle}>{t('feat_subtitle')}</p>
                </div>

                {featuredCourses.length === 0 ? (
                    <div style={styles.emptyState}>{t('feat_empty')}</div>
                ) : (
                    <div style={styles.courseGrid}>
                        {featuredCourses.map(course => (
                            <div key={course._id} style={styles.courseCard}>
                                <div style={styles.courseImagePlaceholder}>
                                    <span style={{ fontSize: '48px' }}>🎓</span>
                                </div>
                                <div style={styles.courseContent}>
                                    <span style={styles.categoryBadge}>{course.technicalCategory}</span>
                                    <h3 style={styles.courseTitle}>{course.courseTitle}</h3>
                                    <p style={styles.courseInstructor}>By {course.creatorRef?.fullName || 'Emare Instructor'}</p>
                                    
                                    <div style={styles.courseFooter}>
                                        <span style={styles.price}>ETB {course.price}</span>
                                        <button onClick={() => navigate('/login')} style={styles.enrollBtn}>{t('feat_enroll')}</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer style={styles.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan. All rights reserved.</p>
            </footer>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#f1f5f9', overflowX: 'hidden' },
    
    // Navbar
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 5%', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100 },
    logoBox: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoMark: { width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '20px' },
    logoText: { fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '24px' },
    langSelect: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '6px', outline: 'none', cursor: 'pointer' },
    navLink: { color: '#94a3b8', textDecoration: 'none', fontWeight: '600', fontSize: '15px', transition: 'color 0.2s' },
    loginBtn: { color: '#f1f5f9', textDecoration: 'none', fontWeight: '600', fontSize: '15px' },
    registerBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '15px', transition: 'transform 0.2s, box-shadow 0.2s' },

    // Hero
    hero: { position: 'relative', padding: '120px 5% 100px', display: 'flex', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' },
    heroContent: { maxWidth: '800px', zIndex: 2, position: 'relative' },
    badge: { display: 'inline-block', padding: '8px 16px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '30px', fontWeight: '700', fontSize: '14px', marginBottom: '24px', border: '1px solid rgba(59,130,246,0.2)' },
    heroTitle: { fontSize: '64px', fontWeight: '900', lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-2px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSubtitle: { fontSize: '20px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' },
    heroActions: { display: 'flex', gap: '16px', justifyContent: 'center' },
    primaryBtn: { background: '#f1f5f9', color: '#0f172a', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s' },
    secondaryBtn: { background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', border: '1px solid #334155', padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' },
    
    heroGlow1: { position: 'absolute', width: '600px', height: '600px', background: '#3b82f6', filter: 'blur(150px)', opacity: 0.15, top: '-200px', left: '-100px', borderRadius: '50%' },
    heroGlow2: { position: 'absolute', width: '500px', height: '500px', background: '#8b5cf6', filter: 'blur(150px)', opacity: 0.15, bottom: '-100px', right: '-100px', borderRadius: '50%' },

    // Featured Courses
    featuredSection: { padding: '80px 5% 120px', position: 'relative', zIndex: 2 },
    sectionHeader: { textAlign: 'center', marginBottom: '60px' },
    sectionTitle: { fontSize: '36px', fontWeight: '800', margin: '0 0 12px' },
    sectionSubtitle: { color: '#94a3b8', fontSize: '18px', margin: 0 },
    
    courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' },
    courseCard: { background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden', transition: 'transform 0.3s, box-shadow 0.3s', display: 'flex', flexDirection: 'column' },
    courseImagePlaceholder: { height: '200px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #334155' },
    courseContent: { padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 },
    categoryBadge: { display: 'inline-block', background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', alignSelf: 'flex-start' },
    courseTitle: { fontSize: '20px', fontWeight: '700', margin: '0 0 8px', lineHeight: 1.4 },
    courseInstructor: { color: '#64748b', fontSize: '14px', margin: '0 0 24px' },
    courseFooter: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #334155' },
    price: { fontSize: '24px', fontWeight: '800', color: '#f1f5f9' },
    enrollBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' },
    emptyState: { textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '20px', color: '#64748b', border: '1px solid #334155' },

    // Footer
    footer: { padding: '40px 5%', textAlign: 'center', borderTop: '1px solid #1e293b', color: '#64748b', fontSize: '14px' }
};
