import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Download, Eye, CheckCircle, RotateCcw, XCircle,
    Clock, Users, Star, FileText, Search, Filter
} from 'lucide-react';
import { assignmentService } from '../../../services/api';
import { card, ghostBtn, primaryBtn, successBtn, dangerBtn, SUB_STATUS, C } from './assignmentStyles';

function Avatar({ student }) {
    if (student?.avatarUrl) return <img src={student.avatarUrl} alt={student.fullName} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(34,197,94,0.3)' }} />;
    const colors = [C.blue, C.purple, C.green, C.orange, C.pink, C.cyan];
    const c = colors[((student?.fullName || 'U').charCodeAt(0)) % colors.length];
    return (
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${c}22`, border: `2px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
            {(student?.fullName || 'U').charAt(0).toUpperCase()}
        </div>
    );
}

function SubBadge({ status }) {
    const cfg = SUB_STATUS[status] || SUB_STATUS.Pending;
    return <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '700' }}>{status}</span>;
}

function RelTime({ date }) {
    if (!date) return <span style={{ color: '#334155' }}>—</span>;
    const diff = Date.now() - new Date(date);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    const label = h < 1 ? 'Just now' : h < 24 ? `${h}h ago` : d < 7 ? `${d}d ago` : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return <span style={{ color: d > 7 ? '#94a3b8' : C.blue, fontSize: '12px', fontWeight: '600' }}>{label}</span>;
}

export default function SubmissionReviewer({ assignment, allSubmissions, onGrade, onBack, onUpdated }) {
    const [submissions, setSubmissions] = useState([]);
    const [search, setSearch]           = useState('');
    const [filter, setFilter]           = useState('all');
    const [updating, setUpdating]       = useState(null);

    useEffect(() => {
        if (!assignment) return;
        // Use cached submissions from parent, or fetch fresh
        const cached = allSubmissions.filter(s => (s.assignmentRef?._id || s.assignmentRef) === assignment._id);
        if (cached.length > 0) { setSubmissions(cached); return; }
        assignmentService.getSubmissions(assignment._id)
            .then(r => setSubmissions(r.data.data || []))
            .catch(console.error);
    }, [assignment, allSubmissions]);

    const updateStatus = async (sub, newStatus) => {
        setUpdating(sub._id);
        try {
            const res = await assignmentService.gradeSubmission(sub._id, {
                score: sub.grade ?? null,
                comments: newStatus === 'Revision' ? 'Revision requested by instructor.' : sub.feedback?.[0]?.comments || '',
                allowResubmission: newStatus === 'Revision',
            });
            const updated = { ...sub, status: newStatus, allowResubmission: newStatus === 'Revision' };
            setSubmissions(prev => prev.map(s => s._id === sub._id ? updated : s));
            onUpdated(updated);
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        } finally {
            setUpdating(null);
        }
    };

    const filtered = submissions.filter(s => {
        const name = s.studentRef?.fullName || '';
        if (filter !== 'all' && s.status !== filter) return false;
        if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const total    = submissions.length;
    const pending  = submissions.filter(s => s.status === 'Submitted').length;
    const graded   = submissions.filter(s => s.status === 'Graded').length;
    const avgScore = graded > 0 ? Math.round(submissions.filter(s => s.grade != null).reduce((a, s) => a + (s.grade || 0), 0) / graded) : null;

    if (!assignment) return (
        <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>No assignment selected. Go back and click "View Submissions" on an assignment.</p>
            <button onClick={onBack} style={{ ...ghostBtn, marginTop: '16px' }}><ArrowLeft size={14} aria-hidden="true" /> Back</button>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} style={{ ...ghostBtn, padding: '8px 10px' }} aria-label="Back to assignment list"><ArrowLeft size={16} aria-hidden="true" /></button>
                    <div>
                        <h3 style={{ color: '#f8fafc', fontSize: '17px', fontWeight: '800', margin: '0 0 2px' }}>{assignment.title}</h3>
                        <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>{total} submission{total !== 1 ? 's' : ''} · {pending} pending · Max {assignment.maxScore} pts</p>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                    { icon: <Users size={16} />,       color: C.blue,   label: 'Total',   value: total },
                    { icon: <Clock size={16} />,       color: C.orange, label: 'Pending', value: pending },
                    { icon: <CheckCircle size={16} />, color: C.green,  label: 'Graded',  value: graded },
                    { icon: <Star size={16} />,        color: C.purple, label: 'Avg Score', value: avgScore !== null ? `${avgScore}%` : '—' },
                ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
                        <div style={{ color: s.color, marginBottom: '6px' }}>{s.icon}</div>
                        <div style={{ color: '#f8fafc', fontSize: '22px', fontWeight: '800' }}>{s.value}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} aria-hidden="true" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…" style={{ background: 'rgba(9,13,22,0.75)', border: '1px solid rgba(51,65,85,0.5)', color: '#f1f5f9', padding: '9px 12px 9px 33px', borderRadius: '10px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} aria-label="Search submissions" />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)} style={{ background: 'rgba(9,13,22,0.75)', border: '1px solid rgba(51,65,85,0.5)', color: '#f1f5f9', padding: '9px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }} aria-label="Filter by status">
                    <option value="all">All Statuses</option>
                    <option value="Submitted">Pending</option>
                    <option value="Graded">Graded</option>
                </select>
                <span style={{ color: '#475569', fontSize: '12px' }}>{filtered.length} of {total}</span>
            </div>

            {/* Table */}
            <div style={{ ...card, overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <FileText size={40} color="#1e293b" style={{ display: 'block', margin: '0 auto 12px' }} aria-hidden="true" />
                        <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>No submissions match your filters.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(9,13,22,0.6)', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                                    {['Student', 'Submitted', 'Files', 'Score', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(sub => {
                                    const student = sub.studentRef || {};
                                    const fileCount = (sub.files || []).length;
                                    const isBusy = updating === sub._id;
                                    return (
                                        <tr key={sub._id} style={{ borderBottom: '1px solid rgba(51,65,85,0.2)', transition: 'background 0.12s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.04)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Avatar student={student} />
                                                    <div>
                                                        <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: '700' }}>{student.fullName || 'Unknown Student'}</div>
                                                        <div style={{ color: '#475569', fontSize: '11px' }}>{student.accountEmail || student.email || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}><RelTime date={sub.createdAt} /></td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {fileCount > 0 ? (
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {(sub.files || []).slice(0, 2).map((f, i) => (
                                                            <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: C.blue, borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }} aria-label={`Download ${f.filename}`}>
                                                                <Download size={11} aria-hidden="true" /> {f.filename?.slice(0, 12) || 'File'}
                                                            </a>
                                                        ))}
                                                        {fileCount > 2 && <span style={{ color: '#475569', fontSize: '11px' }}>+{fileCount - 2}</span>}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#334155', fontSize: '12px' }}>No files</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {sub.grade != null
                                                    ? <span style={{ color: sub.grade >= 80 ? C.green : sub.grade >= 60 ? C.orange : C.red, fontWeight: '800', fontSize: '14px' }}>{sub.grade}/{assignment.maxScore}</span>
                                                    : <span style={{ color: '#334155', fontSize: '12px' }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '14px 16px' }}><SubBadge status={sub.status} /></td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button onClick={() => onGrade(sub)} style={{ ...primaryBtn, padding: '6px 12px', fontSize: '12px' }} disabled={isBusy} aria-label={`Grade submission by ${student.fullName}`}>
                                                        <Eye size={13} aria-hidden="true" /> Grade
                                                    </button>
                                                    {sub.status === 'Submitted' && (
                                                        <button onClick={() => updateStatus(sub, 'Revision')} disabled={isBusy} style={{ ...ghostBtn, padding: '6px 10px', fontSize: '12px' }} aria-label="Request revision">
                                                            <RotateCcw size={13} aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
