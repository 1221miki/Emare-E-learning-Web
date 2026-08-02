import React, { useEffect, useState } from 'react';
import { messageService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function NotificationsPanel() {
    const { colors } = useTheme();
    const [notes, setNotes] = useState([]);

    useEffect(() => { messageService.getMyNotifications().then(res=>setNotes(res.data.data||[])).catch(()=>{}); }, []);

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: 0, color: colors.text }}>Notifications</h4>
            <div style={{ marginTop: 8 }}>
                {notes.map(n => (
                    <div key={n._id} style={{ padding: 8, borderRadius: 8, background: n.read ? colors.bgInput : `${colors.primary}0F`, border: `1px solid ${colors.border}`, marginTop: 8 }}>
                        <div style={{ fontWeight: 800, color: colors.text }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{n.body}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
