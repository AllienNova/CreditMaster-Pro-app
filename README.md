<div align="center">

# Fynvita

**Your Financial Vitality Platform**

AI-powered credit repair, financial wellness, and investment intelligence — unified in a single platform.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/AllienNova/CreditMaster-Pro-app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-81%25-yellow)](https://github.com/AllienNova/CreditMaster-Pro-app)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

[Live Demo](https://fynvita.vercel.app) · [Documentation](docs/) · [Report Bug](https://github.com/AllienNova/CreditMaster-Pro-app/issues)

</div>

---

## Overview

Fynvita combines AI-powered credit repair, comprehensive financial management, and investment intelligence into a holistic financial health platform. With access to 300+ AI models, intelligent routing, and enterprise-grade security, Fynvita helps users take control of their complete financial picture.

### Key Capabilities

- **Credit Repair** — AI-generated dispute letters, credit score analysis, goodwill letter generation, and automated bureau communication
- **Financial Management** — Budget optimization, debt payoff strategies, bill negotiation, savings automation, and cash flow analysis
- **Investment Intelligence** — Portfolio analysis, stock research with technical/fundamental/sentiment analysis, tax-loss harvesting, and price alerts
- **Student Loan Optimization** — Repayment strategy comparison, PSLF eligibility analysis, federal program integration
- **Credit Building** — Score simulation, utilization optimization, credit mix analysis, authorized user strategies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15.5 (App Router), React 19, TypeScript 5.7, Tailwind CSS |
| **Backend** | Next.js API Routes (serverless), Node.js 22 |
| **Database** | Supabase (PostgreSQL) with Row-Level Security |
| **Auth** | Supabase Auth (email/password, OAuth, MFA) |
| **AI/ML** | AIML API (300+ models), intelligent model routing |
| **Payments** | Stripe (subscriptions, checkout, webhooks) |
| **Email** | Resend (transactional email) |
| **Storage** | AWS S3 (document storage with presigned URLs) |
| **Mobile** | React Native / Expo |
| **Testing** | Jest, React Testing Library, Cypress, Playwright |
| **Deployment** | Vercel |

## Architecture

```
Client (Browser / Mobile)
    │
    ▼
Next.js App Router ──── API Routes (279 endpoints)
    │                        │
    ├── Security Layer       ├── AI Orchestrator ── AIML API (300+ models)
    │   ├── Input validation │
    │   ├── Rate limiting    ├── Business Logic
    │   ├── Auth middleware   │   ├── Credit repair engine
    │   └── PII protection   │   ├── Financial services
    │                        │   ├── Investment analysis
    ├── Monitoring           │   └── Student loan agent
    │   ├── Structured logs  │
    │   ├── Metrics          ├── Data Layer
    │   └── Audit trail      │   ├── Supabase (PostgreSQL)
    │                        │   ├── AWS S3 (documents)
    └── Compliance           │   └── Stripe (payments)
        ├── GDPR/CCPA        │
        └── FCRA             └── Email (Resend)
```

## Project Metrics

| Metric | Value |
|--------|-------|
| Web Pages | 388 |
| Mobile Screens | 200+ |
| API Routes | 279 |
| Components | 272 |
| Test Suites | 143+ |
| Test Coverage | 81.42% |
| TypeScript Errors | 0 |
| Build Time | ~11s |

## Getting Started

### Prerequisites

- Node.js 22+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- AIML API key ([aimlapi.com](https://aimlapi.com))

### Installation

```bash
git clone https://github.com/AllienNova/CreditMaster-Pro-app.git
cd CreditMaster-Pro-app

npm install
cp .env.example .env.local
# Edit .env.local with your credentials

npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI
AIML_API_KEY=your_aiml_api_key
AIML_BASE_URL=https://api.aimlapi.com/v1

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

See `.env.example` for the complete list of configuration options.

## Development

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Run tests
npm test

# Test coverage
npm run test:coverage

# E2E tests
npm run cypress:open    # Cypress
npm run e2e             # Playwright

# Production build
npm run build
```

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # 279 API endpoints
│   │   ├── ai/             # AI chat, consensus, orchestration
│   │   ├── credit-repair/  # Disputes, goodwill, negotiations
│   │   ├── financial/      # Budgets, goals, bills, spending
│   │   ├── investments/    # Portfolio, signals, analysis
│   │   └── ...
│   ├── dashboard/          # User dashboard
│   ├── credit-builder/     # Credit building tools
│   ├── financial/          # Financial management
│   ├── investments/        # Investment portal
│   └── ...
├── components/             # 272 React components
│   ├── aiml/               # AI-powered components
│   ├── credit-repair/      # Credit repair UI
│   ├── financial/          # Financial management UI
│   ├── investments/        # Investment analysis UI
│   └── ui/                 # Shared UI primitives
├── lib/                    # Core business logic
│   ├── ai/                 # AI engine, chat, entity extraction
│   ├── auth/               # Authentication, RBAC, sessions
│   ├── credit-repair/      # Credit repair services
│   ├── financial/          # Financial services
│   ├── investments/        # Investment services
│   ├── security/           # Input/output validation, rate limiting
│   └── compliance/         # GDPR, CCPA, PII protection
└── hooks/                  # Custom React hooks
mobile-app/                 # React Native / Expo mobile app
```

## Security

- Input validation with prompt injection detection
- Output validation with PII leak prevention
- Rate limiting with cost tracking
- Role-based access control (RBAC)
- Audit logging for all sensitive operations
- GDPR and CCPA compliance
- Encrypted PII storage
- HTTPS-only, secure cookies, CSP headers

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Add all environment variables from `.env.local` in Vercel project settings.

## Contributing

This is a proprietary project. For inquiries, please contact the project owner.

## License

Proprietary — All rights reserved.

---

<div align="center">

**Fynvita** — Built by [AlienNova](https://github.com/AllienNova)

</div>
