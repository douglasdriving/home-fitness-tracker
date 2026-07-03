import { WorkoutHistoryEntry } from '../types/workout';

/**
 * Get the best (highest) performance for an exercise from workout history
 * Returns the best single-set performance across all workouts
 */
export function getBestPerformance(
  exerciseId: string,
  workoutHistory: WorkoutHistoryEntry[]
): { reps?: number; duration?: number } | null {
  let bestReps: number | undefined;
  let bestDuration: number | undefined;

  for (const workout of workoutHistory) {
    const exercise = workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (!exercise) continue;

    for (const set of exercise.completedSets) {
      if (set.actualReps !== undefined) {
        bestReps = Math.max(bestReps ?? 0, set.actualReps);
      }
      // For McGill protocol exercises, use mcgillHoldDuration (per-hold duration)
      // rather than actualDuration (total work time), because unlock thresholds
      // are based on single-hold capacity (e.g., 30s hold to unlock hollow body)
      if (set.mcgillHoldDuration !== undefined) {
        bestDuration = Math.max(bestDuration ?? 0, set.mcgillHoldDuration);
      } else if (set.actualDuration !== undefined) {
        bestDuration = Math.max(bestDuration ?? 0, set.actualDuration);
      }
    }
  }

  if (bestReps === undefined && bestDuration === undefined) {
    return null;
  }

  return { reps: bestReps, duration: bestDuration };
}

/**
 * Get the best performance for an exercise within a SINGLE workout only
 * Used for checking if a specific workout crossed a threshold
 */
export function getWorkoutPerformance(
  exerciseId: string,
  workout: WorkoutHistoryEntry
): { reps?: number; duration?: number } | null {
  const exercise = workout.exercises.find(ex => ex.exerciseId === exerciseId);
  if (!exercise) return null;

  let bestReps: number | undefined;
  let bestDuration: number | undefined;

  for (const set of exercise.completedSets) {
    if (set.actualReps !== undefined) {
      bestReps = Math.max(bestReps ?? 0, set.actualReps);
    }
    // For McGill protocol exercises, use mcgillHoldDuration (per-hold duration)
    if (set.mcgillHoldDuration !== undefined) {
      bestDuration = Math.max(bestDuration ?? 0, set.mcgillHoldDuration);
    } else if (set.actualDuration !== undefined) {
      bestDuration = Math.max(bestDuration ?? 0, set.actualDuration);
    }
  }

  if (bestReps === undefined && bestDuration === undefined) {
    return null;
  }

  return { reps: bestReps, duration: bestDuration };
}
