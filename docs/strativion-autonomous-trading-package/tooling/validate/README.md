# Package Validator

Reference validator for the canonical policy package.

## What it checks

Runs the full rule set from `governance/VALIDATION-RULES.md`:

1. **Structure** — every canonical file has `meta.{schema_version, document_role, purpose}`.
2. **Manifest** — every path in `governance/PACKAGE-MANIFEST.yaml` exists on disk.
3. **Unit** — no percent-float values in canonical `*_pct` fields.
4. **Timezone** — every `timezone:` field is IANA `America/New_York`.
5. **Field index** — every YAML referenced in `governance/CANONICAL-FIELD-INDEX.md` exists.
6. **Reference isolation** — `contexts/` files contain no hard-coded risk/correlation/VIX/heat/drawdown numerics.
7. **Migration targets** — every path in `governance/MIGRATION-MAP.md` resolves.
8. **JSON schemas** — canonical YAMLs that have a companion schema under `canonical/schemas/` pass validation.

## Install

```bash
pip install pyyaml jsonschema
```

## Run

```bash
python tooling/validate/validate_package.py
```

Exit code:

- `0` — all checks pass.
- `1` — at least one finding. Findings are grouped by rule.
- `2` — missing dependencies.

## Wire into CI

Add this to your CI pipeline:

```yaml
- name: Validate canonical policy package
  run: |
    pip install pyyaml jsonschema
    python tooling/validate/validate_package.py
```

Any failure must block the merge. A canonical drift caught here is worth a hundred caught in production.
