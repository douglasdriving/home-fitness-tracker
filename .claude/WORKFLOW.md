# Automated Issue Management Workflow

## Overview

This workflow automatically fetches GitHub issues, prioritizes them, and guides Claude through completing them systematically.

## File Structure

```
project-root/
├── .claude/
│   ├── WORKFLOW.md          # This file - workflow documentation
│   ├── PENDING-REVIEW.md    # Issues awaiting your approval ⚠️
│   ├── ACTIVE-ISSUES.md     # Approved issues to work on
│   ├── COMPLETED.md         # Archive of completed issues
│   └── CLAUDE.md            # Project reference guide
├── bugs-and-feedback.md     # Legacy checklist (kept for history)
└── start-claude.bat         # Launcher script
```

## Workflow Steps

### 1. Morning Startup (Automated)

Run `start-claude.bat` which will:
1. Launch Claude Code
2. Automatically trigger the issue sync workflow
3. Claude will fetch and organize issues
4. **STOP for manual approval** ⚠️
5. After approval, Claude starts working

### 2. Fetch Issues (Claude)

Claude executes:
- Fetch all open issues from GitHub
- Parse labels, title, body
- Extract priority from labels or content
- Save to `PENDING-REVIEW.md` (not ACTIVE-ISSUES.md yet!)

### 3. Manual Review & Approval (You) ⚠️

**IMPORTANT:** You must manually review and approve issues before Claude works on them.

For each issue in `PENDING-REVIEW.md`:
- ✅ **APPROVE**: Move to ACTIVE-ISSUES.md → Claude will work on it
- ❌ **REJECT**: Close on GitHub as "wontfix" or "spam" → Remove from queue
- 🤔 **DEFER**: Label as "needs discussion" → Move to BACKLOG

**Interactive Approval Process:**
1. Claude presents each issue one at a time
2. For each issue you see:
   - Issue number and title
   - Description
   - Labels
   - Reporter
3. You respond:
   - **"yes"** or **"y"** - Approve (moves to ACTIVE-ISSUES.md)
   - **"no"** or **"n"** - Reject (closes on GitHub as "wontfix")
   - **"defer"** or **"d"** - Defer (labels as "needs discussion", moves to BACKLOG)
4. After all issues reviewed, Claude starts working on approved ones

**Why this matters:**
- Prevents spam/troll issues from being implemented
- Ensures only legitimate improvements are worked on
- Maintains project quality and direction
- You stay in control of what gets built

### 4. Prioritize & Organize (Claude)

**Only approved issues** are categorized into:

**🔴 CRITICAL** - Breaks core functionality
- `bug` label + mentions "crash", "broken", "doesn't work"
- Issues affecting calibration, workout generation, data loss

**🟠 HIGH** - Major UX problems
- `bug` label + affects primary user flows
- Confusing or frustrating UX that impacts usability

**🟡 MEDIUM** - Improvements & enhancements
- `enhancement` label
- Quality of life improvements
- New features that add value

**🟢 LOW** - Polish & nice-to-haves
- Minor improvements
- Edge case fixes
- Cosmetic changes

**⚪ BACKLOG** - Future consideration
- Requires significant work
- Low priority enhancements
- Need more discussion

### 5. Work Through Approved Issues (Claude)

For each approved issue (highest priority first):
1. ✅ Read issue details
2. ✅ Plan implementation
3. ✅ Make changes
4. ✅ Test build
5. ✅ Commit with reference to issue #
6. ✅ Move to COMPLETED.md
7. ✅ Move to next issue

### 6. End of Session

Claude will:
- Push all commits
- Update ACTIVE-ISSUES.md
- Update COMPLETED.md
- Report summary

## Issue Format in ACTIVE-ISSUES.md

```markdown
## 🔴 CRITICAL

### Issue #123: App crashes on workout completion
- **Labels:** bug, critical
- **Reporter:** @user
- **Created:** 2025-01-11
- **Description:** When completing the last set, app crashes...
- **Acceptance:** Fix crash, test all workout completion scenarios
- **Status:** TODO

## 🟠 HIGH

### Issue #124: Timer doesn't stop after exercise
...
```

## Issue Format in COMPLETED.md

```markdown
### Issue #123: App crashes on workout completion ✓
- **Completed:** 2025-01-11
- **Commits:** abc1234, def5678
- **Solution:** Fixed race condition in workout completion...
```

## Manual Workflow Trigger

If you want to manually trigger the workflow:

1. Open Claude Code
2. Say: "Please run the GitHub issues workflow"
3. Claude will fetch issues and present them for approval
4. After you approve issues, Claude will start working on them

## Configuration

**GitHub Repository:** `douglasdriving/home-fitness-tracker`

No authentication needed for reading public issues.

## Notes

- Issues labeled `wontfix` or `duplicate` are automatically skipped
- Issues labeled `question` are moved to BACKLOG for discussion
- After completing an issue, Claude will comment on GitHub with solution summary (if token available)
- Old issues (>90 days inactive) are flagged for review
