# Home Fitness Tracker

A Progressive Web App for tracking core strength workouts with intelligent progression and personalized workout generation.

## Features

### Core Functionality
- **Smart Workout Generation**: Automatically generates personalized workouts targeting abs, glutes, and lower back
- **Progressive Overload**: Intelligently increases workout difficulty based on your performance (7.5% progression)
- **Calibration System**: Initial 3-exercise assessment to establish baseline strength levels
- **Workout Execution**: Interactive workout interface with timers, set tracking, and progress visualization
- **Exercise Library**: Browse and search 15 bodyweight exercises with detailed descriptions and video tutorials
- **Workout History**: Complete history of all workouts with performance metrics
- **Backup & Restore**: Export and import all your data as JSON

### Technical Features
- **Progressive Web App**: Installable on mobile devices, works offline
- **Local-First**: All data stored locally using IndexedDB and localStorage
- **Mobile-Optimized**: Designed for mobile devices (375px-430px width)
- **Type-Safe**: Built with TypeScript for reliability
- **Modern Stack**: React 18, Vite 5, Tailwind CSS 3

## Technology Stack

- **Frontend Framework**: React 18.3 + TypeScript 5.6
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 5.0
- **Database**: Dexie.js 4.0 (IndexedDB wrapper)
- **Routing**: React Router 7.1
- **PWA**: Vite PWA Plugin 1.0
- **Date Handling**: date-fns 4.1

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

## How It Works

### 1. Calibration
On first use, users complete a 3-exercise calibration to establish baseline strength levels.

### 2. Workout Generation
The algorithm generates personalized workouts covering all muscle groups with intelligent exercise selection.

### 3. Progressive Overload
After each workout, the system updates strength levels and applies 7.5% progression for continuous improvement.

### 4. Data Storage
All data is stored locally using IndexedDB and localStorage for privacy and offline functionality.

## PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline**: Works without internet after first visit
- **Fast**: Service worker caches all assets
- **Native Feel**: Standalone display mode

## Data Management

### Export/Import
Settings → Backup & Restore → Export/Import data as JSON

### Reset
Settings → Danger Zone → Reset calibration or clear all data

## Development

### Quick Start

```bash
npm install
npm run dev
```

### Tech Stack
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand state management
- Dexie.js for IndexedDB
- Vite PWA plugin

### Automated Issue Workflow

This project uses a terminal-based automation script for managing GitHub issues:

**How It Works:**
1. Run `start-claude.bat` (or `node scripts/manage-issues.js`)
2. Script fetches and prioritizes all open GitHub issues
3. You review each issue interactively in the terminal (approve/reject/defer)
4. Approved issues are organized in `.claude/ACTIVE-ISSUES.md`
5. Script outputs a command to paste into Claude
6. Claude implements the fixes and commits with issue references

**Benefits:**
- ✅ Administrative work (fetching, sorting) happens outside Claude
- ✅ You maintain full control with manual approval gate
- ✅ Claude focuses purely on implementation
- ✅ Faster, more efficient workflow

**For Contributors:**
- Submit bugs/features via the in-app feedback form (Settings)
- Or create issues directly on GitHub
- Issues are automatically processed in next workflow run

See `.claude/WORKFLOW.md` for detailed documentation.

### Project Documentation

- `.claude/CLAUDE.md` - Comprehensive project reference
- `.claude/WORKFLOW.md` - Automated issue management system
- `DEPLOYMENT.md` - Deployment guide for Vercel
- `bugs-and-feedback.md` - Historical issue tracking (legacy)

### Testing Notes

Test issues #2 and #4 have been processed through the automated workflow to validate the issue management system.

---

Built with ❤️ using React, TypeScript, and Vite.
