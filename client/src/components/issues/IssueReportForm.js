import React, { useState } from 'react';
import { issueService, uploadService } from '../../services/api';

export default function IssueReportForm({ courseId }){
    const [category, setCategory] = useState('Video');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);

    const submit = async () => {
        try {
            let attachments = [];
            if (file) {
                const fd = new FormData(); fd.append('file', file);
                const res = await uploadService.uploadFile(fd);
                if (res.data && res.data.data && res.data.data.url) attachments.push(res.data.data.url);
            }
            await issueService.report(courseId, { category, description, attachments });
            alert('Issue reported'); setDescription(''); setFile(null);
        } catch (err) { console.error(err); alert('Failed to report'); }
    };

    return (
        <div style={{ padding: 8 }}>
            <h4>Report an Issue</h4>
            <div>
                <select value={category} onChange={e=>setCategory(e.target.value)}>
                    <option>Video</option>
                    <option>Payment</option>
                    <option>Access</option>
                    <option>Content</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the problem" />
            </div>
            <div>
                <input type="file" onChange={e=>setFile(e.target.files[0])} />
            </div>
            <div>
                <button onClick={submit}>Submit Issue</button>
            </div>
        </div>
    );
}
