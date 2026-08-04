import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function PaymentCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { colors, theme } = useTheme();
    const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref') || '';

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'failed'
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const [enrolledCourseId, setEnrolledCourseId] = useState(null);

    useEffect(() => {
        if (!txRef) {
            setStatus('failed');
            setErrorMsg('No transaction reference found. Please try enrolling again.');
            return;
        }

        // Animate progress bar
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) { clearInterval(progressInterval); return 90; }
                return prev + Math.random() * 12;
            });
        }, 250);

        const verifyPayment = async () => {
            try {
                const res = await paymentService.verifyChapa(txRef);
                clearInterval(progressInterval);
                setProgress(100);

                const verified = res.data?.verified === true;
                const statusKey = res.data?.transactionStatus || '';

                if (verified) {
                    setStatus('success');
                    const cId = res.data.courseId;
                    setEnrolledCourseId(cId);
                    setTimeout(() => {
                        if (cId) {
                            navigate(`/payment/success?courseId=${cId}&tx_ref=${encodeURIComponent(txRef)}`);
                        } else {
                            navigate(`/payment/success?tx_ref=${encodeURIComponent(txRef)}`);
                        }
                    }, 1800);
                    return;
                }

                setStatus('failed');
                const failureMessage = res.data?.success === false && statusKey === 'failed'
                    ? 'Payment was declined or failed. Please try again or contact support.'
                    : statusKey === 'pending'
                        ? 'Payment is still pending verification. Please wait a moment and try again.'
                        : 'Payment verification returned unsuccessful. Please contact support.';
                setErrorMsg(failureMessage);
                setTimeout(() => {
                    navigate(`/payment/failed?tx_ref=${encodeURIComponent(txRef)}&message=${encodeURIComponent(failureMessage)}`);
                }, 2200);
            } catch (err) {
                clearInterval(progressInterval);
                console.error('Payment verification error:', err);
                setStatus('failed');
                setErrorMsg(
                    err.response?.data?.message ||
                    'Unable to verify your payment. If you were charged, please contact support with your transaction reference.'
                );
            }
        };

        // Small delay to let the animation show
        const timer = setTimeout(verifyPayment, 1500);
        return () => { clearTimeout(timer); clearInterval(progressInterval); };
    }, [txRef, navigate]);

    const cardBg = theme === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)';
    const textMuted = theme === 'dark' ? '#94a3b8' : '#64748b';
    const successGreen = '#10b981';
    const errorRed = '#ef4444';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: theme === 'dark'
                ? 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1) 0%, transparent 50%), #0f172a'
                : 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.05) 0%, transparent 50%), #f1f5f9',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            padding: '20px'
        }}>
            <div style={{
                background: cardBg,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${colors.border}`,
                borderRadius: '28px',
                padding: '56px 48px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: theme === 'dark'
                    ? '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset'
                    : '0 25px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.8) inset',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative gradient bar at top */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)',
                    borderRadius: '28px 28px 0 0'
                }} />

                {/* Logo */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '32px'
                }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '900', color: '#fff', fontSize: '22px',
                        boxShadow: '0 4px 16px rgba(59,130,246,0.3)'
                    }}>E</div>
                    <span style={{
                        fontWeight: '800', fontSize: '22px',
                        letterSpacing: '-0.5px', color: colors.text
                    }}>Emare ICT Hub</span>
                </div>

                {/* ── VERIFYING STATE ─── */}
                {status === 'verifying' && (
                    <div style={{ padding: '20px 0' }}>
                        {/* Animated spinner */}
                        <div style={{
                            width: '80px', height: '80px',
                            margin: '0 auto 28px',
                            position: 'relative'
                        }}>
                            <div style={{
                                width: '80px', height: '80px',
                                border: '4px solid rgba(59,130,246,0.15)',
                                borderTop: '4px solid #3b82f6',
                                borderRadius: '50%',
                                animation: 'chapaCallbackSpin 0.8s linear infinite'
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '28px'
                            }}>💳</div>
                        </div>

                        <h2 style={{
                            fontSize: '26px', fontWeight: '800',
                            marginBottom: '8px', letterSpacing: '-0.5px',
                            color: colors.text
                        }}>
                            Verifying Payment...
                        </h2>
                        <p style={{
                            color: textMuted, fontSize: '15px',
                            marginBottom: '32px', lineHeight: 1.6
                        }}>
                            We're confirming your transaction with Chapa. Please don't close this page.
                        </p>

                        {/* Progress bar */}
                        <div style={{
                            width: '100%', height: '8px',
                            background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderRadius: '100px',
                            overflow: 'hidden',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                width: `${Math.min(progress, 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                                borderRadius: '100px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '12px', color: textMuted, fontWeight: '600'
                        }}>
                            <span>Processing</span>
                            <span>{Math.round(Math.min(progress, 100))}%</span>
                        </div>

                        {/* Transaction Reference */}
                        <div style={{
                            marginTop: '28px',
                            padding: '14px 20px',
                            background: theme === 'dark' ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)',
                            borderRadius: '12px',
                            border: `1px solid ${colors.border}`
                        }}>
                            <span style={{ color: textMuted, fontSize: '12px', fontWeight: '600' }}>Transaction Ref: </span>
                            <span style={{
                                fontFamily: 'monospace', fontSize: '12px',
                                fontWeight: '700', color: colors.primary
                            }}>{txRef}</span>
                        </div>
                    </div>
                )}

                {/* ── SUCCESS STATE ─── */}
                {status === 'success' && (
                    <div style={{ padding: '20px 0' }}>
                        <div style={{
                            width: '88px', height: '88px',
                            margin: '0 auto 24px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${successGreen}22, ${successGreen}11)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `3px solid ${successGreen}44`,
                            animation: 'chapaCallbackPulse 2s ease-in-out infinite'
                        }}>
                            <span style={{ fontSize: '42px' }}>✅</span>
                        </div>

                        <h2 style={{
                            fontSize: '28px', fontWeight: '800',
                            marginBottom: '8px', letterSpacing: '-0.5px',
                            color: colors.text
                        }}>
                            Payment Successful!
                        </h2>
                        <p style={{
                            color: successGreen, fontSize: '15px',
                            marginBottom: '8px', fontWeight: '600'
                        }}>
                            You have been enrolled successfully 🎉
                        </p>
                        <p style={{
                            color: textMuted, fontSize: '14px',
                            marginBottom: '32px', lineHeight: 1.6
                        }}>
                            Redirecting you to your course in a few seconds...
                        </p>

                        {/* Success info card */}
                        <div style={{
                            padding: '20px 24px',
                            background: theme === 'dark' ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                            borderRadius: '16px',
                            border: `1px solid ${successGreen}33`,
                            marginBottom: '24px',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: textMuted, fontSize: '13px', fontWeight: '600' }}>Status</span>
                                <span style={{ color: successGreen, fontWeight: '700', fontSize: '13px' }}>✓ Completed</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: textMuted, fontSize: '13px', fontWeight: '600' }}>Reference</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: colors.text }}>{txRef}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (enrolledCourseId) navigate(`/student/learn/${enrolledCourseId}`);
                                else navigate('/student/dashboard');
                            }}
                            style={{
                                width: '100%',
                                background: `linear-gradient(135deg, ${successGreen}, #059669)`,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '14px',
                                padding: '16px',
                                fontWeight: '700',
                                fontSize: '15px',
                                cursor: 'pointer',
                                boxShadow: `0 8px 24px ${successGreen}33`,
                                transition: 'all 0.2s'
                            }}
                        >
                            🎓 Start Learning
                        </button>
                    </div>
                )}

                {/* ── FAILED STATE ─── */}
                {status === 'failed' && (
                    <div style={{ padding: '20px 0' }}>
                        <div style={{
                            width: '88px', height: '88px',
                            margin: '0 auto 24px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${errorRed}22, ${errorRed}11)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `3px solid ${errorRed}44`
                        }}>
                            <span style={{ fontSize: '42px' }}>❌</span>
                        </div>

                        <h2 style={{
                            fontSize: '28px', fontWeight: '800',
                            marginBottom: '8px', letterSpacing: '-0.5px',
                            color: colors.text
                        }}>
                            Payment Verification Failed
                        </h2>
                        <p style={{
                            color: errorRed, fontSize: '14px',
                            marginBottom: '28px', lineHeight: 1.6,
                            maxWidth: '380px', margin: '0 auto 28px'
                        }}>
                            {errorMsg || 'We could not verify your payment. If you were charged, please contact support.'}
                        </p>

                        {txRef && (
                            <div style={{
                                padding: '14px 20px',
                                background: theme === 'dark' ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)',
                                borderRadius: '12px',
                                border: `1px solid ${colors.border}`,
                                marginBottom: '24px'
                            }}>
                                <span style={{ color: textMuted, fontSize: '12px', fontWeight: '600' }}>Your Reference: </span>
                                <span style={{
                                    fontFamily: 'monospace', fontSize: '12px',
                                    fontWeight: '700', color: colors.primary
                                }}>{txRef}</span>
                                <p style={{ color: textMuted, fontSize: '11px', margin: '8px 0 0', lineHeight: 1.4 }}>
                                    Save this reference if you need to contact support.
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => { setStatus('verifying'); setProgress(0); window.location.reload(); }}
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '14px',
                                    padding: '16px',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(59,130,246,0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🔄 Try Verification Again
                            </button>
                            <button
                                onClick={() => navigate('/courses')}
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
                                Back to Courses
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <p style={{
                    color: textMuted, fontSize: '11px',
                    marginTop: '32px', opacity: 0.6,
                    lineHeight: 1.4
                }}>
                    🔒 Secured by Chapa Payment Gateway · Emare ICT Hub
                </p>
            </div>

            <style>{`
                @keyframes chapaCallbackSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes chapaCallbackPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.9; }
                }
            `}</style>
        </div>
    );
}
