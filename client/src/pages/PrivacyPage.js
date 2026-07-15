import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
    return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.logoBox}><div style={s.logo}>E</div><span style={s.logoText}>Emare ICT Hub</span></Link>
                <Link to="/" style={s.navLink}>Back to Home</Link>
            </nav>

            <div style={s.container}>
                <div style={s.card}>
                    <h1 style={s.title}>Privacy Policy</h1>
                    <p style={s.lastUpdated}>Last Updated: October 2023</p>

                    <div style={s.content}>
                        <h3>1. Information We Collect</h3>
                        <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, profile picture, payment method, and other information you choose to provide.</p>

                        <h3>2. How We Use Your Information</h3>
                        <p>We may use the information we collect about you to: Provide, maintain, and improve our Services; Process transactions and send related information; Send you technical notices, updates, security alerts, and support and administrative messages.</p>

                        <h3>3. Sharing of Information</h3>
                        <p>We do not share your personal information with third parties except as described in this policy, such as with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.</p>

                        <h3>4. Security</h3>
                        <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
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
