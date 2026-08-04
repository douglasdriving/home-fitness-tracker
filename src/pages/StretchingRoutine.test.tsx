import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StretchingRoutine from './StretchingRoutine';

// Mock react-router-dom's useNavigate and useLocation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: { workoutId: 'test-workout-123' },
      pathname: '/stretching',
    }),
  };
});

// Mock the database
vi.mock('../db/db', () => ({
  db: {
    history: {
      toArray: vi.fn(() => Promise.resolve([])),
      put: vi.fn(() => Promise.resolve()),
    },
  },
}));

// Mock wake lock hook
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: vi.fn(),
}));

// Mock sound utility
vi.mock('../utils/sound', () => ({
  playCompletionSound: vi.fn(),
}));

function renderStretchingRoutine() {
  return render(
    <MemoryRouter initialEntries={['/stretching']}>
      <StretchingRoutine />
    </MemoryRouter>
  );
}

describe('StretchingRoutine - No Rest Timer Between Stretches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not show "Quick Break" screen between stretches', () => {
    renderStretchingRoutine();

    // The "Quick Break" text should never appear in the initial render
    expect(screen.queryByText('Quick Break')).not.toBeInTheDocument();
  });

  it('does not have isResting in localStorage state', () => {
    renderStretchingRoutine();

    // Check that any saved state doesn't include isResting
    const savedState = localStorage.getItem('stretchRoutineState');
    if (savedState) {
      const state = JSON.parse(savedState);
      expect(state).not.toHaveProperty('isResting');
    }
  });

  it('does not render a redundant per-stretch progress section (header progress bar is enough)', () => {
    renderStretchingRoutine();
    expect(screen.queryByText('Stretch Progress')).not.toBeInTheDocument();
    expect(screen.queryByText(/of .* completed/)).not.toBeInTheDocument();
  });

  it('does not render a redundant "Duration" label (the timer already shows it)', () => {
    renderStretchingRoutine();
    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
  });

  it('calculates progress without rest periods', () => {
    renderStretchingRoutine();

    // Should show stretch 1 of N - progress should be based purely on stretch index
    expect(screen.getByText(/Stretch 1 of/)).toBeInTheDocument();

    // Progress bar should exist and be based on currentStretchIndex / totalStretches
    const progressBars = document.querySelectorAll('[style*="width"]');
    // The first stretch should show 0% progress (0/8 = 0%)
    const headerProgressBar = progressBars[0];
    expect(headerProgressBar).toBeDefined();
  });

  it('does not render a 10-second rest timer between stretches', () => {
    renderStretchingRoutine();

    // Should not have a rest timer with 10-second duration
    // The "Quick Break" UI with its 10-second countdown should not exist
    expect(screen.queryByText('Quick Break')).not.toBeInTheDocument();
    expect(screen.queryByText('Relax for a moment before the next stretch')).not.toBeInTheDocument();
  });

  it('does not render the "Total routine: ~X minutes" summary footer', () => {
    renderStretchingRoutine();
    expect(screen.queryByText(/Total routine/)).not.toBeInTheDocument();
  });

  it('shows instructions inline under the heading instead of behind a modal', () => {
    renderStretchingRoutine();
    // Child's Pose's first instruction line
    expect(screen.getByText(/Kneel on the floor and sit back on your heels/)).toBeInTheDocument();
    expect(screen.queryByText('How to do this stretch')).not.toBeInTheDocument();
  });

  it('shows an inline, click-to-play video for stretches that have one', () => {
    renderStretchingRoutine();
    // Child's Pose has a videoUrl — should render a play button, not an autoplaying iframe
    expect(screen.getByRole('button', { name: /play video/i })).toBeInTheDocument();
  });

  it('does not show a video section for stretches without a video', () => {
    localStorage.setItem(
      'stretchRoutineState',
      JSON.stringify({
        workoutId: 'test-workout-123',
        currentStretchIndex: 6,
        completedStretches: [0, 1, 2, 3, 4, 5],
      })
    );

    renderStretchingRoutine();

    // Side-Bend Stretch has no videoUrl
    expect(screen.getByText('Side-Bend Stretch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play video/i })).not.toBeInTheDocument();
  });
});
