# Fynvita - Complete API Keys & External Services Reference

This document provides a comprehensive list of ALL API keys and external services required for the Fynvita platform to function fully.

---

## Quick Reference Table

| Category      | Service          | Required    | Env Variable(s)                                             |
| ------------- | ---------------- | ----------- | ----------------------------------------------------------- |
| Database      | Supabase         | ✅ Critical | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Payments      | Stripe           | ✅ Critical | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                |
| AI/ML         | AIML API         | ✅ Critical | `AIML_API_KEY`, `AIML_API_URL`                              |
| Banking       | Plaid            | ✅ Critical | `PLAID_CLIENT_ID`, `PLAID_SECRET`                           |
| Email         | Resend           | ✅ Critical | `RESEND_API_KEY`                                            |
| Market Data   | Polygon.io       | ⚠️ Trading  | `POLYGON_API_KEY`                                           |
| Market Data   | Finnhub          | ⚠️ Trading  | `FINNHUB_API_KEY`                                           |
| Market Data   | Alpha Vantage    | ⚠️ Trading  | `ALPHA_VANTAGE_API_KEY`                                     |
| Broker        | Alpaca           | ⚠️ Trading  | `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`                       |
| Credit Bureau | Experian         | ⚠️ Credit   | `EXPERIAN_CLIENT_ID`, `EXPERIAN_CLIENT_SECRET`              |
| Credit Bureau | Equifax          | ⚠️ Credit   | `EQUIFAX_API_KEY`, `EQUIFAX_CLIENT_ID`                      |
| Credit Bureau | TransUnion       | ⚠️ Credit   | `TRANSUNION_SUBSCRIBER_ID`, `TRANSUNION_API_KEY`            |
| Banking (EU)  | TrueLayer        | Optional    | `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`            |
| Insurance     | Canopy Connect   | Optional    | `CANOPY_CLIENT_ID`, `CANOPY_CLIENT_SECRET`                  |
| Monitoring    | Sentry           | Optional    | `SENTRY_DSN`                                                |
| Analytics     | Google Analytics | Optional    | `NEXT_PUBLIC_GA_MEASUREMENT_ID`                             |

---

## 1. CORE INFRASTRUCTURE (Required)

### 1.1 Supabase (Database & Auth)

**Purpose**: Database, authentication, real-time subscriptions, storage

**Where to get**: https://supabase.com/dashboard

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Files using this**:

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- All API routes and services

---

### 1.2 Stripe (Payments)

**Purpose**: Payment processing, subscriptions, billing

**Where to get**: https://dashboard.stripe.com/apikeys

```env
# Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Product Price IDs (create in Stripe Dashboard)
STRIPE_STANDARD_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_FAMILY_DUO_PRICE_ID=price_xxx
STRIPE_FAMILY_PRICE_ID=price_xxx
STRIPE_FAMILY_PLUS_PRICE_ID=price_xxx

# Annual Prices
STRIPE_STANDARD_ANNUAL_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
STRIPE_FAMILY_DUO_ANNUAL_PRICE_ID=price_xxx
STRIPE_FAMILY_ANNUAL_PRICE_ID=price_xxx
STRIPE_FAMILY_PLUS_ANNUAL_PRICE_ID=price_xxx
```

**Files using this**:

- `src/lib/payment/stripe-service.ts`
- `src/lib/pricing.ts`
- `src/lib/subscriptions/subscription-service.ts`
- `src/app/api/payment/webhook/route.ts`

---

### 1.3 AIML API (AI Features)

**Purpose**: AI chat, financial analysis, dispute generation, recommendations

**Where to get**: https://aimlapi.com/dashboard

```env
AIML_API_KEY=your_aiml_api_key
AIML_API_URL=https://api.aimlapi.com/v1

# Model Configuration (optional)
AIML_DEFAULT_CHAT_MODEL=gpt-4o-mini
AIML_REASONING_MODEL=o1-mini
AIML_FAST_MODEL=gpt-4o-mini
AIML_IMAGE_MODEL=dall-e-3
AIML_VOICE_MODEL=tts-1
```

**Files using this**:

- `src/lib/aiml-service.ts`
- `src/lib/model-router.ts`
- `src/lib/trading/engines/llm-trading-engine.ts`
- `src/lib/ai/chat-engine.ts`
- `src/lib/config/env-validation.ts`

---

### 1.4 Resend (Email)

**Purpose**: Transactional emails, notifications

**Where to get**: https://resend.com/api-keys

```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=Fynvita <noreply@fynvita.com>
```

**Files using this**:

- `src/lib/notifications/notification-service.ts`
- `src/lib/email/email-service.ts`

---

## 2. BANKING & FINANCIAL DATA

### 2.1 Plaid (US Bank Connections)

**Purpose**: Bank account linking, transaction data, balance retrieval

**Where to get**: https://dashboard.plaid.com/developers/keys

```env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox  # sandbox, development, production
```

**Files using this**:

- `src/lib/financial/plaid-service.ts`
- `src/components/financial/PlaidLinkButton.tsx`
- `src/app/api/financial/plaid/exchange-token/route.ts`

---

### 2.2 TrueLayer (EU/UK Bank Connections)

**Purpose**: Open Banking for European banks

**Where to get**: https://console.truelayer.com/

```env
TRUELAYER_CLIENT_ID=your_client_id
TRUELAYER_CLIENT_SECRET=your_client_secret
TRUELAYER_SANDBOX=true  # true for testing
```

**Files using this**:

- `src/lib/connectors/banking/truelayer-connector.ts`
- `src/lib/connectors/payments/truelayer-payments.ts`

---

## 3. MARKET DATA PROVIDERS

### 3.1 Polygon.io (Premium Market Data)

**Purpose**: Real-time quotes, historical data, news, WebSocket streaming

**Where to get**: https://polygon.io/dashboard/api-keys

```env
POLYGON_API_KEY=your_api_key
POLYGON_WS_URL=wss://socket.polygon.io  # Optional, has default
```

**Pricing Tiers**:

- Free: 5 API calls/minute, delayed data
- Starter ($29/mo): 1000 calls/minute, real-time
- Developer ($79/mo): Unlimited calls
- Advanced ($199/mo): Full historical data

**Files using this**:

- `src/lib/integrations/polygon.ts`
- `src/lib/investments/market-data-service.ts`

---

### 3.2 Finnhub (Market Data & Fundamentals)

**Purpose**: Quotes, company profiles, earnings, analyst recommendations

**Where to get**: https://finnhub.io/dashboard

```env
FINNHUB_API_KEY=your_api_key
```

**Pricing**:

- Free: 60 API calls/minute
- Premium: Higher limits, more data

**Files using this**:

- `src/lib/connectors/market-data/finnhub-connector.ts`
- `src/lib/investments/market-data-service.ts`

---

### 3.3 Alpha Vantage (Stock Data)

**Purpose**: Historical data, technical indicators, forex, crypto

**Where to get**: https://www.alphavantage.co/support/#api-key

```env
ALPHA_VANTAGE_API_KEY=your_api_key
```

**Pricing**:

- Free: 5 calls/minute, 500/day
- Premium ($49.99/mo): 75 calls/minute

**Files using this**:

- `src/lib/integrations/alpha-vantage.ts`
- `src/lib/investments/market-data-service.ts`

---

## 4. BROKER INTEGRATIONS

### 4.1 Alpaca (Commission-Free Trading)

**Purpose**: Stock/ETF trading, paper trading, account management

**Where to get**: https://app.alpaca.markets/

```env
# Paper Trading (Testing)
ALPACA_API_KEY=your_paper_key
ALPACA_SECRET_KEY=your_paper_secret
ALPACA_PAPER=true

# Live Trading (Production)
ALPACA_API_KEY=your_live_key
ALPACA_SECRET_KEY=your_live_secret
ALPACA_PAPER=false
```

**Files using this**:

- `src/lib/trading/brokers/alpaca-broker.ts`
- `src/lib/trading/pctt/pctt-trading-service.ts`

---

## 5. CREDIT BUREAU APIs

### 5.1 Experian

**Purpose**: Credit reports, credit scores, disputes

**Where to get**: https://developer.experian.com/

```env
EXPERIAN_CLIENT_ID=your_client_id
EXPERIAN_CLIENT_SECRET=your_client_secret
EXPERIAN_SANDBOX=true  # true for testing
```

**Requirements**: Business verification, compliance agreements

**Files using this**:

- `src/lib/credit-bureau/experian-client.ts`
- `src/lib/credit-bureau/credit-bureau-service.ts`

---

### 5.2 Equifax

**Purpose**: Credit reports, credit monitoring

**Where to get**: https://developer.equifax.com/

```env
EQUIFAX_API_KEY=your_api_key
EQUIFAX_CLIENT_ID=your_client_id
EQUIFAX_ENVIRONMENT=sandbox  # sandbox or production
```

**Requirements**: Business verification, compliance agreements

**Files using this**:

- `src/lib/credit-bureau/equifax-client.ts`
- `src/lib/credit-bureau/credit-bureau-service.ts`

---

### 5.3 TransUnion

**Purpose**: Credit reports, identity verification

**Where to get**: Contact TransUnion Developer Relations

```env
TRANSUNION_SUBSCRIBER_ID=your_subscriber_id
TRANSUNION_API_KEY=your_api_key
TRANSUNION_ENVIRONMENT=test  # test or production
```

**Requirements**: Business verification, compliance agreements

**Files using this**:

- `src/lib/credit-bureau/transunion-client.ts`
- `src/lib/credit-bureau/credit-bureau-service.ts`

---

## 6. INSURANCE DATA

### 6.1 Canopy Connect

**Purpose**: Insurance policy aggregation

**Where to get**: https://usecanopy.com/developers

```env
CANOPY_CLIENT_ID=your_client_id
CANOPY_CLIENT_SECRET=your_client_secret
CANOPY_WEBHOOK_SECRET=your_webhook_secret
CANOPY_SANDBOX=true
```

**Files using this**:

- `src/lib/connectors/insurance/canopy-connector.ts`

---

## 7. MONITORING & ANALYTICS

### 7.1 Sentry (Error Tracking)

**Purpose**: Error tracking, performance monitoring

**Where to get**: https://sentry.io/

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
```

**Files using this**:

- `src/lib/monitoring/sentry.ts`

---

### 7.2 Google Analytics

**Purpose**: Usage analytics, user behavior

**Where to get**: https://analytics.google.com/

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 8. SECURITY & AUTH

### 8.1 Authentication Secrets

```env
# NextAuth / JWT
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-32-character-secret
JWT_SECRET=your-jwt-secret

# Encryption
ENCRYPTION_KEY=your-64-character-hex-key
```

---

### 8.2 Cron Jobs (Vercel)

```env
CRON_SECRET=your-cron-secret
```

---

## 9. DOCUMENT STORAGE

### 9.1 AWS S3 (Optional)

**Purpose**: Document storage (alternative to Supabase Storage)

```env
AWS_ACCESS_KEY_ID=AKIA_xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=fynvita-documents
```

**Files using this**:

- `src/lib/documents/document-service.ts`

---

## Environment Files

### Development (.env.local)

Copy from `.env.local.example` and fill in your development keys.

### Production (.env.production.local)

Copy from `.env.production.example` and fill in production keys.
**NEVER commit production keys to version control!**

---

## Service Priority for MVP Testing

### Phase 1: Core (Must Have)

1. ✅ Supabase (Database)
2. ✅ Stripe (Payments - can use test mode)
3. ✅ AIML API (AI features)
4. ✅ Resend (Email)

### Phase 2: Financial Features

5. ⚠️ Plaid (Bank connections)

### Phase 3: Trading Module

6. ⚠️ Polygon.io OR Finnhub (Market data)
7. ⚠️ Alpaca (Broker - paper trading)

### Phase 4: Credit Features

8. ⚠️ Credit Bureau APIs (Experian/Equifax/TransUnion)

### Phase 5: Optional Enhancements

9. TrueLayer (EU banking)
10. Canopy (Insurance)
11. Sentry (Monitoring)
12. Google Analytics

---

## Cost Estimates (Monthly)

| Service        | Free Tier                | Paid Tier          |
| -------------- | ------------------------ | ------------------ |
| Supabase       | Up to 500MB              | $25+/mo            |
| Stripe         | 2.9% + $0.30/transaction | Same               |
| AIML API       | Limited                  | $20-100/mo         |
| Resend         | 3,000 emails/mo          | $20+/mo            |
| Plaid          | 100 items                | Contact sales      |
| Polygon.io     | 5 calls/min              | $29-199/mo         |
| Finnhub        | 60 calls/min             | $50+/mo            |
| Alpaca         | Free                     | Free               |
| Credit Bureaus | N/A                      | Enterprise pricing |
| Sentry         | 5K errors/mo             | $26+/mo            |

**Estimated MVP Monthly Cost**: ~$100-300/mo (excluding credit bureau APIs)

---

## Testing Without All APIs

Many features can be tested with mock data:

1. **Market Data**: Uses mock data generator when API keys not present
2. **Broker**: Paper trading mode with simulated fills
3. **Credit Bureau**: Mock credit report generator available
4. **Banking**: Plaid sandbox environment with test credentials

See `src/lib/credit-bureau/mock-credit-report-generator.ts` for credit report mocking.
