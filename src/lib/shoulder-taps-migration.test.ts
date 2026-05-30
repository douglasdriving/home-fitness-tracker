import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import {
  needsShoulderTapsMigration,
  migrateShoulderTapsToReps,
} from './shoulder-taps-migration';
import type { WorkoutHistoryEntry, Workout } from '../types/workout';

describe('shoulder-taps-migration', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.history.clear();
    await db.workouts.clear();
  });

  describe('needsShoulderTapsMigration', () => {
    it('returns true when history contains plank-shoulder-taps with actualDuration', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 30,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);

      const needs = await needsShoulderTapsMigration();
      expect(needs).toBe(true);
    });

    it('returns false when history contains plank-shoulder-taps with actualReps (already migrated)', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualReps: 10,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);

      const needs = await needsShoulderTapsMigration();
      expect(needs).toBe(false);
    });

    it('returns false when no plank-shoulder-taps entries exist', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-001',
            exerciseName: 'Plank',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 60,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);

      const needs = await needsShoulderTapsMigration();
      expect(needs).toBe(false);
    });
  });

  describe('migrateShoulderTapsToReps', () => {
    it('converts actualDuration to actualReps using 3:1 ratio', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 30,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);
      await migrateShoulderTapsToReps();

      const migrated = await db.history.get('1');
      expect(migrated).toBeDefined();
      expect(migrated!.exercises[0].completedSets[0].actualReps).toBe(10); // 30 / 3 = 10
      expect(migrated!.exercises[0].completedSets[0].actualDuration).toBeUndefined();
    });

    it('handles multiple sets correctly', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 600,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 60,
              },
              {
                setNumber: 2,
                actualDuration: 90,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);
      await migrateShoulderTapsToReps();

      const migrated = await db.history.get('1');
      expect(migrated!.exercises[0].completedSets[0].actualReps).toBe(20); // 60 / 3
      expect(migrated!.exercises[0].completedSets[1].actualReps).toBe(30); // 90 / 3
    });

    it('handles multiple history entries', async () => {
      const entry1: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: new Date('2024-01-01').getTime(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 30,
              },
            ],
          },
        ],
      };

      const entry2: WorkoutHistoryEntry = {
        id: '2',
        workoutId: 'w2',
        workoutNumber: 2,
        completedDate: new Date('2024-01-02').getTime(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 45,
              },
            ],
          },
        ],
      };

      await db.history.bulkAdd([entry1, entry2]);
      await migrateShoulderTapsToReps();

      const migrated1 = await db.history.get('1');
      const migrated2 = await db.history.get('2');

      expect(migrated1!.exercises[0].completedSets[0].actualReps).toBe(10);
      expect(migrated2!.exercises[0].completedSets[0].actualReps).toBe(15);
    });

    it('is idempotent - does not double-convert on second run', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 30,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);
      await migrateShoulderTapsToReps();
      await migrateShoulderTapsToReps(); // Run twice

      const migrated = await db.history.get('1');
      expect(migrated!.exercises[0].completedSets[0].actualReps).toBe(10); // Still 10, not converted again
      expect(migrated!.exercises[0].completedSets[0].actualDuration).toBeUndefined();
    });

    it('does not modify other exercises in the same workout', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 600,
        exercises: [
          {
            exerciseId: 'plank-001',
            exerciseName: 'Plank',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 60,
              },
            ],
          },
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
                actualDuration: 30,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);
      await migrateShoulderTapsToReps();

      const migrated = await db.history.get('1');
      // Plank should remain unchanged
      expect(migrated!.exercises[0].completedSets[0].actualDuration).toBe(60);
      expect(migrated!.exercises[0].completedSets[0].actualReps).toBeUndefined();
      // Shoulder taps should be converted
      expect(migrated!.exercises[1].completedSets[0].actualReps).toBe(10);
      expect(migrated!.exercises[1].completedSets[0].actualDuration).toBeUndefined();
    });

    it('handles sets with no duration gracefully', async () => {
      const historyEntry: WorkoutHistoryEntry = {
        id: '1',
        workoutId: 'w1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              {
                setNumber: 1,
              },
            ],
          },
        ],
      };

      await db.history.add(historyEntry);
      await migrateShoulderTapsToReps();

      const migrated = await db.history.get('1');
      expect(migrated!.exercises[0].completedSets[0].actualReps).toBeUndefined();
    });

    it('migrates active workouts with plank-shoulder-taps', async () => {
      const activeWorkout: Workout = {
        id: 'active-1',
        workoutNumber: 1,
        generatedDate: Date.now(),
        status: 'in-progress',
        estimatedDuration: 20,
        currentExerciseIndex: 0,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            restTime: 60,
            sets: [
              {
                setNumber: 1,
                targetDuration: 30,
                completed: false,
              },
            ],
          },
        ],
      };

      await db.workouts.add(activeWorkout);
      await migrateShoulderTapsToReps();

      const migrated = await db.workouts.get('active-1');
      expect(migrated!.exercises[0].sets[0].targetReps).toBe(10); // 30 / 3
      expect(migrated!.exercises[0].sets[0].targetDuration).toBeUndefined();
    });
  });
});
