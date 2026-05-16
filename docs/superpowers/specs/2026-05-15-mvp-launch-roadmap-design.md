# Fynvita MVP Launch Roadmap — Design Spec

> Status: APPROVED (design sections 1–5 + ancillary-scope decision approved by Honour, 2026-05-15)
> Author: pair-programming session, 2026-05-15
> Source of truth: `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md`, `docs/ssot/gap_analysis.md`, `docs/ssot/SSOT.md`, `docs/ssot/health_metrics.md`
> Next step: convert to an executable implementation plan via the writing-plans skill.

---

## 1. Problem statement

Fynvita is a large financial platform (294 API routes, 204 pages, 344 components, plus a
257-route Expo mobile app). A 9-domain code review opened **33 CRITICAL + 38 HIGH** findings;
**all 9 domains fail audit** and the project is **Ship: BLOCKED** behind Wave 7 (Security &
Correctness Remediation — 59 tasks, 8 phases, currently 0% started).

"Polish and verify every workflow, then ship" — taken literally across ~15 workflows — is a
multi-month effort with no intermediate launch. This roadmap defines a **bounded MVP**, sequences
the remediation behind it, and produces two shippable milestones, **without discarding any of the
deferred work**.

This document is a design spec, not an implementation plan. It establishes scope, sequence, and
gates. The executable task plan is produced separately by the writing-plans skill.

---

## 2. MVP definition

### In scope (v1)

| # | Workflow | Web routes (domains) | Notes |
|---|----------|----------------------|-------|
| — | Auth & accounts | `auth` 5, `csrf` 1, `user` 1, `profile` 1, `onboarding` 1, `settings` 1 | Foundation block |
| 1 | Payments | `payment` 4, `credits` 3, `addons` 3 | 6-tier, paid from day one |
| 2 | Investments | `investments` 28 | |
| 3 | Financial management | `financial` 75 | Largest domain |
| 4 | Credit (repair/disputes + monitoring/score) | `credit-repair` 13, `disputes` 9, `credit-bureau` 6, `credit-monitoring` 5, `credit-builder` 5, `credit` 2, `credit-report` 1, `documents` 3 | `documents` folds in (dispute uploads) |
| 5 | Mobile app | `mobile-app/` (257 routes) | Web + mobile launch together |
| 6 | Ancillary (verify-pass) | `tax` 3, `student-loans` 3, `federal` 3, `federal-programs` 1, `gamification` 7 | Built, no CRITICALs — light verify pass |

Cross-cutting and supporting: `ai` 23, `chat` 4, `ml` 2, `voice` 1 (AI infrastructure — Compliance
track); `notifications` 6, `admin` 11, `analytics` 5 (minimal hardening); platform infra
(`cron`, `monitoring`, `health`, `email`, `ws`, etc.).

### Deferred to post-MVP (Wave 8) — NOT cut, NOT deleted

| Workflow | Routes | Reason for deferral |
|----------|--------|---------------------|
| Trading (PCTT) | `trading` 26 | Highest-risk subsystem; autonomous mode; 35 failing PCTT tests |
| Commerce / marketplace / affiliate | `marketplace` 12, `affiliate` 2, `servicers` 2 | 3 CRITICALs incl. live financial loss; partner-dependent |
| White-label / global connector | (platform layer) | Wave 5 platform-scale work, gated on user base |

See §4 for the deferral discipline that governs this work.

### Launch model — two milestones

**M1 — Closed Beta.** Limited real-user cohort. Real PII + real money, so it carries the **full
CRITICAL and compliance bar** — a beta is not a soft launch.

**M2 — Public Launch.** Adds HIGH-finding closure, legacy task re-verification, mobile coverage
depth, scale/observability, and production security remediation.

Gate criteria in §6.

---

## 3. Approach: workflow vertical slices

Three sequencing approaches were considered:

- **A — Wave-7-native (strict phase order).** Execute Wave 7's 8 phases in order, then polish.
  Rejected: phases group by *fix type*, so no workflow is verified-and-done until the very end —
  nothing is demoable or beta-testable incrementally.
- **B — Workflow vertical slices.** *(Selected.)* A mandatory foundation block, then each MVP
  workflow driven to "done" one at a time in risk order — its CRITICALs/HIGHs closed, mocks
  stripped, polished, E2E-verified — before the next starts.
- **C — Two-track parallel.** Foundation, then security remediation and polish as parallel tracks.
  Rejected: polishing a workflow before its CRITICALs are fixed means re-touching the same code
  twice; "done" is undefinable mid-flight.

**Approach B selected** because it is the only one where "verify every workflow" is structurally
true: each workflow reaches a verified, demoable state independently, and beta readiness accrues
workflow by workflow. Wave 7's phase structure is preserved as the *task source*; execution is
re-sequenced onto workflow verticals.

---

## 4. Deferral discipline — deferred ≠ deleted ≠ degraded

Trading (the full PCTT 7-stage pipeline, 7 AI agents, 30-law compliance engine, paper trading,
multi-broker routing, backtesting, journal), Commerce/affiliate, and white-label represent a year
of real work. They are **complete subsystems on a later runway**, not cut scope.

1. **All deferred code stays in the repository.** No `git rm` of a workflow. Nothing removed to
   "simplify."
2. **Deferred code stays in the build.** It must keep compiling and type-checking in every v1
   build — same Next.js project. If a Wave 7 auth or type change touches a shared module that
   trading consumes, trading is fixed too, not abandoned.
3. **Feature-flag gating, not deletion.** Phase 0 (TASK-PRE-03/04) provides the flag system.
   Deferred workflows are flag-gated **off** in beta/public v1 builds — routes and UI not
   user-reachable — but code, types, and tests remain intact behind the flag.
4. **Deferred tests are tracked, not silenced.** The 35 failing PCTT tests
   (`pctt-trading-service.test.ts`, `pctt-mode-integration.test.ts`) get a tracked task —
   **TASK-TRD-W7-00** — owned by Wave 8. They are never deleted or `.skip`'d to make a gate green.
   The Test Integrity Rule holds repo-wide.
5. **Wave 8 owns the deferred work.** Trading, Commerce/affiliate, white-label are brought to
   launch quality post-M2 with the *same* vertical-slice rigor (CRITICALs closed, HIGHs closed,
   E2E-verified). Sequenced and resourced — not a vague "later."

### What "polish and verify a workflow" means — and does not

- **Means:** every sub-feature of the workflow is exercised, hardened, and E2E-verified. If Credit
  has dispute generation, templates, strategies, bureau submission, quick-wins, and goodwill
  letters, **all six** are verified.
- **Does not mean** removing functionality. The only code *removed* during Wave 7 is proven
  fake/mock data in production paths — the fake Visa 4242, `Math.random()` analytics, the
  `setTimeout` mock dispute screen — and each is **replaced with a real implementation**, never
  just deleted. A feature is never cut to make a metric pass.
- **Verification is evidence-based:** build, types, lint, tests, the changed-code coverage gate,
  and a real E2E run. No "should work."

### Meticulousness mechanism

The **first task of every vertical** is to enumerate that workflow's complete sub-feature
checklist from the codebase (every route, page, component, service). A vertical is "done" only
when every checklist item is checked off with verification evidence. Completeness is auditable,
not assumed. The domain inventory in §2 is the starting point; the granular checklist is produced
at vertical start when it is actionable.

---

## 5. Roadmap structure

### Stage 0 — Foundation block (serial, blocks everything)

- **Phase 0 — Prereqs** (TASK-PRE-01..07): honest re-baseline, branch/freeze policy, feature
  flags, lint-guard escalation, branch hygiene on `feat/asset-system-regen`, security re-review of
  the 92 prior commits.
- **Phase 1 — Auth/RBAC rebuild** (TASK-AUTH-01..12): remove `user_metadata` role, kill the admin
  email whitelist, wrap all 284 routes in `withAuth`, deny-by-default middleware with
  `PUBLIC_ROUTES.ts`, kill AIML-key role reuse, consolidate to one rate limiter.

Phase 1 is global: wrapping every route in auth closes the 6 auth CRITICALs **and** the
unauthenticated-access CRITICALs in Notifications (FND-041–044) and Admin (FND-049–053). The
foundation block alone retires ~15 of the 33 CRITICALs.

### Verticals (risk-ordered, mostly serial — Credit/Ancillary may overlap if capacity allows)

| # | Vertical | Wave 7 tasks | CRITICALs closed | HIGHs / mocks |
|---|----------|--------------|------------------|---------------|
| 1 | **Payments** | Phase 2: TASK-WBH-01..07 | FND-014, 015, 016, 017, 018 | FND-019–021 (checkout fields); remove `billing-profile-store` mock |
| 2 | **Investments** | TASK-INV-W7-01/02, TASK-IDR-02 | FND-030, 031, 032 | FND-035 (volatility math); AI-insight mock |
| 3 | **Financial mgmt** | TASK-IDR-03, TASK-MOK-03 | none | FND-036–040 (Plaid IDOR, token-in-URL, date rollover, N+1); debt-API mock |
| 4 | **Credit** (+ documents) | verify-pass + IDOR sweep | none (already remediated) | verify-and-polish pass |
| 5 | **Mobile** | Phase 6: TASK-MOB-W7-01..07 | FND-064, 065, 066, 067, 068 | build coverage from 0% |
| 6 | **Ancillary** (Tax, Student loans/federal, Gamification) | verify-pass | none | light verify-and-polish pass |

**Risk order rationale:** Payments first — highest *business* risk (paid launch on top of "every
paid sub silently lands on `free`") and Phase 2 has internal ordering. Investments second —
highest *correctness/reputational* risk (IDOR data leak, fabricated benchmark data shown as real).
Financial third — moderate (0 CRITICALs, 5 HIGHs). Credit fourth — lowest risk, already
remediated, a verify pass. Mobile fifth — depends on stable web API contracts. Ancillary sixth —
light verify pass, may overlap.

### Cross-cutting tracks (parallel to verticals)

- **Track C — Compliance** (Phase 5: TASK-CMP-01..05): GDPR cascade-delete table expansion
  (FND-058 — currently misses ~34 tables), breach-notification wiring (FND-056), consent DB
  persistence (FND-057), ModelRouter enforcement, PII redaction + prompt-injection guards
  (FND-062/063). **Must complete before M1.**
- **Notifications + Admin minimal hardening** (Phase 4: TASK-MOK-01/02/05): Phase 1 already closed
  their auth holes; this replaces `Math.random()` analytics, the in-memory notification store
  (→ DB persistence so score alerts survive cold start), and mock-on-DB-error with real
  implementations.

### Post-MVP

- **M2 path** (see §6): legacy re-verification, residual HIGH/MEDIUM sweep, mobile coverage depth,
  production security, scale/observability.
- **Wave 8**: Trading, Commerce/affiliate, white-label.

---

## 6. Gates

### Per-vertical verification gate

A vertical is not "done" until **all** of these produce evidence:

- Build, type-check, lint — clean
- Full test suite — 0 failures; no weakened or skipped tests (Test Integrity Rule)
- Changed-code coverage gate (`npm run test:coverage:changed`) — green at 85%
- A real **E2E run** of the workflow (Playwright/Cypress) — not "should work"
- The **sub-feature checklist** for the workflow — every item checked off with evidence
- Every CRITICAL/HIGH assigned to the vertical — closed and verified

### M1 — Closed Beta gate

- Foundation block (Phase 0 + Phase 1) complete — deny-by-default, all routes authenticated
- All 6 verticals pass their per-vertical gate
- Compliance track (Phase 5) complete
- **All 33 CRITICAL findings closed**
- Build / type-check / lint clean; changed-code coverage gate green
- Onboards a limited real-user cohort

### M2 — Public Launch gate

- All **HIGH** findings closed across MVP workflows
- The **125 legacy Waves 0–6 tasks re-verified** — currently all `NEEDS_VERIFICATION`; the
  "100% done" claim was invalidated. Run the `/deep-verify` skill against the master plan to
  produce an evidence-based status per task, then close the real gaps.
- Mobile test coverage built beyond the launch-minimum from Vertical 5
- Production `npm audit` clean — the 9 prod-affecting vulns remediated; full security re-audit
- Load testing, monitoring/alerting, performance polish
- Beta feedback fixes folded in

---

## 7. Execution model

Work runs as the project's PIDVA loop (pre-investigate → plan → do → verify → adapt), vertical by
vertical, largely via Claude Code agents. Foundation block first and serial. The six verticals run
mostly serially in §5 risk order; Credit (V4) and Ancillary (V6) are light verify passes and may
overlap a neighbour if agent capacity allows. The Compliance track runs in parallel and must land
before M1.

---

## 8. Risks & open items

| Risk | Mitigation |
|------|------------|
| Scope creep — MVP already spans 6 verticals + mobile | Deferral discipline (§4) is the hard boundary; Trading/Commerce/white-label do not re-enter v1 |
| AUTH-03 (wrap 284 routes) is one giant task | Already sub-batched a–f in the master plan; treat each batch as independently verifiable |
| Mobile chasing a moving web API | Mobile vertical sequenced last, after web contracts stabilise |
| 35 failing PCTT tests pre-exist | Tracked as TASK-TRD-W7-00 (Wave 8); not silenced |
| Legacy 125 tasks' true status unknown | M2 gate mandates `/deep-verify` re-verification, not assumption |
| Doc drift — root `CLAUDE.md` §9 still shows stale VERSION-013 numbers | Phase 0 re-baseline (TASK-PRE-01) refreshes the SSOT and CLAUDE.md |

**Open items for the implementation plan:**

- Confirm whether the closed beta charges the cohort or comps them (affects how hard Payments
  must be verified before M1 vs. before M2).
- Decide whether Notifications/Admin minimal hardening is a standalone mini-vertical or folded
  into the foundation block's tail.
- Per-vertical agent-hour estimates (produced by writing-plans).

---

## Appendix A — Verified route inventory (2026-05-15, `feat/asset-system-regen`)

294 API `route.ts` files. By domain (descending): financial 75, investments 28, trading 26,
ai 23, credit-repair 13, marketplace 12, admin 11, disputes 9, gamification 7, notifications 6,
credit-bureau 6, credit-monitoring 5, credit-builder 5, auth 5, analytics 5, payment 4, monitoring
4, cron 4, chat 4, tax 3, student-loans 3, federal 3, documents 3, credits 3, addons 3; remaining
domains 1–2 each. Mobile: `mobile-app/` present, ~257 routes.

## Appendix B — CRITICAL findings → vertical map

- Foundation (Phase 1): FND-001–006 (auth) + unauth half of FND-041–044, FND-049–053
- Payments: FND-014, 015, 016, 017, 018
- Investments: FND-030, 031, 032
- Mobile: FND-064, 065, 066, 067, 068
- Compliance track: FND-056, 057, 058
- Credit, Financial, Ancillary: 0 CRITICALs (verify/HIGH-only)
- Deferred (Wave 8): Commerce/payout FND-024, 025, 026; trading review CRITICALs
