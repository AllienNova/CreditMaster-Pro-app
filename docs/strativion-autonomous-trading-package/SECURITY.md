# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `2.5.x-rc`  | ✅ Release candidate; security patches |
| `2.4.x`     | ❌ Superseded by 2.5 |
| `2.3.x`     | ❌ Superseded |
| `< 2.3.0`   | ❌ Known P0 defects; do not deploy |

## Reporting a Vulnerability

**Do not file a public issue.** Reports reach the maintainers fastest via:

- Email: `security@aliennova.com` (same mailbox routes to `president@aliennova.com`).
- PGP key fingerprint: TBD (published alongside the first GA release).

Include in your report:

1. Description of the vulnerability and its impact on a trading system consuming the package.
2. Affected files and/or control IDs from `governance/CANONICAL-FIELD-INDEX.md`.
3. Reproduction steps, including package version and any tenant-override layer state.
4. Your contact details.

### Response SLA

- Acknowledgement within **3 business days**.
- Triage and severity assignment within **7 business days**.
- Fix timeline negotiated based on severity:
  - **Critical** (autonomous trading impact, data-integrity, audit-log corruption): target patch within 7 days.
  - **High** (override bypass, hash-binding flaw, schema drift that enables percent-float): target patch within 30 days.
  - **Medium/Low**: bundled into the next MINOR release per `governance/VERSIONING.md`.

## Scope

### In scope

- Any canonical policy file: `canonical/policy/**/*.yaml`.
- Any canonical workflow: `canonical/workflows/**/*.yaml`.
- Any canonical schema: `canonical/schemas/**/*.json`.
- Governance documents in `governance/`.
- The reference validator at `tooling/validate/`.
- The audit-entry schema and the tenant-override schema.
- Any documented invariant in `canonical/policy/policy.invariants.yaml`.

### Out of scope

- The PCTT strategy engine under `implementations/pctt/engine/` (has its own security policy).
- Reference narrative under `reference/` (non-binding by design).
- Consumer-provided tenant override files (the license explicitly places those outside the package).
- Broker integration adapters (the license explicitly places those outside the package).

## Threat Model Summary

The Package assumes the following threat classes are handled **by the consumer** (not by the Package itself):

- **Network-layer attacks** (TLS, certificate pinning, mTLS to brokers).
- **Host and process isolation** (the Package is data; consumer runs it).
- **Key management** (HSM / KMS per `policy.dr.yaml#kill_switch.authority.key_storage`).
- **Credential storage** (`secrets://...` references in the YAMLs are abstract pointers; the consumer wires them to a secret manager).
- **Runtime memory safety** of consumer code loading the YAMLs.

The Package is responsible for:

- **Policy integrity**: `canonical_hash` binding per `governance/VERSIONING.md §2.3`.
- **Safe-default selection**: `ambiguous_state.action = FREEZE_AND_ALERT` schema-locked.
- **Override narrow-only enforcement**: tenant overrides may not widen (per `governance/OVERRIDE-SCHEMA.md`).
- **Unit integrity**: `_pct ∈ [0,1]` enforced by the validator.
- **Compliance gate completeness**: no autonomous action may bypass PDT / Reg SHO / MWCB / LULD / 15c3-5 gates.

## Disclosure Policy

We follow a coordinated-disclosure model. Reporters who give us time to patch and ship a fix before public disclosure will be credited (with consent) in the release notes.

No bug-bounty program is offered at this time. Severe reports that result in a published CVE may receive a discretionary acknowledgement payment.
