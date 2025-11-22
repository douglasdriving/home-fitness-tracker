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
  workoutFrequencyDays?: number; // Target frequency: work out every X days (default: 2, meaning max 1 day gap)
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
