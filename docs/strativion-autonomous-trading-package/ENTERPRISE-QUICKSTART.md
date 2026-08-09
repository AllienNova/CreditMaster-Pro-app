# Enterprise Integration Quickstart

Target audience: vendor integrators bringing the Strativion Autonomous Trading Package into a licensed trading product.
Estimated time: **30 minutes** from clone to first admission-gated order.

---

## What you get

- **20 canonical policy files** — risk, portfolio, compliance, DR, tenancy, incidents, promotion, calendar, order lifecycle, execution quality/errors, data quality, modes, regimes, instruments, governance, correlations, sizing, invariants.
- **7 canonical workflows** — confluence pipeline, order lifecycle, crisis, incidents, lifecycle, correlation, checklists.
- **15 JSON Schemas 2020-12** — including `audit-entry.v1` and `tenant-override.v1`.
- **Governance layer** — field index, versioning policy, override schema, consumer contract, units, validation rules, coverage matrix, migration map.
- **Reference tooling (Python)** — package validator, override validator, manifest generator, audit-entry writer.

## What you bring

- Broker/venue adapters (the package defines what to do; you wire the "how").
- Market data feed integration (per `policy.data-quality.yaml#staleness`).
- Secrets manager (HSM/KMS) for keys referenced as `secrets://...`.
- Paging / alert sinks (the package defines severities + sinks; you wire PagerDuty/Slack/SMS/email).
- Your own strategy implementation under `implementations/<your-strategy>/`.

---

## 1. Install the tooling (2 min)

```bash
cd tooling
pip install -e .

# Or simply:
pip install pyyaml jsonschema
```

Verify the package integrity:

```bash
python tooling/validate/validate_package.py
# → OK - all validator rules pass.

python tooling/manifest/generate_manifest.py --check
# → MANIFEST OK
```

## 2. Pin the package version + hash (3 min)

Your runtime MUST record the `canonical_hash` on every decision. Load from `canonical/MANIFEST.json` at boot:

```python
import json
from pathlib import Path

manifest = json.loads(Path("canonical/MANIFEST.json").read_text())
CANONICAL_HASH = manifest["canonical_hash"]
CANONICAL_PACKAGE_VERSION = manifest["canonical_package_version"]
```

Refuse to boot if hash disagrees with your pinned expectation (see `governance/VERSIONING.md §2.3`).

## 3. Load canonical policy (5 min)

```python
import yaml
from pathlib import Path

CANONICAL = Path("canonical/policy")

policy = {
    f.stem: yaml.safe_load(f.read_text())
    for f in CANONICAL.glob("*.yaml")
}

# Read the binding thresholds at the authoritative paths:
PER_TRADE_HARD_MAX_PCT    = policy["policy.runtime"]["risk"]["per_trade"]["hard_max_pct"]
HEAT_NORMAL_MAX_PCT       = policy["policy.runtime"]["risk"]["portfolio"]["heat_normal_max_pct"]
DRAWDOWN_KILL_PCT         = policy["policy.runtime"]["risk"]["kill_switch"]["drawdown_pct"]
AMBIGUOUS_STATE_ACTION    = policy["policy.dr"]["ambiguous_state"]["action"]   # MUST be "FREEZE_AND_ALERT"

assert AMBIGUOUS_STATE_ACTION == "FREEZE_AND_ALERT", "Safe default violated — refuse to boot."
```

Resolve any field-ownership question via `governance/CANONICAL-FIELD-INDEX.md`.

## 4. Apply the tenant override (5 min)

```python
from tooling.validate.validate_override import validate_override_file

findings = validate_override_file(Path("overrides/acme.yaml"))
if findings:
    raise SystemExit(f"tenant override rejected: {findings}")
```

Tenant overrides **may only tighten**, never loosen. The validator rejects widening, locked-field edits, or dual-control-field edits without 2 distinct signers.

## 5. Wire the admission pipeline (10 min)

The pre-trade gate order is canonical (see `canonical/policy/policy.order-lifecycle.yaml#pre_submission_sequence`):

```python
def admit(order):
    must_pass_in_order = [
        data_quality_gate,          # policy.data-quality.yaml
        instrument_metadata_gate,   # policy.instruments.yaml
        compliance_gate,            # policy.compliance.yaml
        risk_gate,                  # policy.runtime.yaml#risk
        portfolio_gate,             # policy.portfolio.yaml + policy.runtime.yaml#risk.portfolio
        idempotency_gate,           # policy.order-lifecycle.yaml#idempotency
        pre_trade_risk_control_gate,# policy.compliance.yaml#pre_trade_checks (SEC 15c3-5)
    ]
    for gate in must_pass_in_order:
        if not gate(order):
            raise OrderRejected(f"{gate.__name__} failed")
    return order
```

`workflow.confluence.yaml` is the authoritative reference for this pipeline.

## 6. Wire the audit trail (5 min)

```python
from tooling.audit.audit_writer import AuditWriter, PackageBinding, OperatorKillState

binding = PackageBinding.from_manifest()
audit = AuditWriter(
    sink_path="/var/log/strativion/audit.ndjson",
    binding=binding,
    tenant_override_hash=tenant_hash_or_None,
    operator_kill_state=OperatorKillState(trading_paused=False),
)

audit.write({
    "event_type": "order_submitted",
    "mode": mode,
    "regime": regime,
    "tenant_id": tenant_id,
    "client_order_id": cl_ord_id,
    "instrument": symbol,
    "side": "BUY",
    "quantity": qty,
})
```

Production consumers should wrap this sink with a WORM store (S3 Object Lock, append-only DB, etc.).

## 7. Consume incident events (ongoing)

The incident taxonomy is in `canonical/policy/policy.incidents.yaml`. Wire your runtime to emit these codes exactly; your sinks (PagerDuty, Slack, SIEM) key off the `severity` and `default_action` fields defined there.

Critical actions the runtime MUST obey:

- `FREEZE_AND_ALERT` — pause all new order entry, cancel working orders (idempotent), preserve positions, page on-call. **Never flatten.**
- `PAUSE_SYMBOL` / `PAUSE_STRATEGY` / `PAUSE_TENANT` / `PAUSE_PLATFORM` — scoped halts.
- `ALERT_ONLY` — log and page; no trading-state change.
- `DEGRADE_TO_PAPER` — route all subsequent signals to paper.
- `DEMOTE_PROMOTION_STAGE` — rollback one stage per `policy.promotion.yaml`.

`FLATTEN` appears only under explicit `policy.dr.yaml#kill_switch.levels.LEVEL_4_FLATTEN` with dual-control AT TIME OF USE.

---

## CI / CD Integration

Add to your CI pipeline:

```yaml
- name: Validate Strativion policy package
  run: |
    pip install pyyaml jsonschema
    python tooling/validate/validate_package.py
    python tooling/manifest/generate_manifest.py --check
```

Any change to `canonical/` that does not regenerate `canonical/MANIFEST.json` will fail CI.

---

## Production deployment checklist

Before flipping your strategy to `autonomous_live`, confirm:

- [ ] Pinned canonical package version and hash are recorded in your deployment artifact.
- [ ] Hash verified at boot; mismatch → process refuses to start.
- [ ] Tenant override (if any) passes `validate_override.py` in CI.
- [ ] All 7 admission gates implemented and exercised by integration tests.
- [ ] Every incident code in `policy.incidents.yaml#codes` is handled by your runtime or explicitly documented as "not applicable to this strategy."
- [ ] `policy.dr.yaml#ambiguous_state.action` enforced: your runtime cannot autonomously flatten on untrusted state.
- [ ] Kill-switch LEVEL_1 through LEVEL_4 wired with dual-control per `policy.dr.yaml#kill_switch.authority`.
- [ ] Promotion gates in `policy.promotion.yaml` enforced; the system cannot self-promote beyond the dwell window or skip canary.
- [ ] Your jurisdiction matches `policy.compliance.yaml#meta.jurisdiction_scope`; non-US deployments carry a tenant override covering your local rules.
- [ ] PagerDuty / Slack / SMS / email / audit-log sinks implement the `policy.incidents.yaml#sinks` contract including `min_severity` and category routing.
- [ ] Chaos drills from `policy.dr.yaml#chaos_testing.drills` scheduled quarterly in non-trading hours.
- [ ] Postmortem SLA for SEV1 incidents matches `policy.dr.yaml#postmortem` (5 business days, blameless, tracked).
- [ ] Data retention matches `policy.tenancy.yaml#data_retention` (7 years US-regulated, 5 years elsewhere) with WORM guarantees.

---

## Common mistakes

| Mistake | Why it's fatal | Prevention |
|---|---|---|
| Reading thresholds from `contexts/` or `reference/` | Those layers are non-binding; may contain legacy numerics | Only read from `canonical/`. Validator rule 6 catches it in CI. |
| Forgetting the `canonical_hash` on audit entries | Policy chain breaks; audit unusable for litigation | `AuditWriter.from_manifest()` binds it automatically. |
| Allowing an override to widen a ceiling | Silent risk increase | `validate_override.py` rejects; wire it pre-deploy. |
| Routing `state_untrusted` to flatten | Catastrophic in partial-outage conditions | Schema locks `ambiguous_state.action` to `FREEZE_AND_ALERT`. |
| Skipping an admission gate "because upstream checked it" | Defence-in-depth lost | Run all 7 gates in order, always. |
| Silent mode promotion | Bypasses operator ack and flap protection | `policy.modes.yaml#transitions.promotion_requires_operator_ack_from` enumerates the modes that require explicit ack. |
| Percent-float values in overrides | Unit drift → 100x sizing error | Validator rejects `_pct > 1`; use decimal fractions (`0.01 = 1%`). |

---

## Where to go next

1. `README.md` — full integration guide.
2. `governance/CONSUMER-CONTRACT.md` — normative consumer contract.
3. `governance/CANONICAL-FIELD-INDEX.md` — authoritative field-ownership grid.
4. `governance/OVERRIDE-SCHEMA.md` — tenant override mechanics.
5. `governance/VERSIONING.md` — release and hash-binding contract.
6. `SUPPORT.md` — SLA + lifecycle.
7. `CHANGELOG.md` — release history + breaking-change taxonomy.

For licensing inquiries: `president@aliennova.com`.
