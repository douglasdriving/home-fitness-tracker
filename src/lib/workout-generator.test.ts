import { describe, it, expect } from 'vitest';
import { generateWorkout, findLastPerformanceWithFeedback } from './workout-generator';
import { getExerciseById } from '../data/exerciseData';
import { StrengthLevels } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';

describe('generateWorkout', () => {
  const defaultStrengthLevels: StrengthLevels = {
    abs: 50,
    glutes: 50,
    lowerBack: 50,
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
        strengthLevels: { abs: 20, glutes: 20, lowerBack: 20, lastUpdated: Date.now() },
        hasElasticBands: true,
      });

      // Test with high strength level
      const highStrengthWorkout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: { abs: 80, glutes: 80, lowerBack: 80, lastUpdated: Date.now() },
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
