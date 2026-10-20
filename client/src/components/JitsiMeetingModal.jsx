import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Maximize, Minimize, Loader, AlertCircle, CheckCircle, Radio, Cloud, ShieldCheck } from 'lucide-react';
import { JitsiConferenceRecorder } from '../services/jitsiRecorderService';
import RecordingStatusBadge from './RecordingStatusBadge';
import { liveSessionService } from '../services/api';

/**
 * JitsiMeetingModal
 *
 * Embeds a Jitsi Meet conference inside a modal overlay using the
 * Jitsi Meet External API (iframe). Automatically triggers live class
 * recording for instructors and uploads the completed recording to
 * Cloudinary cloud storage upon session completion.
 *
 * Props:
 *   meetingUrl           – full Jitsi URL e.g. "https://meet.jit.si/RoomName"
 *   session              – optional LiveSession object
 *   isInstructor         – boolean indicating whether the current participant is the instructor
 *   onClose              – callback when the user closes the modal
 *   displayName          – optional display name for the participant
 *   onRecordingComplete  – callback(recording) fired when recording is processed and ready
 */
export default function JitsiMeetingModal({
    meetingUrl,
    session,
    isInstructor = false,
    onClose,
    displayName,
    onRecordingComplete
}) {
    const containerRef = useRef(null);
    const apiRef       = useRef(null);
    const modalRef     = useRef(null);
    const recorderRef  = useRef(null);

    const [loading, setLoading]   = useState(true);
    const [error,   setError]     = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Recording state
    const [recordingStatus, setRecordingStatus] = useState(session?.recordingStatus || 'not_started');
    const [elapsedSeconds, setElapsedSeconds]   = useState(0);
    const [savingRecording, setSavingRecording] = useState(false);

    const fmtTimer = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Extract the room name from the URL
    const getRoomName = useCallback(() => {
        if (!meetingUrl) return '';
        try {
            const url = new URL(meetingUrl);
            const segments = url.pathname.split('/').filter(Boolean);
            return segments[segments.length - 1] || url.hostname;
        } catch {
            const parts = meetingUrl.split('/');
            return parts[parts.length - 1] || meetingUrl;
        }
    }, [meetingUrl]);

    // Get the Jitsi server domain
    const getServerDomain = useCallback(() => {
        if (!meetingUrl) return 'meet.jit.si';
        try {
            return new URL(meetingUrl).hostname;
        } catch {
            return 'meet.jit.si';
        }
    }, [meetingUrl]);

    // End class and auto-save recording to cloud storage
    const handleEndAndSave = async () => {
        if (savingRecording) return;
        if (!window.confirm('End this live class now? The recording will be automatically saved to cloud storage and published to enrolled students.')) {
            return;
        }

        setSavingRecording(true);
        setRecordingStatus('processing');

        try {
            let savedRecording = null;
            if (recorderRef.current) {
                savedRecording = await recorderRef.current.stop(apiRef.current);
            } else if (session?._id) {
                const res = await liveSessionService.endSession(session._id);
                savedRecording = res.data?.recording;
            }

            setRecordingStatus('ready');
            if (savedRecording) {
                onRecordingComplete?.(savedRecording);
            }

            // Brief delay to show ready state
            setTimeout(() => {
                setSavingRecording(false);
                onClose?.();
            }, 1200);
        } catch (err) {
            console.error('[JitsiMeetingModal] Error ending session / saving recording:', err);
            setRecordingStatus('failed');
            setSavingRecording(false);
            alert('Failed to save recording: ' + (err.response?.data?.message || err.message));
        }
    };

    // Load Jitsi External API script and initialize
    useEffect(() => {
        if (!meetingUrl || !containerRef.current) return;

        let cancelled = false;

        const originalWarn = console.warn;
        const originalError = console.error;
        console.warn = (...args) => {
            const msg = args.join(' ');
            if (msg.includes('speaker-selection') || msg.includes('Allow attribute will take precedence over')) return;
            originalWarn.apply(console, args);
        };
        console.error = (...args) => {
            const msg = args.join(' ');
            if (msg.includes('speaker-selection') || msg.includes('Allow attribute will take precedence over')) return;
            originalError.apply(console, args);
        };

        const initJitsi = async () => {
            try {
                if (!window.JitsiMeetExternalAPI) {
                    await new Promise((resolve, reject) => {
                        const primarySrc = `https://${getServerDomain()}/external_api.js`;
                        const fallbackSrc = 'https://meet.jit.si/external_api.js';
                        
                        let loadAttempted = 0;
                        const tryLoad = (src) => {
                            const script = document.createElement('script');
                            script.src = src;
                            script.async = true;
                            script.onload = () => resolve();
                            script.onerror = () => {
                                loadAttempted++;
                                if (loadAttempted === 1 && src === primarySrc) {
                                    tryLoad(fallbackSrc);
                                } else {
                                    reject(new Error('Failed to load Jitsi API'));
                                }
                            };
                            document.head.appendChild(script);
                        };
                        tryLoad(primarySrc);
                    });
                }

                if (cancelled || !containerRef.current) return;

                const roomName = getRoomName();
                const domain   = getServerDomain();

                const api = new window.JitsiMeetExternalAPI(domain, {
                    roomName,
                    parentNode: containerRef.current,
                    width: '100%',
                    height: '100%',
                    userInfo: displayName ? { displayName } : undefined,
                    configOverwrite: {
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        prejoinPageEnabled: false,
                        disableDeepLinking: true,
                        toolbars: {
                            meetingName: true,
                            participantsPane: true,
                        },
                        interfaceConfigOverwrite: {
                            SHOW_JITSI_WATERMARK: false,
                            SHOW_BRAND_WATERMARK: false,
                            DEFAULT_BACKGROUND: '#0f172a',
                            TOOLBAR_ALWAYS_VISIBLE: true,
                        },
                    },
                });

                apiRef.current = api;

                // Event: Ready to close
                api.addEventListener('readyToClose', () => {
                    if (isInstructor) {
                        handleEndAndSave();
                    } else {
                        onClose?.();
                    }
                });

                api.addEventListener('error', (e) => {
                    console.error('[Jitsi] error', e);
                });

                // Event: Video conference joined
                api.addEventListener('videoConferenceJoined', async () => {
                    if (cancelled) return;
                    setLoading(false);

                    // If instructor joins, auto-start the live class recording service
                    if (isInstructor && session?._id) {
                        try {
                            const recorder = new JitsiConferenceRecorder(session._id, {
                                sessionTitle: session.title,
                                onStatusChange: (s) => setRecordingStatus(s),
                                onTimerTick: (sec) => setElapsedSeconds(sec)
                            });
                            recorderRef.current = recorder;
                            await recorder.start(api);
                            setRecordingStatus('recording');
                        } catch (recErr) {
                            console.warn('[JitsiMeetingModal] Auto-recording init notice:', recErr);
                        }
                    }
                });

                setTimeout(() => { if (!cancelled) setLoading(false); }, 2000);
            } catch (err) {
                if (!cancelled) {
                    console.error('[Jitsi] Initialization failed:', err);
                    setError('Failed to load Jitsi meeting. Please check your internet connection and try again.');
                    setLoading(false);
                }
            } finally {
                console.warn = originalWarn;
                console.error = originalError;
            }
        };

        initJitsi();

        return () => {
            cancelled = true;
            console.warn = originalWarn;
            console.error = originalError;
            try { apiRef.current?.dispose?.(); } catch (e) { console.error('[Jitsi] dispose error:', e); }
            apiRef.current = null;
        };
    }, [meetingUrl, getRoomName, getServerDomain, displayName, isInstructor, session]);

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!modalRef.current) return;
        if (!document.fullscreenElement) {
            modalRef.current.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Escape key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && !savingRecording) {
                if (isInstructor) handleEndAndSave();
                else onClose?.();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, savingRecording, isInstructor]);

    if (!meetingUrl) return null;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget && !savingRecording) onClose?.(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0',
            }}
        >
            <div
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100vw', height: '100vh',
                    background: '#090d16',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative', overflow: 'hidden'
                }}
            >
                {/* Top Control Bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 18px', background: 'rgba(15,23,42,0.96)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
                    backdropFilter: 'blur(10px)', minHeight: '48px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                            <span style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>
                                {session?.title || 'Live Class'}
                            </span>
                        </div>

                        {/* Status badge */}
                        {recordingStatus !== 'not_started' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RecordingStatusBadge status={recordingStatus} />
                                {recordingStatus === 'recording' && (
                                    <span style={{ color: '#f87171', fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                                        {fmtTimer(elapsedSeconds)}
                                    </span>
                                )}
                            </div>
                        )}

                        {isInstructor && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
                                <Cloud size={12} color="#38bdf8" /> Cloud Storage Auto-Save Enabled
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isInstructor && (
                            <button
                                onClick={handleEndAndSave}
                                disabled={savingRecording}
                                style={{
                                    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                                    color: '#fff', border: 'none', borderRadius: '8px',
                                    padding: '7px 16px', fontWeight: '800', fontSize: '12px',
                                    cursor: savingRecording ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    boxShadow: '0 3px 12px rgba(239,68,68,0.35)',
                                    opacity: savingRecording ? 0.7 : 1
                                }}
                            >
                                {savingRecording ? <Loader size={13} style={{ animation: 'jitsiSpin 1s linear infinite' }} /> : <Radio size={13} />}
                                {savingRecording ? 'Saving Recording...' : 'End Class & Save Recording'}
                            </button>
                        )}

                        <button
                            onClick={toggleFullscreen}
                            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>

                        <button
                            onClick={() => {
                                if (isInstructor) handleEndAndSave();
                                else onClose?.();
                            }}
                            style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Cloud Saving Overlay */}
                {savingRecording && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 50,
                        background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(10px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '18px', textAlign: 'center', padding: '30px'
                    }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Cloud size={32} color="#818cf8" style={{ animation: 'jitsiPulse 1.5s infinite ease-in-out' }} />
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>
                                Saving Recording to Cloud Storage
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '420px', margin: '0 auto 14px', lineHeight: 1.6 }}>
                                Uploading your live class recording to Cloudinary and publishing it to enrolled students in MongoDB Atlas...
                            </p>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', padding: '6px 14px', borderRadius: '20px', color: '#facc15', fontSize: '12px', fontWeight: '700' }}>
                                <Loader size={12} style={{ animation: 'jitsiSpin 1s linear infinite' }} /> Status: Processing
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 5,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '16px', background: '#090d16',
                    }}>
                        <Loader size={40} color="#22c55e" style={{ animation: 'jitsiSpin .8s linear infinite' }} />
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: '600' }}>Joining live class…</p>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '12px' }}>Auto-recording will start once connected.</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 5,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '16px', background: '#090d16', padding: '40px', textAlign: 'center',
                    }}>
                        <AlertCircle size={48} color="#ef4444" />
                        <p style={{ color: '#f87171', fontWeight: '700', fontSize: '16px', margin: 0 }}>Meeting Error</p>
                        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, maxWidth: '400px' }}>{error}</p>
                        <button
                            onClick={onClose}
                            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Close
                        </button>
                    </div>
                )}

                {/* Jitsi iframe container */}
                <div
                    ref={containerRef}
                    style={{
                        width: '100%', height: '100%',
                        paddingTop: '48px',
                        display: 'flex', flexDirection: 'column',
                    }}
                />

                <style>{`
                    @keyframes jitsiSpin { to { transform: rotate(360deg); } }
                    @keyframes jitsiPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
                `}</style>
            </div>
        </div>
    );
}
