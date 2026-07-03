import { WorkoutHistoryEntry, IntensityRating } from '../types/workout';

/**
 * Last performance + intensity feedback for a specific exercise, as returned by
 * findLastPerformanceWithFeedback. Shared with the set-builder and both generators.
 */
export interface LastPerformanceWithFeedback {
  performance: number;
  feedback: IntensityRating | undefined;
  mcgillRounds?: number[];
  mcgillHoldDuration?: number;
  ladderRung?: number;
}

/**
 * Get a map of exercise IDs to their last used workout number
 * Used to prioritize exercises that haven't been used recently
 *
 * NOTE: workoutHistory should be ordered newest-first (reverse chronological)
 * We only update the map if the exercise hasn't been seen yet, so we capture
 * the MOST RECENT usage of each exercise
 */
export function getExerciseLastUsed(workoutHistory: WorkoutHistoryEntry[]): Map<string, number> {
  const lastUsedMap = new Map<string, number>();

  // Process history from newest to oldest
  // Only set the workout number the first time we see each exercise
  // This gives us the MOST RECENT usage
  workoutHistory.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (!lastUsedMap.has(exercise.exerciseId)) {
        lastUsedMap.set(exercise.exerciseId, workout.workoutNumber);
      }
    });
  });

  return lastUsedMap;
}

/**
 * Find the last performance AND intensity feedback for a specific exercise
 * Returns both the performance value and the feedback rating from the most recent workout
 */
export function findLastPerformanceWithFeedback(
  exerciseId: string,
  workoutHistory: WorkoutHistoryEntry[]
): LastPerformanceWithFeedback | null {
  console.log(`[FIND LAST PERF] Searching for exercise: ${exerciseId}`);
  console.log(`[FIND LAST PERF] Total history entries: ${workoutHistory.length}`);

  // History is already ordered newest-first by the database query
  // Loop forward through the array to check newest workouts first
  for (let i = 0; i < workoutHistory.length; i++) {
    const historyEntry = workoutHistory[i];
    const exercise = historyEntry.exercises.find((ex) => ex.exerciseId === exerciseId);

    if (exercise && exercise.completedSets.length > 0) {
      // Use first set performance (before fatigue) for progressive overload
      const firstSet = exercise.completedSets[0];
      const performance = firstSet.actualReps || firstSet.actualDuration || 0;
      const feedback = exercise.intensityFeedback;

      // Check if this is a McGill protocol exercise with rounds data
      const hasMcgillData = exercise.completedSets.some(set =>
        set.mcgillRounds !== undefined && set.mcgillHoldDuration !== undefined
      );

      if (hasMcgillData) {
        // Collect rounds from all sets (they may differ)
        const mcgillRounds = exercise.completedSets
          .map(set => set.mcgillRounds)
          .filter((rounds): rounds is number => rounds !== undefined);
        const mcgillHoldDuration = firstSet.mcgillHoldDuration;

        console.log(`[FIND LAST PERF] Found McGill in workout #${historyEntry.workoutNumber}: rounds [${mcgillRounds.join(',')}] × ${mcgillHoldDuration}s, feedback: ${feedback ?? 'none'}`);

        return { performance, feedback, mcgillRounds, mcgillHoldDuration };
      }

      console.log(`[FIND LAST PERF] Found in workout #${historyEntry.workoutNumber}: ${performance} ${firstSet.actualReps ? 'reps' : 'seconds'}, feedback: ${feedback ?? 'none'}`);

      return { performance, feedback, ladderRung: exercise.ladderRung };
    }
  }

  console.log(`[FIND LAST PERF] No history found for this exercise`);
  return null;
}
