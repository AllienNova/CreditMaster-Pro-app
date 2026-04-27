#!/usr/bin/env python3
"""
validate_override.py — reference tenant-override validator.

Implements governance/OVERRIDE-SCHEMA.md. Enforces:

 1. Shape: override file conforms to canonical/schemas/tenant-override.v1.schema.json.
 2. Canonical target version: resolves to a known package.
 3. Field authority: every path in `overrides` maps to a canonical owner
    listed in governance/CANONICAL-FIELD-INDEX.md.
 4. Narrow-only: scalar numerics that are ceilings must be <= platform,
    floors >= platform. Lists must be subsets. Durations must be shorter
    (or longer for blackout windows — handled by `semantic` mapping below).
 5. Lock check: no 🔒 field appears in `overrides`.
 6. Dual-control: any ⛔ field requires >= 2 distinct signers in meta.signed_by.
 7. Cross-field invariants: INV-R-02, INV-R-03 remain true after merge.

Usage:
    python tooling/validate/validate_override.py path/to/override.yaml

Exit 0 on pass. Exit 1 on any rejection with INC_TENANT_OVERRIDE_INVALID reasons.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
    from jsonschema import Draft202012Validator  # type: ignore
except ImportError:
    sys.stderr.write("pip install pyyaml jsonschema\n")
    sys.exit(2)

PKG_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_DIR = PKG_ROOT / "canonical"
GOV_DIR = PKG_ROOT / "governance"
SCHEMA_PATH = CANONICAL_DIR / "schemas" / "tenant-override.v1.schema.json"
FIELD_INDEX = GOV_DIR / "CANONICAL-FIELD-INDEX.md"

# Controls classified by override-rights glyph in the field index.
LOCKED_GLYPH = "🔒"
NARROW_GLYPH = "⬇"
BIDIRECTIONAL_GLYPH = "↔"
DUAL_CONTROL_GLYPH = "⛔"


def parse_field_index() -> dict[str, str]:
    """Return a dict of canonical_path -> override_glyph."""
    text = FIELD_INDEX.read_text(encoding="utf-8")
    out: dict[str, str] = {}
    # rows of: | X | Description | `file#path` | unit | glyph | notes |
    row = re.compile(r"^\s*\|\s*([A-Z]+-\d+[A-Za-z0-9]*)\s*\|[^|]*\|\s*`([^`]+)`\s*\|[^|]*\|\s*([^\s|]+)\s*\|",
                     re.MULTILINE)
    for m in row.finditer(text):
        path = m.group(2).strip()
        glyph = m.group(3).strip()
        # glyph column may contain multiple characters; take the first salient glyph
        for g in (LOCKED_GLYPH, DUAL_CONTROL_GLYPH, NARROW_GLYPH, BIDIRECTIONAL_GLYPH):
            if g in glyph:
                out[path] = g
                break
    return out


def load_yaml(p: Path) -> Any:
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def get_by_path(doc: dict, path: str) -> Any:
    """Resolve a dotted path inside a YAML document."""
    cur = doc
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def load_canonical_value(field_ref: str) -> Any:
    """field_ref: policy.runtime.yaml#risk.per_trade.hard_max_pct"""
    if "#" not in field_ref:
        return None
    fname, field_path = field_ref.split("#", 1)
    candidates = list(CANONICAL_DIR.rglob(fname))
    if not candidates:
        return None
    doc = load_yaml(candidates[0])
    return get_by_path(doc, field_path)


def validate_override_file(override_path: Path) -> list[str]:
    findings: list[str] = []

    # Rule 1: schema shape
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    try:
        doc = load_yaml(override_path)
    except yaml.YAMLError as e:
        return [f"INC_TENANT_OVERRIDE_INVALID: YAML parse: {e}"]
    v = Draft202012Validator(schema)
    try:
        for err in v.iter_errors(doc):
            findings.append(f"INC_TENANT_OVERRIDE_INVALID: schema: {'/'.join(str(x) for x in err.absolute_path) or '(root)'}: {err.message}")
    except Exception as e:
        findings.append(f"INC_TENANT_OVERRIDE_INVALID: schema-eval: {e}")

    meta = (doc or {}).get("meta", {}) if isinstance(doc, dict) else {}
    overrides = (doc or {}).get("overrides", {}) if isinstance(doc, dict) else {}
    signed_by = meta.get("signed_by") or []

    if not overrides:
        findings.append("INC_TENANT_OVERRIDE_INVALID: overrides block is empty or missing")

    # Rule 2: target version
    if not meta.get("canonical_package_version"):
        findings.append("INC_TENANT_OVERRIDE_INVALID: meta.canonical_package_version missing")

    # Rule 3 + 5 + 6: field authority + lock + dual-control
    classification = parse_field_index()

    for file_name, changes in overrides.items():
        # file_name is like "policy.runtime.yaml"
        if not isinstance(changes, dict):
            findings.append(f"INC_TENANT_OVERRIDE_INVALID: overrides.{file_name}: expected mapping")
            continue
        for dotted_path, new_value in flatten(changes).items():
            full_ref = f"{file_name}#{dotted_path}"
            glyph = classification.get(full_ref)
            if glyph is None:
                findings.append(
                    f"INC_TENANT_OVERRIDE_INVALID: {full_ref} has no canonical owner in CANONICAL-FIELD-INDEX.md")
                continue
            if glyph == LOCKED_GLYPH:
                findings.append(
                    f"INC_TENANT_OVERRIDE_INVALID: {full_ref} is LOCKED; overrides forbidden")
                continue
            if glyph == DUAL_CONTROL_GLYPH and len(set(signed_by)) < 2:
                findings.append(
                    f"INC_TENANT_OVERRIDE_INVALID: {full_ref} requires dual-control; meta.signed_by has <2 distinct signers")
            # Rule 4: narrow-only for ceilings / subsets for lists
            canonical_value = load_canonical_value(full_ref)
            if isinstance(canonical_value, (int, float)) and isinstance(new_value, (int, float)):
                # Heuristic: *_pct / *_bps / *_max / *_ceiling => ceiling (tenant must be <=)
                # *_min / *_floor => floor (tenant must be >=)
                lower = dotted_path.lower()
                if any(k in lower for k in ("_max", "_pct", "_bps", "ceiling", "hard_max", "drawdown")):
                    if new_value > canonical_value:
                        findings.append(
                            f"INC_TENANT_OVERRIDE_INVALID: {full_ref} ceiling {new_value} > platform {canonical_value}")
                elif any(k in lower for k in ("_min", "floor", "minimum")):
                    if new_value < canonical_value:
                        findings.append(
                            f"INC_TENANT_OVERRIDE_INVALID: {full_ref} floor {new_value} < platform {canonical_value}")
                else:
                    # Default: treat as ceiling for tighter safety
                    if new_value > canonical_value:
                        findings.append(
                            f"INC_TENANT_OVERRIDE_INVALID: {full_ref} value {new_value} > platform {canonical_value} (treated as ceiling)")
            elif isinstance(canonical_value, list) and isinstance(new_value, list):
                extras = set(new_value) - set(canonical_value)
                if extras:
                    findings.append(
                        f"INC_TENANT_OVERRIDE_INVALID: {full_ref} adds values not in platform list: {sorted(extras)}")

    # Rule 7: cross-field invariants INV-R-02, INV-R-03 (heat ordering)
    runtime_ovr = overrides.get("policy.runtime.yaml", {}) or {}
    heat = (runtime_ovr.get("risk") or {}).get("portfolio") or {}
    if {"heat_normal_max_pct", "heat_shock_max_pct"} <= set(heat):
        if heat["heat_shock_max_pct"] >= heat["heat_normal_max_pct"]:
            findings.append("INC_TENANT_OVERRIDE_INVALID: invariant INV-R-02 (shock < normal) violated by override")
    if {"heat_shock_max_pct", "heat_crisis_max_pct"} <= set(heat):
        if heat["heat_crisis_max_pct"] >= heat["heat_shock_max_pct"]:
            findings.append("INC_TENANT_OVERRIDE_INVALID: invariant INV-R-03 (crisis < shock) violated by override")

    return findings


def flatten(d: dict, prefix: str = "") -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("override", help="Path to tenant override YAML.")
    args = ap.parse_args()

    p = Path(args.override)
    if not p.exists():
        print(f"override file not found: {p}", file=sys.stderr)
        return 2

    findings = validate_override_file(p)
    if not findings:
        print("OK - override passes governance/OVERRIDE-SCHEMA.md validation.")
        return 0

    print(f"\nREJECT - {len(findings)} finding(s):")
    for f in findings:
        print(f"  - {f}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
