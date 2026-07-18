import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { discussionService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function DiscussionPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { colors } = useTheme();
    
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // New thread state
    const [showNewThread, setShowNewThread] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    
    // Reply state
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyBody, setReplyBody] = useState('');

    const navItems = [
        { label: '← Back to Workspace', path: `/student/learn/${courseId}`, key: 'back' },
        { label: 'Q&A Discussions', path: `/student/discussions/${courseId}`, key: 'qa' },
        { label: 'Assignments', path: `/student/assignments/${courseId}`, key: 'assignments' }
    ];

    useEffect(() => {
        fetchDiscussions();
    }, [courseId]);

    const fetchDiscussions = async () => {
        try {
            const res = await discussionService.getByCourse(courseId);
            setDiscussions(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        try {
            await discussionService.create({ courseId, title, body });
            setShowNewThread(false);
            setTitle('');
            setBody('');
            fetchDiscussions();
        } catch (err) {
            alert('Failed to create thread');
        }
    };

    const handleReply = async (e, discussionId) => {
        e.preventDefault();
        try {
            await discussionService.addReply(discussionId, replyBody);
            setReplyingTo(null);
            setReplyBody('');
            fetchDiscussions();
        } catch (err) {
            alert('Failed to post reply');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="qa" />
            
            <main style={{ marginLeft: '260px', padding: '40px', flex: 1, maxWidth: '1000px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '800' }}>Course Q&A Discussions</h1>
                    <button onClick={() => setShowNewThread(!showNewThread)} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                        {showNewThread ? 'Cancel' : 'New Question'}
                    </button>
                </div>

                {showNewThread && (
                    <form onSubmit={handleCreateThread} style={{ background: colors.bgCard, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '32px' }}>
                        <input type="text" placeholder="Question Title" required value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', marginBottom: '16px', fontSize: '16px', fontWeight: '600' }} />
                        <textarea placeholder="Provide details..." required value={body} onChange={e => setBody(e.target.value)} rows="5" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', marginBottom: '16px', fontSize: '15px', resize: 'vertical' }} />
                        <button type="submit" style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Post Question</button>
                    </form>
                )}

                {loading ? (
                    <div style={{ color: colors.textMuted }}>Loading discussions...</div>
                ) : discussions.length === 0 ? (
                    <div style={{ color: colors.textMuted, textAlign: 'center', padding: '40px', border: `1px solid ${colors.border}`, borderRadius: '12px' }}>No discussions yet. Be the first to ask!</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {discussions.map(thread => (
                            <div key={thread._id} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                                {/* Original Post */}
                                <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}` }}>
                                    {thread.isPinned && <span style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', marginBottom: '12px', display: 'inline-block' }}>📌 Pinned</span>}
                                    <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '700', margin: '0 0 12px' }}>{thread.title}</h3>
                                    <p style={{ color: colors.textMuted, fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px' }}>{thread.body}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{thread.authorRef?.fullName?.[0]}</div>
                                            <span style={{ color: colors.textMuted, fontSize: '13px' }}>{thread.authorRef?.fullName} • {new Date(thread.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <button onClick={() => setReplyingTo(replyingTo === thread._id ? null : thread._id)} style={{ background: 'transparent', border: 'none', color: colors.primary, fontWeight: '600', cursor: 'pointer' }}>Reply</button>
                                    </div>
                                </div>
                                
                                {/* Replies */}
                                {thread.replies?.length > 0 && (
                                    <div style={{ padding: '20px 24px', background: colors.bgInput, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {thread.replies.map((reply, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: reply.authorRef?.assignedRole === 'Instructor' ? colors.accent : colors.textMuted, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                                                    {reply.authorRef?.fullName?.[0]}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>{reply.authorRef?.fullName}</span>
                                                        {reply.authorRef?.assignedRole === 'Instructor' && <span style={{ background: colors.accent, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>Instructor</span>}
                                                        <span style={{ color: colors.textMuted, fontSize: '11px' }}>{new Date(reply.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0, lineHeight: 1.5 }}>{reply.body}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Reply Form */}
                                {replyingTo === thread._id && (
                                    <form onSubmit={(e) => handleReply(e, thread._id)} style={{ padding: '20px 24px', background: colors.bgInput, borderTop: `1px solid ${colors.border}` }}>
                                        <textarea placeholder="Write a reply..." required value={replyBody} onChange={e => setReplyBody(e.target.value)} rows="3" style={{ width: '100%', padding: '12px', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', marginBottom: '12px', fontSize: '14px', resize: 'vertical' }} />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            <button type="button" onClick={() => setReplyingTo(null)} style={{ background: 'transparent', color: colors.textMuted, border: 'none', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                            <button type="submit" style={{ background: colors.primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Post Reply</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
