# CANONICAL-FIELD-INDEX

**Document role:** Single source of truth for *which file owns which field* in the Strativion autonomous trading control plane.

**Schema version:** 1.0.0
**Binding precedence:** This index is authoritative. If any canonical YAML, agent context, knowledge document, or workflow asserts a value for a logical control, it is valid **only if** its location matches the entry in this index. Any other location is advisory at best and a defect at worst.

**Unit convention:** All percentages are expressed as **decimal fractions** (`0.01 = 1%`). No percent-floats (`1.0` to mean 1%) anywhere in the package. Any field whose name ends in `_pct` or `_bps` carries the stated unit as a strict type constraint and is enforced by schema.

---

## How to read this file

Each row of the index answers three questions for a single logical control:

1. **What is the control?** (human-readable description)
2. **Where does its value live?** (exactly one `file#path` — the *canonical owner*)
3. **Who may read it, and under what precedence?** (consumer class and override rights)

A logical control appears in **exactly one** canonical owner row. If you see the same control defined in two canonical files, that is a P0 bug to be resolved by either (a) deleting the duplicate or (b) converting the non-owner into a computed/derived reference.

### Consumer classes

| Class | May read canon? | May embed numeric literals? | May mutate at runtime? |
|---|---|---|---|
| `canonical` | Yes (via schema binding) | **Only in the owning file** | No |
| `runtime_engine` | Yes (via loader) | No | No |
| `agent_context` | Yes (via reference, never copy) | **No** | No |
| `knowledge` | Yes (by reference only) | **No** | No |
| `workflow` | Yes (by reference, never copy) | **No — numeric literals in workflows are banned** | No |
| `tenant_override` | Yes | Yes, **but only narrowing** per OVERRIDE-SCHEMA | No |
| `operator_runtime` | Yes | No | **Kill-switch only**, never risk numerics |

### Override rights column

| Symbol | Meaning |
|---|---|
| 🔒 | Locked — tenants cannot override |
| ⬇ | Narrow-only — tenant override must be at least as strict (smaller budget, shorter window, etc.) |
| ↔ | Bidirectional — tenant may widen or narrow within bounds defined in `policy.tenancy.yaml` |
| ⛔ | Requires dual-control (two approvers) to modify even by platform operator |

---

## 1. Risk & capital controls

| # | Logical control | Canonical owner (file#path) | Unit | Override | Notes |
|---|---|---|---|---|---|
| R-01 | Per-trade maximum risk | `policy.runtime.yaml#risk.per_trade.hard_max_pct` | decimal fraction | ⬇ | Absolute ceiling. All setup/workflow references must resolve to `≤ this`. |
| R-02 | Per-trade default risk | `policy.runtime.yaml#risk.per_trade.default_pct` | decimal fraction | ⬇ | Used when a setup does not explicitly name a risk bucket. |
| R-03 | Per-symbol cluster cap | `policy.runtime.yaml#risk.cluster.per_symbol_max_pct` | decimal fraction | ⬇ | Sum of open risk on one underlying. |
| R-04 | Per-sector cluster cap | `policy.runtime.yaml#risk.cluster.per_sector_max_pct` | decimal fraction | ⬇ | GICS sector rollup. |
| R-05 | Per-correlation-cluster cap | `policy.runtime.yaml#risk.cluster.per_corr_cluster_max_pct` | decimal fraction | ⬇ | Clusters defined in `policy.correlations.yaml`. |
| R-06 | Portfolio heat — normal regime | `policy.runtime.yaml#risk.portfolio.heat_normal_max_pct` | decimal fraction | ⬇ | |
| R-07 | Portfolio heat — shock regime | `policy.runtime.yaml#risk.portfolio.heat_shock_max_pct` | decimal fraction | ⬇ | Must satisfy `R-07 < R-06`. |
| R-08 | Portfolio heat — crisis regime | `policy.runtime.yaml#risk.portfolio.heat_crisis_max_pct` | decimal fraction | ⬇ | Must satisfy `R-08 < R-07`. |
| R-09 | Daily loss kill-switch threshold | `policy.runtime.yaml#risk.kill_switch.daily_loss_pct` | decimal fraction | ⬇ | Trip arms flat-to-cash per `policy.dr.yaml`. |
| R-10 | Weekly loss kill-switch threshold | `policy.runtime.yaml#risk.kill_switch.weekly_loss_pct` | decimal fraction | ⬇ | |
| R-11 | Peak-to-trough max drawdown | `policy.runtime.yaml#risk.kill_switch.drawdown_pct` | decimal fraction | ⬇ | Measured on equity curve, not P&L. |
| R-12 | Margin utilization hard cap | `policy.runtime.yaml#risk.margin.utilization_max_pct` | decimal fraction | ⬇ | Broker-reported maintenance margin / equity. |
| R-13 | Leverage ceiling | `policy.runtime.yaml#risk.margin.leverage_max` | scalar (unitless) | ⬇ | Gross exposure / equity. |
| R-14 | Correlation-cluster threshold | `policy.correlations.yaml#cluster_threshold` | decimal fraction (ρ) | 🔒 | ρ above this merges instruments into one cluster. |
| R-15 | Crisis-regime correlation floor | `policy.correlations.yaml#crisis_override_rho` | decimal fraction (ρ) | 🔒 | When crisis flag active, all correlations floor at this. |

## 2. Position sizing

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| S-01 | Sizing method | `policy.sizing.yaml#method` | enum{`fixed_fractional`,`atr_vol`,`kelly_fractional`} | ⬇ | |
| S-02 | Kelly fraction cap | `policy.sizing.yaml#kelly.cap` | decimal fraction of full Kelly | ⬇ | e.g., `0.25` = quarter-Kelly. |
| S-03 | ATR lookback | `policy.sizing.yaml#atr.lookback_periods` | integer | ⬇ | |
| S-04 | ATR stop multiple | `policy.sizing.yaml#atr.stop_multiple` | scalar | ⬇ | |
| S-05 | Minimum stop distance | `policy.sizing.yaml#stops.min_distance_bps` | basis points | ⬇ | Prevents sub-tick stops. |
| S-06 | Maximum stop distance | `policy.sizing.yaml#stops.max_distance_pct` | decimal fraction of price | ⬇ | Sanity ceiling. |
| S-07 | Round-lot snapping rule | `policy.sizing.yaml#quantization.rule` | enum{`down`,`nearest`,`never`} | 🔒 | `down` strongly preferred; `nearest` can inflate risk. |

## 3. Execution & order lifecycle

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| E-01 | Default TIF | `policy.execution.yaml#default_tif` | enum{DAY,GTC,IOC,FOK} | ⬇ | |
| E-02 | Marketable-limit offset | `policy.execution.yaml#marketable_limit.offset_bps` | basis points | ⬇ | |
| E-03 | Max acceptable spread — liquid | `policy.execution.yaml#spread_filter.liquid_max_bps` | basis points | ⬇ | |
| E-04 | Max acceptable spread — illiquid | `policy.execution.yaml#spread_filter.illiquid_max_bps` | basis points | ⬇ | |
| E-05 | Slippage budget per trade | `policy.execution.yaml#slippage.per_trade_bps` | basis points | ⬇ | |
| E-06 | Order state machine | `policy.order-lifecycle.yaml#states` | enum set | 🔒 | See file for full state table. |
| E-07 | Idempotency key strategy | `policy.order-lifecycle.yaml#idempotency.key_strategy` | enum | 🔒 | |
| E-08 | Cancel/replace semantics | `policy.order-lifecycle.yaml#cancel_replace` | object | 🔒 | |
| E-09 | Partial-fill handling | `policy.order-lifecycle.yaml#partial_fill` | object | ⬇ | |
| E-10 | FIX reject handling table | `policy.execution-errors.yaml#fix_reject_codes` | table | 🔒 | |
| E-11 | Broker outage circuit breaker | `policy.execution-errors.yaml#broker_circuit_breaker` | object | ⬇ | |
| E-12 | Clock-skew tolerance | `policy.execution-errors.yaml#clock_skew.max_ms` | integer ms | 🔒 | |

## 4. Compliance

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| C-01 | PDT rule enforcement | `policy.compliance.yaml#pdt` | object | 🔒 | US equities <$25k. |
| C-02 | SEC 15c3-5 pre-trade checks | `policy.compliance.yaml#pre_trade_checks` | object | 🔒 | |
| C-03 | Reg SHO locate requirement | `policy.compliance.yaml#reg_sho` | object | 🔒 | |
| C-04 | MWCB handling | `policy.compliance.yaml#mwcb` | object | 🔒 | Market-Wide Circuit Breakers L1/L2/L3. |
| C-05 | LULD handling | `policy.compliance.yaml#luld` | object | 🔒 | Limit Up / Limit Down bands. |
| C-06 | Auction state handling | `policy.compliance.yaml#auction_states` | object | 🔒 | Open/close cross, halts, IPO openings. |
| C-07 | Options exercise/assignment | `policy.compliance.yaml#options.exercise_assignment` | object | 🔒 | |
| C-08 | Futures contract rollover | `policy.compliance.yaml#futures.rollover` | object | ⬇ | |
| C-09 | Crypto venue allowlist | `policy.compliance.yaml#crypto.venue_allowlist` | list | ⬇ | |
| C-10 | Corporate actions handling | `policy.compliance.yaml#corporate_actions` | object | 🔒 | Splits, mergers, spin-offs, symbol changes. |
| C-11 | Restricted-list lookup | `policy.compliance.yaml#restricted_list.source` | URI | ⬇ | |

## 5. Data quality

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| D-01 | Max staleness — equities | `policy.data-quality.yaml#staleness.equities_max_ms` | integer ms | ⬇ | |
| D-02 | Max staleness — futures | `policy.data-quality.yaml#staleness.futures_max_ms` | integer ms | ⬇ | |
| D-03 | Max staleness — FX | `policy.data-quality.yaml#staleness.fx_max_ms` | integer ms | ⬇ | |
| D-04 | Max staleness — crypto | `policy.data-quality.yaml#staleness.crypto_max_ms` | integer ms | ⬇ | |
| D-05 | Cross-venue disagreement cap | `policy.data-quality.yaml#cross_venue.max_disagreement_bps` | basis points | ⬇ | |
| D-06 | NBBO requirement (US equities) | `policy.data-quality.yaml#nbbo.required` | boolean | 🔒 | |
| D-07 | Bad-print filter | `policy.data-quality.yaml#bad_print.filter_rule` | object | 🔒 | |
| D-08 | Tick-size validation | `policy.data-quality.yaml#tick_size.enforce` | boolean | 🔒 | |
| D-09 | Gap detection threshold | `policy.data-quality.yaml#gap.max_sigma` | scalar σ | ⬇ | |

## 6. Calendar & event policy

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| K-01 | Tier-1 macro blackouts | `policy.calendar.yaml#macro.tier1.windows` | list of windows | 🔒 | FOMC, CPI, NFP. |
| K-02 | Tier-2 macro caution windows | `policy.calendar.yaml#macro.tier2.windows` | list of windows | ⬇ | |
| K-03 | Earnings blackout rule | `policy.calendar.yaml#earnings.blackout` | object | ⬇ | |
| K-04 | Dividend/ex-date handling | `policy.calendar.yaml#dividends.ex_date` | object | ⬇ | |
| K-05 | Quad-witching handling | `policy.calendar.yaml#options.quad_witching` | object | 🔒 | |
| K-06 | OPEX handling | `policy.calendar.yaml#options.opex` | object | ⬇ | |
| K-07 | Market hours per venue | `policy.calendar.yaml#sessions` | table | 🔒 | |
| K-08 | Holiday calendar source | `policy.calendar.yaml#holidays.source` | URI | 🔒 | |
| K-09 | Halt/auction wake-up rule | `policy.calendar.yaml#halts.wake_rule` | object | 🔒 | |

> Note: The legacy file `reference/seasonality/seasonality.yaml` (formerly `policy.seasonality.yaml`, now DEPRECATED / moved to reference) is downgraded to reference/contextual; `policy.calendar.yaml` replaces its authority for any enforceable window.

## 7. Modes, promotion & lifecycle

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| M-01 | Active operating mode | `policy.runtime.yaml#mode.active` | enum | ⛔ | See `policy.promotion.yaml` for enum. |
| M-02 | Promotion stage graph | `policy.promotion.yaml#stages` | DAG | 🔒 | `research→replay→shadow→paper→supervised_live→autonomous_live` |
| M-03 | Promotion gates | `policy.promotion.yaml#gates` | object | 🔒 | Numeric pass/fail per stage transition. |
| M-04 | Demotion triggers | `policy.promotion.yaml#demotion_triggers` | list | 🔒 | Automatic backwards transitions. |
| M-05 | Minimum stage dwell time | `policy.promotion.yaml#min_dwell` | duration | ⬇ | |
| M-06 | Shadow trading traffic mix | `policy.promotion.yaml#shadow.traffic_mix` | object | ⬇ | |

## 8. Incidents & supervisory signals

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| I-01 | Incident taxonomy | `policy.incidents.yaml#codes` | table | 🔒 | `INC_<CATEGORY>_<SPECIFIC>`. |
| I-02 | Incident severity mapping | `policy.incidents.yaml#severity_map` | table | 🔒 | |
| I-03 | Incident → action mapping | `policy.incidents.yaml#action_map` | table | 🔒 | Pause/flatten/degrade/alert-only. |
| I-04 | Autonomous supervisory signals | `policy.incidents.yaml#supervisory_signals` | table | 🔒 | New automation class: detect+alert, never mutate. |
| I-05 | Escalation rosters | `policy.incidents.yaml#escalation.rosters` | table | ↔ | |
| I-06 | PagerDuty / alert sinks | `policy.incidents.yaml#sinks` | table | ↔ | |

## 9. Disaster recovery & kill switches

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| DR-01 | RTO per component | `policy.dr.yaml#rto_minutes` | table | 🔒 | |
| DR-02 | RPO per component | `policy.dr.yaml#rpo_minutes` | table | 🔒 | |
| DR-03 | Degraded defaults | `policy.dr.yaml#degraded_defaults` | object | 🔒 | |
| DR-04 | Kill-switch authority | `policy.dr.yaml#kill_switch.authority` | object | ⛔ | Dual-control required. |
| DR-05 | Flatten-to-cash procedure | `policy.dr.yaml#flatten.procedure` | object | 🔒 | **Never** triggered by `state_untrusted` alone. |
| DR-06 | Safe-state on ambiguous state | `policy.dr.yaml#ambiguous_state.action` | enum{`halt`,`pause_new_orders`,`freeze_and_alert`} | 🔒 | Default: `freeze_and_alert`. Flatten is NOT a safe default. |

## 10. Tenancy & SaaS overrides

| # | Logical control | Canonical owner | Unit | Override | Notes |
|---|---|---|---|---|---|
| T-01 | Tenant registry | `policy.tenancy.yaml#tenants` | table | 🔒 | |
| T-02 | Per-tenant risk budget | `policy.tenancy.yaml#tenants[].risk_budget_pct` | decimal fraction | ⬇ | Sum of tenants ≤ platform ceiling. |
| T-03 | Per-tenant venue allowlist | `policy.tenancy.yaml#tenants[].venue_allowlist` | list | ⬇ | |
| T-04 | Override precedence rules | `governance/OVERRIDE-SCHEMA.md` | document | 🔒 | Merge semantics, never-widen rule. |
| T-05 | Data isolation level | `policy.tenancy.yaml#isolation.level` | enum{`logical`,`physical`} | 🔒 | |

---

## Enforcement

A CI validator (`tooling/validate/`) **must** run on every merge and assert:

1. **No duplicates:** every logical control resolves to exactly one `file#path`.
2. **No literals outside owners:** `grep` across `knowledge/`, `agents/`, `workflows/` for any numeric literal followed by `_pct`, `_bps`, or comparable unit-bearing suffixes shall return zero results except in canonical owners.
3. **No unit ambiguity:** every `_pct` field passes a typing check that its value is in `[0, 1]`. A value `> 1` is a hard failure.
4. **Cross-field invariants:**
   - `R-07 < R-06`, `R-08 < R-07` (heat decreases with regime severity).
   - `R-11 < R-09 × 5` (drawdown threshold consistent with daily-loss cadence).
   - `D-02 ≤ D-01` (futures staleness no worse than equities) unless explicitly justified.
5. **All workflow references resolve:** every `${file#field}` reference in workflows resolves to a real index entry.

Any violation blocks merge. There is no override that bypasses the index validator.

---

## Adding a new control

1. Propose the control in a PR with:
   - Logical name (human-readable).
   - Proposed canonical owner path.
   - Unit and enforcement rule.
   - Override class.
2. Add one row to this file.
3. Add the field to the corresponding policy YAML.
4. Add a schema entry in `canonical/schemas/*.schema.json`.
5. CI validator must pass.

## Removing or renaming a control

1. Mark the row `DEPRECATED` with a sunset version per `VERSIONING.md`.
2. Provide a migration note for dependent workflows and consumers.
3. Delete only after two minor versions of deprecation.

---

## Open items (tracked)

- `TODO:FIELD-INDEX-OPT-01`: populate `policy.options.yaml` (greeks caps, IV rank gating) and add section 11.
- `TODO:FIELD-INDEX-CRYPTO-01`: populate `policy.crypto.yaml` (perp funding limits, venue risk scores) and add section 12.

Nothing in this index is informational. Every row is a binding contract.
