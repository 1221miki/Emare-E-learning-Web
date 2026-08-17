import React, { useState, useEffect, useMemo } from 'react';
import { paymentService } from '../../../services/api';
import { History, BookOpen, CreditCard, Receipt, Undo2, DollarSign, CheckCircle2, Clock, Building2, Smartphone, AlertCircle, FileText } from 'lucide-react';

const WARN = '#f59e0b';
const DANGER = '#ef4444';

const PROVIDER_LABELS = { cbe: 'CBE Bank', telebirr: 'Telebirr', chapa: 'Chapa', dashen: 'Dashen Bank', other: 'Other / Manual' };
const PROVIDER_ICONS = { cbe: <Building2 size={16} aria-hidden="true" />, telebirr: <Smartphone size={16} aria-hidden="true" />, chapa: <CreditCard size={16} aria-hidden="true" />, dashen: <Building2 size={16} aria-hidden="true" />, other: <DollarSign size={16} aria-hidden="true" /> };

const STATUS_META = {
    Completed: { color: '#10b981', label: 'Completed' },
    Pending: { color: WARN, label: 'Pending' },
    Failed: { color: DANGER, label: 'Failed' },
    Cancelled: { color: DANGER, label: 'Cancelled' },
    Refunded: { color: '#8b5cf6', label: 'Refunded' }
};

const METHODS_KEY = 'emare_payment_methods';
const REFUNDS_KEY = 'emare_refund_requests';

function readLocal(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function invoiceHtml(inv) {
    const course = inv?.course || {};
    const student = inv?.student || {};
    const when = inv?.date ? new Date(inv.date).toLocaleString() : '';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${inv?.invoiceNumber || ''}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;max-width:640px;margin:40px auto;padding:0 20px}
h1{color:#2563eb}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}
.big{font-size:20px;font-weight:700;margin-top:16px}.muted{color:#64748b;font-size:12px}</style></head><body>
<h1>EMARE ICT HUB — RECEIPT / INVOICE</h1>
<div class="muted">This is a computer generated receipt. Please keep it for your records.</div>
<div style="margin-top:20px">
<div class="row"><span>Invoice Number</span><span>${inv?.invoiceNumber || '—'}</span></div>
<div class="row"><span>Date</span><span>${when}</span></div>
<div class="row"><span>Course</span><span>${course?.courseTitle || course?.title || '—'}</span></div>
<div class="row"><span>Student</span><span>${student?.fullName || '—'}</span></div>
<div class="row"><span>Status</span><span>Paid</span></div>
<div class="big row"><span>Total</span><span>${(inv?.amount ?? 0).toLocaleString()} ${inv?.currency || 'ETB'}</span></div>
</div></body></html>`;
}

export default function PaymentsTab(dash) {
    const { user, colors, styles, enrollments, paymentStatusList, allCourses, navigate } = dash;
    const uid = String(user?._id || user?.id || '');

    const [section, setSection] = useState('history');
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(true);

    const [methods, setMethods] = useState(() => readLocal(METHODS_KEY, []));
    const [methodProvider, setMethodProvider] = useState('cbe');
    const [methodIdentifier, setMethodIdentifier] = useState('');
    const [methodMsg, setMethodMsg] = useState('');

    const [activeInvoice, setActiveInvoice] = useState(null);
    const [invoiceData, setInvoiceData] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const [refundTxId, setRefundTxId] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundMsg, setRefundMsg] = useState('');
    const [refundErr, setRefundErr] = useState('');
    const [localRefunds, setLocalRefunds] = useState(() => readLocal(REFUNDS_KEY, []));
    const enrollmentList = useMemo(() => (Array.isArray(enrollments) ? enrollments : []), [enrollments]);
    const statusList = useMemo(() => (Array.isArray(paymentStatusList) ? paymentStatusList : []), [paymentStatusList]);

    const courseMap = useMemo(() => {
        const map = {};
        (allCourses || []).forEach(c => { map[c._id] = c; });
        return map;
    }, [allCourses]);

    const courseTitle = (ref) => {
        const id = ref?._id || ref;
        return courseMap[id]?.courseTitle || ref?.courseTitle || ref?.title || 'Course';
    };

    useEffect(() => {
        paymentService.history()
            .then(res => setTransactions(res.data.data || []))
            .catch(() => setTransactions([]))
            .finally(() => setTxLoading(false));
    }, []);

    const totalPaid = transactions
        .filter(t => t.status === 'Completed')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingCount = enrollmentList.filter(e => !e.tuitionClearanceFlag).length;
    const clearedCount = enrollmentList.filter(e => e.tuitionClearanceFlag).length;

    const saveMethod = () => {
        if (!methodIdentifier.trim()) return;
        const next = [...methods, { id: Date.now(), provider: methodProvider, identifier: methodIdentifier.trim() }];
        setMethods(next);
        writeLocal(METHODS_KEY, next);
        setMethodIdentifier('');
        setMethodMsg('Payment method saved.');
        setTimeout(() => setMethodMsg(''), 2500);
    };

    const removeMethod = (id) => {
        const next = methods.filter(m => m.id !== id);
        setMethods(next);
        writeLocal(METHODS_KEY, next);
    };

    const openInvoice = async (tx) => {
        setActiveInvoice(tx._id);
        setInvoiceData(null);
        setInvoiceLoading(true);
        try {
            const res = await paymentService.invoice(tx._id);
            setInvoiceData(res.data.data || null);
        } catch {
            setInvoiceData(null);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const downloadInvoice = () => {
        if (!invoiceData) return;
        const blob = new Blob([invoiceHtml(invoiceData)], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceData.invoiceNumber || 'invoice'}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const submitRefund = async () => {
        if (!refundTxId || !refundReason.trim()) { setRefundErr('Select a completed transaction and write a reason.'); return; }
        setRefundErr('');
        try {
            const res = await paymentService.requestRefund({ transactionId: refundTxId, reason: refundReason.trim() });
            const rr = res.data?.data || {};
            const next = [...localRefunds, { _id: rr._id || Date.now(), transactionId: refundTxId, reason: refundReason.trim(), createdAt: new Date().toISOString() }];
            setLocalRefunds(next);
            writeLocal(REFUNDS_KEY, next);
            setTransactions(prev => prev.map(t => t._id === refundTxId ? { ...t, status: 'Refunded' } : t));
            setRefundTxId('');
            setRefundReason('');
            setRefundMsg('Refund request submitted. Our finance team will review it within 2–3 business days.');
        } catch {
            setRefundErr('Refund request failed. Please try again.');
        }
    };

    const eligibleForRefund = transactions.filter(t => t.status === 'Completed');
    const refundHistory = transactions.filter(t => t.status === 'Refunded');
    const combinedRefunds = [...refundHistory, ...localRefunds.filter(l => !refundHistory.some(t => String(t._id) === String(l.transactionId)))];

    const statusBadge = (status) => {
        const meta = STATUS_META[status] || { color: colors.textMuted, label: status };
        return (
            <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', background: `${meta.color}15`, color: meta.color }}>
                {meta.label.toUpperCase()}
            </span>
        );
    };

    const sections = [
        { key: 'history', label: 'Payment History', icon: <History size={15} aria-hidden="true" /> },
        { key: 'enrollments', label: 'My Enrollments', icon: <BookOpen size={15} aria-hidden="true" /> },
        { key: 'methods', label: 'Payment Methods', icon: <CreditCard size={15} aria-hidden="true" /> },
        { key: 'invoices', label: 'Invoices & Receipts', icon: <Receipt size={15} aria-hidden="true" /> },
        { key: 'refunds', label: 'Refund Requests', icon: <Undo2 size={15} aria-hidden="true" /> }
    ];

    const renderHistory = () => (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.success}`, padding: '16px' }}>
                    <DollarSign size={20} color={colors.success} aria-hidden="true" />
                    <span style={{ ...styles.statValue, color: colors.success, fontSize: '22px', marginTop: '6px' }}>{totalPaid.toLocaleString()} ETB</span>
                    <span style={styles.statLabel}>Total Paid</span>
                </div>
                <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.primary}`, padding: '16px' }}>
                    <CheckCircle2 size={20} color={colors.primary} aria-hidden="true" />
                    <span style={{ ...styles.statValue, color: colors.primary, fontSize: '22px', marginTop: '6px' }}>{clearedCount}</span>
                    <span style={styles.statLabel}>Cleared Courses</span>
                </div>
                <div style={{ ...styles.statCard, borderTop: `3px solid ${WARN}`, padding: '16px' }}>
                    <Clock size={20} color={WARN} aria-hidden="true" />
                    <span style={{ ...styles.statValue, color: WARN, fontSize: '22px', marginTop: '6px' }}>{pendingCount}</span>
                    <span style={styles.statLabel}>Pending Settlement</span>
                </div>
            </div>

            <div style={styles.tableCard}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: '700' }}>Transaction History</h3>
                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{transactions.length} payment record(s)</span>
                </div>
                {txLoading ? (
                    <div style={{ padding: '32px', color: colors.textMuted, fontSize: '13px' }}>Loading payment history...</div>
                ) : transactions.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <CreditCard size={40} color={colors.textMuted} style={{ marginBottom: '12px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>No payment transactions yet. Enroll in a course and complete a payment to see it here.</p>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Course</th>
                                <th style={styles.th}>Provider</th>
                                <th style={styles.th}>Reference</th>
                                <th style={styles.th}>Amount</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t._id} style={styles.tr}>
                                    <td style={styles.td}>{new Date(t.createdAt || Date.now()).toLocaleDateString()}</td>
                                    <td style={styles.td}>{courseTitle(t.courseRef)}</td>
                                    <td style={styles.td}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{PROVIDER_ICONS[t.provider] || <CreditCard size={16} aria-hidden="true" />} {PROVIDER_LABELS[t.provider] || (t.provider || '—')}</span></td>
                                    <td style={{ ...styles.td, fontSize: '12px' }}>{t.metadata?.tx_ref || t.providerTransactionId || '—'}</td>
                                    <td style={{ ...styles.td, fontWeight: '700' }}>{(t.amount || 0).toLocaleString()} {t.currency || 'ETB'}</td>
                                    <td style={styles.td}>{statusBadge(t.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderEnrollments = () => {
        const rows = statusList.length ? statusList : enrollmentList;
        return (
            <div style={styles.panelCard}>
                <h3 style={{ ...styles.panelCardTitle, fontSize: '16px' }}>My Enrollment Payment Status</h3>
                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '-12px 0 20px', lineHeight: 1.6 }}>
                    Access to lesson streaming unlocks after your tuition is cleared. Upload your CBE/Telebirr transfer receipt in the settlement portal to get verified.
                </p>
                {rows.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <BookOpen size={40} color={colors.textMuted} style={{ marginBottom: '12px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>You are not enrolled in any courses yet. Browse the catalog and enroll to get started.</p>
                        <button onClick={() => navigate('/courses')} style={styles.resumeBtn}>Browse Courses</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {rows.map(e => {
                            const cleared = e.tuitionClearanceFlag;
                            const pendingVerification = e.paymentStatus === 'Pending Verification';
                            return (
                                <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <strong style={{ color: colors.text, fontSize: '15px' }}>{courseTitle(e.courseRef)}</strong>
                                        <p style={{ color: colors.textMuted, fontSize: '12px', margin: '4px 0 0' }}>
                                            Enrolled: {new Date(e.enrollmentTimestamp || e.enrolledAt || e.createdAt || Date.now()).toLocaleDateString()}
                                            {e.paymentAmount > 0 && <span> · {(e.paymentAmount).toLocaleString()} ETB</span>}
                                            {e.paymentMethod && <span> · {PROVIDER_LABELS[e.paymentMethod] || e.paymentMethod}</span>}
                                        </p>
                                        {e.paymentReference && <p style={{ color: colors.textMuted, fontSize: '11px', margin: '4px 0 0' }}>Ref: {e.paymentReference}</p>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        {cleared ? (
                                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', background: `${colors.success}15`, color: colors.success }}>CLEARED</span>
                                        ) : pendingVerification ? (
                                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', background: `${WARN}15`, color: WARN }}>PENDING VERIFICATION</span>
                                        ) : (
                                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', background: `${DANGER}15`, color: DANGER }}>UNPAID</span>
                                        )}
                                        {!cleared && (
                                            <button onClick={() => navigate('/student/payments')} style={{ ...styles.resumeBtn, fontSize: '12px', padding: '8px 14px' }}>Settle Now</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderMethods = () => (
        <div>
            <div style={styles.panelCard}>
                <h3 style={{ ...styles.panelCardTitle, fontSize: '16px' }}>Saved Payment Methods</h3>
                {methodMsg && <div style={{ ...styles.successAlert }}>{methodMsg}</div>}
                {methods.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <CreditCard size={40} color={colors.textMuted} style={{ marginBottom: '12px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>No saved payment methods yet. Save a bank account or mobile money wallet for faster checkout.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                        {methods.map(m => (
                            <div key={m.id} style={{ padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center' }}>{PROVIDER_ICONS[m.provider] || <CreditCard size={20} aria-hidden="true" />}</span>
                                    <button onClick={() => removeMethod(m.id)} style={{ background: 'transparent', border: `1px solid ${DANGER}40`, color: DANGER, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Remove</button>
                                </div>
                                <div style={{ color: colors.text, fontSize: '14px', fontWeight: '700' }}>{PROVIDER_LABELS[m.provider] || m.provider}</div>
                                <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>{m.identifier}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={styles.panelCard}>
                <h3 style={{ ...styles.panelCardTitle, fontSize: '16px' }}>Add a Payment Method</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Provider</label>
                        <select value={methodProvider} onChange={e => setMethodProvider(e.target.value)} style={styles.select}>
                            {Object.entries(PROVIDER_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Account / Phone Number</label>
                        <input value={methodIdentifier} onChange={e => setMethodIdentifier(e.target.value)} placeholder={methodProvider === 'cbe' || methodProvider === 'dashen' ? 'Account number' : '+251 9x xxx xxxx'} style={styles.input} />
                    </div>
                </div>
                <button onClick={saveMethod} style={{ ...styles.resumeBtn, marginTop: '20px' }}>＋ Save Payment Method</button>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '12px 0 0', lineHeight: 1.5 }}>
                    Your details are stored locally on this device and are never shared. Actual charges happen through the secure Chapa checkout.
                </p>
            </div>
        </div>
    );

    const renderInvoices = () => (
        <div style={styles.tableCard}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
                <h3 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: '700' }}>Invoices & Receipts</h3>
            </div>
            {txLoading ? (
                <div style={{ padding: '32px', color: colors.textMuted, fontSize: '13px' }}>Loading invoices...</div>
            ) : transactions.length === 0 ? (
                <div style={styles.emptyContent}>
                    <FileText size={40} color={colors.textMuted} style={{ marginBottom: '12px' }} aria-hidden="true" />
                    <p style={styles.emptyText}>No invoices yet. Completed payments generate a downloadable receipt automatically.</p>
                </div>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.thRow}>
                            <th style={styles.th}>Invoice</th>
                            <th style={styles.th}>Course</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t, i) => {
                            const invNumber = t.metadata?.tx_ref || `INV-${String(t._id).slice(-8).toUpperCase()}`;
                            return (
                                <tr key={t._id} style={styles.tr}>
                                    <td style={{ ...styles.td, fontWeight: '700', fontSize: '13px' }}>{invNumber}</td>
                                    <td style={styles.td}>{courseTitle(t.courseRef)}</td>
                                    <td style={styles.td}>{new Date(t.createdAt || Date.now()).toLocaleDateString()}</td>
                                    <td style={{ ...styles.td, fontWeight: '700' }}>{(t.amount || 0).toLocaleString()} {t.currency || 'ETB'}</td>
                                    <td style={styles.td}>
                                        <button onClick={() => openInvoice(t)} style={{ background: 'transparent', border: `1px solid ${colors.primary}`, color: colors.primary, borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                            View / Download
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {activeInvoice && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setActiveInvoice(null)}>
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: colors.text, fontSize: '17px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Receipt size={18} aria-hidden="true" /> Invoice Details
                            </h3>
                            <button onClick={() => setActiveInvoice(null)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>Close</button>
                        </div>
                        {invoiceLoading ? (
                            <div style={{ padding: '40px 0', color: colors.textMuted, fontSize: '13px', textAlign: 'center' }}>Loading invoice...</div>
                        ) : invoiceData ? (
                            <div>
                                <div style={{ background: colors.bgInput, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: colors.textMuted, fontSize: '13px' }}>Invoice Number</span><span style={{ color: colors.text, fontWeight: '700' }}>{invoiceData.invoiceNumber}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: colors.textMuted, fontSize: '13px' }}>Date</span><span style={{ color: colors.text, fontWeight: '700' }}>{invoiceData.date ? new Date(invoiceData.date).toLocaleString() : '—'}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: colors.textMuted, fontSize: '13px' }}>Course</span><span style={{ color: colors.text, fontWeight: '700' }}>{courseTitle(invoiceData.course)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: colors.textMuted, fontSize: '13px' }}>Student</span><span style={{ color: colors.text, fontWeight: '700' }}>{invoiceData.student?.fullName || user?.fullName || '—'}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}><span style={{ color: colors.textMuted, fontSize: '13px' }}>Total Paid</span><span style={{ color: colors.success, fontWeight: '800', fontSize: '16px' }}>{(invoiceData.amount || 0).toLocaleString()} {invoiceData.currency || 'ETB'}</span></div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button onClick={downloadInvoice} style={{ ...styles.resumeBtn, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} aria-label="Download Receipt">
                                        <FileText size={15} aria-hidden="true" /> Download Receipt
                                    </button>
                                    <button onClick={() => window.print()} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '10px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} aria-label="Print or Save as PDF">
                                        <Receipt size={15} aria-hidden="true" /> Print / Save as PDF
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '40px 0', color: DANGER, fontSize: '13px', textAlign: 'center' }}>Could not load this invoice. Try again later.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderRefunds = () => (
        <div>
            <div style={styles.panelCard}>
                <h3 style={{ ...styles.panelCardTitle, fontSize: '16px' }}>Request a Refund</h3>
                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '-12px 0 20px', lineHeight: 1.6 }}>
                    Refunds are reviewed by the finance team within 2–3 business days for completed transactions on courses you no longer want.
                </p>
                {refundMsg && <div style={{ ...styles.successAlert }}>{refundMsg}</div>}
                {refundErr && <div style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER, padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>{refundErr}</div>}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Transaction</label>
                    <select value={refundTxId} onChange={e => setRefundTxId(e.target.value)} style={styles.select}>
                        <option value="">Select a completed transaction</option>
                        {eligibleForRefund.map(t => (
                            <option key={t._id} value={t._id}>{courseTitle(t.courseRef)} · {(t.amount || 0).toLocaleString()} {t.currency || 'ETB'} · {new Date(t.createdAt || Date.now()).toLocaleDateString()}</option>
                        ))}
                    </select>
                </div>
                <div style={{ ...styles.formGroup, marginTop: '16px' }}>
                    <label style={styles.label}>Reason for Refund</label>
                    <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows="3" placeholder="Briefly explain why you want a refund..." style={{ ...styles.input, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <button onClick={submitRefund} disabled={!refundTxId || !refundReason.trim()} style={{ ...styles.resumeBtn, marginTop: '20px', opacity: (!refundTxId || !refundReason.trim()) ? 0.5 : 1 }}>Submit Refund Request</button>
            </div>

            <div style={styles.panelCard}>
                <h3 style={{ ...styles.panelCardTitle, fontSize: '16px' }}>Refund History</h3>
                {combinedRefunds.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <Undo2 size={40} color={colors.textMuted} style={{ marginBottom: '12px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>No refunds yet. Refunded transactions will appear here with their status.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {combinedRefunds.map((r, i) => (
                            <div key={r._id || i} style={{ padding: '14px 16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style={{ color: colors.text, fontSize: '13px', fontWeight: '700' }}>{courseTitle(transactions.find(t => String(t._id) === String(r.transactionId))?.courseRef)}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#8b5cf6', padding: '4px 10px', borderRadius: '6px', background: '#8b5cf615' }}>UNDER REVIEW</span>
                                </div>
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '6px 0 0' }}>{r.reason}</p>
                                <p style={{ color: colors.textMuted, fontSize: '11px', margin: '6px 0 0' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={20} aria-hidden="true" /> Tuition &amp; Payments
                </h2>
                <p style={styles.tabSubtitle}>Track your transactions, manage payment methods, download receipts, and request refunds</p>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '24px', gap: '4px', flexWrap: 'wrap' }}>
                {sections.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: section === s.key ? `3px solid ${colors.primary}` : '3px solid transparent',
                            color: section === s.key ? colors.primary : colors.textMuted,
                            padding: '12px 16px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {s.icon}{s.label}
                    </button>
                ))}
            </div>

            {section === 'history' && renderHistory()}
            {section === 'enrollments' && renderEnrollments()}
            {section === 'methods' && renderMethods()}
            {section === 'invoices' && renderInvoices()}
            {section === 'refunds' && renderRefunds()}
        </div>
    );
}
