# Custom Workout Builder

## Overview

A development-only tool in the Settings page that allows developers to manually create workouts by selecting specific exercises and configuring set counts. This bypasses the algorithmic workout generator, making it easy to test specific exercises, edge cases, or UI flows without repeatedly regenerating workouts.

## How it works

1. Developer navigates to Settings and scrolls to "Development Tools" (only visible when `import.meta.env.MODE === 'development'`)
2. Developer selects 1-4 exercises from a scrollable checkbox list showing all exercises (including locked/equipment-gated ones)
3. Developer chooses sets per exercise (1-6) via a dropdown
4. Clicking "Create Custom Workout" triggers `handleCreateCustomWorkout` (in `CustomWorkoutBuilder.tsx`), which validates the selection, then delegates all construction to `buildCustomWorkout(exerciseIds, setsCount)` in `src/lib/custom-workout-builder.ts`:
   - Deletes any existing pending/in-progress workouts from the database
   - Queries workout history from Dexie for progressive overload
   - For each exercise, looks up last performance and intensity feedback via `findLastPerformanceWithFeedback()`
   - Applies the same progression logic as the normal workout generator: `calculateMcgillProgression()` for McGill exercises, `calculateProgressionWithFeedback()` for standard exercises, `convertLegacyToMcgill()` for legacy side plank history
   - Falls back to exercise defaults only when no history exists
   - Calculates rest times from exercise `heavinessScore` and estimated duration via `calculateEstimatedDuration`
   - Saves the `Workout` object to Dexie (`db.workouts.add`) and returns it
   - Back in the component, `loadWorkouts()` refreshes the Zustand workout store
   - Navigates to Dashboard (`/`) where the workout appears as "Next Workout"
5. The custom workout follows the standard flow: Dashboard -> WorkoutExecution -> StretchingRoutine -> WorkoutComplete -> History

## Key files

| File | Role |
|---|---|
| `src/components/settings/CustomWorkoutBuilder.tsx` | Dev-only exercise-picker UI; validation, loading state, `loadWorkouts()` + navigation |
| `src/components/settings/DeveloperTools.tsx` | Dev-mode wrapper section that hosts `CustomWorkoutBuilder` |
| `src/lib/custom-workout-builder.ts` | `buildCustomWorkout(exerciseIds, setsCount)`: extracted DB/progression construction, returns the persisted `Workout` |
| `src/lib/workout-generator.ts` | Barrel re-exporting `calculateEstimatedDuration` (from `workout-duration.ts`) and `findLastPerformanceWithFeedback` (from `workout-history-helpers.ts`) |
| `src/lib/progression-calculator.ts` | `calculateProgressionWithFeedback`, `calculateMcgillProgression`, `convertLegacyToMcgill` for progressive overload |
| `src/data/exerciseData.ts` | `allExercises` array and `getExerciseById` for exercise lookup |
| `src/types/workout.ts` | `Workout`, `WorkoutExercise`, and `Set` type definitions |
| `src/store/workout-session-slice.ts` | `loadWorkouts()` to refresh current workout after creation (composed into `useWorkoutStore`) |
| `src/lib/custom-workout-builder.test.ts` | Unit tests for `buildCustomWorkout` (standard/McGill/multi-exercise branches) |

## Gotchas

- **McGill protocol exercises** need `mcgillRounds` and `mcgillHoldDuration` on their sets instead of `targetReps`/`targetDuration`. When the user picks more sets than the McGill `rounds` array has entries, the builder cycles the last rounds value.
- **Existing pending workouts are deleted** before creating the new one. Without this, the Dashboard would show the old workout instead of the new custom one.
- **`loadWorkouts()` must be called** after the DB write or the newly created workout won't appear on the Dashboard (it reads from the Zustand store, not directly from the DB).
- Exercise defaults may be undefined (`defaultReps`, `defaultDuration`), so fallbacks of 10 reps and 30 seconds are used.
- **Progressive overload** is applied using the same logic as the normal workout generator. If previous history exists for an exercise, the builder uses feedback-based progression instead of defaults. This means repeated custom workouts with the same exercise will produce different targets based on intensity feedback.
