#!/usr/bin/env bash
#
# check-dead-components.sh - Detect React components never imported anywhere
#
# Scans src/components/ and src/pages/ for .tsx files whose default exports
# are not imported by any other file. Entry points (App.tsx, main.tsx) and
# test files are excluded.
#
# Exit codes:
#   0 - No dead components found
#   1 - Dead components detected

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

DEAD_COMPONENTS=()

# Get all component/page .tsx files
while IFS= read -r file; do
  # Get the basename without extension
  basename=$(basename "$file" .tsx)

  # Skip entry points and test files
  case "$basename" in
    App|main|*.test|*.spec) continue ;;
  esac

  # Check if this component is imported anywhere else in src/
  # Look for: import ... from '.../<basename>'
  # Also check: import ... from '.../<basename>.tsx'
  import_count=$(grep -r --include='*.ts' --include='*.tsx' \
    -l "from.*['\"].*/${basename}['\"]" "$SRC_DIR" 2>/dev/null \
    | grep -v "$file" \
    | grep -v '\.test\.' \
    | grep -v '\.spec\.' \
    | wc -l || true)

  if [ "$import_count" -eq 0 ]; then
    # Double-check with dynamic imports
    dynamic_count=$(grep -r --include='*.ts' --include='*.tsx' \
      "import(.*${basename})" "$SRC_DIR" 2>/dev/null \
      | grep -v "$file" \
      | wc -l || true)

    if [ "$dynamic_count" -eq 0 ]; then
      DEAD_COMPONENTS+=("$file")
    fi
  fi
done < <(find "$SRC_DIR/components" "$SRC_DIR/pages" -name '*.tsx' -type f 2>/dev/null)

if [ ${#DEAD_COMPONENTS[@]} -eq 0 ]; then
  echo -e "${GREEN}No dead components found.${NC}"
  exit 0
else
  echo -e "${RED}Dead components detected:${NC}"
  echo ""
  for comp in "${DEAD_COMPONENTS[@]}"; do
    rel_path="${comp#$PROJECT_ROOT/}"
    echo -e "  ${YELLOW}${rel_path}${NC}"
  done
  echo ""
  echo -e "${RED}Found ${#DEAD_COMPONENTS[@]} dead component(s).${NC}"
  echo "These files are not imported anywhere. Remove them or add an import."
  exit 1
fi
