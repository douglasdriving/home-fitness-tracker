import { useState } from 'react';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '../../lib/youtube';

interface InlineVideoPlayerProps {
  videoUrl?: string;
  title: string;
}

export default function InlineVideoPlayer({ videoUrl, title }: InlineVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  if (!embedUrl) return null;

  const thumbnailUrl = getYouTubeThumbnailUrl(videoUrl!);

  return (
    <div className="relative w-full pt-[56.25%] bg-background-lighter rounded-lg overflow-hidden">
      {isPlaying ? (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 w-full h-full flex items-center justify-center group bg-cover bg-center"
          style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
          aria-label={`Play video: ${title}`}
        >
          <span className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
          <span className="relative text-5xl drop-shadow-lg">▶️</span>
        </button>
      )}
    </div>
  );
}
