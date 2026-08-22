import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_EXPERIENCE = { role: '', company: '', duration: '', description: '' };

const EMPTY_FORM = {
    name: '',
    title: '',
    initials: '',
    skills: '',
    summary: '',
    experiences: [{ ...EMPTY_EXPERIENCE }]
};

export function DevelopersPanel() {
    const { colors } = useTheme();
    const { isAuthenticated, isAdmin } = useAuth();
    const fileInputRef = useRef(null);
    const [developers, setDevelopers] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    // Profile picture can come from a selected file OR a pasted image URL
    const [pictureFile, setPictureFile] = useState(null);
    const [pictureUrl, setPictureUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // ── Data Fetching ──────────────────────────────────────
    const fetchDevelopers = async () => {
        try {
            setLoading(true);
            const res = await API.get('/developers');
            setDevelopers(res.data.data || []);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load developers' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevelopers();
    }, []);

    // Live preview source: selected file wins over pasted URL
    const previewSrc = pictureFile
        ? URL.createObjectURL(pictureFile)
        : pictureUrl;

    // ── Picture Handlers ───────────────────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file (jpg, png, webp...)' });
            return;
        }
        setPictureFile(file);
        setPictureUrl('');
        setMessage(null);
    };

    const handlePictureUrlChange = (e) => {
        setPictureUrl(e.target.value);
        if (e.target.value) {
            setPictureFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const clearPicture = () => {
        setPictureFile(null);
        setPictureUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Form Handlers ──────────────────────────────────────
    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleExperienceChange = (index, field, value) => {
        setForm(prev => ({
            ...prev,
            experiences: prev.experiences.map((exp, i) =>
                i === index ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const addExperience = () => {
        setForm(prev => ({ ...prev, experiences: [...prev.experiences, { ...EMPTY_EXPERIENCE }] }));
    };

    const removeExperience = (index) => {
        setForm(prev => ({
            ...prev,
            experiences: prev.experiences.length > 1
                ? prev.experiences.filter((_, i) => i !== index)
                : [{ ...EMPTY_EXPERIENCE }]
        }));
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        clearPicture();
    };

    // ── CRUD Actions ───────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);

            let res;
            if (pictureFile) {
                // Multipart upload — Multer pipes the image to Cloudinary
                const data = new FormData();
                data.append('profilePicture', pictureFile);
                data.append('name', form.name);
                data.append('title', form.title);
                data.append('initials', form.initials);
                data.append('skills', form.skills);
                data.append('summary', form.summary);
                data.append('experiences', JSON.stringify(form.experiences));
                res = editingId
                    ? await API.put(`/developers/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
                    : await API.post('/developers', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                // JSON payload — image passed as an external/Cloudinary URL
                const payload = { ...form, profilePicture: pictureUrl };
                res = editingId
                    ? await API.put(`/developers/${editingId}`, payload)
                    : await API.post('/developers', payload);
            }

            setMessage({ type: 'success', text: res.data?.message || 'Saved successfully' });
            resetForm();
            fetchDevelopers();
        } catch (err) {
            const status = err.response?.status;
            let text = err.response?.data?.message || 'Failed to save developer';
            if (status === 401) text = 'Your session has expired. Please log in again as an Administrator.';
            if (status === 403) text = 'Access denied. Only Administrator accounts can save developer profiles.';
            setMessage({ type: 'error', text });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (dev) => {
        setEditingId(dev._id);
        setForm({
            name: dev.name || '',
            title: dev.title || '',
            initials: dev.initials || '',
            skills: Array.isArray(dev.skills) ? dev.skills.join(', ') : '',
            summary: dev.summary || '',
            experiences: dev.experiences?.length
                ? dev.experiences.map(exp => ({ role: exp.role || '', company: exp.company || '', duration: exp.duration || '', description: exp.description || '' }))
                : [{ ...EMPTY_EXPERIENCE }]
        });
        clearPicture();
        setPictureUrl(dev.profilePicture || '');
        setMessage(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this developer profile?')) return;
        try {
            await API.delete(`/developers/${id}`);
            setMessage({ type: 'success', text: 'Developer deleted successfully' });
            if (editingId === id) resetForm();
            fetchDevelopers();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete developer' });
        }
    };

    // ── Styles ─────────────────────────────────────────────
    const styles = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text, padding: '32px 5%' },
        heading: { fontSize: '28px', fontWeight: '900', margin: '0 0 6px' },
        subheading: { color: colors.textMuted, margin: '0 0 28px', fontSize: '14px' },
        card: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginBottom: '32px' },
        grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
        label: { display: 'block', fontSize: '12px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textMuted, margin: '0 0 6px' },
        input: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgInput, color: colors.text, fontSize: '14px', boxSizing: 'border-box' },
        textarea: { width: '100%', minHeight: '100px', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgInput, color: colors.text, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
        sectionTitle: { fontSize: '16px', fontWeight: '800', margin: '24px 0 12px' },
        pictureRow: { display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' },
        previewBox: { width: '96px', height: '96px', borderRadius: '50%', border: `2px dashed ${colors.border}`, background: colors.bgInput, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
        previewFallback: { color: colors.textMuted, fontSize: '11px', textAlign: 'center', padding: '8px' },
        experienceBlock: { border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '18px', marginBottom: '14px', position: 'relative' },
        removeBtn: { position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', borderRadius: '10px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
        addBtn: { padding: '10px 18px', borderRadius: '12px', border: `1px dashed ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: '700', cursor: 'pointer' },
        submitBtn: { padding: '13px 30px', borderRadius: '14px', border: 'none', background: colors.primary, color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '15px', marginTop: '20px' },
        cancelBtn: { padding: '13px 22px', borderRadius: '14px', marginLeft: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, fontWeight: '700', cursor: 'pointer', marginTop: '20px' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { textAlign: 'left', padding: '12px 14px', borderBottom: `2px solid ${colors.border}`, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textMuted },
        td: { padding: '12px 14px', borderBottom: `1px solid ${colors.border}`, fontSize: '14px', verticalAlign: 'top' },
        editBtn: { padding: '8px 16px', borderRadius: '10px', border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: '700', cursor: 'pointer', marginRight: '8px' },
        deleteBtn: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: '700', cursor: 'pointer' },
        alertSuccess: { padding: '12px 18px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: '700', marginBottom: '20px', border: '1px solid rgba(34,197,94,0.35)' },
        alertError: { padding: '12px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: '700', marginBottom: '20px', border: '1px solid rgba(239,68,68,0.35)' },
        alertWarn: { padding: '12px 18px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: '700', marginBottom: '20px', border: '1px solid rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
        tableAvatar: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle', marginRight: '10px', border: `1px solid ${colors.border}` }
    };

    return (
        <div>
            {/* ── Auth State Warning ───────────────────────── */}
            {!isAuthenticated ? (
                <div style={styles.alertWarn}>
                    You are not logged in. Adding developers requires an Administrator account.
                    <Link to="/login?redirect=/admin/developers" style={{ color: colors.primary, textDecoration: 'underline' }}>Log in as Admin</Link>
                </div>
            ) : !isAdmin ? (
                <div style={styles.alertWarn}>
                    Your account is not an Administrator, so saving is disabled. Log in with an Admin account.
                    <Link to="/login?redirect=/admin/developers" style={{ color: colors.primary, textDecoration: 'underline' }}>Switch account</Link>
                </div>
            ) : null}

            {message && (
                <div style={message.type === 'success' ? styles.alertSuccess : styles.alertError}>
                    {message.text}
                </div>
            )}

            {/* ── Developer Form ───────────────────────────── */}
            <div style={styles.card}>
                <h2 style={{ ...styles.sectionTitle, margin: '0 0 16px' }}>
                    {editingId ? 'Edit Developer' : 'Add New Developer'}
                </h2>
                <form onSubmit={handleSubmit}>
                    {/* Profile Picture */}
                    <label style={styles.label}>Profile Picture</label>
                    <div style={{ ...styles.pictureRow, marginBottom: '16px' }}>
                        <div style={styles.previewBox}>
                            {previewSrc
                                ? <img src={previewSrc} alt="Profile preview" style={styles.previewImg} />
                                : <span style={styles.previewFallback}>No<br />Image</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: '260px', display: 'grid', gap: '10px' }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ color: colors.text, fontSize: '13px' }}
                            />
                            <div>
                                <label style={styles.label} htmlFor="pic-url">Or paste an Image / Cloudinary URL</label>
                                <input id="pic-url" style={styles.input} value={pictureUrl} onChange={handlePictureUrlChange} placeholder="https://res.cloudinary.com/.../photo.jpg" />
                            </div>
                        </div>
                    </div>

                    <div style={styles.grid2}>
                        <div>
                            <label style={styles.label} htmlFor="dev-name">Name</label>
                            <input id="dev-name" style={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Fawaz Bekele" required />
                        </div>
                        <div>
                            <label style={styles.label} htmlFor="dev-title">Title</label>
                            <input id="dev-title" style={styles.input} name="title" value={form.title} onChange={handleChange} placeholder="Full Stack Developer" required />
                        </div>
                        <div>
                            <label style={styles.label} htmlFor="dev-initials">Initials (fallback avatar)</label>
                            <input id="dev-initials" style={styles.input} name="initials" value={form.initials} onChange={handleChange} placeholder="FB" maxLength={4} />
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label} htmlFor="dev-skills">Skills (comma-separated)</label>
                        <input id="dev-skills" style={styles.input} name="skills" value={form.skills} onChange={handleChange} placeholder="Node.js, React, MongoDB" required />
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label} htmlFor="dev-summary">Summary</label>
                        <textarea id="dev-summary" style={styles.textarea} name="summary" value={form.summary} onChange={handleChange} placeholder="Brief professional bio shown in the Detail modal..." />
                    </div>

                    <h3 style={styles.sectionTitle}>Experience</h3>
                    {form.experiences.map((exp, index) => (
                        <div key={index} style={styles.experienceBlock}>
                            <button type="button" style={styles.removeBtn} onClick={() => removeExperience(index)}>Remove</button>
                            <div style={styles.grid2}>
                                <div>
                                    <label style={styles.label}>Role</label>
                                    <input style={styles.input} value={exp.role} onChange={(e) => handleExperienceChange(index, 'role', e.target.value)} placeholder="Software Developer" />
                                </div>
                                <div>
                                    <label style={styles.label}>Company</label>
                                    <input style={styles.input} value={exp.company} onChange={(e) => handleExperienceChange(index, 'company', e.target.value)} placeholder="Ethiopian Commodity Exchange" />
                                </div>
                                <div>
                                    <label style={styles.label}>Duration</label>
                                    <input style={styles.input} value={exp.duration} onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)} placeholder="June 2023 - Feb 2024" />
                                </div>
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <label style={styles.label}>Description</label>
                                <textarea style={styles.textarea} value={exp.description} onChange={(e) => handleExperienceChange(index, 'description', e.target.value)} placeholder="Developed web apps with Angular and .NET..." />
                            </div>
                        </div>
                    ))}
                    <button type="button" style={styles.addBtn} onClick={addExperience}>+ Add Experience</button>

                    <div>
                        <button type="submit" style={{ ...styles.submitBtn, opacity: saving || !isAdmin ? 0.6 : 1, cursor: saving || !isAdmin ? 'not-allowed' : 'pointer' }} disabled={saving || !isAdmin}>
                            {saving ? 'Saving...' : editingId ? 'Update Developer' : 'Add Developer'}
                        </button>
                        {editingId && (
                            <button type="button" style={styles.cancelBtn} onClick={resetForm}>Cancel Edit</button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── Developers Table ─────────────────────────── */}
            <div style={styles.card}>
                <h2 style={{ ...styles.sectionTitle, margin: '0 0 16px' }}>Registered Developers ({developers.length})</h2>
                {loading ? (
                    <p style={{ color: colors.textMuted }}>Loading developers...</p>
                ) : developers.length === 0 ? (
                    <p style={{ color: colors.textMuted }}>No developer profiles yet. Use the form above to add one.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Developer</th>
                                    <th style={styles.th}>Skills</th>
                                    <th style={styles.th}>Experience</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {developers.map(dev => (
                                    <tr key={dev._id}>
                                        <td style={styles.td}>
                                            <img src={dev.profilePicture} alt={dev.name} style={styles.tableAvatar} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            <strong>{dev.name}</strong>
                                            <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>{dev.title}</div>
                                        </td>
                                        <td style={styles.td}>{Array.isArray(dev.skills) ? dev.skills.join(', ') : ''}</td>
                                        <td style={styles.td}>{dev.experiences?.length || 0} entries</td>
                                        <td style={styles.td}>
                                            <button style={styles.editBtn} onClick={() => handleEdit(dev)}>Edit</button>
                                            <button style={styles.deleteBtn} onClick={() => handleDelete(dev._id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminDevelopers() {
    const { colors } = useTheme();
    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text, padding: '32px 5%' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 6px' }}>Emare Developers Management</h1>
            <p style={{ color: colors.textMuted, margin: '0 0 28px', fontSize: '14px' }}>Create, update, and remove developer profiles shown on the public Developers page.</p>
            <DevelopersPanel />
        </div>
    );
}
