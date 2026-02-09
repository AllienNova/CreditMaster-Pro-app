# Testing Guide - CreditMaster Pro

**Last Updated**: January 5, 2026

---

## 📋 **OVERVIEW**

This guide covers how to run all test suites for the CreditMaster Pro application, including unit tests, integration tests, and E2E tests.

---

## 🧪 **TEST SUITES**

### **1. Unit Tests (Jest)**

**Location**: `src/__tests__/`, `src/lib/**/__tests__/`

**Run all unit tests**:
```bash
npm test
```

**Run specific test file**:
```bash
npm test -- financial-chat-engine.test.ts
```

**Run tests with coverage**:
```bash
npm test -- --coverage
```

**Run tests in watch mode**:
```bash
npm test -- --watch
```

---

### **2. E2E Tests (Playwright)**

**Location**: `e2e/`

**Prerequisites**:
```bash
# Install Playwright browsers (first time only)
npx playwright install
```

**Run all E2E tests**:
```bash
npx playwright test
```

**Run specific test suite**:
```bash
# Financial flows
npx playwright test e2e/financial-suite.spec.ts

# Investment flows
npx playwright test e2e/investment-suite.spec.ts

# Chat flows
npx playwright test e2e/chat-suite.spec.ts
```

**Run tests in headed mode (see browser)**:
```bash
npx playwright test --headed
```

**Run tests in debug mode**:
```bash
npx playwright test --debug
```

**Run tests on specific browser**:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**View test report**:
```bash
npx playwright show-report
```

---

### **3. Integration Tests (Jest)**

**Location**: `src/__tests__/integration/`

**Run integration tests**:
```bash
npm test -- --testPathPattern=integration
```

**Run specific integration test**:
```bash
npm test -- service-integration.test.ts
```

---

### **4. Mobile Tests (React Native)**

**Location**: `mobile-app/e2e/`

**Run mobile E2E tests**:
```bash
cd mobile-app
npm run test:e2e
```

**Run mobile unit tests**:
```bash
cd mobile-app
npm test
```

---

## 🎯 **TEST SCENARIOS BY FEATURE**

### **Financial Chat Engine**

**Unit Tests**:
```bash
npm test -- financial-chat-engine.test.ts
```

**E2E Tests**:
```bash
npx playwright test e2e/chat-suite.spec.ts
```

**Integration Tests**:
```bash
npm test -- service-integration.test.ts
```

---

### **Investment Intelligence**

**Unit Tests**:
```bash
npm test -- ai-stock-analyst.test.ts
npm test -- portfolio-analytics.test.ts
```

**E2E Tests**:
```bash
npx playwright test e2e/investment-suite.spec.ts
npx playwright test e2e/investments/
```

---

### **Financial Intelligence**

**E2E Tests**:
```bash
npx playwright test e2e/financial-suite.spec.ts
```

---

## 📊 **TEST COVERAGE**

**Generate coverage report**:
```bash
npm test -- --coverage --coverageDirectory=coverage
```

**View coverage report**:
```bash
# Open in browser
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows
```

**Coverage thresholds**:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

---

## 🔧 **ENVIRONMENT SETUP**

### **Required Environment Variables**

Create `.env.test.local` file:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key

# AIML Service
AIML_API_KEY=your_test_aiml_key
AIML_API_URL=https://api.aimlapi.com

# Test Database
DATABASE_URL=your_test_database_url
```

### **Test Database Setup**

```bash
# Run migrations on test database
npx supabase db push --db-url your_test_database_url

# Seed test data (optional)
npm run seed:test
```

---

## 🚀 **CI/CD INTEGRATION**

### **GitHub Actions**

Tests run automatically on:
- Pull requests
- Pushes to `main` branch
- Manual workflow dispatch

**View test results**:
- Go to GitHub Actions tab
- Select workflow run
- View test results and artifacts

---

## 🐛 **DEBUGGING TESTS**

### **Debug Playwright Tests**

```bash
# Run with debug mode
npx playwright test --debug

# Run specific test with debug
npx playwright test e2e/chat-suite.spec.ts --debug

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### **Debug Jest Tests**

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Use VS Code debugger
# Add breakpoint in test file
# Press F5 to start debugging
```

---

## 📝 **WRITING NEW TESTS**

### **E2E Test Template**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.click('[data-testid="button"]');

    // Act
    await page.fill('input[name="field"]', 'value');
    await page.click('[data-testid="submit"]');

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### **Integration Test Template**

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Service Integration', () => {
  it('should integrate services correctly', async () => {
    // Arrange
    const data = createTestData();

    // Act
    const result = await serviceFunction(data);

    // Assert
    expect(result).toBeDefined();
    expect(result.property).toBe(expectedValue);
  });
});
```

---

## ✅ **TEST CHECKLIST**

Before committing code, ensure:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Code coverage meets thresholds
- [ ] No console errors or warnings
- [ ] Tests are deterministic (no flaky tests)
- [ ] Test data is cleaned up after tests

---

## 📚 **ADDITIONAL RESOURCES**

- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues**

**Issue**: Tests fail with "Cannot find module"
**Solution**: Run `npm install` to install dependencies

**Issue**: Playwright tests timeout
**Solution**: Increase timeout in `playwright.config.ts`

**Issue**: Database connection errors
**Solution**: Check `.env.test.local` configuration

**Issue**: Flaky tests
**Solution**: Add proper wait conditions, avoid hardcoded timeouts

---

## 📞 **SUPPORT**

For test-related issues:
1. Check this guide
2. Review test logs
3. Check GitHub Issues
4. Contact development team

