import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function ResetPasswordPage() {
    const { resetPassword } = useAuth();
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: 20,
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    },
    back: {
        position: 'absolute', top: 20, left: 20,
        color: '#fff', textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 14, fontWeight: 500
    },
    card: {
        background: '#fff', borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        padding: 40, maxWidth: 450, width: '100%'
    },
    field:   { display: 'flex', flexDirection: 'column', gap: 8 },
    label:   { fontSize: 13, fontWeight: 600, color: '#333' },
    input: {
        padding: '12px 14px', border: '1px solid #ddd',
        borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box'
    },
    pwdWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
    eye: {
        position: 'absolute', right: 12,
        background: 'none', border: 'none',
        cursor: 'pointer', color: '#666', fontSize: 16
    },
    btn: {
        padding: '12px 16px', backgroundColor: '#22c55e',
        color: '#fff', border: 'none', borderRadius: 6,
        fontSize: 15, fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.3s', marginTop: 10
    },
    errorBox: {
        background: '#ffebee', border: '1px solid #ef5350',
        borderRadius: 6, padding: '12px 14px', color: '#d32f2f',
        fontSize: 13, marginBottom: 20,
        display: 'flex', alignItems: 'flex-start'
    },
    successBox: {
        background: '#e8f5e9', border: '1px solid #66bb6a',
        borderRadius: 6, padding: '12px 14px', color: '#2e7d32',
        fontSize: 13, marginBottom: 20,
        display: 'flex', alignItems: 'center'
    },
    req: {
        background: '#f9f9f9', border: '1px solid #e0e0e0',
        borderRadius: 6, padding: '12px 14px'
    }
};
