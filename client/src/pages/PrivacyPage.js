import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPage() {
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
