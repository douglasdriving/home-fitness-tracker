#!/usr/bin/env bash
#
# Test suite for verify-pr.sh
#
# Verifies the PR verification script runs all checks correctly.
# Run with: bash scripts/hooks/__tests__/verify-pr.test.sh

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SCRIPT="$PROJECT_ROOT/scripts/hooks/verify-pr.sh"

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

assert_output_contains() {
  local description="$1"
  local expected="$2"
  local output_file="$3"

  # Search in file - grep matches through ANSI codes since the text is on the same line
  if grep -q "$expected" "$output_file"; then
    echo -e "${GREEN}PASS${NC}: $description"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $description (output missing: '$expected')"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== verify-pr.sh tests ==="
echo ""

TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

# Test 1: Clean codebase passes all checks
echo "Test 1: Clean codebase passes verification"
bash "$SCRIPT" > "$TMPFILE" 2>&1
EXIT_CODE=$?
assert_exit_code "All checks pass on clean codebase" 0 $EXIT_CODE

# Test 2: Output contains all check sections
echo ""
echo "Test 2: Output contains expected check sections"
OUTPUT_FILE="$TMPFILE"
assert_output_contains "Contains TypeScript check" "TypeScript compilation" "$OUTPUT_FILE"
assert_output_contains "Contains ESLint check" "ESLint" "$OUTPUT_FILE"
assert_output_contains "Contains Unit tests check" "Unit tests" "$OUTPUT_FILE"
assert_output_contains "Contains Dead code scanner" "Dead code scanner" "$OUTPUT_FILE"
assert_output_contains "Contains Dead component checker" "Dead component checker" "$OUTPUT_FILE"

# Test 3: Verify it detects a dead component
echo ""
echo "Test 3: Detects issues when dead component exists"
DEAD_FILE="$PROJECT_ROOT/src/components/common/VerifyTestDead.tsx"
cat > "$DEAD_FILE" << 'EOF'
export default function VerifyTestDead() {
  return <div>dead</div>;
}
EOF

bash "$SCRIPT" > "$TMPFILE" 2>&1
EXIT_CODE=$?
assert_exit_code "Fails when dead component exists" 1 $EXIT_CODE

# Clean up
rm -f "$DEAD_FILE"

# Test 4: Detects TypeScript errors
echo ""
echo "Test 4: Detects TypeScript errors"
TS_ERROR_FILE="$PROJECT_ROOT/src/lib/__test_ts_error.ts"
cat > "$TS_ERROR_FILE" << 'EOF'
const x: number = "this is not a number";
export default x;
EOF

bash "$SCRIPT" > "$TMPFILE" 2>&1
EXIT_CODE=$?
assert_exit_code "Fails on TypeScript error" 1 $EXIT_CODE

# Clean up
rm -f "$TS_ERROR_FILE"

# Summary
echo ""
echo "========================"
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
