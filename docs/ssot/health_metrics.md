# Health Metrics — Quality Scorecard

> **VERSION-014.1 — COUNT RECONCILIATION 2026-06-26.** The dated VERSION-013/VERSION-014 narrative below is a 2026-05-03 snapshot (before Theme 10 was added 2026-05-24) and is preserved as historical record. Current canonical figures: **35 CRITICAL + 39 HIGH + 2 MEDIUM + 2 LOW = 78 findings** (FND-001..078) and **230 unique tasks** across Waves 0-10 — see `gap_analysis.md` and `MASTER-IMPLEMENTATION-PLAN.md` Appendix G. §8.5 below reflects the reconciled counts.

> **VERSION-014 — TASK-PRE-01 HONEST RE-BASELINE 2026-05-03**
>
> Re-ran lint, type-check, tests, build, and `npm audit` on `feat/asset-system-regen` @ `2877317`. The static metrics in §1–§5 below have been updated with actual results. **Five gates regressed since VERSION-013** — none of them caught by the test pass count alone:
>
> | Gate | VERSION-013 (claimed) | VERSION-014 (re-baselined) | Δ |
> |------|----------------------|----------------------------|---|
> | Tests | 504 suites · 13,585 cases · 0 failures | 547 of 549 suites executed · 14,587 cases · **35 failures** across 2 PCTT suites (`pctt-trading-service.test.ts`, `pctt-mode-integration.test.ts`); 2 suites skipped | +1,002 cases, **+35 fail** |
> | Type Safety | 0 errors | **0 errors** | clean |
> | Build | SUCCESS, 538 kB | SUCCESS, **560 kB**, 294 API routes / 204 pages | +22 kB |
> | Lint | 7 errors · 841 warnings | **15 errors · 2,858 warnings** | **+8 / +2,017** |
> | npm audit (all) | 2 low (test-only) | **14 (1 high · 11 mod · 2 low)** | +12 vulns |
> | npm audit (prod) | 0 | **9 moderate** (nodemailer SMTP injection via next-auth; postcss XSS via next; uuid via svix→resend) | **+9 prod-affecting** |
>
> The commit `2877317` message claim "14,568/14,587 baseline still valid" was **incorrect** — actual passing count is 14,533. The 35 PCTT failures and the production-vuln set are net-new regressions that the prior re-baseline did not detect.
>
> Web + mobile remain **RED**. The 33-CRITICAL audit register from VERSION-013 (§0) is unchanged. **Ship: BLOCKED** until Wave 7 closes AND the regressions above are resolved (PCTT suite, lint errors, prod `npm audit`).
>
> See `docs/ssot/gap_analysis.md` for the 71-finding register and `MASTER-IMPLEMENTATION-PLAN.md` § Wave 7 for remediation. Breadcrumb: `.claude/last-verification.json` (verdict: FAIL).
>
> ---
>
> **VERSION-013 — STATUS FLIPPED TO RED 2026-05-03**
>
> A 9-domain comprehensive code review (27 reviewer agents) opened **33 CRITICAL** + 38 HIGH findings. Web overall + mobile both **FAIL**. The metrics below have now been re-baselined (VERSION-014); the per-domain audit results in §0 are the authoritative quality signal until Wave 7 closes.
>
> See `docs/ssot/gap_analysis.md` for the 71-finding register and `MASTER-IMPLEMENTATION-PLAN.md` § Wave 7 for the remediation roadmap.

---

## 0. Per-Domain Audit Scorecard (VERSION-013, 2026-05-03)

| Domain | Security | Architecture | Code Quality | Worst Severity |
|--------|---------|--------------|--------------|---------------:|
| Auth + middleware | **FAIL** (4 H) | COND. PASS (2 C, 3 H) | **FAIL** (4 H) | 2 CRITICAL |
| Payments + Subs | **FAIL** (3 H) | **FAIL** (2 C, 2 H) | **FAIL** (2 C, 5 H) | 4 CRITICAL |
| Commerce | **FAIL** (2 H) | **FAIL** (2 C, 4 H) | **FAIL** (1 C, 3 H) | 3 CRITICAL |
| Financial services | **FAIL** (3 H) | **FAIL** (1 C, 3 H) | **FAIL** (2 H) | 1 CRITICAL |
| Investments | **FAIL** (1 C, 2 H) | **FAIL** (1 C, 2 H) | **FAIL** (4 H) | 2 CRITICAL |
| Notifications | **FAIL** (4 C, 4 H) | **FAIL** (2 C, 3 H) | **FAIL** (2 C, 4 H) | **8 CRITICAL** |
| Admin | **FAIL** (2 C, 5 H) | **FAIL** (2 C, 3 H) | **FAIL** (3 C, 5 H) | **7 CRITICAL** |
| AI + Compliance | **FAIL** (3 H) | **FAIL** (2 C, 3 H) | CHANGES (2 H) | 2 CRITICAL |
| Mobile app | **FAIL** (2 C, 3 H) | **FAIL** (2 C, 3 H) | CHANGES (5 H) | 2 CRITICAL |
| Credit repair (already remediated where possible — see commit `d64e8d5`) | PASS (post-fix) | COND. PASS | PASS | (closed) |
| Trading (separate review session) | FAIL (3 C, 4 H) | FAIL (3 C, 4 H) | FAIL (3 C, 4 H) | 3 CRITICAL |
| **TOTALS** | — | — | — | **33 CRITICAL across 9 domains** |

**Overall verdict**: **RED (web + mobile)**. **Ship: BLOCKED until Wave 7 exit gates pass.**

---

> DICE v3.3 Step 9 Output (original)
> Generated: 2026-02-25 | **Re-baselined: 2026-05-03 (VERSION-014, TASK-PRE-01)**
> Source: Live codebase verification (`npm test`, `tsc --noEmit`, `next lint`, `next build`, `npm audit`)
>
> The numerical metrics in §1-§5 reflect the TASK-PRE-01 re-run on `feat/asset-system-regen` @ `2877317`. Test pass count is **necessary but not sufficient** — the audit found 33 CRITICAL bugs the suite passes through, AND the re-baseline found 35 net-new failures the prior commit-message claim said did not exist.

---

## 1. Test Suite (Re-baselined 2026-05-03)

| Metric | Value |
|--------|-------|
| **Test Suites** | 545 passed, 2 failed, 2 skipped, 547 of 549 total |
| **Test Cases** | 14,533 passed, 35 failed, 19 skipped, 14,587 total |
| **Execution Time** | ~22s |
| **Pass Rate** | 99.76% (14,533 / 14,568 expected-to-pass) |
| **Suite Pass Rate** | 99.63% (545 / 547 executed) |
| **Failures** | **35** across 2 PCTT suites (see below) |

### Failing Suites (PCTT)

The 35 failures are split across two files; both are PCTT trading-engine tests:
- `src/lib/trading/pctt/__tests__/pctt-trading-service.test.ts`
- `src/lib/trading/pctt/__tests__/pctt-mode-integration.test.ts`

Failure modes observed:
- `TypeError: Cannot read properties of undefined (reading 'currentPrice')` — `updatePositions` test
- `TypeError: Cannot read properties of undefined (reading 'id')` — `getTradingStats / closePosition` tests
- `expect(...).toBe(1)` got `0` — `resetDailyStats` daily trade counter

**Status**: BLOCKING. Tracked under Wave 7 (likely fold into TASK-MNY-* or new TRD-W7-* card). The prior commit-message claim "14,568/14,587 baseline still valid" was wrong — these failures predate `2877317` (which only touched docs).

### Growth Since VERSION-001

| Metric | VERSION-001 (2026-02-24) | Current (2026-02-25) | Delta |
|--------|--------------------------|----------------------|-------|
| Test Files | 234 | 356 suites | +122 suites |
| Test Cases | 3,287 | 7,279 | +3,992 (+121%) |

### Skipped Tests (19)

All skips are intentional — environment-dependent tests that require live API keys or external services. Zero skips due to flakiness or known failures.

---

## 2. Type Safety

| Metric | Value |
|--------|-------|
| **TypeScript Version** | 5.7.2 |
| **Strict Mode** | Enabled |
| **Type Errors** | 0 |
| **Production Code Errors** | 0 |

### TS2556 Resolution (2026-02-25)

3 TS2556 errors in test mock setup were **FIXED** by replacing unnecessary spread wrappers `(...args: any[]) => mockCreateClient(...args)` with direct references `mockCreateClient`. All 3 test files (auto-save-rules-service, manual-account-service, spending-limit-alerts-service) now compile cleanly and pass (135 tests).

**Assessment**: Zero type errors across production and test code.

---

## 3. Build (Re-baselined 2026-05-03)

| Metric | Value |
|--------|-------|
| **Build Tool** | Next.js 15.5.6 |
| **Build Status** | SUCCESS (exit 0) |
| **Build Warnings** | 0 blocking |
| **First Load JS (shared)** | 560 kB (was 538 kB) |
| **Route Count** | 294 API routes + 204 pages (was 248 + 182) |
| **Static Routes** | Generated successfully |
| **Dynamic Routes** | Generated successfully |

---

## 4. Lint (Re-baselined 2026-05-03)

| Metric | Value |
|--------|-------|
| **Linter** | ESLint via `next lint` (deprecated — migrate to ESLint CLI before Next.js 16) |
| **Errors** | **15** (was 7 — REGRESSION) |
| **Warnings** | **2,858** (was 841 — REGRESSION) |
| **Total Violations** | **2,873** (was 848) |
| **Exit Code** | 1 (errors present; build still succeeds because `eslint-config-next` does not block build) |

### Error / Warning Categories

| Category | Severity | Count | Notes |
|----------|----------|------:|-------|
| `react/display-name` | **Error** | ~7 | Anonymous function components — was warning, now flagged as error |
| `prefer-const` | **Error** | ~5 | `let` declarations never reassigned (e.g., `queryResult`, `callIndex`, `callCount` in test mocks) |
| `react/no-unescaped-entities` | Mixed | many | Apostrophes/quotes in JSX |
| `@typescript-eslint/no-explicit-any` | Warning | ~majority | Legacy + new code |
| `@typescript-eslint/no-unused-vars` | Warning | many | Unused parameters in interfaces/callbacks/destructures |
| `@typescript-eslint/no-require-imports` | Warning | many | Test files using `require()` instead of ESM |

**Assessment**: 15 error-level violations and 2,858 warnings. The build does not block on these (Next.js's `eslint-config-next` warn-only by default), but the **+8 / +2,017 jump since VERSION-013** indicates lint hygiene has decayed. TASK-PRE-05 (Wave 7 lint guards: `no-math-random-in-prod`, `no-restricted-imports` for mocks/fixtures) needs to land before further regression.

---

## 5. Security Audit (Re-baselined 2026-05-03)

| Metric | Value |
|--------|-------|
| **Tool** | `npm audit` |
| **Total Vulnerabilities** | **14** (was 2) |
| **Critical** | 0 |
| **High** | **1** (was 0) — `uuid` via `cypress` chain (dev-only) |
| **Moderate** | **11** (was 0) |
| **Low** | 2 (unchanged — `cookie` via `msw`) |

### Production-Only (`npm audit --omit=dev`): **9 moderate**

| Package | Severity | CVE / Advisory | Impact |
|---------|----------|----------------|--------|
| `nodemailer` (via `next-auth`) | Moderate | GHSA-vvjj-xcjg-gr5g — SMTP command injection via CRLF in transport name (EHLO/HELO) | Production: any nodemailer transport instantiated with attacker-controlled name |
| `postcss <8.5.10` (via `next`) | Moderate | GHSA-qx2v-qp2m-jg93 — XSS via unescaped `</style>` in CSS stringify output | Production: SSR/build-time CSS pipeline |
| `uuid <14.0.0` (via `svix` → `resend`) | Moderate | GHSA-w5hq-g745-h8pq — Missing buffer bounds check in v3/v5/v6 when `buf` provided | Production: email delivery webhook signing |
| `next-auth` | Moderate | Transitive — depends on vulnerable `nodemailer` + `uuid` | Production: auth |
| `next` (chain) | Moderate | Transitive | Production: framework |
| `svix` | Moderate | Transitive | Production: webhook signing |
| `resend` | Moderate | Transitive | Production: email |

### Dev-Only Vulnerabilities (5 of 14)

| Package | Severity | Notes |
|---------|----------|-------|
| `uuid` (via `cypress` → `@cypress/request`) | High | Cypress test runner; not in production bundle |
| `@cypress/request` | High (transitive) | Test-only |
| `cypress` | High (transitive) | Test-only |
| `cookie <0.7.0` (via `msw`) | Low | Test-only (Mock Service Worker) |
| `msw` | Low (transitive) | Test-only |

### Fixes Available

- `npm audit fix` — partial; addresses non-breaking subset
- `npm audit fix --force` — installs `next-auth@1.12.1`, `nodemailer@8.0.7`, `next@9.3.3` (all breaking; do NOT run blindly)

**Assessment**: REGRESSION. Prior baseline reported "0 production vulns" — re-baseline finds **9 production-affecting moderate vulns** introduced by feature work since VERSION-013 (notably `next-auth`/`nodemailer` chain and `svix`→`resend` webhook signing). These need a coordinated upgrade plan, not blanket `--force`. Track as a Wave 7 task (suggest TASK-PRE-08 — production dependency upgrade).

---

## 6. Codebase Metrics (Re-baselined 2026-05-03)

| Metric | VERSION-013 (2026-03-02) | VERSION-014 (2026-05-03) | Source |
|--------|-------------------------:|-------------------------:|--------|
| Test Files (Jest web) | 508 | **551** | `find src -name "*.test.ts" -o -name "*.test.tsx"` |
| API Routes | 284 | **294** | `find src/app/api -name route.ts` |
| Pages | 199 | **204** | `find src/app -name page.tsx` |
| Components | 309 | **344** | `find src/components -name "*.tsx"` |
| DB Migrations | 30 | **39** | `git ls-files supabase/migrations` |
| Mobile App Test Files | 31 | **43** | `find mobile-app -name "*.test.ts" -o -name "*.test.tsx"` |

> Other counts in the prior table (Total Files, LOC, Layouts, Library Dirs, Custom Hooks, Mobile App Source/Routes, Documentation Files) were not re-measured during TASK-PRE-01 — that audit focused on quality gates, not codebase shape. Re-measure if you need a current count for any of those rows.

---

## 7. Coverage by Domain

Based on test suite distribution and DICE v3.3 gap analysis:

| Domain | Test Files | Estimated Coverage | Gate Status |
|--------|-----------|-------------------|-------------|
| Financial Services | 45+ | >= 80% | PASS |
| Trading Engine | 15+ | ~60% (was 11%) | IMPROVING |
| Credit Services | 8+ | >= 80% | PASS |
| Investment Services | 6+ | >= 80% | PASS |
| Security/Auth | 10+ | >= 80% | PASS |
| Notifications | 5+ | ~50% (was 14%) | IMPROVING |
| Admin | 8+ | ~50% (was 12%) | IMPROVING |
| Components (UI) | 40+ | >= 70% | PASS |
| API Routes | 80+ | >= 80% | PASS |
| Mobile App | 0 | 0% | NOT STARTED |

### Coverage Gaps (from SSOT §15 + gap-analysis.md)

| Area | Current | Target | Gap | Task |
|------|---------|--------|-----|------|
| Trading | ~60% | 80% | -20% | TASK-TRD-07 (+ TRD-08 through TRD-13 need new tests) |
| Notifications | ~50% | 80% | -30% | TASK-NTF-03 |
| Admin | ~50% | 80% | -30% | TASK-ADM-03 |
| Tax | ~12% | 80% | -68% | TASK-TAX-01 |
| Credit Monitoring (components) | ~40% | 80% | -40% | TASK-CRD-07 |
| Marketplace | Unverified | 80% | TBD | TASK-MKT-01 |
| Mobile App | 0% | 80% | -80% | TASK-MOB-01 |

---

## 8. Quality Scorecard Summary (Re-baselined 2026-05-03)

| Gate | Check | Result | Status |
|------|-------|--------|--------|
| 1 | Tests Pass | 14,533 passed / 35 failed / 19 skipped of 14,587 | **FAIL** (was PASS) |
| 2 | Type Safety | 0 errors (production + test) | PASS |
| 3 | Build Succeeds | Next.js build complete, 560 kB shared | PASS |
| 4 | Lint Clean | 15 errors, 2,858 warnings | **FAIL** (was PASS — non-blocking but regressed) |
| 5 | Security Audit (prod) | 9 moderate production vulns | **FAIL** (was PASS) |
| 6 | Coverage >= 80% (overall) | Estimated >= 80% (per-suite numbers stale until coverage re-run) | PROVISIONAL |
| 7 | Coverage >= 80% (per-domain) | Stale; trading PCTT now FAIL on functional tests anyway | **FAIL** |
| 8 | Mobile Coverage | 0% (43 mobile test files exist but no Jest config wired) | FAIL |
| 9 | Per-domain audit (VERSION-013) | 9/9 domains FAIL, 33 CRITICAL open | FAIL |

### Overall Health: **RED (web + mobile)**

Re-baseline confirmed: web app no longer passes the basic gates. Five of nine gates are FAIL post-re-baseline. The §0 per-domain audit findings remain unchanged. **Ship: BLOCKED** until Wave 7 closes AND the PCTT test regression + production `npm audit` regression are resolved.

---

## 8.5. Task Completion Status (Re-baselined 2026-05-03, VERSION-013; counts reconciled 2026-06-26, VERSION-014.1)

> The 9-domain audit invalidated the prior "125 DONE / 100%" claim. All 125 originals are NEEDS_VERIFICATION pending TASK-PRE-01; some explicitly REOPENED. Waves 7-10 add 105 new tasks. Each task is counted once in its home wave (see `MASTER-IMPLEMENTATION-PLAN.md` Appendix G).

| Wave | Status | Count |
|------|--------|------:|
| 0-6 (originals) | NEEDS_VERIFICATION (some REOPENED) | 125 |
| 7 (Security & Correctness Remediation) | NOT_STARTED | 60 |
| 8 (AI Provider Resilience) | NOT_STARTED | 12 |
| 9 (Mobile Hardening & Launch) | NOT_STARTED | 13 |
| 10 (Visual Polish & Launch) | NOT_STARTED | 20 |
| **Total (unique)** | **mixed** | **230** |

### Batch Completion Log

| Batch | Tasks | Status | Date |
|-------|-------|--------|------|
| Batch 1 | TRD-07, NTF-03, INF-04 | DONE | 2026-02-28 |
| Batch 2 | SEC-01, UI-01, DOC-03 | DONE | 2026-03-01 |
| Batch 3 | INF-10, CRD-02, FIN-10 | DONE | 2026-02-28 |
| Batch 4 | CRD-05, TRD-14, NTF-01, GMF-01 | DONE | 2026-02-28 |
| Batch 5 | FIN-12, INV-08, NTF-02, TAX-04 | DONE | 2026-02-28 |
| Batch 6 | TAX-03, TAX-05, DOC-02, DOC-04 | DONE | 2026-02-28 |
| Batch 7 | CRD-01, CRD-06, RSK-07, SEC-07 | DONE | 2026-02-28 |
| Batch 8 | NTF-05, TAX-06, FIN-13, MOB-02, PLT-03 | DONE | 2026-03-01 |
| Final | CRD-04, AIM-01, AIM-02, AIM-03, GMF-03, INV-04 | DONE | 2026-03-01 |

### Wave 6 Tasks (13 — DONE)

| Stream | Tasks | Status | Target |
|--------|-------|--------|--------|
| Plaid | PLD-01, PLD-02, PLD-03, PLD-04, PLD-05 | DONE | Wave 6 |
| Broker | TRD-15, TRD-16, TRD-17, TRD-18 | DONE | Wave 6 |
| Affiliate | AFF-01, AFF-02, AFF-03, AFF-04 | DONE | Wave 6 |

### Test Growth: 7,279 → 13,558 (+6,279 tests, +86%)

### IN_PROGRESS Tasks (0)

All 112 tasks are DONE. The 6 previously listed tasks (CRD-04, AIM-01, AIM-02, AIM-03, GMF-03, INV-04) were verified complete with all acceptance criteria met and tests passing — the summary table was stale while individual task cards already showed DONE status.

### NOT_STARTED Tasks (0)

All tasks complete. ADM-04, ADM-05 have no task cards (covered by EXT mapping only).

---

## 9. Trend (VERSION-001 → Current)

| Metric | VERSION-001 | VERSION-011 | VERSION-012 | Trend |
|--------|-------------|-------------|-------------|-------|
| Test Cases | 3,287 | 13,585 | 13,585 | +313% total |
| Test Suites | ~100 | 504 | 504 | +404% total |
| Type Errors | 0 | 0 | 0 | Stable |
| Build | Passing | Passing | Passing | Stable |
| Security Vulns (prod) | 0 | 0 | 0 | Stable |
| LOC | 135,900 | 511,219 | 846,417 | +523% total |
| Pages | 182 | 182 | 199 | +17 (parity) |
| API Routes | 248 | 251 | 284 | +36 total |
| Mobile Routes | 248 | 248 | 257 | +9 (parity) |

---

## 10. Recommendations

### Immediate (Wave 0)

1. ~~**Fix 3 TS2556 test errors**~~ — **DONE** (2026-02-25)
2. ~~**Upgrade systeminformation**~~ — **DONE** (2026-02-25, Cypress 15.10.0 + `npm audit fix`)
3. **Clean lint warnings** — Incremental `any` → proper types (ongoing)

### Wave 1 Gate Requirements

Per GATE-0 exit criteria (build_order_blueprint.md §2):
- [x] Trading test coverage >= 80% (TASK-TRD-07) — DONE (Batch 1)
- [x] Notification test coverage >= 80% (TASK-NTF-03) — DONE (Batch 1)
- [x] Admin test coverage >= 80% (TASK-ADM-03) — DONE (prior)
- [x] CI/CD pipeline documented with runbook (TASK-INF-12) — DONE (prior)
- [x] All 12,106 tests passing (0 failures)
- [x] Build succeeds, zero lint errors, zero type errors

### Wave 1 Additional Gate Requirements (from gap analysis)

- [x] Tax domain test coverage >= 80% (TASK-TAX-01) — DONE (prior)
- [x] Developer documentation portal complete (TASK-DOC-03) — DONE (2026-03-01)

---

_Generated as DICE v3.3 Step 9 output on 2026-02-25._
_Updated 2026-02-25: Added 4 new coverage gap entries (Tax, Credit Monitoring, Marketplace, CI/CD) from gap-analysis.md integration. PCTT trading system integration added 6 trading tasks (TRD-08 through TRD-13). Total task count: 80._
_Updated 2026-02-28: Full 112-task audit completed. MASTER-IMPLEMENTATION-PLAN.md statuses verified against codebase. 84 DONE (75.0%), 13 IN_PROGRESS (11.6%), 15 NOT_STARTED (13.4%). Batch 4 completed: CRD-05, TRD-14, NTF-01, GMF-01._
_Updated 2026-03-01: All 8 batches complete. 105 DONE (93.8%), 7 IN_PROGRESS (6.2%), 0 NOT_STARTED. 12,106 tests, 468 suites, 0 type errors, build SUCCESS. Corrected discrepancies: GMF-02/CRD-07/MOB-05/MOB-07 confirmed DONE; ADM-04/ADM-05 have no task cards (EXT mapping only); 8 task cards (TRD-07, NTF-03, INF-04, INF-05, INF-08, SEC-05, GLC-01, GLC-02) corrected from IN_PROGRESS to DONE._
_Updated 2026-03-01: TASK-DOC-03 (Developer Documentation Portal) completed. OpenAPI auto-generator: 275 paths, 444 operations, 65 tags. 82 new tests (79 generator + 3 route). Total: 106 DONE (94.6%), 6 IN_PROGRESS (5.4%). Test suite: 12,468 tests, 473 suites, 0 failures._
_Updated 2026-03-01: VERSION-008 — Final reconciliation. All 112 tasks confirmed DONE (100%). 6 previously listed IN_PROGRESS tasks (CRD-04, AIM-01, AIM-02, AIM-03, GMF-03, INV-04) verified complete — individual task cards already showed DONE with all acceptance criteria met; summary tables were stale. Quality gates: 12,468 tests (0 failures), 0 type errors, build SUCCESS, 0 high/critical vulns._
_Updated 2026-03-01: VERSION-009 — Added 13 Wave 6 tasks (Plaid, DriveWealth, Affiliate). Total tasks: 112 → 125 (112 DONE + 13 NOT_STARTED). Quality gates unchanged (12,468 tests, 0 type errors, build SUCCESS). New domains: PLD (Plaid, 5 tasks), AFF (Affiliate, 4 tasks), TRD extended (+4 tasks)._
_Updated 2026-03-01: VERSION-010 — Wave 6 complete. All 125 tasks DONE (100%). 13 Wave 6 tasks (PLD-01–05, TRD-15–18, AFF-01–04) completed. Test suite: 13,558 tests (+1,090), 501 suites (+28), 0 failures. Quality gates: all PASS._
_Updated 2026-05-03: VERSION-013 — 9-domain audit (27 reviewer agents) opened 33 CRITICAL + 38 HIGH findings. Status FLIPPED TO RED. All prior "DONE / 100%" claims invalidated; Wave 7 (Security & Correctness Remediation, 59 tasks across 8 phases) opened. Static metrics not yet re-run._
_Updated 2026-05-03: **VERSION-014 — TASK-PRE-01 honest re-baseline executed on `feat/asset-system-regen` @ `2877317`.** Live re-run results: tests 14,533 / 35 fail / 19 skip / 14,587 (REGRESSION — 35 PCTT trading-service failures); types 0 errors (PASS); lint 15 errors / 2,858 warnings (REGRESSION from 7 / 841); build SUCCESS, 560 kB shared, 294 API routes / 204 pages; npm audit 14 total (1 high dev / 11 mod / 2 low), prod-only 9 moderate (REGRESSION from 0). Five gates regressed; the prior commit-message "14,568/14,587 baseline still valid" claim was incorrect. Breadcrumb: `.claude/last-verification.json` (verdict: FAIL). Ship: BLOCKED._
