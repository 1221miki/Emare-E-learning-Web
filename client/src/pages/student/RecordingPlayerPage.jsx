import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { liveSessionService, enrollmentService } from '../../services/api';
import Navbar from '../../components/Navbar';
import {
    ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings2, Film, User, BookOpen,
    CalendarDays, Clock, AlertCircle, Loader, ExternalLink
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────
const fmtTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};
const fmtDur = (sec) => {
    if (!sec || sec <= 0) return null;
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const RESUME_KEY = (id) => `rec_progress_${id}`;

// Detect if a URL is an embeddable iframe (Bunny, YouTube, Vimeo, Zoom, etc.)
const isEmbedUrl = (url = '') =>
    url.includes('iframe.mediadelivery.net') ||
    url.includes('youtube.com/embed') ||
    url.includes('youtu.be') ||
    url.includes('player.vimeo.com') ||
    url.includes('zoom.us/rec');

// Detect if a URL is a meeting platform link (not a direct video file)
const isMeetingUrl = (url = '') =>
    url.includes('meet.jit.si') ||
    url.includes('zoom.us/j/') ||
    url.includes('meet.google.com') ||
    url.includes('teams.microsoft.com');

// Detect if URL is a playable video file
const isVideoFile = (url = '') =>
    /\.(mp4|webm|mov|avi|mkv|ogv)(\?|$)/i.test(url);

export default function RecordingPlayerPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { colors: c } = useTheme();

    const [recording,  setRecording]  = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [hasAccess,  setHasAccess]  = useState(false);

    // Native video player state
    const videoRef       = useRef(null);
    const playerWrapRef  = useRef(null);
    const saveRef        = useRef(null);
    const [playing,       setPlaying]       = useState(false);
    const [currentTime,   setCurrentTime]   = useState(0);
    const [duration,      setDuration]      = useState(0);
    const [volume,        setVolume]        = useState(1);
    const [muted,         setMuted]         = useState(false);
    const [speed,         setSpeed]         = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen,  setIsFullscreen]  = useState(false);
    const [showControls,  setShowControls]  = useState(true);
    const controlsTimer = useRef(null);

    // ── Auth guard ─────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) {
            navigate(`/login?redirect=/recordings/${id}`);
        }
    }, [isAuthenticated, id, navigate]);

    // ── Load recording + access check ─────────────────────
    useEffect(() => {
        if (!isAuthenticated || !user) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const role = user.assignedRole;

                let found = null;

                if (role === 'Instructor' || role === 'Admin') {
                    // Instructors/admins fetch from their own recordings list
                    const res = await liveSessionService.getInstructorRecordings();
                    const recs = res.data?.data || [];
                    found = recs.find(r => r._id === id);
                    if (!found) {
                        // Maybe it's another instructor's course — try student endpoint
                        const res2 = await liveSessionService.getStudentRecordings().catch(() => ({ data: { data: [] } }));
                        found = (res2.data?.data || []).find(r => r._id === id);
                    }
                    if (found) setHasAccess(true);
                } else {
                    // Student — fetch from enrolled-course recordings
                    const res = await liveSessionService.getStudentRecordings();
                    const recs = res.data?.data || [];
                    found = recs.find(r => r._id === id);

                    if (found) {
                        // Verify cleared enrollment
                        const enrollRes = await enrollmentService.getMyStatus();
                        const enrollments = enrollRes.data?.data || [];
                        const courseId = String(found.course?._id || found.course || '');
                        const cleared = enrollments.some(e => {
                            const eCid = String(e.courseRef?._id || e.courseRef || '');
                            return eCid === courseId &&
                                (e.paymentStatus === 'Cleared' || e.tuitionClearanceFlag === true);
                        });
                        if (!cleared) {
                            setError('You must be enrolled in this course to watch this recording.');
                            return;
                        }
                        setHasAccess(true);
                    }
                }

                if (!found) {
                    setError('Recording not found or you do not have access to it.');
                    return;
                }
                setRecording(found);

                // Restore saved position for video files
                const saved = parseFloat(localStorage.getItem(RESUME_KEY(id)) || '0');
                if (saved > 5) setCurrentTime(saved);
            } catch (err) {
                setError(err?.response?.data?.message || 'Failed to load recording.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isAuthenticated, user]);

    // ── Restore position after video metadata loads ────────
    useEffect(() => {
        if (!videoRef.current || currentTime <= 0) return;
        const el = videoRef.current;
        const handler = () => { if (el) el.currentTime = currentTime; };
        el.addEventListener('loadedmetadata', handler);
        return () => el.removeEventListener('loadedmetadata', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recording]);

    // ── Auto-save position every 5 s ──────────────────────
    useEffect(() => {
        if (!videoRef.current) return;
        const save = () => {
            if (videoRef.current) {
                localStorage.setItem(RESUME_KEY(id), String(videoRef.current.currentTime));
            }
        };
        saveRef.current = setInterval(save, 5000);
        return () => { clearInterval(saveRef.current); save(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ── Fullscreen change listener ─────────────────────────
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // ── Auto-hide controls after 3 s of no mouse movement ─
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => {
            if (playing) setShowControls(false);
        }, 3000);
    }, [playing]);

    // ── Player controls ────────────────────────────────────
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

    // ── Classify the video URL ─────────────────────────────
    const videoUrl  = recording?.videoUrl || '';
    const useEmbed  = isEmbedUrl(videoUrl);
    const useMeeting = isMeetingUrl(videoUrl);
    const useNative = isVideoFile(videoUrl) && !useEmbed;
    // Fallback: if none of the above match, show an open-in-new-tab option
    const useExternal = !useEmbed && !useMeeting && !useNative && videoUrl;

    // ── Loading / error states ────────────────────────────
    if (!isAuthenticated) return null;

    if (loading) return (
        <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: c.textMuted }}>
                <Loader size={40} style={{ animation: 'rppSpin .8s linear infinite' }} />
                <p style={{ margin: 0 }}>Loading recording…</p>
                <style>{`@keyframes rppSpin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    );

    if (error || !hasAccess) return (
        <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={56} color="#ef4444" />
                <h2 style={{ color: c.text, fontSize: '22px', fontWeight: '800', margin: 0 }}>Access Denied</h2>
                <p style={{ color: c.textMuted, fontSize: '15px', maxWidth: '440px', lineHeight: 1.7, margin: 0 }}>
                    {error || 'You do not have permission to watch this recording.'}
                </p>
                <button onClick={() => navigate(-1)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        </div>
    );

    if (!recording) return null;

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div style={{ minHeight: '100vh', background: c.bg, fontFamily: "'Segoe UI', sans-serif" }}>
            <Navbar />

            <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 20px 60px' }}>
                {/* Back */}
                <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
                    <ArrowLeft size={14} /> Back
                </button>

                {/* ── Video area ──────────────────────────────── */}
                <div
                    ref={playerWrapRef}
                    onMouseMove={showControlsTemporarily}
                    style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative' }}
                >
                    {/* ── IFRAME embed (Bunny Stream / YouTube / Vimeo / Zoom replay) ── */}
                    {useEmbed && (
                        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                            <iframe
                                src={videoUrl}
                                title={recording.title}
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                            />
                        </div>
                    )}

                    {/* ── Native HTML5 video ─────────────────────────────────────────── */}
                    {useNative && (
                        <div style={{ position: 'relative' }}>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                style={{ width: '100%', display: 'block', maxHeight: '580px', background: '#000', cursor: showControls ? 'default' : 'none' }}
                                onClick={togglePlay}
                                onTimeUpdate={() => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); }}
                                onDurationChange={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                onEnded={() => { setPlaying(false); setShowControls(true); localStorage.removeItem(RESUME_KEY(id)); }}
                                playsInline
                            />

                            {/* Big play overlay when paused */}
                            {!playing && (
                                <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.25)' }}>
                                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)' }}>
                                        <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: '4px' }} />
                                    </div>
                                </div>
                            )}

                            {/* Controls bar */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(0,0,0,0.92) 0%,transparent 100%)', padding: '32px 16px 14px', transition: 'opacity 0.25s', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
                                {/* Progress bar */}
                                <div
                                    onClick={onSeekClick}
                                    style={{ height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px', cursor: 'pointer', marginBottom: '12px', position: 'relative' }}
                                >
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

                                    {/* Volume */}
                                    <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                        {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={onVolumeChange} style={{ width: '70px', accentColor: '#22c55e', cursor: 'pointer' }} />

                                    {/* Time */}
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                        {fmtTime(currentTime)} / {fmtTime(duration)}
                                    </span>

                                    <div style={{ flex: 1 }} />

                                    {/* Speed */}
                                    <div style={{ position: 'relative' }}>
                                        <button onClick={() => setShowSpeedMenu(p => !p)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', padding: '5px 10px', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Settings2 size={13} /> {speed}×
                                        </button>
                                        {showSpeedMenu && (
                                            <div style={{ position: 'absolute', bottom: '38px', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', zIndex: 20, minWidth: '80px' }}>
                                                {SPEEDS.map(s => (
                                                    <button key={s} onClick={() => setPlaybackSpeed(s)} style={{ display: 'block', width: '100%', padding: '8px 18px', background: speed === s ? 'rgba(34,197,94,0.2)' : 'transparent', color: speed === s ? '#4ade80' : '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: speed === s ? '800' : '400', textAlign: 'center' }}>
                                                        {s}×
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Fullscreen */}
                                    <button onClick={toggleFullscreen} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Meeting platform link (Jitsi / Zoom / Meet replay) ─────────── */}
                    {(useMeeting || useExternal) && (
                        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: '#0f172a' }}>
                            <Film size={56} color="#a5b4fc" />
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ color: '#fff', fontWeight: '700', fontSize: '16px', margin: '0 0 8px' }}>
                                    {useMeeting ? 'This recording is hosted on the meeting platform.' : 'This recording is available at an external URL.'}
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 20px' }}>
                                    {useMeeting
                                        ? 'Click the button below to open the replay in a new tab.'
                                        : 'Click below to open the recording.'}
                                </p>
                                <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', borderRadius: '12px', padding: '14px 32px', fontWeight: '800', fontSize: '15px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}
                                >
                                    <Play size={18} fill="#fff" /> Play Recording
                                    <ExternalLink size={15} style={{ marginLeft: '4px', opacity: 0.7 }} />
                                </a>
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '12px' }}>Opens in a new tab</p>
                            </div>
                        </div>
                    )}

                    {/* ── No video URL at all ────────────────────────────────────────── */}
                    {!videoUrl && (
                        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#0f172a' }}>
                            <Film size={48} color="#475569" />
                            <p style={{ color: '#475569', margin: 0, fontWeight: '600' }}>Recording video is not available yet.</p>
                        </div>
                    )}
                </div>

                {/* ── Metadata ───────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ color: c.text, fontSize: '26px', fontWeight: '900', margin: '0 0 12px', lineHeight: 1.2 }}>
                            {recording.title}
                        </h1>
                        <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: c.textMuted, flexWrap: 'wrap', marginBottom: '16px' }}>
                            {recording.course?.courseTitle && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <BookOpen size={14} color="#22c55e" /> {recording.course.courseTitle}
                                </span>
                            )}
                            {recording.instructor?.fullName && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <User size={14} color="#22c55e" /> {recording.instructor.fullName}
                                </span>
                            )}
                            {recording.publishedAt && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <CalendarDays size={14} /> {new Date(recording.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            )}
                            {fmtDur(recording.duration) && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Clock size={14} /> {fmtDur(recording.duration)}
                                </span>
                            )}
                        </div>
                        {recording.description && (
                            <p style={{ color: c.textMuted, fontSize: '15px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                                {recording.description}
                            </p>
                        )}
                    </div>

                    {/* Resume hint — only for native video */}
                    {useNative && currentTime > 10 && (
                        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '12px 16px', textAlign: 'center', flexShrink: 0 }}>
                            <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: '700', margin: '0 0 2px' }}>Position saved</p>
                            <p style={{ color: c.textMuted, fontSize: '11px', margin: 0 }}>Resumed at {fmtTime(currentTime)}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
