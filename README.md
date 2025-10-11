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

Built with:
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand state management
- Dexie.js for IndexedDB
- Vite PWA plugin

---

Built with ❤️ using React, TypeScript, and Vite.
