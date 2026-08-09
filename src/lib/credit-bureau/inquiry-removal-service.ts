/**
 * Inquiry Removal Service
 *
 * Dedicated service for managing the lifecycle of hard inquiry removals
 * from credit reports. Provides:
 *
 * - Hard/soft inquiry classification and tracking
 * - Expired inquiry identification (>24 months per FCRA Section 605)
 * - Dispute letter generation with FCRA-compliant templates
 * - Inquiry removal request lifecycle management via Supabase
 * - Outcome tracking (pending -> submitted -> resolved/rejected)
 * - Bulk removal request generation
 * - Inquiry analytics (age distribution, removal eligibility)
 *
 * All letter templates comply with FCRA Sections 604, 605, and 611.
 */

import { getSupabase } from "@/lib/supabase/client";
import type {
  Bureau,
  ParsedCreditReport,
  CreditInquiry,
} from "@/types/credit-bureau";

// =====================================================
// TYPES
// =====================================================

/** Status of an inquiry removal request lifecycle */
export type InquiryRemovalStatus =
  | "identified"
  | "letter_generated"
  | "submitted"
  | "acknowledged"
  | "resolved_removed"
  | "resolved_verified"
  | "rejected"
  | "expired";

/** Reason for requesting inquiry removal */
export type RemovalReason =
  | "expired_over_24_months"
  | "unauthorized_inquiry"
  | "no_permissible_purpose"
  | "duplicate_inquiry"
  | "identity_theft";

/** An inquiry identified for potential removal */
export interface InquiryForRemoval {
  inquiryIndex: number;
  creditorName: string;
  inquiryDate: Date;
  inquiryType: "hard" | "soft";
  ageInMonths: number;
  bureau: Bureau;
  reason: RemovalReason;
  isEligible: boolean;
  eligibilityNote: string;
}

/** A generated dispute letter for inquiry removal */
export interface InquiryRemovalLetter {
  bureau: Bureau;
  bureauAddress: string;
  creditorName: string;
  inquiryDate: string;
  reason: RemovalReason;
  legalBasis: string;
  letterBody: string;
  generatedAt: Date;
}

/** Persistent record for tracking inquiry removal outcomes */
export interface InquiryRemovalRecord {
  id?: string;
  user_id: string;
  bureau: Bureau;
  creditor_name: string;
  inquiry_date: string;
  reason: RemovalReason;
  status: InquiryRemovalStatus;
  letter_generated: boolean;
  submitted_at: string | null;
  response_received_at: string | null;
  outcome_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Summary of inquiry analysis for a credit report */
export interface InquiryAnalysisSummary {
  totalInquiries: number;
  hardInquiries: number;
  softInquiries: number;
  expiredHardInquiries: number;
  eligibleForRemoval: number;
  averageAgeMonths: number;
  oldestInquiryMonths: number;
  newestInquiryMonths: number;
  inquiriesByBureau: Record<Bureau, number>;
  ageDistribution: {
    under6Months: number;
    sixTo12Months: number;
    twelveToEighteenMonths: number;
    eighteenTo24Months: number;
    over24Months: number;
  };
}

/** Result of a bulk removal request operation */
export interface BulkRemovalResult {
  total: number;
  lettersGenerated: number;
  recordsCreated: number;
  errors: Array<{ creditorName: string; error: string }>;
}

// =====================================================
// CONSTANTS
// =====================================================

/** Hard inquiries older than 24 months are eligible for removal */
const HARD_INQUIRY_EXPIRY_MONTHS = 24;

/** Bureau mailing addresses for dispute letters */
const BUREAU_ADDRESSES: Record<Bureau, string> = {
  experian: [
    "Experian",
    "P.O. Box 4500",
    "Allen, TX 75013",
  ].join("\n"),
  equifax: [
    "Equifax Information Services LLC",
    "P.O. Box 740256",
    "Atlanta, GA 30374",
  ].join("\n"),
  transunion: [
    "TransUnion LLC",
    "Consumer Dispute Center",
    "P.O. Box 2000",
    "Chester, PA 19016",
  ].join("\n"),
};

/** Legal basis text for each removal reason */
const LEGAL_BASIS: Record<RemovalReason, string> = {
  expired_over_24_months:
    "FCRA Section 605(a)(3) - Inquiries older than 24 months must be removed from credit reports",
  unauthorized_inquiry:
    "FCRA Section 604 - Credit reports may only be furnished for permissible purposes. This inquiry was not authorized by the consumer.",
  no_permissible_purpose:
    "FCRA Section 604(a) - The inquiring party did not have a permissible purpose to access the consumer's credit report.",
  duplicate_inquiry:
    "FCRA Section 611 - Duplicate reporting of the same inquiry is inaccurate and must be corrected.",
  identity_theft:
    "FCRA Section 605B - Information resulting from identity theft must be blocked from the consumer's report within 4 business days.",
};

// =====================================================
// MAIN SERVICE CLASS
// =====================================================

/**
 * Inquiry Removal Service
 *
 * Manages the full lifecycle of hard inquiry removal requests,
 * from identification through dispute letter generation to
 * outcome tracking.
 */
export class InquiryRemovalService {
  // ===================================================
  // INQUIRY TRACKING & ANALYSIS
  // ===================================================

  /**
   * Analyze all inquiries in a credit report and classify them
   * by type, age, and removal eligibility.
   */
  analyzeInquiries(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): InquiryAnalysisSummary {
    const now = new Date();
    const inquiries = report.inquiries;

    let hardCount = 0;
    let softCount = 0;
    let expiredHard = 0;
    let totalAgeMonths = 0;
    let oldestAge = 0;
    let newestAge = Infinity;

    const ageDistribution = {
      under6Months: 0,
      sixTo12Months: 0,
      twelveToEighteenMonths: 0,
      eighteenTo24Months: 0,
      over24Months: 0,
    };

    for (const inquiry of inquiries) {
      const inquiryDate = new Date(inquiry.inquiryDate);
      const ageInMonths =
        (now.getFullYear() - inquiryDate.getFullYear()) * 12 +
        (now.getMonth() - inquiryDate.getMonth());

      totalAgeMonths += ageInMonths;
      if (ageInMonths > oldestAge) oldestAge = ageInMonths;
      if (ageInMonths < newestAge) newestAge = ageInMonths;

      // Classify by age
      if (ageInMonths < 6) {
        ageDistribution.under6Months++;
      } else if (ageInMonths < 12) {
        ageDistribution.sixTo12Months++;
      } else if (ageInMonths < 18) {
        ageDistribution.twelveToEighteenMonths++;
      } else if (ageInMonths < 24) {
        ageDistribution.eighteenTo24Months++;
      } else {
        ageDistribution.over24Months++;
      }

      if (inquiry.inquiryType === "hard") {
        hardCount++;
        if (ageInMonths >= HARD_INQUIRY_EXPIRY_MONTHS) {
          expiredHard++;
        }
      } else {
        softCount++;
      }
    }

    const inquiriesByBureau: Record<Bureau, number> = {
      experian: 0,
      equifax: 0,
      transunion: 0,
    };
    inquiriesByBureau[bureau] = inquiries.length;

    return {
      totalInquiries: inquiries.length,
      hardInquiries: hardCount,
      softInquiries: softCount,
      expiredHardInquiries: expiredHard,
      eligibleForRemoval: expiredHard,
      averageAgeMonths: inquiries.length > 0 ? Math.round(totalAgeMonths / inquiries.length) : 0,
      oldestInquiryMonths: inquiries.length > 0 ? oldestAge : 0,
      newestInquiryMonths: inquiries.length > 0 && newestAge !== Infinity ? newestAge : 0,
      inquiriesByBureau,
      ageDistribution,
    };
  }

  /**
   * Identify all hard inquiries eligible for removal (expired or unauthorized).
   */
  identifyRemovableInquiries(
    report: ParsedCreditReport,
    bureau: Bureau,
    unauthorizedCreditors?: string[],
  ): InquiryForRemoval[] {
    const now = new Date();
    const removable: InquiryForRemoval[] = [];
    const unauthorizedSet = new Set(
      (unauthorizedCreditors ?? []).map((c) => c.toLowerCase()),
    );

    report.inquiries.forEach((inquiry, index) => {
      if (inquiry.inquiryType !== "hard") return;

      const inquiryDate = new Date(inquiry.inquiryDate);
      const ageInMonths =
        (now.getFullYear() - inquiryDate.getFullYear()) * 12 +
        (now.getMonth() - inquiryDate.getMonth());

      // Check for expired inquiry
      if (ageInMonths >= HARD_INQUIRY_EXPIRY_MONTHS) {
        removable.push({
          inquiryIndex: index,
          creditorName: inquiry.creditorName,
          inquiryDate,
          inquiryType: "hard",
          ageInMonths,
          bureau,
          reason: "expired_over_24_months",
          isEligible: true,
          eligibilityNote: `Inquiry is ${ageInMonths} months old, exceeding the 24-month FCRA threshold`,
        });
        return;
      }

      // Check for unauthorized inquiry
      if (unauthorizedSet.has(inquiry.creditorName.toLowerCase())) {
        removable.push({
          inquiryIndex: index,
          creditorName: inquiry.creditorName,
          inquiryDate,
          inquiryType: "hard",
          ageInMonths,
          bureau,
          reason: "unauthorized_inquiry",
          isEligible: true,
          eligibilityNote: "Inquiry was flagged as unauthorized by the consumer",
        });
      }
    });

    return removable;
  }

  // ===================================================
  // DISPUTE LETTER GENERATION
  // ===================================================

  /**
   * Generate a FCRA-compliant dispute letter for a single inquiry removal.
   */
  generateRemovalLetter(
    creditorName: string,
    inquiryDate: Date,
    bureau: Bureau,
    reason: RemovalReason = "expired_over_24_months",
    consumerName?: string,
  ): InquiryRemovalLetter {
    const dateStr = inquiryDate.toISOString().split("T")[0];
    const bureauName = this.getBureauDisplayName(bureau);
    const bureauAddress = BUREAU_ADDRESSES[bureau];
    const legalBasis = LEGAL_BASIS[reason];
    const name = consumerName ?? "[Your Full Legal Name]";
    const today = new Date().toISOString().split("T")[0];

    let letterBody: string;

    switch (reason) {
      case "expired_over_24_months":
        letterBody = this.buildExpiredInquiryLetter(
          name, today, bureauName, creditorName, dateStr, legalBasis,
        );
        break;
      case "unauthorized_inquiry":
        letterBody = this.buildUnauthorizedInquiryLetter(
          name, today, bureauName, creditorName, dateStr, legalBasis,
        );
        break;
      case "identity_theft":
        letterBody = this.buildIdentityTheftInquiryLetter(
          name, today, bureauName, creditorName, dateStr, legalBasis,
        );
        break;
      case "no_permissible_purpose":
        letterBody = this.buildNoPermissiblePurposeLetter(
          name, today, bureauName, creditorName, dateStr, legalBasis,
        );
        break;
      case "duplicate_inquiry":
        letterBody = this.buildDuplicateInquiryLetter(
          name, today, bureauName, creditorName, dateStr, legalBasis,
        );
        break;
      default: {
        const _exhaustive: never = reason;
        throw new Error(`Unknown removal reason: ${_exhaustive}`);
      }
    }

    return {
      bureau,
      bureauAddress,
      creditorName,
      inquiryDate: dateStr,
      reason,
      legalBasis,
      letterBody,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate removal letters for all eligible inquiries in a report.
   */
  generateBulkRemovalLetters(
    report: ParsedCreditReport,
    bureau: Bureau,
    unauthorizedCreditors?: string[],
    consumerName?: string,
  ): InquiryRemovalLetter[] {
    const removable = this.identifyRemovableInquiries(
      report,
      bureau,
      unauthorizedCreditors,
    );

    return removable.map((inquiry) =>
      this.generateRemovalLetter(
        inquiry.creditorName,
        inquiry.inquiryDate,
        bureau,
        inquiry.reason,
        consumerName,
      ),
    );
  }

  // ===================================================
  // OUTCOME TRACKING (Supabase)
  // ===================================================

  /**
   * Create a new inquiry removal tracking record.
   */
  async createRemovalRecord(
    userId: string,
    inquiry: InquiryForRemoval,
    letterGenerated: boolean,
  ): Promise<InquiryRemovalRecord> {
    const now = new Date().toISOString();
    const record: InquiryRemovalRecord = {
      user_id: userId,
      bureau: inquiry.bureau,
      creditor_name: inquiry.creditorName,
      inquiry_date: inquiry.inquiryDate.toISOString().split("T")[0],
      reason: inquiry.reason,
      status: letterGenerated ? "letter_generated" : "identified",
      letter_generated: letterGenerated,
      submitted_at: null,
      response_received_at: null,
      outcome_notes: null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await getSupabase()
      .from("inquiry_removal_requests")
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create removal record: ${error.message}`);
    }

    return data as InquiryRemovalRecord;
  }

  /**
   * Update the status of an inquiry removal request.
   */
  async updateRemovalStatus(
    recordId: string,
    status: InquiryRemovalStatus,
    notes?: string,
  ): Promise<void> {
    const updates: Partial<InquiryRemovalRecord> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updates.outcome_notes = notes;
    }

    if (status === "submitted") {
      updates.submitted_at = new Date().toISOString();
    }

    if (
      status === "resolved_removed" ||
      status === "resolved_verified" ||
      status === "rejected"
    ) {
      updates.response_received_at = new Date().toISOString();
    }

    const { error } = await getSupabase()
      .from("inquiry_removal_requests")
      .update(updates)
      .eq("id", recordId);

    if (error) {
      throw new Error(`Failed to update removal status: ${error.message}`);
    }
  }

  /**
   * Retrieve all inquiry removal records for a user.
   */
  async getRemovalRecords(
    userId: string,
    bureau?: Bureau,
    status?: InquiryRemovalStatus,
  ): Promise<InquiryRemovalRecord[]> {
    let query = getSupabase()
      .from("inquiry_removal_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (bureau) {
      query = query.eq("bureau", bureau);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve removal records: ${error.message}`);
    }

    return (data ?? []) as InquiryRemovalRecord[];
  }

  /**
   * Get a summary of removal outcomes for a user.
   */
  async getRemovalOutcomeSummary(
    userId: string,
  ): Promise<{
    total: number;
    pending: number;
    successful: number;
    rejected: number;
    successRate: number;
  }> {
    const records = await this.getRemovalRecords(userId);

    const pending = records.filter((r) =>
      ["identified", "letter_generated", "submitted", "acknowledged"].includes(r.status),
    ).length;

    const successful = records.filter((r) =>
      ["resolved_removed", "resolved_verified"].includes(r.status),
    ).length;

    const rejected = records.filter((r) => r.status === "rejected").length;

    const resolved = successful + rejected;
    const successRate = resolved > 0 ? (successful / resolved) * 100 : 0;

    return {
      total: records.length,
      pending,
      successful,
      rejected,
      successRate: Math.round(successRate * 10) / 10,
    };
  }

  /**
   * Process a bulk removal request: identify eligible inquiries,
   * generate letters, and create tracking records.
   */
  async processBulkRemoval(
    userId: string,
    report: ParsedCreditReport,
    bureau: Bureau,
    unauthorizedCreditors?: string[],
    consumerName?: string,
  ): Promise<BulkRemovalResult> {
    const removable = this.identifyRemovableInquiries(
      report,
      bureau,
      unauthorizedCreditors,
    );

    const result: BulkRemovalResult = {
      total: removable.length,
      lettersGenerated: 0,
      recordsCreated: 0,
      errors: [],
    };

    for (const inquiry of removable) {
      try {
        // Generate letter
        this.generateRemovalLetter(
          inquiry.creditorName,
          inquiry.inquiryDate,
          bureau,
          inquiry.reason,
          consumerName,
        );
        result.lettersGenerated++;

        // Create tracking record
        await this.createRemovalRecord(userId, inquiry, true);
        result.recordsCreated++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({
          creditorName: inquiry.creditorName,
          error: message,
        });
      }
    }

    return result;
  }

  // ===================================================
  // PRIVATE HELPERS — Letter Templates
  // ===================================================

  private buildExpiredInquiryLetter(
    name: string,
    today: string,
    bureauName: string,
    creditorName: string,
    inquiryDate: string,
    legalBasis: string,
  ): string {
    return [
      `Date: ${today}`,
      ``,
      `To: ${bureauName}`,
      ``,
      `From: ${name}`,
      ``,
      `Re: Removal of Expired Hard Inquiry`,
      ``,
      `Dear ${bureauName} Dispute Department,`,
      ``,
      `I am writing to request the immediate removal of the following expired hard inquiry from my credit report:`,
      ``,
      `  Creditor: ${creditorName}`,
      `  Inquiry Date: ${inquiryDate}`,
      ``,
      `This inquiry has exceeded the 24-month reporting period established by the Fair Credit Reporting Act (FCRA). Specifically:`,
      ``,
      `  ${legalBasis}`,
      ``,
      `Under FCRA Section 611, you are required to investigate this dispute within 30 days of receipt and remove any information that cannot be verified or that violates the reporting time limits set forth in Section 605.`,
      ``,
      `I request that this expired inquiry be removed from my credit report immediately and that you send me written confirmation of the removal within 30 days.`,
      ``,
      `Please send all correspondence to the address listed above. Thank you for your prompt attention to this matter.`,
      ``,
      `Sincerely,`,
      `${name}`,
    ].join("\n");
  }

  private buildUnauthorizedInquiryLetter(
    name: string,
    today: string,
    bureauName: string,
    creditorName: string,
    inquiryDate: string,
    legalBasis: string,
  ): string {
    return [
      `Date: ${today}`,
      ``,
      `To: ${bureauName}`,
      ``,
      `From: ${name}`,
      ``,
      `Re: Removal of Unauthorized Hard Inquiry`,
      ``,
      `Dear ${bureauName} Dispute Department,`,
      ``,
      `I am writing to dispute the following hard inquiry on my credit report, which was made without my knowledge or authorization:`,
      ``,
      `  Creditor: ${creditorName}`,
      `  Inquiry Date: ${inquiryDate}`,
      ``,
      `I did not apply for credit with ${creditorName} and did not authorize this inquiry. Under the Fair Credit Reporting Act:`,
      ``,
      `  ${legalBasis}`,
      ``,
      `I request that you investigate this inquiry and remove it from my credit report. If ${creditorName} cannot demonstrate a valid permissible purpose for this inquiry, it must be removed per FCRA Section 604.`,
      ``,
      `Please send me written confirmation of the resolution within 30 days.`,
      ``,
      `Sincerely,`,
      `${name}`,
    ].join("\n");
  }

  private buildIdentityTheftInquiryLetter(
    name: string,
    today: string,
    bureauName: string,
    creditorName: string,
    inquiryDate: string,
    legalBasis: string,
  ): string {
    return [
      `Date: ${today}`,
      ``,
      `To: ${bureauName}`,
      ``,
      `From: ${name}`,
      ``,
      `Re: Identity Theft — Block and Remove Fraudulent Inquiry`,
      ``,
      `Dear ${bureauName} Dispute Department,`,
      ``,
      `I am a victim of identity theft. I am writing to request the blocking and removal of the following fraudulent inquiry from my credit report:`,
      ``,
      `  Creditor: ${creditorName}`,
      `  Inquiry Date: ${inquiryDate}`,
      ``,
      `This inquiry was made as a result of identity theft and I did not authorize it. Under the Fair Credit Reporting Act:`,
      ``,
      `  ${legalBasis}`,
      ``,
      `I have enclosed/attached a copy of my identity theft report. Please block this inquiry within 4 business days as required by law.`,
      ``,
      `Sincerely,`,
      `${name}`,
    ].join("\n");
  }

  private buildNoPermissiblePurposeLetter(
    name: string,
    today: string,
    bureauName: string,
    creditorName: string,
    inquiryDate: string,
    legalBasis: string,
  ): string {
    return [
      `Date: ${today}`,
      ``,
      `To: ${bureauName}`,
      ``,
      `From: ${name}`,
      ``,
      `Re: Removal of Inquiry Without Permissible Purpose`,
      ``,
      `Dear ${bureauName} Dispute Department,`,
      ``,
      `I am disputing the following hard inquiry on my credit report, as the inquiring party did not have a permissible purpose to access my consumer report:`,
      ``,
      `  Creditor: ${creditorName}`,
      `  Inquiry Date: ${inquiryDate}`,
      ``,
      `Under the Fair Credit Reporting Act:`,
      ``,
      `  ${legalBasis}`,
      ``,
      `I request that you verify the permissible purpose for this inquiry with ${creditorName}. If no valid permissible purpose can be demonstrated, I demand immediate removal of this inquiry from my credit report.`,
      ``,
      `Sincerely,`,
      `${name}`,
    ].join("\n");
  }

  private buildDuplicateInquiryLetter(
    name: string,
    today: string,
    bureauName: string,
    creditorName: string,
    inquiryDate: string,
    legalBasis: string,
  ): string {
    return [
      `Date: ${today}`,
      ``,
      `To: ${bureauName}`,
      ``,
      `From: ${name}`,
      ``,
      `Re: Removal of Duplicate Inquiry`,
      ``,
      `Dear ${bureauName} Dispute Department,`,
      ``,
      `I am writing to request the removal of a duplicate hard inquiry from my credit report:`,
      ``,
      `  Creditor: ${creditorName}`,
      `  Inquiry Date: ${inquiryDate}`,
      ``,
      `This inquiry appears to be a duplicate of an existing inquiry. Under the Fair Credit Reporting Act:`,
      ``,
      `  ${legalBasis}`,
      ``,
      `Please investigate and remove the duplicate entry. Send written confirmation within 30 days.`,
      ``,
      `Sincerely,`,
      `${name}`,
    ].join("\n");
  }

  // ===================================================
  // PRIVATE HELPERS — Bureau Info
  // ===================================================

  private getBureauDisplayName(bureau: Bureau): string {
    switch (bureau) {
      case "experian":
        return "Experian";
      case "equifax":
        return "Equifax";
      case "transunion":
        return "TransUnion";
      default: {
        const _exhaustive: never = bureau;
        return String(_exhaustive);
      }
    }
  }
}

// Export singleton instance
export const inquiryRemovalService = new InquiryRemovalService();
export default inquiryRemovalService;
