import { Workout, WorkoutExercise, WorkoutHistoryEntry, IntensityRating } from '../types/workout';
import type { Set } from '../types/workout';
import { StrengthLevels, ExerciseAchievements } from '../types/user';
import { MuscleGroup, Exercise } from '../types/exercise';
import { calculateProgressionWithFeedback, calculateMcgillProgression, convertLegacyToMcgill } from './progression-calculator';
import { getAvailableExercises } from './achievement-tracker';
import { getExerciseById } from '../data/exerciseData';

interface GenerateWorkoutOptions {
  workoutNumber: number;
  strengthLevels: StrengthLevels;
  recentExerciseIds?: string[]; // IDs of exercises used in last 2-3 workouts
  workoutHistory?: WorkoutHistoryEntry[]; // For progressive overload
  hasElasticBands?: boolean; // Whether user has elastic bands
  excludedExerciseIds?: string[]; // IDs of exercises user wants to exclude
  timeConstraintMinutes?: number; // Optional time limit for workout in minutes
  exerciseAchievements?: ExerciseAchievements; // For filtering locked/retired exercises
}

interface GenerateDailyRotationOptions {
  workoutNumber: number;
  strengthLevels: StrengthLevels;
  targetMuscleGroup: MuscleGroup;
  workoutHistory?: WorkoutHistoryEntry[];
  hasElasticBands?: boolean;
  excludedExerciseIds?: string[];
  exerciseAchievements?: ExerciseAchievements;
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
    hasElasticBands = false,
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
    hasElasticBands,
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

    let sets: Set[];

    // Check if this is a McGill protocol exercise
    if (exercise.structure === 'mcgill' && exercise.mcgillDefaults) {
      console.log(`[WORKOUT GEN] - McGill protocol exercise detected`);

      let rounds: number[];
      let holdDuration: number;

      // Per-exercise hold ceiling (defaults to 30 for Side Plank)
      const holdCeiling = exercise.mcgillDefaults.holdCeiling ?? 30;

      if (lastPerformanceData !== null) {
        const feedback = lastPerformanceData.feedback ?? 3;

        // Check if last performance had McGill data
        if (lastPerformanceData.mcgillRounds && lastPerformanceData.mcgillHoldDuration) {
          // Use McGill progression
          console.log(`[WORKOUT GEN] - Using McGill progression from [${lastPerformanceData.mcgillRounds.join(',')}] × ${lastPerformanceData.mcgillHoldDuration}s`);
          const progression = calculateMcgillProgression(
            lastPerformanceData.mcgillRounds,
            lastPerformanceData.mcgillHoldDuration,
            feedback,
            holdCeiling
          );
          rounds = progression.rounds;
          holdDuration = progression.holdDuration;
          console.log(`[WORKOUT GEN] - New McGill values: [${rounds.join(',')}] × ${holdDuration}s`);
        } else {
          // Convert legacy single-hold to McGill
          console.log(`[WORKOUT GEN] - Converting legacy ${lastPerformanceData.performance}s to McGill`);
          const converted = convertLegacyToMcgill(lastPerformanceData.performance, holdCeiling);
          rounds = converted.rounds;
          holdDuration = converted.holdDuration;

          // Apply progression based on feedback
          if (feedback !== 3) {
            const progression = calculateMcgillProgression(rounds, holdDuration, feedback, holdCeiling);
            rounds = progression.rounds;
            holdDuration = progression.holdDuration;
          }
          console.log(`[WORKOUT GEN] - Converted to: [${rounds.join(',')}] × ${holdDuration}s`);
        }
      } else {
        // First time - use defaults
        rounds = exercise.mcgillDefaults.rounds;
        holdDuration = exercise.mcgillDefaults.holdDuration;
        console.log(`[WORKOUT GEN] - Using McGill defaults: [${rounds.join(',')}] × ${holdDuration}s`);
      }

      // Create sets with McGill protocol structure
      sets = rounds.map((roundCount, index) => ({
        setNumber: index + 1,
        targetDuration: roundCount * holdDuration, // Total work time for compatibility
        completed: false,
        mcgillRounds: roundCount,
        mcgillHoldDuration: holdDuration,
      }));

      console.log(`[WORKOUT GEN] - Created ${sets.length} McGill sets\n`);
    } else {
      // Standard (non-McGill) exercise progression
      let targetValue: number;
      if (lastPerformanceData !== null) {
        // Use feedback-based progression
        const feedback = lastPerformanceData.feedback ?? 3;
        if (lastPerformanceData.feedback === undefined) {
          console.warn(`[WORKOUT GEN] - WARNING: No intensity feedback found for ${exercise.name}, defaulting to rating 3 (just right)`);
        }
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
      sets = Array.from({ length: numSets }, (_, index) => ({
        setNumber: index + 1,
        targetReps: exercise.type === 'reps' ? targetValue : undefined,
        targetDuration: exercise.type === 'timed' ? targetValue : undefined,
        completed: false,
      }));
    }

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
 * Generate a daily rotation workout targeting a specific muscle group
 *
 * Strategy:
 * - Select 3 exercises from the target muscle group
 * - Use least recently used exercises
 * - Sets: 3 sets for standard exercises, 4 sets for bilateral (per-side) exercises
 * - Calculate targets based on progressive overload or exercise defaults
 */
export function generateDailyRotationWorkout(options: GenerateDailyRotationOptions): Workout {
  const {
    workoutNumber,
    strengthLevels,
    targetMuscleGroup,
    workoutHistory = [],
    hasElasticBands = false,
    excludedExerciseIds = [],
    exerciseAchievements = { unlockedExercises: [], retiredExercises: [] }
  } = options;

  console.log(`[DAILY ROTATION] Generating workout for ${targetMuscleGroup}`);

  // Get all available exercises (filters out locked and retired)
  const allAvailableExercises = getAvailableExercises(
    workoutHistory,
    exerciseAchievements,
    hasElasticBands,
    excludedExerciseIds
  );

  // Filter to exercises whose PRIMARY muscle group matches the target
  // This prevents exercises from appearing in multiple rotation days
  const availableExercises = allAvailableExercises.filter(ex =>
    ex.primaryMuscleGroup === targetMuscleGroup
  );

  console.log(`[DAILY ROTATION] ${availableExercises.length} available exercises for ${targetMuscleGroup}`);

  if (availableExercises.length === 0) {
    console.warn(`No available exercises for ${targetMuscleGroup} after filtering. Using defaults.`);
    // This should rarely happen, but handle gracefully
  }

  // Get exercise usage history for prioritization
  const exerciseLastUsed = getExerciseLastUsed(workoutHistory);

  let selectedExercises: Exercise[];

  if (targetMuscleGroup === 'upperBody') {
    // Upper body uses a fixed 3-slot role structure instead of generic LRU:
    // Slot 1 = horizontal pull, Slot 2 = horizontal push, Slot 3 = vertical push.
    selectedExercises = selectUpperBodyExercises(availableExercises, exerciseLastUsed);
  } else if (targetMuscleGroup === 'glutes') {
    // The glutes slot is the Posterior Chain day (coaching 2026-06-17): a fixed
    // 3-role structure — Slot 1 hinge, Slot 2 glute-builder, Slot 3 a rotating
    // accessory that alternates between spinal-extension (erector) and lateral-glute
    // work. This guarantees the hinge and spinal-extension patterns are never
    // silently dropped from the rotation.
    const slot3Category = getNextPosteriorChainSlot3Category(workoutHistory);
    console.log(`[DAILY ROTATION] Posterior chain Slot 3 category: ${slot3Category}`);
    selectedExercises = selectPosteriorChainExercises(availableExercises, exerciseLastUsed, slot3Category);
  } else {
    // Sort by least recently used
    availableExercises.sort((a, b) => {
      const aLastUsed = exerciseLastUsed.get(a.id) ?? -1;
      const bLastUsed = exerciseLastUsed.get(b.id) ?? -1;
      return aLastUsed - bLastUsed;
    });

    // Select top 3 exercises (or fewer if not enough available)
    selectedExercises = availableExercises.slice(0, 3);
  }

  console.log(`[DAILY ROTATION] Selected ${selectedExercises.length} exercises`);
  selectedExercises.forEach((ex, idx) => {
    const lastUsed = exerciseLastUsed.get(ex.id) ?? -1;
    console.log(`  ${idx + 1}. ${ex.name}: last used workout #${lastUsed === -1 ? 'never' : lastUsed}`);
  });

  // Build workout exercises with sets
  const workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise) => {
    // Use the target muscle group for strength level
    const strengthLevel = strengthLevels[targetMuscleGroup];

    // Check for progressive overload
    const lastPerformanceData = findLastPerformanceWithFeedback(exercise.id, workoutHistory);

    console.log(`[DAILY ROTATION] Exercise: ${exercise.name}`);
    console.log(`[DAILY ROTATION] - Strength Level: ${strengthLevel}`);
    console.log(`[DAILY ROTATION] - Last Performance: ${lastPerformanceData?.performance ?? 'none'}`);

    let sets: Set[];

    // Check if this is a McGill protocol exercise
    if (exercise.structure === 'mcgill' && exercise.mcgillDefaults) {
      console.log(`[DAILY ROTATION] - McGill protocol exercise detected`);

      let rounds: number[];
      let holdDuration: number;

      // Per-exercise hold ceiling (defaults to 30 for Side Plank)
      const holdCeiling = exercise.mcgillDefaults.holdCeiling ?? 30;

      if (lastPerformanceData !== null) {
        const feedback = lastPerformanceData.feedback ?? 3;

        // Check if last performance had McGill data
        if (lastPerformanceData.mcgillRounds && lastPerformanceData.mcgillHoldDuration) {
          // Use McGill progression
          console.log(`[DAILY ROTATION] - Using McGill progression from [${lastPerformanceData.mcgillRounds.join(',')}] × ${lastPerformanceData.mcgillHoldDuration}s`);
          const progression = calculateMcgillProgression(
            lastPerformanceData.mcgillRounds,
            lastPerformanceData.mcgillHoldDuration,
            feedback,
            holdCeiling
          );
          rounds = progression.rounds;
          holdDuration = progression.holdDuration;
          console.log(`[DAILY ROTATION] - New McGill values: [${rounds.join(',')}] × ${holdDuration}s`);
        } else {
          // Convert legacy single-hold to McGill
          console.log(`[DAILY ROTATION] - Converting legacy ${lastPerformanceData.performance}s to McGill`);
          const converted = convertLegacyToMcgill(lastPerformanceData.performance, holdCeiling);
          rounds = converted.rounds;
          holdDuration = converted.holdDuration;

          // Apply progression based on feedback
          if (feedback !== 3) {
            const progression = calculateMcgillProgression(rounds, holdDuration, feedback, holdCeiling);
            rounds = progression.rounds;
            holdDuration = progression.holdDuration;
          }
          console.log(`[DAILY ROTATION] - Converted to: [${rounds.join(',')}] × ${holdDuration}s`);
        }
      } else {
        // First time - use defaults
        rounds = exercise.mcgillDefaults.rounds;
        holdDuration = exercise.mcgillDefaults.holdDuration;
        console.log(`[DAILY ROTATION] - Using McGill defaults: [${rounds.join(',')}] × ${holdDuration}s`);
      }

      // Create sets with McGill protocol structure
      sets = rounds.map((roundCount, index) => ({
        setNumber: index + 1,
        targetDuration: roundCount * holdDuration, // Total work time for compatibility
        completed: false,
        mcgillRounds: roundCount,
        mcgillHoldDuration: holdDuration,
      }));

      console.log(`[DAILY ROTATION] - Created ${sets.length} McGill sets\n`);
    } else if (exercise.ladder) {
      // Ladder exercise (double progression, coaching 2026-07-01):
      // build reps within the current rung; on entering a new rung, reset to startReps.
      const currentRung = exerciseAchievements.ladderLevels?.[exercise.id] ?? 0;
      const isTopRung = currentRung >= exercise.ladder.rungs.length - 1;

      let targetValue: number;
      if (lastPerformanceData === null || (lastPerformanceData.ladderRung ?? 0) !== currentRung) {
        // First time on this rung (or ever) — start at the rung's entry reps
        targetValue = exercise.ladder.startReps;
        console.log(`[DAILY ROTATION] - LADDER rung ${currentRung} (${exercise.ladder.rungs[currentRung].name}): starting at ${targetValue} reps`);
      } else {
        const feedback = lastPerformanceData.feedback ?? 3;
        targetValue = calculateProgressionWithFeedback(
          lastPerformanceData.performance,
          exercise.type,
          feedback
        );
        // Below the top rung there's no point past advanceReps — hitting it
        // on all sets advances the rung instead. The top rung is uncapped.
        if (!isTopRung) {
          targetValue = Math.min(targetValue, exercise.ladder.advanceReps);
        }
        console.log(`[DAILY ROTATION] - LADDER rung ${currentRung} progression: ${lastPerformanceData.performance} (feedback: ${feedback}) → ${targetValue}`);
      }

      const numSets = exercise.countingMethod === 'per-side' ? 2 : 3;
      sets = Array.from({ length: numSets }, (_, index) => ({
        setNumber: index + 1,
        targetReps: targetValue,
        completed: false,
      }));
    } else {
      // Standard (non-McGill) exercise progression
      let targetValue: number;
      if (lastPerformanceData !== null) {
        const feedback = lastPerformanceData.feedback ?? 3;
        targetValue = calculateProgressionWithFeedback(
          lastPerformanceData.performance,
          exercise.type,
          feedback
        );
        console.log(`[DAILY ROTATION] - Using FEEDBACK PROGRESSION: ${lastPerformanceData.performance} (feedback: ${feedback}) → ${targetValue}`);
      } else {
        // First time doing this exercise - use exercise default
        if (exercise.type === 'reps') {
          targetValue = exercise.defaultReps ?? 10;
        } else {
          targetValue = exercise.defaultDuration ?? 30;
        }
        console.log(`[DAILY ROTATION] - Using EXERCISE DEFAULT: ${targetValue}`);
      }

      // Daily rotation mode set counts:
      // - Per-side exercises: 2 sets (done on each side = 4 total work units)
      // - Standard exercises: 3 sets
      const numSets = exercise.countingMethod === 'per-side' ? 2 : 3;

      console.log(`[DAILY ROTATION] - Sets: ${numSets} (${exercise.countingMethod ?? 'total'})`);
      console.log(`[DAILY ROTATION] - Final Target: ${targetValue} (${exercise.type})\n`);

      sets = Array.from({ length: numSets }, (_, index) => ({
        setNumber: index + 1,
        targetReps: exercise.type === 'reps' ? targetValue : undefined,
        targetDuration: exercise.type === 'timed' ? targetValue : undefined,
        completed: false,
      }));
    }

    // Calculate rest time
    const heavinessScore = exercise.heavinessScore[targetMuscleGroup];
    const restTime = Math.round(30 + (heavinessScore / 10) * 30);

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroups: exercise.muscleGroups,
      sets,
      restTime,
      ...(exercise.ladder
        ? { ladderRung: exerciseAchievements.ladderLevels?.[exercise.id] ?? 0 }
        : {}),
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
    workoutMode: 'daily-rotation',
    targetMuscleGroup,
  };

  return workout;
}

/**
 * Calculate estimated workout duration in minutes
 * Includes preparation time, setup time, and buffer for pauses
 */
export function calculateEstimatedDuration(exercises: WorkoutExercise[]): number {
  let totalSeconds = 0;

  exercises.forEach((exercise) => {
    // Add setup/preparation time at the start of each exercise (10 seconds)
    totalSeconds += 10;

    const exerciseData = getExerciseById(exercise.exerciseId);
    const isMcgill = exerciseData?.structure === 'mcgill';
    const isPerSide = exerciseData?.countingMethod === 'per-side';
    const restBetweenRounds = exerciseData?.mcgillDefaults?.restBetweenRounds ?? 5;

    exercise.sets.forEach((set) => {
      // Add 5 seconds setup time before each set (get into position)
      totalSeconds += 5;

      // Add exercise time
      if (set.mcgillRounds && set.mcgillHoldDuration && isMcgill) {
        // McGill protocol per set: (holdDuration × rounds) + rest × (rounds - 1)
        const holdTimePerSide = set.mcgillHoldDuration * set.mcgillRounds;
        const restTimePerSide = restBetweenRounds * Math.max(0, set.mcgillRounds - 1);
        const timePerSide = holdTimePerSide + restTimePerSide;

        if (isPerSide) {
          // Per-side (e.g. Side Plank): both sides plus a transition between them
          const transitionTime = 10; // Seconds between sides
          totalSeconds += (timePerSide * 2) + transitionTime;
        } else {
          // Single-sided static hold (e.g. Plank): one continuous run, no transition
          totalSeconds += timePerSide;
        }
      } else if (set.targetReps) {
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
export function findLastPerformanceWithFeedback(
  exerciseId: string,
  workoutHistory: WorkoutHistoryEntry[]
): {
  performance: number;
  feedback: IntensityRating | undefined;
  mcgillRounds?: number[];
  mcgillHoldDuration?: number;
  ladderRung?: number;
} | null {
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

      // Check if this is a McGill protocol exercise with rounds data
      const hasMcgillData = exercise.completedSets.some(set =>
        set.mcgillRounds !== undefined && set.mcgillHoldDuration !== undefined
      );

      if (hasMcgillData) {
        // Collect rounds from all sets (they may differ)
        const mcgillRounds = exercise.completedSets
          .map(set => set.mcgillRounds)
          .filter((rounds): rounds is number => rounds !== undefined);
        const mcgillHoldDuration = firstSet.mcgillHoldDuration;

        console.log(`[FIND LAST PERF] Found McGill in workout #${historyEntry.workoutNumber}: rounds [${mcgillRounds.join(',')}] × ${mcgillHoldDuration}s, feedback: ${feedback ?? 'none'}`);

        return { performance, feedback, mcgillRounds, mcgillHoldDuration };
      }

      console.log(`[FIND LAST PERF] Found in workout #${historyEntry.workoutNumber}: ${performance} ${firstSet.actualReps ? 'reps' : 'seconds'}, feedback: ${feedback ?? 'none'}`);

      return { performance, feedback, ladderRung: exercise.ladderRung };
    }
  }

  console.log(`[FIND LAST PERF] No history found for this exercise`);
  return null;
}

/**
 * Get the next muscle group in the daily rotation sequence
 * Sequence: abs → glutes → upperBody → abs → ...
 *
 * @param workoutHistory - Workout history ordered newest-first
 * @returns The next muscle group to target
 */
export function getNextDailyRotationGroup(workoutHistory: WorkoutHistoryEntry[]): MuscleGroup {
  const rotationSequence: MuscleGroup[] = ['abs', 'glutes', 'upperBody'];

  // Find the most recent daily rotation workout
  const lastDailyRotation = workoutHistory.find(
    entry => entry.workoutMode === 'daily-rotation'
  );

  if (!lastDailyRotation || !lastDailyRotation.targetMuscleGroup) {
    // First time using daily rotation mode, start with abs
    console.log('[ROTATION] No previous daily rotation workouts found, starting with abs');
    return 'abs';
  }

  const lastMuscleGroup = lastDailyRotation.targetMuscleGroup;
  const currentIndex = rotationSequence.indexOf(lastMuscleGroup);
  // Legacy lowerBack last-day returns -1 here, wrapping gracefully to abs.
  const nextIndex = (currentIndex + 1) % rotationSequence.length;
  const nextMuscleGroup = rotationSequence[nextIndex];

  console.log(`[ROTATION] Last: ${lastMuscleGroup}, Next: ${nextMuscleGroup}`);

  return nextMuscleGroup;
}

/**
 * Select the 3 upper body exercises by role for a daily rotation session.
 *
 * - Slot 1: horizontal-pull (every session — pull is the posture priority)
 * - Slot 2: horizontal-push (every session)
 * - Slot 3: vertical-push (every session — vertical pull is PARKED per
 *   coaching session 2026-07-01: no equipment for it at home, so Slot 3 does
 *   not alternate until that changes)
 *
 * Each slot picks its least-recently-used available exercise. Slots with no
 * available exercise are dropped, yielding a shorter workout rather than erroring.
 *
 * @param availableExercises - Already unlock/retirement/equipment/exclusion filtered
 * @param exerciseLastUsed - Map of exercise id → last used workout number
 */
function selectUpperBodyExercises(
  availableExercises: Exercise[],
  exerciseLastUsed: Map<string, number>
): Exercise[] {
  const pickLeastRecentlyUsed = (slot: NonNullable<Exercise['upperBodySlot']>): Exercise | undefined => {
    return availableExercises
      .filter(ex => ex.upperBodySlot === slot)
      .sort((a, b) => (exerciseLastUsed.get(a.id) ?? -1) - (exerciseLastUsed.get(b.id) ?? -1))[0];
  };

  const horizontalPull = pickLeastRecentlyUsed('horizontal-pull');
  const horizontalPush = pickLeastRecentlyUsed('horizontal-push');
  const verticalPush = pickLeastRecentlyUsed('vertical-push');

  console.log(`[DAILY ROTATION] Upper body slots → pull: ${horizontalPull?.name ?? 'none'}, push: ${horizontalPush?.name ?? 'none'}, vertical push: ${verticalPush?.name ?? 'none'}`);

  return [horizontalPull, horizontalPush, verticalPush].filter((ex): ex is Exercise => ex !== undefined);
}

type PosteriorChainSlot3Category = 'spinal-extension' | 'lateral-glute';

/**
 * Decide which Slot 3 accessory category the next Posterior Chain session should
 * use. Slot 3 alternates between spinal-extension (erector) work and lateral-glute
 * work so that direct spinal-extension training appears at least every other session.
 *
 * Like the upper-body vertical alternation and the ladder-rung inference, this is
 * *history-derived*: it reads the actual `posteriorChainSlot` of the exercises in
 * the most recent posterior-chain session and returns the opposite category, so
 * equipment-driven fallbacks can't desync the alternation. When there's no prior
 * posterior-chain session it defaults to spinal-extension — its options are all
 * no-equipment starters, so that slot is always fillable.
 *
 * @param workoutHistory - Workout history ordered newest-first
 */
function getNextPosteriorChainSlot3Category(
  workoutHistory: WorkoutHistoryEntry[]
): PosteriorChainSlot3Category {
  const lastPosteriorChain = workoutHistory.find(
    entry => entry.workoutMode === 'daily-rotation' && entry.targetMuscleGroup === 'glutes'
  );

  if (lastPosteriorChain) {
    for (const workoutExercise of lastPosteriorChain.exercises) {
      const slot = getExerciseById(workoutExercise.exerciseId)?.posteriorChainSlot;
      if (slot === 'spinal-extension') {
        return 'lateral-glute';
      }
      if (slot === 'lateral-glute') {
        return 'spinal-extension';
      }
    }
  }

  // First-ever posterior-chain session (or a legacy session with no accessory tag)
  return 'spinal-extension';
}

/**
 * Select the 3 Posterior Chain exercises by movement role for a daily rotation
 * session (coaching 2026-06-17).
 *
 * - Slot 1: hinge (every session — the safety-critical hinge pattern)
 * - Slot 2: glute-builder (every session)
 * - Slot 3: the rotating accessory — `slot3Category` (spinal-extension or
 *   lateral-glute), falling back to the opposite category when the intended pool
 *   is empty (e.g. all lateral-glute options are band-only for a band-less user).
 *
 * Each slot picks its least-recently-used available exercise. Slots with no
 * available exercise are dropped, yielding a shorter workout rather than erroring.
 *
 * KNOWN LIMITATION: both hinge exercises (Single-Leg RDL, banded Good Morning)
 * require an elastic band, so a band-less user has an empty Slot 1 and the session
 * shrinks to 2 exercises. Douglas has bands, so this holds in practice; a
 * no-band backpack hinge would close the gap (out of scope for this issue).
 *
 * @param availableExercises - Already unlock/retirement/equipment/exclusion filtered
 * @param exerciseLastUsed - Map of exercise id → last used workout number
 * @param slot3Category - Which accessory category to prefer for Slot 3
 */
function selectPosteriorChainExercises(
  availableExercises: Exercise[],
  exerciseLastUsed: Map<string, number>,
  slot3Category: PosteriorChainSlot3Category
): Exercise[] {
  const pickLeastRecentlyUsed = (
    slot: NonNullable<Exercise['posteriorChainSlot']>
  ): Exercise | undefined => {
    return availableExercises
      .filter(ex => ex.posteriorChainSlot === slot)
      .sort((a, b) => (exerciseLastUsed.get(a.id) ?? -1) - (exerciseLastUsed.get(b.id) ?? -1))[0];
  };

  const hinge = pickLeastRecentlyUsed('hinge');
  const gluteBuilder = pickLeastRecentlyUsed('glute-builder');

  const otherCategory: PosteriorChainSlot3Category =
    slot3Category === 'spinal-extension' ? 'lateral-glute' : 'spinal-extension';
  const accessory = pickLeastRecentlyUsed(slot3Category) ?? pickLeastRecentlyUsed(otherCategory);

  console.log(`[DAILY ROTATION] Posterior chain slots → hinge: ${hinge?.name ?? 'none'}, glute-builder: ${gluteBuilder?.name ?? 'none'}, accessory (${slot3Category}): ${accessory?.name ?? 'none'}`);

  return [hinge, gluteBuilder, accessory].filter((ex): ex is Exercise => ex !== undefined);
}
