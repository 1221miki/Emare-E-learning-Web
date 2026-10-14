import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

// Normalize + decode the email passed via the ?email= query parameter.
// useSearchParams already URL-decodes the value; this is a defensive pass in case
// the link was double-encoded, and it always trims + lowercases the result.
const normalizeEmail = (raw = '') => {
    if (!raw) return '';
    try {
        return decodeURIComponent(String(raw)).trim().toLowerCase();
    } catch {
        return String(raw).trim().toLowerCase();
    }
};

// Friendly copy for common HTTP status codes, used when the API reply body
// can't be parsed (e.g. a proxy or edge returned an HTML/empty 5xx page).
const STATUS_MESSAGES = {
    400: 'The request was invalid. Please check your details and try again.',
    401: 'Your session has expired. Please sign in again.',
    404: 'The requested resource was not found.',
    429: 'Too many attempts. Please wait a moment and then try again.',
    500: 'The server ran into an unexpected problem. Please try again later.',
    502: 'The server is temporarily unavailable. Please try again in a moment.',
    503: 'The service is temporarily unavailable. Please try again later.'
};

// Best-effort extraction of a human-readable message from any thrown error
// (axios ApiError, network failure, or plain Error). Guaranteed to return a
// non-empty string so the UI never shows a bare fallback.
const extractErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
    if (!err) return fallback;

    // 1. Structured JSON error body from our API.
    const data = err.response?.data;
    if (data && typeof data === 'object') {
        if (data.message) return data.message;
        if (data.error) return data.error;
    }

    // 2. Known axios failure codes.
    if (err.code === 'ERR_NETWORK') {
        return 'Network error: Unable to reach the server. Please check your connection and try again.';
    }
    if (err.code === 'ECONNABORTED') {
        return 'The request timed out. Please try again.';
    }

    // 3. Map recognizable HTTP status codes to friendly copy.
    if (err.response?.status && STATUS_MESSAGES[err.response.status]) {
        return STATUS_MESSAGES[err.response.status];
    }

    // 4. Anything left with a real message (skip axios's generic
    //    "Request failed with status code X" noise, handled above).
    const rawMessage = typeof err.message === 'string' ? err.message.trim() : '';
    if (rawMessage && !/^Request failed with status code \d+$/.test(rawMessage)) {
        return rawMessage;
    }

    return fallback;
};

export default function VerifyEmailPage() {
    const { verifyEmail, resendVerification } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Prefer the decoded URL query param; fall back to navigation state if present.
    const email = useMemo(
        () => normalizeEmail(searchParams.get('email') || location.state?.email || ''),
        [searchParams, location.state]
    );
    const [form, setForm] = useState({ accountEmail: email, verificationCode: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(location.state?.success || '');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendError, setResendError] = useState('');
    const [resendSuccess, setResendSuccess] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(0);

    useEffect(() => {
        if (!email) {
            setError('Email is required to verify your account. Please use the link from your email.');
            return;
        }
        setSecondsRemaining(30);
    }, [email]);

    // Keep the (disabled) email input in sync if the query param changes while mounted.
    useEffect(() => {
        setForm(prev => (prev.accountEmail === email ? prev : { ...prev, accountEmail: email }));
    }, [email]);

    useEffect(() => {
        if (secondsRemaining <= 0) return;
        const timer = window.setInterval(() => {
            setSecondsRemaining((prev) => Math.max(prev - 1, 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [secondsRemaining]);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.accountEmail.trim() || !form.verificationCode.trim()) {
            setError('Please enter both email and verification code.');
            return;
        }

        setLoading(true);
        try {
            const response = await verifyEmail({ accountEmail: form.accountEmail.trim().toLowerCase(), verificationCode: form.verificationCode.trim() });
            setSuccess(response.message || 'Email verified successfully. Redirecting to login...');
            setTimeout(() => navigate('/login', { state: { success: response.message || 'Email verified successfully. Please log in.' } }), 1300);
        } catch (err) {
            setError(extractErrorMessage(err, 'Failed to verify email. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = useCallback(async () => {
        const currentEmail = form.accountEmail || email;
        if (!currentEmail) {
            setResendError('Email is required to resend verification code.');
            return;
        }

        setResendError('');
        setResendSuccess('');
        setResendLoading(true);

        try {
            const response = await resendVerification({ accountEmail: normalizeEmail(currentEmail) });

            if (response && response.success === false) {
                setResendError(response.message || 'Failed to resend verification code.');
                return;
            }

            const successMessage = response?.message || 'A new verification code has been sent.';
            setResendSuccess(successMessage);

            if (response?.verificationCode && import.meta.env.DEV) {
                console.log('Dev Verification Code:', response.verificationCode);
                setForm(prev => ({ ...prev, verificationCode: response.verificationCode }));
            }

            setSecondsRemaining(30);
        } catch (err) {
            setResendError(extractErrorMessage(err, 'Failed to resend verification code.'));
        } finally {
            setResendLoading(false);
        }
    }, [form.accountEmail, email, resendVerification]);

    const styles = {
        page: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'
                : 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
            padding: '20px',
            position: 'relative'
        },
        backButton: {
            position: 'absolute',
            top: '24px',
            left: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: isDark ? '#94a3b8' : '#475569',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
            padding: '10px 14px',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
            borderRadius: '10px',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            transition: 'color 0.2s, background 0.2s'
        },
        card: {
            background: isDark ? '#111a2e' : '#ffffff',
            border: isDark ? '1px solid #24304d' : '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '36px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: isDark
                ? '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 24px 60px rgba(15,23,42,0.08)'
        },
        header: { textAlign: 'center', marginBottom: '28px' },
        logo: {
            width: '58px',
            height: '58px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#fff',
            fontWeight: '700',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)'
        },
        title: {
            color: isDark ? '#f4f7fc' : '#0f172a',
            fontSize: '24px',
            fontWeight: '800',
            margin: 0
        },
        subtitle: {
            color: isDark ? '#93a1bd' : '#64748b',
            fontSize: '14px',
            marginTop: '10px'
        },
        form: { display: 'grid', gap: '16px' },
        fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
        label: {
            color: isDark ? '#cbd5e1' : '#334155',
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '0.5px'
        },
        input: {
            background: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc',
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            color: isDark ? '#ffffff' : '#0f172a',
            fontSize: '15px',
            padding: '14px 16px',
            outline: 'none',
            boxSizing: 'border-box'
        },
        disabledInput: {
            background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            color: isDark ? '#cbd5e1' : '#475569',
            fontSize: '15px',
            padding: '14px 16px',
            outline: 'none',
            cursor: 'not-allowed',
            opacity: 1,
            boxSizing: 'border-box'
        },
        passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
        eyeIcon: {
            position: 'absolute',
            right: '14px',
            background: 'none',
            border: 'none',
            color: isDark ? '#94a3b8' : '#64748b',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
        },
        btn: {
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)'
        },
        errorBox: {
            background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
            border: isDark ? '1px solid rgba(239,68,68,0.4)' : '1px solid #fca5a5',
            color: isDark ? '#fca5a5' : '#b91c1c',
            padding: '14px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
        },
        successBox: {
            background: isDark ? 'rgba(34,197,94,0.15)' : '#f0fdf4',
            border: isDark ? '1px solid rgba(34,197,94,0.4)' : '1px solid #86efac',
            color: isDark ? '#86efac' : '#166534',
            padding: '14px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
        },
        resendContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '16px' },
        expiryNotice: {
            background: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4',
            border: isDark ? '1px solid rgba(34,197,94,0.3)' : '1px solid #bbf7d0',
            borderRadius: '12px',
            color: isDark ? '#86efac' : '#15803d',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            textAlign: 'center'
        },
        resendText: { color: isDark ? '#93a1bd' : '#64748b', fontSize: '13px', margin: 0 },
        resendBtn: {
            width: '100%',
            border: isDark ? '1px solid rgba(34,197,94,0.35)' : '1px solid #86efac',
            background: isDark ? 'rgba(34,197,94,0.1)' : 'transparent',
            borderRadius: '12px',
            padding: '12px',
            color: isDark ? '#4ade80' : '#16a34a',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
        },
        noteText: { color: isDark ? '#93a1bd' : '#64748b', textAlign: 'center', marginTop: '16px', fontSize: '13px' },
        link: { color: isDark ? '#4ade80' : '#16a34a', textDecoration: 'none', fontWeight: '600' }
    };

    return (
        <div style={styles.page}>
            <Link to="/login" style={styles.backButton}>
                <FaArrowLeft /> Back to Login
            </Link>

            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.logo}>🔐</div>
                    <h1 style={styles.title}>Verify Your Email</h1>
                    <p style={styles.subtitle}>Enter the code sent to your inbox to activate your account.</p>
                </div>

                {error && (
                    <div style={styles.errorBox}>
                        <FaExclamationCircle style={{ marginRight: '8px' }} />
                        {error}
                    </div>
                )}

                {success && (
                    <div style={styles.successBox}>
                        <FaCheckCircle style={{ marginRight: '8px' }} />
                        {success}
                    </div>
                )}

                {secondsRemaining > 0 && !success && (
                    <div style={styles.expiryNotice}>
                        Your verification code expires in <strong>{secondsRemaining}s</strong>. You can resend a new code when the timer reaches zero.
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            name="accountEmail"
                            value={form.accountEmail}
                            onChange={handleChange}
                            disabled
                            style={styles.disabledInput}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Verification Code</label>
                        <div style={styles.passwordWrapper}>
                            <input
                                type={showCode ? 'text' : 'password'}
                                name="verificationCode"
                                value={form.verificationCode}
                                onChange={handleChange}
                                placeholder="Enter 6-digit code"
                                style={{ ...styles.input, width: '100%', paddingRight: '40px' }}
                            />
                            <button type="button" onClick={() => setShowCode(!showCode)} style={styles.eyeIcon} aria-label={showCode ? 'Hide verification code' : 'Show verification code'}>
                                {showCode ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={loading || !!error}>
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div style={styles.resendContainer}>
                    <p style={styles.resendText}>Didn't receive the code?</p>
                    <button
                        type="button"
                        style={secondsRemaining > 0 || resendLoading ? { ...styles.resendBtn, opacity: 0.6, cursor: 'not-allowed' } : styles.resendBtn}
                        onClick={handleResend}
                        disabled={secondsRemaining > 0 || resendLoading || !!error}
                    >
                        {resendLoading ? 'Resending...' : secondsRemaining > 0 ? `Resend code in ${secondsRemaining}s` : 'Resend code'}
                    </button>
                </div>

                {resendError && <div style={styles.errorBox}>{resendError}</div>}
                {resendSuccess && <div style={styles.successBox}>{resendSuccess}</div>}

                <p style={styles.noteText}>
                    Already verified? <Link to="/login" style={styles.link}>Sign in</Link>.
                </p>
            </div>
        </div>
    );
}
