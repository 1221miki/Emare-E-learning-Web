import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleLogin } from '@react-oauth/google';
import { FaEye, FaEyeSlash, FaGoogle, FaArrowLeft } from 'react-icons/fa';

export default function LoginPage() {
    const { login, socialAuth, requestPasswordReset, resetPassword } = useAuth();
    const { theme, colors } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState({ accountEmail: '', securedPassword: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(location.state?.success || '');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password Modal state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');

    const handleChange = (e) => {
        if (error) setError('');
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRedirect = (user) => {
        const redirectTarget = searchParams.get('redirect');
        if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
            navigate(redirectTarget);
            return;
        }
        if (user.assignedRole === 'Admin') navigate('/admin/dashboard');
        else if (user.assignedRole === 'Instructor') navigate('/instructor/dashboard');
        else navigate('/student/dashboard');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const normalizedEmail = form.accountEmail.trim().toLowerCase();
            const user = await login(normalizedEmail, form.securedPassword);
            handleRedirect(user);
        } catch (err) {
            console.error('Login error:', err);
            const serverMsg = err.response?.data?.message || err.response?.data?.error || (err.response && JSON.stringify(err.response.data)) || err.message || 'Login failed. Please try again.';
            setError(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    // ── Real Google OAuth via popup ───────────────────────────────────────────
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setSocialLoading(true);
            setError('');
            try {
                // Fetch the user's profile from Google using the access token
                const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const profile = await profileRes.json();
                const user = await socialAuth({
                    provider: 'google',
                    email: profile.email,
                    name: profile.name || profile.given_name || 'Google User',
                    socialId: profile.sub,
                    idToken: tokenResponse.access_token,
                });
                handleRedirect(user);
            } catch (err) {
                setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
            } finally {
                setSocialLoading(false);
            }
        },
        onError: (err) => {
            console.error('Google OAuth error:', err);
            setError('Google sign-in was cancelled or failed. Please try again.');
        },
        flow: 'implicit',
    });




    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotSuccess('');
        if (!forgotEmail.trim()) {
            setForgotError('Please enter your email address.');
            return;
        }
        try {
            await requestPasswordReset(forgotEmail.trim().toLowerCase());
            setForgotSuccess(' Check your email for password reset instructions. The link expires in 15 minutes.');
            setForgotStep(2);
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Failed to request password reset.');
        }
    };

    const pageStyle = {
        ...styles.page,
        background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
        color: colors.text
    };

    const cardStyle = {
        ...styles.card,
        background: colors.bgCard,
        border: `1px solid ${colors.border}`
    };

    const inputStyle = {
        ...styles.input,
        background: colors.bgInput,
        border: `1px solid ${colors.border}`,
        color: colors.text
    };

    const modalStyle = {
        ...styles.modalContent,
        background: colors.bgCard,
        border: `1px solid ${colors.border}`
    };

    const labelStyle = { ...styles.label, color: colors.textMuted };

    return (
        <div style={pageStyle}>
            <Link to="/" style={styles.backButton}>
                <FaArrowLeft /> Back to Home
            </Link>
            <div style={cardStyle}>
                {/* Logo & Header */}
                <div style={styles.header}>
                    <img src="/images/image.png" alt="Emare ICT Hub Logo" style={styles.logo} />
                    <h1 style={{ ...styles.title, color: colors.text }}>Emare ELMS</h1>
                    <p style={{ ...styles.subtitle, color: colors.textMuted }}>Sign in to your account</p>
                </div>

                {success && <div style={styles.successBox}>{success}</div>}
                {error && <div style={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            id="accountEmail"
                            name="accountEmail"
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={form.accountEmail}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>
                    <div style={styles.fieldGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={styles.label}>Password</label>
                            <span
                                style={{ cursor: 'pointer', ...styles.link, fontSize: '12px', color: colors.primary }}
                                onClick={() => { setShowForgotModal(true); setForgotStep(1); setForgotError(''); setForgotSuccess(''); }}
                            >
                                Forgot Password?
                            </span>
                        </div>
                        <div style={styles.passwordWrapper}>
                            <input
                                id="securedPassword"
                                name="securedPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={form.securedPassword}
                                onChange={handleChange}
                                style={{ ...inputStyle, ...styles.loginPasswordInput, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={loading || socialLoading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                {/* Social Login Buttons — real OAuth */}
                <div style={styles.socialContainer}>
                    <p style={{ ...styles.socialText, color: colors.textMuted }}>Or continue with</p>
                    <div style={styles.socialButtons}>
                        {/* Google — opens real Google account chooser popup */}
                        <button
                            type="button"
                            title="Sign in with Google"
                            onClick={() => googleLogin()}
                            style={styles.socialBtn}
                            disabled={socialLoading || loading}
                        >
                            {socialLoading
                                ? <span style={{ fontSize: '12px', color: '#666' }}>...</span>
                                : <FaGoogle style={{ color: '#ea4335' }} />
                            }
                        </button>
                    </div>
                </div>

                <p style={{ ...styles.footerText, color: colors.textMuted }}>
                    Don't have an account? <Link to="/register" style={{ ...styles.link, color: colors.primary }}>Register here</Link>
                </p>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div style={styles.modalOverlay}>
                    <div style={modalStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ color: colors.text, margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                {forgotStep === 1 ? '▣ Reset Password' : '◈ Set New Password'}
                            </h3>
                            <button
                                onClick={() => setShowForgotModal(false)}
                                style={styles.closeBtn}
                            />
                        </div>

                        {forgotError && <div style={styles.errorBox}>{forgotError}</div>}
                        {forgotSuccess && <div style={styles.successBox}>{forgotSuccess}</div>}

                        {forgotStep === 1 ? (
                            <form onSubmit={handleForgotSubmit} style={styles.form}>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 16px' }}>
                                    Enter your registered email address below to receive a password reset authorization code.
                                </p>
                                <div style={styles.fieldGroup}>
                                    <label style={labelStyle}>Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <button type="submit" style={styles.btn}>
                                    Send Reset Code
                                </button>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                {forgotSuccess && <div style={styles.successBox}>{forgotSuccess}</div>}
                                <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                                    A password reset link has been sent to <strong style={{ color: colors.text }}>{forgotEmail}</strong>
                                </p>
                                <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '20px' }}>
                                    Check your inbox and click the link to reset your password. The link expires in 15 minutes.
                                </p>
                                <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '20px' }}>
                                    Can't find the email? Check your spam or junk folder.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setForgotStep(1); setForgotEmail(''); setForgotSuccess(''); }}
                                    style={{ ...styles.link, color: colors.text, background: 'rgba(34,197,94,0.12)', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', marginBottom: '12px' }}
                                >
                                    Try Another Email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(false)}
                                    style={{ ...styles.link, color: colors.text, background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', padding: '20px', position: 'relative' },
    backButton: { position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '600', transition: 'color 0.2s', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' },
    card: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
    header: { textAlign: 'center', marginBottom: '32px' },
    logo: { width: '60px', height: '60px', objectFit: 'contain', background: 'transparent', marginBottom: '16px' },
    title: { color: '#fff', fontSize: '26px', fontWeight: '800', margin: '0 0 6px' },
    subtitle: { color: '#94a3b8', fontSize: '14px', margin: 0 },
    errorBox: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' },
    successBox: { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '18px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { color: '#cbd5e1', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
    input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '12px 16px', outline: 'none', transition: 'border-color 0.2s' },
    passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
    eyeIcon: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '16px' },
    btn: { marginTop: '8px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 4px 15px rgba(22,163,74,0.4)' },
    footerText: { textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' },
    link: { color: '#4ade80', textDecoration: 'none', fontWeight: '600' },
    socialContainer: { textAlign: 'center', marginTop: '24px' },
    socialText: { color: '#94a3b8', fontSize: '13px', marginBottom: '12px' },
    socialButtons: { display: 'flex', justifyContent: 'center', gap: '14px' },
    socialBtn: { background: '#ffffff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' },
    loginPasswordInput: { MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }
};

