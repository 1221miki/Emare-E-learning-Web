import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function PaymentSuccess() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const courseId = params.get('courseId');
    const txRef = params.get('tx_ref');
    const [countdown, setCountdown] = useState(5);
    const [confetti, setConfetti] = useState([]);
    const intervalRef = useRef(null);
    const dark = theme === 'dark';

    // Generate confetti particles
    useEffect(() => {
        const pieces = Array.from({ length: 60 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 3,
            duration: 2.5 + Math.random() * 2,
            color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][Math.floor(Math.random() * 6)],
            size: 6 + Math.random() * 10,
            rotation: Math.random() * 360,
        }));
        setConfetti(pieces);
    }, []);

    // Countdown + auto-redirect
    useEffect(() => {
        if (countdown <= 0) {
            if (courseId) navigate(`/student/learn/${courseId}`);
            else navigate('/student/dashboard');
            return;
        }
        intervalRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(intervalRef.current);
    }, [countdown, courseId, navigate]);

    const cardBg = dark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.97)';
    const muted = dark ? '#94a3b8' : '#64748b';
    const green = '#10b981';

    return (
        <div style={{
            minHeight: '100vh',
            background: dark
                ? 'radial-gradient(ellipse at 20% 30%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(59,130,246,0.1) 0%, transparent 50%), #0f172a'
                : 'radial-gradient(ellipse at 20% 30%, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(59,130,246,0.06) 0%, transparent 50%), #f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Confetti */}
            {confetti.map(p => (
                <div key={p.id} style={{
                    position: 'fixed',
                    top: '-20px',
                    left: `${p.left}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: p.color,
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    transform: `rotate(${p.rotation}deg)`,
                    animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
                    opacity: 0
                }} />
            ))}

            <div style={{
                background: cardBg,
                backdropFilter: 'blur(24px)',
                border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)'}`,
                borderRadius: '32px',
                padding: '56px 48px',
                width: '100%',
                maxWidth: '540px',
                boxShadow: dark
                    ? '0 32px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1) inset'
                    : '0 32px 100px rgba(16,185,129,0.12), 0 0 0 1px rgba(255,255,255,0.8) inset',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                zIndex: 10
            }}>
                {/* Top gradient bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
                    background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)',
                    borderRadius: '32px 32px 0 0'
                }} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, color: '#fff', fontSize: 20,
                        boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
                    }}>E</div>
                    <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px', color: colors.text }}>
                        Emare ICT Hub
                    </span>
                </div>

                {/* Success icon with rings */}
                <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 28px' }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        border: `2px solid ${green}33`,
                        animation: 'ringPulse 2s ease-in-out infinite'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 8,
                        borderRadius: '50%',
                        border: `2px solid ${green}55`,
                        animation: 'ringPulse 2s ease-in-out infinite 0.3s'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 16,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${green}22, ${green}11)`,
                        border: `3px solid ${green}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'successBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                </div>

                <h1 style={{
                    fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px',
                    marginBottom: 8, color: colors.text,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    Payment Successful! 🎉
                </h1>
                <p style={{ color: muted, fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
                    Your enrollment is confirmed. You now have full access<br />to all course content, videos, quizzes and resources.
                </p>

                {/* Info cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                    marginBottom: 28, textAlign: 'left'
                }}>
                    {[
                        { icon: '✅', label: 'Payment Status', value: 'Cleared' },
                        { icon: '🎓', label: 'Enrollment', value: 'Active' },
                        { icon: '📋', label: 'Transaction Ref', value: txRef ? txRef.slice(0, 18) + '…' : 'N/A' },
                        { icon: '📅', label: 'Date', value: new Date().toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' }) }
                    ].map((item) => (
                        <div key={item.label} style={{
                            padding: '14px 16px',
                            background: dark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.04)',
                            border: `1px solid ${dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)'}`,
                            borderRadius: 14
                        }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                            <div style={{ fontSize: 11, color: muted, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* Countdown bar */}
                <div style={{
                    marginBottom: 20,
                    padding: '12px 18px',
                    background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                    borderRadius: 12,
                    border: `1px solid ${green}22`
                }}>
                    <div style={{ fontSize: 13, color: muted, marginBottom: 8, fontWeight: 600 }}>
                        Redirecting to your course in <span style={{ color: green, fontWeight: 800 }}>{countdown}</span>s…
                    </div>
                    <div style={{
                        height: 5, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        borderRadius: 100, overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${((5 - countdown) / 5) * 100}%`,
                            background: `linear-gradient(90deg, ${green}, #059669)`,
                            borderRadius: 100,
                            transition: 'width 1s ease'
                        }} />
                    </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={() => {
                            clearTimeout(intervalRef.current);
                            if (courseId) navigate(`/student/learn/${courseId}`);
                            else navigate('/student/dashboard');
                        }}
                        style={{
                            width: '100%', padding: '17px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', border: 'none', borderRadius: 16,
                            fontWeight: 800, fontSize: 16, cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        🚀 Start Learning Now
                    </button>
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        style={{
                            width: '100%', padding: '15px',
                            background: 'transparent',
                            color: muted,
                            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : colors.border}`,
                            borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = green; e.currentTarget.style.color = green; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : colors.border; e.currentTarget.style.color = muted; }}
                    >
                        📊 View My Dashboard
                    </button>
                </div>

                <p style={{ color: muted, fontSize: 11, marginTop: 24, opacity: 0.6, lineHeight: 1.4 }}>
                    🔒 Transaction secured by Chapa Payment Gateway · Emare ICT Hub
                </p>
            </div>

            <style>{`
                @keyframes confettiFall {
                    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                @keyframes ringPulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.08); opacity: 0.2; }
                }
                @keyframes successBounce {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
