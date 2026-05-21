export type MuscleGroup = 'abs' | 'glutes' | 'lowerBack';
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

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  muscleGroups: MuscleGroup[];
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
}
