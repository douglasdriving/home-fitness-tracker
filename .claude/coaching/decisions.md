# Coaching Decisions

A running log of fitness decisions made during coaching sessions, with rationale.

<!-- Entries will be added in reverse chronological order (newest first) -->
<!-- Format:
## YYYY-MM-DD - Decision Title
**Decision:** What was decided
**Rationale:** Why this makes sense
**Impact on app:** What should change in the app (if anything)
-->

## 2026-07-01 - Test Every New Exercise Live Before It Enters the App

**Decision:** No new exercise goes into the app/program until Douglas has physically performed it in a coaching session, in his apartment, with his real equipment. Each candidate must pass three checks: (1) feasible at home, (2) performed correctly / feels right in the target muscle, (3) counting method decided (timed vs reps, one side vs two, load/progression notes). Rejected exercises get logged with *why* so they aren't re-proposed. Documented as a required step in the coach SKILL.md.

**Rationale:** The 2026-06-18 upper-body + warmup expansion was designed entirely on paper and built into the app, but several exercises turned out to be undoable with Douglas's setup or unclear in how to count them. Designing movements in the abstract, without hands on them in the actual space, produces exercises that are biomechanically fine but practically impossible at home.

**Impact on app:** Only vetted exercises enter `action-items.md` / the exercise library. Process-level, not a code change.

## 2026-07-01 - Finalized (Tested) Upper Body Day

**Decision:** Replace the paper upper-body pool from 2026-06-18 with the three exercises that actually passed live testing:
- **Slot 1 — Horizontal pull: Table (inverted) row** under his desk. Counting: reps, both arms together. Cue: initiate from shoulder-blade retraction (bias mid-back for posture). Surface/angle ladder: knees-bent+feet-planted → legs straight → feet elevated → archer/one-arm.
- **Slot 2 — Horizontal push: Incline push-up.** Counting: reps, both arms. Scouted ladder (real surfaces): kitchen counter (waist) → low bookcase (mid-thigh) → couch table (knee) → ankle step → floor (standard push-up). Start: kitchen counter.
- **Slot 3 — Vertical push: Pike push-up.** Counting: reps, both arms. Ladder: couch table (knee) → ankle step → floor pike → feet-elevated → wall handstand push-up. Start: couch table.

**Unified advance rule (double progression):** start at a height allowing ~8 clean reps → build reps → at ~15 clean reps on all working sets, drop to the next harder rung. A book/box stack = an infinitely tunable in-between rung.

**REJECTED (don't re-propose):** doorway row (no sturdy doorway w/ clean grip angle); band row & band lat pulldown (his loops are short ~62 cm → tension spikes; lat pulldown also needs an overhead anchor he lacks); pull-up bar (doorframes don't fit a leverage bar, pressure bars unsafe, drilling declined). **Vertical pull is PARKED** — no feasible option without new equipment; upper day runs 2 push : 1 pull, accepted since the table row covers posture-critical pulling every session.

**Rationale:** These are what he can actually do at home with a yoga mat + short loops + furniture, no pull-up bar. See 2026-07-01 session notes for the full test log.

**Impact on app:** The upper-body exercise library should contain exactly these three (plus surface-ladder + counting metadata), NOT the broader 2026-06-18 paper pool. Vertical-pull exercises stay out until equipment changes.

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

## 2026-06-18 - Add Pre-Workout Dynamic Warmups

**Decision:** Add a short (~2–4 min) dynamic warmup before each session, parameterized by muscle group (parallel to the existing post-workout stretch routines). Dynamic movement before, static stretching after. Upper body stretch set also defined: doorway pec, overhead lat, overhead triceps (optional wrist stretch).

**Rationale:**
- Warmup benefits: raises muscle temp/blood flow, lubricates joints, primes the nervous system (strong from set 1), and rehearses the movement pattern (the highest-value part).
- **Specific to Douglas:** he trains in the morning when the spine is stiffest and least tolerant of loading (McGill), and he's now adding load (hinges, push-ups). Both raise warmup value. Injury-prevention evidence is modest for light bodyweight work — not overselling it — but the morning-spine and increasing-load angles justify it.
- Dynamic-before/static-after: cold static stretching can slightly reduce strength output and isn't a true warmup. Douglas already stretches after (correct); the pre-session work should be movement.
- The band pull-aparts (added for upper body posture) already double as a warmup move — Douglas intuited this.

**Impact on app:** NEW feature — the app currently has post-workout stretching but no warmup. Add a day-specific dynamic warmup block at the START of each session (abs: cat-cow/trunk rotations/hip circles/slow bird dogs; posterior chain: leg swings/hip circles/bodyweight bridges + hinges; upper body: arm circles/scapular push-ups/easy incline push-ups/band pull-aparts). Add the upper-body stretch set (doorway pec, overhead lat, triceps, optional wrist) to the post-workout stretch routines.

## 2026-06-18 - Add Upper Body as the 3rd Rotation Slot

**Decision:** Fill the freed 3rd rotation slot with **Upper Body**. Rotation is now **Abs → Posterior Chain → Upper Body**. Legs were considered and ruled out as redundant (Douglas bikes ~60–80 min/day, and posterior-chain day already trains glutes/hamstrings). Upper body is a full push+pull session (not a push/pull split). Start with no-equipment exercises; pull-up bar deferred.

**Rationale:**
- Upper body is the genuine gap — the whole program to date is core + posterior chain, with almost no pressing/pulling. Biggest hole in overall strength and physique.
- Brings back the *skill development* element Douglas said the routine was missing (pull-up / handstand-pushup progressions are chase-able goals).
- **Pull is prioritized over push** because Douglas sits ~8h/day: pushing reinforces rounded-forward posture, pulling reverses it. Upper body day doubles as posture insurance (parallels how core work was back insurance).
- Full upper session (not split) because the 3-way rotation already puts upper body at only ~1.6×/week; splitting into push/pull days would drop each pattern to ~1×/6 days — too infrequent. Push/pull are antagonists, so pairing them in one session is efficient and enforces balance.

**Impact on app:** Add an "Upper Body" rotation day with the same role-based 3-slot selection (horizontal pull / horizontal push every session + alternating vertical). Exercise pool is bodyweight + loop-band + furniture-based (push-ups, pike push-ups, band/table rows, band lat pulldown, band/backpack overhead press). Add band pull-aparts as a warmup staple for upper days. Pull-up-bar exercises (pull-ups/chin-ups) gated behind a future equipment flag. Likely needs new upper-body exercises added to the library (the app's exercise data is currently core-only).

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
