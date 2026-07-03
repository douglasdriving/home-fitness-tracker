import type { Set } from '../types/workout';
import { Exercise } from '../types/exercise';
import { calculateProgressionWithFeedback, calculateMcgillProgression, convertLegacyToMcgill } from './progression-calculator';
import type { LastPerformanceWithFeedback } from './workout-history-helpers';

interface BuildExerciseSetsOptions {
  exercise: Exercise;
  lastPerformanceData: LastPerformanceWithFeedback | null;
  /** Log prefix, e.g. '[WORKOUT GEN]' or '[DAILY ROTATION]' (no trailing space). */
  logPrefix: string;
  /** Number of sets for standard (bilateral) exercises. */
  standardSets: number;
  /** Number of sets for per-side (unilateral) exercises. */
  perSideSets: number;
  /** When true, warn (full-body only) if a returning exercise has no intensity feedback. */
  warnOnMissingFeedback: boolean;
  /** When true, log the per-exercise set-count line (daily rotation only). */
  logSetCount: boolean;
  /**
   * Ladder (double progression) support — daily rotation only. When omitted or
   * disabled, ladder exercises fall straight through to standard progression,
   * preserving full-body behavior (which has no ladder exercises today).
   */
  ladder?: {
    enabled: boolean;
    ladderLevels?: Record<string, number>;
  };
}

/**
 * Build the set list for a single exercise, reproducing the McGill → ladder →
 * standard branch order shared by both workout generators. Set counts, ladder
 * support, and logging differ between the full-body and daily-rotation generators
 * and are parameterized via {@link BuildExerciseSetsOptions} so the output stays
 * byte-identical to the pre-refactor inlined logic.
 */
export function buildExerciseSets(options: BuildExerciseSetsOptions): Set[] {
  const {
    exercise,
    lastPerformanceData,
    logPrefix,
    standardSets,
    perSideSets,
    warnOnMissingFeedback,
    logSetCount,
    ladder,
  } = options;

  // Check if this is a McGill protocol exercise
  if (exercise.structure === 'mcgill' && exercise.mcgillDefaults) {
    console.log(`${logPrefix} - McGill protocol exercise detected`);

    let rounds: number[];
    let holdDuration: number;

    // Per-exercise hold ceiling (defaults to 30 for Side Plank)
    const holdCeiling = exercise.mcgillDefaults.holdCeiling ?? 30;

    if (lastPerformanceData !== null) {
      const feedback = lastPerformanceData.feedback ?? 3;

      // Check if last performance had McGill data
      if (lastPerformanceData.mcgillRounds && lastPerformanceData.mcgillHoldDuration) {
        // Use McGill progression
        console.log(`${logPrefix} - Using McGill progression from [${lastPerformanceData.mcgillRounds.join(',')}] × ${lastPerformanceData.mcgillHoldDuration}s`);
        const progression = calculateMcgillProgression(
          lastPerformanceData.mcgillRounds,
          lastPerformanceData.mcgillHoldDuration,
          feedback,
          holdCeiling
        );
        rounds = progression.rounds;
        holdDuration = progression.holdDuration;
        console.log(`${logPrefix} - New McGill values: [${rounds.join(',')}] × ${holdDuration}s`);
      } else {
        // Convert legacy single-hold to McGill
        console.log(`${logPrefix} - Converting legacy ${lastPerformanceData.performance}s to McGill`);
        const converted = convertLegacyToMcgill(lastPerformanceData.performance, holdCeiling);
        rounds = converted.rounds;
        holdDuration = converted.holdDuration;

        // Apply progression based on feedback
        if (feedback !== 3) {
          const progression = calculateMcgillProgression(rounds, holdDuration, feedback, holdCeiling);
          rounds = progression.rounds;
          holdDuration = progression.holdDuration;
        }
        console.log(`${logPrefix} - Converted to: [${rounds.join(',')}] × ${holdDuration}s`);
      }
    } else {
      // First time - use defaults
      rounds = exercise.mcgillDefaults.rounds;
      holdDuration = exercise.mcgillDefaults.holdDuration;
      console.log(`${logPrefix} - Using McGill defaults: [${rounds.join(',')}] × ${holdDuration}s`);
    }

    // Create sets with McGill protocol structure
    const sets: Set[] = rounds.map((roundCount, index) => ({
      setNumber: index + 1,
      targetDuration: roundCount * holdDuration, // Total work time for compatibility
      completed: false,
      mcgillRounds: roundCount,
      mcgillHoldDuration: holdDuration,
    }));

    console.log(`${logPrefix} - Created ${sets.length} McGill sets\n`);
    return sets;
  }

  if (ladder?.enabled && exercise.ladder) {
    // Ladder exercise (double progression, coaching 2026-07-01):
    // build reps within the current rung; on entering a new rung, reset to startReps.
    const currentRung = ladder.ladderLevels?.[exercise.id] ?? 0;
    const isTopRung = currentRung >= exercise.ladder.rungs.length - 1;

    let targetValue: number;
    if (lastPerformanceData === null || (lastPerformanceData.ladderRung ?? 0) !== currentRung) {
      // First time on this rung (or ever) — start at the rung's entry reps
      targetValue = exercise.ladder.startReps;
      console.log(`${logPrefix} - LADDER rung ${currentRung} (${exercise.ladder.rungs[currentRung].name}): starting at ${targetValue} reps`);
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
      console.log(`${logPrefix} - LADDER rung ${currentRung} progression: ${lastPerformanceData.performance} (feedback: ${feedback}) → ${targetValue}`);
    }

    const numSets = exercise.countingMethod === 'per-side' ? perSideSets : standardSets;
    return Array.from({ length: numSets }, (_, index) => ({
      setNumber: index + 1,
      targetReps: targetValue,
      completed: false,
    }));
  }

  // Standard (non-McGill) exercise progression
  let targetValue: number;
  if (lastPerformanceData !== null) {
    // Use feedback-based progression
    const feedback = lastPerformanceData.feedback ?? 3;
    if (warnOnMissingFeedback && lastPerformanceData.feedback === undefined) {
      console.warn(`${logPrefix} - WARNING: No intensity feedback found for ${exercise.name}, defaulting to rating 3 (just right)`);
    }
    targetValue = calculateProgressionWithFeedback(
      lastPerformanceData.performance,
      exercise.type,
      feedback
    );
    console.log(`${logPrefix} - Using FEEDBACK PROGRESSION: ${lastPerformanceData.performance} (feedback: ${feedback}) → ${targetValue}`);
  } else {
    // First time doing this exercise - use exercise default
    // This provides beginner-friendly starting values
    if (exercise.type === 'reps') {
      targetValue = exercise.defaultReps ?? 10; // Fallback to 10 if somehow missing
    } else {
      targetValue = exercise.defaultDuration ?? 30; // Fallback to 30 seconds
    }
    console.log(`${logPrefix} - Using EXERCISE DEFAULT: ${targetValue}`);
  }

  // Determine number of sets based on exercise type
  // Per-side (unilateral) exercises take double time, so they get fewer sets.
  const numSets = exercise.countingMethod === 'per-side' ? perSideSets : standardSets;

  if (logSetCount) {
    console.log(`${logPrefix} - Sets: ${numSets} (${exercise.countingMethod ?? 'total'})`);
  }
  console.log(`${logPrefix} - Final Target: ${targetValue} (${exercise.type})\n`);

  // Create sets with the same target value for all sets
  return Array.from({ length: numSets }, (_, index) => ({
    setNumber: index + 1,
    targetReps: exercise.type === 'reps' ? targetValue : undefined,
    targetDuration: exercise.type === 'timed' ? targetValue : undefined,
    completed: false,
  }));
}
