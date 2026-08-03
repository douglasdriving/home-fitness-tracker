import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExerciseStatus from './ExerciseStatus';

// A calibrated profile with no prior achievements, so the default (no-unlock)
// exercises show as active.
const mockProfile = {
  userId: 'test-user',
  createdDate: Date.now(),
  calibrationCompleted: true,
  strengthLevels: { abs: 30, glutes: 30, lowerBack: 30, upperBody: 30, lastUpdated: Date.now() },
  exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
};

vi.mock('../store/user-store', () => ({
  useUserStore: () => ({
    profile: mockProfile,
    restoreRetiredExercise: vi.fn(),
  }),
}));

// Stable references so the effect deps ([profile, workoutHistory]) don't change
// identity every render (which would loop forever).
const mockHistory: never[] = [];
const mockLoadWorkouts = vi.fn();

vi.mock('../store/workout-store', () => ({
  useWorkoutStore: () => ({
    workoutHistory: mockHistory,
    loadWorkouts: mockLoadWorkouts,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ExerciseStatus />
    </MemoryRouter>
  );
}

describe('ExerciseStatus muscle-group filter', () => {
  it('renders a Lower Back filter chip', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Lower Back' })).toBeInTheDocument();
  });

  it('shows spinal-extension exercises when the Lower Back filter is active', async () => {
    renderPage();

    // Wait for the async status load to finish, then apply the filter.
    fireEvent.click(await screen.findByRole('button', { name: 'Lower Back' }));

    // Spinal-extension work must remain visible in daily mode (issue #31).
    // These are active by default (no unlock requirement, no band needed).
    expect(screen.getByText(/Back Extension Hold/)).toBeInTheDocument();
    expect(screen.getByText(/Swimmers/)).toBeInTheDocument();

    // Abs-only exercises are filtered out.
    expect(screen.queryByText(/Crunches/)).not.toBeInTheDocument();

    // Superman is locked by default but still surfaces under the filter
    // (Locked tab) — it is no longer invisible in daily mode.
    fireEvent.click(screen.getByRole('button', { name: /^Locked/ }));
    expect(screen.getByText(/Superman/)).toBeInTheDocument();
  });
});
