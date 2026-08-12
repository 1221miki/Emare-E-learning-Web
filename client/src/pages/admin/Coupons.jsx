import { useEffect, useState } from 'react';
import { adminCouponService, courseService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function AdminCoupons() {
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(25);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ code: '', type: 'percent', value: 0, maxDiscount: 0, redeemLimit: 0, usageLimitPerUser: 0, active: true });

    useEffect(() => { load(); }, [page]);

    async function load() {
        setLoading(true);
        try {
            const res = await adminCouponService.list({ page, limit });
            if (res.data.success) {
                setCoupons(res.data.data.items);
                setTotal(res.data.data.total || 0);
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }

    useEffect(() => { loadStats(); }, []);

    async function loadStats() {
        try {
            const res = await adminCouponService.stats();
            if (res.data.success) {
                // simple summary placement
                // attach to top-level state if needed later
                console.log('coupon stats', res.data.data);
            }
        } catch (err) { console.error(err); }
    }

    async function create() {
        try {
            const res = await adminCouponService.create(form);
            if (res.data.success) { setShowCreate(false); setForm({ code: '', type: 'percent', value: 0, maxDiscount: 0, redeemLimit: 0, usageLimitPerUser: 0, active: true }); load(); }
        } catch (err) { console.error(err); }
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Coupon Management</h2>
                <div>
                    <button onClick={() => navigate('/admin/dashboard')} style={{ marginRight: 12 }}>← Back to Admin</button>
                    <button onClick={() => setShowCreate(true)} style={{ background: '#4338ca', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>Create Coupon</button>
                </div>
            </div>

            {showCreate && (
                <div style={{ marginTop: 12, padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.bgCard }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <input placeholder="Code" value={form.code} onChange={(e)=>setForm(s=>({...s, code:e.target.value}))} />
                        <select value={form.type} onChange={(e)=>setForm(s=>({...s, type:e.target.value}))}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>
                        <input placeholder="Value" type="number" value={form.value} onChange={(e)=>setForm(s=>({...s, value:parseFloat(e.target.value)}))} />
                        <input placeholder="Max Discount" type="number" value={form.maxDiscount} onChange={(e)=>setForm(s=>({...s, maxDiscount:parseFloat(e.target.value)}))} />
                        <input placeholder="Redeem Limit" type="number" value={form.redeemLimit} onChange={(e)=>setForm(s=>({...s, redeemLimit:parseInt(e.target.value||0)}))} />
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={create} style={{ background:'#10b981', color:'#fff', padding:'8px 12px', borderRadius:8 }}>Create</button>
                            <button onClick={()=>setShowCreate(false)} style={{ padding:'8px 12px', borderRadius:8 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 18 }}>
                {loading ? <div>Loading…</div> : (
                    <>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Redeemed</th>
                                <th>Expires</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map(c => (
                                <tr key={c._id}>
                                    <td>{c.code}</td>
                                    <td>{c.type}</td>
                                    <td>{c.type === 'percent' ? `${c.value}%` : `${c.value} ETB`}</td>
                                    <td>{c.redeemedCount}/{c.redeemLimit || '∞'}</td>
                                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                                    <td>{c.active ? 'Active' : 'Inactive'}</td>
                                    <td>
                                        <button onClick={()=>navigate(`/admin/coupons/${c._id}`)}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
                            <span style={{ margin: '0 8px' }}>{page}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={coupons.length < limit}>Next</button>
                        </div>
                        <div style={{ color: '#6b7280' }}>Total: {total}</div>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
