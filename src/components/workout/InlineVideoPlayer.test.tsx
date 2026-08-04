import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineVideoPlayer from './InlineVideoPlayer';

const VIDEO_URL = 'https://www.youtube.com/watch?v=kqnua4rHVVA';

describe('InlineVideoPlayer', () => {
  it('renders nothing when there is no video URL', () => {
    const { container } = render(<InlineVideoPlayer title="Cat-Cow Flow" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not autoplay — shows a play button instead of an iframe on first render', () => {
    render(<InlineVideoPlayer videoUrl={VIDEO_URL} title="Cat-Cow Flow" />);
    expect(screen.getByRole('button', { name: /play video/i })).toBeInTheDocument();
    expect(screen.queryByTitle('Cat-Cow Flow')).not.toBeInTheDocument();
  });

  it('starts the video only after the user clicks play', () => {
    render(<InlineVideoPlayer videoUrl={VIDEO_URL} title="Cat-Cow Flow" />);

    fireEvent.click(screen.getByRole('button', { name: /play video/i }));

    const iframe = screen.getByTitle('Cat-Cow Flow');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('autoplay=1');
    expect(screen.queryByRole('button', { name: /play video/i })).not.toBeInTheDocument();
  });
});
