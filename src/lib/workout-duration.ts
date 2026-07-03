import { WorkoutExercise } from '../types/workout';
import { getExerciseById } from '../data/exerciseData';

/**
 * Calculate estimated workout duration in minutes
 * Includes preparation time, setup time, and buffer for pauses
 */
export function calculateEstimatedDuration(exercises: WorkoutExercise[]): number {
  let totalSeconds = 0;

  exercises.forEach((exercise) => {
    // Add setup/preparation time at the start of each exercise (10 seconds)
    totalSeconds += 10;

    const exerciseData = getExerciseById(exercise.exerciseId);
    const isMcgill = exerciseData?.structure === 'mcgill';
    const isPerSide = exerciseData?.countingMethod === 'per-side';
    const restBetweenRounds = exerciseData?.mcgillDefaults?.restBetweenRounds ?? 5;

    exercise.sets.forEach((set) => {
      // Add 5 seconds setup time before each set (get into position)
      totalSeconds += 5;

      // Add exercise time
      if (set.mcgillRounds && set.mcgillHoldDuration && isMcgill) {
        // McGill protocol per set: (holdDuration × rounds) + rest × (rounds - 1)
        const holdTimePerSide = set.mcgillHoldDuration * set.mcgillRounds;
        const restTimePerSide = restBetweenRounds * Math.max(0, set.mcgillRounds - 1);
        const timePerSide = holdTimePerSide + restTimePerSide;

        if (isPerSide) {
          // Per-side (e.g. Side Plank): both sides plus a transition between them
          const transitionTime = 10; // Seconds between sides
          totalSeconds += (timePerSide * 2) + transitionTime;
        } else {
          // Single-sided static hold (e.g. Plank): one continuous run, no transition
          totalSeconds += timePerSide;
        }
      } else if (set.targetReps) {
        // Assume 3 seconds per rep
        totalSeconds += (set.targetReps * 3);
      } else if (set.targetDuration) {
        totalSeconds += set.targetDuration;
      }

      // Add rest time between sets (except for last set)
      totalSeconds += exercise.restTime;
    });

    // Remove one rest time per exercise (no rest after last set)
    totalSeconds -= exercise.restTime;

    // Add 45 seconds transition time between exercises (was 30)
    // This accounts for checking instructions, catching breath, etc.
    totalSeconds += 45;
  });

  // Remove last transition
  totalSeconds -= 45;

  // Add 15% buffer for pauses, water breaks, form resets, etc.
  totalSeconds = Math.round(totalSeconds * 1.15);

  // Convert to minutes and round up
  return Math.ceil(totalSeconds / 60);
}
