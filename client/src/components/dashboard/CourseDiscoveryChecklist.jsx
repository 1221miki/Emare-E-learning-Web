import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function CourseDiscoveryChecklist({ enrolledCount = 0, wishlistCount = 0 }) {
    const { colors } = useTheme();
    const navigate = useNavigate();

    const tasks = [
        {
            title: 'Explore categories',
            description: 'Browse course categories to find the right subject, skill track, and instructor match.',
            actionLabel: 'Browse categories',
            onClick: () => navigate('/categories')
        },
        {
            title: 'Review career tracks',
            description: 'Check career-focused learning paths and choose a track that aligns with your goals.',
            actionLabel: 'View career tracks',
            onClick: () => navigate('/career-tracks')
        },
        {
            title: 'Search with intent',
            description: 'Use keywords like React, Python, design, or certification to narrow your course choices.',
            actionLabel: 'Search courses',
            onClick: () => navigate('/search')
        },
        {
            title: 'Save promising courses',
            description: 'Add courses to your wishlist so you can compare options and enroll later.',
            actionLabel: 'Open wishlist',
            onClick: () => navigate('/student/wishlist')
        },
        {
            title: 'Compare course details',
            description: 'Open course pages to read descriptions, prerequisites, ratings, and certificate information.',
            actionLabel: 'Browse catalog',
            onClick: () => navigate('/courses')
        },
        {
            title: 'Choose the best match',
            description: 'Review price, duration, instructor quality, and certificate availability before enrolling.',
            actionLabel: 'Find certificate courses',
            onClick: () => navigate('/courses')
        }
    ];

    return (
        <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ maxWidth: '660px' }}>
                    <h2 style={{ fontSize: '20px', color: colors.text, margin: 0, fontWeight: '900' }}>Course Discovery & Enrollment Checklist</h2>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: '10px 0 0', lineHeight: 1.7 }}>
                        Follow these steps to choose high-value courses, save your favorites, and enroll with confidence.
                    </p>
                </div>
                <div style={{ display: 'grid', gap: '10px', textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: colors.textMuted }}>Saved in wishlist</span>
                    <span style={{ fontSize: '28px', fontWeight: '900', color: colors.primary }}>{wishlistCount}</span>
                    <span style={{ fontSize: '12px', color: colors.textMuted }}>/ {enrolledCount} enrolled</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginTop: '24px' }}>
                {tasks.map((task) => (
                    <div key={task.title} style={{ background: colors.bgInput, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '165px' }}>
                        <div>
                            <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '800', margin: '0 0 10px' }}>{task.title}</h3>
                            <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{task.description}</p>
                        </div>
                        <button
                            type="button"
                            onClick={task.onClick}
                            style={{
                                marginTop: '18px',
                                background: colors.primary,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            {task.actionLabel}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
