import { describe, it, expect } from 'vitest';
import {
  isExerciseUnlocked,
  shouldRetireExercise,
  checkWorkoutAchievements,
} from './achievement-tracker';
import { Exercise } from '../types/exercise';
import { ExerciseAchievements } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { mockExercises, createHistoryEntry } from './achievement-fixtures';

describe('isExerciseUnlocked', () => {
  it('returns true for exercises without unlock requirements', () => {
    const exercise = mockExercises[0] as Exercise; // Crunches - no unlock requirement
    const result = isExerciseUnlocked(exercise, [], []);
    expect(result).toBe(true);
  });

  it('returns true if exercise is already in unlocked list', () => {
    const exercise = mockExercises[1] as Exercise; // Flutter Kicks
    const result = isExerciseUnlocked(exercise, [], ['flutter-kicks-001']);
    expect(result).toBe(true);
  });

  it('returns false if unlock requirement not met', () => {
    const exercise = mockExercises[1] as Exercise; // Flutter Kicks needs 20 crunches
    const history = [createHistoryEntry('crunches-001', 15)];
    const result = isExerciseUnlocked(exercise, history, []);
    expect(result).toBe(false);
  });

  it('returns true if unlock requirement is met', () => {
    const exercise = mockExercises[1] as Exercise; // Flutter Kicks needs 20 crunches
    const history = [createHistoryEntry('crunches-001', 45)];
    const result = isExerciseUnlocked(exercise, history, []);
    expect(result).toBe(true);
  });

  it('returns true if unlock requirement is exactly met', () => {
    const exercise = mockExercises[1] as Exercise; // Flutter Kicks needs 20 crunches
    const history = [createHistoryEntry('crunches-001', 20)];
    const result = isExerciseUnlocked(exercise, history, []);
    expect(result).toBe(true);
  });
});

describe('shouldRetireExercise', () => {
  it('returns false for exercises without retirement threshold', () => {
    const exercise = {
      id: 'test-001',
      muscleGroups: ['abs'],
      type: 'reps',
      heavinessScore: { abs: 5, glutes: 0, lowerBack: 0, upperBody: 0 },
    } as Exercise;

    const result = shouldRetireExercise(exercise, []);
    expect(result).toBe(false);
  });

  it('returns false if retirement threshold not met', () => {
    const exercise = mockExercises[0] as Exercise; // Crunches retires at 50
    const history = [createHistoryEntry('crunches-001', 40)];
    const result = shouldRetireExercise(exercise, history);
    expect(result).toBe(false);
  });

  it('returns true if retirement threshold is met', () => {
    const exercise = mockExercises[0] as Exercise; // Crunches retires at 50
    const history = [createHistoryEntry('crunches-001', 55)];
    const result = shouldRetireExercise(exercise, history);
    expect(result).toBe(true);
  });

  it('returns true if retirement threshold exactly met', () => {
    const exercise = mockExercises[0] as Exercise; // Crunches retires at 50
    const history = [createHistoryEntry('crunches-001', 50)];
    const result = shouldRetireExercise(exercise, history);
    expect(result).toBe(true);
  });

  it('works with timed exercises', () => {
    const exercise = mockExercises[2] as Exercise; // Plank retires at 120s
    const history = [createHistoryEntry('plank-001', undefined, 130)];
    const result = shouldRetireExercise(exercise, history);
    expect(result).toBe(true);
  });
});

describe('checkWorkoutAchievements', () => {
  it('detects new unlocks when prerequisite is in current workout', () => {
    const completedWorkout = createHistoryEntry('crunches-001', 45);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Flutter Kicks should be unlocked (needs 20 crunches, we did 45 in THIS workout)
    expect(result.newUnlocks).toContain('flutter-kicks-001');
  });

  it('returns unlock reasons with performance details', () => {
    const completedWorkout = createHistoryEntry('crunches-001', 45);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Should have unlock reason with details
    const flutterKicksReason = result.unlockReasons.find(
      r => r.unlockedExerciseId === 'flutter-kicks-001'
    );
    expect(flutterKicksReason).toBeDefined();
    expect(flutterKicksReason?.prereqExerciseName).toBe('Crunches');
    expect(flutterKicksReason?.performanceValue).toBe(45);
    expect(flutterKicksReason?.performanceType).toBe('reps');
    expect(flutterKicksReason?.thresholdValue).toBe(20);
  });

  it('detects new retirements when exercise is in current workout', () => {
    const completedWorkout = createHistoryEntry('crunches-001', 55);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Crunches should be retired (threshold 50, we did 55 in THIS workout)
    expect(result.newRetirements).toContain('crunches-001');
  });

  it('returns retirement reasons with performance details', () => {
    const completedWorkout = createHistoryEntry('crunches-001', 55);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Should have retirement reason with details
    const crunchesReason = result.retirementReasons.find(
      r => r.exerciseId === 'crunches-001'
    );
    expect(crunchesReason).toBeDefined();
    expect(crunchesReason?.exerciseName).toBe('Crunches');
    expect(crunchesReason?.performanceValue).toBe(55);
    expect(crunchesReason?.performanceType).toBe('reps');
    expect(crunchesReason?.thresholdValue).toBe(50);
  });

  it('does not re-unlock already unlocked exercises', () => {
    const completedWorkout = createHistoryEntry('crunches-001', 45);
    const achievements: ExerciseAchievements = {
      unlockedExercises: ['flutter-kicks-001'], // Already unlocked
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);
    expect(result.newUnlocks).not.toContain('flutter-kicks-001');
  });

  it('does not re-retire already retired exercises', () => {
    const completedWorkout = createHistoryEntry('crunches-001', 55);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: ['crunches-001'], // Already retired
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);
    expect(result.newRetirements).not.toContain('crunches-001');
  });

  // BUG FIX TESTS: Unlocks should only check current workout, not history
  it('does NOT unlock based on prior history alone', () => {
    // Scenario: User did 45 crunches in a PAST workout
    const priorHistory = [createHistoryEntry('crunches-001', 45, undefined, 1)];

    // Now they do a workout with only plank (no crunches)
    const currentWorkout = createHistoryEntry('plank-001', undefined, 60);

    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(currentWorkout, priorHistory, achievements);

    // Flutter Kicks should NOT be unlocked because crunches wasn't in THIS workout
    expect(result.newUnlocks).not.toContain('flutter-kicks-001');
  });

  it('does NOT retire based on prior history alone', () => {
    // Scenario: User did 55 crunches in a PAST workout (exceeds retirement threshold)
    const priorHistory = [createHistoryEntry('crunches-001', 55, undefined, 1)];

    // Now they do a workout with only plank (crunches not included at all)
    const currentWorkout = createHistoryEntry('plank-001', undefined, 60);

    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(currentWorkout, priorHistory, achievements);

    // Crunches should NOT be retired because it wasn't in THIS workout
    expect(result.newRetirements).not.toContain('crunches-001');
  });

  it('only unlocks exercises where prerequisite was performed in THIS workout', () => {
    // Complex scenario: Multiple exercises in history that could unlock things
    const priorHistory = [
      createHistoryEntry('crunches-001', 45, undefined, 1), // Would unlock flutter-kicks
      createHistoryEntry('plank-001', undefined, 40, 2), // Would unlock plank-shoulder-taps
    ];

    // Current workout only has donkey kicks (which doesn't unlock anything)
    const currentWorkout = createHistoryEntry('donkey-kicks-001', 15);

    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(currentWorkout, priorHistory, achievements);

    // Should not unlock anything based on history
    expect(result.newUnlocks).toHaveLength(0);
  });

  it('unlocks when current workout crosses threshold even with prior history', () => {
    // Prior history: did 30 crunches (not enough to unlock)
    const priorHistory = [createHistoryEntry('crunches-001', 30, undefined, 1)];

    // Current workout: does 45 crunches (crosses the 40 threshold)
    const currentWorkout = createHistoryEntry('crunches-001', 45);

    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(currentWorkout, priorHistory, achievements);

    // Flutter Kicks should be unlocked because THIS workout crossed the threshold
    expect(result.newUnlocks).toContain('flutter-kicks-001');
  });

  it('does NOT allow unlock and retire of same exercise in same workout', () => {
    // Plank shoulder taps: unlocks at 30s plank, retires at 30 reps plank-shoulder-taps
    // If user just unlocked it, they shouldn't immediately retire it
    const currentWorkout: WorkoutHistoryEntry = {
      id: 'h1',
      workoutId: 'w1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 30,
      exercises: [
        {
          exerciseId: 'plank-001',
          exerciseName: 'Plank',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, actualDuration: 65 }, // Unlocks plank-shoulder-taps (needs 30s)
          ],
        },
        {
          exerciseId: 'plank-shoulder-taps-001',
          exerciseName: 'Plank Shoulder Taps',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, actualReps: 35 }, // Exceeds 30 reps retirement threshold
          ],
        },
      ],
    };

    const achievements: ExerciseAchievements = {
      unlockedExercises: [], // Not yet unlocked
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(currentWorkout, [], achievements);

    // Should NOT have plank-shoulder-taps in BOTH unlocks and retirements
    const inBoth = result.newUnlocks.includes('plank-shoulder-taps-001') &&
                   result.newRetirements.includes('plank-shoulder-taps-001');
    expect(inBoth).toBe(false);

    // If it's going to be in one, it should be unlocked (unlock takes precedence for newly unlocked)
    if (result.newUnlocks.includes('plank-shoulder-taps-001')) {
      expect(result.newRetirements).not.toContain('plank-shoulder-taps-001');
    }
  });

  it('uses current workout performance only, not combined history', () => {
    // Prior history: 15 crunches
    const priorHistory = [createHistoryEntry('crunches-001', 15, undefined, 1)];

    // Current workout: 10 crunches (combined would be 15+10=25, but individual is only 10)
    const currentWorkout = createHistoryEntry('crunches-001', 10);

    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(currentWorkout, priorHistory, achievements);

    // Flutter Kicks should NOT be unlocked (needs 20 in single workout, we only did 10)
    expect(result.newUnlocks).not.toContain('flutter-kicks-001');
  });
});

describe('Dead Bug retirement threshold', () => {
  it('retires Dead Bug when user achieves 20 reps', () => {
    const completedWorkout = createHistoryEntry('dead-bug-001', 20);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Dead Bug should be retired (threshold is 20 reps, we did 20)
    expect(result.newRetirements).toContain('dead-bug-001');
  });

  it('does NOT retire Dead Bug when user achieves 19 reps', () => {
    const completedWorkout = createHistoryEntry('dead-bug-001', 19);
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Dead Bug should NOT be retired (threshold is 20 reps, we only did 19)
    expect(result.newRetirements).not.toContain('dead-bug-001');
  });
});

describe('combined unlock and retirement', () => {
  it('can unlock one exercise and retire a different exercise in the same workout', () => {
    const completedWorkout: WorkoutHistoryEntry = {
      id: 'h1',
      workoutId: 'w1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 30,
      exercises: [
        {
          exerciseId: 'crunches-001',
          exerciseName: 'Crunches',
          muscleGroups: ['abs'],
          completedSets: [
            { setNumber: 1, actualReps: 55 }, // Exceeds both unlock (40) and retire (50) thresholds
          ],
        },
      ],
    };

    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Should unlock flutter kicks (prereq is crunches at 40 reps, we did 55)
    expect(result.newUnlocks).toContain('flutter-kicks-001');
    // Should retire crunches (threshold is 50 reps, we did 55)
    expect(result.newRetirements).toContain('crunches-001');
  });

  it('does not unlock and retire same exercise simultaneously', () => {
    // Plank shoulder taps: unlocks at 30s plank, retires at 30 reps plank-shoulder-taps
    const completedWorkout: WorkoutHistoryEntry = {
      id: 'h1',
      workoutId: 'w1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 30,
      exercises: [
        {
          exerciseId: 'plank-001',
          exerciseName: 'Plank',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, actualDuration: 65 }, // Enough to unlock plank-shoulder-taps (30s)
          ],
        },
        {
          exerciseId: 'plank-shoulder-taps-001',
          exerciseName: 'Plank Shoulder Taps',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, actualReps: 35 }, // Enough to retire (30 reps)
          ],
        },
      ],
    };

    const achievements: ExerciseAchievements = {
      unlockedExercises: [], // Not yet unlocked
      retiredExercises: [],
    };

    const result = checkWorkoutAchievements(completedWorkout, [], achievements);

    // Plank shoulder taps should be unlocked (30s plank, we did 65s)
    expect(result.newUnlocks).toContain('plank-shoulder-taps-001');
    // Should NOT also be retired in the same workout
    expect(result.newRetirements).not.toContain('plank-shoulder-taps-001');
  });
});
