# QA Report — Fynvita Wave 7 (Security & Correctness Remediation)

> Status: **CONDITIONAL — GO WITH CONDITIONS** (pending 2 in-session blocker fixes verifying + operator items)
> Branch `remediation/wave-7-foundation` · Scope: M1 Closed-Beta readiness
> Method: adversarial re-verification from source (the project's prior "100% done" claim was false — nothing trusted from commit messages). 4 independent reviewers + fresh gate runs.

## Executive summary

Wave 7 remediation is **genuinely real**, not a paper claim: across auth, payments/money,
investments/notifications/admin, and compliance/mobile, the enumerated CRITICALs are fixed at the
correct layer with real regression tests (600+ security/money tests executed fresh this session,
0 failures). The "trust nothing" pass earned its keep — it surfaced **two live bugs the fix commits
never disclosed**, both now fixed this session, plus conditions that are genuinely the operator's.

## Gate evidence (tip, fresh)

| Gate | Result | Evidence |
|---|---|---|
| type-check (web) | **PASS** 0 err | `npm run type-check` |
| tests (web) | **PASS** 16,179 / 0 fail / 19 skip | `npm test` |
| build | **PASS** | `npm run build` |
| negative-auth | **PASS** 609 (floor ≥568) | `npm run test:auth-negative` |
| audit:auth | **PASS** 295/295 routes classified | `npm run audit:auth` (fixed `12c4b86`) |
| mobile `tsc` | **PASS** 0 err (was 13) | `bd5ca79` |
| lint | 15 legacy errors → fix in progress | `fix-lint` |
| npm audit | 32 vulns (1 crit / 16 high) — M2 gate | operator |

## V-CRIT — 32 CRITICALs, per-cluster verdict

| Cluster | Findings | Verdict | Tests run |
|---|---|---|---|
| Auth/RBAC (FND-001–006) | 6 | 5 CLOSED_REAL · **FND-001 INERT_BEHIND_FLAG** | api-guard/middleware/rbac — pass |
| Payments/Money (FND-014–018, 024–027) | 9 | **8 CLOSED_REAL** (FND-024 closed; FND-026 partial — dual-rail) · **B1 fee bug found + fixed** (`14dd011`, a separate new finding) | 281 money tests pass |
| Investments/Notif/Admin (FND-030–032, 041–044, 049–053) | 12 | 12 CLOSED_REAL | 138 tests pass |
| Compliance/Mobile (FND-056–058, 064, 068) | 5 | 5 CLOSED_REAL · **FND-058 schema risk (below)** | breach 35 / consent 35 / erasure 130 / mobile 39 pass |

> **Count reconciliation:** 30 of 32 = 32 enumerated M1 CRITICALs - FND-001 (INERT) - FND-026 (partial); per-cluster 5 + 8 + 12 + 5 = 30.

**FND-001 (INERT_BEHIND_FLAG, not open-hole):** per-route `withAuth`/`withRole` enforcement is
LIVE and independent of any flag (audit:auth 295/295 proves every route wrapped). Only the
*middleware* deny-by-default backstop is off (`auth.deny_by_default` seeds `false`, no flip plan,
audit:auth not CI-gated). The system runs on one enforcement layer instead of the intended two.

## Blockers found this session (NOT in the original register)

| # | Severity | Finding | Status |
|---|---|---|---|
| B1 | 🔴 CRITICAL | `payout-service.ts:calculateFees` subtracts cent-scaled flat fees from a dollar-scaled amount → a $50 bank-transfer payout nets **$0.00**, an $80 check nets **−$20**. Unit-confusion, same class as FND-024, uncaught, no test. Mitigated only because payouts are currently unwired. | **fix in progress** (fix-payout-fees) |
| B2 | 🔴 HIGH | FND-058 erasure RPC does an **unguarded** `DELETE FROM %I` loop; 5 of 6 cited tables have no `CREATE TABLE` in any migration → if absent in the live DB, the RPC throws and **all** GDPR erasure fails. | **fix in progress** (fix-erasure-resilient, resilient `to_regclass`-guarded migration) |

## Conditions / follow-ups (not shippable-blocking, but tracked)

- **FND-026 dual payout rail** — `payout-service.ts` and `commission-calculator.ts` are two
  independent payout implementations with no shared idempotency namespace. Safe *only* because both
  have zero callers today. **Merge or explicitly kill one rail before either is wired to a trigger.**
- **Schema drift** — payout/affiliate tables (payouts, payout_batches, manual_payout_queue,
  affiliate_partners, …) and the 5 erasure tables above are absent from `supabase/migrations/`.
  Requires a **live/staging schema audit** — unverifiable from files.
- **Lower-severity residuals** (follow-up tasks): mock-fallback fabrication in `admin/subscriptions`
  + `admin/disputes` when Supabase env unset; `settings/billing/page.tsx` still hardcodes card 4242
  (nav-linked UI); audit-log POST trusts client `user_id`/`ip`; `?? "free"` credit-reset fallback;
  dead code in `auth-middleware.ts` (old JWT-role pattern, zero importers — delete); `dev-seed.ts`
  used by 6 mobile stores.

## Operator-gated M1 launch items (NOT resolvable in-session)

| Item | Unblocker |
|---|---|
| AUTH-04 deny-by-default prod flip | Staging flag ON → 24 h synthetic monitoring green (all webhooks + signup/login/OAuth) → SEC sign-off `PUBLIC_ROUTES.ts` → flip. Also wire `audit:auth` + `test:auth-negative` into CI. |
| Closed-beta cohort | Invite the limited real-user cohort |
| `main` branch protection | Enable require-PR + review + CODEOWNERS enforcement |
| npm audit (32 vulns, 1 crit) | `npm audit fix` (non-breaking) + assess the `ws` critical before public launch |
| PR merge | SEC review + merge (I open the PR; I do not merge) |

## Changes landed this session (`remediation/wave-7-foundation`)

`12c4b86` audit:auth offender fixed · `bc668ea` 24MB zip removed · `5ab461d` CODEOWNERS+SECURITY.md
· `bd5ca79` 13 mobile tsc errors fixed · _(pending)_ B1 payout-fee fix, B2 erasure resilience, 15 lint errors.

## Verdict

**GO WITH CONDITIONS** — the remediation is genuinely shippable for M1 once (a) the two blocker
fixes (B1 payout fee, B2 erasure resilience) verify green — in progress this session — and (b) the
operator-gated items are satisfied (chiefly the 24 h deny-by-default staging soak, the live-schema
audit, and the FND-026 rail decision before any payout code is wired). Absent B1/B2 it is **NO-GO**.
The verification confirmed the 187-commit remediation is real work, not the earlier false "done".
