---
name: pre-investigation
description: "Mandatory before writing any new class, module, or significant function. Find existing implementations; decide BUILD / EXTEND / SKIP."
allowed-tools: Read Grep Glob Bash
---

# Pre-Investigation

## 1. Find source root
Read `package.json` / `pyproject.toml` / `Cargo.toml` / `pubspec.yaml`. Identify source dirs (`src/`, `lib/`, `app/`, packages).

## 2. Search prior art
```bash
rg -l "<concept>" -tts -tjs -tpy -tgo -trust -tdart
rg "(class|function|def|fn|func|struct|interface)\s+<concept>"
rg "import.*<concept>|from.*<concept>"
```

## 3. Read candidates in full
Never trust filenames. Skim is not reading.

## 4. Decide
- **SKIP** — full match exists; reference and stop
- **EXTEND** — > 50% covered; add to existing module
- **BUILD** — < 50% or nothing; reuse types/utils from adjacent code

## 5. Output
```
═══ PRE-INVESTIGATION ═══
Task: [one sentence]
Source root: [path]
Candidates: [N]
SKIP:   [file — covers X]
EXTEND: [file — has X, missing Y]
BUILD:  [responsibility — why nothing fits]
Decision: BUILD | EXTEND | SKIP — [one-line rationale]
═════════════════════════
```

Implementation begins ONLY after this report.
