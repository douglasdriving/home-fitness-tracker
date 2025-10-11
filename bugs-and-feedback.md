# Bugs & Feature Requests - Priority Ordered

## ✅ COMPLETED

- [x] **#1: Pre-fill input fields with target values**
  - Fix: Input fields now default to target reps/duration
  - Done when: User sees target value pre-filled, only changes if different
  - Status: FIXED ✓

- [x] **#2: Auto-adjust remaining sets when user does less**
  - Fix: When user completes less than target, update all remaining sets to match
  - Done when: Subsequent sets show the adjusted lower value automatically
  - Status: FIXED ✓

## 🔴 CRITICAL PRIORITY (Breaks Core Functionality)

- [x] **#13: Calibration strength calculation is broken**
  - Issue: 90s plank → strength level 3 → next workout generates 3x10s plank (way too easy)
  - Fix: Changed formula from `/ 6` to `* (10/6)` to make it inverse of estimation formula
  - Done when: 90s plank calibration results in appropriate workout difficulty
  - Status: FIXED ✓ (90s now gives strength 30 → 90s workout)

## 🟠 HIGH PRIORITY (Major UX Issues)

- [x] **#14: Add timer to calibration screen for timed exercises**
  - Issue: Users must exit app to time their plank during calibration
  - Fix: Added Timer component with 10-minute duration for timed exercises
  - Done when: Timer appears on calibration screen for plank/bird dog
  - Status: FIXED ✓

- [x] **#3: Remove redundant buttons from rest timer**
  - Issue: 2 skip buttons + pause button (pause is redundant)
  - Fix: Added hideControls prop to Timer, applied to rest timer in WorkoutExecution
  - Done when: Rest timer only has one "Skip Rest" button
  - Status: FIXED ✓

- [x] **#11: Make bottom nav active state more obvious**
  - Issue: Current tab is unclear (subtle color shift)
  - Fix: Added bold text, background tint, and colored indicator bar for active tab
  - Done when: Active tab is immediately obvious at a glance
  - Status: FIXED ✓

- [x] **#12: Remove redundant title bars from all pages**
  - Issue: Title bar at top takes up space, bottom nav already shows location
  - Fix: Removed header sections from Dashboard, History, ExerciseLibrary, Settings
  - Done when: Pages start with content, no title bar header
  - Status: FIXED ✓

- [x] **#17: Calibration timer should count up, not down**
  - Issue: Timer counts down from 10 minutes, confusing for calibration where you enter seconds achieved
  - Fix: Added countUp and showSecondsOnly modes to Timer component
  - Done when: Calibration timer counts up from 0s and user can easily read seconds
  - Status: FIXED ✓

- [x] **#20: Scroll position persists when switching tabs**
  - Issue: When switching tabs, page stays scrolled to previous position instead of starting at top
  - Fix: Added ScrollToTop component that watches route changes and scrolls to top
  - Done when: Every tab switch starts at the top of the new page
  - Status: FIXED ✓

- [x] **#21: Unnecessary scrollbars on pages with enough space**
  - Issue: Pages are scrollable even when content fits, as if window is taller than screen
  - Fix: Removed duplicate min-h-screen from inner container, adjusted padding
  - Done when: Scroll only appears when content actually exceeds screen height
  - Status: FIXED ✓

## 🟡 MEDIUM PRIORITY (Confusing UX)

- [x] **#5: Remove confusing strength level stats from dashboard**
  - Issue: "Avg strength" and "Strength levels" section are unclear and redundant
  - Fix: Removed average strength stat and strength levels breakdown section
  - Done when: Dashboard no longer shows any strength-related stats
  - Status: FIXED ✓

- [x] **#6: Add workouts this week/month stats**
  - Issue: Need meaningful stats to replace removed strength stats
  - Fix: Added "Total", "This Week", and "This Month" workout counts to Quick Stats
  - Done when: Dashboard shows workout count for current week and month
  - Status: FIXED ✓

- [x] **#4: Show calibration data somewhere**
  - Issue: Can't view initial calibration results anywhere
  - Fix: Added "Calibration Results" section to Settings with date and achieved values
  - Done when: User can see their calibration results in Settings
  - Status: FIXED ✓

- [x] **#18: Calibration should inform sustainable workout targets**
  - Issue: Workouts used calibration max as-is, but calibration tests single-set max (not sustainable for multiple sets)
  - Fix: Apply 75% multiplier to estimated capacity - all sets use same sustainable target
  - Done when: Workouts use realistic targets (e.g., 90s calibration → 3x68s workout, not 3x90s)
  - Status: FIXED ✓

## 🟢 LOW PRIORITY (Polish & Nice-to-Have)

- [x] **#8: Remove profile section from Settings**
  - Issue: Profile section doesn't provide valuable info
  - Fix: Removed "Profile" card from Settings page
  - Done when: Settings page no longer has Profile section
  - Status: FIXED ✓

- [x] **#9: Remove about section from Settings**
  - Issue: About section is not needed
  - Fix: Removed "About" card from Settings page
  - Done when: Settings page no longer has About section
  - Status: FIXED ✓

- [x] **#7/#10: Add PWA install functionality**
  - Issue: No install prompt, unclear how to install
  - Fix: Implemented beforeinstallprompt handler and "Install App" button in Settings
  - Done when: Install button appears in Settings when PWA is installable
  - Status: FIXED ✓

- [x] **#19: Set up deployment to free hosting**
  - Issue: Need to deploy app to HTTPS hosting for PWA to work properly
  - Fix: Added vercel.json config and comprehensive DEPLOYMENT.md guide
  - Done when: App can be easily deployed to free HTTPS hosting service
  - Status: FIXED ✓

- [x] **#22: Add in-app feedback/bug reporting**
  - Issue: No way to submit feedback or report bugs from within the app
  - Fix: Created in-app feedback form with Vercel Serverless Function + GitHub API
  - Done when: Users can easily report bugs/feedback without leaving the app
  - Status: FIXED ✓

- [ ] **#15: Embed video player instead of external links**
  - Issue: Clicking video opens separate app/tab
  - Fix: Embed YouTube videos using iframe
  - Done when: Videos play inline without leaving app
  - Status: DEFERRED (requires significant rework)

- [ ] **#16: Add video timestamps to skip to relevant parts**
  - Issue: Videos don't start at the exercise explanation
  - Fix: Add timestamp parameters to YouTube URLs
  - Done when: Videos start at relevant timestamp
  - Status: DEFERRED (requires finding timestamps for each video)

---

**Total Items:** 22
**Completed:** 19
**In Progress:** 0
**Remaining:** 3 (all deferred)
