import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function PaymentSuccess() {
    const { colors } = useTheme();
    const navigate = useNavigate();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const courseId = params.get('courseId');
    const txRef = params.get('tx_ref');

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#10b981', margin: '0 auto 24px', fontSize: '48px' }}>✓</div>
                <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '18px' }}>Payment Complete!</h1>
                <p style={{ color: colors.textMuted, fontSize: '16px', marginBottom: '24px', lineHeight: 1.7 }}>
                    Your payment has been successfully verified. Enrollment is now active and your course will appear in My Courses.
                </p>
                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginBottom: '28px', textAlign: 'left' }}>
                    <p><strong>Transaction Reference:</strong> {txRef || 'N/A'}</p>
                    {courseId && <p><strong>Course ID:</strong> {courseId}</p>}
                    <p><strong>Status:</strong> Cleared and enrolled</p>
                </div>
                <div style={{ display: 'grid', gap: '14px' }}>
                    <button
                        onClick={() => courseId ? navigate(`/student/learn/${courseId}`) : navigate('/student/dashboard')}
                        style={{
                            width: '100%',
                            padding: '18px',
                            borderRadius: '16px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: '800',
                            cursor: 'pointer'
                        }}>
                        {courseId ? 'Go to Course' : 'Go to Dashboard'}
                    </button>
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '16px',
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: colors.text,
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}>
                        View My Courses
                    </button>
                </div>
            </div>
        </div>
    );
}
