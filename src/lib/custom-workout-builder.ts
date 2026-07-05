import { db } from '../db/db';
import { getExerciseById } from '../data/exerciseData';
import { calculateEstimatedDuration, findLastPerformanceWithFeedback } from './workout-generator';
import { calculateProgressionWithFeedback, calculateMcgillProgression, convertLegacyToMcgill } from './progression-calculator';
import type { Workout, WorkoutExercise, Set, WorkoutHistoryEntry } from '../types/workout';

/**
 * Builds a custom "full-body" workout from an explicit list of exercises, applying
 * the same progressive-overload logic the generators use (McGill protocol vs.
 * standard reps/timed), then persists it to the database as the pending workout.
 *
 * Extracted from the Settings custom-workout builder so the DB/construction logic
 * lives with the other workout-generation code and can be unit tested.
 *
 * @param exerciseIds Ordered list of exercise ids to include.
 * @param setsCount Number of sets to build per exercise.
 * @returns The persisted {@link Workout}.
 */
export async function buildCustomWorkout(
  exerciseIds: string[],
  setsCount: number
): Promise<Workout> {
  // Delete any existing pending/in-progress workouts (matches pattern in workout-store.ts)
  await db.workouts.where('status').anyOf(['pending', 'in-progress']).delete();

  // Get next workout number
  const historyCount = await db.history.count();
  const workoutNumber = historyCount + 1;

  // Get workout history for progressive overload
  const workoutHistory: WorkoutHistoryEntry[] = await db.history
    .orderBy('completedDate')
    .reverse()
    .toArray();

  // Build workout exercises
  const workoutExercises: WorkoutExercise[] = exerciseIds.map((exerciseId) => {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) {
      throw new Error(`Exercise not found: ${exerciseId}`);
    }

    const isMcgill = exercise.structure === 'mcgill';

    // Look up last performance for progressive overload
    const lastPerformanceData = findLastPerformanceWithFeedback(exerciseId, workoutHistory);

    let sets: Set[];

    if (isMcgill && exercise.mcgillDefaults) {
      // McGill protocol: use progression from history or defaults
      let rounds: number[];
      let holdDuration: number;

      if (lastPerformanceData !== null) {
        const feedback = lastPerformanceData.feedback ?? 3;

        if (lastPerformanceData.mcgillRounds && lastPerformanceData.mcgillHoldDuration) {
          const progression = calculateMcgillProgression(
            lastPerformanceData.mcgillRounds,
            lastPerformanceData.mcgillHoldDuration,
            feedback
          );
          rounds = progression.rounds;
          holdDuration = progression.holdDuration;
        } else {
          // Convert legacy single-hold to McGill
          const converted = convertLegacyToMcgill(lastPerformanceData.performance);
          rounds = converted.rounds;
          holdDuration = converted.holdDuration;

          if (feedback !== 3) {
            const progression = calculateMcgillProgression(rounds, holdDuration, feedback);
            rounds = progression.rounds;
            holdDuration = progression.holdDuration;
          }
        }
      } else {
        rounds = exercise.mcgillDefaults.rounds;
        holdDuration = exercise.mcgillDefaults.holdDuration;
      }

      // Create sets with McGill protocol structure
      // Use setsCount but map to rounds array (cycle last value if more sets than rounds)
      sets = Array.from({ length: setsCount }, (_, i) => {
        const roundsIndex = Math.min(i, rounds.length - 1);
        const roundCount = rounds[roundsIndex] ?? rounds[rounds.length - 1] ?? 3;
        return {
          setNumber: i + 1,
          targetDuration: roundCount * holdDuration,
          completed: false,
          mcgillRounds: roundCount,
          mcgillHoldDuration: holdDuration,
        };
      });
    } else {
      // Standard exercise: use progression from history or defaults
      let targetValue: number;

      if (lastPerformanceData !== null) {
        const feedback = lastPerformanceData.feedback ?? 3;
        targetValue = calculateProgressionWithFeedback(
          lastPerformanceData.performance,
          exercise.type,
          feedback
        );
      } else if (exercise.type === 'reps') {
        targetValue = exercise.defaultReps ?? 10;
      } else {
        targetValue = exercise.defaultDuration ?? 30;
      }

      sets = Array.from({ length: setsCount }, (_, i) => ({
        setNumber: i + 1,
        targetReps: exercise.type === 'reps' ? targetValue : undefined,
        targetDuration: exercise.type === 'timed' ? targetValue : undefined,
        completed: false,
      }));
    }

    // Calculate rest time (matches workout-generator.ts:281-282)
    const restTime = Math.round(30 + (exercise.heavinessScore[exercise.primaryMuscleGroup] / 10) * 30);

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

  // Build workout object
  const workout: Workout = {
    id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    workoutNumber,
    generatedDate: Date.now(),
    status: 'pending',
    estimatedDuration,
    exercises: workoutExercises,
    workoutMode: 'full-body',
  };

  // Save to database
  await db.workouts.add(workout);

  return workout;
}
