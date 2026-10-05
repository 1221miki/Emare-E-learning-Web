import React, { useState, useRef, useEffect } from 'react';
import { User, ShieldCheck, KeyRound, Camera, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { userService, uploadService } from '../../services/api';
import TwoFactorSection from '../dashboard/tabs/TwoFactorSection';

export default function AdminProfilePanel() {
    const { user, updateUser } = useAuth();
    const { colors, theme } = useTheme();
    const { t } = useLanguage();

    const fileInputRef = useRef(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);

    const [activeSubTab, setActiveSubTab] = useState('personal');

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    };

    // Profile state
    const [profile, setProfile] = useState({
        fullName: user?.fullName || '',
        username: user?.username || '',
        email: user?.accountEmail || '',
        phone: user?.phoneNumber || '',
        title: user?.professionalTitle || 'System Administrator',
        biography: user?.biography || '',
        language: user?.preferredLanguage || 'en',
        avatarUrl: user?.avatarUrl || '',
    });

    useEffect(() => {
        if (user) {
            setProfile(p => ({
                ...p,
                fullName: user.fullName || p.fullName,
                username: user.username || p.username,
                email: user.accountEmail || p.email,
                phone: user.phoneNumber || p.phone,
                title: user.professionalTitle || p.title,
                biography: user.biography || p.biography,
                language: user.preferredLanguage || p.language,
                avatarUrl: user.avatarUrl || p.avatarUrl,
            }));
            setTwoFactorEnabled(user.twoFactorEnabled || false);
        }
    }, [user]);

    // Security state
    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrent: false,
        showNew: false,
        showConfirm: false,
    });

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('targetType', 'avatar');

            const uploadRes = await uploadService.uploadFile(formData);
            const newUrl = uploadRes.data?.data?.url || uploadRes.data?.url;

            await userService.updateProfile({ avatarUrl: newUrl });
            setProfile(prev => ({ ...prev, avatarUrl: newUrl }));
            updateUser({ avatarUrl: newUrl });
            showToast('Profile photo updated successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload photo.', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const payload = {
                fullName: profile.fullName,
                username: profile.username,
                phoneNumber: profile.phone,
                professionalTitle: profile.title,
                biography: profile.biography,
                preferredLanguage: profile.language,
            };

            await userService.updateProfile(payload);
            updateUser(payload);
            showToast('Admin profile updated successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (!security.currentPassword) {
            showToast('Please enter your current password.', 'error');
            return;
        }
        if (security.newPassword !== security.confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }
        if (security.newPassword.length < 8) {
            showToast('New password must be at least 8 characters long.', 'error');
            return;
        }

        setSavingPassword(true);
        try {
            await userService.updateProfile({
                currentPassword: security.currentPassword,
                newPassword: security.newPassword,
            });
            setSecurity({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
                showCurrent: false,
                showNew: false,
                showConfirm: false,
            });
            showToast('Password changed successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update password.', 'error');
        } finally {
            setSavingPassword(false);
        }
    };

    const s = {
        card: {
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '24px',
        },
        headerBox: {
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
        },
        avatarWrapper: {
            position: 'relative',
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '36px',
            fontWeight: '800',
            cursor: 'pointer',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
        },
        avatarImg: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        },
        cameraBadge: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
        },
        title: {
            fontSize: '24px',
            fontWeight: '800',
            color: colors.text,
            margin: '0 0 4px',
        },
        subtitle: {
            color: colors.textMuted,
            fontSize: '14px',
            margin: 0,
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            background: 'rgba(34, 197, 94, 0.15)',
            color: colors.primary,
            marginTop: '8px',
        },
        subTabNav: {
            display: 'flex',
            gap: '8px',
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: '24px',
        },
        subTabBtn: (active) => ({
            background: 'none',
            border: 'none',
            borderBottom: active ? `3px solid ${colors.primary}` : '3px solid transparent',
            color: active ? colors.primary : colors.textMuted,
            padding: '12px 18px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
        }),
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
        },
        field: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        },
        label: {
            fontSize: '13px',
            fontWeight: '700',
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
        },
        input: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            background: colors.bgInput || colors.bg,
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            outline: 'none',
            boxSizing: 'border-box',
        },
        textarea: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            background: colors.bgInput || colors.bg,
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            outline: 'none',
            boxSizing: 'border-box',
            minHeight: '100px',
            resize: 'vertical',
        },
        submitBtn: {
            background: colors.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 28px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
        },
        toast: {
            padding: '12px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: toast.type === 'error' ? '#ef4444' : colors.primary,
            border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
        },
        eyeBtn: {
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
        },
    };

    return (
        <div>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '26px', fontWeight: '900', color: colors.text, margin: '0 0 6px' }}>Admin Profile Settings</h2>
                <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>Manage your administrator profile details, security credentials, and two-factor authentication.</p>
            </div>

            {toast.message && (
                <div style={s.toast}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Profile Overview Card */}
            <div style={s.card}>
                <div style={s.headerBox}>
                    <div style={s.avatarWrapper} onClick={() => fileInputRef.current?.click()} title="Click to change profile picture">
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.fullName} style={s.avatarImg} crossOrigin="anonymous" />
                        ) : (
                            <span>{profile.fullName?.[0]?.toUpperCase() || 'A'}</span>
                        )}
                        <div style={s.cameraBadge}>
                            {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" style={{ display: 'none' }} />

                    <div style={{ flex: 1 }}>
                        <h3 style={s.title}>{profile.fullName || 'Administrator'}</h3>
                        <p style={s.subtitle}>{profile.email} — @{profile.username || 'admin'}</p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={s.badge}>🛡️ System Administrator</span>
                            {user?.creationTimestamp && (
                                <span style={{ ...s.badge, background: `${colors.textMuted}15`, color: colors.textMuted }}>
                                    Joined {new Date(user.creationTimestamp).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub Tabs */}
            <div style={s.subTabNav}>
                <button style={s.subTabBtn(activeSubTab === 'personal')} onClick={() => setActiveSubTab('personal')}>
                    <User size={16} /> Personal Details
                </button>
                <button style={s.subTabBtn(activeSubTab === 'security')} onClick={() => setActiveSubTab('security')}>
                    <KeyRound size={16} /> Password & Security
                </button>
                <button style={s.subTabBtn(activeSubTab === '2fa')} onClick={() => setActiveSubTab('2fa')}>
                    <ShieldCheck size={16} /> Two-Factor Auth (2FA)
                </button>
            </div>

            {/* Sub Tab: Personal Details */}
            {activeSubTab === 'personal' && (
                <div style={s.card}>
                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={s.formGrid}>
                            <div style={s.field}>
                                <label style={s.label}>Full Name</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.fullName}
                                    onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                                    placeholder="Admin Full Name"
                                    required
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Username</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.username}
                                    onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                                    placeholder="admin_username"
                                    required
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Account Email (Read Only)</label>
                                <input
                                    type="email"
                                    style={{ ...s.input, opacity: 0.7, cursor: 'not-allowed' }}
                                    value={profile.email}
                                    readOnly
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Phone Number</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.phone}
                                    onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="0912345678"
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Professional Title</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.title}
                                    onChange={e => setProfile(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Lead Administrator & Platform Architect"
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>Preferred Language</label>
                                <select
                                    style={s.input}
                                    value={profile.language}
                                    onChange={e => setProfile(p => ({ ...p, language: e.target.value }))}
                                >
                                    <option value="en">English</option>
                                    <option value="am">አማርኛ (Amharic)</option>
                                    <option value="om">Afaan Oromoo</option>
                                    <option value="ti">ትግርኛ (Tigrinya)</option>
                                </select>
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>Biography / Administrator Bio</label>
                            <textarea
                                style={s.textarea}
                                value={profile.biography}
                                onChange={e => setProfile(p => ({ ...p, biography: e.target.value }))}
                                placeholder="Describe your administrative role or details..."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="submit" style={s.submitBtn} disabled={savingProfile}>
                                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Sub Tab: Password & Security */}
            {activeSubTab === 'security' && (
                <div style={s.card}>
                    <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                        <div style={s.field}>
                            <label style={s.label}>Current Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={security.showCurrent ? 'text' : 'password'}
                                    style={s.input}
                                    value={security.currentPassword}
                                    onChange={e => setSecurity(p => ({ ...p, currentPassword: e.target.value }))}
                                    placeholder="Enter your current password"
                                    required
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setSecurity(p => ({ ...p, showCurrent: !p.showCurrent }))}
                                >
                                    {security.showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={security.showNew ? 'text' : 'password'}
                                    style={s.input}
                                    value={security.newPassword}
                                    onChange={e => setSecurity(p => ({ ...p, newPassword: e.target.value }))}
                                    placeholder="At least 8 characters"
                                    required
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setSecurity(p => ({ ...p, showNew: !p.showNew }))}
                                >
                                    {security.showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>Confirm New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={security.showConfirm ? 'text' : 'password'}
                                    style={s.input}
                                    value={security.confirmPassword}
                                    onChange={e => setSecurity(p => ({ ...p, confirmPassword: e.target.value }))}
                                    placeholder="Re-enter new password"
                                    required
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setSecurity(p => ({ ...p, showConfirm: !p.showConfirm }))}
                                >
                                    {security.showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                            <button type="submit" style={s.submitBtn} disabled={savingPassword}>
                                {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                                {savingPassword ? 'Updating Password...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Sub Tab: Two-Factor Auth */}
            {activeSubTab === '2fa' && (
                <div style={s.card}>
                    <TwoFactorSection
                        user={user}
                        twoFactorEnabled={twoFactorEnabled}
                        setTwoFactorEnabled={setTwoFactorEnabled}
                        colors={colors}
                        styles={{}}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
}
