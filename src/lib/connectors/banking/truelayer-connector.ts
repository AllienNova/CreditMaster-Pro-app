/**
 * TrueLayer Banking Connector
 *
 * Provides EU/UK bank connectivity via TrueLayer's Open Banking API.
 * Supports:
 * - Account aggregation (current, savings, credit cards)
 * - Transaction history
 * - Balance retrieval
 * - Direct bank payments (future)
 *
 * @see https://docs.truelayer.com/
 */

import { randomBytes } from 'crypto';
import {
  BaseConnector,
  TrueLayerConfig,
  HealthCheckResult,
  UnifiedAccount,
  UnifiedTransaction,
  ConnectorError,
  REGIONS,
} from '../types';

// =============================================================================
// TrueLayer Types
// =============================================================================

interface TrueLayerAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface TrueLayerAccount {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  account_number: {
    iban?: string;
    swift_bic?: string;
    number?: string;
    sort_code?: string;
  };
  provider: {
    display_name: string;
    provider_id: string;
    logo_uri: string;
  };
  update_timestamp: string;
}

interface TrueLayerBalance {
  currency: string;
  available: number;
  current: number;
  overdraft?: number;
  update_timestamp: string;
}

interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  transaction_classification: string[];
  merchant_name?: string;
  running_balance?: {
    currency: string;
    amount: number;
  };
  meta?: {
    provider_transaction_category?: string;
    provider_reference?: string;
  };
}

interface TrueLayerCard {
  account_id: string;
  card_type: string;
  display_name: string;
  currency: string;
  partial_card_number: string;
  name_on_card: string;
  valid_from?: string;
  valid_to?: string;
  update_timestamp: string;
  provider: {
    display_name: string;
    provider_id: string;
    logo_uri: string;
  };
}

interface TrueLayerCardBalance {
  available: number;
  current: number;
  credit_limit: number;
  last_statement_balance?: number;
  last_statement_date?: string;
  payment_due?: number;
  payment_due_date?: string;
  update_timestamp: string;
}

interface TrueLayerIdentity {
  full_name: string;
  emails: string[];
  phones: string[];
  addresses: Array<{
    address: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
  }>;
  date_of_birth?: string;
  update_timestamp: string;
}

interface AuthLinkSession {
  authUri: string;
  state: string;
  nonce: string;
}

// =============================================================================
// TrueLayer Connector
// =============================================================================

export class TrueLayerConnector extends BaseConnector<TrueLayerConfig> {
  readonly name = 'truelayer';
  readonly type = 'banking' as const;

  private baseUrl: string;
  private authUrl: string;

  constructor(config: TrueLayerConfig) {
    super(config);

    // Set URLs based on environment
    if (config.environment === 'sandbox') {
      this.baseUrl = 'https://api.truelayer-sandbox.com';
      this.authUrl = 'https://auth.truelayer-sandbox.com';
    } else {
      this.baseUrl = 'https://api.truelayer.com';
      this.authUrl = 'https://auth.truelayer.com';
    }
  }

  // =============================================================================
  // Lifecycle
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Validate configuration
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('TrueLayer client credentials are required');
    }

    // Test connectivity
    const health = await this.healthCheck();
    if (!health.success) {
      throw new Error(`TrueLayer health check failed: ${health.error?.message}`);
    }

    this.initialized = true;
    // TrueLayerConnector: Connector initialized
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // TrueLayer doesn't have a dedicated health endpoint,
      // so we check the auth server's well-known configuration
      const response = await fetch(
        `${this.authUrl}/.well-known/openid-configuration`,
        { method: 'GET' }
      );

      if (!response.ok) {
        return {
          success: false,
          latencyMs: Date.now() - startTime,
          error: new Error(`TrueLayer auth server returned ${response.status}`),
        };
      }

      return {
        success: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async disconnect(): Promise<void> {
    this.initialized = false;
    // TrueLayerConnector: Connector disconnected
  }

  // =============================================================================
  // OAuth2 Flow
  // =============================================================================

  /**
   * Create an auth link for user to connect their bank
   */
  createAuthLink(userId: string, redirectUri?: string): AuthLinkSession {
    const state = this.generateState(userId);
    const nonce = this.generateNonce();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri || this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      nonce,
      providers: 'uk-ob-all uk-oauth-all', // All UK banks
    });

    return {
      authUri: `${this.authUrl}/?${params.toString()}`,
      state,
      nonce,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(
    code: string,
    redirectUri?: string
  ): Promise<TrueLayerAuthResponse> {
    const response = await fetch(`${this.authUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri || this.config.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw this.createError('TOKEN_EXCHANGE_FAILED', error.error_description || 'Failed to exchange code');
    }

    return response.json();
  }

  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<TrueLayerAuthResponse> {
    const response = await fetch(`${this.authUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw this.createError('TOKEN_REFRESH_FAILED', error.error_description || 'Failed to refresh token');
    }

    return response.json();
  }

  // =============================================================================
  // Accounts
  // =============================================================================

  /**
   * Get all accounts for a user
   */
  async getAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
    const response = await this.apiRequest('/data/v1/accounts', accessToken);
    return response.results || [];
  }

  /**
   * Get a specific account
   */
  async getAccount(accessToken: string, accountId: string): Promise<TrueLayerAccount> {
    const response = await this.apiRequest(`/data/v1/accounts/${accountId}`, accessToken);
    return response.results[0];
  }

  /**
   * Get account balance
   */
  async getBalance(accessToken: string, accountId: string): Promise<TrueLayerBalance> {
    const response = await this.apiRequest(
      `/data/v1/accounts/${accountId}/balance`,
      accessToken
    );
    return response.results[0];
  }

  /**
   * Get all accounts with balances (unified format)
   */
  async getAccountsWithBalances(accessToken: string): Promise<UnifiedAccount[]> {
    const accounts = await this.getAccounts(accessToken);
    const unifiedAccounts: UnifiedAccount[] = [];

    for (const account of accounts) {
      try {
        const balance = await this.getBalance(accessToken, account.account_id);

        unifiedAccounts.push({
          id: account.account_id,
          provider: 'truelayer',
          providerAccountId: account.account_id,
          institutionId: account.provider.provider_id,
          institutionName: account.provider.display_name,
          name: account.display_name,
          type: this.mapAccountType(account.account_type),
          subtype: account.account_type,
          mask: account.account_number.number?.slice(-4),
          currency: account.currency,
          balance: {
            available: balance.available,
            current: balance.current,
            limit: balance.overdraft,
          },
          lastSynced: new Date(account.update_timestamp),
        });
      } catch (_error) {
        // TrueLayerConnector error: Failed to get balance for account
        void _error;
      }
    }

    return unifiedAccounts;
  }

  // =============================================================================
  // Transactions
  // =============================================================================

  /**
   * Get transactions for an account
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    from?: Date,
    to?: Date
  ): Promise<TrueLayerTransaction[]> {
    const params = new URLSearchParams();

    if (from) {
      params.set('from', from.toISOString());
    }
    if (to) {
      params.set('to', to.toISOString());
    }

    const url = `/data/v1/accounts/${accountId}/transactions${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await this.apiRequest(url, accessToken);
    return response.results || [];
  }

  /**
   * Get pending transactions for an account
   */
  async getPendingTransactions(
    accessToken: string,
    accountId: string
  ): Promise<TrueLayerTransaction[]> {
    const response = await this.apiRequest(
      `/data/v1/accounts/${accountId}/transactions/pending`,
      accessToken
    );
    return response.results || [];
  }

  /**
   * Get transactions in unified format
   */
  async getUnifiedTransactions(
    accessToken: string,
    accountId: string,
    from?: Date,
    to?: Date
  ): Promise<UnifiedTransaction[]> {
    const [settled, pending] = await Promise.all([
      this.getTransactions(accessToken, accountId, from, to),
      this.getPendingTransactions(accessToken, accountId),
    ]);

    const unified: UnifiedTransaction[] = [];

    for (const tx of [...settled, ...pending]) {
      unified.push({
        id: tx.transaction_id,
        provider: 'truelayer',
        providerTransactionId: tx.transaction_id,
        accountId,
        amount: Math.abs(tx.amount),
        currency: tx.currency,
        date: new Date(tx.timestamp),
        name: tx.description,
        merchantName: tx.merchant_name,
        category: tx.transaction_classification || [tx.transaction_category],
        pending: pending.some((p) => p.transaction_id === tx.transaction_id),
        type: tx.amount < 0 ? 'debit' : 'credit',
      });
    }

    return unified.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // =============================================================================
  // Cards (Credit Cards)
  // =============================================================================

  /**
   * Get all cards
   */
  async getCards(accessToken: string): Promise<TrueLayerCard[]> {
    const response = await this.apiRequest('/data/v1/cards', accessToken);
    return response.results || [];
  }

  /**
   * Get card balance
   */
  async getCardBalance(accessToken: string, accountId: string): Promise<TrueLayerCardBalance> {
    const response = await this.apiRequest(
      `/data/v1/cards/${accountId}/balance`,
      accessToken
    );
    return response.results[0];
  }

  /**
   * Get card transactions
   */
  async getCardTransactions(
    accessToken: string,
    accountId: string,
    from?: Date,
    to?: Date
  ): Promise<TrueLayerTransaction[]> {
    const params = new URLSearchParams();

    if (from) {
      params.set('from', from.toISOString());
    }
    if (to) {
      params.set('to', to.toISOString());
    }

    const url = `/data/v1/cards/${accountId}/transactions${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await this.apiRequest(url, accessToken);
    return response.results || [];
  }

  /**
   * Get all cards with balances (unified format)
   */
  async getCardsWithBalances(accessToken: string): Promise<UnifiedAccount[]> {
    const cards = await this.getCards(accessToken);
    const unifiedAccounts: UnifiedAccount[] = [];

    for (const card of cards) {
      try {
        const balance = await this.getCardBalance(accessToken, card.account_id);

        unifiedAccounts.push({
          id: card.account_id,
          provider: 'truelayer',
          providerAccountId: card.account_id,
          institutionId: card.provider.provider_id,
          institutionName: card.provider.display_name,
          name: card.display_name,
          type: 'credit',
          subtype: card.card_type,
          mask: card.partial_card_number,
          currency: card.currency,
          balance: {
            available: balance.available,
            current: balance.current,
            limit: balance.credit_limit,
          },
          lastSynced: new Date(card.update_timestamp),
        });
      } catch (_error) {
        // TrueLayerConnector error: Failed to get balance for card
        void _error;
      }
    }

    return unifiedAccounts;
  }

  // =============================================================================
  // Identity
  // =============================================================================

  /**
   * Get account holder identity
   */
  async getIdentity(accessToken: string): Promise<TrueLayerIdentity> {
    const response = await this.apiRequest('/data/v1/info', accessToken);
    return response.results[0];
  }

  // =============================================================================
  // All Data (Convenience Method)
  // =============================================================================

  /**
   * Get all accounts (bank + cards) in unified format
   */
  async getAllAccounts(accessToken: string): Promise<UnifiedAccount[]> {
    const [accounts, cards] = await Promise.all([
      this.getAccountsWithBalances(accessToken),
      this.getCardsWithBalances(accessToken),
    ]);

    return [...accounts, ...cards];
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  /**
   * Make an API request to TrueLayer
   */
  private async apiRequest(
    path: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: 'Unknown error' };
      }

      // Handle specific TrueLayer errors
      if (response.status === 401) {
        throw this.createError('TOKEN_EXPIRED', 'Access token has expired', true);
      }

      if (response.status === 403) {
        throw this.createError('CONSENT_REQUIRED', 'User consent required', false);
      }

      if (response.status === 429) {
        throw this.createError('RATE_LIMITED', 'Rate limit exceeded', true);
      }

      throw this.createError(
        'API_ERROR',
        errorBody.error_description || errorBody.error || 'API request failed',
        response.status >= 500
      );
    }

    return response.json();
  }

  /**
   * Map TrueLayer account type to unified type
   */
  private mapAccountType(type: string): UnifiedAccount['type'] {
    const mapping: Record<string, UnifiedAccount['type']> = {
      TRANSACTION: 'depository',
      SAVINGS: 'depository',
      BUSINESS_TRANSACTION: 'depository',
      BUSINESS_SAVINGS: 'depository',
      ISA: 'investment',
      CREDIT_CARD: 'credit',
      LOAN: 'loan',
      MORTGAGE: 'loan',
    };

    return mapping[type.toUpperCase()] || 'other';
  }

  /**
   * Generate state parameter for OAuth
   * Uses cryptographically secure random bytes for CSRF protection
   */
  private generateState(userId: string): string {
    const random = randomBytes(16).toString('hex');
    return Buffer.from(JSON.stringify({ userId, random, ts: Date.now() })).toString('base64url');
  }

  /**
   * Generate nonce for OAuth
   * Uses cryptographically secure random bytes to prevent replay attacks
   */
  private generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Create a standardized connector error
   */
  private createError(code: string, message: string, retryable = false): ConnectorError {
    return {
      code,
      message,
      provider: 'truelayer',
      retryable,
    };
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a TrueLayer connector with default configuration
 */
export function createTrueLayerConnector(
  clientId: string,
  clientSecret: string,
  options: {
    environment?: 'sandbox' | 'live';
    redirectUri?: string;
    scopes?: string[];
  } = {}
): TrueLayerConnector {
  const config: TrueLayerConfig = {
    name: 'truelayer',
    provider: 'truelayer',
    version: '1.0.0',
    priority: 10, // High priority for EU/UK
    regions: [
      REGIONS.GB,
      REGIONS.IE,
      ...Object.keys(REGIONS).filter((r) =>
        ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'PL', 'SE', 'NO', 'DK', 'FI'].includes(r)
      ),
    ],
    capabilities: ['accounts', 'transactions', 'balances', 'identity'],
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
    retry: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialBase: 2,
    },
    cache: {
      enabled: true,
      defaultTTLSeconds: 300, // 5 minutes
    },
    healthCheckInterval: 60000, // 1 minute
    timeout: 30000, // 30 seconds
    enabled: true,
    clientId,
    clientSecret,
    environment: options.environment || 'sandbox',
    redirectUri: options.redirectUri || '',
    scopes: options.scopes || [
      'info',
      'accounts',
      'balance',
      'cards',
      'transactions',
      'direct_debits',
      'standing_orders',
      'offline_access',
    ],
  };

  return new TrueLayerConnector(config);
}

export default TrueLayerConnector;
