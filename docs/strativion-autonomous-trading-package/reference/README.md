# `reference/` — NON-BINDING

Everything under this directory is reference material. None of it is canonical policy. None of it is authoritative for machine consumption.

## Contents

| Subdirectory                 | What it is                                                                                       |
|------------------------------|--------------------------------------------------------------------------------------------------|
| `examples/`                  | Sample trades, regime transitions, blow-up postmortems. Illustrative.                            |
| `guides/`                    | Narrative guides (risk management, crisis playbook). Legacy numerics preserved but not binding.  |
| `manuscript/`                | Source textbook chapters, front matter, marketing. Historical.                                   |
| `market-playbooks/`          | Per-asset-class textbook playbooks (equities, options, futures, etc.). Non-binding.              |
| `playbooks/`                 | Legacy entry-setups and exit-rules (demoted from canonical in 2.2.0).                            |
| `seasonality/`               | Seasonal statistics and commentary. Superseded by `canonical/policy/policy.calendar.yaml`.       |

## Rules for consumers

- **Never** load files under `reference/` as policy or as a source of numeric thresholds.
- **Never** cite `reference/` material in an agent prompt as justification for an autonomous action.
- Legacy percent-float units survive here. Canonical uses decimal fractions. Do not merge.
- When a reference file contradicts canonical, canonical wins silently.
- Chapter citations and author attribution are preserved for historical traceability. They carry no authority.

If a piece of reference material turns out to be enforceable policy, it must be promoted into `canonical/` with a proper `meta:` block, decimal-fraction units, IANA timezones, and an entry in `governance/CANONICAL-FIELD-INDEX.md`.
