# Comprehensive Folder Review - Verified

Notes:
- Counts are file counts unless noted.
- Mobile app counts exclude `mobile-app/node_modules` and `mobile-app/dist`.

## Project Overview

| Metric | Value |
|--------|-------|
| Framework | Next.js 15.5.6 + React 19 |
| Total src/ files | 1294 |
| API route handlers | 265 (41 route groups) |
| Components | 254 files (38 categories) |
| Lib/Services | 445 files |
| Mobile app | 429 files (excludes node_modules/dist) |
| Flutter | Partial implementation |

## Root Structure Analysis

| Folder | Purpose | Files |
|--------|---------|-------|
| src/ | Main application code | 1294 |
| docs/ | Documentation | 95 |
| supabase/ | Database config/migrations | 34 |
| e2e/ | Playwright E2E tests | 16 |
| cypress/ | Cypress tests and support | 41 |
| scripts/ | Utility scripts | 7 |
| artillery/ | Load testing | 6 |

## Cleanup Status (post-cleanup)

- tmpclaude-* files removed: 0 in root, 0 in mobile-app.
- Root PHASE_/PRIORITY_/REPORT/SUMMARY files moved to `docs/archive` and `docs/reports` (0 remaining in root).
- Duplicate CreditMaster overview summaries moved to `docs/reports`.

## src/app Structure (pages and routes)

- `src/app` contains 547 files.
- `api/`: 265 route handlers across 41 groups; middleware bypasses `/api`; only a few routes use `withPermission` or inline Supabase auth.
- `dashboard/`: uses mock data.
- `admin/`: protected by middleware role checks.
- `auth/`: callback uses hash tokens and writes to `users`; may conflict with `profiles` schema.
- `onboarding/`: 7 files.
- `credit-builder/`: 48 files.
- `investments/`: 14 files.
- `marketplace/`: 40 files.
- `trading/`: 3 files.
- Key issue: `src/app/page.tsx` is 105,592 bytes.

## src/components

| Category | Files | Status |
|----------|-------|--------|
| financial | 51 | OK |
| investments | 27 | OK |
| ui | 21 | OK |
| credit-repair | 12 | OK |
| trading | 12 | OK |
| charts | 12 | OK |
| disputes | 9 | OK |
| __tests__ | 10 | Limited coverage |

## src/lib

| Folder | Files | Purpose | Status |
|--------|-------|---------|--------|
| financial | 75 | Financial services | OK |
| investments | 58 | Investment analysis | OK |
| trading | 48 | Trading engines | OK |
| ai | 19 | AI/chat engines | OK |
| commerce | 16 | Marketplace | OK |
| credit-repair | 15 | Credit services | OK |
| auth | 12 | Authentication | Not used by most API routes |
| security | 11 | Security utils | Underutilized |
| connectors | 13 | External integrations | OK |

Large files (split candidates):
- `src/lib/investments/ai-stock-analyst.ts` (69,693 bytes)
- `src/lib/financial/financial-aggregation-service.ts` (51,801 bytes)
- `src/lib/financial/health-score-calculator-v2.ts` (55,530 bytes)
- `src/lib/financial/spending-analyzer.ts` (49,125 bytes)
- `src/lib/financial/savings-optimizer.ts` (47,150 bytes)
- `src/lib/financial/smart-budget-engine.ts` (45,463 bytes)
- `src/lib/investments/signal-generator.ts` (46,779 bytes)

## src/hooks

- `useAuth.ts`, `useGamification.ts`, `useMarketData*.ts`, `useOnboardingProgress.ts`, `useOfflineQueue.ts`: present.
- `__tests__`: 6 files.

## API Routes (`src/app/api`)

| Group | Route handlers | Auth status |
|-------|----------------|-------------|
| financial | 66 | No centralized auth |
| investments | 30 | No centralized auth |
| credit-repair | 26 | No centralized auth |
| ai | 24 | Mixed; chat endpoints missing auth |
| marketplace | 12 | No centralized auth |
| admin | 10 | Has auth checks |
| disputes | 10 | No centralized auth |
| trading | 6 | No centralized auth |

Note: Only one route currently uses `withPermission` (`src/app/api/financial/budgets/route.ts`). Several AI routes implement inline Supabase/JWT checks.

## Mobile Apps

`mobile-app/` (Expo/React Native):
- Total files: 429 (excluding node_modules/dist)
- `app/`: 267
- `src/`: 153
- `e2e/`: 6

Issues:
- tmpclaude files removed (previously 27).
- `package-lock.json` size: 833,892 bytes.

`flutter/`:
- `modules/` (8 items) plus setup guides.
- Status: partial implementation.

## supabase/

- Migrations: 25 files in `supabase/migrations`.
- Table naming inconsistency: code uses `users` table in several places, migrations define `profiles`.

## Testing Infrastructure

| Type | Location | Status |
|------|----------|--------|
| Unit tests | `src/**/__tests__/` | 1.86% line coverage (`coverage/coverage-summary.json`) |
| E2E (Playwright) | `e2e/` | 16 spec files |
| E2E (Cypress) | `cypress/e2e/` | 7 spec files |
| Mobile E2E | `mobile-app/e2e/` | 6 spec files |
| Load tests | `artillery/` | 6 configs |

## Critical Issues Summary

P0:
- API routes bypass middleware auth (intentional `/api` bypass); many routes unguarded. Paths: `src/middleware.ts`, `src/app/api/**`.
- AI chat routes missing auth (cost exposure). Path: `src/app/api/ai/chat/**`.
- Dashboard uses mock data. Path: `src/app/dashboard/page.tsx`.
- OAuth callback uses `users` table; may conflict with `profiles` schema. Path: `src/app/auth/callback/page.tsx`.

P1:
- Test coverage 1.86%.
- Large files in `src/lib` (see list).
- Code references `users` table while migrations define `profiles`. Paths: `src/lib/auth/auth-service.ts`, `src/lib/commerce/**`, `src/app/auth/callback/page.tsx`.

P2:
- Root report files moved to `docs/archive` and `docs/reports`.
- `src/app/page.tsx` is 105,592 bytes; split recommended.

## Folder Health Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Structure | 7/10 | Feature-based org; root cleanup completed |
| Security | 3/10 | Middleware bypass for `/api`; missing auth on some AI chat routes |
| Testing | 2/10 | 1.86% coverage |
| Documentation | 6/10 | Extensive but reorganized |
| Mobile | 7/10 | Good Expo setup |
| Database | 6/10 | Good migrations; `users` vs `profiles` mismatch |
| API Design | 5/10 | Comprehensive but unprotected routes |

## Recommended Actions

1. Security hardening:
   - Add auth guards to AI chat routes.
   - Expand `withPermission` coverage beyond budgets.
2. Code quality:
   - Split large files (>45 KB).
   - Add tests for critical paths.
   - Unify on `profiles` table in code.
3. Documentation:
   - Keep archive and reports under `docs/`.
