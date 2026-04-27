# Coverage Matrix

This matrix records what the canonical layer covers, at what depth, across instrument classes, modes, and operational concerns. The authoritative machine-readable version is `governance/COVERAGE-MATRIX.yaml`.

**Legend**

- `full` — numeric + behaviour specified in canonical
- `partial` — behaviour specified; tenant/app must parameterise one or more fields
- `ref` — consumer must wire to an external source (broker, venue, calendar vendor)
- `n/a` — not applicable to this class or mode

---

## By Domain × Instrument Class

| Domain                                | Equities | ETFs    | Options | Futures | Crypto  |
|---------------------------------------|----------|---------|---------|---------|---------|
| Session / execution windows           | full     | full    | partial | partial | partial |
| Tick size / multiplier metadata       | ref      | ref     | ref     | ref     | ref     |
| Halt / LULD handling                  | full     | full    | partial | partial | n/a     |
| Auction-state handling                | full     | full    | partial | partial | n/a     |
| Short-sale / locate / SSR             | full     | full    | n/a     | n/a     | partial |
| MWCB                                  | full     | full    | partial | partial | n/a     |
| Corporate action metadata             | partial  | partial | partial | n/a     | n/a     |
| Expiry / assignment / pin risk        | n/a      | n/a     | full    | n/a     | n/a     |
| Roll / first notice / delivery        | n/a      | n/a     | n/a     | full    | n/a     |
| Venue health / outages                | partial  | partial | partial | partial | full    |
| Stablecoin depeg                      | n/a      | n/a     | n/a     | n/a     | full    |
| Weekend / overnight controls          | full     | full    | full    | full    | full    |

## By Domain × Mode

| Domain                                | autonomous_normal | autonomous_restricted | supervised_crisis | manual_only |
|---------------------------------------|-------------------|-----------------------|-------------------|-------------|
| Per-trade risk cap                    | full              | full                  | full              | full (=0)   |
| Portfolio heat                        | full              | full                  | full              | n/a         |
| Drawdown kill-switch                  | full              | full                  | full              | full        |
| Stop management                       | full              | full                  | partial           | n/a         |
| Crisis playbook invocation            | partial           | partial               | full              | n/a         |
| New entries                           | allowed           | restricted            | operator only     | forbidden   |
| Flatten authority                     | automated crisis  | automated crisis      | operator          | operator    |
| Learning-driven parameter change      | forbidden         | forbidden             | forbidden         | forbidden   |

## By Operational Concern

| Concern                                 | Status  | Source                                                                 |
|-----------------------------------------|---------|------------------------------------------------------------------------|
| Data freshness                          | full    | `policy.data-quality.yaml`                                             |
| Clock skew                              | full    | `policy.execution-errors.yaml#clock_skew`                              |
| Outlier-price detection                 | full    | `policy.data-quality.yaml#bad_print`                                   |
| Cross-venue disagreement                | full    | `policy.data-quality.yaml#cross_venue`                                 |
| Duplicate-order detection               | full    | `policy.order-lifecycle.yaml#idempotency`                              |
| Cancel/replace race                     | full    | `policy.order-lifecycle.yaml#cancel_replace` + `#race_conditions`      |
| Partial fill                            | full    | `policy.order-lifecycle.yaml#partial_fill`                             |
| Idempotency                             | full    | `policy.order-lifecycle.yaml#idempotency`                              |
| PDT (US retail)                         | full    | `policy.compliance.yaml#pdt`                                           |
| SEC 15c3-5                              | full    | `policy.compliance.yaml#pre_trade_checks`                              |
| Reg SHO / SSR                           | full    | `policy.compliance.yaml#reg_sho`                                       |
| MWCB L1–L3                              | full    | `policy.compliance.yaml#mwcb`                                          |
| LULD                                    | full    | `policy.compliance.yaml#luld`                                          |
| Best execution                          | partial | `policy.execution-quality.yaml` + consumer venue selection             |
| Tax-lot / wash sale                     | partial | consumer-side; fields referenced in overrides                           |
| Promotion gates                         | full    | `policy.promotion.yaml`                                                |
| Canary / baseline regression            | full    | `policy.promotion.yaml`                                                |
| Override mechanism                      | full    | `governance/OVERRIDE-SCHEMA.md` + `tooling/validate/validate_override.py` |
| Audit entry                             | full    | `canonical/schemas/audit-entry.v1.schema.json` + `tooling/audit/audit_writer.py` |
| Canonical hash binding                  | full    | `canonical/MANIFEST.json` + `tooling/manifest/generate_manifest.py`    |
| Kill switch (4-level)                   | full    | `policy.dr.yaml#kill_switch`                                           |
| RTO / RPO per component                 | full    | `policy.dr.yaml#rto_minutes` + `#rpo_minutes`                          |
| Chaos drills                            | full    | `policy.dr.yaml#chaos_testing`                                         |
| Postmortem SLA                          | full    | `policy.dr.yaml#postmortem`                                            |
| Incident taxonomy (57 codes)            | full    | `policy.incidents.yaml#codes`                                          |
| Escalation roster                       | full    | `policy.incidents.yaml#escalation.rosters`                             |
| Alert sinks                             | full    | `policy.incidents.yaml#sinks`                                          |
| Confluence (pre-trade admission)        | full    | `workflow.confluence.yaml`                                             |
| Tenant registry + platform ceiling      | full    | `policy.tenancy.yaml`                                                  |
| Tenant override validation              | full    | `governance/OVERRIDE-SCHEMA.md` + `validate_override.py`               |
| Per-tenant data retention               | full    | `policy.tenancy.yaml#data_retention`                                   |
| Calendar blackouts (tier-1/tier-2)      | full    | `policy.calendar.yaml`                                                 |

## Known Remaining Consumer Responsibilities

Even with full canonical coverage, consumers MUST provide:

- Venue- and broker-specific adapters (FIX, REST, WebSocket).
- Market-data feed integration matching `policy.data-quality.yaml#staleness`.
- Secrets management (HSM/KMS) per `policy.dr.yaml#kill_switch.authority.key_storage`.
- Local jurisdiction compliance outside `policy.compliance.yaml#meta.jurisdiction_scope`.
- Disaster recovery infrastructure (hot-standby, geographically distinct regions).
- Strategy engines under `implementations/<your-strategy>/`.
- Observability pipeline (PagerDuty, Slack, SIEM routing).

These belong to app overlays, not the canonical package.

## Non-US Jurisdictions (Open)

The Package declares `jurisdiction_scope: [US]`. Non-US deployments MUST add a tenant override covering:

- EU (MiFID II RTS 28, EMIR)
- UK (FCA post-Brexit divergences)
- AU (ASIC)
- HK (SFC)
- SG (MAS)
- CA (IIROC)
- JP (FSA)

Target release for a canonical non-US compliance surface: **2.6.0**.
