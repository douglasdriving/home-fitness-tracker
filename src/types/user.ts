import { MuscleGroup } from './exercise';
import { UserChallengeState } from './challenge';

// Tracks exercise unlock and retirement achievements
export interface ExerciseAchievements {
  unlockedExercises: string[];   // IDs of exercises unlocked via achievements
  retiredExercises: string[];    // IDs of exercises auto-retired (mastered)
}

// Tracks post-workout meditation progress
export interface MeditationState {
  completionCount: number;
  currentDurationSeconds: number;
}

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
    autoShowMeditation?: boolean; // Auto-show meditation after stretching (default: true)
  };
  hasBackfilledStrengthData?: boolean; // Flag to track if strength history backfill has been completed
  hasMigratedShoulderTaps?: boolean; // Flag to track if plank shoulder taps migration has been completed
  weight?: number; // kg
  height?: number; // cm
  workoutFrequencyDays?: number; // Target frequency: work out every X days (default: 2, meaning max 1 day gap)
  challengeState?: UserChallengeState; // Challenge mode progress
  exerciseAchievements?: ExerciseAchievements; // Exercise unlock/retirement tracking
  meditationState?: MeditationState; // Post-workout meditation progress
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
  // upperBody is indexed by MuscleGroup like the others; it stays at its default
  // until the rotation follow-on issue actually selects/calibrates upper body work.
  upperBody: number;
  lastUpdated: number; // timestamp
}
