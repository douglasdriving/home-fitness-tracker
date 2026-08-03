import { describe, it, expect } from 'vitest';
import { checkLadderAdvancements } from './achievement-tracker';
import { ExerciseAchievements } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';

describe('checkLadderAdvancements', () => {
  const ladderWorkout = (
    exerciseId: string,
    reps: number[]
  ): WorkoutHistoryEntry => ({
    id: 'history-ladder-1',
    workoutId: 'workout-ladder-1',
    workoutNumber: 10,
    completedDate: Date.now(),
    totalDuration: 20,
    workoutMode: 'daily-rotation',
    targetMuscleGroup: 'upperBody',
    exercises: [
      {
        exerciseId,
        exerciseName: exerciseId,
        muscleGroups: ['upperBody'],
        completedSets: reps.map((r, i) => ({ setNumber: i + 1, actualReps: r })),
      },
    ],
  });

  const noAchievements: ExerciseAchievements = {
    unlockedExercises: [],
    retiredExercises: [],
  };

  it('advances the rung when ALL working sets reach advanceReps', () => {
    const advancements = checkLadderAdvancements(
      ladderWorkout('incline-pushups-001', [15, 15, 15]),
      noAchievements
    );

    expect(advancements).toHaveLength(1);
    expect(advancements[0].exerciseId).toBe('incline-pushups-001');
    expect(advancements[0].fromRung).toBe(0);
    expect(advancements[0].toRung).toBe(1);
    expect(advancements[0].fromRungName).toMatch(/kitchen counter/i);
    expect(advancements[0].toRungName).toMatch(/bookcase/i);
  });

  it('does not advance when any working set is below advanceReps', () => {
    const advancements = checkLadderAdvancements(
      ladderWorkout('incline-pushups-001', [15, 15, 14]),
      noAchievements
    );
    expect(advancements).toHaveLength(0);
  });

  it('does not advance off a single-set session', () => {
    const advancements = checkLadderAdvancements(
      ladderWorkout('incline-pushups-001', [15]),
      noAchievements
    );
    expect(advancements).toHaveLength(0);
  });

  it('advances from the current ladder level, not always from rung 0', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
      ladderLevels: { 'incline-pushups-001': 2 },
    };

    const advancements = checkLadderAdvancements(
      ladderWorkout('incline-pushups-001', [15, 16, 15]),
      achievements
    );

    expect(advancements).toHaveLength(1);
    expect(advancements[0].fromRung).toBe(2);
    expect(advancements[0].toRung).toBe(3);
  });

  it('never advances past the top rung', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
      ladderLevels: { 'inverted-rows-001': 3 }, // table row has 4 rungs (indices 0-3)
    };

    const advancements = checkLadderAdvancements(
      ladderWorkout('inverted-rows-001', [20, 20, 20]),
      achievements
    );
    expect(advancements).toHaveLength(0);
  });

  it('ignores exercises without a ladder', () => {
    const advancements = checkLadderAdvancements(
      ladderWorkout('crunches-001', [50, 50, 50]),
      noAchievements
    );
    expect(advancements).toHaveLength(0);
  });
});
