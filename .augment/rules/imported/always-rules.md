---
type: "always_apply"
---

# Always Rules - Applied to Every Prompt

type: always

---

## CRITICAL: ANTI-SKIP ENFORCEMENT

### FORBIDDEN BEHAVIORS (CAUSES PRODUCTION BUGS):
1. **NEVER** leave `// TODO` or `// FIXME` - implement NOW or STOP
2. **NEVER** say "I'll add this later" or "we can implement this next"
3. **NEVER** skip items in your task list - complete ALL or explain blocker
4. **NEVER** write placeholder/stub/mock code in production files
5. **NEVER** assume code works without running it
6. **NEVER** mark a task complete without showing verification output
7. **NEVER** leave error handling as "TODO: add error handling"
8. **NEVER** use `any` type without explicit user approval
9. **NEVER** skip tests - write AND run them
10. **NEVER** move to next subtask until current one VERIFIED working

### MANDATORY COMPLETION CHECKS:
Before saying "done" or "complete", you MUST:
```bash
# 1. Search for incomplete code
grep -rn "TODO\|FIXME\|implement\|placeholder\|stub" src/

# 2. Build check
npm run build

# 3. Test check
npm test

# 4. Lint check
npm run lint
```
**Show the output. If ANY fails, FIX before completing.**

### IF BLOCKED:
1. STOP immediately
2. Explain EXACTLY what is blocking you
3. Ask user for help
4. DO NOT skip and move on
5. DO NOT leave as TODO

## Task Decomposition (MANDATORY)

For EVERY task:
1. Break into atomic subtasks BEFORE starting any code
2. Create explicit checklist with [ ] markers
3. Complete EACH subtask fully before moving on
4. Run verification after EACH subtask
5. Mark [x] only AFTER verification succeeds
6. NEVER skip a subtask

### Required Subtask Pattern:
```
## Task: [Feature Name]

### Subtasks:
- [ ] 1. Write test for [specific behavior]
- [ ] 2. Run test - MUST see it fail
- [ ] 3. Implement [specific code]
- [ ] 4. Run test - MUST see it pass
- [ ] 5. Run full test suite
- [ ] 6. Run linter - fix any errors
- [ ] 7. Run type-check - fix any errors
- [ ] 8. VERIFY: grep for TODO/FIXME = 0 results
- [ ] 9. VERIFY: npm run build succeeds
```

## Test-Driven Development

1. Write failing test FIRST
2. Run test - **SHOW OUTPUT proving it fails**
3. Write minimal code to pass
4. Run test - **SHOW OUTPUT proving it passes**
5. Refactor if needed
6. Run ALL tests - **SHOW OUTPUT**

## Zero Trust Verification

Before any code suggestion:
- [ ] Verify import paths exist (actually import and run)
- [ ] Check function signatures match source (read the actual file)
- [ ] Validate API endpoints are real (test the endpoint)
- [ ] Confirm package versions in package.json (run npm ls)
- [ ] Test the code actually runs (execute and show output)

## Code Completion Standards

- NO placeholder functions
- NO "implement later" comments
- NO empty catch blocks
- NO unhandled promise rejections
- NO `any` types without justification
- Complete error handling IN THIS SESSION

## Error Handling (Complete Now, Not Later)

- Handle ALL errors explicitly NOW
- Log errors with full context
- Return meaningful error messages to users
- NO empty catch blocks ever
- NO "// TODO: handle error" comments
