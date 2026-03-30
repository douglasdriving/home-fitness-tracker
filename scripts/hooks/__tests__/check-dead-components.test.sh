#!/usr/bin/env bash
#
# Test suite for check-dead-components.sh
#
# Creates temporary component files and verifies the scanner detects them.
# Run with: bash scripts/hooks/__tests__/check-dead-components.test.sh

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SCRIPT="$PROJECT_ROOT/scripts/hooks/check-dead-components.sh"

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

echo "=== check-dead-components.sh tests ==="
echo ""

# Test 1: No dead components in clean codebase
echo "Test 1: Clean codebase has no dead components"
bash "$SCRIPT" > /dev/null 2>&1
assert_exit_code "Clean codebase passes" 0 $?

# Test 2: Detect a dead component
echo ""
echo "Test 2: Detect an orphaned component"
DEAD_FILE="$PROJECT_ROOT/src/components/common/DeadTestComponent.tsx"
cat > "$DEAD_FILE" << 'EOF'
export default function DeadTestComponent() {
  return <div>I am dead code</div>;
}
EOF

bash "$SCRIPT" > /dev/null 2>&1
EXIT_CODE=$?
assert_exit_code "Detects dead component (exit 1)" 1 $EXIT_CODE

# Clean up
rm -f "$DEAD_FILE"

# Test 3: Detect a dead page
echo ""
echo "Test 3: Detect an orphaned page"
DEAD_PAGE="$PROJECT_ROOT/src/pages/DeadTestPage.tsx"
cat > "$DEAD_PAGE" << 'EOF'
export default function DeadTestPage() {
  return <div>I am a dead page</div>;
}
EOF

bash "$SCRIPT" > /dev/null 2>&1
EXIT_CODE=$?
assert_exit_code "Detects dead page (exit 1)" 1 $EXIT_CODE

# Clean up
rm -f "$DEAD_PAGE"

# Test 4: Properly imported component passes
echo ""
echo "Test 4: Imported component is not flagged"
bash "$SCRIPT" > /dev/null 2>&1
assert_exit_code "No false positives on imported components" 0 $?

# Summary
echo ""
echo "========================"
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
