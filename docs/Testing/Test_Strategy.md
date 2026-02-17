# Test Strategy — Fynvita Platform

> **Single Source of Truth for testing approach, tooling, environments, and quality gates.**
> Last Updated: 2026-02-16

---

## 1. Test Pyramid

```
        ╱  E2E (Playwright)  ╲         ~5%   Critical user journeys
       ╱─────────────────────╲
      ╱   E2E (Cypress)       ╲        ~10%  API + page route validation
     ╱─────────────────────────╲
    ╱     Integration (Jest)    ╲       ~25%  API routes, service interactions
   ╱─────────────────────────────╲
  ╱         Unit (Jest)           ╲     ~60%  Business logic, utilities, components
 ╱─────────────────────────────────╲
```

| Layer | Framework | Count (files) | Approx Cases | Focus |
|-------|-----------|--------------|--------------|-------|
| Unit | Jest | ~100 | ~800 | Pure functions, service methods, component rendering |
| Integration | Jest | ~49 | ~300 | API route handlers, service-to-service, DB interactions |
| Mobile | Jest | 12 | ~180 | Mobile components, stores, API clients, navigation |
| E2E (API) | Cypress | 21 | ~276 | Route accessibility, auth enforcement, response formats |
| E2E (UI) | Playwright | 16 | ~100+ | Full browser journeys, multi-page flows |
| **Total** | | **198** | **~1,660+** | |

---

## 2. Frameworks & Tooling

### 2.1 Jest (Unit + Integration)

- **Version**: jest@^30.2.0
- **Environment**: jsdom (browser simulation)
- **Transformer**: ts-jest for TypeScript
- **Coverage Tool**: Built-in V8 coverage
- **Config**: `jest.config.ts` at project root
- **Path Aliases**: `@/*` mapped to `<rootDir>/src/*`

**Key Configuration:**
```
testEnvironment: 'jsdom'
transform: ts-jest
coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } }
testTimeout: 10000
```

**Mocking Strategy:**
- External APIs (AIML, Stripe, Supabase, AWS S3, Resend): Mocked at module level via `jest.mock()`
- Internal services: Real implementations where possible, mocked only at system boundaries
- Environment variables: Set in test setup files
- Fetch/HTTP: `jest.fn()` or `msw` for API route tests

### 2.2 Cypress (E2E — API & Route Validation)

- **Version**: cypress@^15.5.0
- **Base URL**: `http://localhost:3000`
- **Viewport**: 1280x720
- **Config**: `cypress.config.ts`
- **Support**: `cypress/support/e2e.ts`, `cypress/support/commands.ts`

**Test Categories (21 specs):**

| Category | Specs | Focus |
|----------|-------|-------|
| Page Access | 5 | Public pages return 200, protected pages return 307 redirect |
| Auth Enforcement | 4 | API endpoints return 401 without auth token |
| API Contracts | 6 | Response format, content-type, error body structure |
| User Workflows | 2 | Multi-step user journeys (landing → pricing → login) |
| Responsive | 2 | Mobile, tablet, desktop viewport rendering |
| Security Headers | 1 | CSP, HSTS, X-Frame-Options validation |
| Health Check | 1 | API endpoint availability |

**Execution:**
```bash
npm run cypress:open    # Interactive mode
npm run cypress:run     # Headless CI mode
npx cypress run --spec "cypress/e2e/<file>.cy.ts"  # Single spec
```

### 2.3 Playwright (E2E — Browser Journeys)

- **Version**: @playwright/test (latest)
- **Browsers**: Chromium, Firefox, WebKit
- **Config**: `playwright.config.ts`
- **Base URL**: `http://localhost:3000`

**Test Suites (16 specs):**

| Suite | Focus |
|-------|-------|
| home.spec.ts | Landing page load and navigation |
| auth.spec.ts | Login/logout flows |
| dashboard.spec.ts | Dashboard rendering and navigation |
| api.spec.ts | API endpoint validation |
| chat-suite.spec.ts | AI chat functionality |
| financial-suite.spec.ts | Financial tools and calculators |
| investment-suite.spec.ts | Investment portfolio features |
| marketplace.spec.ts | Marketplace browsing |
| pricing.spec.ts | Pricing page and tier display |
| student-loans.spec.ts | Student loan tools |
| investment-*.spec.ts (6) | Detailed investment feature tests |

---

## 3. Test Environments

| Environment | Purpose | Database | External Services | Run By |
|-------------|---------|----------|-------------------|--------|
| Local (dev) | Developer feedback loop | Supabase (dev project) | Mocked | Developer |
| CI (GitHub Actions) | PR validation | Supabase (test project) | Mocked | Automated |
| Staging | Pre-production validation | Supabase (staging) | Sandbox APIs | Automated + Manual |
| Production | Smoke tests only | Supabase (prod) | Live APIs | Automated (post-deploy) |

### Environment Variables for Testing

```env
# Test-specific overrides
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=<test-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test-anon-key>
AIML_API_KEY=test-key-mock
STRIPE_SECRET_KEY=sk_test_xxx
```

---

## 4. Coverage Thresholds & Gates

### 4.1 Coverage Requirements

| Metric | Threshold | Current (est.) |
|--------|-----------|----------------|
| Statements | 80% | ~81% |
| Branches | 80% | ~78% |
| Functions | 80% | ~80% |
| Lines | 80% | ~81% |

### 4.2 Quality Gates (CI Pipeline)

```
Gate 1: Lint          → ESLint + Prettier (zero warnings)
Gate 2: Type Check    → tsc --noEmit --strict (zero errors)
Gate 3: Unit Tests    → Jest (all pass, coverage ≥ 80%)
Gate 4: Build         → next build (zero errors, bundle size < 150kB first load)
Gate 5: E2E (Cypress) → All 21 specs pass (requires dev server)
Gate 6: E2E (Playwright) → All 16 specs pass (requires dev server)
```

### 4.3 Merge Requirements

- All quality gates pass
- No new TypeScript errors introduced
- No security vulnerabilities (npm audit --audit-level=high)
- PR review approved

---

## 5. Test Data Strategy

### 5.1 Fixtures & Factories

- **User fixtures**: Pre-defined test users with different roles (user, premium, admin, super_admin)
- **Credit data**: Synthetic credit reports with known scores and items
- **Dispute data**: Template disputes in various lifecycle stages
- **Payment data**: Stripe test mode tokens and webhook payloads

### 5.2 Database State

- **Jest**: No real database — services mocked at boundary
- **Cypress**: Tests against running dev server with Supabase dev project
- **Playwright**: Tests against running dev server with Supabase dev project
- **Cleanup**: Each E2E test suite handles its own cleanup via API calls or is idempotent

### 5.3 External Service Mocking

| Service | Jest Mock | E2E Approach |
|---------|-----------|--------------|
| AIML API | `jest.mock('@/lib/aiml-service')` | Real API (rate-limited) or MSW |
| Supabase Auth | `jest.mock('@/lib/supabase')` | Real auth (test project) |
| Stripe | `jest.mock('stripe')` | Stripe test mode |
| AWS S3 | `jest.mock('@aws-sdk/client-s3')` | LocalStack or mocked |
| Resend | `jest.mock('resend')` | Mocked (no real emails) |

---

## 6. Test Naming Conventions

### Jest
```
src/lib/__tests__/<module>.test.ts        — Library unit tests
src/lib/<module>/__tests__/<file>.test.ts  — Feature module tests
src/app/__tests__/page.test.tsx           — Page component tests
src/app/api/<route>/__tests__/route.test.ts — API route tests
src/components/__tests__/<comp>.test.tsx   — Component tests
```

### Cypress
```
cypress/e2e/<feature>.cy.ts              — Feature E2E specs
cypress/e2e/<feature>-api.cy.ts          — API-focused E2E specs
```

### Playwright
```
e2e/<feature>.spec.ts                    — Feature E2E specs
e2e/<feature>-suite.spec.ts             — Multi-feature suite specs
```

### Test Case Naming
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should <expected behavior> when <condition>', () => { ... });
    it('should throw <ErrorType> when <invalid condition>', () => { ... });
  });
});
```

---

## 7. Critical Path Tests

These tests MUST pass before any production deployment:

| ID | Path | Test Type | What It Validates |
|----|------|-----------|-------------------|
| CP-01 | Auth flow | Playwright | Login → session → protected route access |
| CP-02 | Payment checkout | Jest + Cypress | Stripe checkout session creation, webhook handling |
| CP-03 | Credit repair API | Cypress | All credit-repair endpoints enforce auth (401) |
| CP-04 | Dispute lifecycle | Jest | Create → send → review → resolve status transitions |
| CP-05 | AI chat | Cypress | /api/ai/chat returns 401 without auth |
| CP-06 | Protected routes | Cypress | All 9+ protected routes redirect to /login (307) |
| CP-07 | Public pages | Cypress | Landing, pricing, credit/factors return 200 |
| CP-08 | Input validation | Jest | Prompt injection detection, PII detection |
| CP-09 | Rate limiting | Jest | Per-IP and per-user throttling works |
| CP-10 | Document upload | Jest | S3 upload, validation, presigned URL generation |

---

## 8. Flaky Test Policy

- Flaky tests are **P0 bugs** — fix within 24 hours or quarantine
- Quarantined tests are tracked in `docs/Testing/QUARANTINE.md`
- A test is "flaky" if it fails >2% of runs without code changes
- Root causes to investigate: timing, network, shared state, environment

---

## 9. Running Tests

### Quick Reference

```bash
# Unit + Integration (Jest)
npm test                                    # All tests
npm test -- --watch                         # Watch mode
npm test -- --coverage                      # With coverage report
npm test -- src/lib/__tests__/aiml-service  # Single file

# E2E (Cypress)
npm run cypress:open                        # Interactive
npm run cypress:run                         # Headless
npx cypress run --spec "cypress/e2e/disputes.cy.ts"

# E2E (Playwright)
npx playwright test                         # All specs
npx playwright test e2e/auth.spec.ts        # Single spec
npx playwright test --ui                    # Interactive UI mode

# Full Pipeline (CI order)
npm run lint && npm run type-check && npm test -- --coverage && npm run build
```

---

*Document generated from codebase analysis on 2026-02-16.*
