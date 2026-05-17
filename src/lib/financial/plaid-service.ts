/**
 * Plaid Service
 *
 * Handles bank account connection and transaction syncing via Plaid SDK
 */

import { CountryCode, Products } from "plaid";
import { getPlaidClient } from "@/lib/financial/plaid-client";
import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

// Types
export interface PlaidLinkToken {
  linkToken: string;
  expiration: Date;
}

export interface PlaidAccount {
  id: string;
  itemId: string;
  userId: string;
  accountId: string;
  institutionId: string;
  institutionName: string;
  accountName: string;
  accountType: "depository" | "credit" | "loan" | "investment";
  accountSubtype: string;
  mask: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
  lastSynced: Date;
  createdAt: Date;
}

export interface PlaidTransaction {
  id: string;
  accountId: string;
  userId: string;
  transactionId: string;
  date: Date;
  amount: number;
  name: string;
  merchantName?: string;
  category: string[];
  pending: boolean;
  paymentChannel: string;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: Date;
}

interface PlaidAccountRow {
  id: string;
  item_id: string;
  user_id: string;
  account_id: string;
  institution_id: string;
  institution_name: string;
  account_name: string;
  account_type: PlaidAccount["accountType"];
  account_subtype: string;
  mask: string;
  current_balance: number;
  available_balance?: number | null;
  currency: string;
  last_synced: string;
  created_at: string;
}

interface PlaidTransactionRow {
  id: string;
  account_id: string;
  user_id: string;
  transaction_id: string;
  date: string;
  amount: number;
  name: string;
  merchant_name?: string | null;
  category?: string[] | null;
  pending: boolean;
  payment_channel: string;
  location?: Record<string, unknown> | null;
  created_at: string;
}

export interface PlaidBalance {
  accountId: string;
  current: number;
  available?: number;
  limit?: number;
  currency: string;
  lastUpdated: Date;
}

/**
 * Plaid Service Class
 */
class PlaidService {
  /**
   * Create a Link token for Plaid Link initialization
   */
  async createLinkToken(userId: string): Promise<PlaidLinkToken> {
    try {
      const client = getPlaidClient();
      const response = await client.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: "Fynvita",
        products: [Products.Transactions, Products.Auth, Products.Identity],
        country_codes: [CountryCode.Us],
        language: "en",
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/financial/plaid/webhook`,
      });

      return {
        linkToken: response.data.link_token,
        expiration: new Date(response.data.expiration),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(
    publicToken: string,
    userId: string,
  ): Promise<string> {
    try {
      const client = getPlaidClient();
      const response = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;

      // Store access token securely in database
      await this.storeAccessToken(userId, itemId, accessToken);

      return itemId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store access token securely
   */
  private async storeAccessToken(
    userId: string,
    itemId: string,
    accessToken: string,
  ): Promise<void> {
    const { error } = await supabase.from("plaid_items").insert({
      user_id: userId,
      item_id: itemId,
      access_token: accessToken,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Failed to store access token");
    }
  }

  /**
   * Public accessor for the Plaid access token scoped to the authenticated user.
   * Used by routes that need the token server-side (e.g. income route — FND-038).
   * Never expose this value to the client.
   */
  async getAccessTokenForUser(itemId: string, userId: string): Promise<string> {
    return this.getAccessToken(itemId, userId);
  }

  /**
   * Get access token for item — scoped to userId to prevent IDOR (FND-037)
   */
  private async getAccessToken(itemId: string, userId: string): Promise<string> {
    const { data, error } = await supabase
      .from("plaid_items")
      .select("access_token")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("Access token not found");
    }

    return data.access_token;
  }

  /**
   * Get accounts for user
   */
  async getAccounts(userId: string): Promise<PlaidAccount[]> {
    const { data, error } = await supabase
      .from("financial_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch accounts");
    }

    const rows = (data ?? []) as PlaidAccountRow[];
    return rows.map((row) => this.mapDatabaseToAccount(row));
  }

  /**
   * Sync accounts from Plaid
   */
  async syncAccounts(itemId: string, userId: string): Promise<PlaidAccount[]> {
    try {
      const accessToken = await this.getAccessToken(itemId, userId);
      const client = getPlaidClient();

      const response = await client.accountsGet({
        access_token: accessToken,
      });

      const accounts: PlaidAccount[] = [];

      for (const account of response.data.accounts) {
        const plaidAccount: PlaidAccount = {
          id: `${itemId}_${account.account_id}`,
          itemId,
          userId,
          accountId: account.account_id,
          institutionId: response.data.item.institution_id || "",
          institutionName: account.name,
          accountName: account.official_name || account.name,
          accountType: account.type as PlaidAccount["accountType"],
          accountSubtype: account.subtype || "",
          mask: account.mask || "",
          currentBalance: account.balances.current ?? 0,
          availableBalance: account.balances.available ?? undefined,
          currency: account.balances.iso_currency_code || "USD",
          lastSynced: new Date(),
          createdAt: new Date(),
        };

        // Store in database
        await this.storeAccount(plaidAccount);
        accounts.push(plaidAccount);
      }

      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store account in database
   */
  private async storeAccount(account: PlaidAccount): Promise<void> {
    const { error } = await supabase.from("financial_accounts").upsert({
      id: account.id,
      item_id: account.itemId,
      user_id: account.userId,
      account_id: account.accountId,
      institution_id: account.institutionId,
      institution_name: account.institutionName,
      account_name: account.accountName,
      account_type: account.accountType,
      account_subtype: account.accountSubtype,
      mask: account.mask,
      current_balance: account.currentBalance,
      available_balance: account.availableBalance,
      currency: account.currency,
      last_synced: account.lastSynced.toISOString(),
      created_at: account.createdAt.toISOString(),
    });

    if (error) {
      // PlaidService error: Error storing account
    }
  }

  /**
   * Get transactions for account — scoped to userId to prevent IDOR (FND-036)
   */
  async getTransactions(
    accountId: string,
    startDate: Date,
    endDate: Date,
    userId: string,
  ): Promise<PlaidTransaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch transactions");
    }

    const rows = (data ?? []) as PlaidTransactionRow[];
    return rows.map((row) => this.mapDatabaseToTransaction(row));
  }

  /**
   * Fetch transactions for multiple accounts in a single DB round-trip (FND-040).
   * Replaces the per-account serial loop pattern in financial-service.ts.
   * Preserves the user_id scoping established by FIN-2 (FND-036).
   */
  async getTransactionsForAccounts(
    accountIds: string[],
    startDate: Date,
    endDate: Date,
    userId: string,
  ): Promise<PlaidTransaction[]> {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .in("account_id", accountIds)
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch transactions");
    }

    const rows = (data ?? []) as PlaidTransactionRow[];
    return rows.map((row) => this.mapDatabaseToTransaction(row));
  }

  /**
   * Sync transactions from Plaid
   */
  async syncTransactions(
    itemId: string,
    userId: string,
    days: number = 30,
  ): Promise<PlaidTransaction[]> {
    try {
      const accessToken = await this.getAccessToken(itemId, userId);
      const client = getPlaidClient();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const response = await client.transactionsGet({
        access_token: accessToken,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      });

      const transactions: PlaidTransaction[] = [];

      for (const txn of response.data.transactions) {
        const transaction: PlaidTransaction = {
          id: `${itemId}_${txn.transaction_id}`,
          accountId: txn.account_id,
          userId,
          transactionId: txn.transaction_id,
          date: new Date(txn.date),
          amount: txn.amount,
          name: txn.name,
          merchantName: txn.merchant_name ?? undefined,
          category: txn.category || [],
          pending: txn.pending,
          paymentChannel: txn.payment_channel,
          location: txn.location
            ? {
                address: txn.location.address ?? undefined,
                city: txn.location.city ?? undefined,
                region: txn.location.region ?? undefined,
                postalCode: txn.location.postal_code ?? undefined,
                country: txn.location.country ?? undefined,
              }
            : undefined,
          createdAt: new Date(),
        };

        // Store in database
        await this.storeTransaction(transaction);
        transactions.push(transaction);
      }

      return transactions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store transaction in database
   */
  private async storeTransaction(transaction: PlaidTransaction): Promise<void> {
    const { error } = await supabase.from("transactions").upsert({
      id: transaction.id,
      account_id: transaction.accountId,
      user_id: transaction.userId,
      transaction_id: transaction.transactionId,
      date: transaction.date.toISOString(),
      amount: transaction.amount,
      name: transaction.name,
      merchant_name: transaction.merchantName,
      category: transaction.category,
      pending: transaction.pending,
      payment_channel: transaction.paymentChannel,
      location: transaction.location,
      created_at: transaction.createdAt.toISOString(),
    });

    if (error) {
      // PlaidService error: Error storing transaction
    }
  }

  /**
   * Map database record to PlaidAccount
   */
  private mapDatabaseToAccount(data: PlaidAccountRow): PlaidAccount {
    return {
      id: data.id,
      itemId: data.item_id,
      userId: data.user_id,
      accountId: data.account_id,
      institutionId: data.institution_id,
      institutionName: data.institution_name,
      accountName: data.account_name,
      accountType: data.account_type,
      accountSubtype: data.account_subtype,
      mask: data.mask,
      currentBalance: data.current_balance,
      availableBalance: data.available_balance ?? undefined,
      currency: data.currency,
      lastSynced: new Date(data.last_synced),
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Map database record to PlaidTransaction
   */
  private mapDatabaseToTransaction(
    data: PlaidTransactionRow,
  ): PlaidTransaction {
    return {
      id: data.id,
      accountId: data.account_id,
      userId: data.user_id,
      transactionId: data.transaction_id,
      date: new Date(data.date),
      amount: data.amount,
      name: data.name,
      merchantName: data.merchant_name ?? undefined,
      category: data.category ?? [],
      pending: data.pending,
      paymentChannel: data.payment_channel,
      location: data.location ?? undefined,
      createdAt: new Date(data.created_at),
    };
  }
}

// Export singleton instance
export const plaidService = new PlaidService();
export default plaidService;
