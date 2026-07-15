import React from 'react';
import { Link } from 'react-router-dom';

export default function HelpPage() {
    const faqs = [
        { q: 'How do I register?', a: 'Click the "Get Started" button on the top right, fill in your details, and verify your email address.' },
        { q: 'Can I download videos?', a: 'Currently, videos can only be streamed online to protect the intellectual property of our instructors. Downloadable resources like PDFs are available.' },
        { q: 'Are certificates accredited?', a: 'Our certificates verify your completion and the skills acquired, but they are not university degrees. They are widely recognized by local employers.' },
        { q: 'How do I reset my password?', a: 'On the login page, click "Forgot Password". Enter your email and follow the instructions sent to you.' },
        { q: 'Can I get a refund?', a: 'We offer a 7-day money-back guarantee for most courses if you have completed less than 20% of the content.' }
    ];

    return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.logoBox}><div style={s.logo}>E</div><span style={s.logoText}>Emare ICT Hub</span></Link>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/courses" style={s.navLink}>Courses</Link>
                    <Link to="/contact" style={s.navLink}>Contact</Link>
                </div>
            </nav>

            <div style={s.hero}>
                <h1 style={s.heroTitle}>Help Center</h1>
                <p style={s.heroSub}>Find answers to frequently asked questions or contact support.</p>
            </div>

            <section style={s.section}>
                <div style={s.card}>
                    <h2 style={s.sTitle}>Frequently Asked Questions</h2>
                    <div style={s.faqList}>
                        {faqs.map((faq, i) => (
                            <div key={i} style={s.faqItem}>
                                <h3 style={s.faqQ}>{faq.q}</h3>
                                <p style={s.faqA}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Can't find what you're looking for?</p>
                    <Link to="/contact" style={s.contactBtn}>Contact Support</Link>
                </div>
            </section>

            <footer style={s.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan. All rights reserved.</p>
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
    hero: { padding: '80px 5% 40px', textAlign: 'center' },
    heroTitle: { fontSize: '40px', fontWeight: '900', margin: '0 0 16px', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSub: { color: '#94a3b8', fontSize: '16px' },
    section: { padding: '20px 5% 80px', maxWidth: '800px', margin: '0 auto' },
    card: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(30,41,59,0.5)' },
    sTitle: { color: '#f1f5f9', fontSize: '24px', fontWeight: '800', marginBottom: '32px', textAlign: 'center' },
    faqList: { display: 'flex', flexDirection: 'column', gap: '24px' },
    faqItem: { borderBottom: '1px solid rgba(51,65,85,0.5)', paddingBottom: '24px' },
    faqQ: { color: '#f1f5f9', fontSize: '16px', fontWeight: '700', margin: '0 0 12px' },
    faqA: { color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: 0 },
    contactBtn: { display: 'inline-block', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' },
    footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' }
};
