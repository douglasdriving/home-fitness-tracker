# McGill Protocol (Side Plank)

## Overview

The McGill protocol replaces the traditional single long hold for the side plank exercise with multiple short holds per side in descending sets. Instead of holding for one continuous duration, users perform 3 rounds, then 2 rounds, then 1 round of short holds per side, with brief rest periods between rounds. This approach follows Dr. Stuart McGill's research on spinal stability training.

## How it works

1. **Workout generation**: When the workout generator encounters an exercise with `structure: "mcgill"`, it creates sets using the McGill-specific branch instead of the normal uniform-target path. Each set gets a different round count from the `mcgillDefaults.rounds` array (default `[3, 2, 1]`) but the same hold duration.

2. **Progression**: Uses a hybrid approach via `calculateMcgillProgression()`:
   - "Too easy" feedback → increase hold duration by 5s (up to 30s), then increase first set's round count (up to 6)
   - "Just right" feedback → increase duration if below 25s, otherwise maintain
   - "Too hard" feedback → decrease duration by 5s (floor 5s), then decrease first set's round count (floor 1)

3. **Backwards compatibility**: If a user has legacy side plank history (single long holds without McGill fields), `convertLegacyToMcgill()` converts the duration to an equivalent McGill configuration by dividing by 6 (total rounds in [3+2+1]) and clamping to [10, 30] seconds.

4. **Timer execution**: A dedicated `McgillTimer` component handles the protocol per set. The flow is: all rounds on left side (hold → rest → hold → ...) → transition (10s) → all rounds on right side (hold → rest → hold → ...) → complete. This follows the correct McGill protocol where you exhaust one side before switching. The display shows "Left Side — Hold X of Y" / "Right Side — Hold X of Y" with round dot indicators per side.

5. **Unlock thresholds**: `getBestPerformance()` uses `mcgillHoldDuration` (per-hold duration) rather than `actualDuration` (total work time) for unlock comparisons. This means a user doing 3x10s hasn't reached 30s hold capacity and correctly won't unlock hollow body hold, which requires 30s.

## Key files

| File | Role |
|------|------|
| `src/data/exercises.json` | Side plank entry with `structure: "mcgill"` and `mcgillDefaults` config |
| `src/types/exercise.ts` | `McgillProtocolConfig` interface, `structure` and `mcgillDefaults` on `Exercise` |
| `src/types/workout.ts` | `mcgillRounds` and `mcgillHoldDuration` on `Set` and `CompletedSet` |
| `src/lib/progression-calculator.ts` | `calculateMcgillProgression()` and `convertLegacyToMcgill()` |
| `src/lib/workout-generator.ts` | McGill-specific set generation branch in both `generateWorkout()` and `generateDailyRotationWorkout()` |
| `src/components/workout/McgillTimer.tsx` | Dedicated McGill timer with left-hold/left-rest/transition/right-hold/right-rest/complete state machine |
| `src/components/workout/ExercisePhase.tsx` | McGill target display; routes McGill exercises to `McgillTimer`, others to `Timer` |
| `src/utils/mcgill-formatter.ts` | `formatMcgillSet()` helper for consistent "3x10s per side" formatting |

## Gotchas

- **`getAvailableExercises` in achievement-tracker.ts** manually constructs Exercise objects field-by-field. New Exercise fields must be explicitly copied there or they'll be undefined at runtime (this was the root cause of initial test failures).
- **`targetDuration` compatibility**: McGill sets store `targetDuration = mcgillRounds * mcgillHoldDuration` so existing code that reads `targetDuration` for duration estimates continues to work. UI components override the display to show "3x10s" instead of "30s".
- **Stale closure risk**: `McgillTimer` uses refs (`phaseRef`, `currentRoundRef`) to access current state inside `setInterval` callbacks. Using state directly would cause stale closures since the interval captures old values. This was the root cause of the original "round 4 of 3" bug in the Timer.tsx approach.
- **Set count override**: McGill exercises create exactly `rounds.length` sets (default 3) with varying round counts, bypassing the normal `numSets` calculation that would create uniform sets.
