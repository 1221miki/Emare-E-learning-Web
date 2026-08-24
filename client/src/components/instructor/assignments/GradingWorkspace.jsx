import React, { useState } from 'react';
import {
    ArrowLeft, Download, FileText, Star, CheckCircle,
    RotateCcw, MessageSquare, Lock, Eye
} from 'lucide-react';
import { assignmentService } from '../../../services/api';
import { card, primaryBtn, ghostBtn, successBtn, C } from './assignmentStyles';

function FilePreview({ file }) {
    const isImage = file.mimeType?.startsWith('image/');
    const isPDF   = file.mimeType === 'application/pdf';
    return (
        <div style={{ ...card, padding: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} color={C.blue} aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename || 'Attachment'}</div>
                <div style={{ color: '#475569', fontSize: '11px' }}>{file.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {(isImage || isPDF) && (
                    <a href={file.url} target="_blank" rel="noreferrer" style={{ ...ghostBtn, padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }} aria-label={`Preview ${file.filename}`}>
                        <Eye size={13} aria-hidden="true" /> Preview
                    </a>
                )}
                <a href={file.url} download target="_blank" rel="noreferrer" style={{ ...primaryBtn, padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }} aria-label={`Download ${file.filename}`}>
                    <Download size={13} aria-hidden="true" /> Download
                </a>
            </div>
        </div>
    );
}

function RubricRow({ item, score, onChange }) {
    return (
        <div style={{ background: 'rgba(9,13,22,0.5)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{item.criterion}</span>
                <span style={{ color: '#475569', fontSize: '11px' }}>Max: {item.maxPoints} pts</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: 5 }).map((_, i) => {
                    const val = Math.round(((i + 1) / 5) * item.maxPoints);
                    const active = score === val;
                    return (
                        <button key={i} onClick={() => onChange(val)} style={{ flex: 1, background: active ? `${C.blue}20` : 'transparent', border: `1px solid ${active ? C.blue : 'rgba(51,65,85,0.4)'}`, color: active ? C.blue : '#475569', borderRadius: '8px', padding: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.12s' }} aria-label={`Score ${val} points`}>
                            {val}
                        </button>
                    );
                })}
                <input type="number" min="0" max={item.maxPoints} value={score ?? ''} onChange={e => onChange(Number(e.target.value))} placeholder="—" style={{ width: '56px', background: 'rgba(9,13,22,0.7)', border: '1px solid rgba(51,65,85,0.5)', color: '#f1f5f9', padding: '6px 8px', borderRadius: '8px', fontSize: '12px', outline: 'none', textAlign: 'center' }} aria-label={`Custom score for ${item.criterion}`} />
            </div>
        </div>
    );
}

export default function GradingWorkspace({ submission, assignment, onGraded, onBack }) {
    const student = submission?.studentRef || {};
    const files   = submission?.files || [];
    const hasRubric = (assignment?.rubricItems || []).length > 0;

    const [score, setScore]         = useState(submission?.grade ?? '');
    const [comments, setComments]   = useState(submission?.feedback?.[0]?.comments || '');
    const [privateNote, setPrivate] = useState('');
    const [allowResub, setAllowResub] = useState(false);
    const [rubricScores, setRubricScores] = useState({});
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');
    const [published, setPublished] = useState(false);

    // Auto-compute score from rubric
    const rubricTotal = Object.values(rubricScores).reduce((a, v) => a + (Number(v) || 0), 0);
    const maxRubric   = (assignment?.rubricItems || []).reduce((a, r) => a + r.maxPoints, 0);
    const effectiveScore = hasRubric && Object.keys(rubricScores).length > 0
        ? Math.round((rubricTotal / Math.max(maxRubric, 1)) * (assignment?.maxScore || 100))
        : Number(score) || 0;

    const handleSave = async (publish) => {
        setSaving(true); setError('');
        try {
            const payload = {
                score: effectiveScore,
                comments: comments.trim(),
                allowResubmission: allowResub,
            };
            const res = await assignmentService.gradeSubmission(submission._id, payload);
            setPublished(publish);
            onGraded({ ...submission, ...res.data.data, grade: effectiveScore, status: 'Graded' });
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to save grade. Please retry.');
        } finally {
            setSaving(false);
        }
    };

    const scoreColor = effectiveScore >= 80 ? C.green : effectiveScore >= 60 ? C.orange : C.red;
    const pct = Math.round((effectiveScore / Math.max(assignment?.maxScore || 100, 1)) * 100);

    const inp = { background: 'rgba(9,13,22,0.75)', border: '1px solid rgba(51,65,85,0.55)', color: '#f1f5f9', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', resize: 'vertical' };
    const lbl = { color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ ...ghostBtn, padding: '8px 10px' }} aria-label="Back to submissions"><ArrowLeft size={16} aria-hidden="true" /></button>
                <div>
                    <h3 style={{ color: '#f8fafc', fontSize: '17px', fontWeight: '800', margin: 0 }}>Grading Workspace</h3>
                    <p style={{ color: '#475569', fontSize: '12px', margin: '2px 0 0' }}>
                        {student.fullName || 'Student'} · {assignment?.title || 'Assignment'}
                    </p>
                </div>
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>

                {/* ── Left: Submission viewer ────────────────── */}
                <div>
                    {/* Student info */}
                    <div style={{ ...card, padding: '18px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(34,197,94,0.18)', border: '2px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue, fontWeight: '800', fontSize: '18px', flexShrink: 0 }}>
                            {(student.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>{student.fullName || 'Unknown Student'}</div>
                            <div style={{ color: '#475569', fontSize: '12px' }}>{student.accountEmail || student.email || '—'}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <div style={{ color: '#475569', fontSize: '11px', marginBottom: '2px' }}>Submitted</div>
                            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                                {submission?.createdAt ? new Date(submission.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                        </div>
                    </div>

                    {/* Submission message */}
                    {submission?.message && (
                        <div style={{ ...card, padding: '16px 20px', marginBottom: '16px' }}>
                            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageSquare size={12} aria-hidden="true" /> Student Note
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>{submission.message}</p>
                        </div>
                    )}

                    {/* Files */}
                    <div style={{ ...card, padding: '18px 20px' }}>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Submitted Files ({files.length})</div>
                        {files.length === 0
                            ? <p style={{ color: '#334155', fontSize: '13px', margin: 0 }}>No files attached to this submission.</p>
                            : files.map((f, i) => <FilePreview key={i} file={f} />)
                        }
                    </div>
                </div>

                {/* ── Right: Grading panel ───────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Score card */}
                    <div style={{ ...card, padding: '20px', borderTop: `3px solid ${scoreColor}`, textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Score</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                            <input
                                type="number"
                                min="0"
                                max={assignment?.maxScore || 100}
                                value={hasRubric && Object.keys(rubricScores).length > 0 ? effectiveScore : score}
                                onChange={e => setScore(e.target.value)}
                                readOnly={hasRubric && Object.keys(rubricScores).length > 0}
                                style={{ width: '80px', background: 'rgba(9,13,22,0.8)', border: `2px solid ${scoreColor}40`, color: scoreColor, padding: '8px', borderRadius: '10px', fontSize: '26px', fontWeight: '800', outline: 'none', textAlign: 'center' }}
                                aria-label="Assignment score"
                            />
                            <span style={{ color: '#475569', fontSize: '18px' }}>/ {assignment?.maxScore || 100}</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(51,65,85,0.4)', overflow: 'hidden', marginBottom: '6px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ color: scoreColor, fontSize: '13px', fontWeight: '700' }}>{pct}%</div>
                    </div>

                    {/* Rubric */}
                    {hasRubric && (
                        <div style={{ ...card, padding: '16px 18px' }}>
                            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Star size={12} aria-hidden="true" /> Rubric Evaluation
                            </div>
                            {(assignment.rubricItems || []).map((item, i) => (
                                <RubricRow key={i} item={item} score={rubricScores[i]} onChange={v => setRubricScores(prev => ({ ...prev, [i]: v }))} />
                            ))}
                            {Object.keys(rubricScores).length > 0 && (
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px', textAlign: 'right' }}>
                                    Rubric total: <strong style={{ color: C.blue }}>{rubricTotal}</strong> / {maxRubric} pts → <strong style={{ color: scoreColor }}>{effectiveScore}</strong> final score
                                </div>
                            )}
                        </div>
                    )}

                    {/* Feedback */}
                    <div style={{ ...card, padding: '16px 18px' }}>
                        <label style={lbl}>Instructor Feedback</label>
                        <textarea rows={4} style={{ ...inp, minHeight: '90px' }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Provide constructive feedback to the student…" aria-label="Instructor feedback" />
                    </div>

                    {/* Private note */}
                    <div style={{ ...card, padding: '16px 18px' }}>
                        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Lock size={11} aria-hidden="true" /> Private Notes (instructor only)
                        </label>
                        <textarea rows={2} style={{ ...inp, minHeight: '60px' }} value={privateNote} onChange={e => setPrivate(e.target.value)} placeholder="Internal notes — not visible to student…" aria-label="Private notes" />
                    </div>

                    {/* Allow resubmission */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                        <input type="checkbox" checked={allowResub} onChange={e => setAllowResub(e.target.checked)} style={{ accentColor: C.orange, width: '16px', height: '16px' }} />
                        Allow Resubmission
                    </label>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button onClick={() => handleSave(true)} disabled={saving} style={{ ...primaryBtn, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
                            <CheckCircle size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save & Publish Grade'}
                        </button>
                        <button onClick={() => handleSave(false)} disabled={saving} style={{ ...ghostBtn, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
                            Save Draft
                        </button>
                        <button onClick={onBack} style={{ ...ghostBtn, justifyContent: 'center' }}>
                            <RotateCcw size={14} aria-hidden="true" /> Return Without Grading
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
