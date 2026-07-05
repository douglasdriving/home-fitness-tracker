import { StateCreator } from 'zustand';
import { Workout, WorkoutHistoryEntry, Set, IntensityRating } from '../types/workout';
import { db } from '../db/db';
import { generateWorkout, generateDailyRotationWorkout, getNextDailyRotationGroup } from '../lib/workout-generator';
import { updateStrengthLevelsFromWorkout } from '../lib/progression-calculator';
import { calculateIntensityScore } from '../lib/intensity-calculator';
import { useUserStore } from './user-store';
import type { WorkoutStore } from './workout-store';

export interface WorkoutSessionSlice {
  currentWorkout: Workout | null;
  isLoading: boolean;

  loadWorkouts: () => Promise<void>;
  generateNewWorkout: (timeConstraintMinutes?: number) => Promise<void>;
  generateDailyRotationWorkout: () => Promise<void>;
  startWorkout: (workoutId: string) => Promise<void>;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<Set>) => Promise<void>;
  updateWorkoutPosition: (exerciseIndex: number, setIndex: number, phase: 'exercise' | 'rest' | 'exercise-rest') => Promise<void>;
  completeWorkout: (intensityFeedbackMap?: Record<string, IntensityRating>) => Promise<WorkoutHistoryEntry>;
  discardWorkout: () => Promise<void>;
}

export const createWorkoutSessionSlice: StateCreator<
  WorkoutStore,
  [],
  [],
  WorkoutSessionSlice
> = (set, get) => ({
  currentWorkout: null,
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
  generateNewWorkout: async (timeConstraintMinutes?: number) => {
    const userProfile = useUserStore.getState().profile;

    if (!userProfile || !userProfile.strengthLevels) {
      throw new Error('User profile or strength levels not found');
    }

    try {
      // Delete any existing pending or in-progress workouts to prevent duplicate workout numbers
      const existingWorkouts = await db.workouts
        .where('status')
        .anyOf(['pending', 'in-progress'])
        .toArray();

      for (const workout of existingWorkouts) {
        await db.workouts.delete(workout.id);
      }

      // Get recent COMPLETED workouts to avoid repeating exercises
      // Use history instead of workouts table to only consider completed workouts
      const recentHistory = await db.history
        .orderBy('completedDate')
        .reverse()
        .limit(2)
        .toArray();

      const recentExerciseIds: string[] = [];
      recentHistory.forEach(historyEntry => {
        historyEntry.exercises.forEach(ex => {
          if (!recentExerciseIds.includes(ex.exerciseId)) {
            recentExerciseIds.push(ex.exerciseId);
          }
        });
      });

      // Get workout history for progressive overload
      const workoutHistory = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      // Get next workout number based on history (completed workouts)
      // This ensures workout numbers continue sequentially even after seeding data
      const workoutNumber = workoutHistory.length + 1;

      // Generate new workout with progressive overload
      const newWorkout = generateWorkout({
        workoutNumber,
        strengthLevels: userProfile.strengthLevels,
        recentExerciseIds,
        workoutHistory,
        excludedExerciseIds: userProfile.excludedExercises || [],
        timeConstraintMinutes,
        exerciseAchievements: userProfile.exerciseAchievements || { unlockedExercises: [], retiredExercises: [] },
      });

      // Set workoutMode to full-body for the existing workout generator
      newWorkout.workoutMode = 'full-body';

      // Save to database
      await db.workouts.add(newWorkout);

      set({ currentWorkout: newWorkout });
    } catch (error) {
      console.error('Failed to generate workout:', error);
      throw error;
    }
  },

  /**
   * Generate a new daily rotation workout (shorter, muscle-group-specific session)
   */
  generateDailyRotationWorkout: async () => {
    const userProfile = useUserStore.getState().profile;

    if (!userProfile || !userProfile.strengthLevels) {
      throw new Error('User profile or strength levels not found');
    }

    try {
      // Delete any existing pending or in-progress workouts (from both modes)
      const existingWorkouts = await db.workouts
        .where('status')
        .anyOf(['pending', 'in-progress'])
        .toArray();

      for (const workout of existingWorkouts) {
        await db.workouts.delete(workout.id);
      }

      // Get workout history for progressive overload and rotation tracking
      const workoutHistory = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      // Determine next muscle group in rotation
      const targetMuscleGroup = getNextDailyRotationGroup(workoutHistory);

      // Get next workout number based on history (completed workouts)
      const workoutNumber = workoutHistory.length + 1;

      // Generate new daily rotation workout
      const newWorkout = generateDailyRotationWorkout({
        workoutNumber,
        strengthLevels: userProfile.strengthLevels,
        targetMuscleGroup,
        workoutHistory,
        excludedExerciseIds: userProfile.excludedExercises || [],
        exerciseAchievements: userProfile.exerciseAchievements || { unlockedExercises: [], retiredExercises: [] },
      });

      // Save to database
      await db.workouts.add(newWorkout);

      set({ currentWorkout: newWorkout });
    } catch (error) {
      console.error('Failed to generate daily rotation workout:', error);
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
      // Only set startedDate when transitioning from 'pending' to 'in-progress'
      // If already in-progress (e.g., resuming after app restart), preserve the original startedDate
      startedDate: workout.status === 'in-progress' ? workout.startedDate : Date.now(),
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
   * @param intensityFeedbackMap - Optional map of exercise ID to intensity rating
   */
  completeWorkout: async (intensityFeedbackMap?: Record<string, IntensityRating>): Promise<WorkoutHistoryEntry> => {
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
    // Also attach intensity feedback per exercise if provided (keyed by exercise ID)
    const completedExercises = currentWorkout.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      muscleGroups: ex.muscleGroups,
      completedSets: ex.sets
        .filter((set) => set.completed && (set.actualReps || set.actualDuration || (set.mcgillRounds && set.mcgillHoldDuration)))
        .map((set) => ({
          setNumber: set.setNumber,
          actualReps: set.actualReps,
          actualDuration: set.actualDuration,
          equipmentUsed: set.equipmentUsed,
          mcgillRounds: set.mcgillRounds,
          mcgillHoldDuration: set.mcgillHoldDuration,
        })),
      // Attach intensity feedback if provided (lookup by exercise ID)
      ...(intensityFeedbackMap && intensityFeedbackMap[ex.exerciseId] !== undefined
        ? { intensityFeedback: intensityFeedbackMap[ex.exerciseId] }
        : {}),
      // Preserve the ladder rung the workout was generated at (ladder exercises only)
      ...(ex.ladderRung !== undefined ? { ladderRung: ex.ladderRung } : {}),
    }));

    // Calculate intensity score for this workout
    const intensityScore = calculateIntensityScore(completedExercises);

    const historyEntry: WorkoutHistoryEntry = {
      id: `history-${completedDate}-${Math.random().toString(36).substr(2, 9)}`,
      workoutId: currentWorkout.id,
      workoutNumber: currentWorkout.workoutNumber,
      completedDate,
      totalDuration,
      exercises: completedExercises,
      intensityScore,
      workoutMode: currentWorkout.workoutMode,
      targetMuscleGroup: currentWorkout.targetMuscleGroup,
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

      // Save strength level snapshot for progress tracking
      await db.strengthHistory.add({
        timestamp: completedDate,
        workoutNumber: currentWorkout.workoutNumber,
        abs: updatedStrengthLevels.abs,
        glutes: updatedStrengthLevels.glutes,
        lowerBack: updatedStrengthLevels.lowerBack,
      });
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
   * Discard the current pending/in-progress workout
   */
  discardWorkout: async () => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    try {
      await db.workouts.delete(currentWorkout.id);
      set({ currentWorkout: null });
    } catch (error) {
      console.error('Failed to discard workout:', error);
      throw error;
    }
  },
});
