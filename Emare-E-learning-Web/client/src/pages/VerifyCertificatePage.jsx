/**
 * VerifyCertificatePage.jsx
 *
 * PUBLIC page — no login required.
 * Anyone can verify a certificate by entering or scanning the certificate ID.
 *
 * Route: /verify-certificate/:certificateId?
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { certificateService } from '../services/api.jsx';
import { useTheme } from '../context/ThemeContext';

export default function VerifyCertificatePage() {
    const { certificateId: paramId } = useParams();
    const navigate = useNavigate();
    const { colors, theme } = useTheme();
    const inputRef = useRef(null);

    const [query,   setQuery]   = useState(paramId || '');
    const [loading, setLoading] = useState(false);
    const [result,  setResult]  = useState(null);   // { valid, data } | null
    const [error,   setError]   = useState('');

    // Auto-verify if ID is in URL
    useEffect(() => {
        if (paramId) verify(paramId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramId]);

    const verify = async (id) => {
        const trimmed = (id || query).trim().toUpperCase();
        if (!trimmed) { setError('Please enter a Certificate ID.'); return; }

        setLoading(true);
        setResult(null);
        setError('');

        try {
            const res = await certificateService.verify(trimmed);
            setResult({ valid: res.data?.valid, data: res.data?.data });
        } catch (err) {
            const msg = err?.response?.data?.message;
            if (err?.response?.status === 404) {
                setResult({ valid: false, data: null });
            } else {
                setError(msg || 'Verification failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        verify(query);
        // Update URL for shareability
        navigate(`/verify-certificate/${query.trim().toUpperCase()}`, { replace: true });
    };

    const isDark = theme === 'dark';

    const field = (label, value) => value ? (
        <div style={{ marginBottom: 14 }}>
            <div style={{ color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ color: colors.text, fontSize: 15, fontWeight: 600 }}>{value}</div>
        </div>
    ) : null;

    return (
        <div style={{
            minHeight: '100vh',
            background: colors.bg,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '60px 20px', fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Back link */}
            <div style={{ width: '100%', maxWidth: 560, marginBottom: 20 }}>
                <button onClick={() => navigate('/')} style={{
                    background: 'none', border: 'none', color: colors.textMuted,
                    cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0,
                    display: 'flex', alignItems: 'center', gap: 6
                }}>
                    ← Back to Home
                </button>
            </div>

            {/* Card */}
            <div style={{
                width: '100%', maxWidth: 560,
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: 20, padding: '36px 32px',
                boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.08)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
                    <h1 style={{ color: colors.text, fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>
                        Certificate Verification
                    </h1>
                    <p style={{ color: colors.textMuted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                        Enter the Certificate ID printed on the certificate to verify its authenticity.
                    </p>
                </div>

                {/* Search form */}
                <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
                    <label style={{
                        display: 'block', color: colors.textMuted, fontSize: 12,
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
                    }}>
                        Certificate ID
                    </label>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => { setQuery(e.target.value.toUpperCase()); setResult(null); setError(''); }}
                        placeholder="e.g. EMARE-CERT-2026-000001"
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            background: colors.bgInput,
                            border: `1.5px solid ${error ? '#ef4444' : colors.border}`,
                            color: colors.text,
                            padding: '13px 16px', borderRadius: 10, fontSize: 14,
                            outline: 'none', fontFamily: 'monospace', letterSpacing: '0.04em',
                            marginBottom: 14, transition: 'border-color 0.2s'
                        }}
                        autoFocus
                        spellCheck={false}
                        autoComplete="off"
                    />
                    {error && (
                        <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, margin: '-8px 0 10px' }}>
                            ⚠ {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        style={{
                            width: '100%', padding: '13px',
                            background: loading || !query.trim()
                                ? colors.textMuted
                                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            color: '#fff', border: 'none', borderRadius: 10,
                            fontSize: 15, fontWeight: 700, cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                Verifying…
                            </>
                        ) : '🔍 Verify Certificate'}
                    </button>
                </form>

                {/* Result */}
                {result && (
                    <div style={{
                        borderRadius: 14, padding: '20px 22px',
                        background: result.valid
                            ? (isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4')
                            : (isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2'),
                        border: `1.5px solid ${result.valid ? (isDark ? 'rgba(16,185,129,0.35)' : '#86efac') : (isDark ? 'rgba(239,68,68,0.35)' : '#fca5a5')}`
                    }}>
                        {result.valid ? (
                            <>
                                {/* Valid header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                    <div style={{ fontSize: 28 }}>✅</div>
                                    <div>
                                        <div style={{ color: isDark ? '#34d399' : '#065f46', fontWeight: 800, fontSize: 16 }}>
                                            Certificate is Valid
                                        </div>
                                        <div style={{ color: isDark ? '#6ee7b7' : '#047857', fontSize: 13 }}>
                                            This is an authentic certificate issued by Emare ICT Hub.
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ borderTop: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#bbf7d0'}`, paddingTop: 16 }}>
                                    {field('Certificate ID',    result.data?.certificateId)}
                                    {field('Student Name',      result.data?.studentName)}
                                    {field('Course',            result.data?.course)}
                                    {field('Issue Date',        result.data?.issueDate
                                        ? new Date(result.data.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                        : null)}
                                    {field('Completion Date',   result.data?.completionDate
                                        ? new Date(result.data.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                        : null)}
                                    {field('Issued by',         result.data?.issuer || 'Emare ICT Hub')}
                                    {field('Grade',             result.data?.grade)}
                                    {field('Platform',          result.data?.platform)}
                                    <div style={{ marginTop: 6 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            background: isDark ? 'rgba(16,185,129,0.15)' : '#d1fae5',
                                            color: isDark ? '#34d399' : '#065f46',
                                            border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#6ee7b7'}`,
                                            borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700
                                        }}>
                                            ● Status: {result.data?.status || 'Issued'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ fontSize: 28, flexShrink: 0 }}>❌</div>
                                <div>
                                    <div style={{ color: isDark ? '#f87171' : '#991b1b', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                                        Certificate Not Found
                                    </div>
                                    <div style={{ color: isDark ? '#fca5a5' : '#b91c1c', fontSize: 13, lineHeight: 1.6 }}>
                                        The ID <strong>{query}</strong> does not match any certificate issued by Emare ICT Hub.
                                        Please check the ID and try again.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Info footer */}
                <div style={{
                    marginTop: 24, padding: '14px 16px', borderRadius: 10,
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                    border: `1px solid ${colors.border}`
                }}>
                    <p style={{ color: colors.textMuted, fontSize: 12, margin: 0, lineHeight: 1.7 }}>
                        🔒 Certificate IDs are unique and permanently stored in our database.
                        Each certificate has a different ID — even for the same course.
                        This verification is provided by <strong>Emare ICT Hub</strong>.
                    </p>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
