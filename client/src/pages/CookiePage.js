import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export default function CookiePage() {
    const { colors } = useTheme();
    const s = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" },
        container: { padding: '60px 5%', maxWidth: '800px', margin: '0 auto' },
        card: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(30,41,59,0.5)' },
        title: { fontSize: '32px', fontWeight: '900', margin: '0 0 8px', color: colors.text },
        lastUpdated: { color: colors.textMuted, fontSize: '13px', marginBottom: '32px' },
        content: { color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 },
        footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' }
    };

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            <Navbar />


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
