import React, { useMemo, useState } from 'react';
import { User, ShieldCheck, Settings, Camera, Sun, Moon, KeyRound, Smartphone, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { userService } from '../../../services/api';

const WARN = '#f59e0b';
const DANGER = '#ef4444';

export default function SettingsTab(dash) {
    const { user, theme, toggleTheme, colors, firstName, setFirstName, lastName, setLastName, username, setUsername, profileEmail, setProfileEmail, contactPhone, setContactPhone, gender, setGender, dateOfBirth, setDateOfBirth, country, setCountry, city, setCity, address, setAddress, biography, setBiography, occupation, setOccupation, company, setCompany, website, setWebsite, linkedInUrl, setLinkedInUrl, githubUrl, setGithubUrl, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, twoFactorEnabled, setTwoFactorEnabled, avatarUrl, prefLanguage, setPrefLanguage, notifPreferences, setNotifPreferences, isPublicProfile, setIsPublicProfile, profileSuccessMsg, avatarUploading, settingsSectionTab, setSettingsSectionTab, handleAvatarFileUpload, handleProfileUpdate, studyTargetHours, setStudyTargetHours, styles } = dash;
    const { changeLanguage, t } = useLanguage();

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const eyeToggleStyle = {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: colors.textMuted
    };

    const completion = useMemo(() => {
        const fields = [firstName, lastName, username, profileEmail, contactPhone, country, city, occupation, biography, website, githubUrl];
        const filled = fields.filter(f => f && String(f).trim()).length;
        return fields.length ? Math.round((filled / fields.length) * 100) : 0;
    }, [firstName, lastName, username, profileEmail, contactPhone, country, city, occupation, biography, website, githubUrl]);

    // Instantly switch the whole platform UI language, persist to localStorage
    // (handled inside LanguageContext) and sync to the backend user profile.
    const handleLanguageChange = (e) => {
        const name = e.target.value;
        setPrefLanguage(name);
        changeLanguage(name);
        userService.updateProfile({ preferredLanguage: name }).catch(() => { /* offline — localStorage still remembers the choice */ });
    };

    return (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>{t('settings_title')}</h2>
                <p style={styles.tabSubtitle}>{t('settings_subtitle')}</p>
            </div>

            {/* Profile Completion Card */}
            <div style={{ ...styles.panelCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `conic-gradient(${colors.primary} ${completion * 3.6}deg, ${colors.bgInput} 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', color: colors.primary }}>
                            {completion}%
                        </div>
                    </div>
                    <div>
                        <span style={{ display: 'block', color: colors.text, fontSize: '16px', fontWeight: '800' }}>{t('profile_completion')}</span>
                        <span style={{ display: 'block', color: colors.textMuted, fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
                            {completion === 100 ? t('profile_completion_done') : t('profile_completion_hint')}
                        </span>
                    </div>
                </div>
                <button type="button" onClick={() => setSettingsSectionTab('personal')} style={{ ...styles.resumeBtn, fontSize: '13px' }}>{t('btn_complete_profile')}</button>
            </div>

            {/* Inner Sub-Navigation for Settings */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '32px', gap: '8px', flexWrap: 'wrap' }}>
                {[
                    { key: 'personal', label: t('tab_personal'), icon: <User size={15} aria-hidden="true" /> },
                    { key: 'security', label: t('tab_security'), icon: <ShieldCheck size={15} aria-hidden="true" /> },
                    { key: 'preferences', label: t('tab_preferences'), icon: <Settings size={15} aria-hidden="true" /> }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSettingsSectionTab(tab.key)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: settingsSectionTab === tab.key ? `3px solid ${colors.primary}` : '3px solid transparent',
                            color: settingsSectionTab === tab.key ? colors.primary : colors.textMuted,
                            padding: '12px 20px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.panelCard}>
                {profileSuccessMsg && <div style={styles.successAlert}>{profileSuccessMsg}</div>}
                
                <form onSubmit={handleProfileUpdate}>
                    
                    {/* SECTION 1: PERSONAL INFORMATION */}
                    {settingsSectionTab === 'personal' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>{t('section_avatar')}</h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: '800', overflow: 'hidden' }}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        firstName?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || 'S'
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>{t('avatar_upload_title')}</span>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('avatar_upload_hint')}</span>
                                    <label style={{ ...styles.resumeBtn, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content', padding: '8px 16px', fontSize: '12px' }}>
                                        <Camera size={14} aria-hidden="true" />
                                        {avatarUploading ? t('avatar_uploading') : t('btn_choose_image')}
                                        <input type="file" accept="image/*" onChange={handleAvatarFileUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>{t('section_identity')}</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_first_name')}</label>
                                    <input type="text" style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Abebe" required />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_last_name')}</label>
                                    <input type="text" style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Bikila" required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_username')}</label>
                                    <input type="text" style={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. abebe_dev" required />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_email')}</label>
                                    <input type="email" style={styles.input} value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="student@example.com" required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_phone')}</label>
                                    <input type="tel" style={styles.input} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+251 91 123 4567" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_gender')}</label>
                                    <select style={styles.select} value={gender} onChange={e => setGender(e.target.value)}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_dob')}</label>
                                    <input type="date" style={styles.input} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_country')}</label>
                                    <input type="text" style={styles.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="Ethiopia" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_city')}</label>
                                    <input type="text" style={styles.input} value={city} onChange={e => setCity(e.target.value)} placeholder="Addis Ababa" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_address')}</label>
                                    <input type="text" style={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Bole Subcity" />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>{t('lbl_bio')}</label>
                                <textarea 
                                    rows="4" 
                                    style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }} 
                                    value={biography} 
                                    onChange={e => setBiography(e.target.value)} 
                                    placeholder="Write a brief bio about your learning goals and tech background..." 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_occupation')}</label>
                                    <input type="text" style={styles.input} value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Software Engineer / Student" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_company')}</label>
                                    <input type="text" style={styles.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Emare ICT Hub" />
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>{t('section_social')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_website')}</label>
                                    <input type="url" style={styles.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://myportfolio.com" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_linkedin')}</label>
                                    <input type="url" style={styles.input} value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_github')}</label>
                                    <input type="url" style={styles.input} value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: SECURITY & 2FA */}
                    {settingsSectionTab === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>{t('section_password')}</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_current_pw')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showCurrentPassword ? 'text' : 'password'} style={{ ...styles.input, paddingRight: '40px' }} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            style={eyeToggleStyle}
                                            aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                        >
                                            {showCurrentPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                        </button>
                                    </div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_new_pw')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showNewPassword ? 'text' : 'password'} style={{ ...styles.input, paddingRight: '40px' }} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            style={eyeToggleStyle}
                                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                        >
                                            {showNewPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    {newPassword && (
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: newPassword.length < 8 ? DANGER : newPassword.length < 12 ? WARN : colors.success }}>
                                            {newPassword.length < 8 ? 'Too short — use at least 8 characters' : newPassword.length < 12 ? 'Decent — add more characters for a stronger password' : 'Strong password length '}
                                        </span>
                                    )}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_confirm_pw')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showConfirmPassword ? 'text' : 'password'} style={{ ...styles.input, paddingRight: '40px' }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={eyeToggleStyle}
                                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: DANGER }}>Passwords do not match.</span>
                                    )}
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>{t('section_2fa')}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>{t('section_2fa')}</span>
                                        <span style={{ background: twoFactorEnabled ? `${colors.success}15` : `${DANGER}15`, color: twoFactorEnabled ? colors.success : DANGER, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {twoFactorEnabled ? t('twofa_status_enabled') : t('twofa_status_disabled')}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                                        {t('twofa_desc')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                    style={{
                                        background: twoFactorEnabled ? colors.success : colors.primary,
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 18px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {twoFactorEnabled ? t('btn_disable_2fa') : t('btn_enable_2fa')}
                                </button>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>{t('section_tips')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                {[
                                    { icon: <KeyRound size={22} color={colors.accent} aria-hidden="true" />, title: t('tip1_title'), text: t('tip1_text') },
                                    { icon: <Smartphone size={22} color={colors.primary} aria-hidden="true" />, title: t('tip2_title'), text: t('tip2_text') },
                                    { icon: <Lock size={22} color={colors.success} aria-hidden="true" />, title: t('tip3_title'), text: t('tip3_text') }
                                ].map((tip, i) => (
                                    <div key={i} style={{ padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>{tip.icon}</div>
                                        <div style={{ color: colors.text, fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>{tip.title}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '12px', lineHeight: 1.5 }}>{tip.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: PREFERENCES & PRIVACY */}
                    {settingsSectionTab === 'preferences' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>{t('section_locale')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t('lbl_language')}</label>
                                    <select style={styles.select} value={prefLanguage} onChange={handleLanguageChange}>
                                        <option value="English">English</option>
                                        <option value="Amharic">Amharic (አማርኛ)</option>
                                        <option value="Afaan Oromo">Afaan Oromo</option>
                                        <option value="Tigrinya">Tigrinya (ትግርኛ)</option>
                                    </select>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('language_hint')}</span>
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>{t('section_theme')}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>{t('theme_title')}</span>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('theme_desc')}</span>
                                </div>
                                <button type="button" onClick={toggleTheme} style={{ ...styles.catalogBtn, display: 'flex', alignItems: 'center', gap: '6px' }} aria-label={theme === 'dark' ? t('btn_light_mode') : t('btn_dark_mode')}>
                                    {theme === 'dark'
                                        ? <><Sun size={15} aria-hidden="true" /> {t('btn_light_mode')}</>
                                        : <><Moon size={15} aria-hidden="true" /> {t('btn_dark_mode')}</>
                                    }
                                </button>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>{t('section_learning')}</h3>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>{t('lbl_study_target')}</label>
                                <input type="number" min="0" max="80" style={{ ...styles.input, maxWidth: '200px' }} value={studyTargetHours || ''} onChange={e => setStudyTargetHours(Number(e.target.value) || 0)} />
                                <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('study_target_hint')}</span>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>{t('section_notifications')}</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.emailAlerts} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, emailAlerts: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>{t('notif_email_title')}</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('notif_email_desc')}</span>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.courseUpdates} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, courseUpdates: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>{t('notif_courses_title')}</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('notif_courses_desc')}</span>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.promotions} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, promotions: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>{t('notif_promos_title')}</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('notif_promos_desc')}</span>
                                    </div>
                                </label>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Privacy & Public Profile Visibility</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>{t('privacy_title')}</span>
                                        <span style={{ background: isPublicProfile ? `${colors.success}15` : `${WARN}15`, color: isPublicProfile ? colors.success : WARN, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {isPublicProfile ? t('status_public') : t('status_private')}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                                        {t('privacy_desc')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPublicProfile(!isPublicProfile)}
                                    style={{
                                        background: isPublicProfile ? colors.primary : colors.bgCard,
                                        color: isPublicProfile ? '#fff' : colors.text,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '8px',
                                        padding: '10px 18px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isPublicProfile ? t('btn_switch_private') : t('btn_switch_public')}
                                </button>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>{t('section_data')}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${DANGER}25`, flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: DANGER, display: 'block' }}>{t('delete_title')}</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('delete_desc')}</span>
                                    </div>
                                    {confirmDelete ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: colors.text }}>{t('delete_contact_support')}</span>
                                            <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 14px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>{t('btn_dismiss')}</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER, borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t('btn_request_deletion')}</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" style={{ ...styles.saveBtn, padding: '12px 32px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }} aria-label="Save Profile Settings">
                            <Save size={16} aria-hidden="true" /> {t('btn_save_profile')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
