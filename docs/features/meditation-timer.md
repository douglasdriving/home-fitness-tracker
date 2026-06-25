# Meditation Timer

## Overview

A progressive post-workout meditation timer that appears after the stretching routine (or immediately after workout if stretching is disabled). The timer encourages users to build a meditation habit with durations that increase every 5 completed sessions, from 1 minute to a maximum of 15 minutes.

## How It Works

### Navigation Flow

The meditation timer appears in the post-workout flow:

```
WorkoutExecution → StretchingRoutine → MeditationTimer → WorkoutComplete
                        ↓ (skip)            ↓ (skip)
                   MeditationTimer    WorkoutComplete
```

**If stretching is disabled:**
```
WorkoutExecution → MeditationTimer → WorkoutComplete
                        ↓ (skip)
                   WorkoutComplete
```

**If both stretching and meditation are disabled:**
```
WorkoutExecution → WorkoutComplete
```

### Timer Behavior

- **Countdown mode**: Timer starts at the target duration and counts down to 0, with a progress bar that fills as time elapses (same pattern as timed exercises and stretching)
- **Auto-start**: User must manually press Start (no auto-start)
- **Completion sound**: Plays when timer reaches zero
- **Skip option**: Always visible in header, no confirmation dialog (low friction)
- **No persistence**: If user navigates away, session is lost (same as skipping)

### Completion vs Skip

**Completing meditation (timer finishes naturally):**
- Increments `completionCount` by 1 (recorded immediately)
- Recalculates `currentDurationSeconds` for next session
- Navigates to WorkoutComplete with `completionState` after a ~1s delay so the completion bell can ring fully before the screen transitions

**Skipping meditation:**
- Does NOT increment `completionCount`
- Does NOT affect progression
- Navigates directly to WorkoutComplete with `completionState`

## Progressive Duration Ladder

The meditation duration increases every 5 completed sessions based on habit formation principles:

| Completions | Duration | Rationale |
|-------------|----------|-----------|
| 0–4 | 1 min (60s) | Minimal barrier to entry; establishes the habit loop |
| 5–9 | 2 min (120s) | First increase after ~1–2 weeks of consistent practice |
| 10–14 | 3 min (180s) | Gradual ramp maintaining adherence |
| 15–19 | 5 min (300s) | Meaningful jump once habit is established |
| 20–24 | 7 min (420s) | Mid-range duration for developing focus |
| 25–29 | 10 min (600s) | Standard beginner meditation length |
| 30+ | 15 min (900s) | Cap — recommended minimum for experienced practitioners |

**Implementation:** The `getMeditationDuration(completionCount)` function in `src/utils/meditation.ts` returns the appropriate duration based on completion count.

## Settings Toggle

Users can disable meditation in Settings → Preferences:

- **Default**: Enabled (meditation appears by default)
- **When disabled**: Flow skips meditation entirely, going directly from stretching (or workout) to WorkoutComplete
- **Setting key**: `profile.preferences.autoShowMeditation`

## State Storage

### MeditationState

Stored in `UserProfile.meditationState` (persisted to localStorage):

```typescript
interface MeditationState {
  completionCount: number;        // Total completed meditations
  currentDurationSeconds: number; // Duration for the NEXT session
}
```

**Default values** (for new users or missing state):
```typescript
{
  completionCount: 0,
  currentDurationSeconds: 60
}
```

### Store Actions

**`completeMeditation()`** — Called when timer finishes naturally:
1. Reads current `meditationState` (defaults if missing)
2. Increments `completionCount` by 1
3. Calls `getMeditationDuration(newCount)` to compute new duration
4. Updates `profile.meditationState` and persists via `saveUserProfile()`

**`updatePreferences({ autoShowMeditation })`** — Toggles meditation on/off in Settings.

## Key Files

### New Files
- **`src/pages/MeditationTimer.tsx`** — Page component for meditation timer
- **`src/pages/MeditationTimer.test.tsx`** — Unit tests for MeditationTimer
- **`src/utils/meditation.ts`** — `getMeditationDuration()` helper function
- **`src/utils/meditation.test.ts`** — Unit tests for meditation utilities

### Modified Files
- **`src/types/user.ts`** — Added `MeditationState` interface and `UserProfile.meditationState` field, added `preferences.autoShowMeditation`
- **`src/store/user-store.ts`** — Added `completeMeditation` action, extended `updatePreferences` type
- **`src/pages/StretchingRoutine.tsx`** — Modified `handleRoutineComplete()` and `handleSkip()` to conditionally route to `/meditation`
- **`src/pages/WorkoutExecution.tsx`** — Modified `handleCompleteWorkout()` to route to `/meditation` when stretching is disabled but meditation is enabled
- **`src/pages/Settings.tsx`** — Added meditation preference toggle in Preferences section
- **`src/App.tsx`** — Added `/meditation` route

## Gotchas

### 1. Duration Applies to NEXT Session

When `completeMeditation()` is called, it increments the count and recalculates duration. The new duration applies to the **next** meditation session, not the current one.

**Example:** User completes their 5th meditation (count goes from 4 → 5). The current session was 60s (1 min), but the next session will be 120s (2 min).

### 2. State Passthrough

`MeditationTimer` must pass `completionState` to `WorkoutComplete` **identically** to how `StretchingRoutine` does. The object must not be mutated or wrapped — it's a direct passthrough via `location.state`.

### 3. Both Preferences Disabled

When both `autoShowStretching` and `autoShowMeditation` are `false`, the flow must go directly from `WorkoutExecution` to `WorkoutComplete`. The logic in `WorkoutExecution.handleCompleteWorkout()` handles this with:
```typescript
if (autoShowStretching) {
  // Navigate to stretching (which chains to meditation if enabled)
} else if (autoShowMeditation) {
  // Navigate to meditation directly
} else {
  // Navigate to workout complete
}
```

### 4. Direct URL Access Guard

If a user navigates directly to `/meditation` without `completionState` in location state, the page redirects to `/` (home). This matches the pattern used in `StretchingRoutine`.

### 5. Skip vs Complete Logic

The Timer component uses countdown mode with Start/Pause and Skip buttons. The page also provides a separate `Skip` button in the header for skipping meditation entirely. Clicking the header Skip button navigates to WorkoutComplete **without** calling `completeMeditation()`.

### 6. Wake Lock

The page uses `useWakeLock()` to keep the screen awake during meditation, preventing the screen from dimming/sleeping mid-session.

### 7. Delayed Navigation After Completion

When the timer finishes, `Timer.tsx` plays the completion bell (`playCompletionSound()`, ~0.5s play + 600ms AudioContext cleanup) and synchronously calls `onComplete()`. `handleComplete()` calls `completeMeditation()` immediately (so progression is never lost) but defers `navigate('/workout-complete')` by ~1s (`COMPLETION_NAV_DELAY_MS`) via a `setTimeout` tracked in `navTimeoutRef`, otherwise the component unmounts and cuts the bell off. The header Skip path (`handleSkip()`) clears that pending timeout before navigating immediately, preventing a complete-then-skip double-navigation, and an unmount cleanup effect clears it to avoid navigate-after-unmount. The delay lives only in `MeditationTimer`, not in the shared `Timer` component (so stretching/exercise timers stay immediate).

## Edge Cases Tested

1. **Missing meditation state**: Defaults to `{ completionCount: 0, currentDurationSeconds: 60 }`
2. **Progression boundaries**: Tests verify duration changes at 5, 10, 15, 20, 25, 30 completions
3. **Cap enforcement**: Duration stays at 900s for counts >= 30
4. **Skip does not increment**: Verified that skipping does NOT call `completeMeditation()`
5. **Preference persistence**: Toggling `autoShowMeditation` in Settings persists across sessions
6. **Navigation without state**: Redirects to home if `completionState` is missing
