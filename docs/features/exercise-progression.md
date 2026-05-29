# Exercise Progression

## Overview

The exercise progression system manages how exercises are unlocked and retired based on user performance. Each exercise can have an unlock requirement (reaching a performance threshold on a prerequisite exercise) and a retirement threshold (a performance level at which the exercise is considered mastered and removed from workouts). This creates progression chains where users advance through increasingly difficult exercises.

## How it works

Exercises are defined in `exercises.json` with optional `unlockRequirement` and `retirementThreshold` fields. When a workout is completed, `checkWorkoutAchievements` evaluates the current workout's performance against all exercises' unlock and retirement thresholds. Only performance from the current workout triggers unlocks/retirements — historical performance alone does not.

Unlocked and retired exercise IDs are persisted in the user profile's `exerciseAchievements` object (stored in localStorage via Zustand). The workout generator uses `getAvailableExercises` to filter the exercise pool to only active (unlocked, not retired) exercises.

### Progression chains by muscle group

- **Abs**: Crunches → Flutter Kicks → Leg Raises → ... (linear chain with branches)
- **Glutes**: Glute Bridge → Hip Thrust → ... (with band exercise variants)
- **Lower Back**: Bird Dog → Good Morning → {Superman, Back Extension Hold → Reverse Hyperextension}

## Key files

- `src/data/exercises.json` — Exercise definitions with unlock requirements and retirement thresholds
- `src/data/exerciseData.ts` — Exports `allExercises`, `getExerciseById`, `getExerciseEmoji`
- `src/lib/achievement-tracker.ts` — `checkWorkoutAchievements`, `isExerciseUnlocked`, `shouldRetireExercise`, `getAvailableExercises`
- `src/lib/workout-generator.ts` — Uses available exercises to build workouts
- `src/store/user-store.ts` — Persists `exerciseAchievements` (unlocked/retired lists)
- `docs/EXERCISE-PROGRESSION.md` — Full reference of all exercises, heaviness scores, and unlock chains

## Gotchas

- Unlock/retirement checks only consider the **current workout's** performance, not cumulative history. A user who did 25 crunches last week but only 10 this week won't trigger the 20-rep unlock threshold.
- An exercise cannot be both unlocked and retired in the same workout — unlock takes precedence for newly unlocked exercises.
- Removing an exercise requires updating any other exercise that references it in `unlockRequirement`, plus seed data and documentation. Historical workout data stores `exerciseName` as a string so removed exercises still display correctly in History and WorkoutComplete.
- Some exercises share an unlock prerequisite (fork points). For example, Good Morning at 16 reps unlocks both Superman and Back Extension Hold simultaneously.
- Unlock thresholds are set to ≤1.5x the prerequisite exercise's default value, ensuring smooth progression pacing when transitioning to newly unlocked exercises.
