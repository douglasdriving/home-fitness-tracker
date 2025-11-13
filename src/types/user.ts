import { MuscleGroup } from './exercise';
import { UserChallengeState } from './challenge';

export interface UserProfile {
  userId: string;
  createdDate: number; // timestamp
  calibrationCompleted: boolean;
  calibrationData?: CalibrationData;
  strengthLevels: StrengthLevels;
  equipment?: {
    hasElasticBands?: boolean;
  };
  excludedExercises?: string[]; // Array of exercise IDs to exclude from workouts
  preferences?: {
    autoShowStretching?: boolean; // Auto-show stretching after workouts (default: true)
  };
  hasBackfilledStrengthData?: boolean; // Flag to track if strength history backfill has been completed
  weight?: number; // kg
  height?: number; // cm
  workoutFrequencyGoal?: number; // Target number of workouts per week (default: 3)
  streakData?: {
    currentStreakWeeks: number; // Current streak in weeks (consecutive weeks meeting goal)
    longestStreakWeeks: number; // Best streak ever in weeks
    thisWeekWorkouts: number; // Workouts completed this week
    lastWeekStart: number; // Timestamp of start of current week being tracked
    lastWeekMeetGoal: boolean; // Did last completed week meet the goal?
  };
  challengeState?: UserChallengeState; // Challenge mode progress
}

export interface CalibrationData {
  calibrationDate: number; // timestamp
  exercises: CalibrationExercise[];
}

export interface CalibrationExercise {
  exerciseId: string;
  muscleGroup: MuscleGroup;
  achievedReps?: number;
  achievedDuration?: number;
}

export interface StrengthLevels {
  abs: number;
  glutes: number;
  lowerBack: number;
  lastUpdated: number; // timestamp
}
