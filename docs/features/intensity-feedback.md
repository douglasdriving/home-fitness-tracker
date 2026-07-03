# Intensity Feedback & Progression

## Overview

After completing all sets of an exercise, users rate its difficulty on a 1-5 scale. This feedback directly controls the next workout's target for that exercise: "too easy" increases the target, "too hard" decreases it, and "just right" applies gentle progression.

## How It Works

1. User completes all sets of an exercise in `WorkoutExecution`
2. `IntensityFeedback` component appears, user selects a rating (1-5), which immediately proceeds to the next exercise or completes the workout (no separate submit step)
3. Rating is stored in a React state map keyed by **exercise ID** (not index)
4. When the last exercise is rated, `completeWorkout(feedbackMap)` is called
5. `workout-store.ts` maps each exercise to its feedback by exercise ID and saves to IndexedDB history
6. Next workout generation: `findLastPerformanceWithFeedback()` retrieves the most recent performance + feedback for each exercise from history
7. `calculateProgressionWithFeedback()` applies the adjustment multiplier to compute the new target

## Feedback Scale & Adjustments

| Rating | Label | Adjustment |
|--------|-------|------------|
| 1 | Way too easy | +20% |
| 2 | A bit too easy | +10% |
| 3 | Just right | +5% |
| 4 | A bit too hard | -10% |
| 5 | Way too hard | -20% |

For reps: minimum change of +/-1 rep, floor of 5 reps.
For timed: rounds to nearest 5 seconds, minimum change of +/-5s, floor of 10s.

## Key Files

- `src/pages/WorkoutExecution.tsx` — Collects feedback via `handleIntensityFeedback`, passes ID-keyed map to store
- `src/components/workout/IntensityFeedback.tsx` — Rating UI component (1-5 scale)
- `src/store/workout-store.ts` — `completeWorkout()` saves feedback to history entries by exercise ID
- `src/lib/workout-history-helpers.ts` — `findLastPerformanceWithFeedback()` retrieves feedback from history
- `src/lib/exercise-set-builder.ts` — `buildExerciseSets()` applies the feedback-based progression (both re-exported/consumed via the `src/lib/workout-generator.ts` barrel and its generators)
- `src/lib/progression-calculator.ts` — `calculateProgressionWithFeedback()` computes adjusted targets
- `src/components/history/WorkoutDetailModal.tsx` — Displays saved feedback per exercise in history detail view
- `src/types/workout.ts` — `IntensityRating` type (1-5), `CompletedExercise.intensityFeedback` field

## Gotchas

- The feedback map uses **exercise IDs** as keys, not array indices. This was changed from index-based keying which caused a bug where feedback wasn't reliably saved.
- When feedback is missing from legacy history data (pre-feature), the system defaults to rating 3 (+5%) and logs a console warning. This is expected for old workouts.
- Exercise rotation means the same exercise may not appear in consecutive workouts. The system searches the full history (newest-first) to find the last time each exercise was performed.
