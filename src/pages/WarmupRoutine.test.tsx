import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarmupRoutine from './WarmupRoutine';
import { getWarmupForMuscleGroup } from '../data/warmupData';

// Mock react-router-dom's useNavigate and useLocation
const mockNavigate = vi.fn();
let mockLocationState: Record<string, unknown> = {
  workoutId: 'test-workout-123',
  targetMuscleGroup: 'abs',
};
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockLocationState,
      pathname: '/warmup',
    }),
  };
});

// Mock wake lock hook
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: vi.fn(),
}));

// Mock sound utility (Timer may use it)
vi.mock('../utils/sound', () => ({
  playCompletionSound: vi.fn(),
}));

function renderWarmupRoutine() {
  return render(
    <MemoryRouter initialEntries={['/warmup']}>
      <WarmupRoutine />
    </MemoryRouter>
  );
}

describe('WarmupRoutine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLocationState = { workoutId: 'test-workout-123', targetMuscleGroup: 'abs' };
  });

  it('shows the first move of the abs warmup', () => {
    renderWarmupRoutine();
    expect(screen.getByText('Cat-Cow Flow')).toBeInTheDocument();
    const total = getWarmupForMuscleGroup('abs').length;
    expect(screen.getByText(new RegExp(`Move 1 of ${total}`))).toBeInTheDocument();
  });

  it('does not render a redundant per-move progress section (header progress bar is enough)', () => {
    renderWarmupRoutine();
    expect(screen.queryByText('Warmup Progress')).not.toBeInTheDocument();
    expect(screen.queryByText(/of .* completed/)).not.toBeInTheDocument();
  });

  it('does not render a redundant "Duration" label for a timed move (the timer already shows it)', () => {
    renderWarmupRoutine();
    // Cat-Cow Flow is duration-only (no reps) — the Timer card already shows 60s
    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
  });

  it('does not render the "Total warmup: ~X minutes" summary footer', () => {
    renderWarmupRoutine();
    expect(screen.queryByText(/Total warmup/)).not.toBeInTheDocument();
  });

  it('shows instructions inline under the heading instead of behind a modal', () => {
    renderWarmupRoutine();
    // Cat-Cow Flow's first instruction line
    expect(screen.getByText(/Start on hands and knees in a tabletop position/)).toBeInTheDocument();
    expect(screen.queryByText('How to do this move')).not.toBeInTheDocument();
  });

  it('shows an inline, click-to-play video for moves that have one', () => {
    renderWarmupRoutine();
    // Cat-Cow Flow has a videoUrl — should render a play button, not an autoplaying iframe
    expect(screen.getByRole('button', { name: /play video/i })).toBeInTheDocument();
  });

  it('does not show a video section for moves without a video', () => {
    localStorage.setItem(
      'warmupRoutineState',
      JSON.stringify({
        workoutId: 'test-workout-123',
        currentWarmupIndex: 1,
        completedWarmups: [0],
        targetMuscleGroup: 'abs',
      })
    );

    renderWarmupRoutine();

    // Trunk Rotations has no videoUrl
    expect(screen.getByText('Trunk Rotations')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play video/i })).not.toBeInTheDocument();
  });

  it('still shows the "Target" rep count for rep-based moves (not shown by the timer)', () => {
    localStorage.setItem(
      'warmupRoutineState',
      JSON.stringify({
        workoutId: 'test-workout-123',
        currentWarmupIndex: 3,
        completedWarmups: [0, 1, 2],
        targetMuscleGroup: 'abs',
      })
    );

    renderWarmupRoutine();

    // Fourth abs move is Slow Bird Dogs (reps: 8)
    expect(screen.getByText('Slow Bird Dogs')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('~8 reps')).toBeInTheDocument();
  });

  it('shows different moves for a different muscle group', () => {
    mockLocationState = { workoutId: 'w-2', targetMuscleGroup: 'upperBody' };
    renderWarmupRoutine();
    expect(screen.getByText('Arm Circles')).toBeInTheDocument();
    expect(screen.queryByText('Cat-Cow Flow')).not.toBeInTheDocument();
  });

  it('falls back to the generic warmup in full-body mode (no targetMuscleGroup)', () => {
    mockLocationState = { workoutId: 'w-3' };
    renderWarmupRoutine();
    const generic = getWarmupForMuscleGroup(undefined);
    expect(screen.getByText(generic[0].name)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Move 1 of ${generic.length}`))).toBeInTheDocument();
  });

  it('Skip All confirms and navigates straight to /workout', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWarmupRoutine();

    fireEvent.click(screen.getByText('Skip All'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/workout');
    // State should be cleared on skip-all
    expect(localStorage.getItem('warmupRoutineState')).toBeNull();
    confirmSpy.mockRestore();
  });

  it('does not render a redundant "Skip This Exercise" button', () => {
    renderWarmupRoutine();
    expect(screen.queryByText('Skip This Exercise')).not.toBeInTheDocument();
  });

  it('skipping the timer advances to the next move without leaving the page', () => {
    renderWarmupRoutine();
    expect(screen.getByText('Cat-Cow Flow')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Skip'));

    // Second abs move is Trunk Rotations
    expect(screen.getByText('Trunk Rotations')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('skipping the timer past the last move navigates to /workout', () => {
    renderWarmupRoutine();
    const total = getWarmupForMuscleGroup('abs').length;

    // Skip through every move via the timer's skip control
    for (let i = 0; i < total; i++) {
      fireEvent.click(screen.getByText('Skip'));
    }

    expect(mockNavigate).toHaveBeenCalledWith('/workout');
  });

  it('persists in-progress state to localStorage', () => {
    renderWarmupRoutine();
    fireEvent.click(screen.getByText('Skip'));

    const saved = localStorage.getItem('warmupRoutineState');
    expect(saved).not.toBeNull();
    const state = JSON.parse(saved!);
    expect(state.workoutId).toBe('test-workout-123');
    expect(state.targetMuscleGroup).toBe('abs');
    expect(state.currentWarmupIndex).toBe(1);
  });

  it('restores in-progress state for the same workout and group', () => {
    localStorage.setItem(
      'warmupRoutineState',
      JSON.stringify({
        workoutId: 'test-workout-123',
        currentWarmupIndex: 2,
        completedWarmups: [0, 1],
        targetMuscleGroup: 'abs',
      })
    );

    renderWarmupRoutine();

    // Third abs move is Hip Circles
    expect(screen.getByText('Hip Circles')).toBeInTheDocument();
    const total = getWarmupForMuscleGroup('abs').length;
    expect(screen.getByText(new RegExp(`Move 3 of ${total}`))).toBeInTheDocument();
  });

  it('does not restore state from a different muscle group', () => {
    localStorage.setItem(
      'warmupRoutineState',
      JSON.stringify({
        workoutId: 'test-workout-123',
        currentWarmupIndex: 2,
        completedWarmups: [0, 1],
        targetMuscleGroup: 'glutes',
      })
    );

    renderWarmupRoutine();

    // Should ignore the glutes state and start the abs warmup from the top
    expect(screen.getByText('Cat-Cow Flow')).toBeInTheDocument();
    expect(screen.getByText(/Move 1 of/)).toBeInTheDocument();
  });
});
