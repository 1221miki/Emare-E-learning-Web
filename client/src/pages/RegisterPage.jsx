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
        if (form.assignedRole === 'Instructor') {
            if (!form.professionalTitle.trim()) return 'Professional title required for instructors.';
        }
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
            if (user.assignedRole === 'Instructor' && user.status === 'Pending') {
                navigate('/pending-approval');
            } else if (user.assignedRole === 'Admin') {
                navigate('/admin/dashboard');
            } else if (user.assignedRole === 'Instructor') {
                navigate('/instructor/dashboard');
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
                socialId: `soc_${socialProvider.toLowerCase()}_${Date.now()}`,
                role: socialRole,
                firstName: form.firstName,
                lastName: form.lastName,
                country: form.country,
                city: form.city,
                educationLevel: form.educationLevel,
                institution: form.institution,
                fieldOfStudy: form.fieldOfStudy,
                professionalTitle: form.professionalTitle,
                biography: form.biography,
                skills: form.skills
            };
            const user = await socialAuth(mockData);
            setShowSocialModal(false);
            if (user.assignedRole === 'Admin') navigate('/admin/dashboard');
            else if (user.assignedRole === 'Instructor') navigate('/instructor/dashboard');
            else navigate('/student/dashboard');
        } catch (err) {
            setSocialError(err.response?.data?.message || `Registration with ${socialProvider} failed.`);
        } finally {
            setSocialLoading(false);
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
                <div style={styles.header}>
                    <div style={styles.logo}>E</div>
                    <h1 style={styles.title}>Create Account</h1>
                    <p style={styles.subtitle}>Join the Emare ELMS platform</p>
                </div>
                {error && <div style={styles.errorBox}>{error}</div>}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Basic Info */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>First Name</label>
                        <input name="firstName" type="text" required placeholder="John" value={form.firstName} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Middle Name (Optional)</label>
                        <input name="middleName" type="text" placeholder="A." value={form.middleName} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Last Name</label>
                        <input name="lastName" type="text" required placeholder="Doe" value={form.lastName} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Username</label>
                        <input name="username" type="text" required placeholder="johndoe" value={form.username} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input name="accountEmail" type="email" required placeholder="you@example.com" value={form.accountEmail} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Phone Number (Optional)</label>
                        <input name="phoneNumber" type="tel" placeholder="+1234567890" value={form.phoneNumber} onChange={handleChange} style={styles.input} />
                    </div>
                    {/* Password */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Password</label>
                        <div style={styles.passwordWrapper}>
                            <input name="securedPassword" type={showPassword ? "text" : "password"} required placeholder="••••••••" value={form.securedPassword} onChange={handleChange} style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <div style={styles.passwordWrapper}>
                            <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} style={{ ...styles.input, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    {/* Profile Picture */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Profile Picture (Optional)</label>
                        <input name="profilePicture" type="file" accept="image/*" onChange={handleChange} style={styles.input} />
                    </div>
                    {/* Personal Info */}
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
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Country</label>
                        <input name="country" type="text" placeholder="Country" value={form.country} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Region / State</label>
                        <input name="region" type="text" placeholder="State" value={form.region} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>City</label>
                        <input name="city" type="text" placeholder="City" value={form.city} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Address (Optional)</label>
                        <input name="address" type="text" placeholder="Street address" value={form.address} onChange={handleChange} style={styles.input} />
                    </div>
                    {/* Role Selection */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Register As</label>
                        <select name="assignedRole" value={form.assignedRole} onChange={handleChange} style={{ ...styles.input, cursor: 'pointer' }}>
                            <option value="Student">Student</option>
                            <option value="Instructor">Instructor</option>
                        </select>
                    </div>
                    {/* Conditional Sections */}
                    {form.assignedRole === 'Student' && (
                        <>
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
                                <input name="learningInterests" type="text" placeholder="AI, Data Science" value={form.learningInterests} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Preferred Language</label>
                                <input name="preferredLanguage" type="text" placeholder="English" value={form.preferredLanguage} onChange={handleChange} style={styles.input} />
                            </div>
                        </>
                    )}
                    {form.assignedRole === 'Instructor' && (
                        <>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Professional Title</label>
                                <input name="professionalTitle" type="text" required placeholder="Senior Lecturer" value={form.professionalTitle} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Biography</label>
                                <textarea name="biography" rows={3} placeholder="Tell us about yourself" value={form.biography} onChange={handleChange} style={styles.textarea} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Skills (comma separated)</label>
                                <input name="skills" type="text" placeholder="Python, React, Node.js" value={form.skills} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Years of Experience</label>
                                <input name="yearsOfExperience" type="number" min="0" placeholder="5" value={form.yearsOfExperience} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Highest Qualification</label>
                                <input name="highestQualification" type="text" placeholder="Ph.D. in Computer Science" value={form.highestQualification} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>CV / Resume (Optional)</label>
                                <input name="cvResume" type="file" accept="application/pdf" onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Portfolio Website</label>
                                <input name="portfolioUrl" type="url" placeholder="https://myportfolio.com" value={form.portfolioUrl} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>LinkedIn Profile</label>
                                <input name="linkedIn" type="url" placeholder="https://linkedin.com/in/username" value={form.linkedIn} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Certificates Upload (Optional)</label>
                                <input name="certificates" type="file" multiple onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Areas of Expertise</label>
                                <input name="expertiseAreas" type="text" placeholder="Machine Learning, Data Visualization" value={form.expertiseAreas} onChange={handleChange} style={styles.input} />
                            </div>
                        </>
                    )}
                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                {/* Social Registration */}
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

            {/* Social Registration Modal */}
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
                            <button onClick={() => setShowSocialModal(false)} style={styles.closeBtn}>✕</button>
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
    card: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '560px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
    header: { textAlign: 'center', marginBottom: '32px' },
    logo: { width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '16px' },
    title: { color: '#fff', fontSize: '26px', fontWeight: '800', margin: '0 0 6px' },
    subtitle: { color: '#94a3b8', fontSize: '14px', margin: 0 },
    errorBox: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '14px' },
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
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' },
    closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }
};
