/**
 * Strength Level Migration Utility
 * Backfills historical strength level data for all past workouts
 * to enable complete progress tracking from first workout to present
 */

import { db, StrengthLevelSnapshot } from '../db/db';
import { updateStrengthLevelsFromWorkout } from './progression-calculator';
import { StrengthLevels } from '../types/user';
import { useUserStore } from '../store/user-store';

export interface MigrationResult {
  success: boolean;
  totalWorkouts: number;
  snapshotsCreated: number;
  errors: string[];
}

/**
 * Backfill strength history for all completed workouts
 * Creates strength level snapshots for each historical workout
 */
export async function backfillStrengthHistory(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalWorkouts: 0,
    snapshotsCreated: 0,
    errors: [],
  };

  try {
    // Get user's calibration strength levels as starting point
    const userProfile = useUserStore.getState().profile;
    if (!userProfile || !userProfile.strengthLevels) {
      result.errors.push('No user profile or strength levels found');
      return result;
    }

    // Get all completed workouts ordered by completion date
    const allHistory = await db.history
      .orderBy('completedDate')
      .toArray();

    result.totalWorkouts = allHistory.length;

    if (allHistory.length === 0) {
      result.success = true;
      return result;
    }

    // Check if migration has already been run
    const existingSnapshots = await db.strengthHistory.toArray();
    if (existingSnapshots.length >= allHistory.length) {
      result.errors.push('Migration already complete or partial data exists');
      result.snapshotsCreated = existingSnapshots.length;
      return result;
    }

    // Clear existing strength history to rebuild from scratch
    await db.strengthHistory.clear();

    // Start with calibration strength levels
    let currentStrength: StrengthLevels = {
      ...userProfile.strengthLevels,
      abs: userProfile.strengthLevels.abs || 0,
      glutes: userProfile.strengthLevels.glutes || 0,
      lowerBack: userProfile.strengthLevels.lowerBack || 0,
      lastUpdated: userProfile.strengthLevels.lastUpdated,
    };

    // Process each workout chronologically
    for (const workout of allHistory) {
      try {
        // Update strength levels based on this workout's performance
        const updatedStrength = updateStrengthLevelsFromWorkout(
          currentStrength,
          workout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            muscleGroups: ex.muscleGroups,
            completedSets: ex.completedSets.map((set) => ({
              actualReps: set.actualReps,
              actualDuration: set.actualDuration,
            })),
          }))
        );

        // Create snapshot for this workout
        const snapshot: StrengthLevelSnapshot = {
          timestamp: workout.completedDate,
          workoutNumber: workout.workoutNumber,
          abs: updatedStrength.abs,
          glutes: updatedStrength.glutes,
          lowerBack: updatedStrength.lowerBack,
        };

        await db.strengthHistory.add(snapshot);
        result.snapshotsCreated++;

        // Update current strength for next iteration
        currentStrength = updatedStrength;
      } catch (error) {
        result.errors.push(
          `Failed to process workout #${workout.workoutNumber}: ${error}`
        );
      }
    }

    // Update user's current strength levels to match the final calculated values
    useUserStore.getState().updateStrengthLevels(currentStrength);

    // Mark backfill as completed
    useUserStore.getState().setBackfillCompleted();

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${error}`);
    return result;
  }
}

/**
 * Check if strength history migration is needed
 * Returns true if there are completed workouts without corresponding strength snapshots
 */
export async function needsMigration(): Promise<boolean> {
  const historyCount = await db.history.count();
  const snapshotCount = await db.strengthHistory.count();

  return historyCount > 0 && snapshotCount < historyCount;
}
