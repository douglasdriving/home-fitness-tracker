# Home Fitness Tracker - Claude Reference

## Project Overview

A Progressive Web App (PWA) for home fitness tracking focused on core exercises (abs, glutes, lower back). Users calibrate their fitness level, then the app generates personalized workouts with progressive overload.

**Live App:** https://home-fitness-tracker.vercel.app (or your Vercel deployment)
**Repository:** https://github.com/douglasdriving/home-fitness-tracker

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **State Management:** Zustand (user-store, workout-store)
- **Database:** Dexie (IndexedDB wrapper) - client-side storage
- **Styling:** Tailwind CSS
- **PWA:** vite-plugin-pwa (Workbox)
- **Hosting:** Vercel (with Serverless Functions)
- **Date Utils:** date-fns

## Project Structure

```
src/
├── components/
│   ├── common/           # Reusable UI components
│   │   ├── BottomNav.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── ScrollToTop.tsx
│   ├── feedback/
│   │   └── FeedbackForm.tsx
│   └── workout/
│       └── Timer.tsx     # Versatile timer (count up/down, seconds/minutes)
├── data/
│   └── exerciseData.ts   # Exercise database with heaviness scores
├── db/
│   └── db.ts            # Dexie database setup
├── lib/
│   ├── progression-calculator.ts  # Strength calculations
│   └── workout-generator.ts      # Workout generation logic
├── pages/               # Route pages
│   ├── Dashboard.tsx
│   ├── History.tsx
│   ├── ExerciseLibrary.tsx
│   ├── Settings.tsx
│   ├── Calibration.tsx
│   └── WorkoutExecution.tsx
├── store/
│   ├── user-store.ts    # User profile & strength levels
│   └── workout-store.ts # Workouts & history
├── types/               # TypeScript type definitions
├── utils/
│   └── userProfile.ts   # LocalStorage helpers
└── App.tsx

api/
└── feedback.ts         # Vercel Serverless Function for GitHub API

.github/
└── ISSUE_TEMPLATE/     # GitHub issue templates for feedback
```

## Key Concepts

### 1. Calibration System

Users perform 3 exercises (one per muscle group) to establish baseline:
- Plank (abs, timed)
- Glute Bridge (glutes, reps)
- Bird Dog (lower back, timed)

**Formula:** Calibration measures single-set max capacity.
Converted to strength level (0-100) using:
- Reps: `(achievedReps / heaviness) * 10`
- Timed: `(achievedDuration / heaviness) * (10/6)`

### 2. Workout Generation

Located in: `src/lib/workout-generator.ts`

**Strategy:**
1. Select 3-4 exercises covering all muscle groups
2. Avoid recently used exercises (last 2 workouts)
3. Calculate targets using **75% of estimated capacity** (sustainable for multiple sets)
4. Generate 3-4 sets with same target per exercise
5. Set rest times based on exercise difficulty (30-60s)

**Why 75%?** Calibration tests max capacity for ONE set. Workouts need sustainable targets across MULTIPLE sets. 75% allows completing all sets with good form.

### 3. Progressive Overload

Located in: `src/lib/progression-calculator.ts`

When user has done an exercise before:
- Use last performance + 7.5% increase
- Minimum increase: 1 rep or 5 seconds
- Then apply 75% multiplier for multiple sets

### 4. Strength Level Updates

After completing a workout:
- Calculate average performance per exercise
- Update strength levels using `updateStrengthLevelsFromWorkout()`
- Capped at 100 per muscle group

### 5. PWA Features

- **Offline Support:** Service worker caches app shell
- **Install Prompt:** Settings page shows install button (HTTPS only)
- **Manifest:** icons, theme colors, display mode

### 6. In-App Feedback

- Settings → "Submit Feedback" button
- Opens modal form (bug report or feature request)
- Submits to `/api/feedback` Vercel Serverless Function
- Function calls GitHub Issues API
- Requires `GITHUB_TOKEN` environment variable in Vercel

## Database Schema (Dexie/IndexedDB)

### workouts table
```typescript
{
  id: string
  workoutNumber: number
  generatedDate: number
  startedDate?: number
  completedDate?: number
  status: 'pending' | 'in-progress' | 'completed'
  estimatedDuration: number
  totalDuration?: number
  exercises: WorkoutExercise[]
}
```

### history table
```typescript
{
  id: string
  workoutId: string
  workoutNumber: number
  completedDate: number
  totalDuration: number
  exercises: CompletedExercise[]
}
```

## State Management (Zustand)

### user-store.ts
- User profile (ID, calibration status, strength levels)
- Stored in localStorage
- Automatically syncs between store and localStorage

### workout-store.ts
- Current workout (pending/in-progress)
- Workout history
- Operations: generate, start, complete, updateSet
- Syncs with Dexie database

## Important Features & Behaviors

### Timer Component Props
```typescript
{
  duration: number       // seconds
  onComplete?: () => void
  autoStart?: boolean
  hideControls?: boolean    // Hide start/pause/skip
  countUp?: boolean         // Count 0→duration (for calibration)
  showSecondsOnly?: boolean // Display "90s" instead of "1:30"
}
```

### Bottom Navigation
- Automatically scrolls to top on route change (ScrollToTop component)
- Active state: bold text + background tint + top indicator bar

### Layout
- Max width: 640px (max-w-md)
- Bottom padding: 80px (pb-20) for fixed nav
- No duplicate min-h-screen containers

## Development Commands

```bash
npm run dev              # Development server (localhost:5173)
npm run dev -- --host    # Dev server accessible on local network
npm run build            # Production build
npm run preview          # Preview production build locally
```

## Deployment

**Platform:** Vercel

**Required Environment Variable:**
- `GITHUB_TOKEN`: Personal Access Token with `public_repo` scope for feedback feature

See `DEPLOYMENT.md` for full deployment guide.

## Testing Workflow

1. Reset calibration (Settings → Danger Zone → Reset Calibration)
2. Complete calibration with test values
3. Generate workout → verify targets are ~75% of calibration
4. Complete workout with varied performance
5. Generate next workout → verify progressive overload
6. Check history → verify data persistence

## Common Tasks

### Add New Exercise
1. Add to `src/data/exerciseData.ts`
2. Include: id, name, type, description, muscleGroups, heavinessScore, videoUrl, source

### Modify Workout Generation
- Edit `src/lib/workout-generator.ts`
- Adjust: exercise selection, set count, target calculation, rest times

### Change Strength Formulas
- Edit `src/lib/progression-calculator.ts`
- Update: calibration conversion, capacity estimation, progression rate

### Add New Page
1. Create in `src/pages/`
2. Add route to `src/App.tsx`
3. Add nav item to `src/components/common/BottomNav.tsx` if needed

## Known Limitations

1. **Video Embedding:** Videos open in external app/tab (deferred - would require iframe implementation)
2. **Video Timestamps:** Videos don't start at specific timestamps (deferred - would require manual timestamp finding)
3. **Offline Video:** Videos require internet connection
4. **Single User:** No multi-user support (localStorage per device)

## Bug Tracking

See `bugs-and-feedback.md` for comprehensive list of completed and pending items.

**Current Status:** 19/22 items completed (86%)

## Future Enhancement Ideas

- Multi-user support with cloud sync
- Custom exercise creation
- Workout scheduling/reminders
- Progress photos
- Export workout history as CSV/PDF
- Social features (share workouts)
- Equipment-based exercises
- Video timestamp integration
- Embedded video player

## Important Notes

1. **Calibration Formula Changed:** Early versions used `/ 6` for timed exercises, now uses `* (10/6)` to correctly invert the estimation formula.

2. **Sustainable Multiplier:** Workouts use 75% of estimated capacity, NOT 100%, because calibration tests single-set max while workouts need multiple-set sustainability.

3. **Progressive Fatigue Removed:** Earlier version had descending targets (12, 11, 10). Now all sets have same target based on sustainable calculation.

4. **Scroll Behavior:** ScrollToTop component ensures every tab switch starts at top of page.

5. **Feedback Feature:** Requires GitHub token setup in Vercel. Falls back gracefully if not configured (shows error on submit).

## Contact & Support

- GitHub Issues: Use in-app feedback or direct GitHub issue creation
- Deployment: Vercel dashboard for logs and monitoring
- Documentation: README.md, DEPLOYMENT.md, this file

---

**Last Updated:** 2025-01-11
**App Version:** 1.0.0
**Claude Session:** This document created during comprehensive bug fix session
