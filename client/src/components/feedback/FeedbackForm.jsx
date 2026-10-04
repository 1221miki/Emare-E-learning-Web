import React, { useState } from 'react';
import { feedbackService } from '../../services/api';

export default function FeedbackForm({ courseId }){
    const [category, setCategory] = useState('Content');
    const [content, setContent] = useState('');

    const submit = async () => {
        try { await feedbackService.submit(courseId, { category, content }); alert('Feedback submitted'); setContent(''); } catch (err) { console.error(err); alert('Failed'); }
    };

    return (
        <div style={{ padding: 8 }}>
            <h4>Send Feedback</h4>
            <div>
                <select value={category} onChange={e=>setCategory(e.target.value)}>
                    <option>Content</option>
                    <option>Video</option>
                    <option>Instructor</option>
                    <option>Difficulty</option>
                    <option>UX</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Describe your suggestion or issue" />
            </div>
            <div>
                <button onClick={submit}>Send</button>
            </div>
        </div>
    );
}
