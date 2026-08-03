# CLAUDE.md

This file guides Claude Code.

## Project Overview

A Progressive Web App (PWA) for home fitness tracking, focused on core strength (abs, glutes, lower back) with an added upper-body track. Users calibrate their fitness level, then the app generates personalized workouts with progressive overload — either full-body sessions or single-muscle-group daily-rotation days. Sessions are wrapped with a pre-workout warmup and post-workout stretching + meditation. All data is stored client-side using IndexedDB and localStorage.

**Stack:** React 18 + TypeScript + Vite, Zustand (state), Dexie (IndexedDB), Tailwind CSS, vite-plugin-pwa

## Rules (Modular Documentation)

Detailed rules are split into separate files in `.claude/rules/`:

- **[frontend.md](rules/frontend.md)** - React/Zustand/Dexie architecture, data flow, layout conventions
- **[testing.md](rules/testing.md)** - Vitest/Playwright guidelines, test locations
- **[deployment.md](rules/deployment.md)** - Vercel deployment, env vars, PWA config
- **[quality-control.md](rules/quality-control.md)** - Hooks, dead code policy, verification scripts

## Quick Reference

### Development Commands
```bash
npm run dev              # Development server (localhost:5173)
npm run build            # TypeScript check + production build
npm run lint             # ESLint with --max-warnings 0
npm run test             # Run tests with Vitest
npm run scan:dead-code   # Dead code scanner
npm run scan:dead-components  # Detect unreferenced React components
npm run verify           # Full pre-merge check (tsc + lint + tests + dead-code scans)
```

### Quality Control
Claude Code hooks run automatically (configured in `.claude/settings.json`):
- **Stop hooks:** ESLint autofix, testing enforcement, PR verification
- **Scripts:** `scripts/hooks/verify-pr.sh`, `scripts/hooks/check-dead-components.sh`

Dead code checks are **blocking**. Remove dead code rather than adding exceptions.


## Workflow

When developing new features or making changes in this repo, use test-driven development. Write tests first covering different cases, ensure they fail, then make edits until they are all green. Commit your changes when tests pass.

The codebase should be optimized for claude context. This means keeping files slim and follow the single-responsibility principle. Whenever you edit a file that is large and should be refactored, suggest to the user to make that refactor since you have the context in memory anyways.