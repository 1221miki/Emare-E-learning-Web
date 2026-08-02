import React, { useEffect, useState } from 'react';
import { reviewService } from '../../services/api';

export default function ReviewList({ courseId }) {
    const [reviews, setReviews] = useState([]);

    useEffect(() => { if (courseId) reviewService.getCourseReviews(courseId).then(r=>setReviews(r.data.data||[])).catch(()=>{}); }, [courseId]);

    return (
        <div>
            {reviews.map(r => (
                <div key={r._id} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <div style={{ fontWeight: 700 }}>{r.studentRef && (r.studentRef.fullName || r.studentRef.username)}</div>
                    <div>Rating: {r.rating} • {new Date(r.createdAt).toLocaleDateString()}</div>
                    <div>{r.title && <strong>{r.title}</strong>} <p>{r.content}</p></div>
                    <div>Likes: {r.likes}</div>
                </div>
            ))}
        </div>
    );
}
