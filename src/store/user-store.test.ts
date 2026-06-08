import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUserStore } from './user-store';
import * as userProfileUtils from '../utils/userProfile';

// Mock the userProfile utilities
vi.mock('../utils/userProfile', () => ({
  initializeUserProfile: vi.fn(() => ({
    userId: 'test-user',
    createdDate: Date.now(),
    calibrationCompleted: false,
    strengthLevels: {
      abs: 1,
      glutes: 1,
      lowerBack: 1,
      lastUpdated: Date.now(),
    },
  })),
  saveUserProfile: vi.fn(),
  updateStrengthLevels: vi.fn((profile, levels) => ({
    ...profile,
    strengthLevels: { ...profile.strengthLevels, ...levels },
  })),
}));

// Mock the database
vi.mock('../db/db', () => ({
  db: {
    strengthHistory: {
      add: vi.fn(),
    },
  },
}));

describe('useUserStore - meditation actions', () => {
  beforeEach(() => {
    // Reset store state between tests
    const store = useUserStore.getState();
    store.initializeUser();
    vi.clearAllMocks();
  });

  describe('completeMeditation', () => {
    it('should initialize meditation state with defaults if not present', () => {
      const store = useUserStore.getState();
      store.completeMeditation();

      const profile = useUserStore.getState().profile;
      expect(profile?.meditationState).toEqual({
        completionCount: 1,
        currentDurationSeconds: 60, // Still 60s for first completion (0->1, stays in 0-4 range)
      });
    });

    it('should increment completion count', () => {
      const store = useUserStore.getState();

      // Complete meditation 3 times
      store.completeMeditation();
      store.completeMeditation();
      store.completeMeditation();

      const profile = useUserStore.getState().profile;
      expect(profile?.meditationState?.completionCount).toBe(3);
    });

    it('should increase duration after 5 completions', () => {
      const store = useUserStore.getState();

      // Complete 5 meditations to reach the next tier
      for (let i = 0; i < 5; i++) {
        store.completeMeditation();
      }

      const profile = useUserStore.getState().profile;
      expect(profile?.meditationState?.completionCount).toBe(5);
      expect(profile?.meditationState?.currentDurationSeconds).toBe(120); // 2 minutes
    });

    it('should progress through duration ladder correctly', () => {
      const store = useUserStore.getState();

      // Test progression: 0->60s, 5->120s, 10->180s, 15->300s, 20->420s, 25->600s, 30->900s
      const expectedDurations = [
        { count: 1, duration: 60 },
        { count: 5, duration: 120 },
        { count: 10, duration: 180 },
        { count: 15, duration: 300 },
        { count: 20, duration: 420 },
        { count: 25, duration: 600 },
        { count: 30, duration: 900 },
      ];

      for (const { count, duration } of expectedDurations) {
        // Reset and complete to target count
        useUserStore.setState({
          profile: {
            ...store.profile!,
            meditationState: { completionCount: count - 1, currentDurationSeconds: 60 },
          },
        });

        store.completeMeditation();

        const profile = useUserStore.getState().profile;
        expect(profile?.meditationState?.currentDurationSeconds).toBe(duration);
      }
    });

    it('should cap duration at 900 seconds (15 minutes)', () => {
      const store = useUserStore.getState();

      // Set to 100 completions
      useUserStore.setState({
        profile: {
          ...store.profile!,
          meditationState: { completionCount: 100, currentDurationSeconds: 900 },
        },
      });

      store.completeMeditation();

      const profile = useUserStore.getState().profile;
      expect(profile?.meditationState?.currentDurationSeconds).toBe(900);
      expect(profile?.meditationState?.completionCount).toBe(101);
    });

    it('should save profile after completing meditation', () => {
      const store = useUserStore.getState();
      store.completeMeditation();

      expect(userProfileUtils.saveUserProfile).toHaveBeenCalled();
    });
  });

  describe('updatePreferences - meditation', () => {
    it('should update autoShowMeditation preference', () => {
      const store = useUserStore.getState();

      store.updatePreferences({ autoShowMeditation: false });

      const profile = useUserStore.getState().profile;
      expect(profile?.preferences?.autoShowMeditation).toBe(false);
    });

    it('should preserve existing preferences when updating meditation preference', () => {
      const store = useUserStore.getState();

      // Set stretching preference first
      store.updatePreferences({ autoShowStretching: false });
      // Then set meditation preference
      store.updatePreferences({ autoShowMeditation: false });

      const profile = useUserStore.getState().profile;
      expect(profile?.preferences?.autoShowStretching).toBe(false);
      expect(profile?.preferences?.autoShowMeditation).toBe(false);
    });
  });
});
