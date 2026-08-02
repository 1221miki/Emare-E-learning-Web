import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function MockCheckoutPage() {
    const { txRef } = useParams();
    const navigate = useNavigate();
    const { colors, theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'failed'
    const [errorMsg, setErrorMsg] = useState('');

    const handleSuccess = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await paymentService.verifyChapa(txRef);
            if (res.data && res.data.success) {
                setStatus('success');
                setTimeout(() => {
                    navigate('/student/dashboard');
                }, 2200);
            } else {
                setErrorMsg('Verification failed or returned unsuccessful.');
                setStatus('failed');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || 'Verification request failed.');
            setStatus('failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    const cardBg = theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)';
    const textMuted = theme === 'dark' ? '#94a3b8' : '#64748b';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: colors.bg,
            color: colors.text,
            fontFamily: "'Outfit', 'Inter', sans-serif",
            padding: '20px'
        }}>
            <div style={{
                background: cardBg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${colors.border}`,
                borderRadius: '24px',
                padding: '48px 40px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                textAlign: 'center'
            }}>
                {/* Logo & Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '28px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '900', color: '#fff', fontSize: '20px'
                    }}>E</div>
                    <span style={{ fontWeight: '800', fontSize: '22px', letterSpacing: '-0.5px' }}>Emare ICT Hub</span>
                </div>

                <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#10b981',
                    background: 'rgba(16,185,129,0.12)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '28px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px'
                }}>
                    💳 Chapa Sandbox Gateway
                </div>

                {status === 'pending' && (
                    <>
                        <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>Complete Checkout</h2>
                        <p style={{ color: textMuted, fontSize: '14px', marginBottom: '32px', lineHeight: 1.5 }}>
                            You are in development mode. This simulates a secure payment checkout.
                        </p>

                        <div style={{
                            background: theme === 'dark' ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)',
                            borderRadius: '16px',
                            padding: '20px 24px',
                            textAlign: 'left',
                            marginBottom: '32px',
                            border: `1px solid ${colors.border}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                                <span style={{ color: textMuted, fontSize: '13px', fontWeight: '600' }}>Transaction Ref</span>
                                <span style={{ fontWeight: '700', fontSize: '13px', fontFamily: 'monospace', color: colors.primary }}>{txRef}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                                <span style={{ color: textMuted, fontSize: '13px', fontWeight: '600' }}>Payment Method</span>
                                <span style={{ fontWeight: '700', fontSize: '13px' }}>Chapa (Mock)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: textMuted, fontSize: '13px', fontWeight: '600' }}>Currency</span>
                                <span style={{ fontWeight: '700', fontSize: '13px' }}>ETB</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleSuccess}
                                disabled={loading}
                                style={{
                                    background: loading ? '#6b7280' : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '14px',
                                    padding: '16px',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 16px rgba(16,185,129,0.25)'
                                }}
                            >
                                {loading ? '⏳ Processing Payment...' : '✅ Complete Payment'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                style={{
                                    background: 'transparent',
                                    color: textMuted,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '14px',
                                    padding: '14px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Cancel Transaction
                            </button>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <div style={{ padding: '20px 0' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Payment Approved!</h2>
                        <p style={{ color: textMuted, fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
                            Your transaction has been verified successfully.<br/>Redirecting you back to your dashboard...
                        </p>
                        <div style={{
                            width: '28px', height: '28px', border: '3px solid rgba(59,130,246,0.25)',
                            borderTop: '3px solid #3b82f6', borderRadius: '50%',
                            animation: 'mockSpin 1s linear infinite', margin: '0 auto'
                        }} />
                    </div>
                )}

                {status === 'failed' && (
                    <div style={{ padding: '20px 0' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Payment Failed</h2>
                        <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
                            {errorMsg || 'We could not verify your payment transaction.'}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => setStatus('pending')}
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '14px',
                                    padding: '14px 28px',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Try Again
                            </button>
                            <button
                                onClick={handleCancel}
                                style={{
                                    background: 'transparent',
                                    color: textMuted,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '14px',
                                    padding: '14px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Back to Courses
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <p style={{ color: textMuted, fontSize: '11px', marginTop: '32px', opacity: 0.7 }}>
                    🔒 This is a mock gateway for development only. No real charges are made.
                </p>
            </div>

            <style>{`
                @keyframes mockSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
