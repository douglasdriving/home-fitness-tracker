# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Progressive Web App (PWA) for home fitness tracking focused on core exercises (abs, glutes, lower back). Users calibrate their fitness level, then the app generates personalized workouts with progressive overload. All data is stored client-side using IndexedDB and localStorage.

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
```

### Quality Control
Claude Code hooks run automatically (configured in `.claude/settings.json`):
- **Stop hooks:** ESLint autofix, testing enforcement, PR verification
- **Scripts:** `scripts/hooks/verify-pr.sh`, `scripts/hooks/check-dead-components.sh`

Dead code checks are **blocking**. Remove dead code rather than adding exceptions.

### Automated Issue Workflow
1. Run `node scripts/manage-issues.js` (or `start-claude.bat`)
2. Script fetches issues via `gh` CLI, presents for manual review
3. Approved issues go to `.claude/ACTIVE-ISSUES.md`
4. Completed issues archived to `.claude/COMPLETED.md`

**Commit format for issues:** `Fixes #X: description`
