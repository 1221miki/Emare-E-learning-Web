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
    const isDark = theme === 'dark';

    const [certificates, setCertificates] = useState([]);
    const [eligibility, setEligibility]   = useState([]);
    const [eligibilityLoading, setEligibilityLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [issuingId, setIssuingId]       = useState(null);
    const [issueError, setIssueError]     = useState('');
    const [issuedMsg, setIssuedMsg]       = useState('');
    const [copyMsg, setCopyMsg]           = useState('');

    const fetchCertificates = useCallback(async () => {
        try {
            const res = await certificateService.getMine();
            setCertificates(res.data?.data || []);
        } catch (err) {
            console.error('[CertificatesPage] fetch certificates failed:', err);
        }
    }, []);

    const fetchEligibility = useCallback(async () => {
        setEligibilityLoading(true);
        try {
            const res = await certificateService.getEligibilityOverview();
            setEligibility(res.data?.data || []);
        } catch (err) {
            console.error('[CertificatesPage] fetch eligibility overview failed:', err);
            setEligibility([]);
        } finally {
            setEligibilityLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCertificates();
        fetchEligibility();
    }, [fetchCertificates, fetchEligibility]);

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

    // ── Issue certificate (only possible once the backend approves eligibility) ─
    const handleGetCertificate = async (courseId, courseTitle) => {
        setIssuingId(courseId);
        setIssueError('');
        setIssuedMsg('');
        try {
            await certificateService.issue(courseId);
            await Promise.all([fetchCertificates(), fetchEligibility()]);
            setIssuedMsg(`Certificate issued for "${courseTitle}" — you can download it below.`);
        } catch (err) {
            setIssueError(err?.response?.data?.message || 'Unable to generate certificate.');
        } finally {
            setIssuingId(null);
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

    const handleVerify = (certId) => navigate(`/verify-certificate/${certId}`);

    const reqColor = (done) =>
        done ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)')
              : (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(254,242,242,1)');

    // ── Render a single eligibility tracker card ─────────────────────────────
    const renderTrackerCard = (item) => {
        const course     = item.course || {};
        const courseId   = item.course?._id || item.course?.courseRef;
        const report     = item.report || {};
        const requirements = report.requirements || [];
        const pct        = Math.min(100, Math.max(0, item.completionPercentage || 0));
        const missing    = report.missingRequirements || [];
        const earned     = item.hasCertificate;
        const locked     = !item.eligible;

        return (
            <div key={`track-${courseId || course._id || Math.random()}`} style={{
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                padding: 22,
                display: 'flex', flexDirection: 'column', gap: 16
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: locked ? '#f59e0b' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                            {earned ? '🏅 Certificate Earned' : (locked ? '🔒 In Progress' : '✅ Ready for Certificate')}
                        </div>
                        <h3 style={{ color: colors.text, margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
                            {course.courseTitle || course.title || 'Course'}
                        </h3>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: colors.text, fontSize: 24, fontWeight: 800 }}>{pct}%</div>
                        <div style={{ color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>complete</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 8, borderRadius: 999, background: colors.bgInput, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: locked ? 'linear-gradient(90deg,#f59e0b,#f97316)' : 'linear-gradient(90deg,#10b981,#059669)', transition: 'width 0.4s ease' }} />
                </div>

                {/* Missing summary chips */}
                {!earned && missing.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {missing.map(m => (
                            <span key={m} style={{ background: reqColor(false), color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                                {m} missing
                            </span>
                        ))}
                    </div>
                )}

                {/* Requirement checklist */}
                {!earned && requirements.length > 0 && (
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {requirements.map(req => (
                            <div key={req.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 14, marginTop: 1 }}>{req.done ? '✅' : '⬜'}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
                                        {req.title}
                                        {req.lessonTitle ? <span style={{ color: colors.textMuted, fontWeight: 400 }}> — {req.lessonTitle}</span> : null}
                                    </div>
                                    <div style={{ color: req.done ? '#10b981' : colors.textMuted, fontSize: 12, marginTop: 1 }}>
                                        {req.detail}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Issue error */}
                {issueError && issuingId === courseId && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
                        ⚠ {issueError}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {earned ? (
                        <button onClick={() => handleVerify(certIdOf(item))} style={{ ...buttonBase(colors), background: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}` }}>
                            🔍 Verify Certificate
                        </button>
                    ) : locked ? (
                        <button onClick={() => navigate(`/student/learn/${courseId || ''}`)} style={{ ...buttonBase(colors), background: colors.primary, color: '#fff' }}>
                            Continue Learning →
                        </button>
                    ) : (
                        <button
                            onClick={() => handleGetCertificate(courseId, course.courseTitle || course.title)}
                            disabled={issuingId === courseId}
                            style={{ ...buttonBase(colors), background: issuingId === courseId ? colors.textMuted : 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', cursor: issuingId === courseId ? 'not-allowed' : 'pointer' }}
                        >
                            {issuingId === courseId ? 'Issuing…' : '🎓 Get My Certificate'}
                        </button>
                    )}
                    {!earned && pct > 0 && (
                        <button onClick={() => navigate(`/student/learn/${courseId || ''}`)} style={{ ...buttonBase(colors), background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                            Resume
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const certIdOf = (item) =>
        item.certificate?.certificateId || item.certificate?.certificateNumber || item.certificate?._id || '';

    const buttonBase = (colors) => ({
        border: 'none', padding: '10px 18px', borderRadius: 10,
        fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', gap: 6, textDecoration: 'none'
    });

    const pendingCourses = eligibility.filter(e => !e.hasCertificate);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit', sans-serif" }}>
            <Sidebar navItems={navItems} activeTab="certificates" />

            <main style={{ marginLeft: '260px', padding: '40px', flex: 1 }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ color: colors.text, fontSize: 28, fontWeight: 800, margin: 0 }}>
                        🎓 My Certificates
                    </h1>
                    <p style={{ color: colors.textMuted, marginTop: 6, fontSize: 14 }}>
                        Complete every lesson, required quiz and assignment — then your certificate unlocks automatically.
                    </p>
                </div>

                {issuedMsg && (
                    <div style={{ marginBottom: 20, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
                        🎉 {issuedMsg}
                    </div>
                )}

                {/* ── Completion tracker ── */}
                {eligibilityLoading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: colors.textMuted }}>
                        Loading your course progress…
                    </div>
                ) : pendingCourses.length > 0 ? (
                    <>
                        <h2 style={{ color: colors.text, fontSize: 19, fontWeight: 800, margin: '0 0 16px' }}>
                            Your Progress
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                            gap: 24, marginBottom: 40
                        }}>
                            {pendingCourses.map(renderTrackerCard)}
                        </div>
                    </>
                ) : null}

                {/* ── Earned certificates ── */}
                {certificates.length === 0 ? (
                    <div style={{
                        padding: 48, background: colors.bgCard,
                        border: `1px solid ${colors.border}`, borderRadius: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>📜</div>
                        <h3 style={{ color: colors.text, margin: '0 0 8px' }}>{pendingCourses.length ? 'A certificate will appear here when you finish' : 'No certificates yet'}</h3>
                        <p style={{ color: colors.textMuted, fontSize: 14 }}>
                            Finish all lessons, pass required quizzes, get required assignments approved, and clear payment to unlock your certificate.
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
                                    <div style={{
                                        position: 'absolute', top: -10, right: -10,
                                        fontSize: 120, opacity: 0.06, userSelect: 'none', pointerEvents: 'none'
                                    }}>🎓</div>

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

                                    <div style={{
                                        color: isRevoked ? '#9ca3af' : '#fbbf24',
                                        fontSize: 11, fontWeight: 800, letterSpacing: 2,
                                        textTransform: 'uppercase', marginBottom: 12
                                    }}>
                                        Certificate of Completion
                                    </div>

                                    <h3 style={{ color: isRevoked ? '#9ca3af' : '#ffffff', fontSize: 20, margin: '0 0 6px', lineHeight: 1.3 }}>
                                        {courseName}
                                    </h3>

                                    <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                                        Issued: {issueDate}
                                    </div>

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

                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

                                        <button onClick={() => handleVerify(certId)} style={{
                                            background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            padding: '10px 14px', borderRadius: 8,
                                            cursor: 'pointer', fontWeight: 600, fontSize: 13
                                        }}>
                                            🔍 Verify
                                        </button>

                                        <button onClick={() => handleCopyLink(certId)} style={{
                                            background: isCopied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                                            color: isCopied ? '#10b981' : '#94a3b8',
                                            border: `1px solid ${isCopied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'}`,
                                            padding: '10px 14px', borderRadius: 8,
                                            cursor: 'pointer', fontWeight: 600, fontSize: 13
                                        }}>
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