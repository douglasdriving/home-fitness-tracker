#!/usr/bin/env bash
#
# verify-pr-hook.sh - Claude Stop hook
#
# Runs comprehensive verification before allowing Claude to stop.
# This is the last line of defense - catches issues that might have
# been introduced during the session.
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
  exit 0
fi

# Run the full verification suite, capture output to stderr for logging
if bash scripts/hooks/verify-pr.sh >&2 2>&1; then
  exit 0
else
  cat <<'EOF'
{"decision":"block","reason":"PR verification failed. Check the output above for details and fix the issues before stopping."}
EOF
  exit 0
fi
