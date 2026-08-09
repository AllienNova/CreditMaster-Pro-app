# Web ↔ Mobile Parity Closure Plan — target ≥98% functional parity

> Executable roadmap for the full parity push (approved 2026-07-24). Baseline: structural 88.6%,
> functional ≈64% (`docs/qa/parity-audit.md`). This is a MULTI-SESSION program — drive it wave by
> wave, re-measuring parity after each. One workflow "done" only when it renders REAL data on BOTH
> platforms, with tests, and both apps' gates (tsc/lint/tests) stay green.

## Metric & gate (per workflow, every wave)
- A workflow counts toward parity only when: web + mobile both call a real API/service (no
  `setTimeout`/hardcoded/`Math.random`), each with a real-data render test, and no gate regresses.
- After each wave: re-run the parity audit method (grep mock markers per route) and record the new
  functional-parity %. No wave closes until its workflows are REAL on both sides.
- Shared discipline (from Wave 7): no `any`/@ts-ignore, no test-skips, negative/real-data tests,
  auth on every mutating route (audit:auth stays 295/295 as new routes land).

## Wave sequence (highest parity-movement first)

### Wave P1 — Shared mock-debt (Direction D)  *(biggest number-mover)*
Both platforms render mock here, so fixing each shared API/backend fixes BOTH at once.
- Admin analytics (FND-049 `Math.random` → real DB), Marketplace, Insights, Budgeting,
  Notifications, Documents, Savings, Dashboard analytics.
- Per item: build/confirm the real API route (authed) → wire web page → wire mobile screen → tests.

### Wave P2 — Mobile stubs of web-real features (Direction B)
- **Credit Repair** stack (disputes/inquiries/cards/goodwill/negotiate/payments/building) — mobile
  is 8 hardcoded screens; web is API-backed. Highest single-feature gap. Wire mobile → existing web APIs.
- **Billing/Subscriptions** — mobile is fake-loading; wire to real billing (mobile uses IAP/RevenueCat,
  NOT web card-checkout — design the mobile purchase path accordingly).

### Wave P3 — Web-only features → port to mobile (Direction A)
- Real Estate tracking, Crypto holdings (as an asset class), shared/collaborative Goals,
  Marketplace sub-cats (auto-insurance, auto-loans, loans).

### Wave P4 — Web laggards (Direction C)  *(web behind mobile)*
- **Trading** — web is fully stubbed (paper/backtest/strategies 0-API); mobile has real store-backed
  paper + agents/positions/orders/risk. Bring web up to the mobile-real bar (or formally accept mobile-lead).
- **Watchlist** — web mock → real (mobile already real).

## Execution model
- One wave per focused session (or orchestrated subagents in a fresh session), seeded by this plan
  + `docs/qa/parity-audit.md`. Re-measure + commit per workflow. PR #3 (or follow-on PRs) carries it.
- Mobile-only extras (Global Search, Activity Feed, Device Handoff) are net-positive — no web action
  required unless web should match.

## Status
- [x] **P0 prerequisite — mobile `tsc` green** (verified exit 0 on-disk + committed at HEAD, 2026-07-24). Fixed by a concurrent `fix-mobile-types` peer session; audited honest (no `any`/`@ts-ignore`/test-skips).
- [ ] P1 Shared mock-debt — file-level spec ready in `parity-wave-p1-worklist.md`
- [ ] P2 Mobile stubs (Credit Repair, Billing)
- [ ] P3 Web-only → mobile ports
- [ ] P4 Web laggards (Trading, Watchlist)

## ⚠ Execution hazard — concurrent writers on this worktree
Multiple CC sessions committed to `remediation/wave-7-foundation` in the same worktree during
the 2026-07-24 session, and `fix-residuals` observed its uncommitted work silently reverted once
(transient working-tree reset between agent snapshots). **Run the P1–P4 build as a single-driver,
focused effort — ideally in an isolated git worktree, or with no other sessions writing this branch.**
Commit each workflow immediately after it verifies (don't leave wiring as long-lived uncommitted
state) so a stray reset can't drop it. Verify on-disk (`tsc`/tests), never trust a snapshot.
