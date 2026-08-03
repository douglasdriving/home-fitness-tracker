# Frontend Rules

## Stack
React 18 + TypeScript + Vite, Zustand (state), Dexie (IndexedDB), Tailwind CSS, vite-plugin-pwa

## Architecture

### Data Flow
```
User Action → Zustand Store → Dexie (IndexedDB) + localStorage
                    ↓
            React Components (re-render on state change)
```

### Zustand Stores
- `src/store/user-store.ts` - User profile, calibration status, strength levels (syncs to localStorage)
- `src/store/workout-store.ts` - Thin composition that spreads the two slices below into a single `useWorkoutStore` (unchanged public API/shape)
- `src/store/workout-session-slice.ts` - `createWorkoutSessionSlice`: active-session lifecycle (`currentWorkout`/`isLoading` + `loadWorkouts`, `generateNewWorkout`, `generateDailyRotationWorkout`, `startWorkout`, `updateSet`, `updateWorkoutPosition`, `completeWorkout`, `discardWorkout`)
- `src/store/workout-history-slice.ts` - `createWorkoutHistorySlice`: history CRUD (`workoutHistory` + `loadHistory`, `deleteHistoryEntry`, `updateHistoryEntry`, `addManualWorkout`; includes legacy intensity-score backfill + strength recompute)

### Core Algorithm Files
- `src/lib/workout-generator.ts` - Thin public barrel re-exporting the generation API (`generateWorkout`, `generateDailyRotationWorkout`, `getNextDailyRotationGroup`, `calculateEstimatedDuration`, `getExerciseLastUsed`, `findLastPerformanceWithFeedback`)
- `src/lib/full-body-generator.ts` - `generateWorkout`: the 3–4 exercise all-muscle-group generator (4th-exercise balancing, time-constraint trimming)
- `src/lib/daily-rotation-generator.ts` - `generateDailyRotationWorkout` + `getNextDailyRotationGroup`: single-muscle-group rotation-day generation and rotation sequencing
- `src/lib/rotation-day-slots.ts` - Role-slot selectors for rotation days (`selectUpperBodyExercises`, `selectPosteriorChainExercises`, `getNextPosteriorChainSlot3Category`)
- `src/lib/exercise-set-builder.ts` - `buildExerciseSets`: shared per-exercise set construction (McGill → ladder → standard) used by both generators
- `src/lib/custom-workout-builder.ts` - `buildCustomWorkout(exerciseIds, setsCount)`: builds + persists a pending custom full-body workout (McGill vs standard progression) for the dev-only Custom Workout Builder
- `src/lib/workout-duration.ts` - `calculateEstimatedDuration`: estimated workout length in minutes
- `src/lib/workout-history-helpers.ts` - History lookups (`getExerciseLastUsed`, `findLastPerformanceWithFeedback`)
- `src/lib/progression-calculator.ts` - Handles strength calculations and progressive overload
- `src/lib/achievement-tracker.ts` - Thin public barrel re-exporting the achievement API (`getBestPerformance`, `getWorkoutPerformance`, `isExerciseUnlocked`, `shouldRetireExercise`, `checkWorkoutAchievements`, `getExerciseStatuses`, `getAvailableExercises`, `checkLadderAdvancements`, plus their types)
- `src/lib/exercise-performance.ts` - `getBestPerformance` / `getWorkoutPerformance`: best single-set performance queries over workout history (McGill hold-duration aware)
- `src/lib/exercise-unlock-tracker.ts` - `isExerciseUnlocked`, `shouldRetireExercise`, `checkWorkoutAchievements`: unlock/retirement threshold evaluation for a completed workout
- `src/lib/exercise-status.ts` - `getExerciseStatuses` / `getAvailableExercises`: derives active/locked/retired status and the available-exercise field whitelist for generation
- `src/lib/ladder-advancement.ts` - `checkLadderAdvancements`: ladder-rung double-progression advancement for a completed workout
- `src/lib/intensity-calculator.ts` - `calculateIntensityScore`: 0-100 workout intensity score (volume × heaviness × muscle-group breadth), used for legacy history backfill

**Key formulas:**
- Workout targets use **75% of estimated capacity** (sustainable for multiple sets, since calibration tests single-set max)
- Progressive overload: +7.5% from last performance (minimum: 1 rep or 5 seconds)
- Strength level formula for timed exercises: `(achievedDuration / heaviness) * (10/6)`
- **Ladder exercises** (upper body, coaching 2026-07-01): exercises with a `ladder` config progress by double progression — build reps within the current rung from `startReps` (8), target capped at `advanceReps` (15) below the top rung; when ALL completed sets reach `advanceReps`, `checkLadderAdvancements` (achievement-tracker) bumps the rung stored in `profile.exerciseAchievements.ladderLevels` and the generator resets the target to `startReps`. The rung used is stamped on workout + history entries as `ladderRung`.

### Exercise Data
All exercises defined in `src/data/exerciseData.ts` with:
- `heavinessScore` - Difficulty multiplier used in calculations
- `muscleGroups` - Array of targeted muscle groups (abs, glutes, lowerBack)
- `type` - Either 'reps' or 'timed'

### Page Structure
Routes defined in `src/App.tsx`. Main pages in `src/pages/`:
- `Dashboard.tsx` - Home screen, workout start
- `WarmupRoutine.tsx` - Pre-workout warmup
- `Calibration.tsx` - Initial 3-exercise assessment
- `WorkoutExecution.tsx` - Active workout interface
- `StretchingRoutine.tsx` - Post-workout stretching (shown before completion)
- `MeditationTimer.tsx` - Post-stretching meditation
- `WorkoutComplete.tsx` - Per-exercise progression data, PB tracking, integrated milestones
- `History.tsx` - Past workout records
- `ExerciseStatus.tsx` - Exercise unlock/retirement status browser (`/exercises`)
- `ExerciseLibrary.tsx` - Browse exercises
- `Challenges.tsx` / `ChallengeAttempt.tsx` - Core Calisthenics Challenge Journey: browse challenge ladder / attempt a challenge (`src/data/challengeData.ts`)
- `Settings.tsx` - Thin container that composes the settings section components (below) in order

### Settings Section Components
`Settings.tsx` is split into single-responsibility sections in `src/components/settings/`:
- `CalibrationResults.tsx` - Read-only display of the latest calibration results
- `ExcludedExercisesSection.tsx` - Lists excluded exercises with re-include buttons
- `InstallAppSection.tsx` - PWA install (owns the `beforeinstallprompt` listener + iOS instructions)
- `BackupRestoreSection.tsx` - Export/import full-data JSON backup
- `DangerZoneSection.tsx` - Reset fitness levels / clear all data
- `DeveloperTools.tsx` - Development-only seed/clear history tools; hosts `CustomWorkoutBuilder`
- `CustomWorkoutBuilder.tsx` - Dev-only exercise-picker UI; delegates construction to `buildCustomWorkout`

### Layout Conventions
- Max width: 640px (`max-w-md`)
- Bottom padding: 80px (`pb-20`) for fixed nav
- Mobile-first design (375px-430px target)

### Key Components
- **Timer** (`src/components/workout/Timer.tsx`) supports count-up/down modes via `countUp` prop
- **ScrollToTop** in `src/components/common/` ensures page scroll resets on navigation
- **PWA install** button appears in Settings only on HTTPS

### Startup Migrations
`App.tsx` runs two one-time data migrations on load (guarded by `needsMigration`/`needsShoulderTapsMigration` checks): `strength-migration.ts` (backfills historical strength-level snapshots) and `shoulder-taps-migration.ts` (converts old timed plank-shoulder-taps entries to reps). Both are idempotent no-ops once history is migrated.
