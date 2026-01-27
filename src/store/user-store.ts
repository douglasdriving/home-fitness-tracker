import { create } from 'zustand';
import { UserProfile, CalibrationData, StrengthLevels, ExerciseAchievements } from '../types/user';
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
  initializeChallengeState: (startingLevel: number) => void;
  completeChallenge: (challengeId: string, value: number) => void;
  updateChallengeLevel: (newLevel: number) => void;
  // Exercise achievement actions
  addUnlockedExercises: (exerciseIds: string[]) => void;
  addRetiredExercises: (exerciseIds: string[]) => void;
  restoreRetiredExercise: (exerciseId: string) => void;
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

  addUnlockedExercises: (exerciseIds: string[]) => {
    const profile = get().profile;
    if (!profile) return;

    const currentAchievements: ExerciseAchievements = profile.exerciseAchievements ?? {
      unlockedExercises: [],
      retiredExercises: [],
    };

    // Only add IDs that aren't already in the list
    const newUnlocks = exerciseIds.filter(
      id => !currentAchievements.unlockedExercises.includes(id)
    );

    if (newUnlocks.length === 0) return;

    const updatedProfile: UserProfile = {
      ...profile,
      exerciseAchievements: {
        ...currentAchievements,
        unlockedExercises: [...currentAchievements.unlockedExercises, ...newUnlocks],
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  addRetiredExercises: (exerciseIds: string[]) => {
    const profile = get().profile;
    if (!profile) return;

    const currentAchievements: ExerciseAchievements = profile.exerciseAchievements ?? {
      unlockedExercises: [],
      retiredExercises: [],
    };

    // Only add IDs that aren't already in the list
    const newRetirements = exerciseIds.filter(
      id => !currentAchievements.retiredExercises.includes(id)
    );

    if (newRetirements.length === 0) return;

    const updatedProfile: UserProfile = {
      ...profile,
      exerciseAchievements: {
        ...currentAchievements,
        retiredExercises: [...currentAchievements.retiredExercises, ...newRetirements],
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  restoreRetiredExercise: (exerciseId: string) => {
    const profile = get().profile;
    if (!profile || !profile.exerciseAchievements) return;

    const updatedRetired = profile.exerciseAchievements.retiredExercises.filter(
      id => id !== exerciseId
    );

    const updatedProfile: UserProfile = {
      ...profile,
      exerciseAchievements: {
        ...profile.exerciseAchievements,
        retiredExercises: updatedRetired,
      },
    };

    saveUserProfile(updatedProfile);
    set({ profile: updatedProfile });
  },
}));
