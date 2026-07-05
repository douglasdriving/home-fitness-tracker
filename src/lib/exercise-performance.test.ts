import { describe, it, expect } from 'vitest';
import { getBestPerformance } from './achievement-tracker';
import { WorkoutHistoryEntry } from '../types/workout';
import { createHistoryEntry } from './achievement-fixtures';

describe('getBestPerformance', () => {
  it('returns null when exercise has no history', () => {
    const result = getBestPerformance('nonexistent-001', []);
    expect(result).toBeNull();
  });

  it('returns the best reps performance across workouts', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry('crunches-001', 30),
      createHistoryEntry('crunches-001', 45),
      createHistoryEntry('crunches-001', 35),
    ];

    const result = getBestPerformance('crunches-001', history);
    expect(result?.reps).toBe(45);
  });

  it('returns the best duration performance across workouts', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry('plank-001', undefined, 60),
      createHistoryEntry('plank-001', undefined, 90),
      createHistoryEntry('plank-001', undefined, 75),
    ];

    const result = getBestPerformance('plank-001', history);
    expect(result?.duration).toBe(90);
  });

  it('considers all sets within a workout', () => {
    const historyEntry: WorkoutHistoryEntry = {
      id: 'h1',
      workoutId: 'w1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 30,
      exercises: [
        {
          exerciseId: 'crunches-001',
          exerciseName: 'Crunches',
          muscleGroups: ['abs'],
          completedSets: [
            { setNumber: 1, actualReps: 20 },
            { setNumber: 2, actualReps: 25 },
            { setNumber: 3, actualReps: 22 },
          ],
        },
      ],
    };

    const result = getBestPerformance('crunches-001', [historyEntry]);
    expect(result?.reps).toBe(25);
  });

  it('handles removed exercises in historical data gracefully', () => {
    // Scenario: User has workout history with a removed exercise (prone-y-t-w-001)
    const historyWithRemovedExercise: WorkoutHistoryEntry = {
      id: 'h1',
      workoutId: 'w1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 30,
      exercises: [
        {
          exerciseId: 'prone-y-t-w-001', // This exercise has been removed
          exerciseName: 'Prone Y-T-W Raises', // Name is stored in history
          muscleGroups: ['lowerBack'],
          completedSets: [
            { setNumber: 1, actualReps: 25 },
          ],
        },
      ],
    };

    // getBestPerformance should return the stored performance even if exercise is removed
    const result = getBestPerformance('prone-y-t-w-001', [historyWithRemovedExercise]);
    expect(result?.reps).toBe(25);
  });

  it('handles workout with no completed sets', () => {
    const historyEntry: WorkoutHistoryEntry = {
      id: 'h1',
      workoutId: 'w1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 30,
      exercises: [
        {
          exerciseId: 'crunches-001',
          exerciseName: 'Crunches',
          muscleGroups: ['abs'],
          completedSets: [], // No completed sets
        },
      ],
    };

    const result = getBestPerformance('crunches-001', [historyEntry]);
    expect(result).toBeNull();
  });
});
