import React, { useEffect, useState } from 'react';
import { messageService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function Inbox({ onSelectConversation }) {
    const { colors } = useTheme();
    const [conversations, setConversations] = useState([]);

    useEffect(() => { messageService.getMyConversations().then(res => setConversations(res.data.data || [])).catch(()=>{}); }, []);

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: 0, color: colors.text }}>Inbox</h4>
            <div style={{ marginTop: 8 }}>
                {conversations.map(c => (
                    <div key={c._id} style={{ padding: 8, borderRadius: 8, background: colors.bgInput, border: `1px solid ${colors.border}`, marginTop: 8, cursor: 'pointer' }} onClick={()=>onSelectConversation(c)}>
                        <div style={{ fontWeight: 800, color: colors.text }}>{c.title || (c.participants||[]).map(p=>p.userRef).join(', ')}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{new Date(c.updatedAt).toLocaleString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
