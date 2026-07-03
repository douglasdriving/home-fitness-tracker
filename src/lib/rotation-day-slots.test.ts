import { describe, it, expect } from 'vitest';
import { generateDailyRotationWorkout } from './workout-generator';
import { getExerciseById } from '../data/exerciseData';
import { StrengthLevels } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { MuscleGroup } from '../types/exercise';

const defaultStrengthLevels: StrengthLevels = {
  abs: 50,
  glutes: 50,
  lowerBack: 50,
  upperBody: 50,
  lastUpdated: Date.now(),
};

describe('upper body role-based selection (tested pool, coaching 2026-07-01)', () => {
  const slotOf = (exerciseId: string) => getExerciseById(exerciseId)?.upperBodySlot;

  function upperBodyHistoryEntry(
    workoutNumber: number,
    exercises: Array<{ exerciseId: string; reps: number[]; feedback?: 1 | 2 | 3 | 4 | 5; ladderRung?: number }>
  ): WorkoutHistoryEntry {
    return {
      id: `history-ub-${workoutNumber}`,
      workoutId: `workout-ub-${workoutNumber}`,
      workoutNumber,
      completedDate: Date.now() - (100 - workoutNumber) * 86400000,
      totalDuration: 18,
      workoutMode: 'daily-rotation',
      targetMuscleGroup: 'upperBody',
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseId,
        muscleGroups: ['upperBody'] as MuscleGroup[],
        completedSets: ex.reps.map((r, i) => ({ setNumber: i + 1, actualReps: r })),
        intensityFeedback: ex.feedback,
        ladderRung: ex.ladderRung,
      })),
    };
  }

  it('generates the three tested exercises, one per slot', () => {
    const workout = generateDailyRotationWorkout({
      workoutNumber: 1,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
    });

    expect(workout.exercises.map(ex => ex.exerciseId)).toEqual([
      'inverted-rows-001',
      'incline-pushups-001',
      'pike-pushups-001',
    ]);
    expect(workout.exercises.map(ex => slotOf(ex.exerciseId))).toEqual([
      'horizontal-pull',
      'horizontal-push',
      'vertical-push',
    ]);
  });

  it('runs pike push-up (vertical-push) every session — Slot 3 does not alternate', () => {
    // Even directly after a pike push-up session, Slot 3 is pike push-up again
    const history: WorkoutHistoryEntry[] = [
      upperBodyHistoryEntry(1, [
        { exerciseId: 'inverted-rows-001', reps: [8, 8, 8], ladderRung: 0 },
        { exerciseId: 'incline-pushups-001', reps: [8, 8, 8], ladderRung: 0 },
        { exerciseId: 'pike-pushups-001', reps: [8, 8, 8], ladderRung: 0 },
      ]),
    ];

    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
      workoutHistory: history,
      hasElasticBands: true,
    });

    const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
    expect(slots).toContain('vertical-push');
    expect(slots).not.toContain('vertical-pull');
  });

  it('gives every upper body exercise 3 sets', () => {
    const workout = generateDailyRotationWorkout({
      workoutNumber: 1,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
    });

    workout.exercises.forEach(ex => {
      expect(ex.sets.length).toBe(3);
    });
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

describe('posterior chain role-based selection (glutes day, 2026-06-17 consolidation)', () => {
  const slotOf = (exerciseId: string) => getExerciseById(exerciseId)?.posteriorChainSlot;

  // Build a completed posterior-chain (glutes) session from a list of exercise ids.
  function posteriorChainHistoryEntry(
    workoutNumber: number,
    exerciseIds: string[]
  ): WorkoutHistoryEntry {
    return {
      id: `history-pc-${workoutNumber}`,
      workoutId: `workout-pc-${workoutNumber}`,
      workoutNumber,
      completedDate: Date.now() - (100 - workoutNumber) * 86400000,
      totalDuration: 20,
      workoutMode: 'daily-rotation',
      targetMuscleGroup: 'glutes',
      exercises: exerciseIds.map(id => ({
        exerciseId: id,
        exerciseName: id,
        muscleGroups: getExerciseById(id)?.muscleGroups ?? (['glutes'] as MuscleGroup[]),
        completedSets: [{ setNumber: 1, actualReps: 12 }],
      })),
    };
  }

  it('fills exactly one hinge, one glute-builder, and one accessory slot', () => {
    const workout = generateDailyRotationWorkout({
      workoutNumber: 1,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'glutes',
      hasElasticBands: true,
    });

    const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
    expect(workout.exercises).toHaveLength(3);
    expect(slots).toContain('hinge');
    expect(slots).toContain('glute-builder');
    // First-ever posterior-chain session: Slot 3 defaults to spinal-extension.
    expect(slots).toContain('spinal-extension');
    expect(slots).not.toContain('lateral-glute');
  });

  it('only ever selects glutes-primary exercises on the posterior-chain day', () => {
    for (let i = 0; i < 10; i++) {
      const workout = generateDailyRotationWorkout({
        workoutNumber: i + 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        hasElasticBands: true,
      });
      workout.exercises.forEach(ex => {
        expect(getExerciseById(ex.exerciseId)?.primaryMuscleGroup).toBe('glutes');
      });
    }
  });

  it('always contains a hinge (Slot 1) for a banded user (safety rule)', () => {
    // Even directly after a session that used the hinge, Slot 1 stays a hinge.
    const history = [
      posteriorChainHistoryEntry(1, ['good-morning-001', 'glute-bridge-001', 'back-extension-hold-001']),
    ];
    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'glutes',
      workoutHistory: history,
      hasElasticBands: true,
    });
    expect(workout.exercises.map(ex => slotOf(ex.exerciseId))).toContain('hinge');
  });

  it('flips Slot 3 to lateral-glute after a spinal-extension session', () => {
    const history = [
      posteriorChainHistoryEntry(1, ['good-morning-001', 'glute-bridge-001', 'back-extension-hold-001']),
    ];
    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'glutes',
      workoutHistory: history,
      hasElasticBands: true,
    });
    const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
    expect(slots).toContain('lateral-glute');
    expect(slots).not.toContain('spinal-extension');
  });

  it('flips Slot 3 back to spinal-extension after a lateral-glute session', () => {
    const history = [
      posteriorChainHistoryEntry(1, ['good-morning-001', 'glute-bridge-001', 'donkey-kicks-001']),
    ];
    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'glutes',
      workoutHistory: history,
      hasElasticBands: true,
    });
    const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
    expect(slots).toContain('spinal-extension');
    expect(slots).not.toContain('lateral-glute');
  });

  it('reads the accessory from the most recent posterior-chain session only (ignores abs/upper-body days in between)', () => {
    // Newest-first history: an abs day sits between now and the last glutes day.
    const history = [
      {
        id: 'history-abs-9',
        workoutId: 'workout-abs-9',
        workoutNumber: 9,
        completedDate: Date.now() - 86400000,
        totalDuration: 20,
        workoutMode: 'daily-rotation' as const,
        targetMuscleGroup: 'abs' as MuscleGroup,
        exercises: [
          {
            exerciseId: 'crunches-001',
            exerciseName: 'Crunches',
            muscleGroups: ['abs'] as MuscleGroup[],
            completedSets: [{ setNumber: 1, actualReps: 15 }],
          },
        ],
      },
      posteriorChainHistoryEntry(8, ['good-morning-001', 'glute-bridge-001', 'donkey-kicks-001']),
    ];
    const workout = generateDailyRotationWorkout({
      workoutNumber: 10,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'glutes',
      workoutHistory: history,
      hasElasticBands: true,
    });
    // Last glutes accessory was lateral-glute → next must be spinal-extension.
    const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
    expect(slots).toContain('spinal-extension');
    expect(slots).not.toContain('lateral-glute');
  });

  it('gives standard posterior-chain exercises 3 sets and per-side ones 2 sets', () => {
    const workout = generateDailyRotationWorkout({
      workoutNumber: 1,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'glutes',
      hasElasticBands: true,
    });
    workout.exercises.forEach(ex => {
      const exercise = getExerciseById(ex.exerciseId);
      const expected = exercise?.countingMethod === 'per-side' ? 2 : 3;
      expect(ex.sets.length).toBe(expected);
    });
  });
});
