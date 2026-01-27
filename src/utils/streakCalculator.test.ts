import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateStreak, getNextWorkoutMessage, StreakInfo } from './streakCalculator';
import { WorkoutHistoryEntry } from '../types/workout';

// Helper to create a workout entry at a specific date
const createWorkout = (date: Date, id: string = 'test'): WorkoutHistoryEntry => ({
  id,
  workoutId: id,
  workoutNumber: 1,
  completedDate: date.getTime(),
  totalDuration: 25,
  exercises: [],
});

// Helper to get the Monday of a specific week relative to a base date
const getMondayOfWeek = (weeksAgo: number, baseDate: Date = new Date()): Date => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff - (weeksAgo * 7));
  date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
  return date;
};

describe('streakCalculator', () => {
  // Use a fixed date for consistent tests
  const fixedNow = new Date('2026-01-27T12:00:00Z'); // Tuesday

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateStreak', () => {
    it('returns 0 streak for empty workout history', () => {
      const result = calculateStreak([]);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastWorkoutDate).toBeNull();
      expect(result.daysSinceLastWorkout).toBeNull();
      expect(result.workedOutThisWeek).toBe(false);
      expect(result.streakAtRisk).toBe(false);
    });

    it('returns 1 week streak when worked out this week', () => {
      const thisWeekMonday = getMondayOfWeek(0, fixedNow);
      const workouts = [createWorkout(thisWeekMonday, 'w1')];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(1);
      expect(result.workedOutThisWeek).toBe(true);
      expect(result.streakAtRisk).toBe(false);
    });

    it('returns 2 week streak for consecutive weeks', () => {
      const thisWeekMonday = getMondayOfWeek(0, fixedNow);
      const lastWeekMonday = getMondayOfWeek(1, fixedNow);
      const workouts = [
        createWorkout(thisWeekMonday, 'w1'),
        createWorkout(lastWeekMonday, 'w2'),
      ];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
      expect(result.workedOutThisWeek).toBe(true);
    });

    it('returns 3 week streak for 3 consecutive weeks', () => {
      const thisWeekMonday = getMondayOfWeek(0, fixedNow);
      const lastWeekMonday = getMondayOfWeek(1, fixedNow);
      const twoWeeksAgoMonday = getMondayOfWeek(2, fixedNow);
      const workouts = [
        createWorkout(thisWeekMonday, 'w1'),
        createWorkout(lastWeekMonday, 'w2'),
        createWorkout(twoWeeksAgoMonday, 'w3'),
      ];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it('breaks streak when a week is missed', () => {
      const thisWeekMonday = getMondayOfWeek(0, fixedNow);
      // Skip last week
      const twoWeeksAgoMonday = getMondayOfWeek(2, fixedNow);
      const workouts = [
        createWorkout(thisWeekMonday, 'w1'),
        createWorkout(twoWeeksAgoMonday, 'w2'),
      ];

      const result = calculateStreak(workouts);

      // Only this week counts since last week was missed
      expect(result.currentStreak).toBe(1);
    });

    it('counts multiple workouts in same week as 1 week', () => {
      const thisWeekMonday = getMondayOfWeek(0, fixedNow);
      const thisWeekTuesday = new Date(thisWeekMonday);
      thisWeekTuesday.setDate(thisWeekTuesday.getDate() + 1);
      const thisWeekWednesday = new Date(thisWeekMonday);
      thisWeekWednesday.setDate(thisWeekWednesday.getDate() + 2);

      const workouts = [
        createWorkout(thisWeekMonday, 'w1'),
        createWorkout(thisWeekTuesday, 'w2'),
        createWorkout(thisWeekWednesday, 'w3'),
      ];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(1);
    });

    it('shows streak at risk when worked out last week but not this week', () => {
      const lastWeekMonday = getMondayOfWeek(1, fixedNow);
      const workouts = [createWorkout(lastWeekMonday, 'w1')];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(1);
      expect(result.workedOutThisWeek).toBe(false);
      expect(result.streakAtRisk).toBe(true);
    });

    it('returns 0 streak when missed more than one week', () => {
      const threeWeeksAgoMonday = getMondayOfWeek(3, fixedNow);
      const workouts = [createWorkout(threeWeeksAgoMonday, 'w1')];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(0);
      expect(result.workedOutThisWeek).toBe(false);
      expect(result.streakAtRisk).toBe(false);
    });

    it('calculates longest streak separately from current streak', () => {
      // Old streak of 4 weeks (weeks 8, 7, 6, 5 ago)
      // Gap (weeks 4, 3, 2 ago - no workouts)
      // New streak of 2 weeks (last week and this week)
      const thisWeekMonday = getMondayOfWeek(0, fixedNow);
      const lastWeekMonday = getMondayOfWeek(1, fixedNow);
      const week5Ago = getMondayOfWeek(5, fixedNow);
      const week6Ago = getMondayOfWeek(6, fixedNow);
      const week7Ago = getMondayOfWeek(7, fixedNow);
      const week8Ago = getMondayOfWeek(8, fixedNow);

      const workouts = [
        createWorkout(thisWeekMonday, 'w1'),
        createWorkout(lastWeekMonday, 'w2'),
        createWorkout(week5Ago, 'w3'),
        createWorkout(week6Ago, 'w4'),
        createWorkout(week7Ago, 'w5'),
        createWorkout(week8Ago, 'w6'),
      ];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(4);
    });

    it('handles workouts on different days of the same week', () => {
      // Create workouts on Tuesday, Wednesday, Friday of this week
      const baseMonday = getMondayOfWeek(0, fixedNow);
      const tuesday = new Date(baseMonday);
      tuesday.setDate(tuesday.getDate() + 1);
      const wednesday = new Date(baseMonday);
      wednesday.setDate(wednesday.getDate() + 2);
      const friday = new Date(baseMonday);
      friday.setDate(friday.getDate() + 4);

      const workouts = [
        createWorkout(tuesday, 'w1'),
        createWorkout(wednesday, 'w2'),
        createWorkout(friday, 'w3'),
      ];

      const result = calculateStreak(workouts);

      expect(result.currentStreak).toBe(1);
      expect(result.workedOutThisWeek).toBe(true);
    });
  });

  describe('getNextWorkoutMessage', () => {
    it('returns "Start your first workout!" for no workouts', () => {
      const streakInfo: StreakInfo = {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        daysSinceLastWorkout: null,
        workedOutThisWeek: false,
        streakAtRisk: false,
      };

      expect(getNextWorkoutMessage(streakInfo)).toBe('Start your first workout!');
    });

    it('returns "Worked out this week!" when worked out this week', () => {
      const streakInfo: StreakInfo = {
        currentStreak: 1,
        longestStreak: 1,
        lastWorkoutDate: Date.now(),
        daysSinceLastWorkout: 0,
        workedOutThisWeek: true,
        streakAtRisk: false,
      };

      expect(getNextWorkoutMessage(streakInfo)).toBe('Worked out this week!');
    });

    it('returns "Work out this week to keep your streak!" when at risk', () => {
      const streakInfo: StreakInfo = {
        currentStreak: 1,
        longestStreak: 1,
        lastWorkoutDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
        daysSinceLastWorkout: 7,
        workedOutThisWeek: false,
        streakAtRisk: true,
      };

      expect(getNextWorkoutMessage(streakInfo)).toBe('Work out this week to keep your streak!');
    });

    it('returns "Start a new streak!" when streak is broken', () => {
      const streakInfo: StreakInfo = {
        currentStreak: 0,
        longestStreak: 5,
        lastWorkoutDate: Date.now() - 21 * 24 * 60 * 60 * 1000,
        daysSinceLastWorkout: 21,
        workedOutThisWeek: false,
        streakAtRisk: false,
      };

      expect(getNextWorkoutMessage(streakInfo)).toBe('Start a new streak!');
    });
  });
});
