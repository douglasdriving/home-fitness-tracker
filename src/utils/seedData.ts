/**
 * Development seed data utility for populating workout history.
 * Creates realistic sample workouts spanning multiple weeks with progressive improvements.
 */

import { db } from '../db/db';
import { WorkoutHistoryEntry, CompletedExercise } from '../types/workout';
import { MuscleGroup } from '../types/exercise';
import { allExercises } from '../data/exerciseData';

/**
 * Generates seed workout history data for development and testing.
 * Creates 15 workouts over 6 weeks with realistic progression.
 * Workouts are numbered 1-15 with dates from oldest (1) to newest (15).
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

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const workouts: WorkoutHistoryEntry[] = [];

  // Helper to get random exercises for each muscle group
  const getExercisesForMuscleGroup = (group: MuscleGroup, exclude: string[] = []) => {
    return allExercises.filter(
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

      // Calculate progressive performance with proper 7.5% increase
      const avgHeaviness =
        Object.values(exercise.heavinessScore).reduce((sum, score) => sum + score, 0) / 3;

      // Get previous performance for this exercise
      const previousPerformances = exercisePerformanceHistory.get(exercise.id) || [];

      let basePerformance: number;
      if (previousPerformances.length > 0) {
        // Use last performance + 7.5% increase (progressive overload)
        const lastPerformance = previousPerformances[previousPerformances.length - 1];
        basePerformance = Math.round(lastPerformance * 1.075);
      } else {
        // First time doing this exercise: start with capacity-based value
        // Use higher multiplier to reach strength levels above 100 by workout 15
        const startingMultiplier = 0.7 + i * 0.08; // Faster progression to test higher strength levels
        if (exercise.type === 'reps') {
          basePerformance = Math.round((30 / avgHeaviness) * startingMultiplier);
        } else {
          basePerformance = Math.round((180 / avgHeaviness) * startingMultiplier);
        }
      }

      // Ensure minimum increases
      if (previousPerformances.length > 0) {
        const lastPerformance = previousPerformances[previousPerformances.length - 1];
        if (exercise.type === 'reps') {
          basePerformance = Math.max(basePerformance, lastPerformance + 1); // Min +1 rep
        } else {
          basePerformance = Math.max(basePerformance, lastPerformance + 5); // Min +5 seconds
        }
      }

      let completedSets: { setNumber: number; actualReps?: number; actualDuration?: number }[];

      if (exercise.type === 'reps') {
        // Reps exercise: 3-4 sets with slight fatigue variation
        const setCount = 3 + (i % 2); // Alternate between 3 and 4 sets

        completedSets = Array.from({ length: setCount }, (_, setIdx) => ({
          setNumber: setIdx + 1,
          actualReps: Math.max(1, basePerformance - setIdx), // Gradual fatigue: -1 per set
        }));
      } else {
        // Timed exercise: 3-4 sets with slight fatigue variation
        const setCount = 3 + (i % 2);

        completedSets = Array.from({ length: setCount }, (_, setIdx) => ({
          setNumber: setIdx + 1,
          actualDuration: Math.max(5, basePerformance - (setIdx * 5)), // Gradual fatigue: -5s per set
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

        const avgHeaviness =
          Object.values(exercise.heavinessScore).reduce((sum, score) => sum + score, 0) / 3;

        // Get previous performance for this exercise
        const previousPerformances = exercisePerformanceHistory.get(exercise.id) || [];

        let basePerformance: number;
        if (previousPerformances.length > 0) {
          // Use last performance + 7.5% increase (progressive overload)
          const lastPerformance = previousPerformances[previousPerformances.length - 1];
          basePerformance = Math.round(lastPerformance * 1.075);
        } else {
          // First time doing this exercise: start with capacity-based value
          // Use higher multiplier to reach strength levels above 100 by workout 15
          const startingMultiplier = 0.7 + i * 0.08; // Faster progression to test higher strength levels
          if (exercise.type === 'reps') {
            basePerformance = Math.round((30 / avgHeaviness) * startingMultiplier);
          } else {
            basePerformance = Math.round((180 / avgHeaviness) * startingMultiplier);
          }
        }

        // Ensure minimum increases
        if (previousPerformances.length > 0) {
          const lastPerformance = previousPerformances[previousPerformances.length - 1];
          if (exercise.type === 'reps') {
            basePerformance = Math.max(basePerformance, lastPerformance + 1);
          } else {
            basePerformance = Math.max(basePerformance, lastPerformance + 5);
          }
        }

        let completedSets: { setNumber: number; actualReps?: number; actualDuration?: number }[];

        if (exercise.type === 'reps') {
          completedSets = Array.from({ length: 3 }, (_, setIdx) => ({
            setNumber: setIdx + 1,
            actualReps: Math.max(1, basePerformance - setIdx),
          }));
        } else {
          completedSets = Array.from({ length: 3 }, (_, setIdx) => ({
            setNumber: setIdx + 1,
            actualDuration: Math.max(5, basePerformance - (setIdx * 5)),
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

    // Create workout history entry
    const historyEntry: WorkoutHistoryEntry = {
      id: `seed-history-${i + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workoutId: `seed-workout-${i + 1}`,
      workoutNumber: i + 1,
      completedDate,
      totalDuration: 20 + Math.floor(Math.random() * 15), // 20-35 minutes
      exercises,
      stretchingCompleted: Math.random() > 0.3, // 70% chance of stretching
    };

    workouts.push(historyEntry);
  }

  // Add all workouts to database
  await db.history.bulkAdd(workouts);

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
