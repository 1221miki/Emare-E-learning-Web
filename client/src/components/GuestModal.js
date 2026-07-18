import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/**
 * GuestModal — shown when a visitor attempts a restricted action.
 * Props:
 *   isOpen    — boolean
 *   onClose   — function
 *   action    — string describing what they tried (e.g. "enroll in this course")
 */
export default function GuestModal({ isOpen, onClose, action = 'access this feature' }) {
    const { colors } = useTheme();
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={{ ...s.modal, background: colors.bgCard, border: `1px solid ${colors.border}` }}
                onClick={e => e.stopPropagation()}>

                {/* Close */}
                <button onClick={onClose} style={{ ...s.closeBtn, background: colors.bgInput, color: colors.textMuted }}>✕</button>

                {/* Icon */}
                <div style={s.iconWrap}>
                    <div style={s.lockIcon}>🔐</div>
                </div>

                {/* Content */}
                <h2 style={{ ...s.title, color: colors.text }}>Create a Free Account</h2>
                <p style={{ ...s.subtitle, color: colors.textMuted }}>
                    You need to be logged in to <strong style={{ color: colors.text }}>{action}</strong>. Join thousands of learners on Emare ICT Hub!
                </p>

                {/* Perks */}
                <div style={s.perks}>
                    {[
                        { icon: '🎓', text: 'Enroll in 100+ courses' },
                        { icon: '📊', text: 'Track your learning progress' },
                        { icon: '🏆', text: 'Earn verifiable certificates' },
                        { icon: '💬', text: 'Join course discussions' }
                    ].map((p, i) => (
                        <div key={i} style={{ ...s.perkItem, borderColor: colors.border }}>
                            <span style={s.perkIcon}>{p.icon}</span>
                            <span style={{ color: colors.textMuted, fontSize: '13px' }}>{p.text}</span>
                        </div>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div style={s.btnRow}>
                    <button
                        style={s.registerBtn}
                        onClick={() => { onClose(); navigate('/register'); }}
                    >
                        🚀 Register Free
                    </button>
                    <button
                        style={{ ...s.loginBtn, border: `1px solid ${colors.border}`, color: colors.text, background: colors.bgInput }}
                        onClick={() => { onClose(); navigate('/login'); }}
                    >
                        Login
                    </button>
                </div>

                <p style={{ ...s.footer, color: colors.textMuted }}>
                    Already have an account? <span
                        style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}
                        onClick={() => { onClose(); navigate('/login'); }}>
                        Sign In
                    </span>
                </p>
            </div>
        </div>
    );
}

const s = {
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px'
    },
    modal: {
        position: 'relative',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '460px', width: '100%',
        textAlign: 'center',
        boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        animation: 'fadeIn 0.25s ease'
    },
    closeBtn: {
        position: 'absolute', top: '16px', right: '16px',
        border: 'none', borderRadius: '8px',
        width: '32px', height: '32px',
        cursor: 'pointer', fontSize: '14px', fontWeight: '700'
    },
    iconWrap: { marginBottom: '16px' },
    lockIcon: {
        fontSize: '56px',
        display: 'inline-block',
        animation: 'bounce 1s ease infinite alternate'
    },
    title: { fontSize: '24px', fontWeight: '800', margin: '0 0 12px' },
    subtitle: { fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px' },
    perks: {
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '10px', marginBottom: '28px', textAlign: 'left'
    },
    perkItem: {
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid',
        borderRadius: '10px', padding: '10px 12px'
    },
    perkIcon: { fontSize: '18px' },
    btnRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
    registerBtn: {
        flex: 1,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff', border: 'none',
        borderRadius: '12px', padding: '14px 20px',
        fontWeight: '800', fontSize: '15px', cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(59,130,246,0.3)'
    },
    loginBtn: {
        flex: 1,
        borderRadius: '12px', padding: '14px 20px',
        fontWeight: '700', fontSize: '15px', cursor: 'pointer'
    },
    footer: { fontSize: '13px', margin: 0 }
};
