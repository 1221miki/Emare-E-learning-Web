import React, { useState, useRef, useEffect } from 'react';
import { User, ShieldCheck, KeyRound, Camera, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, codeForLanguage } from '../../context/LanguageContext.jsx';
import { userService, uploadService } from '../../services/api';
import TwoFactorSection from '../dashboard/tabs/TwoFactorSection';

export default function AdminProfilePanel() {
    const { user, updateUser } = useAuth();
    const { colors, theme } = useTheme();
    const { language, changeLanguage, t } = useLanguage();

    const fileInputRef = useRef(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
    const [phoneError, setPhoneError] = useState('');

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
        language: codeForLanguage(user?.preferredLanguage || language || 'en'),
        avatarUrl: user?.avatarUrl || '',
    });

    useEffect(() => {
        if (user) {
            const userLangCode = codeForLanguage(user.preferredLanguage || language || 'en');
            setProfile(p => ({
                ...p,
                fullName: user.fullName || p.fullName,
                username: user.username || p.username,
                email: user.accountEmail || p.email,
                phone: user.phoneNumber || p.phone,
                title: user.professionalTitle || p.title,
                biography: user.biography || p.biography,
                language: userLangCode,
                avatarUrl: user.avatarUrl || p.avatarUrl,
            }));
            setTwoFactorEnabled(user.twoFactorEnabled || false);

            if (user.preferredLanguage) {
                changeLanguage(user.preferredLanguage);
            }
        }
    }, [user, changeLanguage]);

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
            showToast(t('admin_toast_avatar_success') || 'Profile photo updated successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || t('admin_toast_avatar_error') || 'Failed to upload photo.', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Phone validation: exactly 10 digits starting with 09 or 07
    const validatePhone = (num) => {
        const phoneRegex = /^(09|07)\d{8}$/;
        return phoneRegex.test(String(num || '').trim());
    };

    const handlePhoneChange = (e) => {
        let raw = e.target.value.trim();
        // Support copying or typing +251 or 251 Ethiopian international prefix
        if (raw.startsWith('+251')) raw = '0' + raw.slice(4);
        else if (raw.startsWith('251') && raw.length >= 12) raw = '0' + raw.slice(3);
        const digits = raw.replace(/\D/g, '').slice(0, 10);

        setProfile(p => ({ ...p, phone: digits }));

        if (!digits) {
            setPhoneError(t('admin_err_phone_invalid') || 'Phone number must be exactly 10 digits starting with 09 or 07 (e.g., 0912345678 or 0712345678).');
        } else if (digits.length >= 2 && !digits.startsWith('09') && !digits.startsWith('07')) {
            setPhoneError(t('admin_err_phone_invalid') || 'Phone number must be exactly 10 digits starting with 09 or 07 (e.g., 0912345678 or 0712345678).');
        } else if (digits.length < 10) {
            setPhoneError(t('admin_err_phone_invalid') || 'Phone number must be exactly 10 digits starting with 09 or 07 (e.g., 0912345678 or 0712345678).');
        } else if (validatePhone(digits)) {
            setPhoneError('');
        }
    };

    const handleLanguageSelect = (e) => {
        const newLang = e.target.value;
        setProfile(p => ({ ...p, language: newLang }));
        changeLanguage(newLang);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();

        // Strict Phone validation
        if (!validatePhone(profile.phone)) {
            const errorMsg = t('admin_err_phone_invalid') || 'Phone number must be exactly 10 digits starting with 09 or 07 (e.g., 0912345678 or 0712345678).';
            setPhoneError(errorMsg);
            showToast(errorMsg, 'error');
            return;
        }
        setPhoneError('');

        setSavingProfile(true);
        try {
            const payload = {
                fullName: profile.fullName,
                username: profile.username,
                phoneNumber: profile.phone.trim(),
                professionalTitle: profile.title,
                biography: profile.biography,
                preferredLanguage: profile.language,
            };

            await userService.updateProfile(payload);
            updateUser(payload);
            changeLanguage(profile.language);
            showToast(t('admin_toast_profile_success') || 'Admin profile updated successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || t('admin_toast_profile_error') || 'Failed to update profile.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (!security.currentPassword) {
            showToast(t('admin_err_pw_current_required') || 'Please enter your current password.', 'error');
            return;
        }
        if (security.newPassword !== security.confirmPassword) {
            showToast(t('admin_err_pw_mismatch') || 'New passwords do not match.', 'error');
            return;
        }
        if (security.newPassword.length < 8) {
            showToast(t('admin_err_pw_length') || 'New password must be at least 8 characters long.', 'error');
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
            showToast(t('admin_toast_pw_success') || 'Password changed successfully!');
        } catch (err) {
            showToast(err.response?.data?.message || t('admin_toast_pw_error') || 'Failed to update password.', 'error');
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

    const isPhoneValid = validatePhone(profile.phone);

    return (
        <div>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '26px', fontWeight: '900', color: colors.text, margin: '0 0 6px' }}>
                    {t('admin_profile_title') || 'Admin Profile Settings'}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                    {t('admin_profile_subtitle') || 'Manage your administrator profile details, security credentials, and two-factor authentication.'}
                </p>
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
                    <div style={s.avatarWrapper} onClick={() => fileInputRef.current?.click()} title={t('admin_avatar_change_hint') || 'Click to change profile picture'}>
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
                        <h3 style={s.title}>{profile.fullName || t('admin_role_system_admin') || 'Administrator'}</h3>
                        <p style={s.subtitle}>{profile.email} — @{profile.username || 'admin'}</p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={s.badge}>🛡️ {t('admin_role_system_admin') || 'System Administrator'}</span>
                            {user?.creationTimestamp && (
                                <span style={{ ...s.badge, background: `${colors.textMuted}15`, color: colors.textMuted }}>
                                    {t('admin_joined') || 'Joined'} {new Date(user.creationTimestamp).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub Tabs */}
            <div style={s.subTabNav}>
                <button style={s.subTabBtn(activeSubTab === 'personal')} onClick={() => setActiveSubTab('personal')}>
                    <User size={16} /> {t('admin_tab_personal') || 'Personal Details'}
                </button>
                <button style={s.subTabBtn(activeSubTab === 'security')} onClick={() => setActiveSubTab('security')}>
                    <KeyRound size={16} /> {t('admin_tab_security') || 'Password & Security'}
                </button>
                <button style={s.subTabBtn(activeSubTab === '2fa')} onClick={() => setActiveSubTab('2fa')}>
                    <ShieldCheck size={16} /> {t('admin_tab_2fa') || 'Two-Factor Auth (2FA)'}
                </button>
            </div>

            {/* Sub Tab: Personal Details */}
            {activeSubTab === 'personal' && (
                <div style={s.card}>
                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={s.formGrid}>
                            <div style={s.field}>
                                <label style={s.label}>{t('admin_lbl_fullname') || 'Full Name'}</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.fullName}
                                    onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                                    placeholder={t('admin_ph_fullname') || 'Admin Full Name'}
                                    required
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>{t('lbl_username') || 'Username'}</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.username}
                                    onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                                    placeholder={t('admin_ph_username') || 'admin_username'}
                                    required
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>{t('admin_lbl_email_readonly') || 'Account Email (Read Only)'}</label>
                                <input
                                    type="email"
                                    style={{ ...s.input, opacity: 0.7, cursor: 'not-allowed' }}
                                    value={profile.email}
                                    readOnly
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>
                                    {t('admin_lbl_phone') || 'Phone Number'}
                                    <span style={{ fontSize: '11px', color: colors.textMuted, marginLeft: '6px', textTransform: 'none', fontWeight: '500' }}>
                                        (10 digits: 09... / 07...)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={10}
                                    style={{
                                        ...s.input,
                                        border: phoneError 
                                            ? '1.5px solid #ef4444' 
                                            : (isPhoneValid ? '1.5px solid #22c55e' : `1px solid ${colors.border}`),
                                    }}
                                    value={profile.phone}
                                    onChange={handlePhoneChange}
                                    placeholder={t('admin_ph_phone') || '0912345678'}
                                    required
                                />
                                {phoneError ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>
                                        <AlertCircle size={14} />
                                        <span>{phoneError}</span>
                                    </div>
                                ) : isPhoneValid ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>
                                        <CheckCircle2 size={14} />
                                        <span>{profile.phone.startsWith('09') ? 'Ethio Telecom (09)' : 'Safaricom / Telecom (07)'}</span>
                                    </div>
                                ) : null}
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>{t('admin_lbl_title') || 'Professional Title'}</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    value={profile.title}
                                    onChange={e => setProfile(p => ({ ...p, title: e.target.value }))}
                                    placeholder={t('admin_ph_title') || 'e.g. Lead Administrator & Platform Architect'}
                                />
                            </div>

                            <div style={s.field}>
                                <label style={s.label}>{t('admin_lbl_language') || 'Preferred Language'}</label>
                                <select
                                    style={s.input}
                                    value={profile.language}
                                    onChange={handleLanguageSelect}
                                >
                                    <option value="en">English</option>
                                    <option value="am">አማርኛ (Amharic)</option>
                                    <option value="om">Afaan Oromoo (Oromo)</option>
                                    <option value="ti">ትግርኛ (Tigrinya)</option>
                                </select>
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>{t('admin_lbl_bio') || 'Biography / Administrator Bio'}</label>
                            <textarea
                                style={s.textarea}
                                value={profile.biography}
                                onChange={e => setProfile(p => ({ ...p, biography: e.target.value }))}
                                placeholder={t('admin_ph_bio') || 'Describe your administrative role or details...'}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="submit" style={s.submitBtn} disabled={savingProfile}>
                                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {savingProfile ? (t('admin_btn_saving') || 'Saving Changes...') : (t('admin_btn_save') || 'Save Profile Changes')}
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
                            <label style={s.label}>{t('admin_lbl_current_pw') || 'Current Password'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={security.showCurrent ? 'text' : 'password'}
                                    style={s.input}
                                    value={security.currentPassword}
                                    onChange={e => setSecurity(p => ({ ...p, currentPassword: e.target.value }))}
                                    placeholder={t('admin_ph_current_pw') || 'Enter your current password'}
                                    required
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setSecurity(p => ({ ...p, showCurrent: !p.showCurrent }))}
                                    aria-label={security.showCurrent ? (t('hide_password') || 'Hide password') : (t('show_password') || 'Show password')}
                                >
                                    {security.showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>{t('admin_lbl_new_pw') || 'New Password'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={security.showNew ? 'text' : 'password'}
                                    style={s.input}
                                    value={security.newPassword}
                                    onChange={e => setSecurity(p => ({ ...p, newPassword: e.target.value }))}
                                    placeholder={t('admin_ph_new_pw') || 'At least 8 characters'}
                                    required
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setSecurity(p => ({ ...p, showNew: !p.showNew }))}
                                    aria-label={security.showNew ? (t('hide_password') || 'Hide password') : (t('show_password') || 'Show password')}
                                >
                                    {security.showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>{t('admin_lbl_confirm_pw') || 'Confirm New Password'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={security.showConfirm ? 'text' : 'password'}
                                    style={s.input}
                                    value={security.confirmPassword}
                                    onChange={e => setSecurity(p => ({ ...p, confirmPassword: e.target.value }))}
                                    placeholder={t('admin_ph_confirm_pw') || 'Re-enter new password'}
                                    required
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setSecurity(p => ({ ...p, showConfirm: !p.showConfirm }))}
                                    aria-label={security.showConfirm ? (t('hide_password') || 'Hide password') : (t('show_password') || 'Show password')}
                                >
                                    {security.showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                            <button type="submit" style={s.submitBtn} disabled={savingPassword}>
                                {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                                {savingPassword ? (t('admin_btn_updating_pw') || 'Updating Password...') : (t('admin_btn_update_pw') || 'Update Password')}
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
                        styles={{
                            formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
                            label: s.label,
                            input: s.input,
                            successAlert: { background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: colors.primary, padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }
                        }}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
}
