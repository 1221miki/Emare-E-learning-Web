import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import DeveloperCard from './DeveloperCard';

export default function DeveloperSection() {
    const { colors } = useTheme();
    const [developers, setDevelopers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeDeveloper, setActiveDeveloper] = useState(null);

    // ── Fetch developers on mount ──────────────────────────
    useEffect(() => {
        let isMounted = true;
        const fetchDevelopers = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await API.get('/developers');
                if (isMounted) setDevelopers(res.data.data || []);
            } catch (err) {
                if (isMounted) {
                    setError(err.response?.data?.message || 'Failed to load developers');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchDevelopers();
        return () => { isMounted = false; };
    }, []);

    // Close modal with Escape key
    useEffect(() => {
        if (!activeDeveloper) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setActiveDeveloper(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeDeveloper]);

    const styles = {
        section: { fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text },
        hero: { padding: '100px 5% 40px', textAlign: 'center' },
        heroLabel: { color: colors.primary, fontSize: '13px', letterSpacing: '0.2em', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' },
        heroTitle: { fontSize: '44px', fontWeight: '900', lineHeight: '1.05', margin: '0 auto 18px', maxWidth: '860px' },
        heroSubtitle: { color: colors.textMuted, fontSize: '17px', lineHeight: '1.8', maxWidth: '720px', margin: '0 auto' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', padding: '40px 5%', maxWidth: '1400px', margin: '0 auto 80px' },
        skills: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
        skillTag: { background: colors.bgInput, border: `1px solid ${colors.primary}33`, borderRadius: '999px', color: colors.text, padding: '10px 14px', fontSize: '12px', fontWeight: '700' },
        statusText: { textAlign: 'center', color: colors.textMuted, padding: '60px 5%' },
        modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' },
        modal: { width: 'min(100%, 720px)', maxWidth: '720px', maxHeight: '90vh', background: colors.bgCard, borderRadius: '30px', border: `1px solid ${colors.border}`, padding: '28px', boxShadow: '0 30px 90px rgba(0,0,0,0.28)', position: 'relative', overflowY: 'auto' },
        modalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' },
        modalTitle: { margin: 0, fontSize: '24px', fontWeight: '900', color: colors.text },
        modalSubtitle: { margin: '10px 0 0', color: colors.textMuted, fontSize: '14px', lineHeight: 1.8, maxWidth: '100%' },
        modalContent: { display: 'grid', gap: '18px' },
        modalSection: { display: 'grid', gap: '12px' },
        sectionTitle: { margin: 0, fontSize: '16px', fontWeight: '800', color: colors.text },
        sectionText: { margin: 0, color: colors.textMuted, fontSize: '14px', lineHeight: 1.8 },
        detailPeriod: { color: colors.textMuted, fontSize: '13px', fontWeight: '600' },
        experienceItem: { marginBottom: '18px' },
        experienceRow: { display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
        experienceDesc: { margin: '6px 0 0', color: colors.textMuted, fontSize: '14px', lineHeight: 1.8 },
        modalClose: { position: 'absolute', top: '22px', right: '22px', width: '44px', height: '44px', borderRadius: '14px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, cursor: 'pointer', fontWeight: '800', fontSize: '18px' }
    };

    // ── Loading / Error / Empty states ─────────────────────
    let content;
    if (loading) {
        content = <p style={styles.statusText}>Loading developers...</p>;
    } else if (error) {
        content = <p style={styles.statusText}>{error}</p>;
    } else if (developers.length === 0) {
        content = <p style={styles.statusText}>No developer profiles available yet.</p>;
    } else {
        content = (
            <div style={styles.grid}>
                {developers.map((developer) => (
                    <DeveloperCard
                        key={developer._id}
                        developer={developer}
                        onDetail={setActiveDeveloper}
                    />
                ))}
            </div>
        );
    }

    return (
        <section id="developers" style={styles.section}>
            <div style={styles.hero}>
                <div style={styles.heroLabel}>EMARE DEVELOPERS</div>
                <h2 style={styles.heroTitle}>Let's Introduce Our Developer</h2>
                <p style={styles.heroSubtitle}>
                    Meet the Emare development team behind the platform. Each developer brings technical depth,
                    creative problem solving, and a commitment to building products that serve learners across Ethiopia.
                </p>
            </div>

            {content}

            {/* ── Dynamic Detail Modal ─────────────────────── */}
            {activeDeveloper ? (
                <div style={styles.modalOverlay} onClick={() => setActiveDeveloper(null)}>
                    <div
                        style={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${activeDeveloper.name} details`}
                    >
                        <button
                            style={styles.modalClose}
                            onClick={() => setActiveDeveloper(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <div style={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {activeDeveloper.profilePicture ? (
                                    <img
                                        src={activeDeveloper.profilePicture}
                                        alt={activeDeveloper.name}
                                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${colors.primary}` }}
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : null}
                                <div>
                                    <h3 style={styles.modalTitle}>{activeDeveloper.name}</h3>
                                    <p style={styles.modalSubtitle}>{activeDeveloper.title}</p>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalContent}>
                            <div style={styles.modalSection}>
                                <h4 style={styles.sectionTitle}>Skills</h4>
                                <div style={styles.skills}>
                                    {(activeDeveloper.skills || []).map((skill, idx) => (
                                        <span key={idx} style={styles.skillTag}>{skill}</span>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.modalSection}>
                                <h4 style={styles.sectionTitle}>Summary</h4>
                                <p style={styles.sectionText}>{activeDeveloper.summary}</p>
                            </div>

                            <div style={styles.modalSection}>
                                <h4 style={styles.sectionTitle}>Experience</h4>
                                {(activeDeveloper.experiences || []).length === 0 ? (
                                    <p style={styles.sectionText}>No experience listed.</p>
                                ) : (
                                    (activeDeveloper.experiences || []).map((exp, expIndex) => (
                                        <div key={expIndex} style={styles.experienceItem}>
                                            <div style={styles.experienceRow}>
                                                <span style={styles.sectionTitle}>{exp.role}</span>
                                                <span style={styles.detailPeriod}>{exp.duration}</span>
                                            </div>
                                            <p style={styles.experienceDesc}>
                                                <strong>{exp.company}</strong> — {exp.description}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
