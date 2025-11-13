import { MuscleGroup } from './exercise';

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
    currentStreak: number; // Current streak count
    longestStreak: number; // Best streak ever
    lastWorkoutDate?: number; // Timestamp of last completed workout
  };
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
