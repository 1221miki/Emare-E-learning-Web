import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService, paymentService } from '../../services/api';
import PromotionsBanner from '../../components/PromotionsBanner';
import { useTheme } from '../../context/ThemeContext';

export default function Checkout() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { colors } = useTheme();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(null);
    const [finalPricePreview, setFinalPricePreview] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);

    useEffect(() => {
        async function loadCourse() {
            try {
                const res = await courseService.getById(courseId);
                setCourse(res.data.data);
            } catch (err) {
                console.error(err);
                setError('Unable to load course details. Please refresh the page.');
            }
        }
        loadCourse();
    }, [courseId]);

    const handlePayNow = async () => {
        if (!course) return;
        setError('');
        setLoading(true);
        try {
            const res = await paymentService.initiate({ courseId: course._id, amount: course.price, provider: 'chapa', coupon: couponCode || undefined });
            if (res.data?.success) {
                const data = res.data.data;
                if (data.free) {
                    navigate(`/student/learn/${course._id}`);
                    return;
                }
                if (data.paymentUrl) {
                    window.location.href = data.paymentUrl;
                    return;
                }
                setError('Unable to get a payment link from the server.');
            } else {
                setError(res.data?.message || 'Unable to start payment.');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Payment initialization failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode || !course) return;
        setCouponLoading(true);
        setError('');
        try {
            const res = await paymentService.applyCoupon({ code: couponCode, courseId: course._id });
            if (res.data?.success) {
                setDiscount(res.data.data.discountAmount || 0);
                setFinalPricePreview(res.data.data.finalAmount);
            } else {
                setError(res.data?.message || 'Invalid coupon');
                setDiscount(null);
                setFinalPricePreview(null);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Coupon validation failed');
            setDiscount(null);
            setFinalPricePreview(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setDiscount(null);
        setFinalPricePreview(null);
        setError('');
    };

    const handleCouponClick = (code) => {
        setCouponCode(code);
    };

    if (!course) {
        return <div style={{ minHeight: '80vh', background: colors.bg, color: colors.text, padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Loading checkout...</h2>
                <p style={{ color: colors.textMuted }}>Please wait while we fetch your course details.</p>
            </div>
        </div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Promotions Banner - Minimal version for quick coupon discovery */}
                <div style={{ marginBottom: '32px' }}>
                    <PromotionsBanner minimal={true} onCouponClick={handleCouponClick} />
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>Checkout</h1>
                <p style={{ color: colors.textMuted, marginBottom: '20px' }}>Review your course, start secure payment with Chapa, and return to verify your enrollment.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginBottom: '24px' }}>
                    <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '22px', border: `1px solid ${colors.border}` }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Checkout flow</h2>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {[
                                'Verify course details and price',
                                'Click Pay with Chapa',
                                'Complete payment in the Chapa page',
                                'Return to the site via callback',
                                'Automatic verification and enrollment'
                            ].map((step, index) => (
                                <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '28px', minWidth: '28px', height: '28px', borderRadius: '12px', background: '#4338ca', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700' }}>{index + 1}</div>
                                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '22px', border: `1px solid ${colors.border}` }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Payment details</h2>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Provider</span><strong>Chapa</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Currency</span><strong>ETB</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Verification</span><strong>Webhook + callback</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Return URL</span><strong>/payment/callback</strong></div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '24px' }}>
                    <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '28px', border: `1px solid ${colors.border}` }}>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>{course.courseTitle || course.title}</h2>
                        <p style={{ color: colors.textMuted, marginBottom: '20px' }}>{course.subtitle || course.descriptionText?.slice(0, 140)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                            <div>
                                <p style={{ margin: 0, color: colors.textMuted }}>Price</p>
                                <p style={{ fontSize: '28px', fontWeight: '900', margin: '8px 0 0' }}>{course.price === 0 ? 'Free' : `${course.price} ETB`}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontWeight: '700' }}>Chapa Checkout</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '28px', border: `1px solid ${colors.border}` }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '18px' }}>Ready to pay</h3>
                        <p style={{ color: colors.textMuted, marginBottom: '24px', lineHeight: 1.7 }}>
                            Your payment will be securely processed by Chapa. Do not close this window until the checkout page appears.
                        </p>
                        {error && <div style={{ marginBottom: '18px', color: '#b91c1c', fontWeight: 600 }}>{error}</div>}
                        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                            {discount === null ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bg }} />
                                    <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={{ padding: '10px 14px', borderRadius: '10px', fontWeight: 700, border: 'none', background: '#10b981', color: '#fff', cursor: couponLoading || !couponCode ? 'not-allowed' : 'pointer', opacity: couponLoading || !couponCode ? 0.6 : 1 }}>{couponLoading ? 'Checking…' : 'Apply'}</button>
                                </div>
                            ) : (
                                <div style={{ padding: '14px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #86efac' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <strong style={{ color: '#047857', fontSize: '14px' }}>✓ Coupon Applied: {couponCode.toUpperCase()}</strong>
                                        <button onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>Remove</button>
                                    </div>
                                </div>
                            )}
                            <div style={{ fontSize: '14px', color: colors.textMuted, padding: '12px', borderRadius: '10px', background: colors.bg }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>Original Price<strong>{course.price} ETB</strong></div>
                                {discount !== null && discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#059669' }}>Discount<strong>-{discount.toFixed(2)} ETB</strong></div>}
                                {discount !== null && <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${colors.border}`, paddingTop: '8px', marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>Final Price<strong style={{ color: '#4338ca' }}>{(finalPricePreview ?? course.price).toFixed(2)} ETB</strong></div>}
                            </div>
                        </div>
                        <button
                            disabled={loading}
                            onClick={handlePayNow}
                            style={{
                                width: '100%',
                                padding: '18px',
                                borderRadius: '16px',
                                border: 'none',
                                fontSize: '16px',
                                fontWeight: '800',
                                background: loading ? '#667eea' : 'linear-gradient(135deg, #4338ca, #6d28d9)',
                                color: '#fff',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 20px 50px rgba(67,56,202,0.18)'
                            }}>
                            {loading ? 'Opening secure checkout…' : course.price === 0 ? 'Continue to Course' : 'Pay with Chapa'}
                        </button>
                        <button
                            onClick={() => navigate(`/courses/${course._id}`)}
                            style={{
                                marginTop: '14px',
                                width: '100%',
                                padding: '14px',
                                borderRadius: '16px',
                                border: `1px solid ${colors.border}`,
                                background: 'transparent',
                                color: colors.text,
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}>
                            Back to Course Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
