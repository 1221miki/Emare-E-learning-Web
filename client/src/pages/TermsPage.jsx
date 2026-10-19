import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import { contentService } from '../services/api';

export default function TermsPage() {
    const { colors } = useTheme();
    const [termsData, setTermsData] = useState(null);

    useEffect(() => {
        let isMounted = true;
        contentService.getPage('terms')
            .then(res => {
                if (isMounted && res.data?.data) {
                    setTermsData(res.data.data);
                }
            })
            .catch(err => console.error('Failed to load terms CMS content:', err));
        return () => { isMounted = false; };
    }, []);

    const s = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" },
        container: { padding: '60px 5%', maxWidth: '800px', margin: '0 auto' },
        card: { background: 'rgba(14,23,38,0.65)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(30,41,59,0.5)' },
        title: { fontSize: '32px', fontWeight: '900', margin: '0 0 8px', color: colors.text },
        lastUpdated: { color: colors.textMuted, fontSize: '13px', marginBottom: '32px' },
        content: { color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7 },
        bodyParagraph: { marginBottom: '16px', lineHeight: 1.75, color: '#cbd5e1' },
        footer: { padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(30,41,59,0.4)', color: '#475569', fontSize: '13px' }
    };

    const title = termsData?.title || 'Terms and Conditions';
    const lastUpdated = termsData?.content?.lastUpdated ? `Last Updated: ${termsData.content.lastUpdated}` : 'Last Updated: October 2023';
    const bodyText = typeof termsData?.content === 'string' ? termsData.content : termsData?.content?.body;

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            <Navbar />

            <div style={s.container}>
                <div style={s.card}>
                    <h1 style={s.title}>{title}</h1>
                    <p style={s.lastUpdated}>{lastUpdated}</p>

                    <div style={s.content}>
                        {bodyText ? (
                            bodyText.split(/\n\s*\n/).map((para, i) => (
                                <p key={i} style={s.bodyParagraph}>{para}</p>
                            ))
                        ) : (
                            <>
                                <h3>1. Acceptance of Terms</h3>
                                <p>By accessing and using Emare ICT Hub, you accept and agree to be bound by the terms and provision of this agreement.</p>

                                <h3>2. User Accounts</h3>
                                <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>

                                <h3>3. Course Enrollment and Access</h3>
                                <p>When you enroll in a course, you get a license from us to view it via the Emare services and no other use. Don't try to transfer or resell courses in any way.</p>

                                <h3>4. Content and Behavior Rules</h3>
                                <p>You can only use Emare for lawful purposes. You're responsible for all the content that you post on our platform. You should keep the reviews, questions, posts, courses and other content you upload in line with our trust and safety guidelines.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <footer style={s.footer}>
                <p>© {new Date().getFullYear()} Emare ICT Hub, Debre Birhan.</p>
            </footer>
        </div>
    );
}
