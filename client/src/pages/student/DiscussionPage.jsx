import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { discussionService, uploadService, courseService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function DiscussionPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { colors } = useTheme();
    const { user } = useAuth();
    const userId = user?._id || user?.id;
    
    const [enrollments, setEnrollments] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [resolvedFilter, setResolvedFilter] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // New thread state
    const [showNewThread, setShowNewThread] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState('Question');
    const [tags, setTags] = useState('');
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    
    // Reply state
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyBody, setReplyBody] = useState('');

    const currentCoursePath = courseId || selectedCourse;
    const navItems = [
        { label: '← Back to Workspace', path: currentCoursePath ? `/student/learn/${currentCoursePath}` : '/student/dashboard', key: 'back' },
        { label: 'Q&A Discussions', path: currentCoursePath ? `/student/discussions/${currentCoursePath}` : '/student/discussions', key: 'qa' },
        { label: 'Assignments', path: currentCoursePath ? `/student/assignments/${currentCoursePath}` : '/student/dashboard', key: 'assignments' }
    ];

    useEffect(() => {
        loadEnrollments();
    }, []);

    useEffect(() => {
        if (courseId) {
            setSelectedCourse(courseId);
            return;
        }
        if (enrollments.length) {
            setSelectedCourse(enrollments[0].courseRef?._id || null);
        }
    }, [courseId, enrollments]);

    useEffect(() => {
        if (selectedCourse) {
            fetchDiscussions();
        }
    }, [selectedCourse, categoryFilter, resolvedFilter, search]);

    const loadEnrollments = async () => {
        setCoursesLoading(true);
        try {
            const res = await courseService.getStudentEnrollments();
            setEnrollments(res.data.data || []);
            setCoursesLoading(false);
        } catch (err) {
            console.error('Failed to load enrolled courses', err);
            setCoursesLoading(false);
        }
    };

    const fetchDiscussions = async () => {
        if (!selectedCourse) return;
        setLoading(true);
        try {
            const query = {};
            if (categoryFilter) query.category = categoryFilter;
            if (resolvedFilter) query.isResolved = resolvedFilter;
            if (search) query.search = search;
            const res = await discussionService.getByCourse(selectedCourse, query);
            setDiscussions(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        setProcessing(true);
        const uploaded = [];

        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            try {
                const response = await uploadService.uploadFile(fd);
                if (response.data?.data) {
                    uploaded.push({
                        name: file.name,
                        url: response.data.data.url,
                        type: file.type,
                        size: file.size
                    });
                }
            } catch (uploadError) {
                console.error('Attachment upload failed:', uploadError);
            }
        }

        setAttachmentFiles((prev) => [...prev, ...uploaded]);
        setProcessing(false);
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        try {
            const attachmentPayload = attachmentFiles.map((file) => ({
                name: file.name,
                url: file.url,
                type: file.type,
                size: file.size
            }));

            await discussionService.create({
                courseId: selectedCourse || courseId,
                title,
                body,
                category,
                tags,
                attachments: attachmentPayload
            });
            setShowNewThread(false);
            setTitle('');
            setBody('');
            setCategory('Question');
            setTags('');
            setAttachmentFiles([]);
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

    const handleUpvote = async (discussionId) => {
        try {
            await discussionService.upvote(discussionId);
            fetchDiscussions();
        } catch (err) {
            console.error('Failed to upvote discussion', err);
        }
    };

    const handleResolve = async (discussionId, isResolved) => {
        try {
            await discussionService.markResolved(discussionId, isResolved);
            fetchDiscussions();
        } catch (err) {
            console.error('Failed to update resolved status', err);
        }
    };

    const handleSelectBestReply = async (discussionId, replyId) => {
        try {
            await discussionService.selectBestReply(discussionId, replyId);
            fetchDiscussions();
        } catch (err) {
            console.error('Failed to mark best reply', err);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="qa" />

            <main style={{ marginLeft: '260px', padding: '40px', flex: 1, maxWidth: '1000px' }}>
                {coursesLoading ? (
                    <div style={{ color: colors.textMuted, padding: '40px', textAlign: 'center' }}>Loading courses…</div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                            <div>
                                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '800', margin: 0 }}>Course Q&A Discussions</h1>
                                <p style={{ color: colors.textMuted, fontSize: '14px', margin: '8px 0 0' }}>Search, filter, and collaborate on course questions with instructor badges and best answer highlights.</p>
                            </div>
                            <button onClick={() => setShowNewThread(!showNewThread)} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                                {showNewThread ? 'Cancel' : 'New Question'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '12px', marginBottom: '24px' }}>
                            <select value={selectedCourse || ''} onChange={(e) => {
                                const selected = e.target.value;
                                setSelectedCourse(selected);
                                if (selected) navigate(`/student/discussions/${selected}`);
                            }} style={{ padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '14px' }}>
                                <option value="">Select course</option>
                                {enrollments.map((enrollment) => (
                                    <option key={enrollment._id} value={enrollment.courseRef?._id}>{enrollment.courseRef?.title || 'Untitled course'}</option>
                                ))}
                            </select>
                            <input
                                placeholder="Search discussions"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '14px' }}
                            />
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '14px' }}>
                                <option value="">All Categories</option>
                                <option value="Question">Question</option>
                                <option value="Help">Help</option>
                                <option value="Announcement">Announcement</option>
                                <option value="Idea">Idea</option>
                                <option value="General">General</option>
                            </select>
                            <select value={resolvedFilter} onChange={(e) => setResolvedFilter(e.target.value)} style={{ padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '14px' }}>
                                <option value="">Any status</option>
                                <option value="true">Resolved</option>
                                <option value="false">Open</option>
                            </select>
                        </div>

                        {showNewThread && (
                            <form onSubmit={handleCreateThread} style={{ background: colors.bgCard, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <select value={selectedCourse || ''} onChange={(e) => setSelectedCourse(e.target.value)} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '16px' }}>
                                        <option value="">Select course</option>
                                        {enrollments.map((enrollment) => (
                                            <option key={enrollment._id} value={enrollment.courseRef?._id}>{enrollment.courseRef?.title || 'Untitled course'}</option>
                                        ))}
                                    </select>
                                    <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '16px' }}>
                                        <option value="Question">Question</option>
                                        <option value="Help">Help</option>
                                        <option value="Announcement">Announcement</option>
                                        <option value="Idea">Idea</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                                <textarea placeholder="Provide details..." required value={body} onChange={e => setBody(e.target.value)} rows="5" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', marginBottom: '16px', fontSize: '15px', resize: 'vertical' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', fontSize: '14px' }} />
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', color: colors.text, fontSize: '14px' }}>
                                        <span>{processing ? 'Uploading...' : 'Attach files'}</span>
                                        <input type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                {attachmentFiles.length > 0 && (
                                    <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {attachmentFiles.map((file, idx) => (
                                            <div key={idx} style={{ padding: '10px 14px', borderRadius: '10px', background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <a href={file.url} target="_blank" rel="noreferrer" style={{ color: colors.primary, textDecoration: 'none', fontSize: '13px' }}>{file.name}</a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button type="submit" disabled={processing} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>{processing ? 'Saving...' : 'Post Question'}</button>
                            </form>
                        )}

                        {loading ? (
                            <div style={{ color: colors.textMuted }}>Loading discussions...</div>
                        ) : discussions.length === 0 ? (
                            <div style={{ color: colors.textMuted, textAlign: 'center', padding: '40px', border: `1px solid ${colors.border}`, borderRadius: '12px' }}>No discussions yet. Start the first thread for this course.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {discussions.map(thread => {
                                    const userUpvoted = thread.upvotedBy?.some((id) => String(id) === String(userId));
                                    const canModerate = user?.assignedRole === 'Instructor' || user?.assignedRole === 'Admin';
                                    const canResolve = thread.authorRef?._id === userId || canModerate;
                                    const bestReplyId = thread.bestReplyId ? String(thread.bestReplyId) : null;

                                    return (
                                        <div key={thread._id} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                                            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                        {thread.isPinned && <span style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>📌 Pinned</span>}
                                                        <span style={{ background: thread.isResolved ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)', color: thread.isResolved ? '#16a34a' : colors.primary, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                                            {thread.isResolved ? 'Resolved' : 'Open'}
                                                        </span>
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(148,163,184,0.12)', color: colors.text, fontSize: '11px', fontWeight: '700' }}>{thread.category}</span>
                                                    </div>
                                                    <button onClick={() => setReplyingTo(replyingTo === thread._id ? null : thread._id)} style={{ background: 'transparent', border: '1px solid transparent', color: colors.primary, fontWeight: '600', cursor: 'pointer' }}>Reply</button>
                                                </div>

                                                <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '700', margin: '16px 0 12px' }}>{thread.title}</h3>
                                                <p style={{ color: colors.textMuted, fontSize: '15px', lineHeight: 1.7, margin: '0 0 16px' }}>{thread.body}</p>

                                                {thread.tags?.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                                        {thread.tags.map((tag, idx) => (
                                                            <span key={idx} style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(59,130,246,0.08)', color: colors.primary, fontSize: '12px', fontWeight: '700' }}>{tag}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {thread.attachments?.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                                        <strong style={{ color: colors.text, fontSize: '13px', marginBottom: '6px' }}>Attachments</strong>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                            {thread.attachments.map((file, idx) => (
                                                                <a key={idx} href={file.url} target="_blank" rel="noreferrer" style={{ padding: '10px 14px', borderRadius: '10px', background: colors.bg, border: `1px solid ${colors.border}`, color: colors.primary, textDecoration: 'none', fontSize: '13px' }}>{file.name}</a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                                    <button onClick={() => handleUpvote(thread._id)} style={{ background: userUpvoted ? colors.primary : colors.bgInput, color: userUpvoted ? '#fff' : colors.text, border: `1px solid ${userUpvoted ? colors.primary : colors.border}`, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                                        {userUpvoted ? 'Upvoted' : 'Upvote'} · {thread.upvotes || 0}
                                                    </button>
                                                    {canResolve && (
                                                        <button onClick={() => handleResolve(thread._id, !thread.isResolved)} style={{ background: thread.isResolved ? colors.bgInput : colors.primary, color: thread.isResolved ? colors.text : '#fff', border: `1px solid ${colors.border}`, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                                            {thread.isResolved ? 'Reopen' : 'Mark Resolved'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {thread.replies?.length > 0 && (
                                                <div style={{ padding: '20px 24px', background: colors.bgInput, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {thread.replies.map((reply, idx) => {
                                                        const isBest = bestReplyId && String(reply._id) === bestReplyId;
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', gap: '12px', padding: '14px', borderRadius: '12px', border: `1px solid ${isBest ? colors.primary : colors.border}`, background: isBest ? 'rgba(59,130,246,0.06)' : 'transparent' }}>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: reply.authorRef?.assignedRole === 'Instructor' ? colors.accent : colors.textMuted, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                                                                    {reply.authorRef?.fullName?.[0]}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                            <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>{reply.authorRef?.fullName}</span>
                                                                            {reply.authorRef?.assignedRole === 'Instructor' && <span style={{ background: colors.accent, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>Instructor</span>}
                                                                            <span style={{ color: colors.textMuted, fontSize: '11px' }}>{new Date(reply.createdAt).toLocaleDateString()}</span>
                                                                        </div>
                                                                        {isBest && <span style={{ background: colors.primary, color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>Best Answer</span>}
                                                                    </div>
                                                                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{reply.body}</p>
                                                                    {canResolve && !isBest && (
                                                                        <button onClick={() => handleSelectBestReply(thread._id, reply._id)} type="button" style={{ marginTop: '12px', background: colors.primary, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                                                            Mark as Best Answer
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

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
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
