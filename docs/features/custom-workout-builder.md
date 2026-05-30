# Custom Workout Builder

## Overview

A development-only tool in the Settings page that allows developers to manually create workouts by selecting specific exercises and configuring set counts. This bypasses the algorithmic workout generator, making it easy to test specific exercises, edge cases, or UI flows without repeatedly regenerating workouts.

## How it works

1. Developer navigates to Settings and scrolls to "Development Tools" (only visible when `import.meta.env.MODE === 'development'`)
2. Developer selects 1-4 exercises from a scrollable checkbox list showing all exercises (including locked/equipment-gated ones)
3. Developer chooses sets per exercise (1-6) via a dropdown
4. Clicking "Create Custom Workout" triggers `handleCreateCustomWorkout`:
   - Deletes any existing pending/in-progress workouts from the database
   - Builds `WorkoutExercise[]` with proper sets based on exercise type (reps, timed, or McGill protocol)
   - Calculates rest times from exercise `heavinessScore` and estimated duration via `calculateEstimatedDuration`
   - Saves the `Workout` object to Dexie (`db.workouts.add`)
   - Calls `loadWorkouts()` to refresh the Zustand workout store
   - Navigates to Dashboard (`/`) where the workout appears as "Next Workout"
5. The custom workout follows the standard flow: Dashboard -> WorkoutExecution -> StretchingRoutine -> WorkoutComplete -> History

## Key files

| File | Role |
|---|---|
| `src/pages/Settings.tsx` | Custom workout builder UI and `handleCreateCustomWorkout` handler |
| `src/lib/workout-generator.ts` | Exports `calculateEstimatedDuration` used for duration estimation |
| `src/data/exerciseData.ts` | `allExercises` array and `getExerciseById` for exercise lookup |
| `src/types/workout.ts` | `Workout`, `WorkoutExercise`, and `Set` type definitions |
| `src/store/workout-store.ts` | `loadWorkouts()` to refresh current workout after creation |
| `src/db/db.ts` | Dexie database instance for persistence |
| `src/pages/Settings.test.tsx` | Unit tests for workout building logic |

## Gotchas

- **McGill protocol exercises** need `mcgillRounds` and `mcgillHoldDuration` on their sets instead of `targetReps`/`targetDuration`. When the user picks more sets than the McGill `rounds` array has entries, the builder cycles the last rounds value.
- **Existing pending workouts are deleted** before creating the new one. Without this, the Dashboard would show the old workout instead of the new custom one.
- **`loadWorkouts()` must be called** after the DB write or the newly created workout won't appear on the Dashboard (it reads from the Zustand store, not directly from the DB).
- Exercise defaults may be undefined (`defaultReps`, `defaultDuration`), so fallbacks of 10 reps and 30 seconds are used.
