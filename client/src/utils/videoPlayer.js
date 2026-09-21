/**
 * videoPlayer.js
 *
 * Unified media utility for the Emare ELMS platform.
 *
 * Architecture:
 *   Videos      → Local storage (/api/local-storage/videos/...) or direct .mp4
 *   YouTube     → YouTube embed (www.youtube.com/embed/VIDEO_ID)
 *   PDF/Files   → Local storage (/api/local-storage/files/...) or Cloudinary
 *   Images      → Cloudinary  (res.cloudinary.com/...)
 *   Avatars     → Cloudinary
 */

// ── Type checks ──────────────────────────────────────────────────────────────

/** Local storage URL: /api/local-storage/... */
export const isLocalStorageUrl = (url = '') =>
    /\/api\/local-storage\//i.test(String(url));

/** Cloudinary image/asset */
export const isCloudinaryUrl = (url = '') =>
    /res\.cloudinary\.com\//i.test(String(url));

/** YouTube URL — watch, short, embed, or live format */
export const isYouTubeUrl = (url = '') =>
    /youtube\.com\/(watch|embed|shorts|live)|youtu\.be\//i.test(String(url));

/** Direct video file (.mp4, .webm, etc.) */
export const isDirectVideo = (url = '') =>
    /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(String(url));

/** Known third-party iframe embed URLs (already an embed — pass through) */
export const isIframeEmbedUrl = (url = '') =>
    /iframe\.mediadelivery\.net|iframe\.cloudflarestream\.com|player\.vimeo\.com\/video\//i.test(String(url));

/** Meeting platform URLs that should NOT be embedded in iframes (X-Frame-Options blocks them) */
export const isMeetingUrl = (url = '') =>
    /zoom\.us\/j\/|meet\.jit\.si|meet\.google\.com|teams\.microsoft\.com/i.test(String(url));

// ── YouTube helpers ───────────────────────────────────────────────────────────

/**
 * extractYouTubeVideoId
 *
 * Extracts the 11-character video ID from various YouTube URL formats:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
 *   - https://www.youtube.com/live/VIDEO_ID
 *   - https://m.youtube.com/watch?v=VIDEO_ID
 *
 * Returns the video ID string (11 chars) or null if not a valid YouTube video URL.
 * Rejects channel, playlist, search, and other non-video YouTube URLs.
 */
export const extractYouTubeVideoId = (url = '') => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        const hostname = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

        // youtu.be/VIDEO_ID (short link — no query params needed for ID)
        if (hostname === 'youtu.be') {
            const id = parsed.pathname.replace(/^\//, '').split('/')[0].split('?')[0];
            return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }

        // youtube.com variants
        if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
            // /watch?v=VIDEO_ID
            const vParam = parsed.searchParams.get('v');
            if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

            // /embed/VIDEO_ID
            const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
            if (embedMatch) return embedMatch[1];

            // /shorts/VIDEO_ID
            const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
            if (shortsMatch) return shortsMatch[1];

            // /live/VIDEO_ID
            const liveMatch = parsed.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
            if (liveMatch) return liveMatch[1];
        }

        return null;
    } catch {
        // URL parsing failed — not a valid URL
        return null;
    }
};

/**
 * getYouTubeEmbedUrl
 *
 * Converts a YouTube URL to the embeddable iframe URL.
 * Returns the embed URL string or null if the input is not a valid YouTube video.
 *
 * Output format: https://www.youtube.com/embed/VIDEO_ID
 */
export const getYouTubeEmbedUrl = (url = '') => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
};

/**
 * getYouTubeWatchUrl
 *
 * Returns the canonical watch URL for a YouTube video (for "Watch on YouTube" links).
 * Preserves the original URL when possible; falls back to a constructed watch URL.
 */
export const getYouTubeWatchUrl = (url = '') => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * validateYouTubeUrl
 *
 * Comprehensive validation for YouTube URLs. Returns { valid, videoId, error }.
 * - valid: true if the URL is a proper embeddable YouTube video
 * - videoId: the extracted 11-character video ID
 * - error: human-readable error message (only when valid is false)
 */
export const validateYouTubeUrl = (url = '') => {
    const trimmed = String(url || '').trim();
    if (!trimmed) {
        return { valid: false, videoId: null, error: 'YouTube URL is required.' };
    }

    // Must be a URL we can parse
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { valid: false, videoId: null, error: 'Invalid URL format. Please paste a valid YouTube video URL.' };
    }

    // Must be youtube.com or youtu.be
    const hostname = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (hostname !== 'youtube.com' && hostname !== 'youtu.be' && hostname !== 'youtube-nocookie.com') {
        return { valid: false, videoId: null, error: 'This is not a YouTube URL. Please use a URL from youtube.com or youtu.be.' };
    }

    // Reject playlist URLs
    if (parsed.searchParams.has('list')) {
        return { valid: false, videoId: null, error: 'Playlist URLs are not supported. Please use a direct video URL (without a playlist parameter).' };
    }

    // Reject channel / user pages
    const pathname = parsed.pathname;
    if (/^\/(channel|user|c|@)\/|\/$/.test(pathname) || pathname === '') {
        return { valid: false, videoId: null, error: 'This appears to be a YouTube channel page, not a video. Please use a direct video URL.' };
    }

    const videoId = extractYouTubeVideoId(trimmed);
    if (!videoId) {
        return { valid: false, videoId: null, error: 'Could not extract a video ID from this URL. Please use a direct YouTube video link (e.g. https://www.youtube.com/watch?v=VIDEO_ID).' };
    }

    return { valid: true, videoId, error: null };
};

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * getLessonVideoUrl
 * Extracts the raw videoUrl from a lesson object.
 */
export const getLessonVideoUrl = (lesson = {}) => {
    if (!lesson || typeof lesson !== 'object') return '';
    return lesson.videoUrl || lesson.videoAssetURL || lesson.assetUrl || lesson.url || '';
};

/**
 * getVideoEmbedUrl
 *
 * Returns the URL to embed in <iframe> or use in <video src="...">.
 * Returns '' if the URL is not a valid playable source.
 *
 * Valid sources:
 *   ✅  /api/local-storage/videos/...          (local storage video)
 *   ✅  https://example.com/video.mp4          (any direct .mp4)
 *   ✅  https://www.youtube.com/watch?...      (YouTube — embeddable)
 *   ✅  https://youtu.be/...                   (YouTube — embeddable)
 *   ❌  '' / null / undefined                  (empty — no video)
 */
export const getVideoEmbedUrl = (videoUrl = '') => {
    if (!videoUrl) return '';
    const trimmed = String(videoUrl).trim();
    if (!trimmed) return '';

    // ✅ Local storage video — pass through directly
    if (isLocalStorageUrl(trimmed)) return trimmed;

    // ✅ Any direct .mp4/.webm URL
    if (isDirectVideo(trimmed)) return trimmed;

    // ✅ YouTube — convert to embed URL
    if (isYouTubeUrl(trimmed)) {
        const embedUrl = getYouTubeEmbedUrl(trimmed);
        return embedUrl || '';
    }

    // ✅ Known third-party iframe embeds (Cloudflare Stream, Vimeo) — pass through
    if (isIframeEmbedUrl(trimmed)) return trimmed;

    // ❌ Everything else (Google Drive, etc.)
    return '';
};

/**
 * getVideoRenderMode
 * Returns how the URL should be rendered:
 *   'video'    → <video controls> (local storage or direct .mp4 file)
 *   'youtube'  → <iframe> (YouTube embed)
 *   'iframe'   → <iframe> (known third-party embeds like Cloudflare Stream, Vimeo)
 *   'meeting'  → external link (Zoom, Jitsi, Google Meet, Teams - X-Frame-Options blocks iframe)
 *   'none'     → no playable URL
 */
export const getVideoRenderMode = (videoUrl = '', videoSource = '') => {
    const trimmed = String(videoUrl || '').trim();
    if (!trimmed) return 'none';

    // Explicit YouTube source or detected YouTube URL
    if (videoSource === 'youtube' || isYouTubeUrl(trimmed)) return 'youtube';

    // Meeting URLs - open in new tab, don't embed
    if (isMeetingUrl(trimmed)) return 'meeting';

    // Local storage video → <video> element (supports checkpoints)
    if (isLocalStorageUrl(trimmed)) return 'video';

    // Direct video file → <video>
    if (isDirectVideo(trimmed)) return 'video';

    // Known third-party iframe embeds → <iframe>
    if (isIframeEmbedUrl(trimmed)) return 'iframe';

    return 'none';
};

/**
 * isValidVideoUrl
 * Returns true if the URL can actually be played.
 */
export const isValidVideoUrl = (url = '') => {
    const trimmed = String(url || '').trim();
    if (isYouTubeUrl(trimmed)) return !!extractYouTubeVideoId(trimmed);
    return isLocalStorageUrl(trimmed) || isDirectVideo(trimmed) || isIframeEmbedUrl(trimmed);
};

/**
 * getVideoErrorReason
 * Returns a human-readable reason why a URL cannot be played,
 * or null if the URL is valid.
 */
export const getVideoErrorReason = (url = '') => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return 'No video URL saved for this lesson.';
    if (isYouTubeUrl(trimmed)) {
        const validation = validateYouTubeUrl(trimmed);
        if (!validation.valid) return validation.error;
        return null; // valid YouTube URL
    }
    if (!isValidVideoUrl(trimmed)) return 'The video URL for this lesson is not in a supported format. Please contact the instructor.';
    return null; // valid
};

/**
 * getPdfUrl
 * Returns the PDF/file URL from a lesson object.
 */
export const getPdfUrl = (lesson = {}) => {
    if (!lesson || typeof lesson !== 'object') return '';
    return String(lesson.notesPdfUrl || lesson.pdfUrl || lesson.resourceLink || '').trim();
};
