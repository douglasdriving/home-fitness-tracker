import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Timer from './Timer';

vi.mock('../../utils/sound', () => ({
  playCompletionSound: vi.fn(),
}));

const getProgressBar = (container: HTMLElement) =>
  container.querySelector('.bg-primary.h-2.rounded-full');

describe('Timer progress bar', () => {
  it('renders its own progress bar by default', () => {
    const { container } = render(<Timer duration={30} />);
    expect(getProgressBar(container)).toBeInTheDocument();
  });

  it('hides its own progress bar when hideProgressBar is set', () => {
    const { container } = render(<Timer duration={30} hideProgressBar />);
    expect(getProgressBar(container)).not.toBeInTheDocument();
  });

  it('hides its progress bar for bilateral exercises too', () => {
    const { container } = render(<Timer duration={30} bilateral hideProgressBar />);
    expect(getProgressBar(container)).not.toBeInTheDocument();
  });
});
