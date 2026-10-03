import React, { useState } from 'react';
import { reviewService } from '../../services/api';

export default function ReviewForm({ courseId, onSubmitted }) {
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const submit = async () => {
        try {
            await reviewService.submit(courseId, { rating, title, content });
            if (onSubmitted) onSubmitted();
            alert('Review submitted for moderation');
        } catch (err) { console.error(err); alert('Failed to submit review'); }
    };

    return (
        <div style={{ padding: 8 }}>
            <div>
                <label>Rating</label>
                <select value={rating} onChange={e=>setRating(Number(e.target.value))}>
                    {[5,4,3,2,1].map(s=><option key={s} value={s}>{s} stars</option>)}
                </select>
            </div>
            <div>
                <input placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} />
            </div>
            <div>
                <textarea placeholder="Share your experience" value={content} onChange={e=>setContent(e.target.value)} />
            </div>
            <div>
                <button onClick={submit}>Submit Review</button>
            </div>
        </div>
    );
}
