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

- [ ] **#14: Add timer to calibration screen for timed exercises**
  - Issue: Users must exit app to time their plank during calibration
  - Fix: Add Timer component to calibration screen for timed exercises
  - Done when: Timer appears on calibration screen for plank/bird dog
  - Status: PENDING

- [ ] **#3: Remove redundant buttons from rest timer**
  - Issue: 2 skip buttons + pause button (pause is redundant)
  - Fix: Remove pause button and one skip button from Timer component, keep single skip button below
  - Done when: Rest timer only has one "Skip Rest" button
  - Status: PENDING

- [ ] **#11: Make bottom nav active state more obvious**
  - Issue: Current tab is unclear (subtle color shift)
  - Fix: Add stronger visual indicator (bold text, icon color, underline, or background)
  - Done when: Active tab is immediately obvious at a glance
  - Status: PENDING

- [ ] **#12: Remove redundant title bars from all pages**
  - Issue: Title bar at top takes up space, bottom nav already shows location
  - Fix: Remove header sections from Dashboard, History, ExerciseLibrary, Settings
  - Done when: Pages start with content, no title bar header
  - Status: PENDING

## 🟡 MEDIUM PRIORITY (Confusing UX)

- [ ] **#5: Remove confusing strength level stats from dashboard**
  - Issue: "Avg strength" and "Strength levels" section are unclear and redundant
  - Fix: Remove both average strength stat and strength levels breakdown
  - Done when: Dashboard no longer shows any strength-related stats
  - Status: PENDING

- [ ] **#6: Add workouts this week/month stats**
  - Issue: Need meaningful stats to replace removed strength stats
  - Fix: Calculate and display "Workouts This Week" and "Workouts This Month"
  - Done when: Dashboard shows workout count for current week and month
  - Status: PENDING

- [ ] **#4: Show calibration data somewhere**
  - Issue: Can't view initial calibration results anywhere
  - Fix: Add calibration data to Settings page with date and achieved values
  - Done when: User can see their calibration results in Settings
  - Status: PENDING

## 🟢 LOW PRIORITY (Polish & Nice-to-Have)

- [ ] **#8: Remove profile section from Settings**
  - Issue: Profile section doesn't provide valuable info
  - Fix: Remove "Profile" card from Settings page
  - Done when: Settings page no longer has Profile section
  - Status: PENDING

- [ ] **#9: Remove about section from Settings**
  - Issue: About section is not needed
  - Fix: Remove "About" card from Settings page
  - Done when: Settings page no longer has About section
  - Status: PENDING

- [ ] **#7/#10: Add PWA install functionality**
  - Issue: No install prompt, unclear how to install
  - Fix: Add install button to Settings, implement beforeinstallprompt handler
  - Done when: Install button appears in Settings when PWA is installable
  - Status: PENDING

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

**Total Items:** 16
**Completed:** 2
**In Progress:** 1
**Remaining:** 13
