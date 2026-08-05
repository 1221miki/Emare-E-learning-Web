import React, { useState } from 'react';
import { uploadService, assignmentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function SubmissionUploader({ assignmentId, onSubmitted }) {
    const { colors } = useTheme();
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const onFile = (e) => setFiles(Array.from(e.target.files));

    const submit = async () => {
        if (!assignmentId) return;
        setSubmitting(true);
        try {
            const uploaded = [];
            for (const f of files) {
                const fd = new FormData(); fd.append('file', f);
                const res = await uploadService.uploadFile(fd);
                if (res.data && res.data.success) uploaded.push({ filename: f.name, url: res.data.data.url, mimeType: f.type, size: f.size });
            }
            await assignmentService.submit(assignmentId, { files: uploaded, message: '' });
            onSubmitted && onSubmitted();
        } catch (err) { console.error(err); alert('Upload failed'); }
        finally { setSubmitting(false); }
    };

    return (
        <div style={{ background: colors.bgInput, padding: 10, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <input type="file" multiple onChange={onFile} />
            <div style={{ marginTop: 8 }}>{files.map(f => <div key={f.name}>{f.name} — {Math.round(f.size/1024)} KB</div>)}</div>
            <div style={{ marginTop: 8 }}>
                <button onClick={submit} disabled={submitting || files.length===0} style={{ background: colors.primary, color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 8 }}>Upload & Submit</button>
            </div>
        </div>
    );
}
