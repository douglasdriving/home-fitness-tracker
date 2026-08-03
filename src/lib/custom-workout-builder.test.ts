import { describe, it, expect, beforeEach } from 'vitest';
import { buildCustomWorkout } from './custom-workout-builder';
import { db } from '../db/db';

describe('buildCustomWorkout', () => {
  beforeEach(async () => {
    await db.workouts.clear();
    await db.history.clear();
  });

  it('builds a standard reps exercise with default target when no history', async () => {
    const workout = await buildCustomWorkout(['crunches-001'], 3);

    expect(workout.status).toBe('pending');
    expect(workout.workoutMode).toBe('full-body');
    expect(workout.workoutNumber).toBe(1);
    expect(workout.exercises).toHaveLength(1);

    const ex = workout.exercises[0];
    expect(ex.exerciseId).toBe('crunches-001');
    expect(ex.sets).toHaveLength(3);
    // Standard reps exercise falls back to defaultReps (15)
    expect(ex.sets[0].targetReps).toBe(15);
    expect(ex.sets[0].targetDuration).toBeUndefined();
    expect(ex.sets[0].mcgillRounds).toBeUndefined();
    // Set numbers are sequential
    expect(ex.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it('builds a standard timed exercise using default duration', async () => {
    const workout = await buildCustomWorkout(['flutter-kicks-001'], 2);
    const ex = workout.exercises[0];

    expect(ex.sets).toHaveLength(2);
    expect(ex.sets[0].targetDuration).toBe(30);
    expect(ex.sets[0].targetReps).toBeUndefined();
  });

  it('builds a McGill exercise with rounds/hold structure from defaults', async () => {
    const workout = await buildCustomWorkout(['plank-001'], 4);
    const ex = workout.exercises[0];

    expect(ex.sets).toHaveLength(4);
    // McGill defaults: rounds [3,2,1], holdDuration 15
    expect(ex.sets[0].mcgillRounds).toBe(3);
    expect(ex.sets[0].mcgillHoldDuration).toBe(15);
    expect(ex.sets[0].targetDuration).toBe(45); // 3 rounds * 15s
    expect(ex.sets[1].mcgillRounds).toBe(2);
    expect(ex.sets[2].mcgillRounds).toBe(1);
    // 4th set cycles the last rounds value (1)
    expect(ex.sets[3].mcgillRounds).toBe(1);
    expect(ex.sets[3].targetDuration).toBe(15);
  });

  it('persists the workout and clears previous pending workouts', async () => {
    await buildCustomWorkout(['crunches-001'], 1);
    await buildCustomWorkout(['flutter-kicks-001'], 1);

    const pending = await db.workouts.toArray();
    // Only the latest pending workout remains
    expect(pending).toHaveLength(1);
    expect(pending[0].exercises[0].exerciseId).toBe('flutter-kicks-001');
  });

  it('builds multiple exercises in the given order', async () => {
    const workout = await buildCustomWorkout(['crunches-001', 'plank-001'], 2);

    expect(workout.exercises).toHaveLength(2);
    expect(workout.exercises[0].exerciseId).toBe('crunches-001');
    expect(workout.exercises[1].exerciseId).toBe('plank-001');
    expect(workout.estimatedDuration).toBeGreaterThan(0);
  });

  it('throws when an exercise id does not exist', async () => {
    await expect(buildCustomWorkout(['does-not-exist'], 1)).rejects.toThrow(
      'Exercise not found: does-not-exist'
    );
  });
});
