import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { certificateService } from '../../services/api.jsx';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
    { label: 'Dashboard',    path: '/student/dashboard',           key: 'dashboard' },
    { label: 'My Courses',   path: '/student/dashboard?tab=my_courses', key: 'courses' },
    { label: 'Certificates', path: '/student/certificates',         key: 'certificates' },
    { label: 'Profile',      path: '/student/profile',              key: 'profile' },
    { label: 'Leaderboard',  path: '/leaderboard',                  key: 'leaderboard' },
    { label: 'Course Catalog', path: '/courses',                    key: 'catalog' }
];

export default function CertificatesPage() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const [certificates, setCertificates] = useState([]);
    const [downloadingId, setDownloadingId] = useState(null);
    const [copyMsg, setCopyMsg]           = useState('');

    const fetchCertificates = useCallback(async () => {
        try {
            const res = await certificateService.getMine();
            setCertificates(res.data?.data || []);
        } catch (err) {
            console.error('[CertificatesPage] fetch failed:', err);
        }
    }, []);

    useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

    // ── Download PDF ──────────────────────────────────────────────────────────
    const handleDownload = async (cert) => {
        setDownloadingId(cert._id);
        try {
            const res = await certificateService.download(cert._id, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `${cert.certificateId || cert.certificateNumber || cert._id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[CertificatesPage] download failed:', err);
            alert('Download failed. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    // ── Copy verification link ────────────────────────────────────────────────
    const handleCopyLink = (certId) => {
        const url = `${window.location.origin}/verify-certificate/${certId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopyMsg(certId);
            setTimeout(() => setCopyMsg(''), 2000);
        });
    };

    // ── Navigate to verify page ───────────────────────────────────────────────
    const handleVerify = (certId) => {
        navigate(`/verify-certificate/${certId}`);
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const isDark = theme === 'dark';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit', sans-serif" }}>
            <Sidebar navItems={navItems} activeTab="certificates" />

            <main style={{ marginLeft: '260px', padding: '40px', flex: 1 }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ color: colors.text, fontSize: 28, fontWeight: 800, margin: 0 }}>
                        🎓 My Certificates
                    </h1>
                    <p style={{ color: colors.textMuted, marginTop: 6, fontSize: 14 }}>
                        Download, share, or verify your earned certificates.
                    </p>
                </div>

                {certificates.length === 0 ? (
                    <div style={{
                        padding: 48, background: colors.bgCard,
                        border: `1px solid ${colors.border}`, borderRadius: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>📜</div>
                        <h3 style={{ color: colors.text, margin: '0 0 8px' }}>No certificates yet</h3>
                        <p style={{ color: colors.textMuted, fontSize: 14 }}>
                            Complete a course at least 90% to earn your certificate.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                        gap: 24
                    }}>
                        {certificates.map(cert => {
                            const certId = cert.certificateId || cert.certificateNumber || cert._id;
                            const courseName = cert.courseRef?.courseTitle || cert.courseRef?.title || 'Course';
                            const issueDate  = new Date(cert.issueDate || cert.completionDate || cert.createdAt)
                                .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            const isRevoked  = cert.status === 'Revoked';
                            const isCopied   = copyMsg === certId;

                            return (
                                <div key={cert._id} style={{
                                    background: isRevoked
                                        ? (isDark ? '#1a1a1a' : '#f9f9f9')
                                        : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    border: `2px solid ${isRevoked ? '#ef4444' : '#eab308'}`,
                                    borderRadius: 16,
                                    padding: 28,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: isRevoked ? 'none' : '0 10px 30px rgba(0,0,0,0.25)',
                                    opacity: isRevoked ? 0.75 : 1
                                }}>
                                    {/* Background emoji watermark */}
                                    <div style={{
                                        position: 'absolute', top: -10, right: -10,
                                        fontSize: 120, opacity: 0.06, userSelect: 'none', pointerEvents: 'none'
                                    }}>🎓</div>

                                    {/* Revoked badge */}
                                    {isRevoked && (
                                        <div style={{
                                            position: 'absolute', top: 14, right: 14,
                                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                            border: '1px solid rgba(239,68,68,0.4)',
                                            borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700
                                        }}>
                                            REVOKED
                                        </div>
                                    )}

                                    {/* Header label */}
                                    <div style={{
                                        color: isRevoked ? '#9ca3af' : '#fbbf24',
                                        fontSize: 11, fontWeight: 800, letterSpacing: 2,
                                        textTransform: 'uppercase', marginBottom: 12
                                    }}>
                                        Certificate of Completion
                                    </div>

                                    {/* Course name */}
                                    <h3 style={{
                                        color: isRevoked ? '#9ca3af' : '#ffffff',
                                        fontSize: 20, margin: '0 0 6px', lineHeight: 1.3
                                    }}>
                                        {courseName}
                                    </h3>

                                    {/* Issue date */}
                                    <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                                        Issued: {issueDate}
                                    </div>

                                    {/* Certificate ID box */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 10, padding: '12px 16px', marginBottom: 20
                                    }}>
                                        <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                                            Certificate ID
                                        </div>
                                        <div style={{
                                            color: isRevoked ? '#9ca3af' : '#fbbf24',
                                            fontSize: 14, fontFamily: 'monospace', fontWeight: 700,
                                            letterSpacing: '0.05em', wordBreak: 'break-all'
                                        }}>
                                            {certId}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {/* Download */}
                                        <button
                                            onClick={() => handleDownload(cert)}
                                            disabled={isRevoked || downloadingId === cert._id}
                                            style={{
                                                flex: 1, minWidth: 100,
                                                background: isRevoked ? 'rgba(255,255,255,0.08)' : '#eab308',
                                                color: isRevoked ? '#9ca3af' : '#000',
                                                border: 'none', padding: '10px 12px', borderRadius: 8,
                                                cursor: isRevoked || downloadingId === cert._id ? 'not-allowed' : 'pointer',
                                                fontWeight: 700, fontSize: 13,
                                                opacity: downloadingId === cert._id ? 0.7 : 1,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                            }}
                                        >
                                            {downloadingId === cert._id ? (
                                                <>
                                                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                                    Downloading…
                                                </>
                                            ) : '⬇ Download PDF'}
                                        </button>

                                        {/* Verify */}
                                        <button
                                            onClick={() => handleVerify(certId)}
                                            style={{
                                                background: 'rgba(255,255,255,0.1)',
                                                color: '#e2e8f0',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                padding: '10px 14px', borderRadius: 8,
                                                cursor: 'pointer', fontWeight: 600, fontSize: 13
                                            }}
                                        >
                                            🔍 Verify
                                        </button>

                                        {/* Copy link */}
                                        <button
                                            onClick={() => handleCopyLink(certId)}
                                            style={{
                                                background: isCopied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                                                color: isCopied ? '#10b981' : '#94a3b8',
                                                border: `1px solid ${isCopied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'}`,
                                                padding: '10px 14px', borderRadius: 8,
                                                cursor: 'pointer', fontWeight: 600, fontSize: 13
                                            }}
                                        >
                                            {isCopied ? '✓ Copied!' : '🔗 Copy'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
