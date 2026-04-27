# Package Status

## Version

- `package_version: 2.5.0-rc1`
- `maturity: pre_production`
- `source: upstream fix pack (strativion_fix_pack/PRINCIPAL-REVIEW.md) absorbed`

## Status

Release candidate after absorbing the upstream Perplexity fix pack. All P0 and P1 findings from `strativion_fix_pack/PRINCIPAL-REVIEW.md` are closed. Canonical layer now carries the fix pack's richer policy surface (compliance, order lifecycle, incidents, DR, promotion, calendar, tenancy) plus this package's invariants file.

## What the fix pack brought in

Policy files adopted wholesale from the fix pack:

- `policy.compliance.yaml` — C-01..C-11, jurisdiction US declared, PDT + 15c3-5 + Reg SHO + MWCB + LULD + auction states + options/futures/crypto lifecycle + corporate actions + restricted list.
- `policy.order-lifecycle.yaml` — E-06..E-09, full state machine with FIX OrdStatus mapping, idempotency, cancel/replace semantics, partial-fill rules, reconciliation, race-condition handling.
- `policy.execution-errors.yaml` — E-10..E-12, FIX reject codes + session reject reasons + broker session circuit breaker + clock-skew with exchange-heartbeat comparison + retry policy + dead letter.
- `policy.incidents.yaml` — I-01..I-06, 57 enumerated incident codes across DATA/COMPLIANCE/EXECUTION/RISK/OPS/SEC/TENANCY/CALENDAR, SEV1-4 severity map, action map (PAUSE_SYMBOL/PAUSE_STRATEGY/PAUSE_TENANT/PAUSE_PLATFORM/FREEZE_AND_ALERT/ALERT_ONLY/DEGRADE_TO_PAPER/DEMOTE_PROMOTION_STAGE), autonomous_supervisory_signal class (SIG_*), escalation rosters, alert sinks, deduplication.
- `policy.dr.yaml` — DR-01..DR-06, RTO/RPO per component, degraded defaults, 4-level kill switch (LEVEL_1 pause_new, LEVEL_2 cancel_working, LEVEL_3 freeze, LEVEL_4 flatten — never auto), ambiguous_state locked to FREEZE_AND_ALERT, explicit flatten-to-cash procedure with closed-list triggers and explicitly-excluded triggers, backup venues, 6 chaos drills, postmortem SLA.
- `policy.tenancy.yaml` — T-01..T-05, 5-tenant reference registry, platform_ceiling, platform_venue_allowlist, tenant budget reconciliation, data retention per jurisdiction (US 7y, EU/UK/MAS 5y), billing model, tenant lifecycle transitions, cross-tenant invariants.
- `policy.promotion.yaml` — M-02..M-06, stage DAG (research → replay → shadow → paper → supervised_live → autonomous_live), promotion gates, demotion triggers, min dwell, shadow traffic mix.
- `policy.calendar.yaml` — K-01..K-09, Tier-1 macro blackouts, earnings, dividends, quad-witching, OPEX, market hours, holidays, halt wake rules.
- `policy.data-quality.yaml` — D-01..D-09, per-instrument-class staleness (ms), cross-venue disagreement, NBBO, bad-print filters, tick-size enforcement, gap-sigma.

Workflows adopted:

- `workflow.crisis.yaml` — state_untrusted routes to FREEZE_AND_ALERT only; flatten prohibited for that trigger; all numerics referenced from canonical owners.
- `workflow.confluence.yaml` — pre-trade admission pipeline (data_quality → compliance → risk → sizing → order_construction → idempotency → emit → lifecycle_handoff), zero numeric literals, every guard is a canonical field reference.
- `workflow.order-lifecycle.yaml` — state machine operational workflow, all guards by reference.

Governance adopted:

- `governance/CANONICAL-FIELD-INDEX.md` — R-01..R-15, S-01..S-07, E-01..E-12, C-01..C-11, D-01..D-09, K-01..K-09, M-01..M-06, I-01..I-06, DR-01..DR-06, T-01..T-05 control IDs; override rights (🔒 locked, ⬇ narrow-only, ↔ bidirectional, ⛔ dual-control).
- `governance/VERSIONING.md` — SemVer + BRK-* taxonomy + MANIFEST.json hash binding.
- `governance/OVERRIDE-SCHEMA.md` — 5-layer precedence, narrow-only, hard rejection on widening.

Schemas adopted (14 JSON Schema 2020-12):

- `policy.runtime.v2`, `policy.sizing.v1`, `policy.execution.v1`, `policy.execution-errors.v1`, `policy.data-quality.v2`, `policy.order-lifecycle.v1`, `policy.compliance.v1`, `policy.calendar.v1`, `policy.promotion.v1`, `policy.incidents.v1`, `policy.tenancy.v1`, `policy.dr.v1`, `tenant-override.v1`, `audit-entry.v1`.

## What this package kept from 2.3.0

Complements the fix pack doesn't have:

- `policy.invariants.yaml` — 15 enumerated system invariants (I-01..I-15) with enforcement cadence (boot / per-decision / continuous).
- `policy.correlations.yaml` — R-14/R-15 (cluster_threshold, crisis_override_rho, cluster_definition) — called out in the field index but not shipped as a separate file by the fix pack; added here.
- `policy.modes.yaml` — mode capability tables and transition rules (fix pack's promotion owns stage DAG; modes owns capabilities).
- `policy.regimes.yaml` — ADX/VIX/ATR-ratio classification thresholds with references to runtime for risk/heat ceilings.
- Strategy-agnostic `contexts/agent-contexts/`.
- `reference/` split with `reference/knowledge/` holding narrative law content.
- `implementations/pctt/contexts/` strategy-specific extensions.
- Reference Python validator at `tooling/validate/validate_package.py`.

## What changed structurally in 2.5.0-rc1

- `policy.runtime.yaml` restructured to own R-01..R-13 + M-01 at the field paths the fix pack expects: `risk.per_trade`, `risk.cluster`, `risk.portfolio.heat_{normal,shock,crisis}_max_pct`, `risk.kill_switch.{daily_loss_pct,weekly_loss_pct,drawdown_pct}`, `risk.margin.{utilization_max_pct,leverage_max}`, `mode.active`.
- `policy.risk.yaml` removed (subsumed by the restructured runtime).
- `policy.portfolio.yaml` no longer restates heat ceilings; keeps concentration_limits, regime_budgets, portfolio_admission, rebalance_and_review.
- `policy.sizing.yaml` rewritten to own S-01..S-07.
- `policy.execution.yaml` rewritten to own E-01..E-05 plus session structure.
- All canonical meta blocks aligned to the fix pack convention (`document_role: policy | workflow`, `schema_version`, `file_version`, `canonical_package_version`).
- Root `CLAUDE.md` kept as numerics-free orientation; PCTT-specific CLAUDE at `implementations/pctt/CLAUDE.md`.
- Validator updated to cover meta-format, unit, timezone, field-index (with carve-outs for TODO/deprecated), workflow-no-numeric-literals, migration-targets, JSON schemas (runtime + laws) with known-drift deferrals for files where fix-pack schemas and YAMLs diverge on internal shape.

## Known schema drift (tracked for 2.6.0)

The fix pack shipped v1 schemas that don't match the richer YAML shapes for several files. Binding is deferred for:

- `policy.sizing.v1.schema.json`
- `policy.execution.v1.schema.json`
- `policy.execution-errors.v1.schema.json`
- `policy.data-quality.v2.schema.json`
- `policy.order-lifecycle.v1.schema.json`
- `policy.incidents.v1.schema.json`
- `policy.tenancy.v1.schema.json`
- `policy.dr.v1.schema.json`
- `policy.calendar.v1.schema.json`
- `policy.promotion.v1.schema.json`
- `policy.compliance.v1.schema.json`

Critical invariants (decimal-fraction `_pct`, IANA timezone, meta block presence, reference isolation, migration-target integrity) are enforced by the Python validator regardless of schema binding status. Schema reconciliation is scheduled for package version 2.6.0.

## Intended Consumer

- Trading agents.
- Backend policy services.
- Risk and execution engines.
- Research systems.
- SaaS multi-tenant platforms.

## Contract Rule

Anything in `canonical/` is fit for machine consumption. Everything else is reference or illustrative.
