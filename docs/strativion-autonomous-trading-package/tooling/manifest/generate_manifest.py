#!/usr/bin/env python3
"""
generate_manifest.py — compute and emit canonical/MANIFEST.json.

Produces the authoritative release manifest per governance/VERSIONING.md §2.3.
Each release publishes:

  canonical/MANIFEST.json:
    {
      "canonical_package_version": "2.5.0-rc1",
      "canonical_hash": "sha256:<hex>",
      "files": [{"path": "...", "sha256": "..."}],
      "schemas": [{"id": "...", "sha256": "..."}]
    }

canonical_hash = sha256 over the concatenation of each file's
  "<relative_path>\\x00<file_sha256>\\x00" in sorted order.

Usage:
    python tooling/manifest/generate_manifest.py             # dry-run, prints to stdout
    python tooling/manifest/generate_manifest.py --write     # writes canonical/MANIFEST.json

Exit 0 on success. Exit 1 on failure.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    sys.stderr.write("pyyaml required: pip install pyyaml\n")
    sys.exit(2)

PKG_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = PKG_ROOT / "canonical" / "MANIFEST.json"
GOV_MANIFEST = PKG_ROOT / "governance" / "PACKAGE-MANIFEST.yaml"


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha256_file(p: Path) -> str:
    return sha256_bytes(p.read_bytes())


def collect_files() -> dict[str, list[str]]:
    """Return the classified file list from governance/PACKAGE-MANIFEST.yaml."""
    doc = yaml.safe_load(GOV_MANIFEST.read_text(encoding="utf-8"))
    return {
        "binding": list(doc.get("binding_files", []) or []),
        "supporting": list(doc.get("supporting_canonical_files", []) or []),
        "schemas": list(doc.get("canonical_schemas", []) or []),
        "meta": {
            "package_version": doc.get("meta", {}).get("package_version"),
            "unit_convention": doc.get("meta", {}).get("unit_convention"),
            "timezone_convention": doc.get("meta", {}).get("timezone_convention"),
        },
    }


def build_manifest() -> dict:
    buckets = collect_files()
    per_file: list[dict] = []
    hash_input_parts: list[str] = []

    for rel in sorted(buckets["binding"] + buckets["supporting"]):
        abs_path = PKG_ROOT / rel
        if not abs_path.exists():
            raise SystemExit(f"MANIFEST: file missing: {rel}")
        h = sha256_file(abs_path)
        per_file.append({"path": rel, "sha256": h})
        hash_input_parts.append(f"{rel}\x00{h}\x00")

    per_schema: list[dict] = []
    for rel in sorted(buckets["schemas"]):
        abs_path = PKG_ROOT / rel
        if not abs_path.exists():
            raise SystemExit(f"MANIFEST: schema missing: {rel}")
        try:
            doc = json.loads(abs_path.read_text(encoding="utf-8"))
            schema_id = doc.get("$id") or rel
        except json.JSONDecodeError:
            schema_id = rel
        h = sha256_file(abs_path)
        per_schema.append({"id": schema_id, "path": rel, "sha256": h})
        hash_input_parts.append(f"{rel}\x00{h}\x00")

    canonical_hash = "sha256:" + sha256_bytes("".join(hash_input_parts).encode("utf-8"))

    return {
        "canonical_package_version": buckets["meta"]["package_version"],
        "canonical_hash": canonical_hash,
        "unit_convention": buckets["meta"]["unit_convention"],
        "timezone_convention": buckets["meta"]["timezone_convention"],
        "files": per_file,
        "schemas": per_schema,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true",
                    help="Write canonical/MANIFEST.json (otherwise prints to stdout).")
    ap.add_argument("--check", action="store_true",
                    help="Exit 1 if canonical/MANIFEST.json is stale relative to current files.")
    args = ap.parse_args()

    manifest = build_manifest()
    serialized = json.dumps(manifest, indent=2, sort_keys=True) + "\n"

    if args.check:
        if not MANIFEST_PATH.exists():
            print("canonical/MANIFEST.json does not exist", file=sys.stderr)
            return 1
        existing = MANIFEST_PATH.read_text(encoding="utf-8")
        if existing.strip() != serialized.strip():
            print("canonical/MANIFEST.json is stale; regenerate with --write", file=sys.stderr)
            return 1
        print("MANIFEST OK")
        return 0

    if args.write:
        MANIFEST_PATH.write_text(serialized, encoding="utf-8")
        print(f"wrote {MANIFEST_PATH.relative_to(PKG_ROOT)}")
        return 0

    sys.stdout.write(serialized)
    return 0


if __name__ == "__main__":
    sys.exit(main())
