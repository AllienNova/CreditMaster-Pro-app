/**
 * Connector Types & Interfaces
 *
 * Unified type system for all external service connectors.
 * Supports multi-provider fallback, health monitoring, and regional routing.
 */

// =============================================================================
// Core Connector Configuration
// =============================================================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
}

export interface CacheConfig {
  enabled: boolean;
  defaultTTLSeconds: number;
  maxEntries?: number;
}

export interface ConnectorConfig {
  name: string;
  provider: string;
  version: string;
  priority: number; // Lower = higher priority
  regions: string[]; // ISO country codes: 'US', 'GB', 'DE', etc.
  capabilities: string[];
  rateLimits: RateLimitConfig;
  retry: RetryConfig;
  cache: CacheConfig;
  healthCheckInterval: number; // milliseconds
  timeout: number; // milliseconds
  enabled: boolean;
}

// =============================================================================
// Health & Status
// =============================================================================

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ConnectorHealth {
  provider: string;
  status: HealthStatus;
  latencyMs: number;
  lastCheck: Date;
  lastSuccess: Date | null;
  consecutiveFailures: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  success: boolean;
  latencyMs: number;
  error?: Error;
  details?: Record<string, unknown>;
}

// =============================================================================
// Connector Results & Errors
// =============================================================================

export interface ConnectorError {
  code: string;
  message: string;
  provider: string;
  retryable: boolean;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface ConnectorResult<T> {
  success: boolean;
  data?: T;
  provider: string;
  cached: boolean;
  latencyMs: number;
  requestId?: string;
  error?: ConnectorError;
}

export interface BatchResult<T> {
  results: ConnectorResult<T>[];
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
}

// =============================================================================
// Execution Options
// =============================================================================

export interface ExecutionOptions {
  preferredProvider?: string;
  region?: string;
  timeout?: number;
  skipCache?: boolean;
  maxRetries?: number;
  fallbackEnabled?: boolean;
}

export interface BatchExecutionOptions extends ExecutionOptions {
  concurrency?: number;
  stopOnFirstError?: boolean;
}

// =============================================================================
// Base Connector Interface
// =============================================================================

export abstract class BaseConnector<
  TConfig extends ConnectorConfig = ConnectorConfig,
> {
  abstract readonly name: string;
  abstract readonly type: ConnectorType;

  protected config: TConfig;
  protected initialized: boolean = false;

  constructor(config: TConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<HealthCheckResult>;
  abstract disconnect(): Promise<void>;

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): TConfig {
    return this.config;
  }

  getPriority(): number {
    return this.config.priority;
  }

  getRegions(): string[] {
    return this.config.regions;
  }

  supportsRegion(region: string): boolean {
    return (
      this.config.regions.includes(region) || this.config.regions.includes("*")
    );
  }

  hasCapability(capability: string): boolean {
    return this.config.capabilities.includes(capability);
  }
}

// =============================================================================
// Connector Types
// =============================================================================

export type ConnectorType =
  | "banking"
  | "market_data"
  | "insurance"
  | "credit"
  | "identity"
  | "payments"
  | "affiliate";

export type BankingCapability =
  | "accounts"
  | "transactions"
  | "balances"
  | "liabilities"
  | "investments"
  | "identity"
  | "income"
  | "assets"
  | "recurring";

export type MarketDataCapability =
  | "quotes"
  | "historical"
  | "fundamentals"
  | "news"
  | "sentiment"
  | "insider"
  | "earnings"
  | "filings"
  | "crypto"
  | "forex"
  | "options";

export type InsuranceCapability =
  | "policy_import"
  | "coverage_analysis"
  | "quotes"
  | "claims";

export type PaymentCapability =
  | "card_payments"
  | "bank_payments"
  | "ach"
  | "sepa"
  | "instant"
  | "recurring"
  | "refunds"
  | "payouts";

// =============================================================================
// Region Definitions
// =============================================================================

export const REGIONS = {
  // North America
  US: "US",
  CA: "CA",
  MX: "MX",

  // Europe
  GB: "GB",
  DE: "DE",
  FR: "FR",
  ES: "ES",
  IT: "IT",
  NL: "NL",
  BE: "BE",
  AT: "AT",
  CH: "CH",
  IE: "IE",
  PT: "PT",
  PL: "PL",
  SE: "SE",
  NO: "NO",
  DK: "DK",
  FI: "FI",

  // Asia-Pacific
  AU: "AU",
  NZ: "NZ",
  JP: "JP",
  SG: "SG",
  HK: "HK",
  IN: "IN",

  // Wildcards
  ALL: "*",
  EU: "EU", // European Union
  EEA: "EEA", // European Economic Area
  APAC: "APAC",
  NA: "NA", // North America
} as const;

export type Region = (typeof REGIONS)[keyof typeof REGIONS];

// Region groups for easy provider assignment
export const REGION_GROUPS: Record<string, string[]> = {
  EU: [
    "DE",
    "FR",
    "ES",
    "IT",
    "NL",
    "BE",
    "AT",
    "IE",
    "PT",
    "PL",
    "SE",
    "DK",
    "FI",
  ],
  EEA: [
    "DE",
    "FR",
    "ES",
    "IT",
    "NL",
    "BE",
    "AT",
    "IE",
    "PT",
    "PL",
    "SE",
    "NO",
    "DK",
    "FI",
    "IS",
    "LI",
  ],
  APAC: ["AU", "NZ", "JP", "SG", "HK", "IN"],
  NA: ["US", "CA", "MX"],
};

// =============================================================================
// Provider Configurations
// =============================================================================

export interface PlaidConfig extends ConnectorConfig {
  clientId: string;
  secret: string;
  environment: "sandbox" | "development" | "production";
  products: string[];
  countryCodes: string[];
  webhookUrl?: string;
}

export interface TrueLayerConfig extends ConnectorConfig {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "live";
  redirectUri: string;
  scopes: string[];
}

export interface PolygonConfig extends ConnectorConfig {
  apiKey: string;
  tier: "free" | "starter" | "developer" | "advanced";
  websocketEnabled: boolean;
}

export interface FinnhubConfig extends ConnectorConfig {
  apiKey: string;
  tier: "free" | "premium";
}

export interface CanopyConfig extends ConnectorConfig {
  apiKey: string;
  partnerId: string;
  webhookSecret: string;
}

export interface StripeConfig extends ConnectorConfig {
  secretKey: string;
  webhookSecret: string;
  connectClientId?: string;
}

// =============================================================================
// Unified Data Types (Provider-agnostic)
// =============================================================================

export interface UnifiedAccount {
  id: string;
  provider: string;
  providerAccountId: string;
  institutionId: string;
  institutionName: string;
  name: string;
  officialName?: string;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  subtype?: string;
  mask?: string;
  currency: string;
  balance: {
    available?: number;
    current: number;
    limit?: number;
  };
  lastSynced: Date;
}

export interface UnifiedTransaction {
  id: string;
  provider: string;
  providerTransactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  date: Date;
  name: string;
  merchantName?: string;
  category: string[];
  pending: boolean;
  type: "debit" | "credit";
  paymentChannel?: string;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
}

export interface UnifiedQuote {
  symbol: string;
  provider: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  marketStatus: "open" | "closed" | "pre" | "post";
}

export interface UnifiedInsurancePolicy {
  id: string;
  provider: string;
  providerPolicyId: string;
  carrier: string;
  policyNumber: string;
  type: "auto" | "home" | "renters" | "life" | "umbrella" | "health" | "other";
  status: "active" | "expired" | "cancelled";
  premium: {
    amount: number;
    frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  };
  coverage: {
    amount: number;
    deductible: number;
  };
  startDate: Date;
  endDate: Date;
  insured: string[];
  lastSynced: Date;
}

// =============================================================================
// Event Types
// =============================================================================

export interface ConnectorEvent {
  type: ConnectorEventType;
  connector: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type ConnectorEventType =
  | "initialized"
  | "disconnected"
  | "health_check"
  | "health_degraded"
  | "health_recovered"
  | "rate_limited"
  | "error"
  | "fallback_triggered"
  | "circuit_open";

export type ConnectorEventHandler = (
  event: ConnectorEvent,
) => void | Promise<void>;
