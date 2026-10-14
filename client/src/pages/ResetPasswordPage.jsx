import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function ResetPasswordPage() {
    const { resetPassword } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [newPassword,       setNewPassword]       = useState('');
    const [confirmPassword,   setConfirmPassword]   = useState('');
    const [showPassword,      setShowPassword]      = useState(false);
    const [showConfirmPwd,    setShowConfirmPwd]    = useState(false);
    const [error,             setError]             = useState('');
    const [success,           setSuccess]           = useState('');
    const [loading,           setLoading]           = useState(false);
    const [passwordStrength,  setPasswordStrength]  = useState(0);

    useEffect(() => {
        if (!token || !email) {
            setError('Invalid or missing link. Please request a new one from the login page.');
        }
    }, [token, email]);

    useEffect(() => {
        let s = 0;
        if (newPassword.length >= 8)          s++;
        if (/[A-Z]/.test(newPassword))        s++;
        if (/[a-z]/.test(newPassword))        s++;
        if (/[0-9]/.test(newPassword))        s++;
        if (/[!@#$%^&*]/.test(newPassword))   s++;
        setPasswordStrength(s);
    }, [newPassword]);

    const getStrength = () => {
        const texts  = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const colors = ['#d32f2f', '#ff9800', '#ffc107', '#8bc34a', '#4caf50', '#2e7d32'];
        return { text: texts[passwordStrength], color: colors[passwordStrength] };
    };

    const validate = () => {
        if (!newPassword)                        return 'Please enter a new password.';
        if (newPassword.length < 8)              return 'Password must be at least 8 characters.';
        if (!/[A-Z]/.test(newPassword))          return 'Password needs an uppercase letter (A-Z).';
        if (!/[a-z]/.test(newPassword))          return 'Password needs a lowercase letter (a-z).';
        if (!/[0-9]/.test(newPassword))          return 'Password needs a number (0-9).';
        if (!/[!@#$%^&*]/.test(newPassword))     return 'Password needs a special character (!@#$%^&*).';
        if (newPassword !== confirmPassword)      return 'Passwords do not match.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        const err = validate();
        if (err) { setError(err); return; }
        setLoading(true);
        try {
            const user = await resetPassword(token.trim(), newPassword);
            setSuccess('Password set successfully! Redirecting...');
            setTimeout(() => {
                if (user?.assignedRole === 'Admin')       navigate('/admin/dashboard');
                else if (user?.assignedRole === 'Instructor') navigate('/instructor/dashboard');
                else navigate('/student/dashboard');
            }, 1500);
        } catch (ex) {
            const msg = ex?.response?.data?.message || '';
            if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
                setError('This link has expired or is invalid. Please request a new reset link.');
            } else {
                setError(msg || 'Failed to set password. Please request a new reset link.');
            }
        } finally {
            setLoading(false);
        }
    };

    const s = {
        page: {
            minHeight: '100vh',
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'
                : 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            padding: 20,
            position: 'relative'
        },
        back: {
            position: 'absolute', top: 24, left: 24,
            color: isDark ? '#94a3b8' : '#475569',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 600,
            padding: '10px 14px',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
            borderRadius: 10,
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            transition: 'color 0.2s, background 0.2s'
        },
        card: {
            background: isDark ? '#111a2e' : '#ffffff',
            borderRadius: 24,
            boxShadow: isDark
                ? '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 24px 60px rgba(15,23,42,0.08)',
            border: isDark ? '1px solid #24304d' : '1px solid #e2e8f0',
            padding: 36, maxWidth: 450, width: '100%'
        },
        field:   { display: 'flex', flexDirection: 'column', gap: 8 },
        label:   { fontSize: 13, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155' },
        input: {
            padding: '12px 14px',
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
            borderRadius: 10, fontSize: 14,
            background: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc',
            color: isDark ? '#ffffff' : '#0f172a',
            outline: 'none',
            boxSizing: 'border-box'
        },
        pwdWrap: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
        eye: {
            position: 'absolute', right: 12,
            background: 'none', border: 'none',
            cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b', fontSize: 16
        },
        btn: {
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
            marginTop: 10, textDecoration: 'none', textAlign: 'center'
        },
        errorBox: {
            background: isDark ? 'rgba(239,68,68,0.15)' : '#ffebee',
            border: isDark ? '1px solid rgba(239,68,68,0.4)' : '1px solid #ef5350',
            borderRadius: 10, padding: '12px 14px',
            color: isDark ? '#fca5a5' : '#d32f2f',
            fontSize: 13, marginBottom: 20,
            display: 'flex', alignItems: 'flex-start'
        },
        successBox: {
            background: isDark ? 'rgba(34,197,94,0.15)' : '#e8f5e9',
            border: isDark ? '1px solid rgba(34,197,94,0.4)' : '1px solid #66bb6a',
            borderRadius: 10, padding: '12px 14px',
            color: isDark ? '#86efac' : '#2e7d32',
            fontSize: 13, marginBottom: 20,
            display: 'flex', alignItems: 'center'
        },
        req: {
            background: isDark ? 'rgba(255,255,255,0.04)' : '#f9f9f9',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e0e0e0',
            borderRadius: 10, padding: '12px 14px',
            color: isDark ? '#94a3b8' : '#333'
        }
    };

    // ── Invalid link screen ───────────────────────────────────────────────────
    if (!token || !email) {
        return (
            <div style={s.page}>
                <Link to="/login" style={s.back}><FaArrowLeft /> Back to Login</Link>
                <div style={s.card}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <FaExclamationCircle style={{ fontSize: 48, color: '#d32f2f', marginBottom: 16 }} />
                        <h2 style={{ color: '#d32f2f', margin: '16px 0' }}>Invalid Link</h2>
                        <p style={{ color: '#666', marginBottom: 24 }}>
                            Your link is missing or invalid. Please request a new password reset.
                        </p>
                        <Link to="/login" style={s.btn}>Return to Login</Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main form ─────────────────────────────────────────────────────────────
    return (
        <div style={s.page}>
            <Link to="/login" style={s.back}><FaArrowLeft /> Back to Login</Link>

            <div style={s.card}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>▣</div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>Set Password</h1>
                    <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Set a strong new password for your account</p>
                </div>

                {/* Error banner */}
                {error && (
                    <div style={s.errorBox}>
                        <FaExclamationCircle style={{ marginRight: 8, flexShrink: 0 }} />
                        <span>
                            {error}{' '}
                            {(error.includes('expired') || error.includes('invalid')) && (
                                <Link to="/login" style={{ color: '#d32f2f', fontWeight: 700 }}>Request a new link →</Link>
                            )}
                        </span>
                    </div>
                )}

                {/* Success banner */}
                {success && (
                    <div style={s.successBox}>
                        <FaCheckCircle style={{ marginRight: 8 }} />{success}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
                    {/* Email (read-only) */}
                    <div style={s.field}>
                        <label style={s.label}>Email Address</label>
                        <input type="email" value={email} disabled
                            style={{ ...s.input, backgroundColor: '#f0f0f0', color: '#666' }} />
                    </div>

                    {/* New Password */}
                    <div style={s.field}>
                        <label style={s.label}>New Password</label>
                        <div style={s.pwdWrap}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={{ ...s.input, width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                            />
                            <button type="button" onClick={() => setShowPassword(v => !v)} style={s.eye}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {newPassword && (
                            <div style={{ marginTop: 8, fontSize: 12 }}>
                                <span>Strength: </span>
                                <span style={{ color: getStrength().color, fontWeight: 'bold' }}>{getStrength().text}</span>
                                <div style={{ height: 4, background: '#e0e0e0', borderRadius: 2, marginTop: 4 }}>
                                    <div style={{ height: '100%', width: `${(passwordStrength / 5) * 100}%`,
                                        background: getStrength().color, borderRadius: 2, transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div style={s.field}>
                        <label style={s.label}>Confirm Password</label>
                        <div style={s.pwdWrap}>
                            <input
                                type={showConfirmPwd ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                style={{ ...s.input, width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                            />
                            <button type="button" onClick={() => setShowConfirmPwd(v => !v)} style={s.eye}>
                                {showConfirmPwd ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* Requirements checklist */}
                    {newPassword && (
                        <div style={s.req}>
                            <p style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>Password Requirements:</p>
                            <ul style={{ fontSize: 12, margin: 0, paddingLeft: 20 }}>
                                {[
                                    [newPassword.length >= 8,          'At least 8 characters'],
                                    [/[A-Z]/.test(newPassword),        'Uppercase letter (A-Z)'],
                                    [/[a-z]/.test(newPassword),        'Lowercase letter (a-z)'],
                                    [/[0-9]/.test(newPassword),        'Number (0-9)'],
                                    [/[!@#$%^&*]/.test(newPassword),   'Special character (!@#$%^&*)'],
                                ].map(([ok, label]) => (
                                    <li key={label} style={{ color: ok ? '#4caf50' : '#d32f2f' }}>• {label}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit"
                        style={{ ...s.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        disabled={loading}>
                        {loading ? 'Setting Password...' : 'Set Password'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 13, color: '#666', margin: 0 }}>
                    Remember your password?{' '}
                    <Link to="/login" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Sign in here</Link>
                </p>
            </div>
        </div>
    );
}

