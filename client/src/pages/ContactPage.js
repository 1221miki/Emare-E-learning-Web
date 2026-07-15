import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ContactPage() {
    const [status, setStatus] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Mock sending message
        setStatus('Your message has been sent successfully. We will get back to you soon.');
        e.target.reset();
    };

    return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.logoBox}><div style={s.logo}>E</div><span style={s.logoText}>Emare ICT Hub</span></Link>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/courses" style={s.navLink}>Courses</Link>
                    <Link to="/about" style={s.navLink}>About</Link>
                    <Link to="/login" style={s.loginBtn}>Sign In</Link>
                </div>
            </nav>

            <div style={s.hero}>
                <span style={s.badge}>Get In Touch</span>
                <h1 style={s.heroTitle}>Contact Us</h1>
                <p style={s.heroSub}>Have questions about our courses, pricing, or need technical support? We're here to help.</p>
            </div>

            <section style={s.section}>
                <div style={s.grid2}>
                    <div>
                        <h2 style={s.sTitle}>Send a Message</h2>
                        {status && <div style={s.successBox}>{status}</div>}
                        <form onSubmit={handleSubmit} style={s.form}>
                            <div style={s.inputGroup}>
                                <label style={s.label}>Full Name</label>
                                <input type="text" required style={s.input} placeholder="Abeba Tsehay" />
                            </div>
                            <div style={s.inputGroup}>
                                <label style={s.label}>Email Address</label>
                                <input type="email" required style={s.input} placeholder="abeba@example.com" />
                            </div>
                            <div style={s.inputGroup}>
                                <label style={s.label}>Subject</label>
                                <select style={s.input}>
                                    <option>General Inquiry</option>
                                    <option>Course Support</option>
                                    <option>Payment Issue</option>
                                    <option>Report a Bug</option>
                                </select>
                            </div>
                            <div style={s.inputGroup}>
                                <label style={s.label}>Message</label>
                                <textarea required rows="5" style={s.textarea} placeholder="How can we help you?"></textarea>
                            </div>
                            <button type="submit" style={s.submitBtn}>Send Message</button>
                        </form>
                    </div>

                    <div style={s.contactInfo}>
                        <h2 style={s.sTitle}>Contact Information</h2>
                        <div style={s.infoCard}>
                            <div style={s.infoItem}>
                                <span style={s.icon}>📍</span>
                                <div>
                                    <div style={s.infoLabel}>Address</div>
                                    <div style={s.infoValue}>Debre Birhan, Ethiopia</div>
                                </div>
                            </div>
                            <div style={s.infoItem}>
                                <span style={s.icon}>📞</span>
                                <div>
                                    <div style={s.infoLabel}>Phone</div>
                                    <div style={s.infoValue}>+251 911 234 567</div>
                                </div>
                            </div>
                            <div style={s.infoItem}>
                                <span style={s.icon}>✉️</span>
                                <div>
                                    <div style={s.infoLabel}>Email</div>
                                    <div style={s.infoValue}>support@emareicthub.com</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer style={s.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan. <Link to="/privacy" style={s.fLink}>Privacy</Link> · <Link to="/terms" style={s.fLink}>Terms</Link></p>
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
    hero: { padding: '80px 5% 40px', textAlign: 'center' },
    badge: { display: 'inline-block', padding: '6px 16px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '20px', fontWeight: '700', fontSize: '13px', marginBottom: '20px', border: '1px solid rgba(59,130,246,0.2)' },
    heroTitle: { fontSize: '48px', fontWeight: '900', margin: '0 0 20px', lineHeight: 1.15, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSub: { color: '#94a3b8', fontSize: '17px', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' },
    section: { padding: '40px 5% 80px', maxWidth: '1200px', margin: '0 auto' },
    sTitle: { color: '#f1f5f9', fontSize: '24px', fontWeight: '800', marginBottom: '24px' },
    grid2: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '60px' },
    form: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(30,41,59,0.5)' },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
    input: { width: '100%', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.5)', color: '#fff', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    textarea: { width: '100%', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.5)', color: '#fff', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical' },
    submitBtn: { width: '100%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },
    successBox: { background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '14px' },
    contactInfo: { paddingTop: '8px' },
    infoCard: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(30,41,59,0.5)' },
    infoItem: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' },
    icon: { fontSize: '24px' },
    infoLabel: { color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '4px' },
    infoValue: { color: '#f1f5f9', fontSize: '16px', fontWeight: '500' },
    footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' },
    fLink: { color: '#64748b', textDecoration: 'none' }
};
