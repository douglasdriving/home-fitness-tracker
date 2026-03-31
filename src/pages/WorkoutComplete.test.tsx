import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutComplete from './WorkoutComplete';
import { WorkoutHistoryEntry } from '../types/workout';
import { UnlockReason, RetirementReason } from '../lib/achievement-tracker';

// Mock the stores
vi.mock('../store/workout-store', () => ({
  useWorkoutStore: () => ({
    loadWorkouts: vi.fn(),
    workoutHistory: [],
  }),
}));

vi.mock('../store/user-store', () => ({
  useUserStore: () => ({
    profile: {
      preferences: { autoShowStretching: true },
      exerciseAchievements: {
        unlockedExercises: [],
        retiredExercises: [],
      },
      equipment: { hasElasticBands: false },
    },
  }),
}));

// Mock achievement-tracker
vi.mock('../lib/achievement-tracker', () => ({
  getBestPerformance: vi.fn(),
  getExerciseStatuses: vi.fn(() => []),
}));

// Mock exerciseData
vi.mock('../data/exerciseData', () => ({
  allExercises: [
    {
      id: 'crunches-001',
      name: 'Crunches',
      muscleGroups: ['abs'],
      type: 'reps',
      retirementThreshold: { type: 'reps', value: 50 },
    },
    {
      id: 'flutter-kicks-001',
      name: 'Flutter Kicks',
      muscleGroups: ['abs'],
      type: 'timed',
      unlockRequirement: { exerciseId: 'crunches-001', type: 'reps', value: 40 },
    },
  ],
  getExerciseById: (id: string) => {
    const exercises: Record<string, unknown> = {
      'crunches-001': { id: 'crunches-001', name: 'Crunches', type: 'reps' },
      'flutter-kicks-001': { id: 'flutter-kicks-001', name: 'Flutter Kicks', type: 'timed', unlockRequirement: { exerciseId: 'crunches-001', type: 'reps', value: 40 } },
    };
    return exercises[id];
  },
}));

const mockWorkout: WorkoutHistoryEntry = {
  id: 'history-123',
  workoutId: 'workout-123',
  workoutNumber: 5,
  completedDate: Date.now(),
  totalDuration: 25,
  exercises: [
    {
      exerciseId: 'crunches-001',
      exerciseName: 'Crunches',
      muscleGroups: ['abs'],
      completedSets: [
        { setNumber: 1, actualReps: 35 },
        { setNumber: 2, actualReps: 30 },
        { setNumber: 3, actualReps: 28 },
      ],
    },
  ],
};

function renderWithRouter(
  workout?: WorkoutHistoryEntry,
  extraState?: {
    unlockReasons?: UnlockReason[];
    retirementReasons?: RetirementReason[];
  }
) {
  const state = workout ? { workout, ...extraState } : undefined;
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/workout-complete', state }]}>
      <WorkoutComplete />
    </MemoryRouter>
  );
}

describe('WorkoutComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Progression Data Display', () => {
    it('shows per-exercise progression with set-by-set details', () => {
      renderWithRouter(mockWorkout);

      // Should show exercise name
      expect(screen.getByText('Crunches')).toBeInTheDocument();

      // Should show individual set results
      expect(screen.getByText(/35/)).toBeInTheDocument();
      expect(screen.getByText(/30/)).toBeInTheDocument();
      expect(screen.getByText(/28/)).toBeInTheDocument();
    });

    it('shows personal best comparison for exercises', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue({ reps: 32 });

      renderWithRouter(mockWorkout);

      // Should show personal best indicator - the best set (35) beat the PB (32)
      expect(screen.getByText(/personal best/i)).toBeInTheDocument();
    });

    it('shows improvement indicator when performance beats PB', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      // PB was 32 reps, this workout achieved 35
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue({ reps: 32 });

      renderWithRouter(mockWorkout);

      // Should show "New PB!" or similar indicator
      expect(screen.getByText(/new pb/i)).toBeInTheDocument();
    });
  });

  describe('No Aggregate Stats', () => {
    it('does not show total duration stat', () => {
      renderWithRouter(mockWorkout);

      expect(screen.queryByText('minutes')).not.toBeInTheDocument();
    });

    it('does not show total sets stat', () => {
      renderWithRouter(mockWorkout);

      // Should not have the old "sets" aggregate stat card
      expect(screen.queryByText(/^\d+ sets$/)).not.toBeInTheDocument();
    });

    it('does not show total reps aggregate stat', () => {
      renderWithRouter(mockWorkout);

      expect(screen.queryByText('total reps')).not.toBeInTheDocument();
    });

    it('does not show time under tension stat', () => {
      renderWithRouter(mockWorkout);

      expect(screen.queryByText('time under tension')).not.toBeInTheDocument();
    });
  });

  describe('No Stretching UI', () => {
    it('does not show stretching buttons', () => {
      renderWithRouter(mockWorkout);

      expect(screen.queryByText(/Start Stretching/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Skip Stretching/i)).not.toBeInTheDocument();
    });
  });

  describe('Exercise Unlock Progress', () => {
    it('shows unlock progress for exercises close to being unlocked', async () => {
      const { getExerciseStatuses } = await import('../lib/achievement-tracker');
      (getExerciseStatuses as ReturnType<typeof vi.fn>).mockReturnValue([
        {
          id: 'flutter-kicks-001',
          name: 'Flutter Kicks',
          status: 'locked',
          unlockProgress: {
            currentValue: 35,
            requiredValue: 40,
            requiredExerciseName: 'Crunches',
          },
        },
      ]);

      renderWithRouter(mockWorkout);

      // Should show unlock progress section
      expect(screen.getByText(/Flutter Kicks/)).toBeInTheDocument();
      expect(screen.getByText(/35.*40/)).toBeInTheDocument();
    });
  });

  describe('Milestones Integration', () => {
    it('shows newly unlocked exercises when passed unlock reasons', () => {
      const unlockReasons: UnlockReason[] = [
        {
          unlockedExerciseId: 'flutter-kicks-001',
          unlockedExerciseName: 'Flutter Kicks',
          prereqExerciseId: 'crunches-001',
          prereqExerciseName: 'Crunches',
          performanceValue: 42,
          performanceType: 'reps',
          thresholdValue: 40,
        },
      ];

      renderWithRouter(mockWorkout, { unlockReasons });

      // Should show unlocked section
      expect(screen.getByText(/unlocked/i)).toBeInTheDocument();
      expect(screen.getAllByText('Flutter Kicks').length).toBeGreaterThanOrEqual(1);
    });

    it('shows newly retired exercises when passed retirement reasons', () => {
      const retirementReasons: RetirementReason[] = [
        {
          exerciseId: 'crunches-001',
          exerciseName: 'Crunches',
          performanceValue: 52,
          performanceType: 'reps',
          thresholdValue: 50,
        },
      ];

      renderWithRouter(mockWorkout, { retirementReasons });

      // Should show retired/mastered section
      expect(screen.getByText(/mastered/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows a Done button to navigate to Dashboard', () => {
      renderWithRouter(mockWorkout);

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('redirects to home when no workout data is provided', () => {
      renderWithRouter(undefined);

      // Component should return null and navigate away
      expect(screen.queryByText('WORKOUT COMPLETE')).not.toBeInTheDocument();
    });
  });
});
