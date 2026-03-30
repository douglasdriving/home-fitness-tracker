#!/usr/bin/env bash
#
# eslint-autofix-hook.sh - Claude Stop hook
#
# Automatically runs eslint --fix on files changed during this session.
# Catches and fixes formatting/import issues before they get committed.
#
# Usage: Configured as a Claude "Stop" hook in .claude/settings.json

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Get changed files (staged + unstaged) that are TypeScript/React
CHANGED_FILES=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx)$' || true)

# Combine and deduplicate
ALL_FILES=$(echo -e "${CHANGED_FILES}\n${STAGED_FILES}" | sort -u | grep -v '^$' || true)

if [ -z "$ALL_FILES" ]; then
  exit 0
fi

# Run eslint --fix on changed files
FAILED=false
while IFS= read -r file; do
  if [ -f "$file" ]; then
    if ! npx eslint --fix "$file" 2>/dev/null; then
      echo "ESLint autofix found issues in: $file"
      FAILED=true
    fi
  fi
done <<< "$ALL_FILES"

if [ "$FAILED" = true ]; then
  echo ""
  echo "ESLint autofix applied fixes. Review the changes before proceeding."
  exit 1
fi

exit 0
