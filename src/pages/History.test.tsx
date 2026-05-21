import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import History from './History';

const mockWorkoutHistory = [
  {
    id: 'history-1',
    workoutId: 'workout-1',
    workoutNumber: 1,
    completedDate: Date.now() - 86400000,
    totalDuration: 20,
    intensityScore: 72,
    exercises: [
      {
        exerciseId: 'crunches-001',
        exerciseName: 'Crunches',
        muscleGroups: ['abs'],
        completedSets: [
          { setNumber: 1, actualReps: 15 },
          { setNumber: 2, actualReps: 14 },
        ],
      },
      {
        exerciseId: 'glute-bridge-001',
        exerciseName: 'Glute Bridge',
        muscleGroups: ['glutes'],
        completedSets: [
          { setNumber: 1, actualReps: 20 },
        ],
      },
    ],
  },
  {
    id: 'history-2',
    workoutId: 'workout-2',
    workoutNumber: 2,
    completedDate: Date.now(),
    totalDuration: 15,
    intensityScore: 85,
    exercises: [
      {
        exerciseId: 'plank-001',
        exerciseName: 'Plank',
        muscleGroups: ['abs'],
        completedSets: [
          { setNumber: 1, actualDuration: 30 },
        ],
      },
    ],
  },
];

vi.mock('../store/workout-store', () => ({
  useWorkoutStore: () => ({
    workoutHistory: mockWorkoutHistory,
    loadHistory: vi.fn(),
    deleteHistoryEntry: vi.fn(),
    updateHistoryEntry: vi.fn(),
    addManualWorkout: vi.fn(),
  }),
}));

function renderHistory() {
  return render(
    <MemoryRouter>
      <History />
    </MemoryRouter>
  );
}

describe('History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Intensity score removed from workout cards', () => {
    it('does not display intensity score values on workout cards', () => {
      renderHistory();

      // The intensity score values (72 and 85) should not appear
      expect(screen.queryByText('72')).not.toBeInTheDocument();
      expect(screen.queryByText('85')).not.toBeInTheDocument();
    });

    it('does not display the "intensity" label on workout cards', () => {
      renderHistory();

      expect(screen.queryByText('intensity')).not.toBeInTheDocument();
    });

    it('still displays workout duration', () => {
      renderHistory();

      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('still displays exercise names', () => {
      renderHistory();

      expect(screen.getByText(/Crunches/)).toBeInTheDocument();
      expect(screen.getByText(/Glute Bridge/)).toBeInTheDocument();
      expect(screen.getByText(/Plank/)).toBeInTheDocument();
    });
  });
});
