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
      exerciseAchievements: {
        unlockedExercises: [],
        retiredExercises: [],
      },
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
      emoji: '🫁',
      muscleGroups: ['abs'],
      type: 'reps',
      retirementThreshold: { type: 'reps', value: 50 },
    },
    {
      id: 'flutter-kicks-001',
      name: 'Flutter Kicks',
      emoji: '🦵',
      muscleGroups: ['abs'],
      type: 'timed',
      unlockRequirement: { exerciseId: 'crunches-001', type: 'reps', value: 40 },
    },
  ],
  getExerciseById: (id: string) => {
    const exercises: Record<string, unknown> = {
      'crunches-001': { id: 'crunches-001', name: 'Crunches', emoji: '🫁', type: 'reps' },
      'flutter-kicks-001': { id: 'flutter-kicks-001', name: 'Flutter Kicks', emoji: '🦵', type: 'timed', unlockRequirement: { exerciseId: 'crunches-001', type: 'reps', value: 40 } },
    };
    return exercises[id];
  },
  getExerciseEmoji: (id: string) => {
    const emojis: Record<string, string> = {
      'crunches-001': '🫁',
      'flutter-kicks-001': '🦵',
    };
    return emojis[id] ?? '';
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

      // Should show exercise name with emoji
      expect(screen.getByText(/🫁 Crunches/)).toBeInTheDocument();

      // Should show individual set results
      expect(screen.getByText(/35/)).toBeInTheDocument();
      expect(screen.getByText(/30/)).toBeInTheDocument();
      expect(screen.getByText(/28/)).toBeInTheDocument();
    });

    it('shows "first time" message when no previous history exists', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue(null);

      renderWithRouter(mockWorkout);

      expect(screen.getByText(/first time completing this exercise/i)).toBeInTheDocument();
    });

    it('shows improvement amount when performance beats previous PB', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      // Previous PB was 32 reps, this workout achieved 35 (best set)
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue({ reps: 32 });

      renderWithRouter(mockWorkout);

      // Should show New PB badge
      expect(screen.getByText(/new pb/i)).toBeInTheDocument();
      // Should clearly show the improvement from old PB to new
      expect(screen.getByText(/improved from previous best: 32 reps/i)).toBeInTheDocument();
    });

    it('shows previous personal best when no improvement made', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      // PB is 40 reps, best set this workout is 35 - no improvement
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue({ reps: 40 });

      renderWithRouter(mockWorkout);

      expect(screen.getByText(/personal best: 40 reps/i)).toBeInTheDocument();
      // Should NOT show improvement or first-time messages
      expect(screen.queryByText(/improved/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/first time/i)).not.toBeInTheDocument();
    });

    it('shows "first time" for timed exercises with no history', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const timedWorkout: WorkoutHistoryEntry = {
        ...mockWorkout,
        exercises: [
          {
            exerciseId: 'plank-001',
            exerciseName: 'Plank',
            muscleGroups: ['abs'],
            completedSets: [
              { setNumber: 1, actualDuration: 45 },
              { setNumber: 2, actualDuration: 40 },
            ],
          },
        ],
      };

      renderWithRouter(timedWorkout);

      expect(screen.getByText(/first time completing this exercise/i)).toBeInTheDocument();
    });

    it('shows improvement for timed exercises when beating PB', async () => {
      const { getBestPerformance } = await import('../lib/achievement-tracker');
      // Previous PB was 40s, this workout achieved 45s
      (getBestPerformance as ReturnType<typeof vi.fn>).mockReturnValue({ duration: 40 });

      const timedWorkout: WorkoutHistoryEntry = {
        ...mockWorkout,
        exercises: [
          {
            exerciseId: 'plank-001',
            exerciseName: 'Plank',
            muscleGroups: ['abs'],
            completedSets: [
              { setNumber: 1, actualDuration: 45 },
              { setNumber: 2, actualDuration: 40 },
            ],
          },
        ],
      };

      renderWithRouter(timedWorkout);

      expect(screen.getByText(/new pb/i)).toBeInTheDocument();
      expect(screen.getByText(/improved from previous best: 40s/i)).toBeInTheDocument();
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
