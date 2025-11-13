import { create } from 'zustand';
import { UserProfile, CalibrationData, StrengthLevels } from '../types/user';
import { ChallengeProgress } from '../types/challenge';
import {
  initializeUserProfile,
  saveUserProfile,
  updateStrengthLevels as updateStrengthLevelsUtil,
} from '../utils/userProfile';
import { calculateStrengthFromCalibration } from '../lib/progression-calculator';
import { db } from '../db/db';

interface UserStore {
  profile: UserProfile | null;
  isLoading: boolean;

  // Actions
  initializeUser: () => void;
  completeCalibration: (data: CalibrationData) => void;
  updateStrengthLevels: (levels: Partial<StrengthLevels>) => void;
  updateEquipment: (equipment: { hasElasticBands?: boolean }) => void;
  updatePreferences: (preferences: { autoShowStretching?: boolean }) => void;
  excludeExercise: (exerciseId: string) => void;
  includeExercise: (exerciseId: string) => void;
  setBackfillCompleted: () => void;
  updateWorkoutFrequencyGoal: (workoutsPerWeek: number) => void;
  updateStreakData: (completedWorkoutDate: number) => void;
  initializeChallengeState: (startingLevel: number) => void;
  completeChallenge: (challengeId: string, value: number) => void;
  updateChallengeLevel: (newLevel: number) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoading: true,

  initializeUser: () => {
    const profile = initializeUserProfile();
    set({ profile, isLoading: false });
  },

  completeCalibration: async (data: CalibrationData) => {
    const profile = get().profile;
    if (!profile) return;

    // Calculate strength levels from calibration data
    const strengthLevels = calculateStrengthFromCalibration(data);

    const updatedProfile: UserProfile = {
      ...profile,
      calibrationCompleted: true,
      calibrationData: data,
      strengthLevels,
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });

    // Save initial strength level snapshot for progress tracking
    await db.strengthHistory.add({
      timestamp: data.calibrationDate,
      workoutNumber: 0, // 0 indicates calibration baseline
      abs: strengthLevels.abs,
      glutes: strengthLevels.glutes,
      lowerBack: strengthLevels.lowerBack,
    });
  },

  updateStrengthLevels: (levels: Partial<StrengthLevels>) => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile = updateStrengthLevelsUtil(profile, levels);
    set({ profile: updatedProfile });
  },

  updateEquipment: (equipment: { hasElasticBands?: boolean }) => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      equipment: {
        ...profile.equipment,
        ...equipment,
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  updatePreferences: (preferences: { autoShowStretching?: boolean }) => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      preferences: {
        ...profile.preferences,
        ...preferences,
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  excludeExercise: (exerciseId: string) => {
    const profile = get().profile;
    if (!profile) return;

    const currentExcluded = profile.excludedExercises || [];
    if (currentExcluded.includes(exerciseId)) return; // Already excluded

    const updatedProfile: UserProfile = {
      ...profile,
      excludedExercises: [...currentExcluded, exerciseId],
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  includeExercise: (exerciseId: string) => {
    const profile = get().profile;
    if (!profile) return;

    const currentExcluded = profile.excludedExercises || [];
    const updatedExcluded = currentExcluded.filter((id) => id !== exerciseId);

    const updatedProfile: UserProfile = {
      ...profile,
      excludedExercises: updatedExcluded,
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  setBackfillCompleted: () => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      hasBackfilledStrengthData: true,
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  updateWorkoutFrequencyGoal: (workoutsPerWeek: number) => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      workoutFrequencyGoal: workoutsPerWeek,
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  updateStreakData: (completedWorkoutDate: number) => {
    const profile = get().profile;
    if (!profile) return;

    const frequencyGoal = profile.workoutFrequencyGoal || 3; // Default to 3x/week
    const currentStreak = profile.streakData?.currentStreak || 0;
    const longestStreak = profile.streakData?.longestStreak || 0;
    const lastWorkoutDate = profile.streakData?.lastWorkoutDate;

    // Calculate days between workouts
    const daysPerWorkout = 7 / frequencyGoal;
    const allowedGapDays = Math.ceil(daysPerWorkout * 1.5); // Allow 50% grace period

    let newCurrentStreak = 1;

    if (lastWorkoutDate) {
      const daysSinceLastWorkout = (completedWorkoutDate - lastWorkoutDate) / (1000 * 60 * 60 * 24);

      // Continue streak if within allowed gap
      if (daysSinceLastWorkout <= allowedGapDays) {
        newCurrentStreak = currentStreak + 1;
      }
    }

    const newLongestStreak = Math.max(longestStreak, newCurrentStreak);

    const updatedProfile: UserProfile = {
      ...profile,
      streakData: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastWorkoutDate: completedWorkoutDate,
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  initializeChallengeState: (startingLevel: number) => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      challengeState: {
        currentLevel: startingLevel,
        completedChallenges: [],
        totalChallengesCompleted: 0,
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  completeChallenge: (challengeId: string, value: number) => {
    const profile = get().profile;
    if (!profile || !profile.challengeState) return;

    const existingProgress = profile.challengeState.completedChallenges.find(
      (p) => p.challengeId === challengeId
    );

    let updatedCompletedChallenges: ChallengeProgress[];

    if (existingProgress) {
      // Update existing progress
      updatedCompletedChallenges = profile.challengeState.completedChallenges.map((p) =>
        p.challengeId === challengeId
          ? {
              ...p,
              completed: true,
              completedDate: Date.now(),
              bestValue: Math.max(p.bestValue || 0, value),
              attempts: p.attempts + 1,
            }
          : p
      );
    } else {
      // Add new progress
      updatedCompletedChallenges = [
        ...profile.challengeState.completedChallenges,
        {
          challengeId,
          completed: true,
          completedDate: Date.now(),
          bestValue: value,
          attempts: 1,
        },
      ];
    }

    const totalCompleted = updatedCompletedChallenges.filter((p) => p.completed).length;

    const updatedProfile: UserProfile = {
      ...profile,
      challengeState: {
        ...profile.challengeState,
        completedChallenges: updatedCompletedChallenges,
        totalChallengesCompleted: totalCompleted,
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  updateChallengeLevel: (newLevel: number) => {
    const profile = get().profile;
    if (!profile || !profile.challengeState) return;

    const updatedProfile: UserProfile = {
      ...profile,
      challengeState: {
        ...profile.challengeState,
        currentLevel: Math.max(profile.challengeState.currentLevel, newLevel),
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },
}));
