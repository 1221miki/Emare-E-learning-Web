import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize } from 'lucide-react';

const SPEEDS = [0.5, 1, 1.5, 2];
const GOLD = '#f59e0b';

function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    borderRadius: '999px',
    color: '#fbbf24',
    cursor: 'pointer',
    padding: '8px 10px',
    transition: 'background 0.15s, transform 0.1s',
};

export default function HeroVideoControls({ videoRef, muted, onSetMuted }) {
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [speed, setSpeed] = useState(1);
    const [showSpeed, setShowSpeed] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [hover, setHover] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [visible, setVisible] = useState(true);
    const barRef = useRef(null);
    const hideTimer = useRef(null);

    const getVideo = useCallback(() => videoRef.current, [videoRef]);

    const resetHideTimer = useCallback(() => {
        setVisible(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 3000);
    }, []);

    useEffect(() => {
        resetHideTimer();
        return () => clearTimeout(hideTimer.current);
    }, [resetHideTimer]);

    useEffect(() => {
        const el = getVideo();
        if (!el) return;
        const onTime = () => setCurrent(el.currentTime);
        const onMeta = () => setDuration(isFinite(el.duration) ? el.duration : 0);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onVol = () => setVolume(el.volume);
        const onEnded = () => setPlaying(false);
        const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
        const onMove = () => resetHideTimer();
        el.addEventListener('timeupdate', onTime);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        el.addEventListener('volumechange', onVol);
        el.addEventListener('ended', onEnded);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('pointermove', onMove);
        document.addEventListener('fullscreenchange', onFs);
        return () => {
            el.removeEventListener('timeupdate', onTime);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('volumechange', onVol);
            el.removeEventListener('ended', onEnded);
            el.removeEventListener('mousemove', onMove);
            el.removeEventListener('pointermove', onMove);
            document.removeEventListener('fullscreenchange', onFs);
        };
    }, [getVideo, resetHideTimer]);

    const togglePlay = () => {
        const el = getVideo();
        if (!el) return;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
        resetHideTimer();
    };

    const seekFromClientX = (clientX) => {
        const el = getVideo();
        const bar = barRef.current;
        if (!el || !bar || !duration) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        el.currentTime = ratio * duration;
        setCurrent(el.currentTime);
    };

    const onTrackMove = (e) => {
        const bar = barRef.current;
        if (!bar || !duration) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        setHover(ratio * duration);
        if (dragging) seekFromClientX(e.clientX);
    };

    const toggleMute = () => {
        onSetMuted(!muted);
        resetHideTimer();
    };

    const changeVolume = (e) => {
        const el = getVideo();
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (el) {
            el.volume = v;
            if (v > 0 && el.muted) onSetMuted(false);
            if (v === 0 && !el.muted) onSetMuted(true);
        }
        resetHideTimer();
    };

    const changeSpeed = (rate) => {
        const el = getVideo();
        setSpeed(rate);
        setShowSpeed(false);
        if (el) el.playbackRate = rate;
        resetHideTimer();
    };

    const toggleFullscreen = async () => {
        const el = getVideo();
        if (!el) return;
        const wrap = el.parentElement;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (wrap?.requestFullscreen) await wrap.requestFullscreen();
        } catch (err) {
            console.error('Fullscreen failed:', err);
        }
        resetHideTimer();
    };

    const progress = duration ? (current / duration) * 100 : 0;
    const show = visible || showSpeed;
    const hoverPercent = hover != null && duration ? (hover / duration) * 100 : 0;

    return (
        <div
            onMouseMove={resetHideTimer}
            onTouchStart={resetHideTimer}
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '18px 16px 14px',
                boxSizing: 'border-box',
                background: 'linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.65) 55%, rgba(2,6,23,0.92) 100%)',
                borderTop: '2px solid rgba(245,158,11,0.55)',
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.25s, transform 0.25s',
            }}
        >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {hover != null && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: `calc(${hoverPercent}% - 24px)`,
                            background: '#0f172a',
                            color: '#fff',
                            border: '1px solid rgba(245,158,11,0.4)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 5,
                        }}
                    >
                        {formatTime(hover)}
                    </div>
                )}
                <div
                    ref={barRef}
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        setDragging(true);
                        seekFromClientX(e.clientX);
                        resetHideTimer();
                    }}
                    onPointerMove={onTrackMove}
                    onPointerUp={() => setDragging(false)}
                    onPointerLeave={() => { if (!dragging) setHover(null); }}
                    style={{ flex: 1, height: '18px', display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}
                >
                    <div style={{ position: 'relative', width: '100%', height: '5px', borderRadius: '999px', background: 'rgba(148,163,184,0.35)' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: 'linear-gradient(90deg, #eab308, #f59e0b)', borderRadius: '999px' }} />
                        <div style={{ position: 'absolute', left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '13px', height: '13px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }} />
                    </div>
                </div>
                <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(current)} / {formatTime(duration)}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" onClick={togglePlay} style={pillStyle} aria-label={playing ? 'Pause video' : 'Play video'} title={playing ? 'Pause' : 'Play'}>
                    {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                </button>

                <div style={{ ...pillStyle, cursor: 'default', padding: '6px 12px' }}>
                    <button
                        type="button"
                        onClick={toggleMute}
                        style={{ ...pillStyle, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}
                        aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
                        title={muted || volume === 0 ? 'Unmute' : 'Mute'}
                    >
                        {muted || volume === 0 ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={muted ? 0 : volume}
                        onChange={changeVolume}
                        aria-label="Volume"
                        title="Volume"
                        style={{ width: '70px', accentColor: GOLD, cursor: 'pointer' }}
                    />
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setShowSpeed(s => !s)}
                        style={pillStyle}
                        aria-label="Playback speed"
                        title="Playback speed"
                    >
                        <Settings size={16} aria-hidden="true" /> {speed}x
                    </button>
                    {showSpeed && (
                        <div style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 10px)',
                            right: 0,
                            background: '#0f172a',
                            border: '1px solid rgba(148,163,184,0.3)',
                            borderRadius: '10px',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            minWidth: '110px',
                        }}>
                            {SPEEDS.map(rate => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => changeSpeed(rate)}
                                    style={{
                                        background: rate === speed ? 'rgba(245,158,11,0.2)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: rate === speed ? '#fbbf24' : '#e2e8f0',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        padding: '7px 12px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={toggleFullscreen}
                    style={pillStyle}
                    aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                    {fullscreen ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
                </button>
            </div>
        </div>
    );
}
