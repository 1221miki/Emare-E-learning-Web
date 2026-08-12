import { useEffect, useState } from 'react';
import { promotionService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

/**
 * PromotionsBanner Component
 * 
 * Shows active promotional coupons to all students
 * Can be displayed:
 * - On homepage as a banner
 * - In checkout page to inform about available discounts
 * - In a dedicated promotions modal
 * - In sidebar
 * 
 * Features:
 * - Displays all active, non-expired coupons
 * - Shows discount details (type, value, expiration)
 * - One-click copy coupon code
 * - Responsive design
 */

export default function PromotionsBanner({ minimal = false, onCouponClick = null }) {
    const { colors } = useTheme();
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        loadPromotions();
    }, []);

    async function loadPromotions() {
        try {
            const res = await promotionService.getActivePromotions();
            if (res.data.success) {
                setPromotions(res.data.data || []);
            }
        } catch (err) {
            console.error('Error loading promotions:', err);
        }
        setLoading(false);
    }

    function copyCode(code) {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    }

    if (loading) return <div style={{ textAlign: 'center', padding: '20px', color: colors.textMuted }}>Loading promotions…</div>;

    if (!promotions || promotions.length === 0) {
        return null; // Don't show banner if no active promotions
    }

    if (minimal) {
        // Minimal inline display for sidebars/small spaces
        return (
            <div style={{ 
                padding: '12px', borderRadius: '8px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff', marginBottom: '12px'
            }}>
                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>🎉 ACTIVE PROMOTIONS</div>
                {promotions.slice(0, 2).map(p => (
                    <div key={p._id} style={{ fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700' }}>{p.code}</span> - 
                        {p.type === 'percent' ? ` ${p.value}% off` : ` ${p.value} ETB off`}
                        {p.expiresAt && (
                            <div style={{ opacity: 0.8, fontSize: '10px' }}>
                                Expires: {new Date(p.expiresAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Full banner display
    return (
        <div style={{ 
            padding: '20px', 
            marginBottom: '24px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.bg})`,
            border: `2px solid #667eea`,
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '16px',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ fontSize: '24px' }}>🎉</div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>Active Promotions</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.textMuted }}>
                            {promotions.length} coupon{promotions.length !== 1 ? 's' : ''} available
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px'
            }}>
                {promotions.map(promo => (
                    <div 
                        key={promo._id}
                        style={{
                            padding: '14px',
                            borderRadius: '8px',
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#667eea' }}>
                                    {promo.code}
                                </div>
                                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
                                    Discount: <span style={{ fontWeight: '700', color: colors.text }}>
                                        {promo.type === 'percent' ? `${promo.value}% off` : `${promo.value} ETB off`}
                                    </span>
                                    {promo.maxDiscount && promo.type === 'percent' && (
                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                            (Max: {promo.maxDiscount} ETB)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {promo.metadata?.description && (
                            <div style={{
                                fontSize: '11px',
                                color: colors.textMuted,
                                marginBottom: '8px',
                                lineHeight: '1.4'
                            }}>
                                {promo.metadata.description}
                            </div>
                        )}

                        {promo.expiresAt && (
                            <div style={{
                                fontSize: '11px',
                                color: '#ef4444',
                                marginBottom: '8px',
                                fontWeight: '600'
                            }}>
                                ⏰ Expires: {new Date(promo.expiresAt).toLocaleDateString()}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                copyCode(promo.code);
                                if (onCouponClick) onCouponClick(promo.code);
                            }}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: copied === promo.code ? '#10b981' : '#667eea',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '12px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {copied === promo.code ? '✓ Copied!' : '📋 Copy Code'}
                        </button>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '6px',
                background: colors.bgCard,
                fontSize: '12px',
                color: colors.textMuted,
                textAlign: 'center'
            }}>
                💡 Use these coupon codes at checkout to get instant discounts on your courses!
            </div>
        </div>
    );
}
