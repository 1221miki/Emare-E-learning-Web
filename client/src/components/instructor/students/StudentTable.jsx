import React, { useState } from 'react';
import {
    Eye, MessageSquare, TrendingUp, Trash2, MoreHorizontal,
    CheckCircle, Clock, Activity, AlertTriangle, GraduationCap
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

// ── Status config ────────────────────────────────────────────
const STATUS = {
    active:    { label: 'Active',    bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.3)',  Icon: Activity },
    completed: { label: 'Completed', bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)',  Icon: CheckCircle },
    inactive:  { label: 'Inactive',  bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)', Icon: Clock },
    'at-risk': { label: 'At Risk',   bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',   Icon: AlertTriangle },
};

function StatusBadge({ status }) {
    const cfg  = STATUS[status] || STATUS.inactive;
    const Icon = cfg.Icon;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
            <Icon size={11} aria-hidden="true" />
            {cfg.label}
        </span>
    );
}

function Avatar({ student }) {
    if (student.avatar) {
        return (
            <img
                src={student.avatar}
                alt={student.name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #dcfce7' }}
            />
        );
    }
    const colors = ['#22c55e', '#22c55e', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const color  = colors[(student.name.charCodeAt(0) || 0) % colors.length];
    return (
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
            {student.initials}
        </div>
    );
}

function ProgressBar({ value }) {
    const color = value >= 80 ? '#10b981' : value >= 40 ? '#22c55e' : value >= 10 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ width: '100%', minWidth: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color, fontSize: '12px', fontWeight: '700' }}>{value}%</span>
            </div>
            <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(51,65,85,0.5)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${value}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
}

function ActionMenu({ student, onViewProfile, onMessage, onRemove }) {
    const [open, setOpen] = useState(false);
    const { colors, theme } = useTheme();

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ background: colors.bgInput, border: `2px solid ${colors.border}`, color: colors.primary, borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label={`Actions for ${student.name}`}
                aria-expanded={open}
            >
                <MoreHorizontal size={16} aria-hidden="true" />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
                    {/* Dropdown */}
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: colors.bgCard, backdropFilter: 'blur(16px)', border: `2px solid ${colors.border}`, borderRadius: '12px', minWidth: '190px', zIndex: 1000, padding: '6px', boxShadow: `0 10px 30px ${theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)'}` }}>
                        {[
                            { label: 'View Profile',    icon: <Eye size={14} aria-hidden="true" />,           action: () => { onViewProfile(student); setOpen(false); }, color: '#4ade80' },
                            { label: 'Send Message',    icon: <MessageSquare size={14} aria-hidden="true" />,  action: () => { onMessage(student); setOpen(false); },      color: '#34d399' },
                            { label: 'View Progress',   icon: <TrendingUp size={14} aria-hidden="true" />,     action: () => { onViewProfile(student); setOpen(false); }, color: '#4ade80' },
                            { label: 'Remove Student',  icon: <Trash2 size={14} aria-hidden="true" />,         action: () => { onRemove(student); setOpen(false); },       color: '#f87171', danger: true },
                        ].map((item, i) => (
                            <button
                                key={i}
                                onClick={item.action}
                                style={{ width: '100%', background: 'transparent', border: 'none', color: item.danger ? '#f87171' : colors.text, padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.15)' : colors.bgInput}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: item.color }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function RelativeTime({ date }) {
    if (!date) return <span style={{ color: '#475569', fontSize: '12px' }}>Never</span>;
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    let label;
    if (mins < 2)   label = 'Just now';
    else if (hrs < 1)   label = `${mins}m ago`;
    else if (hrs < 24)  label = `${hrs}h ago`;
    else if (days < 7)  label = `${days}d ago`;
    else label = new Date(date).toLocaleDateString();
    const fresh = days < 2;
    return <span style={{ color: fresh ? '#10b981' : days > 14 ? '#ef4444' : '#94a3b8', fontSize: '12px', fontWeight: '600' }}>{label}</span>;
}

const COLS = [
    { label: 'Student',         width: '220px' },
    { label: 'Course',          width: '160px' },
    { label: 'Enrolled',        width: '110px' },
    { label: 'Progress',        width: '130px' },
    { label: 'Last Activity',   width: '120px' },
    { label: 'Quiz Score',      width: '90px' },
    { label: 'Status',          width: '110px' },
    { label: 'Actions',         width: '60px' },
];

export default function StudentTable({ students = [], onViewProfile, onMessage, onRemove }) {
    const { colors, theme } = useTheme();

    return (
        <div
            style={{
                background: colors.bgCard,
                backdropFilter: theme === 'dark' ? 'blur(12px)' : 'none',
                border: `2px solid ${colors.border}`,
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}
        >
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                    <thead>
                        <tr style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f0f4ff', borderBottom: `2px solid ${colors.border}` }}>
                            {COLS.map(col => (
                                <th key={col.label} style={{ padding: '13px 18px', color: colors.primary, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap', width: col.width }}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={COLS.length} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                    <GraduationCap size={40} color={colors.textMuted} style={{ display: 'block', margin: '0 auto 12px' }} aria-hidden="true" />
                                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>No students found. Try adjusting the filters.</p>
                                </td>
                            </tr>
                        )}

                        {students.map((student, idx) => (
                            <tr
                                key={student._id}
                                style={{ borderBottom: `2px solid ${colors.border}`, transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {/* Student */}
                                <td style={{ padding: '14px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Avatar student={student} />
                                        <div>
                                            <div style={{ color: colors.text, fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{student.name}</div>
                                            <div style={{ color: colors.textMuted, fontSize: '12px' }}>{student.email}</div>
                                        </div>
                                    </div>
                                </td>

                                {/* Course */}
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{ color: colors.textMuted, fontSize: '13px', display: 'block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {student.course}
                                    </span>
                                </td>

                                {/* Enrolled */}
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>
                                        {student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                    </span>
                                </td>

                                {/* Progress */}
                                <td style={{ padding: '14px 18px' }}>
                                    <ProgressBar value={student.progress} />
                                </td>

                                {/* Last Activity */}
                                <td style={{ padding: '14px 18px' }}>
                                    <RelativeTime date={student.lastActivity} />
                                </td>

                                {/* Quiz Score */}
                                <td style={{ padding: '14px 18px' }}>
                                    {student.quizScore !== null
                                        ? <span style={{ color: student.quizScore >= 80 ? '#10b981' : student.quizScore >= 60 ? '#f59e0b' : '#ef4444', fontSize: '13px', fontWeight: '700' }}>
                                            {student.quizScore}%
                                          </span>
                                        : <span style={{ color: colors.textMuted, fontSize: '12px' }}>—</span>
                                    }
                                </td>

                                {/* Status */}
                                <td style={{ padding: '14px 18px' }}>
                                    <StatusBadge status={student.status} />
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '14px 18px' }}>
                                    <ActionMenu
                                        student={student}
                                        onViewProfile={onViewProfile}
                                        onMessage={onMessage}
                                        onRemove={onRemove}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer row */}
            {students.length > 0 && (
                <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '12px' }}>
                    Showing {students.length} student{students.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
