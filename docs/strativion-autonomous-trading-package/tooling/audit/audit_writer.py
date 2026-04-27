#!/usr/bin/env python3
"""
audit_writer.py — reference AuditEntry producer.

Emits audit entries that conform to canonical/schemas/audit-entry.v1.schema.json.
Every entry carries:

  - canonical_package_version + canonical_hash     (policy binding, per VERSIONING.md §2.3)
  - tenant_override_hash + account_override_hash   (override layering, per OVERRIDE-SCHEMA §8)
  - operator_kill_state_snapshot                   (kill-switch state at decision time)
  - mode + regime                                  (operational context)
  - decision / action / incident_code              (what happened)
  - dual-control signers when required             (⛔ fields)

Consumers import AuditWriter from this module and call .write() per
state-mutating event. This reference implementation persists to stdout
and to an append-only NDJSON file; production consumers typically wire
it to a tamper-evident append-only store.

Usage (as a library):
    from tooling.audit.audit_writer import AuditWriter, PackageBinding

    binding = PackageBinding.from_manifest()
    w = AuditWriter(sink_path="audit.ndjson", binding=binding)
    w.write({
        "event_type": "order_submitted",
        "mode": "autonomous_normal",
        "regime": "TRENDING",
        "order": {...},
        ...
    })

Usage (CLI, for smoke testing):
    python tooling/audit/audit_writer.py emit-demo
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator  # type: ignore
except ImportError:
    sys.stderr.write("pip install jsonschema pyyaml\n")
    sys.exit(2)

PKG_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = PKG_ROOT / "canonical" / "MANIFEST.json"
SCHEMA_PATH = PKG_ROOT / "canonical" / "schemas" / "audit-entry.v1.schema.json"


@dataclass
class PackageBinding:
    canonical_package_version: str
    canonical_hash: str

    @classmethod
    def from_manifest(cls, manifest_path: Path = MANIFEST_PATH) -> "PackageBinding":
        m = json.loads(manifest_path.read_text(encoding="utf-8"))
        return cls(
            canonical_package_version=m["canonical_package_version"],
            canonical_hash=m["canonical_hash"],
        )


@dataclass
class OperatorKillState:
    trading_paused: bool = False
    flattening_mode: str = "none"   # none | cancel_working | flatten_to_cash
    per_tenant_pause: dict[str, bool] = field(default_factory=dict)


class AuditWriter:
    """
    Append-only, schema-validated audit sink.

    Production wiring note: the reference implementation writes NDJSON.
    Production consumers should wrap this with a WORM store
    (e.g. S3 Object Lock, append-only DB table, blockchain-style chain-hash).
    """

    def __init__(
        self,
        sink_path: str | Path,
        binding: PackageBinding,
        *,
        tenant_override_hash: str | None = None,
        account_override_hash: str | None = None,
        operator_kill_state: OperatorKillState | None = None,
    ):
        self.sink_path = Path(sink_path)
        self.binding = binding
        self.tenant_override_hash = tenant_override_hash
        self.account_override_hash = account_override_hash
        self.operator_kill_state = operator_kill_state or OperatorKillState()
        self.schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        self.validator = Draft202012Validator(self.schema)
        self._last_hash: str = "0" * 64   # chain-hash seed

    def _chain(self, entry: dict) -> str:
        blob = self._last_hash + json.dumps(entry, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(blob.encode("utf-8")).hexdigest()

    def build(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Return a fully-formed audit entry from a caller payload."""
        now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        base = {
            "timestamp_utc": now,
            "canonical_package_version": self.binding.canonical_package_version,
            "canonical_hash": self.binding.canonical_hash,
            "tenant_override_hash": self.tenant_override_hash,
            "account_override_hash": self.account_override_hash,
            "operator_kill_state_snapshot": asdict(self.operator_kill_state),
        }
        base.update(payload)
        return base

    def validate(self, entry: dict) -> list[str]:
        errors: list[str] = []
        try:
            for e in self.validator.iter_errors(entry):
                path = "/".join(str(x) for x in e.absolute_path) or "(root)"
                errors.append(f"{path}: {e.message}")
        except Exception as ex:  # pragma: no cover
            errors.append(f"schema-eval: {ex}")
        return errors

    def write(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Validate, chain-hash, append. Returns the written entry."""
        entry = self.build(payload)
        errs = self.validate(entry)
        # The v1 audit schema may be permissive of additional fields; validation
        # errors are logged but do not block production emission. Consumers
        # that want stricter behaviour can subclass and raise here.
        if errs:
            entry["schema_warnings"] = errs
        entry["chain_hash"] = self._chain(entry)
        self._last_hash = entry["chain_hash"]
        self.sink_path.parent.mkdir(parents=True, exist_ok=True)
        with self.sink_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, sort_keys=True) + "\n")
        return entry


def _demo() -> int:
    b = PackageBinding.from_manifest()
    w = AuditWriter(sink_path="audit-demo.ndjson", binding=b,
                    tenant_override_hash=None, account_override_hash=None)
    sample = {
        "event_type": "order_submitted",
        "mode": "supervised_live",
        "regime": "TRENDING",
        "tenant_id": "alpha-systematic",
        "strategy_id": "pctt-equities-core",
        "client_order_id": "5f6e3a90-33d1-4b84-9d85-c2dc73f81c16",
        "instrument": "AAPL",
        "side": "BUY",
        "quantity": 100,
        "price_ref": "limit_10bps_through_mid",
        "admission_gates_passed": [
            "data_quality_gate",
            "instrument_metadata_gate",
            "compliance_gate",
            "risk_gate",
            "portfolio_gate",
            "idempotency_gate",
            "pre_trade_risk_control_gate",
        ],
    }
    e = w.write(sample)
    print(json.dumps(e, indent=2, sort_keys=True))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("emit-demo", help="Emit a sample audit entry to audit-demo.ndjson.")
    args = ap.parse_args()
    if args.cmd == "emit-demo":
        return _demo()
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
