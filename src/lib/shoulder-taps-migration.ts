/**
 * Plank Shoulder Taps Migration Utility
 * Converts historical plank-shoulder-taps-001 data from timed (actualDuration) to reps-based (actualReps)
 * to support the change from timed to reps exercise type
 */

import { db } from '../db/db';

const SHOULDER_TAPS_EXERCISE_ID = 'plank-shoulder-taps-001';
const DURATION_TO_REPS_RATIO = 3; // 3 seconds per rep

/**
 * Check if migration is needed
 * Returns true if there are any plank-shoulder-taps entries with actualDuration but not actualReps
 */
export async function needsShoulderTapsMigration(): Promise<boolean> {
  try {
    const allHistory = await db.history.toArray();

    for (const workout of allHistory) {
      for (const exercise of workout.exercises) {
        if (exercise.exerciseId === SHOULDER_TAPS_EXERCISE_ID) {
          for (const set of exercise.completedSets) {
            // If we find a set with actualDuration but no actualReps, migration is needed
            if (set.actualDuration !== undefined && set.actualReps === undefined) {
              return true;
            }
          }
        }
      }
    }

    // Also check active workouts
    const activeWorkouts = await db.workouts.toArray();
    for (const workout of activeWorkouts) {
      for (const exercise of workout.exercises) {
        if (exercise.exerciseId === SHOULDER_TAPS_EXERCISE_ID) {
          for (const set of exercise.sets) {
            if (set.targetDuration !== undefined && set.targetReps === undefined) {
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking if shoulder taps migration is needed:', error);
    return false;
  }
}

/**
 * Migrate plank shoulder taps from timed to reps-based
 * Converts actualDuration → actualReps and targetDuration → targetReps
 * Uses conversion formula: actualReps = Math.round(actualDuration / 3)
 */
export async function migrateShoulderTapsToReps(): Promise<void> {
  try {
    // Migrate workout history
    const allHistory = await db.history.toArray();
    const updatedHistory = [];

    for (const workout of allHistory) {
      let needsUpdate = false;

      for (const exercise of workout.exercises) {
        if (exercise.exerciseId === SHOULDER_TAPS_EXERCISE_ID) {
          for (const set of exercise.completedSets) {
            // Only convert if actualDuration exists and actualReps doesn't (idempotent)
            if (set.actualDuration !== undefined && set.actualReps === undefined) {
              set.actualReps = Math.round(set.actualDuration / DURATION_TO_REPS_RATIO);
              delete set.actualDuration;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        updatedHistory.push(workout);
      }
    }

    // Bulk update all modified history entries
    if (updatedHistory.length > 0) {
      await db.history.bulkPut(updatedHistory);
    }

    // Migrate active workouts
    const activeWorkouts = await db.workouts.toArray();
    const updatedWorkouts = [];

    for (const workout of activeWorkouts) {
      let needsUpdate = false;

      for (const exercise of workout.exercises) {
        if (exercise.exerciseId === SHOULDER_TAPS_EXERCISE_ID) {
          for (const set of exercise.sets) {
            // Convert targetDuration to targetReps
            if (set.targetDuration !== undefined && set.targetReps === undefined) {
              set.targetReps = Math.round(set.targetDuration / DURATION_TO_REPS_RATIO);
              delete set.targetDuration;
              needsUpdate = true;
            }

            // If the set is completed and has actualDuration, convert it too
            if (set.actualDuration !== undefined && set.actualReps === undefined) {
              set.actualReps = Math.round(set.actualDuration / DURATION_TO_REPS_RATIO);
              delete set.actualDuration;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        updatedWorkouts.push(workout);
      }
    }

    // Bulk update all modified workout entries
    if (updatedWorkouts.length > 0) {
      await db.workouts.bulkPut(updatedWorkouts);
    }

    console.log(
      `Shoulder taps migration complete: ${updatedHistory.length} history entries and ${updatedWorkouts.length} active workouts updated`
    );
  } catch (error) {
    console.error('Error during shoulder taps migration:', error);
    throw error;
  }
}
