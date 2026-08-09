# Contributing

Thank you for your interest in improving the Strativion Autonomous Trading Package. This document describes how to propose, review, and land changes.

The Package is **proprietary** (see `LICENSE`). External contributions are accepted only under a signed contributor agreement. Internal contributors follow the process below.

---

## Change classes

Before opening a PR, determine the class:

| Class | Requires | Gates |
|---|---|---|
| **Typo / doc fix** | PR + reviewer | CI green, version bump: PATCH |
| **New optional field in canonical** | PR + reviewer + CANONICAL-FIELD-INDEX update | CI green, version bump: MINOR |
| **New canonical file** | PR + dual reviewer (engineering + compliance) + field-index update + schema | CI green, version bump: MINOR |
| **Tightening an existing threshold** | PR + reviewer | CI green, version bump: MINOR |
| **Loosening any threshold** | Dual-control PR (two approvers: engineering + risk) + CHANGELOG `BRK-*` entry | CI green, version bump: **MAJOR** |
| **Renaming / removing a field** | Must go through a 2-MINOR deprecation window first | Version bump: MAJOR at removal |
| **Reference / manuscript update** | PR + reviewer | Version bump: PATCH |

Loosening a risk, compliance, or safety threshold is **always** a MAJOR version bump and requires a written rationale in the CHANGELOG with a `BRK-SEMANTICS` or `BRK-DEFAULT` code.

---

## Pull-request checklist

Before requesting review:

- [ ] `python tooling/validate/validate_package.py` passes (`OK - all validator rules pass.`).
- [ ] `python tooling/manifest/generate_manifest.py --write` regenerates `canonical/MANIFEST.json`.
- [ ] Every new field has an entry in `governance/CANONICAL-FIELD-INDEX.md` with a control ID (R-/S-/E-/C-/D-/K-/M-/I-/DR-/T- prefix).
- [ ] Every new canonical file has a JSON Schema entry under `canonical/schemas/`.
- [ ] Every change to `canonical/` carries a CHANGELOG entry under `## [Unreleased]` with the correct `Added / Changed / Removed / Fixed / Security` group.
- [ ] Unit convention honoured: every `_pct` field is a decimal fraction in `[0, 1]`.
- [ ] Timezone convention honoured: every session-time field uses IANA `America/New_York` (UTC is acceptable for cron/reconciliation contexts only).
- [ ] No numeric literal added to `contexts/` or `canonical/workflows/`; thresholds reference canonical owners by path.
- [ ] `state_untrusted` is never routed to a flatten action.
- [ ] Override-rights annotation (`🔒 locked`, `⬇ narrow-only`, `↔ bidirectional`, `⛔ dual-control`) set for every new field.
- [ ] Jurisdiction scope reviewed if the change affects `policy.compliance.yaml`.

Reviewers verify every box before approving.

---

## Adding a canonical policy file

1. Propose the file in an issue first, naming its proposed control-ID range and override-rights.
2. Draft the YAML with a proper `meta:` block: `document_role: policy`, `schema_version`, `file_version`, `canonical_package_version`, `owned_controls`, `index_authority`, `override_rights`.
3. Draft a companion schema under `canonical/schemas/<name>.v1.schema.json`. Set `additionalProperties: true` for top-level extensions; keep strict bounds on numeric fields (`_pct: [0, 1]`, `_bps: integer >= 0`, etc.).
4. Add the file to `governance/PACKAGE-MANIFEST.yaml#supporting_canonical_files` (or `binding_files` for precedence-top files).
5. Extend `governance/CANONICAL-FIELD-INDEX.md` with a new section listing every owned control.
6. If the file introduces cross-field invariants, enumerate them in `policy.invariants.yaml` with a violation incident code from `policy.incidents.yaml`.
7. Add the schema binding to `tooling/validate/validate_package.py` `SCHEMA_BINDINGS`.
8. Update `CHANGELOG.md`.

---

## Adding a new workflow

1. Workflows carry **zero numeric literals**. Every guard is a reference to a canonical owner path. The validator blocks merges that violate this.
2. State machines live in the corresponding `policy.*` file; workflows `depends_on` the policy by `source_ref`.
3. `on_fail` for safety-critical steps must be `freeze_and_alert`, not a position-modifying action.

---

## Tenant-override contributions

Tenant overrides are **consumer-side artefacts**. They do not live in this repository. The override validator (`tooling/validate/validate_override.py`) is shipped for vendors to run against their own override files.

If a tenant needs a control that does not yet exist in canon, the path is:

1. Open an issue proposing the new canonical field.
2. Track it through the normal MINOR-release process.
3. Do **not** work around the gap by encoding a tenant-level numeric that has no canonical owner.

---

## Security

See `SECURITY.md`. Never file a public issue for a security flaw.

---

## Code of conduct

- No adversarial / deceptive PR content.
- No experimental risk-loosening code paths merged "for later cleanup."
- No commented-out compliance gates.
- No code or YAML that references non-existent canonical paths — the CI catches it; fix it before pushing.

---

## Contacts

- Technical / architecture: `engineering@aliennova.com` (routes to Kimal)
- Risk / compliance: `risk@aliennova.com` (routes to Kimal)
- Licensing / legal: `legal@aliennova.com`
- Security: `security@aliennova.com`
