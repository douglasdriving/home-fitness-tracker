# Daily Rotation Workout Mode

## Overview

A shorter, muscle-group-focused workout mode that coexists with the existing full-body routine. Users choose between "Full Core Workout" (4 exercises, all muscle groups) and "Daily Focus Session" (3 exercises, one muscle group) from the Dashboard. The daily rotation mode cycles through abs, glutes, and lower back in sequence, with muscle-group-specific stretching (2-3 stretches instead of the full 8-stretch routine).

## How it works

1. **Mode selection**: Dashboard shows two equally-prominent cards. The Daily Focus card displays which muscle group is next in the rotation.
2. **Rotation tracking**: `getNextDailyRotationGroup()` scans workout history for the most recent `daily-rotation` entry and advances the sequence (abs → glutes → lowerBack → abs). First-time users start with abs.
3. **Workout generation**: `generateDailyRotationWorkout()` filters available exercises by `primaryMuscleGroup` (not the full `muscleGroups` array), sorts by least recently used, and selects the top 3. This prevents multi-tagged exercises from appearing in multiple rotation days. Set counts differ from full-body mode: 3 sets for standard exercises, 4 sets (2 per side) for bilateral exercises.
4. **Mode clearing**: Generating a workout in either mode deletes any pending/in-progress workout from the other mode.
5. **Workout execution**: Reuses the existing `WorkoutExecution` flow unchanged. The `targetMuscleGroup` is passed through to the stretching navigation.
6. **Stretching**: `StretchingRoutine` receives `targetMuscleGroup` via location state. When present, it filters to 2-3 muscle-group-specific stretches instead of the full 8-stretch routine.
7. **History**: `completeWorkout()` copies `workoutMode` and `targetMuscleGroup` from the workout to the history entry, enabling rotation tracking and mode-aware display.

## Key files

- `src/lib/workout-generator.ts` — `generateDailyRotationWorkout()` and `getNextDailyRotationGroup()` functions
- `src/store/workout-store.ts` — `generateDailyRotationWorkout` store action with rotation tracking and mode clearing
- `src/pages/Dashboard.tsx` — Two-mode selection UI with next rotation group indicator
- `src/pages/StretchingRoutine.tsx` — Muscle-group filtering via `activeRoutine` useMemo
- `src/data/stretchingData.ts` — `muscleGroupStretches` mapping and `getStretchesForMuscleGroup()` helper
- `src/types/workout.ts` — `workoutMode` and `targetMuscleGroup` fields on `Workout` and `WorkoutHistoryEntry`
- `src/pages/WorkoutExecution.tsx` — Passes `targetMuscleGroup` to stretching navigation state

## Gotchas

- **Rotation is history-based**: The next muscle group is derived from workout history, not stored separately. If history is cleared, rotation resets to abs.
- **Set count asymmetry**: Daily rotation uses 3/4 sets (standard/bilateral), while full-body uses 4/3 sets. This is intentional per the issue spec.
- **Stretch state persistence**: `StretchState` in localStorage includes `targetMuscleGroup` to ensure resuming a daily-rotation stretch session still filters correctly.
- **Backward compatibility**: Both new fields are optional. Old workouts without `workoutMode` are treated as full-body and excluded from rotation tracking queries.
- **Primary vs secondary muscle groups**: Each exercise has a `primaryMuscleGroup` field that determines which rotation day it belongs to. The `muscleGroups` array still lists all targeted groups (used by full-body mode for balanced selection). This prevents exercises like Dead Bug (abs + lowerBack) from appearing in both the abs and lowerBack rotation days.
- **Starter exercise minimums**: Each muscle group has at least 3 starter exercises (no unlock requirement, no equipment needed) to ensure daily rotation works for new users. Glutes starters: Glute Bridge, Donkey Kicks, Frog Pumps. Lower back starters: Bird Dog, Good Morning, Back Extension Hold.
