#!/usr/bin/env bash
#
# eslint-autofix-hook.sh - Claude Stop hook
#
# Automatically runs eslint --fix on files changed during this session.
# Catches and fixes formatting/import issues before they get committed.
#
# Usage: Configured as a Claude "Stop" hook in .claude/settings.json
#
# Protocol: Stop hooks must exit 0. To block, output JSON:
#   {"decision":"block","reason":"..."}
# To allow, output nothing or non-block JSON.

set -uo pipefail

# Read stdin (Stop hook input JSON)
INPUT=$(cat)

# Check stop_hook_active to prevent infinite loops
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

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
FIXED_FILES=()
while IFS= read -r file; do
  if [ -f "$file" ]; then
    if ! npx eslint --fix "$file" 2>/dev/null; then
      FIXED_FILES+=("$file")
    fi
  fi
done <<< "$ALL_FILES"

if [ ${#FIXED_FILES[@]} -gt 0 ]; then
  FILES_LIST=$(printf '%s, ' "${FIXED_FILES[@]}")
  FILES_LIST=${FILES_LIST%, }
  cat <<EOF
{"decision":"block","reason":"ESLint autofix applied fixes to: ${FILES_LIST}. Review the changes before proceeding."}
EOF
  exit 0
fi

exit 0
