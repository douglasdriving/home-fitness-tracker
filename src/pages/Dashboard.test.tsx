import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// Navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Stores
const mockStartWorkout = vi.fn(() => Promise.resolve());
let mockProfile: Record<string, unknown> = { calibrationCompleted: true, preferences: {} };
let mockCurrentWorkout: Record<string, unknown> | null = null;

vi.mock('../store/user-store', () => ({
  useUserStore: () => ({ profile: mockProfile }),
}));

vi.mock('../store/workout-store', () => ({
  useWorkoutStore: () => ({
    currentWorkout: mockCurrentWorkout,
    loadWorkouts: vi.fn(),
    generateNewWorkout: vi.fn(),
    generateDailyRotationWorkout: vi.fn(),
    startWorkout: mockStartWorkout,
    discardWorkout: vi.fn(),
    loadHistory: vi.fn(),
    workoutHistory: [],
  }),
}));

vi.mock('../db/db', () => ({
  db: { history: { toArray: vi.fn(() => Promise.resolve([])) } },
}));

vi.mock('../lib/workout-generator', () => ({
  getNextDailyRotationGroup: vi.fn(() => 'abs'),
}));

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard - warmup branching on Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockProfile = { calibrationCompleted: true, preferences: {} };
    mockCurrentWorkout = {
      id: 'workout-abc',
      status: 'pending',
      workoutNumber: 1,
      estimatedDuration: 20,
      workoutMode: 'daily-rotation',
      targetMuscleGroup: 'glutes',
      exercises: [],
    };
  });

  it('routes to /warmup with workoutId + targetMuscleGroup when warmup enabled (default)', async () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(mockStartWorkout).toHaveBeenCalledWith('workout-abc');
      expect(mockNavigate).toHaveBeenCalledWith('/warmup', {
        state: { workoutId: 'workout-abc', targetMuscleGroup: 'glutes' },
      });
    });
  });

  it('skips warmup and goes to /workout when autoShowWarmup is off', async () => {
    mockProfile = { calibrationCompleted: true, preferences: { autoShowWarmup: false } };
    renderDashboard();
    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workout');
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('/warmup', expect.anything());
  });

  it('does not re-route through warmup when resuming an in-progress workout', async () => {
    mockCurrentWorkout = { ...mockCurrentWorkout!, status: 'in-progress' };
    renderDashboard();
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workout');
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('/warmup', expect.anything());
  });

  it('shows a Resume Warmup banner when a warmup session is persisted', async () => {
    localStorage.setItem(
      'warmupRoutineState',
      JSON.stringify({
        workoutId: 'workout-abc',
        currentWarmupIndex: 2,
        completedWarmups: [0, 1],
        targetMuscleGroup: 'abs',
      })
    );
    renderDashboard();

    expect(await screen.findByText('Warmup In Progress')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Resume Warmup'));
    expect(mockNavigate).toHaveBeenCalledWith('/warmup', {
      state: { workoutId: 'workout-abc', targetMuscleGroup: 'abs' },
    });
  });

  it('passes undefined targetMuscleGroup for full-body workouts', async () => {
    mockCurrentWorkout = {
      id: 'workout-fb',
      status: 'pending',
      workoutNumber: 2,
      estimatedDuration: 40,
      workoutMode: 'full-body',
      exercises: [],
    };
    renderDashboard();
    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/warmup', {
        state: { workoutId: 'workout-fb', targetMuscleGroup: undefined },
      });
    });
  });
});
