import React from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const DEVELOPERS = [
    {
        name: 'Fawaz Bekele',
        title: 'Full Stack Developer',
        skills: ['Angular', '.NET', 'HTML/CSS', 'PHP', 'Bootstrap', 'MySQL', 'Node.js', 'GitHub']
    },
    {
        name: 'Solomon Legesse',
        title: 'Full Stack Developer',
        skills: ['Node.js', 'React', 'PHP/Laravel', 'Python/Flask', 'Springboot', 'Angular', 'GitHub']
    },
    {
        name: 'Natawal Zeithu',
        title: 'Full Stack Developer / IT Professional',
        skills: ['Node.js', 'React', 'PHP', 'Flutter', 'WordPress', 'SEO', 'MySQL', 'MongoDB', 'Cybersecurity', 'GitHub']
    },
    {
        name: 'Filiget Shewa',
        title: 'Full Stack Developer',
        skills: ['Go', 'Angular', 'Node.js', 'React', 'MySQL', 'MongoDB', 'Postgres', 'HTML/CSS', 'Java', 'Springboot', 'GitHub']
    },
    {
        name: 'Samuel B',
        title: 'Mobile & Web App Developer',
        skills: ['Node.js', 'React', 'Angular', 'Flutter', '.NET', 'Python', 'MySQL', 'MongoDB', 'Postgres']
    },
    {
        name: 'Robel Alemayehu',
        title: 'Full Stack Developer',
        skills: ['Android/Kotlin', 'Python/Django', 'JavaScript', 'PHP', 'HTML/CSS', 'Cloud (GCP, AWS)', 'SQL', 'Postgres', 'MongoDB', 'Linux Desktop App', 'GitHub']
    }
];

export default function DevelopersPage() {
    const { colors } = useTheme();

    const styles = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text },
        hero: { padding: '100px 5% 40px', textAlign: 'center' },
        heroLabel: { color: colors.primary, fontSize: '13px', letterSpacing: '0.2em', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' },
        heroTitle: { fontSize: '44px', fontWeight: '900', lineHeight: '1.05', margin: '0 auto 18px', maxWidth: '860px' },
        heroSubtitle: { color: colors.textMuted, fontSize: '17px', lineHeight: '1.8', maxWidth: '720px', margin: '0 auto' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', padding: '40px 5%', maxWidth: '1400px', margin: '0 auto 80px' },
        card: { background: colors.bgCard, border: `1px solid ${colors.primary}33`, borderRadius: '24px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', minHeight: '320px' },
        cardHeader: { display: 'flex', alignItems: 'center', gap: '14px' },
        avatar: { width: '58px', height: '58px', borderRadius: '18px', background: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900' },
        devName: { margin: '0', fontSize: '20px', fontWeight: '800', color: colors.text },
        devTitle: { margin: '4px 0 0', fontSize: '13px', letterSpacing: '0.04em', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
        skills: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
        skillTag: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '999px', color: colors.text, padding: '8px 14px', fontSize: '12px', fontWeight: '600' },
        button: { marginTop: 'auto', alignSelf: 'flex-start', padding: '12px 22px', borderRadius: '12px', border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: '700', cursor: 'pointer' }
    };

    return (
        <div style={styles.page}>
            <Navbar />
            <div style={styles.hero}>
                <div style={styles.heroLabel}>EMARE DEVELOPERS</div>
                <h1 style={styles.heroTitle}>Let's Introduce Our Developer</h1>
                <p style={styles.heroSubtitle}>Meet the Emare development team behind the platform. Each developer brings technical depth, creative problem solving, and a commitment to building products that serve learners across Ethiopia.</p>
            </div>

            <div style={styles.grid}>
                {DEVELOPERS.map((dev, index) => (
                    <div key={index} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.avatar}>{dev.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div>
                            <div>
                                <h2 style={styles.devName}>{dev.name}</h2>
                                <div style={styles.devTitle}>{dev.title}</div>
                            </div>
                        </div>
                        <div style={styles.skills}>
                            {dev.skills.map((skill, idx) => (
                                <span key={idx} style={styles.skillTag}>{skill}</span>
                            ))}
                        </div>
                        <button style={styles.button}>Detail</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
