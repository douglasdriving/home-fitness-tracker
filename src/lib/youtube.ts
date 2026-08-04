const YOUTUBE_URL_PATTERN = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(YOUTUBE_URL_PATTERN);
  return match && match[1].length === 11 ? match[1] : null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  // loop+playlist=id makes a single video loop; controls stays on for scrubbing
  return `https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&controls=1`;
}

export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
