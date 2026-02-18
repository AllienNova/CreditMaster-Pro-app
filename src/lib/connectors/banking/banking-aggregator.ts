/**
 * Banking Aggregator
 *
 * Unified interface for banking data across multiple providers.
 * Automatically routes to the appropriate provider based on region.
 *
 * Supported Providers:
 * - Plaid (US, CA, UK partial)
 * - TrueLayer (EU, UK, IE)
 */

import { getConnectorRegistry, ConnectorRegistry } from "../registry";
import {
  UnifiedAccount,
  UnifiedTransaction,
  ConnectorResult,
  REGIONS,
  REGION_GROUPS,
} from "../types";
import { TrueLayerConnector } from "./truelayer-connector";

// =============================================================================
// Types
// =============================================================================

interface LinkSession {
  provider: string;
  linkUrl?: string; // For TrueLayer OAuth
  linkToken?: string; // For Plaid Link
  state?: string;
  expiresAt?: Date;
}

interface SyncResult {
  provider: string;
  accountsUpdated: number;
  transactionsAdded: number;
  errors: string[];
  lastSyncAt: Date;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface ConnectionStatus {
  provider: string;
  connected: boolean;
  lastSync: Date | null;
  error?: string;
  requiresReauth?: boolean;
}

/**
 * Callback for persisting refreshed tokens
 * Implementations should save the updated connection to the database
 */
export type TokenPersistCallback = (
  connection: ProviderConnection,
  updatedFields: Partial<ProviderConnection>,
) => Promise<void>;

// Provider tokens stored in database
export interface ProviderConnection {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  itemId?: string; // Plaid item_id
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Banking Aggregator
// =============================================================================

export class BankingAggregator {
  private registry: ConnectorRegistry;
  private onTokenRefresh?: TokenPersistCallback;

  constructor(options?: { onTokenRefresh?: TokenPersistCallback }) {
    this.registry = getConnectorRegistry();
    this.onTokenRefresh = options?.onTokenRefresh;
  }

  /**
   * Set the callback for persisting refreshed tokens
   */
  setTokenPersistCallback(callback: TokenPersistCallback): void {
    this.onTokenRefresh = callback;
  }

  // =============================================================================
  // Provider Selection
  // =============================================================================

  /**
   * Get the best provider for a region
   */
  getProviderForRegion(region: string): string {
    // EU/UK countries - prefer TrueLayer
    const trueLayerRegions = ["GB", "IE", ...REGION_GROUPS.EU];
    if (trueLayerRegions.includes(region)) {
      const available = this.registry.getAvailableProviders("banking", region);
      if (available.includes("truelayer")) {
        return "truelayer";
      }
    }

    // US/CA - prefer Plaid
    if (["US", "CA"].includes(region)) {
      const available = this.registry.getAvailableProviders("banking", region);
      if (available.includes("plaid")) {
        return "plaid";
      }
    }

    // Fallback to any available provider
    const available = this.registry.getAvailableProviders("banking", region);
    return available[0] || "plaid";
  }

  /**
   * Get all supported regions
   */
  getSupportedRegions(): string[] {
    const regions = new Set<string>();

    const providers = this.registry.getConnectors("banking");
    for (const provider of providers) {
      for (const region of provider.getRegions()) {
        if (region === "*") {
          // Global provider
          return ["*"];
        }
        regions.add(region);
      }
    }

    return Array.from(regions);
  }

  // =============================================================================
  // Account Linking
  // =============================================================================

  /**
   * Create a link session for the user to connect their bank
   */
  async createLinkSession(
    userId: string,
    region: string,
    redirectUri?: string,
  ): Promise<LinkSession> {
    const provider = this.getProviderForRegion(region);

    if (provider === "truelayer") {
      const connector = this.registry.getConnector<TrueLayerConnector>(
        "banking",
        "truelayer",
      );
      if (!connector) {
        throw new Error("TrueLayer connector not registered");
      }

      const authLink = connector.createAuthLink(userId, redirectUri);

      return {
        provider: "truelayer",
        linkUrl: authLink.authUri,
        state: authLink.state,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
    }

    if (provider === "plaid") {
      // Plaid uses a different flow with Link tokens
      // This would call the existing Plaid service
      const result = await this.registry.executeWithFallback<{
        link_token: string;
      }>("banking", "createLinkToken", [userId], {
        preferredProvider: "plaid",
      });

      if (!result.success || !result.data) {
        throw new Error(
          result.error?.message || "Failed to create Plaid link token",
        );
      }

      return {
        provider: "plaid",
        linkToken: result.data.link_token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Handle OAuth callback from TrueLayer
   */
  async handleTrueLayerCallback(
    code: string,
    state: string,
    redirectUri?: string,
  ): Promise<ProviderConnection> {
    const connector = this.registry.getConnector<TrueLayerConnector>(
      "banking",
      "truelayer",
    );
    if (!connector) {
      throw new Error("TrueLayer connector not registered");
    }

    const tokenResponse = await connector.exchangeCode(code, redirectUri);

    return {
      provider: "truelayer",
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    };
  }

  /**
   * Handle Plaid Link success callback
   */
  async handlePlaidCallback(
    publicToken: string,
    metadata: Record<string, unknown>,
  ): Promise<ProviderConnection> {
    const result = await this.registry.executeWithFallback<{
      access_token: string;
      item_id: string;
    }>("banking", "exchangePublicToken", [publicToken], {
      preferredProvider: "plaid",
    });

    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message || "Failed to exchange Plaid public token",
      );
    }

    return {
      provider: "plaid",
      accessToken: result.data.access_token,
      itemId: result.data.item_id,
      metadata,
    };
  }

  // =============================================================================
  // Account Data
  // =============================================================================

  /**
   * Get all accounts for a user across all connected providers
   */
  async getAccounts(
    connections: ProviderConnection[],
  ): Promise<ConnectorResult<UnifiedAccount[]>> {
    const allAccounts: UnifiedAccount[] = [];
    const errors: string[] = [];

    for (const connection of connections) {
      try {
        const accounts = await this.getAccountsForProvider(connection);
        allAccounts.push(...accounts);
      } catch (error) {
        errors.push(
          `${connection.provider}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      data: allAccounts,
      provider: "aggregator",
      cached: false,
      latencyMs: 0,
      error:
        errors.length > 0
          ? {
              code: "PARTIAL_FAILURE",
              message: errors.join("; "),
              provider: "aggregator",
              retryable: true,
            }
          : undefined,
    };
  }

  /**
   * Get accounts for a specific provider connection
   */
  private async getAccountsForProvider(
    connection: ProviderConnection,
  ): Promise<UnifiedAccount[]> {
    if (connection.provider === "truelayer") {
      const connector = this.registry.getConnector<TrueLayerConnector>(
        "banking",
        "truelayer",
      );
      if (!connector) {
        throw new Error("TrueLayer connector not registered");
      }

      // Refresh token if needed
      const accessToken = await this.ensureValidToken(connection);

      return connector.getAllAccounts(accessToken);
    }

    if (connection.provider === "plaid") {
      const result = await this.registry.executeWithFallback<UnifiedAccount[]>(
        "banking",
        "getAccounts",
        [connection.accessToken],
        { preferredProvider: "plaid" },
      );

      if (!result.success || !result.data) {
        throw new Error(
          result.error?.message || "Failed to get Plaid accounts",
        );
      }

      return result.data;
    }

    throw new Error(`Unsupported provider: ${connection.provider}`);
  }

  /**
   * Get a specific account by ID
   */
  async getAccount(
    connection: ProviderConnection,
    accountId: string,
  ): Promise<UnifiedAccount | null> {
    const accounts = await this.getAccountsForProvider(connection);
    return accounts.find((a) => a.id === accountId) || null;
  }

  // =============================================================================
  // Transactions
  // =============================================================================

  /**
   * Get transactions for all accounts
   */
  async getTransactions(
    connections: ProviderConnection[],
    dateRange?: DateRange,
  ): Promise<ConnectorResult<UnifiedTransaction[]>> {
    const allTransactions: UnifiedTransaction[] = [];
    const errors: string[] = [];

    for (const connection of connections) {
      try {
        // First get accounts for this connection
        const accounts = await this.getAccountsForProvider(connection);

        for (const account of accounts) {
          const transactions = await this.getTransactionsForAccount(
            connection,
            account.id,
            dateRange,
          );
          allTransactions.push(...transactions);
        }
      } catch (error) {
        errors.push(
          `${connection.provider}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Sort by date descending
    allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      success: errors.length === 0,
      data: allTransactions,
      provider: "aggregator",
      cached: false,
      latencyMs: 0,
      error:
        errors.length > 0
          ? {
              code: "PARTIAL_FAILURE",
              message: errors.join("; "),
              provider: "aggregator",
              retryable: true,
            }
          : undefined,
    };
  }

  /**
   * Get transactions for a specific account
   */
  async getTransactionsForAccount(
    connection: ProviderConnection,
    accountId: string,
    dateRange?: DateRange,
  ): Promise<UnifiedTransaction[]> {
    const from =
      dateRange?.from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const to = dateRange?.to || new Date();

    if (connection.provider === "truelayer") {
      const connector = this.registry.getConnector<TrueLayerConnector>(
        "banking",
        "truelayer",
      );
      if (!connector) {
        throw new Error("TrueLayer connector not registered");
      }

      const accessToken = await this.ensureValidToken(connection);

      return connector.getUnifiedTransactions(accessToken, accountId, from, to);
    }

    if (connection.provider === "plaid") {
      const result = await this.registry.executeWithFallback<
        UnifiedTransaction[]
      >(
        "banking",
        "getTransactions",
        [connection.accessToken, accountId, { start_date: from, end_date: to }],
        { preferredProvider: "plaid" },
      );

      if (!result.success || !result.data) {
        throw new Error(
          result.error?.message || "Failed to get Plaid transactions",
        );
      }

      return result.data;
    }

    throw new Error(`Unsupported provider: ${connection.provider}`);
  }

  // =============================================================================
  // Sync
  // =============================================================================

  /**
   * Sync all accounts and transactions for a user
   */
  async syncAll(connections: ProviderConnection[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const connection of connections) {
      const result = await this.syncConnection(connection);
      results.push(result);
    }

    return results;
  }

  /**
   * Sync a specific connection
   */
  private async syncConnection(
    connection: ProviderConnection,
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let accountsUpdated = 0;
    let transactionsAdded = 0;

    try {
      // Get accounts
      const accounts = await this.getAccountsForProvider(connection);
      accountsUpdated = accounts.length;

      // Get transactions for each account
      for (const account of accounts) {
        try {
          const transactions = await this.getTransactionsForAccount(
            connection,
            account.id,
          );
          transactionsAdded += transactions.length;
        } catch (error) {
          errors.push(
            `Account ${account.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return {
      provider: connection.provider,
      accountsUpdated,
      transactionsAdded,
      errors,
      lastSyncAt: new Date(),
    };
  }

  // =============================================================================
  // Connection Management
  // =============================================================================

  /**
   * Get connection status
   */
  async getConnectionStatus(
    connection: ProviderConnection,
  ): Promise<ConnectionStatus> {
    try {
      // Try to fetch accounts to verify connection
      await this.getAccountsForProvider(connection);

      return {
        provider: connection.provider,
        connected: true,
        lastSync: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const requiresReauth =
        message.includes("expired") ||
        message.includes("TOKEN_EXPIRED") ||
        message.includes("unauthorized");

      return {
        provider: connection.provider,
        connected: false,
        lastSync: null,
        error: message,
        requiresReauth,
      };
    }
  }

  /**
   * Refresh a connection token
   */
  async refreshConnection(
    connection: ProviderConnection,
  ): Promise<ProviderConnection> {
    if (connection.provider === "truelayer" && connection.refreshToken) {
      const connector = this.registry.getConnector<TrueLayerConnector>(
        "banking",
        "truelayer",
      );
      if (!connector) {
        throw new Error("TrueLayer connector not registered");
      }

      const tokenResponse = await connector.refreshToken(
        connection.refreshToken,
      );

      return {
        ...connection,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      };
    }

    // Plaid tokens don't expire in the same way
    // They require re-linking if the connection is broken
    return connection;
  }

  /**
   * Ensure the access token is valid, refreshing if needed
   * Persists refreshed tokens via the onTokenRefresh callback
   */
  private async ensureValidToken(
    connection: ProviderConnection,
  ): Promise<string> {
    // Check if token is expired or will expire within 5 minutes
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const needsRefresh =
      connection.expiresAt &&
      connection.expiresAt.getTime() < Date.now() + expiryBuffer;

    if (needsRefresh) {
      if (connection.refreshToken) {
        const refreshed = await this.refreshConnection(connection);

        // Persist the refreshed tokens if callback is configured
        if (this.onTokenRefresh) {
          try {
            await this.onTokenRefresh(connection, {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              expiresAt: refreshed.expiresAt,
            });
          } catch (_error) {
            // Log but don't fail the request - tokens still work for this request
            // BankingAggregator error: Failed to persist refreshed tokens
            void _error;
          }
        }

        // Update the original connection object in-place for the current session
        connection.accessToken = refreshed.accessToken;
        connection.refreshToken = refreshed.refreshToken;
        connection.expiresAt = refreshed.expiresAt;

        return refreshed.accessToken;
      }
      throw new Error("Token expired and no refresh token available");
    }

    return connection.accessToken;
  }

  /**
   * Disconnect a provider connection
   */
  async disconnectProvider(connection: ProviderConnection): Promise<void> {
    if (connection.provider === "plaid" && connection.itemId) {
      await this.registry.executeWithFallback(
        "banking",
        "removeItem",
        [connection.accessToken],
        { preferredProvider: "plaid" },
      );
    }

    // TrueLayer doesn't require explicit disconnection,
    // tokens just expire. Could revoke via API if needed.
  }
}

// =============================================================================
// Singleton
// =============================================================================

let aggregatorInstance: BankingAggregator | null = null;

/**
 * Get or create the BankingAggregator singleton
 * @param options.onTokenRefresh - Callback to persist refreshed tokens to database
 */
export function getBankingAggregator(options?: {
  onTokenRefresh?: TokenPersistCallback;
}): BankingAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new BankingAggregator(options);
  } else if (options?.onTokenRefresh) {
    // Update callback on existing instance
    aggregatorInstance.setTokenPersistCallback(options.onTokenRefresh);
  }
  return aggregatorInstance;
}

export default BankingAggregator;
