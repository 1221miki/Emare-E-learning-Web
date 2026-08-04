import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { card, primaryBtn, ghostBtn, dangerBtn, successBtn, C } from './assignmentStyles';

function daysBetween(a, b) {
    return Math.round((new Date(a) - new Date(b)) / 86400000);
}

export default function LateSubmissions({ assignments, allSubmissions, onGrade, onAssignmentSelect }) {
    const [filter, setFilter] = useState('all');

    // Find submissions that are past the assignment due date
    const lateItems = allSubmissions.filter(sub => {
        const asgn = assignments.find(a => a._id === (sub.assignmentRef?._id || sub.assignmentRef));
        if (!asgn?.dueDate) return false;
        return new Date(sub.createdAt) > new Date(asgn.dueDate);
    }).map(sub => {
        const asgn = assignments.find(a => a._id === (sub.assignmentRef?._id || sub.assignmentRef));
        const daysLate = daysBetween(sub.createdAt, asgn.dueDate);
        const penalty = asgn.latePenalty ? Math.round((asgn.latePenalty / 100) * (asgn.maxScore || 100)) : 0;
        return { ...sub, assignment: asgn, daysLate, penalty };
    });

    const filtered = filter === 'all' ? lateItems : lateItems.filter(i => i.status === filter);

    if (lateItems.length === 0) {
        return (
            <div style={{ ...card, padding: '60px 40px', textAlign: 'center' }}>
                <CheckCircle size={44} color="#1e293b" style={{ display: 'block', margin: '0 auto 14px' }} aria-hidden="true" />
                <h3 style={{ color: '#475569', fontSize: '17px', fontWeight: '700', margin: '0 0 8px' }}>No Late Submissions</h3>
                <p style={{ color: '#334155', fontSize: '13px', margin: 0 }}>All students submitted on time across your assignments.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '800', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={17} color={C.orange} aria-hidden="true" />
                        Late Submissions ({lateItems.length})
                    </h3>
                    <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>Submissions received after the assignment deadline</p>
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)} style={{ background: 'rgba(9,13,22,0.75)', border: '1px solid rgba(51,65,85,0.5)', color: '#f1f5f9', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }} aria-label="Filter late submissions">
                    <option value="all">All</option>
                    <option value="Submitted">Pending Review</option>
                    <option value="Graded">Graded</option>
                </select>
            </div>

            <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(9,13,22,0.6)', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                                {['Student', 'Assignment', 'Deadline', 'Submitted', 'Days Late', 'Penalty', 'Score', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, i) => {
                                const student = item.studentRef || {};
                                const daysColor = item.daysLate > 7 ? C.red : item.daysLate > 3 ? C.orange : C.yellow;
                                return (
                                    <tr key={item._id || i} style={{ borderBottom: '1px solid rgba(51,65,85,0.2)', transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '13px 16px' }}>
                                            <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: '700' }}>{student.fullName || 'Unknown'}</div>
                                            <div style={{ color: '#475569', fontSize: '11px' }}>{student.accountEmail || '—'}</div>
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <div style={{ color: '#94a3b8', fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.assignment?.title || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Clock size={11} aria-hidden="true" />
                                                {item.assignment?.dueDate ? new Date(item.assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                            </span>
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <span style={{ background: 'rgba(239,68,68,0.1)', color: C.red, border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '800' }}>
                                                +{item.daysLate}d
                                            </span>
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            {item.penalty > 0
                                                ? <span style={{ color: C.orange, fontSize: '12px', fontWeight: '700' }}>-{item.penalty} pts</span>
                                                : <span style={{ color: '#334155', fontSize: '12px' }}>None</span>
                                            }
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            {item.grade != null
                                                ? <span style={{ color: item.grade >= 60 ? C.green : C.red, fontWeight: '800', fontSize: '13px' }}>{item.grade}</span>
                                                : <span style={{ color: '#334155', fontSize: '12px' }}>—</span>
                                            }
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <button
                                                onClick={() => { onAssignmentSelect(item.assignment); onGrade(item); }}
                                                style={{ ...primaryBtn, padding: '6px 12px', fontSize: '12px' }}
                                                aria-label={`Grade late submission by ${student.fullName}`}
                                            >
                                                <Eye size={13} aria-hidden="true" /> Grade
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
