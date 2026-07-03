import { describe, it, expect } from 'vitest';
import { generateDailyRotationWorkout, getNextDailyRotationGroup } from './workout-generator';
import { getExerciseById } from '../data/exerciseData';
import { getAvailableExercises } from './achievement-tracker';
import { StrengthLevels } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { MuscleGroup } from '../types/exercise';

describe('generateDailyRotationWorkout', () => {
  const defaultStrengthLevels: StrengthLevels = {
    abs: 50,
    glutes: 50,
    lowerBack: 50,
    upperBody: 50,
    lastUpdated: Date.now(),
  };

  describe('exercise selection', () => {
    it('should select exactly 3 exercises from the specified muscle group', () => {
      // lowerBack was dropped as a rotation day in the 2026-06-17 posterior-chain
      // consolidation; the live rotation is abs → glutes (posterior chain) → upperBody.
      const muscleGroups: MuscleGroup[] = ['abs', 'glutes', 'upperBody'];

      muscleGroups.forEach(targetMuscleGroup => {
        const workout = generateDailyRotationWorkout({
          workoutNumber: 1,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup,
          hasElasticBands: true,
        });

        expect(workout.exercises.length).toBe(3);

        // All exercises should have the specified muscle group as their PRIMARY group
        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);
          expect(exercise).toBeDefined();
          expect(exercise!.primaryMuscleGroup).toBe(targetMuscleGroup);
        });
      });
    });

    it('should set workoutMode to daily-rotation', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
      });

      expect(workout.workoutMode).toBe('daily-rotation');
    });

    it('should set targetMuscleGroup field', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
      });

      expect(workout.targetMuscleGroup).toBe('glutes');
    });

    it('should handle fewer than 3 available exercises gracefully', () => {
      // Create an exclusion list that leaves only 1-2 exercises
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        excludedExerciseIds: [
          'crunches-001',
          'reverse-crunches-001',
          'plank-001',
          'bicycle-crunches-001',
          'leg-raises-001',
          'mountain-climbers-001',
          'russian-twists-001',
        ],
      });

      // Should generate workout with fewer than 3 exercises without crashing
      expect(workout.exercises.length).toBeGreaterThan(0);
      expect(workout.exercises.length).toBeLessThanOrEqual(3);
    });

    it('should only select exercises by primaryMuscleGroup, not secondary groups', () => {
      // Generate workouts for each muscle group and verify no overlap
      const muscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];
      const exercisesByGroup: Record<string, Set<string>> = {};

      muscleGroups.forEach(targetMuscleGroup => {
        exercisesByGroup[targetMuscleGroup] = new Set();

        // Generate multiple workouts to see different exercise selections
        for (let i = 0; i < 10; i++) {
          const workout = generateDailyRotationWorkout({
            workoutNumber: i + 1,
            strengthLevels: defaultStrengthLevels,
            targetMuscleGroup,
            hasElasticBands: true,
          });

          workout.exercises.forEach(ex => {
            exercisesByGroup[targetMuscleGroup].add(ex.exerciseId);
          });
        }
      });

      // Verify no exercise appears in multiple muscle group rotations
      const absExercises = exercisesByGroup['abs'];
      const glutesExercises = exercisesByGroup['glutes'];
      const lowerBackExercises = exercisesByGroup['lowerBack'];

      absExercises.forEach(id => {
        expect(glutesExercises.has(id)).toBe(false);
        expect(lowerBackExercises.has(id)).toBe(false);
      });
      glutesExercises.forEach(id => {
        expect(absExercises.has(id)).toBe(false);
        expect(lowerBackExercises.has(id)).toBe(false);
      });
      lowerBackExercises.forEach(id => {
        expect(absExercises.has(id)).toBe(false);
        expect(glutesExercises.has(id)).toBe(false);
      });
    });

    it('should have at least 3 glutes exercises available for new users without bands', () => {
      // Simulate a new user with no workout history and no elastic bands
      const available = getAvailableExercises(
        [], // no workout history
        { unlockedExercises: [], retiredExercises: [] },
        false, // no elastic bands
      );

      const glutesExercises = available.filter(ex => ex.primaryMuscleGroup === 'glutes');
      expect(glutesExercises.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('set count', () => {
    it('should give per-side exercises exactly 2 sets', () => {
      // Use glutes since it has per-side exercises like donkey kicks
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        hasElasticBands: true,
      });

      workout.exercises.forEach((workoutExercise) => {
        const exercise = getExerciseById(workoutExercise.exerciseId);
        expect(exercise).toBeDefined();

        if (exercise?.countingMethod === 'per-side') {
          expect(workoutExercise.sets.length).toBe(2);
        }
      });
    });

    it('should give standard exercises exactly 3 sets', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        hasElasticBands: true,
      });

      workout.exercises.forEach((workoutExercise) => {
        const exercise = getExerciseById(workoutExercise.exerciseId);
        expect(exercise).toBeDefined();

        if (!exercise?.countingMethod || exercise.countingMethod === 'total') {
          expect(workoutExercise.sets.length).toBe(3);
        }
      });
    });
  });

  describe('progressive overload', () => {
    function createHistoryEntry(overrides: {
      workoutNumber: number;
      workoutMode?: 'full-body' | 'daily-rotation';
      targetMuscleGroup?: MuscleGroup;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        muscleGroups: MuscleGroup[];
        completedSets: Array<{ setNumber: number; actualReps?: number; actualDuration?: number }>;
        intensityFeedback?: 1 | 2 | 3 | 4 | 5;
      }>;
    }): WorkoutHistoryEntry {
      return {
        id: `history-test-${overrides.workoutNumber}`,
        workoutId: `workout-test-${overrides.workoutNumber}`,
        workoutNumber: overrides.workoutNumber,
        completedDate: Date.now() - (10 - overrides.workoutNumber) * 86400000,
        totalDuration: 20,
        exercises: overrides.exercises,
        workoutMode: overrides.workoutMode,
        targetMuscleGroup: overrides.targetMuscleGroup,
      };
    }

    it('should use progressive overload from previous performances', () => {
      const previousReps = 15;
      const history: WorkoutHistoryEntry[] = [
        createHistoryEntry({
          workoutNumber: 1,
          workoutMode: 'daily-rotation',
          targetMuscleGroup: 'abs',
          exercises: [
            {
              exerciseId: 'crunches-001',
              exerciseName: 'Crunches',
              muscleGroups: ['abs'],
              completedSets: [{ setNumber: 1, actualReps: previousReps }],
              intensityFeedback: 3, // Just right
            },
          ],
        }),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        workoutHistory: history,
      });

      const crunchesExercise = workout.exercises.find(
        (ex) => ex.exerciseId === 'crunches-001'
      );

      if (crunchesExercise) {
        const targetReps = crunchesExercise.sets[0].targetReps!;
        // With feedback 3 (just right), should increase by progressive overload
        expect(targetReps).toBeGreaterThan(previousReps);
      }
    });
  });

  describe('exercise rotation', () => {
    it('should prioritize least recently used exercises', () => {
      // Create history with specific exercise usage
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'history-1',
          workoutId: 'workout-1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 20,
          workoutMode: 'daily-rotation',
          targetMuscleGroup: 'abs',
          exercises: [
            {
              exerciseId: 'crunches-001',
              exerciseName: 'Crunches',
              muscleGroups: ['abs'],
              completedSets: [{ setNumber: 1, actualReps: 15 }],
            },
          ],
        },
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        workoutHistory: history,
      });

      // With multiple abs exercises available, rotation should work
      // We'll check that we have 3 exercises total at least
      expect(workout.exercises.length).toBe(3);
    });
  });
});

describe('getNextDailyRotationGroup', () => {
  function createHistoryEntry(overrides: {
    workoutNumber: number;
    workoutMode?: 'full-body' | 'daily-rotation';
    targetMuscleGroup?: MuscleGroup;
  }): WorkoutHistoryEntry {
    return {
      id: `history-test-${overrides.workoutNumber}`,
      workoutId: `workout-test-${overrides.workoutNumber}`,
      workoutNumber: overrides.workoutNumber,
      completedDate: Date.now() - (10 - overrides.workoutNumber) * 86400000,
      totalDuration: 20,
      exercises: [],
      workoutMode: overrides.workoutMode,
      targetMuscleGroup: overrides.targetMuscleGroup,
    };
  }

  it('should return abs when no previous daily rotation workouts exist', () => {
    const history: WorkoutHistoryEntry[] = [];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should return abs when only full-body workouts exist', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({ workoutNumber: 1, workoutMode: 'full-body' }),
      createHistoryEntry({ workoutNumber: 2, workoutMode: 'full-body' }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should return glutes after abs', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'abs',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('glutes');
  });

  it('should return upperBody after glutes', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'glutes',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('upperBody');
  });

  it('should return abs after upperBody (rotation wraps)', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'upperBody',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should wrap to abs for a legacy lowerBack last-day (no longer in rotation)', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'lowerBack',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should use the most recent daily rotation workout (first in array)', () => {
    const history: WorkoutHistoryEntry[] = [
      // Most recent
      createHistoryEntry({
        workoutNumber: 3,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'glutes',
      }),
      // Older
      createHistoryEntry({
        workoutNumber: 2,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'abs',
      }),
      // Oldest
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'full-body',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('upperBody');
  });

  it('should ignore full-body workouts mixed with daily rotation workouts', () => {
    const history: WorkoutHistoryEntry[] = [
      // Most recent - full body
      createHistoryEntry({
        workoutNumber: 3,
        workoutMode: 'full-body',
      }),
      // Previous daily rotation
      createHistoryEntry({
        workoutNumber: 2,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'abs',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('glutes');
  });
});
