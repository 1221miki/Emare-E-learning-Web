import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService, paymentService } from '../../services/api.jsx';
import { useTheme } from '../../context/ThemeContext';

export default function Checkout() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { colors, theme } = useTheme();

    const [course, setCourse] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState('');

    // ── Coupon state ──────────────────────────────────────────────────────────
    const [couponInput, setCouponInput] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponApplied, setCouponApplied] = useState(null); // { code, discountAmount, finalAmount } | null
    const [couponError, setCouponError] = useState('');
    const applyInFlight = useRef(false); // prevent double-submit

    // Clear coupon whenever course changes
    useEffect(() => {
        setCouponInput('');
        setCouponApplied(null);
        setCouponError('');
        applyInFlight.current = false;
    }, [courseId]);

    useEffect(() => {
        courseService.getById(courseId)
            .then(res => setCourse(res.data.data))
            .catch(() => setPayError('Unable to load course details. Please refresh the page.'));
    }, [courseId]);

    // ── Coupon apply ──────────────────────────────────────────────────────────
    const handleApplyCoupon = useCallback(async () => {
        const code = couponInput.trim().toUpperCase();
        if (!code || !course) return;
        if (applyInFlight.current) return; // prevent rapid double-click

        applyInFlight.current = true;
        setCouponLoading(true);
        setCouponError('');
        setCouponApplied(null);
        setPayError('');

        try {
            const res = await paymentService.applyCoupon({ code, courseId: course._id });
            if (res.data?.success) {
                const data = res.data.data;
                setCouponApplied({
                    code,
                    discountAmount: data.discountAmount ?? 0,
                    finalAmount: data.finalAmount ?? course.price,
                    couponType: data.coupon?.type,
                    couponValue: data.coupon?.value
                });
            } else {
                setCouponError(res.data?.message || 'Invalid or expired coupon.');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Coupon validation failed. Please try again.';
            setCouponError(msg);
            setCouponApplied(null);
        } finally {
            setCouponLoading(false);
            applyInFlight.current = false;
        }
    }, [couponInput, course]);

    const handleRemoveCoupon = () => {
        setCouponInput('');
        setCouponApplied(null);
        setCouponError('');
        applyInFlight.current = false;
    };

    // Allow Enter key in the coupon input
    const handleCouponKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); }
    };

    // ── Payment initiate ──────────────────────────────────────────────────────
    const handlePayNow = async () => {
        if (!course) return;
        setPayError('');
        setPayLoading(true);
        try {
            const payload = {
                courseId: course._id,
                amount: course.price,      // backend ignores this and computes its own
                provider: 'chapa',
                ...(couponApplied ? { coupon: couponApplied.code } : {})
            };
            const res = await paymentService.initiate(payload);
            if (res.data?.success) {
                const data = res.data.data;
                if (data.free) { navigate(`/student/learn/${course._id}`); return; }
                if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
                setPayError('Unable to get a payment link from the server.');
            } else {
                setPayError(res.data?.message || 'Unable to start payment.');
            }
        } catch (err) {
            setPayError(err?.response?.data?.message || 'Payment initialization failed. Please try again.');
        } finally {
            setPayLoading(false);
        }
    };

    // ── Computed price values ─────────────────────────────────────────────────
    const originalPrice = course?.price ?? 0;
    const finalPrice = couponApplied ? couponApplied.finalAmount : originalPrice;
    const discountAmount = couponApplied ? couponApplied.discountAmount : 0;

    // ── Styles (reuse existing color tokens) ─────────────────────────────────
    const card = { background: colors.bgCard, borderRadius: '20px', padding: '28px', border: `1px solid ${colors.border}` };
    const inputStyle = {
        flex: 1,
        padding: '11px 14px',
        borderRadius: '10px',
        border: `1.5px solid ${couponError ? '#ef4444' : colors.border}`,
        background: colors.bgInput,
        color: colors.text,
        fontSize: '14px',
        outline: 'none',
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        transition: 'border-color 0.2s',
        minWidth: 0
    };

    if (!course) {
        return (
            <div style={{ minHeight: '80vh', background: colors.bg, color: colors.text, padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
                <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                    {payError && (
                        <>
                            <p style={{ color: '#ef4444', fontWeight: '600' }}>{payError}</p>
                            <button onClick={() => navigate(-1)} style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: 'pointer', fontWeight: '600' }}>Go Back</button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, padding: '32px 20px', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Checkout</h1>
                <p style={{ color: colors.textMuted, marginBottom: '24px', fontSize: '14px' }}>
                    Review your course and complete payment securely via Chapa.
                </p>

                {/* ── Top 2-col grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    {/* Checkout steps */}
                    <div style={card}>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Checkout flow</h2>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {[
                                'Verify course details and price',
                                'Apply coupon (optional)',
                                'Click Pay with Chapa',
                                'Complete payment on the Chapa page',
                                'Automatic verification & enrollment'
                            ].map((step, i) => (
                                <div key={step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '24px', minWidth: '24px', height: '24px', borderRadius: '8px', background: '#15803d', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '12px' }}>{i + 1}</div>
                                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '13px', paddingTop: '2px' }}>{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Payment info */}
                    <div style={card}>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Payment details</h2>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {[
                                ['Provider', 'Chapa'],
                                ['Currency', 'ETB'],
                                ['Verification', 'Webhook + callback'],
                                ['Return URL', '/payment/callback']
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>{k}</span>
                                    <strong style={{ fontSize: '13px' }}>{v}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                    {/* ── Course card ── */}
                    <div style={card}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
                            {course.courseTitle || course.title}
                        </h2>
                        <p style={{ color: colors.textMuted, marginBottom: '20px', fontSize: '14px', lineHeight: 1.6 }}>
                            {course.subtitle || course.descriptionText?.slice(0, 140)}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <p style={{ margin: 0, color: colors.textMuted, fontSize: '13px' }}>Course price</p>
                                <p style={{ fontSize: '26px', fontWeight: '900', margin: '6px 0 0', color: colors.text }}>
                                    {originalPrice === 0 ? 'Free' : `${originalPrice} ETB`}
                                </p>
                            </div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', background: theme === 'dark' ? 'rgba(67,56,202,0.2)' : '#f0fdf4', color: '#15803d', fontWeight: '700', fontSize: '13px' }}>
                                Chapa Checkout
                            </span>
                        </div>
                    </div>

                    {/* ── Coupon + Pay card ── */}
                    <div style={card}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>
                            Complete your payment
                        </h3>

                        {/* ── COUPON REDEMPTION SECTION ── */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: colors.text, margin: '0 0 12px' }}>
                                🏷️ Coupon Redemption
                            </h4>

                            {couponApplied ? (
                                /* ── Applied state ── */
                                <div style={{
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    background: theme === 'dark' ? 'rgba(16,185,129,0.12)' : '#f0fdf4',
                                    border: '1.5px solid #86efac',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#047857' }}>
                                                ✓ Coupon Applied: <span style={{ letterSpacing: '0.06em' }}>{couponApplied.code}</span>
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#059669' }}>
                                            {couponApplied.couponType === 'percent'
                                                ? `${couponApplied.couponValue}% discount applied`
                                                : `${couponApplied.couponValue} ETB discount applied`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleRemoveCoupon}
                                        style={{ background: 'none', border: '1px solid #86efac', color: '#047857', cursor: 'pointer', fontWeight: '700', fontSize: '12px', borderRadius: '8px', padding: '5px 12px' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                /* ── Input state ── */
                                <div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <input
                                            value={couponInput}
                                            onChange={e => {
                                                setCouponInput(e.target.value.toUpperCase());
                                                if (couponError) setCouponError('');
                                            }}
                                            onKeyDown={handleCouponKeyDown}
                                            placeholder="Enter coupon code (e.g. EMARE-ABC123)"
                                            disabled={couponLoading}
                                            maxLength={32}
                                            autoComplete="off"
                                            spellCheck={false}
                                            style={inputStyle}
                                            aria-label="Coupon code"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading || !couponInput.trim()}
                                            style={{
                                                padding: '11px 20px',
                                                borderRadius: '10px',
                                                fontWeight: '700',
                                                fontSize: '13px',
                                                border: 'none',
                                                background: couponLoading || !couponInput.trim()
                                                    ? colors.textMuted
                                                    : 'linear-gradient(135deg, #15803d, #166534)',
                                                color: '#fff',
                                                cursor: couponLoading || !couponInput.trim() ? 'not-allowed' : 'pointer',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                transition: 'opacity 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                            aria-label="Apply coupon"
                                        >
                                            {couponLoading ? (
                                                <>
                                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                                    Checking…
                                                </>
                                            ) : 'Apply Coupon'}
                                        </button>
                                    </div>
                                    {/* Coupon error */}
                                    {couponError && (
                                        <p role="alert" style={{ margin: '8px 0 0', fontSize: '13px', color: '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            ⚠ {couponError}
                                        </p>
                                    )}
                                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: colors.textMuted }}>
                                        Got a discount coupon? Enter it above. Coupons are validated for this course only.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ── Price breakdown ── */}
                        <div style={{ background: colors.bgInput, borderRadius: '12px', padding: '16px', marginBottom: '20px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: couponApplied ? '8px' : '0' }}>
                                <span style={{ color: colors.textMuted }}>Original price</span>
                                <strong>{originalPrice === 0 ? 'Free' : `${originalPrice} ETB`}</strong>
                            </div>
                            {couponApplied && discountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#059669' }}>
                                    <span>Coupon discount ({couponApplied.code})</span>
                                    <strong>− {discountAmount.toFixed(2)} ETB</strong>
                                </div>
                            )}
                            {couponApplied && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${colors.border}`, paddingTop: '10px', marginTop: '4px', fontSize: '16px', fontWeight: 'bold' }}>
                                    <span>Final price</span>
                                    <strong style={{ color: '#15803d' }}>{finalPrice <= 0 ? 'Free' : `${finalPrice.toFixed(2)} ETB`}</strong>
                                </div>
                            )}
                        </div>

                        {/* ── Global payment error ── */}
                        {payError && (
                            <div role="alert" style={{ marginBottom: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}>
                                ⚠ {payError}
                            </div>
                        )}

                        {/* ── Pay button ── */}
                        <button
                            disabled={payLoading}
                            onClick={handlePayNow}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '14px',
                                border: 'none',
                                fontSize: '15px',
                                fontWeight: '800',
                                background: payLoading ? colors.textMuted : 'linear-gradient(135deg, #15803d, #166534)',
                                color: '#fff',
                                cursor: payLoading ? 'not-allowed' : 'pointer',
                                boxShadow: payLoading ? 'none' : '0 8px 24px rgba(67,56,202,0.25)',
                                transition: 'opacity 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {payLoading ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    Opening secure checkout…
                                </>
                            ) : (
                                originalPrice === 0 ? 'Continue to Course' : `Pay ${finalPrice <= 0 ? '(Free)' : `${finalPrice.toFixed(2)} ETB`} with Chapa`
                            )}
                        </button>

                        <button
                            onClick={() => navigate(`/courses/${course._id}`)}
                            style={{
                                marginTop: '12px',
                                width: '100%',
                                padding: '13px',
                                borderRadius: '14px',
                                border: `1px solid ${colors.border}`,
                                background: 'transparent',
                                color: colors.text,
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            ← Back to Course Details
                        </button>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
