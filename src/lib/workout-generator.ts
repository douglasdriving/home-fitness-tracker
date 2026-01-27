import { Workout, WorkoutExercise, WorkoutHistoryEntry, IntensityRating } from '../types/workout';
import type { Set } from '../types/workout';
import { StrengthLevels } from '../types/user';
import { MuscleGroup, Exercise } from '../types/exercise';
import { getExercisesByMuscleGroup } from '../data/exerciseData';
import { calculateProgressionWithFeedback } from './progression-calculator';

interface GenerateWorkoutOptions {
  workoutNumber: number;
  strengthLevels: StrengthLevels;
  recentExerciseIds?: string[]; // IDs of exercises used in last 2-3 workouts
  workoutHistory?: WorkoutHistoryEntry[]; // For progressive overload
  hasElasticBands?: boolean; // Whether user has elastic bands
  excludedExerciseIds?: string[]; // IDs of exercises user wants to exclude
  timeConstraintMinutes?: number; // Optional time limit for workout in minutes
}

/**
 * Generate a new workout based on user's strength levels
 *
 * Strategy:
 * - Select 3-4 exercises covering all muscle groups
 * - Avoid recently used exercises
 * - Calculate sets/reps based on:
 *   - Exercise defaults for first-time exercises
 *   - Intensity feedback + progression for returning exercises
 * - Set rest times based on exercise difficulty
 * - Estimate total workout duration
 */
export function generateWorkout(options: GenerateWorkoutOptions): Workout {
  const { workoutNumber, strengthLevels, workoutHistory = [], hasElasticBands = false, excludedExerciseIds = [], timeConstraintMinutes } = options;

  // Define muscle groups to target (all 3)
  const targetMuscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];

  // Get exercise usage history for prioritization
  const exerciseLastUsed = getExerciseLastUsed(workoutHistory);

  // Select exercises for each muscle group
  const selectedExercises: Exercise[] = [];
  const selectedExerciseIds = new Set<string>();

  for (const muscleGroup of targetMuscleGroups) {
    let availableExercises = getExercisesByMuscleGroup(muscleGroup);

    console.log(`[WORKOUT GEN] Selecting exercise for ${muscleGroup}, ${availableExercises.length} available before filtering`);

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

    // Log top 3 candidates for debugging
    console.log(`[WORKOUT GEN] Top 3 candidates for ${muscleGroup}:`);
    availableExercises.slice(0, 3).forEach(ex => {
      const lastUsed = exerciseLastUsed.get(ex.id) ?? -1;
      console.log(`  - ${ex.name}: last used workout #${lastUsed === -1 ? 'never' : lastUsed}`);
    });

    // Select the least recently used exercise
    const selectedExercise = availableExercises[0];

    if (selectedExercise) {
      console.log(`[WORKOUT GEN] Selected: ${selectedExercise.name}`);
      selectedExercises.push(selectedExercise);
      selectedExerciseIds.add(selectedExercise.id);
    }
  }

  // Add a 4th exercise for variety
  // Try to find an exercise that provides balance or targets the least-represented muscle group
  if (selectedExercises.length === 3) {
    // Count how many times each muscle group appears in selected exercises
    const muscleGroupCounts: Record<MuscleGroup, number> = {
      abs: 0,
      glutes: 0,
      lowerBack: 0,
    };

    selectedExercises.forEach(ex => {
      ex.muscleGroups.forEach(mg => {
        muscleGroupCounts[mg]++;
      });
    });

    // Find the muscle group with the fewest exercises (for balance)
    const sortedGroups = targetMuscleGroups.sort((a, b) =>
      muscleGroupCounts[a] - muscleGroupCounts[b]
    );

    // Try each muscle group starting with the least-represented
    let fourthExercise: Exercise | null = null;
    for (const muscleGroup of sortedGroups) {
      let availableExercises = getExercisesByMuscleGroup(muscleGroup).filter(
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

        fourthExercise = availableExercises[0];
        break; // Found an exercise, exit the loop
      }
    }

    if (fourthExercise) {
      selectedExercises.push(fourthExercise);
      selectedExerciseIds.add(fourthExercise.id);
    }
  }

  // Build workout exercises with sets
  let workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise) => {
    // Determine primary muscle group for this exercise (first one in the array)
    const primaryMuscleGroup = exercise.muscleGroups[0];
    const strengthLevel = strengthLevels[primaryMuscleGroup];

    // Check if user has done this exercise before (progressive overload)
    const lastPerformanceData = findLastPerformanceWithFeedback(exercise.id, workoutHistory);

    // DEBUG: Log the progression calculation
    console.log(`[WORKOUT GEN] Exercise: ${exercise.name} (${exercise.id})`);
    console.log(`[WORKOUT GEN] - Strength Level: ${strengthLevel}`);
    console.log(`[WORKOUT GEN] - Last Performance: ${lastPerformanceData?.performance ?? 'none'}`);
    console.log(`[WORKOUT GEN] - Last Feedback: ${lastPerformanceData?.feedback ?? 'none'}`);
    console.log(`[WORKOUT GEN] - History entries: ${workoutHistory.length}`);

    let targetValue: number;
    if (lastPerformanceData !== null) {
      // Use feedback-based progression
      // Default to rating 3 (just right) if no feedback recorded
      const feedback = lastPerformanceData.feedback ?? 3;
      targetValue = calculateProgressionWithFeedback(
        lastPerformanceData.performance,
        exercise.type,
        feedback
      );
      console.log(`[WORKOUT GEN] - Using FEEDBACK PROGRESSION: ${lastPerformanceData.performance} (feedback: ${feedback}) → ${targetValue}`);
    } else {
      // First time doing this exercise - use exercise default
      // This provides beginner-friendly starting values
      if (exercise.type === 'reps') {
        targetValue = exercise.defaultReps ?? 10; // Fallback to 10 if somehow missing
      } else {
        targetValue = exercise.defaultDuration ?? 30; // Fallback to 30 seconds
      }
      console.log(`[WORKOUT GEN] - Using EXERCISE DEFAULT: ${targetValue}`);
    }

    // Determine number of sets based on exercise type
    // Per-side (unilateral) exercises: 3 sets (since each set takes double time)
    // Other exercises: 4 sets
    // Will be adjusted later if time constraint is specified
    const numSets = exercise.countingMethod === 'per-side' ? 3 : 4;

    console.log(`[WORKOUT GEN] - Final Target: ${targetValue} (${exercise.type})\n`);

    // Create sets with the same target value for all sets
    const sets: Set[] = Array.from({ length: numSets }, (_, index) => ({
      setNumber: index + 1,
      targetReps: exercise.type === 'reps' ? targetValue : undefined,
      targetDuration: exercise.type === 'timed' ? targetValue : undefined,
      completed: false,
    }));

    // Calculate rest time (30-60 seconds based on heaviness)
    // Heavier exercises need more rest
    const heavinessScore = exercise.heavinessScore[primaryMuscleGroup];
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
  let estimatedDuration = calculateEstimatedDuration(workoutExercises);

  // Adjust workout if time constraint is specified
  if (timeConstraintMinutes && estimatedDuration > timeConstraintMinutes) {
    // Strategy: Reduce sets per exercise first, then remove exercises if needed
    let adjustedExercises = [...workoutExercises];

    // First pass: Reduce each exercise to 3 sets (minimum)
    adjustedExercises = adjustedExercises.map(ex => ({
      ...ex,
      sets: ex.sets.slice(0, Math.max(3, ex.sets.length - 1))
    }));
    estimatedDuration = calculateEstimatedDuration(adjustedExercises);

    // Second pass: If still too long, reduce to 2 sets per exercise
    if (estimatedDuration > timeConstraintMinutes) {
      adjustedExercises = adjustedExercises.map(ex => ({
        ...ex,
        sets: ex.sets.slice(0, 2)
      }));
      estimatedDuration = calculateEstimatedDuration(adjustedExercises);
    }

    // Third pass: If still too long, remove the 4th exercise (if present)
    if (estimatedDuration > timeConstraintMinutes && adjustedExercises.length === 4) {
      adjustedExercises = adjustedExercises.slice(0, 3);
      estimatedDuration = calculateEstimatedDuration(adjustedExercises);
    }

    workoutExercises = adjustedExercises;
  }

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
 *
 * NOTE: workoutHistory should be ordered newest-first (reverse chronological)
 * We only update the map if the exercise hasn't been seen yet, so we capture
 * the MOST RECENT usage of each exercise
 */
export function getExerciseLastUsed(workoutHistory: WorkoutHistoryEntry[]): Map<string, number> {
  const lastUsedMap = new Map<string, number>();

  // Process history from newest to oldest
  // Only set the workout number the first time we see each exercise
  // This gives us the MOST RECENT usage
  workoutHistory.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (!lastUsedMap.has(exercise.exerciseId)) {
        lastUsedMap.set(exercise.exerciseId, workout.workoutNumber);
      }
    });
  });

  return lastUsedMap;
}

/**
 * Find the last performance AND intensity feedback for a specific exercise
 * Returns both the performance value and the feedback rating from the most recent workout
 */
function findLastPerformanceWithFeedback(
  exerciseId: string,
  workoutHistory: WorkoutHistoryEntry[]
): { performance: number; feedback: IntensityRating | undefined } | null {
  console.log(`[FIND LAST PERF] Searching for exercise: ${exerciseId}`);
  console.log(`[FIND LAST PERF] Total history entries: ${workoutHistory.length}`);

  // History is already ordered newest-first by the database query
  // Loop forward through the array to check newest workouts first
  for (let i = 0; i < workoutHistory.length; i++) {
    const historyEntry = workoutHistory[i];
    const exercise = historyEntry.exercises.find((ex) => ex.exerciseId === exerciseId);

    if (exercise && exercise.completedSets.length > 0) {
      // Use first set performance (before fatigue) for progressive overload
      const firstSet = exercise.completedSets[0];
      const performance = firstSet.actualReps || firstSet.actualDuration || 0;
      const feedback = exercise.intensityFeedback;

      console.log(`[FIND LAST PERF] Found in workout #${historyEntry.workoutNumber}: ${performance} ${firstSet.actualReps ? 'reps' : 'seconds'}, feedback: ${feedback ?? 'none'}`);

      return { performance, feedback };
    }
  }

  console.log(`[FIND LAST PERF] No history found for this exercise`);
  return null;
}
