# VERSIONING

**Document role:** Defines how canonical policy, schemas, workflows, and the binding layer are versioned; how breaking changes are classified; and how version identity binds to runtime state.

**Schema version:** 1.0.0
**Binding precedence:** Authoritative. Any release or deploy whose identity violates this document must be rejected by CI.

---

## 1. Scope

This document versions:

- `canonical/policy/*.yaml`
- `canonical/workflows/*.yaml`
- `canonical/schemas/*.schema.json`
- `governance/*.md` (when they impose contractual constraints — e.g., `CANONICAL-FIELD-INDEX.md`, `OVERRIDE-SCHEMA.md`)

Out of scope for SemVer (uses date-versioning instead):

- `knowledge/*` (explanatory content; see §9)
- `book/*` (immutable after publication)

## 2. Version identifiers

### 2.1 Package version

A single top-level version `canonical.version` lives in `canonical/VERSION` (SemVer 2.0.0 — `MAJOR.MINOR.PATCH`). This is the version a running trading engine records in every audit entry.

### 2.2 File versions

Each canonical file MUST declare:

```yaml
meta:
  document_role: policy | workflow | schema | governance
  schema_version: 1.3.0       # version of the schema this file conforms to
  file_version: 2.1.4         # version of THIS file's content
  canonical_package_version: 2.5.0  # the package version this file was published under
```

Rules:

- `schema_version` bumps follow §3 and §4 below.
- `file_version` SemVer bumps independently per file, but constrained so that `canonical_package_version` never includes two files whose `file_version` disagree with the package-level delta classification.

### 2.3 Content hash binding

Every deployed canonical package produces a deterministic content hash (`sha256` of the canonical-sorted concatenation of all in-scope files). This hash is:

- Stamped on the release artifact.
- Persisted in every **order audit entry** under `audit.canonical_hash`.
- Checked at process start: runtime refuses to boot if the loaded files' hash disagrees with the artifact manifest.

No order may be emitted unless its audit entry records the exact `canonical_hash` in effect at signal time. This is the **binding** between policy and behavior.

## 3. SemVer rules

| Change class | Version bump | Example |
|---|---|---|
| Add a new **optional** field | MINOR | New tenancy field with a safe default. |
| Add a new **required** field | MAJOR | New required `idempotency.key_strategy`. |
| Tighten a constraint (narrow bound, smaller budget) | MINOR | `heat_normal_max_pct` lowered. |
| Loosen a constraint (widen bound) | MAJOR | `heat_normal_max_pct` raised. |
| Remove a field | MAJOR | Field deleted (must first be deprecated for 2 MINORs). |
| Rename a field | MAJOR | Rename is `remove + add`. |
| Change field type | MAJOR | `string` → `integer`. |
| Change default value (behavior-affecting) | MAJOR | Default `tif: DAY` → `GTC`. |
| Change enum values (remove, rename, reorder meaningfully) | MAJOR | |
| Add enum value | MINOR | |
| Fix a typo in docstring | PATCH | |
| Fix a bug where value did not match documented behavior | MAJOR | Because runtime behavior changes. |

**Key asymmetry:** Tightening is MINOR; loosening is MAJOR. This is deliberate: tightening never increases risk posture, but loosening always might.

## 4. Breaking-change taxonomy

Every MAJOR release must classify each breaking change under one of the following:

| Code | Meaning | Release-note template |
|---|---|---|
| `BRK-SCHEMA` | Schema shape changed | "Field `X` removed. Replacement: `Y`. Migration: …" |
| `BRK-SEMANTICS` | Same schema, different runtime meaning | "Field `X` now interpreted as …" |
| `BRK-DEFAULT` | Default value changed | "Default of `X` changed from `A` to `B` because …" |
| `BRK-UNIT` | Unit convention changed | "Field `X` now in decimal fractions; previously percent-floats." (Forbidden post-v2 — see §8.) |
| `BRK-AUTHORITY` | Ownership moved between files | "Control `R-07` ownership moved from `policy.risk.yaml` to `policy.runtime.yaml`." |
| `BRK-REMOVAL` | Field/file removed | After 2-MINOR deprecation window. |

Release notes **must** list every breaking change with its code and migration steps, or the release is rejected by CI.

## 5. Deprecation policy

1. Introduce replacement in MINOR version `N.M.0` with both old and new fields accepted.
2. Emit a runtime warning whenever the old field is read.
3. Maintain for **at least two subsequent MINOR versions** (`N.M+1`, `N.M+2`).
4. Remove in MAJOR version `N+1.0.0` with `BRK-REMOVAL` code.

During deprecation window, schema allows both forms. Values from old field are auto-mapped; conflicts resolved by raising a hard validation error, never silent precedence.

## 6. Schema-file versioning

`canonical/schemas/*.schema.json` use JSON Schema 2020-12. Each schema file declares `$id` including its major version (e.g., `https://strativion.io/schemas/policy.runtime.v2.schema.json`).

- MAJOR changes produce a new `$id` (parallel-installable).
- Old `$id` remains resolvable for two MAJOR release cycles for audit reproducibility (i.e., you can always re-validate historical package hashes).

## 7. Workflow versioning

Workflows (`canonical/workflows/*.yaml`) version independently per file because a single broken workflow should not force a package MAJOR. However:

- Any workflow whose state-machine graph changes is MAJOR.
- Changing a transition guard's numeric value is **not** possible — workflows carry **no numeric literals** by contract (CANONICAL-FIELD-INDEX §1). They reference `policy.*.yaml#field`. Therefore numeric changes never appear in workflow diffs.

## 8. Hard bans

The following are prohibited in all post-v2.0.0 releases:

- **Percent-floats** (e.g., `1.5` meaning 1.5%). All percents are decimal fractions.
- **Numeric literals in workflows, agents, or knowledge.** Only canonical owners may contain them. CI validator enforces.
- **Silent behavior-affecting defaults.** Every default must be explicit and versioned.
- **Version-less releases.** A canonical package without a manifest hash cannot be loaded.

## 9. Knowledge & book content

`knowledge/*.md` uses date-versioning (`YYYY-MM-DD`) in frontmatter. Knowledge is **explanatory** — if a knowledge document disagrees with a canonical value, the canonical value wins automatically (see `CANONICAL-FIELD-INDEX.md` §Enforcement). Knowledge docs carry no schema enforcement.

`book/*` content is immutable once the book is published. Any corrections are tracked in `book/errata.md`, not inline. The book's printed values may lag current canonical values; the runtime never reads from the book.

## 10. Release process (summary)

1. PR changes canonical file(s).
2. CI runs `tooling/validate/`:
   - Field-index check.
   - No-numeric-literals-outside-owners check.
   - Schema conformance.
   - Cross-field invariants.
   - Version-bump classifier — determines MINOR vs MAJOR and verifies the PR's declared bump matches.
3. If breaking: verify release notes contain `BRK-*` codes.
4. Merge → tag `vX.Y.Z` → build artifact → compute `canonical_hash` → publish manifest.
5. Deploy pipeline loads the artifact; runtime start-up verifies hash; runtime stamps hash into every audit entry.

## 11. Auditability guarantees

Given a historical order, the operator can resolve (from the audit entry's `canonical_hash`):

- Exact file contents in effect.
- Exact schema that validated them.
- Tenant overrides applied.
- Mode and promotion stage at signal time.

This chain is irrevocable evidence of what the system was authorized to do at that moment.

---

## 12. Machine-readable manifest

Each release publishes `canonical/MANIFEST.json`:

```json
{
  "canonical_package_version": "2.5.0",
  "canonical_hash": "sha256:…",
  "files": [
    {"path": "canonical/policy/policy.runtime.yaml", "file_version": "2.5.0", "sha256": "…"},
    {"path": "canonical/policy/policy.compliance.yaml", "file_version": "1.2.0", "sha256": "…"}
  ],
  "schemas": [
    {"id": "https://strativion.io/schemas/policy.runtime.v2.schema.json", "sha256": "…"}
  ],
  "breaking_changes": [
    {"code": "BRK-DEFAULT", "field": "policy.runtime.yaml#risk.portfolio.heat_normal_max_pct", "from": 0.06, "to": 0.05, "reason": "Tightened after Q3 2025 drawdown review."}
  ]
}
```

The manifest is the authoritative boot contract. Runtime refuses to boot on manifest mismatch.
