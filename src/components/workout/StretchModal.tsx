import { StretchExercise } from '../../data/stretchingData';

interface StretchModalProps {
  stretch: StretchExercise;
  onClose: () => void;
}

export default function StretchModal({ stretch, onClose }: StretchModalProps) {
  // Extract YouTube video ID from URL
  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;

    // Handle different YouTube URL formats including Shorts
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      // Add autoplay, loop, mute, and playlist (required for loop to work)
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&loop=1&mute=1&playlist=${match[2]}&controls=1`;
    }

    return null;
  };

  const embedUrl = stretch.videoUrl ? getYouTubeEmbedUrl(stretch.videoUrl) : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background-light rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-background-lighter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background-light border-b border-background-lighter p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text">{stretch.name}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Muscles */}
          <div className="flex gap-2 flex-wrap">
            {stretch.targetMuscles.map((muscle, idx) => (
              <span
                key={idx}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-semibold"
              >
                {muscle}
              </span>
            ))}
          </div>

          {/* Video */}
          {embedUrl && (
            <div className="relative w-full pt-[56.25%] bg-background-lighter rounded-lg overflow-hidden">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={embedUrl}
                title={stretch.name}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Instructions */}
          <div className="bg-background-lighter rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text mb-2">How to perform:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-text leading-relaxed">
              {stretch.instructions.map((instruction, idx) => (
                <li key={idx}>{instruction}</li>
              ))}
            </ol>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Duration:</span>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-600">
              {stretch.duration}s
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background-light border-t border-background-lighter p-4">
          <button
            onClick={onClose}
            className="w-full bg-purple-600 text-white hover:bg-purple-700 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
