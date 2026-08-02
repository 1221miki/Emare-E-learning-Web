import React, { useEffect, useState } from 'react';
import { reviewService } from '../../services/api';

export default function MyReviews(){
    const [items, setItems] = useState([]);
    useEffect(()=>{ reviewService.myReviews().then(r=>setItems(r.data.data||[])).catch(()=>{}); }, []);

    return (
        <div style={{ padding: 12 }}>
            <h4>My Reviews</h4>
            {items.map(i=> (
                <div key={i._id} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <div>{i.courseRef && (i.courseRef.courseTitle || i.courseRef.title)} — {i.rating} stars</div>
                    <div>{i.title}</div>
                    <div>{i.content}</div>
                    <div>Status: {i.status}</div>
                </div>
            ))}
        </div>
    );
}
