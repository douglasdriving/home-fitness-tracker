#!/usr/bin/env bash
#
# verify-pr.sh - Comprehensive pre-merge verification
#
# Runs all CI checks locally before allowing a PR or Claude stop:
#   1. TypeScript compilation check
#   2. ESLint (with --max-warnings 0)
#   3. Unit tests (Vitest)
#   4. Dead code scanner
#   5. Dead component checker
#   6. (Optional) E2E tests with --e2e flag
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

RUN_E2E=false
FAILURES=()

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --e2e) RUN_E2E=true ;;
  esac
done

echo -e "${BLUE}${BOLD}======================================${NC}"
echo -e "${BLUE}${BOLD}  PR VERIFICATION${NC}"
echo -e "${BLUE}${BOLD}======================================${NC}"
echo ""

# 1. TypeScript compilation
echo -e "${BOLD}[1/5] TypeScript compilation...${NC}"
if npx tsc --noEmit 2>&1; then
  echo -e "  ${GREEN}PASS${NC}"
else
  echo -e "  ${RED}FAIL${NC}"
  FAILURES+=("TypeScript compilation")
fi
echo ""

# 2. ESLint
echo -e "${BOLD}[2/5] ESLint...${NC}"
if npx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0 2>&1; then
  echo -e "  ${GREEN}PASS${NC}"
else
  echo -e "  ${RED}FAIL${NC}"
  FAILURES+=("ESLint")
fi
echo ""

# 3. Unit tests
echo -e "${BOLD}[3/5] Unit tests (Vitest)...${NC}"
if npx vitest run 2>&1; then
  echo -e "  ${GREEN}PASS${NC}"
else
  echo -e "  ${RED}FAIL${NC}"
  FAILURES+=("Unit tests")
fi
echo ""

# 4. Dead code scanner
echo -e "${BOLD}[4/5] Dead code scanner...${NC}"
if node scripts/dead-code-scanner.js 2>&1; then
  echo -e "  ${GREEN}PASS${NC}"
else
  echo -e "  ${RED}FAIL${NC}"
  FAILURES+=("Dead code scanner")
fi
echo ""

# 5. Dead component checker
echo -e "${BOLD}[5/5] Dead component checker...${NC}"
if bash scripts/hooks/check-dead-components.sh 2>&1; then
  echo -e "  ${GREEN}PASS${NC}"
else
  echo -e "  ${RED}FAIL${NC}"
  FAILURES+=("Dead component checker")
fi
echo ""

# Optional: E2E tests
if [ "$RUN_E2E" = true ]; then
  echo -e "${BOLD}[E2E] Playwright tests...${NC}"
  if npx playwright test 2>&1; then
    echo -e "  ${GREEN}PASS${NC}"
  else
    echo -e "  ${RED}FAIL${NC}"
    FAILURES+=("E2E tests")
  fi
  echo ""
fi

# Summary
echo -e "${BLUE}${BOLD}======================================${NC}"
if [ ${#FAILURES[@]} -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ALL CHECKS PASSED${NC}"
  echo -e "${BLUE}${BOLD}======================================${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}  ${#FAILURES[@]} CHECK(S) FAILED:${NC}"
  for failure in "${FAILURES[@]}"; do
    echo -e "  ${RED}- ${failure}${NC}"
  done
  echo -e "${BLUE}${BOLD}======================================${NC}"
  exit 1
fi
