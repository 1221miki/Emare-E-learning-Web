import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash, FaGoogle, FaGithub, FaMicrosoft, FaFacebook, FaArrowLeft } from 'react-icons/fa';

export default function LoginPage() {
    const { login, socialAuth, requestPasswordReset, resetPassword } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ accountEmail: '', securedPassword: '' });
    const [error, setError] = useState('');
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

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRedirect = (user) => {
        if (user.assignedRole === 'Admin') navigate('/admin/dashboard');
        else if (user.assignedRole === 'Instructor') navigate('/instructor/dashboard');
        else navigate('/student/dashboard');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(form.accountEmail, form.securedPassword);
            handleRedirect(user);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
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
        setSocialLoading(true);
        try {
            const mockData = {
                provider: socialProvider.toLowerCase(),
                email: socialEmail,
                name: socialName,
                socialId: `soc_${socialProvider.toLowerCase()}_${Date.now()}`,
                role: socialRole
            };
            const user = await socialAuth(mockData);
            setShowSocialModal(false);
            handleRedirect(user);
        } catch (err) {
            setSocialError(err.response?.data?.message || `Social login with ${socialProvider} failed.`);
        } finally {
            setSocialLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotSuccess('');
        try {
            const res = await requestPasswordReset(forgotEmail);
            setForgotSuccess('Reset code generated! Use the code below to set your new password.');
            if (res.resetToken) setResetCode(res.resetToken);
            setForgotStep(2);
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Failed to request password reset.');
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotSuccess('');
        try {
            const user = await resetPassword(resetCode, newPassword);
            setForgotSuccess('Password reset successfully! Redirecting...');
            setTimeout(() => {
                setShowForgotModal(false);
                handleRedirect(user);
            }, 1200);
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Failed to reset password. Please verify code.');
        }
    };

    const renderProviderIcon = (provider) => {
        switch (provider) {
            case 'Google': return <FaGoogle style={{ color: '#ea4335', fontSize: '24px' }} />;
            case 'GitHub': return <FaGithub style={{ color: '#fff', fontSize: '24px' }} />;
            case 'Microsoft': return <FaMicrosoft style={{ color: '#00a4ef', fontSize: '24px' }} />;
            case 'Facebook': return <FaFacebook style={{ color: '#1877f2', fontSize: '24px' }} />;
            default: return null;
        }
    };

    return (
        <div style={styles.page}>
            <Link to="/" style={styles.backButton}>
                <FaArrowLeft /> Back to Home
            </Link>
            <div style={styles.card}>
                {/* Logo & Header */}
                <div style={styles.header}>
                    <div style={styles.logo}>E</div>
                    <h1 style={styles.title}>Emare ELMS</h1>
                    <p style={styles.subtitle}>Sign in to your account</p>
                </div>

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
                            style={styles.input}
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
                                value={form.securedPassword}
                                onChange={handleChange}
                                style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
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
                    <p style={styles.socialText}>Or continue with</p>
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
                        <button 
                            type="button" 
                            title="Sign in with Microsoft" 
                            onClick={() => openSocialModal('Microsoft')} 
                            style={styles.socialBtn}
                            disabled={socialLoading}
                        >
                            <FaMicrosoft style={{ color: '#00a4ef' }} />
                        </button>
                        <button 
                            type="button" 
                            title="Sign in with Facebook" 
                            onClick={() => openSocialModal('Facebook')} 
                            style={styles.socialBtn}
                            disabled={socialLoading}
                        >
                            <FaFacebook style={{ color: '#1877f2' }} />
                        </button>
                    </div>
                </div>

                <p style={styles.footerText}>
                    Don't have an account? <Link to="/register" style={styles.link}>Register here</Link>
                </p>
            </div>

            {/* Social Login Modal */}
            {showSocialModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {renderProviderIcon(socialProvider)}
                                <h3 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    Sign in with {socialProvider}
                                </h3>
                            </div>
                            <button onClick={() => setShowSocialModal(false)} style={styles.closeBtn}>✕</button>
                        </div>

                        {socialError && <div style={styles.errorBox}>{socialError}</div>}

                        <form onSubmit={handleSocialSubmit} style={styles.form}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
                                Confirm your {socialProvider} profile credentials to sign in to Emare ELMS.
                            </p>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Account Name</label>
                                <input
                                    type="text"
                                    required
                                    value={socialName}
                                    onChange={e => setSocialName(e.target.value)}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>{socialProvider} Account Email</label>
                                <input
                                    type="email"
                                    required
                                    value={socialEmail}
                                    onChange={e => setSocialEmail(e.target.value)}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Role</label>
                                <select 
                                    value={socialRole} 
                                    onChange={e => setSocialRole(e.target.value)} 
                                    style={{ ...styles.input, cursor: 'pointer' }}
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
                    <div style={styles.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                {forgotStep === 1 ? '🔐 Reset Password' : '🔑 Set New Password'}
                            </h3>
                            <button 
                                onClick={() => setShowForgotModal(false)}
                                style={styles.closeBtn}
                            >
                                ✕
                            </button>
                        </div>

                        {forgotError && <div style={styles.errorBox}>{forgotError}</div>}
                        {forgotSuccess && <div style={styles.successBox}>{forgotSuccess}</div>}

                        {forgotStep === 1 ? (
                            <form onSubmit={handleForgotSubmit} style={styles.form}>
                                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
                                    Enter your registered email address below to receive a password reset authorization code.
                                </p>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                <button type="submit" style={styles.btn}>
                                    Send Reset Code
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetSubmit} style={styles.form}>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Reset Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter authorization token code"
                                        value={resetCode}
                                        onChange={(e) => setResetCode(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>New Password</label>
                                    <div style={styles.passwordWrapper}>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            required
                                            placeholder="Minimum 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            style={styles.eyeIcon}
                                        >
                                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" style={styles.btn}>
                                    Confirm New Password & Log In
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setForgotStep(1)} 
                                    style={{ ...styles.link, background: 'none', border: 'none', fontSize: '13px', marginTop: '8px', cursor: 'pointer', textAlign: 'center' }}
                                >
                                    ← Back to Email Request
                                </button>
                            </form>
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
    logo: { width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '16px' },
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
    btn: { marginTop: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' },
    footerText: { textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' },
    link: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600' },
    socialContainer: { textAlign: 'center', marginTop: '24px' },
    socialText: { color: '#94a3b8', fontSize: '13px', marginBottom: '12px' },
    socialButtons: { display: 'flex', justifyContent: 'center', gap: '14px' },
    socialBtn: { background: '#ffffff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }
};
