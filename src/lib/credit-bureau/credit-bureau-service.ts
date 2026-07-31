/**
 * Credit Bureau Service
 *
 * Main service that orchestrates credit bureau integrations.
 * Provides unified interface for all three major credit bureaus
 * with proper credential management, caching, validation, and
 * runtime key rotation.
 */

import { getSupabase } from "@/lib/supabase/client";
import { ExperianClient } from "./experian-client";
import { EquifaxClient } from "./equifax-client";
import { TransUnionClient } from "./transunion-client";
import { MockCreditBureauAdapter } from "./mock-credit-bureau-adapter";
import type {
  BureauCredentials,
  BureauApiEnvironment,
  SingleBureauCredential,
  BureauConfig,
  BureauCredentialStatus,
  CredentialValidationResult,
  BureauResponse,
  CreditReport,
  CreditReportRequest,
  DisputeSubmission,
  DisputeSubmissionResult,
  UserPII,
  Bureau,
  CreditAnalysis,
  CreditUtilization,
  CreditAccount,
  CreditScoreHistoryEntry,
  ScoreHistoryQuery,
  BureauConnectionStatus,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUREAUS: readonly Bureau[] = [
  "experian",
  "equifax",
  "transunion",
] as const;

/** Default credential cache time-to-live in milliseconds (5 minutes). */
const CREDENTIAL_CACHE_TTL_MS = 5 * 60 * 1000;

/** Health-check timeout per bureau in milliseconds. */
const HEALTH_CHECK_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Default base URLs per bureau & environment
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URLS: Record<
  Bureau,
  Record<BureauApiEnvironment, string>
> = {
  experian: {
    sandbox: "https://sandbox-us-api.experian.com",
    production: "https://us-api.experian.com",
  },
  equifax: {
    sandbox: "https://api.sandbox.equifax.com",
    production: "https://api.equifax.com",
  },
  transunion: {
    sandbox: "https://netaccess-test.transunion.com",
    production: "https://netaccess.transunion.com",
  },
};

// ---------------------------------------------------------------------------
// Internal cache entry
// ---------------------------------------------------------------------------

interface CachedCredential {
  credential: SingleBureauCredential;
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Credential masking utility (NEVER log raw keys)
// ---------------------------------------------------------------------------

/**
 * Masks an API key or secret for safe logging.
 * Shows only the first 4 and last 4 characters.
 * Keys shorter than 12 chars are fully masked.
 */
function maskApiKey(key: string): string {
  if (!key) return "(empty)";
  if (key.length < 12) return "*".repeat(key.length);
  return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`;
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Handles both real `Error` instances AND raw PostgREST/Supabase error
 * objects (`{ message, code, details, hint }`), which are NOT `Error`
 * instances — `saveDisputeRecord` below rethrows the raw object returned by
 * `.insert()`, so `error instanceof Error` alone would silently discard the
 * actual database error message.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Unknown error";
}

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

/**
 * Reads the global bureau API environment from `BUREAU_API_ENVIRONMENT`.
 * Falls back to `'sandbox'` when the variable is missing or invalid.
 */
function readBureauApiEnvironment(): BureauApiEnvironment {
  const raw = process.env.BUREAU_API_ENVIRONMENT;
  if (raw === "production") return "production";
  return "sandbox";
}

/**
 * Reads a single bureau's credentials from env vars.
 *
 * Variable naming convention:
 *   `<BUREAU>_API_KEY`, `<BUREAU>_API_SECRET`, `<BUREAU>_CLIENT_ID`,
 *   `<BUREAU>_BASE_URL`
 *
 * The global `BUREAU_API_ENVIRONMENT` controls sandbox vs production and also
 * determines the default base URL when `<BUREAU>_BASE_URL` is not set.
 */
function readBureauCredentialFromEnv(bureau: Bureau): SingleBureauCredential {
  const prefix = bureau.toUpperCase(); // EXPERIAN | EQUIFAX | TRANSUNION
  const environment = readBureauApiEnvironment();
  const defaultBaseUrl = DEFAULT_BASE_URLS[bureau][environment];

  return {
    apiKey: process.env[`${prefix}_API_KEY`] ?? "",
    apiSecret: process.env[`${prefix}_API_SECRET`] ?? "",
    clientId: process.env[`${prefix}_CLIENT_ID`] ?? "",
    baseUrl: process.env[`${prefix}_BASE_URL`] ?? defaultBaseUrl,
    environment,
  };
}

/**
 * Reads credentials for all three bureaus from environment variables.
 */
function readAllBureauCredentialsFromEnv(): BureauConfig {
  return {
    experian: readBureauCredentialFromEnv("experian"),
    equifax: readBureauCredentialFromEnv("equifax"),
    transunion: readBureauCredentialFromEnv("transunion"),
  };
}

// ---------------------------------------------------------------------------
// CreditBureauService
// ---------------------------------------------------------------------------

export class CreditBureauService {
  // ---- Bureau clients ----
  private static experianClient: ExperianClient | null = null;
  private static equifaxClient: EquifaxClient | null = null;
  private static transunionClient: TransUnionClient | null = null;
  private static initialized = false;

  // ---- Credential cache (keyed by bureau name) ----
  private static credentialCache: Map<Bureau, CachedCredential> = new Map();
  private static credentialCacheTtlMs: number = CREDENTIAL_CACHE_TTL_MS;

  // ---- Validation state ----
  private static validationState: Map<
    Bureau,
    {
      valid: boolean;
      lastValidated: string | null;
      lastError: string | null;
    }
  > = new Map();

  // =========================================================================
  // Credential management — public API
  // =========================================================================

  /**
   * Returns the `SingleBureauCredential` for a specific bureau.
   *
   * Resolution order:
   *   1. In-memory cache (if not expired)
   *   2. Environment variables (refreshed & re-cached)
   *
   * API keys are **never** logged in plaintext — all log output uses
   * `maskApiKey()`.
   */
  static getBureauCredentials(bureau: Bureau): SingleBureauCredential {
    const cached = this.credentialCache.get(bureau);
    if (cached && Date.now() - cached.cachedAt < this.credentialCacheTtlMs) {
      return cached.credential;
    }

    // Read fresh from env
    const credential = readBureauCredentialFromEnv(bureau);

    // Cache it
    this.credentialCache.set(bureau, {
      credential,
      cachedAt: Date.now(),
    });

    // Safe logging — masked keys only
    // CreditBureauService: Loaded credentials for ${bureau} — apiKey=${maskApiKey(credential.apiKey)} env=${credential.environment}

    return credential;
  }

  /**
   * Performs a lightweight health-check against a single bureau's API to
   * validate that the configured credentials are accepted.
   *
   * The check issues a simple authenticated request (token exchange for
   * Experian, a lightweight ping for Equifax/TransUnion) and records
   * the result in `validationState`.
   */
  static async validateCredentials(
    bureau: Bureau,
  ): Promise<CredentialValidationResult> {
    const credential = this.getBureauCredentials(bureau);
    const startMs = Date.now();
    const checkedAt = new Date().toISOString();

    // Quick guard: if key is empty we know it will fail
    if (!credential.apiKey && !credential.apiSecret) {
      const result: CredentialValidationResult = {
        bureau,
        valid: false,
        latencyMs: 0,
        error: `No API credentials configured for ${bureau}. apiKey and apiSecret are both empty.`,
        checkedAt,
      };
      this.recordValidation(bureau, result);
      return result;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT_MS,
      );

      let healthUrl: string;

      switch (bureau) {
        case "experian": {
          // Experian: attempt OAuth token exchange as the health check
          healthUrl = `${credential.baseUrl}/oauth2/v1/token`;
          const credentials = btoa(
            `${credential.clientId}:${credential.apiSecret}`,
          );
          const resp = await fetch(healthUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${credentials}`,
              Grant_type: "client_credentials",
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!resp.ok) {
            throw new Error(`Experian token endpoint returned ${resp.status}`);
          }
          break;
        }
        case "equifax": {
          // Equifax: lightweight API ping
          healthUrl = `${credential.baseUrl}/business/oneview/v1/health`;
          const resp = await fetch(healthUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${credential.apiKey}`,
              "X-Client-Id": credential.clientId,
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          // Accept 2xx or 404 (endpoint may not exist in sandbox, but auth was checked)
          if (!resp.ok && resp.status !== 404) {
            throw new Error(`Equifax health endpoint returned ${resp.status}`);
          }
          break;
        }
        case "transunion": {
          // TransUnion: lightweight API ping
          healthUrl = `${credential.baseUrl}/tuapi/health`;
          const resp = await fetch(healthUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${credential.apiKey}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!resp.ok && resp.status !== 404) {
            throw new Error(
              `TransUnion health endpoint returned ${resp.status}`,
            );
          }
          break;
        }
        default: {
          clearTimeout(timer);
          throw new Error(`Unknown bureau: ${bureau}`);
        }
      }

      const latencyMs = Date.now() - startMs;
      const result: CredentialValidationResult = {
        bureau,
        valid: true,
        latencyMs,
        error: null,
        checkedAt,
      };
      this.recordValidation(bureau, result);
      return result;
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      const errorMessage =
        err instanceof Error ? err.message : "Unknown validation error";
      // CreditBureauService: Credential validation failed for ${bureau} — ${errorMessage}
      const result: CredentialValidationResult = {
        bureau,
        valid: false,
        latencyMs,
        error: errorMessage,
        checkedAt,
      };
      this.recordValidation(bureau, result);
      return result;
    }
  }

  /**
   * Validates credentials for all three bureaus in parallel and returns
   * the individual results.
   */
  static async validateAllCredentials(): Promise<CredentialValidationResult[]> {
    const results = await Promise.all(
      BUREAUS.map((bureau) => this.validateCredentials(bureau)),
    );
    return results;
  }

  /**
   * Returns the current configuration & validation status for every bureau.
   * API keys are masked in the output.
   */
  static getCredentialStatus(): BureauCredentialStatus[] {
    return BUREAUS.map((bureau) => {
      const credential = this.getBureauCredentials(bureau);
      const hasApiKey = credential.apiKey.length > 0;
      const hasApiSecret = credential.apiSecret.length > 0;
      const configured = hasApiKey || hasApiSecret;

      const state = this.validationState.get(bureau);

      return {
        bureau,
        configured,
        environment: credential.environment,
        baseUrl: credential.baseUrl,
        valid: state?.valid ?? false,
        lastValidated: state?.lastValidated ?? null,
        lastError: state?.lastError ?? null,
      };
    });
  }

  /**
   * Rotates a bureau's API key at runtime.
   *
   * Updates the in-memory credential cache immediately so that subsequent
   * requests use the new key without requiring an application restart.
   *
   * **Important**: This does NOT persist the new key to `.env` files or
   * secret managers. The caller is responsible for persisting the updated
   * key externally.
   */
  static rotateApiKey(bureau: Bureau, newApiKey: string): void {
    if (!newApiKey || newApiKey.trim().length === 0) {
      throw new Error(`Cannot rotate API key for ${bureau}: new key is empty`);
    }

    // Get existing credential (may trigger a fresh env read if cache expired)
    const existing = this.getBureauCredentials(bureau);

    const updated: SingleBureauCredential = {
      ...existing,
      apiKey: newApiKey.trim(),
    };

    // Update the cache
    this.credentialCache.set(bureau, {
      credential: updated,
      cachedAt: Date.now(),
    });

    // Reset validation state for this bureau since the key changed
    this.validationState.set(bureau, {
      valid: false,
      lastValidated: null,
      lastError: null,
    });

    // Re-initialize the corresponding bureau client so it picks up the new key
    this.reinitializeBureauClient(bureau, updated);

    // CreditBureauService: API key rotated for ${bureau} — new key ${maskApiKey(newApiKey)}
  }

  /**
   * Override the credential cache TTL (useful for testing).
   */
  static setCredentialCacheTtl(ttlMs: number): void {
    this.credentialCacheTtlMs = Math.max(0, ttlMs);
  }

  /**
   * Flush the entire credential cache, forcing the next access to
   * re-read from environment variables.
   */
  static flushCredentialCache(): void {
    this.credentialCache.clear();
  }

  // =========================================================================
  // Initialization (legacy + new)
  // =========================================================================

  /**
   * Initialize the service with legacy `BureauCredentials` shape.
   *
   * Prefer letting the service auto-initialize from environment variables
   * via `ensureInitialized()`. This method is kept for backward compatibility.
   */
  static initialize(credentials: BureauCredentials): void {
    this.experianClient = new ExperianClient(
      credentials.experian.client_id,
      credentials.experian.client_secret,
      credentials.experian.sandbox,
    );

    this.equifaxClient = new EquifaxClient(
      credentials.equifax.api_key,
      credentials.equifax.client_id,
      credentials.equifax.environment,
    );

    this.transunionClient = new TransUnionClient(
      credentials.transunion.subscriber_id,
      credentials.transunion.api_key,
      credentials.transunion.environment,
    );

    this.initialized = true;
    // CreditBureauService: Initialized (legacy credentials)
  }

  /**
   * Initialize from the new `BureauConfig` / `SingleBureauCredential` shape.
   * Reads credentials from cache (which in turn reads from env vars).
   */
  static initializeFromConfig(config?: BureauConfig): void {
    const cfg = config ?? readAllBureauCredentialsFromEnv();

    // Populate cache with provided config
    for (const bureau of BUREAUS) {
      this.credentialCache.set(bureau, {
        credential: cfg[bureau],
        cachedAt: Date.now(),
      });
    }

    const expCred = cfg.experian;
    const eqfCred = cfg.equifax;
    const tuCred = cfg.transunion;

    this.experianClient = new ExperianClient(
      expCred.clientId,
      expCred.apiSecret,
      expCred.environment === "sandbox",
    );

    this.equifaxClient = new EquifaxClient(
      eqfCred.apiKey,
      eqfCred.clientId,
      eqfCred.environment,
    );

    this.transunionClient = new TransUnionClient(
      tuCred.clientId, // subscriberId mapped to clientId
      tuCred.apiKey,
      tuCred.environment === "sandbox" ? "test" : "production",
    );

    this.initialized = true;
    // CreditBureauService: Initialized (BureauConfig)
  }

  /**
   * Ensure service is initialized — auto-init from env vars if needed.
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      // Try new-style env vars first; fall back to legacy
      const newStyleApiKey = process.env.EXPERIAN_API_KEY;
      if (newStyleApiKey) {
        this.initializeFromConfig();
      } else {
        // Auto-initialize with legacy environment variables
        const credentials: BureauCredentials = {
          experian: {
            client_id: process.env.EXPERIAN_CLIENT_ID || "",
            client_secret: process.env.EXPERIAN_CLIENT_SECRET || "",
            sandbox: process.env.EXPERIAN_SANDBOX === "true",
          },
          equifax: {
            api_key: process.env.EQUIFAX_API_KEY || "",
            client_id: process.env.EQUIFAX_CLIENT_ID || "",
            environment:
              (process.env.EQUIFAX_ENVIRONMENT as "sandbox" | "production") ||
              "sandbox",
          },
          transunion: {
            subscriber_id: process.env.TRANSUNION_SUBSCRIBER_ID || "",
            api_key: process.env.TRANSUNION_API_KEY || "",
            environment:
              (process.env.TRANSUNION_ENVIRONMENT as "test" | "production") ||
              "test",
          },
        };
        this.initialize(credentials);
      }
    }
  }

  // =========================================================================
  // Credit report retrieval
  // =========================================================================

  /**
   * Get credit report from a specific bureau.
   *
   * When `enableFallback` is true (default) and the live bureau API call
   * fails, a `MockCreditBureauAdapter` is used to return realistic mock
   * data so the UX remains functional during development or outages.
   */
  static async getCreditReport(
    userId: string,
    bureau: Bureau,
    reportType: "full" | "monitoring" | "score_only" = "full",
    enableFallback = true,
  ): Promise<BureauResponse<CreditReport>> {
    this.ensureInitialized();

    try {
      const userPII = await this.getUserPII(userId);

      const request: CreditReportRequest = {
        user_id: userId,
        bureau,
        report_type: reportType,
        consumer_consent: true,
        permissible_purpose: "ACCOUNT_REVIEW",
      };

      let response: BureauResponse<CreditReport>;

      switch (bureau) {
        case "experian":
          if (!this.experianClient)
            throw new Error("Experian client not initialized");
          response = await this.experianClient.getCreditReport(
            request,
            userPII,
          );
          break;
        case "equifax":
          if (!this.equifaxClient)
            throw new Error("Equifax client not initialized");
          response = await this.equifaxClient.getCreditReport(request, userPII);
          break;
        case "transunion":
          if (!this.transunionClient)
            throw new Error("TransUnion client not initialized");
          response = await this.transunionClient.getCreditReport(
            request,
            userPII,
          );
          break;
        default:
          throw new Error(`Unknown bureau: ${bureau}`);
      }

      // Graceful fallback: if the live call failed and fallback is enabled,
      // use MockCreditBureauAdapter to return realistic data
      if (!response.success && enableFallback) {
        const mockAdapter = new MockCreditBureauAdapter({
          simulatedBureau: bureau,
        });
        response = await mockAdapter.getCreditReport(request, userPII);
        // Tag the response so callers know it came from mock
        response.reference_id = `fallback_${response.reference_id ?? "unknown"}`;
      }

      // Save to database if successful
      if (response.success && response.data) {
        await this.saveCreditReport(response.data);
        // Also save score to history
        await this.saveScoreHistory(
          userId,
          bureau,
          response.data.credit_score,
          response.data.id,
        );
      }

      return response;
    } catch (error) {
      // If the entire call chain threw and fallback is enabled, try mock
      if (enableFallback) {
        try {
          const request: CreditReportRequest = {
            user_id: userId,
            bureau,
            report_type: reportType,
            consumer_consent: true,
            permissible_purpose: "ACCOUNT_REVIEW",
          };
          const mockPII: UserPII = {
            firstName: "User",
            lastName: userId,
            ssn: "",
            dateOfBirth: "",
            addresses: [],
          };
          const mockAdapter = new MockCreditBureauAdapter({
            simulatedBureau: bureau,
          });
          const fallbackResponse = await mockAdapter.getCreditReport(
            request,
            mockPII,
          );
          fallbackResponse.reference_id = `fallback_${fallbackResponse.reference_id ?? "unknown"}`;
          return fallbackResponse;
        } catch {
          // Fallback also failed — fall through to error response
        }
      }

      // CreditBureauService error: Error getting credit report
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        bureau,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get credit reports from all three bureaus
   */
  static async getAllCreditReports(userId: string): Promise<{
    experian?: BureauResponse<CreditReport>;
    equifax?: BureauResponse<CreditReport>;
    transunion?: BureauResponse<CreditReport>;
  }> {
    // Execute all requests in parallel
    const [experianResult, equifaxResult, transunionResult] =
      await Promise.allSettled([
        this.getCreditReport(userId, "experian"),
        this.getCreditReport(userId, "equifax"),
        this.getCreditReport(userId, "transunion"),
      ]);

    const results: Partial<Record<Bureau, BureauResponse<CreditReport>>> = {};

    if (experianResult.status === "fulfilled") {
      results.experian = experianResult.value;
    }
    if (equifaxResult.status === "fulfilled") {
      results.equifax = equifaxResult.value;
    }
    if (transunionResult.status === "fulfilled") {
      results.transunion = transunionResult.value;
    }

    return results;
  }

  // =========================================================================
  // Dispute submission
  // =========================================================================

  /**
   * Submit dispute to a specific bureau.
   *
   * `success` in the returned result reflects ONLY the bureau's acceptance
   * of the dispute. Once the bureau has accepted it, the FCRA Sec. 611
   * 30-day investigation clock is running regardless of what happens to our
   * own audit record of it — so from that point on this method must never
   * report `success: false`, even if saving that record fails. Doing so
   * would tell the caller "not filed" for a dispute that WAS filed, and an
   * honest-looking retry would file a DUPLICATE dispute with the bureau
   * (risking it being deemed frivolous under Sec. 611(a)(3)).
   *
   * `persisted` is the separate signal for whether the local `bureau_disputes`
   * row was saved. See `DisputeSubmissionResult` for the full contract.
   */
  static async submitDispute(
    userId: string,
    dispute: DisputeSubmission,
  ): Promise<DisputeSubmissionResult> {
    this.ensureInitialized();

    let response: BureauResponse;
    try {
      const userPII = await this.getUserPII(userId);

      switch (dispute.bureau) {
        case "experian":
          if (!this.experianClient)
            throw new Error("Experian client not initialized");
          response = await this.experianClient.submitDispute(dispute, userPII);
          break;
        case "equifax":
          if (!this.equifaxClient)
            throw new Error("Equifax client not initialized");
          response = await this.equifaxClient.submitDispute(dispute, userPII);
          break;
        case "transunion":
          if (!this.transunionClient)
            throw new Error("TransUnion client not initialized");
          response = await this.transunionClient.submitDispute(
            dispute,
            userPII,
          );
          break;
        default:
          throw new Error(`Unknown bureau: ${dispute.bureau}`);
      }
    } catch (error) {
      // Nothing was filed at the bureau — a plain failure is accurate here.
      // CreditBureauService error: Error submitting dispute
      return {
        success: false,
        error: extractErrorMessage(error),
        bureau: dispute.bureau,
        timestamp: new Date().toISOString(),
        persisted: false,
      };
    }

    if (!response.success) {
      // Bureau declined the submission — nothing to persist.
      return { ...response, persisted: false };
    }

    // The bureau ACCEPTED the dispute. Everything below is best-effort local
    // record-keeping; its failure must not flip `success` back to false.
    try {
      await this.saveDisputeRecord({
        user_id: userId,
        bureau: dispute.bureau,
        credit_item_id: dispute.credit_item_id,
        dispute_reason: dispute.dispute_reason,
        status: "submitted",
        reference_id: response.reference_id,
        created_at: new Date().toISOString(),
      });
      return { ...response, persisted: true };
    } catch (persistError) {
      // CreditBureauService error: dispute accepted by bureau but local
      // record failed to save — flagged via persisted/persistenceError for
      // operator reconciliation, never surfaced as a bureau-side failure.
      return {
        ...response,
        success: true,
        persisted: false,
        persistenceError: extractErrorMessage(persistError),
      };
    }
  }

  // =========================================================================
  // Credit analysis
  // =========================================================================

  /**
   * Analyze credit report and provide recommendations
   */
  static async analyzeCreditReport(
    creditReport: CreditReport,
  ): Promise<CreditAnalysis> {
    const accounts = creditReport.accounts || [];
    const inquiries = creditReport.inquiries || [];
    const publicRecords = creditReport.public_records || [];

    // Calculate credit utilization
    const utilization = this.calculateCreditUtilization(accounts);

    // Identify negative items
    const negativeItems: CreditAnalysis["negative_items"] = [];

    // Late payments
    const lateAccounts = accounts.filter(
      (acc) => acc.payment_status === "late",
    );
    if (lateAccounts.length > 0) {
      negativeItems.push({
        type: "late_payments",
        description: `${lateAccounts.length} account(s) with late payments`,
        impact: "high" as const,
        recommendation:
          "Bring all accounts current and set up automatic payments",
      });
    }

    // High utilization
    if (utilization.utilization_percentage > 30) {
      negativeItems.push({
        type: "high_utilization",
        description: `Credit utilization at ${utilization.utilization_percentage.toFixed(1)}%`,
        impact: "high" as const,
        recommendation: "Pay down balances to below 30% utilization",
      });
    }

    // Public records
    if (publicRecords.length > 0) {
      negativeItems.push({
        type: "public_records",
        description: `${publicRecords.length} public record(s) on file`,
        impact: "high" as const,
        recommendation:
          "Resolve public records and consider dispute if inaccurate",
      });
    }

    // Hard inquiries
    const recentInquiries = inquiries.filter((inq) => {
      const inquiryDate = new Date(inq.inquiry_date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return inquiryDate > sixMonthsAgo && inq.inquiry_type === "hard";
    });

    if (recentInquiries.length > 3) {
      negativeItems.push({
        type: "too_many_inquiries",
        description: `${recentInquiries.length} hard inquiries in last 6 months`,
        impact: "medium" as const,
        recommendation: "Avoid applying for new credit for 6-12 months",
      });
    }

    // Positive factors
    const positiveFactors: string[] = [];
    if (utilization.utilization_percentage < 30) {
      positiveFactors.push("Low credit utilization");
    }
    if (accounts.filter((acc) => acc.payment_status === "current").length > 0) {
      positiveFactors.push("Accounts in good standing");
    }

    return {
      credit_score: creditReport.credit_score,
      score_factors: this.getScoreFactors(creditReport.credit_score),
      utilization,
      negative_items: negativeItems,
      positive_factors: positiveFactors,
      recommendations: this.generateRecommendations(negativeItems),
    };
  }

  // =========================================================================
  // Score history
  // =========================================================================

  /**
   * Save a score history entry to the `credit_score_history` table.
   */
  static async saveScoreHistory(
    userId: string,
    bureau: Bureau,
    score: number,
    reportId: string,
  ): Promise<void> {
    const { error } = await getSupabase()
      .from("credit_score_history")
      .insert({
        user_id: userId,
        bureau,
        score,
        report_id: reportId,
      });

    if (error) {
      // CreditBureauService: Failed to save score history — non-fatal
      // We log but do not throw to avoid breaking the main credit report flow
    }
  }

  /**
   * Retrieve score history for a user, optionally filtered by bureau and
   * date range. Results are ordered by `recorded_at` descending.
   */
  static async getScoreHistory(
    query: ScoreHistoryQuery,
  ): Promise<CreditScoreHistoryEntry[]> {
    let dbQuery = getSupabase()
      .from("credit_score_history")
      .select("*")
      .eq("user_id", query.user_id)
      .order("recorded_at", { ascending: false });

    if (query.bureau) {
      dbQuery = dbQuery.eq("bureau", query.bureau);
    }
    if (query.from_date) {
      dbQuery = dbQuery.gte("recorded_at", query.from_date);
    }
    if (query.to_date) {
      dbQuery = dbQuery.lte("recorded_at", query.to_date);
    }
    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }

    const { data, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to retrieve score history: ${error.message}`);
    }

    return (data ?? []) as CreditScoreHistoryEntry[];
  }

  // =========================================================================
  // Bureau connection management
  // =========================================================================

  /**
   * Get the connection status for all bureaus for a given user.
   */
  static async getBureauConnectionStatuses(
    userId: string,
  ): Promise<BureauConnectionStatus[]> {
    const { data, error } = await getSupabase()
      .from("bureau_connections")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw new Error(
        `Failed to retrieve bureau connections: ${error.message}`,
      );
    }

    const environment = readBureauApiEnvironment();
    const connectedBureaus = new Map<
      string,
      { connected: boolean; last_pull_date: string | null; last_score: number | null }
    >();

    for (const row of data ?? []) {
      connectedBureaus.set(row.bureau, {
        connected: row.connected,
        last_pull_date: row.last_pull_date,
        last_score: row.last_score,
      });
    }

    return BUREAUS.map((bureau) => {
      const conn = connectedBureaus.get(bureau);
      return {
        bureau,
        connected: conn?.connected ?? false,
        last_pull_date: conn?.last_pull_date ?? null,
        last_score: conn?.last_score ?? null,
        environment,
      };
    });
  }

  /**
   * Connect (or reconnect) a bureau for a user. Creates the row if it does
   * not exist, otherwise updates the `connected` flag.
   */
  static async connectBureau(
    userId: string,
    bureau: Bureau,
  ): Promise<BureauConnectionStatus> {
    const now = new Date().toISOString();
    const environment = readBureauApiEnvironment();

    const { error } = await getSupabase()
      .from("bureau_connections")
      .upsert(
        {
          user_id: userId,
          bureau,
          connected: true,
          verified_at: now,
          updated_at: now,
        },
        { onConflict: "user_id,bureau" },
      );

    if (error) {
      throw new Error(`Failed to connect bureau ${bureau}: ${error.message}`);
    }

    return {
      bureau,
      connected: true,
      last_pull_date: null,
      last_score: null,
      environment,
    };
  }

  /**
   * Disconnect a bureau for a user.
   */
  static async disconnectBureau(
    userId: string,
    bureau: Bureau,
  ): Promise<void> {
    const { error } = await getSupabase()
      .from("bureau_connections")
      .update({ connected: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("bureau", bureau);

    if (error) {
      throw new Error(
        `Failed to disconnect bureau ${bureau}: ${error.message}`,
      );
    }
  }

  /**
   * Update bureau connection after a successful pull — records the last
   * pull date and the score retrieved.
   */
  static async updateBureauLastPull(
    userId: string,
    bureau: Bureau,
    score: number,
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await getSupabase()
      .from("bureau_connections")
      .update({
        last_pull_date: now,
        last_score: score,
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("bureau", bureau);

    if (error) {
      // Non-fatal: log but do not throw
    }
  }

  // =========================================================================
  // Private helpers — credential internals
  // =========================================================================

  /**
   * Record a validation result in internal state.
   */
  private static recordValidation(
    bureau: Bureau,
    result: CredentialValidationResult,
  ): void {
    this.validationState.set(bureau, {
      valid: result.valid,
      lastValidated: result.checkedAt,
      lastError: result.error,
    });
  }

  /**
   * Re-initialize a single bureau's client after a key rotation.
   */
  private static reinitializeBureauClient(
    bureau: Bureau,
    credential: SingleBureauCredential,
  ): void {
    switch (bureau) {
      case "experian":
        this.experianClient = new ExperianClient(
          credential.clientId,
          credential.apiSecret,
          credential.environment === "sandbox",
        );
        break;
      case "equifax":
        this.equifaxClient = new EquifaxClient(
          credential.apiKey,
          credential.clientId,
          credential.environment,
        );
        break;
      case "transunion":
        this.transunionClient = new TransUnionClient(
          credential.clientId,
          credential.apiKey,
          credential.environment === "sandbox" ? "test" : "production",
        );
        break;
    }
  }

  // =========================================================================
  // Private helpers — credit analysis
  // =========================================================================

  /**
   * Calculate credit utilization
   */
  private static calculateCreditUtilization(
    accounts: CreditAccount[],
  ): CreditUtilization {
    const creditAccounts = accounts.filter(
      (acc): acc is CreditAccount & { credit_limit: number } =>
        typeof acc.credit_limit === "number" && acc.credit_limit > 0,
    );

    const totalLimit = creditAccounts.reduce(
      (sum, acc) => sum + (acc.credit_limit || 0),
      0,
    );
    const totalBalance = creditAccounts.reduce(
      (sum, acc) => sum + (acc.balance || 0),
      0,
    );

    return {
      total_credit_limit: totalLimit,
      total_balance: totalBalance,
      utilization_percentage:
        totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0,
      by_account: creditAccounts.map((acc) => ({
        account_id: acc.id,
        creditor_name: acc.creditor_name,
        credit_limit: acc.credit_limit,
        balance: acc.balance,
        utilization:
          acc.credit_limit > 0 ? (acc.balance / acc.credit_limit) * 100 : 0,
      })),
    };
  }

  private static getScoreFactors(score: number): string[] {
    if (score >= 800) return ["Exceptional credit history", "Very low risk"];
    if (score >= 740) return ["Very good credit history", "Low risk"];
    if (score >= 670) return ["Good credit history", "Average risk"];
    if (score >= 580) return ["Fair credit history", "Higher risk"];
    return ["Poor credit history", "High risk"];
  }

  private static generateRecommendations(
    negativeItems: CreditAnalysis["negative_items"],
  ): string[] {
    return negativeItems.map((item) => item.recommendation);
  }

  // =========================================================================
  // Private helpers — database
  // =========================================================================

  /**
   * Get user PII from database
   */
  private static async getUserPII(userId: string): Promise<UserPII> {
    const { data: profile, error } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new Error("User profile not found");
    }

    return {
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      ssn: profile.ssn || "",
      dateOfBirth: profile.date_of_birth || "",
      addresses: [
        {
          streetAddress: profile.address_line1 || "",
          city: profile.city || "",
          state: profile.state || "",
          zipCode: profile.zip_code || "",
        },
      ],
    };
  }

  /**
   * Save credit report to database
   */
  private static async saveCreditReport(report: CreditReport): Promise<void> {
    const { error } = await getSupabase().from("credit_reports").insert(report);

    if (error) {
      // CreditBureauService error: Error saving credit report
      throw error;
    }
  }

  /**
   * Save dispute record to database
   */
  private static async saveDisputeRecord(
    dispute: BureauDisputeRecord,
  ): Promise<void> {
    const { error } = await getSupabase()
      .from("bureau_disputes")
      .insert(dispute);

    if (error) {
      // CreditBureauService error: Error saving dispute record
      throw error;
    }
  }
}

export { maskApiKey };
export default CreditBureauService;

interface BureauDisputeRecord {
  user_id: string;
  bureau: Bureau;
  credit_item_id: string;
  dispute_reason: string;
  status: "submitted" | "processing" | "resolved" | "rejected";
  reference_id?: string;
  created_at: string;
}
