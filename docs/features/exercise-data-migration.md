# Exercise Data Migration

## Overview

When an exercise changes type (e.g., from timed to reps-based), historical workout data stored in IndexedDB must be migrated to match the new format. The migration system converts stored performance values (like `actualDuration` → `actualReps`) so that progression calculations and history display work correctly with the updated exercise definition.

## How it works

Each migration follows a consistent pattern: a `needs*Migration()` check function and a `migrate*()` execution function. On app load, `App.tsx` runs a `useEffect` that checks if the user profile's migration flag is unset, calls the check function, and if needed runs the migration. After completion, it sets the flag on the user profile to prevent re-running.

### Plank Shoulder Taps Migration

Converts `plank-shoulder-taps-001` from timed to reps-based using a 3:1 ratio (3 seconds per rep):

- User opens app → `App.tsx` useEffect checks `profile.hasMigratedShoulderTaps`
- If not migrated, `needsShoulderTapsMigration()` scans `db.history` and `db.workouts` for shoulder taps entries with `actualDuration` but no `actualReps`
- `migrateShoulderTapsToReps()` converts all matching history entries (`actualDuration` → `actualReps`) and active workouts (`targetDuration` → `targetReps`)
- `setShoulderTapsMigrationCompleted()` sets the flag in localStorage via Zustand

The migration is idempotent — sets that already have `actualReps` are skipped, so running it twice has no effect.

## Key files

- `src/lib/shoulder-taps-migration.ts` — Migration logic: `needsShoulderTapsMigration()`, `migrateShoulderTapsToReps()`
- `src/App.tsx` — Migration trigger on app load (useEffect at startup)
- `src/types/user.ts` — `hasMigratedShoulderTaps` flag on UserProfile
- `src/store/user-store.ts` — `setShoulderTapsMigrationCompleted` action
- `src/lib/strength-migration.ts` — Reference pattern: the strength history backfill migration follows the same architecture

## Gotchas

- The migration only converts `actualDuration` → `actualReps` on CompletedSet (history). For active workouts, it converts `targetDuration` → `targetReps` on Set. These are different interfaces.
- If the shoulder taps migration runs before the strength backfill (`backfillStrengthHistory`), the backfill will see `actualReps` and use the reps formula — this is correct behavior. If the backfill already ran, no interaction occurs.
- The `findLastPerformanceWithFeedback` function in `workout-generator.ts` reads `firstSet.actualReps || firstSet.actualDuration`. After migration, it picks up reps values naturally, so no workout generator changes were needed.
- Other exercises in the same workout entry are not affected — only `plank-shoulder-taps-001` sets are migrated.
