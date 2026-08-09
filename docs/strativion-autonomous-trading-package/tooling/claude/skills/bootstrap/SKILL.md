---
name: bootstrap
description: Load SSOT and Implementation Plan context for a fresh coding session
---

# /bootstrap: Session Context Loader

You are initializing a fresh coding session for the Strativion PCTT Multi-Agent Trading Platform. Follow these steps exactly to build situational awareness before any implementation work begins.

## Step 1: Read Current Progress Status

Read the first 100 lines of `implementations/pctt/PROGRESS-TRACKER.md` to extract the PROG-HEADER and PROG-DASHBOARD sections. Parse the following fields:

- **Overall Progress:** percentage and fraction (e.g., "15% (20/134 tasks completed)")
- **Current Phase:** which phase is active (P0 through P11)
- **Next Milestone:** what the immediate goal is
- **Phase Completion Table:** all 12 phases with tasks completed vs remaining

Then scan the rest of `implementations/pctt/PROGRESS-TRACKER.md` for any tasks marked `IN_PROGRESS` or `BLOCKED`. Record these separately.

## Step 2: Read Implementation Plan Header and Active Phase

Read `implementations/pctt/IMPLEMENTATION-PLAN.md` and extract:

1. The IMP-META-01 header (version, total tasks, total phases, estimated effort)
2. The IMP-META-04 repository structure section
3. All tasks in the **current active phase** (the earliest phase that is not 100% complete). For each task, extract:
   - Task ID (e.g., IMP-P0-001)
   - Task title
   - Complexity (S/M/L/XL/XXL)
   - Depends On (list of prerequisite task IDs)
   - Status (from PROGRESS-TRACKER.md: PENDING, IN_PROGRESS, COMPLETED, BLOCKED)

## Step 3: Read SSOT Architecture Overview

Read `implementations/pctt/SSOT.md` from the beginning through SSOT-ARCH-01.05 (the architecture overview, design philosophy, and top-level diagram). Extract:

- Platform identity and agent count
- 5 design principles
- Architecture layer diagram (Perception, Analysis, Decision, Action, Learning)
- 10 system invariants (from SSOT-ARCH-01.10 if present, otherwise from CLAUDE.md)

## Step 4: Build Dependency Graph for Available Tasks

From the active phase tasks collected in Step 2, determine which tasks are **available to start** by checking:

1. The task is not already COMPLETED or IN_PROGRESS
2. All tasks listed in its "Depends On" field are COMPLETED in PROGRESS-TRACKER.md
3. The task is not marked BLOCKED

Build a prioritized list of available tasks, ordered by:
- Tasks that unblock the most other tasks (check "Blocks" field) come first
- Within equal blocking value, smaller complexity tasks come first (S before M before L)

## Step 5: Check for Blocking Issues

Scan PROGRESS-TRACKER.md for:

- Any tasks marked BLOCKED with reasons
- Any phase that should be complete but has remaining tasks
- Any IN_PROGRESS tasks that may have stalled (note the last-updated timestamp if available)

## Step 6: Output the Session Context Summary

Present the results in this exact format:

```
## Strativion PCTT Session Context

### Current Status
- **Phase:** P{X} ({phase_name})
- **Overall Progress:** {N}/{134} tasks ({percentage}%)
- **Active Phase Progress:** {completed}/{total} tasks in P{X}
- **SSOT Version:** {version}
- **IMP Plan Version:** {version}

### In-Progress Tasks
| Task ID | Title | Complexity | Started |
|---------|-------|------------|---------|
(list any IN_PROGRESS tasks, or "None" if empty)

### Blocked Tasks
| Task ID | Title | Blocked By | Reason |
|---------|-------|------------|--------|
(list any BLOCKED tasks, or "None" if empty)

### Available Tasks (Ready to Start)
| Priority | Task ID | Title | Complexity | Unblocks |
|----------|---------|-------|------------|----------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |
(top 5 available tasks by priority)

### Key Files for This Session
- SSOT (primary): `implementations/pctt/SSOT.md`
- SSOT (agents 8-11, pipeline): `implementations/pctt/SSOT-batch1b.md`
- SSOT (dataclasses, events): `implementations/pctt/SSOT-batch1c.md`
- SSOT (tools, config): `implementations/pctt/SSOT-batch2a.md`
- SSOT (APIs): `implementations/pctt/SSOT-batch2a-apis.md`
- SSOT (UI, security, infra): `implementations/pctt/SSOT-batch2b.md`
- SSOT (enhancements): `implementations/pctt/SSOT-enhancements.md`
- Implementation Plan: `implementations/pctt/IMPLEMENTATION-PLAN.md`
- Progress Tracker: `implementations/pctt/PROGRESS-TRACKER.md`

### Quick Start
{recommendation based on available tasks}

Recommended next action: **{task_id} {task_title}**
Reason: {why this task is the best next step, e.g., "unblocks 4 downstream tasks" or "smallest available task, quick win"}

To begin, run: `/implement {task_id}`
```

## Important Notes

- Do NOT modify any files during bootstrap. This is a read-only operation.
- If PROGRESS-TRACKER.md shows 0% progress, recommend starting with IMP-P0-001 (or the first task in Phase 0).
- If the current phase is fully complete, advance to the next phase and identify available tasks there.
- Always verify that the SSOT version in PROGRESS-TRACKER.md matches the version in SSOT.md. Flag any mismatch.
- If any SSOT batch files are referenced but missing from the filesystem, flag that as a blocking issue.
