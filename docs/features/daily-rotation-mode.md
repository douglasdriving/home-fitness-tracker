# Daily Rotation Workout Mode

## Overview

A shorter, muscle-group-focused workout mode that coexists with the existing full-body routine. Users choose between "Full Core Workout" (4 exercises, all muscle groups) and "Daily Focus Session" (3 exercises, one muscle group) from the Dashboard. The daily rotation mode cycles through abs, glutes, and upper body in sequence, with muscle-group-specific stretching (2-3 stretches instead of the full 8-stretch routine).

## How it works

1. **Mode selection**: Dashboard shows two equally-prominent cards. The Daily Focus card displays which muscle group is next in the rotation.
2. **Rotation tracking**: `getNextDailyRotationGroup()` scans workout history for the most recent `daily-rotation` entry and advances the sequence (abs → glutes → upperBody → abs). First-time users start with abs.
3. **Workout generation**: `generateDailyRotationWorkout()` filters available exercises by `primaryMuscleGroup` (not the full `muscleGroups` array), sorts by least recently used, and selects the top 3. This prevents multi-tagged exercises from appearing in multiple rotation days. Set counts differ from full-body mode: 3 sets for standard exercises, 2 sets for bilateral exercises. **Upper body is the exception**: instead of generic LRU it fills 3 role slots — Slot 1 horizontal-pull, Slot 2 horizontal-push, Slot 3 alternating vertical-pull/vertical-push (LRU within each slot). The Slot 3 variant is derived from history via `getNextUpperBodyVerticalSlot()` and flips each session; it falls back to the other vertical slot when the intended pool is empty (e.g. band-less users have no vertical-pull exercise).
4. **Mode clearing**: Generating a workout in either mode deletes any pending/in-progress workout from the other mode.
5. **Warmup**: When the `autoShowWarmup` preference is on (default), starting a *fresh* workout routes through `WarmupRoutine` (`/warmup`) before `WorkoutExecution`, carrying `workoutId` and `targetMuscleGroup` in location state. `getWarmupForMuscleGroup()` returns muscle-group-specific dynamic movement (abs → Cat-Cow Flow, Trunk Rotations, Hip Circles, Slow Bird Dogs; glutes → Leg Swings, Hip Circles, Glute Bridges, Hinges; lowerBack → Cat-Cow Flow, Hip Circles, Hinges; upperBody → Arm Circles, Scapular Push-ups, Incline Push-ups, Band Pull-Aparts), or a generic full-body primer when no `targetMuscleGroup` is present. The principle is *dynamic movement before, static holds after*. Skip All and finishing the last move both navigate to `/workout`; resuming an already in-progress workout bypasses the warmup.
6. **Workout execution**: Reuses the existing `WorkoutExecution` flow unchanged. The `targetMuscleGroup` is passed through to the stretching navigation.
7. **Stretching**: `StretchingRoutine` receives `targetMuscleGroup` via location state. When present, `getStretchesForMuscleGroup()` returns the 3 muscle-group-specific stretches (from `muscleGroupStretches`) instead of the full routine. Each set follows the principle of *stretching a muscle by moving opposite to its action*: abs → Cobra, Lying Spinal Twist, Side-Bend; glutes → Figure-Four, Lying Spinal Twist, Hip Flexor; lowerBack → Child's Pose, Lying Spinal Twist, Figure-Four; upperBody → Doorway Pec, Overhead Lat, Overhead Triceps.
8. **History**: `completeWorkout()` copies `workoutMode` and `targetMuscleGroup` from the workout to the history entry, enabling rotation tracking and mode-aware display.

## Key files

- `src/lib/workout-generator.ts` — `generateDailyRotationWorkout()` and `getNextDailyRotationGroup()` functions
- `src/store/workout-store.ts` — `generateDailyRotationWorkout` store action with rotation tracking and mode clearing
- `src/pages/Dashboard.tsx` — Two-mode selection UI with next rotation group indicator
- `src/pages/StretchingRoutine.tsx` — Muscle-group filtering via `activeRoutine` useMemo
- `src/pages/WarmupRoutine.tsx` — Pre-workout dynamic warmup, muscle-group filtering via `activeRoutine` useMemo
- `src/data/stretchingData.ts` — `muscleGroupStretches` mapping and `getStretchesForMuscleGroup()` helper
- `src/data/warmupData.ts` — `muscleGroupWarmups` mapping, `genericWarmup`, and `getWarmupForMuscleGroup()` helper
- `src/types/workout.ts` — `workoutMode` and `targetMuscleGroup` fields on `Workout` and `WorkoutHistoryEntry`
- `src/pages/WorkoutExecution.tsx` — Passes `targetMuscleGroup` to stretching navigation state

## Gotchas

- **Rotation is history-based**: The next muscle group is derived from workout history, not stored separately. If history is cleared, rotation resets to abs.
- **Set count asymmetry**: Daily rotation uses 3/2 sets (standard/bilateral), while full-body uses 4/3 sets. This is intentional to balance total work units: bilateral exercises are done on each side, so 2 sets = 4 work units, making them comparable to standard exercises' 3 sets.
- **Stretch state persistence**: `StretchState` in localStorage includes `targetMuscleGroup` to ensure resuming a daily-rotation stretch session still filters correctly.
- **Stretch display order**: `getStretchesForMuscleGroup()` maps over the IDs in `muscleGroupStretches[group]` (not `stretchingRoutine.filter(...)`), so the displayed sequence follows the order declared in the mapping — not the order stretches happen to sit in the `stretchingRoutine` array. Changing the mapping order changes the on-screen order.
- **Backward compatibility**: Both new fields are optional. Old workouts without `workoutMode` are treated as full-body and excluded from rotation tracking queries.
- **Primary vs secondary muscle groups**: Each exercise has a `primaryMuscleGroup` field that determines which rotation day it belongs to. The `muscleGroups` array still lists all targeted groups (used by full-body mode for balanced selection). This prevents exercises like Dead Bug (abs + lowerBack) from appearing in both the abs and lowerBack rotation days.
- **Starter exercise minimums**: Each muscle group has at least 3 starter exercises (no unlock requirement, no equipment needed) to ensure daily rotation works for new users. Glutes starters: Glute Bridge, Donkey Kicks, Frog Pumps. Lower back starters: Bird Dog, Good Morning, Back Extension Hold.
- **Upper body replaced lower back in the rotation**: The sequence is abs → glutes → upperBody. Lower back exercises remain in the library and full-body mode but no longer get their own rotation day. A legacy history whose last rotation day was `lowerBack` wraps gracefully to abs (`indexOf` returns -1).
- **Upper body Slot 3 alternation is history-derived**: `getNextUpperBodyVerticalSlot()` reads the vertical slot actually present in the most recent upper body session and flips it — basing it on the real prior exercise (not a stored intent) keeps alternation correct even after equipment-driven fallbacks. First-ever session defaults to vertical-push because its starter (pike push-ups) needs no equipment, whereas vertical-pull is band-only.
