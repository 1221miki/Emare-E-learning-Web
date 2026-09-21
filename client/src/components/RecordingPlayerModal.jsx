import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings2, Film, ExternalLink
} from 'lucide-react';
import JitsiMeetingModal from './JitsiMeetingModal';

const fmtTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const RESUME_KEY = (id) => `rec_progress_${id}`;

const isEmbedUrl = (url = '') =>
    url.includes('youtube.com/embed') || url.includes('youtu.be') ||
    url.includes('player.vimeo.com') || url.includes('zoom.us/rec');

const isMeetingUrl = (url = '') =>
    url.includes('meet.jit.si') || url.includes('meet.google.com') || url.includes('teams.microsoft.com');

const isZoomMeetingUrl = (url = '') =>
    url.includes('zoom.us/j/');

const isVideoFile = (url = '') =>
    /\.(mp4|webm|mov|avi|mkv|ogv)(\?|$)/i.test(url);

export default function RecordingPlayerModal({ recording, onClose }) {
    const videoRef      = useRef(null);
    const playerWrapRef = useRef(null);
    const saveRef       = useRef(null);
    const controlsTimer = useRef(null);

    const [playing,       setPlaying]       = useState(false);
    const [currentTime,   setCurrentTime]   = useState(0);
    const [duration,      setDuration]      = useState(0);
    const [volume,        setVolume]        = useState(1);
    const [muted,         setMuted]         = useState(false);
    const [speed,         setSpeed]         = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen,  setIsFullscreen]  = useState(false);
    const [showControls,  setShowControls]  = useState(true);
    const [inlineMeeting, setInlineMeeting] = useState(null);

    const videoUrl = recording?.videoUrl || '';
    const useEmbed        = isEmbedUrl(videoUrl);
    const useMeeting      = isMeetingUrl(videoUrl);
    const useZoomMeeting  = isZoomMeetingUrl(videoUrl);
    const useNative       = isVideoFile(videoUrl) && !useEmbed;
    const useExternal     = !useEmbed && !useMeeting && !useZoomMeeting && !useNative && videoUrl;

    // Restore saved position
    useEffect(() => {
        const saved = parseFloat(localStorage.getItem(RESUME_KEY(recording?._id)) || '0');
        if (saved > 5 && videoRef.current) {
            const el = videoRef.current;
            const handler = () => { if (el) el.currentTime = saved; };
            el.addEventListener('loadedmetadata', handler);
            return () => el.removeEventListener('loadedmetadata', handler);
        }
    }, [recording]);

    // Auto-save position every 5s
    useEffect(() => {
        if (!videoRef.current || !useNative) return;
        const save = () => {
            if (videoRef.current) localStorage.setItem(RESUME_KEY(recording._id), String(videoRef.current.currentTime));
        };
        saveRef.current = setInterval(save, 5000);
        return () => { clearInterval(saveRef.current); save(); };
    }, [recording, useNative]);

    // Fullscreen listener
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Escape key to close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Auto-hide controls
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => { if (playing) setShowControls(false); }, 3000);
    }, [playing]);

    // Controls
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) { videoRef.current.play(); setPlaying(true); }
        else { videoRef.current.pause(); setPlaying(false); }
    };
    const seek = (delta) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    };
    const onSeekClick = (e) => {
        if (!videoRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        videoRef.current.currentTime = ratio * duration;
    };
    const setPlaybackSpeed = (s) => {
        if (videoRef.current) videoRef.current.playbackRate = s;
        setSpeed(s); setShowSpeedMenu(false);
    };
    const onVolumeChange = (e) => {
        const v = parseFloat(e.target.value);
        setVolume(v); setMuted(v === 0);
        if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
    };
    const toggleMute = () => {
        if (!videoRef.current) return;
        const next = !muted; setMuted(next);
        videoRef.current.muted = next;
    };
    const toggleFullscreen = () => {
        if (!playerWrapRef.current) return;
        if (!document.fullscreenElement) playerWrapRef.current.requestFullscreen?.();
        else document.exitFullscreen?.();
    };

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                style={{
                    background: '#0f172a', borderRadius: '16px', overflow: 'hidden',
                    width: '100%', maxWidth: '960px', maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <Film size={18} color="#a5b4fc" style={{ flexShrink: 0 }} />
                        <span style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {recording.title || 'Recording'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Video area */}
                <div
                    ref={playerWrapRef}
                    onMouseMove={showControlsTemporarily}
                    style={{ background: '#000', position: 'relative', width: '100%', aspectRatio: '16/9' }}
                >
                    {/* IFRAME */}
                    {useEmbed && (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <iframe
                                src={videoUrl}
                                title={recording.title}
                                allow="autoplay; fullscreen; picture-in-picture"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                            />
                        </div>
                    )}

                    {/* Native video */}
                    {useNative && (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                style={{ width: '100%', height: '100%', display: 'block', background: '#000', cursor: showControls ? 'default' : 'none' }}
                                onClick={togglePlay}
                                onTimeUpdate={() => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); }}
                                onDurationChange={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                onEnded={() => { setPlaying(false); setShowControls(true); localStorage.removeItem(RESUME_KEY(recording._id)); }}
                                playsInline
                            />

                            {/* Big play overlay */}
                            {!playing && (
                                <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.25)' }}>
                                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)' }}>
                                        <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: '4px' }} />
                                    </div>
                                </div>
                            )}

                            {/* Controls bar */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(0,0,0,0.92) 0%,transparent 100%)', padding: '32px 16px 14px', transition: 'opacity 0.25s', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
                                <div onClick={onSeekClick} style={{ height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px', cursor: 'pointer', marginBottom: '12px', position: 'relative' }}>
                                    <div style={{ height: '100%', width: `${progressPct}%`, background: '#22c55e', borderRadius: '4px', transition: 'width 0.1s linear' }} />
                                    <div style={{ position: 'absolute', top: '-5px', left: `${progressPct}%`, transform: 'translateX(-50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#22c55e', transition: 'left 0.1s linear', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={() => seek(-10)} title="Rewind 10s" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                        <SkipBack size={18} />
                                    </button>
                                    <button onClick={togglePlay} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: '2px' }} />}
                                    </button>
                                    <button onClick={() => seek(10)} title="Forward 10s" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                        <SkipForward size={18} />
                                    </button>

                                    <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                        {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={onVolumeChange} style={{ width: '70px', accentColor: '#22c55e', cursor: 'pointer' }} />

                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                        {fmtTime(currentTime)} / {fmtTime(duration)}
                                    </span>

                                    <div style={{ flex: 1 }} />

                                    <div style={{ position: 'relative' }}>
                                        <button onClick={() => setShowSpeedMenu(p => !p)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', padding: '5px 10px', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Settings2 size={13} /> {speed}x
                                        </button>
                                        {showSpeedMenu && (
                                            <div style={{ position: 'absolute', bottom: '38px', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', zIndex: 20, minWidth: '80px' }}>
                                                {SPEEDS.map(s => (
                                                    <button key={s} onClick={() => setPlaybackSpeed(s)} style={{ display: 'block', width: '100%', padding: '8px 18px', background: speed === s ? 'rgba(34,197,94,0.2)' : 'transparent', color: speed === s ? '#4ade80' : '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: speed === s ? '800' : '400', textAlign: 'center' }}>
                                                        {s}x
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={toggleFullscreen} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meeting / external / Zoom */}
                    {(useMeeting || useExternal || useZoomMeeting) && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px' }}>
                            <Film size={56} color="#a5b4fc" />
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ color: '#fff', fontWeight: '700', fontSize: '16px', margin: '0 0 8px' }}>
                                    {useZoomMeeting
                                        ? 'This Zoom meeting opens in a new tab.'
                                        : useMeeting
                                        ? 'This recording is hosted on the meeting platform.'
                                        : 'This recording is available at an external URL.'}
                                </p>
                                <button onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
                                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', borderRadius: '12px', padding: '14px 32px', fontWeight: '800', fontSize: '15px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                                    <ExternalLink size={18} fill="#fff" /> {useZoomMeeting ? 'Open in Zoom' : 'Open Recording'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No video */}
                    {!videoUrl && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px', textAlign: 'center' }}>
                            <Film size={56} color="#475569" />
                            <div>
                                <p style={{ color: '#e2e8f0', margin: '0 0 8px', fontWeight: '700', fontSize: '18px' }}>Recording Not Available Yet</p>
                                <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px', maxWidth: '360px', lineHeight: 1.6 }}>
                                    The instructor is still processing this recording. Please check back later.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div style={{ padding: '16px 18px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                        {recording.course?.courseTitle && <span>{recording.course.courseTitle}</span>}
                        {recording.instructor?.fullName && <span> &middot; {recording.instructor.fullName}</span>}
                    </p>
                </div>
            </div>

            {/* Inline Jitsi Meeting for meeting-URL recordings */}
            {inlineMeeting && (
                <JitsiMeetingModal
                    meetingUrl={inlineMeeting}
                    onClose={() => setInlineMeeting(null)}
                />
            )}
        </div>
    );
}
