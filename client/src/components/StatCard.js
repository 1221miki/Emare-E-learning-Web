import React from 'react';

/**
 * Reusable StatCard Component
 * Displays a single metric with label, value, and a colored top border.
 *
 * @param {string} label - Description of the metric
 * @param {string|number} value - The metric value to display
 * @param {string} color - Accent color for the top border and value text
 * @param {string} icon - Optional emoji/icon to display
 */
export default function StatCard({ label, value, color = '#3b82f6', icon }) {
    return (
        <div style={{ ...styles.card, borderTop: `3px solid ${color}` }}>
            {icon && <span style={styles.icon}>{icon}</span>}
            <span style={{ ...styles.value, color }}>{value}</span>
            <span style={styles.label}>{label}</span>
        </div>
    );
}

const styles = {
    card: {
        background: '#1e293b',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #334155',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    icon: { fontSize: '24px', display: 'block', marginBottom: '8px' },
    value: { display: 'block', fontSize: '32px', fontWeight: '800' },
    label: { color: '#64748b', fontSize: '13px', fontWeight: '500', marginTop: '4px', display: 'block' }
};
