import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Megaphone, MessageSquare, Mail, Bot } from 'lucide-react';
import { messageService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';

const TABS = [
    { key: 'direct',        label: 'Direct Message',    icon: <MessageSquare size={14} aria-hidden="true" /> },
    { key: 'announcement',  label: 'Announcement',      icon: <Megaphone size={14} aria-hidden="true" /> },
];

const QUICK_MSGS = [
    "Great work on your recent submission! Keep it up.",
    "I noticed you've been inactive. Need any help?",
    "Your quiz score shows strong understanding. Well done!",
    "Remember: your assignment is due soon. Don't miss it!",
    "Let me know if you have any questions about the material.",
];

export default function MessagePanel({ student, course, onClose }) {
    const { colors, theme } = useTheme();
    const [tab, setTab]           = useState('direct');
    const [subject, setSubject]   = useState(`Re: ${course?.courseTitle || 'Your Course'}`);
    const [body, setBody]         = useState('');
    const [sending, setSending]   = useState(false);
    const [sent, setSent]         = useState(false);
    const [error, setError]       = useState('');
    const textareaRef             = useRef(null);

    useEffect(() => { textareaRef.current?.focus(); }, [tab]);

    const handleSend = async () => {
        if (!body.trim()) return;
        setSending(true);
        setError('');
        try {
            if (tab === 'direct') {
                // Create/find conversation then send
                await messageService.sendMessageDirect({
                    recipientId: student.studentId,
                    subject,
                    content: body.trim(),
                    courseId: course?._id,
                });
            } else {
                // Announcement to course
                await messageService.createAnnouncement({
                    courseId: course?._id,
                    title: subject,
                    body: body.trim(),
                });
            }
            setSent(true);
            setBody('');
        } catch (err) {
            setError(err?.response?.data?.message || 'Message could not be sent. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '20px' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Message ${student.name}`}
        >
            <div
                style={{ background: colors.bgCard, backdropFilter: 'blur(20px)', border: `2px solid ${colors.border}`, borderRadius: '20px', width: '100%', maxWidth: '540px', boxShadow: `0 10px 30px ${theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)'}`, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: `2px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: colors.bgInput, border: `2px solid ${colors.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.primary, fontWeight: '800', fontSize: '15px' }}>
                            {student.initials}
                        </div>
                        <div>
                            <div style={{ color: colors.text, fontSize: '15px', fontWeight: '700' }}>{student.name}</div>
                            <div style={{ color: colors.textMuted, fontSize: '12px' }}>{student.email}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: colors.bgInput, border: `2px solid ${colors.border}`, color: colors.primary, borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close">
                        <X size={17} aria-hidden="true" />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', padding: '12px 24px 0', borderBottom: `2px solid ${colors.border}` }}>
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setTab(t.key); setSent(false); setError(''); }}
                            style={{ background: tab === t.key ? colors.bgInput : 'transparent', border: `2px solid ${tab === t.key ? colors.primary : 'transparent'}`, color: tab === t.key ? colors.primary : colors.textMuted, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '-1px', transition: 'all 0.15s' }}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px 24px' }}>
                    {sent ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#d1fae5', border: '2px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Mail size={26} color="#065f46" aria-hidden="true" />
                            </div>
                            <div style={{ color: '#1e293b', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Message Sent!</div>
                            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Your message was delivered to {student.name}.</div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={() => setSent(false)} style={{ background: '#dbeafe', border: '2px solid #60a5fa', color: '#1e40af', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                                    Send Another
                                </button>
                                <button onClick={onClose} style={{ background: '#f0f4ff', border: '2px solid #c7d2fe', color: '#4f46e5', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Subject */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Subject</label>
                                <input
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    style={{ width: '100%', background: '#f8fafc', border: '2px solid #e0e7ff', color: '#1e293b', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                    placeholder="Message subject…"
                                    aria-label="Message subject"
                                />
                            </div>

                            {/* Quick messages */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Bot size={12} aria-hidden="true" /> Quick Templates
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {QUICK_MSGS.map((msg, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setBody(msg)}
                                            style={{ background: '#f0f4ff', border: '2px solid #c7d2fe', color: '#4f46e5', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#1e40af'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#f0f4ff'; e.currentTarget.style.color = '#4f46e5'; }}
                                            title={msg}
                                        >
                                            {msg.substring(0, 28)}…
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message body */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Message</label>
                                <textarea
                                    ref={textareaRef}
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={5}
                                    placeholder={tab === 'direct' ? `Write a personal message to ${student.name}…` : `Write an announcement for all students in ${course?.courseTitle || 'this course'}…`}
                                    style={{ width: '100%', background: '#f8fafc', border: '2px solid #e0e7ff', color: '#1e293b', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                                    aria-label="Message body"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{ background: '#fee2e2', border: '2px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                                    {error}
                                </div>
                            )}

                            {/* Info for announcements */}
                            {tab === 'announcement' && (
                                <div style={{ background: '#fef3c7', border: '2px solid #fcd34d', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#92400e', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <Megaphone size={14} style={{ marginTop: '1px', flexShrink: 0 }} aria-hidden="true" />
                                    <span>This announcement will be visible to <strong>all enrolled students</strong> in {course?.courseTitle || 'this course'}.</span>
                                </div>
                            )}

                            {/* Send */}
                            <button
                                onClick={handleSend}
                                disabled={sending || !body.trim()}
                                style={{ width: '100%', background: !body.trim() ? '#c7d2fe' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: !body.trim() ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.15s' }}
                                aria-label="Send message"
                            >
                                <Send size={16} aria-hidden="true" />
                                {sending ? 'Sending…' : tab === 'announcement' ? 'Post Announcement' : 'Send Message'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
