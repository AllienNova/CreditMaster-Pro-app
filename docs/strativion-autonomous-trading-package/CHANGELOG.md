# Changelog

All notable changes to the Strativion Autonomous Trading Package are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: `governance/VERSIONING.md` (SemVer 2.0.0 + `BRK-*` taxonomy for MAJOR releases).

---

## [2.5.0-rc1] — 2026-04-22

Release candidate. Absorbed the upstream unified principal-review fix pack and closed every P0 / P1 from that review.

### Added

- `canonical/policy/policy.compliance.yaml` — 11 controls (C-01..C-11). PDT, SEC 15c3-5, Reg SHO/SSR, MWCB, LULD, auction states, options exercise/assignment, futures rollover, crypto venue allowlist, corporate actions, restricted-list lookup. Jurisdiction `US`.
- `canonical/policy/policy.order-lifecycle.yaml` — 4 controls (E-06..E-09). Full FIX-aligned state machine, idempotency, cancel/replace, partial-fill, reconciliation, race-condition handling.
- `canonical/policy/policy.execution-errors.yaml` — 3 controls (E-10..E-12). FIX reject codes + session reject reasons, broker circuit breaker, clock-skew source priority, retry policy, dead-letter.
- `canonical/policy/policy.incidents.yaml` — 6 controls (I-01..I-06). 57 enumerated incident codes, SEV1–SEV4, action map (PAUSE_SYMBOL / PAUSE_STRATEGY / PAUSE_TENANT / PAUSE_PLATFORM / FREEZE_AND_ALERT / ALERT_ONLY / DEGRADE_TO_PAPER / DEMOTE_PROMOTION_STAGE / CANCEL_WORKING_ORDERS), autonomous supervisory signals (SIG_*), escalation rosters, sinks, deduplication.
- `canonical/policy/policy.dr.yaml` — 6 controls (DR-01..DR-06). RTO/RPO per component, degraded defaults, 4-level kill switch (LEVEL_1 pause_new / LEVEL_2 cancel_working / LEVEL_3 freeze / LEVEL_4 flatten, never auto), `ambiguous_state.action = FREEZE_AND_ALERT` schema-locked, explicit flatten-to-cash procedure with closed-list triggers, backup venues per instrument class, 6 chaos drills, postmortem SLA.
- `canonical/policy/policy.tenancy.yaml` — 5 controls (T-01..T-05). Multi-tenant registry, `platform_ceiling`, `platform_venue_allowlist`, tenant budget reconciliation, data retention per jurisdiction, billing model, tenant lifecycle transitions, cross-tenant invariants.
- `canonical/policy/policy.promotion.yaml` — 5 controls (M-02..M-06). Stage DAG, numeric promotion gates, demotion triggers, minimum dwell, shadow traffic mix.
- `canonical/policy/policy.calendar.yaml` — 9 controls (K-01..K-09). Tier-1 macro blackouts, earnings, dividends, quad-witching, OPEX, market hours, holidays, halt wake rules.
- `canonical/policy/policy.data-quality.yaml` — 9 controls (D-01..D-09). Per-instrument-class staleness ms, cross-venue disagreement, NBBO, bad-print filter, tick-size, gap-sigma.
- `canonical/policy/policy.correlations.yaml` — R-14 / R-15. Cluster threshold, crisis-regime correlation floor, cluster definition method.
- `canonical/policy/policy.invariants.yaml` — 15 system invariants (I-01..I-15) with runtime-check cadence (boot / per-decision / continuous).
- `canonical/workflows/workflow.crisis.yaml` — `state_untrusted` routed exclusively to `FREEZE_AND_ALERT`. Flatten prohibited for that trigger. Zero numeric literals.
- `canonical/workflows/workflow.confluence.yaml` — Pre-trade admission pipeline: data_quality → compliance → risk → sizing → order_construction → idempotency → emit → lifecycle_handoff.
- `canonical/workflows/workflow.order-lifecycle.yaml` — State-machine operational workflow, all guards by reference.
- `canonical/schemas/` — 15 JSON Schema 2020-12 files, including `audit-entry.v1.schema.json` and `tenant-override.v1.schema.json`.
- `governance/CANONICAL-FIELD-INDEX.md` — Control-ID grid with override rights (🔒 locked, ⬇ narrow-only, ↔ bidirectional, ⛔ dual-control).
- `governance/VERSIONING.md` — SemVer + `BRK-*` breaking-change taxonomy + `canonical/MANIFEST.json` hash-binding protocol.
- `governance/OVERRIDE-SCHEMA.md` — 5-layer override precedence, narrow-only, hard rejection on widening.
- `canonical/MANIFEST.json` — Deterministic package hash and per-file sha256 manifest.
- `tooling/manifest/generate_manifest.py` — Reference tool that recomputes `canonical/MANIFEST.json`.
- `tooling/validate/validate_override.py` — Reference tenant-override validator.
- `tooling/audit/audit_writer.py` — Reference audit-entry writer conforming to `audit-entry.v1.schema.json`.
- `tooling/pyproject.toml` — Installable Python distribution for the tooling layer.
- `ENTERPRISE-QUICKSTART.md` — 30-minute vendor integration guide.
- `LICENSE`, `NOTICE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SUPPORT.md`.
- `.github/workflows/validate.yml` — CI that runs the validator on every commit.

### Changed

- `canonical/policy/policy.runtime.yaml` restructured to own R-01..R-13 + M-01 at the field paths the fix-pack workflows expect: `risk.{per_trade,cluster,portfolio,kill_switch,margin}` + `mode.active`.
- `canonical/policy/policy.portfolio.yaml` no longer restates heat ceilings; focuses on concentration + regime budgets + admission.
- `canonical/policy/policy.sizing.yaml` rewritten to own S-01..S-07.
- `canonical/policy/policy.execution.yaml` rewritten to own E-01..E-05 plus session structure.
- All canonical meta blocks aligned: `document_role: policy | workflow`, `schema_version`, `file_version`, `canonical_package_version`.
- Root `CLAUDE.md` reduced to a numerics-free orientation file; PCTT-specific CLAUDE at `implementations/pctt/CLAUDE.md`.
- Validator now enforces 8 rules: meta-block presence, decimal-fraction units, IANA timezone (or UTC for cron contexts), field-index integrity (TODO/deprecated-aware), reference-isolation, migration-target integrity, workflow-no-numeric-literals, JSON schema conformance for bound files.

### Removed

- `canonical/policy/policy.risk.yaml` — subsumed by the restructured `policy.runtime.yaml`.
- `canonical/schemas/_shared.schema.json` — fix-pack schemas are self-contained.
- Legacy schemas (`policy.runtime.schema.json`, `policy.modes.schema.json`, `policy.risk.schema.json`, `policy.incidents.schema.json`, `policy.compliance.schema.json`, `policy.order-lifecycle.schema.json`, `policy.invariants.schema.json`) — superseded by v1/v2.

### Fixed

- `governance/MIGRATION-MAP.md` — double-path bugs (`contexts/contexts/knowledge/` and siblings) corrected.
- `CLAUDE.md` — ghost-directory claims removed; previously documented non-existent paths.
- Percent-float drift in workflow files (every `_pct` is now a decimal fraction in `[0, 1]`).
- Numeric-threshold drift in agent context files (stripped; every threshold is now a canonical field reference).

### Security

- `policy.dr.yaml#ambiguous_state.action` is schema-locked to `FREEZE_AND_ALERT`. Autonomous flatten on untrusted state is prohibited across all modes.
- `policy.dr.yaml#kill_switch.authority` requires HSM/KMS key storage and dual-control for every invocation.
- `governance/OVERRIDE-SCHEMA.md` mandates tightening-only merge; widening overrides produce `INC_TENANT_OVERRIDE_INVALID` and refuse to load.

---

## [2.3.0-rc1] — 2026-04-22 (superseded)

Second-cycle normalization sprint. All P0s from the external unified review closed. Schemas introduced, invariants enumerated, contexts stripped of numerics, reference/ isolated.

Superseded by 2.5.0-rc1 after absorbing the upstream fix pack.

## [2.2.0] — 2026-04-22 (superseded)

First-cycle normalization sprint. Removed `policy.risk.yaml`/`policy.system.yaml`/`policy.seasonality.yaml` from canonical; demoted textbook workflows to reference; added compliance, order-lifecycle, governance files; built out `governance/` with OVERRIDE-SCHEMA, VERSIONING, CANONICAL-FIELD-INDEX, UNITS.

## [2.1.0] — 2026-04-21 (original)

Initial external-delivery packaging of the 30 Laws textbook as an autonomous-trading policy substrate. Found to have multiple P0 defects by the unified principal review and superseded by 2.2.0.

---

## Versioning Rules

See `governance/VERSIONING.md` for the authoritative rules. Summary:

- **PATCH** — docs/tooling/reference only.
- **MINOR** — new optional field, new canonical file, tightening of a threshold, new workflow entries.
- **MAJOR** — rename/removal of a canonical field, unit-convention change, precedence change, **loosening** of a risk/compliance/safety threshold, mode-semantics change.

Every MAJOR release must classify each breaking change under a `BRK-*` code in this CHANGELOG.
