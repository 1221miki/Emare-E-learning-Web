import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
    const team = [
        { name: 'Emare ICT Hub', role: 'Founded in Debre Birhan', avatar: 'E', desc: 'Providing world-class ICT training to Ethiopian learners since establishment.' }
    ];

    return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.logoBox}><div style={s.logo}>E</div><span style={s.logoText}>Emare ICT Hub</span></Link>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/courses" style={s.navLink}>Courses</Link>
                    <Link to="/contact" style={s.navLink}>Contact</Link>
                    <Link to="/login" style={s.loginBtn}>Sign In</Link>
                </div>
            </nav>

            <div style={s.hero}>
                <span style={s.badge}>About Us</span>
                <h1 style={s.heroTitle}>Empowering Ethiopia's<br />Tech Future</h1>
                <p style={s.heroSub}>Emare ICT Hub is a premier e-learning platform based in Debre Birhan, Ethiopia. We provide accessible, high-quality technology education to learners across the country.</p>
                
                <div style={s.videoContainer}>
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/prLv5uwUtuY?start=3" title="About Emare" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={s.videoFrame}></iframe>
                </div>
            </div>

            <section style={s.section}>
                <div style={s.grid2}>
                    <div style={s.card}>
                        <span style={{ fontSize: '36px' }}>🎯</span>
                        <h3 style={s.cardTitle}>Our Mission</h3>
                        <p style={s.cardText}>To democratize technology education in Ethiopia by providing affordable, industry-relevant courses taught by experienced professionals, empowering students to build the skills they need to thrive in the digital economy.</p>
                    </div>
                    <div style={s.card}>
                        <span style={{ fontSize: '36px' }}>🔭</span>
                        <h3 style={s.cardTitle}>Our Vision</h3>
                        <p style={s.cardText}>To become East Africa's leading e-learning platform, producing world-class tech talent and fostering innovation through quality education accessible to every Ethiopian learner regardless of location.</p>
                    </div>
                </div>
            </section>

            <section style={{ ...s.section, background: 'rgba(15,23,42,0.5)' }}>
                <h2 style={s.sTitle}>Why Choose Emare?</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {[
                        { icon: '📚', title: 'Expert-Led Courses', desc: 'Learn from industry professionals with real-world experience.' },
                        { icon: '🏆', title: 'Verified Certificates', desc: 'Earn certificates that employers trust and recognize.' },
                        { icon: '💡', title: 'Hands-On Projects', desc: 'Build real applications and portfolio-worthy projects.' },
                        { icon: '🌍', title: 'Local Relevance', desc: 'Content designed for Ethiopian and African tech markets.' }
                    ].map((v, i) => (
                        <div key={i} style={s.card}>
                            <span style={{ fontSize: '32px' }}>{v.icon}</span>
                            <h3 style={{ ...s.cardTitle, fontSize: '16px' }}>{v.title}</h3>
                            <p style={{ ...s.cardText, fontSize: '13px' }}>{v.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <footer style={s.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan. <Link to="/privacy" style={s.fLink}>Privacy</Link> · <Link to="/terms" style={s.fLink}>Terms</Link> · <Link to="/contact" style={s.fLink}>Contact</Link></p>
            </footer>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', background: '#090d16', fontFamily: "'Outfit', sans-serif", color: '#f1f5f9' },
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 5%', background: 'rgba(9,13,22,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(30,41,59,0.5)', position: 'sticky', top: 0, zIndex: 100 },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' },
    logo: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
    logoText: { color: '#f1f5f9', fontWeight: '800', fontSize: '18px' },
    navLink: { color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '500' },
    loginBtn: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600', fontSize: '14px' },
    hero: { padding: '100px 5% 60px', textAlign: 'center' },
    badge: { display: 'inline-block', padding: '6px 16px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '20px', fontWeight: '700', fontSize: '13px', marginBottom: '20px', border: '1px solid rgba(59,130,246,0.2)' },
    heroTitle: { fontSize: '48px', fontWeight: '900', margin: '0 0 20px', lineHeight: 1.15, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSub: { color: '#94a3b8', fontSize: '17px', lineHeight: 1.7, maxWidth: '650px', margin: '0 auto 40px' },
    videoContainer: { maxWidth: '800px', margin: '0 auto', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
    videoFrame: { width: '100%', height: '100%', display: 'block' },
    section: { padding: '80px 5%', maxWidth: '1200px', margin: '0 auto' },
    sTitle: { color: '#f1f5f9', fontSize: '28px', fontWeight: '800', marginBottom: '40px', textAlign: 'center' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
    card: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(30,41,59,0.5)' },
    cardTitle: { color: '#f1f5f9', fontSize: '20px', fontWeight: '700', margin: '12px 0 10px' },
    cardText: { color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, margin: 0 },
    footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' },
    fLink: { color: '#64748b', textDecoration: 'none' }
};
