import { Workout, WorkoutExercise, WorkoutHistoryEntry } from '../types/workout';
import { StrengthLevels, ExerciseAchievements } from '../types/user';
import { MuscleGroup, Exercise } from '../types/exercise';
import { getAvailableExercises } from './achievement-tracker';
import { getExerciseLastUsed, findLastPerformanceWithFeedback } from './workout-history-helpers';
import { calculateEstimatedDuration } from './workout-duration';
import { buildExerciseSets } from './exercise-set-builder';
import {
  selectUpperBodyExercises,
  selectPosteriorChainExercises,
  getNextPosteriorChainSlot3Category,
} from './rotation-day-slots';

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

    // Daily rotation mode set counts:
    // - Per-side exercises: 2 sets (done on each side = 4 total work units)
    // - Standard exercises: 3 sets
    const sets = buildExerciseSets({
      exercise,
      lastPerformanceData,
      logPrefix: '[DAILY ROTATION]',
      standardSets: 3,
      perSideSets: 2,
      warnOnMissingFeedback: false,
      logSetCount: true,
      ladder: {
        enabled: true,
        ladderLevels: exerciseAchievements.ladderLevels,
      },
    });

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
