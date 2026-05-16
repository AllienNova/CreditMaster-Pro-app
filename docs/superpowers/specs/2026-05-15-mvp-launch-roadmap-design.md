# Fynvita MVP Launch Roadmap — Design Spec

> Status: APPROVED design (sections 1–5 + ancillary scope approved by Honour, 2026-05-15).
> Revised 2026-05-16 after adversarial spec review — see Revision Note at end.
> Source of truth: `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md`, `docs/ssot/gap_analysis.md`, `docs/ssot/SSOT.md`, `docs/ssot/health_metrics.md`
> Next step: convert to an executable implementation plan via the writing-plans skill.

---

## 1. Problem statement

Fynvita is a large financial platform (294 API routes, 204 pages, 344 components, plus a
~257-route Expo mobile app — per `health_metrics.md` VERSION-014; root `CLAUDE.md` still shows
stale VERSION-013 figures, see §8). A 9-domain code review opened **33 CRITICAL + 38 HIGH**
findings; **all 9 domains fail audit** and the project is **Ship: BLOCKED** behind Wave 7
(Security & Correctness Remediation — 59 tasks, 8 phases, currently 0% started).

"Polish and verify every workflow, then ship" — taken literally across ~15 workflows — is a
multi-month effort with no intermediate launch. This roadmap defines a **bounded MVP**, sequences
the remediation behind it, and produces two shippable milestones, **without discarding any of the
deferred work**.

This is a design spec, not an implementation plan. It establishes scope, sequence, and gates. The
executable task plan is produced separately by the writing-plans skill.

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
| 5 | Mobile app | `mobile-app/` (~257 routes) | Web + mobile launch together |
| 6 | Ancillary (verify-pass) | `tax` 3, `student-loans` 3, `federal` 3, `federal-programs` 1, `gamification` 7 | Built, no CRITICALs — light verify pass |

Cross-cutting/supporting: AI infrastructure (`ai` 23, `chat` 4, `ml` 2, `voice` 1 — Compliance
track); `notifications` 6, `admin` 11, `analytics` 5 (Notifications+Admin hardening track);
platform infra (`cron` 4, `monitoring` 4, `health`, `email`, `ws`, `performance`, `test-db`,
`automation` 2, `strategies` 1 ≈ 16 routes).

**Route reconciliation:** in-scope verticals 184 + AI infra 30 + Notifications/Admin 22 + deferred
42 (below) + platform infra ≈ 16 = **294**. ✔

### Deferred to post-MVP (Wave 8) — workflow surface only; see §4 and §5-Track-M

| Workflow surface | Routes | Deferral note |
|------------------|--------|---------------|
| Trading (PCTT) | `trading` 26 | Highest-risk subsystem; autonomous mode. **PCTT code correctness is NOT deferred — see §6 (PCTT test suite is an M1 blocker).** |
| Commerce / marketplace | `marketplace` 12, `servicers` 2 | User-facing marketplace UI deferred. |
| Affiliate | `affiliate` 2 | UI deferred. **Affiliate/payout money code is NOT deferred — see §5 Track M.** |
| White-label / global connector | platform layer | Wave 5 platform-scale work, gated on user base. |

**Critical nuance:** deferring the Commerce/affiliate/trading *user-facing workflow* does **not**
defer the money-correctness and code-correctness CRITICALs that live in those domains. FND-024/
025/026/027 (payout, revenue, idempotency, referral) are in the mandatory 33 CRITICALs and are
fixed pre-M1 by the Money Correctness track (§5 Track M). The trading code must keep its tests
green for M1 even though the trading UI is flag-gated off.

### Launch model — two milestones

**M1 — Closed Beta.** Limited real-user cohort. Real PII + real money, so it carries the **full
CRITICAL and compliance bar** — a beta is not a soft launch.

**M2 — Public Launch.** Adds HIGH-finding closure, legacy task re-verification, mobile coverage
depth, scale/observability, production security remediation.

Gate criteria in §6.

---

## 3. Approach: workflow vertical slices

Three sequencing approaches were considered:

- **A — Wave-7-native (strict phase order).** Rejected: phases group by *fix type*, so no workflow
  is verified-and-done until the very end — nothing demoable or beta-testable incrementally.
- **B — Workflow vertical slices.** *(Selected.)* A mandatory foundation block, then each MVP
  workflow driven to "done" in risk order — CRITICALs/HIGHs closed, mocks stripped, polished,
  E2E-verified — before the next starts. Mandatory cross-cutting tracks (Money, Compliance,
  Notifications/Admin hardening) run in parallel.
- **C — Two-track parallel.** Rejected: polishing a workflow before its CRITICALs are fixed means
  re-touching the same code twice; "done" is undefinable mid-flight.

**Approach B selected** — the only one where "verify every workflow" is structurally true: each
workflow reaches a verified, demoable state independently. Wave 7's phase structure is preserved
as the *task source*; execution is re-sequenced onto workflow verticals + cross-cutting tracks.

---

## 4. Deferral discipline — deferred ≠ deleted ≠ degraded

Trading (the full PCTT 7-stage pipeline, 7 AI agents, 30-law compliance engine, paper trading,
multi-broker routing, backtesting, journal), Commerce/affiliate, and white-label represent a year
of real work. They are **complete subsystems on a later runway**, not cut scope.

1. **All deferred code stays in the repository.** No `git rm` of a workflow. Nothing removed to
   "simplify."
2. **Deferred code stays compiling.** `next build` compiles the entire project including
   flag-gated routes. Shared-surface Wave 7 changes — TASK-AUTH-03 (wraps trading routes in
   `withAuth`), TASK-AUTH-12 (single role-type source), TASK-MNY-06 (`Money` branded type) — will
   break deferred trading/commerce code unless it is updated too. **This is owned work, not a
   hope:** a standing obligation **TASK-DEFER-COMPILE** (to be created by the implementation plan)
   runs `tsc --noEmit` after each shared-surface task and fixes deferred-code compile errors. It
   appears in the gate of every phase that touches shared surface. See risk D1 (§8).
3. **Feature-flag gating, not deletion.** Phase 0 (TASK-PRE-03/04) provides the flag system.
   Deferred workflows are flag-gated **off** in beta/public v1 builds — routes and UI not
   user-reachable — but code, types, and tests remain intact behind the flag.
4. **Deferred tests are tracked, not silenced.** Never `.skip`'d to make a gate green; the Test
   Integrity Rule holds repo-wide. Note: the 35 failing PCTT tests are **not** a deferral case —
   per `health_metrics.md` they block ship and must be green for M1 (§6, risk D2).
5. **Wave 8 owns the deferred *workflow surface*.** Trading UI/autonomous mode, Commerce/affiliate
   UI, white-label — brought to launch quality post-M2 with the same vertical-slice rigor.

### What "polish and verify a workflow" means — and does not

- **Means:** every sub-feature is exercised, hardened, E2E-verified. If Credit has dispute
  generation, templates, strategies, bureau submission, quick-wins, goodwill letters, **all six**
  are verified.
- **Does not mean** removing functionality. The only code *removed* during Wave 7 is proven
  fake/mock data in production paths — fake Visa 4242, `Math.random()` analytics, the `setTimeout`
  mock dispute screen — each **replaced with a real implementation**, never just deleted.
- **Verification is evidence-based:** build, types, lint, tests, the changed-code coverage gate,
  a real E2E run. No "should work."

### Meticulousness mechanism

The **first task of every vertical** enumerates that workflow's complete sub-feature checklist
from the codebase (every route, page, component, service). A vertical is "done" only when every
item is checked off with verification evidence.

---

## 5. Roadmap structure

### Stage 0 — Foundation block (serial, blocks everything)

- **Phase 0 — Prereqs** (TASK-PRE-01..07): honest re-baseline (also reconciles the SSOT
  CRITICAL-count off-by-one, §6), branch/freeze policy, feature flags, lint-guard escalation,
  branch hygiene, security re-review of the 92 prior commits.
- **Phase 1 — Auth/RBAC rebuild** (TASK-AUTH-01..12, incl. AUTH-03 sub-batches a–f and
  **TASK-AUTH-04-staging** — 24h synthetic monitoring on all webhooks/signup/login/OAuth before
  deny-by-default flips to prod; this safeguard must not be dropped).

Phase 1 closes **13 CRITICALs**: FND-001–006 (auth) + FND-041–044 (notifications, via AUTH-03b) +
FND-049/050/051 (admin, via AUTH-03a). It does **not** close FND-052/053 (admin analytics mocks —
those are Phase 4) or FND-068 (mobile dispute mock — Phase 4).

### Verticals (risk-ordered; Credit/Ancillary verify-passes may overlap a neighbour)

| # | Vertical | Wave 7 tasks | CRITICALs closed | HIGHs / mocks |
|---|----------|--------------|------------------|---------------|
| 1 | **Payments** | Phase 2 TASK-WBH-01..07; TASK-MOK-02 (billing fake-card) | FND-014, 015, 016, 017, 018 | FND-019–021 (checkout fields) |
| 2 | **Investments** | TASK-INV-W7-01/02; TASK-IDR-02 | FND-030 (IDR-02), 031, 032 (INV-W7) | FND-034 (IDR-02); **FND-035** — orphan, see below |
| 3 | **Financial mgmt** | TASK-IDR-03; TASK-MOK-03 (debt API) | none | FND-036–038 (IDR-03 Plaid IDOR); **FND-039, 040** — orphans, see below |
| 4 | **Credit** (+ documents) | verify-pass + IDOR sweep | none (already remediated) | verify-and-polish |
| 5 | **Mobile** | Phase 6 TASK-MOB-W7-01..07; TASK-MOK-05 (dispute screen) | FND-064 (MOB-W7-06), 068 (MOK-05) | FND-065/066/067/069/070/071 |
| 6 | **Ancillary** (Tax, Student loans/federal, Gamification) | verify-pass | none | light verify-and-polish |

**Risk order rationale:** Payments first — highest *business* risk + Phase 2 internal ordering.
Investments second — highest *correctness/reputational* risk. Financial third — moderate. Credit
fourth — already remediated, a verify pass. Mobile fifth — depends on stable web API contracts.
Ancillary sixth — light verify pass.

### Cross-cutting tracks (parallel to verticals; all mandatory for M1)

- **Track M — Money Correctness** (Phase 3: TASK-MNY-01..07). Closes **FND-024, 025, 026, 027**
  (payout cents conversion, revenue-events table, transfer idempotency, atomic referral RPC +
  self-referral guard) and adds the preventive `Money` branded type (MNY-06). HIGH FND-028
  (MNY-07, commission recalculation). This track exists because these CRITICALs live in the
  deferred Commerce/affiliate domains but are in the mandatory 33 — the *money code* is fixed
  pre-M1 even though the marketplace/affiliate *UI* ships in Wave 8.
- **Track C — Compliance & AI hygiene** (Phase 5: TASK-CMP-01..05; plus TASK-MOK-04 AI-insight
  route wiring). Closes CRITICALs **FND-056, 057, 058** (breach notification, consent DB
  persistence, GDPR cascade-table expansion) and HIGHs **FND-059, 060, 061** (CMP-04 — ModelRouter
  enforcement, voice-TTS auth + model whitelist) and **FND-062, 063** (CMP-05 — PII redaction,
  prompt-injection guards). **Must complete before M1.**
- **Track N — Notifications & Admin hardening** (Phase 4: TASK-MOK-01; Phase 7: TASK-IDR-04,
  TASK-IDR-05). Closes CRITICALs **FND-052, 053** (MOK-01 — replace `Math.random()` analytics +
  hardcoded fallbacks with real DB queries) and HIGHs FND-046 (IDR-04, notification IDOR),
  FND-054 (IDR-05, admin/disputes PATCH whitelist). Phase 1 already closed the unauthenticated-
  access holes. Also owns **FND-045** (stored XSS in transactional email templates) — an orphan,
  see below.

### Phase 4 / Phase 7 decomposition (these phases are split across verticals/tracks)

| Task | Owner | Note |
|------|-------|------|
| TASK-MOK-01 | Track N | FND-052/053 (CRITICAL) |
| TASK-MOK-02 | Vertical 1 Payments | billing fake-card; depends WBH-03 |
| TASK-MOK-03 | Vertical 3 Financial | debt API real CRUD |
| TASK-MOK-04 | Track C | AI-insight route wiring (5 routes) |
| TASK-MOK-05 | Vertical 5 Mobile | FND-068 (CRITICAL) |
| TASK-MOK-06 | **Post-Mobile wrap-up** | lint escalation; **depends on MOK-01..05** — cannot complete until the Mobile vertical is done. Not part of any single vertical's gate. |
| TASK-IDR-01 | Foundation tail / Track N start | IDOR audit script (gates IDR-02..05) |
| TASK-IDR-02 | Vertical 2 Investments | FND-030 (CRITICAL), FND-034 |
| TASK-IDR-03 | Vertical 3 Financial | FND-036/037/038 |
| TASK-IDR-04 | Track N | FND-046 |
| TASK-IDR-05 | Track N | FND-054 |

### Orphaned findings — no Wave 7 task exists yet

These review findings have **no owning Wave 7 task** — `gap_analysis.md`'s "Linked Task" column
points at stale *legacy* feature-task IDs (`TASK-INV-04`, `TASK-FIN-01/02`) that are not
remediation tasks. The implementation plan **must create new Wave 7 tasks** for them:

| Finding | Severity | Bug | Assigned vertical/track |
|---------|----------|-----|--------------------------|
| FND-035 | HIGH | Investments volatility math error | Vertical 2 Investments |
| FND-039 | HIGH | Financial date rollover (Jan-31 → Mar-1) | Vertical 3 Financial |
| FND-040 | HIGH | N+1 Plaid calls | Vertical 3 Financial |
| FND-045 | HIGH | Stored XSS in transactional email templates | Track N |
| (9 prod `npm audit` vulns) | — | nodemailer/next-auth, postcss, uuid→svix→resend | new task (M2 gate, §6) |

A vertical's gate (§6) cannot be satisfied while a finding assigned to it is open, so creating
these tasks is a prerequisite of the implementation plan, not optional.

### Post-MVP

- **M2 path** (§6): legacy re-verification, residual HIGH/MEDIUM sweep, mobile coverage depth,
  production security, scale/observability.
- **Wave 8**: Trading UI/autonomous mode, Commerce/affiliate UI, white-label.

---

## 6. Gates

### The CRITICAL list (authoritative)

The M1 gate is defined against the master plan's **explicit enumerated CRITICAL list**
(`MASTER-IMPLEMENTATION-PLAN.md`, Exit Criteria #1) — never a severity range:

> FND-001/002/003/004/005/006 · 014/015/016/017/018 · 024/025/026 · 027 · 030 · 031/032 ·
> 041/042/043/044 · 049/050/051 · 052/053 · 056/057/058 · 064 · 068

**This list enumerates 32 items, but the SSOT labels it "33 CRITICAL."** This off-by-one is a
known SSOT defect. **TASK-PRE-01 (re-baseline) must reconcile it** — either a 33rd finding was
dropped from the enumeration, or the count is wrong. The M1 gate is defined against *the
reconciled explicit list*, not the number. Every item above maps to an owning vertical/track in
§5; none is deferred.

### Per-vertical / per-track verification gate

A vertical or track is not "done" until **all** of these produce evidence:

- Build, type-check — clean (incl. deferred code still compiling, per §4.2)
- Lint — **no new errors** beyond the documented baseline (15 pre-existing errors are fixed in the
  Foundation block; "clean" means zero thereafter)
- Full test suite — 0 failures; no weakened or skipped tests (Test Integrity Rule)
- Changed-code coverage gate — `npm run test:coverage:changed` green at **85%**. This is the
  project's own line-level diff-coverage rule (`.claude/rules/04-coverage.md`, established
  2026-05-15), stricter than the SSOT global ≥80%; the 85% rule governs changed code.
- A real **E2E run** of the workflow (Playwright/Cypress) — not "should work"
- The **sub-feature checklist** for the workflow — every item checked off with evidence
- Every CRITICAL/HIGH assigned to the vertical/track — closed and verified

### M1 — Closed Beta gate

- Foundation block (Phase 0 + Phase 1) complete — deny-by-default, all routes authenticated;
  TASK-AUTH-04-staging 24h synthetic-monitoring soak green
- All 6 verticals + all 3 cross-cutting tracks (M, C, N) pass their gate
- **Every CRITICAL on the reconciled explicit list closed** (§6 above)
- **PCTT test suite green** — the 35 failing PCTT tests are an M1 blocker per `health_metrics.md`
  ("Ship: BLOCKED until Wave 7 closes AND the regressions are resolved"). The implementation plan
  must assign an owning Wave 7 task (the SSOT suggests folding into TASK-MNY-* or a new TRD-W7
  card — it is *undecided* in the SSOT and must be decided, not invented here)
- Build / type-check clean; lint at zero; changed-code coverage gate green
- Onboards a limited real-user cohort

### M2 — Public Launch gate

- All **HIGH** findings closed across MVP workflows — including the orphaned HIGHs FND-035/039/
  040/045 once their tasks exist (§5). HIGHs in deferred domains (Trading/Commerce review HIGHs)
  go to Wave 8.
- The **125 legacy Waves 0–6 tasks re-verified** — all currently `NEEDS_VERIFICATION`; the "100%
  done" claim was invalidated. Run `/deep-verify` against the master plan for an evidence-based
  per-task status, then close the real gaps.
- Mobile test coverage built beyond the Vertical-5 launch minimum
- Production `npm audit` clean — the 9 prod-affecting vulns remediated (new task, §5); full
  security re-audit
- Load testing, monitoring/alerting, performance polish
- Beta feedback fixes folded in

---

## 7. Execution model

PIDVA loop (pre-investigate → plan → do → verify → adapt), vertical by vertical, largely via
Claude Code agents. Foundation block first and serial. The six verticals run mostly serially in
§5 risk order; Credit (V4) and Ancillary (V6) verify-passes may overlap a neighbour. The three
cross-cutting tracks (M, C, N) run in parallel and must all land before M1.

---

## 8. Risks & open items

| ID | Risk | Mitigation |
|----|------|------------|
| D1 | Deferred trading/commerce code fails to compile after AUTH-03 / AUTH-12 / MNY-06 shared-surface changes → M1 build breaks, surfaces late | TASK-DEFER-COMPILE standing obligation (§4.2): `tsc --noEmit` + fix deferred code after every shared-surface task; in each affected phase's gate |
| D2 | PCTT 35 test failures block every vertical gate ("0 failures") | They are a real M1 blocker, not deferrable; implementation plan assigns an owning Wave 7 task. Not `.skip`'d |
| D3 | SSOT CRITICAL count off-by-one (32 enumerated vs "33") | TASK-PRE-01 reconciles; M1 gate defined against the reconciled explicit list |
| D4 | Orphaned HIGHs (FND-035/039/040/045) invisible — no task, gate only checks *assigned* findings | §5 assigns each to a vertical/track; implementation plan must create the tasks before those gates can pass |
| D5 | AUTH-03 (wrap 284 routes) is one giant task | Sub-batched a–f in the master plan; each batch independently verifiable |
| D6 | TASK-MOK-06 (lint escalation) depends on MOK-01..05 → gated on the Mobile vertical | Tracked as a post-Mobile wrap-up task, not inside any vertical's gate |
| D7 | Deny-by-default flips with a missed `PUBLIC_ROUTES.ts` entry (e.g. Stripe webhook) → silent breakage | TASK-AUTH-04-staging 24h soak is a hard M1 sub-gate; SEC sign-off on `PUBLIC_ROUTES.ts` |
| D8 | Root `CLAUDE.md` §9 shows stale VERSION-013 numbers | TASK-PRE-01 re-baseline refreshes CLAUDE.md + SSOT |

**Open items for the implementation plan:**

- Create Wave 7 tasks for the orphaned findings FND-035, FND-039, FND-040, FND-045, and the 9
  production `npm audit` vulnerabilities.
- Assign an owning Wave 7 task for the 35 PCTT test failures (SSOT leaves this undecided).
- Confirm whether the closed-beta cohort is charged or comped (affects how hard Payments must be
  verified before M1 vs M2).
- Per-vertical / per-track agent-hour estimates.

---

## Appendix A — Verified route inventory (2026-05-15, `feat/asset-system-regen`)

294 API `route.ts` files. By domain (descending): financial 75, investments 28, trading 26,
ai 23, credit-repair 13, marketplace 12, admin 11, disputes 9, gamification 7, notifications 6,
credit-bureau 6, credit-monitoring 5, credit-builder 5, auth 5, analytics 5, payment 4,
monitoring 4, cron 4, chat 4, tax 3, student-loans 3, federal 3, documents 3, credits 3,
addons 3; ~20 further domains 1–2 routes each. Mobile: `mobile-app/` present, ~257 routes.

## Appendix B — The 32 enumerated CRITICALs → owner map

| Findings | Count | Owner | Wave 7 tasks |
|----------|------:|-------|--------------|
| FND-001, 002, 003, 004, 005, 006 | 6 | Foundation (Phase 1) | AUTH-01..12 |
| FND-041, 042, 043, 044 | 4 | Foundation (AUTH-03b) | AUTH-03 |
| FND-049, 050, 051 | 3 | Foundation (AUTH-03a) | AUTH-03 |
| FND-014, 015, 016, 017, 018 | 5 | Vertical 1 Payments | WBH-01..07 |
| FND-031, 032 | 2 | Vertical 2 Investments | INV-W7-01/02 |
| FND-030 | 1 | Vertical 2 Investments | IDR-02 (Phase 7) |
| FND-064 | 1 | Vertical 5 Mobile | MOB-W7-06 |
| FND-068 | 1 | Vertical 5 Mobile | MOK-05 (Phase 4) |
| FND-024, 025, 026 | 3 | Track M Money | MNY-01/04/05 |
| FND-027 | 1 | Track M Money | MNY-02/03 |
| FND-052, 053 | 2 | Track N Notif/Admin | MOK-01 (Phase 4) |
| FND-056, 057, 058 | 3 | Track C Compliance | CMP-01/02/03 |
| **Total enumerated** | **32** | | (SSOT labels this "33" — see §6 / risk D3) |

## Appendix C — HIGH findings with owners (non-exhaustive; key ones)

FND-019/020/021 → V1 Payments · FND-034 → V2 (IDR-02) · FND-035 → V2 (orphan, new task) ·
FND-036/037/038 → V3 (IDR-03) · FND-039/040 → V3 (orphan, new task) · FND-028 → Track M (MNY-07) ·
FND-045 → Track N (orphan, new task) · FND-046 → Track N (IDR-04) · FND-054 → Track N (IDR-05) ·
FND-059/060/061 → Track C (CMP-04) · FND-062/063 → Track C (CMP-05) ·
FND-065/066/067/069/070/071 → V5 Mobile (MOB-W7-01..07).

---

## Revision Note (2026-05-16)

Revised after an adversarial spec review. Blocking fixes applied:
- **C1** — Appendix B replaced with the master plan's explicit enumerated list; the FND-052/053
  double-count removed (they are Phase 4, not Foundation); the SSOT 32-vs-33 off-by-one is now
  documented and assigned to TASK-PRE-01 (§6, D3).
- **C2** — FND-035/039/040 (and FND-045) identified as orphaned HIGHs with no Wave 7 task; the
  stale legacy task IDs in `gap_analysis.md` are called out; new-task creation is mandated (§5
  Orphaned findings, D4).
- **C3** — invented `TASK-TRD-W7-00` removed; the 35 PCTT failures are now correctly an M1
  blocker (not Wave 8); the owning-task decision is flagged as an SSOT-undecided open item.
- **C4** — deferred-code compile-safety is now an owned obligation (TASK-DEFER-COMPILE, §4.2, D1),
  not a principle without an owner.

Should-fix: foundation CRITICAL count corrected 15→13 (H1); route reconciliation added (H2);
Phase 4/7 decomposition map added (H3/H4); Track C HIGHs FND-059/060/061 listed (H5); FND-045
XSS placed in Track N (H6); M2 gate wording fixed for orphaned HIGHs (H7); 85% changed-code gate
explained as the project's own rule (H8). Money Correctness promoted to a named mandatory track
(Track M) because FND-024–027 are in the mandatory 33 despite Commerce being a deferred workflow.
