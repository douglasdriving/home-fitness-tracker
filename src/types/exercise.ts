export type MuscleGroup = 'abs' | 'glutes' | 'lowerBack' | 'upperBody';
export type Equipment = 'none' | 'elastic-band';
export type CountingMethod = 'total' | 'per-side';

// Unlock requirement: user must complete this threshold to unlock the exercise
export interface UnlockRequirement {
  exerciseId: string;    // Which exercise must be completed
  type: 'reps' | 'timed';
  value: number;         // e.g., 60 (seconds) or 50 (reps)
}

// Retirement threshold: when user exceeds this, the exercise is auto-retired
export interface RetirementThreshold {
  type: 'reps' | 'timed';
  value: number;         // e.g., 50 reps or 120 seconds
}

export interface McgillProtocolConfig {
  rounds: number[]; // Number of rounds per set (e.g., [3, 2, 1])
  holdDuration: number; // Default hold duration in seconds per round
  restBetweenRounds: number; // Rest duration in seconds between rounds within a set
  holdCeiling?: number; // Per-hold duration ceiling (seconds); once reached, progression adds rounds instead of seconds. Defaults to 30.
}

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  primaryMuscleGroup: MuscleGroup; // Main muscle group used for daily rotation selection
  muscleGroups: MuscleGroup[]; // All targeted muscle groups (primary + secondary)
  // Slot identity for the Upper Body rotation day (horizontal/vertical push/pull).
  // Only upper body exercises populate this; used by the generator's slot-based
  // selection (wired in the follow-on rotation issue).
  upperBodySlot?: 'horizontal-pull' | 'horizontal-push' | 'vertical-pull' | 'vertical-push';
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  source: string;
  heavinessScore: Record<MuscleGroup, number>;
  type: 'reps' | 'timed';
  defaultReps?: number;
  defaultDuration?: number; // in seconds
  equipment?: Equipment; // defaults to 'none' if not specified
  countingMethod?: CountingMethod; // defaults to 'total' if not specified
  unlockRequirement?: UnlockRequirement; // if set, exercise must be unlocked
  retirementThreshold?: RetirementThreshold; // if set, exercise can be auto-retired
  coachingTip?: string; // persistent coaching tip displayed during workout execution
  structure?: 'mcgill'; // Special structure for exercises using McGill protocol
  mcgillDefaults?: McgillProtocolConfig; // McGill protocol configuration
}
