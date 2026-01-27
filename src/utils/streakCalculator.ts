/**
 * Streak calculation utilities
 * Calculates workout streaks based on consecutive weeks with at least one workout
 */

import { WorkoutHistoryEntry } from '../types/workout';

export interface StreakInfo {
  currentStreak: number; // Number of consecutive weeks with at least one workout
  longestStreak: number; // Best week streak ever
  lastWorkoutDate: number | null; // Timestamp of last completed workout
  daysSinceLastWorkout: number | null; // Days since last workout
  workedOutThisWeek: boolean; // True if user has worked out in the current week
  streakAtRisk: boolean; // True if worked out last week but not yet this week
}

/**
 * Get the start of the week (Monday 00:00:00) for a given timestamp
 */
const getWeekStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  const day = date.getDay();
  // Convert Sunday (0) to 7 so Monday becomes the start
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

/**
 * Get unique weeks that have workouts, sorted newest first
 */
const getWeeksWithWorkouts = (workoutHistory: WorkoutHistoryEntry[]): number[] => {
  const weekStarts = new Set<number>();

  for (const workout of workoutHistory) {
    weekStarts.add(getWeekStart(workout.completedDate));
  }

  return Array.from(weekStarts).sort((a, b) => b - a);
};

/**
 * Calculate streak information from workout history
 * Counts consecutive weeks with at least one workout
 * @param workoutHistory - Array of completed workouts
 * @returns Streak information
 */
export const calculateStreak = (
  workoutHistory: WorkoutHistoryEntry[]
): StreakInfo => {
  if (workoutHistory.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      daysSinceLastWorkout: null,
      workedOutThisWeek: false,
      streakAtRisk: false,
    };
  }

  // Sort workouts by completion date (newest first)
  const sortedWorkouts = [...workoutHistory].sort(
    (a, b) => b.completedDate - a.completedDate
  );

  const lastWorkoutDate = sortedWorkouts[0].completedDate;
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceLastWorkout = Math.floor((now - lastWorkoutDate) / msPerDay);

  const currentWeekStart = getWeekStart(now);
  const weeksWithWorkouts = getWeeksWithWorkouts(workoutHistory);

  // Check if there's a workout this week
  const workedOutThisWeek = weeksWithWorkouts.length > 0 && weeksWithWorkouts[0] === currentWeekStart;

  // Calculate current streak (consecutive weeks)
  let currentStreak = 0;
  const msPerWeek = 7 * msPerDay;

  // Start from current week if worked out, otherwise from last week
  let expectedWeekStart = workedOutThisWeek ? currentWeekStart : currentWeekStart - msPerWeek;

  for (const weekStart of weeksWithWorkouts) {
    if (weekStart === expectedWeekStart) {
      currentStreak++;
      expectedWeekStart -= msPerWeek;
    } else if (weekStart < expectedWeekStart) {
      // Missed a week, streak is broken
      break;
    }
    // If weekStart > expectedWeekStart, skip (already counted or future)
  }

  // If user hasn't worked out this week and didn't work out last week either, streak is 0
  if (!workedOutThisWeek) {
    const lastWeekStart = currentWeekStart - msPerWeek;
    const hasLastWeekWorkout = weeksWithWorkouts.includes(lastWeekStart);
    if (!hasLastWeekWorkout) {
      currentStreak = 0;
    }
  }

  // Calculate longest streak ever
  let longestStreak = 0;
  let tempStreak = 0;
  let prevWeekStart: number | null = null;

  // Sort weeks oldest to newest for longest streak calculation
  const sortedWeeks = [...weeksWithWorkouts].sort((a, b) => a - b);

  for (const weekStart of sortedWeeks) {
    if (prevWeekStart === null || weekStart === prevWeekStart + msPerWeek) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    prevWeekStart = weekStart;
  }

  // Streak is at risk if user worked out last week but not yet this week
  const lastWeekStart = currentWeekStart - msPerWeek;
  const hasLastWeekWorkout = weeksWithWorkouts.includes(lastWeekStart);
  const streakAtRisk = !workedOutThisWeek && hasLastWeekWorkout && currentStreak > 0;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastWorkoutDate,
    daysSinceLastWorkout,
    workedOutThisWeek,
    streakAtRisk,
  };
};

/**
 * Get a friendly message about the streak status
 */
export const getNextWorkoutMessage = (streakInfo: StreakInfo): string => {
  if (streakInfo.daysSinceLastWorkout === null) {
    return 'Start your first workout!';
  }

  if (streakInfo.workedOutThisWeek) {
    return 'Worked out this week!';
  }

  if (streakInfo.streakAtRisk) {
    return 'Work out this week to keep your streak!';
  }

  return 'Start a new streak!';
};
