import { Workout, WorkoutExercise, WorkoutHistoryEntry } from '../types/workout';
import type { Set } from '../types/workout';
import { StrengthLevels } from '../types/user';
import { MuscleGroup, Exercise } from '../types/exercise';
import { getExercisesByMuscleGroup } from '../data/exerciseData';
import { estimateExerciseCapacity, calculateProgression } from './progression-calculator';

interface GenerateWorkoutOptions {
  workoutNumber: number;
  strengthLevels: StrengthLevels;
  recentExerciseIds?: string[]; // IDs of exercises used in last 2-3 workouts
  workoutHistory?: WorkoutHistoryEntry[]; // For progressive overload
  hasElasticBands?: boolean; // Whether user has elastic bands
  excludedExerciseIds?: string[]; // IDs of exercises user wants to exclude
}

/**
 * Generate a new workout based on user's strength levels
 *
 * Strategy:
 * - Select 3-4 exercises covering all muscle groups
 * - Avoid recently used exercises
 * - Calculate sets/reps based on strength levels
 * - Set rest times based on exercise difficulty
 * - Estimate total workout duration
 */
export function generateWorkout(options: GenerateWorkoutOptions): Workout {
  const { workoutNumber, strengthLevels, workoutHistory = [], hasElasticBands = false, excludedExerciseIds = [] } = options;

  // Define muscle groups to target (all 3)
  const targetMuscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];

  // Get exercise usage history for prioritization
  const exerciseLastUsed = getExerciseLastUsed(workoutHistory);

  // Select exercises for each muscle group
  const selectedExercises: Exercise[] = [];
  const selectedExerciseIds = new Set<string>();

  for (const muscleGroup of targetMuscleGroups) {
    let availableExercises = getExercisesByMuscleGroup(muscleGroup);

    // Filter by equipment - include exercises with no equipment requirement
    // and band exercises only if user has bands
    availableExercises = availableExercises.filter(
      (ex) => !ex.equipment || ex.equipment === 'none' || (ex.equipment === 'elastic-band' && hasElasticBands)
    );

    // Filter out excluded exercises
    availableExercises = availableExercises.filter(
      (ex) => !excludedExerciseIds.includes(ex.id)
    );

    // Filter out already selected exercises
    availableExercises = availableExercises.filter(
      (ex) => !selectedExerciseIds.has(ex.id)
    );

    if (availableExercises.length === 0) {
      console.warn(`No available exercises for ${muscleGroup} after filtering. Consider reducing excluded exercises.`);
      continue;
    }

    // Sort exercises by last used (least recently used first)
    // Exercises never used get priority (treated as workoutNumber -1)
    availableExercises.sort((a, b) => {
      const aLastUsed = exerciseLastUsed.get(a.id) ?? -1;
      const bLastUsed = exerciseLastUsed.get(b.id) ?? -1;
      return aLastUsed - bLastUsed; // Ascending order (oldest first)
    });

    // Select the least recently used exercise
    const selectedExercise = availableExercises[0];

    if (selectedExercise) {
      selectedExercises.push(selectedExercise);
      selectedExerciseIds.add(selectedExercise.id);
    }
  }

  // Add a 4th exercise for variety (deterministic based on workout number)
  // Rotate through muscle groups: workout 1 gets abs, 2 gets glutes, 3 gets lowerBack, 4 gets abs, etc.
  if (selectedExercises.length === 3) {
    const fourthMuscleGroup = targetMuscleGroups[workoutNumber % 3];
    let availableExercises = getExercisesByMuscleGroup(fourthMuscleGroup).filter(
      (ex) => !selectedExerciseIds.has(ex.id)
    );

    // Apply equipment filter
    availableExercises = availableExercises.filter(
      (ex) => !ex.equipment || ex.equipment === 'none' || (ex.equipment === 'elastic-band' && hasElasticBands)
    );

    // Filter out excluded exercises
    availableExercises = availableExercises.filter(
      (ex) => !excludedExerciseIds.includes(ex.id)
    );

    if (availableExercises.length > 0) {
      // Sort by last used and pick the least recently used
      availableExercises.sort((a, b) => {
        const aLastUsed = exerciseLastUsed.get(a.id) ?? -1;
        const bLastUsed = exerciseLastUsed.get(b.id) ?? -1;
        return aLastUsed - bLastUsed;
      });

      const fourthExercise = availableExercises[0];
      selectedExercises.push(fourthExercise);
      selectedExerciseIds.add(fourthExercise.id);
    }
  }

  // Build workout exercises with sets
  const workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise) => {
    // Determine primary muscle group for this exercise (first one in the array)
    const primaryMuscleGroup = exercise.muscleGroups[0];
    const strengthLevel = strengthLevels[primaryMuscleGroup];
    const heavinessScore = exercise.heavinessScore[primaryMuscleGroup];

    // Check if user has done this exercise before (progressive overload)
    const lastPerformance = findLastPerformance(exercise.id, workoutHistory);

    let targetValue: number;
    if (lastPerformance) {
      // Use progressive overload based on last performance
      // Last performance was already sustainable, so just add progression without multiplier
      targetValue = calculateProgression(lastPerformance, exercise.type);
    } else {
      // First time doing this exercise, estimate based on strength level
      targetValue = estimateExerciseCapacity(
        strengthLevel,
        heavinessScore,
        exercise.type
      );
    }

    // Determine number of sets (3-4 sets based on strength level)
    const numSets = strengthLevel > 50 ? 4 : 3;

    // Apply a sustainable multiplier for multiple sets ONLY for new exercises
    // Calibration tests single-set max capacity, but workouts need sustainable targets
    // Use 75% of estimated capacity for all sets (allows completing all sets with good form)
    // For exercises with history, lastPerformance is already sustainable, so no multiplier needed
    const sustainableTarget = lastPerformance
      ? targetValue
      : Math.round(targetValue * 0.75);

    // Create sets with the same target value for all sets
    const sets: Set[] = Array.from({ length: numSets }, (_, index) => ({
      setNumber: index + 1,
      targetReps: exercise.type === 'reps' ? sustainableTarget : undefined,
      targetDuration: exercise.type === 'timed' ? sustainableTarget : undefined,
      completed: false,
    }));

    // Calculate rest time (30-60 seconds based on heaviness)
    // Heavier exercises need more rest
    const restTime = Math.round(30 + (heavinessScore / 10) * 30);

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroups: exercise.muscleGroups,
      sets,
      restTime,
    };
  });

  // Calculate estimated duration
  const estimatedDuration = calculateEstimatedDuration(workoutExercises);

  const workout: Workout = {
    id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    workoutNumber,
    generatedDate: Date.now(),
    status: 'pending',
    estimatedDuration,
    exercises: workoutExercises,
  };

  return workout;
}

/**
 * Calculate estimated workout duration in minutes
 * Includes preparation time, setup time, and buffer for pauses
 */
function calculateEstimatedDuration(exercises: WorkoutExercise[]): number {
  let totalSeconds = 0;

  exercises.forEach((exercise) => {
    // Add setup/preparation time at the start of each exercise (10 seconds)
    totalSeconds += 10;

    exercise.sets.forEach((set) => {
      // Add 5 seconds setup time before each set (get into position)
      totalSeconds += 5;

      // Add exercise time
      if (set.targetReps) {
        // Assume 3 seconds per rep
        totalSeconds += (set.targetReps * 3);
      } else if (set.targetDuration) {
        totalSeconds += set.targetDuration;
      }

      // Add rest time between sets (except for last set)
      totalSeconds += exercise.restTime;
    });

    // Remove one rest time per exercise (no rest after last set)
    totalSeconds -= exercise.restTime;

    // Add 45 seconds transition time between exercises (was 30)
    // This accounts for checking instructions, catching breath, etc.
    totalSeconds += 45;
  });

  // Remove last transition
  totalSeconds -= 45;

  // Add 15% buffer for pauses, water breaks, form resets, etc.
  totalSeconds = Math.round(totalSeconds * 1.15);

  // Convert to minutes and round up
  return Math.ceil(totalSeconds / 60);
}

/**
 * Get recently used exercise IDs from workout history
 * Returns IDs from last 2 workouts to ensure variety
 */
export function getRecentExerciseIds(recentWorkouts: Workout[]): string[] {
  const exerciseIds = new Set<string>();

  // Get last 2 workouts
  const lastTwo = recentWorkouts.slice(-2);

  lastTwo.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      exerciseIds.add(exercise.exerciseId);
    });
  });

  return Array.from(exerciseIds);
}

/**
 * Get a map of exercise IDs to their last used workout number
 * Used to prioritize exercises that haven't been used recently
 */
export function getExerciseLastUsed(workoutHistory: WorkoutHistoryEntry[]): Map<string, number> {
  const lastUsedMap = new Map<string, number>();

  // Process history chronologically
  workoutHistory.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      // Always update with the latest workout number where this exercise was used
      lastUsedMap.set(exercise.exerciseId, workout.workoutNumber);
    });
  });

  return lastUsedMap;
}

/**
 * Find the last performance for a specific exercise
 * Returns the average performance from the most recent workout containing this exercise
 */
function findLastPerformance(
  exerciseId: string,
  workoutHistory: WorkoutHistoryEntry[]
): number | null {
  // Look through history in reverse (most recent first)
  for (let i = workoutHistory.length - 1; i >= 0; i--) {
    const historyEntry = workoutHistory[i];
    const exercise = historyEntry.exercises.find((ex) => ex.exerciseId === exerciseId);

    if (exercise && exercise.completedSets.length > 0) {
      // Calculate average performance across all sets
      const totalPerformance = exercise.completedSets.reduce((sum, set) => {
        return sum + (set.actualReps || set.actualDuration || 0);
      }, 0);

      return Math.round(totalPerformance / exercise.completedSets.length);
    }
  }

  return null;
}
