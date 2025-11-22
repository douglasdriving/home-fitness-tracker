/**
 * Streak calculation utilities
 * Calculates workout streaks based on consecutive workouts within frequency goal
 */

import { WorkoutHistoryEntry } from '../types/workout';

export interface StreakInfo {
  currentStreak: number; // Number of consecutive workouts in current streak
  longestStreak: number; // Best streak ever
  lastWorkoutDate: number | null; // Timestamp of last completed workout
  daysSinceLastWorkout: number | null; // Days since last workout
  streakAtRisk: boolean; // True if next workout needs to be soon to maintain streak
}

/**
 * Calculate days between two timestamps
 */
const daysBetween = (date1: number, date2: number): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(Math.abs(date2 - date1) / msPerDay);
};

/**
 * Calculate streak information from workout history
 * @param workoutHistory - Array of completed workouts
 * @param frequencyDays - Target frequency (work out every X days)
 * @returns Streak information
 */
export const calculateStreak = (
  workoutHistory: WorkoutHistoryEntry[],
  frequencyDays: number = 2
): StreakInfo => {
  // Sort workouts by completion date (newest first)
  const sortedWorkouts = [...workoutHistory].sort(
    (a, b) => b.completedDate - a.completedDate
  );

  if (sortedWorkouts.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      daysSinceLastWorkout: null,
      streakAtRisk: false,
    };
  }

  const lastWorkoutDate = sortedWorkouts[0].completedDate;
  const daysSinceLastWorkout = daysBetween(lastWorkoutDate, Date.now());
  const maxGapDays = frequencyDays - 1; // e.g., "every 2 days" = max 1 day gap

  // Calculate current streak
  let currentStreak = 1; // Start with the most recent workout

  for (let i = 1; i < sortedWorkouts.length; i++) {
    const currentWorkout = sortedWorkouts[i - 1];
    const previousWorkout = sortedWorkouts[i];
    const gap = daysBetween(previousWorkout.completedDate, currentWorkout.completedDate);

    if (gap <= maxGapDays) {
      currentStreak++;
    } else {
      // Gap too large, streak is broken
      break;
    }
  }

  // If too many days have passed since last workout, current streak is broken
  if (daysSinceLastWorkout > maxGapDays) {
    currentStreak = 0;
  }

  // Calculate longest streak ever
  let longestStreak = currentStreak;
  let tempStreak = 1;

  for (let i = 1; i < sortedWorkouts.length; i++) {
    const currentWorkout = sortedWorkouts[i - 1];
    const previousWorkout = sortedWorkouts[i];
    const gap = daysBetween(previousWorkout.completedDate, currentWorkout.completedDate);

    if (gap <= maxGapDays) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Check if streak is at risk (close to the deadline)
  const streakAtRisk = currentStreak > 0 && daysSinceLastWorkout >= maxGapDays - 1;

  return {
    currentStreak,
    longestStreak,
    lastWorkoutDate,
    daysSinceLastWorkout,
    streakAtRisk,
  };
};

/**
 * Get a friendly message about when to work out next
 */
export const getNextWorkoutMessage = (streakInfo: StreakInfo, frequencyDays: number = 2): string => {
  if (streakInfo.daysSinceLastWorkout === null) {
    return 'Start your first workout!';
  }

  if (streakInfo.daysSinceLastWorkout === 0) {
    return 'Workout completed today!';
  }

  if (streakInfo.currentStreak === 0) {
    return 'Start a new streak!';
  }

  const maxGapDays = frequencyDays - 1;
  const daysUntilBreak = maxGapDays - streakInfo.daysSinceLastWorkout;

  if (daysUntilBreak <= 0) {
    return 'Streak broken - start a new one!';
  }

  if (daysUntilBreak === 1) {
    return 'Work out today to keep your streak!';
  }

  return `${daysUntilBreak} days to keep your streak`;
};
