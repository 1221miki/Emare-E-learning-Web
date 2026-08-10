import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export default function AboutPage() {
    const { colors } = useTheme();

    const s = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" },
        wrapper: { maxWidth: '1200px', margin: '0 auto', padding: '100px 5%' },
        hero: { display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '40px', alignItems: 'center' },
        left: { display: 'flex', flexDirection: 'column', gap: '28px' },
        badge: { display: 'inline-block', padding: '8px 22px', background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderRadius: '999px', fontWeight: '700', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(59,130,246,0.24)' },
        title: { fontSize: '54px', fontWeight: '900', lineHeight: '1.03', margin: '0', color: colors.text, maxWidth: '700px' },
        description: { fontSize: '17px', lineHeight: '1.9', color: colors.textMuted, maxWidth: '760px' },
        card: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '28px', padding: '42px 36px', boxShadow: `0 30px 80px rgba(0,0,0,0.08)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '420px' },
        cardLogo: { width: '100%', maxWidth: '560px', objectFit: 'contain', filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.26))' },
        cardTitle: { fontSize: '28px', fontWeight: '900', margin: '0', color: colors.text },
        cardSubtitle: { fontSize: '13px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: colors.primary, margin: '0' },
        cardUrl: { fontSize: '13px', color: colors.textMuted, letterSpacing: '0.12em', marginTop: '6px' },
        footer: { padding: '24px 0 40px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' },
        fLink: { color: colors.textMuted, textDecoration: 'none' },
        mobileStack: { display: 'grid', gap: '32px' }
    };

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            <Navbar />
            <div style={s.wrapper}>
                <div style={s.hero}>
                    <div style={s.left}>
                        <span style={s.badge}>About Us</span>
                        <h1 style={s.title}>Digital Innovation and System Development Center</h1>
                        <p style={s.description}>
                            Emare ICT Hub is designed to become a leading platform for digital skills development, technology entrepreneurship, and innovation in Debre Birhan City. This center offers a comprehensive ecosystem for tech growth, providing accessible digital tools, training, mentorship, and collaboration opportunities to local tech professionals, startups, and businesses.
                        </p>
                        <p style={s.description}>
                            Crucially, Emare ICT Hub also features its own high-skilled development team, focused on creating and delivering cutting-edge systems and solutions. This internal capacity allows us to drive innovation from within and support the wider community. With the growing importance of technology in driving economic development, the Emare ICT Hub will be a vital player in fostering a tech-savvy community, empowering young innovators, and creating job opportunities through digital literacy.
                        </p>
                    </div>

                    <div style={s.card}>
                        <img src="/images/Emare-ICT-Hub-Logo.jpg" alt="Emare ICT Hub" style={s.cardLogo} />
                    </div>
                </div>
            </div>
            <footer style={s.footer}>
                <p>
                    © {new Date().getFullYear()} Emare ICT Hub, Debre Birhan. <Link to="/privacy" style={s.fLink}>Privacy</Link> · <Link to="/terms" style={s.fLink}>Terms</Link> · <Link to="/contact" style={s.fLink}>Contact</Link>
                </p>
            </footer>
        </div>
    );
}
