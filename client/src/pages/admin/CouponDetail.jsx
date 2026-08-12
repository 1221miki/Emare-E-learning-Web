import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminCouponService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function CouponDetail() {
    const { colors } = useTheme();
    const { id } = useParams();
    const navigate = useNavigate();
    const [coupon, setCoupon] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [usage, setUsage] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    useEffect(() => { load(); loadUsage(); }, [id, page]);

    async function load() {
        try {
            const res = await adminCouponService.get(id);
            if (res.data.success) { setCoupon(res.data.data); setForm(res.data.data); }
        } catch (err) { console.error(err); }
    }

    async function loadUsage() {
        try {
            const res = await adminCouponService.usage(id, { page, limit });
            if (res.data.success) setUsage(res.data.data.items || []);
        } catch (err) { console.error(err); }
    }

    async function save() {
        try {
            const res = await adminCouponService.update(id, form);
            if (res.data.success) { setEditing(false); load(); }
        } catch (err) { console.error(err); }
    }

    async function toggleActive() {
        try {
            const res = await adminCouponService.setStatus(id, !coupon.active);
            if (res.data.success) load();
        } catch (err) { console.error(err); }
    }

    async function remove() {
        if (!window.confirm('Delete this coupon?')) return;
        try {
            const res = await adminCouponService.delete(id);
            if (res.data.success) navigate('/admin/coupons');
        } catch (err) { console.error(err); }
    }

    if (!coupon) return <div style={{ padding: 24 }}>Loading…</div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Coupon: {coupon.code}</h2>
                <div>
                    <button onClick={() => navigate('/admin/coupons')} style={{ marginRight: 8 }}>← Back</button>
                    <button onClick={toggleActive} style={{ marginRight: 8 }}>{coupon.active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={remove} style={{ background: '#ef4444', color: '#fff' }}>Delete</button>
                </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 8, maxWidth: 760 }}>
                {editing ? (
                    <>
                        <input value={form.code || ''} onChange={(e)=>setForm(f=>({...f, code:e.target.value}))} />
                        <select value={form.type} onChange={(e)=>setForm(f=>({...f, type:e.target.value}))}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>
                        <input type="number" value={form.value || 0} onChange={(e)=>setForm(f=>({...f, value:parseFloat(e.target.value||0)}))} />
                        <input type="number" value={form.maxDiscount || 0} onChange={(e)=>setForm(f=>({...f, maxDiscount:parseFloat(e.target.value||0)}))} />
                        <input type="number" value={form.redeemLimit || 0} onChange={(e)=>setForm(f=>({...f, redeemLimit:parseInt(e.target.value||0)}))} />
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={save} style={{ background:'#10b981', color:'#fff' }}>Save</button>
                            <button onClick={()=>setEditing(false)}>Cancel</button>
                        </div>
                    </>
                ) : (
                    <div style={{ border: `1px solid ${colors.border}`, padding: 12, borderRadius: 8, background: colors.bgCard }}>
                        <div><strong>Type:</strong> {coupon.type}</div>
                        <div><strong>Value:</strong> {coupon.type === 'percent' ? `${coupon.value}%` : `${coupon.value} ETB`}</div>
                        <div><strong>Max Discount:</strong> {coupon.maxDiscount || '—'}</div>
                        <div><strong>Redeemed:</strong> {coupon.redeemedCount}/{coupon.redeemLimit || '∞'}</div>
                        <div><strong>Applies To:</strong> {coupon.appliesTo?.allCourses ? 'All courses' : (coupon.appliesTo?.courseIds?.length ? `${coupon.appliesTo.courseIds.length} courses` : '—')}</div>
                        <div style={{ marginTop: 8 }}>
                            <button onClick={()=>setEditing(true)} style={{ marginRight: 8 }}>Edit</button>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 18 }}>
                    <h3>Usage</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Original</th>
                                <th>Discount</th>
                                <th>Final</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usage.map(u => (
                                <tr key={u._id}>
                                    <td>{u.studentRef?.email || u.studentRef || '—'}</td>
                                    <td>{u.originalAmount}</td>
                                    <td>{u.discountAmount}</td>
                                    <td>{u.finalAmount}</td>
                                    <td>{new Date(u.redeemedAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
