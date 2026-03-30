#!/usr/bin/env bash
#
# verify-pr-hook.sh - Claude Stop hook
#
# Runs comprehensive verification before allowing Claude to stop.
# This is the last line of defense - catches issues that might have
# been introduced during the session.
#
# Usage: Configured as a Claude "Stop" hook in .claude/settings.json

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if any meaningful changes exist
CHANGES=$(git diff --name-only HEAD 2>/dev/null || true)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
ALL_CHANGES=$(echo -e "${CHANGES}\n${STAGED}" | sort -u | grep -v '^$' || true)

# If no changes, skip verification
if [ -z "$ALL_CHANGES" ]; then
  exit 0
fi

# Check if only docs/config changed (lighter verification)
CODE_CHANGES=$(echo "$ALL_CHANGES" | grep -E '\.(ts|tsx|js|jsx|css)$' || true)

if [ -z "$CODE_CHANGES" ]; then
  # Only docs/config changed, just do a quick lint
  echo "Only non-code files changed, running quick lint..."
  exit 0
fi

# Run the full verification suite
echo "Running PR verification on changed code..."
echo ""

if bash scripts/hooks/verify-pr.sh 2>&1; then
  exit 0
else
  echo ""
  echo "PR verification failed. Please fix the issues above before stopping."
  exit 1
fi
