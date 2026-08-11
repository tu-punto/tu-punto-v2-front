# Playwright E2E

## Required environment variables

- `PW_ADMIN_EMAIL`
- `PW_ADMIN_PASSWORD`
- `PW_BRANCH_NAME`

## Optional environment variables

- `PLAYWRIGHT_BASE_URL`

## Functional test data

Edit:

- `tests/e2e/data/stock-phase1.cases.ts`

Add more entries to each array instead of duplicating tests manually.

## Commands

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`
