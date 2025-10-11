# Automated Issue Management Workflow

## Overview

This workflow uses an automated terminal script to fetch, prioritize, and organize GitHub issues. You review and approve issues directly in the terminal, then Claude does the actual implementation work.

**Key Principle:** Separate administrative work (fetching/sorting/approving) from coding work (fixing issues).

## File Structure

```
project-root/
├── .claude/
│   ├── WORKFLOW.md          # This file - workflow documentation
│   ├── PENDING-REVIEW.md    # Status file (updated by script)
│   ├── ACTIVE-ISSUES.md     # Approved issues backlog
│   ├── COMPLETED.md         # Archive of completed issues
│   └── CLAUDE.md            # Project reference guide
├── scripts/
│   └── manage-issues.js     # Automated issue management script
├── bugs-and-feedback.md     # Legacy checklist (kept for history)
└── start-claude.bat         # Launcher script (runs manage-issues.js)
```

## Workflow Steps

### 1. Run the Automation Script

Run `start-claude.bat` (or `node scripts/manage-issues.js` directly) which will:
1. Fetch all open issues from GitHub via `gh` CLI
2. Prioritize them automatically
3. Present each issue for your review
4. Update the .claude/ markdown files
5. Output a command to paste into Claude

**This all happens in the terminal, WITHOUT opening Claude yet.**

### 2. Fetch Issues (Automated)

The script executes:
- Fetch all open issues from GitHub using `gh issue list`
- Read existing issues from `.claude/ACTIVE-ISSUES.md`
- Compare to identify **NEW** issues not yet tracked locally
- Skip issues labeled `wontfix` or `duplicate`

If no new issues are found, the script checks if there are unprioritized issues and outputs the appropriate Claude command.

### 3. Interactive Review (You) ⚠️

The script presents each **NEW** issue one at a time with:
- Issue number and title
- Labels
- Author
- Description (first 500 characters)

**For each NEW issue, you choose:**
- **[y] Yes** - Approve and add to UNPRIORITIZED section
- **[n] No** - Reject and close on GitHub as "wontfix"
- **[d] Defer** - Label as "needs discussion" for future review
- **[s] Skip** - Leave open on GitHub but don't track locally

**Why this matters:**
- Prevents spam/troll issues from being implemented
- Ensures only legitimate improvements are worked on
- Maintains project quality and direction
- You stay in control of what gets built

### 4. File Updates (Automated)

After your review, the script automatically:
- Adds approved issues to **🔵 UNPRIORITIZED** section in `.claude/ACTIVE-ISSUES.md`
- Updates `.claude/PENDING-REVIEW.md` with sync status
- Closes rejected issues on GitHub as "not planned"
- Labels deferred issues as "needs discussion"
- Preserves all existing prioritized issues

### 5. Get Claude Command (Automated)

The script outputs a summary and provides a ready-to-paste command for Claude.

**If there are unprioritized issues:**
```
I have unprioritized issues in .claude/ACTIVE-ISSUES.md under the "UNPRIORITIZED"
section. Please:
1. Read each unprioritized issue carefully
2. Move them to the appropriate priority section based on:
   - Impact on core functionality
   - User experience implications
   - Complexity and effort required
   - Project priorities
3. Then work through all issues starting with highest priority
4. For each: implement, test, commit with "Fixes #X", and move to COMPLETED.md
5. Provide a summary when done
```

**If all issues are already prioritized:**
```
All issues are already prioritized. Please work through them starting with highest
priority. For each: implement, test, commit with "Fixes #X", and move to COMPLETED.md.
```

### 6. Prioritization (Claude)

When you open Claude Code and paste the command, Claude will:

**First, prioritize unprioritized issues:**
1. Read each issue in the 🔵 UNPRIORITIZED section
2. Analyze based on full project context:
   - **🔴 CRITICAL** - Breaks core functionality (crashes, data loss, critical bugs)
   - **🟠 HIGH** - Major UX problems, significant bugs affecting primary flows
   - **🟡 MEDIUM** - Enhancements, new features, quality of life improvements
   - **🟢 LOW** - Polish, documentation, minor improvements, edge cases
   - **⚪ BACKLOG** - Large features requiring discussion, future considerations
3. Move each issue to the appropriate priority section in ACTIVE-ISSUES.md
4. Update the Total Issues count

### 7. Implementation (Claude)

**Then, work through prioritized issues:**

1. Start with highest priority section (CRITICAL → HIGH → MEDIUM → LOW → BACKLOG)
2. For each issue:
   - Read the full issue description (follow URL if needed)
   - Plan the implementation
   - Make the necessary code changes
   - Test the changes (run build, check functionality)
   - Commit with "Fixes #[number]: [description]"
   - Move issue to `.claude/COMPLETED.md` with completion details
   - Remove from ACTIVE-ISSUES.md
   - Decrement Total Issues count
3. When all issues are complete:
   - Push all commits to GitHub
   - Provide a summary of work completed

### 8. GitHub Auto-Close

When commits are pushed to GitHub:
- Issues referenced with "Fixes #X" in commit messages are automatically closed
- GitHub links the commit to the issue for traceability

Claude provides a summary:
- Total issues prioritized (if any were unprioritized)
- Total issues completed
- Commits made
- Any issues that couldn't be completed (with reasons)

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

## Quick Start

**To run the full workflow:**

1. Run `start-claude.bat` (or `node scripts/manage-issues.js`)
2. Review each issue when prompted (y/n/d/s)
3. Copy the command shown at the end
4. Open Claude Code
5. Paste the command
6. Claude fixes all approved issues

**To run just the automation (without Claude):**

```bash
node scripts/manage-issues.js
```

**To manually have Claude work on existing approved issues:**

Open Claude and say:
```
Please work through all issues in .claude/ACTIVE-ISSUES.md, starting with highest
priority. For each: implement, test, commit with "Fixes #X", and move to COMPLETED.md.
```

## Requirements

- **GitHub CLI (`gh`)** - Must be installed and authenticated
  - Install: https://cli.github.com/
  - Login: `gh auth login`
- **Node.js** - For running the automation script
- **Git** - For commits and pushes (Claude handles this)

**GitHub Repository:** `douglasdriving/home-fitness-tracker`

The script uses `gh` CLI which handles authentication automatically.

## Notes

- Issues labeled `wontfix` or `duplicate` are automatically skipped
- Issues labeled `question` are moved to BACKLOG for discussion
- After completing an issue, Claude will comment on GitHub with solution summary (if token available)
- Old issues (>90 days inactive) are flagged for review
