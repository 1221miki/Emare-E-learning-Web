import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { userService, uploadService } from '../../services/api';

// ── Reusable Toggle Switch ─────────────────────────────────
function Toggle({ checked, onChange }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: 44, height: 24, borderRadius: 999, cursor: 'pointer',
                background: checked ? '#3b82f6' : '#cbd5e1',
                position: 'relative', transition: 'background 0.25s',
                flexShrink: 0
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }} />
        </div>
    );
}

// ── Status Toast ───────────────────────────────────────────
function Toast({ message, type }) {
    if (!message) return null;
    const bg = type === 'error' ? '#fee2e2' : '#d1fae5';
    const color = type === 'error' ? '#991b1b' : '#064e3b';
    const border = type === 'error' ? '#fca5a5' : '#a7f3d0';
    return (
        <div style={{ padding: '14px 18px', borderRadius: 14, background: bg, color, border: `1px solid ${border}`, marginBottom: 20, fontWeight: 600, fontSize: 14 }}>
            {type === 'error' ? ' ' : ' '}{message}
        </div>
    );
}

export default function InstructorSettings() {
    const { colors, theme, setTheme } = useTheme();
    const { user, updateUser } = useAuth();
    const [active, setActive] = useState('profile');
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [saving, setSaving] = useState(false);
    const photoInputRef = useRef();

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
    };

    // ── Profile State ─────────────────────────────────────
    const [profile, setProfile] = useState({
        fullName: user?.fullName || '',
        title: user?.professionalTitle || '',
        email: user?.accountEmail || '',
        phone: user?.phoneNumber || '',
        bio: user?.biography || '',
        linkedIn: user?.linkedIn || '',
        portfolio: user?.portfolioUrl || '',
        currentInstitution: user?.institution || '',
        expertiseAreas: user?.expertiseAreas || '',
        language: user?.preferredLanguage || 'English',
        timeZone: 'Africa/Addis_Ababa',
        gradingSystem: 'Percentage',
        avatarUrl: user?.avatarUrl || '',
    });
    const updateProfile = (f, v) => setProfile(p => ({ ...p, [f]: v }));

    const saveProfile = async () => {
        setSaving(true);
        try {
            await userService.updateProfile({
                fullName: profile.fullName,
                professionalTitle: profile.title,
                phoneNumber: profile.phone,
                biography: profile.bio,
                linkedIn: profile.linkedIn,
                portfolioUrl: profile.portfolio,
                institution: profile.currentInstitution,
                expertiseAreas: profile.expertiseAreas,
                preferredLanguage: profile.language,
            });
            showToast('Profile saved successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await uploadService.uploadFile(fd);
            const url = data.url || data.fileUrl || data.data?.url;
            await userService.updateProfile({ avatarUrl: url });
            updateProfile('avatarUrl', url);
            // Propagate to AuthContext so Sidebar and all other avatar
            // locations re-render immediately without a page reload.
            updateUser({ avatarUrl: url });
            showToast('Profile photo updated!');
        } catch {
            showToast('Photo upload failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Security State ────────────────────────────────────
    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrent: false,
        showNew: false,
        is2FAEnabled: false,
        loginNotifEmail: true,
        loginNotifSMS: false,
    });
    const updateSecurity = (f, v) => setSecurity(p => ({ ...p, [f]: v }));

    const savePassword = async () => {
        if (security.newPassword !== security.confirmPassword) {
            showToast('New passwords do not match.', 'error'); return;
        }
        if (security.newPassword.length < 8) {
            showToast('Password must be at least 8 characters.', 'error'); return;
        }
        setSaving(true);
        try {
            await userService.updateProfile({
                currentPassword: security.currentPassword,
                newPassword: security.newPassword,
            });
            setSecurity(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
            showToast('Password changed successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to change password.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Preferences State ─────────────────────────────────
    const [prefs, setPrefs] = useState({
        theme: theme,
        language: 'English (US)',
        accent: 'Indigo',
        timeFormat: '12-hour',
        defaultView: 'Table',
        commTool: 'Integrated Internal Messaging',
        zoom: false, teams: false, meet: false,
        autoAccept: true,
        showStudentProgress: true,
        gradingSystem: 'Percentage',
        autoSchedule: 'Never',
        showSuggestedContent: true,
        hideArchived: true,
        prioritizeUnread: true,
        notifSummary: 'Real-time',
    });
    const updatePrefs = (f, v) => setPrefs(p => ({ ...p, [f]: v }));

    const switchTheme = (val) => {
        updatePrefs('theme', val);
        setTheme(val);
    };

    const savePreferences = async () => {
        setSaving(true);
        try {
            await userService.updateProfile({ preferredLanguage: prefs.language });
            showToast('Preferences saved!');
        } catch {
            showToast('Failed to save preferences.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Notifications State ───────────────────────────────
    const [notifs, setNotifs] = useState({
        newEnrollEmail: true, newEnrollApp: true,
        quizEmail: true, quizApp: false,
        assignEmail: true, assignApp: false,
        msgEmail: true, msgApp: true,
        summary: 'Real-time',
    });
    const updateNotif = (f, v) => setNotifs(p => ({ ...p, [f]: v }));

    const saveNotifications = async () => {
        setSaving(true);
        try {
            await userService.updateProfile({ notificationPrefs: notifs });
            showToast('Notification preferences saved!');
        } catch {
            showToast('Failed to save notifications.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Subscription ──────────────────────────────────────
    const subscription = {
        plan: 'Premium Instructor',
        renewDate: 'September 8, 2026',
        billingMethod: 'Visa ending 1234',
        status: 'Active',
    };

    // ── Styles ────────────────────────────────────────────
    const c = colors;
    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', system-ui, sans-serif", background: c.bg },
        main: { marginLeft: 260, padding: '32px 32px 60px', flex: 1, minHeight: '100vh' },
        card: { background: c.bgCard, borderRadius: 20, padding: 28, border: `1px solid ${c.border}`, boxShadow: '0 4px 24px rgba(15,23,42,0.06)' },
        row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
        row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 },
        field: { display: 'flex', flexDirection: 'column', gap: 8 },
        label: { fontSize: 13, fontWeight: 700, color: c.text },
        input: { padding: '11px 14px', borderRadius: 12, border: `1px solid ${c.border}`, background: c.bgInput || c.bg, color: c.text, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
        textarea: { padding: '11px 14px', borderRadius: 12, border: `1px solid ${c.border}`, background: c.bgInput || c.bg, color: c.text, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: 100, resize: 'vertical' },
        btn: (variant = 'primary') => ({
            padding: '11px 22px', borderRadius: 12, cursor: 'pointer',
            fontWeight: 700, fontSize: 14, transition: 'opacity 0.15s',
            background: variant === 'primary' ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : variant === 'danger' ? '#ef4444' : c.bg,
            color: variant === 'ghost' ? c.text : '#fff',
            border: variant === 'ghost' ? `1px solid ${c.border}` : 'none',
            opacity: saving ? 0.7 : 1,
        }),
        sectionTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: c.text },
        subText: { margin: '6px 0 0', color: c.textMuted, fontSize: 14, lineHeight: 1.6 },
        gap: (n = 20) => ({ display: 'grid', gap: n }),
        toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${c.border}` },
        chip: { padding: '6px 14px', borderRadius: 999, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 13, fontWeight: 600 },
    };

    const tabs = [
        { key: 'profile', label: '◉ Profile' },
        { key: 'security', label: '▣ Security' },
        { key: 'preferences', label: '◆ Preferences' },
        { key: 'notifications', label: '◈ Notifications' },
        { key: 'subscription', label: '◈ Subscription' },
    ];

    return (
        <div style={s.page}>
            <Sidebar />
            <main style={s.main}>
                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.text }}>◈️ Profile & Account Settings</h1>
                    <p style={{ margin: '6px 0 0', color: c.textMuted }}>Manage your instructor profile, preferences, security and notifications.</p>
                </div>

                <Toast message={toast.message} type={toast.type} />

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28, background: c.bgCard, padding: '10px 12px', borderRadius: 16, border: `1px solid ${c.border}` }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActive(t.key)} style={{
                            padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14, border: 'none',
                            background: active === t.key ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'transparent',
                            color: active === t.key ? '#fff' : c.textMuted,
                            transition: 'all 0.2s'
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* ── PROFILE TAB ─────────────────────────────── */}
                {active === 'profile' && (
                    <div style={s.gap(24)}>
                        {/* Avatar + Core fields */}
                        <div style={{ ...s.card, display: 'grid', gridTemplateColumns: '180px 1fr', gap: 28 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 140, height: 140, borderRadius: 20, overflow: 'hidden', border: `3px solid ${c.border}`, background: '#eef2ff' }}>
                                    {profile.avatarUrl
                                        ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff' }}>
                                            {(profile.fullName || 'I')[0].toUpperCase()}
                                        </div>
                                    }
                                </div>
                                <input type="file" accept="image/*" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoChange} />
                                <button onClick={() => photoInputRef.current?.click()} style={s.btn('primary')} disabled={saving}>
                                    ◇ Change Photo
                                </button>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, color: c.text, fontSize: 15 }}>{profile.fullName || 'Instructor'}</div>
                                    <div style={{ color: c.textMuted, fontSize: 13 }}>{profile.title}</div>
                                </div>
                            </div>

                            <div style={s.gap(16)}>
                                <h2 style={s.sectionTitle}>Personal Information</h2>
                                <div style={s.row2}>
                                    <div style={s.field}>
                                        <label style={s.label}>Full Name</label>
                                        <input style={s.input} value={profile.fullName} onChange={e => updateProfile('fullName', e.target.value)} placeholder="Your full name" />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Professional Title</label>
                                        <input style={s.input} value={profile.title} onChange={e => updateProfile('title', e.target.value)} placeholder="e.g. Senior MERN Instructor" />
                                    </div>
                                </div>
                                <div style={s.row2}>
                                    <div style={s.field}>
                                        <label style={s.label}>Email Address</label>
                                        <input style={s.input} type="email" value={profile.email} onChange={e => updateProfile('email', e.target.value)} placeholder="you@example.com" />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Phone Number</label>
                                        <input style={s.input} type="tel" value={profile.phone} onChange={e => updateProfile('phone', e.target.value)} placeholder="+251 9XX XXX XXX" />
                                    </div>
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Short Biography</label>
                                    <textarea style={s.textarea} value={profile.bio} onChange={e => updateProfile('bio', e.target.value)} placeholder="Tell students about yourself..." />
                                </div>
                            </div>
                        </div>

                        {/* Links + Expertise */}
                        <div style={{ ...s.card }}>
                            <h3 style={{ ...s.sectionTitle, fontSize: 17, marginBottom: 20 }}>Professional Links & Expertise</h3>
                            <div style={s.row2}>
                                <div style={s.field}>
                                    <label style={s.label}>LinkedIn Profile URL</label>
                                    <input style={s.input} value={profile.linkedIn} onChange={e => updateProfile('linkedIn', e.target.value)} placeholder="https://linkedin.com/in/..." />
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Portfolio Website</label>
                                    <input style={s.input} value={profile.portfolio} onChange={e => updateProfile('portfolio', e.target.value)} placeholder="https://myportfolio.com" />
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Current Institution</label>
                                    <input style={s.input} value={profile.currentInstitution} onChange={e => updateProfile('currentInstitution', e.target.value)} placeholder="University / Company" />
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Expertise Areas</label>
                                    <input style={s.input} value={profile.expertiseAreas} onChange={e => updateProfile('expertiseAreas', e.target.value)} placeholder="e.g. MERN, React, Python" />
                                </div>
                            </div>
                            {profile.expertiseAreas && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                                    {profile.expertiseAreas.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                        <span key={tag} style={s.chip}>{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Save */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={saveProfile} style={s.btn('primary')} disabled={saving}>
                                {saving ? '⏳ Saving...' : '▣ Save Profile'}
                            </button>
                            <button onClick={() => setProfile(p => ({ ...p }))} style={s.btn('ghost')}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* ── SECURITY TAB ─────────────────────────────── */}
                {active === 'security' && (
                    <div style={s.gap(24)}>
                        {/* Password Change */}
                        <div style={s.card}>
                            <h2 style={s.sectionTitle}>◈ Change Password</h2>
                            <p style={s.subText}>Choose a strong password with uppercase, lowercase, numbers and special characters.</p>
                            <div style={{ ...s.gap(16), marginTop: 20, maxWidth: 480 }}>
                                <div style={s.field}>
                                    <label style={s.label}>Current Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            style={s.input}
                                            type={security.showCurrent ? 'text' : 'password'}
                                            value={security.currentPassword}
                                            onChange={e => updateSecurity('currentPassword', e.target.value)}
                                            placeholder="••••••••"
                                        />
                                        <button onClick={() => updateSecurity('showCurrent', !security.showCurrent)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: 16 }}>
                                            {security.showCurrent ? '◎' : '◎️'}
                                        </button>
                                    </div>
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            style={s.input}
                                            type={security.showNew ? 'text' : 'password'}
                                            value={security.newPassword}
                                            onChange={e => updateSecurity('newPassword', e.target.value)}
                                            placeholder="Min. 8 chars"
                                        />
                                        <button onClick={() => updateSecurity('showNew', !security.showNew)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: 16 }}>
                                            {security.showNew ? '◎' : '◎️'}
                                        </button>
                                    </div>
                                    {/* Password strength bar */}
                                    {security.newPassword && (() => {
                                        const pw = security.newPassword;
                                        let strength = 0;
                                        if (pw.length >= 8) strength++;
                                        if (/[A-Z]/.test(pw)) strength++;
                                        if (/[0-9]/.test(pw)) strength++;
                                        if (/[!@#$%^&*]/.test(pw)) strength++;
                                        const colors2 = ['#ef4444','#f97316','#eab308','#22c55e'];
                                        const labels = ['Weak','Fair','Good','Strong'];
                                        return (
                                            <div style={{ marginTop: 8 }}>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {[0,1,2,3].map(i => (
                                                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < strength ? colors2[strength - 1] : c.border, transition: 'background 0.3s' }} />
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: 12, color: colors2[strength - 1] || c.textMuted, marginTop: 4, fontWeight: 600 }}>
                                                    {labels[strength - 1] || 'Too short'}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Confirm New Password</label>
                                    <input
                                        style={{ ...s.input, borderColor: security.confirmPassword && security.newPassword !== security.confirmPassword ? '#ef4444' : c.border }}
                                        type="password"
                                        value={security.confirmPassword}
                                        onChange={e => updateSecurity('confirmPassword', e.target.value)}
                                        placeholder="Repeat password"
                                    />
                                    {security.confirmPassword && security.newPassword !== security.confirmPassword && (
                                        <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>Passwords do not match</div>
                                    )}
                                </div>
                                <button onClick={savePassword} style={s.btn('primary')} disabled={saving || !security.currentPassword || !security.newPassword}>
                                    {saving ? '⏳ Updating...' : '▣ Update Password'}
                                </button>
                            </div>
                        </div>

                        {/* 2FA + Login Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div style={s.card}>
                                <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>Two-Factor Authentication</h3>
                                <p style={s.subText}>Add an extra layer of security to your account.</p>
                                <div style={{ ...s.toggleRow, marginTop: 20, borderBottom: 'none' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: c.text }}>Enable 2FA</div>
                                        <div style={{ color: c.textMuted, fontSize: 13 }}>Google Authenticator or SMS</div>
                                    </div>
                                    <Toggle checked={security.is2FAEnabled} onChange={v => updateSecurity('is2FAEnabled', v)} />
                                </div>
                                {security.is2FAEnabled && (
                                    <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                        <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}> 2FA is active. Your account is protected.</div>
                                        <button style={{ ...s.btn('ghost'), marginTop: 12, fontSize: 13, padding: '8px 16px' }}>Setup New App →</button>
                                    </div>
                                )}
                            </div>

                            <div style={s.card}>
                                <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>Login Notifications</h3>
                                <p style={s.subText}>Get alerted when someone logs into your account.</p>
                                <div style={{ ...s.gap(14), marginTop: 20 }}>
                                    <div style={s.toggleRow}>
                                        <span style={{ color: c.text, fontWeight: 600 }}> Email Alerts</span>
                                        <Toggle checked={security.loginNotifEmail} onChange={v => updateSecurity('loginNotifEmail', v)} />
                                    </div>
                                    <div style={{ ...s.toggleRow, borderBottom: 'none' }}>
                                        <span style={{ color: c.text, fontWeight: 600 }}>▢ SMS Alerts</span>
                                        <Toggle checked={security.loginNotifSMS} onChange={v => updateSecurity('loginNotifSMS', v)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div style={{ ...s.card, border: '1px solid #fca5a5' }}>
                            <h3 style={{ ...s.sectionTitle, fontSize: 17, color: '#ef4444' }}>️ Danger Zone</h3>
                            <p style={s.subText}>These actions are irreversible. Please proceed with caution.</p>
                            <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
                                <button style={s.btn('ghost')} onClick={() => showToast('Account data export requested. You will receive it by email within 24 hours.')}>
                                    ▤ Export My Data (PDF/JSON)
                                </button>
                                <button style={s.btn('danger')} onClick={() => {
                                    if (window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) {
                                        showToast('Account deletion request submitted. You will receive a confirmation email.', 'error');
                                    }
                                }}>
                                    ️ Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PREFERENCES TAB ──────────────────────────── */}
                {active === 'preferences' && (
                    <div style={s.gap(24)}>
                        {/* Theme */}
                        <div style={s.card}>
                            <h2 style={s.sectionTitle}>◆ Display & Appearance</h2>
                            <p style={s.subText}>Customize your workspace theme, language and time preferences.</p>
                            <div style={{ ...s.gap(20), marginTop: 20 }}>
                                <div style={s.field}>
                                    <label style={s.label}>Dashboard Theme</label>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        {[
                                            { val: 'light', label: '️ Light Mode' },
                                            { val: 'dark', label: ' Dark Mode' },
                                        ].map(t => (
                                            <button key={t.val} onClick={() => switchTheme(t.val)} style={{
                                                padding: '12px 24px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                                                border: `2px solid ${prefs.theme === t.val ? '#2563eb' : c.border}`,
                                                background: prefs.theme === t.val ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : c.bg,
                                                color: prefs.theme === t.val ? '#fff' : c.text,
                                                transform: prefs.theme === t.val ? 'scale(1.04)' : 'scale(1)',
                                                transition: 'all 0.2s',
                                            }}>{t.label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={s.row2}>
                                    <div style={s.field}>
                                        <label style={s.label}>Interface Language</label>
                                        <select style={s.input} value={prefs.language} onChange={e => updatePrefs('language', e.target.value)}>
                                            <option value="English (US)">English (US)</option>
                                            <option value="English (UK)">English (UK)</option>
                                            <option value="Amharic">አማርኛ (Amharic)</option>
                                            <option value="Afaan Oromo">Afaan Oromo</option>
                                            <option value="Tigrinya">ትግርኛ (Tigrinya)</option>
                                        </select>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Time Format</label>
                                        <select style={s.input} value={prefs.timeFormat} onChange={e => updatePrefs('timeFormat', e.target.value)}>
                                            <option value="12-hour">12-hour (AM/PM)</option>
                                            <option value="24-hour">24-hour</option>
                                        </select>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Default Course View</label>
                                        <select style={s.input} value={prefs.defaultView} onChange={e => updatePrefs('defaultView', e.target.value)}>
                                            <option>Table</option>
                                            <option>Grid</option>
                                            <option>List</option>
                                        </select>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Default Grading System</label>
                                        <select style={s.input} value={prefs.gradingSystem} onChange={e => updatePrefs('gradingSystem', e.target.value)}>
                                            <option>Percentage</option>
                                            <option>Letter Grade (A-F)</option>
                                            <option>Pass/Fail</option>
                                            <option>Points</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Communication Tools */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div style={s.card}>
                                <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>◈ Communication & Live Tools</h3>
                                <div style={{ ...s.gap(14), marginTop: 20 }}>
                                    <div style={s.field}>
                                        <label style={s.label}>Preferred Communication Tool</label>
                                        <select style={s.input} value={prefs.commTool} onChange={e => updatePrefs('commTool', e.target.value)}>
                                            <option>Integrated Internal Messaging</option>
                                            <option>External Email</option>
                                            <option>Slack Integration</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={s.label}>Live Class Integrations</label>
                                        <div style={{ ...s.gap(10), marginTop: 10 }}>
                                            {[
                                                { key: 'zoom', label: '▶ Zoom' },
                                                { key: 'teams', label: '◈ Microsoft Teams' },
                                                { key: 'meet', label: '▶ Google Meet' },
                                            ].map(tool => (
                                                <div key={tool.key} style={s.toggleRow}>
                                                    <span style={{ color: c.text, fontWeight: 600 }}>{tool.label}</span>
                                                    <Toggle checked={prefs[tool.key]} onChange={v => updatePrefs(tool.key, v)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={s.card}>
                                <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>▤ Teaching Preferences</h3>
                                <div style={{ ...s.gap(14), marginTop: 20 }}>
                                    {[
                                        { key: 'autoAccept', label: 'Auto-Accept Course Requests', desc: 'Automatically approve student enrollment requests' },
                                        { key: 'showStudentProgress', label: 'Show Student Progress', desc: 'Display progress bars in student list' },
                                        { key: 'showSuggestedContent', label: 'Show Suggested Content', desc: 'See AI course recommendations in dashboard' },
                                        { key: 'hideArchived', label: 'Hide Archived Courses', desc: 'Keep dashboard clean by hiding old courses' },
                                    ].map(item => (
                                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderBottom: `1px solid ${c.border}` }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: c.text, fontSize: 14 }}>{item.label}</div>
                                                <div style={{ color: c.textMuted, fontSize: 12 }}>{item.desc}</div>
                                            </div>
                                            <Toggle checked={prefs[item.key]} onChange={v => updatePrefs(item.key, v)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={savePreferences} style={s.btn('primary')} disabled={saving}>
                                {saving ? '⏳ Saving...' : '▣ Save Preferences'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── NOTIFICATIONS TAB ────────────────────────── */}
                {active === 'notifications' && (
                    <div style={s.gap(24)}>
                        <div style={s.card}>
                            <h2 style={s.sectionTitle}>◈ Notification Preferences</h2>
                            <p style={s.subText}>Choose how you want to be notified about activity in your courses.</p>

                            {/* Table header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 14, marginTop: 24, padding: '10px 0', borderBottom: `2px solid ${c.border}` }}>
                                <div style={{ fontWeight: 700, color: c.textMuted, fontSize: 13 }}>Event</div>
                                <div style={{ fontWeight: 700, color: c.textMuted, fontSize: 13, textAlign: 'center' }}> Email</div>
                                <div style={{ fontWeight: 700, color: c.textMuted, fontSize: 13, textAlign: 'center' }}>▢ In-App</div>
                            </div>

                            {[
                                { label: '◈ New Student Enrollment', desc: 'When a student enrolls in your course', emailKey: 'newEnrollEmail', appKey: 'newEnrollApp' },
                                { label: '▤ Quiz Submission', desc: 'When a student submits a quiz', emailKey: 'quizEmail', appKey: 'quizApp' },
                                { label: '▦ Assignment Deadlines', desc: 'Reminders 24h before assignments due', emailKey: 'assignEmail', appKey: 'assignApp' },
                                { label: '◈ Student Messages', desc: 'New messages from enrolled students', emailKey: 'msgEmail', appKey: 'msgApp' },
                            ].map(row => (
                                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 14, padding: '16px 0', borderBottom: `1px solid ${c.border}`, alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: c.text }}>{row.label}</div>
                                        <div style={{ color: c.textMuted, fontSize: 13 }}>{row.desc}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <Toggle checked={notifs[row.emailKey]} onChange={v => updateNotif(row.emailKey, v)} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <Toggle checked={notifs[row.appKey]} onChange={v => updateNotif(row.appKey, v)} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={s.card}>
                            <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>▥ Summary Delivery</h3>
                            <p style={s.subText}>How often do you want a digest of your course activity?</p>
                            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                                {['Real-time', 'Daily Digest', 'Weekly Summary', 'Never'].map(opt => (
                                    <button key={opt} onClick={() => updateNotif('summary', opt)} style={{
                                        padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                                        border: `2px solid ${notifs.summary === opt ? '#2563eb' : c.border}`,
                                        background: notifs.summary === opt ? '#eff6ff' : c.bg,
                                        color: notifs.summary === opt ? '#1d4ed8' : c.text,
                                        transition: 'all 0.2s'
                                    }}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={saveNotifications} style={s.btn('primary')} disabled={saving}>
                                {saving ? '⏳ Saving...' : '▣ Save Notifications'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SUBSCRIPTION TAB ─────────────────────────── */}
                {active === 'subscription' && (
                    <div style={s.gap(24)}>
                        {/* Plan Card */}
                        <div style={{ ...s.card, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>CURRENT PLAN</div>
                                    <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0 }}> {subscription.plan}</h2>
                                    <p style={{ color: '#bfdbfe', marginTop: 8, fontSize: 14 }}>Renews on {subscription.renewDate} · {subscription.billingMethod}</p>
                                </div>
                                <div style={{ background: '#22c55e', color: '#fff', fontWeight: 800, padding: '8px 22px', borderRadius: 999, fontSize: 14 }}>
                                     {subscription.status}
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div style={s.card}>
                            <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>What's included in Premium</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
                                {[
                                    ' Unlimited course creation',
                                    ' Advanced analytics dashboard',
                                    ' Student progress tracking',
                                    ' Certificate generation',
                                    ' Live session integrations',
                                    ' Priority support',
                                    ' AI-powered course assistant',
                                    ' Revenue sharing program',
                                ].map(f => (
                                    <div key={f} style={{ color: c.text, fontWeight: 600, fontSize: 14, padding: '10px 0', borderBottom: `1px solid ${c.border}` }}>
                                        {f}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Billing Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div style={s.card}>
                                <h3 style={{ ...s.sectionTitle, fontSize: 17 }}>◈ Billing Method</h3>
                                <p style={s.subText}>{subscription.billingMethod}</p>
                                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                                    <button style={s.btn('primary')} onClick={() => showToast('Redirecting to billing management...')}>Update Payment</button>
                                    <button style={s.btn('ghost')} onClick={() => showToast('Invoice history downloaded.')}>Download Invoices</button>
                                </div>
                            </div>
                            <div style={{ ...s.card, border: '1px solid #fca5a5' }}>
                                <h3 style={{ ...s.sectionTitle, fontSize: 17, color: '#ef4444' }}>Cancel Subscription</h3>
                                <p style={s.subText}>Cancelling will downgrade your account to the free tier at the end of the billing period.</p>
                                <button style={{ ...s.btn('danger'), marginTop: 20 }} onClick={() => {
                                    if (window.confirm('Are you sure you want to cancel your subscription?')) {
                                        showToast('Cancellation request submitted. Your premium access will remain until the billing period ends.', 'error');
                                    }
                                }}>Cancel Subscription</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
