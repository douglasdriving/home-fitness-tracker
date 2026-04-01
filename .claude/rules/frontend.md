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
- `src/store/workout-store.ts` - Current workout, history (syncs to Dexie database)

### Core Algorithm Files
- `src/lib/workout-generator.ts` - Generates personalized workouts
- `src/lib/progression-calculator.ts` - Handles strength calculations and progressive overload

**Key formulas:**
- Workout targets use **75% of estimated capacity** (sustainable for multiple sets, since calibration tests single-set max)
- Progressive overload: +7.5% from last performance (minimum: 1 rep or 5 seconds)
- Strength level formula for timed exercises: `(achievedDuration / heaviness) * (10/6)`

### Exercise Data
All exercises defined in `src/data/exerciseData.ts` with:
- `heavinessScore` - Difficulty multiplier used in calculations
- `muscleGroups` - Array of targeted muscle groups (abs, glutes, lowerBack)
- `type` - Either 'reps' or 'timed'

### Page Structure
Routes defined in `src/App.tsx`. Main pages in `src/pages/`:
- `Dashboard.tsx` - Home screen, workout start
- `Calibration.tsx` - Initial 3-exercise assessment
- `WorkoutExecution.tsx` - Active workout interface
- `StretchingRoutine.tsx` - Post-workout stretching (shown before completion)
- `WorkoutComplete.tsx` - Per-exercise progression data, PB tracking, integrated milestones
- `History.tsx` - Past workout records
- `ExerciseLibrary.tsx` - Browse exercises
- `Settings.tsx` - User settings, reset options

### Layout Conventions
- Max width: 640px (`max-w-md`)
- Bottom padding: 80px (`pb-20`) for fixed nav
- Mobile-first design (375px-430px target)

### Key Components
- **Timer** (`src/components/workout/Timer.tsx`) supports count-up/down modes via `countUp` prop
- **ScrollToTop** in `src/components/common/` ensures page scroll resets on navigation
- **PWA install** button appears in Settings only on HTTPS
