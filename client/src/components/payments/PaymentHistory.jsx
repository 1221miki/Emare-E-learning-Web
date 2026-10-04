import React, { useEffect, useState } from 'react';
import { paymentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function PaymentHistory() {
    const { colors } = useTheme();
    const [history, setHistory] = useState([]);

    useEffect(() => { paymentService.history().then(res=>setHistory(res.data.data||[])).catch(()=>{}); }, []);

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: 0, color: colors.text }}>Payment History</h4>
            <div style={{ marginTop: 8 }}>
                {history.length === 0 ? <div style={{ color: colors.textMuted }}>No transactions yet.</div> : history.map(h => (
                    <div key={h._id} style={{ padding: 8, borderRadius: 8, background: colors.bgInput, border: `1px solid ${colors.border}`, marginTop: 8 }}>
                        <div style={{ fontWeight: 800 }}>{h.amount} {h.currency}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{new Date(h.createdAt).toLocaleString()} • {h.status}</div>
                        <div style={{ marginTop: 6 }}><a href={`/student/payments/invoice/${h._id}`} style={{ color: colors.primary, fontWeight: 800 }}>Invoice</a></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
