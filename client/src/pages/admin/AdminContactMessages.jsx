import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const STATUS_META = {
    unread: { label: 'Unread', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    read: { label: 'Read', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    replied: { label: 'Replied', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    closed: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.14)' }
};

const FILTERS = [
    { key: '', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
    { key: 'replied', label: 'Replied' },
    { key: 'closed', label: 'Closed' }
];

export default function AdminContactMessages() {
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // View/Reply modal state
    const [selected, setSelected] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    const fetchMessages = async (statusFilter = filter) => {
        try {
            setLoading(true);
            setError('');
            const res = await API.get('/admin/contact-messages', {
                params: statusFilter ? { status: statusFilter } : {}
            });
            setMessages(res.data.data || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load contact messages.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(filter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const fmtDate = (d) => new Date(d).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // ── Actions ────────────────────────────────────────────
    const openMessage = async (msg) => {
        try {
            const res = await API.get(`/admin/contact-messages/${msg._id}`);
            setSelected(res.data.data);
            setReplyText(res.data.data.adminResponse || '');
            if (res.data.data.status === 'unread') {
                await API.put(`/admin/contact-messages/${msg._id}/status`, { status: 'read' });
                fetchMessages(filter);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open the message.');
        }
    };

    const setStatus = async (msg, status) => {
        try {
            await API.put(`/admin/contact-messages/${msg._id}/status`, { status });
            setNotice(`Message marked as ${status}.`);
            if (selected?._id === msg._id) setSelected(prev => ({ ...prev, status }));
            fetchMessages(filter);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update the status.');
        }
    };

    const sendReply = async () => {
        if (!selected) return;
        if (!replyText.trim()) {
            setError('Response text is required before sending.');
            return;
        }
        try {
            setReplying(true);
            setError('');
            await API.post(`/admin/contact-messages/${selected._id}/reply`, { response: replyText });
            setNotice('Response sent successfully — the user can now see it in their support messages.');
            setSelected(null);
            setReplyText('');
            fetchMessages(filter);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send the response.');
        } finally {
            setReplying(false);
        }
    };

    // ── Styles ─────────────────────────────────────────────
    const styles = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text, padding: '32px 5%' },
        headingRow: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' },
        heading: { fontSize: '28px', fontWeight: '900', margin: 0 },
        badge: { background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '4px 12px', fontSize: '13px', fontWeight: '800' },
        backBtn: { marginLeft: 'auto', padding: '9px 18px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.text, fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
        subheading: { color: colors.textMuted, margin: '6px 0 24px', fontSize: '14px' },
        alertSuccess: { padding: '12px 18px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: '700', marginBottom: '20px', border: '1px solid rgba(34,197,94,0.35)' },
        alertError: { padding: '12px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: '700', marginBottom: '20px', border: '1px solid rgba(239,68,68,0.35)' },
        filters: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' },
        filterBtn: (active) => ({
            padding: '9px 20px', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
            border: `1px solid ${active ? colors.primary : colors.border}`,
            background: active ? colors.primary : 'transparent',
            color: active ? '#fff' : colors.text
        }),
        card: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '18px', padding: '8px', overflowX: 'auto' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { textAlign: 'left', padding: '12px 14px', borderBottom: `2px solid ${colors.border}`, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textMuted },
        td: { padding: '12px 14px', borderBottom: `1px solid ${colors.border}`, fontSize: '14px', verticalAlign: 'top' },
        preview: { color: colors.textMuted, fontSize: '13px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        pill: { padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap' },
        viewBtn: { padding: '8px 16px', borderRadius: '10px', border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: '700', cursor: 'pointer', marginRight: '8px' },
        closeBtn: { padding: '8px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, fontWeight: '700', cursor: 'pointer' },
        overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
        modal: { width: 'min(100%, 640px)', maxHeight: '90vh', overflowY: 'auto', background: colors.bgCard, borderRadius: '22px', border: `1px solid ${colors.border}`, padding: '26px', boxShadow: '0 30px 90px rgba(0,0,0,0.3)', position: 'relative' },
        modalClose: { position: 'absolute', top: '16px', right: '16px', width: '38px', height: '38px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, cursor: 'pointer', fontWeight: '800', fontSize: '16px' },
        sectionLabel: { margin: '0 0 6px', fontSize: '12px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textMuted },
        value: { margin: '0 0 14px', fontSize: '15px', color: colors.text },
        messageBox: { background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '18px' },
        replyArea: { width: '100%', minHeight: '130px', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgInput, color: colors.text, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
        sendBtn: { marginTop: '12px', padding: '12px 28px', borderRadius: '12px', border: 'none', background: colors.primary, color: '#fff', fontWeight: '800', cursor: 'pointer', float: 'right' }
    };

    return (
        <div style={styles.page}>
            <div style={styles.headingRow}>
                <h1 style={styles.heading}>Contact Messages</h1>
                {unreadCount > 0 && <span style={styles.badge}>{unreadCount} unread</span>}
                <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>← Back to Dashboard</button>
            </div>
            <p style={styles.subheading}>Messages submitted through the website Contact page. Reply to respond directly to the sender.</p>

            {notice && <div style={styles.alertSuccess}>{notice}</div>}
            {error && <div style={styles.alertError}>{error}</div>}

            {/* ── Status Filters ───────────────────────────── */}
            <div style={styles.filters}>
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        style={styles.filterBtn(filter === f.key)}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}{f.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </button>
                ))}
            </div>

            {/* ── Messages Table ───────────────────────────── */}
            {loading ? (
                <p style={{ color: colors.textMuted }}>Loading messages...</p>
            ) : messages.length === 0 ? (
                <p style={{ color: colors.textMuted }}>No {filter || ''} messages found.</p>
            ) : (
                <div style={styles.card}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Sender</th>
                                <th style={styles.th}>Email / Phone</th>
                                <th style={styles.th}>Message</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Received</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {messages.map(msg => {
                                const meta = STATUS_META[msg.status] || STATUS_META.unread;
                                return (
                                    <tr key={msg._id}>
                                        <td style={styles.td}>
                                            <strong>{msg.name}</strong>
                                            {msg.respondedByName && (
                                                <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                                                    Replied by {msg.respondedByName}
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <div>{msg.email}</div>
                                            <div style={{ color: colors.textMuted, fontSize: '12px' }}>{msg.phone}</div>
                                        </td>
                                        <td style={styles.td}><div style={styles.preview}>{msg.message}</div></td>
                                        <td style={styles.td}>
                                            <span style={{ ...styles.pill, color: meta.color, background: meta.bg }}>{meta.label}</span>
                                        </td>
                                        <td style={styles.td}>{fmtDate(msg.createdAt)}</td>
                                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                                            <button style={styles.viewBtn} onClick={() => openMessage(msg)}>
                                                {msg.status === 'replied' ? 'View / Edit Reply' : 'View / Reply'}
                                            </button>
                                            {msg.status !== 'closed' && msg.status !== 'replied' && (
                                                <button style={styles.closeBtn} onClick={() => setStatus(msg, 'closed')}>Close</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── View / Reply Modal ───────────────────────── */}
            {selected && (
                <div style={styles.overlay} onClick={() => setSelected(null)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <button style={styles.modalClose} onClick={() => setSelected(null)} aria-label="Close">×</button>

                        <h2 style={{ ...styles.sectionLabel, fontSize: '14px', marginBottom: '14px' }}>
                            User Information
                        </h2>
                        <p style={styles.value}><strong>Name:</strong> {selected.name}</p>
                        <p style={styles.value}><strong>Email:</strong> {selected.email}</p>
                        <p style={styles.value}><strong>Phone:</strong> {selected.phone}</p>

                        <h2 style={styles.sectionLabel}>User Message</h2>
                        <div style={styles.messageBox}>{selected.message}</div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
                            <span style={styles.sectionLabel}>Status:</span>
                            <span style={{ ...styles.pill, ...(STATUS_META[selected.status] ? { color: STATUS_META[selected.status].color, background: STATUS_META[selected.status].bg } : {}) }}>
                                {STATUS_META[selected.status]?.label || selected.status}
                            </span>
                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>Submitted: {fmtDate(selected.createdAt)}</span>
                        </div>

                        <h2 style={styles.sectionLabel}>Admin Response</h2>
                        <textarea
                            style={styles.replyArea}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your response here..."
                        />
                        <div style={{ overflow: 'hidden' }}>
                            <button style={styles.sendBtn} onClick={sendReply} disabled={replying}>
                                {replying ? 'Sending...' : selected.adminResponse ? 'Update Response' : 'Send Response'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
