# Design Plan: Update Rep System with Intensity Feedback

## Overview

This plan redesigns the rep tracking system to:
1. **Remove "actual" rep input** - users simply aim for the displayed target
2. **Add intensity feedback per exercise** - 5-point scale after completing all sets
3. **Use intensity feedback for progression** - instead of automatic +7.5% increases

## Current System Analysis

### Problems Identified
1. **Unlimited rep growth**: The +7.5% automatic increase causes rep counts to rise indefinitely
2. **Dual-number confusion**: "target" vs "actual" reps is redundant since users aim for the target anyway
3. **No user feedback loop**: Users can't tell the app "this was too hard" to adjust future workouts

### Current Data Flow
```
Calibration → Strength Levels → Target Calculation → User inputs actual reps → Progression +7.5%
```

### Proposed Data Flow
```
Default reps OR history → Target Display → User performs target → Intensity Feedback → Adjusted Progression
```

---

## Design Decisions

### 1. Remove Actual Rep Input

**Current UI (ExercisePhase.tsx):**
- Shows target reps in header
- Input field for "How many reps did you complete?"
- User must type a number before completing set

**New UI:**
- Display the rep count prominently (e.g., "35 Reps")
- Notes field remains
- Single "Complete" button (no input required)
- We assume user performed the target (since they clicked Complete)

**Data changes:**
- `actualReps` / `actualDuration` will equal `targetReps` / `targetDuration` when set is completed
- No user input needed - auto-fill from target

### 2. First-Time Exercise Handling

**Current behavior:** First-time exercises use calibration-based estimation, user inputs actual performance.

**New behavior:** Each exercise has a `defaultReps` or `defaultDuration` in the exercise data. For first-time users (no history), use these defaults as starting targets.

**Default values from exercises.json:**
| Exercise | Type | Default |
|----------|------|---------|
| Plank | timed | 30s |
| Glute Bridge | reps | 12 |
| Bird Dog | reps | 10 |
| Crunches | reps | 15 |
| Superman | reps | 12 |
| Bicycle Crunches | reps | 20 |
| Dead Bug | reps | 10 |
| Single-Leg Glute Bridge | reps | 10 |
| Mountain Climbers | timed | 30s |
| Leg Raises | reps | 12 |
| Donkey Kicks | reps | 15 |
| Side Plank | timed | 20s |
| Fire Hydrants | reps | 15 |
| Reverse Crunches | reps | 15 |
| Resistance Band Glute Bridge | reps | 12 |
| Resistance Band Clamshells | reps | 15 |
| Band Lateral Walk | reps | 20 |

These defaults already exist in the exercise data! We just need to use them.

### 3. Intensity Feedback System

**When shown:** After completing ALL sets of an exercise (before moving to next exercise)

**UI Design:**
```
┌─────────────────────────────────────────┐
│       How did that feel?                │
│                                         │
│  [1]    [2]    [3]    [4]    [5]       │
│  Way    A bit  Just   A bit  Way       │
│  too    too    right  too    too       │
│  easy   easy          hard   hard      │
│                                         │
│  💡 Your feedback adjusts the next      │
│     workout's intensity                 │
└─────────────────────────────────────────┘
```

**Scale Descriptions:**
- **1 - Way too easy**: "I could have done twice as many reps without breaking a sweat"
- **2 - A bit too easy**: "I finished all sets with energy to spare"
- **3 - Just right**: "Challenging but doable - pushed me just enough"
- **4 - A bit too hard**: "I struggled to complete all sets"
- **5 - Way too hard**: "I couldn't complete the sets or had to take extra breaks"

### 4. Progression Based on Intensity Feedback

**New formula replaces the automatic +7.5%:**

| Feedback | Adjustment | Rationale |
|----------|------------|-----------|
| 1 (Way too easy) | +20% | Large increase to find challenge |
| 2 (A bit too easy) | +10% | Moderate increase |
| 3 (Just right) | +5% | Gentle progression to maintain challenge |
| 4 (A bit too hard) | -10% | Reduce to make sustainable |
| 5 (Way too hard) | -20% | Significant reduction |

**Minimums:**
- Reps: At least ±1 rep change (or 0 for rating 3 if already appropriate)
- Timed: At least ±5 seconds change

**Example:**
- User does Dead Bug at 20 reps
- Rates as "2 - A bit too easy"
- Next workout: 20 × 1.10 = 22 reps

### 5. Data Storage Changes

**New field in CompletedExercise:**
```typescript
interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  completedSets: CompletedSet[];
  intensityFeedback?: 1 | 2 | 3 | 4 | 5;  // NEW FIELD
}
```

**Why per-exercise (not per-set):**
- Simpler UX - one feedback per exercise
- More meaningful - considers overall exercise difficulty
- Easier to use in progression calculations

### 6. Workout Generator Changes

**Current:** `findLastPerformance()` returns last reps/duration, then `calculateProgression()` adds 7.5%

**New:**
1. `findLastPerformance()` also returns the intensity feedback
2. `calculateProgressionWithFeedback()` uses feedback to determine adjustment
3. For first-time exercises, use `defaultReps`/`defaultDuration` from exercise data

### 7. Strength Level Updates

**Current:** Strength levels updated based on actual performance after each workout.

**New:** We still need some form of strength tracking for exercise selection/balance, but progression is now feedback-driven. Options:

**Option A (Recommended):** Keep strength level updates but don't use them for target calculation. Only use for:
- Determining number of sets (3 vs 4)
- Progress tracking/statistics

**Option B:** Remove strength level updates entirely (simpler but loses progress tracking)

I recommend **Option A** - keep the infrastructure for tracking but decouple from rep targets.

---

## Implementation Plan

### Phase 1: Data Model Updates
1. Add `intensityFeedback` field to `CompletedExercise` type (`src/types/workout.ts`)
2. Verify all exercises have `defaultReps` or `defaultDuration` (they do ✓)

### Phase 2: Simplified Exercise Phase UI
1. Remove input field for actual reps (`src/components/workout/ExercisePhase.tsx`)
2. Display target prominently as "the goal"
3. Keep notes field
4. "Complete Set" auto-fills actual = target

### Phase 3: Intensity Feedback Component
1. Create `IntensityFeedback.tsx` component
2. Clear descriptions for each rating
3. Returns rating 1-5 on selection

### Phase 4: Workout Execution Flow Update
1. Modify `WorkoutExecution.tsx` to show `IntensityFeedback` after last set of each exercise
2. Store feedback in workout state
3. Pass feedback to `completeWorkout()`

### Phase 5: Workout Completion & Storage
1. Update `workout-store.ts` `completeWorkout()` to store intensity feedback per exercise
2. Ensure backwards compatibility (old workouts without feedback still work)

### Phase 6: Progression Calculator Update
1. Create `calculateProgressionWithFeedback()` in `progression-calculator.ts`
2. Implement feedback-based adjustments
3. Add fallback for exercises without feedback history

### Phase 7: Workout Generator Update
1. Modify `findLastPerformance()` to return both performance AND feedback
2. Update `generateWorkout()` to:
   - Use defaults for first-time exercises
   - Use feedback-based progression for returning exercises
3. Remove/simplify calibration-based estimation (use defaults instead)

### Phase 8: Testing
1. Unit tests for progression calculator
2. Unit tests for workout generator
3. E2E test for full workout flow:
   - Generate workout → see default reps
   - Complete exercise → rate intensity
   - Generate next workout → verify adjusted reps

### Phase 9: Cleanup
1. Remove unused code paths for "actual" input handling
2. Update FirstTimeExerciseBanner (no longer needs special handling)
3. Review and update any related components

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/workout.ts` | Add `intensityFeedback` to `CompletedExercise` |
| `src/components/workout/ExercisePhase.tsx` | Remove input, show target prominently |
| `src/components/workout/IntensityFeedback.tsx` | NEW: Feedback collection component |
| `src/pages/WorkoutExecution.tsx` | Add intensity feedback flow after exercise |
| `src/store/workout-store.ts` | Store feedback, pass to history |
| `src/lib/progression-calculator.ts` | Add feedback-based progression |
| `src/lib/workout-generator.ts` | Use defaults, feedback-based progression |
| `src/components/workout/FirstTimeExerciseBanner.tsx` | Update messaging |

---

## Backwards Compatibility

- Old workouts without `intensityFeedback` will work fine
- For progression without feedback history, default to "3 - Just right" (+5%)
- Existing `actualReps`/`actualDuration` fields remain but auto-filled from target

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Users skip feedback | Default to "3" if skipped, still functions |
| Default values too easy/hard | Chosen conservatively, feedback will self-correct |
| Breaking existing workouts | All changes additive, no removal of existing fields |

---

## Success Criteria

1. Users can complete workouts without inputting rep counts
2. Intensity feedback is collected per exercise
3. Next workout adjusts based on feedback
4. Rep counts can decrease (not just increase)
5. First-time exercises use sensible defaults
6. All existing features continue working
