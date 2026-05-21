# Exercise Emoji Icons

## Overview

Each exercise in the app has a visually representative emoji icon (e.g., 🐸 for Frog Pumps, 🦸 for Superman) stored in the exercise data. The emoji is displayed before the exercise name in every view where exercises appear, making it easier to visually scan and identify exercises at a glance.

## How it works

1. The `Exercise` type includes a required `emoji: string` field
2. All 41 exercises in `exercises.json` have an assigned emoji
3. Components that have an `Exercise` object use `exercise.emoji` directly
4. Components that only have an `exerciseId` (e.g., from `WorkoutExercise`) use the `getExerciseEmoji(id)` helper or look up via `getExerciseById(id)?.emoji`
5. Emojis are rendered inline before the exercise name with a space separator: `{emoji} {name}`

## Key files

- `src/types/exercise.ts` — `Exercise` interface with the `emoji` field
- `src/data/exercises.json` — All 41 exercises with their emoji assignments
- `src/data/exerciseData.ts` — `getExerciseEmoji(id)` helper for views that only have an exercise ID

## Where emojis appear

- **Dashboard** — Next Workout exercise list
- **Exercise Library** — Exercise card headings
- **Calibration** — Current exercise name
- **Workout Execution** — Exercise heading (ExercisePhase), rest phase "Up Next" (RestPhase), intensity feedback prompt, exercise info modal (ExerciseModal)
- **Workout Complete** — Per-exercise performance, unlock progress, unlocked/retired milestones
- **History** — Workout card exercise list, workout detail modal, edit workout modal
- **Settings** — Excluded exercises list
- **Exercise Status** — Exercise name in status cards
- **Manual Workout Entry** — Exercise picker and added exercises list

## Gotchas

- The `WorkoutExercise` type (stored in IndexedDB history) does NOT include emoji — emojis are always looked up at render time from the exercise data to avoid a database migration.
- The `emoji` field is required on `Exercise`, so any test mocks creating `Exercise` objects must include it.
- Flag emojis (e.g., 🇧🇬 for Bulgarian Split Squat) are composed of two regional indicator codepoints and may not render on all platforms.
