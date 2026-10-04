import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { liveSessionService } from '../../services/api';
import { X, Link2, Loader } from 'lucide-react';

const PLATFORMS = ['Jitsi Meet', 'Zoom', 'Google Meet', 'Custom'];

export default function LiveSessionFormModal({ courses = [], session = null, onSuccess, onClose }) {
    const { colors: c } = useTheme();
    const isEdit = !!session;

    const [form, setForm] = useState({
        title: '',
        description: '',
        courseRef: courses[0]?._id || '',
        startTime: '',
        durationMinutes: 60,
        platform: 'Jitsi Meet',
        meetingLink: '',
        meetingPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [linkMsg, setLinkMsg] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Pre-fill when editing
    useEffect(() => {
        if (session) {
            setForm({
                title: session.title || '',
                description: session.description || '',
                courseRef: session.courseRef?._id || session.courseRef || '',
                startTime: session.startTime ? new Date(session.startTime).toISOString().slice(0, 16) : '',
                durationMinutes: session.durationMinutes || 60,
                platform: session.platform || 'Jitsi Meet',
                meetingLink: session.meetingLink || '',
                meetingPassword: session.meetingPassword || '',
            });
        }
    }, [session]);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Title is required.';
        if (!form.courseRef) e.courseRef = 'Please select a course.';
        if (!form.startTime) e.startTime = 'Start time is required.';
        if (!form.durationMinutes || Number(form.durationMinutes) <= 0) e.durationMinutes = 'Duration must be > 0.';
        const link = form.meetingLink.trim();
        if (!link) {
            e.meetingLink = form.platform === 'Jitsi Meet'
                ? 'Click "Generate Link" to create a Jitsi room.'
                : 'A meeting link is required.';
        } else {
            try { new URL(link); } catch { e.meetingLink = 'Must be a valid URL (http/https).'; }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleGenerateLink = async () => {
        setLinkMsg(null);
        if (!form.title.trim()) {
            setErrors(prev => ({ ...prev, title: 'Enter a title first — it names the meeting room.' }));
            return;
        }
        if (form.platform === 'Custom') {
            setLinkMsg({ type: 'info', text: 'Paste your custom meeting URL in the field below.' });
            return;
        }
        setGenerating(true);
        try {
            const res = await liveSessionService.generateLink({
                platform: form.platform,
                title: form.title,
                startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
                durationMinutes: Number(form.durationMinutes) || 60,
            });
            const url = res.data?.data?.url;
            if (!url) throw new Error('No URL returned.');
            set('meetingLink', url);
            setErrors(prev => ({ ...prev, meetingLink: undefined }));
            setLinkMsg({ type: 'success', text: 'Link generated successfully.' });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Could not generate link.';
            setLinkMsg({ type: 'error', text: msg });
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                startTime: new Date(form.startTime).toISOString(),
                durationMinutes: Number(form.durationMinutes),
                meetingLink: form.meetingLink.trim(),
            };
            let res;
            if (isEdit) {
                res = await liveSessionService.updateSession(session._id, payload);
            } else {
                res = await liveSessionService.createSession(payload);
            }
            onSuccess(res.data.data, isEdit);
        } catch (err) {
            const msg = err.response?.data?.message || 'Save failed.';
            if (/meeting link/i.test(msg)) setErrors(prev => ({ ...prev, meetingLink: msg }));
            else setErrors(prev => ({ ...prev, _global: msg }));
        } finally {
            setSaving(false);
        }
    };

    // ── Styles ─────────────────────────────────────────────
    const inp = (hasErr) => ({
        width: '100%', padding: '10px 13px', borderRadius: '8px',
        background: c.bgInput || c.bgCard, border: `1px solid ${hasErr ? '#ef4444' : c.border}`,
        color: c.text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
    });
    const lbl = { color: c.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '5px', display: 'block' };
    const errTxt = { color: '#ef4444', fontSize: '11px', marginTop: '4px' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: '18px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
                    <h3 style={{ color: c.text, fontSize: '18px', fontWeight: '800', margin: 0 }}>
                        {isEdit ? 'Edit Live Session' : 'Create Live Session'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {errors._global && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                            {errors._global}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label style={lbl}>Live Class Title *</label>
                        <input style={inp(errors.title)} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. React Hooks Deep Dive — Week 3" />
                        {errors.title && <p style={errTxt}>{errors.title}</p>}
                    </div>

                    {/* Course */}
                    <div>
                        <label style={lbl}>Course *</label>
                        <select style={inp(errors.courseRef)} value={form.courseRef} onChange={e => set('courseRef', e.target.value)}>
                            <option value="">— Select a course —</option>
                            {courses.map(c_ => (
                                <option key={c_._id} value={c_._id}>{c_.courseTitle}</option>
                            ))}
                        </select>
                        {errors.courseRef && <p style={errTxt}>{errors.courseRef}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label style={lbl}>Description (optional)</label>
                        <textarea style={{ ...inp(false), minHeight: '70px', resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What will you cover in this session?" />
                    </div>

                    {/* Date & Duration */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={lbl}>Date & Start Time *</label>
                            <input type="datetime-local" style={inp(errors.startTime)} value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                            {errors.startTime && <p style={errTxt}>{errors.startTime}</p>}
                        </div>
                        <div>
                            <label style={lbl}>Duration (minutes) *</label>
                            <input type="number" min="10" max="480" style={inp(errors.durationMinutes)} value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} />
                            {errors.durationMinutes && <p style={errTxt}>{errors.durationMinutes}</p>}
                        </div>
                    </div>

                    {/* Platform */}
                    <div>
                        <label style={lbl}>Meeting Platform</label>
                        <select style={inp(false)} value={form.platform} onChange={e => {
                            set('platform', e.target.value);
                            setLinkMsg(null);
                        }}>
                            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* Meeting Link */}
                    <div>
                        <label style={lbl}>Meeting Link *</label>
                        <input
                            type="url"
                            style={inp(errors.meetingLink)}
                            value={form.meetingLink}
                            onChange={e => { set('meetingLink', e.target.value); setErrors(prev => ({ ...prev, meetingLink: undefined })); }}
                            placeholder="https://…"
                        />
                        {errors.meetingLink && <p style={errTxt}>{errors.meetingLink}</p>}
                        {linkMsg && (
                            <p style={{ fontSize: '12px', marginTop: '4px', fontWeight: '600', color: linkMsg.type === 'success' ? '#4ade80' : linkMsg.type === 'error' ? '#f87171' : '#f59e0b' }}>
                                {linkMsg.type === 'success' ? '✓ ' : linkMsg.type === 'error' ? '⚠ ' : 'ℹ '}{linkMsg.text}
                            </p>
                        )}
                        {form.platform !== 'Custom' && (
                            <button type="button" onClick={handleGenerateLink} disabled={generating}
                                style={{ marginTop: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '7px', padding: '7px 14px', fontWeight: '700', fontSize: '12px', cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {generating ? <Loader size={12} className="spin" /> : <Link2 size={12} />}
                                {generating ? 'Generating…' : 'Generate Link'}
                            </button>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label style={lbl}>Meeting Password (optional)</label>
                        <input style={inp(false)} value={form.meetingPassword} onChange={e => set('meetingPassword', e.target.value)} placeholder="Leave blank if no password" />
                    </div>

                    {/* Submit */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button type="button" onClick={onClose}
                            style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: '800', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {saving ? <Loader size={14} /> : null}
                            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Session'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .8s linear infinite}`}</style>
        </div>
    );
}
