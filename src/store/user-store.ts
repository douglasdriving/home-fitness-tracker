import { create } from 'zustand';
import { UserProfile, CalibrationData, StrengthLevels } from '../types/user';
import {
  initializeUserProfile,
  saveUserProfile,
  updateStrengthLevels as updateStrengthLevelsUtil,
} from '../utils/userProfile';
import { calculateStrengthFromCalibration } from '../lib/progression-calculator';

interface UserStore {
  profile: UserProfile | null;
  isLoading: boolean;

  // Actions
  initializeUser: () => void;
  completeCalibration: (data: CalibrationData) => void;
  updateStrengthLevels: (levels: Partial<StrengthLevels>) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoading: true,

  initializeUser: () => {
    const profile = initializeUserProfile();
    set({ profile, isLoading: false });
  },

  completeCalibration: (data: CalibrationData) => {
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
  },

  updateStrengthLevels: (levels: Partial<StrengthLevels>) => {
    const profile = get().profile;
    if (!profile) return;

    const updatedProfile = updateStrengthLevelsUtil(profile, levels);
    set({ profile: updatedProfile });
  },
}));
