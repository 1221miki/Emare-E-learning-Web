import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function PaymentFailed() {
    const { colors } = useTheme();
    const navigate = useNavigate();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const message = params.get('message') || 'Your payment could not be verified. Please try again or contact support.';
    const txRef = params.get('tx_ref');

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#ef4444', margin: '0 auto 24px', fontSize: '48px' }}></div>
                <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '18px' }}>Payment Failed</h1>
                <p style={{ color: colors.textMuted, fontSize: '16px', marginBottom: '28px', lineHeight: 1.7 }}>
                    {message}
                </p>
                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginBottom: '28px', textAlign: 'left' }}>
                    <p><strong>Transaction Reference:</strong> {txRef || 'N/A'}</p>
                    <p><strong>Next Step:</strong> Try again or contact our support team if you were charged.</p>
                </div>
                <button
                    onClick={() => navigate('/courses')}
                    style={{
                        width: '100%',
                        padding: '18px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '800',
                        cursor: 'pointer'
                    }}>
                    Back to Courses
                </button>
            </div>
        </div>
    );
}
