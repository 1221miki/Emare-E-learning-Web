import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { liveSessionService } from '../../services/api';
import { X, Upload, Eye, Film, Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

/**
 * RecordingManagementModal
 * Allows an instructor to:
 *  - Upload a recording file for an ended session
 *  - OR provide a direct recording URL
 *  - Edit recording title / description
 *  - Publish / unpublish
 * Props:
 *  session    – LiveSession object (may be null if opened from recordings list)
 *  recording  – LiveRecording object or null (new upload)
 *  onSuccess  – callback() after any successful action
 *  onClose    – close modal
 */
export default function RecordingManagementModal({ session, recording, onSuccess, onClose }) {
    const { colors: c } = useTheme();
    const isExisting = !!recording;

    const [form, setForm] = useState({
        title: recording?.title || session?.title || '',
        description: recording?.description || '',
        videoUrl: recording?.videoUrl || '',
    });
    const [file, setFile] = useState(null);
    const [uploadMode, setUploadMode] = useState(isExisting ? 'url' : 'file'); // 'file' | 'url'
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [progress, setProgress] = useState(0);

    const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleUpload = async (e) => {
        e.preventDefault();
        if (uploadMode === 'file' && !file) {
            setMsg({ type: 'error', text: 'Please select a video file.' });
            return;
        }
        if (uploadMode === 'url' && !form.videoUrl.trim()) {
            setMsg({ type: 'error', text: 'Please enter a recording URL.' });
            return;
        }
        if (!form.title.trim()) {
            setMsg({ type: 'error', text: 'Recording title is required.' });
            return;
        }

        setUploading(true);
        setMsg(null);
        setProgress(0);

        try {
            if (uploadMode === 'file' && session) {
                // Upload file via multipart
                const fd = new FormData();
                fd.append('recording', file);
                fd.append('title', form.title);
                fd.append('description', form.description);

                // Fake progress for UX
                const progressInterval = setInterval(() => {
                    setProgress(prev => Math.min(prev + 8, 88));
                }, 400);

                await liveSessionService.uploadRecording(session._id, fd);
                clearInterval(progressInterval);
                setProgress(100);
                setMsg({ type: 'success', text: 'Recording uploaded successfully!' });
            } else if (isExisting) {
                // Update existing recording metadata
                await liveSessionService.updateRecording(recording._id, {
                    title: form.title,
                    description: form.description,
                });
                setMsg({ type: 'success', text: 'Recording updated.' });
            }

            setTimeout(() => onSuccess(), 1200);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed. Please try again.' });
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const handlePublish = async () => {
        if (!recording) return;
        setUploading(true);
        try {
            await liveSessionService.publishRecording(recording._id);
            setMsg({ type: 'success', text: 'Recording published — students can now watch it.' });
            setTimeout(() => onSuccess(), 1000);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to publish.' });
        } finally {
            setUploading(false);
        }
    };

    const handleUnpublish = async () => {
        if (!recording) return;
        setUploading(true);
        try {
            await liveSessionService.unpublishRecording(recording._id);
            setMsg({ type: 'success', text: 'Recording unpublished.' });
            setTimeout(() => onSuccess(), 1000);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to unpublish.' });
        } finally {
            setUploading(false);
        }
    };

    const inp = {
        width: '100%', padding: '10px 13px', borderRadius: '8px',
        background: c.bgInput || c.bgCard, border: `1px solid ${c.border}`,
        color: c.text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
    };
    const lbl = { color: c.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '5px', display: 'block' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: '18px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
                    <div>
                        <h3 style={{ color: c.text, fontSize: '18px', fontWeight: '800', margin: '0 0 2px' }}>
                            {isExisting ? 'Manage Recording' : 'Upload Recording'}
                        </h3>
                        {session && <p style={{ color: c.textMuted, fontSize: '12px', margin: 0 }}>{session.title}</p>}
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Status message */}
                    {msg && (
                        <div style={{ background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#4ade80' : '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                            {msg.text}
                        </div>
                    )}

                    {/* Existing recording preview */}
                    {recording?.videoUrl && (
                        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                            <p style={{ color: c.textMuted, fontSize: '12px', margin: '0 0 8px', fontWeight: '600' }}>Current Recording</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <Film size={18} color="#a5b4fc" />
                                <span style={{ color: c.text, fontSize: '13px', flex: 1, wordBreak: 'break-all' }}>{recording.fileName || 'Recording file'}</span>
                                <a href={recording.videoUrl} target="_blank" rel="noopener noreferrer"
                                   style={{ color: '#a5b4fc', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                    <ExternalLink size={12} /> Preview
                                </a>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <span style={{ fontSize: '11px', color: c.textMuted }}>
                                    Status: <strong style={{ color: recording.status === 'available' ? '#4ade80' : '#f59e0b' }}>{recording.status}</strong>
                                </span>
                                <span style={{ fontSize: '11px', color: c.textMuted }}>
                                    Published: <strong style={{ color: recording.isPublished ? '#4ade80' : '#94a3b8' }}>{recording.isPublished ? 'Yes' : 'No'}</strong>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Upload mode toggle (only for new uploads) */}
                    {!isExisting && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['file', 'url'].map(mode => (
                                <button key={mode} type="button" onClick={() => setUploadMode(mode)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${uploadMode === mode ? '#22c55e' : c.border}`, background: uploadMode === mode ? 'rgba(34,197,94,0.12)' : 'transparent', color: uploadMode === mode ? '#4ade80' : c.textMuted, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                                    {mode === 'file' ? '📁 Upload File' : '🔗 Paste URL'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* File upload */}
                    {!isExisting && uploadMode === 'file' && (
                        <div>
                            <label style={lbl}>Recording File (MP4, MOV, WebM)</label>
                            <input type="file" accept="video/*" onChange={e => setFile(e.target.files[0] || null)}
                                style={{ ...inp, padding: '8px', cursor: 'pointer' }} />
                            {file && <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>✓ {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
                        </div>
                    )}

                    {/* URL input */}
                    {!isExisting && uploadMode === 'url' && (
                        <div>
                            <label style={lbl}>Recording URL (Bunny Stream embed, YouTube, etc.)</label>
                            <input style={inp} value={form.videoUrl} onChange={e => setF('videoUrl', e.target.value)} placeholder="https://iframe.mediadelivery.net/embed/…" />
                        </div>
                    )}

                    {/* Progress bar */}
                    {uploading && progress > 0 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: c.textMuted, fontSize: '12px' }}>Uploading…</span>
                                <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: '700' }}>{progress}%</span>
                            </div>
                            <div style={{ height: '6px', background: c.border, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label style={lbl}>Recording Title *</label>
                        <input style={inp} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Recording title shown to students" />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={lbl}>Description (optional)</label>
                        <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Brief description of what was covered in this session" />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                            Cancel
                        </button>

                        {/* Save / upload */}
                        {(!isExisting || (isExisting && recording?.status !== 'available')) && (
                            <button onClick={handleUpload} disabled={uploading}
                                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '800', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                {uploading ? <Loader size={14} style={{ animation: 'spin .8s linear infinite' }} /> : <Upload size={14} />}
                                {uploading ? 'Uploading…' : isExisting ? 'Save Changes' : 'Upload & Publish Recording'}
                            </button>
                        )}

                        {/* Unpublish only (publishing happens automatically on upload / session end) */}
                        {isExisting && recording?.status === 'available' && recording?.isPublished && (
                            <button onClick={handleUnpublish} disabled={uploading}
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: uploading ? 'wait' : 'pointer', fontSize: '13px' }}>
                                Unpublish
                            </button>
                        )}

                        {/* Edit & save existing */}
                        {isExisting && (
                            <button onClick={handleUpload} disabled={uploading}
                                style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: uploading ? 'wait' : 'pointer', fontSize: '13px' }}>
                                Save Edits
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
