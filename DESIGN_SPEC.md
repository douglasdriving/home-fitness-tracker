# Home Fitness Tracker - Design Specification

## 1. Overview

### 1.1 Product Vision
A progressive, open-source, local-first web application designed for fitness beginners who want to build core strength to prevent back injuries, improve posture, and develop overall strength. The app provides guided workouts that progressively adapt to the user's capabilities.

### 1.2 Target Audience
- Beginners with little workout experience
- People who want to exercise at home
- Users concerned about data privacy (local-first approach)
- Anyone looking to build core strength without gym equipment

### 1.3 Core Principles
- **Local-First**: All data stored on the user's device
- **Progressive**: Workouts adapt to user's improving strength
- **Accessible**: Works on both Android and iPhone as a PWA
- **Simple**: No equipment needed except a yoga mat
- **Safe**: Legitimate exercise instructions to prevent injury

---

## 2. Feature Breakdown

### 2.1 Exercise Database

**Purpose**: A comprehensive library of bodyweight exercises targeting core muscle groups.

**Exercise Properties**:
- **Name**: Exercise identifier
- **Target Muscle Group(s)**: abs, glutes, lower back
- **Description**: Step-by-step instructions on proper form
- **Media Reference**: Link to YouTube video or image demonstration
- **Source Attribution**: Reference to legitimate fitness source
- **Heaviness Score**: Numeric weight indicating difficulty relative to other exercises in the same muscle group
- **Type**: Rep-based or time-based
- **Equipment Required**: Yoga mat only

**Muscle Groups Covered** (Initial Version):
1. Abs (core/abdominals)
2. Glutes (posterior)
3. Lower Back (erector spinae)

---

### 2.2 Workout Plans

**Purpose**: Generate progressive workout schedules tailored to user's current fitness level.

**Workout Structure**:
- **Duration**: Starting at ~20 minutes, progressively increasing
- **Exercise Selection**: Mix of exercises covering all 3 muscle groups
- **Variety**: Different exercise combinations in each workout
- **Sets & Reps**: Defined per exercise based on user capacity

**Display Format**:
- List view showing upcoming workouts
- "Next Workout" prominently displayed
- Each workout shows:
  - All exercises included
  - Sets per exercise
  - Reps per set (or duration for timed exercises)

**Generation Logic**:
- Generated immediately after completing previous workout
- Uses historical data to determine progression
- Balances all 3 muscle groups
- Varies exercises to prevent monotony

---

### 2.3 Workout Execution

**Purpose**: Guide users through their workout step-by-step with flexibility for real-time adjustments.

**User Experience Flow**:

1. **Exercise View**
   - Display current exercise name
   - Show total sets and reps required
   - Toggle-able instructions panel
   - Optional media (video/image) display

2. **Set Tracking**
   - Visual checklist for each set
   - Check off completed sets
   - Progress indicator showing overall workout completion

3. **Rep Adjustment**
   - If user cannot complete planned reps, they can edit the number
   - App auto-adjusts remaining sets to match user's actual capacity
   - Adjusted values are saved to history

4. **Timer Integration** (for timed exercises)
   - Built-in countdown timer
   - Auto-starts when user initiates
   - Auto-checks set when timer completes

5. **Completion**
   - Set complete → check exercise
   - All exercises complete → workout complete
   - Confirmation screen and congratulations message

---

### 2.4 First-Time Calibration

**Purpose**: Establish baseline strength levels for accurate workout generation.

**Calibration Flow**:

1. **Welcome Screen**
   - Explain the calibration purpose
   - Estimated time: 10-15 minutes

2. **Calibration Exercises**
   - Select 1-2 representative exercises per muscle group
   - Exercises chosen for easy measurement and safety

3. **User Testing**
   - Instructions for each calibration exercise
   - User performs exercise to their comfortable maximum
   - User inputs achieved reps/duration

4. **Baseline Calculation**
   - App calculates initial strength levels for each muscle group
   - Sets starting workout difficulty
   - Stores baseline data for future progression calculations

---

### 2.5 History & Progress Tracking

**Purpose**: Track all completed workouts and provide insights into progress.

**Data Stored per Workout**:
- Date and time completed
- All exercises performed
- Actual sets completed
- Actual reps/duration per set (not planned values)
- Total workout duration
- Muscle groups worked

**History View**:
- Chronological list of past workouts
- Date-based filtering
- Expandable workout details
- Visual indicators for completed workouts

**Data Storage**:
- All history stored locally in browser storage
- No server-side storage
- Privacy-focused approach

---

### 2.6 Progressive Overload System

**Purpose**: Automatically increase workout difficulty to build strength over time.

**Progression Logic**:

1. **Repeated Exercise**
   - If user has done exercise before
   - Increment load slightly (e.g., +1-2 reps or +5-10 seconds)
   - Based on previous performance

2. **New Exercise**
   - If user hasn't done exercise before
   - Estimate capacity using:
     - Historical data from same muscle group
     - Heaviness score comparison
     - Conservative starting point

3. **Adaptation Triggers**
   - Generate next workout after current workout completion
   - Incorporate latest performance data
   - Adjust difficulty based on user's actual completed reps

**Safety Considerations**:
- Gradual progression to prevent injury
- Never increase by more than 10% per workout
- Allow user overrides if needed

---

### 2.7 Data Backup & Restore

**Purpose**: Enable users to backup their workout history to prevent data loss.

**Backup Features**:
- Export workout data to file
- Upload/sync to Google Drive
- Download backup file to device

**Restore Features**:
- Import backup file
- Merge or replace existing data
- Conflict resolution options

---

## 3. User Flows

### 3.1 First-Time User Flow

```
Start App
    ↓
Welcome Screen
    ↓
Calibration Introduction
    ↓
Calibration Exercise 1 (e.g., Plank - Core)
    ↓
User performs & logs max time
    ↓
Calibration Exercise 2 (e.g., Glute Bridge - Glutes)
    ↓
User performs & logs max reps
    ↓
Calibration Exercise 3 (e.g., Superman - Lower Back)
    ↓
User performs & logs max reps
    ↓
Baseline Calculated
    ↓
First Workout Generated
    ↓
Main Dashboard (Ready to Start)
```

---

### 3.2 Regular Workout Flow

```
Main Dashboard
    ↓
View "Next Workout" Card
    ↓
Tap "Start Workout"
    ↓
Workout Overview (all exercises listed)
    ↓
Begin First Exercise
    ↓
[For Each Exercise]
    │
    ├─→ View Exercise Name & Instructions
    │
    ├─→ [Optional] View Video/Image
    │
    ├─→ Perform Set 1
    │
    ├─→ Check Off Set 1
    │   │
    │   └─→ [If reps adjusted]
    │       └─→ Update remaining sets
    │
    ├─→ Rest Period
    │
    ├─→ Repeat for all sets
    │
    └─→ Exercise Complete ✓
    ↓
Move to Next Exercise
    ↓
[Repeat for all exercises]
    ↓
Workout Complete! 🎉
    ↓
Save to History
    ↓
Generate Next Workout
    ↓
Return to Dashboard
```

---

### 3.3 Viewing History Flow

```
Main Dashboard
    ↓
Navigate to History Tab
    ↓
View List of Past Workouts
    ↓
[Optional] Filter by Date Range
    ↓
Select Specific Workout
    ↓
View Workout Details
    - Date completed
    - Exercises performed
    - Sets & reps achieved
    - Duration
    ↓
Return to History List or Dashboard
```

---

### 3.4 Backup & Restore Flow

```
Settings/Menu
    ↓
Select "Backup Data"
    ↓
Choose Backup Method
    ├─→ Export to File
    │   └─→ Download JSON file
    │
    └─→ Sync to Google Drive
        └─→ Authenticate
        └─→ Upload data
    ↓
Confirmation Message
    ↓
[For Restore]
    ↓
Select "Restore Data"
    ↓
Choose Restore Method
    ├─→ Import File
    │   └─→ Select file
    │
    └─→ Restore from Google Drive
        └─→ Authenticate
        └─→ Select backup version
    ↓
Choose Merge or Replace
    ↓
Data Restored
    ↓
Confirmation Message
```

---

## 4. Screen Designs & Layouts

### 4.1 Main Dashboard

**Components**:
- **Header**: App name, settings icon
- **Next Workout Card**:
  - Workout name/number
  - "Start Workout" button
  - Preview of exercises (collapsed list)
  - Estimated duration
- **Quick Stats**:
  - Total workouts completed
  - Current streak
  - Last workout date
- **Bottom Navigation**:
  - Home (Dashboard)
  - History
  - Exercises (browse)
  - Settings

**Visual Layout**:
```
┌─────────────────────────┐
│  Home Fitness Tracker   │
│                    ⚙️   │
├─────────────────────────┤
│                         │
│  NEXT WORKOUT           │
│  Workout #15            │
│  ────────────────       │
│  • Plank (3 sets)       │
│  • Glute Bridge (3x12)  │
│  • Superman (3x10)      │
│  • ...                  │
│                         │
│  [  Start Workout  ]    │
│                         │
│  Est. Duration: 22 min  │
│                         │
├─────────────────────────┤
│  Quick Stats            │
│  ✅ 14 workouts done    │
│  🔥 7 day streak        │
│  📅 Last: Yesterday     │
└─────────────────────────┘
│ 🏠  📊  💪  ⚙️         │
└─────────────────────────┘
```

---

### 4.2 Workout Execution Screen

**Components**:
- **Progress Bar**: Overall workout completion
- **Exercise Header**: Name, muscle group tag
- **Instructions Toggle**: Expandable panel
- **Media Display**: Video/image (optional)
- **Set Tracker**:
  - Set number
  - Target reps/duration
  - Checkbox
  - Edit button
- **Timer** (for timed exercises): Start/pause/reset
- **Navigation**: Previous/Next exercise, Quit workout

**Visual Layout**:
```
┌─────────────────────────┐
│ ▓▓▓▓▓▓▓░░░░░░░░░ 40%    │
├─────────────────────────┤
│                         │
│  Plank                  │
│  [ABS]                  │
│                         │
│  ▼ Instructions         │
│  (collapsed/expanded)   │
│                         │
│  [▶ View Video]         │
│                         │
├─────────────────────────┤
│  SET TRACKING           │
│                         │
│  ☑ Set 1: 30 sec       │
│  □ Set 2: 30 sec  ✏️    │
│  □ Set 3: 30 sec        │
│                         │
│  [  Start Timer  ]      │
│                         │
├─────────────────────────┤
│  [  Next Exercise  ]    │
│                         │
│  X Quit Workout         │
└─────────────────────────┘
```

---

### 4.3 History Screen

**Components**:
- **Date Filter**: Calendar/date picker
- **Workout List**:
  - Date
  - Workout summary
  - Completion badge
- **Workout Detail View**:
  - Full exercise breakdown
  - Actual reps/duration logged
  - Notes (if any)

**Visual Layout**:
```
┌─────────────────────────┐
│  Workout History        │
│  [📅 Filter]           │
├─────────────────────────┤
│                         │
│  Today - Oct 11         │
│  ✓ Workout #15          │
│  3 exercises, 22 min    │
│  ────────────────       │
│                         │
│  Yesterday - Oct 10     │
│  ✓ Workout #14          │
│  3 exercises, 20 min    │
│  ────────────────       │
│                         │
│  Oct 8                  │
│  ✓ Workout #13          │
│  3 exercises, 21 min    │
│  ────────────────       │
│                         │
│  (tap for details)      │
│                         │
└─────────────────────────┘
│ 🏠  📊  💪  ⚙️         │
└─────────────────────────┘
```

---

### 4.4 Exercise Library Screen

**Components**:
- **Search Bar**: Filter exercises by name
- **Muscle Group Tabs**: Filter by abs/glutes/lower back
- **Exercise Cards**:
  - Exercise name
  - Muscle group tags
  - Heaviness indicator
  - Tap to view details

**Visual Layout**:
```
┌─────────────────────────┐
│  Exercise Library       │
│  [🔍 Search...]        │
├─────────────────────────┤
│ [Abs][Glutes][Low Back] │
├─────────────────────────┤
│                         │
│  Plank                  │
│  [ABS] Heaviness: ●●○○  │
│  ────────────────       │
│                         │
│  Glute Bridge           │
│  [GLUTES] Heavy: ●●●○   │
│  ────────────────       │
│                         │
│  Superman               │
│  [LOW BACK] Heavy: ●●○○ │
│  ────────────────       │
│                         │
│  (tap for details)      │
│                         │
└─────────────────────────┘
│ 🏠  📊  💪  ⚙️         │
└─────────────────────────┘
```

---

## 5. Data Architecture

### 5.1 Exercise Database Schema

```
Exercise {
  id: string (unique)
  name: string
  muscleGroups: array<string> ["abs" | "glutes" | "lowerBack"]
  description: string (instructions)
  videoUrl?: string (optional)
  imageUrl?: string (optional)
  source: string (attribution)
  heavinessScore: number (1-10 per muscle group)
  type: "reps" | "timed"
  defaultReps?: number (if rep-based)
  defaultDuration?: number (if timed, in seconds)
}
```

**Example**:
```json
{
  "id": "plank-001",
  "name": "Plank",
  "muscleGroups": ["abs", "lowerBack"],
  "description": "Hold a push-up position with forearms on the ground...",
  "videoUrl": "https://youtube.com/watch?v=...",
  "source": "American Council on Exercise",
  "heavinessScore": {
    "abs": 5,
    "lowerBack": 3
  },
  "type": "timed",
  "defaultDuration": 30
}
```

---

### 5.2 Workout Schema

```
Workout {
  id: string (unique)
  workoutNumber: number (sequential)
  generatedDate: timestamp
  completedDate?: timestamp
  status: "pending" | "completed"
  estimatedDuration: number (minutes)
  exercises: array<WorkoutExercise>
}

WorkoutExercise {
  exerciseId: string (reference to Exercise)
  exerciseName: string (cached for display)
  muscleGroups: array<string>
  sets: array<Set>
}

Set {
  setNumber: number
  targetReps?: number (if rep-based)
  targetDuration?: number (if timed, seconds)
  completed: boolean
  actualReps?: number (logged after completion)
  actualDuration?: number (logged after completion)
}
```

---

### 5.3 User Profile Schema

```
UserProfile {
  userId: string (device-generated)
  createdDate: timestamp
  calibrationData: CalibrationData
  currentStrengthLevels: StrengthLevels
}

CalibrationData {
  calibrationDate: timestamp
  exercises: array<{
    exerciseId: string
    muscleGroup: string
    achievedReps?: number
    achievedDuration?: number
  }>
}

StrengthLevels {
  abs: number (calculated score)
  glutes: number (calculated score)
  lowerBack: number (calculated score)
  lastUpdated: timestamp
}
```

---

### 5.4 History Schema

```
WorkoutHistory {
  workoutId: string (reference to Workout)
  completedDate: timestamp
  totalDuration: number (actual minutes)
  exercises: array<CompletedExercise>
}

CompletedExercise {
  exerciseId: string
  exerciseName: string
  muscleGroups: array<string>
  completedSets: array<{
    setNumber: number
    actualReps?: number
    actualDuration?: number
  }>
}
```

---

## 6. System Diagrams

### 6.1 Application Architecture Diagram

```
┌─────────────────────────────────────────┐
│         User Interface (PWA)            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │
│  │Dash  │ │Work  │ │Hist  │ │Settings││
│  │board │ │out   │ │ory   │ │        ││
│  └──────┘ └──────┘ └──────┘ └────────┘ │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         Application Logic Layer         │
│  ┌────────────┐  ┌──────────────────┐  │
│  │ Workout    │  │ Progression      │  │
│  │ Generator  │  │ Calculator       │  │
│  └────────────┘  └──────────────────┘  │
│  ┌────────────┐  ┌──────────────────┐  │
│  │ Exercise   │  │ History          │  │
│  │ Manager    │  │ Tracker          │  │
│  └────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         Data Storage Layer              │
│  ┌────────────┐  ┌──────────────────┐  │
│  │ IndexedDB  │  │ LocalStorage     │  │
│  │ (History)  │  │ (User Profile)   │  │
│  └────────────┘  └──────────────────┘  │
│  ┌────────────┐                         │
│  │ Exercise   │                         │
│  │ Database   │                         │
│  │ (Static)   │                         │
│  └────────────┘                         │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         External Services               │
│  ┌────────────┐  ┌──────────────────┐  │
│  │ Google     │  │ YouTube          │  │
│  │ Drive API  │  │ (video links)    │  │
│  │ (backup)   │  │                  │  │
│  └────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

---

### 6.2 Progression Algorithm Flow

```
                    START
                      ↓
        ┌─────────────────────────┐
        │ Workout Just Completed  │
        └─────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ Save to History with    │
        │ Actual Reps/Duration    │
        └─────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ Update Strength Levels  │
        │ for Each Muscle Group   │
        └─────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ Select Exercises for    │
        │ Next Workout            │
        │ (varied, all 3 groups)  │
        └─────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ For Each Exercise:      │
        └─────────────────────────┘
                      ↓
                ┌─────────┐
            ┌───│ Done    │───┐
            │   │ Before? │   │
            ↓   └─────────┘   ↓
          YES                 NO
            ↓                  ↓
    ┌──────────────┐    ┌──────────────┐
    │ Get Last     │    │ Estimate     │
    │ Performance  │    │ Using:       │
    └──────────────┘    │ - Muscle     │
            ↓            │   Group Data │
    ┌──────────────┐    │ - Heaviness  │
    │ Add 5-10%    │    │   Score      │
    │ Progression  │    └──────────────┘
    └──────────────┘           ↓
            ↓            ┌──────────────┐
            │            │ Set          │
            │            │ Conservative │
            │            │ Starting Val │
            │            └──────────────┘
            ↓                  ↓
        ┌─────────────────────────┐
        │ Set Target Reps/Duration│
        │ for All Sets            │
        └─────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ Save New Workout as     │
        │ "Next Workout"          │
        └─────────────────────────┘
                      ↓
                    END
```

---

### 6.3 Workout Execution State Machine

```
         ┌─────────────┐
         │   READY     │ (Workout displayed on dashboard)
         └─────────────┘
                │
                │ User taps "Start Workout"
                ↓
         ┌─────────────┐
         │ IN_PROGRESS │
         └─────────────┘
                │
                │ For each exercise
                ↓
         ┌─────────────┐
         │  EXERCISE   │
         │   ACTIVE    │
         └─────────────┘
                │
                │ For each set
                ↓
         ┌─────────────┐
         │SET_ACTIVE   │
         └─────────────┘
                │
           ┌────┴────┐
           │         │
      Checkbox   Edit Reps
           │         │
           ↓         ↓
    ┌──────────┐  ┌──────────────┐
    │SET_DONE  │  │ ADJUST_SETS  │
    └──────────┘  └──────────────┘
           │         │
           │         ↓
           │    ┌──────────┐
           │    │SET_DONE  │
           │    └──────────┘
           │         │
           └────┬────┘
                ↓
        ┌──────────────┐
        │ All Sets     │
        │ Complete?    │
        └──────────────┘
           Yes │    No
               ↓      ↓
        ┌──────────┐ (return to SET_ACTIVE)
        │EXERCISE  │
        │COMPLETE  │
        └──────────┘
                │
        ┌───────┴────────┐
        │ More Exercises?│
        └────────────────┘
           Yes │     No
               │      ↓
        (return)  ┌──────────────┐
                  │   WORKOUT    │
                  │  COMPLETE    │
                  └──────────────┘
                         │
                         ↓
                  ┌──────────────┐
                  │ Save History │
                  │ Generate Next│
                  └──────────────┘
                         │
                         ↓
                  ┌──────────────┐
                  │   FINISHED   │
                  └──────────────┘
```

---

## 7. User Interface States & Error Handling

### 7.1 Loading States
- **Initial App Load**: Splash screen with app logo
- **Workout Generation**: "Generating your next workout..." spinner
- **History Loading**: Skeleton screens while fetching data
- **Backup/Restore**: Progress indicator with percentage

### 7.2 Empty States
- **No History**: "You haven't completed any workouts yet. Start your first workout to track progress!"
- **No Next Workout**: "Complete calibration to generate your first workout"
- **Exercise Library Search**: "No exercises found. Try different search terms."

### 7.3 Error States
- **Failed Workout Generation**: "Couldn't generate workout. Please try again." with retry button
- **Backup Failed**: "Backup failed. Check your connection and try again."
- **Restore Failed**: "Could not restore data. File may be corrupted."
- **Storage Full**: "Device storage full. Free up space or backup data."

### 7.4 Confirmation Dialogs
- **Quit Workout Mid-Session**: "Are you sure you want to quit? Progress won't be saved."
- **Delete History**: "Delete this workout from history? This cannot be undone."
- **Restore Data**: "Restore backup? Choose to merge with or replace current data."

---

## 8. Accessibility Considerations

### 8.1 Visual
- High contrast mode support
- Adjustable font sizes
- Clear visual hierarchy
- Colorblind-friendly indicators (not relying on color alone)

### 8.2 Motor
- Large touch targets (minimum 44x44px)
- No time-critical interactions (except timer, which is optional)
- Swipe gestures optional (always provide button alternative)

### 8.3 Cognitive
- Simple, clear language
- Consistent navigation patterns
- Progress indicators for multi-step processes
- Option to revisit tutorials/instructions

### 8.4 Screen Readers
- Proper ARIA labels
- Semantic HTML structure
- Descriptive button labels
- Announced state changes

---

## 9. Progressive Web App (PWA) Requirements

### 9.1 Installation
- Installable on Android and iOS home screens
- Custom app icon and splash screen
- Standalone display mode (no browser UI)

### 9.2 Offline Capability
- Full functionality offline
- Service worker for caching
- Background sync for backups when connection available

### 9.3 Performance
- Fast initial load (< 3 seconds)
- Smooth animations (60fps)
- Optimized images and media
- Lazy loading for exercise videos

### 9.4 Responsive Design
- Mobile-first approach
- Support for phone screens (375px - 430px width)
- Tablet optimization (768px+ width)
- Desktop view (1024px+ width)

---

## 10. Open Questions & Future Enhancements

### 10.1 Open Questions for Review
1. Should there be a rest day schedule, or user-driven workout frequency?
2. What is the minimum number of exercises per workout?
3. Should users be able to manually create custom workouts?
4. Should there be achievement/badges system for motivation?
5. How should the app handle missed workouts (not completing for several days)?

### 10.2 Future Enhancements (Out of Scope for V1)
- More muscle groups (upper body, legs)
- Equipment-based exercises (dumbbells, resistance bands)
- Social features (sharing progress)
- Workout reminders/notifications
- Detailed analytics and charts
- Multiple user profiles
- Audio coaching during workouts
- Integration with fitness wearables

---

## 11. Success Metrics

### 11.1 User Engagement
- Daily/weekly active users
- Workout completion rate
- Average workouts per user per week
- Calibration completion rate

### 11.2 User Progression
- Average strength level increase over time
- Rep/duration improvements per exercise
- User retention (30-day, 90-day)

### 11.3 App Performance
- App load time
- Offline reliability
- Backup success rate
- PWA installation rate

---

## 12. Implementation Priorities

### Phase 1: Core Functionality (MVP)
1. Exercise database with basic exercises
2. First-time calibration
3. Workout generation algorithm
4. Workout execution interface
5. History tracking
6. Local data storage

### Phase 2: Enhanced Features
1. Progressive overload refinement
2. Exercise library browsing
3. Backup/restore to Google Drive
4. PWA optimization and installation
5. Improved UI/UX polish

### Phase 3: Polish & Optimization
1. Additional exercises
2. Better analytics
3. Accessibility improvements
4. Performance optimization
5. User testing and refinements

---

## Appendix A: Example Exercises by Muscle Group

### Abs
- Plank (timed)
- Crunches (reps)
- Bicycle Crunches (reps)
- Dead Bug (reps)
- Mountain Climbers (timed or reps)
- Russian Twists (reps)
- Leg Raises (reps)
- Hollow Body Hold (timed)

### Glutes
- Glute Bridge (reps)
- Single-Leg Glute Bridge (reps)
- Donkey Kicks (reps)
- Fire Hydrants (reps)
- Squat Hold (timed)
- Wall Sit (timed)

### Lower Back
- Superman (reps or timed)
- Bird Dog (reps)
- Prone Back Extension (reps)
- Bridge (timed)
- Cat-Cow Stretch (reps)

---

## Appendix B: Sample Workout

**Workout #1 (Post-Calibration)**
- **Plank**: 3 sets × 20 seconds [Abs]
- **Glute Bridge**: 3 sets × 10 reps [Glutes]
- **Bird Dog**: 3 sets × 8 reps (each side) [Lower Back]
- **Estimated Duration**: 18 minutes

**Workout #15 (After Progression)**
- **Plank**: 3 sets × 45 seconds [Abs]
- **Bicycle Crunches**: 3 sets × 20 reps [Abs]
- **Single-Leg Glute Bridge**: 3 sets × 15 reps (each leg) [Glutes]
- **Superman**: 3 sets × 15 reps [Lower Back]
- **Estimated Duration**: 25 minutes

---

## Appendix C: Heaviness Score Reference

**Scale**: 1-10, where:
- **1-3**: Beginner-friendly, low intensity
- **4-6**: Moderate difficulty
- **7-10**: Advanced, high intensity

**Example Heaviness Scores**:
- Plank (Abs): 5
- Crunches (Abs): 3
- Leg Raises (Abs): 7
- Glute Bridge (Glutes): 4
- Single-Leg Glute Bridge (Glutes): 6
- Bird Dog (Lower Back): 4
- Superman (Lower Back): 5

*Note: Scores are relative within each muscle group, not across groups.*

---

## Document Control

- **Version**: 1.0
- **Last Updated**: October 11, 2025
- **Status**: Draft for Review
- **Next Steps**: Review and approval before technical implementation
