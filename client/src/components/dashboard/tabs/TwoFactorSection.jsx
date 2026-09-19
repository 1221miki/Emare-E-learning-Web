import React, { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone, KeyRound, Copy, Check, X } from 'lucide-react';
import { authService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const DANGER = '#ef4444';

export default function TwoFactorSection({ user, twoFactorEnabled, setTwoFactorEnabled, colors, styles, t }) {
    const { updateUser } = useAuth();
    const [method, setMethod] = useState(user?.twoFactorMethod || '');
    const [mode, setMode] = useState('idle');
    const [chooseMethod, setChooseMethod] = useState('authenticator');
    const [currentPassword, setCurrentPassword] = useState('');
    const [code, setCode] = useState('');
    const [secret, setSecret] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let active = true;
        authService.getTwoFactorStatus()
            .then(({ data }) => {
                if (!active || !data?.data) return;
                setMethod(data.data.twoFactorMethod || '');
                if (typeof data.data.twoFactorEnabled === 'boolean') {
                    setTwoFactorEnabled(data.data.twoFactorEnabled);
                }
            })
            .catch(() => { /* fall back to profile state */ });
        return () => { active = false; };
    }, [setTwoFactorEnabled]);

    const resetFlow = () => {
        setMode('idle');
        setCurrentPassword('');
        setCode('');
        setSecret('');
        setQrDataUrl('');
        setError('');
        setCopied(false);
    };

    const finishEnable = (enabledMethod) => {
        setMethod(enabledMethod);
        setTwoFactorEnabled(true);
        updateUser({ twoFactorEnabled: true, twoFactorMethod: enabledMethod });
        setSuccess('Two-factor authentication has been enabled.');
        resetFlow();
    };

    const finishDisable = () => {
        setMethod('');
        setTwoFactorEnabled(false);
        updateUser({ twoFactorEnabled: false, twoFactorMethod: '' });
        setSuccess('Two-factor authentication has been disabled.');
        resetFlow();
    };

    const startSetup = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!currentPassword) {
            setError('Please enter your current password.');
            return;
        }
        setBusy(true);
        try {
            const { data } = await authService.setupTwoFactor({ method: chooseMethod, currentPassword });
            setCode('');
            if (chooseMethod === 'authenticator') {
                setSecret(data.data.secret);
                setQrDataUrl(data.data.qrDataUrl);
            }
            setMode('verify');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not start 2FA setup. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const confirmSetup = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!code.trim()) {
            setError('Please enter the 6-digit verification code.');
            return;
        }
        setBusy(true);
        try {
            await authService.verifyTwoFactorSetup({ method: chooseMethod, code: code.trim(), currentPassword });
            finishEnable(chooseMethod);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setBusy(false);
        }
    };

    const resendSetupCode = async () => {
        setError('');
        setBusy(true);
        try {
            await authService.setupTwoFactor({ method: 'sms', currentPassword });
            setSuccess('A new verification code has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not resend the code.');
        } finally {
            setBusy(false);
        }
    };

    const sendDisableCode = async () => {
        setError('');
        if (!currentPassword) {
            setError('Please enter your current password first.');
            return;
        }
        setBusy(true);
        try {
            await authService.sendTwoFactorManagementCode({ currentPassword });
            setSuccess('A verification code has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send the code.');
        } finally {
            setBusy(false);
        }
    };

    const confirmDisable = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!currentPassword || !code.trim()) {
            setError('Your current password and a valid verification code are required.');
            return;
        }
        setBusy(true);
        try {
            await authService.disableTwoFactor({ currentPassword, code: code.trim() });
            finishDisable();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not disable 2FA. Please check your details and try again.');
        } finally {
            setBusy(false);
        }
    };

    const copySecret = async () => {
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable */ }
    };

    const cardStyle = { padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` };
    const actionBtn = {
        background: twoFactorEnabled ? DANGER : colors.primary,
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 18px',
        fontWeight: '700',
        fontSize: '13px',
        cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.7 : 1
    };
    const ghostBtn = { background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '10px 18px', fontWeight: '700', fontSize: '13px', cursor: busy ? 'not-allowed' : 'pointer' };
    const optionStyle = (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flex: 1,
        minWidth: '180px',
        padding: '14px',
        borderRadius: '10px',
        cursor: 'pointer',
        background: active ? `${colors.primary}15` : colors.bgCard,
        border: `1px solid ${active ? colors.primary : colors.border}`
    });

    return (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>{t('section_2fa')}</span>
                        <span style={{ background: twoFactorEnabled ? `${colors.success}15` : `${DANGER}15`, color: twoFactorEnabled ? colors.success : DANGER, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                            {twoFactorEnabled ? t('twofa_status_enabled') : t('twofa_status_disabled')}
                        </span>
                        {twoFactorEnabled && method && (
                            <span style={{ background: `${colors.primary}15`, color: colors.primary, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                {method === 'authenticator' ? 'Authenticator app' : 'Email code'}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginTop: '4px' }}>
                        {t('twofa_desc')}
                    </span>
                </div>
                {mode === 'idle' && (
                    <button type="button" onClick={() => { resetFlow(); setSuccess(''); if (twoFactorEnabled) { setMode('disable'); } else { setMode('choose'); } }} style={actionBtn} disabled={busy}>
                        {twoFactorEnabled ? t('btn_disable_2fa') : t('btn_enable_2fa')}
                    </button>
                )}
            </div>

            {success && <div style={styles.successAlert}>{success}</div>}
            {error && <div style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER, padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>{error}</div>}

            {/* Step 1 (enable): choose method + confirm password */}
            {mode === 'choose' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div onClick={() => setChooseMethod('authenticator')} style={optionStyle(chooseMethod === 'authenticator')}>
                            <ShieldCheck size={20} color={colors.primary} aria-hidden="true" />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text }}>Authenticator app</div>
                                <div style={{ fontSize: '11px', color: colors.textMuted }}>Google Authenticator, Authy, etc.</div>
                            </div>
                        </div>
                        <div onClick={() => setChooseMethod('sms')} style={optionStyle(chooseMethod === 'sms')}>
                            <Smartphone size={20} color={colors.primary} aria-hidden="true" />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text }}>Email code</div>
                                <div style={{ fontSize: '11px', color: colors.textMuted }}>Receive a one-time code by email</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>{t('lbl_current_pw')}</label>
                        <input
                            type="password"
                            style={styles.input}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); startSetup(); } }}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={startSetup} style={actionBtn} disabled={busy}>
                            {busy ? 'Starting...' : 'Continue'}
                        </button>
                        <button type="button" onClick={resetFlow} style={ghostBtn} disabled={busy}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Step 2 (enable): verify code */}
            {mode === 'verify' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {chooseMethod === 'authenticator' ? (
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {qrDataUrl && (
                                <img src={qrDataUrl} alt="Scan this QR code with your authenticator app" style={{ width: '160px', height: '160px', borderRadius: '10px', background: '#fff', padding: '8px', border: `1px solid ${colors.border}` }} />
                            )}
                            <div style={{ flex: 1, minWidth: '220px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Scan the QR code</div>
                                <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '10px' }}>Or enter this setup key manually:</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <code style={{ flex: 1, background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px', fontSize: '12px', wordBreak: 'break-all', color: colors.text }}>{secret}</code>
                                    <button type="button" onClick={copySecret} style={{ ...ghostBtn, padding: '10px' }} title="Copy setup key">
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '13px', color: colors.textMuted }}>
                            We sent a 6-digit verification code to <strong style={{ color: colors.text }}>{user?.accountEmail}</strong>.
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>{t('lbl_current_pw')}</label>
                        <input type="password" style={styles.input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmSetup(); } }} placeholder="••••••••" autoComplete="current-password" />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Verification code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            style={{ ...styles.input, letterSpacing: '6px', maxWidth: '220px' }}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmSetup(); } }}
                            placeholder="000000"
                            autoComplete="one-time-code"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={confirmSetup} style={actionBtn} disabled={busy}>
                            {busy ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                        {chooseMethod === 'sms' && (
                            <button type="button" onClick={resendSetupCode} style={ghostBtn} disabled={busy}>Resend code</button>
                        )}
                        <button type="button" onClick={resetFlow} style={ghostBtn} disabled={busy}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Disable flow */}
            {mode === 'disable' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '13px', color: colors.textMuted }}>
                        {method === 'sms'
                            ? 'Enter your password, request a code, then enter it below to disable 2FA.'
                            : 'Enter your password and the current code from your authenticator app to disable 2FA.'}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>{t('lbl_current_pw')}</label>
                        <input type="password" style={styles.input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmDisable(); } }} placeholder="••••••••" autoComplete="current-password" />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Verification code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            style={{ ...styles.input, letterSpacing: '6px', maxWidth: '220px' }}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmDisable(); } }}
                            placeholder="000000"
                            autoComplete="one-time-code"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {method === 'sms' && (
                            <button type="button" onClick={sendDisableCode} style={ghostBtn} disabled={busy}>Send code</button>
                        )}
                        <button type="button" onClick={confirmDisable} style={actionBtn} disabled={busy}>
                            {busy ? 'Disabling...' : 'Disable 2FA'}
                        </button>
                        <button type="button" onClick={resetFlow} style={ghostBtn} disabled={busy}>
                            <X size={13} style={{ verticalAlign: 'middle' }} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {mode === 'idle' && !twoFactorEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: colors.textMuted }}>
                    <KeyRound size={14} aria-hidden="true" /> Recommended: protect your account with a second factor.
                </div>
            )}
        </div>
    );
}
