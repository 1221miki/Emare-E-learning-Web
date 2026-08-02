import React, { useState, useEffect, useRef, useCallback } from 'react';
import { messageService, notificationService, discussionService, aiService } from '../../../services/api';

const WARN = '#f59e0b';
const DANGER = '#ef4444';

const TYPE_META = {
    assignment: { icon: '📝', color: WARN },
    quiz: { icon: '🧩', color: '#8b5cf6' },
    grade: { icon: '🏅', color: '#10b981' },
    enrollment: { icon: '📚', color: '#3b82f6' },
    payment: { icon: '💳', color: '#10b981' },
    certificate: { icon: '🎓', color: '#f59e0b' },
    announcement: { icon: '📢', color: '#ef4444' },
    badge: { icon: '🏆', color: '#8b5cf6' },
    review: { icon: '⭐', color: '#f59e0b' },
    system: { icon: '⚙️', color: '#64748b' },
    default: { icon: '🔔', color: '#3b82f6' }
};

export default function MessagesTab(dash) {
    const { user, colors, styles, enrollments } = dash;
    const uid = String(user?._id || user?.id || '');

    const [section, setSection] = useState('inbox');
    const [conversations, setConversations] = useState([]);
    const [convsLoading, setConvsLoading] = useState(true);
    const [activeConv, setActiveConv] = useState(null);
    const [thread, setThread] = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');

    const [sentLoading, setSentLoading] = useState(false);
    const [sentList, setSentList] = useState([]);

    const [notifs, setNotifs] = useState([]);
    const [notifLoading, setNotifLoading] = useState(true);

    const [discCourse, setDiscCourse] = useState('');
    const [discussions, setDiscussions] = useState([]);
    const [discLoading, setDiscLoading] = useState(false);
    const [expandedDisc, setExpandedDisc] = useState(null);
    const [replyDrafts, setReplyDrafts] = useState({});
    const [discMsg, setDiscMsg] = useState('');

    const [aiConvos, setAiConvos] = useState([]);
    const [activeAiConv, setActiveAiConv] = useState(null);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const threadEndRef = useRef(null);

    const getOther = useCallback((conv) => (conv.participants || []).find(p => (p.userRef?._id || p.userRef) !== uid), [uid]);
    const convTitle = useCallback((conv) => conv.title || getOther(conv)?.userRef?.fullName || 'Conversation', [getOther]);
    const convRole = useCallback((conv) => getOther(conv)?.userRef?.assignedRole || '', [getOther]);

    const scrollToBottom = () => setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

    const loadConversations = useCallback(async () => {
        setConvsLoading(true);
        try {
            const res = await messageService.getConversations();
            setConversations(res.data.data || []);
        } catch {
            setConversations([]);
        } finally {
            setConvsLoading(false);
        }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    useEffect(() => {
        notificationService.getAll()
            .then(res => setNotifs(res.data.data || []))
            .catch(() => setNotifs([]))
            .finally(() => setNotifLoading(false));
    }, []);

    useEffect(() => {
        if (!enrollments?.length) return;
        const c = enrollments[0]?.courseRef?._id || enrollments[0]?.courseRef;
        if (c) setDiscCourse(c);
    }, [enrollments]);

    useEffect(() => {
        if (!discCourse) return;
        setDiscLoading(true);
        setDiscussions([]);
        setExpandedDisc(null);
        discussionService.getByCourse(discCourse)
            .then(res => setDiscussions(res.data.data || []))
            .catch(() => setDiscussions([]))
            .finally(() => setDiscLoading(false));
    }, [discCourse]);

    useEffect(() => {
        if (!activeConv) return;
        setThreadLoading(true);
        messageService.getMessagesRaw(activeConv._id)
            .then(res => setThread(res.data.data || []))
            .catch(() => setThread([]))
            .finally(() => setThreadLoading(false));
        scrollToBottom();
    }, [activeConv]);

    const loadSent = async () => {
        if (!conversations.length) return;
        setSentLoading(true);
        const convs = conversations.slice(0, 15);
        const results = await Promise.allSettled(convs.map(c => messageService.getMessagesRaw(c._id)));
        const sent = [];
        results.forEach((r, i) => {
            if (r.status !== 'fulfilled') return;
            const msgs = r.value?.data?.data || [];
            msgs.forEach(m => {
                if (String(m.senderRef) === uid) sent.push({ ...m, conv: conversations[i] });
            });
        });
        setSentList(sent);
        setSentLoading(false);
    };

    useEffect(() => { if (section === 'sent' && !sentList.length) loadSent(); }, [section, conversations, sentList.length]);

    const openThread = async (conv) => {
        setActiveConv(conv);
    };

    const handleSend = async () => {
        if (!draft.trim() || !activeConv) return;
        const other = getOther(activeConv);
        const receiverId = other?.userRef?._id || other?.userRef;
        if (!receiverId) return;
        setSending(true);
        try {
            const res = await messageService.sendMessageDirect({ receiverId, body: draft });
            const msg = res.data.data || { _id: Date.now(), body: draft, senderRef: uid, createdAt: new Date().toISOString() };
            setThread(prev => [...prev, msg]);
            setDraft('');
            loadConversations();
            scrollToBottom();
        } catch {
            setDraft('');
        } finally {
            setSending(false);
        }
    };

    const markNotifRead = async (id) => {
        setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n));
        try { await notificationService.markAsRead(id); } catch { /* non-fatal */ }
    };

    const markAllNotifsRead = async () => {
        setNotifs(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
        try { await notificationService.markAllAsRead(); } catch { /* non-fatal */ }
    };

    const openAiConv = async (convId) => {
        setActiveAiConv(convId);
        setAiConvos(prev => prev.map(c => c.conversationId === convId ? { ...c, expanded: true } : c));
        try {
            const res = await aiService.getHistory(convId ? { conversationId: convId } : undefined);
            const hist = res.data.data || [];
            const mapped = hist.map(h => ({ id: h._id, role: 'user', body: h.question, createdAt: h.createdAt }));
            const mappedAnswers = hist.map(h => ({ id: (h._id || '') + 'a', role: 'ai', body: h.answer, createdAt: h.createdAt }));
            setThread(mapped.reduce((acc, m, i) => { acc.push(m); if (mappedAnswers[i]) acc.push(mappedAnswers[i]); return acc; }, []));
        } catch {
            setThread([]);
        }
    };

    useEffect(() => {
        aiService.getHistory()
            .then(res => {
                const hist = res.data.data || [];
                const grouped = {};
                hist.forEach(h => {
                    const key = h.conversationId || 'default';
                    if (!grouped[key]) grouped[key] = { conversationId: key, title: h.conversationTitle || 'AI Tutor Chat', count: 0, last: h.createdAt };
                    grouped[key].count += 1;
                    grouped[key].last = h.createdAt;
                });
                const convs = Object.values(grouped).map(c => ({ ...c, expanded: false }));
                setAiConvos(convs);
            })
            .catch(() => setAiConvos([]));
    }, []);

    useEffect(() => { if (activeAiConv) openAiConv(activeAiConv); }, [activeAiConv]);

    const handleAiSend = async () => {
        if (!aiInput.trim() || aiLoading) return;
        const q = aiInput.trim();
        setAiInput('');
        setAiLoading(true);
        setThread(prev => [...prev, { id: Date.now(), role: 'user', body: q, createdAt: new Date().toISOString() }]);
        try {
            const res = await aiService.askQuestion({ question: q, courseContext: {} });
            const ans = res.data?.data || {};
            setThread(prev => [...prev, { id: (ans.timestamp || Date.now()) + 'a', role: 'ai', body: ans.answer, createdAt: ans.timestamp }]);
            if (ans.conversationId) {
                setAiConvos(prev => {
                    const exists = prev.some(c => c.conversationId === ans.conversationId);
                    if (!exists) return [{ conversationId: ans.conversationId, title: ans.conversationTitle || 'AI Tutor Chat', count: 1, last: ans.timestamp, expanded: true }, ...prev];
                    return prev.map(c => c.conversationId === ans.conversationId ? { ...c, count: c.count + 1, last: ans.timestamp } : c);
                });
                setActiveAiConv(ans.conversationId);
            }
            scrollToBottom();
        } catch {
            setThread(prev => [...prev, { id: Date.now(), role: 'ai', body: 'Sorry, the AI tutor could not answer right now. Please try again.', createdAt: new Date().toISOString() }]);
        } finally {
            setAiLoading(false);
        }
    };

    const filteredConvs = conversations.filter(c => {
        if (search && !convTitle(c).toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const sections = [
        { key: 'inbox', label: '📥 Inbox' },
        { key: 'sent', label: '📤 Sent Messages' },
        { key: 'discussions', label: '💬 Course Discussions' },
        { key: 'notifications', label: '🔔 Notification Center' },
        { key: 'ai', label: '🤖 AI Tutor' }
    ];

    const chatHeader = (title, role) => (
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, background: colors.bgCard, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', flexShrink: 0 }}>
                {title?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ color: colors.text, fontSize: '16px', fontWeight: '700' }}>{title}</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>{role || 'Connected'}</div>
            </div>
            <button onClick={() => { setActiveConv(null); setThread([]); setActiveAiConv(null); }} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>✕ Close</button>
        </div>
    );

    const chatInput = (value, setValue, onSend, loading, placeholder) => (
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, background: colors.bgCard, display: 'flex', gap: '10px' }}>
            <input
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                placeholder={placeholder}
                style={{ flex: 1, background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '12px 16px', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
            />
            <button onClick={onSend} disabled={loading || !value.trim()} style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: '700', cursor: 'pointer', opacity: loading || !value.trim() ? 0.6 : 1 }}>
                {loading ? '...' : 'Send'}
            </button>
        </div>
    );

    const messageBubble = (msg) => {
        const isMe = String(msg.senderRef) === uid || msg.role === 'user';
        return (
            <div key={msg._id || msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '72%' }}>
                    <div style={{ background: isMe ? `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` : colors.bgCard, color: isMe ? '#fff' : colors.text, padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: '14px', lineHeight: 1.5, border: isMe ? 'none' : `1px solid ${colors.border}`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.body}
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        {isMe && <span style={{ marginLeft: '6px' }}>✓</span>}
                    </div>
                </div>
            </div>
        );
    };

    const renderInbox = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', height: '620px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                    <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 12px' }}>Inbox <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: '500' }}>({filteredConvs.length})</span></h3>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search conversations..." style={{ width: '100%', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {convsLoading ? <div style={{ padding: '24px', color: colors.textMuted, fontSize: '13px' }}>Loading conversations...</div> : filteredConvs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: colors.textMuted, fontSize: '13px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                            {search ? 'No conversations match your search.' : 'No conversations yet. Instructors and support will appear here.'}
                        </div>
                    ) : filteredConvs.map(conv => {
                        const active = activeConv?._id === conv._id;
                        const title = convTitle(conv);
                        return (
                            <div key={conv._id} onClick={() => openThread(conv)} style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, background: active ? `${colors.primary}10` : 'transparent', display: 'flex', gap: '12px', alignItems: 'center', transition: 'background 0.15s' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', flexShrink: 0 }}>
                                    {title?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ color: colors.text, fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                                        <span style={{ color: colors.textMuted, fontSize: '10px', flexShrink: 0, marginLeft: '8px' }}>{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: colors.textMuted, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessage || 'No messages yet'}</span>
                                        {convRole(conv) && <span style={{ color: colors.primary, fontSize: '9px', fontWeight: '700', flexShrink: 0 }}>{convRole(conv).toUpperCase()}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div style={{ background: colors.bg, borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activeConv ? (
                    <>
                        {chatHeader(convTitle(activeConv), `${convRole(activeConv)} · ${(activeConv.participants || []).length} participant(s)`)}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {threadLoading ? <div style={{ color: colors.textMuted, fontSize: '13px' }}>Loading messages...</div> : thread.length === 0 ? (
                                <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', padding: '40px' }}>No messages in this conversation yet. Say hello!</div>
                            ) : thread.map(messageBubble)}
                            <div ref={threadEndRef} />
                        </div>
                        {chatInput(draft, setDraft, handleSend, sending, 'Write a message...')}
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, gap: '12px' }}>
                        <div style={{ fontSize: '48px' }}>💬</div>
                        <p style={{ margin: 0, fontSize: '14px' }}>Select a conversation to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderSent = () => (
        <div style={styles.panelCard}>
            <h3 style={{ ...styles.panelCardTitle, fontSize: '16px' }}>Messages You've Sent</h3>
            {sentLoading ? <div style={{ color: colors.textMuted, fontSize: '13px' }}>Loading sent messages...</div> : sentList.length === 0 ? (
                <div style={styles.emptyContent}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📤</div>
                    <p style={styles.emptyText}>No sent messages yet. Send a message to an instructor or the support team from the Inbox tab.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sentList.slice().reverse().map(m => (
                        <div key={m._id} style={{ padding: '14px 16px', borderRadius: '10px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <span style={{ color: colors.primary, fontWeight: '700', fontSize: '13px' }}>To: {convTitle(m.conv)}</span>
                                    <span style={{ color: colors.textMuted, fontSize: '11px' }}>· {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</span>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#10b981' }}>✓ SENT</span>
                                </div>
                                <button onClick={() => { setActiveConv(m.conv); setSection('inbox'); openThread(m.conv); }} style={{ background: 'transparent', border: `1px solid ${colors.primary}`, color: colors.primary, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Reply in Thread</button>
                            </div>
                            <p style={{ color: colors.text, fontSize: '13px', margin: '8px 0 0' }}>{m.body}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderDiscussions = () => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>Course Forums & Classroom Discussions</h3>
                <select value={discCourse} onChange={e => setDiscCourse(e.target.value)} style={{ ...styles.select, width: '280px' }}>
                    {!enrollments?.length && <option value="">No enrolled courses</option>}
                    {enrollments.map(e => {
                        const cid = e.courseRef?._id || e.courseRef;
                        return <option key={cid} value={cid}>{e.courseRef?.courseTitle || 'Course'}</option>;
                    })}
                </select>
            </div>
            {discLoading ? <div style={{ color: colors.textMuted, fontSize: '13px' }}>Loading discussions...</div> : discussions.length === 0 ? (
                <div style={styles.emptyContent}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
                    <p style={styles.emptyText}>No discussions yet in this course. Check back when instructors or classmates post.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {discussions.map(d => (
                        <div key={d._id} style={{ ...styles.panelCard, margin: 0, padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ ...styles.courseBadge, margin: 0 }}>{d.category || 'General'}</span>
                                    {d.isPinned && <span style={{ fontSize: '11px', fontWeight: '800', color: WARN }}>📌 PINNED</span>}
                                    {d.isResolved && <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>✓ RESOLVED</span>}
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{d.authorRef?.fullName || 'User'}</span>
                                </div>
                                <button onClick={() => setExpandedDisc(expandedDisc === d._id ? null : d._id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.primary, borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                    {expandedDisc === d._id ? 'Collapse ▲' : `View (${d.replies?.length || 0}) ▼`}
                                </button>
                            </div>
                            <h4 style={{ color: colors.text, fontSize: '15px', fontWeight: '700', margin: '12px 0 6px' }}>{d.title}</h4>
                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 10px', lineHeight: 1.5 }}>{d.body}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: colors.textMuted, flexWrap: 'wrap' }}>
                                <span>{d.upvotes || 0} 👍 · {d.replies?.length || 0} replies · {new Date(d.createdAt).toLocaleDateString()}</span>
                                <button onClick={async () => { try { const res = await discussionService.upvote(d._id); setDiscussions(prev => prev.map(x => x._id === d._id ? { ...x, upvotes: res.data.data?.upvotes ?? (x.upvotes + 1) } : x)); } catch { /* ignore */ } }} style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>▲ Upvote</button>
                            </div>
                            {expandedDisc === d._id && (
                                <div style={{ marginTop: '16px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                                    {(d.replies || []).map(r => {
                                        const isBest = d.bestReplyId && String(d.bestReplyId) === String(r._id);
                                        return (
                                            <div key={r._id} style={{ padding: '12px 14px', borderRadius: '10px', background: isBest ? `${colors.success}10` : colors.bgInput, border: isBest ? `1px solid ${colors.success}40` : `1px solid ${colors.border}`, marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: colors.text, fontSize: '12px', fontWeight: '700' }}>{r.authorRef?.fullName || 'User'}</span>
                                                    <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        {isBest && <span style={{ fontSize: '10px', fontWeight: '800', color: colors.success }}>✓ HELPFUL ANSWER</span>}
                                                        <span style={{ fontSize: '11px', color: colors.textMuted }}>{new Date(r.createdAt).toLocaleString()}</span>
                                                    </span>
                                                </div>
                                                <p style={{ color: colors.text, fontSize: '13px', margin: '6px 0 0' }}>{r.body}</p>
                                            </div>
                                        );
                                    })}
                                    <textarea value={replyDrafts[d._id] || ''} onChange={e => setReplyDrafts({ ...replyDrafts, [d._id]: e.target.value })} placeholder="Write a reply..." rows="2" style={{ ...styles.input, width: '100%', resize: 'vertical', boxSizing: 'border-box', marginBottom: '8px' }} />
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button onClick={async () => {
                                            const body = (replyDrafts[d._id] || '').trim();
                                            if (!body) return;
                                            try {
                                                const res = await discussionService.addReply(d._id, body);
                                                setDiscussions(prev => prev.map(x => x._id === d._id ? res.data.data : x));
                                                setReplyDrafts({ ...replyDrafts, [d._id]: '' });
                                            } catch { setDiscMsg('Reply failed. Please try again.'); }
                                        }} style={{ ...styles.resumeBtn, padding: '8px 16px', fontSize: '12px' }}>Post Reply</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {discMsg && <div style={{ ...styles.successAlert, marginTop: '16px' }}>{discMsg}</div>}
        </div>
    );

    const renderNotifications = () => (
        <div style={styles.panelCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ ...styles.panelCardTitle, margin: 0 }}>Notification Center</h3>
                <button onClick={markAllNotifsRead} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.primary, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>✓ Mark All Read</button>
            </div>
            {notifLoading ? <div style={{ color: colors.textMuted, fontSize: '13px' }}>Loading notifications...</div> : notifs.length === 0 ? (
                <div style={styles.emptyContent}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
                    <p style={styles.emptyText}>No notifications yet. Assignment reminders, quiz deadlines, and payment updates will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {notifs.map(n => {
                        const meta = TYPE_META[n.type] || TYPE_META.default;
                        const unread = n.isRead === false || n.read === false;
                        return (
                            <div key={n._id} onClick={() => markNotifRead(n._id)} style={{ display: 'flex', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: unread ? `${colors.primary}08` : colors.bgInput, border: `1px solid ${unread ? `${colors.primary}30` : colors.border}`, cursor: 'pointer', alignItems: 'flex-start' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${meta.color}15`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{meta.icon}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ color: colors.text, fontSize: '14px', fontWeight: unread ? '800' : '600' }}>{n.title || 'Notification'}</span>
                                        <span style={{ color: colors.textMuted, fontSize: '11px', flexShrink: 0 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                                    </div>
                                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0', lineHeight: 1.5 }}>{n.message || n.body}</p>
                                    {unread && <span style={{ display: 'inline-block', marginTop: '6px', background: colors.primary, color: '#fff', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '99px' }}>NEW</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderAi = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', height: '620px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                    <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '700', margin: 0 }}>AI Tutor Conversations</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {aiConvos.length === 0 ? <div style={{ padding: '24px', color: colors.textMuted, fontSize: '13px' }}>No AI conversations yet. Ask your first question!</div> : aiConvos.map(c => (
                        <div key={c.conversationId} onClick={() => setActiveAiConv(c.conversationId)} style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, background: activeAiConv === c.conversationId ? `${colors.primary}10` : 'transparent' }}>
                            <div style={{ color: colors.text, fontSize: '13px', fontWeight: '700' }}>🤖 {c.title}</div>
                            <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>{c.count} messages · {c.last ? new Date(c.last).toLocaleDateString() : ''}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ background: colors.bg, borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {chatHeader('AI Learning Assistant', 'Powered by Emare AI · Ask any course question')}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {thread.length === 0 ? (
                        <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', padding: '40px 20px', lineHeight: 1.6 }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🤖</div>
                            Ask the AI tutor anything about your courses, concepts, quizzes, or assignments.
                        </div>
                    ) : thread.map(messageBubble)}
                    {aiLoading && <div style={{ color: colors.textMuted, fontSize: '12px' }}>AI Tutor is typing...</div>}
                    <div ref={threadEndRef} />
                </div>
                {chatInput(aiInput, setAiInput, handleAiSend, aiLoading, 'Ask the AI tutor a question...')}
            </div>
        </div>
    );

    return (
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>✉️ Messages & Communication Center</h2>
                <p style={styles.tabSubtitle}>Chat with instructors and support, join course discussions, track notifications, and ask the AI tutor</p>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '24px', gap: '4px', flexWrap: 'wrap' }}>
                {sections.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: section === s.key ? `3px solid ${colors.primary}` : '3px solid transparent',
                            color: section === s.key ? colors.primary : colors.textMuted,
                            padding: '12px 16px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {section === 'inbox' && renderInbox()}
            {section === 'sent' && renderSent()}
            {section === 'discussions' && renderDiscussions()}
            {section === 'notifications' && renderNotifications()}
            {section === 'ai' && renderAi()}
        </div>
    );
}
