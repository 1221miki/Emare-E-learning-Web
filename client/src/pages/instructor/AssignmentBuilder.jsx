import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courseService, assignmentService, uploadService } from '../../services/api';

export default function AssignmentBuilder() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const preCourse = params.get('course') || '';

    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState({
        courseRef: preCourse,
        title: '',
        description: '',
        instructions: '',
        dueDate: '',
        dueTime: '23:59',
        maxScore: 100,
        attachment: null,
        attachmentPreview: ''
    });
    const [msg, setMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await courseService.getInstructorCourses();
                setCourses(res.data.data || []);
                if (!form.courseRef && res.data.data?.length > 0) setForm(prev => ({ ...prev, courseRef: res.data.data[0]._id }));
            } catch (err) {
                console.error('Failed to load courses', err);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onFile = (e) => {
        const f = e.target.files?.[0] || null;
        setForm(prev => ({ ...prev, attachment: f, attachmentPreview: f ? f.name : '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.courseRef) return setMsg('Select a course');
        if (!form.title.trim()) return setMsg('Provide a title');
        setSubmitting(true); setMsg('');
        try {
            const dueAt = form.dueDate ? new Date(`${form.dueDate}T${form.dueTime || '23:59'}:00`) : null;
            const payload = {
                courseRef: form.courseRef,
                title: form.title,
                description: form.description,
                instructions: form.instructions,
                dueDate: dueAt,
                maxScore: Number(form.maxScore),
                allowLate: false,
                published: false
            };

            if (form.attachment) {
                const fd = new FormData();
                fd.append('file', form.attachment);
                const up = await uploadService.uploadFile(fd);
                if (up.data?.success) {
                    payload.attachments = [{ filename: form.attachment.name, url: up.data.data.url, mimeType: form.attachment.type, size: form.attachment.size }];
                }
            }

            const res = await assignmentService.create(payload);
            setMsg('Assignment created. You can publish it from the dashboard.');
            setSubmitting(false);
            // navigate back to dashboard and show the content tab
            navigate('/instructor/dashboard');
        } catch (err) {
            setMsg(err.response?.data?.message || 'Failed to create assignment');
            setSubmitting(false);
        }
    };

    return (
        <div style={{ padding: 28 }}>
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
                <h2 style={{ color: colors.text, marginBottom: 6 }}>Add Assignment</h2>
                <p style={{ color: colors.textMuted, marginTop: 0 }}>Create an assignment with optional PDF/Word/Video attachment. Late submissions are not accepted.</p>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
                    <div>
                        <label style={{ color: colors.textMuted, fontSize: 13 }}>Course</label>
                        <select value={form.courseRef} onChange={e => setForm({ ...form, courseRef: e.target.value })} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 8, background: colors.bgInput, color: colors.text }}>
                            <option value="">Choose a course</option>
                            {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ color: colors.textMuted, fontSize: 13 }}>Title</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, background: colors.bgInput, color: colors.text }} required />
                    </div>
                    <div>
                        <label style={{ color: colors.textMuted, fontSize: 13 }}>Due Date</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} style={{ padding: '8px', borderRadius: 8, background: colors.bgInput, color: colors.text }} />
                            <input type="time" value={form.dueTime} onChange={e => setForm({ ...form, dueTime: e.target.value })} style={{ padding: '8px', borderRadius: 8, background: colors.bgInput, color: colors.text }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ color: colors.textMuted, fontSize: 13 }}>Description</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', minHeight: 80, padding: '10px', borderRadius: 8, background: colors.bgInput, color: colors.text }} />
                    </div>
                    <div>
                        <label style={{ color: colors.textMuted, fontSize: 13 }}>Instructions</label>
                        <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} style={{ width: '100%', minHeight: 120, padding: '10px', borderRadius: 8, background: colors.bgInput, color: colors.text }} />
                    </div>
                    <div>
                        <label style={{ color: colors.textMuted, fontSize: 13 }}>Attachment (PDF / Word / Video)</label>
                        <input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*" onChange={onFile} style={{ display: 'block', marginTop: 8 }} />
                        {form.attachmentPreview && <div style={{ color: colors.textMuted, marginTop: 8 }}>{form.attachmentPreview}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', padding: '10px 14px', borderRadius: 8, border: 'none' }}>{submitting ? 'Creating...' : 'Create Assignment'}</button>
                        <button type="button" onClick={() => navigate('/instructor/dashboard')} style={{ background: 'transparent', border: '1px solid rgba(149,157,165,0.12)', color: colors.text, padding: '10px 14px', borderRadius: 8 }}>Cancel</button>
                    </div>
                    {msg && <div style={{ color: '#fff' }}>{msg}</div>}
                </form>
            </div>
        </div>
    );
}
