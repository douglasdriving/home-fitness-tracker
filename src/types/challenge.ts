import { MuscleGroup } from './exercise';

export type ChallengeType = 'timed' | 'reps' | 'reps-per-side';

export type ChallengeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Challenge {
  id: string;
  name: string;
  level: ChallengeLevel;
  type: ChallengeType;
  targetValue: number; // seconds for timed, reps for reps-based
  description: string;
  muscleGroups: MuscleGroup[];
  videoUrl?: string;
  tips: string[];
  // For calibration - how this challenge maps to strength level
  strengthMultiplier: number; // How much completing this adds to your strength
}

export interface ChallengeProgress {
  challengeId: string;
  completed: boolean;
  completedDate?: number;
  bestValue?: number; // Best performance (reps or seconds)
  attempts: number;
}

export interface UserChallengeState {
  currentLevel: number; // Highest unlocked level (1-7)
  completedChallenges: ChallengeProgress[];
  totalChallengesCompleted: number;
}

export const LEVEL_NAMES: Record<ChallengeLevel, string> = {
  1: 'Foundation',
  2: 'Builder',
  3: 'Warrior',
  4: 'Champion',
  5: 'Master',
  6: 'Elite',
  7: 'Legend',
};

export const LEVEL_DESCRIPTIONS: Record<ChallengeLevel, string> = {
  1: 'Build your core foundation with essential stability',
  2: 'Develop real strength through progressive challenges',
  3: 'Master dynamic movements and core control',
  4: 'Achieve advanced isometric holds and power',
  5: 'Push beyond limits with complex movements',
  6: 'Elite-level core strength and coordination',
  7: 'Legendary feats of core mastery',
};

export const LEVEL_EMOJIS: Record<ChallengeLevel, string> = {
  1: '🌱',
  2: '💪',
  3: '⚔️',
  4: '🏆',
  5: '👑',
  6: '⭐',
  7: '🔥',
};
