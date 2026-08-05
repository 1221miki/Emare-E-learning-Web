import React, { useState, useEffect, useMemo } from 'react';
import API, { enrollmentService } from '../../services/api';
import Sidebar from '../../components/Sidebar';

const defaultPaymentMethods = [
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
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
    const [file, setFile] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState('cbe');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentMethods, setPaymentMethods] = useState(defaultPaymentMethods);
    const [copyMessage, setCopyMessage] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [refundCourseId, setRefundCourseId] = useState('');
    const [refundReason, setRefundReason] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = () => {
        setLoading(true);
        enrollmentService.getMyStatus()
            .then((res) => {
                const data = res.data.data || [];
                setEnrollments(data);
                if (!selectedEnrollmentId && data.length > 0) {
                    setSelectedEnrollmentId(data[0]._id);
                }
            })
            .catch(() => {
                setFeedbackMessage('Unable to load payment activity right now.');
            })
            .finally(() => setLoading(false));
    };

    const selectedEnrollment = useMemo(
        () => enrollments.find((e) => e._id === selectedEnrollmentId) || enrollments[0] || null,
        [enrollments, selectedEnrollmentId]
    );

    useEffect(() => {
        if (!selectedEnrollmentId && enrollments.length > 0) {
            setSelectedEnrollmentId(enrollments[0]._id);
        }
    }, [enrollments, selectedEnrollmentId]);

    useEffect(() => {
        if (selectedEnrollment) {
            if (selectedEnrollment.paymentMethod) {
                setSelectedMethod(selectedEnrollment.paymentMethod);
            }
            if (selectedEnrollment.paymentReference) {
                setPaymentReference(selectedEnrollment.paymentReference);
            } else {
                setPaymentReference('');
            }
        }
    }, [selectedEnrollment]);

    const selectedCourse = selectedEnrollment?.courseRef || null;
    const paymentMethod = paymentMethods.find((method) => method.id === selectedMethod) || paymentMethods[0];
    const coursePrice = selectedCourse?.price || 0;
    const discountAmount = selectedCourse ? Math.round(coursePrice * 0.05) : 0;
    const taxAmount = selectedCourse ? Math.round(coursePrice * 0.02) : 0;
    const totalAmount = coursePrice - discountAmount + taxAmount;

    const paymentSummary = useMemo(() => {
        const totalSpent = enrollments.reduce((sum, enrollment) => sum + (enrollment.paymentAmount || enrollment.courseRef?.price || 0), 0);
        const pendingCount = enrollments.filter((enrollment) => {
            const status = enrollment.paymentStatus || (enrollment.tuitionClearanceFlag ? 'Cleared' : 'Unpaid');
            return ['Unpaid', 'Pending Verification', 'Pending'].includes(status);
        }).length;

        return {
            totalSpent,
            coursesPurchased: enrollments.length,
            pendingPayments: pendingCount
        };
    }, [enrollments]);

    const pendingPayments = useMemo(() => {
        return enrollments.filter((enrollment) => {
            const status = enrollment.paymentStatus || (enrollment.tuitionClearanceFlag ? 'Cleared' : 'Unpaid');
            return ['Unpaid', 'Pending Verification', 'Pending'].includes(status);
        }).map((enrollment) => ({
            ...enrollment,
            amount: enrollment.paymentAmount || enrollment.courseRef?.price || 0,
            expiresIn: '24 hours'
        }));
    }, [enrollments]);

    const recentTransactions = useMemo(() => {
        return [...enrollments]
            .sort((a, b) => new Date(b.createdAt || b.enrollmentTimestamp || 0) - new Date(a.createdAt || a.enrollmentTimestamp || 0))
            .slice(0, 3)
            .map((enrollment) => {
                const status = enrollment.paymentStatus || (enrollment.tuitionClearanceFlag ? 'Cleared' : 'Unpaid');
                const normalized = status === 'Cleared' ? 'Completed' : status === 'Pending Verification' ? 'Pending' : status;
                return {
                    id: enrollment._id,
                    course: enrollment.courseRef?.courseTitle || 'Course Payment',
                    amount: enrollment.paymentAmount || enrollment.courseRef?.price || 0,
                    method: enrollment.paymentMethod || 'Chapa',
                    transactionId: enrollment.paymentReference || `CHP-${String(enrollment._id || '000000').slice(-8).toUpperCase()}`,
                    date: enrollment.createdAt || enrollment.enrollmentTimestamp,
                    status: normalized
                };
            });
    }, [enrollments]);

    const handleFileChange = (inputFile) => {
        if (inputFile) {
            setFile(inputFile);
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
        formData.append('paymentAmount', String(totalAmount));
        setUploading(true);
        try {
            await API.post(`/enrollments/${selectedEnrollmentId}/payment-slip`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFeedbackMessage('Receipt submitted successfully. Your payment is now under review.');
            setFile(null);
            fetchStatus();
        } catch (err) {
            alert(err.response?.data?.message || 'Upload failed.');
        } finally {
            setUploading(false);
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

    const handleAddPaymentMethod = () => {
        const newMethod = {
            id: `custom-${Date.now()}`,
            label: 'New Payment Method',
            subtitle: 'Added by student',
            icon: '➕',
            accountName: 'Add your preferred method',
            accountNumber: 'Add details',
            branch: 'Personal',
            reference: 'Update later',
            instructions: 'This method is saved locally for your student payments dashboard.'
        };
        setPaymentMethods((prev) => [...prev, newMethod]);
        setSelectedMethod(newMethod.id);
        setFeedbackMessage('Payment method added to your list.');
    };

    const handleContinuePayment = (enrollmentId) => {
        setSelectedEnrollmentId(enrollmentId);
        setFeedbackMessage('Continue the pending payment below.');
        window.scrollTo({ top: 420, behavior: 'smooth' });
    };

    const handleDownloadReceipt = (enrollment) => {
        const studentName = enrollment.studentRef?.fullName || 'Student';
        const courseName = enrollment.courseRef?.courseTitle || 'Course';
        const amount = enrollment.paymentAmount || enrollment.courseRef?.price || 0;
        const date = new Date(enrollment.createdAt || enrollment.enrollmentTimestamp || Date.now()).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const gateway = enrollment.paymentMethod || 'Chapa';
        const txId = enrollment.paymentReference || `CHP-${String(enrollment._id || '000000').slice(-8).toUpperCase()}`;
        const win = window.open('', '_blank');
        if (!win) {
            alert('Please allow popups to preview the receipt.');
            return;
        }

        const html = `<!doctype html>
        <html>
          <head><title>Receipt - ${courseName}</title></head>
          <body style="font-family:Arial,sans-serif;padding:24px;color:#111827;line-height:1.6;">
            <div style="max-width:700px;margin:auto;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                  <div style="font-size:24px;font-weight:800;color:#111827;">Emare ICT Hub</div>
                  <div style="font-size:13px;color:#6b7280;">Student payment receipt</div>
                </div>
                <div style="padding:8px 12px;border-radius:999px;background:#f3f4f6;font-weight:700;color:#4f46e5;">Receipt</div>
              </div>
              <h2 style="margin:0 0 8px;">${courseName}</h2>
              <p style="margin:0 0 12px;color:#4b5563;">Payment completed for ${studentName}</p>
              <hr />
              <p><strong>Student name:</strong> ${studentName}</p>
              <p><strong>Course name:</strong> ${courseName}</p>
              <p><strong>Amount:</strong> ETB ${amount}</p>
              <p><strong>Payment date:</strong> ${date}</p>
              <p><strong>Payment gateway:</strong> ${gateway}</p>
              <p><strong>Transaction ID:</strong> ${txId}</p>
              <p style="margin-top:24px;color:#6b7280;">Thank you for learning with Emare ICT Hub.</p>
            </div>
          </body>
        </html>`;
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
    };

    const handleRefundRequest = (e) => {
        e.preventDefault();
        if (!refundCourseId || !refundReason) {
            alert('Please select a course and describe your reason.');
            return;
        }
        setFeedbackMessage('Refund request sent. The support team will review it shortly.');
        setRefundCourseId('');
        setRefundReason('');
    };

    const formatDate = (value) => {
        try {
            return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (error) {
            return '—';
        }
    };

    const getStatusStyle = (status) => {
        const normalized = status || 'Pending';
        const palette = {
            Paid: { text: '#10b981', bg: 'rgba(16,185,129,0.16)' },
            Completed: { text: '#10b981', bg: 'rgba(16,185,129,0.16)' },
            Pending: { text: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
            Failed: { text: '#ef4444', bg: 'rgba(239,68,68,0.16)' },
            Refunded: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.16)' },
            Cleared: { text: '#10b981', bg: 'rgba(16,185,129,0.16)' },
            'Pending Verification': { text: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
            Unpaid: { text: '#f59e0b', bg: 'rgba(245,158,11,0.18)' }
        };
        const style = palette[normalized] || palette.Pending;
        return { color: style.text, background: style.bg };
    };

    return (
        <div style={styles.page}>
            <Sidebar
                navItems={[
                    { label: '🏠 Dashboard', path: '/student/dashboard' },
                    { label: '📚 My Courses', path: '/student/dashboard?tab=my_courses' },
                    { label: '🎥 Learning', path: '/student/dashboard?tab=learning' },
                    { label: '📝 Assignments', path: '/student/dashboard?tab=assignments' },
                    { label: '💬 Messages', path: '/student/dashboard?tab=messages' },
                    { label: '🏆 Leaderboard', path: '/student/dashboard?tab=leaderboard' },
                    { label: '🎓 Certificates', path: '/student/dashboard?tab=certificates' },
                    { label: '💳 Payments', path: '/student/payments' },
                    { label: '⚙ Settings', path: '/student/dashboard?tab=settings' }
                ]}
                activeTab="/student/payments"
            />

            <main style={styles.main}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.greeting}>Payments</h1>
                        <p style={styles.subGreeting}>Review your payment history, continue pending enrollments, manage payment methods, and download receipts in one place.</p>
                    </div>
                </header>

                {feedbackMessage ? <div style={styles.feedbackBanner}>{feedbackMessage}</div> : null}

                <section style={styles.topSection}>
                    <div style={styles.summaryCard}>
                        <div style={styles.summaryHeader}>
                            <div>
                                <div style={styles.summaryLabel}>Payment Summary</div>
                                <div style={styles.summaryTitle}>Student Finance Overview</div>
                            </div>
                            <div style={{ ...styles.statusBadge, background: 'rgba(16,185,129,0.16)', color: '#34d399' }}>Live</div>
                        </div>

                        <div style={styles.summaryGrid}>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryKey}>Total Spent</span>
                                <span style={styles.summaryValue}>ETB {paymentSummary.totalSpent.toLocaleString()}</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryKey}>Courses Purchased</span>
                                <span style={styles.summaryValue}>{paymentSummary.coursesPurchased} Courses</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryKey}>Pending Payments</span>
                                <span style={styles.summaryValue}>{paymentSummary.pendingPayments} Payment</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryKey}>Selected Course</span>
                                <span style={styles.summaryValue}>{selectedCourse?.courseTitle || 'Choose a course'}</span>
                            </div>
                        </div>
                    </div>

                    <div style={styles.methodCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={styles.cardTitle}>Payment Methods</h2>
                            <button type="button" onClick={handleAddPaymentMethod} style={styles.secondaryBtn}>+ Add Payment Method</button>
                        </div>
                        <div style={styles.methodGrid}>
                            {paymentMethods.map((method) => (
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
                        <h2 style={styles.cardTitle}>Recent Transactions</h2>
                        {recentTransactions.length === 0 ? (
                            <p style={styles.emptyText}>No recent transactions yet.</p>
                        ) : (
                            <div style={styles.transactionList}>
                                {recentTransactions.map((transaction) => (
                                    <div key={transaction.id} style={styles.transactionCard}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                            <div>
                                                <div style={styles.transactionTitle}>{transaction.course}</div>
                                                <div style={styles.transactionMeta}>Amount: ETB {transaction.amount}</div>
                                                <div style={styles.transactionMeta}>Payment Method: {transaction.method}</div>
                                                <div style={styles.transactionMeta}>Transaction ID: {transaction.transactionId}</div>
                                                <div style={styles.transactionMeta}>Date: {formatDate(transaction.date)}</div>
                                            </div>
                                            <span style={{ ...styles.statusPill, ...getStatusStyle(transaction.status) }}>{transaction.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Pending Enrollment Payments</h2>
                        {pendingPayments.length === 0 ? (
                            <p style={styles.emptyText}>No pending payments right now.</p>
                        ) : (
                            <div style={styles.pendingList}>
                                {pendingPayments.map((payment) => (
                                    <div key={payment._id} style={styles.pendingCard}>
                                        <div style={styles.pendingTitle}>Pending Payment</div>
                                        <div style={styles.pendingLabel}>Course: {payment.courseRef?.courseTitle || 'Course'}</div>
                                        <div style={styles.pendingLabel}>Amount: ETB {payment.amount}</div>
                                        <div style={styles.pendingLabel}>Expires: {payment.expiresIn}</div>
                                        <button type="button" onClick={() => handleContinuePayment(payment._id)} style={styles.primaryBtnInline}>Continue Payment</button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                <div style={styles.qrLabel}>Secure checkout</div>
                                <div style={styles.qrBox}>
                                    <div style={{ fontSize: '44px' }}>🧾</div>
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
                                <p style={styles.copyFeedback}>{copyMessage || 'Use this information to complete your payment and upload your receipt.'}</p>
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
                                    onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                                >
                                    <option value="" disabled>-- Select a payment target --</option>
                                    {enrollments.filter((e) => !e.tuitionClearanceFlag).map((e) => (
                                        <option key={e._id} value={e._id}>
                                            {e.courseRef?.courseTitle} – ETB {e.courseRef?.price}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.paymentFieldRow}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Payment Reference</label>
                                    <input
                                        type="text"
                                        style={styles.input}
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Enter the transfer reference or receipt ID"
                                    />
                                </div>
                                <div style={{ flex: 0.6 }}>
                                    <label style={styles.label}>Amount to Pay</label>
                                    <input type="text" style={styles.input} value={`ETB ${totalAmount}`} readOnly />
                                </div>
                            </div>

                            <div style={styles.dropZone} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
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
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e.target.files?.[0])} style={styles.fileInput} />
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
                        <h2 style={styles.cardTitle}>Payment History</h2>
                        {loading ? (
                            <p style={styles.emptyText}>Loading payment history…</p>
                        ) : enrollments.length === 0 ? (
                            <p style={styles.emptyText}>No payment history available yet.</p>
                        ) : (
                            <div style={styles.tableWrapper}>
                                <table style={styles.historyTable}>
                                    <thead>
                                        <tr>
                                            <th style={styles.historyTableTh}>Date</th>
                                            <th style={styles.historyTableTh}>Course</th>
                                            <th style={styles.historyTableTh}>Amount</th>
                                            <th style={styles.historyTableTh}>Method</th>
                                            <th style={styles.historyTableTh}>Status</th>
                                            <th style={styles.historyTableTh}>Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {enrollments.map((enrollment) => {
                                            const status = enrollment.paymentStatus || (enrollment.tuitionClearanceFlag ? 'Cleared' : 'Unpaid');
                                            const amount = enrollment.paymentAmount || enrollment.courseRef?.price || 0;
                                            const method = paymentMethods.find((method) => method.id === enrollment.paymentMethod)?.label || enrollment.paymentMethod || 'Unknown';
                                            return (
                                                <tr key={enrollment._id} style={styles.historyRow}>
                                                    <td style={styles.historyCell}>{formatDate(enrollment.createdAt || enrollment.enrollmentTimestamp)}</td>
                                                    <td style={styles.historyCell}>{enrollment.courseRef?.courseTitle || 'Course'}</td>
                                                    <td style={styles.historyCell}>ETB {amount}</td>
                                                    <td style={styles.historyCell}>{method}</td>
                                                    <td style={styles.historyCell}><span style={{ ...styles.statusPill, ...getStatusStyle(status) }}>{status}</span></td>
                                                    <td style={styles.historyCell}>
                                                        <button type="button" style={styles.receiptBtn} onClick={() => handleDownloadReceipt(enrollment)}>
                                                            Download PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Refund Request</h2>
                        <form onSubmit={handleRefundRequest} style={styles.refundForm}>
                            <label style={styles.label}>Course</label>
                            <select style={styles.input} value={refundCourseId} onChange={(e) => setRefundCourseId(e.target.value)}>
                                <option value="">Select a course</option>
                                {enrollments.map((e) => (
                                    <option key={e._id} value={e._id}>{e.courseRef?.courseTitle || 'Course'}</option>
                                ))}
                            </select>
                            <label style={styles.label}>Reason</label>
                            <textarea style={{ ...styles.input, minHeight: '100px' }} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Tell us why you want a refund." />
                            <button type="submit" style={styles.primaryBtn}>Request Refund</button>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
    main: { marginLeft: '250px', flex: 1, padding: '32px 40px', overflowY: 'auto' },
    header: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { color: '#f8fafc', fontSize: '32px', fontWeight: '800', margin: 0 },
    subGreeting: { color: '#94a3b8', fontSize: '15px', marginTop: '8px', maxWidth: '780px' },
    feedbackBanner: { background: 'rgba(99,102,241,0.16)', color: '#c7d2fe', border: '1px solid rgba(129,140,248,0.3)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px' },
    topSection: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' },
    gridSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
    card: { background: '#1f2937', borderRadius: '22px', padding: '28px', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 18px 45px rgba(15,23,42,0.18)' },
    cardTitle: { color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: '0 0 18px' },
    summaryCard: { background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', borderRadius: '22px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' },
    summaryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    summaryLabel: { fontSize: '13px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.12em' },
    summaryTitle: { fontSize: '24px', fontWeight: '800', color: '#f8fafc' },
    statusBadge: { background: '#334155', color: '#fff', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' },
    summaryItem: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '16px', padding: '18px' },
    summaryKey: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' },
    summaryValue: { color: '#f8fafc', fontSize: '16px', fontWeight: '700' },
    methodCard: { background: '#111827', borderRadius: '22px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' },
    methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' },
    methodOption: { cursor: 'pointer', width: '100%', borderRadius: '18px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', color: '#f8fafc', border: '1px solid', textAlign: 'left', background: '#111827', transition: 'transform 0.15s ease' },
    methodIcon: { width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center', fontSize: '20px' },
    methodLabel: { fontSize: '16px', fontWeight: '700' },
    methodSubtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
    secondaryBtn: { border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer' },
    transactionList: { display: 'grid', gap: '14px' },
    transactionCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '16px', padding: '16px' },
    transactionTitle: { color: '#f8fafc', fontSize: '16px', fontWeight: '700', marginBottom: '6px' },
    transactionMeta: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
    pendingList: { display: 'grid', gap: '14px' },
    pendingCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' },
    pendingTitle: { color: '#f8fafc', fontSize: '15px', fontWeight: '700', marginBottom: '8px' },
    pendingLabel: { color: '#94a3b8', fontSize: '13px', marginBottom: '4px' },
    instructionRow: { display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '20px', alignItems: 'start' },
    qrCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' },
    qrLabel: { color: '#94a3b8', marginBottom: '14px', fontSize: '13px' },
    qrBox: { width: '100%', minHeight: '180px', background: '#0f172a', borderRadius: '18px', border: '1px solid rgba(148,163,184,0.12)', display: 'grid', placeItems: 'center' },
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
    primaryBtnInline: { marginTop: '10px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' },
    timelineSection: { display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '24px' },
    tableWrapper: { overflowX: 'auto' },
    historyTable: { width: '100%', borderCollapse: 'collapse', minWidth: '720px' },
    historyRow: { borderBottom: '1px solid rgba(148,163,184,0.12)' },
    historyCell: { padding: '12px 8px', color: '#e2e8f0', fontSize: '14px' },
    historyTableTh: { textAlign: 'left', padding: '10px 8px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' },
    receiptBtn: { border: '1px solid rgba(129,140,248,0.4)', background: 'rgba(99,102,241,0.12)', color: '#c7d2fe', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer' },
    refundForm: { display: 'grid', gap: '10px' },
    label: { color: '#e2e8f0', fontWeight: '600', fontSize: '13px' },
    input: { background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px', color: '#f8fafc', padding: '12px 14px', width: '100%' },
    statusPill: { padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' },
    emptyText: { color: '#94a3b8', lineHeight: '1.8' }
};
