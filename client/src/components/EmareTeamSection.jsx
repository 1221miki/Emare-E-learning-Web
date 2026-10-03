import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_TEAM = [
    {
        icon: '⚙️',
        title: 'Emare Developers',
        text: 'Our team worked through the night, often before 9:00 hours, to bring this learning platform to life for Ethiopian students. Every release reflects the passion and persistence of the people behind Emare.'
    }
];

export default function EmareTeamSection({ team = DEFAULT_TEAM }) {
    const { colors } = useTheme();

    const s = {
        section: {
            padding: '60px 5%',
            maxWidth: '1200px',
            margin: '0 auto',
            background: colors.bgCard,
            borderRadius: '24px',
            border: `1px solid ${colors.border}`
        },
        header: { marginBottom: '32px', textAlign: 'center' },
        badge: {
            display: 'inline-block',
            padding: '6px 18px',
            background: `${colors.primary}15`,
            color: colors.primary,
            borderRadius: '999px',
            fontWeight: '700',
            fontSize: '12px',
            letterSpacing: '0.02em'
        },
        title: { fontSize: '32px', fontWeight: '900', margin: '18px 0 10px', color: colors.text },
        subtitle: { color: colors.textMuted, fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', margin: '0 auto' },
        grid: { display: 'grid', gap: '20px' },
        card: {
            background: colors.bg,
            borderRadius: '18px',
            padding: '28px',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start'
        },
        icon: { fontSize: '36px', minWidth: '48px' },
        cardTitle: { fontSize: '22px', fontWeight: '800', color: colors.text, margin: '0 0 10px' },
        cardText: { color: colors.textMuted, fontSize: '15px', lineHeight: 1.8, margin: 0 }
    };

    return (
        <section style={s.section}>
            <div style={s.header}>
                <span style={s.badge}>Team</span>
                <h2 style={s.title}>Emare Developers</h2>
                <p style={s.subtitle}>A dedicated team that built this platform for Ethiopian learners, working long hours through the night to deliver an experience you can trust.</p>
            </div>
            <div style={s.grid}>
                {team.map((member, index) => (
                    <div key={index} style={s.card}>
                        <div style={s.icon}>{member.icon}</div>
                        <div>
                            <h3 style={s.cardTitle}>{member.title}</h3>
                            <p style={s.cardText}>{member.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
