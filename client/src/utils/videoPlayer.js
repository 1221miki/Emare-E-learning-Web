/**
 * videoPlayer.js
 *
 * Unified media utility for the Emare ELMS platform.
 *
 * Architecture:
 *   Videos      → Bunny Stream  (iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_GUID)
 *   PDF/Files   → Bunny Storage CDN  (*.b-cdn.net/path/to/file.pdf)
 *   Images      → Cloudinary  (res.cloudinary.com/...)
 *   Avatars     → Cloudinary
 *   YouTube     → ❌ NOT supported — must be migrated to Bunny Stream
 */

// ── Type checks ──────────────────────────────────────────────────────────────

/** Bunny Stream embed URL: https://iframe.mediadelivery.net/embed/LIB/GUID */
export const isBunnyEmbed = (url = '') =>
    /iframe\.mediadelivery\.net\/embed\//i.test(String(url));

/** Bunny CDN direct file URL: https://*.b-cdn.net/... */
export const isBunnyCdn = (url = '') =>
    /\.b-cdn\.net\//i.test(String(url));

/** Bunny Stream play URL (non-embed format — also valid to iframe) */
export const isBunnyPlay = (url = '') =>
    /video\.mediadelivery\.net\//i.test(String(url));

/** Any Bunny URL (embed, CDN, or play page) */
export const isBunnyUrl = (url = '') =>
    isBunnyEmbed(url) || isBunnyCdn(url) || isBunnyPlay(url);

/** Cloudinary image/asset */
export const isCloudinaryUrl = (url = '') =>
    /res\.cloudinary\.com\//i.test(String(url));

/** YouTube URL (watch or short) — kept for detection only, NOT for playback */
export const isYouTubeUrl = (url = '') =>
    /youtube\.com\/|youtu\.be\//i.test(String(url));

/** Direct video file (.mp4, .webm, etc.) */
export const isDirectVideo = (url = '') =>
    /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(String(url));

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
 * Returns the URL to embed in <iframe src="...">.
 * Returns '' if the URL is not a valid playable source.
 *
 * Valid sources:
 *   ✅  https://iframe.mediadelivery.net/embed/LIB/GUID  (Bunny Stream embed)
 *   ✅  https://video.mediadelivery.net/GUID              (Bunny Stream play page)
 *   ✅  https://*.b-cdn.net/path/video.mp4               (Bunny CDN direct — use <video>)
 *   ✅  https://example.com/video.mp4                     (any direct .mp4)
 *   ❌  https://youtu.be/...                              (YouTube — not allowed)
 *   ❌  https://www.youtube.com/watch?...                 (YouTube — not allowed)
 *   ❌  '' / null / undefined                             (empty — no video)
 */
export const getVideoEmbedUrl = (videoUrl = '') => {
    if (!videoUrl) return '';
    const trimmed = String(videoUrl).trim();
    if (!trimmed) return '';

    // ✅ Bunny Stream embed URL — preferred format
    if (isBunnyEmbed(trimmed)) return trimmed;

    // ✅ Bunny Stream play page — also valid in iframe
    if (isBunnyPlay(trimmed)) return trimmed;

    // ✅ Bunny CDN direct video file
    if (isBunnyCdn(trimmed) && isDirectVideo(trimmed)) return trimmed;

    // ✅ Any direct .mp4/.webm URL
    if (isDirectVideo(trimmed)) return trimmed;

    // ❌ YouTube — must be uploaded to Bunny Stream first
    if (isYouTubeUrl(trimmed)) return '';

    // ❌ Everything else (Google Drive, Vimeo, etc.)
    return '';
};

/**
 * getVideoRenderMode
 * Returns how the URL should be rendered:
 *   'iframe'  → <iframe> (Bunny embed / play page)
 *   'video'   → <video controls> (direct .mp4 file)
 *   'none'    → no playable URL
 */
export const getVideoRenderMode = (videoUrl = '') => {
    const trimmed = String(videoUrl || '').trim();
    if (!trimmed) return 'none';

    // Bunny Stream embed or play page → iframe
    if (isBunnyEmbed(trimmed) || isBunnyPlay(trimmed)) return 'iframe';

    // Direct video file (Bunny CDN or plain .mp4) → <video>
    if (isDirectVideo(trimmed)) return 'video';

    return 'none';
};

/**
 * isValidVideoUrl
 * Returns true if the URL can actually be played.
 */
export const isValidVideoUrl = (url = '') => {
    const trimmed = String(url || '').trim();
    return isBunnyEmbed(trimmed) || isBunnyPlay(trimmed) || isDirectVideo(trimmed);
};

/**
 * getVideoErrorReason
 * Returns a human-readable reason why a URL cannot be played,
 * or null if the URL is valid.
 */
export const getVideoErrorReason = (url = '') => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return 'No video URL saved for this lesson.';
    if (isYouTubeUrl(trimmed)) return 'This lesson uses a YouTube link which is no longer supported. The instructor needs to upload the video to Bunny Stream and update the lesson.';
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
