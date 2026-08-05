import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function AccountProfileChecklist({ setActiveTab }) {
    const { colors } = useTheme();

    const tasks = [
        {
            title: 'Register account',
            description: 'Click Sign Up → Fill form → Accept terms',
            frequency: 'Once',
            priority: 'High',
            actionLabel: 'Review Account',
            action: () => setActiveTab('settings')
        },
        {
            title: 'Verify email/phone',
            description: 'Check inbox → Click verification link',
            frequency: 'Once',
            priority: 'High',
            actionLabel: 'Verify Contact',
            action: () => setActiveTab('settings')
        },
        {
            title: 'Complete profile',
            description: 'Go to Settings → Fill all fields (name, bio, expertise)',
            frequency: 'Once + Update',
            priority: 'Medium',
            actionLabel: 'Complete Profile',
            action: () => setActiveTab('settings')
        },
        {
            title: 'Upload profile picture',
            description: 'Settings → Profile → Upload image (max 2MB, JPG/PNG)',
            frequency: 'Once',
            priority: 'Low',
            actionLabel: 'Upload Photo',
            action: () => setActiveTab('settings')
        },
        {
            title: 'Manage password',
            description: 'Settings → Security → Change password every 90 days',
            frequency: 'Quarterly',
            priority: 'High',
            actionLabel: 'Change Password',
            action: () => setActiveTab('settings')
        },
        {
            title: 'Enable 2FA',
            description: 'Settings → Security → Enable Google Authenticator',
            frequency: 'Once',
            priority: 'Medium',
            actionLabel: 'Enable 2FA',
            action: () => setActiveTab('settings')
        },
        {
            title: 'Maintain accuracy',
            description: 'Review profile before each course enrollment',
            frequency: 'Monthly',
            priority: 'Medium',
            actionLabel: 'Review Profile',
            action: () => setActiveTab('settings')
        }
    ];

    return (
        <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ maxWidth: '680px' }}>
                    <h2 style={{ fontSize: '20px', color: colors.text, margin: 0, fontWeight: '900' }}>Account & Profile Management</h2>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: '10px 0 0', lineHeight: 1.7 }}>
                        Keep your account secure, your profile complete, and your instructor engagement strong. Students with profile pictures are <strong>3x more likely</strong> to receive responses in forums.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setActiveTab('messages')}
                    style={{
                        background: colors.primary,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '12px 18px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: `0 10px 24px ${colors.primary}20`
                    }}
                >
                    Go to Messages
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginTop: '24px' }}>
                {tasks.map((task) => (
                    <div key={task.title} style={{ background: colors.bgInput, borderRadius: '18px', padding: '18px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: '800', color: colors.text, margin: 0 }}>{task.title}</h3>
                            </div>
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0, lineHeight: 1.7 }}>{task.description}</p>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: '700' }}>{task.frequency}</span>
                            <button
                                type="button"
                                onClick={task.action}
                                style={{
                                    background: colors.primary,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                {task.actionLabel}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
