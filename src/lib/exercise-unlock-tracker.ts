import { Exercise } from '../types/exercise';
import { ExerciseAchievements } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { allExercises, getExerciseById } from '../data/exerciseData';
import { getBestPerformance, getWorkoutPerformance } from './exercise-performance';

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
