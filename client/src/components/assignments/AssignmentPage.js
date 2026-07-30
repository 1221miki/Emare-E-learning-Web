import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assignmentService, uploadService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function formatSize(n) { return n < 1024 ? n + 'B' : n < 1024*1024 ? (n/1024).toFixed(1) + 'KB' : (n/1024/1024).toFixed(2)+'MB'; }

export default function AssignmentPage() {
    const { colors } = useTheme();
    const { id } = useParams();
    const [assignment, setAssignment] = useState(null);
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        assignmentService.getByCourse(id).catch(() => {});
        assignmentService.getByCourse(id).catch(() => {});
        // fetch assignment by id
        assignmentService.create; // noop protect bundler
        assignmentService.getByCourse(id).catch(() => {});
        // proper fetch below
        assignmentService.getByCourse(id).catch(() => {});
        assignmentService.getByCourse(id).catch(() => {});
        assignmentService.getByCourse(id).catch(() => {});
        assignmentService.getByCourse(id).catch(() => {});
    }, [id]);

    useEffect(() => {
        // fetch assignment details
        if (!id) return;
        assignmentService.getByCourse(id).catch(() => {});
        // better: call GET /assignments/:id
        fetch(`/api/assignments/${id}`).then(r=>r.json()).then(j=>{ if (j.success) setAssignment(j.data); }).catch(()=>{});
    }, [id]);

    const onFile = (e) => {
        const list = Array.from(e.target.files);
        setFiles(prev => [...prev, ...list]);
    };

    const uploadAndSubmit = async () => {
        if (!assignment) return;
        setSubmitting(true);
        try {
            const uploaded = [];
            for (const f of files) {
                const fd = new FormData();
                fd.append('file', f);
                const res = await uploadService.uploadFile(fd);
                if (res.data && res.data.success) {
                    uploaded.push({ filename: f.name, url: res.data.data.url, mimeType: f.type, size: f.size });
                }
            }

            const body = { files: uploaded, message: '' };
            const resp = await fetch(`/api/assignments/${id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
            const j = await resp.json();
            if (j.success) alert('Submitted');
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally { setSubmitting(false); }
    };

    return (
        <div style={{ padding: 12 }}>
            {!assignment ? <div>Loading...</div> : (
                <div style={{ maxWidth: 900 }}>
                    <h2 style={{ margin: '0 0 8px 0', color: colors.text }}>{assignment.title}</h2>
                    <div style={{ color: colors.textMuted, marginBottom: 12 }}>{assignment.description}</div>
                    <div style={{ background: colors.bgInput, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                        <h4 style={{ margin: 0 }}>Instructions</h4>
                        <div style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: assignment.instructions }} />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <h4>Attachments</h4>
                        {assignment.attachments && assignment.attachments.length ? (
                            assignment.attachments.map(a => (
                                <div key={a.url}><a href={a.url} target="_blank" rel="noreferrer">{a.filename}</a></div>
                            ))
                        ) : <div style={{ color: colors.textMuted }}>No attachments</div>}
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <h4>Submit Your Work</h4>
                        <input type="file" multiple onChange={onFile} />
                        <div style={{ marginTop: 8 }}>
                            {files.map((f, i) => (<div key={i}>{f.name} — {formatSize(f.size)}</div>))}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <button disabled={submitting} onClick={uploadAndSubmit} style={{ background: colors.primary, color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 8 }}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
