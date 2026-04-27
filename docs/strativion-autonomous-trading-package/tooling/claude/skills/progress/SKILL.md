---
name: progress
description: Update and display the PCTT PROGRESS-TRACKER.md dashboard, task statuses, and blocking issues
---

# /progress Skill

You are updating and displaying the Strativion PCTT project progress tracker. The tracker lives at `implementations/pctt/PROGRESS-TRACKER.md` and follows a structured format with dashboard metrics, phase completion tables, individual task rows (PROG-REQ), changelog entries (PROG-CL), and blocking issues (PROG-BLK).

## File Location

- Progress tracker: `implementations/pctt/PROGRESS-TRACKER.md`
- Implementation plan (for task definitions): `implementations/pctt/IMPLEMENTATION-PLAN.md`

## How to Handle Arguments

### No arguments: Display the dashboard

1. Read `implementations/pctt/PROGRESS-TRACKER.md`.
2. Display the first 50 lines, which contain the dashboard summary: overall completion %, phase-by-phase breakdown, total tasks completed/in-progress/pending/blocked.
3. Also display any PROG-BLK entries that have status `unresolved`.
4. Format the output clearly with section headers so the user can scan it quickly.

### Task ID + status (e.g., `IMP-P1-006 completed` or `IMP-P3-012 in_progress`)

Parse the arguments to extract:
- **Task ID**: matches pattern `IMP-P{phase}-{number}` (e.g., IMP-P1-006)
- **New status**: one of `completed`, `in_progress`, `pending`, `blocked`

Then proceed based on the status value.

## Marking a Task as `completed`

1. Read `implementations/pctt/PROGRESS-TRACKER.md` fully.
2. Find the PROG-REQ row matching the task ID.
3. Update its status column from whatever it was to `completed`.
4. Add a PROG-CL changelog entry at the bottom of the changelog section:

```
| PROG-CL-{next_seq} | {today's date YYYY-MM-DD} | {task_id} | Status changed to completed |
```

5. Recalculate the dashboard metrics:
   - Count all PROG-REQ rows by status (completed, in_progress, pending, blocked).
   - Calculate overall completion: `completed / total * 100`.
   - Calculate per-phase completion: group tasks by their phase number (extracted from `IMP-P{N}-...`), then `completed_in_phase / total_in_phase * 100`.
   - Update the dashboard section at the top of the file with the new numbers.
6. Write the updated file.
7. Display the updated dashboard (first 50 lines).

## Marking a Task as `in_progress`

1. Read `implementations/pctt/PROGRESS-TRACKER.md` fully.
2. Find the PROG-REQ row matching the task ID.
3. Update its status column to `in_progress`.
4. Do NOT add a changelog entry (changelog is only for completions and blocking issues).
5. Recalculate dashboard metrics (same process as above).
6. Write the updated file.
7. Display the updated dashboard.

## Marking a Task as `blocked`

1. Read `implementations/pctt/PROGRESS-TRACKER.md` fully.
2. Find the PROG-REQ row matching the task ID.
3. Update its status column to `blocked`.
4. Prompt the user for a blocking reason if not provided. If a reason is provided after the status, use it.
5. Add a PROG-BLK entry:

```
| PROG-BLK-{next_seq} | {task_id} | {reason} | unresolved | {today's date} |
```

6. Add a PROG-CL changelog entry:

```
| PROG-CL-{next_seq} | {today's date YYYY-MM-DD} | {task_id} | Blocked: {reason} |
```

7. Recalculate dashboard metrics.
8. Write the updated file.
9. Display the updated dashboard and the new blocking issue.

## Showing Blocking Issues

When the user says `/progress blocking` or `/progress blocks`:

1. Read `implementations/pctt/PROGRESS-TRACKER.md`.
2. Find all PROG-BLK entries.
3. Filter to those with status `unresolved`.
4. Display them in a clear table format.
5. For each blocking issue, also show the associated task's current status and description.

## Resolving a Blocking Issue

When the user says `/progress resolve PROG-BLK-{N}`:

1. Find the PROG-BLK entry and update its status to `resolved`.
2. Find the associated task and update it to `in_progress` (unless the user specifies a different status).
3. Add a PROG-CL changelog entry noting the resolution.
4. Recalculate dashboard metrics.
5. Display the updated dashboard.

## Dashboard Recalculation Rules

The dashboard section uses this structure:

```markdown
## Dashboard

| Metric | Value |
|--------|-------|
| Total Tasks | {count} |
| Completed | {count} ({pct}%) |
| In Progress | {count} ({pct}%) |
| Pending | {count} ({pct}%) |
| Blocked | {count} ({pct}%) |

### Phase Completion

| Phase | Tasks | Completed | % |
|-------|-------|-----------|---|
| Phase 1 | {n} | {n} | {pct}% |
| Phase 2 | {n} | {n} | {pct}% |
...
```

When recalculating:
- Count by scanning all PROG-REQ rows (lines matching `| PROG-REQ-`).
- Extract phase from the task ID column (IMP-P{N}-...).
- Round percentages to one decimal place.

## Important Rules

- Never fabricate task IDs. If a task ID is not found in the tracker, report that it does not exist and list similar IDs.
- Always read the full file before making edits to avoid overwriting data.
- Always display the updated dashboard after any modification.
- Use the Edit tool for targeted updates rather than rewriting the entire file.
- Today's date for changelog entries: use the current date in YYYY-MM-DD format.
- Preserve all existing formatting, column alignment, and section structure.
