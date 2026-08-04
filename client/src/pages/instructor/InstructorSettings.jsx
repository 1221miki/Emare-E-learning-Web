import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';

export default function InstructorSettings() {
    const { colors, theme, setTheme } = useTheme();
    const [active, setActive] = useState('profile');
    const [statusMessage, setStatusMessage] = useState('');

    const [profile, setProfile] = useState({
        fullName: 'Melkam Tesfaye',
        title: 'Professor / Senior Instructor',
        email: 'melkam.t@emareict.edu',
        phone: '+1-555-0123',
        bio: 'MERN Kebode. Desta hae are very comments to wery anses or ses of the fastest sophisticated communicatioal course insights — Personalized course assessment.',
        linkedIn: 'https://emareict.edu/',
        portfolio: 'https://personalportfolio',
        currentInstitution: '',
        specializedSubjects: ['MERN Stack Development', 'Advanced UI/UX'],
        language: 'English',
        timeZone: 'Time Zone / Senior Instructor',
        gradingSystem: 'Standard letter grade vs. numeric'
    });

    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        is2FAEnabled: true,
        securityQuestion: 'What was your first pet’s name?',
        securityAnswer: '',
        loginNotifications: { email: true, sms: false },
        activeSessions: { windows: true, androidCurrent: true, androidSIDS: false }
    });

    const [preferences, setPreferences] = useState({
        theme: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
        language: 'English (US)',
        accent: 'Indigo',
        timeFormat: '12-hour',
        defaultView: 'Table',
        communicationTool: 'Integrated Internal Messaging',
        liveTools: { zoom: false, teams: false, meet: false },
        autoAcceptRequests: true,
        showStudentProgress: true,
        gradingSystem: 'Percentage',
        autoSchedule: 'Never',
        customRules: [
            { value: '1', target: 'course' },
            { value: '2', target: 'course' }
        ],
        showSuggestedContent: true,
        hideArchivedCourses: true,
        prioritizeUnreadMessages: true,
        notificationSummary: 'Real-time'
    });

    const [notifications, setNotifications] = useState({
        newEnrollments: { email: true, inApp: false },
        quizSubmissions: { email: true, inApp: false },
        assignmentDeadlines: { email: true, inApp: false },
        studentMessages: { email: true, inApp: false },
        summary: 'Real-time'
    });

    const [subscription, setSubscription] = useState({
        plan: 'Premium',
        renewDate: 'September 8, 2026',
        billingMethod: 'Visa ending 1234',
        status: 'Active'
    });

    const tabs = [
        { key: 'profile', label: 'Profile Info' },
        { key: 'security', label: 'Security & Account' },
        { key: 'preferences', label: 'Preferences' },
        { key: 'notifications', label: 'Notifications' },
        { key: 'subscription', label: 'Subscription' }
    ];

    const saveSection = (label) => {
        setStatusMessage(`${label} saved successfully.`);
        window.setTimeout(() => setStatusMessage(''), 3200);
    };

    const updateProfile = (field, value) => setProfile((prev) => ({ ...prev, [field]: value }));
    const updateSecurity = (field, value) => setSecurity((prev) => ({ ...prev, [field]: value }));
    const updateSecurityNested = (group, field, value) => setSecurity((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
    const updatePreferences = (field, value) => setPreferences((prev) => ({ ...prev, [field]: value }));
    const updatePreferencesRule = (index, value, target) => setPreferences((prev) => {
        const customRules = [...prev.customRules];
        customRules[index] = { value, target };
        return { ...prev, customRules };
    });
    const updateLiveTool = (tool) => setPreferences((prev) => ({ ...prev, liveTools: { ...prev.liveTools, [tool]: !prev.liveTools[tool] } }));
    const updateNotifications = (section, field, value) => setNotifications((prev) => {
        if (field === 'summary') {
            return { ...prev, summary: value };
        }
        return { ...prev, [section]: { ...prev[section], [field]: value } };
    });
    const updateSubscription = (field, value) => setSubscription((prev) => ({ ...prev, [field]: value }));
    const changeTheme = (value) => {
        updatePreferences('theme', value);
        if (value === 'Dark Mode') setTheme('dark');
        if (value === 'Light Mode') setTheme('light');
    };

    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", background: colors.bg },
        main: { marginLeft: '260px', padding: '32px 32px 40px', flex: 1, minHeight: '100vh' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '24px' },
        panel: { display: 'grid', gap: '24px' },
        tabs: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', background: colors.bgCard, padding: '12px', borderRadius: '18px', border: `1px solid ${colors.border}` },
        tabItem: { padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease' },
        contentGrid: { display: 'grid', gap: '24px' },
        topGrid: { display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: '24px', alignItems: 'start' },
        card: { background: colors.bgCard, borderRadius: '24px', padding: '24px', boxShadow: '0 24px 70px rgba(15,23,42,0.08)', border: `1px solid ${colors.border}` },
        profileCard: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: '22px', minHeight: '360px' },
        avatarBox: { borderRadius: '24px', overflow: 'hidden', background: '#eef2ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '22px' },
        avatarImg: { width: '100%', borderRadius: '20px', objectFit: 'cover' },
        avatarButton: { marginTop: '18px', padding: '10px 14px', borderRadius: '12px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' },
        fieldRow: { display: 'grid', gap: '16px', marginTop: '18px' },
        fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '18px' },
        fieldLabel: { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: colors.text },
        input: { width: '100%', padding: '12px 14px', borderRadius: '14px', border: `1px solid ${colors.border}`, background: colors.bgInput, color: colors.text, fontSize: '14px' },
        textarea: { width: '100%', minHeight: '100px', padding: '12px 14px', borderRadius: '14px', border: `1px solid ${colors.border}`, background: colors.bgInput, color: colors.text, fontSize: '14px', resize: 'vertical' },
        chipRow: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' },
        chip: { padding: '10px 14px', borderRadius: '999px', background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, fontSize: '13px' },
        sectionHeader: { margin: 0, fontSize: '18px', fontWeight: 700, color: colors.text },
        sectionText: { margin: '8px 0 0', color: colors.textMuted, fontSize: '14px', lineHeight: '1.7' },
        securityTopGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' },
        authGrid: { display: 'grid', gap: '18px', marginTop: '18px' },
        authCard: { background: colors.bg, borderRadius: '20px', padding: '18px', border: `1px solid ${colors.border}` },
        smallCard: { background: colors.bgCard, borderRadius: '20px', padding: '18px', border: `1px solid ${colors.border}`, minHeight: '300px' },
        toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' },
        actionButton: { padding: '12px 14px', borderRadius: '14px', border: '1px solid transparent', cursor: 'pointer', fontWeight: 700, background: '#2563eb', color: '#fff' },
        switchRow: { display: 'grid', gap: '18px', marginTop: '18px' },
        inlineField: { display: 'flex', flexDirection: 'column', gap: '8px' },
        button: { padding: '12px 18px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 700, background: '#2563eb', color: '#fff', minWidth: '140px' },
        statusBanner: { padding: '14px 18px', borderRadius: '18px', background: '#d1fae5', color: '#064e3b', border: '1px solid #a7f3d0' }
    };

    return (
        <div style={s.page}>
            <Sidebar />

            <main style={s.main}>
                <div style={s.header}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 26, color: colors.text }}>Profile & Account Settings</h1>
                        <p style={{ margin: '8px 0 0', color: colors.textMuted }}>Update your instructor profile, preferences, security and notification settings.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <input placeholder="Search anything..." style={{ padding: '12px 16px', borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.text, minWidth: 240 }} />
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>A</div>
                    </div>
                </div>

                {statusMessage && <div style={s.statusBanner}>{statusMessage}</div>}

                <div style={s.panel}>
                    <div style={s.tabs}>
                        {tabs.map((tab) => (
                            <div
                                key={tab.key}
                                onClick={() => setActive(tab.key)}
                                style={{
                                    ...s.tabItem,
                                    background: active === tab.key ? '#eef6ff' : 'transparent',
                                    border: active === tab.key ? `1px solid ${colors.primary}` : '1px solid transparent',
                                    color: active === tab.key ? '#1d4ed8' : colors.textMuted,
                                    fontWeight: active === tab.key ? 700 : 600
                                }}
                            >
                                {tab.label}
                            </div>
                        ))}
                    </div>

                    <div style={s.contentGrid}>
                        {active === 'profile' && (
                            <>
                                <div style={s.topGrid}>
                                    <div style={{ ...s.card, gridColumn: '1 / -1' }}>
                                        <h2 style={s.sectionHeader}>Profile Info</h2>
                                        <p style={s.sectionText}>Keep your public instructor profile and contact information accurate for students and course visitors.</p>
                                    </div>
                                </div>

                                <div style={s.topGrid}>
                                    <div style={{ ...s.card, ...s.profileCard }}>
                                        <div style={s.avatarBox}>
                                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80" alt="Instructor avatar" style={s.avatarImg} />
                                            <button style={s.avatarButton}>Edit Photo</button>
                                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontWeight: 700, color: colors.text }}>Course Specializations</p>
                                                <p style={{ margin: '8px 0 0', color: colors.textMuted, fontSize: 13 }}>MERN Stack Development<br />Advanced UI/UX</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div style={s.fieldGrid}>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Full Name</label>
                                                    <input style={s.input} value={profile.fullName} onChange={(e) => updateProfile('fullName', e.target.value)} />
                                                </div>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Title</label>
                                                    <input style={s.input} value={profile.title} onChange={(e) => updateProfile('title', e.target.value)} />
                                                </div>
                                            </div>

                                            <div style={s.fieldGrid}>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Email</label>
                                                    <input style={s.input} value={profile.email} onChange={(e) => updateProfile('email', e.target.value)} />
                                                </div>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Phone Number</label>
                                                    <input style={s.input} value={profile.phone} onChange={(e) => updateProfile('phone', e.target.value)} />
                                                </div>
                                            </div>

                                            <div style={s.fieldRow}>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Bio</label>
                                                    <textarea style={s.textarea} value={profile.bio} onChange={(e) => updateProfile('bio', e.target.value)} />
                                                </div>
                                            </div>

                                            <div style={{ ...s.fieldGrid, marginTop: 0 }}>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>LinkedIn</label>
                                                    <input style={s.input} value={profile.linkedIn} onChange={(e) => updateProfile('linkedIn', e.target.value)} />
                                                </div>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Personal Portfolio</label>
                                                    <input style={s.input} value={profile.portfolio} onChange={(e) => updateProfile('portfolio', e.target.value)} />
                                                </div>
                                            </div>

                                            <div style={s.chipRow}>
                                                <span style={s.chip}>MERN Stack</span>
                                                <span style={s.chip}>Advanced UI</span>
                                                <span style={s.chip}>Curriculum Design</span>
                                                <span style={s.chip}>React Design</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Curriculum & Expert Details</h3>
                                        <div style={s.fieldRow}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Specialized Subjects</label>
                                                <div style={s.chipRow}>
                                                    <span style={s.chip}>MERN Stack Development</span>
                                                    <span style={s.chip}>Advanced UI/UX</span>
                                                </div>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Current Institution</label>
                                                <input style={s.input} placeholder="Current Institution" />
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Downloadable CV</label>
                                                <button style={{ ...s.avatarButton, width: '100%', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text }}>Downloadable CV</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr', gap: '24px' }}>
                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Instructor Preferences</h3>
                                        <div style={s.fieldGrid}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Default Course Language</label>
                                                <select style={s.input} defaultValue="English">
                                                    <option>English</option>
                                                    <option>Amharic</option>
                                                    <option>French</option>
                                                </select>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Time Zone</label>
                                                <select style={s.input} defaultValue="Time Zone / Senior Instructor">
                                                    <option>Time Zone / Senior Instructor</option>
                                                    <option>GMT+0</option>
                                                    <option>GMT+3</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={s.fieldGrid}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Grading System Preferences</label>
                                                <select style={s.input} defaultValue="Standard letter grade vs. numeric">
                                                    <option>Standard letter grade vs. numeric</option>
                                                    <option>Pass/Fail</option>
                                                </select>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Communication Tools</label>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '14px', border: `1px solid ${colors.border}`, background: colors.bgInput }}>
                                                    <span style={{ color: colors.text }}>Enable internal messaging</span>
                                                    <input type="checkbox" checked readOnly />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '22px', display: 'flex', gap: '12px' }}>
                                            <button style={s.button}>Save Changes</button>
                                            <button style={{ ...s.button, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>Cancel</button>
                                        </div>
                                    </div>

                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Notification Settings</h3>
                                        <div style={s.switchRow}>
                                            {['New enrollments', 'Quiz submissions', 'Assignment deadlines', 'Student messages'].map((item) => (
                                                <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: `1px solid ${colors.border}` }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: colors.text }}>{item}</div>
                                                        <div style={{ color: colors.textMuted, fontSize: 13 }}>Email</div>
                                                    </div>
                                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                        <input type="checkbox" checked readOnly />
                                                        <span style={{ width: 30, height: 16, borderRadius: 999, background: '#2563eb', display: 'inline-block' }} />
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {active === 'security' && (
                            <div style={s.contentGrid}>
                                <div style={{ ...s.card, padding: '28px' }}>
                                    <h2 style={s.sectionHeader}>Password & Authentication</h2>
                                    <p style={s.sectionText}>Update your password, view recent activity and manage two-factor authentication.</p>
                                    <div style={s.securityTopGrid}>
                                        <div style={s.authCard}>
                                            <div style={s.authGrid}>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Current Password</label>
                                                    <input style={s.input} type="password" value={security.currentPassword} onChange={(e) => updateSecurity('currentPassword', e.target.value)} placeholder="••••••••" />
                                                </div>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>New Password</label>
                                                    <input style={s.input} type="password" value={security.newPassword} onChange={(e) => updateSecurity('newPassword', e.target.value)} placeholder="New Password" />
                                                </div>
                                                <div style={s.inlineField}>
                                                    <label style={s.fieldLabel}>Confirm New Password</label>
                                                    <input style={s.input} type="password" value={security.confirmPassword} onChange={(e) => updateSecurity('confirmPassword', e.target.value)} placeholder="Confirm New Password" />
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '18px' }}>
                                                <h3 style={{ ...s.sectionHeader, fontSize: '16px' }}>Recent Password Activity</h3>
                                                <div style={{ marginTop: '12px', color: colors.textMuted, fontSize: '13px', lineHeight: '1.7' }}>
                                                    <p style={{ margin: '0 0 8px' }}>Password Changed • May 8, 2025, from Addis Ababa, Ethiopia</p>
                                                    <p style={{ margin: '0 0 8px' }}>Password Changed • May 8, 2025, from Addis Ababa, Ethiopia</p>
                                                    <p style={{ margin: 0 }}>Password Changed • May 8, 2025, from Addis Ababa, Ethiopia</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={s.smallCard}>
                                            <div style={{ ...s.toggleRow, marginBottom: '24px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: colors.text }}>Two-Factor Authentication (2FA)</div>
                                                    <div style={{ color: colors.textMuted, fontSize: 13 }}>Authentication apps (e.g., Google Authenticator)</div>
                                                </div>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '999px', background: colors.bgInput }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} /> Enabled
                                                </span>
                                            </div>
                                            <button style={s.actionButton}>Setup New App</button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Data & Account Management</h3>
                                        <div style={s.fieldRow}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Account Actions</label>
                                                <div style={{ color: colors.textMuted, fontSize: 13 }}>Export all personal data, courses, and student records.</div>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Account Export</label>
                                                <button style={{ ...s.actionButton, width: '100%', background: 'transparent', borderColor: colors.border, color: colors.text }}>Request Account Data (PDF/JSON)</button>
                                            </div>
                                        </div>
                                        <div style={{ ...s.fieldRow, marginTop: '22px' }}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Account Termination</label>
                                                <div style={{ color: colors.textMuted, fontSize: 13 }}>This action is irreversible. All data will be erased after 30 days.</div>
                                            </div>
                                            <button style={{ ...s.actionButton, width: '100%', background: '#f87171', borderColor: '#f87171' }}>Permanently Delete Account</button>
                                        </div>
                                    </div>

                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Security Controls</h3>
                                        <div style={s.fieldRow}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Login Notifications</label>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <button style={{ ...s.actionButton, background: '#2563eb', color: '#fff' }}>Email</button>
                                                    <button style={{ ...s.actionButton, background: colors.bgInput, color: colors.text }}>SMS</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '18px' }}>
                                            <div style={{ fontWeight: 700, marginBottom: '10px' }}>Active Sessions Management</div>
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.text }}><input type="checkbox" checked readOnly /> Active on Windows PC (current)</label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.text }}><input type="checkbox" checked readOnly /> Active on Android Phone (current)</label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.text }}><input type="checkbox" readOnly /> Active on Android Phone (SIDS)</label>
                                            </div>
                                            <button style={{ ...s.actionButton, marginTop: '18px', width: '100%', background: colors.bgInput, color: colors.text }}>Log Out of All Other Sessions</button>
                                        </div>
                                        <div style={{ marginTop: '24px' }}>
                                            <label style={s.fieldLabel}>Security Question</label>
                                            <select style={s.input}>
                                                <option>Select a Security Question...</option>
                                                <option>What was your first pet’s name?</option>
                                                <option>What is your mother’s maiden name?</option>
                                            </select>
                                            <input style={{ ...s.input, marginTop: '12px' }} placeholder="Answer" />
                                        </div>
                                    </div>
                                </div>

                                <div style={s.card}>
                                    <h3 style={s.sectionHeader}>Security Events Log</h3>
                                    <div style={{ marginTop: '14px', maxHeight: '260px', overflowY: 'auto', color: colors.textMuted, fontSize: '13px', lineHeight: '1.7' }}>
                                        {['Login - Windows PC • May 8, 2025, from Addis Ababa, Ethiopia', '2FA Code Generated • May 8, 2025, from Addis Ababa, Ethiopia', 'Login Attempt Failed - Mac OS • May 7, 2025', 'Login Attempt Failed - Mac OS • May 7, 2025', 'Login Attempt Failed - Mac OS • May 7, 2025'].map((event) => (
                                            <p key={event} style={{ margin: '0 0 10px' }}>{event}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {active === 'preferences' && (
                            <div style={s.contentGrid}>
                                <div style={{ ...s.card, padding: '28px' }}>
                                    <h2 style={s.sectionHeader}>Platform Display</h2>
                                    <p style={s.sectionText}>Control dashboard theme, accent color, language, and time format for your instructor workspace.</p>

                                    <div style={{ display: 'grid', gap: '22px', marginTop: '22px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Dashboard Theme</label>
                                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                    {['Light Mode', 'Dark Mode', 'Auto System'].map((theme) => (
                                                        <button key={theme} style={{
                                                            minWidth: 104,
                                                            borderRadius: 18,
                                                            padding: '14px 16px',
                                                            border: `1px solid ${theme === 'Dark Mode' ? colors.primary : colors.border}`,
                                                            background: theme === 'Dark Mode' ? '#eef6ff' : colors.bg,
                                                            color: colors.text,
                                                            cursor: 'pointer'
                                                        }}>{theme}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Interface Language</label>
                                                <select style={{ ...s.input, minHeight: 160 }} defaultValue="English (US)">
                                                    <option>English (US)</option>
                                                    <option>English (UK)</option>
                                                    <option>Amharic</option>
                                                    <option>Oromiffa</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Color Accent</label>
                                                <select style={s.input} defaultValue="Indigo">
                                                    <option>Indigo</option>
                                                    <option>Blue</option>
                                                    <option>Teal</option>
                                                </select>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Time Format</label>
                                                <select style={s.input} defaultValue="12-hour">
                                                    <option>12-hour</option>
                                                    <option>24-hour</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Workspace & Communication Tools</h3>
                                        <div style={{ display: 'grid', gap: '18px', marginTop: '18px' }}>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Default View for My Courses</label>
                                                <select style={s.input} defaultValue="Table">
                                                    <option>Table</option>
                                                    <option>Grid</option>
                                                    <option>List</option>
                                                </select>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Preferred Communication Tool</label>
                                                <select style={s.input} defaultValue="Integrated Internal Messaging">
                                                    <option>Integrated Internal Messaging</option>
                                                    <option>External Email</option>
                                                    <option>Slack Link</option>
                                                </select>
                                            </div>
                                            <div style={s.inlineField}>
                                                <label style={s.fieldLabel}>Live Class Tools</label>
                                                <div style={{ display: 'grid', gap: '12px' }}>
                                                    {['Integrate Zoom', 'Integrate Microsoft Teams', 'Integrate Google Meet'].map((tool) => (
                                                        <button key={tool} style={{ ...s.actionButton, width: '100%', background: colors.bgInput, color: colors.text, borderColor: colors.border }}>{tool}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={s.card}>
                                        <h3 style={s.sectionHeader}>Teaching & Notification Rules</h3>
                                        <div style={{ marginTop: '18px' }}>
                                            <div style={s.toggleRow}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input type="checkbox" checked readOnly />
                                                    Auto-Accept Course Requests
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input type="checkbox" checked readOnly />
                                                    Show Student Progress in Sidebar
                                                </label>
                                            </div>

                                            <div style={{ ...s.inlineField, marginTop: '18px' }}>
                                                <label style={s.fieldLabel}>Default Grading System</label>
                                                <select style={s.input} defaultValue="Percentage">
                                                    <option>Percentage</option>
                                                    <option>Letter Grade</option>
                                                </select>
                                            </div>

                                            <div style={{ ...s.inlineField, marginTop: '18px' }}>
                                                <label style={s.fieldLabel}>Auto-Schedule Live Sessions</label>
                                                <select style={{ ...s.input, minHeight: 120 }} defaultValue="Never">
                                                    <option>Never</option>
                                                    <option>1 hour before</option>
                                                    <option>1 day before</option>
                                                </select>
                                            </div>

                                            <div style={{ marginTop: '24px' }}>
                                                <h4 style={{ ...s.sectionHeader, fontSize: '16px' }}>Custom Rules</h4>
                                                <div style={{ display: 'grid', gap: '14px', marginTop: '14px' }}>
                                                    {[1, 2].map((index) => (
                                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                                                            <input style={s.input} defaultValue={index} />
                                                            <select style={s.input} defaultValue="course">
                                                                <option>course</option>
                                                                <option>student</option>
                                                            </select>
                                                        </div>
                                                    ))}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                                                        <input style={s.input} placeholder="Mute notifications for" />
                                                        <select style={s.input} defaultValue="course">
                                                            <option>course</option>
                                                            <option>student</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={s.card}>
                                    <h3 style={s.sectionHeader}>Content & Feed Preferences</h3>
                                    <div style={{ display: 'grid', gap: '16px', marginTop: '18px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" checked readOnly />
                                            Show Suggested Content
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" checked readOnly />
                                            Hide Archived Courses in Feed
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" checked readOnly />
                                            Prioritize Unread Messages
                                        </label>
                                        <div style={{ display: 'grid', gap: '10px', maxWidth: '320px' }}>
                                            <label style={s.fieldLabel}>Notification Summary</label>
                                            <select style={s.input} defaultValue="Real-time">
                                                <option>Real-time</option>
                                                <option>Daily Digest</option>
                                                <option>Weekly Summary</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {active !== 'profile' && active !== 'security' && active !== 'preferences' && (
                            <div style={s.card}>
                                <h2 style={s.sectionHeader}>{tabs.find((tab) => tab.key === active)?.label}</h2>
                                <p style={s.sectionText}>This section will be implemented with detailed settings controls for {tabs.find((tab) => tab.key === active)?.label.toLowerCase()}.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
