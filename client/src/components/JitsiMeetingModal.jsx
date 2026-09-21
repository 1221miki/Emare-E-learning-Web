import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Maximize, Minimize, Loader, AlertCircle } from 'lucide-react';

/**
 * JitsiMeetingModal
 *
 * Embeds a Jitsi Meet conference inside a modal overlay using the
 * Jitsi Meet External API (iframe). No redirect — student stays on
 * the same page with full mic/camera/screen-share controls.
 *
 * Props:
 *   meetingUrl   – full Jitsi URL e.g. "https://meet.jit.si/RoomName"
 *   onClose      – callback when the user closes the modal
 *   displayName  – optional display name for the participant
 */
export default function JitsiMeetingModal({ meetingUrl, onClose, displayName }) {
    const containerRef = useRef(null);
    const apiRef       = useRef(null);
    const [loading, setLoading]   = useState(true);
    const [error,   setError]     = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Extract the room name from the URL
    const getRoomName = useCallback(() => {
        if (!meetingUrl) return '';
        try {
            const url = new URL(meetingUrl);
            // Path like /RoomName or /RoomName?room=...
            const segments = url.pathname.split('/').filter(Boolean);
            return segments[segments.length - 1] || url.hostname;
        } catch {
            // Fallback: use everything after last /
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

    // Load Jitsi External API script and initialize
    useEffect(() => {
        if (!meetingUrl || !containerRef.current) return;

        let cancelled = false;

        // Suppress specific Jitsi iframe warnings that we can't control
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
                // Load the Jitsi External API script if not already loaded
                if (!window.JitsiMeetExternalAPI) {
                    await new Promise((resolve, reject) => {
                        // Try domain-specific script first, fallback to official Jitsi CDN
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
                                    // Try fallback
                                    tryLoad(fallbackSrc);
                                } else {
                                    reject(new Error('Failed to load Jitsi API from both primary and fallback sources'));
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
                        prejoinPageEnabled: true,
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

                // Events
                api.addEventListener('readyToClose', () => onClose?.());
                api.addEventListener('error', (e) => {
                    console.error('[Jitsi] error', e);
                });
                api.addEventListener('videoConferenceJoined', () => {
                    if (!cancelled) setLoading(false);
                });
                api.addEventListener('participantJoined', () => {});

                // Iframe is inside container, loading is done once API is ready
                setTimeout(() => { if (!cancelled) setLoading(false); }, 2000);
            } catch (err) {
                if (!cancelled) {
                    console.error('[Jitsi] Initialization failed:', err);
                    setError('Failed to load Jitsi meeting. Please check your internet connection and try again.');
                    setLoading(false);
                }
            } finally {
                // Restore console methods
                console.warn = originalWarn;
                console.error = originalError;
            }
        };

        initJitsi();

        return () => {
            cancelled = true;
            // Restore console methods on cleanup
            console.warn = originalWarn;
            console.error = originalError;
            try { apiRef.current?.dispose?.(); } catch (e) { console.error('[Jitsi] dispose error:', e); }
            apiRef.current = null;
        };
    }, [meetingUrl, getRoomName, getServerDomain, displayName, onClose]);

    // Escape key to close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Fullscreen
    const modalRef = useRef(null);
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

    if (!meetingUrl) return null;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0',
            }}
        >
            <div
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100vw', height: '100vh',
                    background: '#0f172a',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                }}
            >
                {/* Top bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', background: 'rgba(15,23,42,0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                    transition: 'opacity 0.3s',
                }}>
                    <span style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '14px' }}>
                        Live Meeting
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={toggleFullscreen}
                            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                            title="Leave meeting"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 5,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '16px', background: '#0f172a',
                    }}>
                        <Loader size={40} color="#22c55e" style={{ animation: 'jitsiSpin .8s linear infinite' }} />
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: '600' }}>Joining meeting…</p>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '12px' }}>Please allow camera and microphone access when prompted.</p>
                        <style>{`@keyframes jitsiSpin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 5,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '16px', background: '#0f172a', padding: '40px', textAlign: 'center',
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

                {/* Jitsi container */}
                <div
                    ref={containerRef}
                    style={{
                        width: '100%', height: '100%',
                        paddingTop: '44px', /* space for top bar */
                        display: 'flex', flexDirection: 'column',
                    }}
                />
            </div>
        </div>
    );
}
