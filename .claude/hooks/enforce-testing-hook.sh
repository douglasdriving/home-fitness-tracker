#!/usr/bin/env bash
#
# enforce-testing-hook.sh - Claude Stop hook
#
# Blocks Claude from stopping if code was changed but no tests were
# written or run during the session. Checks the conversation transcript
# for evidence of test execution.
#
# Usage: Configured as a Claude "Stop" hook in .claude/settings.json
#
# This hook reads the transcript from stdin (piped by Claude Code).
# It checks for:
#   1. Vitest test runs (npm run test, npx vitest, vitest run)
#   2. New or modified test files (.test.ts, .test.tsx)

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if any source code was changed (not just config/docs)
CHANGED_SRC=$(git diff --name-only HEAD 2>/dev/null | grep -E '^src/.*\.(ts|tsx)$' || true)
STAGED_SRC=$(git diff --cached --name-only 2>/dev/null | grep -E '^src/.*\.(ts|tsx)$' || true)
ALL_SRC_CHANGES=$(echo -e "${CHANGED_SRC}\n${STAGED_SRC}" | sort -u | grep -v '^$' || true)

# If no source code changed, no need to enforce testing
if [ -z "$ALL_SRC_CHANGES" ]; then
  exit 0
fi

# Check if only test files, config, or docs changed (no enforcement needed)
NON_TEST_CHANGES=$(echo "$ALL_SRC_CHANGES" | grep -v '\.test\.' | grep -v '\.spec\.' | grep -v '__tests__' || true)
if [ -z "$NON_TEST_CHANGES" ]; then
  exit 0
fi

# Read the transcript from stdin to check for test execution
TRANSCRIPT=$(cat)

# Check if tests were run
if echo "$TRANSCRIPT" | grep -qE '(npm run test|npx vitest|vitest run|npm test)'; then
  exit 0
fi

# Check if test files were modified or created
TEST_FILES_CHANGED=$(echo "$ALL_SRC_CHANGES" | grep -E '\.(test|spec)\.(ts|tsx)$' || true)
if [ -n "$TEST_FILES_CHANGED" ]; then
  exit 0
fi

# If we get here, code was changed but no tests were run
echo ""
echo "WARNING: Source code was modified but no tests were run."
echo ""
echo "Changed source files:"
echo "$NON_TEST_CHANGES" | while read -r f; do echo "  - $f"; done
echo ""
echo "Please run tests before finishing:"
echo "  npm run test"
echo ""
exit 1
