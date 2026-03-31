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

# Retry logic: allow up to MAX_RETRIES re-checks when stop_hook_active=true
# This ensures Claude's fixes are re-verified, while preventing infinite loops.
MAX_RETRIES=2
RETRY_FILE="/tmp/claude-verify-hook-retries-$(pwd | md5sum | cut -d' ' -f1)"
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)

if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  RETRIES=$(cat "$RETRY_FILE" 2>/dev/null || echo "0")
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    rm -f "$RETRY_FILE"
    exit 0  # Give up after max retries to prevent infinite loops
  fi
  echo $((RETRIES + 1)) > "$RETRY_FILE"
else
  # Fresh stop attempt - reset retry counter
  rm -f "$RETRY_FILE"
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if any meaningful changes exist (tracked, staged, or untracked)
CHANGES=$(git diff --name-only HEAD 2>/dev/null || true)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null || true)
ALL_CHANGES=$(echo -e "${CHANGES}\n${STAGED}\n${UNTRACKED}" | sort -u | grep -v '^$' || true)

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
