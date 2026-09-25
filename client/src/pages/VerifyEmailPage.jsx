import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    const [resendSecondsRemaining, setResendSecondsRemaining] = useState(0);

    useEffect(() => {
        if (!email) {
            setError('Email is required to verify your account. Please use the link from your email.');
            return;
        }
        setResendSecondsRemaining(30);
    }, [email]);

    // Keep the (disabled) email input in sync if the query param changes while mounted.
    useEffect(() => {
        setForm(prev => (prev.accountEmail === email ? prev : { ...prev, accountEmail: email }));
    }, [email]);

    useEffect(() => {
        if (resendSecondsRemaining <= 0) return;
        const timer = window.setInterval(() => {
            setResendSecondsRemaining((prev) => Math.max(prev - 1, 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendSecondsRemaining]);

    const handleChange = (e) => {
        const value = e.target.name === 'verificationCode'
            ? e.target.value.replace(/\D/g, '').slice(0, 6)
            : e.target.value;
        setForm(prev => ({ ...prev, [e.target.name]: value }));
        if (e.target.name === 'verificationCode') {
            setError('');
            setSuccess('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.accountEmail.trim() || !form.verificationCode.trim()) {
            setError('Please enter both email and verification code.');
            return;
        }

        if (!/^\d{6}$/.test(form.verificationCode.trim())) {
            setError('Enter a valid 6-digit verification code.');
            return;
        }

        setLoading(true);
        try {
            const response = await verifyEmail({ accountEmail: form.accountEmail.trim().toLowerCase(), verificationCode: form.verificationCode.trim() });
            if (!response?.success) {
                setError(response?.message || 'Unable to verify email. Please try again.');
                return;
            }
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

            if (!response?.success) {
                setResendError(response?.message || 'Unable to send a new verification code.');
                return;
            }

            const successMessage = response.message || 'A new verification code has been sent.';
            setError('');
            setResendSuccess(successMessage);
            setResendSecondsRemaining(30);
        } catch (err) {
            setResendError(extractErrorMessage(err, 'Failed to resend verification code.'));
        } finally {
            setResendLoading(false);
        }
    }, [form.accountEmail, email, resendVerification]);

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

                {resendSecondsRemaining > 0 && !success && (
                    <div style={styles.expiryNotice}>
                        You can request a new verification code in <strong>{resendSecondsRemaining}s</strong>.
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
                            style={{ ...styles.input, backgroundColor: '#f3f4f6', color: '#111' }}
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
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                pattern="[0-9]{6}"
                                placeholder="Enter 6-digit code"
                                style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                            />
                            <button type="button" onClick={() => setShowCode(!showCode)} style={styles.eyeIcon}>
                                {showCode ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={loading || !form.accountEmail}>
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div style={styles.resendContainer}>
                    <p style={styles.resendText}>Didn't receive the code?</p>
                    <button
                        type="button"
                        style={resendSecondsRemaining > 0 || resendLoading ? { ...styles.resendBtn, opacity: 0.6, cursor: 'not-allowed' } : styles.resendBtn}
                        onClick={handleResend}
                        disabled={resendSecondsRemaining > 0 || resendLoading || !form.accountEmail}
                    >
                        {resendLoading ? 'Resending...' : resendSecondsRemaining > 0 ? `Resend code in ${resendSecondsRemaining}s` : 'Resend code'}
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

const styles = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f0fdf4 0%,#f8fafc 100%)', padding: '20px' },
    backButton: { position: 'absolute', top: '24px', left: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: '600', padding: '10px 14px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' },
    card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 60px rgba(15,23,42,0.08)' },
    header: { textAlign: 'center', marginBottom: '28px' },
    logo: { width: '58px', height: '58px', borderRadius: '16px', background: 'linear-gradient(135deg,#22c55e,#22c55e)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff', fontWeight: '700', marginBottom: '16px' },
    title: { color: '#0f172a', fontSize: '24px', fontWeight: '800', margin: 0 },
    subtitle: { color: '#64748b', fontSize: '14px', marginTop: '10px' },
    form: { display: 'grid', gap: '16px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#334155', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
    input: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '15px', padding: '14px 16px', outline: 'none' },
    passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    eyeIcon: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
    btn: { width: '100%', border: 'none', borderRadius: '12px', padding: '14px', background: 'linear-gradient(135deg,#22c55e,#22c55e)', color: '#fff', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease', boxShadow: '0 12px 28px rgba(34,197,94,0.35)' },
    errorBox: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
    successBox: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
    resendContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '16px' },
    expiryNotice: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#15803d', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' },
    resendText: { color: '#64748b', fontSize: '13px', margin: 0 },
    resendBtn: { width: '100%', border: '1px solid #86efac', background: 'transparent', borderRadius: '12px', padding: '12px', color: '#16a34a', fontWeight: '700', cursor: 'pointer' },
    noteText: { color: '#64748b', textAlign: 'center', marginTop: '16px', fontSize: '13px' },
    link: { color: '#16a34a', textDecoration: 'none', fontWeight: '600' }
};
