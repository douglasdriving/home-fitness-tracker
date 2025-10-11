#!/usr/bin/env node

/**
 * Automated GitHub Issues Management Script
 *
 * This script runs completely in the terminal and handles:
 * 1. Fetching open issues from GitHub
 * 2. Comparing with locally tracked issues to find NEW ones
 * 3. Interactive approval/denial of each NEW issue
 * 4. Adding approved issues to "UNPRIORITIZED" section
 * 5. Outputting a command to paste into Claude
 *
 * Claude handles prioritization based on project context.
 *
 * Usage: node scripts/manage-issues.js
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const REPO = 'douglasdriving/home-fitness-tracker';
const ACTIVE_ISSUES_FILE = '.claude/ACTIVE-ISSUES.md';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(80));
  log(message, 'bright');
  console.log('='.repeat(80) + '\n');
}

function fetchIssues() {
  try {
    log('Fetching open issues from GitHub...', 'cyan');
    const output = execSync(
      `gh issue list --repo ${REPO} --state open --json number,title,body,labels,author,createdAt --limit 100`,
      { encoding: 'utf-8' }
    );
    return JSON.parse(output);
  } catch (error) {
    log('Error: Failed to fetch issues from GitHub', 'red');
    log('Make sure you have GitHub CLI (gh) installed and authenticated', 'yellow');
    process.exit(1);
  }
}

function parseExistingIssues() {
  try {
    const content = readFileSync(ACTIVE_ISSUES_FILE, 'utf-8');
    const issueNumbers = [];

    // Match patterns like "### Issue #123:" or "Issue #456"
    const matches = content.matchAll(/Issue #(\d+)/g);
    for (const match of matches) {
      issueNumbers.push(parseInt(match[1]));
    }

    return issueNumbers;
  } catch (error) {
    // File doesn't exist or can't be read, return empty array
    return [];
  }
}

function findNewIssues(allIssues, existingIssueNumbers) {
  return allIssues.filter(issue => {
    // Skip wontfix and duplicates
    const labels = issue.labels.map(l => l.name.toLowerCase());
    if (labels.includes('wontfix') || labels.includes('duplicate')) {
      return false;
    }

    // Only include if not already tracked
    return !existingIssueNumbers.includes(issue.number);
  });
}

function formatDate(dateString) {
  return new Date(dateString).toISOString().split('T')[0];
}

function displayIssue(issue) {
  console.log('\n' + '-'.repeat(80));
  log(`NEW Issue #${issue.number}: ${issue.title}`, 'bright');
  console.log('-'.repeat(80));

  const labels = issue.labels.map(l => l.name).join(', ') || 'none';
  console.log(`Labels:  ${labels}`);
  console.log(`Author:  @${issue.author.login}`);
  console.log(`Created: ${formatDate(issue.createdAt)}`);
  console.log(`\nDescription:`);

  const description = issue.body || 'No description provided.';
  const preview = description.length > 500 ? description.substring(0, 500) + '...' : description;
  console.log(preview);
}

async function promptUser(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function reviewNewIssues(newIssues) {
  const approved = [];
  const rejected = [];
  const deferred = [];

  for (let i = 0; i < newIssues.length; i++) {
    const issue = newIssues[i];

    displayIssue(issue);

    console.log('\n');
    log('What would you like to do with this NEW issue?', 'cyan');
    console.log('  [y] Yes - Approve and add to unprioritized backlog');
    console.log('  [n] No - Reject (will be closed on GitHub as wontfix)');
    console.log('  [d] Defer - Mark for later discussion');
    console.log('  [s] Skip - Leave open but don\'t track locally');

    let response = '';
    while (!['y', 'n', 'd', 's', 'yes', 'no', 'defer', 'skip'].includes(response)) {
      response = await promptUser('\nYour choice (y/n/d/s): ');
    }

    if (response === 'y' || response === 'yes') {
      approved.push(issue);
      log('✓ Approved (will be added to unprioritized section)', 'green');
    } else if (response === 'n' || response === 'no') {
      rejected.push(issue);
      log('✗ Rejected (will be closed as wontfix)', 'red');
    } else if (response === 'd' || response === 'defer') {
      deferred.push(issue);
      log('⊙ Deferred for discussion', 'yellow');
    } else {
      log('⊘ Skipped', 'yellow');
    }
  }

  return { approved, rejected, deferred };
}

function generateIssueMarkdown(issue) {
  const labels = issue.labels.map(l => l.name).join(', ') || 'none';
  const description = issue.body || 'No description provided.';
  const preview = description.length > 300 ? description.substring(0, 300) + '...' : description;

  return `
### Issue #${issue.number}: ${issue.title}
- **Labels:** ${labels}
- **Reporter:** @${issue.author.login}
- **Created:** ${formatDate(issue.createdAt)}
- **URL:** https://github.com/${REPO}/issues/${issue.number}
- **Description:** ${preview}
- **Status:** TODO
`;
}

function updateActiveIssues(newApprovedIssues) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  try {
    // Read existing content
    let existingContent = readFileSync(ACTIVE_ISSUES_FILE, 'utf-8');

    // Extract the count from the header
    const countMatch = existingContent.match(/\*\*Total Issues:\*\* (\d+)/);
    const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
    const newCount = currentCount + newApprovedIssues.length;

    // Update the header
    existingContent = existingContent.replace(
      /\*\*Last Updated:\*\* .*/,
      `**Last Updated:** ${timestamp}`
    );
    existingContent = existingContent.replace(
      /\*\*Total Issues:\*\* \d+/,
      `**Total Issues:** ${newCount}`
    );

    // Find the UNPRIORITIZED section and add new issues
    const unprioritizedSectionMatch = existingContent.match(/(## 🔵 UNPRIORITIZED[\s\S]*?)(\n---|\n## )/);

    if (unprioritizedSectionMatch) {
      // Section exists, append to it
      const currentSection = unprioritizedSectionMatch[1];
      let newSection = currentSection;

      // Check if it says "No unprioritized issues"
      if (currentSection.includes('No unprioritized issues') || currentSection.includes('No 🔵 unprioritized issues')) {
        // Replace the "no issues" message with the new issues
        newSection = '## 🔵 UNPRIORITIZED\n\n' + newApprovedIssues.map(generateIssueMarkdown).join('\n');
      } else {
        // Append to existing issues
        newSection = currentSection + '\n' + newApprovedIssues.map(generateIssueMarkdown).join('\n');
      }

      existingContent = existingContent.replace(unprioritizedSectionMatch[1], newSection);
    } else {
      // Section doesn't exist, create it before CRITICAL section
      const newSection = `\n## 🔵 UNPRIORITIZED\n\n` +
        newApprovedIssues.map(generateIssueMarkdown).join('\n') +
        `\n---\n`;

      existingContent = existingContent.replace(
        /\n## 🔴 CRITICAL PRIORITY/,
        newSection + '\n## 🔴 CRITICAL PRIORITY'
      );
    }

    writeFileSync(ACTIVE_ISSUES_FILE, existingContent, 'utf-8');
    log('✓ Updated .claude/ACTIVE-ISSUES.md with new unprioritized issues', 'green');

  } catch (error) {
    // File doesn't exist, create new one
    let content = `# Active Issues Backlog

**Last Updated:** ${timestamp}
**Total Issues:** ${newApprovedIssues.length}

> This file is automatically updated by the issue management script.
> To refresh: Run \`node scripts/manage-issues.js\`

---

## 🔵 UNPRIORITIZED

${newApprovedIssues.map(generateIssueMarkdown).join('\n')}

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

No ⚪ backlog issues.
---

## Workflow Status

- [x] Fetch issues from GitHub
- [x] Compare with existing issues
- [x] Review and approve new issues
- [ ] Prioritize unprioritized issues (Claude will do this)
- [ ] Fix prioritized issues (Claude will do this)

**Next Action:** Open Claude and paste the command shown at the end of this script.
`;

    writeFileSync(ACTIVE_ISSUES_FILE, content, 'utf-8');
    log('✓ Created .claude/ACTIVE-ISSUES.md with new unprioritized issues', 'green');
  }
}

function updatePendingReview(timestamp, newCount) {
  const content = `# Pending Issues - Awaiting Approval

> **This file tracks the status of issue synchronization.**

**Last Sync:** ${timestamp}
**New Issues Found:** ${newCount}

---

## Sync Result

✓ Successfully fetched issues from GitHub
✓ Compared with locally tracked issues
✓ Found ${newCount} new issue${newCount !== 1 ? 's' : ''}
✓ All new issues have been reviewed

${newCount === 0 ? 'No new issues at this time.' : 'New issues have been added to ACTIVE-ISSUES.md in the UNPRIORITIZED section.'}
`;

  writeFileSync('.claude/PENDING-REVIEW.md', content, 'utf-8');
  log('✓ Updated .claude/PENDING-REVIEW.md', 'green');
}

function closeRejectedIssues(rejectedIssues) {
  if (rejectedIssues.length === 0) return;

  log('\nClosing rejected issues on GitHub...', 'cyan');

  rejectedIssues.forEach(issue => {
    try {
      execSync(
        `gh issue close ${issue.number} --repo ${REPO} --reason "not planned" --comment "This issue has been reviewed and will not be implemented at this time."`,
        { encoding: 'utf-8' }
      );
      log(`  ✓ Closed issue #${issue.number}`, 'green');
    } catch (error) {
      log(`  ✗ Failed to close issue #${issue.number}`, 'red');
    }
  });
}

function labelDeferredIssues(deferredIssues) {
  if (deferredIssues.length === 0) return;

  log('\nLabeling deferred issues on GitHub...', 'cyan');

  deferredIssues.forEach(issue => {
    try {
      execSync(
        `gh issue edit ${issue.number} --repo ${REPO} --add-label "needs discussion"`,
        { encoding: 'utf-8' }
      );
      log(`  ✓ Labeled issue #${issue.number} as "needs discussion"`, 'green');
    } catch (error) {
      log(`  ✗ Failed to label issue #${issue.number}`, 'yellow');
    }
  });
}

function generateClaudeCommand(hasUnprioritized) {
  if (!hasUnprioritized) {
    return 'All issues are already prioritized. Please work through the issues in .claude/ACTIVE-ISSUES.md, starting with highest priority. For each issue: read the details, implement the fix, test it, commit with "Fixes #X", and move to .claude/COMPLETED.md. Provide a summary when done.';
  }

  return 'I have unprioritized issues in .claude/ACTIVE-ISSUES.md under the "UNPRIORITIZED" section. Please:\n1. Read each unprioritized issue carefully\n2. Move them to the appropriate priority section (CRITICAL/HIGH/MEDIUM/LOW/BACKLOG) based on:\n   - Impact on core functionality\n   - User experience implications\n   - Complexity and effort required\n   - Project priorities\n3. Then work through all issues starting with highest priority\n4. For each: implement, test, commit with "Fixes #X", and move to COMPLETED.md\n5. Provide a summary when done';
}

function copyToClipboard(text) {
  try {
    // Use Windows clip command to copy to clipboard
    const proc = spawnSync('clip', [], {
      input: text,
      encoding: 'utf-8',
      shell: true
    });

    if (proc.error) {
      throw proc.error;
    }

    return true;
  } catch (error) {
    log('  ⚠ Failed to copy to clipboard', 'yellow');
    log(`  Error: ${error.message}`, 'yellow');
    return false;
  }
}

async function main() {
  header('GitHub Issues Management Automation');

  // Step 1: Fetch issues from GitHub
  const allIssues = fetchIssues();

  // Step 2: Parse existing issues from ACTIVE-ISSUES.md
  log('Reading locally tracked issues...', 'cyan');
  const existingIssueNumbers = parseExistingIssues();
  log(`Found ${existingIssueNumbers.length} existing issue(s) already tracked\n`, 'green');

  // Step 3: Find NEW issues
  const newIssues = findNewIssues(allIssues, existingIssueNumbers);

  if (newIssues.length === 0) {
    log('No new issues found! 🎉', 'green');
    log('All GitHub issues are already being tracked locally.', 'green');

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updatePendingReview(timestamp, 0);

    // Check if there are any unprioritized issues in the existing file
    try {
      const content = readFileSync(ACTIVE_ISSUES_FILE, 'utf-8');
      const hasUnprioritized = content.includes('## 🔵 UNPRIORITIZED') &&
                               !content.includes('No unprioritized issues') &&
                               !content.includes('No 🔵 unprioritized issues');

      if (hasUnprioritized) {
        header('Unprioritized Issues Detected');
        log('You have unprioritized issues that need attention.', 'yellow');

        const command = generateClaudeCommand(true);

        log('\nCopying command to clipboard...', 'cyan');
        if (copyToClipboard(command)) {
          log('✓ Command copied to clipboard!', 'green');
        }

        log('\nOpen Claude and paste this command (Ctrl+V):', 'bright');
        console.log('\n' + '-'.repeat(80));
        log(command, 'cyan');
        console.log('-'.repeat(80) + '\n');
      }
    } catch (error) {
      // File doesn't exist, ignore
    }

    return;
  }

  log(`Found ${newIssues.length} NEW issue(s) not yet tracked locally\n`, 'green');

  // Step 4: Interactive review of NEW issues only
  header('Review New Issues');
  log('Please review each NEW issue and decide whether to approve, reject, or defer it.\n', 'cyan');

  const { approved, rejected, deferred } = await reviewNewIssues(newIssues);

  // Step 5: Update files
  header('Updating Files');

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (approved.length > 0) {
    updateActiveIssues(approved);
  }
  updatePendingReview(timestamp, newIssues.length);

  // Step 6: Update GitHub
  header('Updating GitHub');

  closeRejectedIssues(rejected);
  labelDeferredIssues(deferred);

  // Step 7: Summary and next steps
  header('Summary');

  log(`✓ New Issues:  ${newIssues.length}`, 'cyan');
  log(`✓ Approved:    ${approved.length} issue(s) → added to UNPRIORITIZED`, 'green');
  log(`✗ Rejected:    ${rejected.length} issue(s) → closed on GitHub`, 'red');
  log(`⊙ Deferred:    ${deferred.length} issue(s) → labeled for discussion`, 'yellow');

  if (approved.length > 0) {
    header('Next Steps');

    const command = generateClaudeCommand(true);

    log('Copying command to clipboard...', 'cyan');
    if (copyToClipboard(command)) {
      log('✓ Command copied to clipboard!\n', 'green');
    }

    log('When Claude opens, simply paste (Ctrl+V) to start!\n', 'bright');
    log('Command:', 'bright');
    console.log('\n' + '-'.repeat(80));
    log(command, 'cyan');
    console.log('-'.repeat(80) + '\n');
  } else {
    log('\nNo new issues were approved. Nothing to do!', 'yellow');
  }

  log('Done! 🎉\n', 'green');
}

main().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
