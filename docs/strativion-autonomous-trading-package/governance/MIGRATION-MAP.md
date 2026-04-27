# Migration Map

## Purpose

This document describes how legacy consumers should re-point at the current `strativion-autonomous-trading-package` layout.

## Path Changes

| Old path                            | New path                                                           | Notes                                                                          |
|-------------------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------------------|
| `config/`                           | `canonical/policy/`                                                | All YAML configs are now policy documents.                                     |
| `rules/`                            | `canonical/workflows/`                                             | Rule files became workflow documents.                                          |
| `knowledge/`                        | `reference/knowledge/`                                             | Superseded in 2.3.0-rc1. Earlier move to contexts/ was reverted; narrative with legacy numerics belongs in reference. |
| `agent-contexts/`                   | `contexts/agent-contexts/`                                         | Agent briefings moved under `contexts/`.                                       |
| `python-formulas/`                  | `implementations/python-formulas/`                                 | Illustrative code, non-binding.                                                |
| `pctt/` (root)                      | `implementations/pctt/`                                            | Strategy-specific implementation moved under `implementations/`.               |
| `examples/`                         | `reference/examples/`                                              | Non-binding sample data.                                                       |
| `market-playbooks/`                 | `reference/market-playbooks/`                                      | Non-binding asset-class playbooks.                                             |
| `manuscript/`                       | `reference/manuscript/`                                            | Source textbook, non-binding.                                                  |
| `seasonality.yaml` (in config/)     | `reference/seasonality/seasonality.yaml`                           | Demoted from canonical to reference (commentary + statistics, not policy).     |
| `system.yaml` (in config/)          | removed; superseded by `canonical/policy/policy.runtime.yaml`      | Values live in runtime policy; duplicated file removed to eliminate drift.     |
| `rules/entry-setups.yaml`           | `reference/playbooks/entry-setups.yaml`                            | Strategy-specific setups are reference material, not machine policy.           |
| `rules/exit-rules.yaml`             | `reference/playbooks/exit-rules.yaml`                              | Strategy-specific exits are reference material, not machine policy.            |
| `.claude/`                          | `tooling/claude/`                                                  | Editor/assistant configuration moved under `tooling/`.                         |
| `contexts/knowledge/context.guide.risk-management.md` | `reference/guides/guide.risk-management.md`      | Moved; legacy narrative. Removed from contexts/ in 2.3.0-rc1.                  |
| `contexts/knowledge/context.guide.crisis-playbook.md` | `reference/guides/guide.crisis-playbook.md`      | Moved; legacy narrative. Removed from contexts/ in 2.3.0-rc1.                  |
| `contexts/knowledge/` (context.law.*)                 | `reference/knowledge/` (law.NN-*.md)             | 30-laws narrative moved to reference; numerics-laden case studies kept as history. |
| `contexts/knowledge/context.guide.position-sizing.md` | `reference/knowledge/guide.position-sizing.md`   | Moved; narrative.                                                              |
| `contexts/knowledge/context.guide.regime-detection.md`| `reference/knowledge/guide.regime-detection.md`  | Moved; narrative.                                                              |
| `contexts/knowledge/context.guide.market-microstructure.md`| `reference/knowledge/guide.market-microstructure.md` | Moved; narrative.                                                        |

## New Canonical Files

| File                                                    | Purpose                                                        |
|---------------------------------------------------------|----------------------------------------------------------------|
| `canonical/policy/policy.compliance.yaml`               | PDT, SEC 15c3-5, Reg SHO, MWCB, LULD, auction-state rules.     |
| `canonical/policy/policy.order-lifecycle.yaml`          | Idempotency, duplicate resolution, cancel/replace, partials.   |
| `governance/CANONICAL-FIELD-INDEX.md`                   | One-source-of-truth registry for every logical control.        |
| `governance/UNITS.md`                                   | Unit and timezone conventions for the canonical layer.         |
| `governance/VERSIONING.md`                              | SemVer rules for canonical changes and hash-binding.           |
| `governance/OVERRIDE-SCHEMA.md`                         | Tenant/app override layer schema, outside canon.               |

## Consumer Update Rule

If an app previously referenced old paths directly:

1. Update references to the new canonical structure.
2. Pin the package version (`governance/PACKAGE-MANIFEST.yaml#meta.package_version`).
3. Record the package revision and canonical file hashes alongside runtime decisions (required in `autonomous_live`).
4. Stop reading any file that is not listed in `governance/PACKAGE-MANIFEST.yaml#binding_files` or `supporting_canonical_files` as a policy source.
5. Apply tenant/app overrides via the mechanism defined in `governance/OVERRIDE-SCHEMA.md`; do not edit canonical files.
