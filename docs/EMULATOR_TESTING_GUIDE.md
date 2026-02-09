# Fynvita Emulator Testing Guide

## Required API Keys & External Services

Before testing in the emulator, ensure you have the following configured:

### 1. **Supabase (Required - Database & Auth)**
- **Where to get**: https://supabase.com/dashboard
- **Keys needed**:
  - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (optional for server operations)
- **Purpose**: Database, authentication, real-time subscriptions

### 2. **Stripe (Required - Payments)**
- **Where to get**: https://dashboard.stripe.com/test/apikeys
- **Keys needed**:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key (pk_test_xxx)
  - `STRIPE_SECRET_KEY` - Secret key (sk_test_xxx)
  - `STRIPE_WEBHOOK_SECRET` - Webhook secret (whsec_xxx)
  - Price IDs for subscription tiers
- **Purpose**: Payment processing, subscriptions

### 3. **AIML API (Required - AI Features)**
- **Where to get**: https://aimlapi.com/dashboard
- **Keys needed**:
  - `AIML_API_KEY` - API key
  - `AIML_API_URL` - API base URL (https://api.aimlapi.com/v1)
- **Purpose**: AI chat, analysis, recommendations

### 4. **Resend / SendGrid (Required - Email)**
- **Where to get**: 
  - Resend: https://resend.com/api-keys
  - SendGrid: https://app.sendgrid.com/settings/api_keys
- **Keys needed**:
  - `RESEND_API_KEY` or SMTP credentials
  - `EMAIL_FROM` - From address
- **Purpose**: Email notifications, alerts

### 5. **AWS S3 (Optional - Document Storage)**
- **Where to get**: AWS IAM Console
- **Keys needed**:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_S3_BUCKET`
- **Purpose**: Document storage (Supabase Storage can be used instead)

### 6. **Sentry (Optional - Error Monitoring)**
- **Where to get**: https://sentry.io
- **Keys needed**:
  - `SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
- **Purpose**: Error tracking, performance monitoring

### 7. **Google Analytics (Optional - Analytics)**
- **Where to get**: https://analytics.google.com
- **Keys needed**:
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- **Purpose**: Usage analytics

---

## Mobile App Screens to Test

### Trading Module
| Screen | File | Test Focus |
|--------|------|------------|
| **PCTT Screen** | `mobile-app/src/components/trading/PCTTScreen.tsx` | Chart rendering, signals, AI explanations |
| **Watchlist** | `mobile-app/src/components/trading/WatchlistScreen.tsx` | Symbol list, real-time prices |
| **Trading Chart** | `mobile-app/src/components/trading/TradingChartScreen.tsx` | Candlestick charts, indicators |
| **Opportunity Radar** | `mobile-app/src/components/trading/OpportunityRadarScreen.tsx` | ISE rankings, instrument selection |
| **Order Entry** | `mobile-app/src/components/trading/OrderEntrySheet.tsx` | Order form, validation, submission |

### Credit Repair Module
| Screen | File | Test Focus |
|--------|------|------------|
| **Dispute Tracker** | `mobile-app/src/components/credit-repair/DisputeTrackerScreen.tsx` | Dispute list, status updates |

### Investment Module
| Screen | File | Test Focus |
|--------|------|------------|
| **Portfolio Analytics** | `mobile-app/src/components/investments/PortfolioAnalyticsScreen.tsx` | Holdings, performance charts |

---

## Web App Pages to Test

### Trading Dashboard
| Page | Route | Test Focus |
|------|-------|------------|
| **Trading Dashboard** | `/trading` | Positions, orders, signals, risk monitor |
| **Opportunity Radar** | Integrated in dashboard | ISE rankings, filtering |

### Credit Builder
| Page | Route | Test Focus |
|------|-------|------------|
| **Credit Builder Home** | `/credit-builder` | Score overview, actions |
| **Score Simulator** | `/credit-builder/score-simulator` | Scenario modeling |
| **Dispute Management** | `/disputes` | Create/track disputes |

### Auth Flow
| Page | Route | Test Focus |
|------|-------|------------|
| **Login** | `/auth/login` | Authentication |
| **Signup** | `/auth/signup` | Registration |
| **Password Reset** | `/auth/reset-password` | Password recovery |

### Billing
| Page | Route | Test Focus |
|------|-------|------------|
| **Billing Home** | `/billing` | Current plan, payment methods |
| **Subscription** | `/billing/subscription` | Plan changes |
| **Invoices** | `/billing/invoices` | Invoice history |

### Admin
| Page | Route | Test Focus |
|------|-------|------------|
| **Admin Dashboard** | `/admin` | Overview metrics |
| **User Management** | `/admin/users` | User list, actions |
| **Analytics** | `/admin/analytics` | System metrics |

---

## User Flows to Verify

### 1. **New User Onboarding**
```
/auth/signup → Email verification → /onboarding → /onboarding/profile → 
/onboarding/goals → /onboarding/connect → /onboarding/complete → /dashboard
```

### 2. **Trading Flow**
```
/trading → View positions → Open Order Entry → Create Order → 
View in Orders tab → Cancel/Modify → Check Risk Monitor
```

### 3. **Signal Execution Flow**
```
/trading → Signals tab → View signal details → Click Trade → 
Order Entry prefilled → Submit → Position created
```

### 4. **Credit Repair Flow**
```
/credit-builder → Upload credit report → AI analysis → 
Generate disputes → Track progress → View score changes
```

### 5. **Subscription Upgrade Flow**
```
/billing → View plans → Select upgrade → Stripe checkout → 
Payment → Confirmation → New features unlocked
```

### 6. **Mobile Order Flow**
```
Open App → Trading Tab → Watchlist → Select Symbol → 
Order Entry Sheet → Fill form → Submit → Confirmation
```

---

## API Endpoints to Verify

### Trading APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trading/orders` | GET | List orders |
| `/api/trading/orders` | POST | Create order |
| `/api/trading/orders` | DELETE | Cancel order |
| `/api/trading/positions` | GET | List positions |
| `/api/trading/positions` | POST | Close/modify position |
| `/api/trading/signals` | GET | List signals |
| `/api/trading/risk` | GET | Get risk metrics |
| `/api/trading/ise` | GET | ISE status/rankings |

### Credit APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credit/report` | GET | Get credit report |
| `/api/credit/disputes` | GET/POST | Manage disputes |
| `/api/credit/score` | GET | Get score history |

### Payment APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payment/checkout` | POST | Create checkout session |
| `/api/payment/webhook` | POST | Stripe webhook |
| `/api/payment/subscription` | GET | Get subscription status |

---

## Testing Checklist

### Pre-Flight
- [ ] All environment variables set in `.env.local`
- [ ] Supabase database migrations applied
- [ ] Stripe test mode enabled
- [ ] AIML API key valid

### Mobile App (Emulator)
- [ ] App launches without crashes
- [ ] Navigation works between all screens
- [ ] Trading chart renders correctly
- [ ] Order entry form validates input
- [ ] Position list updates in real-time
- [ ] Pull-to-refresh works
- [ ] Dark mode toggles correctly
- [ ] Keyboard doesn't obscure inputs

### Web App
- [ ] All pages load without errors
- [ ] Authentication flow works
- [ ] Trading dashboard displays data
- [ ] Order entry modal works
- [ ] Risk monitor shows metrics
- [ ] Responsive on mobile viewport
- [ ] Dark mode works

### Integration
- [ ] Orders created on web appear in mobile
- [ ] Positions sync across platforms
- [ ] Notifications delivered
- [ ] Real-time updates work

---

## Known Limitations

1. **Broker Integration**: Currently using mock broker responses. Real broker integration (Alpaca, IBKR) requires additional API keys.

2. **Market Data**: Real-time market data requires a data provider subscription (Polygon, IEX, etc.).

3. **Credit Bureau APIs**: Live credit pulls require bureau agreements (Experian, Equifax, TransUnion).

4. **Push Notifications**: Requires Firebase (mobile) or web push setup.

---

## Quick Start Commands

```bash
# Install dependencies
npm install
cd mobile-app && npm install

# Start web development server
npm run dev

# Start mobile app
cd mobile-app
npx expo start

# Run TypeScript check
npx tsc --noEmit

# Run tests
npm test
```
