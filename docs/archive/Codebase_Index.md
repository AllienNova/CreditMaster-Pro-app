# Codebase Index — Fynvita Platform

> **Complete module, service, and integration inventory with responsibilities, dependencies, config, and failure modes.**
> Last Updated: 2026-02-16

---

## 1. Summary

| Metric              | Value  |
| ------------------- | ------ |
| Total source files  | 1,296  |
| Total lines of code | 79,612 |
| API route files     | 248    |
| Page files          | 180    |
| Component files     | 225    |
| Layout files        | 7      |
| Library directories | 51     |
| Test files          | 198    |
| npm dependencies    | 28     |
| npm devDependencies | 22     |

---

## 2. Project Root Configuration

| File                   | Purpose                         | Key Settings                                          |
| ---------------------- | ------------------------------- | ----------------------------------------------------- |
| `package.json`         | Project manifest                | name: fynvita, 28 deps, 22 devDeps                    |
| `tsconfig.json`        | TypeScript config               | strict mode, ES2020 target, `@/*` path alias          |
| `next.config.ts`       | Next.js config (~195 lines)     | standalone output, 5-chunk strategy, webpack caching  |
| `tailwind.config.ts`   | Tailwind CSS (~196 lines)       | vital-green/trust-blue palette, class-based dark mode |
| `jest.config.ts`       | Jest config                     | jsdom env, ts-jest, 80% coverage thresholds           |
| `cypress.config.ts`    | Cypress config                  | baseUrl: localhost:3000, 1280x720 viewport            |
| `playwright.config.ts` | Playwright config               | Chromium, Firefox, WebKit browsers                    |
| `postcss.config.mjs`   | PostCSS                         | Tailwind + Autoprefixer                               |
| `.eslintrc.json`       | ESLint                          | next/core-web-vitals config                           |
| `src/middleware.ts`    | Next.js middleware (~264 lines) | CORS, auth, admin RBAC, security headers, CSP         |

---

## 3. API Routes (248 endpoints across 41 domains)

### 3.1 Financial Services (64 routes)

| Path Pattern                   | Est. Routes | Methods                | Description                                     |
| ------------------------------ | ----------- | ---------------------- | ----------------------------------------------- |
| /api/financial/budgets/\*      | ~8          | GET, POST, PUT, DELETE | Budget CRUD, categories, tracking               |
| /api/financial/calculators/\*  | ~6          | POST                   | Loan, mortgage, savings, retirement calculators |
| /api/financial/goals/\*        | ~6          | GET, POST, PUT, DELETE | Financial goal tracking and progress            |
| /api/financial/insights/\*     | ~5          | GET                    | AI-generated financial insights                 |
| /api/financial/transactions/\* | ~8          | GET, POST, PUT, DELETE | Transaction management, categorization          |
| /api/financial/recurring/\*    | ~5          | GET, POST, PUT, DELETE | Recurring transactions, bills                   |
| /api/financial/net-worth/\*    | ~4          | GET, POST              | Net worth tracking, asset/liability management  |
| /api/financial/bills/\*        | ~5          | GET, POST, PUT         | Bill tracking, reminders, negotiation           |
| /api/financial/reports/\*      | ~4          | GET                    | Financial reports, summaries                    |
| /api/financial/accounts/\*     | ~5          | GET, POST, PUT, DELETE | Linked account management                       |
| /api/financial/\* (other)      | ~8          | Mixed                  | Cash flow, spending analysis, categories        |

### 3.2 Investment Services (27 routes)

| Path Pattern                        | Est. Routes | Methods                | Description                                   |
| ----------------------------------- | ----------- | ---------------------- | --------------------------------------------- |
| /api/investments/portfolio-analysis | 1           | GET                    | Portfolio analysis and recommendations        |
| /api/investments/holdings/\*        | ~5          | GET, POST, PUT, DELETE | Holdings CRUD and valuation                   |
| /api/investments/risk/\*            | ~3          | GET, POST              | Risk assessment, tolerance quiz               |
| /api/investments/recommendations/\* | ~3          | GET                    | AI-powered investment recommendations         |
| /api/investments/\* (other)         | ~15         | Mixed                  | Performance, allocation, watchlist, dividends |

### 3.3 AI Services (23 routes)

| Path Pattern               | Est. Routes | Methods   | Description                               |
| -------------------------- | ----------- | --------- | ----------------------------------------- |
| /api/ai/chat               | 1           | POST      | General AI chat (auth required)           |
| /api/ai/consensus          | 1           | POST      | Multi-model consensus decisions           |
| /api/ai/credit/\*          | ~4          | POST      | Credit analysis, score prediction         |
| /api/ai/disputes/\*        | ~3          | POST      | AI dispute letter generation              |
| /api/ai/recommendations/\* | ~3          | GET, POST | Personalized AI recommendations           |
| /api/ai/\* (other)         | ~11         | Mixed     | Embeddings, summarization, classification |

### 3.4 Credit Services (35 routes combined)

| Domain                    | Routes | Description                                             |
| ------------------------- | ------ | ------------------------------------------------------- |
| /api/credit-repair/\*     | 13     | Disputes, score, quick-wins, goodwill, impact, timeline |
| /api/credit-monitoring/\* | 5      | Alerts, score history, reports                          |
| /api/credit-builder/\*    | 5      | Plans, progress, accounts                               |
| /api/credit-bureau/\*     | 4      | Reports, disputes, score-factors, inquiries             |
| /api/credit/\*            | 2      | Score, analyze                                          |
| /api/credit-report/\*     | 1      | Full credit report                                      |

### 3.5 Marketplace (12 routes)

| Path Pattern        | Est. Routes | Methods                | Description                                     |
| ------------------- | ----------- | ---------------------- | ----------------------------------------------- |
| /api/marketplace/\* | 12          | GET, POST, PUT, DELETE | Products, listings, reviews, categories, search |

### 3.6 Admin (10 routes)

| Path Pattern  | Est. Routes | Methods                | Description                                      |
| ------------- | ----------- | ---------------------- | ------------------------------------------------ |
| /api/admin/\* | 10          | GET, POST, PUT, DELETE | User management, analytics, settings, moderation |

### 3.7 Disputes (9 routes)

| Path Pattern     | Est. Routes | Methods                | Description                                         |
| ---------------- | ----------- | ---------------------- | --------------------------------------------------- |
| /api/disputes/\* | 9           | GET, POST, PUT, DELETE | CRUD, generate, status tracking, bureau submissions |

### 3.8 Other Domains (97 routes)

| Domain                | Routes | Description                                      |
| --------------------- | ------ | ------------------------------------------------ |
| /api/trading/\*       | 6      | Orders, positions, strategies, market data       |
| /api/notifications/\* | 5      | CRUD, preferences, push, mark-read               |
| /api/gamification/\*  | 5      | Achievements, leaderboard, challenges, rewards   |
| /api/auth/\*          | 5      | Login, signup, callback, reset-password, session |
| /api/analytics/\*     | 5      | Dashboard, events, reports, user-activity        |
| /api/payment/\*       | 4      | Checkout, webhook, subscription, portal          |
| /api/monitoring/\*    | 4      | Health, metrics, logs, status                    |
| /api/cron/\*          | 4      | Scheduled: cleanup, sync, notifications, reports |
| /api/chat/\*          | 4      | Messages, history, context, sessions             |
| /api/tax/\*           | 3      | Optimization, documents, estimates               |
| /api/student-loans/\* | 3      | Data, strategy, federal programs                 |
| /api/federal/\*       | 3      | Programs, eligibility, applications              |
| /api/documents/\*     | 3      | CRUD, upload, download                           |
| /api/servicers/\*     | 2      | Loan servicer data, contact info                 |
| /api/ml/\*            | 2      | Predictions, model status                        |
| /api/automation/\*    | 2      | Rules, triggers                                  |
| /api/ws               | 1      | WebSocket endpoint                               |
| /api/voice/synthesize | 1      | Text-to-speech                                   |
| /api/user             | 1      | User profile                                     |
| /api/test-db          | 1      | Database connectivity test                       |
| /api/strategies       | 1      | Financial strategy recommendations               |
| /api/settings         | 1      | User settings                                    |
| /api/profile          | 1      | User profile management                          |
| /api/performance      | 1      | Performance metrics                              |
| /api/onboarding       | 1      | Onboarding flow                                  |
| /api/health           | 1      | Health check                                     |
| /api/federal-programs | 1      | Federal program eligibility                      |
| /api/email            | 1      | Email sending                                    |
| /api/csrf             | 1      | CSRF token                                       |

---

## 4. Pages (180 pages across ~30 domains)

### 4.1 Core Application Pages

| Domain     | Path Pattern              | Est. Pages | Description                                            |
| ---------- | ------------------------- | ---------- | ------------------------------------------------------ |
| Landing    | /page.tsx                 | 1          | Marketing landing page                                 |
| Auth       | /login, /signup, /auth/\* | ~8         | Authentication flows                                   |
| Dashboard  | /dashboard/\*             | ~14        | Main user dashboard, widgets, overview                 |
| Settings   | /settings/\*              | ~7         | Profile, preferences, notifications, security, billing |
| Pricing    | /pricing                  | 1          | Subscription tier display                              |
| Onboarding | /onboarding/\*            | ~5         | Welcome flow, profile, goals                           |
| Help       | /help/\*                  | ~3         | FAQ, support, contact                                  |

### 4.2 Financial Domain Pages

| Domain    | Path Pattern  | Est. Pages | Description                             |
| --------- | ------------- | ---------- | --------------------------------------- |
| Financial | /financial/\* | ~25        | Budgeting, calculators, goals, insights |
| Budgeting | /budgeting/\* | ~4         | Budget views, categories                |
| Billing   | /billing/\*   | ~3         | Subscription, invoices                  |
| Tax       | /tax/\*       | ~4         | Tax optimization, planning              |

### 4.3 Credit Domain Pages

| Domain         | Path Pattern       | Est. Pages | Description                   |
| -------------- | ------------------ | ---------- | ----------------------------- |
| Credit Builder | /credit-builder/\* | ~16        | Plans, progress, accounts     |
| Credit Repair  | /credit-repair/\*  | ~8         | Disputes, timeline, letters   |
| Credit         | /credit/\*         | ~5         | Score, factors, monitoring    |
| Disputes       | /disputes/\*       | ~5         | List, detail, create, history |

### 4.4 Investment & Trading Pages

| Domain      | Path Pattern    | Est. Pages | Description                   |
| ----------- | --------------- | ---------- | ----------------------------- |
| Investments | /investments/\* | ~10        | Portfolio, holdings, analysis |
| Trading     | /trading/\*     | ~3         | Dashboard, orders, positions  |

### 4.5 Other Domain Pages

| Domain        | Path Pattern        | Est. Pages | Description                |
| ------------- | ------------------- | ---------- | -------------------------- |
| Admin         | /admin/\*           | ~12        | Management console         |
| Marketplace   | /marketplace/\*     | ~12        | Browse, listings, products |
| Analytics     | /analytics/\*       | ~5         | Reports, trends, insights  |
| AI Tools      | /ai-tools           | 1          | AI feature showcase        |
| Student Loans | /student-loan-agent | 1          | Student loan analysis      |
| Gamification  | /gamification/\*    | ~3         | Achievements, leaderboard  |

### 4.6 Layouts (7)

| Layout      | Path                    | Scope                                  |
| ----------- | ----------------------- | -------------------------------------- |
| Root        | /layout.tsx             | All pages (global providers, metadata) |
| Admin       | /admin/layout.tsx       | Admin console                          |
| Analytics   | /analytics/layout.tsx   | Analytics pages                        |
| Help        | /help/layout.tsx        | Help section                           |
| Marketplace | /marketplace/layout.tsx | Marketplace pages                      |
| Onboarding  | /onboarding/layout.tsx  | Onboarding flow                        |
| Settings    | /settings/layout.tsx    | Settings pages                         |

---

## 5. Components (225 files across ~40 directories)

### 5.1 AI & ML Components

| Component              | File                                           | Responsibility                   |
| ---------------------- | ---------------------------------------------- | -------------------------------- |
| AIChat                 | src/components/aiml/AIChat.tsx                 | AI chat interface with streaming |
| CreditAnalyzer         | src/components/aiml/CreditAnalyzer.tsx         | Credit report analysis UI        |
| DisputeGenerator       | src/components/aiml/DisputeGenerator.tsx       | AI dispute letter generation     |
| LoanStrategyCalculator | src/components/aiml/LoanStrategyCalculator.tsx | Loan repayment strategies        |

### 5.2 Financial Components (~48 files)

| Category     | Est. Files | Key Components                                      |
| ------------ | ---------- | --------------------------------------------------- |
| Budgeting    | ~8         | BudgetOverview, CategoryChart, SpendingTracker      |
| Calculators  | ~6         | LoanCalc, MortgageCalc, RetirementCalc, SavingsCalc |
| Goals        | ~5         | GoalCard, GoalProgress, GoalCreate                  |
| Transactions | ~6         | TransactionList, TransactionForm, CategorySelect    |
| Bills        | ~5         | BillTracker, RecurringBills, BillNegotiator         |
| Net Worth    | ~4         | NetWorthChart, AssetForm, LiabilityForm             |
| Insights     | ~4         | InsightCard, SpendingInsight, SavingsInsight        |
| Other        | ~10        | AccountLink, CashFlow, FinancialHealth              |

### 5.3 Investment & Trading Components (~28 files)

| Category  | Est. Files | Key Components                                        |
| --------- | ---------- | ----------------------------------------------------- |
| Portfolio | ~6         | PortfolioOverview, AllocationChart, PerformanceGraph  |
| Holdings  | ~5         | HoldingsTable, HoldingCard, AddHolding                |
| Risk      | ~3         | RiskMeter, RiskQuiz, RiskProfile                      |
| Trading   | ~8         | OrderForm, PositionCard, MarketData, CandlestickChart |
| Charts    | ~6         | LineChart, BarChart, PieChart, AreaChart, Sparkline   |

### 5.4 Credit & Disputes Components (~26 files)

| Category       | Est. Files | Key Components                                         |
| -------------- | ---------- | ------------------------------------------------------ |
| Credit Repair  | ~10        | DisputeForm, TimelineView, LetterPreview, BureauSelect |
| Disputes       | ~8         | DisputeCard, StatusBadge, DisputeList, DisputeDetail   |
| Credit Builder | ~5         | PlanCard, ProgressTracker, AccountSetup                |
| Monitoring     | ~3         | ScoreGauge, AlertList, ReportSummary                   |

### 5.5 Shared & UI Components (~20 files)

| Component                | Responsibility      |
| ------------------------ | ------------------- |
| Button, Input, Select    | Form primitives     |
| Card, Modal, Dialog      | Layout containers   |
| Badge, Tag, Tooltip      | Decorative elements |
| LoadingSpinner, Skeleton | Loading states      |
| ErrorBoundary, Alert     | Error display       |
| Pagination, Table        | Data display        |

### 5.6 Other Component Categories

| Category      | Est. Files | Components                                   |
| ------------- | ---------- | -------------------------------------------- |
| Auth          | ~9         | LoginForm, SignupForm, MFASetup, SocialAuth  |
| Documents     | ~6         | UploadForm, FileList, Preview, Viewer        |
| Notifications | ~6         | BellIcon, NotificationList, Preferences      |
| Gamification  | ~6         | AchievementBadge, Leaderboard, ChallengeCard |
| Chat          | ~5         | MessageBubble, ChatInput, History            |
| Layout        | ~5         | Navbar, Sidebar, Footer, Header              |
| Onboarding    | ~5         | WelcomeWizard, ProfileForm, GoalSelector     |
| Admin         | ~8         | UserTable, AnalyticsDash, SettingsPanel      |
| Marketplace   | ~6         | ProductCard, ListingGrid, ReviewForm         |
| Student Loans | ~5         | LoanSummary, RepaymentPlan, ServicerInfo     |

---

## 6. Library Modules (328 files across 51 directories)

### 6.1 Core AI Layer

| Module             | Path                               | Key Exports                  | Dependencies               | Lines |
| ------------------ | ---------------------------------- | ---------------------------- | -------------------------- | ----- |
| AIML Service       | src/lib/aiml-service.ts            | `aimlService` (singleton)    | openai                     | ~400  |
| Model Router       | src/lib/model-router.ts            | `modelRouter` (singleton)    | aiml-service               | ~300  |
| AI Orchestrator    | src/lib/ai-orchestrator.ts         | `aiOrchestrator` (singleton) | model-router, aiml-service | ~600  |
| Dispute Prompts    | src/lib/prompts/dispute-prompts.ts | Prompt templates             | —                          | ~500  |
| AI Module          | src/lib/ai/ (11 files)             | AI utilities, configs        | openai, model-router       | —     |
| AI Personalization | src/lib/ai-personalization/        | User preference engine       | ai, supabase               | —     |

### 6.2 Security & Auth Layer

| Module            | Path                                  | Key Exports             | Dependencies      | Lines |
| ----------------- | ------------------------------------- | ----------------------- | ----------------- | ----- |
| Input Validation  | src/lib/security/input-validation.ts  | `inputValidation`       | zod               | ~325  |
| Output Validation | src/lib/security/output-validation.ts | `outputValidation`      | —                 | ~341  |
| Rate Limiting     | src/lib/security/rate-limiting.ts     | `rateLimiter`           | — (in-memory Map) | ~387  |
| Auth Middleware   | src/lib/security/auth-middleware.ts   | `authMiddleware`        | supabase, jwt     | ~400  |
| Audit Logging     | src/lib/security/audit-logging.ts     | `auditLogger`           | — (in-memory)     | ~501  |
| GDPR/CCPA         | src/lib/compliance/gdpr-ccpa.ts       | Compliance helpers      | supabase          | ~450  |
| PII Protection    | src/lib/compliance/pii-protection.ts  | PII detect/encrypt      | —                 | ~400  |
| Auth Module       | src/lib/auth/ (12 files)              | Session, JWT, MFA, RBAC | supabase, jwt     | —     |

### 6.3 Business Logic Layer

| Module        | Path                                | Files | Key Exports                        | Lines |
| ------------- | ----------------------------------- | ----- | ---------------------------------- | ----- |
| Financial     | src/lib/financial/                  | ~35   | Budget, calculator, goal services  | —     |
| Investments   | src/lib/investments/                | ~27   | Portfolio, holdings, risk services | —     |
| Trading       | src/lib/trading/                    | ~30   | Order, position, strategy services | —     |
| Credit Repair | src/lib/credit-repair/              | ~14   | Dispute, bureau, timeline services | —     |
| Credit Bureau | src/lib/credit-bureau/              | ~8    | Report parser, score factors       | —     |
| Disputes      | src/lib/disputes/dispute-service.ts | 1     | `disputeService` (singleton)       | ~653  |
| Tax           | src/lib/tax/                        | ~12   | Optimization, compliance, docs     | —     |
| Gamification  | src/lib/gamification/               | ~9    | Achievements, leaderboard          | —     |
| Commerce      | src/lib/commerce/                   | ~12   | Cart, orders, products             | —     |
| Student Loans | src/lib/student-loan-agent/         | ~5    | Strategy, federal regs             | —     |
| Marketplace   | src/lib/marketplace/                | —     | Listings, transactions             | —     |

### 6.4 Infrastructure Layer

| Module                | Path                                          | Key Exports                   | Dependencies          | Lines |
| --------------------- | --------------------------------------------- | ----------------------------- | --------------------- | ----- |
| Stripe Service        | src/lib/payment/stripe-service.ts             | `stripeService`               | stripe                | ~610  |
| Notification Svc      | src/lib/notifications/notification-service.ts | `notificationService`         | resend, supabase      | ~565  |
| Document Svc          | src/lib/documents/document-service.ts         | `documentService`             | @aws-sdk/client-s3    | ~456  |
| Logger                | src/lib/monitoring/logger.ts                  | `logger`                      | —                     | ~372  |
| Metrics               | src/lib/monitoring/metrics.ts                 | `metrics`                     | — (in-memory)         | ~480  |
| Supabase Client       | src/lib/supabase/ (~5 files)                  | Client, server, middleware    | @supabase/supabase-js | —     |
| Supabase (deprecated) | src/lib/supabase.ts                           | `supabase` (proxy singleton)  | @supabase/supabase-js | —     |
| Pricing               | src/lib/pricing.ts                            | `pricingTiers`, `PricingTier` | —                     | ~475  |

### 6.5 Cross-Cutting Modules

| Module            | Path                       | Files | Purpose                  |
| ----------------- | -------------------------- | ----- | ------------------------ |
| Utils             | src/lib/utils/             | —     | General utilities        |
| Validation        | src/lib/validation/        | —     | Schema validation        |
| Config            | src/lib/config/            | —     | Environment config       |
| Analytics         | src/lib/analytics/         | —     | Event tracking           |
| Cache             | src/lib/cache/             | —     | Caching utilities        |
| Database          | src/lib/database/          | —     | Query helpers            |
| Email             | src/lib/email/             | —     | Email templates          |
| Experiments       | src/lib/experiments/       | —     | Feature flags, A/B       |
| I18n              | src/lib/i18n/              | —     | Internationalization     |
| Offline           | src/lib/offline/           | —     | Offline-first support    |
| PWA               | src/lib/pwa/               | —     | Progressive web app      |
| Performance       | src/lib/performance/       | —     | Perf monitoring          |
| Realtime          | src/lib/realtime/          | —     | WebSocket/SSE            |
| Onboarding        | src/lib/onboarding/        | —     | User onboarding          |
| React Query       | src/lib/react-query/       | —     | Query client config      |
| Strategies        | src/lib/strategies/        | —     | Financial strategies     |
| Integrations      | src/lib/integrations/      | —     | Third-party integrations |
| Connectors        | src/lib/connectors/        | —     | External data connectors |
| Goals             | src/lib/goals/             | —     | Goal management          |
| Subscriptions     | src/lib/subscriptions/     | —     | Subscription management  |
| Services          | src/lib/services/          | —     | Shared service utilities |
| API               | src/lib/api/               | —     | API client utilities     |
| Automation        | src/lib/automation/        | —     | Workflow automation      |
| Credit            | src/lib/credit/            | —     | General credit utilities |
| Credit Builder    | src/lib/credit-builder/    | —     | Credit building          |
| Credit Monitoring | src/lib/credit-monitoring/ | —     | Score monitoring         |
| Credit Report     | src/lib/credit-report/     | —     | Report utilities         |

---

## 7. External Service Integrations

### 7.1 AIML API (AI Gateway)

| Field        | Value                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Package      | openai@^4.77.3 (compatible endpoint)                                                      |
| Base URL     | https://api.aimlapi.com/v1                                                                |
| Auth         | Bearer token (AIML_API_KEY)                                                               |
| Models       | 300+ from 8+ providers (Anthropic, OpenAI, DeepSeek, Google, Meta, Mistral, Cohere, etc.) |
| Features     | Chat, image gen, voice synthesis, embeddings                                              |
| Failure Mode | Retry with fallback model; graceful degradation                                           |
| Cost Model   | Pay-as-you-go per token                                                                   |

### 7.2 Supabase (Auth + Database)

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| Package        | @supabase/supabase-js@^2.89.0, @supabase/ssr@^0.7.0 |
| Auth Methods   | Email/password, OAuth, MFA (TOTP)                   |
| Database       | PostgreSQL with Row-Level Security                  |
| Client Pattern | Server client via @supabase/ssr (SSR-safe)          |
| Failure Mode   | App-breaking: auth fails, data unavailable          |
| Cost           | Free tier (50K MAU)                                 |

### 7.3 Stripe (Payments)

| Field          | Value                                                                               |
| -------------- | ----------------------------------------------------------------------------------- |
| Package        | stripe@^19.1.0, @stripe/stripe-js@^8.1.0                                            |
| Features       | Checkout sessions, subscriptions, webhooks, customer portal                         |
| Webhook Events | subscription.created/updated/deleted, invoice.paid/failed, payment_intent.succeeded |
| Tiers          | 6 subscription tiers (Free → Family Plus)                                           |
| Failure Mode   | Checkout fails; webhook retries (up to 3 days)                                      |
| Cost           | 2.9% + $0.30 per transaction                                                        |

### 7.4 AWS S3 (File Storage)

| Field        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| Package      | @aws-sdk/client-s3@^3.917.0, @aws-sdk/s3-request-presigner@^3.917.0  |
| Features     | Presigned URLs (7-day expiry), file validation, encryption at rest   |
| Limits       | 10MB per file                                                        |
| Types        | Credit reports, dispute letters, identity docs, financial statements |
| Failure Mode | Upload fails; presigned URLs expire                                  |
| Cost         | $0.023/GB/month + $0.09/GB transfer                                  |

### 7.5 Resend (Email)

| Field        | Value                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Package      | resend@^6.2.2                                                                   |
| Templates    | Welcome, dispute created/updated/resolved, payment success/failed, score change |
| Failure Mode | Silent fail, queued for retry                                                   |
| Cost         | Free tier (100/day), $20/month (50K)                                            |

### 7.6 Web Push

| Field        | Value           |
| ------------ | --------------- |
| Package      | web-push@^3.6.7 |
| Auth         | VAPID keys      |
| Failure Mode | Silent fail     |

---

## 8. npm Scripts

| Script          | Command                                        | Purpose                             |
| --------------- | ---------------------------------------------- | ----------------------------------- |
| `dev`           | `next dev`                                     | Start development server            |
| `build`         | `next build`                                   | Production build                    |
| `start`         | `next start`                                   | Start production server             |
| `lint`          | `next lint`                                    | Run ESLint                          |
| `type-check`    | `tsc --noEmit`                                 | TypeScript type checking            |
| `test`          | `jest`                                         | Run Jest tests                      |
| `test:watch`    | `jest --watch`                                 | Jest in watch mode                  |
| `test:coverage` | `jest --coverage`                              | Jest with coverage report           |
| `e2e`           | `playwright test`                              | Run Playwright E2E tests            |
| `e2e:ui`        | `playwright test --ui`                         | Playwright interactive UI           |
| `e2e:headed`    | `playwright test --headed`                     | Playwright headed mode              |
| `e2e:report`    | `playwright show-report`                       | View Playwright report              |
| `cypress:open`  | `cypress open`                                 | Cypress interactive                 |
| `cypress:run`   | `wait-on http://localhost:3000 && cypress run` | Cypress headless (waits for server) |
| `check-env`     | `node scripts/check-env.js`                    | Validate environment variables      |

---

## 9. Directory Tree (Top 3 Levels)

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (248 routes, 41 domains)
│   │   ├── admin/               # 10 routes
│   │   ├── ai/                  # 23 routes
│   │   ├── analytics/           # 5 routes
│   │   ├── auth/                # 5 routes
│   │   ├── automation/          # 2 routes
│   │   ├── chat/                # 4 routes
│   │   ├── credit/              # 2 routes
│   │   ├── credit-builder/      # 5 routes
│   │   ├── credit-bureau/       # 4 routes
│   │   ├── credit-monitoring/   # 5 routes
│   │   ├── credit-repair/       # 13 routes
│   │   ├── credit-report/       # 1 route
│   │   ├── cron/                # 4 routes
│   │   ├── csrf/                # 1 route
│   │   ├── disputes/            # 9 routes
│   │   ├── documents/           # 3 routes
│   │   ├── email/               # 1 route
│   │   ├── federal/             # 3 routes
│   │   ├── federal-programs/    # 1 route
│   │   ├── financial/           # 64 routes
│   │   ├── gamification/        # 5 routes
│   │   ├── health/              # 1 route
│   │   ├── investments/         # 27 routes
│   │   ├── marketplace/         # 12 routes
│   │   ├── ml/                  # 2 routes
│   │   ├── monitoring/          # 4 routes
│   │   ├── notifications/       # 5 routes
│   │   ├── onboarding/          # 1 route
│   │   ├── payment/             # 4 routes
│   │   ├── performance/         # 1 route
│   │   ├── profile/             # 1 route
│   │   ├── servicers/           # 2 routes
│   │   ├── settings/            # 1 route
│   │   ├── strategies/          # 1 route
│   │   ├── student-loans/       # 3 routes
│   │   ├── tax/                 # 3 routes
│   │   ├── test-db/             # 1 route
│   │   ├── trading/             # 6 routes
│   │   ├── user/                # 1 route
│   │   ├── voice/               # 1 route
│   │   └── ws/                  # 1 route
│   ├── (page domains)/          # 180 page.tsx files
│   └── layout.tsx               # Root layout
│
├── components/                   # React Components (225 files)
│   ├── aiml/                    # AI-powered components
│   ├── auth/                    # Authentication forms
│   ├── charts/                  # Data visualization
│   ├── credit-repair/           # Credit repair UI
│   ├── disputes/                # Dispute management UI
│   ├── documents/               # Document management
│   ├── financial/               # Financial tools UI
│   ├── gamification/            # Gamification UI
│   ├── investments/             # Investment UI
│   ├── notifications/           # Notification UI
│   ├── trading/                 # Trading UI
│   ├── ui/                      # Shared primitives
│   └── (30+ more dirs)/        # Domain-specific components
│
├── lib/                         # Core Libraries (328 files, 51 dirs)
│   ├── ai/                     # AI utilities (11 files)
│   ├── auth/                   # Auth (12 files)
│   ├── security/               # Security (11 files)
│   ├── compliance/             # GDPR/CCPA (5 files)
│   ├── financial/              # Financial services (35 files)
│   ├── investments/            # Investment services (27 files)
│   ├── trading/                # Trading services (30 files)
│   ├── credit-repair/          # Credit repair (14 files)
│   ├── credit-bureau/          # Credit bureau (8 files)
│   ├── disputes/               # Dispute tracking
│   ├── documents/              # Document storage
│   ├── gamification/           # Gamification (9 files)
│   ├── monitoring/             # Logging, metrics (8 files)
│   ├── notifications/          # Email, push, in-app
│   ├── payment/                # Stripe integration
│   ├── tax/                    # Tax services (12 files)
│   ├── commerce/               # E-commerce (12 files)
│   ├── supabase/               # DB client
│   └── (30+ more dirs)/       # Other modules
│
├── types/                       # TypeScript type definitions
│
cypress/                         # Cypress E2E tests (21 specs)
├── e2e/                        # Test specs
└── support/                    # Custom commands, setup

e2e/                            # Playwright E2E tests (16 specs)

docs/                           # Documentation (95 files)
```

---

_Document generated from full codebase analysis on 2026-02-16._
