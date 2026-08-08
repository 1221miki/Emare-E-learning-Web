import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function VerifyEmailPage() {
    const { verifyEmail, resendVerification } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const email = searchParams.get('email') || '';
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
            setError(err.response?.data?.message || 'Failed to verify email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setResendError('Email is required to resend verification code.');
            return;
        }

        setResendError('');
        setResendSuccess('');
        setResendLoading(true);

        try {
            const response = await resendVerification({ accountEmail: email.trim().toLowerCase() });
            setResendSuccess(response.message || 'A new code was sent.');
            setSecondsRemaining(30);
        } catch (err) {
            setResendError(err.response?.data?.message || 'Failed to resend verification code.');
        } finally {
            setResendLoading(false);
        }
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
                                placeholder="Enter 6-digit code"
                                style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                            />
                            <button type="button" onClick={() => setShowCode(!showCode)} style={styles.eyeIcon}>
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

const styles = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', padding: '20px' },
    backButton: { position: 'absolute', top: '24px', left: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '600', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' },
    card: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' },
    header: { textAlign: 'center', marginBottom: '28px' },
    logo: { width: '58px', height: '58px', borderRadius: '16px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff', fontWeight: '700', marginBottom: '16px' },
    title: { color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0 },
    subtitle: { color: '#94a3b8', fontSize: '14px', marginTop: '10px' },
    form: { display: 'grid', gap: '16px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#cbd5e1', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
    input: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '12px', color: '#fff', fontSize: '15px', padding: '14px 16px', outline: 'none' },
    passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    eyeIcon: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
    btn: { width: '100%', border: 'none', borderRadius: '12px', padding: '14px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease', boxShadow: '0 12px 28px rgba(59,130,246,0.35)' },
    errorBox: { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)', color: '#fecaca', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
    successBox: { background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.35)', color: '#bef264', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
    resendContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '16px' },
    expiryNotice: { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '12px', color: '#c7d2fe', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' },
    resendText: { color: '#94a3b8', fontSize: '13px', margin: 0 },
    resendBtn: { width: '100%', border: '1px solid rgba(96,165,250,0.4)', background: 'transparent', borderRadius: '12px', padding: '12px', color: '#60a5fa', fontWeight: '700', cursor: 'pointer' },
    noteText: { color: '#94a3b8', textAlign: 'center', marginTop: '16px', fontSize: '13px' },
    link: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600' }
};
