# Changelog

## 2025-01-19 - Major Bug Fixes and UX Improvements

### Critical Bug Fixes
- **Fixed rest timer freeze**: Resolved infinite render loop caused by workout position updates
- **Fixed input field flickering**: Removed auto-adjustment logic that caused re-render loops
- **Fixed set completion tracking**: Only completed sets with actual values are now saved to history
- **Fixed workout not clearing after completion**: Workout properly removes from dashboard after completion
- **Fixed workout completion statistics**: Accurate counts for sets, reps, and time under tension

### New Features - First-Time Exercise Handling
- **"New!" badge on Dashboard**: New exercises show a blue badge in workout overview
- **Hidden targets for new exercises**: Target reps/duration not shown for exercises you haven't done before
- **Empty input fields**: First-time exercises start with blank input instead of pre-filled target
- **Count-up timer**: Timed exercises you haven't done before count up from 0 instead of down
- **No progress bar on count-up**: Cleaner UI for open-ended timed exercises
- **Carry-forward performance**: First set performance automatically updates remaining sets' targets

### Elastic Band Exercise Filter
- **Removed 5 anchored band exercises**: Only loop band exercises remain (3 exercises)
- **Added clarification notes**: Descriptions now specify "loop resistance bands (broad rubber bands)"
- **Equipment filtering**: Only shows exercises compatible with available equipment

### UX Improvements
- **Fixed button visibility**: Workout completion screen buttons now properly visible
- **Fixed preview flickering**: "Up Next" display on rest screen no longer flickers between values
- **Deleted duplicate controls**: Removed redundant "Skip Rest" button
- **Improved delete functionality**: Can now delete workout history entries with confirmation

### Technical Improvements
- **Prevented infinite loops**: Added position change detection to avoid unnecessary updates
- **Improved timer stability**: Used refs to prevent interval cleanup during renders
- **Better state management**: Used local preview state to prevent flickering
- **Added totalDuration to Workout interface**: Proper TypeScript typing for completed workouts

### Bug Fixes
- Input fields no longer reset constantly during workout
- Set progress bar no longer flickers
- Rest timer properly counts down without freezing
- Workout completion properly logs all completed sets
- Dashboard reloads correctly when returning from completion screen

## Previous Versions
See git history for earlier changes.
