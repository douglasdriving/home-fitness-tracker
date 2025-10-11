import { create } from 'zustand';
import { Workout, WorkoutHistoryEntry, Set } from '../types/workout';
import { db } from '../db/db';
import { generateWorkout, getRecentExerciseIds } from '../lib/workout-generator';
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
  completeWorkout: () => Promise<void>;
  loadHistory: () => Promise<void>;
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
      // Find the most recent pending or in-progress workout
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

      // Get next workout number
      const allWorkouts = await db.workouts.toArray();
      const workoutNumber = allWorkouts.length + 1;

      // Generate new workout
      const newWorkout = generateWorkout({
        workoutNumber,
        strengthLevels: userProfile.strengthLevels,
        recentExerciseIds,
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
   */
  completeWorkout: async () => {
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No current workout to complete');
    }

    const completedDate = Date.now();

    // Calculate actual duration
    const startTime = currentWorkout.generatedDate;
    const totalDuration = Math.round((completedDate - startTime) / 60000); // minutes

    // Mark workout as completed
    const updatedWorkout: Workout = {
      ...currentWorkout,
      status: 'completed',
      completedDate,
    };

    await db.workouts.put(updatedWorkout);

    // Create history entry
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
          .filter((set) => set.completed)
          .map((set) => ({
            setNumber: set.setNumber,
            actualReps: set.actualReps,
            actualDuration: set.actualDuration,
          })),
      })),
    };

    await db.history.add(historyEntry);

    // Update user strength levels based on workout performance
    // We'll implement this in Phase 6 with progressive overload

    set({ currentWorkout: null });
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
}));
