import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable StatCard Component
 * Displays a single metric with label, value, and a colored top border.
 *
 * @param {string} label - Description of the metric
 * @param {string|number} value - The metric value to display
 * @param {string} color - Accent color for the top border and value text
 * @param {string} icon - Optional emoji/icon to display
 */
export default function StatCard({ label, value, color = '#22c55e', icon }) {
    const { colors, theme } = useTheme();

    return (
        <div
            style={{
                ...styles.card,
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                boxShadow: theme === 'dark' ? '0 8px 24px rgba(15, 23, 42, 0.18)' : '0 4px 15px rgba(0,0,0,0.03)',
                borderTop: `3px solid ${color}`
            }}
        >
            {icon && <span style={{ ...styles.icon, color: colors.text }}>{icon}</span>}
            <span style={{ ...styles.value, color }}>{value}</span>
            <span style={{ ...styles.label, color: colors.textMuted }}>{label}</span>
        </div>
    );
}

const styles = {
    card: {
        borderRadius: '16px',
        padding: '24px',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    icon: { fontSize: '24px', display: 'block', marginBottom: '8px' },
    value: { display: 'block', fontSize: '32px', fontWeight: '800' },
    label: { fontSize: '13px', fontWeight: '500', marginTop: '4px', display: 'block' }
};
