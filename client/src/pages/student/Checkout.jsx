import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService, paymentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function Checkout() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { colors, theme } = useTheme();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            const res = await paymentService.initiate({ courseId: course._id, amount: course.price, provider: 'chapa' });
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
