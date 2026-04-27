---
name: implement
description: Execute a specific IMP task by ID from the Implementation Plan
---

# /implement: Task Executor

You are executing a specific implementation task from the Strativion PCTT Implementation Plan. The user provides a task ID as an argument (e.g., `/implement IMP-P1-006`). Follow every step below in sequence. Do not skip steps.

## Step 1: Parse the Task ID

Extract the task ID from the arguments. Valid formats:
- `IMP-P1-006` (full format)
- `P1-006` (shorthand, prepend "IMP-")
- `1-006` (minimal, prepend "IMP-P")

If no task ID is provided, respond with: "Usage: `/implement IMP-Px-NNN` where Px is the phase and NNN is the task number. Run `/bootstrap` to see available tasks."

## Step 2: Locate the Task in IMPLEMENTATION-PLAN.md

Read `implementations/pctt/IMPLEMENTATION-PLAN.md` and search for the exact task ID (e.g., `IMP-P1-006`). Extract all fields from the task block:

- **Task ID and Title**
- **Complexity** (S/M/L/XL/XXL)
- **SSOT References** (list of SSOT tags)
- **Architecture Source** (Part N, Section X.Y)
- **Depends On** (prerequisite task IDs)
- **Blocks** (tasks this unblocks)
- **Description** (what to build)
- **Input Files** (files to read)
- **Output Files** (files to create or modify)
- **Acceptance Criteria** (numbered list)
- **Test Commands** (bash commands)
- **Rollback** (recovery steps)

If the task ID is not found, respond with: "Task {task_id} not found in IMPLEMENTATION-PLAN.md. Check the ID and try again."

## Step 3: Read All SSOT References

For each SSOT tag listed in the task's "SSOT References" field, locate and read the full specification:

| SSOT Tag Prefix | File to Search |
|----------------|----------------|
| SSOT-META, SSOT-ARCH, SSOT-AG-01 to SSOT-AG-05 | `implementations/pctt/SSOT.md` |
| SSOT-AG-06 to SSOT-AG-11, SSOT-PCTT | `implementations/pctt/SSOT-batch1b.md` |
| SSOT-DC, SSOT-EVT | `implementations/pctt/SSOT-batch1c.md` |
| SSOT-TOOL, SSOT-CFG, SSOT-FRM | `implementations/pctt/SSOT-batch2a.md` |
| SSOT-API | `implementations/pctt/SSOT-batch2a-apis.md` |
| SSOT-UI, SSOT-SEC, SSOT-INF, SSOT-DEP, SSOT-FILE | `implementations/pctt/SSOT-batch2b.md` |
| SSOT-ENH | `implementations/pctt/SSOT-enhancements.md` |

Search for the HTML comment markers `<!-- SSOT-XX-NN -->` to `<!-- /SSOT-XX-NN -->` and read the entire section between them. Store all extracted specifications for use during implementation.

## Step 4: Verify Dependencies

Read `implementations/pctt/PROGRESS-TRACKER.md` and check the status of every task listed in the "Depends On" field.

- If ALL dependencies are marked COMPLETED: proceed to Step 5.
- If ANY dependency is NOT completed: stop and report which dependencies are missing. Output:
  ```
  BLOCKED: Task {task_id} cannot start. Missing dependencies:
  - {dep_id}: {status} (current status in progress tracker)
  - {dep_id}: {status}

  Complete these tasks first, or run `/implement {dep_id}` for the first missing dependency.
  ```

## Step 5: Read Input Files

Read every file listed in the task's "Input Files" field. These provide essential context for implementation. Common input files include:

- Existing source files that need modification
- Configuration YAML files
- Related test files
- Knowledge base files in `contexts/knowledge/`

If an input file does not exist yet (because it is created by a dependency task), verify that the dependency is truly complete. If the file should exist but does not, flag this as an error.

## Step 6: Update Progress Tracker to IN_PROGRESS

Edit `implementations/pctt/PROGRESS-TRACKER.md` to mark the task as in-progress. Find the task row in the appropriate phase section and update its status:

- Change status from `PENDING` to `IN_PROGRESS`
- Add a timestamp in the "Started" column using today's date (YYYY-MM-DD format)

## Step 7: Implement the Code

Now implement the task according to:

1. **The task's Description field** for what to build
2. **The SSOT specifications** extracted in Step 3 for exact requirements
3. **The Acceptance Criteria** as your definition of done
4. **The Output Files** list for which files to create or modify

### Coding Standards (enforce these on all generated code)

**Python files:**
- Python 3.11+ with full type annotations on every function and method
- Use `dataclasses` or `pydantic.BaseModel` for all data structures
- Async/await for all I/O operations
- Google-style docstrings with SSOT tag reference (e.g., `SSOT: [AG-04]`)
- No em-dashes or en-dashes anywhere in code or comments
- Use `Decimal` for all monetary values, never `float`
- Black formatting (line length 100)
- All imports at the top, grouped: stdlib, third-party, local

**TypeScript files:**
- TypeScript 5.9 strict mode
- Interfaces for all data shapes, enums for fixed sets
- No `any` type; use `unknown` with type guards
- JSDoc with `@ssot` tag (e.g., `@ssot PCTT-01`)
- All PCTT pipeline functions must be pure (no side effects)

**YAML files:**
- Comments explaining each section
- Consistent indentation (2 spaces)

**Test files:**
- Mirror the source file structure under `tests/`
- Descriptive test names: `test_{what}_{condition}_{expected_result}`
- Use fixtures for shared setup
- Include both positive and negative test cases

### System Invariants (verify these are not violated)

Before writing any code that touches trade execution, risk management, or state:

1. No trade executes without Risk Agent approval
2. Position size never exceeds Kelly fraction / 4
3. All events flow through Redis Pub/Sub
4. Hot memory syncs to warm within 100ms
5. Every state mutation produces an AuditEntry
6. Circuit breakers trip at 3 consecutive failures
7. PCTT pipeline stages never access future data
8. Compliance checks are hard gates
9. All tool invocations require permission verification
10. Graceful degradation to MANUAL mode on failure

## Step 8: Run Test Commands

Execute every command listed in the task's "Test Commands" field. For each command:

1. Run the command
2. Capture stdout and stderr
3. Check the exit code (0 = pass, non-zero = fail)

If any test fails:
1. Analyze the failure output
2. Fix the implementation
3. Re-run the failing test
4. Repeat until all tests pass

If tests require infrastructure (Redis, PostgreSQL) that is not running, note this and run only the tests that can execute without external dependencies.

## Step 9: Verify Acceptance Criteria

Go through each acceptance criterion from the task spec one by one. For each criterion:

- **PASS:** The criterion is met. Note the evidence (test output, file exists, etc.)
- **FAIL:** The criterion is not met. Fix the implementation and re-verify.

All criteria must PASS before proceeding.

## Step 10: Update Progress Tracker to COMPLETED

Edit `implementations/pctt/PROGRESS-TRACKER.md`:

1. Change the task status from `IN_PROGRESS` to `COMPLETED`
2. Add a completion timestamp
3. Update the phase completion counters in the PROG-DASHBOARD table
4. Update the overall progress percentage and fraction
5. Add a changelog entry at the bottom of PROGRESS-TRACKER.md in this format:

```markdown
### {date} {task_id}: {task_title}
- **Status:** COMPLETED
- **Files Created/Modified:** {list of files}
- **Tests:** {N passed, M failed}
- **Notes:** {any implementation notes or deviations from spec}
```

## Step 11: Report Results

Output a completion summary:

```
## Task Complete: {task_id} {task_title}

### Files Created/Modified
- `{filepath}` (created/modified, {lines} lines)
- ...

### Tests
- {N} tests passed
- {M} tests failed (if any)
- Coverage: {X}% (if measured)

### Acceptance Criteria
1. [PASS] {criterion}
2. [PASS] {criterion}
...

### Unblocked Tasks
The following tasks can now proceed:
- {blocked_task_id}: {title}
- ...

### Next Recommended Task
Run `/implement {next_task_id}` to continue with {next_task_title}.
```

## Error Handling

- If the task involves creating a directory that does not exist, create it.
- If a parent directory for an output file does not exist, create the full path.
- If the task's SSOT reference cannot be found, search all SSOT batch files for the tag before giving up.
- If the task depends on external services (Redis, PostgreSQL, broker APIs), mock them in tests and note the dependency.
- If the implementation requires a design decision not covered by the SSOT, document the decision in the code comments and flag it in the completion report for human review.
