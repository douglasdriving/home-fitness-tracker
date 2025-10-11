# Home Fitness Tracker - Technical Specification

## 1. Technology Stack

### 1.1 Core Technologies
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **State Management**: Zustand (lightweight, simple)
- **Routing**: React Router v6
- **Database**: Dexie.js (IndexedDB wrapper)
- **PWA**: Vite PWA Plugin
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

### 1.2 Key Libraries
- `dexie` - IndexedDB wrapper for structured data storage
- `zustand` - Lightweight state management
- `react-router-dom` - Client-side routing
- `date-fns` - Date manipulation
- `vite-plugin-pwa` - PWA manifest and service worker generation

### 1.3 Rationale
- **React + TypeScript**: Type safety, large ecosystem, excellent documentation
- **Vite**: Fast dev server, optimized builds, excellent DX
- **Tailwind**: Rapid UI development, mobile-first utilities, small bundle size
- **Zustand**: Simple API, no boilerplate, perfect for this app's complexity
- **Dexie**: Much easier than raw IndexedDB, reactive queries, TypeScript support
- **PWA Plugin**: Automatic service worker generation, offline support out of the box

---

## 2. Architecture

### 2.1 Directory Structure
```
home-fitness-tracker/
├── public/
│   ├── exercises/           # Exercise images
│   └── manifest.json        # PWA manifest
├── src/
│   ├── components/          # React components
│   │   ├── common/         # Reusable components (Button, Modal, etc.)
│   │   ├── calibration/    # Calibration flow components
│   │   ├── workout/        # Workout execution components
│   │   ├── history/        # History view components
│   │   └── exercises/      # Exercise library components
│   ├── data/               # Static data
│   │   └── exercises.json  # Exercise database
│   ├── db/                 # Database layer
│   │   ├── schema.ts       # Dexie schema definitions
│   │   └── db.ts           # Database instance
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Business logic
│   │   ├── workout-generator.ts
│   │   ├── progression-calculator.ts
│   │   └── backup-restore.ts
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx
│   │   ├── WorkoutExecution.tsx
│   │   ├── History.tsx
│   │   ├── ExerciseLibrary.tsx
│   │   ├── Calibration.tsx
│   │   └── Settings.tsx
│   ├── store/              # Zustand stores
│   │   ├── workout-store.ts
│   │   └── user-store.ts
│   ├── types/              # TypeScript types
│   │   ├── exercise.ts
│   │   ├── workout.ts
│   │   └── user.ts
│   ├── utils/              # Utility functions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/                  # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── .env
```

### 2.2 Data Flow
```
User Action
    ↓
React Component
    ↓
Event Handler
    ↓
Zustand Store Action
    ↓
Business Logic (lib/)
    ↓
Database Layer (Dexie)
    ↓
IndexedDB
    ↓
Reactive Query Update
    ↓
Component Re-render
```

---

## 3. Data Models (TypeScript)

### 3.1 Exercise
```typescript
interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  source: string;
  heavinessScore: Record<MuscleGroup, number>;
  type: 'reps' | 'timed';
  defaultReps?: number;
  defaultDuration?: number; // in seconds
}

type MuscleGroup = 'abs' | 'glutes' | 'lowerBack';
```

### 3.2 Workout
```typescript
interface Workout {
  id: string;
  workoutNumber: number;
  generatedDate: number; // timestamp
  completedDate?: number; // timestamp
  status: 'pending' | 'in-progress' | 'completed';
  estimatedDuration: number; // minutes
  exercises: WorkoutExercise[];
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  sets: Set[];
  restTime: number; // seconds between sets
}

interface Set {
  setNumber: number;
  targetReps?: number;
  targetDuration?: number; // seconds
  completed: boolean;
  actualReps?: number;
  actualDuration?: number; // seconds
}
```

### 3.3 User Profile
```typescript
interface UserProfile {
  userId: string;
  createdDate: number; // timestamp
  calibrationCompleted: boolean;
  calibrationData?: CalibrationData;
  strengthLevels: StrengthLevels;
}

interface CalibrationData {
  calibrationDate: number; // timestamp
  exercises: CalibrationExercise[];
}

interface CalibrationExercise {
  exerciseId: string;
  muscleGroup: MuscleGroup;
  achievedReps?: number;
  achievedDuration?: number;
}

interface StrengthLevels {
  abs: number;
  glutes: number;
  lowerBack: number;
  lastUpdated: number; // timestamp
}
```

### 3.4 Workout History
```typescript
interface WorkoutHistoryEntry {
  id: string;
  workoutId: string;
  workoutNumber: number;
  completedDate: number; // timestamp
  totalDuration: number; // actual minutes
  exercises: CompletedExercise[];
}

interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  completedSets: CompletedSet[];
}

interface CompletedSet {
  setNumber: number;
  actualReps?: number;
  actualDuration?: number;
}
```

---

## 4. Database Schema (Dexie/IndexedDB)

### 4.1 Tables
```typescript
class FitnessTrackerDB extends Dexie {
  workouts!: Table<Workout>;
  history!: Table<WorkoutHistoryEntry>;

  constructor() {
    super('FitnessTrackerDB');
    this.version(1).stores({
      workouts: '++id, workoutNumber, status, generatedDate',
      history: '++id, workoutId, completedDate, workoutNumber'
    });
  }
}
```

### 4.2 LocalStorage
- `userProfile` - User profile and calibration data (JSON string)
- `appSettings` - App settings/preferences

---

## 5. Core Business Logic

### 5.1 Workout Generator (`lib/workout-generator.ts`)

**Responsibilities**:
- Generate new workout based on user's current strength levels
- Select varied exercises covering all 3 muscle groups
- Determine sets and reps/duration for each exercise
- Calculate estimated workout duration
- Assign rest times between sets

**Algorithm**:
```typescript
function generateWorkout(
  userProfile: UserProfile,
  lastWorkouts: Workout[],
  allExercises: Exercise[]
): Workout {
  // 1. Select 3-4 exercises (1-2 per muscle group)
  // 2. Avoid recently used exercises (from last 2 workouts)
  // 3. For each exercise:
  //    - Determine if user has done it before
  //    - If yes: get last performance, add 5-10% progression
  //    - If no: estimate from strength level + heaviness score
  // 4. Create 3 sets per exercise
  // 5. Set rest time: 60-90 seconds based on exercise difficulty
  // 6. Calculate total estimated duration
}
```

### 5.2 Progression Calculator (`lib/progression-calculator.ts`)

**Responsibilities**:
- Calculate appropriate reps/duration for exercises
- Determine strength level from calibration
- Update strength levels after workouts
- Ensure safe, gradual progression (max 10% increase)

**Functions**:
```typescript
function calculateStrengthFromCalibration(
  calibrationData: CalibrationData
): StrengthLevels;

function estimateExerciseCapacity(
  exercise: Exercise,
  strengthLevel: number,
  exerciseHistory: CompletedExercise[]
): number;

function calculateProgression(
  lastPerformance: number,
  exerciseType: 'reps' | 'timed'
): number;

function updateStrengthLevels(
  currentLevels: StrengthLevels,
  completedWorkout: WorkoutHistoryEntry
): StrengthLevels;
```

### 5.3 Backup & Restore (`lib/backup-restore.ts`)

**Responsibilities**:
- Export all data to JSON
- Import data from JSON
- Validate imported data
- Merge or replace strategy
- Google Drive integration (future)

**Functions**:
```typescript
async function exportData(): Promise<string>;
async function importData(jsonString: string, strategy: 'merge' | 'replace'): Promise<void>;
function validateBackupData(data: unknown): boolean;
```

---

## 6. Component Architecture

### 6.1 Page Components

**Dashboard** (`pages/Dashboard.tsx`)
- Shows next workout card
- Quick stats (total workouts, last workout)
- "Start Workout" button
- Bottom navigation

**WorkoutExecution** (`pages/WorkoutExecution.tsx`)
- Overall progress bar
- Current exercise display
- Set tracker with editable inputs
- Exercise timer (for timed exercises)
- Rest timer between sets
- Navigation between exercises

**History** (`pages/History.tsx`)
- Chronological list of completed workouts
- Expandable workout details
- Workout summary cards

**ExerciseLibrary** (`pages/ExerciseLibrary.tsx`)
- Search bar
- Muscle group filter tabs
- Exercise cards with details
- Exercise detail modal

**Calibration** (`pages/Calibration.tsx`)
- Welcome/intro screen
- Step-by-step calibration exercises
- Input for user's max reps/duration
- Baseline calculation and confirmation

**Settings** (`pages/Settings.tsx`)
- Backup/restore options
- App preferences
- About information

### 6.2 Reusable Components

**common/**
- `Button.tsx` - Styled button with variants
- `Modal.tsx` - Modal overlay
- `ProgressBar.tsx` - Progress indicator
- `Timer.tsx` - Countdown timer
- `Checkbox.tsx` - Custom checkbox
- `Input.tsx` - Styled input field
- `Card.tsx` - Card container
- `Tabs.tsx` - Tab navigation

**workout/**
- `ExerciseCard.tsx` - Exercise display in workout
- `SetTracker.tsx` - Set list with checkboxes
- `RestTimer.tsx` - Rest countdown with skip
- `ExerciseInstructions.tsx` - Collapsible instructions

---

## 7. State Management (Zustand)

### 7.1 Workout Store
```typescript
interface WorkoutStore {
  currentWorkout: Workout | null;
  nextWorkout: Workout | null;
  isWorkoutInProgress: boolean;
  currentExerciseIndex: number;

  // Actions
  startWorkout: () => void;
  completeSet: (exerciseIndex: number, setIndex: number, actual: number) => void;
  completeExercise: (exerciseIndex: number) => void;
  completeWorkout: () => void;
  quitWorkout: () => void;
  loadNextWorkout: () => Promise<void>;
}
```

### 7.2 User Store
```typescript
interface UserStore {
  profile: UserProfile | null;

  // Actions
  initializeUser: () => Promise<void>;
  completeCalibration: (data: CalibrationData) => Promise<void>;
  updateStrengthLevels: (levels: StrengthLevels) => Promise<void>;
}
```

---

## 8. PWA Configuration

### 8.1 Manifest (`public/manifest.json`)
```json
{
  "name": "Home Fitness Tracker",
  "short_name": "Fitness",
  "description": "Progressive workout tracker for core strength",
  "theme_color": "#4F46E5",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 8.2 Service Worker Strategy
- **Precache**: App shell (HTML, CSS, JS)
- **Cache First**: Static assets (images, icons)
- **Network First**: Exercise data (with fallback)
- **IndexedDB**: All user data (already local)

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Test all functions in `lib/` directory
- Test Zustand store actions
- Test utility functions
- Coverage target: 80%+

### 9.2 Component Tests
- Test user interactions (clicking, typing)
- Test conditional rendering
- Test data display
- Use React Testing Library

### 9.3 Integration Tests
- Test complete user flows
- Calibration flow
- Workout completion flow
- Data persistence

### 9.4 Manual Testing
- Test on actual mobile devices (Android, iOS)
- Test offline functionality
- Test PWA installation
- Test performance (load times, animations)

---

## 10. Performance Optimization

### 10.1 Code Splitting
- Lazy load page components
- Split vendor bundles
- Use React.lazy() for route-based splitting

### 10.2 Asset Optimization
- Compress images (WebP format)
- Lazy load exercise videos
- Use CDN for external resources
- Minify CSS and JS

### 10.3 Runtime Optimization
- Memoize expensive calculations
- Debounce user inputs
- Virtual scrolling for long lists (if needed)
- Optimize re-renders with React.memo

---

## 11. Implementation Plan

### Phase 1: Foundation (Days 1-2)
**Goal**: Set up project infrastructure and basic navigation

1. **Project Setup**
   - Initialize Vite + React + TypeScript
   - Install dependencies (Tailwind, Zustand, Dexie, etc.)
   - Configure TypeScript, ESLint, Prettier
   - Set up Tailwind CSS
   - Create directory structure

2. **Database Setup**
   - Create Dexie schema
   - Set up IndexedDB tables
   - Create database utilities
   - Test database operations

3. **Exercise Database**
   - Create exercise data structure
   - Add initial 10-15 exercises (research proper exercises)
   - Include descriptions and muscle group mappings
   - Add heaviness scores

4. **Basic Routing**
   - Set up React Router
   - Create page components (empty shells)
   - Implement bottom navigation
   - Test navigation flow

**Commit Strategy**: Separate commits for setup, database, exercise data, and routing

---

### Phase 2: User Onboarding (Days 3-4)
**Goal**: First-time calibration flow

5. **User Profile System**
   - Create UserProfile type
   - Implement localStorage persistence
   - Create user initialization logic
   - Build user store with Zustand

6. **Calibration UI**
   - Welcome screen
   - Exercise instruction screens
   - Input forms for max reps/duration
   - Progress indicator

7. **Calibration Logic**
   - Calculate baseline strength from calibration exercises
   - Store calibration data
   - Generate first workout after calibration

**Testing**: Manually test calibration flow, verify data persistence

**Commit Strategy**: User profile setup, calibration UI, calibration logic

---

### Phase 3: Workout Generation (Days 5-6)
**Goal**: Algorithm to generate progressive workouts

8. **Workout Generator**
   - Implement exercise selection algorithm
   - Add variation logic (avoid recent exercises)
   - Implement progression calculator
   - Calculate sets/reps/duration

9. **Dashboard**
   - Display next workout card
   - Show exercise preview
   - Display quick stats
   - "Start Workout" button

10. **Workout Store**
    - Create workout state management
    - Load next workout on app start
    - Handle workout lifecycle

**Testing**: Generate multiple workouts, verify variety and progression

**Commit Strategy**: Generator algorithm, dashboard UI, workout store

---

### Phase 4: Workout Execution (Days 7-9)
**Goal**: Interactive workout experience

11. **Workout Execution UI**
    - Progress bar
    - Exercise header and details
    - Collapsible instructions
    - Set tracker layout

12. **Set Tracking**
    - Editable input fields for reps/duration
    - Checkbox to complete sets
    - Auto-adjust remaining sets on edit
    - Visual feedback

13. **Timer System**
    - Exercise timer for timed exercises
    - Rest timer between sets
    - Auto-start rest timer after set completion
    - Skip rest button
    - Timer state management

14. **Exercise Navigation**
    - Next/previous exercise buttons
    - Auto-advance to next exercise when complete
    - Workout completion flow
    - Quit workout dialog

**Testing**: Complete full workout, test all interactions, verify data capture

**Commit Strategy**: UI layout, set tracking, timer system, navigation

---

### Phase 5: History & Persistence (Days 10-11)
**Goal**: Track and display workout history

15. **Save Completed Workouts**
    - Create WorkoutHistoryEntry on completion
    - Store in IndexedDB
    - Update user strength levels
    - Generate next workout

16. **History View**
    - Display chronological list
    - Show workout summary cards
    - Expandable details
    - Format dates nicely

17. **Stats Calculation**
    - Total workouts completed
    - Last workout date
    - Display on dashboard

**Testing**: Complete workouts, verify history accuracy, check data integrity

**Commit Strategy**: Save logic, history UI, stats calculation

---

### Phase 6: Progressive Overload (Days 12-13)
**Goal**: Smart workout progression

18. **Progression Logic**
    - Track exercise history per muscle group
    - Calculate appropriate increases (5-10%)
    - Handle first-time exercises
    - Estimate from strength level + heaviness score

19. **Strength Level Updates**
    - Recalculate after each workout
    - Weight recent performance more
    - Ensure gradual, safe progression

20. **Testing & Refinement**
    - Complete multiple workouts in sequence
    - Verify progression is appropriate
    - Test edge cases (drastically different performance)

**Testing**: Multi-workout progression testing, verify increases are reasonable

**Commit Strategy**: Progression calculator, strength updates, refinements

---

### Phase 7: Exercise Library (Day 14)
**Goal**: Browse and learn exercises

21. **Exercise Library UI**
    - Grid/list of exercises
    - Muscle group filter tabs
    - Search functionality
    - Exercise cards

22. **Exercise Details**
    - Modal with full description
    - Video/image display
    - Source attribution
    - Muscle groups highlighted

**Testing**: Browse exercises, search, filter by muscle group

**Commit Strategy**: Library UI, detail modal, search/filter

---

### Phase 8: Backup & Restore (Day 15)
**Goal**: Data portability

23. **Export Functionality**
    - Gather all data (profile, workouts, history)
    - Serialize to JSON
    - Download as file

24. **Import Functionality**
    - File upload
    - Validate JSON structure
    - Merge or replace strategy
    - Import and update UI

25. **Settings Page**
    - Backup/restore buttons
    - App information
    - Version number

**Testing**: Export data, clear storage, import data, verify integrity

**Commit Strategy**: Export logic, import logic, settings UI

---

### Phase 9: PWA & Polish (Days 16-17)
**Goal**: Production-ready PWA

26. **PWA Setup**
    - Configure Vite PWA plugin
    - Create manifest.json
    - Generate icons (192x192, 512x512)
    - Set up service worker
    - Test offline functionality

27. **UI/UX Polish**
    - Smooth transitions
    - Loading states
    - Error states
    - Empty states
    - Accessibility improvements (ARIA labels)

28. **Mobile Optimization**
    - Test on actual devices
    - Adjust touch targets (min 44x44px)
    - Optimize animations for 60fps
    - Test different screen sizes

**Testing**: Install PWA on phone, test offline, verify all features work

**Commit Strategy**: PWA config, icons, polish commits per feature

---

### Phase 10: Testing & Documentation (Day 18)
**Goal**: Quality assurance

29. **Unit Tests**
    - Write tests for workout generator
    - Write tests for progression calculator
    - Write tests for key components
    - Run coverage report

30. **Integration Tests**
    - Test calibration flow
    - Test workout flow
    - Test backup/restore

31. **Documentation**
    - Update README with setup instructions
    - Add user guide
    - Document code where needed
    - Create contributing guide

**Testing**: Run all tests, fix any bugs found

**Commit Strategy**: Test files, documentation updates

---

## 12. Development Guidelines

### 12.1 Code Style
- Use functional components with hooks
- Prefer TypeScript strict mode
- Use meaningful variable names
- Keep components small and focused
- Extract business logic to separate functions

### 12.2 Git Commit Messages
Format: `<type>: <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `style`: UI/styling changes
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance tasks

Examples:
- `feat: add calibration welcome screen`
- `feat: implement workout generator algorithm`
- `fix: rest timer not starting after set completion`
- `refactor: extract set tracking logic to custom hook`
- `style: improve mobile responsiveness on workout screen`

### 12.3 Component Structure
```typescript
// Imports
import { useState } from 'react';

// Types
interface Props {
  // ...
}

// Component
export function ComponentName({ prop1, prop2 }: Props) {
  // Hooks
  const [state, setState] = useState();

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### 12.4 Testing Pattern
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    render(<ComponentName />);

    // Act
    // ...

    // Assert
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

---

## 13. Risk Mitigation

### 13.1 Potential Issues
1. **IndexedDB Complexity**: Use Dexie.js wrapper to simplify
2. **PWA Installation**: Test on multiple browsers
3. **Offline Sync**: Keep everything local, no server sync needed
4. **Performance**: Monitor bundle size, use code splitting
5. **Browser Compatibility**: Target modern browsers only (last 2 versions)

### 13.2 Fallback Strategies
- If IndexedDB fails: fallback to localStorage (limited)
- If PWA doesn't install: still works as web app
- If timer API issues: use setInterval fallback

---

## 14. Future Enhancements (Post-MVP)

### 14.1 Technical Improvements
- Google Drive API integration for cloud backup
- Push notifications for workout reminders
- Web Worker for background calculations
- Better analytics and insights

### 14.2 Feature Additions
- Custom workout creation
- More muscle groups
- Social sharing
- Workout streaks and achievements

---

## Estimated Timeline

- **Phase 1**: 2 days - Foundation
- **Phase 2**: 2 days - Calibration
- **Phase 3**: 2 days - Workout Generation
- **Phase 4**: 3 days - Workout Execution
- **Phase 5**: 2 days - History
- **Phase 6**: 2 days - Progression
- **Phase 7**: 1 day - Exercise Library
- **Phase 8**: 1 day - Backup/Restore
- **Phase 9**: 2 days - PWA & Polish
- **Phase 10**: 1 day - Testing

**Total**: ~18 days of focused development

---

## Version Control Strategy

### Branching
- `main` - Production-ready code
- `develop` - Active development
- Feature branches as needed for complex features

### Commit Frequency
- Commit after completing each sub-task
- Minimum 2-3 commits per day
- Meaningful commit messages
- Keep commits atomic (one logical change)

---

**Document Version**: 1.0
**Last Updated**: October 11, 2025
**Status**: Ready for Implementation
