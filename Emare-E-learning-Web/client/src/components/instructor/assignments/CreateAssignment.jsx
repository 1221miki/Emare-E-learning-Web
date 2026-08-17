import React, { useState, useRef } from 'react';
import {
    ClipboardList, Upload, X, FileText, Image, Archive,
    Calendar, Settings, Users, ArrowLeft, Plus, Trash2
} from 'lucide-react';
import { assignmentService, uploadService } from '../../../services/api';
import { card, input, select, primaryBtn, ghostBtn, label as lbl, C } from './assignmentStyles';

const CATEGORIES = ['Homework', 'Project', 'Practice Task', 'Final Assessment', 'Lab Exercise', 'Research'];
const GRADING    = ['Manual Grading', 'Automatic Grading', 'Rubric Based Grading'];

function FileIcon({ mime }) {
    if (!mime) return <FileText size={16} color={C.blue} aria-hidden="true" />;
    if (mime.startsWith('image/')) return <Image size={16} color={C.purple} aria-hidden="true" />;
    if (mime === 'application/pdf') return <FileText size={16} color={C.red} aria-hidden="true" />;
    return <Archive size={16} color={C.orange} aria-hidden="true" />;
}

function bytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
}

export default function CreateAssignment({ courses, defaultCourse, onCreated, onCancel }) {
    const dropRef  = useRef(null);
    const fileRef  = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');
    const [files, setFiles]       = useState([]);   // { file, preview, uploading, url, mime }
    const [activeSection, setSection] = useState('basic'); // basic | settings | access

    const [form, setForm] = useState({
        courseRef:      defaultCourse?._id || '',
        title:          '',
        category:       'Homework',
        description:    '',
        instructions:   '',
        // Settings
        maxScore:       100,
        passingScore:   60,
        gradingMethod:  'Manual Grading',
        startDate:      '',
        dueDate:        '',
        dueTime:        '23:59',
        allowLate:      false,
        latePenalty:    0,
        // Access
        access:         'all',
        published:      false,
        // Rubric items
        rubricItems:    [],
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    /* ── File handling ─────────────────────────────── */
    const addFiles = (incoming) => {
        const newItems = Array.from(incoming).map(f => ({
            file: f, mime: f.type, name: f.name, size: f.size,
            preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
            uploading: false, url: null
        }));
        setFiles(prev => [...prev, ...newItems]);
    };
    const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

    const handleDrop = (e) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    };

    /* ── Rubric ─────────────────────────────────────── */
    const addRubricItem = () => set('rubricItems', [...form.rubricItems, { criterion: '', maxPoints: 10 }]);
    const updateRubric  = (i, k, v) => {
        const items = [...form.rubricItems];
        items[i] = { ...items[i], [k]: v };
        set('rubricItems', items);
    };
    const removeRubric  = (i) => set('rubricItems', form.rubricItems.filter((_, idx) => idx !== i));

    /* ── Submit ─────────────────────────────────────── */
    const handleSubmit = async (publish) => {
        if (!form.courseRef) return setError('Please select a course.');
        if (!form.title.trim()) return setError('Assignment title is required.');
        setSaving(true); setError('');

        try {
            // Upload attachments
            const attachments = [];
            for (const item of files) {
                if (item.url) { attachments.push({ filename: item.name, url: item.url, mimeType: item.mime, size: item.size }); continue; }
                const fd = new FormData(); fd.append('file', item.file);
                const res = await uploadService.uploadFile(fd);
                if (res.data?.success) attachments.push({ filename: item.name, url: res.data.data.url, mimeType: item.mime, size: item.size });
            }

            const dueAt = form.dueDate ? new Date(`${form.dueDate}T${form.dueTime}:00`) : null;
            const startAt = form.startDate ? new Date(form.startDate) : null;

            const payload = {
                courseRef:    form.courseRef,
                title:        form.title.trim(),
                description:  form.description,
                instructions: form.instructions,
                maxScore:     Number(form.maxScore),
                dueDate:      dueAt,
                startDate:    startAt,
                allowLate:    form.allowLate,
                published:    publish,
                attachments,
                rubricItems:  form.rubricItems.filter(r => r.criterion.trim()),
                category:     form.category,
                gradingMethod: form.gradingMethod,
                passingScore: Number(form.passingScore),
                latePenalty:  Number(form.latePenalty),
            };
            const res = await assignmentService.create(payload);
            onCreated(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to create assignment. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const sectionNav = [
        { key: 'basic',    label: 'Basic Info',    icon: <ClipboardList size={14} aria-hidden="true" /> },
        { key: 'settings', label: 'Settings',      icon: <Settings size={14} aria-hidden="true" /> },
        { key: 'access',   label: 'Access & Rubric', icon: <Users size={14} aria-hidden="true" /> },
    ];

    return (
        <div style={{ ...card, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(51,65,85,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onCancel} style={{ ...ghostBtn, padding: '8px 10px' }} aria-label="Back"><ArrowLeft size={16} aria-hidden="true" /></button>
                    <div>
                        <h3 style={{ color: '#f8fafc', fontSize: '17px', fontWeight: '800', margin: 0 }}>Create Assignment</h3>
                        <p style={{ color: '#475569', fontSize: '12px', margin: '2px 0 0' }}>Fill in the details below to create a new assignment</p>
                    </div>
                </div>
            </div>

            {/* Section tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(51,65,85,0.3)', padding: '0 28px' }}>
                {sectionNav.map(n => (
                    <button key={n.key} onClick={() => setSection(n.key)} style={{ background: 'transparent', border: 'none', borderBottom: activeSection === n.key ? `2px solid ${C.blue}` : '2px solid transparent', color: activeSection === n.key ? C.blue : '#64748b', padding: '12px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '-1px', transition: 'color 0.15s' }}>
                        {n.icon}{n.label}
                    </button>
                ))}
            </div>

            <div style={{ padding: '28px', display: 'grid', gap: '20px' }}>
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '10px', padding: '12px 16px', fontSize: '13px' }}>{error}</div>}

                {/* ── BASIC INFO ── */}
                {activeSection === 'basic' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={lbl}>Assignment Title *</label>
                                <input style={input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. React Component Project" required />
                            </div>
                            <div>
                                <label style={lbl}>Course *</label>
                                <select style={select} value={form.courseRef} onChange={e => set('courseRef', e.target.value)}>
                                    <option value="">Select a course…</option>
                                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={lbl}>Category</label>
                                <select style={select} value={form.category} onChange={e => set('category', e.target.value)}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={lbl}>Description</label>
                                <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief overview of what students should accomplish…" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={lbl}>Detailed Instructions</label>
                                <textarea style={{ ...input, minHeight: '120px', resize: 'vertical' }} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Step-by-step instructions, requirements, submission format…" />
                            </div>
                        </div>

                        {/* Drag-drop file upload */}
                        <div>
                            <label style={lbl}>Attachments</label>
                            <div
                                ref={dropRef}
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onClick={() => fileRef.current?.click()}
                                style={{ border: `2px dashed ${dragging ? C.blue : 'rgba(51,65,85,0.5)'}`, borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(9,13,22,0.4)', transition: 'all 0.2s' }}
                                role="button"
                                aria-label="Upload files — drag and drop or click to browse"
                            >
                                <Upload size={28} color={dragging ? C.blue : '#334155'} style={{ display: 'block', margin: '0 auto 10px' }} aria-hidden="true" />
                                <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>Drag & drop files here, or <span style={{ color: C.blue }}>browse</span></div>
                                <div style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>PDF, Word, Images, ZIP, MP4 — max 50 MB each</div>
                                <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.mp4,.pptx,.xlsx" />
                            </div>

                            {files.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                    {files.map((f, i) => (
                                        <div key={i} style={{ background: 'rgba(9,13,22,0.5)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {f.preview
                                                ? <img src={f.preview} alt={f.name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                                                : <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(51,65,85,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileIcon mime={f.mime} /></div>
                                            }
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                                <div style={{ color: '#475569', fontSize: '11px' }}>{bytes(f.size)}</div>
                                            </div>
                                            <button onClick={() => removeFile(i)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }} aria-label={`Remove ${f.name}`}><X size={15} aria-hidden="true" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── SETTINGS ── */}
                {activeSection === 'settings' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={lbl}>Maximum Points</label>
                            <input type="number" min="1" style={input} value={form.maxScore} onChange={e => set('maxScore', e.target.value)} />
                        </div>
                        <div>
                            <label style={lbl}>Passing Score</label>
                            <input type="number" min="0" max="100" style={input} value={form.passingScore} onChange={e => set('passingScore', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={lbl}>Grading Method</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {GRADING.map(g => (
                                    <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: form.gradingMethod === g ? 'rgba(59,130,246,0.12)' : 'rgba(9,13,22,0.5)', border: `1px solid ${form.gradingMethod === g ? 'rgba(59,130,246,0.4)' : 'rgba(51,65,85,0.4)'}`, borderRadius: '10px', padding: '10px 16px', color: form.gradingMethod === g ? C.blue : '#94a3b8', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s' }}>
                                        <input type="radio" name="gradingMethod" value={g} checked={form.gradingMethod === g} onChange={() => set('gradingMethod', g)} style={{ accentColor: C.blue }} />{g}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={lbl}>Start Date</label>
                            <input type="date" style={input} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                        </div>
                        <div>
                            <label style={lbl}>Submission Deadline</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="date" style={{ ...input, flex: '2' }} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                                <input type="time" style={{ ...input, flex: '1' }} value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                                <input type="checkbox" checked={form.allowLate} onChange={e => set('allowLate', e.target.checked)} style={{ accentColor: C.orange, width: '16px', height: '16px' }} />
                                Allow Late Submissions
                            </label>
                            {form.allowLate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>Late Penalty %</label>
                                    <input type="number" min="0" max="100" style={{ ...input, width: '80px' }} value={form.latePenalty} onChange={e => set('latePenalty', e.target.value)} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── ACCESS & RUBRIC ── */}
                {activeSection === 'access' && (
                    <>
                        <div>
                            <label style={lbl}>Student Access</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[['all', 'All Enrolled Students'], ['selected', 'Selected Students'], ['groups', 'Specific Course Groups']].map(([val, text]) => (
                                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: form.access === val ? 'rgba(59,130,246,0.08)' : 'rgba(9,13,22,0.4)', border: `1px solid ${form.access === val ? 'rgba(59,130,246,0.3)' : 'rgba(51,65,85,0.4)'}`, borderRadius: '10px', padding: '12px 16px', color: form.access === val ? C.blue : '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                                        <input type="radio" name="access" value={val} checked={form.access === val} onChange={() => set('access', val)} style={{ accentColor: C.blue }} />{text}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Rubric */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ ...lbl, margin: 0 }}>Grading Rubric (optional)</label>
                                <button onClick={addRubricItem} style={{ ...ghostBtn, padding: '6px 12px', fontSize: '12px' }}>
                                    <Plus size={13} aria-hidden="true" /> Add Criterion
                                </button>
                            </div>
                            {form.rubricItems.length === 0 && (
                                <div style={{ color: '#334155', fontSize: '12px', padding: '12px', background: 'rgba(9,13,22,0.4)', borderRadius: '8px', border: '1px dashed rgba(51,65,85,0.4)' }}>No rubric items yet. Click "Add Criterion" to define evaluation criteria.</div>
                            )}
                            {form.rubricItems.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                    <input style={{ ...input, flex: '3' }} placeholder={`Criterion ${i + 1}…`} value={item.criterion} onChange={e => updateRubric(i, 'criterion', e.target.value)} />
                                    <input type="number" min="1" style={{ ...input, width: '80px', flex: '1' }} value={item.maxPoints} onChange={e => updateRubric(i, 'maxPoints', Number(e.target.value))} />
                                    <span style={{ color: '#475569', fontSize: '11px', whiteSpace: 'nowrap' }}>pts</span>
                                    <button onClick={() => removeRubric(i)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }} aria-label="Remove criterion"><Trash2 size={14} aria-hidden="true" /></button>
                                </div>
                            ))}
                            {form.rubricItems.length > 0 && (
                                <div style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>
                                    Total rubric points: <strong style={{ color: '#94a3b8' }}>{form.rubricItems.reduce((a, r) => a + Number(r.maxPoints || 0), 0)}</strong>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(51,65,85,0.25)', flexWrap: 'wrap' }}>
                    <button onClick={() => handleSubmit(true)} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
                        <ClipboardList size={15} aria-hidden="true" /> {saving ? 'Creating…' : 'Create & Publish'}
                    </button>
                    <button onClick={() => handleSubmit(false)} disabled={saving} style={{ ...ghostBtn, opacity: saving ? 0.7 : 1 }}>
                        Save as Draft
                    </button>
                    <button onClick={onCancel} style={ghostBtn}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
