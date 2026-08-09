# Support & SLA

## Support Tiers

The Package is licensed with the following support tiers. The applicable tier is specified in your commercial licensing agreement; for evaluation licenses, default is **Evaluation**.

| Tier            | Response SLA (business hours) | Escalation SLA | Includes |
|-----------------|-------------------------------|----------------|----------|
| **Evaluation**  | Best effort                   | None           | Documentation, GitHub issues |
| **Standard**    | Next business day             | 3 business days| Email, quarterly review call |
| **Enterprise**  | 4 business hours              | Same day       | Email + phone, named support engineer, quarterly SLA review, threat-model review on request |
| **Critical**    | 1 business hour               | 2 business hours | Enterprise + 24/7 pager, root-cause postmortem for every SEV1 touching the Package |

Business hours: Monday–Friday 09:00–17:00 America/New_York, excluding US federal holidays.

## Scope of Support

### In scope

- Canonical policy and workflow files (`canonical/`).
- Schemas (`canonical/schemas/`).
- Reference validator and tooling (`tooling/`).
- Governance documents (`governance/`).
- Documented invariants in `policy.invariants.yaml`.
- Interpretation questions about field ownership per `CANONICAL-FIELD-INDEX.md`.

### Out of scope (consumer-responsible)

- Integration into your runtime, broker, or venue adapters.
- Tenant override authoring (we review, we don't write).
- Strategy implementation (including PCTT, which is a reference engine; production strategies are consumer work).
- Custom jurisdiction compliance beyond the `jurisdiction_scope` declared in `policy.compliance.yaml`.
- Infrastructure (HSM/KMS, PagerDuty, Slack, SIEM — configured by the consumer).
- Broker/market-data feed issues.
- Trading outcomes or P&L.

## Severity Definitions

| Severity | Definition | Example |
|---|---|---|
| **SEV1 — Critical**    | Package defect that could cause data-integrity loss, override-clamp failure, or autonomous flatten on untrusted state. | `ambiguous_state.action` not honoured by a consumer library shipped with the Package. |
| **SEV2 — High**        | Package defect affecting production functionality but with operator-available workaround. | Schema drift causing a valid consumer override to be rejected. |
| **SEV3 — Medium**      | Non-blocking defect; workaround available. | Inconsistent prose in CHANGELOG. |
| **SEV4 — Low**         | Typo, cosmetic. | Spelling error in CONTRIBUTING.md. |

## Release Cadence

- **PATCH** releases: on demand, typically within 1–2 weeks of report.
- **MINOR** releases: quarterly (targeting calendar-quarter end). Tightening-only changes aggregated.
- **MAJOR** releases: annual or on compelling technical need. Every MAJOR has a minimum 30-day deprecation/migration window documented in the CHANGELOG.

See `governance/VERSIONING.md` for the normative version policy.

## Lifecycle

| Phase | Duration | Support level |
|---|---|---|
| **Active**      | Current MAJOR + last MINOR of prior MAJOR | Full support tier |
| **Maintenance** | 6 months after superseded | Security patches only |
| **End-of-life** | After maintenance | No further patches; existing licenses may continue use at own risk |

## Known-Issues Tracking

The current release candidate tracks these open items:

- **W-1** — JSON Schema reconciliation for 11 policy files (target: 2.6.0).
- **W-2** — Complete TypeScript reference validator (target: 2.6.0).
- **W-6** — Machine-readable coverage matrix generator (target: 2.6.0).

See `CHANGELOG.md` for the full history.

## How to Reach Us

| Purpose | Contact |
|---|---|
| General licensing | `president@aliennova.com` |
| Technical support | `support@aliennova.com` |
| Security disclosure | `security@aliennova.com` (see `SECURITY.md`) |
| Enterprise/critical after-hours | Provided in your commercial license agreement |

## What Support Does Not Cover

- **Trading losses** — see LICENSE §5 and §6.
- **Regulatory authorization** — consumer's responsibility.
- **Broker negotiations** — consumer's responsibility.
- **Hardware or cloud-infrastructure failures** — consumer's responsibility.
- **Custom strategy development** — contracted separately.
