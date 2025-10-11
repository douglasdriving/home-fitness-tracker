import { CalibrationData, StrengthLevels } from '../types/user';
import { getExerciseById } from '../data/exerciseData';
import { MuscleGroup } from '../types/exercise';

/**
 * Calculate strength levels from calibration data
 *
 * Strategy:
 * - For each muscle group, find the calibration exercise
 * - Normalize the achieved reps/duration by the exercise's heaviness score
 * - Convert to a strength score (0-100 scale)
 * - Higher score = stronger in that muscle group
 */
export function calculateStrengthFromCalibration(
  calibrationData: CalibrationData
): StrengthLevels {
  const now = Date.now();

  const strengthLevels: StrengthLevels = {
    abs: 0,
    glutes: 0,
    lowerBack: 0,
    lastUpdated: now,
  };

  calibrationData.exercises.forEach((calibExercise) => {
    const exercise = getExerciseById(calibExercise.exerciseId);
    if (!exercise) return;

    const muscleGroup = calibExercise.muscleGroup;
    const heavinessScore = exercise.heavinessScore[muscleGroup];

    let rawScore = 0;

    if (exercise.type === 'reps' && calibExercise.achievedReps) {
      // For reps: achieved reps divided by heaviness, multiplied by 10
      rawScore = (calibExercise.achievedReps / heavinessScore) * 10;
    } else if (exercise.type === 'timed' && calibExercise.achievedDuration) {
      // For timed: achieved duration in seconds divided by heaviness, divided by 6 (normalize to ~10 scale)
      rawScore = (calibExercise.achievedDuration / heavinessScore) / 6;
    }

    // Cap strength level at 100
    strengthLevels[muscleGroup] = Math.min(100, Math.round(rawScore));
  });

  return strengthLevels;
}

/**
 * Estimate capacity for an exercise based on user's strength level
 *
 * @param strengthLevel - User's strength level for the muscle group (0-100)
 * @param heavinessScore - Exercise difficulty score (1-10)
 * @param exerciseType - 'reps' or 'timed'
 * @returns Estimated reps or duration
 */
export function estimateExerciseCapacity(
  strengthLevel: number,
  heavinessScore: number,
  exerciseType: 'reps' | 'timed'
): number {
  if (exerciseType === 'reps') {
    // Formula: (strengthLevel / 10) * heavinessScore
    // Example: strength 50, heaviness 5 = 25 reps
    const estimate = (strengthLevel / 10) * heavinessScore;
    return Math.max(5, Math.round(estimate)); // Minimum 5 reps
  } else {
    // For timed exercises (in seconds)
    // Formula: (strengthLevel / 10) * heavinessScore * 6
    // Example: strength 50, heaviness 5 = 150 seconds (2.5 minutes)
    const estimate = (strengthLevel / 10) * heavinessScore * 6;
    return Math.max(10, Math.round(estimate / 5) * 5); // Minimum 10 seconds, round to nearest 5
  }
}

/**
 * Calculate progression for next workout
 * Increases by 5-10% based on performance
 *
 * @param lastPerformance - Previous reps or duration achieved
 * @param exerciseType - 'reps' or 'timed'
 * @returns New target value
 */
export function calculateProgression(
  lastPerformance: number,
  exerciseType: 'reps' | 'timed'
): number {
  // Increase by 7.5% (average of 5-10%)
  const increase = lastPerformance * 0.075;

  if (exerciseType === 'reps') {
    // Round to nearest whole number, minimum increase of 1
    return Math.max(lastPerformance + 1, Math.round(lastPerformance + increase));
  } else {
    // For timed, round to nearest 5 seconds, minimum increase of 5
    const newValue = lastPerformance + increase;
    return Math.max(lastPerformance + 5, Math.round(newValue / 5) * 5);
  }
}

/**
 * Update strength levels based on completed workout
 * Analyzes performance and adjusts strength scores accordingly
 *
 * @param currentLevels - Current strength levels
 * @param completedExercises - Exercises from completed workout
 * @returns Updated strength levels
 */
export function updateStrengthLevelsFromWorkout(
  currentLevels: StrengthLevels,
  completedExercises: Array<{
    exerciseId: string;
    muscleGroups: MuscleGroup[];
    completedSets: Array<{
      actualReps?: number;
      actualDuration?: number;
    }>;
  }>
): StrengthLevels {
  const updated = { ...currentLevels, lastUpdated: Date.now() };

  completedExercises.forEach((completedEx) => {
    const exercise = getExerciseById(completedEx.exerciseId);
    if (!exercise) return;

    // Calculate average performance
    const totalSets = completedEx.completedSets.length;
    if (totalSets === 0) return;

    let avgPerformance = 0;
    if (exercise.type === 'reps') {
      const totalReps = completedEx.completedSets.reduce(
        (sum, set) => sum + (set.actualReps || 0),
        0
      );
      avgPerformance = totalReps / totalSets;
    } else {
      const totalDuration = completedEx.completedSets.reduce(
        (sum, set) => sum + (set.actualDuration || 0),
        0
      );
      avgPerformance = totalDuration / totalSets;
    }

    // Update strength for each muscle group this exercise targets
    completedEx.muscleGroups.forEach((muscleGroup) => {
      const heavinessScore = exercise.heavinessScore[muscleGroup];
      if (!heavinessScore) return;

      // Calculate strength increase based on performance
      let strengthIncrease = 0;
      if (exercise.type === 'reps') {
        strengthIncrease = (avgPerformance / heavinessScore) * 0.5;
      } else {
        strengthIncrease = (avgPerformance / heavinessScore) / 12;
      }

      // Update strength level (capped at 100)
      updated[muscleGroup] = Math.min(
        100,
        Math.round(updated[muscleGroup] + strengthIncrease)
      );
    });
  });

  return updated;
}
