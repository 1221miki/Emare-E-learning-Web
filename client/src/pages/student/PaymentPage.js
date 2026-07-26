import React, { useState, useEffect, useMemo } from 'react';
import API, { enrollmentService, notificationService } from '../../services/api';
import QRCode from 'react-qr-code';
import Sidebar from '../../components/Sidebar';

const paymentMethods = [
    {
        id: 'cbe',
        label: 'CBE Bank',
        subtitle: 'Bank Transfer',
        icon: '🏦',
        accountName: 'Emare ICT Hub',
        accountNumber: '10001234567',
        branch: 'Addis Ababa',
        reference: 'ELMS-2026-1023',
        instructions: 'Transfer the fee using the CBE account above and upload your receipt.'
    },
    {
        id: 'telebirr',
        label: 'Telebirr',
        subtitle: 'Mobile Payment',
        icon: '📱',
        accountName: 'Emare ICT Hub',
        accountNumber: '0912 345 678',
        branch: 'Telebirr Wallet',
        reference: 'ELMS-2026-1023',
        instructions: 'Send the amount via Telebirr and save the payment screenshot as receipt.'
    },
    {
        id: 'chapa',
        label: 'Chapa',
        subtitle: 'Online Gateway',
        icon: '💳',
        accountName: 'Emare ELMS',
        accountNumber: 'chapa@emare',
        branch: 'Online Payments',
        reference: 'ELMS-2026-1023',
        instructions: 'Use Chapa for fast online payment and upload your confirmation page.'
    },
    {
        id: 'dashen',
        label: 'Dashen Bank',
        subtitle: 'Bank Transfer',
        icon: '🏦',
        accountName: 'Emare ICT Hub',
        accountNumber: '2000456789',
        branch: 'Addis Ababa',
        reference: 'ELMS-2026-1023',
        instructions: 'Transfer through Dashen Bank and upload your transfer receipt.'
    }
];

export default function PaymentPage() {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadingProgress, setUploadingProgress] = useState(0);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
    const [file, setFile] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState('cbe');
    const [paymentReference, setPaymentReference] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [copyMessage, setCopyMessage] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = () => {
        setLoading(true);
        enrollmentService.getMyStatus()
            .then(res => setEnrollments(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const selectedEnrollment = useMemo(
        () => enrollments.find(e => e._id === selectedEnrollmentId) || enrollments[0] || null,
        [enrollments, selectedEnrollmentId]
    );

    useEffect(() => {
        if (!selectedEnrollmentId && enrollments.length > 0) {
            setSelectedEnrollmentId(enrollments[0]._id);
        }
    }, [enrollments, selectedEnrollmentId]);

    useEffect(() => {
        if (selectedEnrollment?.paymentMethod) {
            setSelectedMethod(selectedEnrollment.paymentMethod);
        }
        if (selectedEnrollment?.paymentReference) {
            setPaymentReference(selectedEnrollment.paymentReference);
        } else {
            setPaymentReference('');
        }
    }, [selectedEnrollment]);

    useEffect(() => {
        // fetch recent notifications for student
        let mounted = true;
        notificationService.getAll()
            .then(res => {
                if (mounted) setNotifications(res.data.data || []);
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

    const selectedCourse = selectedEnrollment?.courseRef || null;
    const paymentMethod = paymentMethods.find(method => method.id === selectedMethod) || paymentMethods[0];
    const coursePrice = selectedCourse?.price || 0;
    const discountAmount = selectedCourse ? Math.round(coursePrice * 0.05) : 0;
    const taxAmount = selectedCourse ? Math.round(coursePrice * 0.02) : 0;
    const totalAmount = coursePrice - discountAmount + taxAmount;

    const handleFileChange = (inputFile) => {
        if (inputFile) setFile(inputFile);
        if (inputFile) {
            try {
                const url = URL.createObjectURL(inputFile);
                setPreviewUrl(url);
            } catch (err) {
                setPreviewUrl('');
            }
        } else {
            if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) handleFileChange(droppedFile);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedEnrollmentId || !file) {
            alert('Please select a course and upload your receipt.');
            return;
        }

        const formData = new FormData();
        formData.append('paymentSlip', file);
        formData.append('paymentMethod', selectedMethod);
        formData.append('paymentReference', paymentReference);
        formData.append('paymentAmount', totalAmount);
        setUploading(true);
        setUploadingProgress(0);
        try {
            await API.post(`/enrollments/${selectedEnrollmentId}/payment-slip`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadingProgress(pct);
                }
            });
            alert('Receipt uploaded successfully. Your payment is now under review.');
            setFile(null);
            if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
            fetchStatus();
        } catch (err) {
            alert(err.response?.data?.message || 'Upload failed.');
        } finally {
            setUploading(false);
            setUploadingProgress(0);
        }
    };

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyMessage('Copied!');
            setTimeout(() => setCopyMessage(''), 2000);
        } catch (err) {
            setCopyMessage('Copy failed');
            setTimeout(() => setCopyMessage(''), 2000);
        }
    };

    const renderHistoryRow = (enrollment) => {
        const status = enrollment.paymentStatus || (enrollment.tuitionClearanceFlag ? 'Cleared' : 'Unpaid');
        const date = new Date(enrollment.createdAt || enrollment.enrollmentTimestamp).toLocaleDateString();
        const rowMethod = paymentMethods.find(method => method.id === enrollment.paymentMethod);
        const amount = enrollment.paymentAmount || enrollment.courseRef?.price || 0;
        return (
            <tr key={enrollment._id} style={styles.historyRow}>
                <td>{date}</td>
                <td>{enrollment.courseRef?.courseTitle}</td>
                <td>ETB {amount}</td>
                <td>{rowMethod ? rowMethod.label : enrollment.paymentMethod || 'Unknown'}</td>
                <td>{status}</td>
            </tr>
        );
    };

    const formatDate = (d) => {
        try { return new Date(d).toLocaleString(); } catch (e) { return '-'; }
    };

    const downloadReceipt = (url) => {
        if (!url) return alert('No receipt available.');
        window.open(url, '_blank');
    };

    const printInvoice = (enrollment) => {
        const win = window.open('', '_blank');
        const html = `
        <html><head><title>Invoice</title></head><body>
        <h2>Invoice - ${enrollment.courseRef?.courseTitle}</h2>
        <p><strong>Student:</strong> ${enrollment.studentRef?.fullName || 'You'}</p>
        <p><strong>Course:</strong> ${enrollment.courseRef?.courseTitle}</p>
        <p><strong>Amount:</strong> ETB ${enrollment.paymentAmount || enrollment.courseRef?.price || 0}</p>
        <p><strong>Reference:</strong> ${enrollment.paymentReference || '-'}</p>
        <p><strong>Payment Status:</strong> ${enrollment.paymentStatus}</p>
        <hr />
        <p>Thank you for your payment.</p>
        </body></html>`;
        win.document.write(html);
        win.document.close();
        win.print();
    };

    return (
        <div style={styles.page}>
            <Sidebar navItems={[
                { label: '🏠 Dashboard', path: '/student/dashboard' },
                { label: '📚 Course Catalog', path: '/courses' },
                { label: '💳 Payment & Clearance', path: '/student/payments' }
            ]} activeTab="/student/payments" />

            <main style={styles.main}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.greeting}>Tuition Payment</h1>
                        <p style={styles.subGreeting}>Complete your course payment with confidence and track every step of the verification process.</p>
                    </div>
                </header>

                <section style={styles.topSection}>
                    <div style={styles.summaryCard}>
                        <div style={styles.summaryHeader}>
                            <div>
                                <div style={styles.summaryLabel}>Selected Course</div>
                                <div style={styles.summaryTitle}>{selectedCourse?.courseTitle || 'Choose a course below'}</div>
                            </div>
                            <div style={styles.statusBadge}>{selectedEnrollment?.paymentStatus || 'Unpaid'}</div>
                        </div>

                        {selectedCourse ? (
                            <div style={styles.summaryGrid}>
                                <div style={styles.summaryItem}>
                                    <span style={styles.summaryKey}>Instructor</span>
                                    <span style={styles.summaryValue}>{selectedCourse.creatorRef?.fullName || 'N/A'}</span>
                                </div>
                                <div style={styles.summaryItem}>
                                    <span style={styles.summaryKey}>Course Fee</span>
                                    <span style={styles.summaryValue}>ETB {coursePrice}</span>
                                </div>
                                <div style={styles.summaryItem}>
                                    <span style={styles.summaryKey}>Discount</span>
                                    <span style={styles.summaryValue}>ETB {discountAmount}</span>
                                </div>
                                <div style={styles.summaryItem}>
                                    <span style={styles.summaryKey}>Tax</span>
                                    <span style={styles.summaryValue}>ETB {taxAmount}</span>
                                </div>
                                <div style={{ ...styles.summaryItem, gridColumn: '1 / -1' }}>
                                    <span style={styles.summaryKey}>Total</span>
                                    <span style={styles.summaryTotal}>ETB {totalAmount}</span>
                                </div>
                            </div>
                        ) : (
                            <p style={styles.emptyText}>Select one of your enrolled courses to see payment and clearance details.</p>
                        )}
                    </div>

                    <div style={styles.methodCard}>
                        <h2 style={styles.cardTitle}>Payment Method</h2>
                        <div style={styles.methodGrid}>
                            {paymentMethods.map(method => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setSelectedMethod(method.id)}
                                    style={{
                                        ...styles.methodOption,
                                        borderColor: selectedMethod === method.id ? '#7c3aed' : 'rgba(148,163,184,0.35)',
                                        background: selectedMethod === method.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div style={styles.methodIcon}>{method.icon}</div>
                                    <div>
                                        <div style={styles.methodLabel}>{method.label}</div>
                                        <div style={styles.methodSubtitle}>{method.subtitle}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section style={styles.gridSection}>
                    <div style={styles.card}> 
                        <h2 style={styles.cardTitle}>Payment Instructions</h2>
                        <div style={styles.instructionRow}>
                            <div>
                                <div style={styles.instructionTitle}>{paymentMethod.label}</div>
                                <p style={styles.instructionText}>{paymentMethod.instructions}</p>
                            </div>
                            <div style={styles.qrCard}>
                                <div style={styles.qrLabel}>Scan to Pay</div>
                                <div style={styles.qrBox}>
                                    <div style={styles.qrDotRow}>
                                        <div style={styles.qrDot}></div>
                                        <div style={styles.qrDot}></div>
                                        <div style={styles.qrDot}></div>
                                    </div>
                                    <div style={styles.qrDotRow}>
                                        <div style={styles.qrDot}></div>
                                        <div style={{ ...styles.qrDot, opacity: 0 }}></div>
                                        <div style={styles.qrDot}></div>
                                    </div>
                                    <div style={styles.qrDotRow}>
                                        <div style={styles.qrDot}></div>
                                        <div style={styles.qrDot}></div>
                                        <div style={styles.qrDot}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.detailsGrid}>
                            <div style={styles.detailRow}>
                                <span>Account Name</span>
                                <strong>{paymentMethod.accountName}</strong>
                            </div>
                            <div style={styles.detailRow}>
                                <span>Account Number</span>
                                <div style={styles.copyRow}>
                                    <strong>{paymentMethod.accountNumber}</strong>
                                    <button type="button" style={styles.copyButton} onClick={() => handleCopy(paymentMethod.accountNumber)}>
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <div style={styles.detailRow}>
                                <span>Branch / Wallet</span>
                                <strong>{paymentMethod.branch}</strong>
                            </div>
                            <div style={styles.detailRow}>
                                <span>Reference</span>
                                <strong>{paymentMethod.reference}</strong>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p style={styles.copyFeedback}>{copyMessage || 'Use this information to complete the transfer then upload your receipt.'}</p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Upload Receipt</h2>
                        <form onSubmit={handleUpload} style={styles.uploadForm}>
                            <div style={styles.selectRow}>
                                <label style={styles.label}>Choose a course to clear</label>
                                <select
                                    style={styles.input}
                                    value={selectedEnrollmentId}
                                    onChange={e => setSelectedEnrollmentId(e.target.value)}
                                >
                                    <option value="" disabled>-- Select a payment target --</option>
                                    {enrollments.filter(e => !e.tuitionClearanceFlag).map(e => (
                                        <option key={e._id} value={e._id}>
                                            {e.courseRef?.courseTitle} – ETB {e.courseRef?.price}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.paymentFieldRow}>
                                <div style={{ flex: 1, marginRight: '16px' }}>
                                    <label style={styles.label}>Payment Reference</label>
                                    <input
                                        type="text"
                                        style={styles.input}
                                        value={paymentReference}
                                        onChange={e => setPaymentReference(e.target.value)}
                                        placeholder="Enter the transfer reference or receipt ID"
                                    />
                                </div>
                                <div style={{ flex: 0.6 }}>
                                    <label style={styles.label}>Amount to Pay</label>
                                    <input
                                        type="text"
                                        style={styles.input}
                                        value={`ETB ${totalAmount}`}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div
                                style={styles.dropZone}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                {file ? (
                                    <div style={styles.previewBox}>
                                        <div style={styles.previewMeta}>
                                            <strong>Receipt Uploaded</strong>
                                            <span>{file.name}</span>
                                        </div>
                                        <button type="button" style={styles.removeButton} onClick={() => setFile(null)}>
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div style={styles.dropContent}>
                                        <div style={styles.dropIcon}>📤</div>
                                        <div style={styles.dropText}>Drag & drop receipt here</div>
                                        <div style={styles.dropSmall}>or browse files (PNG, JPG, PDF)</div>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => handleFileChange(e.target.files?.[0])}
                                            style={styles.fileInput}
                                        />
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={uploading || !file || !selectedEnrollmentId} style={styles.primaryBtn}>
                                {uploading ? 'Uploading receipt...' : 'Submit Receipt for Verification'}
                            </button>
                        </form>
                    </div>
                </section>

                <section style={styles.timelineSection}>
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Payment Timeline</h2>
                        <div style={styles.timelineList}>
                            {['Submitted', 'Under Review', 'Approved', 'Course Activated'].map((step, index) => {
                                const active = selectedEnrollment?.paymentStatus !== 'Unpaid' && index === 0 ||
                                    (selectedEnrollment?.paymentStatus === 'Pending Verification' && index <= 1) ||
                                    (selectedEnrollment?.paymentStatus === 'Cleared' && index <= 3);
                                return (
                                    <div key={step} style={{ ...styles.timelineStep, borderColor: active ? '#7c3aed' : 'rgba(148,163,184,0.25)' }}>
                                        <span style={{ ...styles.timelineDot, background: active ? '#7c3aed' : '#334155' }}></span>
                                        <span>{step}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Payment History</h2>
                        {enrollments.length === 0 ? (
                            <p style={styles.emptyText}>No payment history available yet.</p>
                        ) : (
                            <div style={styles.tableWrapper}>
                                <table style={styles.historyTable}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Course</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {enrollments.map(renderHistoryRow)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
    main: { marginLeft: '250px', flex: 1, padding: '32px 40px', overflowY: 'auto' },
    header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { color: '#f8fafc', fontSize: '32px', fontWeight: '800', margin: 0 },
    subGreeting: { color: '#94a3b8', fontSize: '15px', marginTop: '8px', maxWidth: '720px' },
    topSection: { display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '24px', marginBottom: '24px' },
    gridSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
    card: { background: '#1f2937', borderRadius: '22px', padding: '28px', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 18px 45px rgba(15,23,42,0.18)' },
    cardTitle: { color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: '0 0 18px' },
    summaryCard: { background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', borderRadius: '22px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' },
    summaryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    summaryLabel: { fontSize: '13px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.12em' },
    summaryTitle: { fontSize: '24px', fontWeight: '800', color: '#f8fafc' },
    statusBadge: { background: '#334155', color: '#fff', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' },
    summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    summaryItem: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '16px', padding: '18px' },
    summaryKey: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' },
    summaryValue: { color: '#f8fafc', fontSize: '16px', fontWeight: '700' },
    summaryTotal: { color: '#7c3aed', fontSize: '20px', fontWeight: '800' },
    emptyText: { color: '#94a3b8', lineHeight: '1.8' },
    methodCard: { background: '#111827', borderRadius: '22px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' },
    methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' },
    methodOption: { cursor: 'pointer', width: '100%', borderRadius: '18px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', color: '#f8fafc', border: '1px solid', textAlign: 'left', background: '#111827', transition: 'transform 0.15s ease' },
    methodIcon: { width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center', fontSize: '20px' },
    methodLabel: { fontSize: '16px', fontWeight: '700' },
    methodSubtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
    instructionRow: { display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '20px', alignItems: 'start' },
    qrCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' },
    qrLabel: { color: '#94a3b8', marginBottom: '14px', fontSize: '13px' },
    qrBox: { width: '100%', minHeight: '180px', background: '#0f172a', borderRadius: '18px', border: '1px solid rgba(148,163,184,0.12)', display: 'grid', placeItems: 'center' },
    qrDotRow: { display: 'flex', gap: '10px', marginBottom: '10px' },
    qrDot: { width: '26px', height: '26px', borderRadius: '6px', background: '#f8fafc' },
    detailsGrid: { display: 'grid', gap: '12px', marginTop: '24px' },
    detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.1)' },
    copyRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    copyButton: { border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer' },
    copyFeedback: { color: '#94a3b8', fontSize: '13px', marginTop: '8px' },
    uploadForm: { display: 'grid', gap: '18px' },
    selectRow: { display: 'grid', gap: '8px' },
    paymentFieldRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    dropZone: { minHeight: '200px', borderRadius: '20px', border: '2px dashed rgba(148,163,184,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', position: 'relative', padding: '22px' },
    dropContent: { textAlign: 'center', color: '#94a3b8' },
    dropIcon: { fontSize: '36px', marginBottom: '14px' },
    dropText: { fontSize: '16px', fontWeight: '700', color: '#f8fafc' },
    dropSmall: { fontSize: '13px', marginTop: '8px' },
    fileInput: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
    previewBox: { width: '100%', padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '18px', border: '1px solid rgba(148,163,184,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
    previewMeta: { display: 'grid', gap: '6px', color: '#f8fafc' },
    removeButton: { background: 'transparent', border: '1px solid rgba(248,250,252,0.15)', color: '#f8fafc', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer' },
    primaryBtn: { background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: '#fff', border: 'none', borderRadius: '16px', padding: '14px 18px', fontWeight: '700', cursor: 'pointer', width: '100%' },
    timelineSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
    timelineList: { display: 'grid', gap: '14px' },
    timelineStep: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '16px', border: '1px solid', background: 'rgba(255,255,255,0.04)' },
    timelineDot: { width: '14px', height: '14px', borderRadius: '50%' },
    tableWrapper: { overflowX: 'auto' },
    historyTable: { width: '100%', borderCollapse: 'collapse', minWidth: '680px' },
    historyRow: { borderBottom: '1px solid rgba(148,163,184,0.12)' },
    historyTableTh: { textAlign: 'left', padding: '16px 12px', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }
};

// Add table header styles via style property injection to avoid missing CSS selectors
styles.historyTable = {
    ...styles.historyTable,
};
styles.historyTableTh = {
    ...styles.historyTableTh
};
styles.historyRow = {
    ...styles.historyRow
};
styles.historyTable.thead = styles.historyTable.thead;

const statusColorMap = {
    'Unpaid': '#f59e0b',
    'Pending Verification': '#f97316',
    'Cleared': '#10b981'
};

// add a few new style tokens used above
styles.selectedBadge = { background: 'linear-gradient(90deg,#7c3aed,#6366f1)', color: '#fff', padding: '6px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 };
styles.selectBadge = { border: '1px solid rgba(148,163,184,0.12)', padding: '6px 10px', borderRadius: 12, color: '#94a3b8', fontSize: 12 };
styles.progressWrap = { width: 180, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 8, marginTop: 8, overflow: 'hidden' };
styles.progressBar = { height: '100%', background: 'linear-gradient(90deg,#6366f1,#ec4899)' };
styles.notificationList = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 };
styles.notificationItem = { padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)' };
styles.helpCard = { padding: 12 };
styles.secondaryBtn = { background: 'transparent', border: '1px solid rgba(148,163,184,0.12)', color: '#f8fafc', padding: '8px 12px', borderRadius: 12, textDecoration: 'none' };
styles.secondaryLink = { color: '#7c3aed', textDecoration: 'none', fontWeight: 700 };
styles.invoiceBtns = { display: 'flex', gap: 8 };
styles.summaryMetaGrid = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 12 };
styles.instructionTitle = { fontSize: 16, fontWeight: 800, color: '#f8fafc' };
styles.instructionText = { color: '#94a3b8', marginTop: 8 };
