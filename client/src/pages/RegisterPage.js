import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ fullName: '', accountEmail: '', securedPassword: '', assignedRole: 'Student' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await register(form);
            if (user.assignedRole === 'Admin') navigate('/admin/dashboard');
            else if (user.assignedRole === 'Instructor') navigate('/instructor/dashboard');
            else navigate('/student/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.logo}>E</div>
                    <h1 style={styles.title}>Create Account</h1>
                    <p style={styles.subtitle}>Join the Emare ELMS platform</p>
                </div>

                {error && <div style={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input id="fullName" name="fullName" type="text" required placeholder="Asamnew Agiz" value={form.fullName} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input id="accountEmail" name="accountEmail" type="email" required placeholder="you@example.com" value={form.accountEmail} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Password</label>
                        <input id="securedPassword" name="securedPassword" type="password" required placeholder="Min. 8 characters" value={form.securedPassword} onChange={handleChange} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Register As</label>
                        <select id="assignedRole" name="assignedRole" value={form.assignedRole} onChange={handleChange} style={{ ...styles.input, cursor: 'pointer' }}>
                            <option value="Student">Student</option>
                            <option value="Instructor">Instructor</option>
                        </select>
                    </div>
                    <button type="submit" style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p style={styles.footerText}>
                    Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', padding: '20px' },
    card: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
    header: { textAlign: 'center', marginBottom: '32px' },
    logo: { width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '16px' },
    title: { color: '#fff', fontSize: '26px', fontWeight: '800', margin: '0 0 6px' },
    subtitle: { color: '#94a3b8', fontSize: '14px', margin: 0 },
    errorBox: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { color: '#cbd5e1', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
    input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '12px 16px', outline: 'none' },
    btn: { marginTop: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' },
    footerText: { textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' },
    link: { color: '#60a5fa', textDecoration: 'none', fontWeight: '600' }
};
