---
type: "always_apply"
---

# Auto Testing Rules

type: auto
description: Apply when working on tests, testing, Jest, Vitest, Playwright, or test files

---

## Test File Conventions

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `tests/e2e/*.spec.ts`

## Unit Test Structure

```typescript
describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do expected behavior', () => {
    // Arrange
    // Act
    // Assert
  });

  it('should handle edge case', () => {
    // Test edge cases
  });

  it('should throw for invalid input', () => {
    // Test error cases
  });
});
```

## Coverage Requirements

- Statements: 95%+
- Branches: 90%+
- Functions: 95%+
- Lines: 95%+

## Test Best Practices

- One assertion per test (when practical)
- Test behavior, not implementation
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error paths
- Keep tests independent

## Playwright E2E Tests

- Test complete user flows
- Test on multiple browsers
- Test responsive layouts
- Test mobile viewports
- Use page object pattern for large apps

## Mobile Testing

- Android: Chrome emulation + real device
- iOS: Safari emulation + Simulator
- Test touch interactions
- Test offline scenarios
