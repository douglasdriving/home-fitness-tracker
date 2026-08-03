# Walkthrough Tasklist

Source: [home-fitness-tracker-walthrough.txt](home-fitness-tracker-walthrough.txt) — user's spoken walkthrough of the app, 2026-08-03. Extracted and organized into actionable items below. Each item is independent unless noted otherwise.

**Legend:** 🐛 Bug · ✨ UX/Design change · 💡 New feature · Priority: P1 (broken/confusing) > P2 (worth doing) > P3 (nice-to-have / low priority per user)

---

## 🐛 Bugs

- [ ] **Workout resume drops to warmup.** Mid-session, if the user navigates to the Exercises tab and then back to Home → Continue, they land back at the *last warmup exercise* instead of where they actually left off. Session position isn't fully persisted/checked off. (P1)
- [ ] **Stretching progress count mismatch.** Header reads "Stretch 2 out of 3" while the progress bar shows only 1 of 3 complete — label is one step ahead of the bar. (P1)
- [ ] **Bird dogs shows both a rep target and a timer.** Should be one or the other — commit the exercise to either reps-based or timed. Also unclear whether "8 reps" is total or per side for this two-sided exercise; clarify. (P1)
- [ ] **Per-side timed exercises show a misleading top-level duration.** E.g. trunk rotations at 40s/side shows "Duration: 40 seconds" at the top, but that's per side, not total — the label doesn't reflect that it repeats. (P2)
- [ ] **Stale "Personal Best" on Workout Complete for McGill-progressed exercises.** E.g. plank shows current McGill sets (3×10, 2×10, 1×10) alongside an old personal best of 58s from when it was a static hold — the two aren't comparable. Remove "Personal Best" from the Workout Complete screen; it doesn't make sense once an exercise has moved to a different progression style. (P1)

---

## 🌐 Global / Cross-Cutting

- [x] **Switch entire app from 12-hour (AM/PM) to 24-hour clock**, everywhere a time is displayed (workout history detail, etc.). (P2)
- [x] **Replace the default/generic app font** with something bolder, blockier, and more energetic to fit a fitness-app vibe — currently reads as a generic React/Google default with no personality. Single highest-impact style change per the user. (P2)
- [ ] **Recurring design theme — cut duplicate progress/status indicators and redundant text.** Multiple screens show the same information twice (see Exercise Session Screen and Main Workout Screen below for specifics). When touching any of these screens, apply this principle: prefer one clear visual indicator over repeated text/numbers. (P2)

---

## Dashboard (Home)

- [x] Remove the "shorter" / "complete" info pills from workout cards — extra clutter. (P2)
- [x] Change button labels "Generate Daily Focus" / "Generate Full Workout" to just **"Start"**. (P2)
- [x] Remove the optional time-limit setting on the Full Core Workout — no longer used. Keep the Full Core Workout feature itself for now (deprioritized, but don't delete). (P3)
- [ ] Note: user has shifted almost entirely to Daily Focus sessions over Full Workouts — prioritize future iteration there. (context, not a standalone task)

---

## History Page

- [x] Show the **muscle group** (abs / posterior chain / upper body / etc.) on each workout history card. (P2)
- [x] Display exercises as individual **pills** instead of a comma-separated text string. (P2)
- [x] Replace the "X minutes" text with a time icon (e.g. clock/stopwatch glyph) instead of spelling out "minutes". (P3)

---

## Exercise Library Page

- [ ] 💡 Make exercise cards clickable to open more detail: how the exercise works, what it targets, etc. Currently the page feels low-value without this. (P2)

---

## Settings Page

- No actionable feedback — user reports barely using this page. (no action)

---

## Daily Focus — Start/Preview Screen

- [x] Remove the estimated-time pill (e.g. "16 minutes") — the estimate feels inaccurate and isn't needed for a short workout. (P2)
- [x] Remove the "Daily rotation mode" label/subtext under the workout title. (P3)

---

## Exercise Session Screen (shared by Warmup / Main Exercises / Stretching)

These three screens share the same underlying UI, so fixes here apply across all of them. User explicitly called for a broader rework of this screen.

- [ ] Remove the duplicate skip control: currently there's a skip-on-timer *and* a separate skip-exercise button, which do almost the same thing. Pressing skip on the timer should just advance to the next exercise; remove the redundant bottom "skip" button. (P1)
- [ ] Remove the duplicate progress bar under the timer — the progress bar at the top of the screen is enough. (P2)
- [ ] Reduce box nesting around the timer — the timer is boxed inside another box; it should sit directly on the page background. (P3)
- [ ] Remove the redundant "Duration: 60 seconds" header text when the timer itself already displays the countdown. (P2)
- [ ] Remove the "Total warmup is about 3 minutes" summary text at the bottom of the warmup screen — not useful. (P3)
- [ ] 💡 Move exercise how-to content inline instead of behind a "How to do this move" modal: embed the video (user-initiated play, not autoplay) and instructions directly on the page, reachable by scrolling down. (P2)
- [ ] Move short-form instructions higher up the page — e.g. directly under the exercise name/heading — since they're brief enough to not need a separate section. (P2)
- [ ] Rename left/right-side labeling to **"Side 1" / "Side 2"** for two-sided exercises (trunk rotations, bird dogs, etc.) — more natural since users don't think in strict left/right order. (P3)
- [ ] Remove the forced "switch sides" timer/buffer on exercises where switching is effectively instant (e.g. trunk rotations don't need a 10s switch countdown). (P2)

---

## Timer Component

- [ ] Replace the word "Timer" with a stopwatch/hourglass icon. (P3)
- [ ] Don't show "Running"/"Paused" as text — communicate state via color or icon change instead. (P2)
- [ ] Replace text-labeled Start/Pause buttons with **play/pause icons**. (P2)
- [ ] Button should change color between states (e.g. green when ready to start, red when running/stop) to make state visually obvious. (P2)
- [ ] Show **milliseconds**, not just whole seconds, so it's visually clear the timer is actively counting. (P3)
- [ ] Remove "Ready to start" text on the timer — the state should already be visually obvious from color/icon. (P3)

---

## Main Workout Screen (set/exercise progress)

- [ ] Consolidate redundant progress counters: currently shows "Exercise 1/3" near the header AND "Set 1/3" near the timer — both aren't needed. (P2)
- [ ] 💡 Rework the top progress bar to represent **all sets across the whole workout** (e.g. 9 total sets), segmented per exercise (e.g. dividing lines between each exercise's 3 sets), color-coded: green + checkmark = complete, yellow = current, gray = upcoming. This should replace the separate numeric counters entirely. (P2)
- [ ] Once the visual bar is clear enough, consider removing the "0/9 sets completed" text entirely — let the visual carry the information. (P3)

---

## Rest Screen

- [ ] Remove the flavor text "Take a break before your next set" — just show **"Rest"**. (P3)

---

## Post-Set Feedback Screen ("How did that feel?")

- [ ] Simplify "Rate the intensity of [exercise]" down to one short line — remove the two-line treatment and emoji. (P2)
- [ ] Remove the helper text "Your feedback adjusts future workout intensity for this exercise". (P3)
- [ ] 💡 Add visual/color-coded difficulty options (green = easy → red = too hard), possibly with an icon/graphic per level, instead of relying on words alone. (P2)

---

## Workout Complete Screen

- [ ] Remove "Personal Best" display (see bug above — also just not that interesting/relevant given the app already tracks current progression position). (P1, tied to bug fix above)

---

## Deprioritized / Explicitly Not Now

- Full Core Workout's time-limit option and the Full Core Workout track itself — keep as-is, not a current focus.
- Settings page — no changes requested.
- Deeper visual/style pass beyond the font change — user flagged this as a bigger future topic, not scoped here.
