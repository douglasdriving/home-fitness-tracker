import { describe, it, expect } from 'vitest';
import { findLastPerformanceWithFeedback } from './workout-generator';
import { WorkoutHistoryEntry } from '../types/workout';

describe('findLastPerformanceWithFeedback', () => {
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
