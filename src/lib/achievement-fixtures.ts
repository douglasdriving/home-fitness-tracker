import { Exercise } from '../types/exercise';
import { WorkoutHistoryEntry } from '../types/workout';

// Mock exercises for testing
export const mockExercises: Partial<Exercise>[] = [
  {
    id: 'crunches-001',
    name: 'Crunches',
    muscleGroups: ['abs'],
    type: 'reps',
    heavinessScore: { abs: 3, glutes: 0, lowerBack: 0, upperBody: 0 },
    retirementThreshold: { type: 'reps', value: 50 },
  },
  {
    id: 'flutter-kicks-001',
    name: 'Flutter Kicks',
    muscleGroups: ['abs'],
    type: 'timed',
    heavinessScore: { abs: 6, glutes: 0, lowerBack: 0, upperBody: 0 },
    unlockRequirement: { exerciseId: 'crunches-001', type: 'reps', value: 20 },
    retirementThreshold: { type: 'timed', value: 90 },
  },
  {
    id: 'plank-001',
    name: 'Plank',
    muscleGroups: ['abs', 'lowerBack'],
    type: 'timed',
    heavinessScore: { abs: 5, glutes: 0, lowerBack: 3, upperBody: 0 },
    retirementThreshold: { type: 'timed', value: 120 },
  },
];

// Helper to create workout history entries
export function createHistoryEntry(
  exerciseId: string,
  actualReps?: number,
  actualDuration?: number,
  workoutNumber = 1
): WorkoutHistoryEntry {
  return {
    id: `history-${Date.now()}`,
    workoutId: `workout-${Date.now()}`,
    workoutNumber,
    completedDate: Date.now(),
    totalDuration: 30,
    exercises: [
      {
        exerciseId,
        exerciseName: 'Test Exercise',
        muscleGroups: ['abs'],
        completedSets: [
          {
            setNumber: 1,
            actualReps,
            actualDuration,
          },
        ],
      },
    ],
  };
}
