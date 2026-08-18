/**
 * Plaid Service
 *
 * Handles bank account connection and transaction syncing via Plaid SDK
 */

import { CountryCode, Products } from "plaid";
import { getPlaidClient } from "@/lib/financial/plaid-client";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Service-role client for plaid_items/financial_accounts.
 *
 * Both tables are service-role-only (see
 * 20260731000006_plaid_items_accounts.sql): the access token is a live bank
 * credential. The anon-keyed getSupabase() singleton carries no session, so
 * auth.uid() is NULL and it could never satisfy that RLS design anyway — it
 * returned zero rows with no error.
 *
 * This file previously hand-rolled its own lazy service-role client. That
 * duplicate is gone: the shared helper is Proxy-backed, so it is safe to call
 * at module scope, whereas the local version guarded a `let` and threw
 * "Cannot access '_supabaseServiceRole' before initialization" the moment a
 * module-scope caller was introduced above it.
 */
const supabase = getServiceRoleClient();

/**
 * The key that encrypts bank credentials at rest (20260801000020).
 *
 * Read per call rather than cached at module scope so a missing key surfaces
 * as a loud failure at the point of use, not as an import-time crash during
 * `next build`'s page-data collection. Length is checked here as well as in
 * the SQL function: a short key would look like encryption while being
 * trivially breakable.
 */
function requireTokenEncryptionKey(): string {
  const key = process.env.BANK_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "BANK_TOKEN_ENCRYPTION_KEY must be set and at least 32 characters",
    );
  }
  return key;
}

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

// ---------------------------------------------------------------------------
// Connections — the unit the user actually grants and revokes
// ---------------------------------------------------------------------------
//
// A user does not connect an ACCOUNT, they connect an INSTITUTION: one Plaid
// Item, one consent, N accounts. Revocation has the same granularity — Plaid's
// /item/remove takes an access_token and kills the whole Item. Any UI offering
// "disconnect this checking account" while leaving its sibling savings account
// connected is describing something that cannot happen.
//
// So the read model is connection-shaped, and the delete is per connection.

export type BankConnectionStatus = "active" | "needs_attention";

export interface BankConnectionAccount {
  id: string;
  accountName: string;
  accountType: string;
  accountSubtype: string;
  mask: string;
  currentBalance: number;
  currency: string;
  /** ISO 8601. The real financial_accounts.last_synced, never "just now". */
  lastSynced: string;
}

export interface BankConnection {
  id: string;
  provider: string;
  institutionId: string | null;
  institutionName: string | null;
  status: BankConnectionStatus;
  /**
   * The Plaid error that put this connection in needs_attention, written by
   * plaid-webhook-handler.handleItemError. Null when the connection is healthy
   * — never a placeholder string.
   */
  errorCode: string | null;
  errorMessage: string | null;
  /**
   * Written by plaid-webhook-handler.handlePendingExpiration. Its PRESENCE is
   * the signal: Plaid only sends PENDING_EXPIRATION when consent is running
   * out, so a non-null value means this connection needs re-authentication
   * whether the timestamp has passed yet or not.
   */
  consentExpiresAt: string | null;
  createdAt: string;
  accounts: BankConnectionAccount[];
}

export type RemoveConnectionResult =
  | { outcome: "removed" }
  | { outcome: "not_found" }
  /** Plaid refused. Nothing was changed; retrying is the right next step. */
  | { outcome: "provider_error"; message: string }
  /**
   * We hold no usable credential for this connection, so we cannot ask Plaid
   * to revoke it. Nothing was changed, and retrying will not help — this is an
   * operator problem, not a user one.
   */
  | { outcome: "credential_error"; message: string };

interface BankConnectionRow {
  id: string;
  provider: string;
  item_id: string;
  institution_id: string | null;
  institution_name: string | null;
  error_code: string | null;
  error_message: string | null;
  consent_expiration_time: string | null;
  created_at: string;
}

/**
 * Plaid's documented code for an access_token that matches no Item — the
 * response when the Item has already been removed.
 *
 * Source: https://plaid.com/docs/errors/invalid-input/ — INVALID_ACCESS_TOKEN,
 * error_type INVALID_INPUT, HTTP 400, "could not find matching access token".
 * /item/remove itself documents NO error codes and says nothing about calling
 * it twice, so this is the one code we are entitled to treat as "already
 * gone"; every other failure is treated as a live Item we failed to revoke.
 */
const PLAID_INVALID_ACCESS_TOKEN = "INVALID_ACCESS_TOKEN";

/**
 * Pull Plaid's error_code out of a thrown SDK error.
 *
 * The SDK is axios-based, so a Plaid API error arrives as an AxiosError whose
 * `response.data` is Plaid's error body. Returns null for a transport failure
 * (no response at all), which is exactly the case that must NOT be mistaken
 * for a successful revocation.
 */
function plaidErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const response = (error as { response?: unknown }).response;
  if (typeof response !== "object" || response === null) return null;
  const data = (response as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const code = (data as { error_code?: unknown }).error_code;
  return typeof code === "string" ? code : null;
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
    // bank_connections is service-role-only (RLS enabled with ZERO policies
    // for anon/authenticated — see 20260801000020): the access token is a live
    // bank credential, so this must use getServiceRoleClient(), never the
    // anon-keyed singleton.
    //
    // The token is NOT written as a column. It is inserted as a row first,
    // then encrypted in place by set_bank_connection_token() — the plaintext
    // column no longer exists (20260801000020 step 4).
    const client = getServiceRoleClient();

    const { data, error } = await client
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("bank_connections")
      .insert({
        user_id: userId,
        provider: "plaid",
        item_id: itemId,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Failed to store bank connection");
    }

    const { error: tokenError } = await client.rpc(
      "set_bank_connection_token",
      {
        p_connection_id: data.id,
        p_token: accessToken,
        p_key: requireTokenEncryptionKey(),
      },
    );

    if (tokenError) {
      // The connection row exists but holds no usable credential. Leaving it
      // would look like a linked bank that silently never syncs, so remove it
      // and surface the failure.
      // idor-audit: pk-owner-checked — data.id is the row this call just
      // inserted with user_id = userId, three statements above.
      await client.from("bank_connections").delete().eq("id", data.id);
      throw new Error(
        `Failed to encrypt bank credential: ${tokenError.message}`,
      );
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
   * Resolve the connection row for one of the caller's Plaid items.
   *
   * Scoped by user_id, which is load-bearing rather than decorative: the
   * service role bypasses RLS, so this filter is the only thing standing
   * between item_id and an IDOR (FND-037).
   */
  private async getConnectionByItemId(
    itemId: string,
    userId: string,
  ): Promise<{ id: string; institutionId: string | null } | null> {
    const { data, error } = await getServiceRoleClient()
      .from("bank_connections")
      .select("id, institution_id")
      .eq("provider", "plaid")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return { id: data.id, institutionId: data.institution_id ?? null };
  }

  /**
   * Decrypt the credential for a connection row we have already resolved.
   *
   * Takes a connection id rather than (itemId, userId) because every caller
   * has already done the ownership check to get here; re-resolving would run
   * the same query twice and invite one of the two copies to drift out of
   * user scope.
   */
  private async decryptToken(connectionId: string): Promise<string> {
    const { data: token, error } = await getServiceRoleClient().rpc(
      "get_bank_connection_token",
      { p_connection_id: connectionId, p_key: requireTokenEncryptionKey() },
    );

    if (error || !token) {
      throw new Error(
        `Failed to decrypt bank credential: ${error?.message ?? "empty"}`,
      );
    }

    return token as string;
  }

  /**
   * Get access token for item — scoped to userId to prevent IDOR (FND-037)
   */
  private async getAccessToken(itemId: string, userId: string): Promise<string> {
    // The credential is encrypted at rest and has no readable column. Resolve
    // the connection first, then decrypt through the accessor.
    const connection = await this.getConnectionByItemId(itemId, userId);

    if (!connection) {
      throw new Error("Access token not found");
    }

    return this.decryptToken(connection.id);
  }

  /**
   * Get accounts for user
   */
  async getAccounts(userId: string): Promise<PlaidAccount[]> {
    // getServiceRoleClient(): financial_accounts has no authenticated grant
    // (20260731000009 revoked it — see that migration for why), so the
    // anon-keyed getSupabase() singleton would get a 42501 permission-denied
    // error on every call, never real rows. This route-level call is already
    // user-scoped by the explicit .eq("user_id", userId) filter below (same
    // IDOR-safe pattern as getAccessToken/getTransactions in this file), so
    // using the service-role client here is safe and necessary.
    const { data, error } = await getServiceRoleClient()
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
   * Every bank connection the user holds, each with the accounts it granted.
   *
   * Two queries rather than a join: financial_accounts carries no enforced FK
   * to bank_connections (20260801000020 dropped the item_id FK and the
   * replacement connection_id was never populated until this change), so
   * PostgREST cannot embed one in the other. Grouping happens here, on
   * (provider, item_id) — the pair that identifies a connection at its
   * provider and is present on every account row regardless of backfill state.
   */
  async listConnections(userId: string): Promise<BankConnection[]> {
    const client = getServiceRoleClient();

    const { data: connectionRows, error: connectionError } = await client
      .from("bank_connections")
      .select(
        "id, provider, item_id, institution_id, institution_name, error_code, error_message, consent_expiration_time, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (connectionError) {
      throw new Error("Failed to fetch bank connections");
    }

    const connections = (connectionRows ?? []) as BankConnectionRow[];
    if (connections.length === 0) return [];

    const { data: accountRows, error: accountError } = await client
      .from("financial_accounts")
      .select(
        "id, provider, item_id, account_name, account_type, account_subtype, mask, current_balance, currency, last_synced",
      )
      .eq("user_id", userId);

    if (accountError) {
      throw new Error("Failed to fetch accounts");
    }

    const accountsByConnection = new Map<string, BankConnectionAccount[]>();
    for (const row of accountRows ?? []) {
      const key = `${row.provider}:${row.item_id}`;
      const list = accountsByConnection.get(key) ?? [];
      list.push({
        id: row.id,
        accountName: row.account_name ?? "",
        accountType: row.account_type ?? "",
        accountSubtype: row.account_subtype ?? "",
        mask: row.mask ?? "",
        currentBalance: Number(row.current_balance ?? 0),
        currency: row.currency ?? "USD",
        lastSynced: row.last_synced,
      });
      accountsByConnection.set(key, list);
    }

    return connections.map((row) => ({
      id: row.id,
      provider: row.provider,
      institutionId: row.institution_id,
      institutionName: row.institution_name,
      // A connection needs attention when Plaid has told us so, via either
      // webhook. Nothing is inferred from staleness or a missing balance:
      // "we have not heard anything" is not evidence of a problem.
      status:
        row.error_code || row.consent_expiration_time
          ? "needs_attention"
          : "active",
      errorCode: row.error_code,
      errorMessage: row.error_message,
      consentExpiresAt: row.consent_expiration_time,
      createdAt: row.created_at,
      accounts: accountsByConnection.get(`${row.provider}:${row.item_id}`) ?? [],
    }));
  }

  /**
   * Revoke a bank connection: at Plaid first, then locally.
   *
   * ORDER IS THE WHOLE DESIGN. Plaid's /item/remove is what actually ends the
   * consent and the subscription billing for the Item; deleting our row only
   * ends our knowledge of it. So the remote call goes first, and a local
   * delete happens ONLY when the consent is provably gone.
   *
   * If Plaid fails for any reason other than "that token matches no Item", the
   * local row stays and the caller gets an error. Deleting it would strand a
   * live bank consent that we would then hold no credential for and could
   * never revoke — the user would believe they had disconnected their bank
   * while the connection kept running.
   */
  async removeConnection(
    connectionId: string,
    userId: string,
  ): Promise<RemoveConnectionResult> {
    const client = getServiceRoleClient();

    const { data: connection, error } = await client
      .from("bank_connections")
      .select("id, provider, item_id")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .maybeSingle();

    // Not found and not-yours are the same answer: a connection id must not be
    // probeable for existence.
    if (error || !connection) {
      return { outcome: "not_found" };
    }

    let accessToken: string;
    try {
      accessToken = await this.decryptToken(connection.id);
    } catch (credentialError) {
      // Deliberately NOT treated as "already revoked", and deliberately NOT
      // followed by a local delete.
      //
      // A decrypt failure cannot distinguish "this one ciphertext is corrupt"
      // from "BANK_TOKEN_ENCRYPTION_KEY is currently mis-set". The second case
      // fails for EVERY connection at once, and deleting on it would wipe every
      // user's bank linkage across the platform because of one wrong
      // environment variable. Refusing is the only safe answer.
      //
      // Logged at error level because this is an operations incident: nobody
      // can sync or disconnect until it is fixed.
      console.error(
        `[PlaidService] no usable credential for connection ${connection.id} — cannot revoke at provider`,
        credentialError,
      );
      return {
        outcome: "credential_error",
        message:
          credentialError instanceof Error
            ? credentialError.message
            : "Credential unavailable",
      };
    }

    try {
      await getPlaidClient().itemRemove({ access_token: accessToken });
    } catch (removeError) {
      if (plaidErrorCode(removeError) !== PLAID_INVALID_ACCESS_TOKEN) {
        const message =
          removeError instanceof Error
            ? removeError.message
            : "Unknown provider error";
        console.error(
          `[PlaidService] itemRemove failed for connection ${connection.id}:`,
          removeError,
        );
        return { outcome: "provider_error", message };
      }
      // INVALID_ACCESS_TOKEN: the Item is already gone at Plaid. Nothing left
      // to revoke, so fall through and clean up locally. This is what makes a
      // retry after a half-completed disconnect succeed instead of wedging.
    }

    // Accounts first. If this succeeded and the connection delete then failed,
    // the user sees a connection with no accounts and can retry. The reverse
    // order would leave accounts whose connection is gone — visible forever,
    // with no row left to delete them by.
    const { error: accountsError } = await client
      // idor-audit: pk-owner-checked — user_id is filtered explicitly below.
      .from("financial_accounts")
      .delete()
      .eq("user_id", userId)
      .eq("provider", connection.provider)
      .eq("item_id", connection.item_id);

    if (accountsError) {
      throw new Error(
        `Bank consent was revoked at the provider but its accounts could not be removed: ${accountsError.message}`,
      );
    }

    const { error: connectionError } = await client
      // idor-audit: pk-owner-checked — filtered on both id and user_id.
      .from("bank_connections")
      .delete()
      .eq("id", connection.id)
      .eq("user_id", userId);

    if (connectionError) {
      throw new Error(
        `Bank consent was revoked at the provider but the connection could not be removed: ${connectionError.message}`,
      );
    }

    return { outcome: "removed" };
  }

  /**
   * Sync accounts from Plaid
   */
  async syncAccounts(itemId: string, userId: string): Promise<PlaidAccount[]> {
    try {
      const connection = await this.getConnectionByItemId(itemId, userId);

      if (!connection) {
        throw new Error("Access token not found");
      }

      const accessToken = await this.decryptToken(connection.id);
      const client = getPlaidClient();

      const response = await client.accountsGet({
        access_token: accessToken,
      });

      const institutionId = response.data.item.institution_id || "";
      const institutionName = await this.resolveInstitutionName(institutionId);

      // Persist the institution onto the connection so the connections list
      // can label a group without re-querying Plaid, and so plaid-income-
      // service's `item.institution_name` read stops returning null.
      await this.storeConnectionInstitution(
        connection.id,
        institutionId,
        institutionName,
      );

      const accounts: PlaidAccount[] = [];

      for (const account of response.data.accounts) {
        const plaidAccount: PlaidAccount = {
          id: `${itemId}_${account.account_id}`,
          itemId,
          userId,
          accountId: account.account_id,
          institutionId,
          // Was `account.name` — the ACCOUNT's name written into an
          // INSTITUTION column, so every surface reading institutionName
          // (BankAccountsList, SavingsTracker, InvestmentPortfolio,
          // AccountDetailsModal, FinancialDashboard) rendered "Plaid Checking"
          // where the bank belonged, and a per-institution grouping would put
          // each account in its own group. accountsGet does not carry the
          // institution's name at all — only its id — so it is resolved from
          // /institutions/get_by_id above, and left empty when unknown rather
          // than backfilled with whatever string is nearest.
          institutionName: institutionName ?? "",
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
        await this.storeAccount(plaidAccount, connection.id);
        accounts.push(plaidAccount);
      }

      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * The institution's display name, or null when it cannot be determined.
   *
   * /accounts/get returns `item.institution_id` but never the name, so it
   * takes a second call. A failure here must not fail the whole sync — the
   * accounts and balances are real and useful without a label — so it degrades
   * to null and the caller writes nothing rather than a guess.
   */
  private async resolveInstitutionName(
    institutionId: string,
  ): Promise<string | null> {
    if (!institutionId) return null;

    try {
      const response = await getPlaidClient().institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });
      return response.data.institution.name || null;
    } catch (error) {
      console.warn(
        `[PlaidService] Could not resolve institution ${institutionId}:`,
        error,
      );
      return null;
    }
  }

  /** Write institution identity onto the connection row. */
  private async storeConnectionInstitution(
    connectionId: string,
    institutionId: string,
    institutionName: string | null,
  ): Promise<void> {
    if (!institutionId && !institutionName) return;

    const { error } = await getServiceRoleClient()
      // idor-audit: pk-owner-checked — connectionId came from
      // getConnectionByItemId, which filtered on user_id.
      .from("bank_connections")
      .update({
        institution_id: institutionId || null,
        institution_name: institutionName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) {
      // Not fatal: the accounts themselves still sync. Losing the label is a
      // cosmetic degradation, and swallowing it silently is what would make it
      // hard to diagnose.
      console.warn(
        `[PlaidService] Could not store institution for connection ${connectionId}: ${error.message}`,
      );
    }
  }

  /**
   * Store account in database
   */
  private async storeAccount(
    account: PlaidAccount,
    connectionId: string,
  ): Promise<void> {
    // getServiceRoleClient() — see getAccounts above; financial_accounts
    // writes are service-role-only (sync-derived, never user-editable via RLS).
    const { error } = await getServiceRoleClient()
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("financial_accounts")
      .upsert({
      id: account.id,
      item_id: account.itemId,
      // 20260801000020 added connection_id with ON DELETE CASCADE, but nothing
      // ever wrote it: every row carried NULL, so the cascade was inert and
      // the old item_id foreign key had already been dropped in the same
      // migration. Deleting a connection would have left its accounts on the
      // user's screen with nothing left that could remove them.
      connection_id: connectionId,
      provider: "plaid",
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

    // Previously an empty comment (no-op): a failed upsert reported success
    // to syncAccounts()'s caller while persisting nothing. Throw, matching
    // storeAccessToken's sibling pattern in this file — syncAccounts()
    // already wraps its loop in try/catch and rethrows, so this correctly
    // aborts the sync instead of silently dropping the account.
    if (error) {
      throw new Error("Failed to store account");
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
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
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
      // Column is `is_pending` (it pairs with `is_recurring`, which the
      // spending analyzer reads). This wrote `pending`, a column that does not
      // exist on the transactions table.
      is_pending: transaction.pending,
      payment_channel: transaction.paymentChannel,
      location: transaction.location,
      created_at: transaction.createdAt.toISOString(),
    });

    if (error) {
      // Must THROW, not swallow. The webhook route returns 500 when
      // handleEvent throws, and Plaid retries on 500 — that is the entire
      // durability story for transaction sync. Dropping the error here made
      // the route answer 200, Plaid marked the event delivered, and the
      // transactions were permanently lost on any transient DB failure, with
      // balances and insights silently wrong and nothing logged anywhere.
      throw new Error(
        `Failed to store Plaid transaction ${transaction.transactionId}: ${error.message}`,
      );
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
