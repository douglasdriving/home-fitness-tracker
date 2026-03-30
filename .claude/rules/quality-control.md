# Quality Control Rules

## Automated Hooks
Claude Code hooks run automatically during sessions. Configured in `.claude/settings.json`.

### Stop Hooks (run when Claude finishes)
1. **eslint-autofix-hook.sh** - Auto-runs `eslint --fix` on changed `.ts/.tsx` files
2. **enforce-testing-hook.sh** - Blocks if source code changed but no tests were run
3. **verify-pr-hook.sh** - Runs full verification suite on changed code

### Hook Scripts Location
- `.claude/hooks/` - Claude Code hook scripts
- `scripts/hooks/` - Reusable quality control scripts

## Quality Control Scripts

### verify-pr.sh
Full verification suite: TypeScript check, ESLint, Vitest, dead code scanner, dead component checker.
```bash
bash scripts/hooks/verify-pr.sh         # Standard checks
bash scripts/hooks/verify-pr.sh --e2e   # Include Playwright E2E tests
```

### check-dead-components.sh
Detects React components (`.tsx` files) in `src/components/` and `src/pages/` that are never imported.
```bash
bash scripts/hooks/check-dead-components.sh
```

### dead-code-scanner.js
Node.js-based scanner for unused imports, exports, and orphaned files.
```bash
npm run scan:dead-code              # Standard scan
node scripts/dead-code-scanner.js --fix     # Auto-fix unused imports
node scripts/dead-code-scanner.js --verbose # Detailed output
```

## Dead Code Policy
- Dead code checks are **blocking** - they prevent commits and stop Claude
- When dead code is detected, **remove it** rather than adding exceptions
- Exceptions (`.dead-code-exceptions.json`) should be used sparingly for genuine false positives

## Development Commands
```bash
npm run dev              # Development server (localhost:5173)
npm run build            # TypeScript check + production build
npm run lint             # ESLint with --max-warnings 0
npm run test             # Run tests with Vitest
npm run scan:dead-code   # Dead code scanner
```
