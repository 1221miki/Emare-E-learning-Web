import { describe, expect, it } from 'vitest';
import { getLessonVideoUrl, getVideoEmbedUrl } from './videoPlayer';

describe('videoPlayer utilities', () => {
  it('returns a lesson video URL from common lesson field names', () => {
    expect(getLessonVideoUrl({ videoUrl: 'https://cdn.example.com/lesson.mp4' })).toBe('https://cdn.example.com/lesson.mp4');
    expect(getLessonVideoUrl({ videoAssetURL: 'https://cdn.example.com/asset.mp4' })).toBe('https://cdn.example.com/asset.mp4');
  });

  it('converts YouTube URLs into embed URLs', () => {
    expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });
});
