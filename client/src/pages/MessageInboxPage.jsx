import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messageService, userService } from '../services/api';
import Sidebar from '../components/Sidebar';

export default function MessageInboxPage() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    
    // For creating new message
    const [showNewMsgMenu, setShowNewMsgMenu] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    const getOtherParticipant = (convo) => (convo.participants || []).find(p => (p.userRef?._id || p.userRef) !== (user?.id || user?._id));
    const getConvoTitle = (convo) => convo.title || getOtherParticipant(convo)?.userRef?.fullName || 'Conversation';
    const getConvoRole = (convo) => getOtherParticipant(convo)?.userRef?.assignedRole || '';

    const navItems = [
        { label: 'Dashboard', path: `/${user?.assignedRole.toLowerCase()}/dashboard`, key: 'dashboard' },
        { label: 'Direct Messages', path: '/messages', key: 'messages' },
        { label: 'Live Sessions', path: '/live-sessions', key: 'live' }
    ];

    useEffect(() => {
        fetchConversations();
        userService.getAll({ limit: 100 }).then(res => setAllUsers(res.data.data));
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await messageService.getConversations();
            setConversations(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadMessages = async (convo) => {
        setActiveConvo(convo);
        try {
            const res = await messageService.getMessagesRaw(convo._id);
            setMessages(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const other = getOtherParticipant(activeConvo);
        const receiverId = other?.userRef?._id || other?.userRef;
        if (!receiverId) {
            alert('No recipient available for this conversation');
            return;
        }

        try {
            const res = await messageService.sendMessageDirect({ receiverId, body: newMessage });
            setMessages([...messages, res.data.data]);
            setNewMessage('');
            fetchConversations(); // refresh sidebar to update last message
        } catch {
            alert('Failed to send message');
        }
    };

    const handleStartNew = async (receiverId) => {
        setShowNewMsgMenu(false);
        try {
            await messageService.sendMessageDirect({ receiverId, body: 'Hello!' });
            fetchConversations();
        } catch {
            alert('Failed to start conversation');
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: colors.bg, overflow: 'hidden' }}>
            <Sidebar navItems={navItems} activeTab="messages" />
            
            <main style={{ marginLeft: '260px', flex: 1, display: 'flex' }}>
                {/* Inbox Sidebar */}
                <div style={{ width: '350px', background: colors.bgCard, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', margin: 0 }}>Inbox</h2>
                        <button onClick={() => setShowNewMsgMenu(!showNewMsgMenu)} style={{ background: colors.primary, color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>

                    {showNewMsgMenu && (
                        <div style={{ padding: '16px', background: colors.bgInput, borderBottom: `1px solid ${colors.border}` }}>
                            <div style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px', fontWeight: '700' }}>Start conversation with:</div>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {allUsers.filter(u => u._id !== (user?.id || user?._id)).map(u => (
                                    <div key={u._id} onClick={() => handleStartNew(u._id)} style={{ padding: '8px', color: colors.text, cursor: 'pointer', borderRadius: '4px', background: colors.bgCard, fontSize: '14px', border: `1px solid ${colors.border}` }}>
                                        {u.fullName} <span style={{ color: colors.textMuted, fontSize: '11px' }}>({u.assignedRole})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {conversations.length === 0 ? <div style={{ padding: '24px', color: colors.textMuted }}>No conversations yet.</div> : (
                            conversations.map(convo => {
                                const isActive = activeConvo?._id === convo._id;
                                return (
                                    <div key={convo._id} onClick={() => loadMessages(convo)} style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, background: isActive ? colors.bgInput : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #22c55e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', flexShrink: 0 }}>
                                                {getConvoTitle(convo)?.[0]}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                                    <span style={{ color: colors.text, fontWeight: '700', fontSize: '16px' }}>{getConvoTitle(convo)}</span>
                                                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>{convo.lastMessageAt ? new Date(convo.lastMessageAt).toLocaleDateString() : ''}</span>
                                                </div>
                                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {convo.lastMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.bg }}>
                    {activeConvo ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}`, background: colors.bgCard, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #22c55e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800' }}>
                                    {getConvoTitle(activeConvo)?.[0]}
                                </div>
                                <div>
                                    <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>{getConvoTitle(activeConvo)}</h2>
                                    <div style={{ color: colors.primary, fontSize: '12px', fontWeight: '600' }}>{getConvoRole(activeConvo)}</div>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {messages.map(msg => {
                                    const isMe = msg.senderRef === (user?.id || user?._id);
                                    return (
                                        <div key={msg._id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '60%' }}>
                                            <div style={{ background: isMe ? colors.primary : colors.bgCard, color: isMe ? '#fff' : colors.text, padding: '12px 16px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '15px', lineHeight: 1.5, border: isMe ? 'none' : `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                {msg.body}
                                            </div>
                                            <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '6px', textAlign: isMe ? 'right' : 'left' }}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Chat Input */}
                            <form onSubmit={handleSend} style={{ padding: '24px', background: colors.bgCard, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '16px' }}>
                                <input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Write a message..."
                                    style={{ flex: 1, background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '16px 20px', borderRadius: '12px', fontSize: '15px', outline: 'none' }}
                                />
                                <button type="submit" style={{ background: colors.primary, color: '#fff', border: 'none', padding: '0 32px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}>
                                    Send
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '16px' }}>
                            Select a conversation to start messaging
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
