import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaEye, FaEyeSlash, FaGoogle, FaGithub, FaArrowLeft } from 'react-icons/fa';

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

    // Social Login Modal State
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialProvider, setSocialProvider] = useState('Google');
    const [socialEmail, setSocialEmail] = useState('');
    const [socialName, setSocialName] = useState('');
    const [socialRole, setSocialRole] = useState('Student');
    const [socialError, setSocialError] = useState('');

    const handleChange = (e) => {
        if (error) setError('');                       // Clear error banner once user types again
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRedirect = (user) => {
        // If the user was bounced here from a protected page (e.g. /admin/developers),
        // send them straight back to it after logging in.
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

    const openSocialModal = (provider) => {
        setSocialProvider(provider);
        setSocialEmail(form.accountEmail || `${provider.toLowerCase()}.user@emare.edu`);
        setSocialName(`${provider} User`);
        setSocialRole('Student');
        setSocialError('');
        setShowSocialModal(true);
    };

    const handleSocialSubmit = async (e) => {
        e.preventDefault();
        setSocialError('');

        // Normalize + validate the provider profile before hitting the backend.
        // If your OAuth SDK returns a token (Google "credential"/idToken, GitHub code,
        // etc.), forward it as `idToken` so the backend can verify it — otherwise the
        // user profile object is sent and email is used to match the account.
        const email = (socialEmail || '').trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setSocialError('A valid email address is required for social sign-in.');
            return;
        }

        setSocialLoading(true);
        try {
            const payload = {
                provider: socialProvider.toLowerCase(),
                email,
                name: socialName.trim(),
                socialId: `soc_${socialProvider.toLowerCase()}_${Date.now()}`,
                role: socialRole
            };
            const user = await socialAuth(payload);
            setShowSocialModal(false);
            handleRedirect(user);
        } catch (err) {
            setSocialError(err.response?.data?.message || err.response?.data?.error || `Social login with ${socialProvider} failed.`);
        } finally {
            setSocialLoading(false);
        }
    };

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

    const renderProviderIcon = (provider) => {
        const iconColor = isDark ? '#fff' : '#0f172a';
        switch (provider) {
            case 'Google': return <FaGoogle style={{ color: '#ea4335', fontSize: '24px' }} />;
            case 'GitHub': return <FaGithub style={{ color: iconColor, fontSize: '24px' }} />;
            case 'Microsoft': return <FaMicrosoft style={{ color: '#00a4ef', fontSize: '24px' }} />;
            case 'Facebook': return <FaFacebook style={{ color: '#1877f2', fontSize: '24px' }} />;
            default: return null;
        }
    };

    const pageStyle = {
        ...styles.page,
        background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)',
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
    const titleStyle = { ...styles.title, color: colors.text };
    const subtitleStyle = { ...styles.subtitle, color: colors.textMuted };
    const sectionHeaderStyle = { ...styles.sectionHeader, color: colors.text };
    const footerTextStyle = { ...styles.footerText, color: colors.textMuted };
    const linkStyle = { ...styles.link, color: colors.primary };

    return (
        <div style={pageStyle}>
            <Link to="/" style={styles.backButton}>
                <FaArrowLeft /> Back to Home
            </Link>
            <div style={cardStyle}>
                {/* Logo & Header */}
                <div style={styles.header}>
                    <div style={styles.logo}>E</div>
                    <h1 style={titleStyle}>Emare ELMS</h1>
                    <p style={subtitleStyle}>Sign in to your account</p>
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
                                style={{ cursor: 'pointer', ...styles.link, fontSize: '12px' }} 
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
                                className="login-password-input"
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

                {/* Social Login Buttons */}
                <div style={styles.socialContainer}>
                    <p style={{ ...styles.socialText, color: colors.textMuted }}>Or continue with</p>
                    <div style={styles.socialButtons}>
                        <button
                            type="button"
                            title="Sign in with Google"
                            onClick={() => openSocialModal('Google')}
                            style={styles.socialBtn}
                            disabled={socialLoading}
                        >
                            <FaGoogle style={{ color: '#ea4335' }} />
                        </button>
                        <button
                            type="button"
                            title="Sign in with GitHub"
                            onClick={() => openSocialModal('GitHub')}
                            style={styles.socialBtn}
                            disabled={socialLoading}
                        >
                            <FaGithub style={{ color: '#24292e' }} />
                        </button>
                    </div>
                </div>

                <p style={{ ...styles.footerText, color: colors.textMuted }}>
                    Don't have an account? <Link to="/register" style={{ ...styles.link, color: colors.primary }}>Register here</Link>
                </p>
            </div>

            {/* Social Login Modal */}
            {showSocialModal && (
                <div style={styles.modalOverlay}>
                    <div style={modalStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {renderProviderIcon(socialProvider)}
                                <h3 style={{ color: colors.text, margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    Sign in with {socialProvider}
                                </h3>
                            </div>
                            <button onClick={() => setShowSocialModal(false)} style={styles.closeBtn} />
                        </div>

                        {socialError && <div style={styles.errorBox}>{socialError}</div>}

                        <form onSubmit={handleSocialSubmit} style={styles.form}>
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 16px' }}>
                                Confirm your {socialProvider} profile credentials to sign in to Emare ELMS.
                            </p>

                            <div style={styles.fieldGroup}>
                                <label style={labelStyle}>Account Name</label>
                                <input
                                    type="text"
                                    required
                                    value={socialName}
                                    onChange={e => setSocialName(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={labelStyle}>{socialProvider} Account Email</label>
                                <input
                                    type="email"
                                    required
                                    value={socialEmail}
                                    onChange={e => setSocialEmail(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={labelStyle}>Role</label>
                                <select
                                    value={socialRole}
                                    onChange={e => setSocialRole(e.target.value)}
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                >
                                    <option value="Student">Student</option>
                                    <option value="Instructor">Instructor</option>
                                </select>
                            </div>

                            <button type="submit" style={socialLoading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={socialLoading}>
                                {socialLoading ? `Authenticating ${socialProvider}...` : `Continue with ${socialProvider} →`}
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
                            >
                                
                            </button>
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
                                    style={{ ...styles.link, color: colors.text, background: 'rgba(59,130,246,0.12)', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', marginBottom: '12px' }}
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
    logo: { width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '16px' },
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
    btn: { marginTop: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 4px 15px rgba(79,70,229,0.4)' },
    footerText: { textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' },
    link: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600' },
    socialContainer: { textAlign: 'center', marginTop: '24px' },
    socialText: { color: '#94a3b8', fontSize: '13px', marginBottom: '12px' },
    socialButtons: { display: 'flex', justifyContent: 'center', gap: '14px' },
    socialBtn: { background: '#ffffff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' },
    loginPasswordInput: { MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }
};
