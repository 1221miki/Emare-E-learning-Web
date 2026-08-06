import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaGithub, FaMicrosoft, FaFacebook, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';

export default function RegisterPage() {
    const { register, socialAuth } = useAuth();
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
        dateOfBirth: '',
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
        preferredLanguage: '',
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

    const handleChange = e => {
        const { name, value, files } = e.target;
        if (files) {
            setForm(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

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
            const user = await register(payload);
            if (user.assignedRole === 'Admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
        setSocialLoading(true);
        try {
            const mockData = {
                provider: socialProvider.toLowerCase(),
                email: socialEmail,
                name: socialName,
                role: socialRole,
            };

            const user = await socialAuth(mockData);

            if (user.assignedRole === 'Admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            setSocialError(err.response?.data?.message || `Unable to authorize ${socialProvider}. Please try again.`);
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
            case 'Microsoft':
                return <FaMicrosoft style={{ color: '#00a4ef' }} />;
            case 'Facebook':
                return <FaFacebook style={{ color: '#1877f2' }} />;
            default:
                return null;
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <Link to="/" style={styles.backButton}>
                    <FaArrowLeft /> Back to home
                </Link>

                <div style={styles.header}>
                    <div style={styles.logo}>E</div>
                    <h1 style={styles.title}>Create your Emare account</h1>
                    <p style={styles.subtitle}>Join Emare and start your learning journey today.</p>
                </div>

                {/* Students only register here — instructors are created by admin */}

                {error && <div style={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <h3 style={styles.sectionHeader}>Biographical Information</h3>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>First Name</label>
                        <input name="firstName" type="text" required placeholder="John" value={form.firstName} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Last Name</label>
                        <input name="lastName" type="text" required placeholder="Doe" value={form.lastName} onChange={handleChange} style={styles.input} />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Gender</label>
                        <select name="gender" value={form.gender} onChange={handleChange} style={styles.input}>
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Date of Birth</label>
                        <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} style={styles.input} />
                    </div>

                    <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                        <label style={styles.label}>Profile Picture Upload</label>
                        <input name="profilePicture" type="file" accept="image/*" onChange={handleChange} style={styles.input} />
                    </div>

                    <h3 style={styles.sectionHeader}>Security & Contact</h3>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Username</label>
                        <input name="username" type="text" required placeholder="johndoe" value={form.username} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Verified Email Address</label>
                        <input name="accountEmail" type="email" required placeholder="you@example.com" value={form.accountEmail} onChange={handleChange} style={styles.input} />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Password</label>
                        <div style={styles.passwordWrapper}>
                            <input name="securedPassword" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={form.securedPassword} onChange={handleChange} style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <div style={styles.passwordWrapper}>
                            <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Verified Phone Number (Optional)</label>
                        <input name="phoneNumber" type="tel" placeholder="+1234567890" value={form.phoneNumber} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" style={{ marginRight: 8 }} /> Enable 2FA</label>
                        <div />
                    </div>

                    {/* ── Student-specific fields ── */}
                    {form.assignedRole === 'Student' && (<>
                        <h3 style={styles.sectionHeader}>◈ Academic Details</h3>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Education Level</label>
                            <input name="educationLevel" type="text" placeholder="e.g., Bachelor" value={form.educationLevel} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Institution / University (Optional)</label>
                            <input name="institution" type="text" placeholder="University name" value={form.institution} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Field of Study</label>
                            <input name="fieldOfStudy" type="text" placeholder="Computer Science" value={form.fieldOfStudy} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Learning Interests</label>
                            <input name="learningInterests" type="text" placeholder="AI, Data Science, Cloud..." value={form.learningInterests} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Preferred Language</label>
                            <select name="preferredLanguage" value={form.preferredLanguage} onChange={handleChange} style={styles.input}>
                                <option value="">Select</option>
                                <option value="English">English</option>
                                <option value="Amharic">Amharic</option>
                                <option value="Afaan Oromo">Afaan Oromo</option>
                                <option value="Tigrinya">Tigrinya</option>
                            </select>
                        </div>
                    </>)}

                    {/* ── Instructor-specific fields ── */}
                    {form.assignedRole === 'Instructor' && (<>
                        <h3 style={styles.sectionHeader}>‍▧ Instructor Profile</h3>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Professional Title <span style={{ color: '#ef4444' }}>*</span></label>
                            <input name="professionalTitle" type="text" required placeholder="e.g., Senior Software Engineer" value={form.professionalTitle} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Years of Experience</label>
                            <input name="yearsOfExperience" type="number" min="0" max="50" placeholder="5" value={form.yearsOfExperience} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Expertise Areas</label>
                            <input name="expertiseAreas" type="text" placeholder="AI, Web Dev, Cloud..." value={form.expertiseAreas} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>LinkedIn Profile (Optional)</label>
                            <input name="linkedIn" type="url" placeholder="https://linkedin.com/in/..." value={form.linkedIn} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Highest Qualification</label>
                            <select name="highestQualification" value={form.highestQualification} onChange={handleChange} style={styles.input}>
                                <option value="">Select</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Bachelor">Bachelor's Degree</option>
                                <option value="Master">Master's Degree</option>
                                <option value="PhD">PhD / Doctorate</option>
                                <option value="Professional">Professional Certification</option>
                            </select>
                        </div>
                        <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Short Biography</label>
                            <textarea name="biography" rows={3} placeholder="Tell students about yourself and your expertise..." value={form.biography} onChange={handleChange} style={styles.textarea} />
                        </div>
                        <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Upload CV / Resume (Optional)</label>
                            <input name="cvResume" type="file" accept=".pdf,.doc,.docx" onChange={handleChange} style={styles.input} />
                        </div>
                    </>)}

                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7, gridColumn: '1 / -1' } : { ...styles.btn, gridColumn: '1 / -1' }} disabled={loading}>
                        {loading ? 'Creating Account...' : `Create ${form.assignedRole} Account →`}
                    </button>
                </form>

                <div style={styles.socialContainer}>
                    <p style={styles.socialText}>Or continue with</p>
                    <div style={styles.socialButtons}>
                        <button type="button" onClick={() => openSocialModal('Google')} style={styles.socialBtn} title="Register with Google"><FaGoogle style={{ color: '#ea4335' }} /></button>
                        <button type="button" onClick={() => openSocialModal('GitHub')} style={styles.socialBtn} title="Register with GitHub"><FaGithub style={{ color: '#24292e' }} /></button>
                        <button type="button" onClick={() => openSocialModal('Microsoft')} style={styles.socialBtn} title="Register with Microsoft"><FaMicrosoft style={{ color: '#00a4ef' }} /></button>
                        <button type="button" onClick={() => openSocialModal('Facebook')} style={styles.socialBtn} title="Register with Facebook"><FaFacebook style={{ color: '#1877f2' }} /></button>
                    </div>
                </div>

                <p style={styles.footerText}>
                    Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
                </p>
            </div>

            {showSocialModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
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
                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
                                Authorize your {socialProvider} account to automatically register and log in to Emare ELMS.
                            </p>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Full Name</label>
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
                                <label style={styles.label}>Register As</label>
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
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', padding: '20px', position: 'relative' },
    backButton: { position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '600', transition: 'color 0.2s', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' },
    card: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '920px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
    header: { textAlign: 'center', marginBottom: '32px' },
    logo: { width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '16px' },
    title: { color: '#fff', fontSize: '26px', fontWeight: '800', margin: '0 0 6px' },
    subtitle: { color: '#94a3b8', fontSize: '14px', margin: 0 },
    errorBox: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' },
    form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { color: '#cbd5e1', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
    input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '12px 16px', outline: 'none', transition: 'border-color 0.2s' },
    passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
    eyeIcon: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '16px' },
    textarea: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '12px 16px', outline: 'none', resize: 'vertical' },
    btn: { marginTop: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' },
    footerText: { textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' },
    link: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600' },
    socialContainer: { textAlign: 'center', marginTop: '24px' },
    socialText: { color: '#94a3b8', marginBottom: '12px', fontSize: '13px' },
    socialButtons: { display: 'flex', justifyContent: 'center', gap: '14px' },
    socialBtn: { background: '#ffffff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s' },
    sectionHeader: { gridColumn: '1 / -1', color: '#fff', fontSize: '14px', fontWeight: '800', marginTop: '8px', marginBottom: '8px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }
};
