#!/usr/bin/env bash
#
# enforce-testing-hook.sh - Claude Stop hook
#
# Blocks Claude from stopping if code was changed but no tests were
# written or run during the session. Checks the conversation context
# from the stop hook input for evidence of test execution.
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

# Check transcript/summary from hook input for evidence of test execution
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_summary // ""' 2>/dev/null)
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' 2>/dev/null)
COMBINED="${TRANSCRIPT} ${LAST_MSG}"

if echo "$COMBINED" | grep -qE '(npm run test|npx vitest|vitest run|npm test)'; then
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
