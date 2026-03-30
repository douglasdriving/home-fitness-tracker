# Testing Rules

## Test Framework
- **Unit tests:** Vitest (`npm run test`)
- **E2E tests:** Playwright (`npm run test:e2e`)

## Test File Locations
- Unit tests live alongside source: `src/**/*.test.ts`, `src/**/*.test.tsx`
- E2E tests: `e2e/`
- Test setup: `src/test/`

## Running Tests
```bash
npm run test          # Run Vitest in watch mode
npx vitest run        # Run Vitest once (CI mode)
npm run test:e2e      # Run Playwright E2E tests
```

## Testing Guidelines
- Write unit tests for all new logic in `src/lib/` and `src/utils/`
- Test files must use `.test.ts` or `.test.tsx` extension
- Use `@testing-library/react` for component tests
- Vitest is configured with jsdom environment
- The enforce-testing hook will block Claude if source code is changed without running tests
