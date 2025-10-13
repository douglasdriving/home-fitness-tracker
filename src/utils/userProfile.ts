import { UserProfile, StrengthLevels } from '../types/user';

const USER_PROFILE_KEY = 'fitness-tracker-user-profile';

// Generate a unique user ID
export function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default strength levels for new users (conservative starting point)
// These levels will be adjusted after the first workout based on actual performance
const DEFAULT_STRENGTH_LEVEL = 25;

// Create a new user profile
export function createUserProfile(): UserProfile {
  const now = Date.now();
  return {
    userId: generateUserId(),
    createdDate: now,
    calibrationCompleted: true, // Skip calibration - use integrated approach
    strengthLevels: {
      abs: DEFAULT_STRENGTH_LEVEL,
      glutes: DEFAULT_STRENGTH_LEVEL,
      lowerBack: DEFAULT_STRENGTH_LEVEL,
      lastUpdated: now,
    },
  };
}

// Load user profile from localStorage
export function loadUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) return null;

    const profile = JSON.parse(stored) as UserProfile;
    return profile;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

// Save user profile to localStorage
export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

// Update strength levels
export function updateStrengthLevels(
  profile: UserProfile,
  newLevels: Partial<StrengthLevels>
): UserProfile {
  const updatedProfile: UserProfile = {
    ...profile,
    strengthLevels: {
      ...profile.strengthLevels,
      ...newLevels,
      lastUpdated: Date.now(),
    },
  };

  saveUserProfile(updatedProfile);
  return updatedProfile;
}

// Initialize user profile if it doesn't exist
export function initializeUserProfile(): UserProfile {
  let profile = loadUserProfile();

  if (!profile) {
    profile = createUserProfile();
    saveUserProfile(profile);
  }

  return profile;
}
