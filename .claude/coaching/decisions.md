# Coaching Decisions

A running log of fitness decisions made during coaching sessions, with rationale.

<!-- Entries will be added in reverse chronological order (newest first) -->
<!-- Format:
## YYYY-MM-DD - Decision Title
**Decision:** What was decided
**Rationale:** Why this makes sense
**Impact on app:** What should change in the app (if anything)
-->

## 2026-06-17 - Make McGill-Style Interval Holds the Default for All Strength Holds

**Decision:** Extend the McGill short-repeated-hold structure (already used for side plank) to ALL strength/endurance timed holds — plank, hollow body hold, back extension hold, etc. Stretching/mobility holds are explicitly excluded and stay as long continuous holds.

**Mechanism — ceiling-based conversion:** Rather than deciding per-exercise, set a universal ceiling on single-hold duration (~30–40s for core holds; tunable per exercise). Below the ceiling, a hold stays as one continuous piece. Once progression would push a single hold past the ceiling, progression adds a *rep* (another hold) instead of adding seconds. This means short holds early in progression stay simple, and only long holds become interval-style — automatically, with no per-exercise eligibility decision.

**Rationale:**
- Core stability is an endurance quality, not a max-duration quality — repeated submaximal holds train it as well or better than one long grind.
- Form stays crisp: each rep stops before quality degrades (breathing stops, hips sag, white-knuckling).
- Directly addresses the boredom of long static holds (Douglas's plank was at ~75s/set and felt like a grind).
- For hollow body hold specifically, intervals are *safer*: short holds with rest reset before the lower back peels off the floor (important given scoliosis history).
- The principle is general — side plank only got it first because it's part of McGill's canonical "big three," not because it's uniquely suited.

**Exception:** Stretches/mobility holds (cobra, figure-four, etc.) keep continuous holds — continuous time-under-stretch is the point there.

**Impact on app:** Each strength timed-hold exercise needs its progression logic changed from "add seconds" to "ceiling + add reps" once it hits the ceiling. Note: progression for converted holds tracks reps/total holds rather than single-hold duration (same change made for side plank on 2026-05-29).

## 2026-06-17 - Stretching Sets Revised per Muscle Group

**Decision:** Revise the post-workout stretch set for each muscle group using the principle *stretch a muscle by moving opposite to its action.*
- **Abs:** cobra, lying spinal twist, side-bend (abs flex → release with extension + rotation + lateral flexion)
- **Glutes:** figure-four/pigeon, lying spinal twist, hip flexor stretch (hip flexor kept despite being the antagonist — Douglas sits ~8h/day)
- **Lower back:** child's pose, lying spinal twist, figure-four (erectors extend → release with flexion + rotation; cobra removed because it contracts the erectors)

**Rationale:** The old lower-back set (child's pose, cat-cow, cobra) included cobra, which is spinal *extension* — it works the erectors rather than releasing them, illogical right after extension training. Verified against erector-spinae stretching and figure-four/piriformis sources. Douglas's own preference (figure-four + spinal twist over cobra) turned out to be physiologically correct.

**Impact on app:** Update the muscle-group-specific stretch routines (the targeted-stretch feature defined 2026-05-29). Lower-back stretches change from {child's pose, cat-cow, cobra} to {child's pose, lying spinal twist, figure-four}; abs and glutes updated as above.

## 2026-06-17 - Consolidate Lower Back into a Posterior-Chain Day

**Decision:** Drop the dedicated lower-back isolation day. Fold lower-back training into glutes day, reconceived as a "Posterior-Chain Day." Rotation becomes **Abs → Posterior Chain → [new 3rd slot, TBD]**. Retire **bird dog** (motor-control drill, skill mastered at 28 reps/side) and remove **reverse hyper** (room can't accommodate it). **Good morning** survives only as a banded variation (bodyweight is too light).

**Rationale:**
- Douglas's goal for the lower back is *maintenance*, not building — the original mission (eliminate back pain) is accomplished.
- The erectors are already trained on other days: loaded via hip hinges (glutes day) and stabilized via planks (abs day). A dedicated day only adds dynamic spinal *extension*, which for back *health* is the least important stimulus (McGill school favors stability over isolation extension).
- The lower back is a posterior-chain muscle — hard to progressively overload in isolation with bodyweight, and naturally trained alongside glutes/hams in hinge patterns.
- Consolidating frees the 3rd rotation slot for the muscle-group expansion Douglas wants (upper body or legs — TBD next session).

**Safety condition:** Posterior-Chain Day must always include (a) a hip hinge and (b) one direct spinal-extension move (superman / back-extension hold) as insurance, so erector training is never fully dropped.

**Impact on app:** Replace separate "glutes" and "lower back" rotation days with one "Posterior Chain" day. Selection logic should fill 3 movement-pattern roles (hinge / glute builder / rotating accessory) rather than drawing randomly — see proposed template in action-items.md (pending Douglas's confirmation). Retire bird dog and reverse hyper; restrict good morning to banded.

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
