import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Mail,
    CreditCard,
    Lock,
    ClipboardCheck,
    Database,
    Award,
    CheckCircle2,
    XCircle,
    RotateCw,
    Save,
    HardDrive,
    Sparkles,
    AlertCircle,
    Info,
    RefreshCw
} from 'lucide-react';
import { systemService } from '../../services/api';

/**
 * AdminSystemSettings Component
 * 
 * Configured strictly with:
 * - 3 Functional Toggles (2FA Security, SMTP Email, Online Payments)
 * - 4 Core System Features (Strict RBAC, Audit Logs, Automatic Backup, Automatic Certificates) with NO disable toggle
 * - Database Maintenance quick actions (Backup, Optimize, Cache)
 */
export default function AdminSystemSettings({
    settings = {},
    setSettings = () => {},
    colors = {},
    theme = 'light',
    showNotification = () => {},
    dbMetrics = {},
    dbActionLoading = {},
    handleBackup = () => {},
    handleOptimizeDatabase = () => {},
    handleClearCache = () => {}
}) {
    // 3 Functional Toggles state
    const [toggles, setToggles] = useState({
        twoFactorAuthEnabled: true,
        smtpEnabled: true,
        paymentGatewayActive: true
    });

    const [saving, setSaving] = useState(false);
    const [savedStatus, setSavedStatus] = useState('synced'); // 'synced' | 'saving' | 'dirty' | 'error'
    const [statusMessage, setStatusMessage] = useState('Settings synchronized with database');

    // Synchronize local toggles when settings prop changes or on initial load
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setToggles({
                twoFactorAuthEnabled: settings.twoFactorAuthEnabled !== false && settings.twoFactorAuth !== false && settings.requireMfa !== false,
                smtpEnabled: settings.smtpEnabled !== false && settings.automaticEmailNotifs !== false,
                paymentGatewayActive: settings.paymentGatewayActive !== false && settings.onlinePaymentsEnabled !== false
            });
            setSavedStatus('synced');
            setStatusMessage('Settings synchronized with database');
        }
    }, [settings]);

    // Handle toggle switch change with persistence to database
    const handleToggleChange = async (key) => {
        const nextValue = !toggles[key];
        const nextToggles = { ...toggles, [key]: nextValue };
        setToggles(nextToggles);
        setSavedStatus('saving');
        setStatusMessage('Saving to database...');

        // Map to all aliases so backend and other components stay 100% in sync
        const payload = {
            [key]: nextValue
        };

        if (key === 'twoFactorAuthEnabled') {
            payload.twoFactorAuth = nextValue;
            payload.requireMfa = nextValue;
        } else if (key === 'smtpEnabled') {
            payload.automaticEmailNotifs = nextValue;
        } else if (key === 'paymentGatewayActive') {
            payload.onlinePaymentsEnabled = nextValue;
        }

        try {
            const res = await systemService.updateSettings(payload);
            if (res.data?.success && res.data?.data) {
                if (typeof setSettings === 'function') {
                    setSettings(res.data.data);
                }
                setSavedStatus('synced');
                setStatusMessage('Saved to database');
                if (typeof showNotification === 'function') {
                    showNotification(`System setting updated: ${getToggleLabel(key)} is now ${nextValue ? 'Enabled' : 'Disabled'}.`, 'success');
                }
            } else {
                throw new Error(res.data?.message || 'Update failed');
            }
        } catch (err) {
            console.error('Failed to update system setting:', err);
            // Revert local state on failure
            setToggles(prev => ({ ...prev, [key]: !nextValue }));
            setSavedStatus('error');
            setStatusMessage('Failed to save changes. Please try again.');
            if (typeof showNotification === 'function') {
                showNotification('Could not save setting change. Reverted to previous state.', 'error');
            }
        }
    };

    // Explicit manual save all button
    const handleSaveAll = async () => {
        setSaving(true);
        setSavedStatus('saving');
        setStatusMessage('Saving all settings to database...');

        const payload = {
            twoFactorAuthEnabled: toggles.twoFactorAuthEnabled,
            twoFactorAuth: toggles.twoFactorAuthEnabled,
            requireMfa: toggles.twoFactorAuthEnabled,
            smtpEnabled: toggles.smtpEnabled,
            automaticEmailNotifs: toggles.smtpEnabled,
            paymentGatewayActive: toggles.paymentGatewayActive,
            onlinePaymentsEnabled: toggles.paymentGatewayActive,
            // Enforce core settings
            rbacEnforced: true,
            auditLoggingActive: true,
            backupEnabled: true,
            autoGenerateCertificates: true
        };

        try {
            const res = await systemService.updateSettings(payload);
            if (res.data?.success && res.data?.data) {
                if (typeof setSettings === 'function') {
                    setSettings(res.data.data);
                }
                setSavedStatus('synced');
                setStatusMessage('All settings persistently saved to database.');
                if (typeof showNotification === 'function') {
                    showNotification('System settings saved successfully.', 'success');
                }
            } else {
                throw new Error(res.data?.message || 'Save failed');
            }
        } catch (err) {
            console.error('Failed to save system settings:', err);
            setSavedStatus('error');
            setStatusMessage('Failed to save settings.');
            if (typeof showNotification === 'function') {
                showNotification('Error saving system settings. Please try again.', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    // Reload settings from database
    const handleReload = async () => {
        try {
            setSavedStatus('saving');
            setStatusMessage('Refreshing settings from server...');
            const res = await systemService.getSettings();
            if (res.data?.success && res.data?.data) {
                const data = res.data.data;
                if (typeof setSettings === 'function') {
                    setSettings(data);
                }
                setToggles({
                    twoFactorAuthEnabled: data.twoFactorAuthEnabled !== false && data.twoFactorAuth !== false && data.requireMfa !== false,
                    smtpEnabled: data.smtpEnabled !== false && data.automaticEmailNotifs !== false,
                    paymentGatewayActive: data.paymentGatewayActive !== false && data.onlinePaymentsEnabled !== false
                });
                setSavedStatus('synced');
                setStatusMessage('Settings reloaded from database.');
                if (typeof showNotification === 'function') {
                    showNotification('Settings reloaded.', 'info');
                }
            }
        } catch (err) {
            console.error('Failed to reload settings:', err);
            setSavedStatus('error');
            setStatusMessage('Failed to reload settings.');
        }
    };

    const getToggleLabel = (key) => {
        switch (key) {
            case 'twoFactorAuthEnabled': return '2FA Security';
            case 'smtpEnabled': return 'SMTP Email';
            case 'paymentGatewayActive': return 'Online Payments';
            default: return key;
        }
    };

    // Palette & Tokens
    const isDark = theme === 'dark';
    const bgCard = colors.bgCard || (isDark ? '#0f172a' : '#ffffff');
    const bgMuted = isDark ? '#1e293b' : '#f8fafc';
    const bgHighlight = isDark ? '#131f37' : '#f0fdf4';
    const borderCol = colors.border || (isDark ? '#334155' : '#e2e8f0');
    const textCol = colors.text || (isDark ? '#f8fafc' : '#0f172a');
    const textMuted = colors.textMuted || (isDark ? '#94a3b8' : '#64748b');
    const primaryCol = colors.primary || '#10b981';
    const successCol = '#10b981';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Header Banner */}
            <div style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${borderCol}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: `${primaryCol}18`,
                            color: primaryCol,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: textCol }}>
                                System Settings
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: textMuted }}>
                                Configure active platform feature toggles and view server-enforced core operations.
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: savedStatus === 'synced' ? `${successCol}14` : savedStatus === 'saving' ? '#3b82f614' : '#ef444414',
                        color: savedStatus === 'synced' ? successCol : savedStatus === 'saving' ? '#3b82f6' : '#ef4444',
                        border: `1px solid ${savedStatus === 'synced' ? successCol + '30' : savedStatus === 'saving' ? '#3b82f630' : '#ef444430'}`
                    }}>
                        {savedStatus === 'synced' && <CheckCircle2 size={13} />}
                        {savedStatus === 'saving' && <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                        {savedStatus === 'error' && <AlertCircle size={13} />}
                        <span>{statusMessage}</span>
                    </div>

                    <button
                        onClick={handleReload}
                        title="Reload from Database"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: bgMuted,
                            color: textCol,
                            border: `1px solid ${borderCol}`,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={14} />
                        <span>Reload</span>
                    </button>

                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 18px',
                            borderRadius: '10px',
                            background: primaryCol,
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            boxShadow: `0 2px 8px ${primaryCol}40`
                        }}
                    >
                        <Save size={15} />
                        <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </div>

            {/* SECTION 1: 3 Functional Enable/Disable Toggles */}
            <div style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${borderCol}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: `${primaryCol}18`,
                                color: primaryCol,
                                padding: '3px 8px',
                                borderRadius: '6px'
                            }}>
                                System Control
                            </span>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: textCol }}>
                                Functional Feature Toggles
                            </h3>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: textMuted }}>
                            Toggling any of these 3 features updates the database persistently and immediately controls platform functionality across all accounts and APIs.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Toggle 1: 2FA Security */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 20px',
                        borderRadius: '12px',
                        background: bgMuted,
                        border: `1px solid ${toggles.twoFactorAuthEnabled ? primaryCol + '40' : borderCol}`,
                        transition: 'all 0.2s ease',
                        flexWrap: 'wrap',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: toggles.twoFactorAuthEnabled ? `${successCol}18` : (isDark ? '#334155' : '#e2e8f0'),
                                color: toggles.twoFactorAuthEnabled ? successCol : textMuted,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <ShieldCheck size={22} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: textCol }}>
                                        2FA Security
                                    </h4>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        background: toggles.twoFactorAuthEnabled ? `${successCol}20` : (isDark ? '#334155' : '#e2e8f0'),
                                        color: toggles.twoFactorAuthEnabled ? successCol : textMuted
                                    }}>
                                        {toggles.twoFactorAuthEnabled ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: textMuted, lineHeight: '1.4' }}>
                                    Enable/Disable two-factor authentication across supported accounts.
                                </p>
                                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: textMuted, opacity: 0.85 }}>
                                    {toggles.twoFactorAuthEnabled
                                        ? 'When enabled, accounts with 2FA enabled must verify with one-time security codes upon sign in.'
                                        : 'When disabled, 2FA verification prompts are bypassed during sign in, and direct setup is blocked.'}
                                </p>
                            </div>
                        </div>

                        {/* Switch UI */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={toggles.twoFactorAuthEnabled}
                            onClick={() => handleToggleChange('twoFactorAuthEnabled')}
                            style={{
                                width: '56px',
                                height: '30px',
                                borderRadius: '15px',
                                background: toggles.twoFactorAuthEnabled ? primaryCol : (isDark ? '#475569' : '#cbd5e1'),
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                padding: 0,
                                transition: 'background-color 0.25s ease',
                                outline: 'none',
                                flexShrink: 0
                            }}
                        >
                            <span style={{
                                display: 'block',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                position: 'absolute',
                                top: '3px',
                                left: toggles.twoFactorAuthEnabled ? '29px' : '3px',
                                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </button>
                    </div>

                    {/* Toggle 2: SMTP Email */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 20px',
                        borderRadius: '12px',
                        background: bgMuted,
                        border: `1px solid ${toggles.smtpEnabled ? primaryCol + '40' : borderCol}`,
                        transition: 'all 0.2s ease',
                        flexWrap: 'wrap',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: toggles.smtpEnabled ? `${successCol}18` : (isDark ? '#334155' : '#e2e8f0'),
                                color: toggles.smtpEnabled ? successCol : textMuted,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Mail size={22} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: textCol }}>
                                        SMTP Email
                                    </h4>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        background: toggles.smtpEnabled ? `${successCol}20` : (isDark ? '#334155' : '#e2e8f0'),
                                        color: toggles.smtpEnabled ? successCol : textMuted
                                    }}>
                                        {toggles.smtpEnabled ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: textMuted, lineHeight: '1.4' }}>
                                    Enable/Disable transactional emails such as verification codes, password resets, and notifications.
                                </p>
                                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: textMuted, opacity: 0.85 }}>
                                    {toggles.smtpEnabled
                                        ? 'When enabled, outgoing email delivery is active for onboarding, password recovery, receipts, and system alerts.'
                                        : 'When disabled, outgoing mail transport is completely suspended server-side.'}
                                </p>
                            </div>
                        </div>

                        {/* Switch UI */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={toggles.smtpEnabled}
                            onClick={() => handleToggleChange('smtpEnabled')}
                            style={{
                                width: '56px',
                                height: '30px',
                                borderRadius: '15px',
                                background: toggles.smtpEnabled ? primaryCol : (isDark ? '#475569' : '#cbd5e1'),
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                padding: 0,
                                transition: 'background-color 0.25s ease',
                                outline: 'none',
                                flexShrink: 0
                            }}
                        >
                            <span style={{
                                display: 'block',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                position: 'absolute',
                                top: '3px',
                                left: toggles.smtpEnabled ? '29px' : '3px',
                                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </button>
                    </div>

                    {/* Toggle 3: Online Payments */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 20px',
                        borderRadius: '12px',
                        background: bgMuted,
                        border: `1px solid ${toggles.paymentGatewayActive ? primaryCol + '40' : borderCol}`,
                        transition: 'all 0.2s ease',
                        flexWrap: 'wrap',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: toggles.paymentGatewayActive ? `${successCol}18` : (isDark ? '#334155' : '#e2e8f0'),
                                color: toggles.paymentGatewayActive ? successCol : textMuted,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <CreditCard size={22} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: textCol }}>
                                        Online Payments
                                    </h4>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        background: toggles.paymentGatewayActive ? `${successCol}20` : (isDark ? '#334155' : '#e2e8f0'),
                                        color: toggles.paymentGatewayActive ? successCol : textMuted
                                    }}>
                                        {toggles.paymentGatewayActive ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: textMuted, lineHeight: '1.4' }}>
                                    Enable/Disable payment processing for Chapa, Telebirr, and supported cards.
                                </p>
                                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: textMuted, opacity: 0.85 }}>
                                    {toggles.paymentGatewayActive
                                        ? 'When enabled, checkout and payment transactions for courses and paid events are processed.'
                                        : 'When disabled, payment initiation is blocked across all endpoints and direct API requests are rejected.'}
                                </p>
                            </div>
                        </div>

                        {/* Switch UI */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={toggles.paymentGatewayActive}
                            onClick={() => handleToggleChange('paymentGatewayActive')}
                            style={{
                                width: '56px',
                                height: '30px',
                                borderRadius: '15px',
                                background: toggles.paymentGatewayActive ? primaryCol : (isDark ? '#475569' : '#cbd5e1'),
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                padding: 0,
                                transition: 'background-color 0.25s ease',
                                outline: 'none',
                                flexShrink: 0
                            }}
                        >
                            <span style={{
                                display: 'block',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                position: 'absolute',
                                top: '3px',
                                left: toggles.paymentGatewayActive ? '29px' : '3px',
                                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </button>
                    </div>

                </div>
            </div>

            {/* SECTION 2: Core System Features (No Disable Toggle) */}
            <div style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${borderCol}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: '#3b82f618',
                            color: '#3b82f6',
                            padding: '3px 8px',
                            borderRadius: '6px'
                        }}>
                            Core System Features
                        </span>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: textCol }}>
                            Permanently Active Platform Operations
                        </h3>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: textMuted }}>
                        These essential security and operational safeguards are permanently enforced server-side. No disable toggle is provided to ensure platform stability, data integrity, and compliance.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '16px'
                }}>
                    
                    {/* Core 1: Strict RBAC */}
                    <div style={{
                        background: bgMuted,
                        borderRadius: '12px',
                        padding: '18px',
                        border: `1px solid ${borderCol}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <CheckCircle2 size={11} /> Always Enforced
                                </span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: textCol }}>
                                Strict RBAC
                            </h4>
                            <p style={{ margin: 0, fontSize: '12.5px', color: textMuted, lineHeight: '1.4' }}>
                                Always enforced server-side. Role-based access control guards every sensitive route, API handler, and resource query.
                            </p>
                        </div>
                        <div style={{ fontSize: '11px', color: textMuted, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px', borderTop: `1px solid ${borderCol}`, paddingTop: '8px' }}>
                            <Info size={12} />
                            <span>No disable option (Server locked)</span>
                        </div>
                    </div>

                    {/* Core 2: Audit Logs */}
                    <div style={{
                        background: bgMuted,
                        borderRadius: '12px',
                        padding: '18px',
                        border: `1px solid ${borderCol}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ClipboardCheck size={18} />
                                </div>
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <CheckCircle2 size={11} /> Always Active
                                </span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: textCol }}>
                                Audit Logs
                            </h4>
                            <p style={{ margin: 0, fontSize: '12.5px', color: textMuted, lineHeight: '1.4' }}>
                                Always active for critical admin, security, and payment actions. Immutable logs maintain accountability.
                            </p>
                        </div>
                        <div style={{ fontSize: '11px', color: textMuted, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px', borderTop: `1px solid ${borderCol}`, paddingTop: '8px' }}>
                            <Info size={12} />
                            <span>No disable option (Server locked)</span>
                        </div>
                    </div>

                    {/* Core 3: Automatic Backup */}
                    <div style={{
                        background: bgMuted,
                        borderRadius: '12px',
                        padding: '18px',
                        border: `1px solid ${borderCol}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Database size={18} />
                                </div>
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <CheckCircle2 size={11} /> Always Active
                                </span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: textCol }}>
                                Automatic Backup
                            </h4>
                            <p style={{ margin: 0, fontSize: '12.5px', color: textMuted, lineHeight: '1.4' }}>
                                Always active for system recovery. Ensures point-in-time recovery and snapshot protection against data loss.
                            </p>
                        </div>
                        <div style={{ fontSize: '11px', color: textMuted, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px', borderTop: `1px solid ${borderCol}`, paddingTop: '8px' }}>
                            <Info size={12} />
                            <span>No disable option (Server locked)</span>
                        </div>
                    </div>

                    {/* Core 4: Automatic Certificates */}
                    <div style={{
                        background: bgMuted,
                        borderRadius: '12px',
                        padding: '18px',
                        border: `1px solid ${borderCol}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Award size={18} />
                                </div>
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    background: `${successCol}18`,
                                    color: successCol,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <CheckCircle2 size={11} /> Always Automated
                                </span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: textCol }}>
                                Automatic Certificates
                            </h4>
                            <p style={{ margin: 0, fontSize: '12.5px', color: textMuted, lineHeight: '1.4' }}>
                                Automatically issue certificates after verified course completion. Instant credential generation for students.
                            </p>
                        </div>
                        <div style={{ fontSize: '11px', color: textMuted, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px', borderTop: `1px solid ${borderCol}`, paddingTop: '8px' }}>
                            <Info size={12} />
                            <span>No disable option (Server locked)</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 3: Database & Maintenance Utilities */}
            <div style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${borderCol}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HardDrive size={18} style={{ color: primaryCol }} />
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: textCol }}>
                                Database & Cache Maintenance
                            </h3>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: textMuted }}>
                            Trigger manual system recovery snapshots, collection index optimizations, or flush cached server responses.
                        </p>
                    </div>

                    {/* Metrics Summary Badge */}
                    {dbMetrics && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap',
                            background: bgMuted,
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: `1px solid ${borderCol}`,
                            fontSize: '12px'
                        }}>
                            <div>
                                <span style={{ color: textMuted }}>Database: </span>
                                <strong style={{ color: textCol }}>{dbMetrics.databaseName || 'MongoDB'}</strong>
                            </div>
                            <div>
                                <span style={{ color: textMuted }}>Collections: </span>
                                <strong style={{ color: textCol }}>{dbMetrics.collections?.length || 0}</strong>
                            </div>
                            <div>
                                <span style={{ color: textMuted }}>Storage: </span>
                                <strong style={{ color: textCol }}>
                                    {dbMetrics.storageSizeBytes ? `${(dbMetrics.storageSizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'Optimal'}
                                </strong>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleBackup}
                        disabled={dbActionLoading?.backup}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            background: bgMuted,
                            color: textCol,
                            border: `1px solid ${borderCol}`,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: dbActionLoading?.backup ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Database size={15} style={{ color: primaryCol }} />
                        <span>{dbActionLoading?.backup ? 'Creating Backup...' : 'Create Backup Now'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOptimizeDatabase}
                        disabled={dbActionLoading?.optimize}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            background: bgMuted,
                            color: textCol,
                            border: `1px solid ${borderCol}`,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: dbActionLoading?.optimize ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <RotateCw size={15} style={{ color: '#3b82f6' }} />
                        <span>{dbActionLoading?.optimize ? 'Optimizing...' : 'Optimize Indexes'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleClearCache}
                        disabled={dbActionLoading?.clearCache}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            background: bgMuted,
                            color: textCol,
                            border: `1px solid ${borderCol}`,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: dbActionLoading?.clearCache ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <RefreshCw size={15} style={{ color: '#f59e0b' }} />
                        <span>{dbActionLoading?.clearCache ? 'Purging Cache...' : 'Flush System Cache'}</span>
                    </button>
                </div>
            </div>

        </div>
    );
}
