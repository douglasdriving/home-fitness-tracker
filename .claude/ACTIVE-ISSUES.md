# Active Issues Backlog

**Last Updated:** 2025-10-13
**Active Issues:** 1 (Backlog)
**Completed This Session:** 2
**Obsolete:** 2

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

No 🟡 medium priority issues.

---

## 🟢 LOW PRIORITY

No 🟢 low priority issues.

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

### Issue #5: Integrated calibration
- **Status:** COMPLETED
- **Commit:** 2d57f62
- **Solution:** Removed mandatory calibration phase. New users start with default strength levels (25/100) and app adapts based on actual workout performance. More natural onboarding experience.

### Issue #8: Bad feedback form taxonomy
- **Status:** COMPLETED
- **Commit:** 42fd06d
- **Solution:** Removed category selector (Bug Report / Feature Request). Users can now submit any feedback type without artificial categorization.

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
