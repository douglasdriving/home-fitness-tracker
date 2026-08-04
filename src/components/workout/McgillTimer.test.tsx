import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import McgillTimer from './McgillTimer';

// Mock the sound module
vi.mock('../../utils/sound', () => ({
  playCompletionSound: vi.fn(),
}));

describe('McgillTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial idle state', () => {
    render(<McgillTimer rounds={3} holdDuration={10} />);

    expect(screen.getByText('Ready to start')).toBeInTheDocument();
    expect(screen.getByText('10s')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('does not wrap itself in its own boxed card (avoids double-boxing inside the parent card)', () => {
    const { container } = render(<McgillTimer rounds={3} holdDuration={10} />);
    expect(container.querySelector('.bg-gray-50')).not.toBeInTheDocument();
    expect(container.querySelector('.border-gray-200')).not.toBeInTheDocument();
  });

  it('starts on left side hold when Start is clicked', () => {
    render(<McgillTimer rounds={3} holdDuration={10} />);

    act(() => {
      screen.getByText('Start').click();
    });

    expect(screen.getByText(/Left Side — Hold 1 of 3/)).toBeInTheDocument();
  });

  it('progresses through all left-side rounds before transitioning', () => {
    const onComplete = vi.fn();
    render(
      <McgillTimer
        rounds={2}
        holdDuration={5}
        restBetweenRounds={3}
        transitionDuration={5}
        onComplete={onComplete}
      />
    );

    // Start timer
    act(() => {
      screen.getByText('Start').click();
    });

    // Should be on left-hold round 1
    expect(screen.getByText(/Left Side — Hold 1 of 2/)).toBeInTheDocument();

    // Advance through the first 5s hold
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should be on left-rest (between rounds on same side)
    expect(screen.getByText('Left Side — Rest')).toBeInTheDocument();

    // Advance through 3s rest
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should be on left-hold round 2
    expect(screen.getByText(/Left Side — Hold 2 of 2/)).toBeInTheDocument();

    // Advance through second hold
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // All left rounds done, should now be transitioning
    expect(screen.getByText('Switch to Right Side')).toBeInTheDocument();

    // Advance through transition
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should be on right-hold round 1
    expect(screen.getByText(/Right Side — Hold 1 of 2/)).toBeInTheDocument();

    // Advance through right hold 1
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should be on right-rest
    expect(screen.getByText('Right Side — Rest')).toBeInTheDocument();

    // Advance through rest
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should be on right-hold round 2
    expect(screen.getByText(/Right Side — Hold 2 of 2/)).toBeInTheDocument();

    // Advance through last hold
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should be complete
    expect(screen.getByText('Complete!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('handles single round per side (no rest phases)', () => {
    const onComplete = vi.fn();
    render(
      <McgillTimer
        rounds={1}
        holdDuration={10}
        transitionDuration={5}
        onComplete={onComplete}
      />
    );

    // Start
    act(() => {
      screen.getByText('Start').click();
    });

    expect(screen.getByText(/Left Side — Hold 1 of 1/)).toBeInTheDocument();

    // Complete left hold
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should go directly to transition (no rest since only 1 round)
    expect(screen.getByText('Switch to Right Side')).toBeInTheDocument();

    // Complete transition
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Right Side — Hold 1 of 1/)).toBeInTheDocument();

    // Complete right hold
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Complete!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows round dots for multi-round sets', () => {
    render(<McgillTimer rounds={3} holdDuration={10} />);

    // Start timer
    act(() => {
      screen.getByText('Start').click();
    });

    // Should show L and R labels for round dots
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('does not show round dots for single round', () => {
    render(<McgillTimer rounds={1} holdDuration={10} />);

    // Start timer
    act(() => {
      screen.getByText('Start').click();
    });

    // Should not show round dot labels (rounds <= 1)
    expect(screen.queryByText('L')).not.toBeInTheDocument();
    expect(screen.queryByText('R')).not.toBeInTheDocument();
  });

  it('skip button completes the timer immediately', () => {
    const onComplete = vi.fn();
    render(
      <McgillTimer rounds={3} holdDuration={10} onComplete={onComplete} />
    );

    // Start
    act(() => {
      screen.getByText('Start').click();
    });

    // Click skip
    act(() => {
      screen.getByText('Skip').click();
    });

    expect(screen.getByText('Complete!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('pause and resume works correctly', () => {
    render(<McgillTimer rounds={2} holdDuration={10} />);

    // Start
    act(() => {
      screen.getByText('Start').click();
    });

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Pause
    act(() => {
      screen.getByText('Pause').click();
    });

    expect(screen.getByText('7s')).toBeInTheDocument();

    // Advance 5 more seconds while paused
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should still be at 7s
    expect(screen.getByText('7s')).toBeInTheDocument();

    // Resume
    act(() => {
      screen.getByText('Resume').click();
    });

    // Advance 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('never exceeds total rounds (no "round 4 of 3" bug)', () => {
    const onComplete = vi.fn();
    render(
      <McgillTimer
        rounds={3}
        holdDuration={5}
        restBetweenRounds={2}
        transitionDuration={3}
        onComplete={onComplete}
      />
    );

    // Start
    act(() => {
      screen.getByText('Start').click();
    });

    // Step through each phase individually to verify no round overflow
    // Phase durations: hold=5s, rest=2s, transition=3s
    // Left: hold(5) rest(2) hold(5) rest(2) hold(5) = 19s
    // Transition: 3s
    // Right: hold(5) rest(2) hold(5) rest(2) hold(5) = 19s

    // Left Hold 1
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText(/4 of 3/)).not.toBeInTheDocument();
    // Left Rest 1
    act(() => { vi.advanceTimersByTime(2000); });
    // Left Hold 2
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText(/4 of 3/)).not.toBeInTheDocument();
    // Left Rest 2
    act(() => { vi.advanceTimersByTime(2000); });
    // Left Hold 3
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText(/4 of 3/)).not.toBeInTheDocument();
    // Transition
    act(() => { vi.advanceTimersByTime(3000); });
    // Right Hold 1
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText(/4 of 3/)).not.toBeInTheDocument();
    // Right Rest 1
    act(() => { vi.advanceTimersByTime(2000); });
    // Right Hold 2
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText(/4 of 3/)).not.toBeInTheDocument();
    // Right Rest 2
    act(() => { vi.advanceTimersByTime(2000); });
    // Right Hold 3
    act(() => { vi.advanceTimersByTime(5000); });

    // Should be complete, never showed "4 of 3"
    expect(screen.getByText('Complete!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('progress bar never moves backward during rest phases', () => {
    const { container } = render(
      <McgillTimer
        rounds={3}
        holdDuration={10}
        restBetweenRounds={5}
        transitionDuration={10}
      />
    );

    const getProgressWidth = () => {
      const progressBar = container.querySelector('.bg-primary.h-2.rounded-full');
      const style = progressBar?.getAttribute('style') || '';
      const match = style.match(/width:\s*([\d.]+)%/);
      return match ? parseFloat(match[1]) : 0;
    };

    // Start timer
    act(() => {
      screen.getByText('Start').click();
    });

    let previousProgress = 0;

    // Advance through the full protocol 1 second at a time,
    // verifying progress never decreases
    // Total time: 3*10*2 (holds) + 2*5*2 (rests) + 10 (transition) = 90s
    for (let i = 0; i < 90; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      const currentProgress = getProgressWidth();
      expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
      previousProgress = currentProgress;
    }
  });

  describe('single-sided mode (perSide=false, e.g. Plank)', () => {
    it('shows "Hold X of Y" without a side label', () => {
      render(<McgillTimer rounds={3} holdDuration={15} perSide={false} />);

      act(() => {
        screen.getByText('Start').click();
      });

      expect(screen.getByText(/^Hold 1 of 3$/)).toBeInTheDocument();
      expect(screen.queryByText(/Left Side/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Right Side/)).not.toBeInTheDocument();
    });

    it('does not render L/R round-dot labels', () => {
      render(<McgillTimer rounds={3} holdDuration={15} perSide={false} />);

      act(() => {
        screen.getByText('Start').click();
      });

      expect(screen.queryByText('L')).not.toBeInTheDocument();
      expect(screen.queryByText('R')).not.toBeInTheDocument();
    });

    it('completes after a single run with no transition or right side', () => {
      const onComplete = vi.fn();
      render(
        <McgillTimer
          rounds={2}
          holdDuration={5}
          restBetweenRounds={3}
          perSide={false}
          onComplete={onComplete}
        />
      );

      act(() => {
        screen.getByText('Start').click();
      });

      // Hold 1
      expect(screen.getByText(/^Hold 1 of 2$/)).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(5000); });

      // Rest (no "Left Side" prefix)
      expect(screen.getByText('Rest')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(3000); });

      // Hold 2
      expect(screen.getByText(/^Hold 2 of 2$/)).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(5000); });

      // Should be complete immediately — no transition, no right side
      expect(screen.queryByText('Switch to Right Side')).not.toBeInTheDocument();
      expect(screen.getByText('Complete!')).toBeInTheDocument();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('progress reaches 100% over the single-sided duration only', () => {
      const { container } = render(
        <McgillTimer
          rounds={2}
          holdDuration={10}
          restBetweenRounds={5}
          perSide={false}
        />
      );

      const getProgressWidth = () => {
        const progressBar = container.querySelector('.bg-primary.h-2.rounded-full');
        const style = progressBar?.getAttribute('style') || '';
        const match = style.match(/width:\s*([\d.]+)%/);
        return match ? parseFloat(match[1]) : 0;
      };

      act(() => {
        screen.getByText('Start').click();
      });

      // Total single-sided time: 2*10 (holds) + 1*5 (rest) = 25s
      let previousProgress = 0;
      for (let i = 0; i < 25; i++) {
        act(() => { vi.advanceTimersByTime(1000); });
        const currentProgress = getProgressWidth();
        expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
        previousProgress = currentProgress;
      }
      expect(previousProgress).toBeGreaterThanOrEqual(99);
    });
  });

  it('matches default McGill protocol: 3 rounds x 10s per side', () => {
    const onComplete = vi.fn();
    render(
      <McgillTimer
        rounds={3}
        holdDuration={10}
        restBetweenRounds={5}
        transitionDuration={10}
        onComplete={onComplete}
      />
    );

    // Start
    act(() => {
      screen.getByText('Start').click();
    });

    // Left Hold 1
    expect(screen.getByText(/Left Side — Hold 1 of 3/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Left Rest 1
    expect(screen.getByText('Left Side — Rest')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });

    // Left Hold 2
    expect(screen.getByText(/Left Side — Hold 2 of 3/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Left Rest 2
    expect(screen.getByText('Left Side — Rest')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });

    // Left Hold 3
    expect(screen.getByText(/Left Side — Hold 3 of 3/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Transition
    expect(screen.getByText('Switch to Right Side')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Right Hold 1
    expect(screen.getByText(/Right Side — Hold 1 of 3/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Right Rest 1
    expect(screen.getByText('Right Side — Rest')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });

    // Right Hold 2
    expect(screen.getByText(/Right Side — Hold 2 of 3/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Right Rest 2
    expect(screen.getByText('Right Side — Rest')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });

    // Right Hold 3
    expect(screen.getByText(/Right Side — Hold 3 of 3/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });

    // Complete
    expect(screen.getByText('Complete!')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
