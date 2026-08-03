# Pre-Workout Warmup

## Overview

A short (~2–4 min) dynamic warmup that runs **before** each workout, parameterized
by the session's muscle group. It is the pre-session mirror of the post-workout
stretching routine, embodying the principle *dynamic movement before, static holds
after* — cold static stretching slightly reduces strength output, so the pre-session
block delivers movement rehearsal and joint priming instead.

## How it works

1. **Start branch**: On the Dashboard, `handleStartWorkout` always runs the
   warmup. When starting a *fresh* workout it
   navigates to `/warmup` with `{ workoutId, targetMuscleGroup }` in location
   state; otherwise it goes straight to `/workout`. The warmup is the first
   *stage* of the workout, not a separate session — so resuming an in-progress
   workout returns the user to wherever they left off: if a warmup for that
   workout is still persisted, `Continue` re-enters `/warmup`; otherwise it goes
   to `/workout`.
2. **Move selection**: `WarmupRoutine` calls `getWarmupForMuscleGroup(targetMuscleGroup)`.
   Each group maps to an ordered set of moves (regional mobility → activation →
   pattern rehearsal); a `genericWarmup` full-body primer is returned when no
   `targetMuscleGroup` is present (full-body mode).
3. **Execution**: Each move is driven by the shared `Timer` (count-down by
   `duration`). Users can complete via the timer, "Skip This Exercise" to advance,
   or "Skip All" to jump straight to the workout. After the last move the app
   navigates to `/workout` automatically. No history is written — the workout has
   not started yet.
4. **Persistence**: In-progress state (current index, completed set, `workoutId`,
   `targetMuscleGroup`) is saved to localStorage under `warmupRoutineState`,
   parallel to `stretchRoutineState`. There is **no** separate "warmup in
   progress" surface on the Dashboard — because the warmup is part of the
   workout, the in-progress *workout* card is the single resume point. Resuming
   reads the persisted warmup state (matched on `workoutId`) and re-enters the
   warmup stage; `WarmupRoutine`'s own restore is additionally gated on matching
   `targetMuscleGroup`. State is cleared on completion and Skip All.

## Key files

- `src/data/warmupData.ts` — `WarmupExercise` type, per-group warmup arrays,
  `muscleGroupWarmups` map, `genericWarmup`, and `getWarmupForMuscleGroup()` helper
- `src/pages/WarmupRoutine.tsx` — the `/warmup` page (timer, progress, skip, persistence)
- `src/pages/Dashboard.tsx` — Start branching + resuming the warmup stage of an in-progress workout (`getActiveWarmupState`)
- `src/App.tsx` — `/warmup` route registration

## Gotchas

- **`WarmupExercise` is structurally compatible with `StretchExercise`** so the
  existing `Timer` and `StretchModal` are reused unchanged. Every move is
  timer-driven by `duration`; rep-based moves (bird dogs, leg swings, hinges) carry
  an optional `reps` count used for display only, with a `duration` that
  approximates the rep work.
- **Preference defaults to true via `?? true`** at every read site — existing
  profiles need no migration.
- **No history/`totalDuration` impact** — unlike stretching, the warmup never
  touches `db.history`. It only clears its localStorage key and navigates.
- **`WorkoutExecution` reads `currentWorkout` from the Zustand store**, not from
  location state, so warmup→workout navigation carries no state for execution
  correctness; `targetMuscleGroup` is forwarded only for symmetry.
- Colors are orange/amber to visually distinguish the pre-session warmup from the
  purple post-session stretching.
