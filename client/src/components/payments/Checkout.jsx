import React, { useState } from 'react';
import { paymentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function Checkout({ course }) {
    const { colors } = useTheme();
    const [provider, setProvider] = useState('chapa');
    const [coupon, setCoupon] = useState('');

    const start = async () => {
        try {
            const res = await paymentService.initiate({ courseId: course._id, amount: course.price, provider, coupon });
            if (res.data && res.data.success) {
                window.location.href = res.data.data.paymentUrl; // redirect to provider (stub)
            }
        } catch (err) { console.error(err); alert('Payment initiation failed'); }
    };

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: 0, color: colors.text }}>Checkout</h4>
            <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 800 }}>{course.title}</div>
                <div style={{ color: colors.textMuted }}>{course.price} {course.currency || 'ETB'}</div>
            </div>
            <div style={{ marginTop: 8 }}>
                <select value={provider} onChange={e=>setProvider(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
                    <option value="chapa">Chapa</option>
                    <option value="telebirr">Telebirr</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                </select>
            </div>
            <div style={{ marginTop: 8 }}>
                <input placeholder="Coupon code" value={coupon} onChange={e=>setCoupon(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 8 }}>
                <button onClick={start} style={{ background: colors.primary, color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>Pay {course.price}</button>
            </div>
        </div>
    );
}
