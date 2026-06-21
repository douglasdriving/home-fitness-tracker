import { CalibrationData, StrengthLevels } from '../types/user';
import { getExerciseById } from '../data/exerciseData';
import { MuscleGroup } from '../types/exercise';
import { IntensityRating } from '../types/workout';

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
    upperBody: 0,
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
      // For timed: inverse of estimation formula (strength / 10) * heaviness * 6
      // Solving for strength: strength = duration / (heaviness * 0.6)
      // Or equivalently: (duration / heaviness) * (10 / 6)
      rawScore = (calibExercise.achievedDuration / heavinessScore) * (10 / 6);
    }

    // No cap on strength level - allow infinite growth
    strengthLevels[muscleGroup] = Math.round(rawScore);
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
 * Calculate progression for next workout (legacy - without feedback)
 * Increases by 5-10% based on performance
 *
 * @param lastPerformance - Previous reps or duration achieved
 * @param exerciseType - 'reps' or 'timed'
 * @returns New target value
 * @deprecated Use calculateProgressionWithFeedback instead
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
 * Intensity feedback adjustment multipliers
 * Based on user's rating of exercise difficulty:
 * - 1 (Way too easy): +20% increase
 * - 2 (A bit too easy): +10% increase
 * - 3 (Just right): +5% increase (gentle progression)
 * - 4 (A bit too hard): -10% decrease
 * - 5 (Way too hard): -20% decrease
 */
const INTENSITY_ADJUSTMENTS: Record<IntensityRating, number> = {
  1: 0.20,   // Way too easy: +20%
  2: 0.10,   // A bit too easy: +10%
  3: 0.05,   // Just right: +5%
  4: -0.10,  // A bit too hard: -10%
  5: -0.20,  // Way too hard: -20%
};

/**
 * Calculate progression based on intensity feedback
 * Adjusts next workout targets based on user's difficulty rating
 *
 * @param lastPerformance - Previous reps or duration
 * @param exerciseType - 'reps' or 'timed'
 * @param intensityFeedback - User's difficulty rating (1-5), defaults to 3 (just right)
 * @returns New target value
 */
export function calculateProgressionWithFeedback(
  lastPerformance: number,
  exerciseType: 'reps' | 'timed',
  intensityFeedback: IntensityRating = 3
): number {
  const adjustmentPercent = INTENSITY_ADJUSTMENTS[intensityFeedback];
  const adjustment = lastPerformance * adjustmentPercent;

  if (exerciseType === 'reps') {
    // For reps exercises
    const newValue = lastPerformance + adjustment;

    // Ensure minimum change based on feedback direction
    if (adjustmentPercent > 0) {
      // Increasing: minimum +1 rep
      return Math.max(lastPerformance + 1, Math.round(newValue));
    } else if (adjustmentPercent < 0) {
      // Decreasing: minimum -1 rep, but never below 5 reps
      return Math.max(5, Math.min(lastPerformance - 1, Math.round(newValue)));
    }
    // Rating 3 with 5%: could stay same or increase by 1
    return Math.max(lastPerformance, Math.round(newValue));
  } else {
    // For timed exercises (in seconds)
    const newValue = lastPerformance + adjustment;

    // Round to nearest 5 seconds
    const rounded = Math.round(newValue / 5) * 5;
    const lastRounded = Math.round(lastPerformance / 5) * 5;

    if (adjustmentPercent > 0) {
      // Increasing: minimum +5 seconds from the rounded last value
      return Math.max(lastRounded + 5, rounded);
    } else if (adjustmentPercent < 0) {
      // Decreasing: minimum -5 seconds from the rounded last value, but never below 10 seconds
      return Math.max(10, Math.min(lastRounded - 5, rounded));
    }
    // Rating 3: could stay same or increase slightly
    return Math.max(lastRounded, rounded);
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

      // Update strength level (no cap - allow infinite growth)
      updated[muscleGroup] = Math.round(updated[muscleGroup] + strengthIncrease);
    });
  });

  return updated;
}

/**
 * Convert a legacy single-hold timed duration to McGill protocol structure
 *
 * Algorithm: Divide legacy duration by 6 (total rounds in default [3+2+1]),
 * round to nearest 5s, clamp to [10, holdCeiling]
 *
 * @param lastDuration - Single-hold duration in seconds
 * @param holdCeiling - Per-hold ceiling in seconds (defaults to 30 for Side Plank)
 * @returns McGill protocol configuration with rounds and hold duration
 */
export function convertLegacyToMcgill(
  lastDuration: number,
  holdCeiling: number = 30
): { rounds: number[]; holdDuration: number } {
  // Divide by total rounds (3 + 2 + 1 = 6)
  const rawHoldDuration = lastDuration / 6;

  // Round to nearest 5s
  let holdDuration = Math.round(rawHoldDuration / 5) * 5;

  // Clamp to [10, holdCeiling]
  holdDuration = Math.max(10, Math.min(holdCeiling, holdDuration));

  return {
    rounds: [3, 2, 1],
    holdDuration,
  };
}

/**
 * Calculate McGill protocol progression based on intensity feedback
 *
 * Hybrid progression logic (ceiling-based):
 * - Feedback 1-2 (too easy): If holdDuration < holdCeiling, increase duration by 5s.
 *   If holdDuration >= holdCeiling, increase first set's round count by 1 (cap at 6).
 * - Feedback 3 (just right): If holdDuration < holdCeiling - 5, increase duration by 5s. Otherwise keep same.
 * - Feedback 4-5 (too hard): Decrease duration by 5s (floor 5s).
 *   If already at 5s, decrease first set's round count by 1 (floor 1).
 *
 * Once a single hold would exceed the per-exercise ceiling, progression adds a
 * rep (round) instead of more seconds — keeping form crisp on static holds.
 *
 * @param lastRounds - Array of round counts per set (e.g., [3, 2, 1])
 * @param lastHoldDuration - Hold duration in seconds per round
 * @param feedback - Intensity feedback rating (1-5)
 * @param holdCeiling - Per-hold ceiling in seconds (defaults to 30 for Side Plank)
 * @returns New McGill protocol configuration
 */
export function calculateMcgillProgression(
  lastRounds: number[],
  lastHoldDuration: number,
  feedback: IntensityRating,
  holdCeiling: number = 30
): { rounds: number[]; holdDuration: number } {
  const rounds = [...lastRounds]; // Copy to avoid mutation
  let holdDuration = lastHoldDuration;

  if (feedback === 1 || feedback === 2) {
    // Too easy
    if (holdDuration < holdCeiling) {
      holdDuration += 5;
    } else if (rounds[0] < 6) {
      rounds[0] += 1;
    } else {
      // Already at max rounds, continue increasing duration
      holdDuration += 5;
    }
  } else if (feedback === 3) {
    // Just right
    if (holdDuration < holdCeiling - 5) {
      holdDuration += 5;
    }
    // Otherwise keep same
  } else {
    // Too hard (4 or 5)
    if (holdDuration > 5) {
      holdDuration -= 5;
    } else if (rounds[0] > 1) {
      rounds[0] -= 1;
    }
    // Otherwise keep at minimum (can't go lower)
  }

  return { rounds, holdDuration };
}
