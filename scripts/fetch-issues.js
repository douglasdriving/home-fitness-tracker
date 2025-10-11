#!/usr/bin/env node

/**
 * GitHub Issues Fetcher
 *
 * Fetches open issues from the GitHub repository and outputs them in a format
 * that Claude can easily parse and prioritize.
 *
 * Usage: node scripts/fetch-issues.js
 */

const https = require('https');

const REPO_OWNER = 'douglasdriving';
const REPO_NAME = 'home-fitness-tracker';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;

function fetchIssues() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=100`,
      method: 'GET',
      headers: {
        'User-Agent': 'Home-Fitness-Tracker-Bot',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function prioritizeIssue(issue) {
  const labels = issue.labels.map(l => l.name.toLowerCase());
  const title = issue.title.toLowerCase();
  const body = (issue.body || '').toLowerCase();

  // Critical: bugs that break core functionality
  if (labels.includes('bug')) {
    if (
      labels.includes('critical') ||
      title.includes('crash') ||
      title.includes('broken') ||
      body.includes('cannot') ||
      body.includes('doesn\'t work')
    ) {
      return { priority: 1, label: '🔴 CRITICAL' };
    }
    return { priority: 2, label: '🟠 HIGH' };
  }

  // High: Major UX issues
  if (labels.includes('ux') || labels.includes('usability')) {
    return { priority: 2, label: '🟠 HIGH' };
  }

  // Medium: Enhancements
  if (labels.includes('enhancement') || labels.includes('feature')) {
    return { priority: 3, label: '🟡 MEDIUM' };
  }

  // Low: Polish and minor improvements
  if (labels.includes('polish') || labels.includes('documentation')) {
    return { priority: 4, label: '🟢 LOW' };
  }

  // Backlog: Questions, discussions, or large features
  if (labels.includes('question') || labels.includes('discussion')) {
    return { priority: 5, label: '⚪ BACKLOG' };
  }

  // Default to medium
  return { priority: 3, label: '🟡 MEDIUM' };
}

function formatIssue(issue, priorityInfo) {
  const labels = issue.labels.map(l => l.name).join(', ');
  const createdDate = new Date(issue.created_at).toISOString().split('T')[0];

  return `
### Issue #${issue.number}: ${issue.title}
- **Labels:** ${labels || 'none'}
- **Reporter:** @${issue.user.login}
- **Created:** ${createdDate}
- **URL:** ${issue.html_url}
- **Description:** ${(issue.body || 'No description provided.').substring(0, 300)}${issue.body && issue.body.length > 300 ? '...' : ''}
- **Status:** TODO
`;
}

async function main() {
  try {
    console.log('Fetching issues from GitHub...\n');

    const issues = await fetchIssues();

    // Filter out pull requests (they show up in issues API)
    const realIssues = issues.filter(issue => !issue.pull_request);

    if (realIssues.length === 0) {
      console.log('No open issues found! 🎉\n');
      console.log('Everything is in good shape.\n');
      return;
    }

    console.log(`Found ${realIssues.length} open issue(s)\n`);
    console.log('=' .repeat(80));
    console.log('PRIORITIZED ISSUES');
    console.log('=' .repeat(80));

    // Prioritize and group issues
    const prioritized = realIssues.map(issue => ({
      issue,
      ...prioritizeIssue(issue)
    }));

    // Sort by priority
    prioritized.sort((a, b) => a.priority - b.priority);

    // Group by priority
    const grouped = {
      '🔴 CRITICAL': [],
      '🟠 HIGH': [],
      '🟡 MEDIUM': [],
      '🟢 LOW': [],
      '⚪ BACKLOG': []
    };

    prioritized.forEach(item => {
      grouped[item.label].push(item.issue);
    });

    // Output formatted issues
    for (const [label, issueList] of Object.entries(grouped)) {
      if (issueList.length > 0) {
        console.log(`\n## ${label}\n`);
        issueList.forEach(issue => {
          const priorityInfo = prioritizeIssue(issue);
          console.log(formatIssue(issue, priorityInfo));
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal: ${realIssues.length} issue(s) to process`);
    console.log('\nNext steps:');
    console.log('1. Copy the output above to .claude/ACTIVE-ISSUES.md');
    console.log('2. Start working through issues from highest priority');
    console.log('3. Update COMPLETED.md as you complete each issue\n');

  } catch (error) {
    console.error('Error fetching issues:', error.message);
    process.exit(1);
  }
}

main();
