# Testing Suite - Quick Reference Card

## 🚀 QUICK START (When Resuming)

### **Current Status**

- MSW v1 migration: ✅ COMPLETE
- AIInsightsPanel tests: 6/9 passing (67%)
- Remaining work: Fix 3 tests + update 9 component files

### **Run Tests**

```bash
# Single component
npm test -- --passWithNoTests --maxWorkers=2 AIInsightsPanel

# All tests
npm test -- --passWithNoTests --maxWorkers=2

# With coverage
npm run test:coverage
```

---

## 🔧 MSW v1 SYNTAX (Current Standard)

### **Import Statement**

```typescript
import { rest } from "msw"; // ✅ CORRECT (MSW v1)
// NOT: import { http, HttpResponse } from 'msw';  // ❌ OLD (MSW v2)
```

### **Handler Pattern**

```typescript
// ✅ CORRECT (MSW v1)
rest.get('http://localhost/api/endpoint', (req, res, ctx) => {
  return res(ctx.json({
    data: {
      // your data here
    }
  }));
}),

// ❌ OLD (MSW v2 - Don't use)
http.get('http://localhost:3000/api/endpoint', () => {
  return HttpResponse.json({ data: {...} });
}),
```

### **Error Handler Pattern**

```typescript
// ✅ CORRECT (MSW v1)
server.use(
  rest.get("http://localhost/api/endpoint", (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: "Internal Server Error" }));
  }),
);
```

---

## 📝 FIND & REPLACE PATTERNS

### **Pattern 1: Import Statement**

- **Find**: `import { http, HttpResponse } from 'msw';`
- **Replace**: `import { rest } from 'msw';`

### **Pattern 2: Handler Opening**

- **Find**: `http.get(`
- **Replace**: `rest.get(`

### **Pattern 3: Handler Function**

- **Find**: `() => {`
- **Replace**: `(req, res, ctx) => {`

### **Pattern 4: Response**

- **Find**: `return HttpResponse.json(`
- **Replace**: `return res(ctx.json(`

### **Pattern 5: URL**

- **Find**: `http://localhost:3000/`
- **Replace**: `http://localhost/`

---

## 🐛 FIXING THE 3 FAILING TESTS

### **Test 1 & 2: Loading State Issues**

**Current Problem**: Component loads too fast
**File**: `src/components/financial/__tests__/AIInsightsPanel.test.tsx`
**Lines**: 32-50

**Fix Option A - Add Loading Skeleton**:

```typescript
it('should render loading state initially', async () => {
  renderWithProviders(<AIInsightsPanel />);

  // Look for loading skeleton/pulse animation
  const loadingElement = screen.getByTestId('loading-skeleton');
  expect(loadingElement).toBeInTheDocument();
});
```

**Fix Option B - Use act() Wrapper**:

```typescript
it('should render loading state initially', async () => {
  await act(async () => {
    renderWithProviders(<AIInsightsPanel />);
  });

  // Component should show loading initially
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### **Test 3: Toggle Button MouseEvent Issue**

**Current Problem**: `TypeError: Class constructor MouseEvent cannot be invoked without 'new'`
**File**: `src/components/financial/__tests__/AIInsightsPanel.test.tsx`
**Lines**: 103-115

**Fix - Use fireEvent Instead**:

```typescript
import { screen, waitFor, fireEvent } from '@testing-library/react';

it('should toggle expand/collapse when button is clicked', async () => {
  renderWithProviders(<AIInsightsPanel />);

  await waitFor(() => {
    expect(screen.getByText(/AI-Powered Insights/i)).toBeInTheDocument();
  });

  const toggleButton = screen.getByRole('button', { name: /collapse|expand/i });

  // Use fireEvent instead of user.click()
  fireEvent.click(toggleButton);

  // Verify state changed
  expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
});
```

---

## 📂 FILES TO UPDATE (9 Remaining)

All in `src/components/*/tests/` directory:

1. `budget/__tests__/AIBudgetOptimizer.test.tsx`
2. `goals/__tests__/AIGoalsOptimizer.test.tsx`
3. `spending/__tests__/AISpendingInsights.test.tsx`
4. `bills/__tests__/AIBillsOptimizer.test.tsx`
5. `credit-monitoring/__tests__/AICreditInsights.test.tsx`
6. `disputes/__tests__/AIDisputeStrategy.test.tsx`
7. `investments/__tests__/AIInvestmentInsights.test.tsx`
8. `credit-builder/__tests__/AICreditRoadmap.test.tsx`
9. `credit-repair/__tests__/AICreditRepairStrategy.test.tsx`

**For each file, apply all 5 find & replace patterns above.**

---

## 🎯 SESSION GOALS

### **Goal 1: Fix AIInsightsPanel (30 min)**

- Fix 3 failing tests
- Achieve 9/9 passing (100%)

### **Goal 2: Update Remaining Tests (1-2 hours)**

- Update 9 component test files to MSW v1
- Run each test file to verify

### **Goal 3: Full Test Suite (30 min)**

- Run all 130+ tests
- Generate coverage report
- Review results

---

## 📊 EXPECTED OUTCOMES

After completing all work:

- ✅ 10/10 component test files using MSW v1
- ✅ 130+ tests passing
- ✅ 80%+ code coverage
- ✅ No MSW polyfill errors
- ✅ CI/CD ready

---

## 🔗 KEY FILES

- **Session Summary**: `TESTING_SUITE_SESSION_SUMMARY.md`
- **Original Status**: `TESTING_SUITE_STATUS_AND_NEXT_STEPS.md`
- **MSW Handlers**: `src/__tests__/mocks/handlers.ts`
- **Setup Tests**: `src/setupTests.ts`
- **Jest Config**: `jest.config.js`

---

**Last Updated**: 2025-12-29  
**Next Action**: Fix 3 failing tests in AIInsightsPanel
