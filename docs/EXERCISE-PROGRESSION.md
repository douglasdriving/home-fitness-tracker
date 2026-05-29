# Exercise Progression System

This document describes the exercise unlock and retirement system that creates a progression path for users as they get stronger.

## Overview

Instead of abstract strength scores, the app uses **concrete achievements** tied to specific exercises:

- **Unlocks:** Complete a specific threshold to unlock a harder exercise (e.g., "Complete a 60-second Side Plank → Unlock Hollow Body Hold")
- **Retirements:** When you exceed a threshold for an exercise, it's auto-retired as "mastered" (e.g., "Complete 50 Crunches → Crunches retired")

## Exercise Categories

### ABS Exercises

| Exercise | Heaviness | Unlock Requirement | Retires At |
|----------|-----------|-------------------|------------|
| Crunches | 3 | — | 50 reps |
| Toe Touches | 4 | — | 50 reps |
| Dead Bug | 5 | — | 35 reps |
| Plank | 5 | — | 120s |
| Reverse Crunches | 5 | — | 45 reps |
| Flutter Kicks | 6 | 40 Crunches | 90s |
| Bicycle Crunches | 6 | 30 Toe Touches | 45 reps |
| Plank Shoulder Taps | 6 | 60s Plank | 90s |
| Side Plank | 6 | 25 Dead Bug | — |
| Mountain Climbers | 7 | 30 Reverse Crunches | 90s |
| Leg Raises | 7 | 45s Flutter Kicks | 40 reps |
| V-Ups | 8 | 25 Leg Raises | 35 reps |
| Hollow Body Hold | 9 | 60s Side Plank | 90s |
| Dragon Flag (Tuck) | 10 | 20 V-Ups | — |

**Unlock Chains:**
- Crunches → Flutter Kicks → Leg Raises → V-Ups → Dragon Flag
- Toe Touches → Bicycle Crunches
- Dead Bug → Side Plank → Hollow Body Hold
- Plank → Plank Shoulder Taps
- Reverse Crunches → Mountain Climbers

### GLUTES Exercises

| Exercise | Heaviness | Unlock Requirement | Retires At |
|----------|-----------|-------------------|------------|
| Glute Bridge | 4 | — | 50 reps |
| Band Clamshells | 4 | — | 40 reps |
| Donkey Kicks | 5 | — | 40 reps |
| Fire Hydrants (band) | 5 | — | 40 reps |
| Band Lateral Walk | 5 | — | 40 reps |
| Frog Pumps | 5 | 35 Glute Bridges | 50 reps |
| Curtsy Lunge | 6 | 30 Band Clamshells | 40 reps |
| Single-Leg Glute Bridge | 6 | 30 Donkey Kicks | 30 reps |
| Band Glute Bridge | 6 | 30 Fire Hydrants | — |
| Single-Leg Romanian DL | 7 | 30 Band Lateral Walk | 35 reps |
| Hip Thrust | 7 | 35 Frog Pumps | 40 reps |
| Bulgarian Split Squat | 8 | 20 Single-Leg Glute Bridge | 30 reps |
| Nordic Curl (Assisted) | 9 | 20 Bulgarian Split Squat | — |

**Unlock Chains:**
- Glute Bridge → Frog Pumps → Hip Thrust
- Band Clamshells → Curtsy Lunge
- Donkey Kicks → Single-Leg Glute Bridge → Bulgarian Split Squat → Nordic Curl
- Fire Hydrants → Band Glute Bridge
- Band Lateral Walk → Single-Leg Romanian DL

### LOWER BACK Exercises

| Exercise | Heaviness | Unlock Requirement | Retires At |
|----------|-----------|-------------------|------------|
| Bird Dog | 4 | — | 35 reps |
| Good Morning | 6 | 25 Bird Dog | 40 reps |
| Back Extension Hold | 7 | 30 Good Morning | 90s |
| Superman | 8 | 30 Good Morning | 35 reps |
| Reverse Hyperextension | 8 | 60s Back Extension Hold | 35 reps |

**Unlock Chains:**
- Bird Dog → Good Morning → Superman
- Bird Dog → Good Morning → Back Extension Hold → Reverse Hyperextension

## How It Works

### Achievement Checking

After each workout completion, the system:
1. Checks if any exercise performance meets an unlock threshold
2. Checks if any exercise performance meets a retirement threshold
3. Displays achievements (unlocks/retirements) on the WorkoutComplete page

### Exercise Filtering

When generating workouts:
1. **Locked exercises** are excluded (haven't met unlock requirement)
2. **Retired exercises** are excluded (auto-mastered)
3. **User-excluded exercises** are excluded (manual preference)

### User Interface

- **Exercise Status page** (replaces Progress): Shows active, locked (with progress), and retired exercises
- **WorkoutComplete page**: Shows per-exercise progression data, PB tracking, and any unlocks/retirements that occurred
- **Restore option**: Users can manually restore retired exercises if desired

## Data Model

### Exercise Type Extensions

```typescript
interface UnlockRequirement {
  exerciseId: string;    // Which exercise must be completed
  type: 'reps' | 'timed';
  value: number;         // Threshold value
}

interface RetirementThreshold {
  type: 'reps' | 'timed';
  value: number;         // Threshold value
}
```

### User Profile Extensions

```typescript
interface ExerciseAchievements {
  unlockedExercises: string[];   // IDs of exercises unlocked
  retiredExercises: string[];    // IDs of exercises auto-retired
}
```

## Key Files

- `src/types/exercise.ts` - Exercise type definitions
- `src/types/user.ts` - User profile with achievements
- `src/data/exercises.json` - All exercise data with unlock/retirement thresholds
- `src/lib/achievement-tracker.ts` - Core logic for checking achievements
- `src/pages/ExerciseStatus.tsx` - Exercise status UI
- `src/pages/WorkoutComplete.tsx` - Post-workout progression data and integrated achievements
