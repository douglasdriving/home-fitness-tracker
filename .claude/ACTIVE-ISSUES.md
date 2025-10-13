# Active Issues Backlog

**Last Updated:** 2025-10-13 01:14:29
**Total Issues:** 4

> This file is automatically updated by the issue management script.
> To refresh: Run `node scripts/manage-issues.js`

---

## 🔵 UNPRIORITIZED

No 🔵 unprioritized issues.

---

## 🔴 CRITICAL PRIORITY

No 🔴 critical priority issues.

---

## 🟠 HIGH PRIORITY

No 🟠 high priority issues.

---

## 🟡 MEDIUM PRIORITY


### Issue #6: Calibration muscle splitting
- **Labels:** enhancement
- **Reporter:** @douglasdriving
- **Created:** 2025-10-13
- **URL:** https://github.com/douglasdriving/home-fitness-tracker/issues/6
- **Description:** In the calibration, it seemed like my back was completely fedtroyed by the first exercise (plank). But then, the third exercise (bird dog), also uses the back. This makes it really hard to calibrate bird dog, since your back is already tired. Maybe mix exercises that dont block eachother in that way...
- **Status:** TODO
- **Fix Plan:** Reorder calibration exercises to prevent muscle fatigue overlap. Keep adequate rest between exercises that target similar muscle groups.


### Issue #7: Glute bridge too easy
- **Labels:** enhancement
- **Reporter:** @douglasdriving
- **Created:** 2025-10-13
- **URL:** https://github.com/douglasdriving/home-fitness-tracker/issues/7
- **Description:** Tje glute bridge in calibration was too east for me. I did 110 and then stopped because i was bored. I think it would be better to start with a harder exercise, and then go down to glute bridge if the harder one is too much. Furthermore, i think that when the app notices tjat you are doing an unreas...
- **Status:** TODO
- **Fix Plan:** Replace glute bridge in calibration with single-leg glute bridge (harder variation) to better differentiate fitness levels and provide more accurate calibration.

---

## 🟢 LOW PRIORITY


### Issue #8: Bad feedback form taxonomy
- **Labels:** enhancement
- **Reporter:** @douglasdriving
- **Created:** 2025-10-13
- **URL:** https://github.com/douglasdriving/home-fitness-tracker/issues/8
- **Description:** I have to select "bug report" or "feature requedt" in this feedback form. But most of what i am submitting is not a specific feature or bug, but more like a ux thing or simply just a problem i experienced. Please remoce the categories alltogether, sp that I dont have to set that and can submit whate...
- **Status:** TODO
- **Fix Plan:** Remove the required category selection (bug/feature) from feedback form. Make it a single open text field for more flexible feedback submission.

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

## Workflow Status

- [x] Fetch issues from GitHub
- [x] Compare with locally tracked issues
- [x] Review and approve new issues
- [ ] Prioritize unprioritized issues (Claude does this)
- [ ] Fix prioritized issues (Claude does this)

**Next Action:** Run `node scripts/manage-issues.js` to check for new issues.
