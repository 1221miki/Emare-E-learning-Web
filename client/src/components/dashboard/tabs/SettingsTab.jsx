import React, { useMemo, useState } from 'react';

const WARN = '#f59e0b';
const DANGER = '#ef4444';

export default function SettingsTab(dash) {
    const { user, theme, toggleTheme, colors, firstName, setFirstName, lastName, setLastName, username, setUsername, profileEmail, setProfileEmail, contactPhone, setContactPhone, gender, setGender, dateOfBirth, setDateOfBirth, country, setCountry, city, setCity, address, setAddress, biography, setBiography, occupation, setOccupation, company, setCompany, website, setWebsite, linkedInUrl, setLinkedInUrl, githubUrl, setGithubUrl, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, twoFactorEnabled, setTwoFactorEnabled, avatarUrl, prefLanguage, setPrefLanguage, timeZone, setTimeZone, notifPreferences, setNotifPreferences, isPublicProfile, setIsPublicProfile, profileSuccessMsg, avatarUploading, settingsSectionTab, setSettingsSectionTab, handleAvatarFileUpload, handleProfileUpdate, studyTargetHours, setStudyTargetHours, styles } = dash;

    const [confirmDelete, setConfirmDelete] = useState(false);

    const completion = useMemo(() => {
        const fields = [firstName, lastName, username, profileEmail, contactPhone, country, city, occupation, biography, website, githubUrl];
        const filled = fields.filter(f => f && String(f).trim()).length;
        return fields.length ? Math.round((filled / fields.length) * 100) : 0;
    }, [firstName, lastName, username, profileEmail, contactPhone, country, city, occupation, biography, website, githubUrl]);

    const downloadMyData = () => {
        const data = {
            exportedAt: new Date().toISOString(),
            user: {
                fullName: user?.fullName || '',
                email: user?.accountEmail || user?.email || profileEmail,
                role: user?.assignedRole || user?.role || 'Student'
            },
            profile: { firstName, lastName, username, profileEmail, contactPhone, gender, dateOfBirth, country, city, address, biography, occupation, company, website, linkedInUrl, githubUrl },
            preferences: { preferredLanguage: prefLanguage, timeZone, studyTargetHours, notificationPreferences: notifPreferences, isPublicProfile, twoFactorEnabled }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'emare-account-data.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Profile & Account Management</h2>
                <p style={styles.tabSubtitle}>Manage your personal information, learning preferences, security options, and account privacy</p>
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
                        <span style={{ display: 'block', color: colors.text, fontSize: '16px', fontWeight: '800' }}>Profile Completion</span>
                        <span style={{ display: 'block', color: colors.textMuted, fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
                            {completion === 100 ? 'Your profile is complete. Great work!' : `Complete your bio, contact details and social links to reach 100% and stand out on the leaderboard.`}
                        </span>
                    </div>
                </div>
                <button type="button" onClick={() => setSettingsSectionTab('personal')} style={{ ...styles.resumeBtn, fontSize: '13px' }}>Complete Profile</button>
            </div>

            {/* Inner Sub-Navigation for Settings */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '32px', gap: '8px', flexWrap: 'wrap' }}>
                {[
                    { key: 'personal', label: '👤 Personal Info' },
                    { key: 'account', label: '🖼️ Avatar & Locale' },
                    { key: 'security', label: '🔐 Security & 2FA' },
                    { key: 'preferences', label: '⚙️ Preferences & Privacy' }
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
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.panelCard}>
                {profileSuccessMsg && <div style={styles.successAlert}>{profileSuccessMsg}</div>}
                
                <form onSubmit={handleProfileUpdate}>
                    
                    {/* SECTION 1: PERSONAL INFORMATION */}
                    {settingsSectionTab === 'personal' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Personal Identity & Details</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>First Name</label>
                                    <input type="text" style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Abebe" required />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Last Name</label>
                                    <input type="text" style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Bikila" required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Username</label>
                                    <input type="text" style={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. abebe_dev" required />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Email Address</label>
                                    <input type="email" style={styles.input} value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="student@example.com" required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Phone Number</label>
                                    <input type="tel" style={styles.input} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+251 91 123 4567" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Gender</label>
                                    <select style={styles.select} value={gender} onChange={e => setGender(e.target.value)}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Date of Birth</label>
                                    <input type="date" style={styles.input} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Country</label>
                                    <input type="text" style={styles.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="Ethiopia" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>City</label>
                                    <input type="text" style={styles.input} value={city} onChange={e => setCity(e.target.value)} placeholder="Addis Ababa" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Address</label>
                                    <input type="text" style={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Bole Subcity" />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Biography</label>
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
                                    <label style={styles.label}>Occupation</label>
                                    <input type="text" style={styles.input} value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Software Engineer / Student" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Company / University</label>
                                    <input type="text" style={styles.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Emare ICT Hub" />
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Websites & Social Media Handles</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Personal Website</label>
                                    <input type="url" style={styles.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://myportfolio.com" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>LinkedIn Profile</label>
                                    <input type="url" style={styles.input} value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>GitHub Profile</label>
                                    <input type="url" style={styles.input} value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: AVATAR & LOCALE */}
                    {settingsSectionTab === 'account' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Profile Avatar Picture</h3>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: '800', overflow: 'hidden' }}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        firstName?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || 'S'
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Upload Custom Profile Photo</span>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>Supports JPG, PNG or WEBP (Max 5MB)</span>
                                    <label style={{ ...styles.resumeBtn, cursor: 'pointer', display: 'inline-block', width: 'fit-content', padding: '8px 16px', fontSize: '12px' }}>
                                        {avatarUploading ? 'Uploading Image...' : '📷 Choose Image File'}
                                        <input type="file" accept="image/*" onChange={handleAvatarFileUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Language & Time Locale</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Preferred Interface Language</label>
                                    <select style={styles.select} value={prefLanguage} onChange={e => setPrefLanguage(e.target.value)}>
                                        <option value="English">English</option>
                                        <option value="Amharic">Amharic (አማርኛ)</option>
                                        <option value="Afaan Oromo">Afaan Oromo</option>
                                        <option value="Tigrinya">Tigrinya (ትግርኛ)</option>
                                        <option value="French">French (Français)</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Time Zone</label>
                                    <select style={styles.select} value={timeZone} onChange={e => setTimeZone(e.target.value)}>
                                        <option value="UTC+3 (East Africa Time)">UTC+3 (East Africa Time - Addis Ababa)</option>
                                        <option value="UTC+0 (Greenwich Mean Time)">UTC+0 (Greenwich Mean Time)</option>
                                        <option value="UTC-5 (Eastern Standard Time)">UTC-5 (Eastern Standard Time)</option>
                                        <option value="UTC+1 (Central European Time)">UTC+1 (Central European Time)</option>
                                    </select>
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Appearance Theme Mode</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Current Theme Mode</span>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>Toggle between high contrast dark mode and clean light layout</span>
                                </div>
                                <button type="button" onClick={toggleTheme} style={styles.catalogBtn}>
                                    {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: SECURITY & 2FA */}
                    {settingsSectionTab === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Change Account Password</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Current Password</label>
                                    <input type="password" style={styles.input} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>New Password (Min 8 chars)</label>
                                    <input type="password" style={styles.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                                    {newPassword && (
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: newPassword.length < 8 ? DANGER : newPassword.length < 12 ? WARN : colors.success }}>
                                            {newPassword.length < 8 ? 'Too short — use at least 8 characters' : newPassword.length < 12 ? 'Decent — add more characters for a stronger password' : 'Strong password length ✓'}
                                        </span>
                                    )}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Confirm New Password</label>
                                    <input type="password" style={styles.input} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: DANGER }}>Passwords do not match.</span>
                                    )}
                                </div>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Two-Factor Authentication (2FA)</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Two-Factor Authentication</span>
                                        <span style={{ background: twoFactorEnabled ? `${colors.success}15` : `${DANGER}15`, color: twoFactorEnabled ? colors.success : DANGER, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                                        Require an extra security verification code when signing into your student portal
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
                                    {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                                </button>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Account Security Tips</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                {[
                                    { icon: '🔑', title: 'Strong Passwords', text: 'Use a unique mix of letters, numbers and symbols, and never reuse old passwords.' },
                                    { icon: '📲', title: 'Enable 2FA', text: 'Two-factor authentication blocks unauthorized access even if your password leaks.' },
                                    { icon: '🔒', title: 'Sign Out Remotely', text: 'End sessions on shared devices by signing out after every lab or library session.' }
                                ].map((tip, i) => (
                                    <div key={i} style={{ padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                        <div style={{ fontSize: '22px', marginBottom: '8px' }}>{tip.icon}</div>
                                        <div style={{ color: colors.text, fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>{tip.title}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '12px', lineHeight: 1.5 }}>{tip.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: PREFERENCES & PRIVACY */}
                    {settingsSectionTab === 'preferences' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', marginBottom: '8px' }}>Learning Preferences</h3>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Weekly Study Target (hours)</label>
                                <input type="number" min="0" max="80" style={{ ...styles.input, maxWidth: '200px' }} value={studyTargetHours || ''} onChange={e => setStudyTargetHours(Number(e.target.value) || 0)} />
                                <span style={{ fontSize: '12px', color: colors.textMuted }}>Your weekly study goal is used to calculate streak and progress recommendations on your Overview.</span>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '16px 0 8px' }}>Notification & Alert Subscriptions</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={notifPreferences.emailAlerts} 
                                        onChange={e => setNotifPreferences({ ...notifPreferences, emailAlerts: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Email Alerts & Notifications</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Receive email alerts when assignments are graded or live classes start</span>
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
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Course Curriculum Updates</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Get notified when instructors publish new lessons or quiz modules</span>
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
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Promotional & Platform News</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Receive updates regarding new course releases and discount coupons</span>
                                    </div>
                                </label>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Privacy & Public Profile Visibility</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Public Profile Visibility</span>
                                        <span style={{ background: isPublicProfile ? `${colors.success}15` : `${WARN}15`, color: isPublicProfile ? colors.success : WARN, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {isPublicProfile ? 'PUBLIC' : 'PRIVATE'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                                        Allow other students and instructors to view your achievements and gamification portfolio
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
                                    {isPublicProfile ? 'Switch to Private' : 'Switch to Public'}
                                </button>
                            </div>

                            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px', margin: '24px 0 8px' }}>Data & Account Controls</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text, display: 'block' }}>Download My Data</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Export a copy of your profile, preferences and settings as a JSON file</span>
                                    </div>
                                    <button type="button" onClick={downloadMyData} style={{ ...styles.resumeBtn, fontSize: '13px', padding: '8px 16px' }}>⬇ Export Data</button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${DANGER}25`, flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: DANGER, display: 'block' }}>Delete Account</span>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Permanently remove your account and learning data. This cannot be undone.</span>
                                    </div>
                                    {confirmDelete ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: colors.text }}>Please contact support@emareict.com to complete deletion.</span>
                                            <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 14px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Dismiss</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER, borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Request Deletion</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" style={{ ...styles.saveBtn, padding: '12px 32px', fontSize: '15px' }}>
                            💾 Save Profile Settings
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
