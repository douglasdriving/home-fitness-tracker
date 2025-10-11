import { Workout, WorkoutExercise } from '../types/workout';
import type { Set } from '../types/workout';
import { StrengthLevels } from '../types/user';
import { MuscleGroup, Exercise } from '../types/exercise';
import { getExercisesByMuscleGroup } from '../data/exerciseData';
import { estimateExerciseCapacity } from './progression-calculator';

interface GenerateWorkoutOptions {
  workoutNumber: number;
  strengthLevels: StrengthLevels;
  recentExerciseIds?: string[]; // IDs of exercises used in last 2-3 workouts
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
  const { workoutNumber, strengthLevels, recentExerciseIds = [] } = options;

  // Define muscle groups to target (all 3)
  const targetMuscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];

  // Select exercises for each muscle group
  const selectedExercises: Exercise[] = [];

  for (const muscleGroup of targetMuscleGroups) {
    const availableExercises = getExercisesByMuscleGroup(muscleGroup);

    // Filter out recently used exercises
    const unusedExercises = availableExercises.filter(
      (ex) => !recentExerciseIds.includes(ex.id)
    );

    // If all exercises were recently used, just use all available
    const poolToChooseFrom = unusedExercises.length > 0 ? unusedExercises : availableExercises;

    // Pick a random exercise from the pool
    const randomIndex = Math.floor(Math.random() * poolToChooseFrom.length);
    const selectedExercise = poolToChooseFrom[randomIndex];

    if (selectedExercise) {
      selectedExercises.push(selectedExercise);
    }
  }

  // Optionally add a 4th exercise (50% chance) for variety
  if (Math.random() > 0.5 && selectedExercises.length === 3) {
    // Pick a random muscle group
    const randomMuscleGroup = targetMuscleGroups[Math.floor(Math.random() * targetMuscleGroups.length)];
    const availableExercises = getExercisesByMuscleGroup(randomMuscleGroup).filter(
      (ex) => !selectedExercises.some((selected) => selected.id === ex.id) &&
              !recentExerciseIds.includes(ex.id)
    );

    if (availableExercises.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableExercises.length);
      selectedExercises.push(availableExercises[randomIndex]);
    }
  }

  // Build workout exercises with sets
  const workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise) => {
    // Determine primary muscle group for this exercise (first one in the array)
    const primaryMuscleGroup = exercise.muscleGroups[0];
    const strengthLevel = strengthLevels[primaryMuscleGroup];
    const heavinessScore = exercise.heavinessScore[primaryMuscleGroup];

    // Estimate capacity for this exercise
    const estimatedCapacity = estimateExerciseCapacity(
      strengthLevel,
      heavinessScore,
      exercise.type
    );

    // Determine number of sets (3-4 sets based on strength level)
    const numSets = strengthLevel > 50 ? 4 : 3;

    // Create sets with target values
    const sets: Set[] = Array.from({ length: numSets }, (_, index) => ({
      setNumber: index + 1,
      targetReps: exercise.type === 'reps' ? estimatedCapacity : undefined,
      targetDuration: exercise.type === 'timed' ? estimatedCapacity : undefined,
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
 */
function calculateEstimatedDuration(exercises: WorkoutExercise[]): number {
  let totalSeconds = 0;

  exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
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

    // Add 30 seconds transition time between exercises
    totalSeconds += 30;
  });

  // Remove last transition
  totalSeconds -= 30;

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
