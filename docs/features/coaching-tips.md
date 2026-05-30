# Coaching Tips

## Overview

Persistent coaching tips display directly on the workout screen during exercise execution. Unlike the full exercise description (hidden behind the "How to do this exercise" modal), coaching tips are always visible under the exercise title, providing real-time form cues and safety notes without requiring user interaction.

## How it works

Each exercise can optionally have a `coachingTip` string in its data definition. During workout execution, `ExercisePhase` checks if the current exercise has a coaching tip and renders it below the exercise title and muscle group badges.

Tips are styled in two variants:
- **Safety warnings** (tip contains `⚠️`): Red background (`bg-red-500/10 border-red-500/30`) to signal danger
- **Standard tips** (all others): Secondary color background (`bg-secondary/10 border-secondary/30`) with a `💡` prefix icon

The tip persists throughout all sets of the exercise and requires no scrolling or interaction to view.

## Exercises with coaching tips

| Exercise | ID | Type |
|---|---|---|
| Reverse Crunches | `reverse-crunches-001` | Standard (form cue) |
| Hollow Body Hold | `hollow-body-hold-001` | Safety warning |
| Mountain Climbers | `mountain-climbers-001` | Standard (equipment note) |
| Fire Hydrants | `fire-hydrants-001` | Standard (equipment note) |
| Single-Leg Romanian Deadlift | `single-leg-rdl-001` | Standard (equipment reminder) |

## Key files

| File | Role |
|---|---|
| `src/types/exercise.ts` | `Exercise` interface with optional `coachingTip` field |
| `src/data/exercises.json` | Exercise definitions including coaching tip strings |
| `src/components/workout/ExercisePhase.tsx` | Renders the coaching tip block during workout execution |
| `src/components/workout/ExercisePhase.test.tsx` | Unit tests for tip rendering and styling |

## Adding tips to new exercises

1. Add a `"coachingTip"` field to the exercise entry in `src/data/exercises.json`
2. For safety warnings, start the tip with `⚠️` to trigger red styling
3. No code changes needed -- the component picks up the field automatically

## Gotchas

- The coaching tip renders inside the Exercise Info card alongside the title and muscle group badges, not as a separate card. This keeps it co-located with the exercise identity.
- Bilateral exercises (per-side) have a separate info box above the Exercise Info card. Both can appear simultaneously (e.g., Fire Hydrants is bilateral AND has a coaching tip).
- Tips should be concise (1-2 lines at `text-sm` on 375px width) to avoid pushing the target display below the fold on mobile.
