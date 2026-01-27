import { describe, it, expect } from 'vitest';
import { generateWorkout } from './workout-generator';
import { getExerciseById } from '../data/exerciseData';
import { StrengthLevels } from '../types/user';

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
});
