import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function ConversationView({ conversation }) {
    const { colors } = useTheme();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const endRef = useRef(null);

    useEffect(() => { if (!conversation) return; messageService.getMessages(conversation._id).then(res=>setMessages(res.data.data||[])).catch(()=>{}); }, [conversation]);

    const send = async () => {
        if (!text.trim()) return;
        await messageService.sendMessage(conversation._id, { body: text });
        setText('');
        const res = await messageService.getMessages(conversation._id);
        setMessages(res.data.data || []);
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {messages.map(m => (
                    <div key={m._id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{m.senderRef}</div>
                        <div style={{ background: colors.bgInput, padding: 8, borderRadius: 8 }}>{m.body}</div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
            <div style={{ padding: 8, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message" style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${colors.border}` }} />
                    <button onClick={send} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8 }}>Send</button>
                </div>
            </div>
        </div>
    );
}
