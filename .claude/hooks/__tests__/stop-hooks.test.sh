#!/usr/bin/env bash
#
# Test suite for Claude Code Stop hooks
#
# Verifies that all three stop hooks produce correct JSON output
# for the Claude Code Stop hook protocol:
#   - Exit code 0 with JSON {"decision":"block","reason":"..."} to block
#   - Exit code 0 with no output (or empty) to allow
#   - Hooks must read JSON input from stdin (including stop_hook_active flag)
#   - Hooks re-verify on retries (stop_hook_active=true) up to MAX_RETRIES
#   - Hooks bail out after MAX_RETRIES to prevent infinite loops
#
# Run with: bash .claude/hooks/__tests__/stop-hooks.test.sh

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$PROJECT_ROOT"

ESLINT_HOOK="$PROJECT_ROOT/.claude/hooks/eslint-autofix-hook.sh"
TESTING_HOOK="$PROJECT_ROOT/.claude/hooks/enforce-testing-hook.sh"
VERIFY_HOOK="$PROJECT_ROOT/.claude/hooks/verify-pr-hook.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

# Retry files use md5sum of pwd — compute once for cleanup
PWD_HASH=$(pwd | md5sum | cut -d' ' -f1)
ESLINT_RETRY_FILE="/tmp/claude-eslint-hook-retries-${PWD_HASH}"
TESTING_RETRY_FILE="/tmp/claude-testing-hook-retries-${PWD_HASH}"
VERIFY_RETRY_FILE="/tmp/claude-verify-hook-retries-${PWD_HASH}"

cleanup_retry_files() {
  rm -f "$ESLINT_RETRY_FILE" "$TESTING_RETRY_FILE" "$VERIFY_RETRY_FILE"
}

# Clean up at start and on exit
cleanup_retry_files
trap cleanup_retry_files EXIT

assert_exit_code() {
  local description="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" -eq "$expected" ]; then
    echo -e "${GREEN}PASS${NC}: $description"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $description (expected exit $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_valid_json_or_empty() {
  local description="$1"
  local output="$2"

  # Empty output is valid (means "allow")
  if [ -z "$output" ]; then
    echo -e "${GREEN}PASS${NC}: $description (empty output = allow)"
    PASS=$((PASS + 1))
    return
  fi

  # If not empty, must be valid JSON
  if echo "$output" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}: $description"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $description (output is not valid JSON: '$output')"
    FAIL=$((FAIL + 1))
  fi
}

assert_json_has_block_decision() {
  local description="$1"
  local output="$2"

  if [ -z "$output" ]; then
    echo -e "${RED}FAIL${NC}: $description (output is empty, expected block decision)"
    FAIL=$((FAIL + 1))
    return
  fi

  local decision
  decision=$(echo "$output" | jq -r '.decision' 2>/dev/null)
  local reason
  reason=$(echo "$output" | jq -r '.reason' 2>/dev/null)

  if [ "$decision" = "block" ] && [ -n "$reason" ] && [ "$reason" != "null" ]; then
    echo -e "${GREEN}PASS${NC}: $description"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $description (expected decision=block with reason, got decision='$decision' reason='$reason')"
    FAIL=$((FAIL + 1))
  fi
}

assert_no_block_decision() {
  local description="$1"
  local output="$2"

  # Empty output means allow
  if [ -z "$output" ]; then
    echo -e "${GREEN}PASS${NC}: $description (empty output = allow)"
    PASS=$((PASS + 1))
    return
  fi

  local decision
  decision=$(echo "$output" | jq -r '.decision' 2>/dev/null)

  if [ "$decision" != "block" ]; then
    echo -e "${GREEN}PASS${NC}: $description"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $description (expected no block, got decision='$decision')"
    FAIL=$((FAIL + 1))
  fi
}

# Helper: create stdin JSON for stop hooks
make_stop_input() {
  local stop_hook_active="${1:-false}"
  cat <<EOF
{"hook_event_name":"Stop","stop_hook_active":$stop_hook_active,"transcript_summary":"User asked for a random change","last_assistant_message":"Done."}
EOF
}

echo "=== Claude Code Stop Hooks Test Suite ==="
echo ""

# ============================================================
# Test Group 1: All hooks exit 0 (never exit 1 or 2)
# ============================================================
echo "--- Test Group 1: Exit code protocol ---"
echo ""

# Test 1.1: eslint-autofix-hook exits 0 when no changes
echo "Test 1.1: eslint-autofix-hook exits 0 on clean state"
OUTPUT=$(make_stop_input | bash "$ESLINT_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "eslint-autofix-hook exits 0" 0 $EXIT_CODE

# Test 1.2: enforce-testing-hook exits 0 when no changes
echo ""
echo "Test 1.2: enforce-testing-hook exits 0 on clean state"
OUTPUT=$(make_stop_input | bash "$TESTING_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "enforce-testing-hook exits 0" 0 $EXIT_CODE

# Test 1.3: verify-pr-hook exits 0 when no changes
echo ""
echo "Test 1.3: verify-pr-hook exits 0 on clean state"
OUTPUT=$(make_stop_input | bash "$VERIFY_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "verify-pr-hook exits 0" 0 $EXIT_CODE

# ============================================================
# Test Group 2: Output format (valid JSON or empty)
# ============================================================
echo ""
echo "--- Test Group 2: Output format ---"
echo ""

# Test 2.1: eslint-autofix-hook produces valid JSON or empty on clean state
echo "Test 2.1: eslint-autofix-hook output is valid JSON or empty"
OUTPUT=$(make_stop_input | bash "$ESLINT_HOOK" 2>/dev/null)
assert_valid_json_or_empty "eslint-autofix-hook output format" "$OUTPUT"

# Test 2.2: enforce-testing-hook produces valid JSON or empty on clean state
echo ""
echo "Test 2.2: enforce-testing-hook output is valid JSON or empty"
OUTPUT=$(make_stop_input | bash "$TESTING_HOOK" 2>/dev/null)
assert_valid_json_or_empty "enforce-testing-hook output format" "$OUTPUT"

# Test 2.3: verify-pr-hook produces valid JSON or empty on clean state
echo ""
echo "Test 2.3: verify-pr-hook output is valid JSON or empty"
OUTPUT=$(make_stop_input | bash "$VERIFY_HOOK" 2>/dev/null)
assert_valid_json_or_empty "verify-pr-hook output format" "$OUTPUT"

# ============================================================
# Test Group 3: Retry behavior (hooks re-verify on stop_hook_active)
# ============================================================
echo ""
echo "--- Test Group 3: Retry behavior (re-verify on stop_hook_active) ---"
echo ""

# Test 3.1: enforce-testing-hook still blocks on retry when issue persists
echo "Test 3.1: enforce-testing-hook blocks on retry (stop_hook_active=true) when issue persists"
cleanup_retry_files

# Create a temporary source change
TEMP_SRC="$PROJECT_ROOT/src/lib/__stop_hook_test_temp_retry.ts"
echo "export const testRetry = 42;" > "$TEMP_SRC"
git add "$TEMP_SRC" > /dev/null 2>&1

TRANSCRIPT_INPUT=$(cat <<'INPUTEOF'
{"hook_event_name":"Stop","stop_hook_active":true,"transcript_summary":"User asked for a random change. Claude edited a file.","last_assistant_message":"Done with the change."}
INPUTEOF
)

OUTPUT=$(echo "$TRANSCRIPT_INPUT" | bash "$TESTING_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "enforce-testing-hook exits 0 on retry" 0 $EXIT_CODE
assert_json_has_block_decision "enforce-testing-hook blocks on first retry" "$OUTPUT"

# Clean up
git reset HEAD "$TEMP_SRC" > /dev/null 2>&1
rm -f "$TEMP_SRC"

# Test 3.2: verify-pr-hook still checks on retry when stop_hook_active=true
echo ""
echo "Test 3.2: verify-pr-hook still runs verification on retry"
cleanup_retry_files

DEAD_FILE="$PROJECT_ROOT/src/components/common/StopHookTestDeadRetry.tsx"
cat > "$DEAD_FILE" << 'COMPEOF'
export default function StopHookTestDeadRetry() {
  return <div>dead</div>;
}
COMPEOF

OUTPUT=$(make_stop_input true | bash "$VERIFY_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "verify-pr-hook exits 0 on retry" 0 $EXIT_CODE
assert_json_has_block_decision "verify-pr-hook blocks on retry with dead component" "$OUTPUT"

# Clean up
rm -f "$DEAD_FILE"

# ============================================================
# Test Group 4: Retry exhaustion (bail out after MAX_RETRIES)
# ============================================================
echo ""
echo "--- Test Group 4: Retry exhaustion (bail out after MAX_RETRIES) ---"
echo ""

# Test 4.1: enforce-testing-hook bails out after MAX_RETRIES
echo "Test 4.1: enforce-testing-hook allows stop after max retries"
cleanup_retry_files

TEMP_SRC="$PROJECT_ROOT/src/lib/__stop_hook_test_temp_exhaust.ts"
echo "export const testExhaust = 42;" > "$TEMP_SRC"
git add "$TEMP_SRC" > /dev/null 2>&1

TRANSCRIPT_NO_TESTS=$(cat <<'INPUTEOF'
{"hook_event_name":"Stop","stop_hook_active":true,"transcript_summary":"User asked for a random change.","last_assistant_message":"Done."}
INPUTEOF
)

# Retry 1 — should block
OUTPUT=$(echo "$TRANSCRIPT_NO_TESTS" | bash "$TESTING_HOOK" 2>/dev/null)
assert_json_has_block_decision "enforce-testing-hook blocks on retry 1" "$OUTPUT"

# Retry 2 — should block
OUTPUT=$(echo "$TRANSCRIPT_NO_TESTS" | bash "$TESTING_HOOK" 2>/dev/null)
assert_json_has_block_decision "enforce-testing-hook blocks on retry 2" "$OUTPUT"

# Retry 3 — should give up (MAX_RETRIES=2 exhausted)
OUTPUT=$(echo "$TRANSCRIPT_NO_TESTS" | bash "$TESTING_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "enforce-testing-hook exits 0 after exhaustion" 0 $EXIT_CODE
assert_no_block_decision "enforce-testing-hook allows stop after max retries" "$OUTPUT"

# Clean up
git reset HEAD "$TEMP_SRC" > /dev/null 2>&1
rm -f "$TEMP_SRC"

# Test 4.2: Fresh stop resets retry counter
echo ""
echo "Test 4.2: Fresh stop (stop_hook_active=false) resets retry counter"
cleanup_retry_files

# Simulate: first a retry that creates a counter
echo "1" > "$TESTING_RETRY_FILE"

TEMP_SRC="$PROJECT_ROOT/src/lib/__stop_hook_test_temp_reset.ts"
echo "export const testReset = 42;" > "$TEMP_SRC"
git add "$TEMP_SRC" > /dev/null 2>&1

TRANSCRIPT_NO_TESTS=$(cat <<'INPUTEOF'
{"hook_event_name":"Stop","stop_hook_active":false,"transcript_summary":"User asked for a random change.","last_assistant_message":"Done."}
INPUTEOF
)

# Fresh stop should block (counter reset, runs checks normally)
OUTPUT=$(echo "$TRANSCRIPT_NO_TESTS" | bash "$TESTING_HOOK" 2>/dev/null)
assert_json_has_block_decision "enforce-testing-hook blocks on fresh stop after counter reset" "$OUTPUT"

# Retry file should have been cleaned up by the fresh stop
if [ ! -f "$TESTING_RETRY_FILE" ]; then
  echo -e "${GREEN}PASS${NC}: Retry file cleaned up on fresh stop"
  PASS=$((PASS + 1))
else
  echo -e "${RED}FAIL${NC}: Retry file still exists after fresh stop"
  FAIL=$((FAIL + 1))
fi

# Clean up
git reset HEAD "$TEMP_SRC" > /dev/null 2>&1
rm -f "$TEMP_SRC"

# ============================================================
# Test Group 5: Blocking behavior with actual issues (first attempt)
# ============================================================
echo ""
echo "--- Test Group 5: Blocking on real issues (first attempt) ---"
echo ""

# Test 5.1: enforce-testing-hook blocks when source changed but no tests run
echo "Test 5.1: enforce-testing-hook blocks when code changed without tests"
cleanup_retry_files

TEMP_SRC="$PROJECT_ROOT/src/lib/__stop_hook_test_temp.ts"
echo "export const testTemp = 42;" > "$TEMP_SRC"
git add "$TEMP_SRC" > /dev/null 2>&1

# Provide a transcript that does NOT mention test execution
TRANSCRIPT_INPUT=$(cat <<'INPUTEOF'
{"hook_event_name":"Stop","stop_hook_active":false,"transcript_summary":"User asked for a random change. Claude edited a file.","last_assistant_message":"Done with the change."}
INPUTEOF
)

OUTPUT=$(echo "$TRANSCRIPT_INPUT" | bash "$TESTING_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "enforce-testing-hook exits 0 (not 1)" 0 $EXIT_CODE
assert_json_has_block_decision "enforce-testing-hook outputs block decision" "$OUTPUT"

# Clean up
git reset HEAD "$TEMP_SRC" > /dev/null 2>&1
rm -f "$TEMP_SRC"

# Test 5.2: verify-pr-hook blocks when dead component exists (untracked file)
echo ""
echo "Test 5.2: verify-pr-hook blocks on dead component (untracked file)"
cleanup_retry_files

DEAD_FILE="$PROJECT_ROOT/src/components/common/StopHookTestDead.tsx"
cat > "$DEAD_FILE" << 'COMPEOF'
export default function StopHookTestDead() {
  return <div>dead</div>;
}
COMPEOF

OUTPUT=$(make_stop_input | bash "$VERIFY_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "verify-pr-hook exits 0 (not 1)" 0 $EXIT_CODE
assert_json_has_block_decision "verify-pr-hook outputs block decision for untracked dead component" "$OUTPUT"

# Clean up
rm -f "$DEAD_FILE"

# ============================================================
# Summary
# ============================================================
echo ""
echo "========================"
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
