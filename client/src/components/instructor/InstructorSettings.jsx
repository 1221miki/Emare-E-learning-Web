import React, { useState, useRef } from 'react';
import {
    User, Shield, Settings, Bell, CreditCard,
    Camera, Download, Plus, X, Edit3, Eye, EyeOff,
    Check, AlertTriangle, Lock, Globe, Zap, Star,
    ChevronDown, ChevronUp, Upload, FileText
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { userService, uploadService } from '../../services/api';

// ── Reusable Toggle switch ───────────────────────────────────────
function Toggle({ checked, onChange, color = '#3b82f6', ariaLabel = '' }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            style={{ width: '44px', height: '24px', borderRadius: '34px', background: checked ? color : '#e0e7ff', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0, padding: 0 }}
        >
            <span style={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', top: '3px', left: checked ? '23px' : '3px', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
        </button>
    );
}

// ── Field row ────────────────────────────────────────────────────
function Field({ label, children, span }) {
    return (
        <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
            {label && <label style={T.lbl}>{label}</label>}
            {children}
        </div>
    );
}

// ── Skill tag ────────────────────────────────────────────────────
function Tag({ label, onRemove }) {
    return (
        <span style={{ background: '#dbeafe', border: '2px solid #60a5fa', color: '#1e40af', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            {label}
            {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }} aria-label={`Remove ${label}`}><X size={11} /></button>}
        </span>
    );
}

// ── Section wrapper ──────────────────────────────────────────────
function Section({ title, icon, children, collapsible }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ ...T.card, padding: '20px 22px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? '16px' : 0 }}>
                <h3 style={T.sectionHead}>{icon && React.cloneElement(icon, { size: 16, 'aria-hidden': true })}{title}</h3>
                {collapsible && (
                    <button onClick={() => setOpen(o => !o)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }} aria-label={open ? 'Collapse' : 'Expand'}>
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                )}
            </div>
            {open && children}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — Profile Info
// ════════════════════════════════════════════════════════════════
function ProfileTab({ user, onSaved, updateUser }) {
    const fileRef = useRef(null);
    const cvRef   = useRef(null);

    const [form, setForm] = useState({
        fullName:     user?.fullName || '',
        title:        user?.occupation || 'Instructor',
        accountEmail: user?.accountEmail || '',
        contactPhone: user?.contactPhone || '',
        biography:    user?.biography || '',
        linkedin:     user?.socialMediaLinks?.linkedin || '',
        website:      user?.socialMediaLinks?.website || '',
        githubUrl:    user?.githubUrl || '',
        institution:  user?.company || '',
    });

    const [tags, setTags]         = useState(user?.specializations || ['MERN Stack', 'Advanced UI']);
    const [tagInput, setTagInput] = useState('');
    const [specs, setSpecs]       = useState(user?.qualifications || ['MERN Stack Development', 'Advanced UI/UX']);
    const [avatar, setAvatar]     = useState(user?.avatarUrl || '');
    const [cvName, setCvName]     = useState('');
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');
    const [uploading, setUploading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('targetType', 'avatar');
            const res = await uploadService.uploadFile(fd);
            if (res.data?.success) {
                const newUrl = res.data.data.url;
                setAvatar(newUrl);
                // Propagate to AuthContext immediately so Sidebar and all other
                // avatar locations re-render without waiting for handleSave.
                updateUser?.({ avatarUrl: newUrl });
            }
        } catch { /* ignore */ } finally { setUploading(false); }
    };

    const handleCvUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        setCvName(file.name);
    };

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
        setTagInput('');
    };

    const handleSave = async () => {
        setSaving(true); setMsg('');
        try {
            await userService.updateInstructorProfile({
                ...form,
                avatarUrl: avatar,
                specializations: tags,
                qualifications: specs,
                socialMediaLinks: { linkedin: form.linkedin, website: form.website },
            });
            // Propagate all changed fields (name, bio, avatarUrl, etc.) to
            // AuthContext so every avatar/name display updates immediately.
            updateUser?.({ ...form, avatarUrl: avatar });
            setMsg('Profile saved successfully!');
            onSaved && onSaved();
        } catch (e) {
            setMsg(e.response?.data?.message || 'Failed to save profile.');
        } finally { setSaving(false); }
    };

    const avatarColors = ['#3b82f6','#8b5cf6','#10b981'];
    const avatarColor  = avatarColors[(form.fullName.charCodeAt(0) || 0) % avatarColors.length];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
            {/* ── Left column ──────────────────────────── */}
            <div>
                {/* Avatar + basic fields */}
                <Section title="Personal Information" icon={<User />}>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '20px' }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            {avatar
                                ? <img src={avatar} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #60a5fa' }} />
                                : <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `${avatarColor}22`, border: `3px solid ${avatarColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: avatarColor, fontSize: '36px', fontWeight: '800' }}>
                                    {(form.fullName || 'I').charAt(0).toUpperCase()}
                                  </div>
                            }
                            <button
                                onClick={() => fileRef.current?.click()}
                                style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', background: '#dbeafe', border: '2px solid #60a5fa', color: '#1e40af', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                                aria-label="Edit profile photo"
                            >
                                {uploading ? '…' : <><Camera size={11} /> Edit Photo</>}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                        </div>

                        {/* Name / Title / Email / Phone */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                            <Field label="Full Name"><input style={T.input} value={form.fullName} onChange={e => set('fullName', e.target.value)} /></Field>
                            <Field label="Title"><input style={T.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Professor / Senior Instructor" /></Field>
                            <Field label="Email"><input style={T.input} value={form.accountEmail} onChange={e => set('accountEmail', e.target.value)} type="email" /></Field>
                            <Field label="Phone Number"><input style={T.input} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+1-555-0123" /></Field>
                        </div>
                    </div>

                    <Field label="Bio" span>
                        <textarea rows={4} style={{ ...T.input, resize: 'vertical' }} value={form.biography} onChange={e => set('biography', e.target.value)} placeholder="Tell students about your expertise and teaching style…" />
                    </Field>

                    {/* Specialized Skill Tags */}
                    <div style={{ marginTop: '14px' }}>
                        <label style={T.lbl}>Specialized Skill Tags</label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {tags.map(t => <Tag key={t} label={t} onRemove={() => setTags(prev => prev.filter(x => x !== t))} />)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input style={{ ...T.input, flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add skill tag…" aria-label="Add skill tag" />
                            <button onClick={addTag} style={{ ...T.ghostBtn, padding: '10px 14px' }} aria-label="Add tag"><Plus size={14} /></button>
                        </div>
                    </div>

                    {/* Social links */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                        <Field label="LinkedIn"><input style={T.input} value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
                        <Field label="Personal Portfolio"><input style={T.input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://myportfolio.com" /></Field>
                    </div>

                    {/* Course Specializations */}
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={T.lbl}>Course Specializations</label>
                            <button onClick={() => { const s = prompt('Add specialization:'); if (s?.trim()) setSpecs(prev => [...prev, s.trim()]); }} style={{ ...T.ghostBtn, padding: '5px 10px', fontSize: '11px' }}><Plus size={12} /> Add</button>
                        </div>
                        {specs.map((sp, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e0e7ff' }}>
                                <span style={{ color: '#1e293b', fontSize: '13px' }}>{sp}</span>
                                <button onClick={() => setSpecs(prev => prev.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer' }} aria-label={`Edit ${sp}`}><Edit3 size={13} /></button>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Instructor Preferences */}
                <Section title="Instructor Preferences" icon={<Settings />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <Field label="Default Course Language">
                            <select style={T.select}><option>English</option><option>Amharic</option><option>French</option></select>
                        </Field>
                        <Field label="Time Zone">
                            <select style={T.select}><option>Time Zone / Senior Instructor</option><option>UTC+3 (East Africa)</option><option>UTC+0</option><option>UTC-5 (EST)</option></select>
                        </Field>
                        <Field label="Time Zone Format">
                            <select style={T.select}><option>Standard (English)</option><option>12-hour</option><option>24-hour</option></select>
                        </Field>
                        <Field label="Grading System Preferences">
                            <select style={T.select}><option>Standard letter grade vs. numeric</option><option>Numeric only</option><option>Pass / Fail</option></select>
                        </Field>
                        <Field label="Communication Tools" span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input type="checkbox" defaultChecked style={{ accentColor: '#3b82f6', width: '15px', height: '15px' }} id="enable-msg" />
                                <label htmlFor="enable-msg" style={{ color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>Enable internal messaging</label>
                                <Toggle checked={true} onChange={() => {}} color="#3b82f6" ariaLabel="Toggle internal messaging" />
                            </div>
                        </Field>
                    </div>
                </Section>

                {/* Save / Cancel */}
                {msg && (
                    <div style={{ background: msg.includes('success') ? '#d1fae5' : '#fee2e2', border: `2px solid ${msg.includes('success') ? '#6ee7b7' : '#fecaca'}`, color: msg.includes('success') ? '#065f46' : '#991b1b', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', marginBottom: '14px' }}>
                        {msg}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleSave} disabled={saving} style={{ ...T.primaryBtn, opacity: saving ? 0.7 : 1 }}>
                        <Check size={15} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setMsg('')} style={T.ghostBtn}>Cancel</button>
                </div>
            </div>

            {/* ── Right column ─────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Curriculum & Expert Details */}
                <div style={{ ...T.card, padding: '18px 20px' }}>
                    <h3 style={T.sectionHead}><Star size={15} color="#f59e0b" /> Curriculum &amp; Expert Details</h3>
                    <label style={T.lbl}>Specialized Subjects</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {tags.slice(0, 4).map(t => <Tag key={t} label={t} />)}
                    </div>
                    <Field label="Current Institution">
                        <input style={T.input} value={form.institution} onChange={e => set('institution', e.target.value)} placeholder="Current Institution" />
                    </Field>
                    <div style={{ marginTop: '14px' }}>
                        <label style={T.lbl}>Downloadable CV</label>
                        <button onClick={() => cvRef.current?.click()} style={{ ...T.ghostBtn, width: '100%', justifyContent: 'center', marginBottom: '8px' }}>
                            <Download size={14} /> Downloadable CV
                        </button>
                        <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleCvUpload} />
                        {cvName && (
                            <div style={{ background: '#f0f4ff', border: '2px solid #c7d2fe', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={13} color="#4f46e5" />
                                    <span style={{ color: '#4f46e5', fontSize: '12px' }}>{cvName}</span>
                                </div>
                                <button onClick={() => setCvName('')} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer' }} aria-label="Remove CV"><X size={13} /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notification Settings */}
                <div style={{ ...T.card, padding: '18px 20px' }}>
                    <h3 style={T.sectionHead}><Bell size={15} color="#3b82f6" /> Notification Settings</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0', alignItems: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px' }}>Notification</div>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px', textAlign: 'center', minWidth: '48px' }}>Email</div>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px', textAlign: 'center', minWidth: '48px' }}>In-app</div>
                    </div>
                    {[
                        { label: 'New enrollments',   email: true,  app: false },
                        { label: 'Quiz submissions',  email: true,  app: false },
                        { label: 'Assignment deadlines', email: true, app: false },
                        { label: 'Student messages',  email: true,  app: false },
                    ].map((n, i) => (
                        <NotifRow key={i} label={n.label} emailDefault={n.email} appDefault={n.app} />
                    ))}
                </div>

                {/* Upgrade card */}
                <div style={{ background: 'linear-gradient(135deg, #dbeafe, #e9d5ff)', border: '2px solid #c7d2fe', borderRadius: '16px', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Zap size={16} color="#f59e0b" />
                        <span style={{ color: '#1e40af', fontSize: '14px', fontWeight: '800' }}>Unlock Premium Features</span>
                    </div>
                    <p style={{ color: '#4f46e5', fontSize: '12px', margin: '0 0 12px', lineHeight: 1.6 }}>
                        Includes:<br />
                        • Advanced AI tools<br />
                        • More communication channels<br />
                        • Personalized course insights
                    </p>
                    <button style={{ ...T.primaryBtn, width: '100%', justifyContent: 'center', fontSize: '13px' }}>
                        Upgrade Now
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotifRow({ label, emailDefault, appDefault }) {
    const [email, setEmail] = useState(emailDefault);
    const [app, setApp]     = useState(appDefault);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #e0e7ff' }}>
            <span style={{ color: '#1e293b', fontSize: '13px' }}>{label}</span>
            <div style={{ display: 'flex', justifyContent: 'center', minWidth: '48px' }}>
                <Toggle checked={email} onChange={setEmail} color="#3b82f6" ariaLabel={`Email: ${label}`} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', minWidth: '48px' }}>
                <Toggle checked={app} onChange={setApp} color="#8b5cf6" ariaLabel={`In-app: ${label}`} />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — Security & Account
// ════════════════════════════════════════════════════════════════
function SecurityTab({ user }) {
    const [currPwd, setCurrPwd]   = useState('');
    const [newPwd, setNewPwd]     = useState('');
    const [confPwd, setConfPwd]   = useState('');
    const [show, setShow]         = useState({ curr: false, new: false, conf: false });
    const [twoFA, setTwoFA]       = useState(user?.twoFactorEnabled || false);
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');

    const handleSave = async () => {
        if (newPwd && newPwd !== confPwd) return setMsg('New passwords do not match.');
        if (newPwd && !currPwd) return setMsg('Current password is required.');
        setSaving(true); setMsg('');
        try {
            await userService.updateProfile({ currentPassword: currPwd, newPassword: newPwd, twoFactorEnabled: twoFA });
            setMsg('Security settings saved!');
            setCurrPwd(''); setNewPwd(''); setConfPwd('');
        } catch (e) {
            setMsg(e.response?.data?.message || 'Failed to update security settings.');
        } finally { setSaving(false); }
    };

    const pwdField = (label, val, setter, key) => (
        <Field label={label}>
            <div style={{ position: 'relative' }}>
                <input
                    type={show[key] ? 'text' : 'password'}
                    style={{ ...T.input, paddingRight: '40px' }}
                    value={val}
                    onChange={e => setter(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                />
                <button onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }} aria-label={show[key] ? 'Hide password' : 'Show password'}>
                    {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );

    return (
        <div style={{ maxWidth: '640px' }}>
            <Section title="Change Password" icon={<Lock />}>
                <div style={{ display: 'grid', gap: '14px' }}>
                    {pwdField('Current Password', currPwd, setCurrPwd, 'curr')}
                    {pwdField('New Password', newPwd, setNewPwd, 'new')}
                    {pwdField('Confirm New Password', confPwd, setConfPwd, 'conf')}
                    {newPwd && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {['Length ≥8', 'Uppercase', 'Number', 'Symbol'].map((r, i) => {
                                const pass = i === 0 ? newPwd.length >= 8 : i === 1 ? /[A-Z]/.test(newPwd) : i === 2 ? /\d/.test(newPwd) : /[^A-Za-z0-9]/.test(newPwd);
                                return (
                                    <span key={r} style={{ background: pass ? '#d1fae5' : '#fee2e2', border: `2px solid ${pass ? '#6ee7b7' : '#fecaca'}`, color: pass ? '#065f46' : '#991b1b', borderRadius: '20px', padding: '3px 8px', fontSize: '11px', fontWeight: '600' }}>
                                        {pass ? '✓' : '✕'}{r}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Section>

            <Section title="Two-Factor Authentication" icon={<Shield />}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Authenticator App</div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>Use an authenticator app to get 2FA codes when signing in.</div>
                    </div>
                    <Toggle checked={twoFA} onChange={setTwoFA} color="#10b981" ariaLabel="Toggle two-factor authentication" />
                </div>
            </Section>

            <Section title="Active Sessions" icon={<Globe />}>
                {[
                    { device: 'Chrome on macOS', location: 'Addis Ababa, Ethiopia', current: true, time: 'Active now' },
                    { device: 'Safari on iPhone', location: 'Addis Ababa, Ethiopia', current: false, time: '2 days ago' },
                ].map((sess, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e0e7ff' }}>
                        <div>
                            <div style={{ color: '#1e293b', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {sess.device}
                                {sess.current && <span style={{ background: '#d1fae5', color: '#065f46', border: '2px solid #6ee7b7', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '700' }}>Current</span>}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{sess.location} · {sess.time}</div>
                        </div>
                        {!sess.current && (
                            <button style={{ ...T.dangerBtn, padding: '5px 12px', fontSize: '11px' }}>Revoke</button>
                        )}
                    </div>
                ))}
            </Section>

            <Section title="Danger Zone" icon={<AlertTriangle />}>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '14px', lineHeight: 1.6 }}>Permanently deactivate your instructor account. This action cannot be undone.</p>
                <button style={T.dangerBtn}><AlertTriangle size={14} /> Deactivate Account</button>
            </Section>

            {msg && <div style={{ background: msg.includes('saved') ? '#d1fae5' : '#fee2e2', border: `2px solid ${msg.includes('saved') ? '#6ee7b7' : '#fecaca'}`, color: msg.includes('saved') ? '#065f46' : '#991b1b', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', marginBottom: '14px' }}>{msg}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleSave} disabled={saving} style={{ ...T.primaryBtn, opacity: saving ? 0.7 : 1 }}><Check size={15} /> {saving ? 'Saving…' : 'Save Changes'}</button>
                <button style={T.ghostBtn}>Cancel</button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — Preferences
// ════════════════════════════════════════════════════════════════
function PreferencesTab({ user }) {
    const [prefs, setPrefs] = useState({
        language: user?.preferredLanguage || 'English',
        timeZone: user?.timeZone || 'UTC+3 (East Africa Time)',
        theme: 'dark',
        compactMode: false,
        autoSave: true,
        showStudentProgress: true,
        defaultVideoQuality: '1080p',
        gradingMethod: 'numeric',
    });
    const [msg, setMsg] = useState('');

    const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        try {
            await userService.updateProfile({ preferredLanguage: prefs.language, timeZone: prefs.timeZone });
            setMsg('Preferences saved!');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { setMsg('Failed to save preferences.'); }
    };

    return (
        <div style={{ maxWidth: '700px' }}>
            <Section title="Display & Language" icon={<Globe />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <Field label="Interface Language">
                        <select style={T.select} value={prefs.language} onChange={e => set('language', e.target.value)}>
                            {['English', 'Amharic', 'French', 'Arabic', 'Spanish'].map(l => <option key={l}>{l}</option>)}
                        </select>
                    </Field>
                    <Field label="Time Zone">
                        <select style={T.select} value={prefs.timeZone} onChange={e => set('timeZone', e.target.value)}>
                            {['UTC+3 (East Africa Time)', 'UTC+0 (GMT)', 'UTC-5 (EST)', 'UTC+1 (CET)', 'UTC+8 (CST)'].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Theme">
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['dark', 'light', 'system'].map(t => (
                                <button key={t} onClick={() => set('theme', t)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: `2px solid ${prefs.theme === t ? '#60a5fa' : '#c7d2fe'}`, background: prefs.theme === t ? '#dbeafe' : '#f0f4ff', color: prefs.theme === t ? '#1e40af' : '#4f46e5', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textTransform: 'capitalize' }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label="Default Video Quality">
                        <select style={T.select} value={prefs.defaultVideoQuality} onChange={e => set('defaultVideoQuality', e.target.value)}>
                            {['480p', '720p', '1080p', 'Auto'].map(q => <option key={q}>{q}</option>)}
                        </select>
                    </Field>
                </div>
            </Section>

            <Section title="Instructor Workspace" icon={<Settings />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                        { key: 'autoSave',            label: 'Auto-save drafts',                sub: 'Automatically save course and assignment drafts' },
                        { key: 'compactMode',          label: 'Compact sidebar mode',           sub: 'Show icons only in the sidebar' },
                        { key: 'showStudentProgress',  label: 'Show student progress on overview', sub: 'Display real-time learner progress on the dashboard' },
                    ].map(pref => (
                        <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0f4ff', borderRadius: '10px', border: '2px solid #c7d2fe' }}>
                            <div>
                                <div style={{ color: '#1e293b', fontSize: '13px', fontWeight: '600' }}>{pref.label}</div>
                                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{pref.sub}</div>
                            </div>
                            <Toggle checked={prefs[pref.key]} onChange={v => set(pref.key, v)} color="#3b82f6" ariaLabel={pref.label} />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Grading Preferences" icon={<Star />}>
                <Field label="Default Grading Method">
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[['numeric', 'Numeric (0–100)'], ['letter', 'Letter Grade (A–F)'], ['pass_fail', 'Pass / Fail']].map(([val, lbl]) => (
                            <button key={val} onClick={() => set('gradingMethod', val)} style={{ padding: '9px 16px', borderRadius: '10px', border: `2px solid ${prefs.gradingMethod === val ? '#60a5fa' : '#c7d2fe'}`, background: prefs.gradingMethod === val ? '#dbeafe' : '#f0f4ff', color: prefs.gradingMethod === val ? '#1e40af' : '#4f46e5', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                </Field>
            </Section>

            {msg && <div style={{ background: '#d1fae5', border: '2px solid #6ee7b7', color: '#065f46', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', marginBottom: '14px' }}>{msg}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleSave} style={T.primaryBtn}><Check size={15} /> Save Preferences</button>
                <button style={T.ghostBtn}>Reset to Defaults</button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// TAB 4 — Notifications
// ════════════════════════════════════════════════════════════════
function NotificationsTab() {
    const groups = [
        {
            title: 'Course Activity',
            items: [
                { label: 'New student enrollment', email: true, app: true, sms: false },
                { label: 'Student question posted', email: false, app: true, sms: false },
                { label: 'Assignment submitted', email: true, app: true, sms: false },
                { label: 'Quiz attempt completed', email: false, app: true, sms: false },
            ]
        },
        {
            title: 'Reviews & Feedback',
            items: [
                { label: 'New course review', email: true, app: true, sms: false },
                { label: 'Student feedback', email: false, app: true, sms: false },
            ]
        },
        {
            title: 'Payments & Earnings',
            items: [
                { label: 'Payment received', email: true, app: true, sms: true },
                { label: 'Payout processed', email: true, app: false, sms: false },
            ]
        },
        {
            title: 'Platform & System',
            items: [
                { label: 'Platform announcements', email: true, app: true, sms: false },
                { label: 'Security alerts', email: true, app: true, sms: true },
            ]
        },
    ];

    return (
        <div style={{ maxWidth: '680px' }}>
            {groups.map(group => (
                <Section key={group.title} title={group.title} icon={<Bell />} collapsible>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0', alignItems: 'center', marginBottom: '6px' }}>
                        <div />
                        {['Email', 'In-App', 'SMS'].map(ch => (
                            <div key={ch} style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', minWidth: '52px' }}>{ch}</div>
                        ))}
                    </div>
                    {group.items.map((item, i) => (
                        <NotifRow3 key={i} label={item.label} defaults={[item.email, item.app, item.sms]} />
                    ))}
                </Section>
            ))}
        </div>
    );
}

function NotifRow3({ label, defaults }) {
    const [vals, setVals] = useState(defaults);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #e0e7ff' }}>
            <span style={{ color: '#1e293b', fontSize: '13px' }}>{label}</span>
            {vals.map((v, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'center', minWidth: '52px' }}>
                    <Toggle checked={v} onChange={nv => setVals(vs => vs.map((x, j) => j === i ? nv : x))} color={['#3b82f6','#8b5cf6','#10b981'][i]} ariaLabel={`${['Email','In-App','SMS'][i]}: ${label}`} />
                </div>
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// TAB 5 — Subscription
// ════════════════════════════════════════════════════════════════
function SubscriptionTab() {
    const plans = [
        { id: 'free', name: 'Free', price: '0', period: '/mo', features: ['5 courses', '100 students', 'Basic analytics', 'Community support'], color: '#64748b' },
        { id: 'pro', name: 'Pro', price: '29', period: '/mo', features: ['Unlimited courses', '10,000 students', 'Advanced analytics', 'Priority support', 'Custom branding', 'AI tools'], color: '#3b82f6', popular: true },
        { id: 'enterprise', name: 'Enterprise', price: '99', period: '/mo', features: ['Everything in Pro', 'White-label platform', 'Dedicated account manager', 'SLA guarantee', 'Custom integrations'], color: '#8b5cf6' },
    ];

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {plans.map(plan => (
                    <div key={plan.id} style={{ ...T.card, padding: '24px 20px', borderTop: `3px solid ${plan.color}`, position: 'relative' }}>
                        {plan.popular && (
                            <span style={{ position: 'absolute', top: '-1px', right: '16px', background: plan.color, color: '#fff', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '0 0 8px 8px' }}>POPULAR</span>
                        )}
                        <div style={{ color: plan.color, fontSize: '13px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{plan.name}</div>
                        <div style={{ color: '#1e293b', fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                            ${plan.price}<span style={{ color: '#64748b', fontSize: '14px', fontWeight: '400' }}>{plan.period}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', margin: '16px 0 20px' }}>
                            {plan.features.map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px' }}>
                                    <Check size={13} color={plan.color} aria-hidden="true" /> {f}
                                </div>
                            ))}
                        </div>
                        <button style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid ${plan.color}40`, background: plan.popular ? `linear-gradient(135deg,#2563eb,#7c3aed)` : 'transparent', color: plan.popular ? '#fff' : plan.color, fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                            {plan.id === 'free' ? 'Current Plan' : 'Upgrade'}
                        </button>
                    </div>
                ))}
            </div>

            <Section title="Current Plan" icon={<CreditCard />}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>Free Plan</div>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>5 courses · 100 students · Basic analytics</div>
                    </div>
                    <button style={T.primaryBtn}><Zap size={14} /> Upgrade to Pro</button>
                </div>
            </Section>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT — InstructorSettings
// ════════════════════════════════════════════════════════════════
const TABS = [
    { key: 'profile',      label: 'Profile Info',      icon: <User size={15} /> },
    { key: 'security',     label: 'Security & Account', icon: <Shield size={15} /> },
    { key: 'preferences',  label: 'Preferences',        icon: <Settings size={15} /> },
    { key: 'notifications',label: 'Notifications',      icon: <Bell size={15} /> },
    { key: 'subscription', label: 'Subscription',       icon: <CreditCard size={15} /> },
];

export default function InstructorSettings({ user }) {
    const { colors, theme } = useTheme();
    const { updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // ── Dynamic design tokens based on theme ────
    const T = {
        page:   { fontFamily: "'Outfit', sans-serif" },
        card:   { background: colors.bgCard, backdropFilter: 'blur(14px)', border: `2px solid ${colors.border}`, borderRadius: '16px' },
        input:  { background: colors.bgInput, border: `2px solid ${colors.border}`, color: colors.text, padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
        select: { background: colors.bgInput, border: `2px solid ${colors.border}`, color: colors.text, padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
        lbl:    { color: colors.textMuted, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' },
        primaryBtn: { background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '7px' },
        ghostBtn:   { background: colors.bgInput, border: `2px solid ${colors.border}`, color: colors.primary, borderRadius: '10px', padding: '11px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '7px' },
        dangerBtn:  { background: theme === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2', border: `2px solid ${theme === 'dark' ? 'rgba(239,68,68,0.3)' : '#fecaca'}`, color: '#ef4444', borderRadius: '10px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '7px' },
        sectionHead: { color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' },
    };

    return (
        <div style={T.page}>
            {/* Page title */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ color: colors.text, fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>
                    Profile &amp; Account Settings{user?.fullName ? ` — ${user.fullName}` : ''}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Manage your instructor profile, security, preferences and subscription.</p>
            </div>

            {/* Tab strip */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '24px', borderBottom: `2px solid ${colors.border}`, overflowX: 'auto' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.key ? `2px solid ${colors.primary}` : `2px solid transparent`,
                            color: activeTab === tab.key ? colors.primary : colors.textMuted,
                            padding: '11px 18px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '-1px',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.15s',
                        }}
                        aria-selected={activeTab === tab.key}
                    >
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'profile'       && <ProfileTab       user={user} updateUser={updateUser} />}
            {activeTab === 'security'      && <SecurityTab      user={user} />}
            {activeTab === 'preferences'   && <PreferencesTab   user={user} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'subscription'  && <SubscriptionTab />}
        </div>
    );
}
