// ── Shared dark-glass design tokens for Assignment Management ──
export const C = {
    blue:    '#22c55e',
    purple:  '#22c55e',
    green:   '#10b981',
    orange:  '#f59e0b',
    red:     '#ef4444',
    cyan:    '#06b6d4',
    pink:    '#ec4899',
    slate:   '#64748b',
};

export const card = {
    background: 'rgba(14,23,38,0.72)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(51,65,85,0.45)',
    borderRadius: '16px',
};

export const input = {
    background: 'rgba(9,13,22,0.75)',
    border: '1px solid rgba(51,65,85,0.55)',
    color: '#f1f5f9',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

export const select = {
    background: 'rgba(9,13,22,0.75)',
    border: '1px solid rgba(51,65,85,0.55)',
    color: '#f1f5f9',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
};

export const primaryBtn = {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.15s',
};

export const ghostBtn = {
    background: 'rgba(51,65,85,0.3)',
    border: '1px solid rgba(51,65,85,0.5)',
    color: '#94a3b8',
    borderRadius: '10px',
    padding: '10px 16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    whiteSpace: 'nowrap',
};

export const dangerBtn = {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.35)',
    color: '#f87171',
    borderRadius: '10px',
    padding: '10px 16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
};

export const successBtn = {
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.35)',
    color: '#34d399',
    borderRadius: '10px',
    padding: '10px 16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
};

export const label = {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '6px',
};

export const sectionTitle = {
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: '700',
    margin: '0 0 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
};

export const STATUS_CONFIG = {
    Draft:      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
    Published:  { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.3)' },
    Closed:     { bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    Grading:    { bg: 'rgba(245,158,11,0.12)',   color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
};

export const SUB_STATUS = {
    Submitted:  { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    Graded:     { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.3)' },
    Late:       { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    Revision:   { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    Pending:    { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};
