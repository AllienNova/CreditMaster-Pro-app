# Project Analysis Report: Fynvita

**Date**: February 5, 2026
**Analyst**: RALP Loop Engine v1.0
**Project Health Score**: 38/100

---

## Executive Summary

Fynvita is an ambitious AI-powered financial platform (Next.js 15 + React 19 + Supabase + TypeScript 5.7) with **1,295 TypeScript files spanning ~78,000 lines of code** and **248 API routes**. While the project demonstrates impressive breadth of implementation, it suffers from **critical security gaps** (126 of 248 API routes lack authentication), **massive code sprawl** (392 files over 300 lines, 24 over 1,000 lines), **test coverage far below claims** (README says 81.42% but also admits ~1.86%), and **14 debug.log files committed to source**. The codebase has grown far beyond its documentation — the CLAUDE.md describes 21 API routes and 10+ components, while reality shows 248 routes and 272+ components. This is a project that expanded rapidly without maintaining architectural discipline. **It is NOT production-ready** despite documentation claims.

---

## Scorecard

```
┌─────────────────────────────┬──────────┬───────────────────────────────────────────────┐
│ Dimension                   │ Score    │ Evidence Summary                              │
├─────────────────────────────┼──────────┼───────────────────────────────────────────────┤
│ Implementation Completeness │ 45/100   │ Massive breadth but many stubs/placeholders   │
│ Code Quality                │ 25/100   │ 392 god objects, 165 `any` types, 14 debug.log│
│ Security                    │ 15/100   │ 126/248 routes unauth'd, secrets in .env.local│
│ API Design                  │ 30/100   │ 248 routes, inconsistent auth, no versioning  │
│ UI/UX Design                │ 50/100   │ Dark mode, a11y basics, but 191 'use client'  │
│ Integration & Data Flow     │ 35/100   │ 32 migrations but mock data, no real bureaus  │
│ Performance                 │ 40/100   │ K6 config exists, but 2279-line page.tsx       │
│ DevOps & Infrastructure     │ 60/100   │ GitHub Actions, Docker, Vercel, security hdrs │
│ Testing Coverage            │ 15/100   │ 149 test files but ~1.86% actual coverage     │
│ Documentation               │ 45/100   │ Extensive but contradictory and outdated      │
├─────────────────────────────┼──────────┼───────────────────────────────────────────────┤
│ OVERALL PROJECT HEALTH      │ 38/100   │ Weighted: Security×2, Quality×1.5, rest×1    │
└─────────────────────────────┴──────────┴───────────────────────────────────────────────┘
```

---

## Plan vs Implementation Delta

### Documentation Claims vs Reality

| Metric | CLAUDE.md Claims | README Claims | Actual (Verified) | Status |
|--------|-----------------|---------------|-------------------|--------|
| API Routes | 21 | 279 | 248 route files | ⚠️ Contradictory |
| Components | 10+ | 272 | 245+ files in components/ | ⚠️ Contradictory |
| Test Coverage | 81.42% | ~1.86% | Unknown (not runnable) | ❌ Contradictory |
| Lines of Code | 15,000+ | — | ~78,135 | ⚠️ 5x undercount |
| TypeScript Errors | 0 | 0 | 0 (confirmed) | ✅ Accurate |
| Files | 60+ | — | 1,295 TS/TSX files | ⚠️ 20x undercount |
| Tests | 83 passing | — | 149 test files | ⚠️ Unclear |
| Build | Successful | Working | Not verified this session | — |

### todo.md Planned Features vs Reality

| Planned Feature/Task | Plan Reference | Status |
|---------------------|---------------|--------|
| Input validation & sanitization | todo.md Phase 1 | ✅ Implemented (src/lib/security/input-validation.ts) |
| Output validation | todo.md Phase 1 | ✅ Implemented (src/lib/security/output-validation.ts) |
| Auth middleware to AI routes | todo.md Phase 1 | ⚠️ Partial (only 122/248 routes) |
| API key rotation | todo.md Phase 1 | ❌ Not implemented |
| Validation middleware | todo.md Phase 1 | ❌ Not a universal middleware |
| Prompt testing suite | todo.md Phase 2 | ❌ Missing |
| A/B testing framework | todo.md Phase 2 | ❌ Missing |
| Credit Bureau Integration (Experian/Equifax/TransUnion) | todo.md Phase 4 | ⚠️ Stubs only (mock generators) |
| Dispute tracking system | todo.md Phase 4 | ⚠️ Partial (PATCH/DELETE unauth'd) |
| Document management | todo.md Phase 4 | ✅ Implemented (S3 integration) |
| Notification service | todo.md Phase 4 | ✅ Implemented (email + in-app) |
| Payment gateway (Stripe) | todo.md Phase 4 | ✅ Implemented |
| Admin console | todo.md Phase 4 | ⚠️ Partial (routes exist, UI unclear) |
| Score simulator | todo.md Phase 5 | ✅ Implemented |
| Goal tracker | todo.md Phase 5 | ✅ Implemented |
| Progress visualization | todo.md Phase 5 | ❌ Missing |
| Gamification | todo.md Phase 5 | ⚠️ Partial (services exist, likely stubs) |
| Educational content | todo.md Phase 5 | ⚠️ Partial (onboarding content exists) |
| Multi-tenant admin | todo.md Phase 6 | ❌ Missing |
| White-label capabilities | todo.md Phase 6 | ❌ Missing |
| CRM system | todo.md Phase 6 | ❌ Missing |
| E-signature integration | todo.md Phase 6 | ❌ Missing |
| Performance monitoring (APM) | todo.md Quality | ⚠️ Partial (K6 local only) |

---

## Critical Findings

### Finding #1: CRITICAL — 126 of 248 API Routes Have No Authentication (51%)

**Severity**: CRITICAL
**Category**: Security
**Evidence**: Grep for auth patterns across all route.ts files

Unauthenticated routes include:
- `src/app/api/credit-bureau/report/route.ts` — Credit report data
- `src/app/api/credit-bureau/dispute/route.ts` — Dispute creation
- `src/app/api/credit-monitoring/scores/route.ts` — Credit scores
- `src/app/api/credit-repair/score/route.ts` — Score data
- `src/app/api/disputes/generate/route.ts` — AI-generated letters
- `src/app/api/documents/upload/route.ts` — File uploads
- `src/app/api/financial/bills/detect/route.ts` — Financial data
- `src/app/api/financial/ai-insights/route.ts` — AI insights
- `src/app/api/cron/*` — Cron endpoints (no auth secret)
- `src/app/api/ai/create-workflow/route.ts` — AI workflows
- `src/app/api/ai/predict-outcomes/route.ts` — AI predictions
- ...and 114 more

**Impact**: Any caller can access, modify, or delete user financial data without authentication.

### Finding #2: CRITICAL — 14 debug.log Files Committed to Source

**Severity**: HIGH
**Category**: Code Quality
**Evidence**: `find src -name "debug.log"`

```
src/app/api/credit-repair/negotiate/debug.log
src/app/credit-reports/debug.log
src/app/financial/debt/debug.log
src/app/help/debug.log
src/app/help/guides/debug.log
src/components/charts/debug.log
src/components/financial/debug.log
src/components/__tests__/debug.log
src/emails/debug.log
src/lib/financial/debug.log
src/lib/financial/types/debug.log
src/lib/financial/__tests__/debug.log
src/lib/i18n/debug.log
src/lib/__tests__/debug.log
```

**Impact**: Debug logs may contain sensitive runtime data, PII, or API keys. They should never be in source control.

### Finding #3: CRITICAL — Contradictory Test Coverage Claims

**Severity**: HIGH
**Category**: Testing
**Evidence**: README.md line 11 says `~1.86%` while CLAUDE.md says `81.42%`

The README itself admits:
> Tests: Multiple failures (coverage infrastructure issues)
> Coverage: ~1.86% (needs improvement)

Yet the same README also says `Coverage: 81.42%` in the testing section. The CLAUDE.md claims `100% coverage on critical paths`. These are irreconcilable.

**Impact**: No confidence in test coverage. The 149 test files may not actually be passing.

### Finding #4: HIGH — 392 God Objects (Files Over 300 Lines)

**Severity**: HIGH
**Category**: Code Quality
**Evidence**: `wc -l` on all .ts/.tsx files

Top offenders (non-test files):
- `src/lib/investments/ai-stock-analyst.ts` — **2,335 lines**
- `src/app/page.tsx` — **2,279 lines**
- `src/lib/financial/health-score-calculator-v2.ts` — **1,756 lines**
- `src/lib/financial/financial-aggregation-service.ts` — **1,732 lines**
- `src/lib/financial/spending-analyzer.ts` — **1,584 lines**
- `src/lib/financial/smart-budget-engine.ts` — **1,544 lines**
- `src/lib/financial/spending-analysis-service.ts` — **1,424 lines**
- `src/lib/investments/signal-generator.ts` — **1,387 lines**
- `src/lib/financial/savings-optimizer.ts` — **1,353 lines**
- `src/lib/ai/financial-chat-engine.ts` — **1,270 lines**

24 files exceed 1,000 lines. 210 exceed 500 lines. These violate single-responsibility principle.

### Finding #5: HIGH — 165 `any` Type Annotations

**Severity**: HIGH
**Category**: Code Quality / Type Safety
**Evidence**: `grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l` = 165

Despite TypeScript strict mode being enabled, 165 instances of `: any` bypass type safety. This contradicts the CLAUDE.md claim of "0 any types."

### Finding #6: HIGH — .env.local Exists with Real Credentials

**Severity**: HIGH
**Category**: Security
**Evidence**: `.env.local` file exists (2,548 bytes) alongside `.env.example`

While not tracked in git, the presence of `.env.local` with real credentials and no pre-commit secret scanning hook means accidental commits are possible.

### Finding #7: MEDIUM — 216 console.error Statements in Production Code

**Severity**: MEDIUM
**Category**: Code Quality
**Evidence**: Grep for console.error excluding test files = 216, console.log = 6, console.warn = 2

While console.error is acceptable for error logging, 216 instances suggests the codebase relies on console instead of the structured logging service at `src/lib/monitoring/logger.ts`.

### Finding #8: MEDIUM — Massive Codebase Sprawl Without Organization

**Severity**: MEDIUM
**Category**: Architecture
**Evidence**: `src/lib/` contains 400+ files across 30+ subdirectories

The lib/ directory has grown organically without consistent organization:
- Multiple competing implementations: `dispute-service.ts` vs `dispute-service-db.ts`
- Duplicate functionality: `rate-limiting.ts` vs `rate-limiter.ts` vs `redis-rate-limiting.ts`
- Abandoned modules: `my-gemini-app/` directory at root
- `smart-insights-engine.ts` at project root (not in src/)

### Finding #9: MEDIUM — 191 'use client' Directives

**Severity**: MEDIUM
**Category**: Performance / Architecture
**Evidence**: UI/UX agent found 191 'use client' directives

Excessive client-side rendering defeats the purpose of Next.js Server Components. Many components that could be server-rendered are forced client-side.

### Finding #10: LOW — Outdated Documentation Files

**Severity**: LOW
**Category**: Documentation
**Evidence**: Multiple status documents with different dates and conflicting claims

Files with contradictory information:
- `CLAUDE.md` — Last updated Nov 29, 2025
- `README.md` — Last updated Jan 7, 2026
- `CPFI_IMPLEMENTATION_STATUS_2025-12-29.md`
- `IMPLEMENTATION_COMPLETE_2025-12-29.md`
- `PROJECT_STATUS_AND_RECOMMENDATIONS_2025-12-30.md`
- `Organized_CreditMaster_Pro_TaskList.md` — 112KB task list

---

## Gap Analysis by Category

### Security [15/100]

| Issue | Severity | File(s) | Action |
|-------|----------|---------|--------|
| 126 unauth'd API routes | CRITICAL | src/app/api/**/* | Add auth middleware to all routes |
| Cron endpoints unprotected | CRITICAL | src/app/api/cron/* | Add secret-based auth |
| No pre-commit secret scanning | HIGH | .git/hooks/ | Install git-secrets or detect-secrets |
| CORS configured but wildcard risk | MEDIUM | next.config.js | Verify origin whitelist |
| No CSRF protection on mutations | MEDIUM | src/app/api/**/* | Add CSRF tokens |
| Rate limiting exists but inconsistent | MEDIUM | src/lib/security/ | Standardize across all routes |

### Code Quality [25/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| 24 files over 1,000 lines | CRITICAL | Multiple lib/ files | Break into focused modules |
| 165 `any` types | HIGH | Across src/ | Replace with proper types |
| 14 debug.log in source | HIGH | src/**/debug.log | Delete and add to .gitignore |
| Duplicate services | MEDIUM | 3 rate limiters, 2 dispute services | Consolidate |
| smart-insights-engine.ts at root | LOW | Project root | Move to src/lib/ |

### API Design [30/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| 51% routes lack auth | CRITICAL | 126/248 routes | Add auth layer |
| No API versioning | HIGH | All routes at /api/* | Add /api/v1/* prefix |
| Inconsistent error responses | MEDIUM | Various API routes | Standardize error format |
| No OpenAPI spec (auto-generated) | MEDIUM | — | Generate from routes |
| Missing pagination on list endpoints | MEDIUM | Various GET routes | Add cursor pagination |

### UI/UX Design [50/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| 2,279-line landing page | HIGH | src/app/page.tsx | Extract into components |
| 191 'use client' overuse | MEDIUM | Components across src/ | Convert to RSC where possible |
| Dark mode implemented | ✅ | tailwind.config.ts, globals.css | — |
| Accessibility basics present | ✅ | prefers-reduced-motion, focus-visible | — |
| Loading skeletons exist | ✅ | src/components/ui/Skeleton.tsx | — |
| Empty states exist | ✅ | src/components/ui/EmptyState.tsx | — |
| i18n infrastructure exists | ✅ | src/lib/i18n/ (5 files) | — |

### Integration & Data Flow [35/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| Credit bureau = mock only | HIGH | src/lib/credit-bureau/mock-* | Implement real API integration |
| 32 Supabase migrations | ✅ | supabase/migrations/ | — |
| RLS enforcement | ✅ | Supabase policies | — |
| Plaid integration exists | ✅ | src/lib/financial/plaid-service.ts | — |
| Stripe webhooks configured | ✅ | src/app/api/payment/webhook/ | — |

### Performance [40/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| 2,279-line page.tsx | HIGH | src/app/page.tsx | Code-split and lazy load |
| 191 client components | MEDIUM | 'use client' directives | Reduce client JS bundle |
| K6 load testing exists | ✅ | performance/ | — |
| Image optimization configured | ✅ | next.config.js (AVIF/WebP) | — |
| Bundle analysis script | ✅ | scripts/analyze-bundle.js | — |

### Testing [15/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| Contradictory coverage claims | CRITICAL | README: 1.86% vs CLAUDE: 81.42% | Run actual coverage report |
| 149 test files may not pass | HIGH | Test infrastructure issues noted | Fix and run full suite |
| E2E dual framework | MEDIUM | Both Cypress and Playwright | Consolidate on Playwright |
| 80% threshold configured | ✅ | jest.config.js | — |
| Mocking infrastructure | ✅ | src/__tests__/mocks/ | — |

### DevOps & Infrastructure [60/100]

| Issue | Severity | Evidence | Action |
|-------|----------|----------|--------|
| GitHub Actions configured | ✅ | .github/workflows/ | — |
| Docker multi-stage build | ✅ | Dockerfile | — |
| Vercel deployment | ✅ | vercel.json | — |
| Security headers | ✅ | next.config.js (HSTS, CSP, etc.) | — |
| No Lighthouse CI | MEDIUM | — | Add to CI pipeline |
| No pre-commit hooks | MEDIUM | — | Add husky + lint-staged |
| No secret scanning | HIGH | — | Add detect-secrets |

---

## Pattern Analysis

### Recurring Themes

1. **Breadth Over Depth**: The project has 248 API routes, 272+ components, and 1,295 files, but most lack proper auth, validation, and testing. Growth was horizontal (more features) rather than vertical (feature quality).

2. **Documentation Drift**: CLAUDE.md documents a 21-route, 10-component app. The reality is 12x larger. Every status document claims different completion percentages and metrics.

3. **Security as Afterthought**: Security services exist (`input-validation.ts`, `auth-middleware.ts`, `rate-limiting.ts`) but are only applied to ~49% of routes. The security layer was built but not consistently integrated.

4. **Duplicate Implementations**: Multiple versions of similar services (3 rate limiters, 2 dispute services, duplicate credit bureau files) suggest code was written by multiple AI sessions without coordinating.

5. **God Object Proliferation**: 24 files exceed 1,000 lines. The largest (2,335 lines) contains stock analysis logic that should be 5+ separate services.

### Root Cause Analysis

| Gap Category | Root Cause | Fix Type |
|-------------|-----------|----------|
| Unauth'd routes | Rapid feature generation without security middleware | Process (middleware pattern) |
| God objects | Features implemented in single files without decomposition | Refactoring |
| Test coverage lies | Coverage infrastructure broke, numbers weren't re-verified | Tooling fix |
| Debug logs in source | Missing .gitignore entries for debug.log | Quick fix |
| Doc contradictions | Multiple AI sessions each wrote their own status docs | Doc consolidation |

### Risk Assessment

| # | Risk | Probability | Impact | Priority |
|---|------|-------------|--------|----------|
| 1 | Data breach via unauth'd API routes | HIGH | CRITICAL | P0 |
| 2 | Test suite doesn't actually run/pass | HIGH | HIGH | P0 |
| 3 | Secret accidentally committed to git | MEDIUM | CRITICAL | P1 |
| 4 | Performance degradation from god objects | HIGH | MEDIUM | P1 |
| 5 | Maintenance impossible due to code sprawl | HIGH | HIGH | P2 |

---

## RALP Execution Plan

### Wave 1: STABILIZE [12 tasks]

*Fix blockers and critical security vulnerabilities*

#### Task 1: Add authentication to all 126 unauth'd API routes
- **Priority**: P0 (Blocker)
- **Category**: Security
- **Evidence**: 126/248 routes missing auth
- **Action**: Create shared auth middleware and apply to every route. Use Next.js middleware.ts for global enforcement.
- **Skill Hook**: `/secure`
- **Acceptance Criteria**: 0 unauth'd routes (except webhooks and health checks)

#### Task 2: Delete 14 debug.log files and add to .gitignore
- **Priority**: P0 (Blocker)
- **Category**: Security / Quality
- **Evidence**: `find src -name "debug.log"` = 14 files
- **Action**: Delete all debug.log files, add `**/debug.log` to .gitignore
- **Skill Hook**: `/build`
- **Acceptance Criteria**: Zero debug.log files in source tree

#### Task 3: Add cron endpoint authentication
- **Priority**: P0 (Blocker)
- **Category**: Security
- **Evidence**: src/app/api/cron/* endpoints have no auth
- **Action**: Add CRON_SECRET environment variable verification
- **Skill Hook**: `/secure`
- **Acceptance Criteria**: Cron endpoints reject requests without valid secret

#### Task 4: Install pre-commit secret scanning hook
- **Priority**: P1 (Critical)
- **Category**: Security
- **Evidence**: No hooks preventing secret commits
- **Action**: Install detect-secrets or git-secrets with pre-commit
- **Skill Hook**: `/secure`
- **Acceptance Criteria**: Commits with API keys are blocked

#### Task 5: Fix test infrastructure and measure real coverage
- **Priority**: P1 (Critical)
- **Category**: Testing
- **Evidence**: README admits "coverage infrastructure issues" and "~1.86%"
- **Action**: Run `npm test -- --coverage`, fix failures, establish baseline
- **Skill Hook**: `/test`
- **Acceptance Criteria**: All tests pass, real coverage number documented

#### Task 6: Consolidate contradictory documentation
- **Priority**: P1 (Critical)
- **Category**: Documentation
- **Evidence**: 7+ status documents with conflicting claims
- **Action**: Archive old status docs, update CLAUDE.md and README.md with real metrics
- **Skill Hook**: `/doc`
- **Acceptance Criteria**: Single source of truth with verified metrics

#### Task 7: Replace 165 `any` types with proper types
- **Priority**: P1 (Critical)
- **Category**: Code Quality
- **Evidence**: `grep -r ": any" src` = 165 instances
- **Action**: Replace each `any` with proper type, `unknown`, or type guard
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: Zero `: any` in non-test files

#### Task 8: Add CSRF protection to mutation endpoints
- **Priority**: P1 (Critical)
- **Category**: Security
- **Evidence**: src/lib/security/csrf.ts exists but not enforced
- **Action**: Enable CSRF middleware on all POST/PUT/PATCH/DELETE routes
- **Skill Hook**: `/secure`
- **Acceptance Criteria**: CSRF token required on all mutations

#### Task 9: Standardize rate limiting across all routes
- **Priority**: P1 (Critical)
- **Category**: Security
- **Evidence**: 3 competing rate limiter implementations
- **Action**: Consolidate to single rate limiter, apply via middleware
- **Skill Hook**: `/secure`
- **Acceptance Criteria**: Single rate limiter, applied to all public endpoints

#### Task 10: Move smart-insights-engine.ts from root to src/lib/
- **Priority**: P2
- **Category**: Code Quality
- **Evidence**: File at project root outside src/
- **Action**: Move to proper location, update imports
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: No .ts files at project root

#### Task 11: Remove stale root-level files
- **Priority**: P2
- **Category**: Code Quality
- **Evidence**: test-output.txt (31KB), test-results.txt (442KB), lint.log (156KB), etc.
- **Action**: Delete stale output files, add patterns to .gitignore
- **Skill Hook**: `/build`
- **Acceptance Criteria**: No stale log/output files at root

#### Task 12: Clean up my-gemini-app/ directory
- **Priority**: P2
- **Category**: Code Quality
- **Evidence**: Abandoned app at project root
- **Action**: Remove if unused, or document if needed
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: No orphan directories at project root

---

### Wave 2: COMPLETE [8 tasks]

*Implement missing features and fix partial implementations*

#### Task 13: Implement real credit bureau API integration
- **Priority**: P1 (Critical)
- **Category**: Integration
- **Evidence**: src/lib/credit-bureau/mock-credit-report-generator.ts
- **Action**: Replace mock with real Experian/Equifax/TransUnion API calls
- **Skill Hook**: `/api-gen`
- **Acceptance Criteria**: Real credit data flows through the system

#### Task 14: Fix disputes route PATCH/DELETE auth
- **Priority**: P1 (Critical)
- **Category**: Security
- **Evidence**: src/app/api/disputes/route.ts PATCH/DELETE lack auth
- **Action**: Add authentication to all dispute mutation endpoints
- **Skill Hook**: `/secure`
- **Acceptance Criteria**: All dispute endpoints require auth

#### Task 15: Consolidate duplicate services
- **Priority**: P2 (Significant)
- **Category**: Architecture
- **Evidence**: 3 rate limiters, 2 dispute services, 2 notification services
- **Action**: Keep best implementation, remove duplicates, update imports
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: No duplicate service implementations

#### Task 16: Add API versioning
- **Priority**: P2 (Significant)
- **Category**: API Design
- **Evidence**: All routes at /api/* with no version prefix
- **Action**: Add /api/v1/* routing via Next.js rewrites
- **Skill Hook**: `/api-gen`
- **Acceptance Criteria**: All routes versioned

#### Task 17: Add cursor-based pagination to list endpoints
- **Priority**: P2 (Significant)
- **Category**: API Design
- **Evidence**: List endpoints return unbounded results
- **Action**: Implement cursor pagination utility, apply to all list routes
- **Skill Hook**: `/api-gen`
- **Acceptance Criteria**: All list endpoints support pagination

#### Task 18: Implement prompt testing suite
- **Priority**: P2 (Significant)
- **Category**: AI / Testing
- **Evidence**: todo.md Phase 2 lists this as missing
- **Action**: Create test harness for AI prompt quality
- **Skill Hook**: `/test`
- **Acceptance Criteria**: Prompt regression tests exist and pass

#### Task 19: Implement progress visualization
- **Priority**: P3 (Improvement)
- **Category**: UI/UX
- **Evidence**: todo.md Phase 5 lists this as missing
- **Action**: Create credit score trend charts and dispute timeline
- **Skill Hook**: `/design`
- **Acceptance Criteria**: Users can visualize their progress

#### Task 20: Implement goal analytics
- **Priority**: P3 (Improvement)
- **Category**: Feature
- **Evidence**: todo.md Phase 5 lists this as incomplete
- **Action**: Add analytics to existing goal tracker
- **Skill Hook**: `/scaffold`
- **Acceptance Criteria**: Goal analytics dashboard functional

---

### Wave 3: HARDEN [8 tasks]

*Testing, error handling, and integration quality*

#### Task 21: Achieve 60%+ real test coverage
- **Priority**: P1 (Critical)
- **Category**: Testing
- **Evidence**: Current coverage likely ~1.86%
- **Action**: Write tests for all critical paths: auth, payment, disputes, AI
- **Skill Hook**: `/test`
- **Acceptance Criteria**: `npm test -- --coverage` reports 60%+

#### Task 22: Add E2E tests for critical user journeys
- **Priority**: P1 (Critical)
- **Category**: Testing
- **Evidence**: E2E framework exists but tests may not pass
- **Action**: Consolidate on Playwright, test auth→dashboard→dispute→payment flow
- **Skill Hook**: `/e2e`
- **Acceptance Criteria**: 5+ critical path E2E tests passing

#### Task 23: Replace console.error with structured logger
- **Priority**: P2 (Significant)
- **Category**: Code Quality
- **Evidence**: 216 console.error in production code
- **Action**: Replace with logger.error from src/lib/monitoring/logger.ts
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: Zero console.* in non-test production code

#### Task 24: Add error boundaries to all pages
- **Priority**: P2 (Significant)
- **Category**: UI/UX
- **Evidence**: Unknown error boundary coverage
- **Action**: Add error.tsx to all route segments
- **Skill Hook**: `/scaffold`
- **Acceptance Criteria**: Every route segment has error.tsx

#### Task 25: Validate environment variables at startup
- **Priority**: P2 (Significant)
- **Category**: DevOps
- **Evidence**: scripts/check-env.js exists but not integrated into startup
- **Action**: Add Zod-based env validation at app init
- **Skill Hook**: `/build`
- **Acceptance Criteria**: App fails fast with clear error if env vars missing

#### Task 26: Add integration tests for all API endpoints
- **Priority**: P2 (Significant)
- **Category**: Testing
- **Evidence**: Most API routes lack tests
- **Action**: Write integration tests for top 50 most critical routes
- **Skill Hook**: `/test`
- **Acceptance Criteria**: 50+ API route tests passing

#### Task 27: Fix Webhook idempotency
- **Priority**: P2 (Significant)
- **Category**: Integration
- **Evidence**: Stripe webhook handler needs idempotency check
- **Action**: Add idempotency key tracking to prevent duplicate processing
- **Skill Hook**: `/stripe`
- **Acceptance Criteria**: Duplicate webhook deliveries are safely handled

#### Task 28: Add circuit breaker for external services
- **Priority**: P3 (Improvement)
- **Category**: Integration
- **Evidence**: No circuit breaker for AIML API, Stripe, S3 calls
- **Action**: Implement circuit breaker pattern for external service calls
- **Skill Hook**: `/perf`
- **Acceptance Criteria**: External service failures don't cascade

---

### Wave 4: POLISH [7 tasks]

*UI/UX, performance, and API design refinement*

#### Task 29: Break down 24 god objects (1000+ lines)
- **Priority**: P1 (Critical)
- **Category**: Code Quality
- **Evidence**: 24 files over 1,000 lines
- **Action**: Split each into focused modules under 300 lines
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: Zero files over 1,000 lines

#### Task 30: Decompose 2,279-line landing page
- **Priority**: P1 (Critical)
- **Category**: UI/UX / Performance
- **Evidence**: src/app/page.tsx = 2,279 lines
- **Action**: Extract HeroSection, Features, Pricing, Testimonials, CTA components
- **Skill Hook**: `/design`
- **Acceptance Criteria**: page.tsx under 100 lines, components lazy-loaded

#### Task 31: Reduce 'use client' directives
- **Priority**: P2 (Significant)
- **Category**: Performance
- **Evidence**: 191 'use client' directives
- **Action**: Convert pure display components to RSC, use client boundary at interaction points
- **Skill Hook**: `/perf`
- **Acceptance Criteria**: 'use client' count reduced by 50%+

#### Task 32: Add Lighthouse CI to pipeline
- **Priority**: P2 (Significant)
- **Category**: Performance / DevOps
- **Evidence**: No automated web vitals tracking
- **Action**: Add @lhci/cli to GitHub Actions
- **Skill Hook**: `/ci-cd`
- **Acceptance Criteria**: Lighthouse scores tracked on every PR

#### Task 33: Implement OpenAPI spec generation
- **Priority**: P2 (Significant)
- **Category**: API Design
- **Evidence**: No auto-generated API docs
- **Action**: Generate OpenAPI from route handlers
- **Skill Hook**: `/doc`
- **Acceptance Criteria**: OpenAPI spec served at /api/docs

#### Task 34: Optimize bundle size
- **Priority**: P2 (Significant)
- **Category**: Performance
- **Evidence**: 1,295 files, heavy client bundle likely
- **Action**: Audit imports, tree-shake, lazy-load heavy deps
- **Skill Hook**: `/perf`
- **Acceptance Criteria**: First Load JS under 100KB for main routes

#### Task 35: Complete i18n implementation
- **Priority**: P3 (Improvement)
- **Category**: UI/UX
- **Evidence**: i18n infrastructure exists but hardcoded strings remain
- **Action**: Extract all user-facing strings to translation files
- **Skill Hook**: `/refactor`
- **Acceptance Criteria**: Zero hardcoded strings in components

---

### Wave 5: SHIP [5 tasks]

*DevOps, documentation, and production readiness*

#### Task 36: Add pre-commit hooks (husky + lint-staged)
- **Priority**: P1 (Critical)
- **Category**: DevOps
- **Evidence**: No pre-commit hooks
- **Action**: Install husky, run format→lint→typecheck→test on staged files
- **Skill Hook**: `/ci-cd`
- **Acceptance Criteria**: Pre-commit hook prevents bad commits

#### Task 37: Write production deployment runbook
- **Priority**: P2 (Significant)
- **Category**: Documentation
- **Evidence**: No deployment runbook
- **Action**: Document deploy process, rollback procedure, monitoring setup
- **Skill Hook**: `/doc`
- **Acceptance Criteria**: Any engineer can deploy following the runbook

#### Task 38: Add production monitoring (Sentry APM)
- **Priority**: P2 (Significant)
- **Category**: DevOps
- **Evidence**: Sentry configured in .env.production.example but not integrated
- **Action**: Integrate Sentry error tracking and performance monitoring
- **Skill Hook**: `/ci-cd`
- **Acceptance Criteria**: Errors auto-reported with context to Sentry

#### Task 39: Run full deploy-check
- **Priority**: P1 (Critical)
- **Category**: DevOps
- **Evidence**: LAUNCH_CHECKLIST.md exists but likely outdated
- **Action**: Run comprehensive deployment verification
- **Skill Hook**: `/deploy-check`
- **Acceptance Criteria**: All checklist items green

#### Task 40: Run dependency audit and fix vulnerabilities
- **Priority**: P1 (Critical)
- **Category**: Security / DevOps
- **Evidence**: `npm audit` not recently run
- **Action**: Run npm audit, fix critical/high vulnerabilities
- **Skill Hook**: `/deps`
- **Acceptance Criteria**: Zero critical/high npm audit findings

---

## Skill Activation Sequence

1. `/secure` — Fix 126 unauth'd routes, CSRF, cron auth, rate limiting (Tasks 1,3,4,8,9,14)
2. `/test` — Fix test infrastructure, measure real coverage (Tasks 5,21,26)
3. `/build` — Delete debug.logs, clean root, validate env (Tasks 2,11,25)
4. `/refactor` — Replace `any` types, consolidate duplicates, break god objects (Tasks 7,10,15,23,29)
5. `/doc` — Consolidate documentation, OpenAPI spec (Tasks 6,33,37)
6. `/api-gen` — Credit bureau integration, API versioning, pagination (Tasks 13,16,17)
7. `/e2e` — Playwright E2E tests for critical paths (Task 22)
8. `/design` — Decompose landing page, progress visualization (Tasks 19,30)
9. `/perf` — Reduce client JS, bundle optimization, circuit breaker (Tasks 28,31,34)
10. `/ci-cd` — Pre-commit hooks, Lighthouse CI, Sentry (Tasks 32,36,38)
11. `/deploy-check` — Final production readiness verification (Task 39)
12. `/deps` — Dependency audit and vulnerability fixes (Task 40)

---

## Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | **Data breach via unauth'd endpoints** | HIGH | CRITICAL | Wave 1: Auth middleware on all 126 routes |
| 2 | **Test suite broken, shipping untested code** | HIGH | HIGH | Wave 1: Fix test infra, establish baseline |
| 3 | **Secret leak via git commit** | MEDIUM | CRITICAL | Wave 1: Pre-commit hooks + secret scanning |
| 4 | **Codebase unmaintainable** | HIGH | HIGH | Wave 4: Break god objects, reduce sprawl |
| 5 | **Performance degradation at scale** | MEDIUM | MEDIUM | Wave 4: RSC optimization, bundle reduction |

---

*Report generated by RALP Loop Engine. Fynvita requires significant stabilization before production deployment. Estimated effort: 3-4 weeks for Wave 1-2 (critical), 2-3 weeks for Wave 3-5 (hardening and polish).*
