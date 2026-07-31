/**
 * GDPR and CCPA Compliance Service
 *
 * Implements:
 * - Right to access (GDPR Art. 15, CCPA §1798.110)
 * - Right to rectification (GDPR Art. 16)
 * - Right to erasure / deletion (GDPR Art. 17, CCPA §1798.105)
 * - Right to data portability (GDPR Art. 20, CCPA §1798.100)
 * - Right to opt-out (CCPA §1798.120)
 * - Consent management
 * - Data breach notification
 */

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/server";

// Structural type for the subset of the Supabase client this module uses.
// Defined locally so services can be constructed with a test double.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FromBuilder = any;
export interface DbClient {
  from: (table: string) => FromBuilder;
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  auth: {
    admin: {
      deleteUser: (
        id: string,
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditReportRecord {
  id: string;
  bureau: string;
  reportDate: Date;
  score?: number;
  items?: unknown[];
}

export interface DisputeRecord {
  id: string;
  status: string;
  createdAt: Date;
  description?: string;
}

export interface AIInteractionRecord {
  id: string;
  type: string;
  timestamp: Date;
  prompt?: string;
  response?: string;
}

export interface LogRecord {
  id: string;
  action: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface UserDataExport {
  userId: string;
  exportDate: Date;
  data: {
    profile: UserProfile | null;
    creditReports: CreditReportRecord[];
    disputes: DisputeRecord[];
    aiInteractions: AIInteractionRecord[];
    logs: LogRecord[];
  };
  format: "json" | "csv" | "xml";
}

export interface ConsentRecord {
  userId: string;
  consentType: "marketing" | "analytics" | "ai_processing" | "data_sharing";
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataDeletionRequest {
  userId: string;
  requestDate: Date;
  reason?: string;
  status: "pending" | "processing" | "completed" | "failed" | "rejected";
  completionDate?: Date;
  error?: string;
}

export interface DataBreachNotification {
  breachId: string;
  discoveredDate: Date;
  notifiedDate: Date;
  affectedUsers: string[];
  dataTypes: string[];
  severity: "low" | "medium" | "high" | "critical";
  mitigationSteps: string[];
}

/**
 * GDPR Compliance Service
 */
export class GDPRComplianceService {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db ?? (supabaseAdmin as unknown as DbClient);
  }

  /**
   * Right to Access (GDPR Art. 15)
   * User can request all their personal data
   */
  async exportUserData(
    userId: string,
    format: "json" | "csv" | "xml" = "json",
  ): Promise<UserDataExport> {
    const userData: UserDataExport = {
      userId,
      exportDate: new Date(),
      format,
      data: {
        profile: await this.getUserProfile(userId),
        creditReports: await this.getUserCreditReports(userId),
        disputes: await this.getUserDisputes(userId),
        aiInteractions: await this.getUserAIInteractions(userId),
        logs: await this.getUserLogs(userId),
      },
    };

    return userData;
  }

  /**
   * Right to Rectification (GDPR Art. 16)
   * User can request correction of inaccurate data
   */
  async rectifyUserData(
    userId: string,
    corrections: Record<string, string | number | boolean>,
  ): Promise<boolean> {
    const allowedProfileFields = ["name", "phone", "address"];
    const profileUpdates: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(corrections)) {
      if (allowedProfileFields.includes(key)) {
        profileUpdates[key] = value;
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await this.db
        .from("profiles")
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        throw new Error(`Data rectification failed: ${error.message}`);
      }
    }

    await this.db.from("audit_logs").insert({
      user_id: userId,
      action: "gdpr_rectification",
      details: { fields_corrected: Object.keys(profileUpdates) },
      created_at: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Right to Erasure (GDPR Art. 17)
   *
   * Delegates the cascade to the `delete_user_data_cascade` Postgres RPC so
   * the 28-table wipe + audit-log anonymization run atomically inside a
   * single transaction. The Supabase Auth user is deleted afterwards from
   * server code (the auth API cannot be invoked from PL/pgSQL).
   */
  async deleteUserData(
    userId: string,
    reason?: string,
  ): Promise<DataDeletionRequest> {
    const request: DataDeletionRequest = {
      userId,
      requestDate: new Date(),
      reason,
      status: "processing",
    };

    const { error: rpcError } = await this.db.rpc(
      "delete_user_data_cascade",
      { p_user_id: userId, p_reason: reason ?? null },
    );

    if (rpcError) {
      request.status = "failed";
      request.error = `Cascade delete failed: ${rpcError.message}`;
      return request;
    }

    const { error: authError } = await this.db.auth.admin.deleteUser(userId);

    if (authError) {
      request.status = "failed";
      request.error = `Auth user delete failed: ${authError.message}`;
      return request;
    }

    request.status = "completed";
    request.completionDate = new Date();
    return request;
  }

  /**
   * Right to Data Portability (GDPR Art. 20)
   * User can receive their data in a structured, machine-readable format
   */
  async portUserData(
    userId: string,
    targetFormat: "json" | "csv" | "xml",
  ): Promise<string> {
    const userData = await this.exportUserData(userId, targetFormat);

    switch (targetFormat) {
      case "json":
        return JSON.stringify(userData, null, 2);
      case "csv":
        return this.convertToCSV(userData.data);
      case "xml":
        return this.convertToXML(userData.data);
      default:
        return JSON.stringify(userData, null, 2);
    }
  }

  /**
   * Right to Restrict Processing (GDPR Art. 18)
   */
  async restrictProcessing(
    userId: string,
    restrictions: string[],
  ): Promise<boolean> {
    const { error } = await this.db
      .from("profiles")
      .update({
        processing_restrictions: restrictions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Processing restriction failed: ${error.message}`);
    }

    await this.db.from("audit_logs").insert({
      user_id: userId,
      action: "gdpr_restrict_processing",
      details: { restrictions },
      created_at: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Right to Object (GDPR Art. 21)
   */
  async objectToProcessing(
    userId: string,
    processingType: string,
  ): Promise<boolean> {
    const { error } = await this.db.from("consent_records").insert({
      user_id: userId,
      consent_type: processingType,
      granted: false,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Processing objection failed: ${error.message}`);
    }

    await this.db.from("audit_logs").insert({
      user_id: userId,
      action: "gdpr_object_processing",
      details: { processing_type: processingType },
      created_at: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Data Breach Notification (GDPR Art. 33-34)
   * Must notify within 72 hours.
   *
   * Each affected user is attempted independently — a failure for one user does
   * not abort the remaining users. A summary `{ sent, failed }` is returned so
   * callers can reflect partial failures in their response.
   */
  async notifyDataBreach(
    breach: Omit<DataBreachNotification, "notifiedDate">,
  ): Promise<{ sent: number; failed: number }> {
    const notification: DataBreachNotification = {
      ...breach,
      notifiedDate: new Date(),
    };

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of breach.affectedUsers) {
      try {
        await this.sendBreachNotification(userId, notification);
        sent++;
      } catch (err) {
        failed++;
        errors.push(
          `${userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (failed > 0) {
      throw new Error(
        `Breach notification partially failed: ${failed} of ${sent + failed} users not notified. Errors: ${errors.join("; ")}`,
      );
    }

    return { sent, failed };
  }

  // Helper methods

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.db
      .from("profiles")
      .select("id, email, name, phone, address, created_at, updated_at")
      .eq("id", userId)
      .single();

    // PGRST116 ("no rows") is a legitimate "no profile" result. Any other
    // error (permission denied, connection failure, malformed query) is a
    // real failure and must propagate — silently reporting "no profile" for
    // a GDPR Art. 15 export would misstate what data exists. Established
    // idiom: see budget-service.ts getBudgetById.
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to load profile for export: ${error.message}`);
    }
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      address: data.address,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private async getUserCreditReports(
    userId: string,
  ): Promise<CreditReportRecord[]> {
    const { data, error } = await this.db
      .from("credit_reports")
      .select("id, bureau, report_date, score, items")
      .eq("user_id", userId);

    // A list query has no "not found" error code — an empty result set is a
    // valid `{ data: [], error: null }`. Any non-null error is a real DB
    // failure that must not be silently reported as "no credit reports."
    if (error) {
      throw new Error(
        `Failed to load credit reports for export: ${error.message}`,
      );
    }

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      bureau: r.bureau as string,
      reportDate: new Date(r.report_date as string),
      score: r.score as number | undefined,
      items: r.items as unknown[],
    }));
  }

  private async getUserDisputes(userId: string): Promise<DisputeRecord[]> {
    const { data, error } = await this.db
      .from("disputes")
      .select("id, status, created_at, description")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to load disputes for export: ${error.message}`);
    }

    return ((data ?? []) as Array<Record<string, unknown>>).map((d) => ({
      id: d.id as string,
      status: d.status as string,
      createdAt: new Date(d.created_at as string),
      description: d.description as string | undefined,
    }));
  }

  private async getUserAIInteractions(
    userId: string,
  ): Promise<AIInteractionRecord[]> {
    const { data, error } = await this.db
      .from("ai_interactions")
      .select("id, type, timestamp, prompt, response")
      .eq("user_id", userId);

    if (error) {
      throw new Error(
        `Failed to load AI interactions for export: ${error.message}`,
      );
    }

    return ((data ?? []) as Array<Record<string, unknown>>).map((a) => ({
      id: a.id as string,
      type: a.type as string,
      timestamp: new Date(a.timestamp as string),
      prompt: a.prompt as string | undefined,
      response: a.response as string | undefined,
    }));
  }

  private async getUserLogs(userId: string): Promise<LogRecord[]> {
    const { data, error } = await this.db
      .from("audit_logs")
      .select("id, action, created_at, details")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to load audit logs for export: ${error.message}`);
    }

    return ((data ?? []) as Array<Record<string, unknown>>).map((l) => ({
      id: l.id as string,
      action: l.action as string,
      timestamp: new Date(l.created_at as string),
      details: l.details as Record<string, unknown>,
    }));
  }

  /**
   * Stub — CSV export for GDPR Art. 20 portability is not implemented yet.
   * Throws so callers cannot silently receive JSON when asking for CSV.
   */
  private convertToCSV(_data: UserDataExport["data"]): string {
    throw new Error(
      "GDPR Art. 20 CSV export is not yet implemented. Use format='json' until a compliant CSV serialiser is added.",
    );
  }

  /**
   * Stub — XML export for GDPR Art. 20 portability is not implemented yet.
   * Throws so callers cannot silently receive JSON when asking for XML.
   */
  private convertToXML(_data: UserDataExport["data"]): string {
    throw new Error(
      "GDPR Art. 20 XML export is not yet implemented. Use format='json' until a compliant XML serialiser is added.",
    );
  }

  /**
   * Send a GDPR Art. 33 breach notification email to one user and record the
   * outcome in `breach_notifications`.
   *
   * Failure path: if Resend throws, a status:failed row is written and the
   * error is re-thrown so `notifyDataBreach` can surface it — no silent swallow.
   */
  private static escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private async sendBreachNotification(
    userId: string,
    notification: DataBreachNotification,
  ): Promise<void> {
    // Guard misconfiguration with a clear message before constructing the client.
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Fetch email from profiles — avoid logging PII in the error path.
    const { data: profile } = await this.db
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .single();

    const toEmail = (profile as { email?: string } | null)?.email;
    if (!toEmail) {
      // No profile email — record as failed and return without crashing the loop.
      await this.db.from("breach_notifications").insert({
        breach_id: notification.breachId,
        user_id: userId,
        notified_at: new Date().toISOString(),
        channel: "email",
        status: "failed",
        error: "No email address found for user",
      });
      return;
    }

    const e = GDPRComplianceService.escapeHtml;
    const userName = e(
      (profile as { name?: string } | null)?.name ?? "Valued Customer",
    );
    const dataList = notification.dataTypes.map(e).join(", ");
    const steps = notification.mitigationSteps
      .map((s) => `<li>${e(s)}</li>`)
      .join("");
    const html = `
      <h2>Important Security Notice — Data Breach Notification</h2>
      <p>Dear ${userName},</p>
      <p>
        We are writing to inform you that Fynvita has detected a data security
        incident (reference: <strong>${e(notification.breachId)}</strong>) that may
        have affected your account.
      </p>
      <p><strong>Severity:</strong> ${e(notification.severity)}</p>
      <p><strong>Discovered:</strong> ${notification.discoveredDate.toISOString()}</p>
      <p><strong>Data types involved:</strong> ${dataList}</p>
      <h3>What you should do</h3>
      <ul>${steps}</ul>
      <p>
        If you have questions, please contact our support team at
        support@fynvita.com.
      </p>
      <p>We apologise for any inconvenience caused.</p>
      <p>The Fynvita Security Team</p>
    `;

    // Construct Resend lazily (at call time, not module scope) so that importing
    // this module never throws when RESEND_API_KEY is not set.
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail =
      process.env.FROM_EMAIL || "Fynvita Security <noreply@fynvita.com>";

    try {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `[Action Required] Fynvita Security Incident — ${notification.breachId}`,
        html,
      });
      if (error) {
        throw new Error(String((error as { message?: unknown }).message ?? error));
      }
    } catch (err) {
      const sendError = err instanceof Error ? err.message : String(err);
      // Write the failed record before re-throwing
      await this.db.from("breach_notifications").insert({
        breach_id: notification.breachId,
        user_id: userId,
        notified_at: new Date().toISOString(),
        channel: "email",
        status: "failed",
        error: sendError,
      });
      throw err;
    }

    // Happy path — record the successful send
    await this.db.from("breach_notifications").insert({
      breach_id: notification.breachId,
      user_id: userId,
      notified_at: new Date().toISOString(),
      channel: "email",
      status: "sent",
      error: null,
    });
  }
}

/**
 * CCPA Compliance Service
 */
export class CCPAComplianceService {
  private db: DbClient;
  private gdpr: GDPRComplianceService;

  constructor(db?: DbClient, gdpr?: GDPRComplianceService) {
    this.db = db ?? (supabaseAdmin as unknown as DbClient);
    this.gdpr = gdpr ?? new GDPRComplianceService(this.db);
  }

  /**
   * Right to Know (CCPA §1798.100)
   * User can request information about data collection
   */
  async provideDataCollectionInfo(_userId: string): Promise<{
    categoriesCollected: string[];
    purposesOfCollection: string[];
    categoriesOfSources: string[];
    thirdPartiesSharedWith: string[];
  }> {
    return {
      categoriesCollected: [
        "Personal identifiers (name, email, phone)",
        "Financial information (credit reports, account numbers)",
        "Internet activity (AI interactions, usage logs)",
        "Geolocation data (IP address)",
      ],
      purposesOfCollection: [
        "Providing credit repair services",
        "Generating dispute letters",
        "Credit report analysis",
        "Customer support",
        "Service improvement",
      ],
      categoriesOfSources: [
        "Directly from user",
        "Credit bureaus",
        "Public records",
        "Automated technologies (cookies, logs)",
      ],
      thirdPartiesSharedWith: [
        "AI service providers (AIML API)",
        "Credit bureaus",
        "Payment processors",
        "Analytics providers",
      ],
    };
  }

  /**
   * Right to Delete (CCPA §1798.105)
   * Delegates to the GDPR erasure implementation which handles full cascade.
   */
  async deleteConsumerData(userId: string): Promise<DataDeletionRequest> {
    return this.gdpr.deleteUserData(userId, "CCPA §1798.105 deletion request");
  }

  /**
   * Right to Opt-Out (CCPA §1798.120)
   * User can opt-out of sale of personal information
   */
  async optOutOfSale(userId: string): Promise<boolean> {
    const { error } = await this.db.from("consent_records").insert({
      user_id: userId,
      consent_type: "data_sharing",
      granted: false,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Opt-out failed: ${error.message}`);
    }

    await this.db.from("audit_logs").insert({
      user_id: userId,
      action: "ccpa_opt_out_sale",
      details: { opted_out: true },
      created_at: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Right to Non-Discrimination (CCPA §1798.125)
   * Cannot discriminate against users who exercise their rights
   */
  async ensureNonDiscrimination(_userId: string): Promise<boolean> {
    return true;
  }

  /**
   * Do Not Sell My Personal Information
   */
  async doNotSell(userId: string): Promise<boolean> {
    return this.optOutOfSale(userId);
  }
}

/**
 * Consent Management Service
 *
 * Persists consent as an append-only history in `consent_records`.
 * GDPR Art. 7 requires demonstrable consent over time — every consent event
 * is a new INSERT, never an UPDATE or upsert. "Current consent" for a given
 * (user, type) is the latest row ordered by `timestamp DESC`.
 */
export class ConsentManagementService {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db ?? (supabaseAdmin as unknown as DbClient);
  }

  /**
   * Record user consent — appends a new row; never overwrites history.
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    const { error } = await this.db.from("consent_records").insert({
      user_id: consent.userId,
      consent_type: consent.consentType,
      granted: consent.granted,
      timestamp: consent.timestamp.toISOString(),
      ip_address: consent.ipAddress ?? null,
      user_agent: consent.userAgent ?? null,
    });

    if (error) {
      throw new Error(`Failed to record consent: ${error.message}`);
    }
  }

  /**
   * Check if user currently has consent for a given type.
   * Returns the `granted` value of the most recent row by `timestamp`.
   *
   * Uses `.maybeSingle()` rather than `.single()` so that "no rows" resolves
   * to `{ data: null, error: null }` (→ false) instead of triggering PGRST116.
   * A genuine DB error (non-zero `error` with data still null) is surfaced as a
   * thrown exception rather than silently becoming `false`.
   *
   * Tie-break: two rows with identical `timestamp` have DB-defined ordering;
   * in practice this should not occur because consent events are timestamped at
   * call time and the UI prevents rapid double-submission.
   */
  async hasConsent(
    userId: string,
    consentType: ConsentRecord["consentType"],
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from("consent_records")
      .select("granted")
      .eq("user_id", userId)
      .eq("consent_type", consentType)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read consent: ${error.message}`);
    }
    if (!data) return false;
    return (data as { granted: boolean }).granted;
  }

  /**
   * Withdraw consent by appending a granted=false event.
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentRecord["consentType"],
  ): Promise<void> {
    await this.recordConsent({
      userId,
      consentType,
      granted: false,
      timestamp: new Date(),
    });
  }

  /**
   * Get all consent events for user, ordered by timestamp descending.
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const { data, error } = await this.db
      .from("consent_records")
      .select("user_id, consent_type, granted, timestamp, ip_address, user_agent")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    // A list query's "no rows" case is `{ data: [], error: null }` — a real,
    // non-null error must propagate rather than being reported as "no
    // consent history," which both the Art. 15 export and the consent route
    // treat as ground truth.
    if (error) {
      throw new Error(`Failed to read consent history: ${error.message}`);
    }
    if (!data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => ({
      userId: row.user_id as string,
      consentType: row.consent_type as ConsentRecord["consentType"],
      granted: row.granted as boolean,
      timestamp: new Date(row.timestamp as string),
      ipAddress: (row.ip_address as string | null) ?? undefined,
      userAgent: (row.user_agent as string | null) ?? undefined,
    }));
  }

  /**
   * Export full consent history as a JSON string.
   */
  async exportConsentHistory(userId: string): Promise<string> {
    const consents = await this.getUserConsents(userId);
    return JSON.stringify(consents, null, 2);
  }
}

// Export singleton instances
export const gdprService = new GDPRComplianceService();
export const ccpaService = new CCPAComplianceService();
export const consentService = new ConsentManagementService();

/**
 * Privacy policy template
 */
export const PRIVACY_POLICY_TEMPLATE = {
  lastUpdated: new Date().toISOString(),
  sections: [
    {
      title: "Information We Collect",
      content:
        "We collect personal identifiers, financial information, and usage data.",
    },
    {
      title: "How We Use Your Information",
      content:
        "We use your information to provide credit repair services and improve our platform.",
    },
    {
      title: "Data Sharing",
      content:
        "We share data with AI service providers, credit bureaus, and payment processors.",
    },
    {
      title: "Your Rights",
      content:
        "You have the right to access, rectify, delete, and port your data.",
    },
    {
      title: "Data Security",
      content:
        "We implement industry-standard security measures to protect your data.",
    },
    {
      title: "Cookies",
      content: "We use cookies for analytics and service improvement.",
    },
    {
      title: "Contact Us",
      content: "For privacy inquiries, contact privacy@fynvita.com",
    },
  ],
};

/**
 * Cookie consent banner configuration
 */
export const COOKIE_CONSENT_CONFIG = {
  categories: [
    {
      id: "necessary",
      name: "Necessary Cookies",
      description: "Required for the website to function",
      required: true,
    },
    {
      id: "analytics",
      name: "Analytics Cookies",
      description: "Help us understand how you use our website",
      required: false,
    },
    {
      id: "marketing",
      name: "Marketing Cookies",
      description: "Used to show relevant advertisements",
      required: false,
    },
  ],
};
