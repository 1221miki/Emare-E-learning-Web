import React, { useRef } from 'react';

export default function FeaturedCarousel({ courses = [] }) {
    const containerRef = useRef(null);

    const scroll = (dir = 'right') => {
        const el = containerRef.current;
        if (!el) return;
        const amount = el.offsetWidth * 0.8;
        el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    return (
        <div style={{ position: 'relative' }}>
            <div ref={containerRef} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
                {courses.map(c => (
                    <div key={c._id} style={{ minWidth: 320, background: 'var(--card-bg, #ffffff)', borderRadius: 12, padding: 12, border: '1px solid rgba(15,23,42,0.06)', display: 'flex', gap: 12 }}>
                        <div style={{ width: 88, height: 64, borderRadius: 8, background: 'linear-gradient(135deg,#16a34a, #ec4899)' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-color, #0f172a)' }}>{c.courseTitle}</div>
                            <div style={{ color: 'var(--muted, #64748b)', fontSize: 12 }}>{c.estimatedDurationHours || 0}h · {c.technicalCategory || 'Course'}</div>
                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: 13 }}>ETB {c.price || '—'}</div>
                                <a href={`/courses/${c._id}`} style={{ background: 'linear-gradient(135deg,#22c55e,#ec4899)', color: '#fff', padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Enroll</a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
                <button onClick={() => scroll('left')} style={{ background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', padding: 8, borderRadius: 8, cursor: 'pointer' }}>{'‹'}</button>
                <button onClick={() => scroll('right')} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: 8, borderRadius: 8, cursor: 'pointer' }}>{'›'}</button>
            </div>
        </div>
    );
}
