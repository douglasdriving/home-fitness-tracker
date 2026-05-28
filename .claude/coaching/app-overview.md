# App Overview (Non-Technical)

This document describes how the Home Fitness Tracker app works, written for coaching context rather than technical implementation.

## What It Is

A mobile-friendly web app for home core workouts. Everything runs on the phone/device with no cloud accounts or syncing. It generates personalized workouts and tracks progress over time.

## The Three Muscle Groups

The app focuses exclusively on core training across three muscle groups:
- **Abs** (front core)
- **Glutes** (posterior chain, hip extension)
- **Lower back** (spinal erectors, posterior core)

Every workout targets all three groups.

## Exercise Library

**45+ exercises** across three difficulty tiers:

### Abs (13 exercises)
- *Basic*: Crunches, Toe Touches, Reverse Crunches, Flutter Kicks
- *Intermediate*: Plank, Dead Bug, Bicycle Crunches, Plank Shoulder Taps
- *Advanced*: Mountain Climbers, Leg Raises, V-Ups, Hollow Body Hold, Dragon Flag

### Glutes (15 exercises)
- *Basic*: Glute Bridge, Frog Pumps
- *Band exercises*: Clamshells, Fire Hydrants, Band Lateral Walk, Band Glute Bridge
- *Unilateral*: Donkey Kicks, Curtsy Lunges, Single-Leg Glute Bridge
- *Advanced*: Hip Thrust, Bulgarian Split Squat, Single-Leg RDL, Nordic Curl

### Lower Back (8 exercises)
- *Basic*: Bird Dog, Prone Y-T-W Raises
- *Intermediate*: Good Morning, Back Extension Hold
- *Advanced*: Superman, Reverse Hyperextension, Dead Bug

Some exercises require resistance bands (toggled in settings). Others are bodyweight only.

## How Workouts Are Generated

Each workout includes **4 exercises** with **3-4 sets** each.

**Exercise selection:**
- Always covers all three muscle groups, plus a 4th exercise for variety
- Rotates through available exercises so they don't repeat too frequently

**Target calculation:**
- First time: Beginner-friendly defaults (e.g., 10 crunches, 30-second plank)
- Returning exercises: Based on previous performance + difficulty feedback

**Rest periods:** 30-60 seconds between sets, scaled by exercise difficulty.

**Estimated duration:** Typically 20-30 minutes including transitions.

## Progressive Overload System

After each exercise, users rate difficulty on a 1-5 scale:

| Rating | Meaning | Next session adjustment |
|--------|---------|------------------------|
| 1 | Way too easy | +20% |
| 2 | A bit too easy | +10% |
| 3 | Just right | +5% (gentle progression) |
| 4 | A bit too hard | -10% |
| 5 | Way too hard | -20% |

This means difficulty self-corrects based on how exercises actually feel, not just a fixed escalation.

## Exercise Progression (Unlock/Retire)

**Unlocking:** Advanced exercises unlock when prerequisites are met. Examples:
- 40 crunches unlocks Flutter Kicks
- 60-second plank unlocks Plank Shoulder Taps
- 25 dead bugs unlocks Side Plank

**Retiring:** When you exceed a mastery threshold (e.g., 50 crunches, 120-second plank), that exercise is "retired" - marked as mastered and cycled out of regular rotation.

This creates a natural progression path from basic to advanced exercises.

## During a Workout

The app guides through each exercise showing:
- Exercise name and instructions
- Target reps or duration for the current set
- Timer for timed exercises
- Input to record actual performance
- Optional equipment and personal notes fields

For bilateral exercises (e.g., Donkey Kicks), both sides are counted within sets.

## Post-Workout Stretching

After all exercises, a **5-minute guided stretching routine**:
- 8 stretches targeting the muscles just worked
- 30-40 seconds per stretch
- Bilateral stretches indicate when to switch sides
- Includes: Child's Pose, Cat-Cow, Figure-Four, Lying Spinal Twist, Cobra, Hip Flexor stretch, and more

## Workout Completion

After stretching, a completion screen shows:
- Workout number and timestamp
- Per-exercise performance vs. previous session and personal bests
- Personal records highlighted
- Milestones (new exercises unlocked, exercises retired)

## What the App Doesn't Do

- No scheduling (doesn't tell you when to work out)
- No nutrition tracking
- No exercises outside the three core muscle groups
- No cloud sync or social features
- No warm-up routine (only post-workout stretching)
- No periodization or deload weeks
- No workout variety (every session follows the same structure)
