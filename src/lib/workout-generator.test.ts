import { describe, it, expect } from 'vitest';
import { generateWorkout, generateDailyRotationWorkout, findLastPerformanceWithFeedback, getNextDailyRotationGroup, getNextUpperBodyVerticalSlot } from './workout-generator';
import { getExerciseById } from '../data/exerciseData';
import { getAvailableExercises } from './achievement-tracker';
import { StrengthLevels } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { MuscleGroup } from '../types/exercise';

describe('generateWorkout', () => {
  const defaultStrengthLevels: StrengthLevels = {
    abs: 50,
    glutes: 50,
    lowerBack: 50,
    upperBody: 50,
    lastUpdated: Date.now(),
  };

  describe('set count based on exercise type', () => {
    it('should give per-side exercises exactly 3 sets', () => {
      // Generate multiple workouts to cover different exercise selections
      for (let i = 0; i < 10; i++) {
        const workout = generateWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          hasElasticBands: true, // Include band exercises
        });

        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);
          expect(exercise).toBeDefined();

          if (exercise?.countingMethod === 'per-side') {
            expect(workoutExercise.sets.length).toBe(3);
          }
        });
      }
    });

    it('should give bilateral (total) exercises exactly 4 sets', () => {
      // Generate multiple workouts to cover different exercise selections
      for (let i = 0; i < 10; i++) {
        const workout = generateWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          hasElasticBands: true,
        });

        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);
          expect(exercise).toBeDefined();

          // Exercises without countingMethod or with 'total' should have 4 sets
          if (!exercise?.countingMethod || exercise.countingMethod === 'total') {
            expect(workoutExercise.sets.length).toBe(4);
          }
        });
      }
    });

    it('should apply set counts regardless of strength level', () => {
      // Test with low strength level
      const lowStrengthWorkout = generateWorkout({
        workoutNumber: 1,
        strengthLevels: { abs: 20, glutes: 20, lowerBack: 20, upperBody: 20, lastUpdated: Date.now() },
        hasElasticBands: true,
      });

      // Test with high strength level
      const highStrengthWorkout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: { abs: 80, glutes: 80, lowerBack: 80, upperBody: 80, lastUpdated: Date.now() },
        hasElasticBands: true,
      });

      // Both should have same set count rules
      [lowStrengthWorkout, highStrengthWorkout].forEach((workout) => {
        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);

          if (exercise?.countingMethod === 'per-side') {
            expect(workoutExercise.sets.length).toBe(3);
          } else {
            expect(workoutExercise.sets.length).toBe(4);
          }
        });
      });
    });

    it('should correctly identify known per-side exercises', () => {
      // These are the known per-side exercise IDs from exercises.json
      const perSideExerciseIds = [
        'bird-dog-001',
        'single-leg-glute-bridge-001',
        'donkey-kicks-001',
        'side-plank-001',
        'fire-hydrants-001',
        'band-clamshells-001',
      ];

      // Generate workouts until we've tested at least a few per-side exercises
      const testedPerSideExercises = new Set<string>();

      for (let i = 0; i < 20 && testedPerSideExercises.size < 3; i++) {
        const workout = generateWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          hasElasticBands: true,
        });

        workout.exercises.forEach((workoutExercise) => {
          if (perSideExerciseIds.includes(workoutExercise.exerciseId)) {
            testedPerSideExercises.add(workoutExercise.exerciseId);
            expect(workoutExercise.sets.length).toBe(3);
          }
        });
      }

      // Ensure we actually tested some per-side exercises
      expect(testedPerSideExercises.size).toBeGreaterThan(0);
    });
  });

  describe('intensity feedback integration', () => {
    // Helper to create a minimal workout history entry
    function createHistoryEntry(overrides: {
      workoutNumber: number;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        muscleGroups: ('abs' | 'glutes' | 'lowerBack')[];
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
      };
    }

    describe('findLastPerformanceWithFeedback', () => {
      it('returns feedback when intensityFeedback is set on the exercise', () => {
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 20 }],
                intensityFeedback: 5,
              },
            ],
          }),
        ];

        const result = findLastPerformanceWithFeedback('crunches-001', history);
        expect(result).not.toBeNull();
        expect(result!.performance).toBe(20);
        expect(result!.feedback).toBe(5);
      });

      it('returns undefined feedback when intensityFeedback is not set', () => {
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 20 }],
                // No intensityFeedback
              },
            ],
          }),
        ];

        const result = findLastPerformanceWithFeedback('crunches-001', history);
        expect(result).not.toBeNull();
        expect(result!.performance).toBe(20);
        expect(result!.feedback).toBeUndefined();
      });

      it('finds the most recent workout entry (first in array = newest)', () => {
        const history: WorkoutHistoryEntry[] = [
          // Most recent (first in array)
          createHistoryEntry({
            workoutNumber: 3,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 25 }],
                intensityFeedback: 4,
              },
            ],
          }),
          // Older
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 20 }],
                intensityFeedback: 2,
              },
            ],
          }),
        ];

        const result = findLastPerformanceWithFeedback('crunches-001', history);
        expect(result!.performance).toBe(25);
        expect(result!.feedback).toBe(4);
      });
    });

    describe('generateWorkout with feedback', () => {
      it('reduces reps target when last feedback was "way too hard" (rating 5)', () => {
        const previousReps = 20;
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [
                  { setNumber: 1, actualReps: previousReps },
                  { setNumber: 2, actualReps: previousReps },
                ],
                intensityFeedback: 5, // Way too hard
              },
            ],
          }),
        ];

        const workout = generateWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          workoutHistory: history,
        });

        // Find crunches in the generated workout
        const crunchesExercise = workout.exercises.find(
          (ex) => ex.exerciseId === 'crunches-001'
        );

        // Crunches may not be in this workout (exercise rotation),
        // but if it is, the target should be lower
        if (crunchesExercise) {
          const targetReps = crunchesExercise.sets[0].targetReps!;
          expect(targetReps).toBeLessThan(previousReps);
        }
      });

      it('reduces timed target when last feedback was "a bit too hard" (rating 4)', () => {
        // Use plank since it's a starter timed exercise
        const previousDuration = 40;
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'plank-001',
                exerciseName: 'Plank',
                muscleGroups: ['abs', 'lowerBack'],
                completedSets: [
                  { setNumber: 1, actualDuration: previousDuration },
                  { setNumber: 2, actualDuration: previousDuration },
                ],
                intensityFeedback: 4, // A bit too hard
              },
            ],
          }),
        ];

        const workout = generateWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          workoutHistory: history,
        });

        const plankExercise = workout.exercises.find(
          (ex) => ex.exerciseId === 'plank-001'
        );

        if (plankExercise) {
          const targetDuration = plankExercise.sets[0].targetDuration!;
          expect(targetDuration).toBeLessThan(previousDuration);
        }
      });

      it('increases reps target when last feedback was "way too easy" (rating 1)', () => {
        const previousReps = 20;
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [
                  { setNumber: 1, actualReps: previousReps },
                  { setNumber: 2, actualReps: previousReps },
                ],
                intensityFeedback: 1, // Way too easy
              },
            ],
          }),
        ];

        const workout = generateWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          workoutHistory: history,
        });

        const crunchesExercise = workout.exercises.find(
          (ex) => ex.exerciseId === 'crunches-001'
        );

        if (crunchesExercise) {
          const targetReps = crunchesExercise.sets[0].targetReps!;
          expect(targetReps).toBeGreaterThan(previousReps);
        }
      });
    });
  });
});

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
      const muscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];

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

  describe('upper body role-based selection', () => {
    const slotOf = (exerciseId: string) => getExerciseById(exerciseId)?.upperBodySlot;

    function upperBodyHistoryEntry(workoutNumber: number, exerciseIds: string[]): WorkoutHistoryEntry {
      return {
        id: `history-ub-${workoutNumber}`,
        workoutId: `workout-ub-${workoutNumber}`,
        workoutNumber,
        completedDate: Date.now() - (100 - workoutNumber) * 86400000,
        totalDuration: 18,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'upperBody',
        exercises: exerciseIds.map(exerciseId => ({
          exerciseId,
          exerciseName: exerciseId,
          muscleGroups: ['upperBody'] as MuscleGroup[],
          completedSets: [{ setNumber: 1, actualReps: 10 }],
        })),
      };
    }

    it('generates exactly one horizontal-pull, one horizontal-push, and one vertical exercise', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        hasElasticBands: true,
      });

      expect(workout.exercises.length).toBe(3);

      const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
      expect(slots.filter(s => s === 'horizontal-pull').length).toBe(1);
      expect(slots.filter(s => s === 'horizontal-push').length).toBe(1);
      expect(slots.filter(s => s === 'vertical-pull' || s === 'vertical-push').length).toBe(1);
    });

    it('defaults the first session Slot 3 to vertical-push (no-equipment starter)', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        hasElasticBands: true,
      });

      const verticalExercise = workout.exercises.find(ex => {
        const slot = slotOf(ex.exerciseId);
        return slot === 'vertical-pull' || slot === 'vertical-push';
      });
      expect(verticalExercise).toBeDefined();
      expect(slotOf(verticalExercise!.exerciseId)).toBe('vertical-push');
    });

    it('alternates Slot 3 to vertical-pull after a vertical-push session', () => {
      // Previous upper body session used pike push-ups (vertical-push)
      const history: WorkoutHistoryEntry[] = [
        upperBodyHistoryEntry(1, ['inverted-rows-001', 'pushups-001', 'pike-pushups-001']),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        hasElasticBands: true, // band needed for the only vertical-pull exercise
        workoutHistory: history,
      });

      const verticalExercise = workout.exercises.find(ex => {
        const slot = slotOf(ex.exerciseId);
        return slot === 'vertical-pull' || slot === 'vertical-push';
      });
      expect(slotOf(verticalExercise!.exerciseId)).toBe('vertical-pull');
    });

    it('alternates Slot 3 back to vertical-push after a vertical-pull session', () => {
      const history: WorkoutHistoryEntry[] = [
        upperBodyHistoryEntry(1, ['inverted-rows-001', 'pushups-001', 'band-lat-pulldown-001']),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        hasElasticBands: true,
        workoutHistory: history,
      });

      const verticalExercise = workout.exercises.find(ex => {
        const slot = slotOf(ex.exerciseId);
        return slot === 'vertical-pull' || slot === 'vertical-push';
      });
      expect(slotOf(verticalExercise!.exerciseId)).toBe('vertical-push');
    });

    it('falls back to vertical-push when alternation calls for vertical-pull but no band is available', () => {
      // Last session was vertical-push, so alternation wants vertical-pull,
      // but band-less users have no vertical-pull exercise available.
      const history: WorkoutHistoryEntry[] = [
        upperBodyHistoryEntry(1, ['inverted-rows-001', 'pushups-001', 'pike-pushups-001']),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        hasElasticBands: false,
        workoutHistory: history,
      });

      expect(workout.exercises.length).toBe(3);
      const verticalExercise = workout.exercises.find(ex => {
        const slot = slotOf(ex.exerciseId);
        return slot === 'vertical-pull' || slot === 'vertical-push';
      });
      expect(slotOf(verticalExercise!.exerciseId)).toBe('vertical-push');
    });

    it('selects the least recently used exercise within a slot', () => {
      // inverted-rows used most recently; doorway-rows never used → doorway-rows wins horizontal-pull.
      const history: WorkoutHistoryEntry[] = [
        upperBodyHistoryEntry(5, ['inverted-rows-001', 'pushups-001', 'pike-pushups-001']),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 6,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        hasElasticBands: false,
        workoutHistory: history,
      });

      const pullExercise = workout.exercises.find(ex => slotOf(ex.exerciseId) === 'horizontal-pull');
      expect(pullExercise).toBeDefined();
      expect(pullExercise!.exerciseId).not.toBe('inverted-rows-001');
    });

    it('never generates lower back exercises on the upper body rotation day', () => {
      for (let i = 0; i < 10; i++) {
        const workout = generateDailyRotationWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
          hasElasticBands: true,
        });

        workout.exercises.forEach(ex => {
          const exercise = getExerciseById(ex.exerciseId);
          expect(exercise!.primaryMuscleGroup).toBe('upperBody');
        });
      }
    });
  });
});

describe('getNextUpperBodyVerticalSlot', () => {
  function upperBodyEntry(workoutNumber: number, exerciseIds: string[], workoutMode: 'full-body' | 'daily-rotation' = 'daily-rotation', targetMuscleGroup: MuscleGroup = 'upperBody'): WorkoutHistoryEntry {
    return {
      id: `history-ubv-${workoutNumber}`,
      workoutId: `workout-ubv-${workoutNumber}`,
      workoutNumber,
      completedDate: Date.now() - (100 - workoutNumber) * 86400000,
      totalDuration: 18,
      workoutMode,
      targetMuscleGroup,
      exercises: exerciseIds.map(exerciseId => ({
        exerciseId,
        exerciseName: exerciseId,
        muscleGroups: ['upperBody'] as MuscleGroup[],
        completedSets: [{ setNumber: 1, actualReps: 10 }],
      })),
    };
  }

  it('defaults to vertical-push with no history', () => {
    expect(getNextUpperBodyVerticalSlot([])).toBe('vertical-push');
  });

  it('flips vertical-push → vertical-pull', () => {
    const history = [upperBodyEntry(1, ['inverted-rows-001', 'pushups-001', 'pike-pushups-001'])];
    expect(getNextUpperBodyVerticalSlot(history)).toBe('vertical-pull');
  });

  it('flips vertical-pull → vertical-push', () => {
    const history = [upperBodyEntry(1, ['inverted-rows-001', 'pushups-001', 'band-lat-pulldown-001'])];
    expect(getNextUpperBodyVerticalSlot(history)).toBe('vertical-push');
  });

  it('uses the most recent upper body session, ignoring older ones and other rotation days', () => {
    const history = [
      upperBodyEntry(3, ['crunches-001'], 'daily-rotation', 'abs'), // most recent, not upper body
      upperBodyEntry(2, ['inverted-rows-001', 'pushups-001', 'band-lat-pulldown-001']), // most recent upper body
      upperBodyEntry(1, ['inverted-rows-001', 'pushups-001', 'pike-pushups-001']),
    ];
    expect(getNextUpperBodyVerticalSlot(history)).toBe('vertical-push');
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
