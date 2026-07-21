import React, { useState, useEffect } from 'react';
import { enrollmentService } from '../../services/api';
import Sidebar from '../../components/Sidebar';

export default function PaymentPage() {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // State for the currently selected enrollment to upload slip for
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
    const [file, setFile] = useState(null);

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

    const handleFileChange = (e) => {
        if(e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if(!selectedEnrollmentId || !file) {
            alert('Please select a course and choose a file.');
            return;
        }

        const formData = new FormData();
        formData.append('paymentSlip', file); // Field name matches multer setup

        setUploading(true);
        try {
            await enrollmentService.uploadPaymentSlip(selectedEnrollmentId, formData);
            alert('Payment slip uploaded successfully! Awaiting admin verification.');
            setFile(null);
            setSelectedEnrollmentId('');
            fetchStatus(); // Refresh list to see updated status
        } catch (err) {
            alert(err.response?.data?.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const sidebarItems = [
        { label: '🏠 Dashboard', path: '/student/dashboard' },
        { label: '📚 Course Catalog', path: '/courses' },
        { label: '💳 Payment & Clearance', path: '/student/payments' }
    ];

    return (
        <div style={styles.page}>
            <Sidebar navItems={sidebarItems} activeTab="/student/payments" />
            
            <main style={styles.main}>
                <header style={styles.header}>
                    <h1 style={styles.greeting}>Tuition Ledger</h1>
                    <p style={styles.subGreeting}>Manage your payment clearances for enrolled courses</p>
                </header>

                <div style={styles.contentGrid}>
                    {/* Left Col: Upload Form */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Submit Payment Slip</h2>
                        <p style={{color:'#94a3b8', fontSize:'14px', marginBottom:'24px'}}>
                            Transfer your tuition fee to CBE Acc: 1000xxxxxx and upload the receipt image here.
                        </p>
                        
                        <form onSubmit={handleUpload} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                            <div>
                                <label style={styles.label}>Select Enrolled Course</label>
                                <select 
                                    style={styles.input}
                                    value={selectedEnrollmentId}
                                    onChange={e => setSelectedEnrollmentId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>-- Choose Course --</option>
                                    {enrollments.filter(e => !e.tuitionClearanceFlag).map(e => (
                                        <option key={e._id} value={e._id}>{e.courseRef?.courseTitle} - ETB {e.courseRef?.price}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={styles.label}>Upload Receipt Image (JPG/PNG)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{...styles.input, padding: '9px 12px', background: 'transparent'}}
                                    required
                                />
                            </div>

                            <button type="submit" disabled={uploading} style={styles.primaryBtn}>
                                {uploading ? 'Uploading...' : 'Submit Receipt for Verification'}
                            </button>
                        </form>
                    </div>

                    {/* Right Col: Clearance Status */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Clearance Status</h2>
                        {loading ? <p>Loading...</p> : enrollments.length === 0 ? <p style={{color:'#64748b'}}>No enrollments found.</p> : (
                            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                                {enrollments.map(e => {
                                    let statusColor = '#ef4444'; // Unpaid
                                    if(e.paymentStatus === 'Pending Verification') statusColor = '#f59e0b';
                                    if(e.paymentStatus === 'Cleared') statusColor = '#10b981';

                                    return (
                                        <div key={e._id} style={styles.statusRow}>
                                            <div>
                                                <div style={{color:'#f1f5f9', fontWeight:'600', marginBottom:'4px'}}>{e.courseRef?.courseTitle}</div>
                                                <div style={{color:'#94a3b8', fontSize:'12px'}}>ETB {e.courseRef?.price}</div>
                                            </div>
                                            <div style={{...styles.badge, color: statusColor, background: `${statusColor}22`}}>
                                                {e.paymentStatus}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
    main: { marginLeft: '250px', flex: 1, padding: '40px', overflowY: 'auto' },
    header: { marginBottom: '40px' },
    greeting: { color: '#f1f5f9', fontSize: '28px', fontWeight: '800', margin: 0 },
    subGreeting: { color: '#64748b', fontSize: '14px', margin: '4px 0 0' },
    contentGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' },
    card: { background: '#1e293b', borderRadius: '16px', padding: '32px', border: '1px solid #334155' },
    cardTitle: { color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: '0 0 16px' },
    label: { color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '8px' },
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '12px', width: '100%', boxSizing:'border-box', fontFamily:'inherit' },
    primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' },
    statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' },
    badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }
};
