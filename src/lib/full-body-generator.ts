import { Workout, WorkoutExercise, WorkoutHistoryEntry } from '../types/workout';
import { StrengthLevels, ExerciseAchievements } from '../types/user';
import { MuscleGroup, Exercise } from '../types/exercise';
import { getAvailableExercises } from './achievement-tracker';
import { getExerciseLastUsed, findLastPerformanceWithFeedback } from './workout-history-helpers';
import { calculateEstimatedDuration } from './workout-duration';
import { buildExerciseSets } from './exercise-set-builder';

interface GenerateWorkoutOptions {
  workoutNumber: number;
  strengthLevels: StrengthLevels;
  recentExerciseIds?: string[]; // IDs of exercises used in last 2-3 workouts
  workoutHistory?: WorkoutHistoryEntry[]; // For progressive overload
  excludedExerciseIds?: string[]; // IDs of exercises user wants to exclude
  timeConstraintMinutes?: number; // Optional time limit for workout in minutes
  exerciseAchievements?: ExerciseAchievements; // For filtering locked/retired exercises
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
  const {
    workoutNumber,
    strengthLevels,
    workoutHistory = [],
    excludedExerciseIds = [],
    timeConstraintMinutes,
    exerciseAchievements = { unlockedExercises: [], retiredExercises: [] }
  } = options;

  // Define muscle groups to target (all 3)
  const targetMuscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];

  // Get all available exercises (filters out locked and retired)
  const allAvailableExercises = getAvailableExercises(
    workoutHistory,
    exerciseAchievements,
    excludedExerciseIds
  );

  // Helper to get available exercises for a muscle group
  const getAvailableForMuscleGroup = (muscleGroup: MuscleGroup): Exercise[] => {
    return allAvailableExercises.filter(ex => ex.muscleGroups.includes(muscleGroup));
  };

  // Get exercise usage history for prioritization
  const exerciseLastUsed = getExerciseLastUsed(workoutHistory);

  // Select exercises for each muscle group
  const selectedExercises: Exercise[] = [];
  const selectedExerciseIds = new Set<string>();

  for (const muscleGroup of targetMuscleGroups) {
    let availableExercises = getAvailableForMuscleGroup(muscleGroup);

    console.log(`[WORKOUT GEN] Selecting exercise for ${muscleGroup}, ${availableExercises.length} available after unlock/retirement filtering`);

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
      upperBody: 0, // Required by the exhaustive record; full-body targets only abs/glutes/lowerBack until the rotation follow-on issue.
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
      // Use the same available exercises pool (already filtered for unlock/retirement)
      const availableExercises = getAvailableForMuscleGroup(muscleGroup).filter(
        (ex) => !selectedExerciseIds.has(ex.id)
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
    // Use the exercise's designated primary muscle group
    const primaryMuscleGroup = exercise.primaryMuscleGroup;
    const strengthLevel = strengthLevels[primaryMuscleGroup];

    // Check if user has done this exercise before (progressive overload)
    const lastPerformanceData = findLastPerformanceWithFeedback(exercise.id, workoutHistory);

    // DEBUG: Log the progression calculation
    console.log(`[WORKOUT GEN] Exercise: ${exercise.name} (${exercise.id})`);
    console.log(`[WORKOUT GEN] - Strength Level: ${strengthLevel}`);
    console.log(`[WORKOUT GEN] - Last Performance: ${lastPerformanceData?.performance ?? 'none'}`);
    console.log(`[WORKOUT GEN] - Last Feedback: ${lastPerformanceData?.feedback ?? 'none'}`);
    console.log(`[WORKOUT GEN] - History entries: ${workoutHistory.length}`);

    // Per-side (unilateral) exercises: 3 sets (since each set takes double time)
    // Other exercises: 4 sets. Will be adjusted later if time constraint is specified.
    const sets = buildExerciseSets({
      exercise,
      lastPerformanceData,
      logPrefix: '[WORKOUT GEN]',
      standardSets: 4,
      perSideSets: 3,
      warnOnMissingFeedback: true,
      logSetCount: false,
    });

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
