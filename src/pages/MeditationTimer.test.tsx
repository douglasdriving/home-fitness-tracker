import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import MeditationTimer from './MeditationTimer';
import { useUserStore } from '../store/user-store';

// Mock the store
vi.mock('../store/user-store', () => ({
  useUserStore: vi.fn(),
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock wake lock hook
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: vi.fn(),
}));

// Mock Timer component - countdown mode (no countUp prop)
vi.mock('../components/workout/Timer', () => ({
  default: ({ duration, onComplete }: { duration: number; onComplete?: () => void }) => (
    <div data-testid="timer">
      <div>Duration: {duration}s</div>
      <button onClick={onComplete}>Complete Timer</button>
    </div>
  ),
}));

describe('MeditationTimer', () => {
  const mockNavigate = vi.fn();
  const mockCompleteMeditation = vi.fn();

  const defaultProfile = {
    userId: 'test-user',
    createdDate: Date.now(),
    calibrationCompleted: true,
    strengthLevels: { abs: 5, glutes: 5, lowerBack: 5, lastUpdated: Date.now() },
    preferences: { autoShowMeditation: true },
    meditationState: {
      completionCount: 0,
      currentDurationSeconds: 60,
    },
  };

  const defaultCompletionState = {
    workoutId: 'workout-123',
    completedExercises: [],
    totalReps: 100,
    totalDuration: 600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    (useLocation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {
        completionState: defaultCompletionState,
        workoutId: 'workout-123',
      },
    });
    (useUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      profile: defaultProfile,
      completeMeditation: mockCompleteMeditation,
    });
  });

  it('should render meditation timer with correct initial duration', () => {
    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    expect(screen.getByText(/Duration: 60s/)).toBeInTheDocument();
    expect(screen.getByTestId('timer')).toBeInTheDocument();
  });

  it('should pass correct duration for different completion counts', () => {
    (useUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      profile: {
        ...defaultProfile,
        meditationState: { completionCount: 10, currentDurationSeconds: 180 },
      },
      completeMeditation: mockCompleteMeditation,
    });

    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    expect(screen.getByText(/Duration: 180s/)).toBeInTheDocument();
  });

  it('should call completeMeditation and navigate on timer completion', async () => {
    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    const completeButton = screen.getByText('Complete Timer');
    fireEvent.click(completeButton);

    // Completion is recorded immediately; navigation is delayed ~1s so the
    // completion bell can ring fully before the screen transitions.
    expect(mockCompleteMeditation).toHaveBeenCalledTimes(1);

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/workout-complete', {
          state: defaultCompletionState,
        });
      },
      { timeout: 2000 }
    );
  });

  describe('delayed navigation after completion', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('should record completion immediately but NOT navigate right away', () => {
      render(
        <BrowserRouter>
          <MeditationTimer />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Complete Timer'));

      // Completion is recorded synchronously so progression isn't lost
      expect(mockCompleteMeditation).toHaveBeenCalledTimes(1);
      // ...but navigation is deferred to let the bell ring fully
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to workout-complete after ~1 second delay', () => {
      render(
        <BrowserRouter>
          <MeditationTimer />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Complete Timer'));

      // Just before the delay elapses, still no navigation
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(mockNavigate).not.toHaveBeenCalled();

      // After the full delay, navigation fires once with the passthrough state
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/workout-complete', {
        state: defaultCompletionState,
      });
    });

    it('should navigate only once even if more time passes', () => {
      render(
        <BrowserRouter>
          <MeditationTimer />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Complete Timer'));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate immediately on Skip and not double-navigate after completion', () => {
      render(
        <BrowserRouter>
          <MeditationTimer />
        </BrowserRouter>
      );

      // Complete first (schedules delayed navigation)...
      fireEvent.click(screen.getByText('Complete Timer'));
      // ...then hit the header Skip before the delay elapses
      fireEvent.click(screen.getByText(/Skip/));

      // Skip navigates immediately
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/workout-complete', {
        state: defaultCompletionState,
      });

      // The pending completion timeout must have been cancelled
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should not navigate after unmount during the delay window', () => {
      const { unmount } = render(
        <BrowserRouter>
          <MeditationTimer />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Complete Timer'));
      unmount();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('should navigate to workout-complete on skip without calling completeMeditation', () => {
    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    const skipButton = screen.getByText(/Skip/);
    fireEvent.click(skipButton);

    expect(mockCompleteMeditation).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/workout-complete', {
      state: defaultCompletionState,
    });
  });

  it('should redirect to home if no completion state provided', () => {
    (useLocation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      state: null,
    });

    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle missing meditation state with defaults', () => {
    (useUserStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      profile: {
        ...defaultProfile,
        meditationState: undefined,
      },
      completeMeditation: mockCompleteMeditation,
    });

    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    expect(screen.getByText(/Duration: 60s/)).toBeInTheDocument();
  });

  it('should render header with title and skip button', () => {
    render(
      <BrowserRouter>
        <MeditationTimer />
      </BrowserRouter>
    );

    expect(screen.getByText(/Meditation/)).toBeInTheDocument();
    expect(screen.getByText(/Skip/)).toBeInTheDocument();
  });
});
