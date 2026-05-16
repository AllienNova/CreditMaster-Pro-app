/**
 * Plaid Webhook Handler Service
 *
 * Event dispatcher for Plaid webhook events. Handles signature verification
 * via Plaid's JWK endpoint and dispatches events to registered handlers.
 *
 * Supported webhook types:
 * - TRANSACTIONS: SYNC_UPDATES_AVAILABLE, DEFAULT_UPDATE, INITIAL_UPDATE,
 *   HISTORICAL_UPDATE, TRANSACTIONS_REMOVED
 * - ITEM: ERROR, LOGIN_REPAIRED, PENDING_EXPIRATION,
 *   USER_PERMISSION_REVOKED, WEBHOOK_UPDATE_ACKNOWLEDGED
 * - AUTH: AUTOMATICALLY_VERIFIED, VERIFICATION_EXPIRED
 * - INVESTMENTS_TRANSACTIONS: DEFAULT_UPDATE
 * - LIABILITIES: DEFAULT_UPDATE
 */

import * as jose from "jose";
import { getPlaidClient } from "@/lib/financial/plaid-client";
import { plaidService } from "@/lib/financial/plaid-service";
import { getSupabase } from "@/lib/supabase/client";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaidWebhookError {
  error_type: string;
  error_code: string;
  error_message: string;
}

export interface PlaidWebhookEvent {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: PlaidWebhookError;
  new_transactions?: number;
  removed_transactions?: string[];
  consent_expiration_time?: string;
  environment?: string;
}

export type WebhookHandler = (event: PlaidWebhookEvent) => Promise<void>;

/**
 * Function that verifies a Plaid webhook signature.
 * Extracted as a type so it can be injected for testing.
 */
export type WebhookVerifier = (
  body: string,
  headers: Record<string, string>,
) => Promise<boolean>;

// ---------------------------------------------------------------------------
// Key cache for webhook verification JWKs
// ---------------------------------------------------------------------------
interface CachedKey {
  key: jose.KeyLike;
  fetchedAt: number;
}

const KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const keyCache = new Map<string, CachedKey>();

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class PlaidWebhookService {
  private handlers: Map<string, WebhookHandler[]> = new Map();
  private verifier: WebhookVerifier;

  constructor(verifier?: WebhookVerifier) {
    this.verifier = verifier ?? this.defaultVerifier.bind(this);

    // Register built-in handlers
    this.registerHandler(
      "TRANSACTIONS",
      "SYNC_UPDATES_AVAILABLE",
      this.handleTransactionSync.bind(this),
    );
    this.registerHandler(
      "TRANSACTIONS",
      "DEFAULT_UPDATE",
      this.handleTransactionSync.bind(this),
    );
    this.registerHandler(
      "TRANSACTIONS",
      "INITIAL_UPDATE",
      this.handleTransactionSync.bind(this),
    );
    this.registerHandler(
      "TRANSACTIONS",
      "HISTORICAL_UPDATE",
      this.handleTransactionSync.bind(this),
    );
    this.registerHandler(
      "TRANSACTIONS",
      "TRANSACTIONS_REMOVED",
      this.handleTransactionsRemoved.bind(this),
    );
    this.registerHandler(
      "ITEM",
      "ERROR",
      this.handleItemError.bind(this),
    );
    this.registerHandler(
      "ITEM",
      "PENDING_EXPIRATION",
      this.handlePendingExpiration.bind(this),
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Register a handler for a specific webhook type and code.
   * Multiple handlers can be registered for the same type/code.
   */
  registerHandler(
    webhookType: string,
    webhookCode: string,
    handler: WebhookHandler,
  ): void {
    const key = `${webhookType}:${webhookCode}`;
    const existing = this.handlers.get(key) ?? [];
    existing.push(handler);
    this.handlers.set(key, existing);
  }

  /**
   * Verify the webhook signature from the Plaid-Verification header.
   * Delegates to the injected verifier (or the default one using Plaid SDK + jose).
   */
  async verifyWebhookSignature(
    body: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    return this.verifier(body, headers);
  }

  /**
   * Dispatch a webhook event to all registered handlers for its type/code.
   * If no handler is registered the event is logged and silently ignored.
   * Individual handler errors are caught so that one failing handler does
   * not prevent the remaining handlers from executing.
   */
  async handleEvent(event: PlaidWebhookEvent): Promise<void> {
    const key = `${event.webhook_type}:${event.webhook_code}`;
    const handlers = this.handlers.get(key);

    if (!handlers || handlers.length === 0) {
      console.warn(
        `[PlaidWebhook] No handler registered for ${key} (item_id=${event.item_id})`,
      );
      return;
    }

    const errors: Error[] = [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(String(err));
        console.error(
          `[PlaidWebhook] Handler error for ${key}: ${error.message}`,
        );
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `[PlaidWebhook] ${errors.length} handler(s) failed for ${key}: ${errors.map((e) => e.message).join("; ")}`,
      );
    }
  }

  /**
   * Replace the verifier function. Useful for testing.
   */
  setVerifier(verifier: WebhookVerifier): void {
    this.verifier = verifier;
  }

  /**
   * Get the number of registered handler entries (for testing).
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }

  // -------------------------------------------------------------------------
  // Default verifier — uses Plaid SDK + jose
  // -------------------------------------------------------------------------

  private async defaultVerifier(
    body: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    const token = headers["plaid-verification"] ?? headers["Plaid-Verification"];
    if (!token) {
      return false;
    }

    try {
      // Decode the JWT header to get the key ID (kid)
      const decodedHeader = jose.decodeProtectedHeader(token);
      const kid = decodedHeader.kid;

      if (!kid) {
        console.error("[PlaidWebhook] JWT header missing kid");
        return false;
      }

      // Fetch the JWK from Plaid (with caching)
      const publicKey = await this.fetchVerificationKey(kid);

      // Verify the JWT and extract the claims
      const { payload } = await jose.jwtVerify(token, publicKey, {
        algorithms: ["ES256"],
        maxTokenAge: "5 min",
      });

      // Verify the request body hash matches the claim
      const requestBodyHash = payload.request_body_sha256;
      if (typeof requestBodyHash !== "string") {
        console.error("[PlaidWebhook] JWT missing request_body_sha256 claim");
        return false;
      }

      const bodyHash = await this.sha256(body);
      return timingSafeEqual(bodyHash, requestBodyHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[PlaidWebhook] Signature verification failed: ${message}`);
      return false;
    }
  }

  /**
   * Fetch a JWK from Plaid's webhook_verification_key/get endpoint.
   * Results are cached for KEY_CACHE_TTL_MS.
   */
  private async fetchVerificationKey(kid: string): Promise<jose.KeyLike> {
    const cached = keyCache.get(kid);
    if (cached && Date.now() - cached.fetchedAt < KEY_CACHE_TTL_MS) {
      return cached.key;
    }

    const client = getPlaidClient();
    const response = await client.webhookVerificationKeyGet({ key_id: kid });
    const jwk = response.data.key;

    const imported = await jose.importJWK(
      {
        kty: jwk.kty,
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y,
        kid: jwk.kid,
        alg: jwk.alg,
      },
      "ES256",
    );

    // jose.importJWK returns KeyLike | Uint8Array; for EC keys it is always KeyLike
    if (imported instanceof Uint8Array) {
      throw new Error("Unexpected symmetric key returned for ES256 JWK");
    }

    keyCache.set(kid, { key: imported, fetchedAt: Date.now() });
    return imported;
  }

  /**
   * Compute a SHA-256 hex digest of the given input string.
   */
  private async sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // -------------------------------------------------------------------------
  // Built-in handlers
  // -------------------------------------------------------------------------

  /**
   * Handle transaction sync events (SYNC_UPDATES_AVAILABLE, DEFAULT_UPDATE,
   * INITIAL_UPDATE, HISTORICAL_UPDATE).
   * Looks up the user for the item_id and triggers a transaction sync.
   */
  private async handleTransactionSync(
    event: PlaidWebhookEvent,
  ): Promise<void> {
    console.info(
      `[PlaidWebhook] Transaction sync for item_id=${event.item_id}, ` +
        `code=${event.webhook_code}, new_transactions=${event.new_transactions ?? "N/A"}`,
    );

    const userId = await this.getUserIdForItem(event.item_id);
    if (!userId) {
      console.error(
        `[PlaidWebhook] No user found for item_id=${event.item_id}`,
      );
      return;
    }

    await plaidService.syncTransactions(event.item_id, userId, 30);
  }

  /**
   * Handle TRANSACTIONS_REMOVED event.
   * Deletes removed transactions from the database.
   */
  private async handleTransactionsRemoved(
    event: PlaidWebhookEvent,
  ): Promise<void> {
    const removedIds = event.removed_transactions;
    if (!removedIds || removedIds.length === 0) {
      console.info(
        `[PlaidWebhook] TRANSACTIONS_REMOVED with no transaction IDs for item_id=${event.item_id}`,
      );
      return;
    }

    console.info(
      `[PlaidWebhook] Removing ${removedIds.length} transactions for item_id=${event.item_id}`,
    );

    const supabase = getSupabase();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("transaction_id", removedIds);

    if (error) {
      throw new Error(
        `Failed to remove transactions: ${error.message}`,
      );
    }
  }

  /**
   * Handle ITEM ERROR events.
   * Logs the error and stores it in the plaid_items table for the user to see.
   */
  private async handleItemError(event: PlaidWebhookEvent): Promise<void> {
    const errorInfo = event.error;
    console.error(
      `[PlaidWebhook] Item error for item_id=${event.item_id}: ` +
        `type=${errorInfo?.error_type ?? "unknown"}, ` +
        `code=${errorInfo?.error_code ?? "unknown"}, ` +
        `message=${errorInfo?.error_message ?? "unknown"}`,
    );

    const supabase = getSupabase();
    const { error } = await supabase
      .from("plaid_items")
      .update({
        error_type: errorInfo?.error_type ?? null,
        error_code: errorInfo?.error_code ?? null,
        error_message: errorInfo?.error_message ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("item_id", event.item_id);

    if (error) {
      throw new Error(
        `Failed to update item error status: ${error.message}`,
      );
    }
  }

  /**
   * Handle PENDING_EXPIRATION events.
   * The user's consent is about to expire; log it and update the item record.
   */
  private async handlePendingExpiration(
    event: PlaidWebhookEvent,
  ): Promise<void> {
    console.warn(
      `[PlaidWebhook] Pending expiration for item_id=${event.item_id}, ` +
        `expires=${event.consent_expiration_time ?? "unknown"}`,
    );

    const supabase = getSupabase();
    const { error } = await supabase
      .from("plaid_items")
      .update({
        consent_expiration_time: event.consent_expiration_time ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("item_id", event.item_id);

    if (error) {
      throw new Error(
        `Failed to update consent expiration: ${error.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Look up the user_id that owns a given item_id.
   */
  private async getUserIdForItem(itemId: string): Promise<string | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("plaid_items")
      .select("user_id")
      .eq("item_id", itemId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.user_id as string;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const plaidWebhookService = new PlaidWebhookService();
export default plaidWebhookService;

// Export the class for testing with custom verifiers
export { PlaidWebhookService };
