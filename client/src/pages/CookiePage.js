import React from 'react';
import { Link } from 'react-router-dom';

export default function CookiePage() {
    return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.logoBox}><div style={s.logo}>E</div><span style={s.logoText}>Emare ICT Hub</span></Link>
                <Link to="/" style={s.navLink}>Back to Home</Link>
            </nav>

            <div style={s.container}>
                <div style={s.card}>
                    <h1 style={s.title}>Cookie Policy</h1>
                    <p style={s.lastUpdated}>Last Updated: October 2023</p>

                    <div style={s.content}>
                        <h3>What Are Cookies</h3>
                        <p>As is common practice with almost all professional websites, this site uses cookies, which are tiny files that are downloaded to your computer, to improve your experience.</p>

                        <h3>How We Use Cookies</h3>
                        <p>We use cookies for a variety of reasons detailed below. Unfortunately, in most cases, there are no industry standard options for disabling cookies without completely disabling the functionality and features they add to this site.</p>

                        <h3>The Cookies We Set</h3>
                        <ul>
                            <li><strong>Account related cookies:</strong> If you create an account with us then we will use cookies for the management of the signup process and general administration.</li>
                            <li><strong>Login related cookies:</strong> We use cookies when you are logged in so that we can remember this fact. This prevents you from having to log in every single time you visit a new page.</li>
                        </ul>

                        <h3>Third Party Cookies</h3>
                        <p>In some special cases we also use cookies provided by trusted third parties. For example, we use analytics to help us understand how you use the site and ways that we can improve your experience.</p>
                    </div>
                </div>
            </div>

            <footer style={s.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan.</p>
            </footer>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', background: '#090d16', fontFamily: "'Outfit', sans-serif", color: '#f1f5f9' },
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 5%', background: 'rgba(9,13,22,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(30,41,59,0.5)', position: 'sticky', top: 0 },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' },
    logo: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
    logoText: { color: '#f1f5f9', fontWeight: '800', fontSize: '18px' },
    navLink: { color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '500' },
    container: { padding: '60px 5%', maxWidth: '800px', margin: '0 auto' },
    card: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(30,41,59,0.5)' },
    title: { fontSize: '32px', fontWeight: '900', margin: '0 0 8px', color: '#f1f5f9' },
    lastUpdated: { color: '#64748b', fontSize: '13px', marginBottom: '32px' },
    content: { color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 },
    footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' }
};
