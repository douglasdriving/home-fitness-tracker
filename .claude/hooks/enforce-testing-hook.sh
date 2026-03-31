#!/usr/bin/env bash
#
# enforce-testing-hook.sh - Claude Stop hook
#
# Blocks Claude from stopping if code was changed but no tests were
# written or run during the session. Parses the transcript JSONL file
# for Bash tool_use entries containing test commands (npm run test, etc).
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
RETRY_FILE="/tmp/claude-testing-hook-retries-$(pwd | md5sum | cut -d' ' -f1)"
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

# Check transcript file for evidence of test execution via Bash tool calls
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null)
# Expand tilde in case transcript_path uses ~/... (not expanded in variables)
TRANSCRIPT_PATH="${TRANSCRIPT_PATH/#\~/$HOME}"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Search for Bash tool_use entries containing test commands in the transcript JSONL
  # Note: avoid grep -q at end of pipeline — with pipefail, SIGPIPE from early exit
  # causes exit code 141, making the pipeline appear to fail despite finding matches.
  TEST_MATCH_COUNT=$(grep -E '"tool_use"' "$TRANSCRIPT_PATH" 2>/dev/null | \
     grep -E '"name"\s*:\s*"Bash"' | \
     grep -cE '(npm run test|npx vitest|vitest run|npm test)' || true)
  if [ "$TEST_MATCH_COUNT" -gt 0 ] 2>/dev/null; then
    exit 0
  fi
fi

# Fallback: check last_assistant_message for test evidence
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' 2>/dev/null)
if echo "$LAST_MSG" | grep -qE '(npm run test|npx vitest|vitest run|npm test)'; then
  exit 0
fi

# Check if test files were modified or created
TEST_FILES_CHANGED=$(echo "$ALL_SRC_CHANGES" | grep -E '\.(test|spec)\.(ts|tsx)$' || true)
if [ -n "$TEST_FILES_CHANGED" ]; then
  exit 0
fi

# Build list of changed files for the reason message
FILE_LIST=$(echo "$NON_TEST_CHANGES" | head -5 | tr '\n' ', ' | sed 's/,$//')

cat <<EOF
{"decision":"block","reason":"Source code was modified but no tests were run. Changed files: ${FILE_LIST}. Please run tests before finishing: npm run test"}
EOF
exit 0
