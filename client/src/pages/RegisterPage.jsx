import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaGoogle, FaGithub, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';

export default function RegisterPage() {
    const { register, socialAuth } = useAuth();
    const { theme, colors } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [form, setForm] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        username: '',
        accountEmail: '',
        phoneNumber: '',
        securedPassword: '',
        confirmPassword: '',
        profilePicture: null,
        gender: '',
        country: '',
        region: '',
        city: '',
        address: '',
        assignedRole: 'Student',
        // Student specific
        educationLevel: '',
        institution: '',
        fieldOfStudy: '',
        learningInterests: '',
        // Instructor specific
        professionalTitle: '',
        biography: '',
        skills: '',
        yearsOfExperience: '',
        highestQualification: '',
        cvResume: null,
        portfolioUrl: '',
        linkedIn: '',
        certificates: null,
        expertiseAreas: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Social Registration Modal State
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialProvider, setSocialProvider] = useState('Google');
    const [socialEmail, setSocialEmail] = useState('');
    const [socialName, setSocialName] = useState('');
    const [socialRole, setSocialRole] = useState('Student');
    const [socialLoading, setSocialLoading] = useState(false);
    const [socialError, setSocialError] = useState('');

    const sanitizePhoneInput = (value) => {
        return value.replace(/\D/g, '').slice(0, 10);
    };

    const handleChange = e => {
        const { name, value, files } = e.target;
        if (error) setError('');                       // Clear error banner once user types again
        if (files) {
            setForm(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setForm(prev => ({ ...prev, [name]: name === 'phoneNumber' ? sanitizePhoneInput(value) : value }));
        }
    };

    const normalizePhoneNumber = (phone) => phone.replace(/[-\s]/g, '').trim();

    const validateForm = () => {
        if (!form.firstName.trim()) return 'First name is required.';
        if (!form.lastName.trim()) return 'Last name is required.';
        if (!form.username.trim()) return 'Username is required.';
        if (!form.accountEmail.trim()) return 'Email address is required.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.accountEmail)) return 'Invalid email format.';
        if (!form.securedPassword) return 'Password is required.';
        if (form.securedPassword.length < 8) return 'Password must be at least 8 characters.';
        if (!/[A-Z]/.test(form.securedPassword)) return 'Password needs an uppercase letter.';
        if (!/[a-z]/.test(form.securedPassword)) return 'Password needs a lowercase letter.';
        if (!/[0-9]/.test(form.securedPassword)) return 'Password needs a number.';
        if (!/[!@#$%^&*]/.test(form.securedPassword)) return 'Password needs a special character.';
        if (form.securedPassword !== form.confirmPassword) return 'Passwords do not match.';
        if (form.phoneNumber.trim()) {
            const normalizedPhone = normalizePhoneNumber(form.phoneNumber);
            if (!(/^(09\d{8}|07\d{8})$/.test(normalizedPhone))) {
                return 'Phone number must be exactly 10 digits and start with 09 or 07.';
            }
        }
        // Only students can self-register; instructors are created by admin
        return null;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...form,
                fullName: `${form.firstName} ${form.middleName ? form.middleName + ' ' : ''}${form.lastName}`.trim()
            };
            const response = await register(payload);
            navigate(`/verify-email?email=${encodeURIComponent(form.accountEmail.trim().toLowerCase())}`);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const openSocialModal = (provider) => {
        setSocialProvider(provider);
        const namePrefill = (form.firstName || form.lastName) 
            ? `${form.firstName} ${form.lastName}`.trim() 
            : `${provider} Student`;
        const emailPrefill = form.accountEmail || `${provider.toLowerCase()}.student@emare.edu`;
        setSocialName(namePrefill);
        setSocialEmail(emailPrefill);
        setSocialRole(form.assignedRole || 'Student');
        setSocialError('');
        setShowSocialModal(true);
    };

    const handleSocialSubmit = async (e) => {
        e.preventDefault();
        setSocialError('');

        // Normalize + validate the provider profile before hitting the backend.
        // Forward an OAuth token as `idToken` when your provider SDK returns one
        // (Google "credential"/idToken); otherwise the profile object is sent and
        // the email is used to match or create the account.
        const email = (socialEmail || '').trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setSocialError('A valid email address is required for social registration.');
            return;
        }

        setSocialLoading(true);
        try {
            const payload = {
                provider: socialProvider.toLowerCase(),
                email,
                name: socialName.trim(),
                socialId: `soc_${socialProvider.toLowerCase()}_${Date.now()}`,
                role: socialRole,
            };

            const user = await socialAuth(payload);

            if (user.assignedRole === 'Admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            setSocialError(err.response?.data?.message || err.response?.data?.error || `Unable to authorize ${socialProvider}. Please try again.`);
        } finally {
            setSocialLoading(false);
        }
    };

    const renderProviderIcon = (provider) => {
        switch (provider) {
            case 'Google':
                return <FaGoogle style={{ color: '#ea4335' }} />;
            case 'GitHub':
                return <FaGithub style={{ color: '#24292e' }} />;
            default:
                return null;
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

    const labelStyle = { ...styles.label, color: colors.textMuted };
    const titleStyle = { ...styles.title, color: colors.text };
    const subtitleStyle = { ...styles.subtitle, color: colors.textMuted };
    const sectionHeaderStyle = { ...styles.sectionHeader, color: colors.text };
    const footerTextStyle = { ...styles.footerText, color: colors.textMuted };
    const linkStyle = { ...styles.link, color: colors.primary };

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

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                <Link to="/" style={styles.backButton}>
                    <FaArrowLeft /> Back to home
                </Link>

                <div style={styles.header}>
                    <div style={styles.logo}>E</div>
                    <h1 style={titleStyle}>Create your Emare account</h1>
                    <p style={subtitleStyle}>Join Emare and start your learning journey today.</p>
                </div>

                {/* Students only register here — instructors are created by admin */}

                {error && <div style={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <h3 style={sectionHeaderStyle}>Biographical Information</h3>
                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>First Name</label>
                        <input name="firstName" type="text" required placeholder="John" value={form.firstName} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Last Name</label>
                        <input name="lastName" type="text" required placeholder="Doe" value={form.lastName} onChange={handleChange} style={inputStyle} />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Gender</label>
                        <select name="gender" value={form.gender} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <h3 style={sectionHeaderStyle}>Security & Contact</h3>
                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Username</label>
                        <input name="username" type="text" required placeholder="johndoe" value={form.username} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Verified Email Address</label>
                        <input name="accountEmail" type="email" required placeholder="you@example.com" value={form.accountEmail} onChange={handleChange} style={inputStyle} />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Password</label>
                        <div style={styles.passwordWrapper}>
                            <input name="securedPassword" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={form.securedPassword} onChange={handleChange} style={{ ...inputStyle, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Confirm Password</label>
                        <div style={styles.passwordWrapper}>
                            <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} style={{ ...inputStyle, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={labelStyle}>Verified Phone Number (Optional)</label>
                        <input name="phoneNumber" type="tel" placeholder="09xxxxxxxx or +2519xxxxxxxx" value={form.phoneNumber} onChange={handleChange} style={inputStyle} />
                    </div>
                    {/* ── Instructor-specific fields ── */}
                    {form.assignedRole === 'Instructor' && (<>
                        <h3 style={sectionHeaderStyle}>‍▧ Instructor Profile</h3>
                        <div style={styles.fieldGroup}>
                            <label style={labelStyle}>Professional Title <span style={{ color: '#ef4444' }}>*</span></label>
                            <input name="professionalTitle" type="text" required placeholder="e.g., Senior Software Engineer" value={form.professionalTitle} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={labelStyle}>Years of Experience</label>
                            <input name="yearsOfExperience" type="number" min="0" max="50" placeholder="5" value={form.yearsOfExperience} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={labelStyle}>Expertise Areas</label>
                            <input name="expertiseAreas" type="text" placeholder="AI, Web Dev, Cloud..." value={form.expertiseAreas} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={labelStyle}>LinkedIn Profile (Optional)</label>
                            <input name="linkedIn" type="url" placeholder="https://linkedin.com/in/..." value={form.linkedIn} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={labelStyle}>Highest Qualification</label>
                            <select name="highestQualification" value={form.highestQualification} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }}>
                                <option value="">Select</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Bachelor">Bachelor's Degree</option>
                                <option value="Master">Master's Degree</option>
                                <option value="PhD">PhD / Doctorate</option>
                                <option value="Professional">Professional Certification</option>
                            </select>
                        </div>
                        <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Short Biography</label>
                            <textarea name="biography" rows={3} placeholder="Tell students about yourself and your expertise..." value={form.biography} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Upload CV / Resume (Optional)</label>
                            <input name="cvResume" type="file" accept=".pdf,.doc,.docx" onChange={handleChange} style={inputStyle} />
                        </div>
                    </>)}

                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7, gridColumn: '1 / -1' } : { ...styles.btn, gridColumn: '1 / -1' }} disabled={loading}>
                        {loading ? 'Creating Account...' : `Create ${form.assignedRole} Account →`}
                    </button>
                </form>

                <div style={styles.socialContainer}>
                    <p style={{ ...styles.socialText, color: colors.textMuted }}>Or continue with</p>
                    <div style={styles.socialButtons}>
                        <button type="button" onClick={() => openSocialModal('Google')} style={styles.socialBtn} title="Register with Google"><FaGoogle style={{ color: '#ea4335' }} /></button>
                        <button type="button" onClick={() => openSocialModal('GitHub')} style={styles.socialBtn} title="Register with GitHub"><FaGithub style={{ color: '#24292e' }} /></button>
                    </div>
                </div>

                <p style={{ ...styles.footerText, color: colors.textMuted }}>
                    Already have an account? <Link to="/login" style={{ ...styles.link, color: colors.primary }}>Sign in</Link>
                </p>
            </div>

            {showSocialModal && (
                <div style={styles.modalOverlay}>
                    <div style={modalStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {renderProviderIcon(socialProvider)}
                                <h3 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    Register with {socialProvider}
                                </h3>
                            </div>
                            <button onClick={() => setShowSocialModal(false)} style={styles.closeBtn}></button>
                        </div>

                        {socialError && <div style={styles.errorBox}>{socialError}</div>}

                        <form onSubmit={handleSocialSubmit} style={styles.form}>
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 16px' }}>
                                Authorize your {socialProvider} account to automatically register and log in to Emare ELMS.
                            </p>

                            <div style={styles.fieldGroup}>
                                <label style={labelStyle}>Full Name</label>
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
                                <label style={labelStyle}>Register As</label>
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
                                {socialLoading ? `Authorizing ${socialProvider}...` : `Continue with ${socialProvider} →`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', padding: '16px', position: 'relative' },
    backButton: { position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: '600', transition: 'color 0.2s', padding: '7px 11px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' },
    card: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '780px', boxShadow: '0 20px 45px rgba(0,0,0,0.45)' },
    header: { textAlign: 'center', marginBottom: '28px' },
    logo: { width: '54px', height: '54px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '900', color: '#fff', marginBottom: '14px' },
    title: { color: '#fff', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' },
    subtitle: { color: '#94a3b8', fontSize: '13px', margin: 0 },
    errorBox: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
    form: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { color: '#cbd5e1', fontSize: '12px', fontWeight: '700', letterSpacing: '0.4px' },
    input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', padding: '10px 14px', outline: 'none', transition: 'border-color 0.2s' },
    passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
    eyeIcon: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '15px' },
    textarea: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', padding: '10px 14px', outline: 'none', resize: 'vertical' },
    btn: { marginTop: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' },
    footerText: { textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px' },
    link: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600' },
    socialContainer: { textAlign: 'center', marginTop: '20px' },
    socialText: { color: '#94a3b8', marginBottom: '10px', fontSize: '12px' },
    socialButtons: { display: 'flex', justifyContent: 'center', gap: '12px' },
    socialBtn: { background: '#ffffff', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.25)', transition: 'transform 0.2s' },
    sectionHeader: { gridColumn: '1 / -1', color: '#fff', fontSize: '13px', fontWeight: '800', marginTop: '6px', marginBottom: '6px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }
};
