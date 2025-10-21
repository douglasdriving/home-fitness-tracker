import { create } from 'zustand';
import { Workout, WorkoutHistoryEntry, Set } from '../types/workout';
import { db } from '../db/db';
import { generateWorkout, getRecentExerciseIds } from '../lib/workout-generator';
import { updateStrengthLevelsFromWorkout } from '../lib/progression-calculator';
import { useUserStore } from './user-store';

interface WorkoutStore {
  currentWorkout: Workout | null;
  workoutHistory: WorkoutHistoryEntry[];
  isLoading: boolean;

  // Actions
  loadWorkouts: () => Promise<void>;
  generateNewWorkout: () => Promise<void>;
  startWorkout: (workoutId: string) => Promise<void>;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<Set>) => Promise<void>;
  updateWorkoutPosition: (exerciseIndex: number, setIndex: number, phase: 'exercise' | 'rest' | 'exercise-rest') => Promise<void>;
  completeWorkout: () => Promise<WorkoutHistoryEntry>;
  loadHistory: () => Promise<void>;
  deleteHistoryEntry: (historyId: string) => Promise<void>;
  updateHistoryEntry: (historyId: string, updatedEntry: WorkoutHistoryEntry) => Promise<void>;
  addManualWorkout: (workout: WorkoutHistoryEntry) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  currentWorkout: null,
  workoutHistory: [],
  isLoading: false,

  /**
   * Load current workout from database
   */
  loadWorkouts: async () => {
    set({ isLoading: true });

    try {
      // Find the most recent pending or in-progress workout (NOT completed)
      const workouts = await db.workouts
        .where('status')
        .anyOf(['pending', 'in-progress'])
        .reverse()
        .sortBy('generatedDate');

      const currentWorkout = workouts[0] || null;

      set({ currentWorkout, isLoading: false });
    } catch (error) {
      console.error('Failed to load workouts:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Generate a new workout based on user's strength levels
   */
  generateNewWorkout: async () => {
    const userProfile = useUserStore.getState().profile;

    if (!userProfile || !userProfile.strengthLevels) {
      throw new Error('User profile or strength levels not found');
    }

    try {
      // Get recent workouts to avoid repeating exercises
      const recentWorkouts = await db.workouts
        .orderBy('generatedDate')
        .reverse()
        .limit(2)
        .toArray();

      const recentExerciseIds = getRecentExerciseIds(recentWorkouts);

      // Get workout history for progressive overload
      const workoutHistory = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      // Get next workout number
      const allWorkouts = await db.workouts.toArray();
      const workoutNumber = allWorkouts.length + 1;

      // Generate new workout with progressive overload
      const newWorkout = generateWorkout({
        workoutNumber,
        strengthLevels: userProfile.strengthLevels,
        recentExerciseIds,
        workoutHistory,
        hasElasticBands: userProfile.equipment?.hasElasticBands || false,
      });

      // Save to database
      await db.workouts.add(newWorkout);

      set({ currentWorkout: newWorkout });
    } catch (error) {
      console.error('Failed to generate workout:', error);
      throw error;
    }
  },

  /**
   * Start a workout (mark as in-progress)
   */
  startWorkout: async (workoutId: string) => {
    const workout = await db.workouts.get(workoutId);

    if (!workout) {
      throw new Error('Workout not found');
    }

    const updatedWorkout: Workout = {
      ...workout,
      status: 'in-progress',
      startedDate: Date.now(), // Track when workout actually started
    };

    await db.workouts.put(updatedWorkout);
    set({ currentWorkout: updatedWorkout });
  },

  /**
   * Update a specific set in the current workout
   */
  updateSet: async (exerciseIndex: number, setIndex: number, updates: Partial<Set>) => {
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No current workout');
    }

    const updatedExercises = [...currentWorkout.exercises];
    const updatedSets = [...updatedExercises[exerciseIndex].sets];

    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      ...updates,
    };

    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      sets: updatedSets,
    };

    const updatedWorkout: Workout = {
      ...currentWorkout,
      exercises: updatedExercises,
    };

    await db.workouts.put(updatedWorkout);
    set({ currentWorkout: updatedWorkout });
  },

  /**
   * Complete the current workout and save to history
   * Returns the history entry for the completion screen
   */
  completeWorkout: async (): Promise<WorkoutHistoryEntry> => {
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No current workout to complete');
    }

    const completedDate = Date.now();

    // Calculate actual duration from when workout was started (not generated)
    const startTime = currentWorkout.startedDate || currentWorkout.generatedDate;
    const totalDuration = Math.round((completedDate - startTime) / 60000); // minutes

    // Mark workout as completed in database
    const updatedWorkout: Workout = {
      ...currentWorkout,
      status: 'completed',
      completedDate,
      totalDuration,
    };

    await db.workouts.put(updatedWorkout);

    // Create history entry - only include completed sets with actual values
    const historyEntry: WorkoutHistoryEntry = {
      id: `history-${completedDate}-${Math.random().toString(36).substr(2, 9)}`,
      workoutId: currentWorkout.id,
      workoutNumber: currentWorkout.workoutNumber,
      completedDate,
      totalDuration,
      exercises: currentWorkout.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        muscleGroups: ex.muscleGroups,
        completedSets: ex.sets
          .filter((set) => set.completed && (set.actualReps || set.actualDuration))
          .map((set) => ({
            setNumber: set.setNumber,
            actualReps: set.actualReps,
            actualDuration: set.actualDuration,
          })),
      })),
    };

    await db.history.add(historyEntry);

    // Update user strength levels based on workout performance
    const userProfile = useUserStore.getState().profile;
    if (userProfile && userProfile.strengthLevels) {
      const updatedStrengthLevels = updateStrengthLevelsFromWorkout(
        userProfile.strengthLevels,
        currentWorkout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          muscleGroups: ex.muscleGroups,
          completedSets: ex.sets
            .filter((set) => set.completed && (set.actualReps || set.actualDuration))
            .map((set) => ({
              actualReps: set.actualReps,
              actualDuration: set.actualDuration,
            })),
        }))
      );

      // Update user profile with new strength levels
      useUserStore.getState().updateStrengthLevels(updatedStrengthLevels);
    }

    // Clear current workout from state
    set({ currentWorkout: null });

    return historyEntry;
  },

  /**
   * Update workout position for persistence when navigating away
   */
  updateWorkoutPosition: async (exerciseIndex: number, setIndex: number, phase: 'exercise' | 'rest' | 'exercise-rest') => {
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No current workout');
    }

    const updatedWorkout: Workout = {
      ...currentWorkout,
      currentExerciseIndex: exerciseIndex,
      currentSetIndex: setIndex,
      currentPhase: phase,
    };

    await db.workouts.put(updatedWorkout);
    set({ currentWorkout: updatedWorkout });
  },

  /**
   * Load workout history from database
   */
  loadHistory: async () => {
    try {
      const history = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      set({ workoutHistory: history });
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
}));
