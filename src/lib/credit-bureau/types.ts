/**
 * Credit Bureau Integration Types
 *
 * Type definitions for credit bureau API integration
 */

// ---------------------------------------------------------------------------
// Bureau API Environment
// ---------------------------------------------------------------------------
export type BureauApiEnvironment = "sandbox" | "production";

// ---------------------------------------------------------------------------
// Per-Bureau Credential Shape
// ---------------------------------------------------------------------------
export interface SingleBureauCredential {
  apiKey: string;
  apiSecret: string;
  clientId: string;
  baseUrl: string;
  environment: BureauApiEnvironment;
}

// ---------------------------------------------------------------------------
// Map of bureau name -> credentials
// ---------------------------------------------------------------------------
export type BureauConfig = Record<Bureau, SingleBureauCredential>;

// ---------------------------------------------------------------------------
// Credential status for a single bureau
// ---------------------------------------------------------------------------
export interface BureauCredentialStatus {
  bureau: Bureau;
  configured: boolean;
  environment: BureauApiEnvironment;
  baseUrl: string;
  /** True when the last `validateCredentials` health-check succeeded */
  valid: boolean;
  /** ISO-8601 timestamp of the last validation attempt */
  lastValidated: string | null;
  /** Human-readable error from the last failed validation, if any */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Credential validation result
// ---------------------------------------------------------------------------
export interface CredentialValidationResult {
  bureau: Bureau;
  valid: boolean;
  latencyMs: number;
  error: string | null;
  checkedAt: string;
}

// ---------------------------------------------------------------------------
// Legacy BureauCredentials — retained for backward-compat with initialize()
// ---------------------------------------------------------------------------
export interface BureauCredentials {
  experian: {
    client_id: string;
    client_secret: string;
    sandbox: boolean;
  };
  equifax: {
    api_key: string;
    client_id: string;
    environment: "sandbox" | "production";
  };
  transunion: {
    subscriber_id: string;
    api_key: string;
    environment: "test" | "production";
  };
}

export type Bureau = "experian" | "equifax" | "transunion";
export type ReportType = "full" | "monitoring" | "score_only";
export type CreditBureauRawPayload = Record<string, unknown>;

export interface CreditReportRequest {
  user_id: string;
  bureau: Bureau;
  report_type: ReportType;
  consumer_consent: boolean;
  permissible_purpose: string;
}

export interface CreditReport {
  id: string;
  user_id: string;
  bureau: Bureau;
  credit_score: number;
  report_date: string;
  accounts?: CreditAccount[];
  inquiries?: CreditInquiry[];
  public_records?: PublicRecord[];
  raw_data: CreditBureauRawPayload;
  created_at: string;
}

export interface CreditAccount {
  id: string;
  account_number: string;
  account_type:
    | "credit_card"
    | "mortgage"
    | "auto_loan"
    | "student_loan"
    | "personal_loan"
    | "other";
  creditor_name: string;
  balance: number;
  credit_limit?: number;
  payment_status: "current" | "late" | "charged_off" | "collection" | "closed";
  opened_date: string;
  last_payment_date?: string;
  payment_history: PaymentHistory[];
}

export interface PaymentHistory {
  month: string;
  status: "OK" | "30" | "60" | "90" | "120" | "CO" | "NA";
}

export interface CreditInquiry {
  id: string;
  inquiry_date: string;
  creditor_name: string;
  inquiry_type: "hard" | "soft";
}

export interface PublicRecord {
  id: string;
  record_type: "bankruptcy" | "tax_lien" | "judgment" | "foreclosure";
  filing_date: string;
  status: "filed" | "discharged" | "satisfied" | "dismissed";
  amount?: number;
  court_name?: string;
}

export interface DisputeSubmission {
  bureau: Bureau;
  credit_item_id: string;
  dispute_reason: string;
  dispute_method: string;
  supporting_documents?: string[];
  consumer_statement?: string;
}

export interface BureauResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  bureau: string;
  timestamp: string;
  reference_id?: string;
}

/**
 * Result of `CreditBureauService.submitDispute`.
 *
 * `success` reflects ONLY whether the bureau accepted the dispute — it must
 * stay `true` even if the local audit record below fails to save, because by
 * that point the bureau has already accepted the filing and the FCRA Sec.
 * 611 30-day investigation clock is running. Reporting `success: false` here
 * would cause a caller to retry, filing a DUPLICATE dispute with the bureau.
 *
 * `persisted` is the separate, orthogonal signal for whether Fynvita's own
 * `bureau_disputes` record of that filing was saved successfully.
 */
export interface DisputeSubmissionResult extends BureauResponse {
  /** True once the local `bureau_disputes` audit row was saved successfully. */
  persisted: boolean;
  /**
   * Present only when `persisted` is `false` while `success` is `true`: the
   * bureau accepted the dispute but the local record failed to save. Callers
   * MUST NOT treat this as "not filed" — the `reference_id` above (when
   * present) is the caller's only proof of the bureau-side filing until the
   * record is reconciled.
   */
  persistenceError?: string;
}

export interface CreditMonitoringAlert {
  id: string;
  user_id: string;
  bureau: string;
  alert_type:
    | "new_account"
    | "score_change"
    | "inquiry"
    | "address_change"
    | "fraud_alert";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
  acknowledged: boolean;
}

export interface UserPII {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  addresses: Address[];
}

export interface Address {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreditUtilization {
  total_credit_limit: number;
  total_balance: number;
  utilization_percentage: number;
  by_account: Array<{
    account_id: string;
    creditor_name: string;
    credit_limit: number;
    balance: number;
    utilization: number;
  }>;
}

export interface CreditAnalysis {
  credit_score: number;
  score_factors: string[];
  utilization: CreditUtilization;
  negative_items: Array<{
    type: string;
    description: string;
    impact: "high" | "medium" | "low";
    recommendation: string;
  }>;
  positive_factors: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Credit Bureau Adapter Interface
// ---------------------------------------------------------------------------

/**
 * Common interface that all credit bureau clients must implement.
 * Enables polymorphic bureau access and MockCreditBureauAdapter for dev/test.
 */
export interface CreditBureauAdapter {
  /** The bureau this adapter connects to (or "mock" for the mock adapter). */
  readonly bureau: Bureau | "mock";

  /**
   * Retrieve a credit report for the given consumer.
   */
  getCreditReport(
    request: CreditReportRequest,
    userPII: UserPII,
  ): Promise<BureauResponse<CreditReport>>;

  /**
   * Submit a dispute for a specific credit item.
   */
  submitDispute(
    dispute: DisputeSubmission,
    userPII: UserPII,
  ): Promise<BureauResponse>;
}

// ---------------------------------------------------------------------------
// Score History
// ---------------------------------------------------------------------------

export interface CreditScoreHistoryEntry {
  id: string;
  user_id: string;
  bureau: Bureau;
  score: number;
  report_id: string;
  recorded_at: string;
}

export interface ScoreHistoryQuery {
  user_id: string;
  bureau?: Bureau;
  limit?: number;
  from_date?: string;
  to_date?: string;
}

// ---------------------------------------------------------------------------
// Bureau Connection Status
// ---------------------------------------------------------------------------

export interface BureauConnectionStatus {
  bureau: Bureau;
  connected: boolean;
  last_pull_date: string | null;
  last_score: number | null;
  environment: BureauApiEnvironment;
}
