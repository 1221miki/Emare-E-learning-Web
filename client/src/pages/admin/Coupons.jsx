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
    const [stats, setStats] = useState(null);
    const [form, setForm] = useState({ 
        code: '', 
        type: 'percent', 
        value: 0, 
        maxDiscount: 0, 
        redeemLimit: 0, 
        usageLimitPerUser: 1,
        startsAt: '',
        expiresAt: '',
        active: true,
        metadata: { description: '' }
    });
    const [error, setError] = useState('');
    const [showShare, setShowShare] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');

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
                setStats(res.data.data);
            }
        } catch (err) { console.error(err); }
    }

    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setForm(s => ({ ...s, code }));
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess('Copied to clipboard!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    }

    function getShareTemplates(coupon) {
        const baseUrl = window.location.origin;
        const discountText = coupon.type === 'percent' 
            ? `${coupon.value}% off` 
            : `${coupon.value} ETB off`;
        
        return {
            email: `Subject: Use Coupon Code ${coupon.code} - ${discountText}

Hi Students,

We're offering an exclusive discount! Use coupon code:

${coupon.code}

to get ${discountText} on our courses.

${coupon.metadata?.description ? `Details: ${coupon.metadata.description}` : ''}
${coupon.expiresAt ? `Valid until: ${new Date(coupon.expiresAt).toLocaleDateString()}` : ''}

Start learning now!`,

            sms: `🎉 ${discountText} on courses! Use code: ${coupon.code} ${coupon.expiresAt ? `(Expires ${new Date(coupon.expiresAt).toLocaleDateString()})` : ''}`,

            announcement: `📢 **SPECIAL OFFER** 📢

Get ${discountText} on our courses!

🎓 **Coupon Code:** ${coupon.code}

${coupon.metadata?.description ? `${coupon.metadata.description}\n\n` : ''}${coupon.expiresAt ? `⏰ Valid until: ${new Date(coupon.expiresAt).toLocaleDateString()}` : ''}

👉 Apply coupon at checkout`,

            whatsapp: `🎉 SPECIAL DISCOUNT! 🎉

${discountText} on all our courses!

📌 Use this coupon code: *${coupon.code}*

${coupon.metadata?.description || ''}
${coupon.expiresAt ? `Valid until: ${new Date(coupon.expiresAt).toLocaleDateString()}` : ''}

Start learning now! 🚀`
        };
    }

    async function create() {
        setError('');
        
        // Validation
        if (!form.code) { setError('Coupon code is required'); return; }
        if (form.value <= 0) { setError('Discount value must be greater than 0'); return; }
        if (form.type === 'percent' && form.value > 100) { setError('Percentage cannot exceed 100%'); return; }
        if (form.redeemLimit < 0) { setError('Redeem limit cannot be negative'); return; }
        if (form.usageLimitPerUser < 0) { setError('Per-user limit cannot be negative'); return; }
        
        try {
            const res = await adminCouponService.create(form);
            if (res.data.success) { 
                setShowCreate(false); 
                setForm({ 
                    code: '', 
                    type: 'percent', 
                    value: 0, 
                    maxDiscount: 0, 
                    redeemLimit: 0, 
                    usageLimitPerUser: 1,
                    startsAt: '',
                    expiresAt: '',
                    active: true,
                    metadata: { description: '' }
                });
                load();
                loadStats();
            }
        } catch (err) { 
            setError(err.response?.data?.message || 'Failed to create coupon');
            console.error(err); 
        }
    }

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Coupon Management</h1>
                <div>
                    <button onClick={() => navigate('/admin/dashboard')} style={{ marginRight: 12, padding: '10px 16px', borderRadius: 8, background: colors.bgCard, border: `1px solid ${colors.border}` }}>← Back to Admin</button>
                    <button onClick={() => setShowCreate(true)} style={{ background: '#4338ca', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>+ Create Coupon</button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ background: colors.bgCard, padding: 16, borderRadius: 12, border: `1px solid ${colors.border}` }}>
                    <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Total Coupons</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.total || 0}</div>
                </div>
                <div style={{ background: colors.bgCard, padding: 16, borderRadius: 12, border: `1px solid ${colors.border}` }}>
                    <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Active</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{stats.active || 0}</div>
                </div>
                <div style={{ background: colors.bgCard, padding: 16, borderRadius: 12, border: `1px solid ${colors.border}` }}>
                    <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Expired</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>{stats.expired || 0}</div>
                </div>
            </div>}

            {showCreate && (
                <div style={{ marginBottom: 24, padding: 20, border: `1px solid ${colors.border}`, borderRadius: 12, background: colors.bgCard }}>
                    <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 800 }}>Create New Coupon</h3>
                    {error && <div style={{ padding: 12, borderRadius: 8, background: '#fee2e2', color: '#991b1b', marginBottom: 16, fontWeight: 600 }}>{error}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Coupon Code</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input 
                                    placeholder="E.g., EMARE10" 
                                    value={form.code} 
                                    onChange={(e) => setForm(s => ({ ...s, code: e.target.value.toUpperCase() }))} 
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, fontWeight: 600 }} 
                                />
                                <button 
                                    onClick={generateCode} 
                                    style={{ padding: '10px 14px', borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, cursor: 'pointer', fontWeight: 600 }}
                                >Generate</button>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Discount Type</label>
                            <select 
                                value={form.type} 
                                onChange={(e) => setForm(s => ({ ...s, type: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                            >
                                <option value="percent">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (ETB)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Discount Value</label>
                            <input 
                                placeholder={form.type === 'percent' ? 'E.g., 10' : 'E.g., 200'} 
                                type="number" 
                                value={form.value} 
                                onChange={(e) => setForm(s => ({ ...s, value: parseFloat(e.target.value) || 0 }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                            />
                        </div>
                        {form.type === 'percent' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Max Discount (ETB) - Optional</label>
                                <input 
                                    placeholder="Leave blank for unlimited" 
                                    type="number" 
                                    value={form.maxDiscount} 
                                    onChange={(e) => setForm(s => ({ ...s, maxDiscount: parseFloat(e.target.value) || 0 }))}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                                />
                            </div>
                        )}
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Start Date - Optional</label>
                            <input 
                                type="datetime-local" 
                                value={form.startsAt} 
                                onChange={(e) => setForm(s => ({ ...s, startsAt: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Expiration Date - Optional</label>
                            <input 
                                type="datetime-local" 
                                value={form.expiresAt} 
                                onChange={(e) => setForm(s => ({ ...s, expiresAt: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Global Limit - Optional</label>
                            <input 
                                placeholder="0 = Unlimited" 
                                type="number" 
                                value={form.redeemLimit} 
                                onChange={(e) => setForm(s => ({ ...s, redeemLimit: parseInt(e.target.value || 0) }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Per-User Limit</label>
                            <input 
                                placeholder="E.g., 1" 
                                type="number" 
                                value={form.usageLimitPerUser} 
                                onChange={(e) => setForm(s => ({ ...s, usageLimitPerUser: parseInt(e.target.value || 0) }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Description - Optional</label>
                        <input 
                            placeholder="E.g., 10% discount for web development courses" 
                            value={form.metadata?.description || ''} 
                            onChange={(e) => setForm(s => ({ ...s, metadata: { ...s.metadata, description: e.target.value } }))}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                            onClick={create} 
                            style={{ background: '#10b981', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                        >Create Coupon</button>
                        <button 
                            onClick={() => setShowCreate(false)} 
                            style={{ padding: '10px 16px', borderRadius: 8, background: colors.bgCard, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
                        >Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 24 }}>
                {loading ? <div>Loading…</div> : (
                    <>
                    <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${colors.border}` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
                                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 700 }}>Code</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 700 }}>Discount</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 700 }}>Usage</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 700 }}>Expires</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 700 }}>Status</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 700 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map((c, idx) => (
                                    <tr key={c._id} style={{ borderBottom: `1px solid ${colors.border}`, background: idx % 2 === 0 ? colors.bg : colors.bgCard }}>
                                        <td style={{ padding: 12, fontWeight: 700 }}>{c.code}</td>
                                        <td style={{ padding: 12 }}>{c.type === 'percent' ? `${c.value}%` : `${c.value} ETB`}{c.maxDiscount > 0 ? ` (max: ${c.maxDiscount})` : ''}</td>
                                        <td style={{ padding: 12, fontSize: 13 }}>{c.redeemedCount}/{c.redeemLimit || '∞'}</td>
                                        <td style={{ padding: 12, fontSize: 13 }}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                                        <td style={{ padding: 12 }}><span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: 12, fontWeight: 700, background: c.active ? '#d1fae5' : '#fee2e2', color: c.active ? '#047857' : '#991b1b' }}>{c.active ? 'Active' : 'Inactive'}</span></td>
                                        <td style={{ padding: 12 }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button 
                                                    onClick={() => copyToClipboard(c.code)}
                                                    title="Copy coupon code"
                                                    style={{ padding: '6px 10px', borderRadius: 6, background: '#dbeafe', border: '1px solid #93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1e40af' }}
                                                >📋 Copy</button>
                                                <button 
                                                    onClick={() => setShowShare(c)}
                                                    title="Share coupon with students"
                                                    style={{ padding: '6px 10px', borderRadius: 6, background: '#dcfce7', border: '1px solid #86efac', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#15803d' }}
                                                >📤 Share</button>
                                                <button 
                                                    onClick={() => navigate(`/admin/coupons/${c._id}`)}
                                                    style={{ padding: '6px 10px', borderRadius: 6, background: colors.bgCard, border: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                                >View</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))} 
                                disabled={page <= 1}
                                style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: page <= 1 ? colors.bgCard : colors.bg, cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                            >← Previous</button>
                            <span style={{ padding: '8px 12px', background: colors.bgCard, borderRadius: 6, fontWeight: 700 }}>Page {page}</span>
                            <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={coupons.length < limit}
                                style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: coupons.length < limit ? colors.bgCard : colors.bg, cursor: coupons.length < limit ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                            >Next →</button>
                        </div>
                        <div style={{ color: colors.textMuted, fontWeight: 600 }}>Total: {total} coupons</div>
                    </div>
                    </>
                )}
            </div>

            {/* Share Modal */}
            {showShare && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', zIndex: 1000 
                }}>
                    <div style={{ 
                        background: colors.bg, borderRadius: 12, padding: 24, 
                        maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                                📤 Share Coupon: {showShare.code}
                            </h2>
                            <button 
                                onClick={() => setShowShare(null)}
                                style={{ 
                                    fontSize: 20, border: 'none', background: 'none', 
                                    cursor: 'pointer', color: colors.textMuted 
                                }}
                            >✕</button>
                        </div>

                        {copySuccess && (
                            <div style={{ 
                                padding: 12, borderRadius: 8, background: '#d1fae5', 
                                color: '#047857', marginBottom: 16, fontWeight: 600, textAlign: 'center' 
                            }}>
                                ✓ {copySuccess}
                            </div>
                        )}

                        {getShareTemplates(showShare) && Object.entries(getShareTemplates(showShare)).map(([type, text]) => (
                            <div key={type} style={{ marginBottom: 20 }}>
                                <div style={{ 
                                    display: 'flex', justifyContent: 'space-between', 
                                    alignItems: 'center', marginBottom: 8 
                                }}>
                                    <h3 style={{ 
                                        margin: 0, fontSize: 14, fontWeight: 800, 
                                        textTransform: 'capitalize', color: colors.textMuted 
                                    }}>
                                        {type === 'email' && '📧'} 
                                        {type === 'sms' && '📱'} 
                                        {type === 'announcement' && '📢'} 
                                        {type === 'whatsapp' && '💬'} 
                                        {' '}{type} Template
                                    </h3>
                                </div>
                                <div style={{ 
                                    background: colors.bgCard, padding: 12, borderRadius: 8, 
                                    border: `1px solid ${colors.border}`, marginBottom: 8,
                                    fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word', color: colors.text
                                }}>
                                    {text}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(text)}
                                    style={{ 
                                        width: '100%', padding: '8px 12px', borderRadius: 6, 
                                        background: '#3b82f6', color: '#fff', border: 'none',
                                        cursor: 'pointer', fontWeight: 600, fontSize: 12
                                    }}
                                >
                                    Copy {type === 'email' ? 'Email' : type === 'sms' ? 'SMS' : type === 'announcement' ? 'Announcement' : 'WhatsApp'} Template
                                </button>
                            </div>
                        ))}

                        <div style={{ 
                            padding: 12, borderRadius: 8, background: colors.bgCard, 
                            border: `1px solid ${colors.border}`, marginTop: 16,
                            color: colors.textMuted, fontSize: 12
                        }}>
                            <strong>💡 Tip:</strong> Copy the template above and use it in your email, SMS, announcement, or communication channel to inform students about this coupon.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
