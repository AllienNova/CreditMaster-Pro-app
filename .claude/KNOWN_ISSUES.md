# Known Issues — Fynvita

## Mobile Test Coverage at 14% (Target: 80%)
- **Issue:** mobile-app/jest.config.js global threshold is 14% (branches 10%)
- **Impact:** Mobile regressions not caught by coverage gates
- **Fix:** Update thresholds to match web standards (80% global)
- **Status:** NEEDS FIX

## 841 ESLint Warnings (Legacy)
- **Issue:** Mostly no-explicit-any, no-unused-vars, display-name in legacy code
- **Impact:** New warnings hidden in noise
- **Workaround:** 7 actual errors are low priority; warnings are non-blocking
- **Status:** TRACKING

## Mobile Not in CI/CD
- **Issue:** .github/workflows/ci.yml only runs web tests
- **Impact:** Mobile regressions not caught at PR time
- **Fix:** Add mobile-test job (Jest + type-check)
- **Status:** NEEDS FIX

## Playwright E2E Non-Blocking
- **Issue:** Playwright job has `continue-on-error: true` in CI
- **Impact:** E2E failures don't block merges
- **Workaround:** Review E2E results manually in PR checks
- **Status:** BY DESIGN (flaky tests being stabilized)

## Detox E2E Not in CI
- **Issue:** Detox scripts defined in mobile-app/package.json but not wired into GitHub Actions
- **Impact:** Mobile E2E not automated
- **Status:** DEFERRED (requires iOS/Android runners in CI)
