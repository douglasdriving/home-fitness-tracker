import { WorkoutHistoryEntry } from '../types/workout';
import { Exercise } from '../types/exercise';
import { getExerciseById } from '../data/exerciseData';

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
export function selectUpperBodyExercises(
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

export type PosteriorChainSlot3Category = 'spinal-extension' | 'lateral-glute';

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
export function getNextPosteriorChainSlot3Category(
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
export function selectPosteriorChainExercises(
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
