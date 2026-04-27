---
name: ssot-lookup
description: Find and display a specific SSOT section by tag with cross-references to implementation tasks and progress
---

# /ssot-lookup Skill

You are a lookup tool for the Strativion PCTT Single Source of Truth (SSOT) documentation. Given a tag, you find the exact section in the correct SSOT file, display its full content, and show cross-references to implementation tasks and progress tracking.

## Arguments

One required argument: the SSOT tag to look up.

Examples:
- `/ssot-lookup SSOT-AG-04`
- `/ssot-lookup AG-04` (auto-prepends SSOT-)
- `/ssot-lookup SSOT-FRM-01`
- `/ssot-lookup DC-03`
- `/ssot-lookup PCTT-BOUNDARY`

## Step 1: Normalize the Tag

1. Trim whitespace from the argument.
2. Convert to uppercase.
3. If the tag does not start with `SSOT-`, prepend `SSOT-`.
4. Store the normalized tag for searching.

Special cases that do not follow the `SSOT-` prefix pattern (search as-is in SSOT-enhancements.md):
- `PCTT-BOUNDARY`
- `RISK-OVERNIGHT`
- `AG-EDGE-DECAY`
- `REGIME-ENHANCED`
- `PCTT-TRAILING`
- `STAT-ENHANCED`
- `DATA-PIPELINE`
- `OPS-INCIDENT`
- `TRAIL-HTF`

For these, search using the exact tag string as the HTML comment marker.

## Step 2: Route to the Correct File

Use the tag prefix to determine which file to search:

| Tag Pattern | SSOT File |
|-------------|-----------|
| SSOT-META-* | implementations/pctt/SSOT.md |
| SSOT-ARCH-* | implementations/pctt/SSOT.md |
| SSOT-AG-01, SSOT-AG-02, SSOT-AG-03, SSOT-AG-04, SSOT-AG-05 | implementations/pctt/SSOT.md |
| SSOT-AG-06, SSOT-AG-07, SSOT-AG-08, SSOT-AG-09, SSOT-AG-10, SSOT-AG-11 | implementations/pctt/SSOT-batch1b.md |
| SSOT-DC-* | implementations/pctt/SSOT-batch1c.md |
| SSOT-EVT-* | implementations/pctt/SSOT-batch1c.md |
| SSOT-TOOL-* | implementations/pctt/SSOT-batch2a.md |
| SSOT-CFG-* | implementations/pctt/SSOT-batch2a.md |
| SSOT-FRM-01 through SSOT-FRM-08 | implementations/pctt/SSOT-batch2a.md |
| SSOT-FRM-09, SSOT-FRM-10, SSOT-FRM-11 | implementations/pctt/SSOT-enhancements.md |
| SSOT-API-* | implementations/pctt/SSOT-batch2a-apis.md |
| SSOT-UI-01 through SSOT-UI-04 | implementations/pctt/SSOT-batch2b.md |
| SSOT-UI-05 through SSOT-UI-08 | implementations/pctt/SSOT-enhancements.md |
| SSOT-SEC-* | implementations/pctt/SSOT-batch2b.md |
| SSOT-INF-* | implementations/pctt/SSOT-batch2b.md |
| SSOT-DEP-* | implementations/pctt/SSOT-batch2b.md |
| SSOT-FILE-* | implementations/pctt/SSOT-batch2b.md |
| SSOT-LAW-* | implementations/pctt/SSOT-batch2b.md |
| PCTT-BOUNDARY | implementations/pctt/SSOT-enhancements.md |
| RISK-OVERNIGHT | implementations/pctt/SSOT-enhancements.md |
| AG-EDGE-DECAY | implementations/pctt/SSOT-enhancements.md |
| REGIME-ENHANCED | implementations/pctt/SSOT-enhancements.md |
| PCTT-TRAILING | implementations/pctt/SSOT-enhancements.md |
| STAT-ENHANCED | implementations/pctt/SSOT-enhancements.md |
| DATA-PIPELINE | implementations/pctt/SSOT-enhancements.md |
| OPS-INCIDENT | implementations/pctt/SSOT-enhancements.md |
| TRAIL-HTF | implementations/pctt/SSOT-enhancements.md |

If the tag does not match any known pattern, search all SSOT files in order:
1. implementations/pctt/SSOT.md
2. implementations/pctt/SSOT-batch1b.md
3. implementations/pctt/SSOT-batch1c.md
4. implementations/pctt/SSOT-batch2a.md
5. implementations/pctt/SSOT-batch2a-apis.md
6. implementations/pctt/SSOT-batch2b.md
7. implementations/pctt/SSOT-enhancements.md

## Step 3: Search for the Tag

In the target file, search for these patterns in order:

1. HTML comment marker: `<!-- {tag} -->` (e.g., `<!-- SSOT-AG-04 -->`)
2. Heading containing the tag: a line starting with `#` that contains the tag string
3. Bold text containing the tag: `**{tag}**`
4. Plain text occurrence of the tag

Use the first match found.

## Step 4: Extract the Section Content

Once the tag location is found:

1. Start from the matched line.
2. Extract forward until one of these boundaries is hit:
   - Another HTML comment marker matching `<!-- SSOT-` pattern
   - A heading of equal or higher level (e.g., if the tag was under `##`, stop at the next `##` or `#`)
   - End of file
3. Include everything between the start and boundary (exclusive of the boundary line).

## Step 5: Display the Section

Format the output as:

```
## SSOT Lookup: {tag}

**Source file:** implementations/pctt/{filename}
**Section title:** {extracted heading or first line}

---

{full section content}

---
```

## Step 6: Show Cross-References

After displaying the section content, search for cross-references:

### Implementation Tasks

Read `implementations/pctt/IMPLEMENTATION-PLAN.md` and search for all lines containing the tag. These are IMP task rows that reference this SSOT section. Display them as:

```
### Implementation Tasks Referencing {tag}

| Task ID | Description | Phase | Status |
|---------|-------------|-------|--------|
| IMP-P1-003 | Implement risk memory dataclass | Phase 1 | completed |
...
```

If no tasks reference this tag, display: "No implementation tasks reference this tag."

### Progress Tracker

Read `implementations/pctt/PROGRESS-TRACKER.md` and search for all PROG-REQ rows containing the tag. Display them as:

```
### Progress Tracking for {tag}

| Req ID | Task | Status | Last Updated |
|--------|------|--------|--------------|
| PROG-REQ-012 | IMP-P1-003 | completed | 2026-02-20 |
...
```

If no progress entries reference this tag, display: "No progress entries reference this tag."

### Related SSOT Tags

Scan the extracted section content for references to other SSOT tags (patterns like `SSOT-{DOMAIN}-{SEQ}`). List any found:

```
### Related SSOT Tags
- SSOT-DC-04 (referenced in memory section)
- SSOT-EVT-07 (referenced in event subscriptions)
- SSOT-TOOL-12 (referenced in tool list)
```

## Step 7: Handle Tag Not Found

If the tag is not found in any file:

1. Inform the user: "Tag `{tag}` was not found in any SSOT file."
2. Perform fuzzy matching: search all SSOT files for tags that are similar to the requested tag. Similarity criteria:
   - Same domain prefix (e.g., if searching for SSOT-AG-15, suggest all SSOT-AG-* tags found)
   - Levenshtein distance of 2 or less
   - Substring match (the requested tag appears within a longer tag)
3. Display suggestions:

```
### Did you mean one of these?
- SSOT-AG-04 (in implementations/pctt/SSOT.md)
- SSOT-AG-05 (in implementations/pctt/SSOT.md)
- SSOT-AG-14 (not found, but SSOT-AG-04 is closest)
```

4. List all valid tags in the same domain:

```
### All tags in the AG domain:
SSOT-AG-01, SSOT-AG-02, SSOT-AG-03, SSOT-AG-04, SSOT-AG-05,
SSOT-AG-06, SSOT-AG-07, SSOT-AG-08, SSOT-AG-09, SSOT-AG-10, SSOT-AG-11
```

## Important Rules

- Always read the actual SSOT file content. Never guess or fabricate section contents.
- Display the complete section. Do not truncate unless it exceeds 500 lines, in which case show the first 200 lines and offer to show the rest.
- Preserve all formatting from the source file (tables, code blocks, lists, headings).
- If multiple tags are requested (space-separated), look up each one and display them in sequence.
- Do not use em-dashes in any output.
- All file paths are relative to the Strativion project root: `Strativion/implementations/pctt/`.
