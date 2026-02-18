# Traceability Matrix — Fynvita Platform

> **Maps every feature domain to its implementing code paths, screens, APIs, services, components, and tests.**
> Last Updated: 2026-02-16

---

## 1. Matrix Legend

| Column         | Description                                  |
| -------------- | -------------------------------------------- |
| **ReqID**      | Requirement identifier (FEAT-XX)             |
| **Domain**     | Feature area / business capability           |
| **Pages**      | `src/app/**/page.tsx` files (ScreenIDs)      |
| **API Routes** | `src/app/api/**/route.ts` files (ApiIDs)     |
| **Services**   | `src/lib/**` business logic files (CodeRefs) |
| **Components** | `src/components/**` UI files (CompIDs)       |
| **Tests**      | Jest / Cypress / Playwright files (TestIDs)  |
| **Config**     | Related config/env dependencies (ConfigRefs) |

---

## 2. Summary

| Domain                    | ReqID   | Pages   | APIs    | Services | Components | Tests   | Coverage |
| ------------------------- | ------- | ------- | ------- | -------- | ---------- | ------- | -------- |
| Authentication            | FEAT-01 | 6       | 10      | 26       | 14         | 5       | High     |
| Credit Repair             | FEAT-02 | 20      | 34      | 32       | 25         | 29      | High     |
| Credit Monitoring/Builder | FEAT-03 | 22      | 12      | 6        | 11         | 8       | Medium   |
| Financial Suite           | FEAT-04 | 29      | 47      | 36       | 45         | 30      | High     |
| Investment Platform       | FEAT-05 | 15      | 28      | 29       | 18         | 25      | High     |
| AI/ML Services            | FEAT-06 | 4       | 29      | 21       | 18         | 13      | High     |
| Marketplace               | FEAT-07 | 14      | 12      | 9        | 0          | 7       | Medium   |
| Payment/Subscriptions     | FEAT-08 | 7       | 5       | 6        | 1          | 9       | High     |
| Student Loans             | FEAT-09 | 4       | 9       | 6        | 8          | 6       | Medium   |
| Trading                   | FEAT-10 | 3       | 6       | 36       | 8          | 4       | Low      |
| Notifications             | FEAT-11 | 3       | 7       | 7        | 7          | 1       | Low      |
| Documents                 | FEAT-12 | 3       | 3       | 2        | 6          | 1       | Low      |
| Admin                     | FEAT-13 | 13      | 16      | 9        | 2          | 2       | Low      |
| Onboarding                | FEAT-14 | 6       | 1       | 2        | 7          | 2       | Low      |
| Tax                       | FEAT-15 | 4       | 3       | 16       | 2          | 2       | Low      |
| **Totals**                | **15**  | **153** | **222** | **243**  | **172**    | **144** | —        |

> Note: Some files are shared across domains (e.g., security middleware is used by all API routes). Totals here may differ from raw file counts due to domain-specific scoping.

---

## 3. FEAT-01 — Authentication

### Pages (6)

| ScreenID  | Path                                   | Description                       |
| --------- | -------------------------------------- | --------------------------------- |
| SCR-01-01 | `src/app/auth/login/page.tsx`          | Login page                        |
| SCR-01-02 | `src/app/auth/signup/page.tsx`         | Registration page                 |
| SCR-01-03 | `src/app/auth/reset-password/page.tsx` | Password reset                    |
| SCR-01-04 | `src/app/auth/callback/page.tsx`       | OAuth callback handler            |
| SCR-01-05 | `src/app/login/page.tsx`               | Legacy login page                 |
| SCR-01-06 | `src/app/settings/security/page.tsx`   | Security settings (MFA, passkeys) |

### API Routes (10)

| ApiID     | Path                                    | Methods | Description                      |
| --------- | --------------------------------------- | ------- | -------------------------------- |
| API-01-01 | `api/auth/webauthn/authenticate`        | POST    | WebAuthn authentication initiate |
| API-01-02 | `api/auth/webauthn/authenticate/verify` | POST    | WebAuthn authentication verify   |
| API-01-03 | `api/auth/webauthn/register`            | POST    | WebAuthn register initiate       |
| API-01-04 | `api/auth/webauthn/register/verify`     | POST    | WebAuthn register verify         |
| API-01-05 | `api/auth/webauthn/credentials`         | GET     | List WebAuthn credentials        |
| API-01-06 | `api/admin/auth`                        | POST    | Admin auth operations            |
| API-01-07 | `api/csrf`                              | GET     | CSRF token generation            |
| API-01-08 | `api/cron/cleanup-expired-sessions`     | POST    | Session cleanup cron             |
| API-01-09 | `api/profile`                           | GET,PUT | User profile management          |
| API-01-10 | `api/settings`                          | GET,PUT | User settings management         |

### Services (26)

| CodeRef   | Path                                  | Responsibility               |
| --------- | ------------------------------------- | ---------------------------- |
| SVC-01-01 | `lib/auth/auth-service.ts`            | Core authentication logic    |
| SVC-01-02 | `lib/auth/session.ts`                 | Session management           |
| SVC-01-03 | `lib/auth/session-service.ts`         | Session persistence          |
| SVC-01-04 | `lib/auth/mfa-service.ts`             | TOTP multi-factor auth       |
| SVC-01-05 | `lib/auth/webauthn-service.ts`        | WebAuthn/FIDO2 passkeys      |
| SVC-01-06 | `lib/auth/biometric-service.ts`       | Biometric authentication     |
| SVC-01-07 | `lib/auth/backup-codes.ts`            | Recovery backup codes        |
| SVC-01-08 | `lib/auth/jwt-validation.ts`          | JWT token validation         |
| SVC-01-09 | `lib/auth/rbac.ts`                    | Role-based access control    |
| SVC-01-10 | `lib/auth/api-guard.ts`               | API route protection         |
| SVC-01-11 | `lib/auth/validation.ts`              | Auth input validation        |
| SVC-01-12 | `lib/auth/security-notifications.ts`  | Security event notifications |
| SVC-01-13 | `lib/security/auth-middleware.ts`     | Request auth middleware      |
| SVC-01-14 | `lib/security/csrf.ts`                | CSRF protection              |
| SVC-01-15 | `lib/security/headers.ts`             | Security headers             |
| SVC-01-16 | `lib/security/input-validation.ts`    | Input sanitization           |
| SVC-01-17 | `lib/security/output-validation.ts`   | Output filtering             |
| SVC-01-18 | `lib/security/rate-limiter.ts`        | Rate limiting (v1)           |
| SVC-01-19 | `lib/security/rate-limiting.ts`       | Rate limiting (v2)           |
| SVC-01-20 | `lib/security/redis-rate-limiting.ts` | Redis-backed rate limiting   |
| SVC-01-21 | `lib/security/audit-logging.ts`       | Security audit trail         |
| SVC-01-22 | `lib/security/sanitize.ts`            | HTML/XSS sanitization        |
| SVC-01-23 | `lib/supabase.ts`                     | Supabase client (deprecated) |
| SVC-01-24 | `lib/supabase/client.ts`              | Supabase browser client      |
| SVC-01-25 | `lib/supabase/server.ts`              | Supabase server client       |
| SVC-01-26 | `lib/supabase/types.ts`               | Supabase type definitions    |

### Components (14)

| CompID    | Path                                                  | Description          |
| --------- | ----------------------------------------------------- | -------------------- |
| CMP-01-01 | `components/auth/LoginForm.tsx`                       | Login form           |
| CMP-01-02 | `components/auth/SignUpForm.tsx`                      | Registration form    |
| CMP-01-03 | `components/auth/ResetPasswordForm.tsx`               | Password reset form  |
| CMP-01-04 | `components/auth/PasskeyLoginButton.tsx`              | Passkey login button |
| CMP-01-05 | `components/auth/PasskeyManagement.tsx`               | Passkey management   |
| CMP-01-06 | `components/auth/TwoFactorSettings.tsx`               | 2FA settings         |
| CMP-01-07 | `components/auth/BackupCodeRecovery.tsx`              | Backup code recovery |
| CMP-01-08 | `components/auth/BackupCodesManagement.tsx`           | Backup codes UI      |
| CMP-01-09 | `components/auth/SessionManagement.tsx`               | Active sessions UI   |
| CMP-01-10 | `components/settings/security/MFAManagementPanel.tsx` | MFA management panel |
| CMP-01-11 | `components/PremiumFeatureGuard.tsx`                  | Premium feature gate |

### Tests (5)

| TestID    | Path                                       | Framework  | Scope                          |
| --------- | ------------------------------------------ | ---------- | ------------------------------ |
| TST-01-01 | `src/app/api/auth/__tests__/route.test.ts` | Jest       | Auth API routes (17 cases)     |
| TST-01-02 | `e2e/auth.spec.ts`                         | Playwright | Auth flow E2E (9 cases)        |
| TST-01-03 | `cypress/e2e/authentication.cy.ts`         | Cypress    | Auth E2E (8 cases)             |
| TST-01-04 | `cypress/e2e/protected-redirects.cy.ts`    | Cypress    | Redirect enforcement (3 cases) |
| TST-01-05 | `cypress/e2e/security-headers.cy.ts`       | Cypress    | Security headers (8 cases)     |

### Config

| ConfigRef                       | Description                         |
| ------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key              |
| `src/middleware.ts`             | Route protection, CORS, CSP headers |

---

## 4. FEAT-02 — Credit Repair

### Pages (20)

| ScreenID  | Path                                       | Description                  |
| --------- | ------------------------------------------ | ---------------------------- |
| SCR-02-01 | `src/app/credit-repair/page.tsx`           | Credit repair hub            |
| SCR-02-02 | `src/app/credit-repair/disputes/page.tsx`  | Disputes list                |
| SCR-02-03 | `src/app/credit-repair/cards/page.tsx`     | Credit cards management      |
| SCR-02-04 | `src/app/credit-repair/goodwill/page.tsx`  | Goodwill letters             |
| SCR-02-05 | `src/app/credit-repair/negotiate/page.tsx` | Pay-for-delete negotiations  |
| SCR-02-06 | `src/app/credit-repair/inquiries/page.tsx` | Inquiry removal              |
| SCR-02-07 | `src/app/credit-repair/payments/page.tsx`  | Payment timing               |
| SCR-02-08 | `src/app/credit-repair/building/page.tsx`  | Credit building              |
| SCR-02-09 | `src/app/disputes/page.tsx`                | Disputes overview            |
| SCR-02-10 | `src/app/disputes/[id]/page.tsx`           | Single dispute detail        |
| SCR-02-11 | `src/app/disputes/new/page.tsx`            | New dispute                  |
| SCR-02-12 | `src/app/disputes/wizard/page.tsx`         | Dispute wizard               |
| SCR-02-13 | `src/app/disputes/student-loans/page.tsx`  | Student loan disputes        |
| SCR-02-14 | `src/app/credit-reports/page.tsx`          | Credit reports view          |
| SCR-02-15 | `src/app/credit/page.tsx`                  | Credit overview              |
| SCR-02-16 | `src/app/credit/goodwill-letters/page.tsx` | Goodwill letter templates    |
| SCR-02-17 | `src/app/credit/secured-cards/page.tsx`    | Secured card recommendations |
| SCR-02-18 | `src/app/dashboard/disputes/page.tsx`      | Dashboard disputes widget    |
| SCR-02-19 | `src/app/analytics/disputes/page.tsx`      | Dispute analytics            |
| SCR-02-20 | `src/app/analytics/credit-score/page.tsx`  | Credit score analytics       |

### API Routes (34)

| ApiID     | Path                                      | Methods        | Description               |
| --------- | ----------------------------------------- | -------------- | ------------------------- |
| API-02-01 | `api/credit-repair/disputes`              | GET,POST       | Disputes collection       |
| API-02-02 | `api/credit-repair/disputes/[id]`         | GET,PUT,DELETE | Single dispute CRUD       |
| API-02-03 | `api/credit-repair/cards`                 | GET,POST       | Credit cards collection   |
| API-02-04 | `api/credit-repair/cards/[id]`            | GET,PUT,DELETE | Single card CRUD          |
| API-02-05 | `api/credit-repair/goodwill`              | GET,POST       | Goodwill letters          |
| API-02-06 | `api/credit-repair/goodwill/[id]`         | GET,PUT,DELETE | Single goodwill letter    |
| API-02-07 | `api/credit-repair/negotiate`             | GET,POST       | Negotiations              |
| API-02-08 | `api/credit-repair/negotiate/[id]`        | GET,PUT,DELETE | Single negotiation        |
| API-02-09 | `api/credit-repair/quick-wins`            | GET            | Quick win recommendations |
| API-02-10 | `api/credit-repair/impact`                | POST           | Credit impact calculator  |
| API-02-11 | `api/credit-repair/reports`               | GET,POST       | Credit reports            |
| API-02-12 | `api/credit-repair/reports/[id]`          | GET,DELETE     | Single report             |
| API-02-13 | `api/credit-repair/score`                 | GET,POST       | Credit score tracking     |
| API-02-14 | `api/disputes`                            | GET,POST       | Legacy disputes CRUD      |
| API-02-15 | `api/disputes/[id]`                       | GET,PUT,DELETE | Legacy single dispute     |
| API-02-16 | `api/disputes/[id]/send`                  | POST           | Send dispute letter       |
| API-02-17 | `api/disputes/generate`                   | POST           | AI dispute generation     |
| API-02-18 | `api/disputes/generate-student-loan`      | POST           | Student loan dispute gen  |
| API-02-19 | `api/disputes/reasons`                    | GET            | Dispute reason types      |
| API-02-20 | `api/disputes/stats`                      | GET            | Dispute statistics        |
| API-02-21 | `api/disputes/strategies`                 | GET            | AI dispute strategies     |
| API-02-22 | `api/disputes/templates`                  | GET            | Letter templates          |
| API-02-23 | `api/credit/analyze`                      | POST           | AI credit analysis        |
| API-02-24 | `api/credit/factors`                      | GET            | Credit score factors      |
| API-02-25 | `api/credit-bureau/analyze`               | POST           | Bureau report analysis    |
| API-02-26 | `api/credit-bureau/dispute`               | POST           | Bureau dispute filing     |
| API-02-27 | `api/credit-bureau/report`                | GET            | Bureau report fetch       |
| API-02-28 | `api/credit-bureau/test-import`           | POST           | Test report import        |
| API-02-29 | `api/credit-report/analyze`               | POST           | Report analysis           |
| API-02-30 | `api/admin/disputes`                      | GET            | Admin dispute management  |
| API-02-31 | `api/financial/disputes/ai-strategy`      | POST           | AI dispute strategy       |
| API-02-32 | `api/financial/credit-repair/ai-strategy` | POST           | AI credit repair strategy |
| API-02-33 | `api/cron/check-dispute-status`           | POST           | Dispute status check cron |
| API-02-34 | `api/cron/dispute-followups`              | POST           | Dispute followup cron     |

### Services (32)

| CodeRef   | Path                                                      | Responsibility                   |
| --------- | --------------------------------------------------------- | -------------------------------- | ---------------------- |
| SVC-02-01 | `lib/credit-repair/credit-repair-service.ts`              | Core credit repair orchestration |
| SVC-02-02 | `lib/credit-repair/dispute-service.ts`                    | Dispute lifecycle management     |
| SVC-02-03 | `lib/credit-repair/negotiation-service.ts`                | Negotiation management           |
| SVC-02-04 | `lib/credit-repair/ai-dispute-analyzer.ts`                | AI dispute analysis              |
| SVC-02-05 | `lib/credit-repair/db/credit-repair-db-service.ts`        | DB operations                    |
| SVC-02-06 | `lib/credit-repair/db/disputes-db-service.ts`             | Disputes DB layer                |
| SVC-02-07 | `lib/credit-repair/db/credit-cards-db-service.ts`         | Cards DB layer                   |
| SVC-02-08 | `lib/credit-repair/db/credit-reports-db-service.ts`       | Reports DB layer                 |
| SVC-02-09 | `lib/credit-repair/db/goodwill-db-service.ts`             | Goodwill DB layer                |
| SVC-02-10 | `lib/credit-repair/db/negotiations-db-service.ts`         | Negotiations DB layer            |
| SVC-02-11 | `lib/disputes/dispute-service.ts`                         | Legacy dispute service           |
| SVC-02-12 | `lib/disputes/dispute-service-db.ts`                      | Legacy dispute DB                |
| SVC-02-13 | `lib/disputes/advanced-strategies.ts`                     | Advanced dispute strategies      |
| SVC-02-14 | `lib/credit/services/DisputeLetterGenerator.ts`           | Letter generation                |
| SVC-02-15 | `lib/credit/services/GoodwillLetterService.ts`            | Goodwill letter service          |
| SVC-02-16 | `lib/credit/services/SecuredCardRecommendationService.ts` | Card recommendations             |
| SVC-02-17 | `lib/credit/services/CreditBuilderLoanService.ts`         | Credit builder loans             |
| SVC-02-18 | `lib/credit-bureau/credit-bureau-service.ts`              | Bureau API orchestration         |
| SVC-02-19 | `lib/credit-bureau/credit-report-parser.ts`               | Report parsing                   |
| SVC-02-20 | `lib/credit-bureau/equifax-client.ts`                     | Equifax API client               |
| SVC-02-21 | `lib/credit-bureau/experian-client.ts`                    | Experian API client              |
| SVC-02-22 | `lib/credit-bureau/transunion-client.ts`                  | TransUnion API client            |
| SVC-02-23 | `lib/credit-bureau/mock-credit-report-generator.ts`       | Mock report generator            |
| SVC-02-24 | `lib/credit-report/credit-report-parser.ts`               | Alternative report parser        |
| SVC-02-25 | `lib/advanced-dispute-engine.ts`                          | Advanced dispute engine          |
| SVC-02-26 | `lib/ml-prediction-models.ts`                             | ML prediction models             |
| SVC-02-27 | `lib/prompts/dispute-prompts.ts`                          | AI dispute prompt templates      |
| SVC-02-28 | `lib/prompts/dispute-templates.ts`                        | Letter templates                 |
| SVC-02-29 | `lib/automation/dispute-followups.ts`                     | Automated followups              |
| SVC-02-30 | `lib/strategies/ml-strategy-integration.ts`               | ML strategy integration          |
| API-02-35 | `api/ml/predict-success`                                  | POST                             | ML success prediction  |
| API-02-36 | `api/ml/predict-timeline`                                 | POST                             | ML timeline prediction |

### Components (25)

| CompID    | Path                                                   | Description           |
| --------- | ------------------------------------------------------ | --------------------- |
| CMP-02-01 | `components/credit-repair/CreditRepairDashboard.tsx`   | Repair dashboard      |
| CMP-02-02 | `components/credit-repair/AICreditRepairStrategy.tsx`  | AI strategy panel     |
| CMP-02-03 | `components/credit-repair/DisputeAccelerator.tsx`      | Dispute accelerator   |
| CMP-02-04 | `components/credit-repair/DisputeDashboard.tsx`        | Dispute dashboard     |
| CMP-02-05 | `components/credit-repair/GoodwillLetterGenerator.tsx` | Goodwill generator    |
| CMP-02-06 | `components/credit-repair/InquiryRemovalTool.tsx`      | Inquiry removal       |
| CMP-02-07 | `components/credit-repair/PayForDeleteNegotiator.tsx`  | Negotiator UI         |
| CMP-02-08 | `components/credit-repair/PaymentTimingOptimizer.tsx`  | Payment timing        |
| CMP-02-09 | `components/credit-repair/UtilizationOptimizer.tsx`    | Utilization optimizer |
| CMP-02-10 | `components/credit-repair/CreditBuilding.tsx`          | Credit building       |
| CMP-02-11 | `components/disputes/AIDisputeStrategy.tsx`            | AI dispute strategy   |
| CMP-02-12 | `components/disputes/CreateDisputeForm.tsx`            | Create dispute form   |
| CMP-02-13 | `components/disputes/DisputeList.tsx`                  | Disputes list         |
| CMP-02-14 | `components/disputes/DisputeDetail.tsx`                | Dispute detail view   |
| CMP-02-15 | `components/disputes/DisputeActions.tsx`               | Dispute actions       |
| CMP-02-16 | `components/disputes/DisputeStats.tsx`                 | Dispute statistics    |
| CMP-02-17 | `components/disputes/DisputeStrategyCard.tsx`          | Strategy card         |
| CMP-02-18 | `components/disputes/DisputeTimeline.tsx`              | Timeline view         |
| CMP-02-19 | `components/aiml/DisputeGenerator.tsx`                 | AI dispute generator  |
| CMP-02-20 | `components/aiml/CreditAnalyzer.tsx`                   | AI credit analyzer    |
| CMP-02-21 | `components/credit-bureau/CreditReportImport.tsx`      | Report import         |
| CMP-02-22 | `components/credit-bureau/CreditReportViewer.tsx`      | Report viewer         |
| CMP-02-23 | `components/credit-bureau/CreditScoreCard.tsx`         | Score card            |
| CMP-02-24 | `components/onboarding/ImpactCalculator.tsx`           | Impact calculator     |
| CMP-02-25 | `components/__tests__/DisputeWizard.test.tsx`          | Dispute wizard (test) |

### Tests (29)

| TestID    | Path                                                                 | Framework | Cases |
| --------- | -------------------------------------------------------------------- | --------- | ----- |
| TST-02-01 | `api/credit-repair/__tests__/integration.test.ts`                    | Jest      | 8     |
| TST-02-02 | `api/credit-repair/__tests__/integration-real.test.ts`               | Jest      | 10    |
| TST-02-03 | `api/credit-repair/__tests__/performance.test.ts`                    | Jest      | 11    |
| TST-02-04 | `api/credit-repair/disputes/__tests__/route.test.ts`                 | Jest      | 9     |
| TST-02-05 | `api/credit-repair/disputes/[id]/__tests__/route.test.ts`            | Jest      | 11    |
| TST-02-06 | `api/credit-repair/cards/__tests__/route.test.ts`                    | Jest      | 10    |
| TST-02-07 | `api/credit-repair/cards/[id]/__tests__/route.test.ts`               | Jest      | 15    |
| TST-02-08 | `api/credit-repair/goodwill/__tests__/route.test.ts`                 | Jest      | 9     |
| TST-02-09 | `api/credit-repair/goodwill/[id]/__tests__/route.test.ts`            | Jest      | 10    |
| TST-02-10 | `api/credit-repair/negotiate/__tests__/route.test.ts`                | Jest      | 9     |
| TST-02-11 | `api/credit-repair/negotiate/[id]/__tests__/route.test.ts`           | Jest      | 10    |
| TST-02-12 | `api/credit-repair/quick-wins/__tests__/route.test.ts`               | Jest      | 5     |
| TST-02-13 | `api/credit-repair/impact/__tests__/route.test.ts`                   | Jest      | 9     |
| TST-02-14 | `api/credit-repair/reports/__tests__/route.test.ts`                  | Jest      | 11    |
| TST-02-15 | `api/credit-repair/reports/[id]/__tests__/route.test.ts`             | Jest      | 8     |
| TST-02-16 | `api/credit-repair/score/__tests__/route.test.ts`                    | Jest      | 7     |
| TST-02-17 | `api/credit-report/__tests__/route.test.ts`                          | Jest      | 11    |
| TST-02-18 | `api/disputes/__tests__/route.test.ts`                               | Jest      | 6     |
| TST-02-19 | `lib/__tests__/dispute-service.test.ts`                              | Jest      | 12    |
| TST-02-20 | `lib/__tests__/dispute-letter-generator.test.ts`                     | Jest      | 12    |
| TST-02-21 | `lib/__tests__/ml-prediction-models.test.ts`                         | Jest      | 3     |
| TST-02-22 | `lib/strategies/__tests__/ml-strategy-integration.test.ts`           | Jest      | 14    |
| TST-02-23 | `components/__tests__/DisputeWizard.test.tsx`                        | Jest      | 13    |
| TST-02-24 | `components/credit-repair/__tests__/AICreditRepairStrategy.test.tsx` | Jest      | 13    |
| TST-02-25 | `components/disputes/__tests__/AIDisputeStrategy.test.tsx`           | Jest      | 13    |
| TST-02-26 | `components/credit-bureau/__tests__/CreditReportImport.test.tsx`     | Jest      | 5     |
| TST-02-27 | `components/credit-bureau/__tests__/CreditScoreCard.test.tsx`        | Jest      | 10    |
| TST-02-28 | `cypress/e2e/credit-repair.cy.ts` + `credit-repair-api.cy.ts`        | Cypress   | 13    |
| TST-02-29 | `cypress/e2e/disputes.cy.ts` + `credit-reports.cy.ts`                | Cypress   | 18    |

### Config

| ConfigRef       | Description                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| `AIML_API_KEY`  | AI model access for dispute generation                                           |
| Supabase tables | `disputes`, `credit_cards`, `goodwill_letters`, `negotiations`, `credit_reports` |

---

## 5. FEAT-03 — Credit Monitoring / Builder

### Pages (22)

| ScreenID  | Path                                              |
| --------- | ------------------------------------------------- |
| SCR-03-01 | `src/app/credit-monitoring/page.tsx`              |
| SCR-03-02 | `src/app/credit-builder/page.tsx`                 |
| SCR-03-03 | `src/app/credit-builder/score-simulator/page.tsx` |
| SCR-03-04 | `src/app/credit-builder/simulator/page.tsx`       |
| SCR-03-05 | `src/app/credit-builder/goals/page.tsx`           |
| SCR-03-06 | `src/app/credit-builder/loan/page.tsx`            |
| SCR-03-07 | `src/app/credit-builder/secured-card/page.tsx`    |
| SCR-03-08 | `src/app/credit-builder/authorized-user/page.tsx` |
| SCR-03-09 | `src/app/credit-builder/utilization/page.tsx`     |
| SCR-03-10 | `src/app/credit-builder/payments/page.tsx`        |
| SCR-03-11 | `src/app/credit-builder/pay-for-delete/page.tsx`  |
| SCR-03-12 | `src/app/credit-builder/goodwill/page.tsx`        |
| SCR-03-13 | `src/app/credit-builder/debt-strategy/page.tsx`   |
| SCR-03-14 | `src/app/credit-builder/budget/page.tsx`          |
| SCR-03-15 | `src/app/credit-builder/freeze/page.tsx`          |
| SCR-03-16 | `src/app/credit-builder/identity-theft/page.tsx`  |
| SCR-03-17 | `src/app/credit-builder/mix/page.tsx`             |
| SCR-03-18 | `src/app/credit-builder/age/page.tsx`             |
| SCR-03-19 | `src/app/credit-builder/reports/upload/page.tsx`  |
| SCR-03-20 | `src/app/credit/factors/page.tsx`                 |
| SCR-03-21 | `src/app/credit/simulator/page.tsx`               |
| SCR-03-22 | `src/app/dashboard/monitoring/page.tsx`           |

### API Routes (12)

| ApiID     | Path                                      |
| --------- | ----------------------------------------- |
| API-03-01 | `api/credit-monitoring`                   |
| API-03-02 | `api/credit-monitoring/scores`            |
| API-03-03 | `api/credit-monitoring/alerts`            |
| API-03-04 | `api/credit-monitoring/history`           |
| API-03-05 | `api/credit-monitoring/settings`          |
| API-03-06 | `api/credit-builder/score`                |
| API-03-07 | `api/credit-builder/progress`             |
| API-03-08 | `api/credit-builder/recommendations`      |
| API-03-09 | `api/credit-builder/loans`                |
| API-03-10 | `api/credit-builder/secured-cards`        |
| API-03-11 | `api/financial/credit-builder/ai-roadmap` |
| API-03-12 | `api/financial/credit/ai-insights`        |

### Services (6)

| CodeRef   | Path                                                 |
| --------- | ---------------------------------------------------- |
| SVC-03-01 | `lib/credit-monitoring/credit-monitoring-service.ts` |
| SVC-03-02 | `lib/credit-builder/credit-builder-service.ts`       |
| SVC-03-03 | `lib/credit-builder/score-simulator-service.ts`      |
| SVC-03-04 | `lib/credit-builder/goal-tracker-service.ts`         |
| SVC-03-05 | `lib/credit/services/CreditScoreSimulator.ts`        |
| SVC-03-06 | `lib/credit/services/RentReportingService.ts`        |

### Tests (8)

| TestID    | Path                                                               | Framework | Cases |
| --------- | ------------------------------------------------------------------ | --------- | ----- |
| TST-03-01 | `api/credit-builder/__tests__/route.test.ts`                       | Jest      | 13    |
| TST-03-02 | `lib/__tests__/credit-builder-service.test.ts`                     | Jest      | 10    |
| TST-03-03 | `lib/__tests__/score-simulator.test.ts`                            | Jest      | 12    |
| TST-03-04 | `components/__tests__/CreditScoreGauge.test.tsx`                   | Jest      | 18    |
| TST-03-05 | `components/credit/__tests__/ScoreGauge.test.tsx`                  | Jest      | 28    |
| TST-03-06 | `components/credit-builder/__tests__/AICreditRoadmap.test.tsx`     | Jest      | 12    |
| TST-03-07 | `components/credit-monitoring/__tests__/AICreditInsights.test.tsx` | Jest      | 12    |
| TST-03-08 | `cypress/e2e/credit-factors-page.cy.ts`                            | Cypress   | 9     |

---

## 6. FEAT-04 — Financial Suite

### Pages (29)

| ScreenID  | Path                                           |
| --------- | ---------------------------------------------- |
| SCR-04-01 | `src/app/financial/page.tsx`                   |
| SCR-04-02 | `src/app/financial/budget/page.tsx`            |
| SCR-04-03 | `src/app/financial/spending/page.tsx`          |
| SCR-04-04 | `src/app/financial/bills/page.tsx`             |
| SCR-04-05 | `src/app/financial/bills/negotiate/page.tsx`   |
| SCR-04-06 | `src/app/financial/goals/page.tsx`             |
| SCR-04-07 | `src/app/financial/savings/page.tsx`           |
| SCR-04-08 | `src/app/financial/transactions/page.tsx`      |
| SCR-04-09 | `src/app/financial/accounts/page.tsx`          |
| SCR-04-10 | `src/app/financial/debt/page.tsx`              |
| SCR-04-11 | `src/app/financial/income/page.tsx`            |
| SCR-04-12 | `src/app/financial/cash-flow/page.tsx`         |
| SCR-04-13 | `src/app/financial/net-worth/page.tsx`         |
| SCR-04-14 | `src/app/financial/reports/page.tsx`           |
| SCR-04-15 | `src/app/financial/settings/page.tsx`          |
| SCR-04-16 | `src/app/financial/smart-budget/page.tsx`      |
| SCR-04-17 | `src/app/financial/coach/page.tsx`             |
| SCR-04-18 | `src/app/financial/coach/action-plan/page.tsx` |
| SCR-04-19 | `src/app/financial/coach/debt-payoff/page.tsx` |
| SCR-04-20 | `src/app/financial-hub/page.tsx`               |
| SCR-04-21 | `src/app/budgeting/bills/page.tsx`             |
| SCR-04-22 | `src/app/budgeting/subscriptions/page.tsx`     |
| SCR-04-23 | `src/app/budgeting/zero-based/page.tsx`        |
| SCR-04-24 | `src/app/budgeting/auto-save/page.tsx`         |
| SCR-04-25 | `src/app/dashboard/spending/page.tsx`          |
| SCR-04-26 | `src/app/dashboard/subscriptions/page.tsx`     |
| SCR-04-27 | `src/app/dashboard/vitality/page.tsx`          |
| SCR-04-28 | `src/app/insights/page.tsx`                    |
| SCR-04-29 | `src/app/insights/alerts/page.tsx`             |

### API Routes (47)

> Financial domain has the most API routes. Key groups:
>
> - **Budgets**: 10 routes (CRUD, generate, analyze, adjust, predict, recommendations, rollover, summary, alerts)
> - **Spending**: 10 routes (CRUD, analysis, analyze, insights, summary, trends, forecast, anomalies, cashflow, AI insights)
> - **Bills**: 10 routes (CRUD, negotiate, outcome, detect, analysis, optimizations, summary)
> - **Goals**: 3 routes (CRUD, optimizations)
> - **Savings**: 7 routes (CRUD, rules, subscriptions, analyze, recommendations, goal-recommendations)
> - **Other**: transactions, accounts, debt, income, health-score, insights, dashboard, aggregated, context, export, plaid, monitoring

### Services (36)

> Major services include: `financial-service.ts`, `financial-aggregation-service.ts`, `financial-context-engine.ts`, `budget-service.ts`, `budget-optimizer.ts`, `smart-budget-engine.ts`, `spending-analysis-service.ts`, `spending-analyzer.ts`, `spending-forecast-service.ts`, `bill-detection-service.ts`, `bill-negotiator.ts`, `goal-planner.ts`, `goal-tracker.ts`, `savings-optimizer.ts`, `transaction-categorizer.ts`, `health-score-calculator.ts` (v1 + v2), `smart-insights-engine.ts`, `recommendation-engine.ts`, `debt-strategy-engine.ts`, `debt-strategy-optimizer.ts`, `plaid-service.ts`, `export-service.ts`

### Tests (30)

| TestID    | Framework  | Path (abbreviated)                                                 | Cases |
| --------- | ---------- | ------------------------------------------------------------------ | ----- |
| TST-04-01 | Jest       | `financial/__tests__/budget-service.test.ts`                       | 16    |
| TST-04-02 | Jest       | `financial/__tests__/budget-optimizer.test.ts`                     | 17    |
| TST-04-03 | Jest       | `financial/__tests__/smart-budget-engine.test.ts`                  | 23    |
| TST-04-04 | Jest       | `financial/__tests__/spending-analysis-service.test.ts`            | 12    |
| TST-04-05 | Jest       | `financial/__tests__/spending-analyzer.test.ts`                    | 27    |
| TST-04-06 | Jest       | `financial/__tests__/bill-detection-service.test.ts`               | 13    |
| TST-04-07 | Jest       | `financial/__tests__/bill-negotiator.test.ts`                      | 25    |
| TST-04-08 | Jest       | `financial/__tests__/goal-planner.test.ts`                         | 16    |
| TST-04-09 | Jest       | `financial/__tests__/goal-tracker.test.ts`                         | 27    |
| TST-04-10 | Jest       | `financial/__tests__/savings-optimizer.test.ts`                    | 25    |
| TST-04-11 | Jest       | `financial/__tests__/health-score-calculator.test.ts`              | 11    |
| TST-04-12 | Jest       | `financial/__tests__/health-score-calculator-v2.test.ts`           | 21    |
| TST-04-13 | Jest       | `financial/__tests__/smart-insights-engine.test.ts`                | 9     |
| TST-04-14 | Jest       | `financial/__tests__/recommendation-engine.test.ts`                | 18    |
| TST-04-15 | Jest       | `financial/__tests__/financial-aggregation-service.test.ts`        | 15    |
| TST-04-16 | Jest       | `financial/__tests__/financial-context-engine.test.ts`             | 16    |
| TST-04-17 | Jest       | `financial/__tests__/financial-context-engine.integration.test.ts` | 25    |
| TST-04-18 | Jest       | `financial/__tests__/debt-strategy-engine.test.ts`                 | 16    |
| TST-04-19 | Jest       | `financial/__tests__/debt-strategy-optimizer.test.ts`              | 46    |
| TST-04-20 | Jest       | `financial/__tests__/transaction-categorizer.test.ts`              | 15    |
| TST-04-21 | Jest       | `api/financial/budgets/__tests__/route.test.ts`                    | 15    |
| TST-04-22 | Jest       | `api/financial/budgets/[id]/__tests__/route.test.ts`               | 13    |
| TST-04-23 | Jest       | `api/financial/__tests__/ai-endpoints.test.ts`                     | 18    |
| TST-04-24 | Jest       | `components/financial/__tests__/AIInsightsPanel.test.tsx`          | 9     |
| TST-04-25 | Jest       | `components/budget/__tests__/AIBudgetOptimizer.test.tsx`           | 11    |
| TST-04-26 | Jest       | `components/bills/__tests__/AIBillsOptimizer.test.tsx`             | 12    |
| TST-04-27 | Jest       | `components/spending/__tests__/AISpendingInsights.test.tsx`        | 12    |
| TST-04-28 | Jest       | `components/goals/__tests__/AIGoalsOptimizer.test.tsx`             | 13    |
| TST-04-29 | Playwright | `e2e/financial-suite.spec.ts`                                      | 4     |
| TST-04-30 | Cypress    | `cypress/e2e/financial-api.cy.ts`                                  | 4     |

---

## 7. FEAT-05 — Investment Platform

### Pages (15)

| ScreenID  | Path                                                              |
| --------- | ----------------------------------------------------------------- |
| SCR-05-01 | `src/app/investments/page.tsx`                                    |
| SCR-05-02 | `src/app/investments/holdings/page.tsx`                           |
| SCR-05-03 | `src/app/investments/analytics/page.tsx`                          |
| SCR-05-04 | `src/app/investments/analyze/[symbol]/page.tsx`                   |
| SCR-05-05 | `src/app/investments/crypto/[coinId]/page.tsx`                    |
| SCR-05-06 | `src/app/investments/signals/page.tsx`                            |
| SCR-05-07 | `src/app/investments/rebalance/page.tsx`                          |
| SCR-05-08 | `src/app/investments/watchlist/page.tsx`                          |
| SCR-05-09 | `src/app/investments/dividends/page.tsx`                          |
| SCR-05-10 | `src/app/investments/add-holding/page.tsx`                        |
| SCR-05-11 | `src/app/(dashboard)/investments/comprehensive-analysis/page.tsx` |
| SCR-05-12 | `src/app/financial/investments/page.tsx`                          |
| SCR-05-13 | `src/app/financial/crypto/page.tsx`                               |
| SCR-05-14 | `src/app/demo/asset-allocation/page.tsx`                          |
| SCR-05-15 | `src/app/invest/page.tsx`                                         |

### API Routes (28)

> Key groups: Portfolio (3), Holdings (2), Stock Analysis (5), Crypto (3), Signals (4), Analytics (5), Allocation (1), Comprehensive (1), Recommendations (1), Alerts (1), Patterns (1), WebSocket (1)

### Services (29)

> Core: `portfolio-service.ts`, `market-data-service.ts`, `ai-stock-analyst.ts`, `crypto-analyst.ts`, `signal-generator.ts`
> Analysis: `FundamentalAnalysisService.ts`, `TechnicalAnalysisService.ts`, `SentimentAnalysisService.ts`, `InvestmentAnalysisEngine.ts`
> Portfolio: `PortfolioService.ts`, `AssetAllocationService.ts`, `AllocationAnalyzer.ts`, `PerformanceCalculator.ts`, `TaxLossHarvestingService.ts`
> Infrastructure: `MarketDataWebSocketService.ts`, `AutoRebalanceScheduler.ts`, `AnalysisCacheService.ts`, `PatternRecognitionService.ts`

### Tests (25)

| TestID    | Framework  | Path (abbreviated)                                                              | Cases |
| --------- | ---------- | ------------------------------------------------------------------------------- | ----- |
| TST-05-01 | Jest       | `investments/__tests__/ai-stock-analyst.test.ts`                                | 26    |
| TST-05-02 | Jest       | `investments/__tests__/crypto-analyst.test.ts`                                  | 35    |
| TST-05-03 | Jest       | `investments/__tests__/market-data-service.test.ts`                             | 16    |
| TST-05-04 | Jest       | `investments/__tests__/signal-generator.test.ts`                                | 39    |
| TST-05-05 | Jest       | `services/__tests__/AllocationAnalyzer.test.ts`                                 | 9     |
| TST-05-06 | Jest       | `services/__tests__/AssetAllocationService.test.ts`                             | 23    |
| TST-05-07 | Jest       | `services/__tests__/FundamentalAnalysisService.test.ts`                         | 33    |
| TST-05-08 | Jest       | `services/__tests__/TechnicalAnalysisService.test.ts`                           | 42    |
| TST-05-09 | Jest       | `services/__tests__/SentimentAnalysisService.test.ts`                           | 43    |
| TST-05-10 | Jest       | `services/__tests__/TaxLossHarvestingService.test.ts`                           | 16    |
| TST-05-11 | Jest       | `services/__tests__/PerformanceCalculator.test.ts`                              | 8     |
| TST-05-12 | Jest       | `services/__tests__/InvestmentAnalysisEngine.test.ts`                           | 23    |
| TST-05-13 | Jest       | `services/__tests__/PortfolioService.test.ts`                                   | 8     |
| TST-05-14 | Jest       | `components/investments/__tests__/AIInvestmentInsights.test.tsx`                | 12    |
| TST-05-15 | Jest       | `components/investments/allocation/__tests__/AssetAllocationPanel.test.tsx`     | 17    |
| TST-05-16 | Jest       | `components/investments/analysis/__tests__/ComprehensiveAnalysisPanel.test.tsx` | 14    |
| TST-05-17 | Jest       | `api/investments/portfolio-analysis/__tests__/route.test.ts`                    | 11    |
| TST-05-18 | Jest       | `api/investments/allocation-analysis/__tests__/route.test.ts`                   | 8     |
| TST-05-19 | Jest       | `api/investments/comprehensive-analysis/__tests__/route.test.ts`                | 11    |
| TST-05-20 | Jest       | `__tests__/integration/investments-api.test.ts`                                 | 5     |
| TST-05-21 | Jest       | `__tests__/security/investments-security.test.ts`                               | 15    |
| TST-05-22 | Playwright | `e2e/investments/*.spec.ts` (6 files)                                           | 55    |
| TST-05-23 | Playwright | `e2e/investment-suite.spec.ts`                                                  | 4     |
| TST-05-24 | Cypress    | `cypress/e2e/investment-api.cy.ts`                                              | 7     |
| TST-05-25 | Jest       | `__tests__/integration/service-integration.test.ts`                             | 8     |

---

## 8. FEAT-06 — AI/ML Services

### Pages (4)

| ScreenID  | Path                                |
| --------- | ----------------------------------- |
| SCR-06-01 | `src/app/ai-tools/page.tsx`         |
| SCR-06-02 | `src/app/ai-strategies/page.tsx`    |
| SCR-06-03 | `src/app/(dashboard)/chat/page.tsx` |
| SCR-06-04 | `src/app/dashboard/chat/page.tsx`   |

### API Routes (29)

> AI Chat (4), Consensus (1), Orchestrate (1), Workflow (1), Financial Coach (9), Insights (1), Nudges (1), Predictions (1), Strategy (1), Spending Analysis (1), Financial Chat (4), Voice (1), all Financial AI endpoints (3)

### Services (21)

> Core AI: `aiml-service.ts`, `ai-orchestrator.ts`, `model-router.ts`, `ml-prediction-models.ts`
> Chat: `chat-engine.ts`, `financial-chat-engine.ts`, `chat-db-service.ts`
> Coach: `financial-coach.ts`, `action-executor.ts`
> NLP: `intent-recognizer.ts`, `entity-extractor.ts`
> Personalization: `behavioral-coach.ts`, `nudge-engine.ts`, `spending-analyzer.ts`
> Prompts: `financial-chat-prompts.ts`, `financial-coach-prompts.ts`, `investment-analyst-prompts.ts`

### Tests (13)

| TestID    | Framework  | Path (abbreviated)                                             | Cases |
| --------- | ---------- | -------------------------------------------------------------- | ----- |
| TST-06-01 | Jest       | `lib/__tests__/ai-orchestrator.test.ts`                        | 16    |
| TST-06-02 | Jest       | `lib/ai/__tests__/chat-db-service.test.ts`                     | 17    |
| TST-06-03 | Jest       | `lib/ai/__tests__/financial-chat-engine.test.ts`               | 22    |
| TST-06-04 | Jest       | `lib/ai/__tests__/financial-coach.test.ts`                     | 27    |
| TST-06-05 | Jest       | `lib/ai-personalization/__tests__/behavioral-coach.test.ts`    | 15    |
| TST-06-06 | Jest       | `api/ai/financial-coach/debt-strategy/__tests__/route.test.ts` | 4     |
| TST-06-07 | Jest       | `components/__tests__/ModelMonitoring.test.tsx`                | 10    |
| TST-06-08 | Jest       | `components/__tests__/ModelSelector.test.tsx`                  | 10    |
| TST-06-09 | Jest       | `components/__tests__/VoiceAssistant.test.tsx`                 | 9     |
| TST-06-10 | Jest       | `components/__tests__/SemanticSearch.test.tsx`                 | 10    |
| TST-06-11 | Jest       | `components/__tests__/ImageGenerator.test.tsx`                 | 13    |
| TST-06-12 | Playwright | `e2e/chat-suite.spec.ts`                                       | 11    |
| TST-06-13 | Cypress    | `cypress/e2e/ai-api.cy.ts`                                     | 7     |

### Config

| ConfigRef      | Description                               |
| -------------- | ----------------------------------------- |
| `AIML_API_KEY` | AIML API gateway key                      |
| `AIML_API_URL` | API base URL (https://api.aimlapi.com/v1) |

---

## 9. FEAT-07 — Marketplace

### Pages (14)

> `marketplace/` hub + services, tradelines, secured-cards, loans, attorneys, coaching, education, monitoring, consolidation, calculators, community, analysis + `experts/`

### API Routes (12)

> Products (4), Providers (3), Reviews (3), Tradelines (2)

### Services (9)

> `marketplace-service.ts`, `provider-service.ts`, `review-service.ts`, `tradeline-service.ts`, affiliate services (5)

### Tests (7)

| TestID    | Framework  | Path                                           | Cases |
| --------- | ---------- | ---------------------------------------------- | ----- |
| TST-07-01 | Jest       | `api/marketplace/__tests__/products.test.ts`   | 15    |
| TST-07-02 | Jest       | `api/marketplace/__tests__/providers.test.ts`  | 23    |
| TST-07-03 | Jest       | `api/marketplace/__tests__/tradelines.test.ts` | 14    |
| TST-07-04 | Jest       | `api/marketplace/__tests__/reviews.test.ts`    | 20    |
| TST-07-05 | Jest       | `api/marketplace/__tests__/disputes.test.ts`   | 21    |
| TST-07-06 | Playwright | `e2e/marketplace.spec.ts`                      | 11    |
| TST-07-07 | Cypress    | `cypress/e2e/marketplace-api.cy.ts`            | 7     |

---

## 10. FEAT-08 — Payment / Subscriptions

### Pages (7)

> `pricing/`, `payment/success`, `payment/cancel`, `billing/`, `billing/subscription`, `billing/invoices`, `settings/billing`

### API Routes (5)

> `payment/checkout`, `payment/webhook`, `payment/billing`, `payment/billing/plan`, `admin/subscriptions`

### Services (6)

> `stripe-service.ts`, `billing-profile-store.ts`, `subscription-service.ts`, `pricing.ts`, `payment-router.ts`, `payout-service.ts`

### Tests (9)

| TestID    | Framework  | Path                                                  | Cases |
| --------- | ---------- | ----------------------------------------------------- | ----- |
| TST-08-01 | Jest       | `lib/__tests__/payment-service.test.ts`               | 13    |
| TST-08-02 | Jest       | `lib/__tests__/pricing.test.ts`                       | 2     |
| TST-08-03 | Jest       | `lib/__tests__/subscription-service.test.ts`          | 15    |
| TST-08-04 | Jest       | `lib/payment/__tests__/billing-profile-store.test.ts` | 2     |
| TST-08-05 | Jest       | `app/api/payment/__tests__/checkout.test.ts`          | 9     |
| TST-08-06 | Jest       | `app/pricing/__tests__/page.test.tsx`                 | 6     |
| TST-08-07 | Playwright | `e2e/pricing.spec.ts`                                 | 10    |
| TST-08-08 | Cypress    | `cypress/e2e/pricing-page.cy.ts`                      | 6     |
| TST-08-09 | Cypress    | `cypress/e2e/payment-subscription.cy.ts`              | 13    |

### Config

| ConfigRef               | Description              |
| ----------------------- | ------------------------ |
| `STRIPE_SECRET_KEY`     | Stripe API key           |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature secret |
| `STRIPE_*_PRICE_ID`     | Price IDs per tier       |

---

## 11. FEAT-09 — Student Loans

### Pages (4)

> `student-loan-agent/`, `student-loans/`, `disputes/student-loans/`, `loans/`

### API Routes (9)

> `student-loans` (CRUD), `student-loans/strategy`, `student-loans/analyze`, `federal-programs`, `federal/check-eligibility`, `federal/submit-application`, `federal/track-application`, `disputes/generate-student-loan`, `servicers/*`

### Services (6)

> `FederalRegulationEngine.ts`, `StrategyEngine.ts`, `federal-integration-service.ts`, `student-loan-ai-engine.ts`, `student-loan-service.ts`, `servicer-intelligence-engine.ts`

### Tests (6)

| TestID    | Framework  | Path                                                | Cases |
| --------- | ---------- | --------------------------------------------------- | ----- |
| TST-09-01 | Jest       | `lib/__tests__/student-loan-agent.test.ts`          | 28    |
| TST-09-02 | Jest       | `lib/__tests__/student-loan-ai-engine.test.ts`      | 3     |
| TST-09-03 | Jest       | `lib/__tests__/federal-integration-service.test.ts` | 6     |
| TST-09-04 | Jest       | `api/student-loans/programs.test.ts`                | 13    |
| TST-09-05 | Playwright | `e2e/student-loans.spec.ts`                         | 11    |
| TST-09-06 | Cypress    | `cypress/e2e/student-loans-api.cy.ts`               | 5     |

---

## 12. FEAT-10 — Trading

### Pages (3)

> `trading/`, `trading/paper`, `trading/journal`

### API Routes (6)

> `trading/signals`, `trading/orders`, `trading/positions`, `trading/risk`, `trading/ise`, `trading/ise/rankings`

### Services (36)

> **PCTT Engine**: `pctt-core.ts`, `pctt-trading-service.ts`, `pctt-validator.ts`, `explainable-ai.ts`, `pine-script-generator.ts`, `portfolio-risk.ts`, `slippage-model.ts`, `trailing-stop-manager.ts`, `webhook-handler.ts`
> **Realtime**: `realtime-trading-service.ts`, `order-execution-engine.ts`, `order-status-tracker.ts`
> **Engines**: `llm-trading-engine.ts`, `ml-trading-engine.ts`, `rule-based-engine.ts`, `llm-guardrails.ts`
> **ISE**: `instrument-ranking.ts`, `instrument-rotation.ts`, `instrument-scoring.ts`, `ise-risk-gating.ts`
> **Orders/Positions/Risk**: `order-manager.ts`, `position-manager.ts`, `risk-gateway.ts`, `trailing-stop-service.ts`
> **Other**: `signal-fusion-service.ts`, `alpaca-broker.ts`, `paper-broker.ts`, `PaperTradingEngine.ts`, `backtest-engine.ts`, `technical-indicators.ts`, `TradingJournalService.ts`, `trading-notifications.ts`

### Tests (4)

| TestID    | Framework | Path                                                          | Cases |
| --------- | --------- | ------------------------------------------------------------- | ----- |
| TST-10-01 | Jest      | `trading/pctt/__tests__/pctt-core.test.ts`                    | 22    |
| TST-10-02 | Jest      | `trading/pctt/__tests__/pctt-validator.test.ts`               | 26    |
| TST-10-03 | Jest      | `trading/realtime/__tests__/realtime-trading-service.test.ts` | 22    |
| TST-10-04 | Jest      | `trading/realtime/__tests__/order-execution-engine.test.ts`   | 12    |

> **Gap**: Trading has 36 service files but only 4 test files. Test coverage is LOW.

---

## 13. FEAT-11 — Notifications

### Pages (3)

> `notifications/`, `dashboard/notifications`, `settings/notifications`

### API Routes (7)

> `notifications` (CRUD), `notifications/preferences`, `notifications/push/subscribe`, `notifications/push/send`, `notifications/push/vapid-key`, `email/unsubscribe`, `cron/send-reminders`

### Services (7)

> `notification-service.ts`, `notification-service-db.ts`, `push-notification-service.ts`, `web-push-service.ts`, `email-service.ts`, `unsubscribe-token.ts`

### Tests (1)

| TestID    | Framework | Path                                         | Cases |
| --------- | --------- | -------------------------------------------- | ----- |
| TST-11-01 | Jest      | `lib/__tests__/notification-service.test.ts` | 11    |

> **Gap**: 7 services but only 1 test file. Push notifications untested.

---

## 14. FEAT-12 — Documents

### Pages (3)

> `documents/`, `documents/[id]`, `dashboard/documents`

### API Routes (3)

> `documents` (CRUD), `documents/upload`, `documents/share`

### Services (2)

> `document-service.ts`, `document-service-db.ts`

### Tests (1)

| TestID    | Framework | Path                                               | Cases |
| --------- | --------- | -------------------------------------------------- | ----- |
| TST-12-01 | Jest      | `lib/documents/__tests__/document-service.test.ts` | 2     |

> **Gap**: Only 2 test cases for document service. Upload and share functionality untested.

---

## 15. FEAT-13 — Admin

### Pages (13)

> `admin/` hub + users, users/[id], analytics, subscriptions, disputes, audit, logs, config, features, health, settings + layout

### API Routes (16)

> `admin/users`, `admin/analytics`, `admin/subscriptions`, `admin/disputes`, `admin/audit`, `admin/logs`, `admin/metrics`, `admin/stats`, `admin/settings`, `admin/auth`, `user/analytics`, `health`, `monitoring/health`, `monitoring/events`, `monitoring/errors`, `monitoring/history`

### Services (9)

> `audit-logger.ts`, `logger.ts`, `metrics.ts`, `health.ts`, `analytics.ts`, `error-tracking.ts`, `real-time-monitoring.ts`, `sentry.ts`, `analytics-engine.ts`

### Tests (2)

| TestID    | Framework | Path                                       | Cases |
| --------- | --------- | ------------------------------------------ | ----- |
| TST-13-01 | Jest      | `app/admin/__tests__/admin-pages.test.tsx` | 10    |
| TST-13-02 | Jest      | `app/api/admin/__tests__/users.test.ts`    | 12    |

> **Gap**: 16 API routes but only 2 test files. Most admin endpoints untested.

---

## 16. FEAT-14 — Onboarding

### Pages (6)

> `onboarding/` (welcome), `onboarding/profile`, `onboarding/goals`, `onboarding/connect`, `onboarding/complete`, `journey/`

### API Routes (1)

> `onboarding/progress`

### Services (2)

> `onboarding/educational-content.ts`, `validation/onboarding-rules.ts`

### Tests (2)

| TestID    | Framework  | Path                                              | Cases |
| --------- | ---------- | ------------------------------------------------- | ----- |
| TST-14-01 | Jest       | `api/onboarding/progress/__tests__/route.test.ts` | 5     |
| TST-14-02 | Playwright | `e2e/home.spec.ts`                                | 8     |

---

## 17. FEAT-15 — Tax

### Pages (4)

> `tax/`, `tax/documents`, `tax/calendar`, `tax/scenarios`

### API Routes (3)

> `tax/analyze`, `tax/documents`, `tax/documents/upload`

### Services (16)

> `TaxBracketCalculator.ts`, `TaxOptimizationEngine.ts`, `RetirementAccountOptimizer.ts`, `TaxDocumentProcessor.ts`, OCR providers (4), `TaxLossHarvestingService.ts`, type definitions (5)

### Tests (2)

| TestID    | Framework | Path                                             | Cases |
| --------- | --------- | ------------------------------------------------ | ----- |
| TST-15-01 | Jest      | `lib/tax/__tests__/TaxBracketCalculator.test.ts` | 10    |
| TST-15-02 | Jest      | `lib/tax/__tests__/tax-documents.e2e.test.ts`    | 21    |

---

## 18. Cross-Cutting Tests

These tests span multiple domains:

| TestID    | Path                                                | Framework  | Cases | Domains Covered                                         |
| --------- | --------------------------------------------------- | ---------- | ----- | ------------------------------------------------------- |
| TST-XX-01 | `lib/__tests__/api-integration.test.ts`             | Jest       | 35    | Auth, Credit, Budget, Subscription, Transactions, Bills |
| TST-XX-02 | `lib/__tests__/data-validation.test.ts`             | Jest       | 18    | All (email, SSN, phone, date, amount validation)        |
| TST-XX-03 | `lib/__tests__/encryption.test.ts`                  | Jest       | 15    | Auth, Security                                          |
| TST-XX-04 | `lib/__tests__/rate-limiter.test.ts`                | Jest       | 11    | All API routes                                          |
| TST-XX-05 | `__tests__/integration/service-integration.test.ts` | Jest       | 8     | Financial, Investments, Chat                            |
| TST-XX-06 | `cypress/e2e/api-health-check.cy.ts`                | Cypress    | 30    | All API domains                                         |
| TST-XX-07 | `cypress/e2e/landing-page.cy.ts`                    | Cypress    | 11    | Landing, Navigation                                     |
| TST-XX-08 | `cypress/e2e/page-routes.cy.ts`                     | Cypress    | 7     | All page routing                                        |
| TST-XX-09 | `cypress/e2e/user-workflow.cy.ts`                   | Cypress    | 12    | End-to-end user journey                                 |
| TST-XX-10 | `e2e/dashboard.spec.ts`                             | Playwright | 7     | Dashboard, Navigation                                   |
| TST-XX-11 | `e2e/home.spec.ts`                                  | Playwright | 8     | Landing page, SEO                                       |
| TST-XX-12 | `cypress/e2e/payment-api.cy.ts`                     | Cypress    | 7     | Payment, Notifications, Admin                           |
| TST-XX-13 | `app/__tests__/layout.test.tsx`                     | Jest       | 5     | Root layout                                             |
| TST-XX-14 | `app/__tests__/page.test.tsx`                       | Jest       | 5     | Landing page                                            |
| TST-XX-15 | `components/__tests__/UIComponents.test.tsx`        | Jest       | 16    | UI primitives                                           |
| TST-XX-16 | `components/ui/__tests__/OfflineIndicator.test.tsx` | Jest       | 10    | Offline support                                         |
| TST-XX-17 | `lib/offline/__tests__/OfflineQueue.test.ts`        | Jest       | 9     | Offline queue                                           |
| TST-XX-18 | `hooks/__tests__/useOnline.test.ts`                 | Jest       | 8     | Network status                                          |

---

## 19. Coverage Gaps Summary

| Domain            | Services         | Test Files         | Gap Severity                             |
| ----------------- | ---------------- | ------------------ | ---------------------------------------- |
| Trading           | 36               | 4                  | **HIGH** — Most trading logic untested   |
| Notifications     | 7                | 1                  | **HIGH** — Push notifications untested   |
| Documents         | 2                | 1 (2 cases)        | **MEDIUM** — Upload/share untested       |
| Admin             | 9 + 16 APIs      | 2                  | **HIGH** — Most admin APIs untested      |
| Onboarding        | 2 + 7 components | 2                  | **MEDIUM** — Component tests missing     |
| Tax               | 16               | 2                  | **MEDIUM** — Only calculator + doc tests |
| Marketplace       | 9                | 5 (Jest) + 2 (E2E) | **LOW** — Reasonably covered             |
| Credit Monitoring | 6                | 8                  | **LOW** — Well covered                   |

---

## 20. Config Dependencies Matrix

| Service/Feature    | Env Variables Required                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| All pages/routes   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`                 |
| AI features        | `AIML_API_KEY`, `AIML_API_URL`                                              |
| Payments           | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_*_PRICE_ID`           |
| Email              | `RESEND_API_KEY`, `EMAIL_FROM`                                              |
| Documents          | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION` |
| Push notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                         |
| Market data        | Alpha Vantage, CoinGecko, Polygon API keys (via integrations)               |
| Banking            | Plaid API keys (via `plaid-service.ts`)                                     |

---

_Document generated from codebase analysis on 2026-02-16._
