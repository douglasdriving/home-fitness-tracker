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

describe('ladder double progression', () => {
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

  it('starts a first-ever session at the ladder startReps with rung 0 stamped', () => {
    const workout = generateDailyRotationWorkout({
      workoutNumber: 1,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
    });

    workout.exercises.forEach(ex => {
      expect(ex.ladderRung).toBe(0);
      ex.sets.forEach(set => {
        expect(set.targetReps).toBe(8);
      });
    });
  });

  it('progresses reps within the current rung using intensity feedback', () => {
    // 10 reps at rung 0, feedback 2 (a bit too easy, +10%) → 11 reps
    const history = [
      upperBodyHistoryEntry(1, [
        { exerciseId: 'inverted-rows-001', reps: [10, 10, 10], feedback: 2, ladderRung: 0 },
      ]),
    ];

    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
      workoutHistory: history,
    });

    const tableRow = workout.exercises.find(ex => ex.exerciseId === 'inverted-rows-001');
    expect(tableRow!.sets[0].targetReps).toBe(11);
    expect(tableRow!.ladderRung).toBe(0);
  });

  it('caps the target at advanceReps below the top rung', () => {
    // 14 reps, feedback 1 (+20%) would give 17, but 15 triggers the rung advance instead
    const history = [
      upperBodyHistoryEntry(1, [
        { exerciseId: 'incline-pushups-001', reps: [14, 14, 14], feedback: 1, ladderRung: 0 },
      ]),
    ];

    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
      workoutHistory: history,
    });

    const inclinePushup = workout.exercises.find(ex => ex.exerciseId === 'incline-pushups-001');
    expect(inclinePushup!.sets[0].targetReps).toBe(15);
  });

  it('resets to startReps when the user has advanced to a new rung', () => {
    // User cleared rung 0 (15s across the board) and their ladder level is now 1
    const history = [
      upperBodyHistoryEntry(1, [
        { exerciseId: 'incline-pushups-001', reps: [15, 15, 15], feedback: 3, ladderRung: 0 },
      ]),
    ];

    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
      workoutHistory: history,
      exerciseAchievements: {
        unlockedExercises: [],
        retiredExercises: [],
        ladderLevels: { 'incline-pushups-001': 1 },
      },
    });

    const inclinePushup = workout.exercises.find(ex => ex.exerciseId === 'incline-pushups-001');
    expect(inclinePushup!.sets[0].targetReps).toBe(8);
    expect(inclinePushup!.ladderRung).toBe(1);
  });

  it('does not cap the target on the top rung', () => {
    const topRung = getExerciseById('inverted-rows-001')!.ladder!.rungs.length - 1;
    const history = [
      upperBodyHistoryEntry(1, [
        { exerciseId: 'inverted-rows-001', reps: [15, 15, 15], feedback: 1, ladderRung: topRung },
      ]),
    ];

    const workout = generateDailyRotationWorkout({
      workoutNumber: 2,
      strengthLevels: defaultStrengthLevels,
      targetMuscleGroup: 'upperBody',
      workoutHistory: history,
      exerciseAchievements: {
        unlockedExercises: [],
        retiredExercises: [],
        ladderLevels: { 'inverted-rows-001': topRung },
      },
    });

    const tableRow = workout.exercises.find(ex => ex.exerciseId === 'inverted-rows-001');
    // 15 + 20% = 18 — allowed to keep climbing at the top of the ladder
    expect(tableRow!.sets[0].targetReps).toBe(18);
  });
});
