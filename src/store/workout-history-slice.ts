import { StateCreator } from 'zustand';
import { WorkoutHistoryEntry } from '../types/workout';
import { db } from '../db/db';
import { updateStrengthLevelsFromWorkout } from '../lib/progression-calculator';
import { calculateIntensityScore } from '../lib/intensity-calculator';
import { useUserStore } from './user-store';
import type { WorkoutStore } from './workout-store';

export interface WorkoutHistorySlice {
  workoutHistory: WorkoutHistoryEntry[];

  loadHistory: () => Promise<void>;
  deleteHistoryEntry: (historyId: string) => Promise<void>;
  updateHistoryEntry: (historyId: string, updatedEntry: WorkoutHistoryEntry) => Promise<void>;
  addManualWorkout: (workout: WorkoutHistoryEntry) => Promise<void>;
}

export const createWorkoutHistorySlice: StateCreator<
  WorkoutStore,
  [],
  [],
  WorkoutHistorySlice
> = (set) => ({
  workoutHistory: [],

  /**
   * Load workout history from database
   * Automatically calculates intensity scores for old workouts that don't have them (backwards compatibility)
   */
  loadHistory: async () => {
    try {
      const history = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      // Backwards compatibility: calculate intensity scores for workouts that don't have them
      let needsUpdate = false;
      const updatedHistory = history.map((entry) => {
        if (entry.intensityScore === undefined) {
          needsUpdate = true;
          const intensityScore = calculateIntensityScore(entry.exercises);
          return { ...entry, intensityScore };
        }
        return entry;
      });

      // Update database if any workouts were missing intensity scores
      if (needsUpdate) {
        for (const entry of updatedHistory) {
          if (entry.intensityScore !== undefined) {
            await db.history.put(entry);
          }
        }
      }

      set({ workoutHistory: updatedHistory });
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  },

  /**
   * Delete a workout history entry
   */
  deleteHistoryEntry: async (historyId: string) => {
    try {
      await db.history.delete(historyId);

      // Reload history to update the UI
      const history = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      set({ workoutHistory: history });
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      throw error;
    }
  },

  /**
   * Update a workout history entry
   */
  updateHistoryEntry: async (_historyId: string, updatedEntry: WorkoutHistoryEntry) => {
    try {
      // Ensure intensity score is calculated for the updated entry
      if (updatedEntry.intensityScore === undefined) {
        updatedEntry.intensityScore = calculateIntensityScore(updatedEntry.exercises);
      }

      // Get all history entries
      const allHistory = await db.history.toArray();

      // Replace the updated entry in the list
      const historyWithUpdate = allHistory.map((entry) =>
        entry.id === updatedEntry.id ? updatedEntry : entry
      );

      // Sort by date to determine chronological order
      const sortedHistory = historyWithUpdate.sort(
        (a, b) => a.completedDate - b.completedDate
      );

      // Reassign workout numbers based on chronological order
      sortedHistory.forEach((entry, index) => {
        entry.workoutNumber = index + 1;
      });

      // Update all entries in the database
      for (const entry of sortedHistory) {
        await db.history.put(entry);
      }

      // Update strength levels based on the updated workout performance
      const userProfile = useUserStore.getState().profile;
      if (userProfile && userProfile.strengthLevels) {
        const updatedStrengthLevels = updateStrengthLevelsFromWorkout(
          userProfile.strengthLevels,
          updatedEntry.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            muscleGroups: ex.muscleGroups,
            completedSets: ex.completedSets.map((set) => ({
              actualReps: set.actualReps,
              actualDuration: set.actualDuration,
            })),
          }))
        );

        // Update user profile with new strength levels
        useUserStore.getState().updateStrengthLevels(updatedStrengthLevels);
      }

      // Reload history to update the UI
      const history = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      set({ workoutHistory: history });
    } catch (error) {
      console.error('Failed to update history entry:', error);
      throw error;
    }
  },

  /**
   * Add a manual workout to history
   */
  addManualWorkout: async (workout: WorkoutHistoryEntry) => {
    try {
      // Ensure intensity score is calculated for the manual workout
      if (workout.intensityScore === undefined) {
        workout.intensityScore = calculateIntensityScore(workout.exercises);
      }

      // Get all history to determine the next workout number
      const allHistory = await db.history.toArray();

      // Assign workout number based on chronological order
      // Sort all workouts by date, find where this one fits
      const sortedHistory = [...allHistory, workout].sort(
        (a, b) => a.completedDate - b.completedDate
      );

      // Assign sequential workout numbers
      sortedHistory.forEach((entry, index) => {
        entry.workoutNumber = index + 1;
      });

      // Find our new workout in the sorted list
      const workoutToAdd = sortedHistory.find((entry) => entry.id === workout.id);

      if (!workoutToAdd) {
        throw new Error('Failed to add workout');
      }

      // Add the new workout
      await db.history.add(workoutToAdd);

      // Update all other workout numbers if necessary
      for (const entry of sortedHistory) {
        if (entry.id !== workout.id) {
          await db.history.put(entry);
        }
      }

      // Update strength levels based on the workout performance
      const userProfile = useUserStore.getState().profile;
      if (userProfile && userProfile.strengthLevels) {
        const updatedStrengthLevels = updateStrengthLevelsFromWorkout(
          userProfile.strengthLevels,
          workoutToAdd.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            muscleGroups: ex.muscleGroups,
            completedSets: ex.completedSets.map((set) => ({
              actualReps: set.actualReps,
              actualDuration: set.actualDuration,
            })),
          }))
        );

        // Update user profile with new strength levels
        useUserStore.getState().updateStrengthLevels(updatedStrengthLevels);
      }

      // Reload history to update the UI
      const history = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      set({ workoutHistory: history });
    } catch (error) {
      console.error('Failed to add manual workout:', error);
      throw error;
    }
  },
});
