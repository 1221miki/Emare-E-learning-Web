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
                borderRadius: '14px',
                padding: '16px 18px',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderTop: `3px solid ${color}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                boxShadow: theme === 'dark' ? '0 4px 18px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            className="hover:-translate-y-0.5 transition-all duration-200"
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textMuted, letterSpacing: '0.2px' }}>
                    {label}
                </span>
                {icon && (
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `${color}18`,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {icon}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '26px', fontWeight: '800', color, lineHeight: '1.2' }}>
                    {value}
                </span>
            </div>
        </div>
    );
}
