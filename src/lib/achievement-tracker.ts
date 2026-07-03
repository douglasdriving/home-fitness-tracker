import { Exercise } from '../types/exercise';
import { ExerciseAchievements } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { allExercises, getExerciseById } from '../data/exerciseData';

export type ExerciseStatus = 'active' | 'locked' | 'retired';

export interface ExerciseWithStatus extends Exercise {
  status: ExerciseStatus;
  unlockProgress?: {
    currentValue: number;
    requiredValue: number;
    requiredExerciseName: string;
  };
  needsEquipment?: boolean; // true when exercise requires equipment the user doesn't have
}

export interface UnlockReason {
  unlockedExerciseId: string;
  unlockedExerciseName: string;
  prereqExerciseId: string;
  prereqExerciseName: string;
  performanceValue: number;
  performanceType: 'reps' | 'timed';
  thresholdValue: number;
}

export interface RetirementReason {
  exerciseId: string;
  exerciseName: string;
  performanceValue: number;
  performanceType: 'reps' | 'timed';
  thresholdValue: number;
}

/**
 * Get the best (highest) performance for an exercise from workout history
 * Returns the best single-set performance across all workouts
 */
export function getBestPerformance(
  exerciseId: string,
  workoutHistory: WorkoutHistoryEntry[]
): { reps?: number; duration?: number } | null {
  let bestReps: number | undefined;
  let bestDuration: number | undefined;

  for (const workout of workoutHistory) {
    const exercise = workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (!exercise) continue;

    for (const set of exercise.completedSets) {
      if (set.actualReps !== undefined) {
        bestReps = Math.max(bestReps ?? 0, set.actualReps);
      }
      // For McGill protocol exercises, use mcgillHoldDuration (per-hold duration)
      // rather than actualDuration (total work time), because unlock thresholds
      // are based on single-hold capacity (e.g., 30s hold to unlock hollow body)
      if (set.mcgillHoldDuration !== undefined) {
        bestDuration = Math.max(bestDuration ?? 0, set.mcgillHoldDuration);
      } else if (set.actualDuration !== undefined) {
        bestDuration = Math.max(bestDuration ?? 0, set.actualDuration);
      }
    }
  }

  if (bestReps === undefined && bestDuration === undefined) {
    return null;
  }

  return { reps: bestReps, duration: bestDuration };
}

/**
 * Get the best performance for an exercise within a SINGLE workout only
 * Used for checking if a specific workout crossed a threshold
 */
export function getWorkoutPerformance(
  exerciseId: string,
  workout: WorkoutHistoryEntry
): { reps?: number; duration?: number } | null {
  const exercise = workout.exercises.find(ex => ex.exerciseId === exerciseId);
  if (!exercise) return null;

  let bestReps: number | undefined;
  let bestDuration: number | undefined;

  for (const set of exercise.completedSets) {
    if (set.actualReps !== undefined) {
      bestReps = Math.max(bestReps ?? 0, set.actualReps);
    }
    // For McGill protocol exercises, use mcgillHoldDuration (per-hold duration)
    if (set.mcgillHoldDuration !== undefined) {
      bestDuration = Math.max(bestDuration ?? 0, set.mcgillHoldDuration);
    } else if (set.actualDuration !== undefined) {
      bestDuration = Math.max(bestDuration ?? 0, set.actualDuration);
    }
  }

  if (bestReps === undefined && bestDuration === undefined) {
    return null;
  }

  return { reps: bestReps, duration: bestDuration };
}

/**
 * Check if an exercise's unlock requirement has been met
 */
export function isExerciseUnlocked(
  exercise: Exercise,
  workoutHistory: WorkoutHistoryEntry[],
  unlockedExercises: string[]
): boolean {
  // If already unlocked, return true
  if (unlockedExercises.includes(exercise.id)) {
    return true;
  }

  // If no unlock requirement, it's available by default
  if (!exercise.unlockRequirement) {
    return true;
  }

  const { exerciseId, type, value } = exercise.unlockRequirement;
  const bestPerf = getBestPerformance(exerciseId, workoutHistory);

  if (!bestPerf) {
    return false;
  }

  if (type === 'reps' && bestPerf.reps !== undefined) {
    return bestPerf.reps >= value;
  }

  if (type === 'timed' && bestPerf.duration !== undefined) {
    return bestPerf.duration >= value;
  }

  return false;
}

/**
 * Check if an exercise should be retired based on performance
 */
export function shouldRetireExercise(
  exercise: Exercise,
  workoutHistory: WorkoutHistoryEntry[]
): boolean {
  if (!exercise.retirementThreshold) {
    return false; // Cannot be retired
  }

  const { type, value } = exercise.retirementThreshold;
  const bestPerf = getBestPerformance(exercise.id, workoutHistory);

  if (!bestPerf) {
    return false;
  }

  if (type === 'reps' && bestPerf.reps !== undefined) {
    return bestPerf.reps >= value;
  }

  if (type === 'timed' && bestPerf.duration !== undefined) {
    return bestPerf.duration >= value;
  }

  return false;
}

/**
 * Check a completed workout for new unlocks and retirements
 * Returns arrays of newly unlocked and newly retired exercise IDs, plus reasons
 *
 * IMPORTANT: Only checks based on THIS workout's performance, not full history.
 * An unlock only triggers if the prerequisite exercise was performed in this workout
 * and this workout's performance crossed the threshold.
 */
export function checkWorkoutAchievements(
  completedWorkout: WorkoutHistoryEntry,
  _fullWorkoutHistory: WorkoutHistoryEntry[],
  currentAchievements: ExerciseAchievements
): {
  newUnlocks: string[];
  newRetirements: string[];
  unlockReasons: UnlockReason[];
  retirementReasons: RetirementReason[];
} {
  const newUnlocks: string[] = [];
  const newRetirements: string[] = [];
  const unlockReasons: UnlockReason[] = [];
  const retirementReasons: RetirementReason[] = [];

  // Get the exercise IDs performed in this workout
  const exercisesInThisWorkout = new Set(
    completedWorkout.exercises.map(ex => ex.exerciseId)
  );

  // Check for new unlocks - ONLY if prerequisite was in THIS workout
  for (const exercise of allExercises) {
    // Skip if already unlocked
    if (currentAchievements.unlockedExercises.includes(exercise.id)) {
      continue;
    }

    // Skip if no unlock requirement (always available)
    if (!exercise.unlockRequirement) {
      continue;
    }

    const { exerciseId: prereqId, type, value } = exercise.unlockRequirement;

    // Only check if the prerequisite exercise was performed in THIS workout
    if (!exercisesInThisWorkout.has(prereqId)) {
      continue;
    }

    // Check if THIS workout's performance crossed the threshold
    const thisWorkoutPerf = getWorkoutPerformance(prereqId, completedWorkout);
    if (!thisWorkoutPerf) {
      continue;
    }

    let crossedThreshold = false;
    let performanceValue = 0;
    if (type === 'reps' && thisWorkoutPerf.reps !== undefined) {
      crossedThreshold = thisWorkoutPerf.reps >= value;
      performanceValue = thisWorkoutPerf.reps;
    } else if (type === 'timed' && thisWorkoutPerf.duration !== undefined) {
      crossedThreshold = thisWorkoutPerf.duration >= value;
      performanceValue = thisWorkoutPerf.duration;
    }

    if (crossedThreshold) {
      newUnlocks.push(exercise.id);

      const prereqExercise = getExerciseById(prereqId);
      unlockReasons.push({
        unlockedExerciseId: exercise.id,
        unlockedExerciseName: exercise.name,
        prereqExerciseId: prereqId,
        prereqExerciseName: prereqExercise?.name ?? 'Unknown',
        performanceValue,
        performanceType: type,
        thresholdValue: value,
      });
    }
  }

  // Check for new retirements (only for exercises performed in this workout)
  for (const workoutExercise of completedWorkout.exercises) {
    const exercise = getExerciseById(workoutExercise.exerciseId);
    if (!exercise) continue;

    // Skip if already retired
    if (currentAchievements.retiredExercises.includes(exercise.id)) {
      continue;
    }

    // Skip if this exercise was JUST unlocked in this workout
    // (don't unlock and retire the same exercise simultaneously)
    if (newUnlocks.includes(exercise.id)) {
      continue;
    }

    // Check if THIS workout's performance crossed the retirement threshold
    if (!exercise.retirementThreshold) {
      continue;
    }

    const thisWorkoutPerf = getWorkoutPerformance(exercise.id, completedWorkout);
    if (!thisWorkoutPerf) {
      continue;
    }

    const { type, value } = exercise.retirementThreshold;
    let crossedThreshold = false;
    let performanceValue = 0;
    if (type === 'reps' && thisWorkoutPerf.reps !== undefined) {
      crossedThreshold = thisWorkoutPerf.reps >= value;
      performanceValue = thisWorkoutPerf.reps;
    } else if (type === 'timed' && thisWorkoutPerf.duration !== undefined) {
      crossedThreshold = thisWorkoutPerf.duration >= value;
      performanceValue = thisWorkoutPerf.duration;
    }

    if (crossedThreshold) {
      newRetirements.push(exercise.id);
      retirementReasons.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        performanceValue,
        performanceType: type,
        thresholdValue: value,
      });
    }
  }

  return { newUnlocks, newRetirements, unlockReasons, retirementReasons };
}

/**
 * Get the status of all exercises based on user achievements and history
 */
export function getExerciseStatuses(
  workoutHistory: WorkoutHistoryEntry[],
  achievements: ExerciseAchievements,
  hasElasticBands: boolean
): ExerciseWithStatus[] {
  return allExercises
    .map(exercise => {
      // Check if exercise requires equipment the user doesn't have
      if (exercise.equipment === 'elastic-band' && !hasElasticBands) {
        return { ...exercise, status: 'locked' as const, needsEquipment: true };
      }

      // Check if retired
      if (achievements.retiredExercises.includes(exercise.id)) {
        return { ...exercise, status: 'retired' as const };
      }

      // Check if locked
      if (exercise.unlockRequirement) {
        const isUnlocked = isExerciseUnlocked(
          exercise,
          workoutHistory,
          achievements.unlockedExercises
        );

        if (!isUnlocked) {
          // Calculate progress toward unlock
          const reqExercise = getExerciseById(exercise.unlockRequirement.exerciseId);
          const bestPerf = getBestPerformance(exercise.unlockRequirement.exerciseId, workoutHistory);

          let currentValue = 0;
          if (bestPerf) {
            currentValue = exercise.unlockRequirement.type === 'reps'
              ? (bestPerf.reps ?? 0)
              : (bestPerf.duration ?? 0);
          }

          return {
            ...exercise,
            status: 'locked' as const,
            unlockProgress: {
              currentValue,
              requiredValue: exercise.unlockRequirement.value,
              requiredExerciseName: reqExercise?.name ?? 'Unknown',
            },
          };
        }
      }

      // Otherwise active
      return { ...exercise, status: 'active' as const };
    });
}

/**
 * Get exercises available for workout generation
 * Filters out locked and retired exercises
 */
export function getAvailableExercises(
  workoutHistory: WorkoutHistoryEntry[],
  achievements: ExerciseAchievements,
  hasElasticBands: boolean,
  excludedExerciseIds: string[] = []
): Exercise[] {
  const statuses = getExerciseStatuses(workoutHistory, achievements, hasElasticBands);

  return statuses
    .filter(ex => ex.status === 'active')
    .filter(ex => !excludedExerciseIds.includes(ex.id))
    .map((ex): Exercise => ({
      id: ex.id,
      name: ex.name,
      emoji: ex.emoji,
      primaryMuscleGroup: ex.primaryMuscleGroup,
      muscleGroups: ex.muscleGroups,
      upperBodySlot: ex.upperBodySlot,
      posteriorChainSlot: ex.posteriorChainSlot,
      description: ex.description,
      videoUrl: ex.videoUrl,
      imageUrl: ex.imageUrl,
      source: ex.source,
      heavinessScore: ex.heavinessScore,
      type: ex.type,
      defaultReps: ex.defaultReps,
      defaultDuration: ex.defaultDuration,
      equipment: ex.equipment,
      countingMethod: ex.countingMethod,
      unlockRequirement: ex.unlockRequirement,
      retirementThreshold: ex.retirementThreshold,
      coachingTip: ex.coachingTip,
      structure: ex.structure,
      mcgillDefaults: ex.mcgillDefaults,
      ladder: ex.ladder,
    }));
}

export interface LadderAdvancement {
  exerciseId: string;
  exerciseName: string;
  fromRung: number; // rung index before advancing
  toRung: number;
  fromRungName: string;
  toRungName: string;
}

/**
 * Check a completed workout for ladder advancements (double progression,
 * coaching session 2026-07-01): when EVERY completed working set of a ladder
 * exercise reaches advanceReps, the exercise moves to the next (harder) rung.
 * The generator then resets its target to startReps for the new rung.
 */
export function checkLadderAdvancements(
  completedWorkout: WorkoutHistoryEntry,
  currentAchievements: ExerciseAchievements
): LadderAdvancement[] {
  const advancements: LadderAdvancement[] = [];

  for (const workoutExercise of completedWorkout.exercises) {
    const exercise = getExerciseById(workoutExercise.exerciseId);
    if (!exercise?.ladder) continue;

    const currentRung = currentAchievements.ladderLevels?.[exercise.id] ?? 0;

    // Already at the top rung — reps just keep climbing there
    if (currentRung >= exercise.ladder.rungs.length - 1) continue;

    // The advance rule requires ALL working sets at/above advanceReps.
    // History only stores completed sets, so require at least 2 of them to
    // avoid advancing off a single-set session.
    const sets = workoutExercise.completedSets;
    if (sets.length < 2) continue;

    const allSetsAtAdvance = sets.every(
      set => (set.actualReps ?? 0) >= exercise.ladder!.advanceReps
    );

    if (allSetsAtAdvance) {
      advancements.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        fromRung: currentRung,
        toRung: currentRung + 1,
        fromRungName: exercise.ladder.rungs[currentRung].name,
        toRungName: exercise.ladder.rungs[currentRung + 1].name,
      });
    }
  }

  return advancements;
}

