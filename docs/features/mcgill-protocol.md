# McGill Short-Hold Protocol

## Overview

The McGill short-hold protocol replaces traditional single long holds with multiple short holds in descending sets. Instead of holding one continuous (and form-degrading) duration, users perform 3 rounds, then 2 rounds, then 1 round of short holds, with brief rest periods between rounds. This follows Dr. Stuart McGill's research on spinal stability training.

The protocol applies to **any timed static hold** with a configured per-exercise ceiling. The core principle is ceiling-based: once progression would push a single hold past a per-exercise ceiling (~30–40s for core holds), the app adds a rep (an extra hold) instead of adding seconds. This keeps form crisp and avoids the endless grind of increasingly long holds.

Currently converted exercises:

| Exercise | `countingMethod` | `holdCeiling` | Timer mode |
|----------|------------------|---------------|------------|
| Side Plank (`side-plank-001`) | `per-side` | 30 (default) | bilateral (left → transition → right) |
| Plank (`plank-001`) | total | 30 | single-sided (one continuous sequence) |
| Hollow Body Hold (`hollow-body-hold-001`) | total | 30 | single-sided (one continuous sequence) |
| Back Extension Hold (`back-extension-hold-001`) | total | 30 | single-sided (one continuous sequence) |

Dynamic timed exercises (Flutter Kicks, Mountain Climbers) and stretching/mobility holds are intentionally **not** converted — the ceiling model only fits static strength holds.

## How it works

1. **Workout generation**: When the workout generator encounters an exercise with `structure: "mcgill"`, it creates sets using the McGill-specific branch instead of the normal uniform-target path. Each set gets a different round count from the `mcgillDefaults.rounds` array (default `[3, 2, 1]`) but the same hold duration.

2. **Configurable ceiling**: The per-hold ceiling is read from `mcgillDefaults.holdCeiling` (defaults to `30` when unset, preserving Side Plank's original behaviour). The generator threads this value into `calculateMcgillProgression()` and `convertLegacyToMcgill()`. Because `getAvailableExercises()` copies `mcgillDefaults` wholesale, nesting `holdCeiling` inside it (rather than as a top-level `Exercise` field) avoids the field-by-field-copy gotcha below.

3. **Progression**: Uses a ceiling-based hybrid approach via `calculateMcgillProgression(lastRounds, lastHoldDuration, feedback, holdCeiling = 30)`:
   - "Too easy" feedback → increase hold duration by 5s while below `holdCeiling`, then increase first set's round count (up to 6)
   - "Just right" feedback → increase duration while below `holdCeiling - 5`, otherwise maintain (holds at the ceiling)
   - "Too hard" feedback → decrease duration by 5s (floor 5s), then decrease first set's round count (floor 1)

4. **Backwards compatibility**: If a user has legacy single-hold history (long holds without McGill fields, e.g. a 75s plank), `convertLegacyToMcgill(lastDuration, holdCeiling = 30)` converts the duration to an equivalent McGill configuration by dividing by 6 (total rounds in [3+2+1]), rounding to the nearest 5s, and clamping to `[10, holdCeiling]`. This conversion happens on-the-fly inside the generator the next time the exercise is generated — there is no separate stored-history rewrite.

5. **Timer execution**: A dedicated `McgillTimer` component handles the protocol per set, with two render paths driven by the `perSide` prop (`ExercisePhase` passes `exercise.countingMethod === 'per-side'`):
   - **Per-side (`perSide={true}`, Side Plank)**: all rounds on left side (hold → rest → hold → ...) → transition (10s) → all rounds on right side → complete. Display shows "Left Side — Hold X of Y" / "Right Side — Hold X of Y" with two rows of round-dot indicators.
   - **Single-sided (`perSide={false}`, Plank)**: one continuous sequence (hold → rest → hold → ...) → complete, with no transition and no right side. Display shows "Hold X of Y" with a single row of round dots and no side indicator. `getElapsed`/`totalDuration` count one side only.

6. **Unlock thresholds**: `getBestPerformance()` uses `mcgillHoldDuration` (per-hold duration) rather than `actualDuration` (total work time) for unlock comparisons. Because per-hold duration is capped at the ceiling, downstream unlocks must use reachable thresholds — e.g. Plank Shoulder Taps unlocks at a 30s plank hold (the ceiling), not the old 45s which is unreachable once the ceiling is in place. A user doing 3×10s hasn't reached 30s hold capacity and correctly won't unlock exercises that require 30s.

## Key files

| File | Role |
|------|------|
| `src/data/exercises.json` | Side Plank, Plank, Hollow Body Hold, and Back Extension Hold entries with `structure: "mcgill"` and `mcgillDefaults` (incl. `holdCeiling`) config |
| `src/types/exercise.ts` | `McgillProtocolConfig` interface (incl. optional `holdCeiling`), `structure` and `mcgillDefaults` on `Exercise` |
| `src/types/workout.ts` | `mcgillRounds` and `mcgillHoldDuration` on `Set` and `CompletedSet` |
| `src/lib/progression-calculator.ts` | `calculateMcgillProgression()` and `convertLegacyToMcgill()` |
| `src/lib/exercise-set-builder.ts` | McGill-specific set generation branch in the shared `buildExerciseSets()`, called by both `generateWorkout()` (full-body-generator.ts) and `generateDailyRotationWorkout()` (daily-rotation-generator.ts) |
| `src/components/workout/McgillTimer.tsx` | Dedicated McGill timer; `perSide` prop selects bilateral (left/transition/right) vs single-sided (one continuous sequence) state machine |
| `src/components/workout/ExercisePhase.tsx` | McGill target display; routes McGill exercises to `McgillTimer`, others to `Timer` |
| `src/utils/mcgill-formatter.ts` | `formatMcgillSet()` helper for consistent "3x10s per side" formatting |
| `src/components/history/WorkoutDetailModal.tsx` | History detail view with McGill format display |
| `src/components/history/EditWorkoutModal.tsx` | History edit view showing McGill format (read-only for McGill sets) |
| `src/store/workout-session-slice.ts` | `completeWorkout()` filter preserves McGill sets in history (composed into `useWorkoutStore`) |

## Gotchas

- **`getAvailableExercises` in achievement-tracker.ts** manually constructs Exercise objects field-by-field. New Exercise fields must be explicitly copied there or they'll be undefined at runtime (this was the root cause of initial test failures).
- **`targetDuration` compatibility**: McGill sets store `targetDuration = mcgillRounds * mcgillHoldDuration` so existing code that reads `targetDuration` for duration estimates continues to work. UI components override the display to show "3x10s" instead of "30s".
- **Stale closure risk**: `McgillTimer` uses refs (`phaseRef`, `currentRoundRef`) to access current state inside `setInterval` callbacks. Using state directly would cause stale closures since the interval captures old values. This was the root cause of the original "round 4 of 3" bug in the Timer.tsx approach.
- **Set count override**: McGill exercises create exactly `rounds.length` sets (default 3) with varying round counts, bypassing the normal `numSets` calculation that would create uniform sets.
- **`completeWorkout` filter**: The history save filter checks `set.completed && (actualReps || actualDuration || (mcgillRounds && mcgillHoldDuration))`. All three branches are needed because McGill sets may have `actualDuration=0` if `targetDuration` was omitted (e.g., from custom workout builder). Any new code path that creates McGill sets must include `targetDuration` or the filter's McGill fallback will catch it.
- **`EditWorkoutModal`**: McGill sets display as read-only text ("3×10s per side") rather than editable number inputs, since editing individual rounds/hold durations doesn't map to a single number field.
