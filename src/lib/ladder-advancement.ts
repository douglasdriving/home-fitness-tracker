import { ExerciseAchievements } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { getExerciseById } from '../data/exerciseData';

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
