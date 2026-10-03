import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export default function HelpPage() {
    const { colors } = useTheme();
    const [activeFaq, setActiveFaq] = useState(null);
    const faqs = [
        { q: 'How do I register?', a: 'Click the "Get Started" button on the top right, fill in your details, and verify your email address.' },
        { q: 'Can I download videos?', a: 'Currently, videos can only be streamed online to protect the intellectual property of our instructors. Downloadable resources like PDFs are available.' },
        { q: 'Are certificates accredited?', a: 'Our certificates verify your completion and the skills acquired, but they are not university degrees. They are widely recognized by local employers.' },
        { q: 'How do I reset my password?', a: 'On the login page, click "Forgot Password". Enter your email and follow the instructions sent to you.' }
    ];

    const s = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" },
        hero: { padding: '80px 5% 40px', textAlign: 'center' },
        heroTitle: { fontSize: '40px', fontWeight: '900', margin: '0 0 16px', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
        heroSub: { color: colors.textMuted, fontSize: '16px' },
        section: { padding: '20px 5% 80px', maxWidth: '800px', margin: '0 auto' },
        card: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(30,41,59,0.5)' },
        sTitle: { color: colors.text, fontSize: '24px', fontWeight: '800', marginBottom: '32px', textAlign: 'center' },
        faqList: { display: 'flex', flexDirection: 'column', gap: '24px' },
        faqItem: { borderBottom: '1px solid rgba(51,65,85,0.5)', paddingBottom: '24px' },
        faqQ: { color: colors.text, fontSize: '16px', fontWeight: '700', margin: '0 0 12px' },
        faqA: { color: colors.textMuted, fontSize: '14px', lineHeight: 1.6, margin: 0 },
        contactBtn: { display: 'inline-block', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' },
        footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' }
    };

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            <Navbar />


            <div style={s.hero}>
                <h1 style={s.heroTitle}>Help Center</h1>
                <p style={s.heroSub}>Find answers to frequently asked questions or contact support.</p>
            </div>

            <section style={s.section}>
                <div style={s.card}>
                    <h2 style={s.sTitle}>Frequently Asked Questions</h2>
                    <div style={s.faqList}>
                        {faqs.map((faq, i) => (
                            <div key={i} style={{ ...s.faqItem, cursor: 'pointer' }} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={s.faqQ}>{faq.q}</h3>
                                    <span style={{ color: colors.primary, fontSize: '20px', fontWeight: '700' }}>{activeFaq === i ? '−' : '+'}</span>
                                </div>
                                {activeFaq === i && <p style={{ ...s.faqA, marginTop: '12px' }}>{faq.a}</p>}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <p style={{ color: colors.textMuted, marginBottom: '16px' }}>Can't find what you're looking for?</p>
                    <Link to="/contact" style={s.contactBtn}>Contact Support</Link>
                </div>
            </section>

            <footer style={s.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan. All rights reserved.</p>
            </footer>
        </div>
    );
}
