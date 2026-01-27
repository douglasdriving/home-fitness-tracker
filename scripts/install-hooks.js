#!/usr/bin/env node

/**
 * Git Hooks Installer
 *
 * Installs the pre-commit hook that runs the dead code scanner.
 * Run this script after cloning the repository to set up the hooks.
 *
 * USAGE:
 *   node scripts/install-hooks.js
 *   npm run hooks:install
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync, statSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const preCommitHook = `#!/bin/sh
#
# Pre-commit hook: Dead Code Scanner
#
# This hook runs the dead code scanner before each commit.
# If dead code is detected, the commit will be BLOCKED.
#
# To bypass this hook (NOT RECOMMENDED):
#   git commit --no-verify
#
# To fix issues:
#   1. INVESTIGATE and REMOVE the dead code (preferred)
#   2. Run: npm run scan:dead-code --fix (for auto-fixing unused imports)
#   3. Only if truly necessary, add to .dead-code-exceptions.json
#

echo ""
echo "🔍 Running dead code scanner..."
echo ""

# Run the dead code scanner
node scripts/dead-code-scanner.js

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "⛔ COMMIT BLOCKED: Dead code detected!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Please clean up the dead code before committing."
    echo ""
    echo "Quick fixes:"
    echo "  npm run scan:dead-code -- --fix   # Auto-fix unused imports"
    echo "  npm run scan:dead-code -- --verbose   # See detailed output"
    echo ""
    echo "⚠️  Do NOT bypass with --no-verify unless absolutely necessary!"
    echo ""
    exit 1
fi

echo ""
echo "✅ Dead code scan passed!"
echo ""
`;

function installHooks() {
  console.log('🔧 Installing git hooks...\n');

  // Find the git directory (handle worktrees)
  let gitDir = join(projectRoot, '.git');

  if (!existsSync(gitDir)) {
    console.error('❌ Error: Not a git repository');
    process.exit(1);
  }

  // Check if .git is a file (worktree) or directory
  const gitStat = statSync(gitDir);
  if (!gitStat.isDirectory()) {
    // It's a worktree, read the gitdir path
    const gitContent = readFileSync(gitDir, 'utf-8');
    const match = gitContent.match(/gitdir: (.+)/);
    if (match) {
      gitDir = resolve(projectRoot, match[1].trim());
    }
  }

  const hooksDir = join(gitDir, 'hooks');

  // Create hooks directory if it doesn't exist
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const preCommitPath = join(hooksDir, 'pre-commit');

  // Write the pre-commit hook
  writeFileSync(preCommitPath, preCommitHook, 'utf-8');

  // Make it executable
  chmodSync(preCommitPath, '755');

  console.log(`✅ Pre-commit hook installed at: ${preCommitPath}`);
  console.log('\nThe dead code scanner will now run before each commit.');
  console.log('Commits with dead code will be blocked.\n');
}

installHooks();
