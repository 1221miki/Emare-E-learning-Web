import { describe, expect, it } from 'vitest';
import {
    getLessonVideoUrl, getVideoEmbedUrl, getVideoRenderMode,
    isYouTubeUrl, extractYouTubeVideoId, getYouTubeEmbedUrl,
    getYouTubeWatchUrl, validateYouTubeUrl, isValidVideoUrl
} from './videoPlayer';

describe('videoPlayer utilities', () => {
    it('returns a lesson video URL from common lesson field names', () => {
        expect(getLessonVideoUrl({ videoUrl: 'https://cdn.example.com/lesson.mp4' })).toBe('https://cdn.example.com/lesson.mp4');
        expect(getLessonVideoUrl({ videoAssetURL: 'https://cdn.example.com/asset.mp4' })).toBe('https://cdn.example.com/asset.mp4');
    });

    describe('YouTube URL detection', () => {
        it('detects YouTube watch URLs', () => {
            expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
            expect(isYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
            expect(isYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
        });

        it('detects YouTube short URLs', () => {
            expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
        });

        it('detects YouTube embed URLs', () => {
            expect(isYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
        });

        it('detects YouTube shorts URLs', () => {
            expect(isYouTubeUrl('https://www.youtube.com/shorts/abc12345678')).toBe(true);
        });

        it('rejects non-YouTube URLs', () => {
            expect(isYouTubeUrl('https://vimeo.com/123456')).toBe(false);
            expect(isYouTubeUrl('https://example.com/video')).toBe(false);
        });
    });

    describe('YouTube video ID extraction', () => {
        it('extracts ID from watch URLs', () => {
            expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        });

        it('extracts ID from short URLs', () => {
            expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        });

        it('extracts ID from embed URLs', () => {
            expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        });

        it('extracts ID from shorts URLs', () => {
            expect(extractYouTubeVideoId('https://www.youtube.com/shorts/abc12345678')).toBe('abc12345678');
        });

        it('returns null for invalid URLs', () => {
            expect(extractYouTubeVideoId('https://vimeo.com/123')).toBeNull();
            expect(extractYouTubeVideoId('')).toBeNull();
            expect(extractYouTubeVideoId('not-a-url')).toBeNull();
        });
    });

    describe('YouTube embed URL generation', () => {
        it('generates embed URL from watch URL', () => {
            expect(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        it('generates embed URL from short URL', () => {
            expect(getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        it('returns null for invalid URLs', () => {
            expect(getYouTubeEmbedUrl('https://vimeo.com/123')).toBeNull();
            expect(getYouTubeEmbedUrl('')).toBeNull();
        });
    });

    describe('YouTube watch URL generation', () => {
        it('generates watch URL from short URL', () => {
            expect(getYouTubeWatchUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        });

        it('returns null for invalid URLs', () => {
            expect(getYouTubeWatchUrl('')).toBeNull();
        });
    });

    describe('YouTube URL validation', () => {
        it('validates correct YouTube URLs', () => {
            const result = validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result.valid).toBe(true);
            expect(result.videoId).toBe('dQw4w9WgXcQ');
            expect(result.error).toBeNull();
        });

        it('rejects empty URLs', () => {
            const result = validateYouTubeUrl('');
            expect(result.valid).toBe(false);
            expect(result.error).toBeTruthy();
        });

        it('rejects non-YouTube URLs', () => {
            const result = validateYouTubeUrl('https://vimeo.com/123');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('YouTube');
        });

        it('rejects playlist URLs', () => {
            const result = validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Playlist');
        });

        it('rejects channel pages', () => {
            const result = validateYouTubeUrl('https://www.youtube.com/@channelname');
            expect(result.valid).toBe(false);
        });
    });

    describe('getVideoEmbedUrl', () => {
        it('converts YouTube URLs into embed URLs', () => {
            expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        it('returns empty string for invalid URLs', () => {
            expect(getVideoEmbedUrl('')).toBe('');
            expect(getVideoEmbedUrl('https://vimeo.com/123')).toBe('');
        });
    });

    describe('getVideoRenderMode', () => {
        it('returns youtube for YouTube URLs', () => {
            expect(getVideoRenderMode('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
        });

        it('returns youtube when videoSource is youtube', () => {
            expect(getVideoRenderMode('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube')).toBe('youtube');
        });

        it('returns video for direct MP4 URLs', () => {
            expect(getVideoRenderMode('https://example.com/video.mp4')).toBe('video');
        });

        it('returns none for empty URLs', () => {
            expect(getVideoRenderMode('')).toBe('none');
        });
    });

    describe('isValidVideoUrl', () => {
        it('accepts valid YouTube URLs', () => {
            expect(isValidVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
            expect(isValidVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
        });

        it('rejects invalid URLs', () => {
            expect(isValidVideoUrl('')).toBe(false);
            expect(isValidVideoUrl('https://vimeo.com/123')).toBe(false);
        });
    });
});
