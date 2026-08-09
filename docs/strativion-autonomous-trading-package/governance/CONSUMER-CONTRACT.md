# Consumer Contract

## Purpose

Defines how trading apps, agent systems, research tools, and SaaS backends must consume the Strativion Autonomous Trading Package.

## Normative Terms

- `MUST`: required for safe production use
- `SHOULD`: strong recommendation
- `MAY`: optional

## Package Classes

### `canonical/`

Normative package layer. Consumers MUST treat this as the only authoritative source for machine policy.

### `contexts/`

Reasoning layer for LLMs and agents. Consumers MAY load these files into prompts. Consumers MUST NOT allow a context file to override canonical policy, and MUST NOT treat any numeric threshold that appears only in a context file as authoritative. Numeric thresholds come from `canonical/`.

### `reference/`

Historical and explanatory layer. Consumers MAY use these for research, audit, onboarding, and examples. Consumers MUST NOT treat any file under `reference/` as policy. Files under `reference/` carry the legacy percent-float convention and MUST NOT be merged with canonical decimal-fraction values.

### `implementations/`

Reference code and specialized strategy engines (e.g. PCTT). Consumers SHOULD review these implementations but MUST NOT infer authority from code alone. Strategy-specific implementations do not govern global policy.

### `governance/`

Consumption, versioning, overrides, units, validation, and field-index documentation. Binding for consumer behavior, not for market state.

## Mandatory Precedence

1. `canonical/policy/policy.runtime.yaml`
2. `canonical/policy/policy.modes.yaml`
3. `canonical/laws/law.automation-map.yaml`
4. remaining `canonical/policy/`
5. remaining `canonical/workflows/`
6. `contexts/`
7. `reference/`
8. `implementations/`

Field-level precedence is resolved by `governance/CANONICAL-FIELD-INDEX.md`. If a logical control appears in two canonical files without an entry in the field index, the package is invalid and the consumer MUST fail to load.

## Binding Files

### Autonomous runtime

- `canonical/policy/policy.runtime.yaml`
- `canonical/policy/policy.modes.yaml`
- `canonical/laws/law.automation-map.yaml`

### Supporting canonical controls

- `canonical/policy/policy.regimes.yaml`
- `canonical/policy/policy.risk.yaml`
- `canonical/policy/policy.sizing.yaml`
- `canonical/policy/policy.execution.yaml`
- `canonical/policy/policy.portfolio.yaml`
- `canonical/policy/policy.instruments.yaml`
- `canonical/policy/policy.data-quality.yaml`
- `canonical/policy/policy.execution-quality.yaml`
- `canonical/policy/policy.governance.yaml`
- `canonical/policy/policy.compliance.yaml`
- `canonical/policy/policy.order-lifecycle.yaml`
- `canonical/workflows/*.yaml`

These require explicit consumer implementation, not blind execution.

## Conventions

- Unit convention: `decimal_fraction`. See `governance/UNITS.md`.
- Timezone convention: IANA `America/New_York`. See `governance/UNITS.md`.
- Versioning: `governance/VERSIONING.md`.
- Overrides: `governance/OVERRIDE-SCHEMA.md`.

## Prohibited Consumer Behavior

Consumers MUST NOT:

- Merge thresholds from canonical and reference files.
- Treat context files as a source of numeric thresholds.
- Automate human-supervisory checklists in autonomous mode.
- Interpret textbook setups or guides as policy.
- Use strategy-specific implementation details as global law.
- Treat crisis prose as autonomous permission without mode checks.
- Trade an instrument whose tradability, tick size, multiplier, session calendar, or corporate-action state is unknown.
- Place autonomous orders when account, position, or order state is stale or internally inconsistent.
- Allow learning systems to mutate live parameters without approval and versioning.
- Loosen any clamped field via an override (see `OVERRIDE-SCHEMA.md`).
- Autonomously flatten on untrusted state. Flatten on untrusted state requires operator authorization.

## Recommended Enterprise Controls

Consumers SHOULD:

- Pin a package revision (`PACKAGE-MANIFEST#meta.package_version`).
- Compute and log canonical file hashes on every runtime decision.
- Map each automated action to a law and workflow source.
- Keep overrides in a separate tenant layer per `OVERRIDE-SCHEMA.md`.
- Run validation before deployment.
- Maintain broker and market-data abstraction outside the canon.
- Persist operating-mode changes and incident escalations with timestamps and reasons.

## Enterprise Minimums (Required for `autonomous_live`)

- Admission controls (data-quality gate, compliance gate, risk gate, portfolio gate, idempotency gate, pre-trade-risk-control gate).
- Breaker evaluation against `policy.runtime.yaml#drawdown` and `policy.runtime.yaml#loss_limits`.
- Portfolio allocation review against `policy.portfolio.yaml`.
- Instrument metadata validation against `policy.instruments.yaml` and `policy.compliance.yaml`.
- Data-quality health checks against `policy.data-quality.yaml`.
- Execution-quality persistence per `policy.execution-quality.yaml`.
- Promotion-stage governance per `workflow.lifecycle.yaml` (numeric gates).
- Canonical hash logging (required in `autonomous_live`).
