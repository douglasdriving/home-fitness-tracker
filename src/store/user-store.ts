import { create } from 'zustand';
import { UserProfile, CalibrationData, StrengthLevels } from '../types/user';
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
}));
