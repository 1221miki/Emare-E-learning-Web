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

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Check if we have required params
    useEffect(() => {
        if (!token || !email) {
            setError('Invalid or missing reset link. Please try again from the email.');
        }
    }, [token, email]);

    // Calculate password strength
    useEffect(() => {
        let strength = 0;
        if (newPassword.length >= 8) strength++;
        if (/[A-Z]/.test(newPassword)) strength++;
        if (/[a-z]/.test(newPassword)) strength++;
        if (/[0-9]/.test(newPassword)) strength++;
        if (/[!@#$%^&*]/.test(newPassword)) strength++;
        setPasswordStrength(strength);
    }, [newPassword]);

    const validatePassword = () => {
        if (!newPassword) return 'Please enter a new password.';
        if (newPassword.length < 8) return 'Password must be at least 8 characters.';
        if (!/[A-Z]/.test(newPassword)) return 'Password needs an uppercase letter (A-Z).';
        if (!/[a-z]/.test(newPassword)) return 'Password needs a lowercase letter (a-z).';
        if (!/[0-9]/.test(newPassword)) return 'Password needs a number (0-9).';
        if (!/[!@#$%^&*]/.test(newPassword)) return 'Password needs a special character (!@#$%^&*).';
        if (newPassword !== confirmPassword) return 'Passwords do not match.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const validationError = validatePassword();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            const user = await resetPassword(token.trim(), newPassword);
            setSuccess('Password reset successfully! You are now logged in. Redirecting...');
            setTimeout(() => {
                if (user.assignedRole === 'Admin') navigate('/admin/dashboard');
                else if (user.assignedRole === 'Instructor') navigate('/instructor/dashboard');
                else navigate('/student/dashboard');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrengthText = () => {
        const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const colors = ['#d32f2f', '#ff9800', '#ffc107', '#8bc34a', '#4caf50', '#2e7d32'];
        return { text: texts[passwordStrength] || 'Very Weak', color: colors[passwordStrength] || '#d32f2f' };
    };

    if (!token || !email) {
        return (
            <div style={styles.page}>
                <Link to="/login" style={styles.backButton}>
                    <FaArrowLeft /> Back to Login
                </Link>
                <div style={styles.card}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <FaExclamationCircle style={{ fontSize: '48px', color: '#d32f2f', marginBottom: '16px' }} />
                        <h2 style={{ color: '#d32f2f', margin: '16px 0' }}>Invalid Reset Link</h2>
                        <p style={{ color: '#666', marginBottom: '24px' }}>
                            Your reset link is missing or invalid. Please request a new password reset.
                        </p>
                        <Link to="/login" style={styles.btn}>
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <Link to="/login" style={styles.backButton}>
                <FaArrowLeft /> Back to Login
            </Link>

            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.logo}>🔐</div>
                    <h1 style={styles.title}>Reset Password</h1>
                    <p style={styles.subtitle}>Set a strong new password for your account</p>
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

                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Email Display */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            style={{ ...styles.input, backgroundColor: '#f0f0f0', color: '#666' }}
                        />
                    </div>

                    {/* New Password */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>New Password</label>
                        <div style={styles.passwordWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
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
                        {newPassword && (
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                <span>Strength: </span>
                                <span style={{ color: getPasswordStrengthText().color, fontWeight: 'bold' }}>
                                    {getPasswordStrengthText().text}
                                </span>
                                <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', marginTop: '4px' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${(passwordStrength / 5) * 100}%`,
                                            backgroundColor: getPasswordStrengthText().color,
                                            borderRadius: '2px',
                                            transition: 'width 0.3s'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <div style={styles.passwordWrapper}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.eyeIcon}
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    {newPassword && (
                        <div style={styles.requirements}>
                            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                                Password Requirements:
                            </p>
                            <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '20px', color: '#666' }}>
                                <li style={{ color: newPassword.length >= 8 ? '#4caf50' : '#d32f2f' }}>
                                    {newPassword.length >= 8 ? '✓' : '✗'} At least 8 characters
                                </li>
                                <li style={{ color: /[A-Z]/.test(newPassword) ? '#4caf50' : '#d32f2f' }}>
                                    {/[A-Z]/.test(newPassword) ? '✓' : '✗'} Uppercase letter (A-Z)
                                </li>
                                <li style={{ color: /[a-z]/.test(newPassword) ? '#4caf50' : '#d32f2f' }}>
                                    {/[a-z]/.test(newPassword) ? '✓' : '✗'} Lowercase letter (a-z)
                                </li>
                                <li style={{ color: /[0-9]/.test(newPassword) ? '#4caf50' : '#d32f2f' }}>
                                    {/[0-9]/.test(newPassword) ? '✓' : '✗'} Number (0-9)
                                </li>
                                <li style={{ color: /[!@#$%^&*]/.test(newPassword) ? '#4caf50' : '#d32f2f' }}>
                                    {/[!@#$%^&*]/.test(newPassword) ? '✓' : '✗'} Special character (!@#$%^&*)
                                </li>
                            </ul>
                        </div>
                    )}

                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={loading}>
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>

                <p style={styles.footerText}>
                    Remember your password? <Link to="/login" style={styles.link}>Sign in here</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    },
    backButton: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: '#fff',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
    },
    card: {
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        padding: '40px',
        maxWidth: '450px',
        width: '100%'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px'
    },
    logo: {
        fontSize: '48px',
        marginBottom: '16px'
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        margin: '0 0 8px',
        color: '#1a1a1a'
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        margin: '0'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '20px'
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#333'
    },
    input: {
        padding: '12px 14px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
    },
    passwordWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
    },
    eyeIcon: {
        position: 'absolute',
        right: '12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#666',
        fontSize: '16px'
    },
    btn: {
        padding: '12px 16px',
        backgroundColor: '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.3s',
        marginTop: '10px'
    },
    errorBox: {
        background: '#ffebee',
        border: '1px solid #ef5350',
        borderRadius: '6px',
        padding: '12px 14px',
        color: '#d32f2f',
        fontSize: '13px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    successBox: {
        background: '#e8f5e9',
        border: '1px solid #66bb6a',
        borderRadius: '6px',
        padding: '12px 14px',
        color: '#2e7d32',
        fontSize: '13px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    requirements: {
        background: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        padding: '12px 14px'
    },
    link: {
        color: '#6366f1',
        textDecoration: 'none',
        fontWeight: '600',
        cursor: 'pointer'
    },
    footerText: {
        textAlign: 'center',
        fontSize: '13px',
        color: '#666',
        margin: '0'
    }
};
