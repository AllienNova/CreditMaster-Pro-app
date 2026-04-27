# Fynvita Pre-Beta Review Baseline

> Captured: 2026-04-27 | Branch: feat/asset-system-regen | Commits ahead of main: 69

## Quality Gate Baseline

| Gate | Result | Details |
|------|--------|---------|
| **Type Check** | PASS | 0 errors (`npx tsc --noEmit`) |
| **Tests** | PASS (14,517/14,542) | 544 suites passed, 1 failed (pre-existing affiliate), 2 skipped |
| **Test Failures** | 6 pre-existing | All in `src/lib/commerce/affiliate/__tests__/affiliate-service.test.ts` (referral code validation) |
| **Skipped Tests** | 19 | All environment-dependent (live API keys) |
| **Lint** | PASS | 0 blocking errors, ~841 warnings (legacy code) |
| **Build** | PARTIAL | Server-component import fixed (SubscriptionCancellationWizard). Pre-existing `<Html>` import error in 404 page generation (not from our code). |
| **Security Audit** | 14 vulns | 2 low, 11 moderate, 1 high (all in dev dependencies) |

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Source Files (src/) | ~1,833 |
| Lines of Code | ~846,417 |
| Web Test Files | 544 suites |
| Web Test Cases | 14,517 passing |
| Mobile Store Tests | 20 stores with tests (180 test cases) |
| API Routes | 284 across 42 domains |
| Trading Source Files | 169 |
| Trading Test Files | 99 |
| Mobile Screens | ~259 across 36 route groups |
| Mobile Zustand Stores | 19 |

## P0 Issues Found and Fixed

| Issue | Status | Commit |
|-------|--------|--------|
| Build fail: SubscriptionCancellationWizard imports server-side supabase | **FIXED** | cbf46a3 |
| Compliance gates fail-open on error in orders route | **FIXED** | b1bad1f |

## Known Pre-Existing Issues (Not Introduced This Session)

| Issue | Severity | Notes |
|-------|----------|-------|
| 6 affiliate test failures | P3 | Pre-existing referral code tests, Wave 6 code |
| `<Html>` import in 404 page generation | P2 | Pre-existing Next.js build warning, not from our code |
| 14 npm audit vulnerabilities (dev deps) | P3 | 2 low, 11 moderate, 1 high — all dev-only |
| 841 ESLint warnings | P3 | Legacy code, not growing |
