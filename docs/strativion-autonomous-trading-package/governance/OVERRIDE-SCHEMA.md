# OVERRIDE-SCHEMA

**Document role:** Defines how tenant- and environment-level overrides compose with platform canonical values, what may be overridden, and the invariants the merge process must preserve.

**Schema version:** 1.0.0
**Binding precedence:** Authoritative. A tenant override that violates this document is rejected at load time with a hard error.

---

## 1. Principles

1. **Platform canon is the ceiling.** A tenant may never override a platform value in a *more permissive* direction.
2. **Narrow-only.** Overrides can shrink budgets, shorten windows, restrict venues, and tighten filters — never the reverse.
3. **Single precedence order.** There is exactly one merge order; no ambiguous "whichever applies" logic.
4. **Locked fields are locked.** Fields marked 🔒 in `CANONICAL-FIELD-INDEX.md` cannot be overridden by any tenant under any circumstances.
5. **Dual-control is preserved across layers.** A field marked ⛔ in the index requires dual-control even when the override is applied, not just when canon is modified.

## 2. Layer order (lowest → highest precedence, but last-writer-wins is **disallowed**)

```
  1. canonical/policy/*.yaml          (platform default)
  2. canonical/policy/environments/   (e.g., staging vs. prod; platform-operator only)
  3. tenant/<tenant_id>/overrides/*.yaml  (SaaS tenant overrides)
  4. account/<account_id>/overrides/*.yaml (per-account overrides within a tenant)
  5. runtime operator kill-switch     (kill-only, never numeric)
```

Every downstream layer may only narrow. The merge engine does not "win" higher values; it rejects them.

## 3. Merge semantics

| Field kind | Merge rule |
|---|---|
| Scalar numeric (`_pct`, `_bps`, counts) | `min(platform, tenant)` for ceilings; `max(platform, tenant)` for floors. If the field is a ceiling, tenant value must be `≤` platform. If a floor, tenant value must be `≥` platform. |
| Enum (e.g., `mode`, `sizing.method`) | Tenant may select a value from a platform-provided subset. Platform defines the allowlist in `policy.tenancy.yaml#allowed_enums`. |
| List (venue allowlist, symbols) | Tenant list must be a **subset** of platform list. No new entries permitted. |
| Map/object | Recursive merge under the same rules, per-field. |
| Boolean feature flags | Tenant may set `true → false` (disable) but not `false → true` unless the platform explicitly marks the flag as `tenant_toggleable`. |
| Durations | Tenant may set shorter (more conservative), never longer. |
| Windows / calendars | Tenant may add blackouts; may not remove platform blackouts. |

## 4. Rejection semantics

Any override that would:

- Widen a ceiling,
- Lower a floor,
- Introduce a disallowed enum value,
- Add a venue/symbol not in the platform allowlist,
- Toggle a non-`tenant_toggleable` flag in a permissive direction,
- Remove a platform blackout window,

…is rejected at load time. Rejection is **hard**: the tenant configuration does not load at all; the tenant defaults to platform canon alone, and an `INC_TENANT_OVERRIDE_INVALID` incident is emitted.

There is no "partial apply." Either the entire override loads or none of it does.

## 5. Override file shape

```yaml
meta:
  document_role: tenant_override
  tenant_id: acme-trading
  schema_version: 1.0.0
  canonical_package_version: "^2.5.0"   # SemVer range the override targets
  signed_by: ["ops-lead@acme", "compliance@acme"]   # dual-control fields

overrides:
  policy.runtime.yaml:
    risk.per_trade.hard_max_pct: 0.0075    # narrower than platform's 0.01
    risk.portfolio.heat_normal_max_pct: 0.04
  policy.compliance.yaml:
    crypto.venue_allowlist: ["coinbase-prime"]   # subset of platform list
  policy.calendar.yaml:
    earnings.blackout.hours_before: 48   # longer than platform's 24
```

## 6. Validator rules

The override validator runs on every tenant configuration push and on runtime boot:

1. **Schema shape:** Override file conforms to `canonical/schemas/tenant-override.schema.json`.
2. **Target version:** `canonical_package_version` range resolves to a known package.
3. **Field authority:** Every key in `overrides` maps to a canonical owner in `CANONICAL-FIELD-INDEX.md`. Attempts to override non-owner paths are rejected.
4. **Narrow-only:** For each numeric, enum, list, and duration, apply §3 rules and reject on violation.
5. **Lock check:** No 🔒 field appears in the override.
6. **Dual-control check:** If any ⛔ field appears, the override must carry ≥ 2 distinct signers from the approved roster.
7. **Tenancy invariant:** `sum(tenant.risk_budget_pct)` across active tenants ≤ platform ceiling (see `policy.tenancy.yaml#platform_ceiling`).
8. **Cross-field invariants:** All invariants from `CANONICAL-FIELD-INDEX.md` §Enforcement still hold after merge.

## 7. Operator kill-switch (Layer 5)

The operator kill-switch is **not** a numeric override. It exposes only:

- `trading_paused`: boolean
- `flattening_mode`: `none | cancel_working | flatten_to_cash`
- `per_tenant_pause`: map<tenant_id, bool>

It cannot change risk numerics, state-machine behavior, or compliance rules. If these need changing in an emergency, that is a canonical package hotfix, subject to full versioning and dual-control.

## 8. Audit

Every applied override layer is recorded in the audit log per order:

```json
"audit": {
  "canonical_hash": "sha256:…",
  "tenant_override_hash": "sha256:…",
  "account_override_hash": "sha256:…",
  "operator_kill_state": {"trading_paused": false, "flattening_mode": "none"}
}
```

If any override hash is absent (e.g., tenant has no override file), the field is `null` explicitly. Order audit entries are the legal record of what authorized this specific trade.

## 9. Examples

### Allowed

- Platform: `hard_max_pct: 0.01`. Tenant: `hard_max_pct: 0.005`. ✅ narrower.
- Platform: `venue_allowlist: [A, B, C]`. Tenant: `[A, B]`. ✅ subset.
- Platform: `earnings.blackout.hours_before: 24`. Tenant: `48`. ✅ more conservative.

### Rejected

- Platform: `hard_max_pct: 0.01`. Tenant: `hard_max_pct: 0.015`. ❌ wider — rejected.
- Platform: `venue_allowlist: [A, B, C]`. Tenant: `[A, B, D]`. ❌ `D` not in allowlist — rejected.
- Platform: locked `order-lifecycle.states`. Tenant: overrides state-machine. ❌ locked — rejected.
- Platform: `mode.active` enum `{paper, supervised_live, autonomous_live}`. Tenant: `"yolo_live"`. ❌ not in enum — rejected.

## 10. Migration

When the canonical package bumps MAJOR, existing tenant overrides are not auto-migrated. They must be re-submitted against the new package. During the grace window:

- Tenant continues to run on the previous canonical package (frozen).
- Migration assistant diffs old override vs new schema and proposes a translated override.
- Compliance/ops dual-signs the migrated override before it applies.

## 11. Open items

- `TODO:OVERRIDE-SCHEMA-01`: add `account`-level override shape once per-account risk budgets are introduced.
- `TODO:OVERRIDE-SCHEMA-02`: define signing key management (HSM vs. platform KMS) in a separate SECURITY.md.
