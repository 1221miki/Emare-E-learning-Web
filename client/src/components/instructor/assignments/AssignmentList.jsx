import React, { useState } from 'react';
import {
    Eye, Edit3, Copy, Trash2, Users, MoreHorizontal,
    ClipboardList, Calendar, BookOpen, Plus
} from 'lucide-react';
import { assignmentService } from '../../../services/api';
import { card, ghostBtn, primaryBtn, dangerBtn, STATUS_CONFIG, C } from './assignmentStyles';

function StatusBadge({ published, dueDate }) {
    let key = 'Draft';
    if (published) {
        const overdue = dueDate && new Date(dueDate) < new Date();
        key = overdue ? 'Closed' : 'Published';
    }
    const cfg = STATUS_CONFIG[key];
    return (
        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '700' }}>
            {key}
        </span>
    );
}

function ActionMenu({ assignment, onViewSubmissions, onEdit, onDuplicate, onDelete }) {
    const [open, setOpen] = useState(false);
    const items = [
        { label: 'View Submissions', icon: <Eye size={14} />,    color: C.blue,   action: () => { onViewSubmissions(assignment); setOpen(false); } },
        { label: 'Edit Assignment',  icon: <Edit3 size={14} />,  color: C.purple, action: () => { onEdit(assignment); setOpen(false); } },
        { label: 'Duplicate',        icon: <Copy size={14} />,   color: C.slate,  action: () => { onDuplicate(assignment); setOpen(false); } },
        { label: 'Delete',           icon: <Trash2 size={14} />, color: C.red,    action: () => { onDelete(assignment); setOpen(false); }, danger: true },
    ];
    return (
        <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)} style={{ ...ghostBtn, padding: '7px 10px' }} aria-label="More actions" aria-expanded={open}>
                <MoreHorizontal size={16} aria-hidden="true" />
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 990 }} onClick={() => setOpen(false)} />
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'rgba(13,20,35,0.99)', backdropFilter: 'blur(16px)', border: '1px solid rgba(51,65,85,0.6)', borderRadius: '12px', minWidth: '200px', zIndex: 1000, padding: '6px', boxShadow: '0 20px 48px rgba(0,0,0,0.55)' }}>
                        {items.map((item, i) => (
                            <button key={i} onClick={item.action}
                                style={{ width: '100%', background: 'transparent', border: 'none', color: item.danger ? '#f87171' : '#e2e8f0', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', transition: 'background 0.12s' }}
                                onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: item.color }}>{item.icon}</span>{item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function EditModal({ assignment, onSave, onClose }) {
    const [form, setForm] = useState({
        title: assignment.title,
        description: assignment.description || '',
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 10) : '',
        maxScore: assignment.maxScore || 100,
        allowLate: assignment.allowLate || false,
        published: assignment.published || false,
        aiTutorEnabled: assignment.aiTutorEnabled !== false
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const handleSave = async () => {
        setSaving(true); setErr('');
        try {
            const payload = { ...form, dueDate: form.dueDate ? new Date(form.dueDate + 'T23:59:00') : null };
            const res = await assignmentService.update(assignment._id, payload);
            onSave(res.data.data);
        } catch (e) {
            setErr(e.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const inp = { background: 'rgba(9,13,22,0.75)', border: '1px solid rgba(51,65,85,0.55)', color: '#f1f5f9', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
    const lbl = { color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }} onClick={onClose}>
            <div style={{ ...card, width: '100%', maxWidth: '520px', maxHeight: '85vh', overflow: 'auto', padding: '28px' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ color: '#f8fafc', fontSize: '17px', fontWeight: '800', margin: '0 0 20px' }}>Edit Assignment</h3>
                {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>{err}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div><label style={lbl}>Title</label><input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div><label style={lbl}>Description</label><textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                        <div><label style={lbl}>Max Score</label><input type="number" min="0" style={inp} value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: Number(e.target.value) }))} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>
                            <input type="checkbox" checked={form.allowLate} onChange={e => setForm(f => ({ ...f, allowLate: e.target.checked }))} style={{ accentColor: C.orange }} /> Allow Late
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>
                            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} style={{ accentColor: C.green }} /> Published
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: form.aiTutorEnabled ? '#10b981' : '#ef4444' }}>
                            <input type="checkbox" checked={form.aiTutorEnabled} onChange={e => setForm(f => ({ ...f, aiTutorEnabled: e.target.checked }))} style={{ accentColor: form.aiTutorEnabled ? '#10b981' : '#ef4444' }} /> ⊡ Emare AI Tutor
                        </label>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    <button onClick={onClose} style={ghostBtn}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

const COLS = ['Assignment', 'Course', 'Due Date', 'Submissions', 'Avg Score', 'Status', ''];

export default function AssignmentList({ assignments, allSubmissions, courses, selectedCourse, onViewSubmissions, onUpdated, onDeleted, onCreateNew }) {
    const [editTarget, setEditTarget] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const subMap = {};
    allSubmissions.forEach(s => {
        const aid = s.assignmentRef?._id || s.assignmentRef;
        if (!subMap[aid]) subMap[aid] = [];
        subMap[aid].push(s);
    });

    const handleDuplicate = async (asgn) => {
        try {
            const { _id, createdAt, updatedAt, __v, ...rest } = asgn;
            rest.title = `${rest.title} (Copy)`;
            rest.published = false;
            const res = await assignmentService.create(rest);
            onUpdated(res.data.data);
        } catch (e) {
            alert('Duplicate failed: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await assignmentService.update(deleteConfirm._id, { isActive: false });
            onDeleted(deleteConfirm._id);
        } catch (e) {
            alert('Delete failed: ' + (e.response?.data?.message || e.message));
        } finally {
            setDeleteConfirm(null);
        }
    };

    if (assignments.length === 0) {
        return (
            <div style={{ ...card, padding: '60px 40px', textAlign: 'center' }}>
                <ClipboardList size={48} color="#1e293b" style={{ display: 'block', margin: '0 auto 16px' }} aria-hidden="true" />
                <h3 style={{ color: '#475569', fontSize: '18px', fontWeight: '700', margin: '0 0 8px' }}>No Assignments Yet</h3>
                <p style={{ color: '#334155', fontSize: '13px', margin: '0 0 24px' }}>Create your first assignment for {selectedCourse?.courseTitle || 'this course'}.</p>
                <button onClick={onCreateNew} style={primaryBtn}><Plus size={15} aria-hidden="true" /> Create Assignment</button>
            </div>
        );
    }

    return (
        <>
            <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(9,13,22,0.6)', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                                {COLS.map(c => (
                                    <th key={c} style={{ padding: '13px 18px', color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map(asgn => {
                                const subs = subMap[asgn._id] || [];
                                const graded = subs.filter(s => s.grade != null);
                                const avgScore = graded.length ? Math.round(graded.reduce((a, s) => a + (s.grade || 0), 0) / graded.length) : null;
                                const due = asgn.dueDate ? new Date(asgn.dueDate) : null;
                                const overdue = due && due < new Date();
                                return (
                                    <tr key={asgn._id}
                                        style={{ borderBottom: '1px solid rgba(51,65,85,0.22)', transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <ClipboardList size={16} color={C.blue} aria-hidden="true" />
                                                </div>
                                                <div>
                                                    <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700' }}>{asgn.title}</div>
                                                    <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px' }}>{asgn.maxScore} pts · {asgn.allowLate ? 'Late OK' : 'No late'}</div>
                                                    <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, background: asgn.aiTutorEnabled === false ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: asgn.aiTutorEnabled === false ? '#f87171' : '#34d399' }}>
                                                        {asgn.aiTutorEnabled === false ? '🔒 AI Tutor Disabled' : '⊡ AI Tutor Enabled'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '12px' }}>
                                                <BookOpen size={12} aria-hidden="true" />
                                                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {courses.find(c => c._id === (asgn.courseRef?._id || asgn.courseRef))?.courseTitle || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            {due ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: overdue ? C.red : '#94a3b8', fontSize: '12px', fontWeight: overdue ? '700' : '400' }}>
                                                    <Calendar size={12} aria-hidden="true" />
                                                    {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                                    {overdue && <span style={{ background: 'rgba(239,68,68,0.12)', color: C.red, fontSize: '10px', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>CLOSED</span>}
                                                </span>
                                            ) : <span style={{ color: '#334155', fontSize: '12px' }}>No deadline</span>}
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <button
                                                    onClick={() => onViewSubmissions(asgn)}
                                                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: C.blue, borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                    aria-label={`View ${subs.length} submissions`}
                                                >
                                                    <Users size={12} aria-hidden="true" /> {subs.length}
                                                </button>
                                                {subs.filter(s => s.status === 'Submitted').length > 0 && (
                                                    <span style={{ background: 'rgba(245,158,11,0.12)', color: C.orange, border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', padding: '3px 7px', fontSize: '10px', fontWeight: '700' }}>
                                                        {subs.filter(s => s.status === 'Submitted').length} pending
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            {avgScore !== null
                                                ? <span style={{ color: avgScore >= 80 ? C.green : avgScore >= 60 ? C.orange : C.red, fontWeight: '700', fontSize: '13px' }}>{avgScore}%</span>
                                                : <span style={{ color: '#334155', fontSize: '12px' }}>—</span>
                                            }
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <StatusBadge published={asgn.published} dueDate={asgn.dueDate} />
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <ActionMenu
                                                assignment={asgn}
                                                onViewSubmissions={onViewSubmissions}
                                                onEdit={setEditTarget}
                                                onDuplicate={handleDuplicate}
                                                onDelete={setDeleteConfirm}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editTarget && (
                <EditModal
                    assignment={editTarget}
                    onSave={updated => { onUpdated(updated); setEditTarget(null); }}
                    onClose={() => setEditTarget(null)}
                />
            )}

            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }} onClick={() => setDeleteConfirm(null)}>
                    <div style={{ ...card, maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Trash2 size={24} color="#ef4444" aria-hidden="true" />
                        </div>
                        <h3 style={{ color: '#f8fafc', fontSize: '17px', fontWeight: '800', margin: '0 0 8px' }}>Delete Assignment?</h3>
                        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
                            "<strong style={{ color: '#f1f5f9' }}>{deleteConfirm.title}</strong>" will be deactivated. Existing submissions are preserved.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={ghostBtn}>Cancel</button>
                            <button onClick={handleDelete} style={dangerBtn}><Trash2 size={14} aria-hidden="true" /> Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
