import { describe, it, expect } from 'vitest';
import { getYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from './youtube';

describe('getYouTubeVideoId', () => {
  it('extracts the id from a watch URL', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=kqnua4rHVVA')).toBe('kqnua4rHVVA');
  });

  it('extracts the id from a youtu.be short URL', () => {
    expect(getYouTubeVideoId('https://youtu.be/kqnua4rHVVA')).toBe('kqnua4rHVVA');
  });

  it('extracts the id from a Shorts URL', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/shorts/kqnua4rHVVA')).toBe('kqnua4rHVVA');
  });

  it('returns null for an empty string', () => {
    expect(getYouTubeVideoId('')).toBeNull();
  });

  it('returns null for a non-YouTube URL', () => {
    expect(getYouTubeVideoId('https://example.com/video')).toBeNull();
  });
});

describe('getYouTubeEmbedUrl', () => {
  it('builds an embeddable URL with autoplay for a valid video URL', () => {
    const embedUrl = getYouTubeEmbedUrl('https://www.youtube.com/watch?v=kqnua4rHVVA');
    expect(embedUrl).toContain('https://www.youtube.com/embed/kqnua4rHVVA');
    expect(embedUrl).toContain('autoplay=1');
  });

  it('returns null for an invalid URL', () => {
    expect(getYouTubeEmbedUrl('not a url')).toBeNull();
  });
});

describe('getYouTubeThumbnailUrl', () => {
  it('builds a thumbnail URL for a valid video URL', () => {
    expect(getYouTubeThumbnailUrl('https://www.youtube.com/watch?v=kqnua4rHVVA')).toBe(
      'https://img.youtube.com/vi/kqnua4rHVVA/hqdefault.jpg'
    );
  });

  it('returns null for an invalid URL', () => {
    expect(getYouTubeThumbnailUrl('not a url')).toBeNull();
  });
});
