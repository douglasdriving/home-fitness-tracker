# Upper Body Exercises

## Overview

A fourth muscle group, `upperBody`, plus 11 bodyweight/band upper body exercises in the exercise library. This is the data foundation for an upcoming Upper Body rotation day; the exercises are browsable in the Exercise Library now, but the rotation/generator/stretching wiring is a separate follow-on. Each upper body exercise carries a slot identity so the future generator can pick by movement pattern rather than least-recently-used order.

## How it works

1. **Muscle group**: `MuscleGroup` gains `'upperBody'`. Because `heavinessScore` and `StrengthLevels` are `Record<MuscleGroup, …>` (and several places index them by `MuscleGroup`), every existing exercise gained `upperBody: 0` and `StrengthLevels` gained an `upperBody` field. The value stays at its default — nothing selects or calibrates upper body work yet.
2. **Slot tagging**: Each upper body exercise has an optional `upperBodySlot` (`horizontal-pull` | `horizontal-push` | `vertical-pull` | `vertical-push`). The planned rotation is: horizontal pull every session, horizontal push every session, and slot 3 alternating vertical pull / vertical push.
3. **Display**: The Exercise Library renders all exercises (no unlock filtering in the list). An "Upper Body" filter chip filters by `muscleGroups.includes('upperBody')`. Progression chains (Push-Ups → Chair Dips / Feet-Elevated → Archer) use the existing `unlockRequirement` mechanism.

## Key files

- `src/types/exercise.ts` — `MuscleGroup` union and the `upperBodySlot` field on `Exercise`
- `src/types/user.ts` — `upperBody` key on `StrengthLevels`
- `src/data/exercises.json` — the 11 upper body exercises plus the `upperBody:0` migration on all existing entries
- `src/data/exerciseData.ts` — comment documenting the vertical-pull starter gap
- `src/pages/ExerciseLibrary.tsx` — "Upper Body" filter chip

## Gotchas

- **Vertical-pull starter gap**: Without a pull-up bar there is no no-equipment vertical-pull exercise. `band-lat-pulldown-001` (requires `elastic-band`) is the only pre-bar option, so a brand-new user with no band has no starter for that slot. The follow-on generator must handle this (fall back / skip slot 3a). Flagged in a comment in `exerciseData.ts`.
- **Starter minimum**: Upper body has 5 no-equipment, no-unlock starters (Doorway Rows, Inverted Rows, Incline Push-Ups, Push-Ups, Pike Push-Ups), satisfying the ≥3-starter rule even excluding band exercises.
- **`muscleGroups` stays `['upperBody']`** even for push-up variants that load the core — the secondary core load goes only into `heavinessScore.abs`, not the `muscleGroups` array, so `primaryMuscleGroup === muscleGroups[0]` holds.
- **Count is 11, not 10**: The originating issue's summary says "10" but its slot tables enumerate 11 fully-specified exercises; all 11 were implemented.
- **Data-only scope**: Rotation sequence, generator, and stretching still target only abs/glutes/lowerBack. The exhaustive `Record<MuscleGroup, …>` literals (`muscleGroupCounts`, `muscleGroupStretches`) gained placeholder `upperBody` entries purely to keep `tsc` happy.
