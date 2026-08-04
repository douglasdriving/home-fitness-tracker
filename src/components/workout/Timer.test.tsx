import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timer from './Timer';

vi.mock('../../utils/sound', () => ({
  playCompletionSound: vi.fn(),
}));

describe('Timer box nesting', () => {
  it('does not wrap itself in its own boxed card (avoids double-boxing inside the parent card)', () => {
    const { container } = render(<Timer duration={30} />);
    expect(container.querySelector('.bg-gray-50')).not.toBeInTheDocument();
    expect(container.querySelector('.border-gray-200')).not.toBeInTheDocument();
  });

  it('still renders its own progress bar, status, and controls after unboxing', () => {
    render(<Timer duration={30} />);
    expect(screen.getByText('Timer Paused')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });
});

describe('Timer bilateral side labels', () => {
  it('labels the first side "Side 1", not "Left Side"', () => {
    render(<Timer duration={10} bilateral />);
    expect(screen.getByText('Side 1')).toBeInTheDocument();
    expect(screen.queryByText('Left Side')).not.toBeInTheDocument();
  });
});
