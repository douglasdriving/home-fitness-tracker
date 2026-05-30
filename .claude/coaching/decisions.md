# Coaching Decisions

A running log of fitness decisions made during coaching sessions, with rationale.

<!-- Entries will be added in reverse chronological order (newest first) -->
<!-- Format:
## YYYY-MM-DD - Decision Title
**Decision:** What was decided
**Rationale:** Why this makes sense
**Impact on app:** What should change in the app (if anything)
-->

## 2026-05-29 - Switch to Daily Short Sessions with Rolling Rotation

**Decision:** Move from 2x/week full-body 60-minute sessions to 5x/week (weekday) 20-minute focused sessions, one muscle group per day. Rolling rotation: Abs → Glutes → Lower Back → repeat. Floor is 3 sessions/week, not 5.

**Rationale:**
- Frequency builds habits faster than infrequent long sessions
- Shorter sessions reduce psychological resistance ("20 minutes" vs "an hour")
- Focused sessions mean higher quality work with less fatigue
- Rolling rotation means missed days don't create muscle group gaps
- Total weekly volume stays equal or increases despite shorter sessions
- Addresses growing boredom with repetitive full-body structure

**Impact on app:** The app currently generates 4-exercise workouts covering all three muscle groups. Would need to support single-muscle-group focused workouts with 3 exercises from that group, 3 sets each. Rotation logic needed to track which muscle group is next. Stretching routine changes from fixed 8-stretch full-body to 2-3 targeted stretches per muscle group.

## 2026-05-29 - Finalized Session Structure

**Decision:** Each focused session = 3 exercises x 3 sets from one muscle group (~18-20 min), followed by 2-3 targeted stretches (~2 min). Total session ~20-22 minutes.

**Rationale:**
- 3x3 preferred over 2x4 for more within-session variety (addresses boredom)
- 9 total working sets is comparable volume to 8 (2x4)
- More exercises per session means faster rotation through the exercise pool
- Targeted stretching (instead of full-body) matches the focused session - no need to stretch muscles you didn't work
- 20-22 min total fits cleanly into a morning routine before heading to coworking

**Impact on app:** Workout generator needs to produce 3-exercise, 3-set sessions from a single muscle group. Stretching routine needs to be parameterized by muscle group (abs: cat-cow/cobra/lying spinal twist; glutes: figure-four/hip flexor stretch/lying spinal twist; lower back: child's pose/cat-cow/cobra).

## 2026-05-29 - Exercise Roster Changes

**Decision:** Retire dead bug and Bulgarian split squat. Update form/instructions for reverse crunches, hollow body hold, mountain climbers, fire hydrants. Restructure side plank to McGill protocol. Change plank shoulder taps to rep-based. Add resistance band to single-leg RDL.

**Rationale:** Detailed per-exercise rationale documented in session notes (2026-05-29.md). Each change backed by web research and exercise science sources.

**Impact on app:** Multiple exercise-level changes needed - see action-items.md for full list.
