# Strativion Autonomous Trading Package

**Version:** `2.5.0-rc1`
**Maturity:** `pre_production` (licensable release candidate)
**License:** Proprietary — see [`LICENSE`](LICENSE). Commercial use requires written agreement.
**Status:** release candidate. Every P0 and P1 from the unified principal review is closed. 15 JSON schemas, hash-bound manifest, reference validator + override validator + audit writer ship in this release.

**Quickstart for vendor integrators:** [`ENTERPRISE-QUICKSTART.md`](ENTERPRISE-QUICKSTART.md) (30-minute path from clone to first admission-gated order).
**Security disclosure:** [`SECURITY.md`](SECURITY.md).
**Support & SLA:** [`SUPPORT.md`](SUPPORT.md).
**Change history:** [`CHANGELOG.md`](CHANGELOG.md).
**Contributing:** [`CONTRIBUTING.md`](CONTRIBUTING.md).
**Third-party attribution:** [`NOTICE`](NOTICE).

This package is the canonical policy, workflow, law, and context corpus that every Strativion trading app builds on. It is the authoritative source for:

- risk budgets, drawdown control, ruin control
- mode lifecycle and crisis behavior
- regime classification thresholds
- data-quality, compliance, and order-lifecycle gates
- instrument-aware trading constraints
- execution windows and degradation response
- research-to-live governance
- agent-facing reasoning context

One package. Many apps. Canonical thresholds live here — not in app code, not in env files, not in prompts.

---

## Table of Contents

1. [What this package is (and isn't)](#1-what-this-package-is-and-isnt)
2. [Who should read what](#2-who-should-read-what)
3. [Repository layout](#3-repository-layout)
4. [Core concepts](#4-core-concepts)
5. [The precedence model](#5-the-precedence-model)
6. [Units, timezones, and identifiers](#6-units-timezones-and-identifiers)
7. [How a backend consumes this package](#7-how-a-backend-consumes-this-package)
8. [The admission gate sequence](#8-the-admission-gate-sequence)
9. [How an agent system consumes this package](#9-how-an-agent-system-consumes-this-package)
10. [Adding a strategy](#10-adding-a-strategy)
11. [Adding tenant or app overrides](#11-adding-tenant-or-app-overrides)
12. [Mode lifecycle](#12-mode-lifecycle)
13. [Crisis and incident handling](#13-crisis-and-incident-handling)
14. [Promotion gates (research → autonomous_live)](#14-promotion-gates-research--autonomous_live)
15. [Versioning and hash binding](#15-versioning-and-hash-binding)
16. [Validation and CI](#16-validation-and-ci)
17. [Required negative tests](#17-required-negative-tests)
18. [Instrument and market coverage](#18-instrument-and-market-coverage)
19. [Multi-tenant / SaaS integration pattern](#19-multi-tenant--saas-integration-pattern)
20. [Common pitfalls](#20-common-pitfalls)
21. [Quick reference: "where do I find X?"](#21-quick-reference-where-do-i-find-x)
22. [Entry points](#22-entry-points)

---

## 1. What this package is (and isn't)

### It IS

- A **control plane**: policy, workflow, and law metadata that any autonomous trading service can load at boot.
- A **shared spine** across all Strativion trading apps (SaaS, operator terminals, research systems, risk engines, execution services, agent workflows).
- **Machine-first**: decimal fractions, IANA timezones, YAML schemas with `meta:` blocks, field-level authority via `governance/CANONICAL-FIELD-INDEX.md`.
- **Mode-aware**: the same policy file drives `autonomous_normal`, `autonomous_restricted`, `supervised_crisis`, and `manual_only`.
- **Instrument-aware**: equities, ETFs, crypto, options, futures — each with its own lifecycle rules.
- **Portfolio-first**: heat, concentration, correlation, regime budgets — not just per-trade risk.
- **Compliance-aware**: PDT, SEC 15c3-5, Reg SHO/SSR, MWCB, LULD, auctions, options assignment, futures roll, crypto venue health, stablecoin depeg.

### It is NOT

- A trading strategy. Strategies live in your app under `implementations/<your-strategy>/` or your own repo.
- A broker adapter. Broker semantics live in your app.
- A backtest engine. Backtests are your concern; the package defines governance around them.
- A UI framework. UIs consume the policy; they do not govern it.
- A configuration grab-bag. Every canonical field has exactly one authoritative location.

---

## 2. Who should read what

| You are building...                     | Start here                                                                                      |
|-----------------------------------------|-------------------------------------------------------------------------------------------------|
| A backend policy engine                 | §7 → §8 → `governance/CANONICAL-FIELD-INDEX.md` → all `canonical/policy/*.yaml`                 |
| A multi-agent / LLM trading system      | §9 → `contexts/agent-contexts/*.md` → plus canonical files those contexts reference             |
| A risk or admission service             | §8 → `policy.runtime.yaml` + `policy.risk.yaml` + `policy.portfolio.yaml` + `policy.compliance.yaml` |
| An execution service                    | `policy.execution.yaml` + `policy.order-lifecycle.yaml` + `policy.execution-quality.yaml`       |
| A research / promotion pipeline         | §14 → `workflow.lifecycle.yaml` + `policy.governance.yaml`                                      |
| A SaaS multi-tenant trading platform    | §19 → `governance/OVERRIDE-SCHEMA.md` + `governance/VERSIONING.md`                              |
| A new strategy inside an existing app   | §10 → `implementations/pctt/` as an example                                                     |
| A compliance-heavy deployment           | `policy.compliance.yaml` + `governance/COVERAGE-MATRIX.md`                                      |

---

## 3. Repository layout

```
strativion-autonomous-trading-package/
  canonical/                  # ← BINDING. Machine policy.
    policy/
      policy.runtime.yaml             # root of all binding thresholds
      policy.modes.yaml               # operating modes + transitions
      policy.regimes.yaml             # regime thresholds
      policy.risk.yaml                # per-mode risk tables
      policy.sizing.yaml              # sizing formulas and drawdown multipliers
      policy.portfolio.yaml           # heat, concentration, regime budgets
      policy.execution.yaml           # session windows, tier-1 events
      policy.execution-quality.yaml   # slippage alerts, venue degradation
      policy.data-quality.yaml        # freshness, cross-source, bad prints
      policy.instruments.yaml         # per-class metadata requirements
      policy.compliance.yaml          # PDT, 15c3-5, Reg SHO, MWCB, LULD, auctions, etc.
      policy.order-lifecycle.yaml     # state machine, idempotency, duplicate, cancel/replace
      policy.governance.yaml          # promotion gates, change control, tenancy
    laws/
      law.catalog.yaml
      law.automation-map.yaml         # 4 classes: machine_enforceable / machine_assisted / autonomous_supervisory_signal / human_supervisory
    workflows/
      workflow.crisis.yaml            # mode-aware crisis playbooks
      workflow.incidents.yaml         # broker/exchange/data failures
      workflow.lifecycle.yaml         # numeric promotion gates
      workflow.correlation.yaml       # correlation workflow + illustrative groups
      workflow.checklists.yaml        # pre-trade, pre-market, EOD, weekly
  contexts/                   # ← NON-BINDING. Reasoning layer for agents.
    agent-contexts/           #   Strategy-agnostic agent briefings (no numerics).
  implementations/            # ← NON-BINDING. Illustrative code / strategy engines.
    python-formulas/
    pctt/
      contexts/               #   Strategy-specific agent extensions.
  reference/                  # ← NON-BINDING. Textbook, examples, legacy.
    examples/
    guides/                   #   legacy narrative (risk-management, crisis-playbook)
    knowledge/                #   30-laws narrative + guides (case studies, legacy numerics)
    manuscript/
    market-playbooks/         #   per-asset-class playbooks
    playbooks/                #   entry-setups, exit-rules (legacy, demoted)
    seasonality/              #   day-of-week, monthly, FOMC (commentary)
  governance/                 # ← BINDING for CONSUMER BEHAVIOR.
    CONSUMER-CONTRACT.md
    PACKAGE-MANIFEST.yaml
    CANONICAL-FIELD-INDEX.md  #   one control -> one file:field
    UNITS.md                  #   decimal fraction, IANA NY
    VERSIONING.md             #   SemVer rules, hash binding
    OVERRIDE-SCHEMA.md        #   tenant/app overrides (tightening-only)
    VALIDATION-RULES.md
    COVERAGE-MATRIX.md
    MIGRATION-MAP.md
  tooling/                    # Editor / assistant support.
```

---

## 4. Core concepts

### 4.1 Canonical, contexts, implementations, reference

| Layer             | Binding? | Purpose                                                                 | Numeric thresholds? |
|-------------------|:--------:|-------------------------------------------------------------------------|:-------------------:|
| `canonical/`      | Yes      | Machine policy. The only source of authoritative numbers.               | Yes (decimal)       |
| `contexts/`       | No       | Agent reasoning, prompt material, law narrative.                        | No — reference-by-field only |
| `implementations/`| No       | Reference code, strategy-specific engines (e.g. PCTT).                  | Strategy-local only |
| `reference/`      | No       | Textbook, legacy guides, examples, playbooks, seasonality commentary.   | Legacy percent-float |
| `governance/`     | Yes (for consumers) | How to consume, version, override, validate.                   | Meta only           |

### 4.2 Operating modes

| Mode                    | Autonomy             | Typical trigger                                         |
|-------------------------|----------------------|---------------------------------------------------------|
| `autonomous_normal`     | Full, within budgets | Calm markets, all gates green                           |
| `autonomous_restricted` | Reduced size / tighter entry | Elevated vol, DD warning, data degradation     |
| `supervised_crisis`     | Operator co-pilot    | Crisis regime, correlation spike, liquidity crisis      |
| `manual_only`           | No autonomous orders | System integrity failure, drawdown full stop, operator E-stop |

Source: `canonical/policy/policy.modes.yaml`.

### 4.3 Regimes

`TRENDING`, `RANGING`, `TRANSITION`, `SHOCK`, `CRISIS`.
Source: `canonical/policy/policy.regimes.yaml`.
Each regime has activation thresholds and guidance. Strategies are gated by regime at the signal layer.

### 4.4 30 Laws

`canonical/laws/law.catalog.yaml` is the catalog.
`canonical/laws/law.automation-map.yaml` classifies each law as one of:

- `machine_enforceable` — runtime may enforce directly
- `machine_assisted` — informs scoring/gating, needs explicit logic
- `autonomous_supervisory_signal` — agent may detect and alert; may not mutate policy
- `human_supervisory` — do not apply as autonomous runtime logic

### 4.5 Lifecycle

Strategies and parameters move `research → replay → shadow → paper → supervised_live → autonomous_live`.
Each stage has **numeric gates** (min trades, min expectancy, max drawdown, required regimes observed, max incidents). No stage is "done" on vibes.
Source: `canonical/workflows/workflow.lifecycle.yaml`.

---

## 5. The precedence model

### File precedence (highest wins)

1. `canonical/policy/policy.runtime.yaml`
2. `canonical/policy/policy.modes.yaml`
3. `canonical/laws/law.automation-map.yaml`
4. remaining `canonical/policy/`
5. remaining `canonical/workflows/`
6. `contexts/`
7. `reference/`
8. `implementations/`

### Field precedence (when two canonical files appear to own the same control)

Resolved by `governance/CANONICAL-FIELD-INDEX.md`. If a control is not in the index and appears in two files, **the package is invalid — fail to load**. This is by design: no silent drift.

### Override precedence (when a tenant/app provides its own value)

`ephemeral runtime flag` > `tenant override` > `app/env override` > `canonical` — subject to the **clamp rule**: overrides may only tighten, never loosen. Source: `governance/OVERRIDE-SCHEMA.md`.

---

## 6. Units, timezones, and identifiers

- **Percentages:** decimal fractions. `0.01` means 1%. `0.005` means 0.5%. Never percent-float. A value like `1.0` in a percent field is a bug (and the validator rejects it).
- **Timezone:** IANA `America/New_York`. Times in canonical files are paired with `timezone: "America/New_York"`. DST is handled by the zone, not by `EST`/`EDT` string switching.
- **Monetary:** decimal (fixed-point). Currency is USD unless tagged.
- **Prices:** decimal, at venue tick precision.
- **Quantities:** integer for shares/contracts, decimal for crypto/fractional equities.
- **Client order IDs:** UUIDv4. Uniqueness window: 24h.

Full spec: `governance/UNITS.md`.

---

## 7. How a backend consumes this package

This is the blueprint for any service that loads canonical policy.

### 7.1 Boot sequence

```
1. Pin a package revision              -> governance/PACKAGE-MANIFEST.yaml#meta.package_version
2. Compute SHA-256 over every file in
   binding_files + supporting_canonical_files
3. Load canonical files in precedence order
4. Load tenant/app overrides (if any)  -> governance/OVERRIDE-SCHEMA.md
   - Reject overrides that loosen clamped fields
5. Validate                            -> governance/VALIDATION-RULES.md
   - Unit validator
   - Timezone validator
   - Field-index validator (no duplicate ownership)
   - Clamp validator on overrides
6. Expose the resolved policy to risk/execution/agent services
7. Persist canonical version + hash alongside every runtime decision
8. On hash change mid-run: block new entries + log CANONICAL_REVISION_DRIFT
```

### 7.2 Minimal Python sketch

```python
from pathlib import Path
import hashlib, yaml

class Policy:
    def __init__(self, root: Path, tenant_overrides: dict | None = None):
        self.manifest = yaml.safe_load((root / "governance/PACKAGE-MANIFEST.yaml").read_text())
        self.version  = self.manifest["meta"]["package_version"]
        self.hash     = self._compute_hash(root)
        self.policy   = self._load_canonical(root)
        if tenant_overrides:
            self._apply_overrides(tenant_overrides)
        self._validate()

    def _compute_hash(self, root: Path) -> str:
        h = hashlib.sha256()
        files = self.manifest["binding_files"] + self.manifest["supporting_canonical_files"]
        for rel in sorted(files):
            h.update((root / rel).read_bytes())
        return h.hexdigest()
    # _load_canonical, _apply_overrides, _validate omitted
```

Store `(self.version, self.hash)` on every order, mode transition, and incident.

### 7.3 Runtime decision log (required fields)

Every automated action must carry:

```yaml
decision:
  canonical_package_version: "2.2.0"
  canonical_hash: "<sha256>"
  mode: "autonomous_normal"
  regime: "TRENDING"
  tenant_id: "<if saas>"
  reason: "<string>"
  law_references: ["law_21", "law_22", ...]
  source_paths: ["policy.runtime.yaml#risk.per_trade.hard_max_pct", ...]
```

This is how you audit. This is how you defend a live decision later.

---

## 8. The admission gate sequence

Before any order reaches a venue, run these gates **in order**. Canonical source: `policy.order-lifecycle.yaml#pre_submission_sequence`.

```
1. data_quality_gate            -> policy.data-quality.yaml#entry_blockers
2. instrument_metadata_gate     -> policy.instruments.yaml#instrument_rules
3. compliance_gate              -> policy.compliance.yaml
4. risk_gate                    -> policy.runtime.yaml#risk, policy.risk.yaml
5. portfolio_gate               -> policy.portfolio.yaml
6. idempotency_gate             -> policy.order-lifecycle.yaml#idempotency
7. pre_trade_risk_control_gate  -> policy.compliance.yaml#pre_trade_risk_controls (15c3-5)
```

If **any** gate is red, reject. Never skip a gate "because upstream checked it."

### 8.1 Data-quality gate

Reject when: stale quote, missing primary proxy (SPY/VIX), inconsistent account state, malformed order state, unknown halt status, clock skew above threshold, stale borrow/locate, duplicate bar, sequence gap, unknown venue status.

### 8.2 Instrument-metadata gate

Reject when: tick size unknown, multiplier unknown, session calendar unknown, tradability unknown, expiry/roll unknown, assignment/delivery unknown, settlement cycle unknown, corporate-action state unknown.

### 8.3 Compliance gate

PDT counters, Reg SHO locate + SSR flag, MWCB level, LULD band honoring, auction state, options exercise style / pin risk, futures roll / first-notice / last-trade, crypto venue health / stablecoin depeg, restricted list / blackout windows.

### 8.4 Risk gate

Per-mode per-trade hard cap, drawdown protocol multiplier, daily/weekly/monthly loss limits, ruin probability ceiling, leverage hard max.

### 8.5 Portfolio gate

Post-trade heat against `policy.runtime.yaml#risk.portfolio.*_heat_max_pct` for the current mode, concentration limits, regime gross-exposure budget, correlation cluster rollup (`correlated_positions_treated_as_one`).

### 8.6 Idempotency gate

Client-order-ID uniqueness, duplicate-order rejection (same symbol + side + overlapping qty within window).

### 8.7 Pre-trade risk control gate (SEC 15c3-5)

Fat-finger price band, max order size, max order notional, max daily order count per symbol, max daily gross notional, capital + credit thresholds, duplicate throttle.

---

## 9. How an agent system consumes this package

### 9.1 Prompt loading order

```
system prompt
+ governance/CONSUMER-CONTRACT.md (reference)
+ contexts/agent-contexts/context.agent.<role>.md
+ canonical files the context references (by name)
+ strategy-specific extension: implementations/<strategy>/contexts/...
(+ selected reference/knowledge/law.NN-*.md if the agent needs the "why")
```

**Never** include `reference/` content in a prompt as policy. `reference/` is human-only context.

### 9.2 Hard rules for LLM agents

1. **Numbers come from canonical files, not from the context prose.** Context files never define thresholds — they reference fields. If an agent appears to rely on a number not in a canonical file, that is a bug.
2. **Canonical wins.** If any prose conflicts with canonical, canonical wins — every time, silently, without narration.
3. **`autonomous_supervisory_signal` laws alert, never enforce.** Law 27 (Emotional Gravity), Law 28 (Adaptation). Agents may raise alerts; they may not block trades or mutate policy.
4. **No autonomous flatten on untrusted state.** Flattening requires operator authorization per `policy.order-lifecycle.yaml#flatten`.
5. **No new entries when any canonical gate is red.** Signal agents inherit compliance, data-quality, and execution-window gates.

### 9.3 Agent roles (strategy-agnostic)

- `context.agent.meta.md` — orchestrator
- `context.agent.regime.md` — regime classification
- `context.agent.signal.md` — signal generation (regime-gated)
- `context.agent.risk.md` — sizing + veto
- `context.agent.execution.md` — order routing
- `context.agent.journal.md` — journaling + behavioral-pattern alerts

Strategy-specific extensions go in `implementations/<strategy>/contexts/` and are loaded **after** the strategy-agnostic base.

---

## 10. Adding a strategy

Use PCTT as the reference implementation.

### 10.1 Directory shape

```
implementations/<your-strategy>/
  README.md                 # strategy overview + promotion status
  contexts/                 # agent extensions for this strategy
    <s>.agent.signal.md
    <s>.agent.risk.md
    <s>.agent.execution.md
    <s>.agent.regime.md     # optional: sub-regime model
    <s>.agent.journal.md    # strategy-specific journal fields
    <s>.agent.meta.md       # orchestration specifics
  config/                   # strategy-local parameters (non-canonical)
  engine/                   # code
```

### 10.2 Rules

- A strategy context may add **behavior**, not numeric risk/compliance thresholds.
- Sizing proposals from a strategy (e.g. grade-based sizing) are always clamped by `policy.runtime.yaml#risk.per_trade.hard_max_pct` for the current mode.
- Strategy-specific "no trade" conditions are additive to canonical gates, never subtractive.
- A strategy's regime sub-model maps onto the canonical primary regime. It does not replace it.
- Strategy-specific journal fields are added as `strategy_extension:` blocks inside the standard journal entry.

### 10.3 Promotion

A new strategy moves through `workflow.lifecycle.yaml` stages with numeric gates. It is not "live" until the `autonomous_live` gates pass.

---

## 11. Adding tenant or app overrides

### 11.1 Canonical rule

Overrides are **always tightening-only**. An override that loosens a clamped field MUST be rejected at load time.

### 11.2 Shape

```yaml
meta:
  override_scope: "tenant" | "app" | "environment"
  tenant_id: "<string>"
  canonical_package_version: "2.2.0"
  canonical_package_hash: "<sha256>"
  author: "<email>"
  approved_by: "<email>"
  effective_from: "<ISO-8601>"
  rollback_plan: "<string>"

overrides:
  policy.portfolio.yaml:
    concentration_limits:
      max_single_position_notional_pct: 0.10   # tighter than canonical 0.20
```

### 11.3 Non-loosenable fields (a non-exhaustive list)

- `policy.runtime.yaml#risk.*`
- `policy.runtime.yaml#drawdown.*`
- `policy.runtime.yaml#loss_limits.*`
- `policy.runtime.yaml#ruin.*`
- `policy.runtime.yaml#crisis.*`
- `policy.runtime.yaml#data_quality.*`
- `policy.runtime.yaml#stops.*`
- `policy.runtime.yaml#operations.require_*`
- `policy.modes.yaml#modes.<mode>.forbids`
- `policy.compliance.yaml#*`
- `policy.order-lifecycle.yaml#*`

Full rule set: `governance/OVERRIDE-SCHEMA.md`.

---

## 12. Mode lifecycle

### 12.1 Demotion (looser → tighter) is automatic

Triggered by the canonical trigger set (`policy.modes.yaml#transitions`). No cooldown. No ack.

### 12.2 Promotion (tighter → looser) requires ack

- Cooldown window: `policy.modes.yaml#transitions.promotion_confirmation_window_seconds`.
- Operator acknowledgement required from `supervised_crisis` and `manual_only`.
- Flap protection: max transitions per hour is capped; breaching forces `supervised_crisis` until operator-cleared.

### 12.3 Every transition produces an audit record

Actor, reason, canonical version + hash.

---

## 13. Crisis and incident handling

### 13.1 Crisis playbooks

`canonical/workflows/workflow.crisis.yaml`. Five playbooks:

- `flash_crash` — index drop, cross-venue confirmed
- `circuit_breaker` — MWCB level 1/2/3 or sustained drop
- `liquidity_crisis` — spread explodes beyond `liquidity_crisis_multiple`
- `systemic_correlation_spike` — portfolio correlation at crisis threshold
- `broker_or_system_failure` — freeze + escalate, **no autonomous flatten**

### 13.2 Incidents

`canonical/workflows/workflow.incidents.yaml`. Broker outage, exchange halt, data-integrity failure, unexpected position state. Every incident produces a record.

### 13.3 Forbidden in crisis autonomy

- `cancel_all_stops_and_replace_with_alerts`
- `autonomous_flatten_on_untrusted_state`
- `manual_fair_value_override_execution`
- Any discretionary human playbook

---

## 14. Promotion gates (research → autonomous_live)

Numeric gates in `canonical/workflows/workflow.lifecycle.yaml`:

| Stage               | min_calendar_days | min_trades | min_expectancy_r | max_dd_pct | regimes observed        |
|---------------------|:-----------------:|:----------:|:----------------:|:----------:|-------------------------|
| replay              | —                 | 200        | 0.10             | 0.25       | trending, ranging       |
| shadow              | 14                | 100 signals| —                | —          | —                       |
| paper               | 30                | 50         | 0.05             | 0.15       | —                       |
| supervised_live     | 30                | 30         | 0.05             | 0.10       | trending, ranging       |
| autonomous_live     | 60 (in supervised)| 100 (in supervised) | —         | 0.10       | —                       |

Promotion **must** record: approver, rollback plan, canonical revision + hash.
Demotion triggers: drawdown exceeds stage max, incident recorded, canonical hash mismatch, operator E-stop.

---

## 15. Versioning and hash binding

### 15.1 SemVer

- **PATCH** — docs/tooling/reference fixes.
- **MINOR** — new canonical file, new optional field, tighter threshold, new workflow entries (non-removing).
- **MAJOR** — removed/renamed canonical field, changed unit convention, changed precedence, **loosened** threshold, changed mode semantics, changed promotion-gate direction.

### 15.2 Hash binding

In `autonomous_live`:

- Compute SHA-256 over all binding + supporting canonical files at boot.
- Persist with every decision.
- If the hash changes mid-run: block new entries, log `CANONICAL_REVISION_DRIFT`.
- If running with an unpinned version: refuse to start.

Full spec: `governance/VERSIONING.md`.

---

## 16. Validation and CI

Every commit that touches `canonical/` should run:

- **Structural validator** — every canonical file has a `meta:` block with `schema_version`, `document_role`, `purpose`.
- **Unit validator** — no percent-float values in canonical.
- **Timezone validator** — every time field maps to `America/New_York`.
- **Field-index validator** — no duplicate ownership (`governance/CANONICAL-FIELD-INDEX.md`).
- **Reference-isolation validator** — `contexts/` files contain no hard-coded risk, drawdown, correlation, VIX, heat, or loss thresholds. (They reference canonical fields instead.)
- **Manifest validator** — every file on disk is classified (binding, supporting, non-binding, governance, tooling).
- **Clamp validator** — test fixtures with loosening overrides must be rejected.

Run these in CI. Failing this set is a release blocker.

Full checklist: `governance/VALIDATION-RULES.md`.

---

## 17. Required negative tests

Your app's admission pipeline must **reject** every one of these in an automated test:

- Stale quote beyond `policy.runtime.yaml#definitions.stale_quote.*_max_age_seconds`.
- Inconsistent account state.
- Unknown instrument metadata (tick size / multiplier / session / tradability).
- Symbol halt or LULD pause.
- Unknown borrow/locate status for short sale.
- Duplicate pending order.
- Post-trade heat breach.
- Drawdown breach / daily-loss breach.
- Clock skew above `policy.runtime.yaml#definitions.clock_skew.untrusted_offset_ms`.
- PDT count at limit.
- 15c3-5 fat-finger band violated.
- MWCB Level 2 active.
- Crypto venue health unknown.
- Stablecoin depeg above threshold.
- Order into opening/closing/halt-reopen auction without explicit auction support.
- Attempted autonomous flatten on untrusted state.

These are not "nice tests." They are the minimum admission surface.

---

## 18. Instrument and market coverage

| Domain                        | Equities | ETFs | Options | Futures | Crypto |
|-------------------------------|:--------:|:----:|:-------:|:-------:|:------:|
| Session / execution windows   | ✅       | ✅   | partial | partial | partial|
| Halt / LULD handling          | ✅       | ✅   | partial | partial | n/a    |
| Auction-state handling        | ✅       | ✅   | partial | partial | n/a    |
| Short-sale / locate / SSR     | ✅       | ✅   | n/a     | n/a     | partial|
| MWCB                          | ✅       | ✅   | partial | partial | n/a    |
| Expiry / assignment / pin risk| n/a      | n/a  | ✅      | n/a     | n/a    |
| Roll / first notice / delivery| n/a      | n/a  | n/a     | ✅      | n/a    |
| Venue health / outages        | partial  | partial | partial | partial | ✅   |
| Stablecoin depeg              | n/a      | n/a  | n/a     | n/a     | ✅     |
| Weekend / overnight controls  | ✅       | ✅   | ✅      | ✅      | ✅     |

Full matrix: `governance/COVERAGE-MATRIX.md`.

Consumer still owns: venue/broker adapters, tenant risk overlays (within the clamp rule), strategy payload schemas, local compliance reporting (Rule 605/606, MiFID II RTS 28, EMIR/Dodd-Frank), disaster recovery.

---

## 19. Multi-tenant / SaaS integration pattern

This package is the shared, read-only spine. Tenants layer on top.

### 19.1 Recommended service shape

```
  ┌──────────────────────────────────────────┐
  │  Trading App Backend                     │
  │                                          │
  │  ┌────────────────────────────────────┐  │
  │  │  PolicyResolver (per tenant)       │  │
  │  │   1. Load pinned canonical pkg     │  │
  │  │   2. Compute hash                  │  │
  │  │   3. Load tenant override          │  │
  │  │   4. Clamp + validate              │  │
  │  │   5. Expose resolved policy        │  │
  │  └────────────────────────────────────┘  │
  │        │                                 │
  │        ▼                                 │
  │  ┌────────────────────────────────────┐  │
  │  │  Admission pipeline (gates in §8)  │  │
  │  └────────────────────────────────────┘  │
  │        │                                 │
  │        ▼                                 │
  │  ┌────────────────────────────────────┐  │
  │  │  Execution + Order Lifecycle SM    │  │
  │  └────────────────────────────────────┘  │
  │                                          │
  └──────────────────────────────────────────┘
        │               │              │
        ▼               ▼              ▼
   Broker adapter   Market data    Journal / audit
        (tenant-scoped)              (tenant-scoped)
```

### 19.2 Storage layout (consumer side, outside this package)

```
overrides/
  <tenant_id>/
    approved/
      policy.portfolio.yaml
      policy.regimes.yaml
    proposed/
      ...
    history/
      2026-04-22T14:00Z-tenant-<hash>.yaml
```

### 19.3 Hard tenancy rules

- One canonical package version, one hash, identical across tenants of the same deployment.
- Tenant overrides are tightening-only.
- Every tenant decision carries `tenant_id`, `canonical_version`, `canonical_hash`, `override_hash` (if any).
- No tenant can see another tenant's journal, orders, positions, or overrides.
- Package upgrades (MINOR or MAJOR) run in `shadow` against tenant workloads before rollout.

---

## 20. Common pitfalls

- **Treating context files as policy.** Context files never define thresholds. If you see a number in `contexts/`, it is illustrative, not authoritative. Read canonical.
- **Merging percent-float reference values with decimal canonical values.** `reference/playbooks/*.yaml` uses percent-float and is marked `binding: false`. Never merge with canonical.
- **Assuming "canonical wins" is automatic.** It is only automatic if your resolver actually drops context numerics. Write the resolver that way.
- **Caching canonical values across package versions.** If you cache, key by `(package_version, canonical_hash)`.
- **Flattening on untrusted state autonomously.** Forbidden. Requires operator. Freeze + escalate instead.
- **Skipping the field-index validator.** Two files silently owning the same field is the single biggest drift hazard; catch it in CI.
- **Loosening overrides.** The override schema rejects them. If your override applies, it is tighter. Period.
- **Broker semantics in canonical.** Broker quirks belong in your adapter, not in canonical policy.
- **Hard-coding example ticker lists** from `workflow.correlation.yaml#illustrative_examples`. They are illustrative; your tenant supplies real groupings.
- **Loading `reference/seasonality/seasonality.yaml` as policy.** It is commentary. Execution windows live in `policy.execution.yaml`.
- **Treating `workflow.entry-setups.yaml` / `workflow.exit-rules.yaml` as canonical.** They were demoted in 2.2.0 to `reference/playbooks/`. If your code still reads them from `canonical/workflows/`, it is reading nothing — fail to start.

---

## 21. Quick reference: "where do I find X?"

| I need...                                                    | Source                                                                              |
|--------------------------------------------------------------|-------------------------------------------------------------------------------------|
| Per-trade hard risk cap                                      | `policy.runtime.yaml#risk.per_trade.hard_max_pct`                                   |
| Per-mode per-trade risk table                                | `policy.risk.yaml#per_trade_risk`                                                   |
| Drawdown thresholds                                          | `policy.runtime.yaml#drawdown`                                                      |
| Drawdown multipliers                                         | `policy.sizing.yaml#drawdown_scaling`                                               |
| Daily/weekly/monthly loss limits                             | `policy.runtime.yaml#loss_limits`                                                   |
| Portfolio heat caps per mode                                 | `policy.runtime.yaml#risk.portfolio`                                                |
| Correlation thresholds                                       | `policy.runtime.yaml#correlation`                                                   |
| Concentration limits                                         | `policy.portfolio.yaml#concentration_limits`                                        |
| Regime thresholds (ADX, VIX, ATR ratio)                      | `policy.regimes.yaml`                                                               |
| Session windows                                              | `policy.execution.yaml#us_equity`                                                   |
| Tier-1 event blackouts                                       | `policy.execution.yaml#tier_1_events`                                               |
| Spread controls                                              | `policy.execution.yaml#spread_controls`                                             |
| Data-quality entry blockers                                  | `policy.data-quality.yaml#entry_blockers`                                           |
| Freshness thresholds                                         | `policy.data-quality.yaml#freshness_thresholds`                                     |
| Cross-source disagreement threshold                          | `policy.data-quality.yaml#cross_source`                                             |
| Outlier detection method                                     | `policy.runtime.yaml#definitions.outlier_price`                                     |
| Clock skew limit                                             | `policy.runtime.yaml#definitions.clock_skew`                                        |
| Forced-close / expiry event list                             | `policy.runtime.yaml#definitions.forced_close_or_expiry_events`                     |
| PDT rules                                                    | `policy.compliance.yaml#pdt`                                                        |
| 15c3-5 pre-trade risk                                        | `policy.compliance.yaml#pre_trade_risk_controls`                                    |
| Reg SHO / SSR                                                | `policy.compliance.yaml#reg_sho`                                                    |
| MWCB levels                                                  | `policy.compliance.yaml#mwcb`                                                       |
| LULD                                                         | `policy.compliance.yaml#luld`                                                       |
| Auction handling                                             | `policy.compliance.yaml#auctions`                                                   |
| Options assignment / pin / exercise-by-exception             | `policy.compliance.yaml#options`                                                    |
| Futures first-notice / last-trade / roll                     | `policy.compliance.yaml#futures`                                                    |
| Crypto venue health / stablecoin depeg                       | `policy.compliance.yaml#crypto`                                                     |
| Order state machine                                          | `policy.order-lifecycle.yaml#state_machine`                                         |
| Idempotency / client-order-id                                | `policy.order-lifecycle.yaml#idempotency`                                           |
| Duplicate-order resolution                                   | `policy.order-lifecycle.yaml#duplicate_resolution`                                  |
| Cancel/replace failure matrix                                | `policy.order-lifecycle.yaml#cancel_replace`                                        |
| Partial-fill policy                                          | `policy.order-lifecycle.yaml#partial_fill`                                          |
| Pre-submission gate sequence                                 | `policy.order-lifecycle.yaml#pre_submission_sequence`                               |
| Flatten authority                                            | `policy.order-lifecycle.yaml#flatten`                                               |
| Execution-quality alerts                                     | `policy.execution-quality.yaml#alerts`                                              |
| Venue degradation response                                   | `policy.execution-quality.yaml#degradation_response`                                |
| Mode capabilities                                            | `policy.modes.yaml#modes`                                                           |
| Mode transitions + flap protection                           | `policy.modes.yaml#transitions`                                                     |
| Crisis playbooks                                             | `workflow.crisis.yaml`                                                              |
| Incidents                                                    | `workflow.incidents.yaml`                                                           |
| Promotion gates                                              | `workflow.lifecycle.yaml`                                                           |
| Correlation workflow                                         | `workflow.correlation.yaml`                                                         |
| Checklists                                                   | `workflow.checklists.yaml`                                                          |
| Law catalog                                                  | `law.catalog.yaml`                                                                  |
| Law automation classes                                       | `law.automation-map.yaml`                                                           |
| Override rules                                               | `governance/OVERRIDE-SCHEMA.md`                                                     |
| Unit / timezone conventions                                  | `governance/UNITS.md`                                                               |
| Version rules and hash binding                               | `governance/VERSIONING.md`                                                          |
| What's authoritative for field X                             | `governance/CANONICAL-FIELD-INDEX.md`                                               |
| What is covered and where                                    | `governance/COVERAGE-MATRIX.md`                                                     |
| How consumers must behave                                    | `governance/CONSUMER-CONTRACT.md`                                                   |
| What validators to run                                       | `governance/VALIDATION-RULES.md`                                                    |

---

## 22. Entry points

For a new team integrating the package, read in this order:

1. `governance/CONSUMER-CONTRACT.md`
2. `governance/PACKAGE-MANIFEST.yaml`
3. `governance/CANONICAL-FIELD-INDEX.md`
4. `governance/UNITS.md`
5. `canonical/policy/policy.runtime.yaml`
6. `canonical/policy/policy.modes.yaml`
7. `canonical/policy/policy.compliance.yaml`
8. `canonical/policy/policy.order-lifecycle.yaml`
9. `canonical/workflows/workflow.crisis.yaml`
10. `canonical/workflows/workflow.lifecycle.yaml`
11. `governance/OVERRIDE-SCHEMA.md`
12. `governance/VERSIONING.md`
13. `governance/VALIDATION-RULES.md`
14. `governance/COVERAGE-MATRIX.md`
15. `PACKAGE-STATUS.md`

Then pick the agent contexts or strategy implementations relevant to your app.

---

**Contract:** if you build a trading app on top of this package, you pin a version, you compute the hash, you run the admission pipeline in order, you enforce tightening-only overrides, you never treat context or reference as policy, and you never autonomously flatten on untrusted state. Do that, and the package delivers what it promises: one reusable spine, many apps, consistent policy, auditable decisions, across the full market spectrum.
