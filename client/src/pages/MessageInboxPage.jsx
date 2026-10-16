import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messageService, userService } from '../services/api';
import {
    initSocket,
    joinConversationRoom,
    leaveConversationRoom,
    onNewMessage,
    offNewMessage,
    onDirectMessage,
    offDirectMessage,
    onConversationUpdated,
    offConversationUpdated
} from '../services/socket';
import Sidebar from '../components/Sidebar';
import {
    LayoutDashboard, BookOpen, Users, Video, BarChart3,
    MessagesSquare, Star, Settings, ShieldCheck, Wallet,
    Megaphone, ClipboardCheck, Clock3, Award, GraduationCap,
    CreditCard, MessageSquare, Code2, Inbox
} from 'lucide-react';

export default function MessageInboxPage() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [notification, setNotification] = useState(null); // { type: 'error' | 'success' | 'info', message: string }
    
    // For creating new message
    const [showNewMsgMenu, setShowNewMsgMenu] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    const messagesEndRef = useRef(null);
    const myId = (user?.id || user?._id)?.toString();

    const showNotification = useCallback((message, type = 'error') => {
        setNotification({ message, type });
    }, []);

    // Auto-dismiss notification after 4s
    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(timer);
    }, [notification]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 60);
    };

    const getOtherParticipant = useCallback((convo) => {
        if (!convo || !convo.participants) return null;
        const other = convo.participants.find(p => {
            const pid = (p.userRef?._id || p.userRef)?.toString();
            return pid && pid !== myId;
        });
        return other || null;
    }, [myId]);

    const getConvoTitle = useCallback((convo) => {
        if (!convo) return 'Conversation';
        if (convo.title) return convo.title;
        if (convo.displayTitle) return convo.displayTitle;
        const other = getOtherParticipant(convo);
        if (other?.userRef?.fullName) return other.userRef.fullName;
        if (convo.otherParticipant?.fullName) return convo.otherParticipant.fullName;
        return 'Unavailable User';
    }, [getOtherParticipant]);

    const getConvoRole = useCallback((convo) => {
        if (!convo) return '';
        if (convo.displayRole) return convo.displayRole;
        const other = getOtherParticipant(convo);
        if (other?.userRef?.assignedRole) return other.userRef.assignedRole;
        if (convo.otherParticipant?.assignedRole) return convo.otherParticipant.assignedRole;
        return '';
    }, [getOtherParticipant]);

    const isRecipientAvailable = useCallback((convo) => {
        if (!convo) return false;
        if (convo.isRecipientAvailable !== undefined) return convo.isRecipientAvailable;
        const other = getOtherParticipant(convo);
        const receiverId = (other?.userRef?._id || other?.userRef)?.toString() || convo.otherParticipant?._id;
        return Boolean(receiverId && other?.userRef?.fullName !== 'Unavailable User');
    }, [getOtherParticipant]);

    // Full role-based navigation so the user can see all their workspace items while messaging
    const navItems = useMemo(() => {
        const role = user?.assignedRole;
        if (role === 'Instructor') {
            return [
                { key: 'overview', label: 'Dashboard', path: '/instructor/dashboard', state: { activeTab: 'overview' }, icon: <LayoutDashboard size={20} /> },
                { key: 'courses', label: 'My Courses', path: '/instructor/dashboard', state: { activeTab: 'courses' }, icon: <BookOpen size={20} /> },
                { key: 'students', label: 'Students', path: '/instructor/dashboard', state: { activeTab: 'students' }, icon: <Users size={20} /> },
                { key: 'live', label: 'Live Classes', path: '/instructor/dashboard', state: { activeTab: 'live' }, icon: <Video size={20} /> },
                { key: 'analytics', label: 'Analytics', path: '/instructor/dashboard', state: { activeTab: 'analytics' }, icon: <BarChart3 size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', state: { activeTab: 'messages' }, icon: <MessagesSquare size={20} /> },
                { key: 'reviews', label: 'Reviews', path: '/instructor/dashboard', state: { activeTab: 'reviews' }, icon: <Star size={20} /> },
                { key: 'settings', label: 'Settings', path: '/instructor/settings', state: { activeTab: 'settings' }, icon: <Settings size={20} /> }
            ];
        }
        if (role === 'Admin') {
            return [
                { key: 'overview', label: 'Overview', path: '/admin/dashboard', state: { activeTab: 'overview' }, icon: <LayoutDashboard size={20} /> },
                { key: 'users', label: 'User Management', path: '/admin/dashboard', state: { activeTab: 'users' }, icon: <Users size={20} /> },
                { key: 'security', label: 'Security & Roles', path: '/admin/dashboard', state: { activeTab: 'security' }, icon: <ShieldCheck size={20} /> },
                { key: 'courses', label: 'Course Management', path: '/admin/dashboard', state: { activeTab: 'courses' }, icon: <BookOpen size={20} /> },
                { key: 'analytics', label: 'Analytics Dashboard', path: '/admin/dashboard', state: { activeTab: 'analytics' }, icon: <BarChart3 size={20} /> },
                { key: 'finances', label: 'Finances & Revenue', path: '/admin/dashboard', state: { activeTab: 'finances' }, icon: <Wallet size={20} /> },
                { key: 'cms', label: 'CMS & Comms', path: '/admin/dashboard', state: { activeTab: 'cms' }, icon: <Megaphone size={20} /> },
                { key: 'audit', label: 'Audit Logs', path: '/admin/audit-logs', icon: <ClipboardCheck size={20} /> },
                { key: 'contact-messages', label: 'Contact Messages', path: '/admin/contact-messages', icon: <Inbox size={20} /> },
                { key: 'messages', label: 'Direct Messages', path: '/messages', state: { activeTab: 'messages' }, icon: <MessagesSquare size={20} /> },
                { key: 'developers', label: 'Developers', path: '/admin/dashboard', state: { activeTab: 'developers' }, icon: <Code2 size={20} /> },
                { key: 'calendar', label: 'Event Management', path: '/admin/dashboard', state: { activeTab: 'calendar' }, icon: <Clock3 size={20} /> },
                { key: 'system', label: 'System Settings', path: '/admin/dashboard', state: { activeTab: 'system' }, icon: <Settings size={20} /> }
            ];
        }
        // Student / Default
        return [
            { key: 'overview', label: 'Overview', path: '/student/dashboard', state: { activeTab: 'overview' }, icon: <LayoutDashboard size={20} /> },
            { key: 'learning', label: 'My Learning', path: '/student/dashboard?tab=my_courses', state: { activeTab: 'learning' }, icon: <GraduationCap size={20} /> },
            { key: 'live', label: 'Live Sessions', path: '/live-sessions', state: { activeTab: 'live' }, icon: <Video size={20} /> },
            { key: 'discussions', label: 'Discussions', path: '/student/dashboard?tab=discussions', state: { activeTab: 'discussions' }, icon: <MessageSquare size={20} /> },
            { key: 'messages', label: 'Messages', path: '/messages', state: { activeTab: 'messages' }, icon: <MessagesSquare size={20} /> },
            { key: 'certificates', label: 'Certificates', path: '/student/certificates', icon: <Award size={20} /> },
            { key: 'payments', label: 'Payments', path: '/student/dashboard?tab=payments', state: { activeTab: 'payments' }, icon: <CreditCard size={20} /> },
            { key: 'settings', label: 'Settings', path: '/student/profile', icon: <Settings size={20} /> }
        ];
    }, [user?.assignedRole]);

    const handleTabChange = useCallback((key) => {
        if (key === 'messages') return;
        const role = user?.assignedRole;
        if (role === 'Instructor') {
            if (key === 'settings') {
                navigate('/instructor/settings');
            } else {
                navigate('/instructor/dashboard', { state: { activeTab: key } });
            }
        } else if (role === 'Admin') {
            if (key === 'audit') {
                navigate('/admin/audit-logs');
            } else if (key === 'contact-messages') {
                navigate('/admin/contact-messages');
            } else {
                navigate('/admin/dashboard', { state: { activeTab: key } });
            }
        } else {
            if (key === 'certificates') {
                navigate('/student/certificates');
            } else if (key === 'live') {
                navigate('/live-sessions');
            } else if (key === 'learning') {
                navigate('/student/dashboard?tab=my_courses', { state: { activeTab: 'learning' } });
            } else if (key === 'discussions') {
                navigate('/student/dashboard?tab=discussions', { state: { activeTab: 'discussions' } });
            } else if (key === 'payments') {
                navigate('/student/dashboard?tab=payments', { state: { activeTab: 'payments' } });
            } else if (key === 'settings') {
                navigate('/student/profile');
            } else {
                navigate('/student/dashboard', { state: { activeTab: key } });
            }
        }
    }, [user?.assignedRole, navigate]);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await messageService.getConversations();
            const convs = res.data.data || [];
            setConversations(convs);
            // If activeConvo is selected, keep it updated with fresh metadata
            setActiveConvo(prevActive => {
                if (!prevActive) return null;
                const fresh = convs.find(c => c._id === prevActive._id);
                return fresh ? { ...prevActive, ...fresh } : prevActive;
            });
        } catch (err) {
            console.error('fetchConversations error:', err);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        userService.getAll({ limit: 100 })
            .then(res => setAllUsers(res.data.data || []))
            .catch(() => setAllUsers([]));
    }, [fetchConversations]);

    // Socket initialization and real-time listeners
    useEffect(() => {
        const token = localStorage.getItem('elms_token');
        if (token) {
            initSocket(token);
        }

        const handleIncomingMessage = (data) => {
            if (!data?.message) return;
            const incomingMsg = data.message;
            const incomingConvoId = (data.conversationId || incomingMsg.conversationRef?._id || incomingMsg.conversationRef)?.toString();

            setActiveConvo(currentConvo => {
                if (currentConvo && currentConvo._id?.toString() === incomingConvoId) {
                    setMessages(prev => {
                        if (prev.some(m => m._id === incomingMsg._id)) return prev;
                        return [...prev, incomingMsg];
                    });
                    scrollToBottom();
                }
                return currentConvo;
            });

            fetchConversations();
        };

        const handleConvoUpdate = () => {
            fetchConversations();
        };

        onNewMessage(handleIncomingMessage);
        onDirectMessage(handleIncomingMessage);
        onConversationUpdated(handleConvoUpdate);

        return () => {
            offNewMessage(handleIncomingMessage);
            offDirectMessage(handleIncomingMessage);
            offConversationUpdated(handleConvoUpdate);
        };
    }, [fetchConversations]);

    // Join room when active conversation changes
    useEffect(() => {
        if (activeConvo?._id) {
            joinConversationRoom(activeConvo._id);
            return () => {
                leaveConversationRoom(activeConvo._id);
            };
        }
    }, [activeConvo?._id]);

    const loadMessages = async (convo) => {
        setActiveConvo(convo);
        try {
            const res = await messageService.getMessagesRaw(convo._id);
            setMessages(res.data.data || []);
            scrollToBottom();
        } catch (err) {
            console.error('loadMessages error:', err);
            showNotification('Failed to load messages for this conversation', 'error');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || !activeConvo || sending) return;

        const other = getOtherParticipant(activeConvo);
        const receiverId = (other?.userRef?._id || other?.userRef)?.toString() || activeConvo.otherParticipant?._id;

        if (!receiverId || !isRecipientAvailable(activeConvo)) {
            showNotification('No active recipient available for this conversation. Messaging is disabled.', 'error');
            return;
        }

        setSending(true);
        try {
            const res = await messageService.sendMessageDirect({
                conversationId: activeConvo._id,
                receiverId,
                body: text
            });

            const savedMsg = res.data.data;
            setMessages(prev => {
                if (prev.some(m => m._id === savedMsg._id)) return prev;
                return [...prev, savedMsg];
            });
            setNewMessage('');
            scrollToBottom();
            fetchConversations();
        } catch (err) {
            const errMsg = err?.response?.data?.message || 'Failed to send message. Please try again.';
            showNotification(errMsg, 'error');
        } finally {
            setSending(false);
        }
    };

    const handleStartNew = async (receiverId) => {
        setShowNewMsgMenu(false);
        try {
            const res = await messageService.sendMessageDirect({ receiverId, body: 'Hello!' });
            await fetchConversations();
            if (res.data?.conversationId) {
                const newConvoRes = await messageService.getConversations();
                const found = (newConvoRes.data.data || []).find(c => c._id === res.data.conversationId);
                if (found) {
                    loadMessages(found);
                }
            }
            showNotification('Conversation started successfully!', 'success');
        } catch (err) {
            const errMsg = err?.response?.data?.message || 'Failed to start conversation';
            showNotification(errMsg, 'error');
        }
    };

    const recipientAvailable = activeConvo ? isRecipientAvailable(activeConvo) : false;

    return (
        <div style={{ display: 'flex', height: '100vh', background: colors.bg, overflow: 'hidden' }}>
            <Sidebar
                navItems={navItems}
                activeTab="messages"
                onTabChange={handleTabChange}
                forceExpanded={true}
            />
            
            {/* Styled Notification Banner */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9999,
                    background: notification.type === 'error' ? '#ef4444' : (notification.type === 'success' ? '#22c55e' : colors.primary),
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    fontWeight: '600'
                }}>
                    <span>{notification.message}</span>
                    <button
                        onClick={() => setNotification(null)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}
                        aria-label="Close notification"
                    >×</button>
                </div>
            )}

            <main style={{ marginLeft: 'var(--sidebar-width, 270px)', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>
                {/* Inbox Sidebar */}
                <div style={{ width: '350px', background: colors.bgCard, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', margin: 0 }}>Inbox</h2>
                        <button 
                            onClick={() => setShowNewMsgMenu(!showNewMsgMenu)} 
                            style={{ background: colors.primary, color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            aria-label="New Message"
                        >+</button>
                    </div>

                    {showNewMsgMenu && (
                        <div style={{ padding: '16px', background: colors.bgInput, borderBottom: `1px solid ${colors.border}` }}>
                            <div style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px', fontWeight: '700' }}>Start conversation with:</div>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {allUsers.filter(u => u._id !== myId).map(u => (
                                    <div key={u._id} onClick={() => handleStartNew(u._id)} style={{ padding: '8px', color: colors.text, cursor: 'pointer', borderRadius: '4px', background: colors.bgCard, fontSize: '14px', border: `1px solid ${colors.border}` }}>
                                        {u.fullName} <span style={{ color: colors.textMuted, fontSize: '11px' }}>({u.assignedRole})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {conversations.length === 0 ? (
                            <div style={{ padding: '24px', color: colors.textMuted, textAlign: 'center' }}>No conversations yet.</div>
                        ) : (
                            conversations.map(convo => {
                                const isActive = activeConvo?._id === convo._id;
                                const title = getConvoTitle(convo);
                                const available = isRecipientAvailable(convo);
                                return (
                                    <div 
                                        key={convo._id} 
                                        onClick={() => loadMessages(convo)} 
                                        style={{ 
                                            padding: '20px 24px', 
                                            borderBottom: `1px solid ${colors.border}`, 
                                            background: isActive ? colors.bgInput : 'transparent', 
                                            cursor: 'pointer', 
                                            transition: 'background 0.2s',
                                            opacity: available ? 1 : 0.75
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ 
                                                width: '48px', 
                                                height: '48px', 
                                                borderRadius: '50%', 
                                                background: available ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#6b7280', 
                                                color: '#fff', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                fontSize: '20px', 
                                                fontWeight: '800', 
                                                flexShrink: 0 
                                            }}>
                                                {title?.[0] || '?'}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                                    <span style={{ color: colors.text, fontWeight: '700', fontSize: '16px' }}>{title}</span>
                                                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>{convo.lastMessageAt ? new Date(convo.lastMessageAt).toLocaleDateString() : ''}</span>
                                                </div>
                                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {convo.lastMessage || 'No messages yet'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
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
                                <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    background: recipientAvailable ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#6b7280', 
                                    color: '#fff', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '16px', 
                                    fontWeight: '800' 
                                }}>
                                    {getConvoTitle(activeConvo)?.[0] || '?'}
                                </div>
                                <div>
                                    <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>
                                        {getConvoTitle(activeConvo)}
                                    </h2>
                                    <div style={{ color: recipientAvailable ? colors.primary : '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                                        {recipientAvailable ? getConvoRole(activeConvo) : 'Recipient Unavailable'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {messages.map(msg => {
                                    const senderId = (msg.senderRef?._id || msg.senderRef)?.toString();
                                    const isMe = senderId === myId;
                                    return (
                                        <div key={msg._id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '60%' }}>
                                            <div style={{ 
                                                background: isMe ? colors.primary : colors.bgCard, 
                                                color: isMe ? '#fff' : colors.text, 
                                                padding: '12px 16px', 
                                                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', 
                                                fontSize: '15px', 
                                                lineHeight: 1.5, 
                                                border: isMe ? 'none' : `1px solid ${colors.border}`, 
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                                            }}>
                                                {msg.body}
                                            </div>
                                            <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '6px', textAlign: isMe ? 'right' : 'left' }}>
                                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Unavailable Recipient Banner */}
                            {!recipientAvailable && (
                                <div style={{ 
                                    padding: '12px 16px', 
                                    margin: '0 24px 16px', 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                                    borderRadius: '10px', 
                                    color: '#ef4444', 
                                    fontSize: '13px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                }}>
                                    <span>⚠️</span>
                                    <span>This user account is no longer available. Message history is preserved, but new messages cannot be sent.</span>
                                </div>
                            )}

                            {/* Chat Input */}
                            <form onSubmit={handleSend} style={{ padding: '24px', background: colors.bgCard, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '16px' }}>
                                <input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder={recipientAvailable ? "Write a message..." : "Messaging disabled for inactive recipient"}
                                    disabled={!recipientAvailable || sending}
                                    style={{ 
                                        flex: 1, 
                                        background: colors.bgInput, 
                                        border: `1px solid ${colors.border}`, 
                                        color: colors.text, 
                                        padding: '16px 20px', 
                                        borderRadius: '12px', 
                                        fontSize: '15px', 
                                        outline: 'none',
                                        opacity: recipientAvailable ? 1 : 0.6
                                    }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!recipientAvailable || sending || !newMessage.trim()}
                                    style={{ 
                                        background: recipientAvailable ? colors.primary : '#6b7280', 
                                        color: '#fff', 
                                        border: 'none', 
                                        padding: '0 32px', 
                                        borderRadius: '12px', 
                                        fontWeight: '800', 
                                        cursor: recipientAvailable && !sending ? 'pointer' : 'not-allowed', 
                                        fontSize: '15px',
                                        opacity: recipientAvailable && !sending && newMessage.trim() ? 1 : 0.6
                                    }}
                                >
                                    {sending ? 'Sending...' : 'Send'}
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
