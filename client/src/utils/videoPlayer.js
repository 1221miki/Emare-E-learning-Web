export const getLessonVideoUrl = (lesson = {}) => {
  if (!lesson || typeof lesson !== 'object') return '';
  return lesson.videoUrl || lesson.videoAssetURL || lesson.assetUrl || lesson.url || '';
};

export const getVideoEmbedUrl = (videoUrl = '') => {
  if (!videoUrl) return '';

  const trimmed = String(videoUrl).trim();
  const youtubeMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  return trimmed;
};
