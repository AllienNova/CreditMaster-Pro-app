# Validation Rules

## Purpose

Minimum checks a consumer or maintainer must run before treating the package as production-ready. A reference implementation lives in `tooling/validate/validate_package.py`. Every rule below is machine-enforced there.

## Structural rules (validator rule 1)

Every canonical file MUST:

- Include a `meta:` block with `schema_version`, `document_role`, and `purpose`.
- Be listed in `governance/PACKAGE-MANIFEST.yaml` under `binding_files`, `supporting_canonical_files`, or `canonical_schemas`.
- Use the decimal-fraction unit convention for percentages (validator rule 3).
- Use the IANA zone `America/New_York` for times (validator rule 4).
- Not restate a value that is indexed in `governance/CANONICAL-FIELD-INDEX.md` as owned by another file.

## Manifest consistency (validator rule 2)

Every path in `PACKAGE-MANIFEST.yaml` (`binding_files`, `supporting_canonical_files`, `canonical_schemas`, `governance_index`, `tooling_index`) must exist on disk.

## Unit validator (validator rule 3)

Canonical files are rejected if any `*_pct` field contains a float greater than 1.0. Decimal-fraction convention: `1% = 0.01`, `100% = 1.0`.

## Timezone validator (validator rule 4)

Every `timezone:` field must be `America/New_York`. Informal strings like `"09:30 ET"` are allowed as values of other fields, but whenever a canonical document claims a timezone, it must be the IANA form.

## Field-index validator (validator rule 5)

Every file mentioned in `governance/CANONICAL-FIELD-INDEX.md` must exist. No field may appear in two canonical files without an index entry resolving the collision.

## Reference-isolation validator (validator rule 6)

Files under `contexts/` must not hard-code risk / correlation / VIX / heat / drawdown / loss-limit numerics. They may only reference canonical fields by path.

## Migration-target validator (validator rule 7)

Every path referenced in `governance/MIGRATION-MAP.md` must exist, or the manifest must explicitly record the file as removed.

## JSON-schema validator (validator rule 8)

For every `*.yaml` that has a companion `canonical/schemas/*.schema.json`, `jsonschema` Draft 2020-12 validation must pass.

## Change Review Questions

For every canonical edit, answer:

1. Does this introduce a new blocker, or only change guidance?
2. Does it change autonomous behavior, supervised behavior, or both?
3. Does it affect one instrument class or all?
4. Does it require a new workflow or incident path?
5. Does it conflict with the binding precedence model?
6. Does it loosen a clamped field? If yes, requires MAJOR version bump.
7. Is there a corresponding entry in `governance/CANONICAL-FIELD-INDEX.md`?

## Required Negative Tests (admission must reject)

- Stale quote.
- Inconsistent account state.
- Unknown instrument metadata.
- Symbol halt or LULD pause.
- Borrow-unknown short sale.
- Duplicate pending order.
- Post-trade heat breach.
- Drawdown / daily-loss breach.
- Clock skew above `policy.runtime.yaml#definitions.clock_skew.untrusted_offset_ms`.
- PDT limit reached.
- 15c3-5 fat-finger band violated.
- MWCB Level 2 active.
- Crypto venue health unknown.
- Stablecoin depeg above threshold.
- Order attempted during opening/closing/halt-reopen auction without explicit auction support.
- Attempted autonomous flatten on untrusted state.
- Tenant override attempts to loosen a clamped field.

## Required Positive Invariants

Enforced via `policy.invariants.yaml`:

- Canonical hash logged on every runtime decision in `autonomous_live`.
- Every state mutation produces an `AuditEntry`.
- Every mode transition records reason + actor.
- Every override application records before/after + approver.
- Promotion to `autonomous_live` is recorded only when all `workflow.lifecycle.yaml#stages.autonomous_live.gates` pass.

## Governance Validation

- Promotion stages are implemented as distinct persisted states.
- Learning cannot mutate live parameters directly.
- Mode changes are audit logged.
- Package revision and hash are stored alongside runtime decisions.
- Override files pass the clamp-rule validator before application.

## Run the Reference Validator

```
pip install pyyaml jsonschema
python tooling/validate/validate_package.py
```

Exit 0 = pass. Exit 1 = findings. Wire into CI as a release blocker.
