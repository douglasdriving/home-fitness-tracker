import { CompletedExercise } from '../types/workout';
import { getExerciseById } from '../data/exerciseData';

/**
 * Calculate workout intensity score (0-100) based on:
 * - Total volume (reps/duration × sets)
 * - Exercise difficulty (heaviness scores)
 * - Number of exercises and muscle groups worked
 *
 * Higher scores indicate more intense workouts
 */
export function calculateIntensityScore(exercises: CompletedExercise[]): number {
  if (exercises.length === 0) return 0;

  let totalScore = 0;
  const muscleGroupsWorked = new Set<string>();

  for (const exercise of exercises) {
    const exerciseData = getExerciseById(exercise.exerciseId);
    if (!exerciseData) continue;

    // Track muscle groups for bonus points
    exercise.muscleGroups.forEach(mg => muscleGroupsWorked.add(mg));

    // Calculate volume score for this exercise
    let volumeScore = 0;
    for (const set of exercise.completedSets) {
      if (set.actualReps) {
        // For rep-based exercises: reps contribute to volume
        volumeScore += set.actualReps;
      } else if (set.actualDuration) {
        // For timed exercises: each 10 seconds = 1 rep equivalent
        volumeScore += set.actualDuration / 10;
      }
    }

    // Get average heaviness score across all muscle groups this exercise targets
    const heavinessScores = exercise.muscleGroups.map(
      mg => exerciseData.heavinessScore[mg] || 5
    );
    const avgHeaviness = heavinessScores.reduce((a, b) => a + b, 0) / heavinessScores.length;

    // Exercise score = volume × difficulty factor
    // Normalize heaviness (1-10) to a multiplier (0.5 - 1.5)
    const difficultyMultiplier = 0.5 + (avgHeaviness / 10);
    const exerciseScore = volumeScore * difficultyMultiplier;

    totalScore += exerciseScore;
  }

  // Bonus for working multiple muscle groups (up to 10 points)
  const muscleGroupBonus = Math.min(muscleGroupsWorked.size * 3, 10);

  // Bonus for more exercises (up to 10 points)
  const exerciseCountBonus = Math.min(exercises.length * 2, 10);

  // Final score with bonuses
  const rawScore = totalScore + muscleGroupBonus + exerciseCountBonus;

  // Normalize to 0-100 scale
  // Typical workout might score 60-120 raw, so divide by 1.5 to get ~40-80 range
  // Add some scaling to make scores more intuitive
  const normalizedScore = Math.min(Math.round(rawScore / 1.5), 100);

  return normalizedScore;
}
