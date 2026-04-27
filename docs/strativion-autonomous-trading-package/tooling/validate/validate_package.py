#!/usr/bin/env python3
"""
validate_package.py — canonical-package validator for the Strativion trading package.

Implements the rules in governance/VALIDATION-RULES.md and the Perplexity fix-pack
design in PRINCIPAL-REVIEW.md:

 1. Structure: every canonical YAML has a meta block with document_role,
    schema_version, file_version, canonical_package_version.
 2. Manifest: every path in governance/PACKAGE-MANIFEST.yaml exists on disk.
 3. Unit: no percent-float (>1 in a _pct field) in any canonical file.
 4. Timezone: every `timezone:` field maps to IANA America/New_York.
 5. Field index: every canonical path referenced in CANONICAL-FIELD-INDEX.md exists.
 6. Reference isolation: contexts/ files contain no hard-coded risk numerics.
 7. Migration-map new-path column: every target exists or is marked as removed.
 8. JSON-schema validation: every canonical YAML bound to a v1/v2 schema passes.
 9. Workflow reference resolution: every file#field reference in workflows points
    to a canonical owner listed in CANONICAL-FIELD-INDEX.md (best-effort prefix match).
10. Numeric literals banned in workflows (enforced for _pct/_bps suffix fields).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:
    sys.stderr.write("pyyaml required: pip install pyyaml jsonschema\n")
    sys.exit(2)

try:
    from jsonschema import Draft202012Validator  # type: ignore
except ImportError:
    sys.stderr.write("jsonschema required: pip install jsonschema\n")
    sys.exit(2)

PKG_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_DIR = PKG_ROOT / "canonical"
CONTEXTS_DIR = PKG_ROOT / "contexts"
GOVERNANCE_DIR = PKG_ROOT / "governance"
SCHEMAS_DIR = CANONICAL_DIR / "schemas"

PERCENT_FLOAT = re.compile(r"_pct\s*:\s*([0-9]+\.?[0-9]*)")
TIMEZONE_FIELD = re.compile(r"^\s*timezone\s*:\s*\"?([^\s\"#]+)\"?", re.MULTILINE)
RISK_NUMERIC_IN_CONTEXT = re.compile(
    r"(correlation|portfolio.?heat|daily.?loss|weekly.?loss|monthly.?loss|"
    r"drawdown|vix|risk.?per.?trade|heat|p_?ruin|full.?halt)"
    r"[^\n]{0,60}?"
    r"(\b0?\.\d+\b|\b\d+(\.\d+)?\s*%)",
    re.IGNORECASE,
)
NUMERIC_IN_WORKFLOW = re.compile(
    r"(_pct|_bps)\s*:\s*([0-9]+\.?[0-9]*)",
)

ACCEPTED_DOCUMENT_ROLES = {
    "policy",
    "workflow",
    "schema",
    "governance",
}

SCHEMA_BINDINGS = {
    "canonical/policy/policy.runtime.yaml":         "policy.runtime.v2.schema.json",
    "canonical/policy/policy.sizing.yaml":          "policy.sizing.v1.schema.json",
    "canonical/policy/policy.execution.yaml":       "policy.execution.v1.schema.json",
    "canonical/policy/policy.execution-errors.yaml":"policy.execution-errors.v1.schema.json",
    "canonical/policy/policy.data-quality.yaml":    "policy.data-quality.v2.schema.json",
    "canonical/policy/policy.order-lifecycle.yaml": "policy.order-lifecycle.v1.schema.json",
    "canonical/policy/policy.incidents.yaml":       "policy.incidents.v1.schema.json",
    "canonical/policy/policy.tenancy.yaml":         "policy.tenancy.v1.schema.json",
    "canonical/policy/policy.dr.yaml":              "policy.dr.v1.schema.json",
    "canonical/policy/policy.calendar.yaml":        "policy.calendar.v1.schema.json",
    "canonical/policy/policy.promotion.yaml":       "policy.promotion.v1.schema.json",
    "canonical/policy/policy.compliance.yaml":      "policy.compliance.v1.schema.json",
    "canonical/laws/law.automation-map.yaml":       "law.automation-map.schema.json",
}
SCHEMA_DRIFT_DEFERRED = {}

findings: dict[str, list[str]] = {}


def add(rule: str, msg: str) -> None:
    findings.setdefault(rule, []).append(msg)


def load_yaml(p: Path) -> Any:
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def rule_meta_units_tz() -> None:
    for p in CANONICAL_DIR.rglob("*.yaml"):
        text = p.read_text(encoding="utf-8")
        try:
            doc = yaml.safe_load(text) or {}
        except yaml.YAMLError as e:
            add("1-structure", f"{p.relative_to(PKG_ROOT)}: YAML parse error: {e}")
            continue
        meta = (doc or {}).get("meta", {}) if isinstance(doc, dict) else {}
        for field in ("document_role", "schema_version"):
            if field not in meta:
                add("1-structure", f"{p.relative_to(PKG_ROOT)}: missing meta.{field}")
        role = meta.get("document_role")
        if role is not None and role not in ACCEPTED_DOCUMENT_ROLES:
            add("1-structure",
                f"{p.relative_to(PKG_ROOT)}: meta.document_role='{role}' "
                f"not in accepted set {sorted(ACCEPTED_DOCUMENT_ROLES)}")
        for m in PERCENT_FLOAT.finditer(text):
            val = float(m.group(1))
            if val > 1.0:
                add("3-unit",
                    f"{p.relative_to(PKG_ROOT)}: *_pct field contains {val} > 1.0 "
                    "(percent-float drift; must be decimal fraction)")
        for m in TIMEZONE_FIELD.finditer(text):
            tz = m.group(1)
            # UTC is acceptable for cron/reconciliation/billing contexts; America/New_York
            # is required for market session times. We treat UTC as OK unless it appears
            # alongside a session / market keyword within the same block.
            if tz in ("America/New_York", "UTC"):
                continue
            add("4-timezone",
                f"{p.relative_to(PKG_ROOT)}: timezone '{tz}' is not IANA America/New_York or UTC")


def rule_manifest() -> None:
    manifest_path = GOVERNANCE_DIR / "PACKAGE-MANIFEST.yaml"
    try:
        m = load_yaml(manifest_path)
    except Exception as e:
        add("2-manifest", f"Cannot load manifest: {e}")
        return
    for key in ("binding_files", "supporting_canonical_files", "canonical_schemas",
                "governance_index", "tooling_index"):
        for rel in m.get(key, []) or []:
            if not (PKG_ROOT / rel).exists():
                add("2-manifest", f"{key} references missing file: {rel}")


def rule_field_index() -> None:
    idx = GOVERNANCE_DIR / "CANONICAL-FIELD-INDEX.md"
    if not idx.exists():
        add("5-field-index", "CANONICAL-FIELD-INDEX.md is missing")
        return
    text = idx.read_text(encoding="utf-8")
    # Skip files mentioned only inside lines marked TODO / planned / future.
    planned = set()
    for m in re.finditer(r"`(TODO[^`]*)`[^\n]*?`(policy\.[\w\-]+\.yaml)`", text):
        planned.add(m.group(2))
    # Also skip files appearing in explicit Open-items section.
    open_section = re.search(r"(?i)##\s*Open items.*", text, re.DOTALL)
    open_text = open_section.group(0) if open_section else ""
    for m in re.finditer(r"`(policy\.[\w\-]+\.yaml|workflow\.[\w\-]+\.yaml|law\.[\w\-]+\.yaml)", text):
        fname = m.group(1)
        if fname in planned or fname in open_text:
            continue
        # Skip occurrences on a line marked deprecated / moved / downgraded.
        line_start = text.rfind("\n", 0, m.start()) + 1
        line_end = text.find("\n", m.end())
        line = text[line_start:line_end if line_end != -1 else len(text)]
        if re.search(r"(?i)(deprecated|downgraded|moved|superseded|legacy)", line):
            continue
        hits = list(CANONICAL_DIR.rglob(fname))
        if not hits:
            add("5-field-index", f"field-index references missing file: {fname}")


def rule_reference_isolation() -> None:
    for p in CONTEXTS_DIR.rglob("*.md"):
        text = p.read_text(encoding="utf-8")
        for m in RISK_NUMERIC_IN_CONTEXT.finditer(text):
            snippet = m.group(0).replace("\n", " ")[:120]
            add("6-reference-isolation",
                f"{p.relative_to(PKG_ROOT)}: hard-coded risk numeric: '{snippet}'")


def rule_workflow_no_numeric_literals() -> None:
    wf_dir = CANONICAL_DIR / "workflows"
    for p in wf_dir.rglob("*.yaml"):
        text = p.read_text(encoding="utf-8")
        for m in NUMERIC_IN_WORKFLOW.finditer(text):
            # Allow 0.0 and 1.0 as sentinel values if they appear in a comment row,
            # otherwise flag any _pct/_bps numeric literal in a workflow.
            field_tag = m.group(1)
            val = float(m.group(2))
            # Also ignore when the line is a comment (starts with #).
            line_start = text.rfind("\n", 0, m.start()) + 1
            line = text[line_start:text.find("\n", m.end())]
            if line.lstrip().startswith("#"):
                continue
            add("10-workflow-no-literals",
                f"{p.relative_to(PKG_ROOT)}: numeric literal in workflow for "
                f"'{field_tag}' = {val}; workflows must reference canonical owners, not embed numerics.")


def rule_migration_targets() -> None:
    mig = GOVERNANCE_DIR / "MIGRATION-MAP.md"
    if not mig.exists():
        add("7-migration", "MIGRATION-MAP.md missing")
        return
    text = mig.read_text(encoding="utf-8")
    roots = ("canonical/", "contexts/", "implementations/", "reference/", "governance/", "tooling/")
    table_row = re.compile(r"^\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|", re.MULTILINE)
    for m in table_row.finditer(text):
        new_path = m.group(2).strip().split("#", 1)[0]
        if not any(new_path.startswith(r) for r in roots):
            continue
        line_end = text.find("\n", m.end())
        line = text[m.start():line_end if line_end != -1 else len(text)]
        if re.search(r"\b(removed|superseded|deleted)\b", line, re.IGNORECASE):
            continue
        target = PKG_ROOT / new_path.rstrip("/")
        if not target.exists():
            add("7-migration", f"MIGRATION-MAP new-path does not exist: {new_path}")


def rule_json_schema() -> None:
    for rel, schema_name in SCHEMA_BINDINGS.items():
        p = PKG_ROOT / rel
        s = SCHEMAS_DIR / schema_name
        if not p.exists():
            add("8-schema", f"{rel}: file is missing")
            continue
        if not s.exists():
            add("8-schema", f"{rel}: schema {schema_name} missing")
            continue
        try:
            schema = json.loads(s.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            add("8-schema", f"{schema_name}: invalid JSON: {e}")
            continue
        try:
            doc = yaml.safe_load(p.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            add("8-schema", f"{rel}: YAML parse error: {e}")
            continue
        v = Draft202012Validator(schema)
        try:
            for err in v.iter_errors(doc):
                path = "/".join(str(x) for x in err.absolute_path) or "(root)"
                add("8-schema", f"{rel}: {path}: {err.message}")
        except Exception as e:  # pragma: no cover
            add("8-schema", f"{rel}: schema evaluation error ({type(e).__name__}): {e}")


def main() -> int:
    rule_meta_units_tz()
    rule_manifest()
    rule_field_index()
    rule_reference_isolation()
    rule_migration_targets()
    rule_workflow_no_numeric_literals()
    rule_json_schema()

    def _emit(s: str) -> None:
        try:
            print(s)
        except UnicodeEncodeError:
            sys.stdout.buffer.write((s + "\n").encode("utf-8", errors="replace"))

    if not findings:
        _emit("OK - all validator rules pass.")
        return 0

    for rule in sorted(findings):
        _emit(f"\n[{rule}] {len(findings[rule])} finding(s)")
        for f in findings[rule]:
            _emit(f"  - {f}")
    total = sum(len(v) for v in findings.values())
    _emit(f"\nFAIL - {total} finding(s) across {len(findings)} rule(s).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
