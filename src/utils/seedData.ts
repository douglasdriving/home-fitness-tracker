/**
 * Development seed data utility for populating workout history.
 * Creates realistic sample workouts spanning multiple weeks with progressive improvements.
 *
 * IMPORTANT: Only uses base (unlocked) exercises to simulate realistic progression.
 * Final workout leaves user just below unlock thresholds so the next workout triggers unlocks.
 */

import { db } from '../db/db';
import { WorkoutHistoryEntry, CompletedExercise } from '../types/workout';
import { MuscleGroup, Exercise } from '../types/exercise';
import { allExercises } from '../data/exerciseData';
import { calculateIntensityScore } from '../lib/intensity-calculator';

// Only use exercises that don't require unlocking (base exercises)
const baseExercises = allExercises.filter(ex => !ex.unlockRequirement);

// Target values for final workout - just below unlock thresholds
// These are the values we want to reach by workout 15
// Next workout with 7.5% increase will cross thresholds and trigger unlocks
const FINAL_WORKOUT_TARGETS: Record<string, number> = {
  // Abs exercises (unlock thresholds in parentheses)
  'crunches-001': 38,          // Flutter Kicks unlocks at 40 reps
  'toe-touches-001': 28,       // Hollow Body Hold unlocks at 30 reps
  'plank-001': 58,             // Plank Shoulder Taps unlocks at 60s
  'dead-bug-001': 23,          // Ab Wheel Rollout unlocks at 25 reps
  'reverse-crunches-001': 28,  // Bicycle Crunches unlocks at 30 reps
  'side-plank-001': 28,        // Side Plank Dips unlocks at 30s (per side)

  // Glutes exercises
  'glute-bridge-001': 33,      // Single-Leg Glute Bridge unlocks at 35 reps
  'donkey-kicks-001': 28,      // Fire Hydrant Circles unlocks at 30 reps
  'fire-hydrants-001': 28,     // Hip Thrust unlocks at 30 reps
  'frog-pumps-001': 33,        // Curtsy Lunge unlocks at 35 reps
  'band-clamshells-001': 28,   // Band Monster Walk unlocks at 30 reps
  'band-lateral-walk-001': 28, // Banded Hip Thrust unlocks at 30 reps

  // Lower back exercises
  'bird-dog-001': 23,          // Single-Leg Romanian Deadlift unlocks at 25 reps
  'good-morning-001': 28,      // Back Extension Hold and Superman unlock at 30 reps
  'superman-001': 55,          // (no unlock, but good to have progression)
};

/**
 * Generates seed workout history data for development and testing.
 * Creates 15 workouts over 6 weeks with realistic progression.
 * Workouts are numbered 1-15 with dates from oldest (1) to newest (15).
 *
 * Final workout ends just below unlock thresholds so the user's next
 * workout will trigger unlocks when they do 7.5% more.
 */
export async function seedWorkoutHistory(): Promise<void> {
  // Check if history already exists
  const existingHistory = await db.history.toArray();
  if (existingHistory.length > 0) {
    const confirmed = confirm(
      `This will DELETE all existing workout history (${existingHistory.length} workouts) and replace it with seed data. Are you sure?`
    );
    if (!confirmed) {
      throw new Error('Seed operation cancelled by user');
    }
    // Clear existing history
    await db.history.clear();
  }

  // Also clear achievements since we're starting fresh
  // We need to reset the user profile's achievements
  const { saveUserProfile, initializeUserProfile } = await import('./userProfile');
  const currentProfile = initializeUserProfile();
  if (currentProfile) {
    const updatedProfile = {
      ...currentProfile,
      exerciseAchievements: {
        unlockedExercises: [],
        retiredExercises: [],
      },
    };
    saveUserProfile(updatedProfile);
  }

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const workouts: WorkoutHistoryEntry[] = [];

  // Helper to get base exercises for each muscle group (no locked exercises)
  const getExercisesForMuscleGroup = (group: MuscleGroup, exclude: string[] = []): Exercise[] => {
    return baseExercises.filter(
      (ex) => ex.muscleGroups.includes(group) && !exclude.includes(ex.id)
    );
  };

  // Track which exercises were used recently to avoid repetition
  const recentExercises: string[] = [];
  const maxRecentTracking = 6; // Track last 6 exercises per muscle group

  // Track performance per exercise for proper progression
  const exercisePerformanceHistory: Map<string, number[]> = new Map();

  // Generate 15 workouts over 6 weeks (roughly 2-3 per week)
  for (let i = 0; i < 15; i++) {
    // Workout schedule: Week 1: Days 1,4,6 | Week 2: Days 2,5,7 | etc.
    // Days are calculated backwards from now: workout 1 is oldest, workout 15 is newest
    const weekNumber = Math.floor(i / 3);
    const workoutInWeek = i % 3;
    const daysAgo = (6 * 7) - (weekNumber * 7 + [1, 4, 6][workoutInWeek]); // Start 6 weeks ago, work forward
    const completedDate = now - daysAgo * oneDay;

    // Select 3-4 exercises covering all muscle groups
    const exercises: CompletedExercise[] = [];
    const muscleGroupsNeeded: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];

    // Add one exercise per muscle group
    for (const muscleGroup of muscleGroupsNeeded) {
      const availableExercises = getExercisesForMuscleGroup(muscleGroup, recentExercises);
      if (availableExercises.length === 0) {
        // If we've used all exercises, reset the recent list for this group
        const allForGroup = getExercisesForMuscleGroup(muscleGroup);
        availableExercises.push(...allForGroup);
      }

      const exercise = availableExercises[Math.floor(Math.random() * availableExercises.length)];
      recentExercises.push(exercise.id);
      if (recentExercises.length > maxRecentTracking) {
        recentExercises.shift();
      }

      // Calculate progressive performance targeting final values just below unlock thresholds
      const previousPerformances = exercisePerformanceHistory.get(exercise.id) || [];

      // Get target final value for this exercise
      const finalTarget = FINAL_WORKOUT_TARGETS[exercise.id];
      const defaultFinal = exercise.type === 'reps' ? 25 : 50;
      const targetFinalValue = finalTarget ?? defaultFinal;

      // Calculate starting value (workout 0) and interpolate to reach target by workout 14
      // Start at ~50% of target value
      const startValue = Math.round(targetFinalValue * 0.5);

      let basePerformance: number;
      if (previousPerformances.length > 0) {
        // Use last performance + small increase toward target
        const lastPerformance = previousPerformances[previousPerformances.length - 1];
        // Calculate increment to reach target by workout 15
        const remainingWorkouts = 14 - i;
        if (remainingWorkouts > 0) {
          const increment = (targetFinalValue - lastPerformance) / remainingWorkouts;
          basePerformance = Math.round(lastPerformance + Math.max(1, increment));
        } else {
          // Final workout - use exact target
          basePerformance = targetFinalValue;
        }
      } else {
        // First time doing this exercise
        // Calculate where we should be based on workout number
        const progress = i / 14; // 0 to 1 over 15 workouts
        basePerformance = Math.round(startValue + (targetFinalValue - startValue) * progress);
      }

      // Ensure minimum increases and don't exceed target
      if (previousPerformances.length > 0) {
        const lastPerformance = previousPerformances[previousPerformances.length - 1];
        if (exercise.type === 'reps') {
          basePerformance = Math.max(basePerformance, lastPerformance + 1); // Min +1 rep
        } else {
          basePerformance = Math.max(basePerformance, lastPerformance + 2); // Min +2 seconds
        }
      }

      // On final workout, use exact target value
      if (i === 14) {
        basePerformance = targetFinalValue;
      }

      let completedSets: { setNumber: number; actualReps?: number; actualDuration?: number }[];

      if (exercise.type === 'reps') {
        // Reps exercise: 3-4 sets with consistent performance
        // (Progressive overload uses first set, so keep all sets at same level for realistic data)
        const setCount = 3 + (i % 2); // Alternate between 3 and 4 sets

        completedSets = Array.from({ length: setCount }, (_, setIdx) => ({
          setNumber: setIdx + 1,
          actualReps: basePerformance, // Consistent performance across sets
        }));
      } else {
        // Timed exercise: 3-4 sets with consistent performance
        const setCount = 3 + (i % 2);

        completedSets = Array.from({ length: setCount }, (_, setIdx) => ({
          setNumber: setIdx + 1,
          actualDuration: basePerformance, // Consistent performance across sets
        }));
      }

      // Record this performance for progressive overload tracking
      exercisePerformanceHistory.set(exercise.id, [...previousPerformances, basePerformance]);

      exercises.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroups: exercise.muscleGroups,
        completedSets,
      });
    }

    // Optionally add a 4th exercise (50% chance)
    if (Math.random() > 0.5 && exercises.length === 3) {
      const randomMuscleGroup = muscleGroupsNeeded[Math.floor(Math.random() * 3)];
      const availableExercises = getExercisesForMuscleGroup(randomMuscleGroup, recentExercises);

      if (availableExercises.length > 0) {
        const exercise = availableExercises[Math.floor(Math.random() * availableExercises.length)];
        recentExercises.push(exercise.id);
        if (recentExercises.length > maxRecentTracking) {
          recentExercises.shift();
        }

        // Get previous performance for this exercise
        const previousPerformances = exercisePerformanceHistory.get(exercise.id) || [];

        // Get target final value for this exercise
        const finalTarget = FINAL_WORKOUT_TARGETS[exercise.id];
        const defaultFinal = exercise.type === 'reps' ? 25 : 50;
        const targetFinalValue = finalTarget ?? defaultFinal;

        // Calculate starting value (workout 0) and interpolate to reach target by workout 14
        const startValue = Math.round(targetFinalValue * 0.5);

        let basePerformance: number;
        if (previousPerformances.length > 0) {
          // Use last performance + small increase toward target
          const lastPerformance = previousPerformances[previousPerformances.length - 1];
          const remainingWorkouts = 14 - i;
          if (remainingWorkouts > 0) {
            const increment = (targetFinalValue - lastPerformance) / remainingWorkouts;
            basePerformance = Math.round(lastPerformance + Math.max(1, increment));
          } else {
            basePerformance = targetFinalValue;
          }
        } else {
          const progress = i / 14;
          basePerformance = Math.round(startValue + (targetFinalValue - startValue) * progress);
        }

        // Ensure minimum increases
        if (previousPerformances.length > 0) {
          const lastPerformance = previousPerformances[previousPerformances.length - 1];
          if (exercise.type === 'reps') {
            basePerformance = Math.max(basePerformance, lastPerformance + 1);
          } else {
            basePerformance = Math.max(basePerformance, lastPerformance + 2);
          }
        }

        // On final workout, use exact target value
        if (i === 14) {
          basePerformance = targetFinalValue;
        }

        let completedSets: { setNumber: number; actualReps?: number; actualDuration?: number }[];

        if (exercise.type === 'reps') {
          completedSets = Array.from({ length: 3 }, (_, setIdx) => ({
            setNumber: setIdx + 1,
            actualReps: basePerformance, // Consistent performance across sets
          }));
        } else {
          completedSets = Array.from({ length: 3 }, (_, setIdx) => ({
            setNumber: setIdx + 1,
            actualDuration: basePerformance, // Consistent performance across sets
          }));
        }

        // Record this performance for progressive overload tracking
        exercisePerformanceHistory.set(exercise.id, [...previousPerformances, basePerformance]);

        exercises.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscleGroups: exercise.muscleGroups,
          completedSets,
        });
      }
    }

    // Calculate intensity score for this workout
    const intensityScore = calculateIntensityScore(exercises);

    // Create workout history entry
    const historyEntry: WorkoutHistoryEntry = {
      id: `seed-history-${i + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workoutId: `seed-workout-${i + 1}`,
      workoutNumber: i + 1,
      completedDate,
      totalDuration: 20 + Math.floor(Math.random() * 15), // 20-35 minutes
      exercises,
      stretchingCompleted: Math.random() > 0.3, // 70% chance of stretching
      intensityScore,
    };

    workouts.push(historyEntry);
  }

  // Add all workouts to database
  await db.history.bulkAdd(workouts);

  // Calculate and update user strength levels based on all completed workouts
  // This ensures strength levels match the workout history
  const { updateStrengthLevelsFromWorkout } = await import('../lib/progression-calculator');
  const { useUserStore } = await import('../store/user-store');

  const userProfile = useUserStore.getState().profile;
  if (userProfile && userProfile.strengthLevels) {
    let currentStrengthLevels = { ...userProfile.strengthLevels };

    // Process each workout chronologically to build up strength levels
    for (const workout of workouts) {
      currentStrengthLevels = updateStrengthLevelsFromWorkout(
        currentStrengthLevels,
        workout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          muscleGroups: ex.muscleGroups,
          completedSets: ex.completedSets.map((set) => ({
            actualReps: set.actualReps,
            actualDuration: set.actualDuration,
          })),
        }))
      );
    }

    // Update the user profile with final strength levels
    useUserStore.getState().updateStrengthLevels(currentStrengthLevels);

    console.log(`✅ Updated strength levels:`, currentStrengthLevels);
  }

  console.log(`✅ Successfully seeded ${workouts.length} workout history entries`);
}

/**
 * Clears all workout history from the database.
 * Use with caution - this is irreversible!
 */
export async function clearWorkoutHistory(): Promise<void> {
  const count = await db.history.count();
  const confirmed = confirm(
    `This will DELETE all ${count} workout history entries. This action cannot be undone. Are you sure?`
  );

  if (!confirmed) {
    throw new Error('Clear operation cancelled by user');
  }

  await db.history.clear();
  console.log(`✅ Cleared all workout history (${count} entries deleted)`);
}
