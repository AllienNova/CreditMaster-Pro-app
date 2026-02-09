# Global Connector Strategy Implementation Plan

## Executive Summary

This plan implements a **global connector strategy** for Fynvita with three rails:
1. **Data Rail (Read)**: Account aggregation, investments, insurance, credit insights
2. **Commercial Rail (Monetization)**: Affiliate/lead-gen, offer routing, disclosures, tracking
3. **Payments Rail (Future)**: Bank payments, card payments, payouts

**Current State Analysis** (from codebase exploration):
- **Plaid**: Fully implemented with 11 core methods
- **Market Data**: Polygon.io + Alpha Vantage + CoinGecko with fallback architecture
- **AI Stock Analyst**: 2,336 lines with technical/fundamental/sentiment analysis
- **Stripe**: Complete subscription + webhook handling
- **Missing**: EU/UK aggregators, affiliate system, insurance connectors, Finnhub

---

## Architecture Design

### Directory Structure (New)

```
src/lib/
├── connectors/                    # NEW: Unified connector layer
│   ├── registry.ts                # Connector registry + fallback orchestration
│   ├── types.ts                   # Shared connector interfaces
│   ├── health-monitor.ts          # Cross-provider health checking
│   │
│   ├── banking/                   # Banking aggregation connectors
│   │   ├── plaid-connector.ts     # Existing Plaid (refactored)
│   │   ├── truelayer-connector.ts # NEW: EU/UK
│   │   └── banking-aggregator.ts  # Unified interface + fallback
│   │
│   ├── market-data/               # Investment data connectors
│   │   ├── polygon-connector.ts   # Existing (refactored)
│   │   ├── finnhub-connector.ts   # NEW: Fundamentals + sentiment
│   │   ├── coingecko-connector.ts # Existing
│   │   └── market-aggregator.ts   # Unified interface + fallback
│   │
│   └── insurance/                 # NEW: Insurance connectors
│       ├── canopy-connector.ts    # Policy import/verification
│       └── insurance-aggregator.ts
│
├── enrichment/                    # NEW: Data enrichment layer
│   ├── transaction-categorizer.ts # Enhanced categorization
│   ├── liability-detector.ts      # Infer loans from transactions
│   ├── recurring-detector.ts      # Detect recurring patterns
│   └── identity-resolver.ts       # Cross-account identity
│
├── recommendations/               # NEW: Recommendation engine
│   ├── offer-engine.ts            # Offer matching + decisioning
│   ├── eligibility-rules.ts       # Soft eligibility checks
│   ├── credit-card-matcher.ts     # Credit card recommendations
│   ├── loan-matcher.ts            # Loan recommendations
│   └── insurance-matcher.ts       # Insurance recommendations
│
├── commerce/                      # NEW: Commercial/monetization layer
│   ├── affiliate/
│   │   ├── affiliate-service.ts   # Partner management
│   │   ├── tracking-service.ts    # Click/conversion tracking
│   │   ├── attribution.ts         # Attribution logic
│   │   └── commission-calculator.ts
│   │
│   ├── offers/
│   │   ├── offer-service.ts       # Offer CRUD + display
│   │   ├── disclosure-service.ts  # Compliance disclosures
│   │   └── consent-manager.ts     # User consent tracking
│   │
│   └── payments/                  # Future: Payment rails
│       ├── stripe-payments.ts     # Card + ACH (existing)
│       ├── truelayer-payments.ts  # EU/UK pay-by-bank
│       └── payment-router.ts      # Route to correct rail
```

### Database Schema (New Tables)

```sql
-- Affiliate & Partner Management
CREATE TABLE affiliate_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'credit_card', 'loan', 'insurance', 'broker'
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  commission_rate DECIMAL(5,4), -- e.g., 0.0250 = 2.5%
  commission_type TEXT, -- 'percentage', 'fixed', 'cpa', 'cpl'
  fixed_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  regions TEXT[], -- ['US', 'UK', 'EU']
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  code TEXT UNIQUE NOT NULL,
  partner_id UUID REFERENCES affiliate_partners(id),
  campaign_id TEXT,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id TEXT UNIQUE NOT NULL, -- External tracking ID
  user_id UUID REFERENCES auth.users(id),
  partner_id UUID REFERENCES affiliate_partners(id),
  offer_id UUID REFERENCES offers(id),
  referral_code TEXT,
  source_page TEXT, -- Where user clicked from
  user_agent TEXT,
  ip_hash TEXT, -- Hashed for privacy
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id TEXT REFERENCES affiliate_clicks(click_id),
  user_id UUID REFERENCES auth.users(id),
  partner_id UUID REFERENCES affiliate_partners(id),
  conversion_type TEXT NOT NULL, -- 'signup', 'application', 'approval', 'funded'
  conversion_value DECIMAL(10,2),
  commission_earned DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'paid', 'rejected'
  partner_reference TEXT, -- Partner's transaction ID
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Offers & Recommendations
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES affiliate_partners(id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'credit_card', 'personal_loan', 'insurance', etc.
  category TEXT, -- 'secured', 'balance_transfer', 'rewards', etc.
  apr_min DECIMAL(5,2),
  apr_max DECIMAL(5,2),
  credit_score_min INTEGER,
  credit_score_max INTEGER,
  annual_fee DECIMAL(10,2),
  signup_bonus TEXT,
  eligibility_rules JSONB, -- Complex eligibility logic
  display_priority INTEGER DEFAULT 100,
  regions TEXT[],
  is_active BOOLEAN DEFAULT true,
  landing_url TEXT,
  image_url TEXT,
  terms_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_offer_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  offer_id UUID REFERENCES offers(id),
  view_context TEXT, -- 'dashboard', 'recommendations', 'search'
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent & Compliance
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  consent_type TEXT NOT NULL, -- 'data_sharing', 'affiliate_offers', 'credit_check'
  partner_id UUID REFERENCES affiliate_partners(id),
  granted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  consent_text TEXT, -- The exact text they agreed to
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Insurance Policies (Canopy integration)
CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  policy_type TEXT NOT NULL, -- 'auto', 'home', 'renters', 'life', 'umbrella'
  policy_number TEXT,
  premium_amount DECIMAL(10,2),
  premium_frequency TEXT, -- 'monthly', 'quarterly', 'annual'
  coverage_amount DECIMAL(12,2),
  deductible DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  raw_data JSONB, -- Full Canopy response
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected Accounts (Multi-provider)
CREATE TABLE connected_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL, -- 'plaid', 'truelayer', 'canopy'
  provider_user_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- 'active', 'needs_reauth', 'disconnected'
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for performance
CREATE INDEX idx_affiliate_clicks_user ON affiliate_clicks(user_id);
CREATE INDEX idx_affiliate_clicks_partner ON affiliate_clicks(partner_id);
CREATE INDEX idx_affiliate_conversions_status ON affiliate_conversions(status);
CREATE INDEX idx_offers_type_active ON offers(type, is_active);
CREATE INDEX idx_offers_regions ON offers USING GIN(regions);
CREATE INDEX idx_insurance_policies_user ON insurance_policies(user_id);
CREATE INDEX idx_connected_providers_user ON connected_providers(user_id);
```

---

## Phase 1: MVP Advisory/Analytics (Weeks 1-4)

### 1.1 Connector Registry & Architecture (Week 1)

**Goal**: Create unified connector abstraction layer

**Files to Create**:

```typescript
// src/lib/connectors/types.ts
export interface ConnectorConfig {
  name: string;
  provider: string;
  priority: number;
  regions: string[];
  capabilities: string[];
  rateLimits: RateLimitConfig;
  healthCheckInterval: number;
}

export interface ConnectorHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastCheck: Date;
  errorMessage?: string;
}

export interface ConnectorResult<T> {
  success: boolean;
  data?: T;
  provider: string;
  cached: boolean;
  latency: number;
  error?: ConnectorError;
}

export abstract class BaseConnector<T extends ConnectorConfig> {
  abstract name: string;
  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<ConnectorHealth>;
  abstract disconnect(): Promise<void>;
}
```

```typescript
// src/lib/connectors/registry.ts
export class ConnectorRegistry {
  private connectors: Map<string, BaseConnector<any>> = new Map();
  private healthStatus: Map<string, ConnectorHealth> = new Map();

  register(type: string, connector: BaseConnector<any>): void;

  async executeWithFallback<T>(
    type: string,
    method: string,
    args: any[],
    options?: ExecutionOptions
  ): Promise<ConnectorResult<T>>;

  async healthCheckAll(): Promise<Map<string, ConnectorHealth>>;

  getAvailableProviders(type: string, region: string): string[];
}
```

**Tasks**:
- [ ] Create `src/lib/connectors/types.ts` with base interfaces
- [ ] Create `src/lib/connectors/registry.ts` with fallback orchestration
- [ ] Create `src/lib/connectors/health-monitor.ts` for background health checks
- [ ] Refactor existing Plaid service to use connector pattern
- [ ] Refactor existing Polygon service to use connector pattern
- [ ] Add unit tests for registry and fallback logic

---

### 1.2 TrueLayer Integration - EU/UK Banking (Week 2)

**Goal**: Add EU/UK bank connectivity alongside Plaid

**API Endpoints Needed**:
- `/auth` - OAuth2 flow initiation
- `/data/v1/accounts` - Account listing
- `/data/v1/accounts/{id}/balance` - Balance retrieval
- `/data/v1/accounts/{id}/transactions` - Transaction history
- `/data/v1/cards` - Credit card accounts
- `/data/v1/info` - Account holder info

**Files to Create**:

```typescript
// src/lib/connectors/banking/truelayer-connector.ts
export class TrueLayerConnector extends BaseConnector<TrueLayerConfig> {
  name = 'truelayer';

  async createAuthLink(userId: string, redirectUri: string): Promise<AuthLink>;
  async exchangeCode(code: string): Promise<AccessToken>;
  async refreshToken(refreshToken: string): Promise<AccessToken>;
  async getAccounts(accessToken: string): Promise<Account[]>;
  async getBalance(accessToken: string, accountId: string): Promise<Balance>;
  async getTransactions(
    accessToken: string,
    accountId: string,
    from: Date,
    to: Date
  ): Promise<Transaction[]>;
  async getCards(accessToken: string): Promise<CreditCard[]>;
}
```

```typescript
// src/lib/connectors/banking/banking-aggregator.ts
export class BankingAggregator {
  private plaid: PlaidConnector;
  private trueLayer: TrueLayerConnector;

  async getProviderForRegion(region: string): string;

  async linkAccount(
    userId: string,
    provider?: string
  ): Promise<LinkSession>;

  async getAccounts(userId: string): Promise<UnifiedAccount[]>;

  async getTransactions(
    userId: string,
    accountId: string,
    dateRange: DateRange
  ): Promise<UnifiedTransaction[]>;

  async syncAllAccounts(userId: string): Promise<SyncResult>;
}
```

**Environment Variables**:
```env
TRUELAYER_CLIENT_ID=
TRUELAYER_CLIENT_SECRET=
TRUELAYER_REDIRECT_URI=
TRUELAYER_ENVIRONMENT=sandbox # or 'live'
```

**Tasks**:
- [ ] Create TrueLayer connector with OAuth2 flow
- [ ] Implement account/transaction fetching
- [ ] Create unified banking aggregator
- [ ] Add region detection logic (US -> Plaid, EU/UK -> TrueLayer)
- [ ] Create API routes for TrueLayer OAuth callback
- [ ] Add database tables for multi-provider connections
- [ ] Write integration tests with TrueLayer sandbox

---

### 1.3 Finnhub Integration - Enhanced Market Data (Week 2)

**Goal**: Add Finnhub as fallback + unique data source

**Unique Finnhub Data**:
- Insider transactions
- Recommendation trends
- Earnings surprises
- SEC filings
- Economic calendar
- Pattern recognition

**Files to Create**:

```typescript
// src/lib/connectors/market-data/finnhub-connector.ts
export class FinnhubConnector extends BaseConnector<FinnhubConfig> {
  name = 'finnhub';

  // Core market data
  async getQuote(symbol: string): Promise<Quote>;
  async getCandles(symbol: string, resolution: string, from: number, to: number): Promise<Candle[]>;

  // Unique to Finnhub
  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]>;
  async getRecommendationTrends(symbol: string): Promise<RecommendationTrend[]>;
  async getEarningsSurprises(symbol: string): Promise<EarningsSurprise[]>;
  async getSECFilings(symbol: string): Promise<SECFiling[]>;
  async getEconomicCalendar(): Promise<EconomicEvent[]>;
  async getPatternRecognition(symbol: string, resolution: string): Promise<Pattern[]>;

  // News & Sentiment
  async getCompanyNews(symbol: string, from: Date, to: Date): Promise<NewsArticle[]>;
  async getMarketNews(category: string): Promise<NewsArticle[]>;
  async getSentiment(symbol: string): Promise<SentimentData>;
}
```

**Integration with AI Stock Analyst**:

```typescript
// Update src/lib/investments/ai-stock-analyst.ts
export class AIStockAnalyst {
  // Add new analysis dimensions
  async getInsiderActivity(symbol: string): Promise<InsiderAnalysis> {
    const transactions = await this.finnhub.getInsiderTransactions(symbol);
    // Analyze buying vs selling patterns
    // Calculate net insider sentiment
    // Identify key insider moves
  }

  async getAnalystConsensus(symbol: string): Promise<AnalystConsensus> {
    const trends = await this.finnhub.getRecommendationTrends(symbol);
    // Track rating changes over time
    // Identify upgrades/downgrades
    // Calculate consensus shift momentum
  }

  async getEarningsAnalysis(symbol: string): Promise<EarningsAnalysis> {
    const surprises = await this.finnhub.getEarningsSurprises(symbol);
    // Analyze beat/miss history
    // Calculate surprise magnitude trends
    // Predict next earnings direction
  }
}
```

**Tasks**:
- [ ] Create Finnhub connector with all endpoints
- [ ] Add to market-data-service.ts fallback chain
- [ ] Integrate insider/earnings data into AI analyst
- [ ] Add caching layer (1-hour for fundamentals)
- [ ] Create rate limiter (60 calls/min free tier)
- [ ] Write unit tests for Finnhub-specific data

---

### 1.4 Affiliate Foundation (Week 3-4)

**Goal**: Build affiliate tracking + disclosure system

**Components**:

```typescript
// src/lib/commerce/affiliate/affiliate-service.ts
export class AffiliateService {
  // Partner management
  async createPartner(data: CreatePartnerInput): Promise<Partner>;
  async updatePartner(id: string, data: UpdatePartnerInput): Promise<Partner>;
  async getPartner(id: string): Promise<Partner>;
  async listPartners(filters: PartnerFilters): Promise<Partner[]>;

  // Referral codes
  async generateReferralCode(userId: string, partnerId?: string): Promise<ReferralCode>;
  async validateReferralCode(code: string): Promise<ReferralValidation>;
  async applyReferralCode(userId: string, code: string): Promise<void>;

  // Attribution
  async getUserReferrer(userId: string): Promise<ReferralAttribution | null>;
}
```

```typescript
// src/lib/commerce/affiliate/tracking-service.ts
export class TrackingService {
  // Click tracking
  async trackClick(data: ClickData): Promise<string>; // Returns click_id
  async getClick(clickId: string): Promise<Click>;

  // Conversion tracking
  async trackConversion(data: ConversionData): Promise<Conversion>;
  async confirmConversion(conversionId: string, partnerRef: string): Promise<void>;
  async rejectConversion(conversionId: string, reason: string): Promise<void>;

  // Reporting
  async getClickStats(partnerId: string, dateRange: DateRange): Promise<ClickStats>;
  async getConversionStats(partnerId: string, dateRange: DateRange): Promise<ConversionStats>;
  async calculateCommissions(partnerId: string, period: DateRange): Promise<CommissionReport>;
}
```

```typescript
// src/lib/commerce/offers/offer-service.ts
export class OfferService {
  // Offer management
  async createOffer(data: CreateOfferInput): Promise<Offer>;
  async updateOffer(id: string, data: UpdateOfferInput): Promise<Offer>;
  async getOffer(id: string): Promise<Offer>;

  // Offer discovery
  async getOffersForUser(userId: string, type?: string): Promise<RankedOffer[]>;
  async getOffersByType(type: string, region: string): Promise<Offer[]>;
  async searchOffers(query: OfferSearchQuery): Promise<Offer[]>;

  // Tracking
  async recordView(userId: string, offerId: string, context: string): Promise<void>;
  async recordClick(userId: string, offerId: string): Promise<string>; // Returns tracking URL
}
```

```typescript
// src/lib/commerce/offers/disclosure-service.ts
export class DisclosureService {
  // Disclosure text generation
  getAffiliateDisclosure(context: 'inline' | 'footer' | 'modal'): string;
  getFinancialAdviceDisclaimer(): string;
  getEligibilityDisclaimer(): string;

  // Compliance checking
  validateOfferDisplay(offer: Offer, displayContext: DisplayContext): ComplianceResult;

  // Audit logging
  async logDisclosureView(userId: string, disclosureType: string): Promise<void>;
}
```

**API Routes**:

```typescript
// src/app/api/affiliate/click/route.ts
// POST: Track click and redirect to partner

// src/app/api/affiliate/conversion/route.ts
// POST: Webhook for partner conversion notifications

// src/app/api/offers/route.ts
// GET: Get personalized offers for user

// src/app/api/offers/[id]/route.ts
// GET: Get specific offer details

// src/app/api/referral/route.ts
// GET: Get user's referral code
// POST: Generate new referral code
```

**Tasks**:
- [ ] Create database migrations for affiliate tables
- [ ] Implement AffiliateService with partner CRUD
- [ ] Implement TrackingService with click/conversion tracking
- [ ] Implement OfferService with recommendation logic
- [ ] Implement DisclosureService for compliance
- [ ] Create API routes for offers and tracking
- [ ] Add Stripe webhook integration for conversion tracking
- [ ] Build admin UI for partner management
- [ ] Write comprehensive tests

---

## Phase 2: Monetization Expansion (Weeks 5-8)

### 2.1 Canopy Connect - Insurance Import (Week 5-6)

**Goal**: Import insurance policies for gap analysis + affiliate matching

**Files to Create**:

```typescript
// src/lib/connectors/insurance/canopy-connector.ts
export class CanopyConnector extends BaseConnector<CanopyConfig> {
  name = 'canopy';

  // OAuth flow
  async createPullSession(userId: string): Promise<PullSession>;
  async getPullStatus(sessionId: string): Promise<PullStatus>;

  // Policy data
  async getPolicies(accessToken: string): Promise<Policy[]>;
  async getPolicy(accessToken: string, policyId: string): Promise<PolicyDetails>;
  async getCoverageAnalysis(accessToken: string): Promise<CoverageAnalysis>;
}
```

```typescript
// src/lib/recommendations/insurance-matcher.ts
export class InsuranceMatcher {
  async analyzeGaps(userId: string): Promise<CoverageGap[]>;
  async estimateSavings(userId: string): Promise<SavingsEstimate>;
  async getRecommendations(userId: string): Promise<InsuranceRecommendation[]>;
  async matchToPartners(gaps: CoverageGap[]): Promise<PartnerMatch[]>;
}
```

**Tasks**:
- [ ] Create Canopy connector with OAuth flow
- [ ] Implement policy import and normalization
- [ ] Build coverage gap analyzer
- [ ] Create insurance recommendation engine
- [ ] Add insurance offers to affiliate system
- [ ] Build insurance dashboard UI component
- [ ] Write tests for insurance flows

---

### 2.2 Enhanced Recommendation Engine (Week 6-7)

**Goal**: Smart offer matching based on user financial profile

```typescript
// src/lib/recommendations/offer-engine.ts
export class OfferEngine {
  async getPersonalizedOffers(userId: string): Promise<PersonalizedOffer[]> {
    // 1. Build user profile
    const profile = await this.buildUserProfile(userId);

    // 2. Get all active offers
    const offers = await this.offerService.getActiveOffers();

    // 3. Filter by eligibility
    const eligible = await this.filterByEligibility(offers, profile);

    // 4. Score and rank
    const ranked = this.scoreOffers(eligible, profile);

    // 5. Add disclosure requirements
    return this.addDisclosures(ranked);
  }

  private async buildUserProfile(userId: string): Promise<UserProfile> {
    return {
      creditScore: await this.getCreditIndicators(userId),
      income: await this.estimateIncome(userId),
      debt: await this.calculateDebtMetrics(userId),
      insurance: await this.getInsuranceProfile(userId),
      goals: await this.getUserGoals(userId),
      region: await this.getUserRegion(userId),
    };
  }

  private scoreOffers(offers: Offer[], profile: UserProfile): ScoredOffer[] {
    return offers.map(offer => ({
      offer,
      score: this.calculateScore(offer, profile),
      matchReasons: this.getMatchReasons(offer, profile),
      savingsEstimate: this.estimateSavings(offer, profile),
    })).sort((a, b) => b.score - a.score);
  }
}
```

```typescript
// src/lib/recommendations/eligibility-rules.ts
export class EligibilityRules {
  // Rule definitions
  private rules: Map<string, EligibilityRule> = new Map([
    ['credit_score_min', this.checkCreditScoreMin],
    ['income_min', this.checkIncomeMin],
    ['debt_to_income_max', this.checkDTI],
    ['region', this.checkRegion],
    ['existing_customer', this.checkExistingCustomer],
  ]);

  async evaluate(
    offer: Offer,
    profile: UserProfile
  ): Promise<EligibilityResult> {
    const results: RuleResult[] = [];

    for (const [rule, check] of this.rules) {
      if (offer.eligibility_rules?.[rule]) {
        results.push(await check(offer.eligibility_rules[rule], profile));
      }
    }

    return {
      eligible: results.every(r => r.passed),
      results,
      missingData: results.filter(r => r.status === 'unknown').map(r => r.dataNeeded),
    };
  }
}
```

**Tasks**:
- [ ] Create OfferEngine with scoring algorithm
- [ ] Implement EligibilityRules with soft checks
- [ ] Build user profile aggregation from all data sources
- [ ] Add savings estimation logic
- [ ] Create match reason generation
- [ ] Integrate with existing dashboard
- [ ] A/B testing infrastructure for offer ranking

---

### 2.3 Credit Card Matcher (Week 7-8)

**Goal**: Smart credit card recommendations based on spending patterns

```typescript
// src/lib/recommendations/credit-card-matcher.ts
export class CreditCardMatcher {
  async getRecommendations(userId: string): Promise<CardRecommendation[]> {
    // Analyze spending patterns
    const spending = await this.analyzeSpending(userId);

    // Determine best card types
    const cardTypes = this.determineCardTypes(spending);

    // Match to available offers
    const matches = await this.matchToOffers(cardTypes, spending);

    // Calculate potential rewards
    return this.calculateRewards(matches, spending);
  }

  private async analyzeSpending(userId: string): Promise<SpendingAnalysis> {
    const transactions = await this.getTransactions(userId, 90); // 90 days

    return {
      totalSpend: sum(transactions.map(t => t.amount)),
      categoryBreakdown: this.categorize(transactions),
      topMerchants: this.getTopMerchants(transactions),
      travelSpend: this.calculateTravelSpend(transactions),
      diningSpend: this.calculateDiningSpend(transactions),
      grocerySpend: this.calculateGrocerySpend(transactions),
      gasSpend: this.calculateGasSpend(transactions),
    };
  }

  private calculateRewards(
    matches: CardMatch[],
    spending: SpendingAnalysis
  ): CardRecommendation[] {
    return matches.map(match => {
      const annualRewards = this.simulateAnnualRewards(match.card, spending);
      const netValue = annualRewards - (match.card.annual_fee || 0);

      return {
        card: match.card,
        estimatedAnnualRewards: annualRewards,
        netAnnualValue: netValue,
        breakEvenMonths: this.calculateBreakEven(match.card, spending),
        bestFor: match.reasons,
        comparison: this.compareToCurrentCards(match.card, spending),
      };
    });
  }
}
```

**Tasks**:
- [ ] Build spending analyzer from transaction data
- [ ] Create card type matching logic
- [ ] Implement rewards calculator
- [ ] Add comparison to existing cards
- [ ] Create card recommendation UI component
- [ ] Add "Apply" flow with disclosure
- [ ] Track application conversions

---

## Phase 3: Payment Rails (Weeks 9-12)

### 3.1 TrueLayer Payments - EU/UK (Week 9-10)

**Goal**: Enable pay-by-bank for EU/UK users

```typescript
// src/lib/commerce/payments/truelayer-payments.ts
export class TrueLayerPayments {
  // Payment initiation
  async createPayment(data: PaymentRequest): Promise<PaymentSession>;
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  async cancelPayment(paymentId: string): Promise<void>;

  // Mandate management (for recurring)
  async createMandate(userId: string, bankId: string): Promise<Mandate>;
  async executeMandatedPayment(mandateId: string, amount: number): Promise<Payment>;
  async cancelMandate(mandateId: string): Promise<void>;

  // Webhooks
  async handleWebhook(event: TrueLayerWebhookEvent): Promise<void>;
}
```

**Tasks**:
- [ ] Implement TrueLayer payment initiation
- [ ] Add payment status tracking
- [ ] Create mandate management for recurring
- [ ] Build webhook handler
- [ ] Add to payment router

---

### 3.2 Payment Router (Week 10-11)

**Goal**: Unified payment interface routing to correct rail

```typescript
// src/lib/commerce/payments/payment-router.ts
export class PaymentRouter {
  private stripePayments: StripePayments;
  private trueLayerPayments: TrueLayerPayments;

  async initiatePayment(request: PaymentRequest): Promise<PaymentSession> {
    const rail = this.selectRail(request);

    switch (rail) {
      case 'stripe_card':
        return this.stripePayments.createCardPayment(request);
      case 'stripe_ach':
        return this.stripePayments.createACHPayment(request);
      case 'truelayer':
        return this.trueLayerPayments.createPayment(request);
      default:
        throw new Error(`Unsupported payment rail: ${rail}`);
    }
  }

  private selectRail(request: PaymentRequest): PaymentRail {
    // US: Stripe (card or ACH)
    // EU/UK: TrueLayer (pay-by-bank) or Stripe (card)

    if (request.preferredMethod === 'bank' && request.region === 'EU') {
      return 'truelayer';
    }

    if (request.preferredMethod === 'bank' && request.region === 'US') {
      return 'stripe_ach';
    }

    return 'stripe_card';
  }
}
```

**Tasks**:
- [ ] Create PaymentRouter with rail selection
- [ ] Implement unified PaymentSession interface
- [ ] Add region-based routing logic
- [ ] Create payment status aggregation
- [ ] Build unified webhook handler
- [ ] Add payment method management UI

---

### 3.3 Payout System (Week 11-12)

**Goal**: Pay affiliate commissions

```typescript
// src/lib/commerce/payments/payout-service.ts
export class PayoutService {
  async calculatePayouts(period: DateRange): Promise<PayoutBatch> {
    const conversions = await this.getConfirmedConversions(period);
    const commissions = this.aggregateByPartner(conversions);

    return {
      period,
      partners: commissions,
      totalAmount: sum(commissions.map(c => c.amount)),
    };
  }

  async executePayout(partnerId: string, amount: number): Promise<Payout> {
    const partner = await this.affiliateService.getPartner(partnerId);

    // Use Stripe Connect for payouts
    const transfer = await this.stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: partner.stripeAccountId,
    });

    return this.recordPayout(partnerId, transfer);
  }

  async getPayoutHistory(partnerId: string): Promise<Payout[]>;
}
```

**Tasks**:
- [ ] Implement commission aggregation
- [ ] Add Stripe Connect for partner payouts
- [ ] Create payout approval workflow
- [ ] Build payout reporting
- [ ] Add partner payout dashboard

---

## Environment Variables Summary

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
POLYGON_API_KEY=
ALPHA_VANTAGE_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# New - Phase 1
TRUELAYER_CLIENT_ID=
TRUELAYER_CLIENT_SECRET=
TRUELAYER_REDIRECT_URI=
TRUELAYER_ENV=sandbox
FINNHUB_API_KEY=

# New - Phase 2
CANOPY_API_KEY=
CANOPY_PARTNER_ID=
CANOPY_WEBHOOK_SECRET=

# New - Phase 3
STRIPE_CONNECT_CLIENT_ID=
TRUELAYER_PAYMENTS_CLIENT_ID=
TRUELAYER_PAYMENTS_CLIENT_SECRET=
```

---

## Success Metrics

### Phase 1 (MVP)
- [ ] 95%+ uptime across all connectors
- [ ] <2s average API response time
- [ ] EU/UK bank coverage via TrueLayer
- [ ] Affiliate tracking operational

### Phase 2 (Monetization)
- [ ] 10+ affiliate partners integrated
- [ ] Insurance gap analysis live
- [ ] Credit card recommendations live
- [ ] Conversion tracking accurate to 99%+

### Phase 3 (Payments)
- [ ] Pay-by-bank available in EU/UK
- [ ] ACH payments available in US
- [ ] Automated affiliate payouts
- [ ] <1% payment failure rate

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Provider downtime | Multi-provider fallback architecture |
| Rate limiting | Request queuing + caching |
| Data inconsistency | Unified data normalization layer |
| Compliance gaps | Disclosure service + consent management |
| Partner integration delays | Start with major partners, expand gradually |
| Payment failures | Retry logic + alternative rails |

---

## Open Questions for User

1. **Primary target launch regions:** US + EU/UK? Any APAC priority?
2. **Top monetization lane first:** credit cards vs insurance vs loans?
3. **Preferred integration style:** single-vendor-first (simpler) vs multi-vendor coverage (more complex but truly global)?

---

## Next Steps

Once you provide answers to the 3 questions above, I can:
1. Prioritize specific integrations
2. Begin Phase 1 implementation
3. Create detailed API specifications
4. Set up development environment with sandbox credentials
