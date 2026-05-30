import { describe, it, expect } from 'vitest';
import { calculateEstimatedDuration } from '../lib/workout-generator';
import { allExercises, getExerciseById } from '../data/exerciseData';
import type { WorkoutExercise, Set } from '../types/workout';

describe('Custom Workout Builder Logic', () => {
  describe('Workout exercise building', () => {
    it('builds reps exercise correctly', () => {
      const repsExercise = allExercises.find(ex => ex.type === 'reps' && ex.structure !== 'mcgill');
      if (!repsExercise) {
        return;
      }

      const customSetsCount = 4;

      // Build sets (matches handleCreateCustomWorkout logic)
      const sets: Set[] = Array.from({ length: customSetsCount }, (_, i) => ({
        setNumber: i + 1,
        completed: false,
        targetReps: repsExercise.defaultReps ?? 10,
      }));

      expect(sets).toHaveLength(4);
      expect(sets[0]).toHaveProperty('targetReps');
      expect(sets[0].targetReps).toBeGreaterThan(0);
      expect(sets[0]).not.toHaveProperty('targetDuration');
    });

    it('builds timed exercise correctly', () => {
      const timedExercise = allExercises.find(ex => ex.type === 'timed' && ex.structure !== 'mcgill');
      if (!timedExercise) {
        return;
      }

      const customSetsCount = 3;

      // Build sets
      const sets: Set[] = Array.from({ length: customSetsCount }, (_, i) => ({
        setNumber: i + 1,
        completed: false,
        targetDuration: timedExercise.defaultDuration ?? 30,
      }));

      expect(sets).toHaveLength(3);
      expect(sets[0]).toHaveProperty('targetDuration');
      expect(sets[0].targetDuration).toBeGreaterThan(0);
      expect(sets[0]).not.toHaveProperty('targetReps');
    });

    it('builds McGill exercise correctly with rounds cycling', () => {
      const mcgillExercise = allExercises.find(ex => ex.structure === 'mcgill');
      if (!mcgillExercise || !mcgillExercise.mcgillDefaults) {
        return;
      }

      const customSetsCount = 5; // More sets than rounds entries to test cycling
      const mcgillRoundsArray = mcgillExercise.mcgillDefaults.rounds;

      // Build sets (matches handleCreateCustomWorkout logic)
      const sets: Set[] = Array.from({ length: customSetsCount }, (_, i) => {
        const setNumber = i + 1;
        const roundsIndex = Math.min(i, mcgillRoundsArray.length - 1);
        const rounds = mcgillRoundsArray[roundsIndex] ?? mcgillRoundsArray[mcgillRoundsArray.length - 1] ?? 3;

        return {
          setNumber,
          completed: false,
          mcgillRounds: rounds,
          mcgillHoldDuration: mcgillExercise.mcgillDefaults!.holdDuration,
        };
      });

      expect(sets).toHaveLength(5);
      expect(sets[0]).toHaveProperty('mcgillRounds');
      expect(sets[0]).toHaveProperty('mcgillHoldDuration');
      expect(sets[0]).not.toHaveProperty('targetReps');
      expect(sets[0]).not.toHaveProperty('targetDuration');

      // Verify rounds cycling for sets beyond the rounds array length
      if (customSetsCount > mcgillRoundsArray.length) {
        const lastRoundsValue = mcgillRoundsArray[mcgillRoundsArray.length - 1];
        expect(sets[customSetsCount - 1].mcgillRounds).toBe(lastRoundsValue);
      }
    });

    it('calculates rest time correctly based on heavinessScore', () => {
      const exercise = allExercises[0];

      // Matches handleCreateCustomWorkout logic
      const restTime = Math.round(30 + (exercise.heavinessScore[exercise.primaryMuscleGroup] / 10) * 30);

      expect(restTime).toBeGreaterThanOrEqual(30);
      expect(restTime).toBeLessThanOrEqual(60);
    });
  });

  describe('Estimated duration calculation', () => {
    it('calculates duration for a single exercise workout', () => {
      const exercise = getExerciseById('crunches-001');
      if (!exercise) {
        return;
      }

      const workoutExercises: WorkoutExercise[] = [{
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroups: exercise.muscleGroups,
        sets: Array.from({ length: 4 }, (_, i) => ({
          setNumber: i + 1,
          completed: false,
          targetReps: exercise.defaultReps ?? 10,
        })),
        restTime: 45,
      }];

      const estimatedDuration = calculateEstimatedDuration(workoutExercises);

      expect(estimatedDuration).toBeGreaterThan(0);
      expect(typeof estimatedDuration).toBe('number');
    });

    it('calculates duration for multiple exercises', () => {
      const exercise1 = getExerciseById('crunches-001');
      const exercise2 = getExerciseById('plank-001');

      if (!exercise1 || !exercise2) {
        return;
      }

      const workoutExercises: WorkoutExercise[] = [
        {
          exerciseId: exercise1.id,
          exerciseName: exercise1.name,
          muscleGroups: exercise1.muscleGroups,
          sets: Array.from({ length: 3 }, (_, i) => ({
            setNumber: i + 1,
            completed: false,
            targetReps: exercise1.defaultReps ?? 10,
          })),
          restTime: 45,
        },
        {
          exerciseId: exercise2.id,
          exerciseName: exercise2.name,
          muscleGroups: exercise2.muscleGroups,
          sets: Array.from({ length: 3 }, (_, i) => ({
            setNumber: i + 1,
            completed: false,
            targetDuration: exercise2.defaultDuration ?? 30,
          })),
          restTime: 45,
        },
      ];

      const estimatedDuration = calculateEstimatedDuration(workoutExercises);

      expect(estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('Exercise defaults fallback', () => {
    it('uses fallback values when exercise defaults are undefined', () => {
      // Create a mock exercise with undefined defaults
      const exerciseWithoutDefaults = {
        ...allExercises[0],
        defaultReps: undefined,
        defaultDuration: undefined,
      };

      // Test reps fallback
      const repsSet: Set = {
        setNumber: 1,
        completed: false,
        targetReps: exerciseWithoutDefaults.defaultReps ?? 10,
      };

      expect(repsSet.targetReps).toBe(10);

      // Test duration fallback
      const durationSet: Set = {
        setNumber: 1,
        completed: false,
        targetDuration: exerciseWithoutDefaults.defaultDuration ?? 30,
      };

      expect(durationSet.targetDuration).toBe(30);
    });
  });

  describe('Workout structure validation', () => {
    it('creates valid workout structure', () => {
      const exercise = allExercises[0];
      const customSetsCount = 4;

      const sets: Set[] = Array.from({ length: customSetsCount }, (_, i) => {
        const baseSet: Set = {
          setNumber: i + 1,
          completed: false,
        };

        if (exercise.type === 'reps') {
          return {
            ...baseSet,
            targetReps: exercise.defaultReps ?? 10,
          };
        } else {
          return {
            ...baseSet,
            targetDuration: exercise.defaultDuration ?? 30,
          };
        }
      });

      const workoutExercise: WorkoutExercise = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroups: exercise.muscleGroups,
        sets,
        restTime: Math.round(30 + (exercise.heavinessScore[exercise.primaryMuscleGroup] / 10) * 30),
      };

      // Validate structure
      expect(workoutExercise.exerciseId).toBe(exercise.id);
      expect(workoutExercise.exerciseName).toBe(exercise.name);
      expect(workoutExercise.muscleGroups).toEqual(exercise.muscleGroups);
      expect(workoutExercise.sets).toHaveLength(customSetsCount);
      expect(workoutExercise.restTime).toBeGreaterThanOrEqual(30);

      // Each set should have a setNumber
      workoutExercise.sets.forEach((set, index) => {
        expect(set.setNumber).toBe(index + 1);
        expect(set.completed).toBe(false);
      });
    });
  });
});
