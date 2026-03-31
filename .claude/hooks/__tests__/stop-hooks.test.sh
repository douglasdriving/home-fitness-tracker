#!/usr/bin/env bash
#
# Test suite for Claude Code Stop hooks
#
# Verifies that all three stop hooks produce correct JSON output
# for the Claude Code Stop hook protocol:
#   - Exit code 0 with JSON {"decision":"block","reason":"..."} to block
#   - Exit code 0 with no output (or empty) to allow
#   - Hooks must read JSON input from stdin (including stop_hook_active flag)
#   - Hooks must NOT exit with code 1/2 (non-blocking/blocking error)
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
# Test Group 3: stop_hook_active bypass
# ============================================================
echo ""
echo "--- Test Group 3: stop_hook_active bypass ---"
echo ""

# Test 3.1: eslint-autofix-hook allows stop when stop_hook_active=true
echo "Test 3.1: eslint-autofix-hook respects stop_hook_active"
OUTPUT=$(make_stop_input true | bash "$ESLINT_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "eslint-autofix-hook exits 0 when stop_hook_active" 0 $EXIT_CODE
assert_no_block_decision "eslint-autofix-hook does not block when stop_hook_active" "$OUTPUT"

# Test 3.2: enforce-testing-hook allows stop when stop_hook_active=true
echo ""
echo "Test 3.2: enforce-testing-hook respects stop_hook_active"
OUTPUT=$(make_stop_input true | bash "$TESTING_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "enforce-testing-hook exits 0 when stop_hook_active" 0 $EXIT_CODE
assert_no_block_decision "enforce-testing-hook does not block when stop_hook_active" "$OUTPUT"

# Test 3.3: verify-pr-hook allows stop when stop_hook_active=true
echo ""
echo "Test 3.3: verify-pr-hook respects stop_hook_active"
OUTPUT=$(make_stop_input true | bash "$VERIFY_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "verify-pr-hook exits 0 when stop_hook_active" 0 $EXIT_CODE
assert_no_block_decision "verify-pr-hook does not block when stop_hook_active" "$OUTPUT"

# ============================================================
# Test Group 4: Blocking behavior with actual issues
# ============================================================
echo ""
echo "--- Test Group 4: Blocking on real issues ---"
echo ""

# Test 4.1: enforce-testing-hook blocks when source changed but no tests run
echo "Test 4.1: enforce-testing-hook blocks when code changed without tests"
# Create a temporary source change
TEMP_SRC="$PROJECT_ROOT/src/lib/__stop_hook_test_temp.ts"
echo "export const testTemp = 42;" > "$TEMP_SRC"
git add "$TEMP_SRC" > /dev/null 2>&1

# Provide a transcript that does NOT mention test execution
TRANSCRIPT_INPUT=$(cat <<'EOF'
{"hook_event_name":"Stop","stop_hook_active":false,"transcript_summary":"User asked for a random change. Claude edited a file.","last_assistant_message":"Done with the change."}
EOF
)

OUTPUT=$(echo "$TRANSCRIPT_INPUT" | bash "$TESTING_HOOK" 2>/dev/null)
EXIT_CODE=$?
assert_exit_code "enforce-testing-hook exits 0 (not 1)" 0 $EXIT_CODE
assert_json_has_block_decision "enforce-testing-hook outputs block decision" "$OUTPUT"

# Clean up
git reset HEAD "$TEMP_SRC" > /dev/null 2>&1
rm -f "$TEMP_SRC"

# Test 4.2: verify-pr-hook blocks when dead component exists (untracked file)
# This creates an untracked .tsx file — the hook must detect untracked files
# as potential changes, not just git-tracked modifications.
echo ""
echo "Test 4.2: verify-pr-hook blocks on dead component (untracked file)"
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
