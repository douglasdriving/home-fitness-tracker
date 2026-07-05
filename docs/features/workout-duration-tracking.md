# Workout Duration Tracking

## Overview

Tracks the elapsed time of a workout from initial start to completion. The duration is calculated when a workout is completed and stored in history entries. The system handles app closures and resumes by preserving the original start timestamp across `startWorkout()` calls.

## How it works

1. User clicks "Start" on Dashboard -> `startWorkout()` sets `startedDate` to `Date.now()` and transitions status from `pending` to `in-progress`
2. User closes and reopens app mid-workout -> Dashboard shows "Continue" button, which calls `startWorkout()` again
3. `startWorkout()` detects status is already `in-progress` and preserves the existing `startedDate` (does not overwrite)
4. User completes workout -> `completeWorkout()` calculates `totalDuration = (completedDate - startedDate) / 60000` in minutes
5. Duration is stored in `WorkoutHistoryEntry.totalDuration` and displayed on History page

Fallback: if `startedDate` is missing (shouldn't happen), `generatedDate` is used instead.

## Key files

| File | Role |
|---|---|
| `src/store/workout-session-slice.ts` | `startWorkout()` (line ~184) sets/preserves `startedDate`; `completeWorkout()` (line ~240) calculates duration (composed into `useWorkoutStore`) |
| `src/types/workout.ts` | `Workout.startedDate`, `Workout.generatedDate`, `WorkoutHistoryEntry.totalDuration` type definitions |
| `src/pages/Dashboard.tsx` | "Start"/"Continue" button calls `startWorkout()` for both cases |
| `src/pages/History.tsx` | Displays `totalDuration` in workout history entries |
| `src/store/workout-store.test.ts` | Unit tests for start, resume, multiple resumes, and duration calculation |

## Gotchas

- `startWorkout()` is called for both fresh starts AND resumes from the Dashboard. The guard `workout.status === 'in-progress'` inside the store is what prevents overwriting `startedDate` on resume.
- Duration reflects wall-clock time (including time the app was closed), not active exercise time. This is intentional.
- `db.workouts.put()` does a full document replace, so the spread `...workout` carries forward all existing fields including `startedDate` from the database read.
