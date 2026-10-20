import React from 'react';
import { Loader, CheckCircle, AlertCircle, Radio } from 'lucide-react';

/**
 * RecordingStatusBadge
 * Displays the 4 official recording statuses:
 * - Recording
 * - Processing
 * - Ready
 * - Failed
 */
export default function RecordingStatusBadge({ status, style = {} }) {
    const raw = String(status || '').toLowerCase().trim();

    let config = {
        label: 'Ready',
        bg: 'rgba(34,197,94,0.15)',
        color: '#4ade80',
        border: '1px solid rgba(34,197,94,0.3)',
        icon: <CheckCircle size={12} />
    };

    if (raw === 'recording') {
        config = {
            label: 'Recording',
            bg: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.35)',
            icon: <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'recPulse 1s infinite' }} />
        };
    } else if (raw === 'processing') {
        config = {
            label: 'Processing',
            bg: 'rgba(234,179,8,0.15)',
            color: '#facc15',
            border: '1px solid rgba(234,179,8,0.35)',
            icon: <Loader size={12} style={{ animation: 'recSpin 1s linear infinite' }} />
        };
    } else if (raw === 'failed') {
        config = {
            label: 'Failed',
            bg: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.35)',
            icon: <AlertCircle size={12} />
        };
    } else if (raw === 'ready' || raw === 'available') {
        config = {
            label: 'Ready',
            bg: 'rgba(34,197,94,0.15)',
            color: '#4ade80',
            border: '1px solid rgba(34,197,94,0.3)',
            icon: <CheckCircle size={12} />
        };
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'capitalize',
                background: config.bg,
                color: config.color,
                border: config.border,
                ...style
            }}
        >
            {config.icon}
            {config.label}
            <style>{`
                @keyframes recPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.85); } }
                @keyframes recSpin { to { transform: rotate(360deg); } }
            `}</style>
        </span>
    );
}
