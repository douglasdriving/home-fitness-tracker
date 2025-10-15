# Active Issues Backlog

**Last Updated:** 2025-10-15
**Active Issues:** 2 (2 Low)
**Completed This Session:** 8
**Obsolete:** 3

> This file is automatically updated by the issue management script.
> To refresh: Run `node scripts/manage-issues.js`

---

## 🔵 UNPRIORITIZED

No unprioritized issues.

---

## 🔴 CRITICAL PRIORITY

No 🔴 critical priority issues.

---

## 🟠 HIGH PRIORITY

No 🟠 high priority issues.

---

## 🟡 MEDIUM PRIORITY

No 🟡 medium priority issues.

---

## 🟢 LOW PRIORITY


### Issue #9: Switch sides
- **Labels:** enhancement
- **Reporter:** @douglasdriving
- **Created:** 2025-10-14
- **URL:** https://github.com/douglasdriving/home-fitness-tracker/issues/9
- **Description:** For the exercise that require that you do it on both sides e.g. side plank, it would be helpful to have a "switch sides" prompt appear midway through the set. And it would also be helpful to have a still image of the exercise in addition to the already existing "watch a tutorial" button. That way th...
- **Status:** TODO
- **Fix Plan:** Add mid-timer "Switch Sides" notification for bilateral exercises. Optionally add still image references. Requires Timer component modification.


### Issue #17: Request: voice-to-text
- **Labels:** enhancement
- **Reporter:** @douglasdriving
- **Created:** 2025-10-15
- **URL:** https://github.com/douglasdriving/home-fitness-tracker/issues/17
- **Description:** It would be awesome if i could input my feedback as voice to text. I think it is a lot easier to explain my thoughts when I talk than when I write. I would love it if I could just record a long message, and then the app turns that into text that it uploads. It would be best if i can submit all feedb...
- **Status:** TODO
- **Fix Plan:** Implement Web Speech API for voice recording and transcription in FeedbackForm. Requires browser API support and fallback handling.

---

## ⚪ BACKLOG


### Issue #5: Integrated calibration
- **Labels:** enhancement
- **Reporter:** @douglasdriving
- **Created:** 2025-10-13
- **URL:** https://github.com/douglasdriving/home-fitness-tracker/issues/5
- **Description:** The calibration feature seems like a strange way to set your workload, since it does not actually make you go through a proper workout. You only do one set of each exercise, and it feels odd to push yourself so hard on that one exercise. I believe it would be better if calibration was "integrated", ...
- **Status:** TODO
- **Fix Plan:** Major redesign - Remove mandatory calibration phase. Start users with conservative default strength levels and adapt based on first 2-3 workout performances. Requires significant refactoring of calibration/workout generation system. Needs more design consideration before implementation.

---

## ✅ COMPLETED THIS SESSION

### Issue #13: Too easy at the beginning!
- **Status:** COMPLETED
- **Commit:** ee26275
- **Solution:** Increased default strength level from 25 to 45 (80% increase) to provide more challenging starting workouts. Addresses user feedback that initial targets were way too easy.

### Issue #14: Did not understand prone back extensions
- **Status:** COMPLETED
- **Commit:** 1a33443
- **Solution:** Removed prone back extension exercise from database. Video link was broken and user reported exercise was ineffective.

### Issue #16: No rep adjustment
- **Status:** COMPLETED
- **Commit:** 9c78686
- **Solution:** Added dynamic target adjustment that adapts remaining sets when user exceeds target by >20%. Now adjusts both upward (when exceeding) and downward (when underperforming).

### Issue #10: Uneven reps
- **Status:** COMPLETED
- **Commit:** cf2c694
- **Solution:** Increased Superman exercise heaviness scores from 5 to 8 for both glutes and lower back, better reflecting its actual difficulty compared to other exercises.

### Issue #12: No rest between exercises
- **Status:** COMPLETED
- **Commit:** f11d60c
- **Solution:** Added 60-second rest timer between exercises (separate from 30-60s rest between sets). Shows preview of next exercise during rest with skip option.

### Issue #15: 2 sides unclear
- **Status:** COMPLETED
- **Commit:** 76d8023
- **Solution:** Added clarification notes to all bilateral exercises (Bird Dog, Single-Leg Glute Bridge, Donkey Kicks, Side Plank, Fire Hydrants) explaining how to count reps/duration for both sides.

### Issue #5: Integrated calibration
- **Status:** COMPLETED
- **Commit:** 2d57f62
- **Solution:** Removed mandatory calibration phase. New users start with default strength levels (25/100) and app adapts based on actual workout performance. More natural onboarding experience.

### Issue #8: Bad feedback form taxonomy
- **Status:** COMPLETED
- **Commit:** 42fd06d
- **Solution:** Removed category selector (Bug Report / Feature Request). Users can now submit any feedback type without artificial categorization.

### Issue #11: No calibration instructions
- **Status:** OBSOLETE (resolved by #5)
- **Reason:** Issue was about lack of instructions during calibration phase. Since mandatory calibration was removed in favor of integrated calibration, this is no longer applicable.

### Issue #6: Calibration muscle splitting
- **Status:** OBSOLETE (resolved by #5)
- **Reason:** Issue was about calibration exercise order. Since mandatory calibration was removed, this is no longer applicable.

### Issue #7: Glute bridge too easy
- **Status:** OBSOLETE (resolved by #5)
- **Reason:** Issue was about calibration exercise difficulty. Since mandatory calibration was removed, this is no longer applicable.

---

## Workflow Status

- [x] Fetch issues from GitHub
- [x] Compare with locally tracked issues
- [x] Review and approve new issues
- [x] Prioritize unprioritized issues (Claude does this)
- [x] Fix prioritized issues (Claude does this)

**Next Action:** Run `node scripts/manage-issues.js` to check for new issues.
