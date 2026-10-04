import React, { useState } from 'react';
import { projectService, uploadService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function ProjectSubmissionUploader({ projectId, teamRef }) {
    const { colors } = useTheme();
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const onFile = (e) => setFiles(Array.from(e.target.files));

    const submit = async () => {
        if (!projectId || files.length === 0) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            files.forEach(f => fd.append('files', f));
            if (teamRef) fd.append('teamRef', teamRef);
            const res = await projectService.submitMultipart(projectId, fd);
            if (res.data && res.data.success) alert('Project submitted');
        } catch (err) { console.error(err); alert('Submission failed'); }
        finally { setSubmitting(false); }
    };

    return (
        <div style={{ background: colors.bgInput, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <input type="file" multiple onChange={onFile} />
            <div style={{ marginTop: 8 }}>{files.map(f => <div key={f.name}>{f.name} — {Math.round(f.size/1024)} KB</div>)}</div>
            <div style={{ marginTop: 8 }}>
                <button disabled={submitting || files.length===0} onClick={submit} style={{ background: colors.primary, color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 8 }}>Submit Project</button>
            </div>
        </div>
    );
}
