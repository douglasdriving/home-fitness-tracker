# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Progressive Web App (PWA) for home fitness tracking focused on core exercises (abs, glutes, lower back). Users calibrate their fitness level, then the app generates personalized workouts with progressive overload. All data is stored client-side using IndexedDB and localStorage.

**Stack:** React 18 + TypeScript + Vite, Zustand (state), Dexie (IndexedDB), Tailwind CSS, vite-plugin-pwa

## Development Commands

```bash
npm run dev              # Development server (localhost:5173)
npm run dev -- --host    # Dev server accessible on local network
npm run build            # TypeScript check + production build
npm run lint             # ESLint with --max-warnings 0
npm run test             # Run tests with Vitest
npm run preview          # Preview production build
```

## Architecture

### Data Flow

```
User Action → Zustand Store → Dexie (IndexedDB) + localStorage
                    ↓
            React Components (re-render on state change)
```

**Two Zustand stores:**
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
- `History.tsx` - Past workout records
- `ExerciseLibrary.tsx` - Browse exercises
- `Settings.tsx` - User settings, reset options, feedback form

### Layout Conventions

- Max width: 640px (`max-w-md`)
- Bottom padding: 80px (`pb-20`) for fixed nav
- Mobile-first design (375px-430px target)

## Automated Issue Workflow

This project uses `scripts/manage-issues.js` to fetch and organize GitHub issues:

1. Run `node scripts/manage-issues.js` (or `start-claude.bat`)
2. Script fetches issues via `gh` CLI, presents for manual review
3. Approved issues go to `.claude/ACTIVE-ISSUES.md`
4. Completed issues archived to `.claude/COMPLETED.md`

**Commit format for issues:** `Fixes #X: description`

## Key Implementation Details

- **Timer component** (`src/components/workout/Timer.tsx`) supports count-up/down modes via `countUp` prop
- **ScrollToTop** component in `src/components/common/` ensures page scroll resets on navigation
- **PWA install** button appears in Settings only on HTTPS
- **Feedback** submits to `/api/feedback` (Vercel serverless function) which creates GitHub issues

## Deployment

**Platform:** Vercel

**Required env var:** `GITHUB_TOKEN` (PAT with `public_repo` scope) for feedback feature
