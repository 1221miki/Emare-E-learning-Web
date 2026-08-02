import React from 'react';
import { discussionService } from '../../../services/api';

export default function DiscussionsTab(dash) {
    const { colors, enrollments, discussionsList, setDiscussionsList, newDiscussionTitle, setNewDiscussionTitle, newDiscussionBody, setNewDiscussionBody, selectedDiscussionCourse, setSelectedDiscussionCourse, replyText, setReplyText, expandedDiscussion, setExpandedDiscussion, discussionMsg, setDiscussionMsg, styles } = dash;
        const handlePostDiscussion = async (e) => {
            e.preventDefault();
            if (!newDiscussionTitle.trim() || !selectedDiscussionCourse) return;
            try {
                const res = await discussionService.create({ title: newDiscussionTitle, body: newDiscussionBody, courseRef: selectedDiscussionCourse });
                const newItem = res.data.data;
                if (newItem) setDiscussionsList(prev => [newItem, ...prev]);
                setNewDiscussionTitle('');
                setNewDiscussionBody('');
                setDiscussionMsg('✅ Discussion posted successfully!');
                setTimeout(() => setDiscussionMsg(''), 3000);
            } catch(err) {
                setDiscussionMsg('❌ Failed to post: ' + (err.response?.data?.message || err.message));
            }
        };

        const handleReply = async (discussionId) => {
            const text = replyText[discussionId] || '';
            if (!text.trim()) return;
            try {
                const res = await discussionService.addReply(discussionId, text);
                setDiscussionsList(prev => prev.map(d => d._id === discussionId ? (res.data.data || d) : d));
                setReplyText(prev => ({ ...prev, [discussionId]: '' }));
            } catch(err) {
                console.error('Reply failed:', err);
            }
        };

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>💬 Course Discussions & Forums</h2>
                    <p style={styles.tabSubtitle}>Ask questions, share insights, and engage with your peers and instructors</p>
                </div>

                <div style={{ ...styles.panelCard, marginBottom: '24px' }}>
                    <h3 style={{ ...styles.panelCardTitle, marginBottom: '16px' }}>Start a New Discussion</h3>
                    {discussionMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600', background: discussionMsg.includes('✅') ? `${colors.success}15` : '#ef444415', color: discussionMsg.includes('✅') ? colors.success : '#ef4444' }}>{discussionMsg}</div>}
                    <form onSubmit={handlePostDiscussion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Course</label>
                                <select style={styles.select} value={selectedDiscussionCourse} onChange={e => setSelectedDiscussionCourse(e.target.value)} required>
                                    <option value="">Select Course</option>
                                    {enrollments.map(e => (
                                        <option key={e._id} value={e.courseRef?._id || e.courseRef}>{e.courseRef?.courseTitle || 'Course'}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Discussion Title</label>
                                <input style={styles.input} type="text" value={newDiscussionTitle} onChange={e => setNewDiscussionTitle(e.target.value)} placeholder="e.g. How does useEffect cleanup work?" required />
                            </div>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description / Question</label>
                            <textarea rows="3" style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }} value={newDiscussionBody} onChange={e => setNewDiscussionBody(e.target.value)} placeholder="Describe your question in detail..." />
                        </div>
                        <button type="submit" style={{ ...styles.resumeBtn, alignSelf: 'flex-start' }}>💬 Post Discussion</button>
                    </form>
                </div>

                {discussionsList.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗨️</div>
                        <p style={styles.emptyText}>No discussions yet. Be the first to start a conversation!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {discussionsList.map(disc => (
                            <div key={disc._id} style={{ ...styles.panelCard, marginBottom: 0, padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>{disc.title}</h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: colors.textMuted }}>
                                            <span>By {disc.authorRef?.fullName || disc.creatorRef?.fullName || 'Student'}</span>
                                            <span>{new Date(disc.createdAt || Date.now()).toLocaleDateString()}</span>
                                            {disc.isPinned && <span style={{ color: colors.primary, fontWeight: '700' }}>📌 Pinned</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => setExpandedDiscussion(expandedDiscussion === disc._id ? null : disc._id)} style={{ background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                        {expandedDiscussion === disc._id ? '▲ Collapse' : `▼ Replies (${(disc.replies || []).length})`}
                                    </button>
                                </div>
                                {disc.body && <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 12px', lineHeight: '1.5' }}>{disc.body}</p>}
                                {expandedDiscussion === disc._id && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                                        {(disc.replies || []).map((reply, ri) => (
                                            <div key={ri} style={{ padding: '12px', borderRadius: '8px', background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
                                                <strong style={{ fontSize: '12px', color: colors.text }}>{reply.authorRef?.fullName || 'Student'}</strong>
                                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0', lineHeight: '1.5' }}>{reply.body}</p>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <input
                                                style={{ ...styles.input, flex: 1 }}
                                                placeholder="Write a reply..."
                                                value={replyText[disc._id] || ''}
                                                onChange={e => setReplyText(prev => ({ ...prev, [disc._id]: e.target.value }))}
                                                onKeyDown={e => e.key === 'Enter' && handleReply(disc._id)}
                                            />
                                            <button onClick={() => handleReply(disc._id)} style={{ ...styles.resumeBtn, padding: '10px 16px', fontSize: '13px' }}>Reply</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
}
