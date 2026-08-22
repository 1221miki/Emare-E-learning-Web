import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function DeveloperCard({ developer, onDetail }) {
    const { colors } = useTheme();
    const [imgFailed, setImgFailed] = useState(false);

    const styles = {
        card: { background: colors.bgCard, border: `1px solid ${colors.primary}33`, borderRadius: '24px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' },
        header: { display: 'flex', alignItems: 'center', gap: '16px' },
        photo: { width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${colors.primary}`, flexShrink: 0 },
        photoFallback: { width: '64px', height: '64px', borderRadius: '50%', background: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', flexShrink: 0 },
        devName: { margin: '0', fontSize: '20px', fontWeight: '800', color: colors.text },
        devTitle: { margin: '4px 0 0', fontSize: '12px', letterSpacing: '0.05em', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
        sectionLabel: { color: colors.text, letterSpacing: '0.14em', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 10px' },
        skills: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
        skillTag: { background: colors.bgInput, border: `1px solid ${colors.primary}33`, borderRadius: '999px', color: colors.text, padding: '7px 13px', fontSize: '12px', fontWeight: '700' },
        expItem: { marginBottom: '14px' },
        expRow: { display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' },
        expRole: { margin: 0, fontSize: '14px', fontWeight: '800', color: colors.text },
        expDuration: { color: colors.textMuted, fontSize: '12px', fontWeight: '600' },
        expDesc: { margin: '4px 0 0', color: colors.textMuted, fontSize: '13px', lineHeight: 1.6 },
        button: { marginTop: 'auto', alignSelf: 'flex-start', padding: '11px 26px', borderRadius: '14px', border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' }
    };

    const experiences = developer.experiences || [];

    return (
        <div style={styles.card}>
            {/* Header: photo left, name/title stacked right */}
            <div style={styles.header}>
                {!imgFailed && developer.profilePicture ? (
                    <img
                        src={developer.profilePicture}
                        alt={developer.name}
                        style={styles.photo}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <div style={styles.photoFallback}>
                        {developer.initials || (developer.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                )}
                <div>
                    <h2 style={styles.devName}>{developer.name}</h2>
                    <p style={styles.devTitle}>{developer.title}</p>
                </div>
            </div>

            {/* Skills pills */}
            <div>
                <h3 style={styles.sectionLabel}>Skills</h3>
                <div style={styles.skills}>
                    {(developer.skills || []).map((skill, idx) => (
                        <span key={idx} style={styles.skillTag}>{skill}</span>
                    ))}
                </div>
            </div>

            {/* Inline experience preview */}
            {experiences.length > 0 && (
                <div>
                    <h3 style={styles.sectionLabel}>Experience</h3>
                    {experiences.slice(0, 2).map((exp, idx) => (
                        <div key={idx} style={styles.expItem}>
                            <div style={styles.expRow}>
                                <span style={styles.expRole}>{exp.role}{exp.company ? ` - ${exp.company}` : ''}</span>
                                <span style={styles.expDuration}>{exp.duration}</span>
                            </div>
                            {exp.description && (
                                <p style={styles.expDesc}>{exp.description}</p>
                            )}
                        </div>
                    ))}
                    {experiences.length > 2 && (
                        <p style={{ ...styles.expDesc, fontStyle: 'italic' }}>
                            +{experiences.length - 2} more — see full details
                        </p>
                    )}
                </div>
            )}

            <button style={styles.button} onClick={() => onDetail(developer)}>
                Detail
            </button>
        </div>
    );
}
