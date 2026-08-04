import React from 'react';
import { Award, GraduationCap, Lightbulb, BookOpen, Download, Linkedin } from 'lucide-react';

export default function CertificatesTab(dash) {
    const { user, colors, setActiveTab, certificates, linkedInUrl, styles } = dash;

    return (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={20} aria-hidden="true" /> Earned Credentials &amp; Certificates
                </h2>
                <p style={styles.tabSubtitle}>Download your certificates of completion and share on LinkedIn</p>
            </div>

            {certificates.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', background: colors.bgCard, borderRadius: '20px', border: `1px dashed ${colors.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: `1px solid ${colors.accent}30` }}>
                        <GraduationCap size={36} color={colors.accent} aria-hidden="true" />
                    </div>
                    <h3 style={{ color: colors.text, fontSize: '22px', fontWeight: '900', margin: '0 0 10px' }}>Earn Industry-Recognized Credentials</h3>
                    <p style={{ color: colors.textMuted, fontSize: '14px', maxWidth: '480px', margin: '0 0 20px', lineHeight: 1.6 }}>
                        Certificates are awarded upon completing 100% of course lessons and scoring at least 60% on module quizzes. Earned certificates include verifiable IDs for LinkedIn sharing.
                    </p>
                    <div style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', textAlign: 'left' }}>
                        <Lightbulb size={20} color={colors.accent} aria-hidden="true" />
                        <span style={{ fontSize: '12px', color: colors.textMuted }}>
                            <strong style={{ color: colors.text }}>Pro Tip:</strong> Keep up a 7-day study streak to unlock bonus achievement badges alongside your certificates!
                        </span>
                    </div>
                    <button
                        onClick={() => setActiveTab('overview')}
                        style={{ ...styles.resumeBtn, padding: '14px 32px', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}
                        aria-label="Resume Active Courses"
                    >
                        <BookOpen size={17} aria-hidden="true" /> Resume Active Courses →
                    </button>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {certificates.map((cert) => (
                        <div
                            key={cert._id}
                            style={{ ...styles.certCard, background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.bgInput})`, position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `${colors.primary}10` }} />
                            <div style={{ ...styles.certIcon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Award size={32} color={colors.accent} aria-hidden="true" />
                            </div>
                            <h3 style={styles.certTitle}>{cert.courseRef?.courseTitle || 'Course Certificate'}</h3>
                            <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 4px' }}>
                                Issued to: <strong style={{ color: colors.text }}>{user?.fullName}</strong>
                            </p>
                            <p style={styles.certMeta}>
                                Certificate No: <span style={{ fontFamily: 'monospace', color: colors.primary }}>{cert.certificateNumber}</span>
                            </p>
                            {cert.issuedAt && (
                                <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 20px' }}>
                                    Issued: {new Date(cert.issuedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => window.open(cert.certificatePdfUrl, '_blank')}
                                    style={{ ...styles.downloadBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    aria-label="Download Certificate PDF"
                                >
                                    <Download size={15} aria-hidden="true" /> Download PDF
                                </button>
                                {linkedInUrl && (
                                    <button
                                        onClick={() => window.open(
                                            `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.courseRef?.courseTitle || 'EMARE Certificate')}&organizationName=EMARE+ICT+Hub`,
                                            '_blank'
                                        )}
                                        style={{ ...styles.resumeBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        aria-label="Share on LinkedIn"
                                    >
                                        <Linkedin size={15} aria-hidden="true" /> LinkedIn
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
