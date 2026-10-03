import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const STATUS_META = {
    unread: { label: 'Submitted', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    read: { label: 'Being Reviewed', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    replied: { label: 'Replied', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    closed: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.14)' }
};

export default function SupportMessagesPage() {
    const { colors } = useTheme();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchMessages = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await API.get('/contact/my-messages');
                if (isMounted) setMessages(res.data.data || []);
            } catch (err) {
                if (isMounted) setError(err.response?.data?.message || 'Failed to load your messages.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchMessages();
        return () => { isMounted = false; };
    }, []);

    const fmtDate = (d) => new Date(d).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const styles = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text },
        container: { maxWidth: '860px', margin: '0 auto', padding: '48px 5% 80px' },
        title: { fontSize: '30px', fontWeight: '900', margin: '0 0 6px' },
        subtitle: { color: colors.textMuted, fontSize: '14px', margin: '0 0 32px' },
        statusText: { textAlign: 'center', color: colors.textMuted, padding: '48px 0' },
        card: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '18px', padding: '22px', marginBottom: '18px' },
        row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' },
        date: { color: colors.textMuted, fontSize: '12px' },
        message: { margin: '0 0 12px', fontSize: '14px', lineHeight: 1.7, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
        pill: { padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap' },
        responseBox: { borderLeft: `3px solid ${colors.primary}`, background: colors.bgInput, borderRadius: '0 12px 12px 0', padding: '14px 16px', marginTop: '6px' },
        responseLabel: { margin: '0 0 6px', fontSize: '12px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.primary },
        responseText: { margin: 0, fontSize: '14px', lineHeight: 1.7, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
        respondedBy: { marginTop: '8px', color: colors.textMuted, fontSize: '12px' }
    };

    return (
        <div style={styles.page}>
            <Navbar />
            <div style={styles.container}>
                <h1 style={styles.title}>My Support Messages</h1>
                <p style={styles.subtitle}>Contact requests you have sent and the administrator's responses.</p>
                <Link to="/#contact" style={{ ...styles.subtitle, color: colors.primary, textDecoration: 'underline', display: 'inline-block', marginBottom: '28px' }}>
                    + Send a new message
                </Link>

                {loading ? (
                    <p style={styles.statusText}>Loading your messages...</p>
                ) : error ? (
                    <p style={{ ...styles.statusText, color: '#ef4444' }}>{error}</p>
                ) : messages.length === 0 ? (
                    <p style={styles.statusText}>You haven't sent any support messages yet.</p>
                ) : (
                    messages.map(msg => {
                        const meta = STATUS_META[msg.status] || STATUS_META.unread;
                        return (
                            <div key={msg._id} style={styles.card}>
                                <div style={styles.row}>
                                    <span style={{ ...styles.pill, color: meta.color, background: meta.bg }}>{meta.label}</span>
                                    <span style={styles.date}>Sent: {fmtDate(msg.createdAt)}</span>
                                </div>
                                <p style={styles.message}>{msg.message}</p>

                                {msg.adminResponse ? (
                                    <div style={styles.responseBox}>
                                        <h4 style={styles.responseLabel}>Admin Response</h4>
                                        <p style={styles.responseText}>{msg.adminResponse}</p>
                                        <div style={styles.respondedBy}>
                                            Responded{msg.respondedByName ? ` by ${msg.respondedByName}` : ''}: {msg.respondedAt ? fmtDate(msg.respondedAt) : ''}
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ ...styles.respondedBy, margin: 0 }}>Awaiting administrator response...</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
