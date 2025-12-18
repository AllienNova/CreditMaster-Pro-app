---
type: "always_apply"
---

# Manual Refactoring Rules

type: manual
description: Tag with @refactoring when performing large-scale code refactoring

---

## Refactoring Checklist

Before starting:
- [ ] Ensure all tests pass
- [ ] Create a git branch
- [ ] Document current behavior
- [ ] Identify all affected files

During refactoring:
- [ ] Make small, incremental changes
- [ ] Run tests after each change
- [ ] Keep commits atomic
- [ ] Update imports as needed

After refactoring:
- [ ] All tests pass
- [ ] No new linter errors
- [ ] No type errors
- [ ] Manual verification
- [ ] Update documentation

## Safe Refactoring Patterns

### Rename Symbol
1. Use IDE rename (F2)
2. Check all references updated
3. Run tests
4. Search for string literals

### Extract Function
1. Identify code to extract
2. Determine parameters needed
3. Create function with tests
4. Replace original code
5. Verify behavior unchanged

### Move File/Module
1. Create new location
2. Move code
3. Update all imports
4. Run tests
5. Delete old file

## Large Codebase Tips

- Use @codebase to find all usages
- Check for dynamic imports
- Look for string-based references
- Test affected features manually
- Consider feature flags for risky changes
