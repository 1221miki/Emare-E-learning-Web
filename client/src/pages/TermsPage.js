import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
    return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.logoBox}><div style={s.logo}>E</div><span style={s.logoText}>Emare ICT Hub</span></Link>
                <Link to="/" style={s.navLink}>Back to Home</Link>
            </nav>

            <div style={s.container}>
                <div style={s.card}>
                    <h1 style={s.title}>Terms and Conditions</h1>
                    <p style={s.lastUpdated}>Last Updated: October 2023</p>

                    <div style={s.content}>
                        <h3>1. Acceptance of Terms</h3>
                        <p>By accessing and using Emare ICT Hub, you accept and agree to be bound by the terms and provision of this agreement.</p>

                        <h3>2. User Accounts</h3>
                        <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>

                        <h3>3. Course Enrollment and Access</h3>
                        <p>When you enroll in a course, you get a license from us to view it via the Emare services and no other use. Don't try to transfer or resell courses in any way.</p>

                        <h3>4. Content and Behavior Rules</h3>
                        <p>You can only use Emare for lawful purposes. You're responsible for all the content that you post on our platform. You should keep the reviews, questions, posts, courses and other content you upload in line with our trust and safety guidelines.</p>
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
