/**
 * Credit Error Detector Service
 *
 * Dedicated service for detecting errors, inconsistencies, and identity theft
 * indicators in credit reports. Extends the parser's inline detection with:
 *
 * - Comprehensive identity theft risk assessment
 * - Persistent error tracking via Supabase
 * - Severity-weighted risk scoring
 * - FCRA-compliant remediation recommendations
 * - Multi-report trend analysis for recurring errors
 *
 * All detection methods are stateless and deterministic given the same input,
 * making them easy to test without database dependencies.
 */

import { getSupabase } from "@/lib/supabase/client";
import type {
  Bureau,
  ParsedCreditReport,
  PersonalInfo,
} from "@/types/credit-bureau";
import type {
  CreditReportError,
  CreditReportErrors,
  CreditReportErrorSeverity,
  CreditReportErrorType,
  CrossBureauDiscrepancy,
} from "./credit-report-parser";

// =====================================================
// IDENTITY THEFT TYPES
// =====================================================

/** Risk level for identity theft assessment */
export type IdentityTheftRiskLevel = "none" | "low" | "moderate" | "high" | "critical";

/** Individual indicator of potential identity theft */
export interface IdentityTheftIndicator {
  type: IdentityTheftIndicatorType;
  severity: CreditReportErrorSeverity;
  description: string;
  evidence: string;
  recommendedAction: string;
  legalBasis: string;
}

/** Categories of identity theft indicators */
export type IdentityTheftIndicatorType =
  | "unknown_account"
  | "name_variation"
  | "address_mismatch"
  | "ssn_mismatch"
  | "unauthorized_inquiry"
  | "rapid_account_opening"
  | "mixed_file"
  | "address_in_unknown_state"
  | "unknown_employer"
  | "age_discrepancy";

/** Full identity theft assessment result */
export interface IdentityTheftAssessment {
  riskLevel: IdentityTheftRiskLevel;
  riskScore: number; // 0-100
  indicators: IdentityTheftIndicator[];
  indicatorCount: number;
  criticalIndicators: number;
  recommendedActions: string[];
  shouldFreezeCredit: boolean;
  shouldFilePoliceReport: boolean;
  assessedAt: Date;
  bureau: Bureau;
}

/** Persistent error record for database storage */
export interface DetectedErrorRecord {
  id?: string;
  user_id: string;
  bureau: Bureau;
  error_type: CreditReportErrorType;
  severity: CreditReportErrorSeverity;
  description: string;
  suggested_action: string;
  affected_field: string;
  legal_basis: string | null;
  status: "open" | "disputed" | "resolved" | "dismissed";
  detected_at: string;
  resolved_at: string | null;
}

/** Error trend analysis over multiple scans */
export interface ErrorTrendAnalysis {
  userId: string;
  bureau: Bureau;
  totalScans: number;
  recurringErrors: Array<{
    errorType: CreditReportErrorType;
    occurrenceCount: number;
    firstDetected: string;
    lastDetected: string;
    isResolved: boolean;
  }>;
  newErrorsThisScan: number;
  resolvedSinceLastScan: number;
  overallTrend: "improving" | "stable" | "worsening";
  analyzedAt: Date;
}

// =====================================================
// CONSTANTS
// =====================================================

/** Severity weights used for risk scoring */
const SEVERITY_WEIGHTS: Record<CreditReportErrorSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

/** Identity theft indicator weights for risk scoring */
const INDICATOR_WEIGHTS: Record<IdentityTheftIndicatorType, number> = {
  unknown_account: 20,
  name_variation: 15,
  address_mismatch: 10,
  ssn_mismatch: 30,
  unauthorized_inquiry: 18,
  rapid_account_opening: 22,
  mixed_file: 25,
  address_in_unknown_state: 8,
  unknown_employer: 5,
  age_discrepancy: 12,
};

/** Threshold for number of new accounts in 90 days to flag rapid opening */
const RAPID_ACCOUNT_THRESHOLD = 3;

/** Number of days to look back for rapid account opening detection */
const RAPID_ACCOUNT_WINDOW_DAYS = 90;

// =====================================================
// MAIN SERVICE CLASS
// =====================================================

/**
 * Credit Error Detector
 *
 * Provides comprehensive error detection and identity theft assessment
 * for parsed credit reports. All detection methods are pure functions
 * that operate on the provided report data without side effects.
 *
 * Database persistence methods (save/load) are separate and optional.
 */
export class CreditErrorDetector {
  // ===================================================
  // COMPREHENSIVE ERROR DETECTION
  // ===================================================

  /**
   * Run a full error detection scan on a credit report.
   * Combines all detection categories into a single result.
   */
  detectAllErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
    knownPersonalInfo?: Partial<PersonalInfo>,
  ): CreditReportErrors {
    const errors: CreditReportError[] = [];

    errors.push(...this.detectPersonalInfoErrors(report, bureau, knownPersonalInfo));
    errors.push(...this.detectAccountErrors(report, bureau));
    errors.push(...this.detectInquiryErrors(report, bureau));
    errors.push(...this.detectPublicRecordErrors(report, bureau));
    errors.push(...this.detectDuplicateAccounts(report, bureau));
    errors.push(...this.detectDataConsistencyErrors(report, bureau));

    return this.buildErrorSummary(errors, bureau);
  }

  /**
   * Detect errors specifically related to personal information.
   */
  detectPersonalInfoErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
    knownInfo?: Partial<PersonalInfo>,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];
    const pi = report.personalInfo;

    // Missing first name
    if (!pi.firstName || pi.firstName.trim() === "") {
      errors.push({
        type: "missing_data",
        severity: "high",
        description: "First name is missing from the credit report",
        suggestedAction: "Contact the bureau to update your personal information",
        affectedField: "personalInfo.firstName",
        bureau,
        legalBasis: "FCRA Section 611 - Right to dispute incomplete information",
      });
    }

    // Missing last name
    if (!pi.lastName || pi.lastName.trim() === "") {
      errors.push({
        type: "missing_data",
        severity: "high",
        description: "Last name is missing from the credit report",
        suggestedAction: "Contact the bureau to update your personal information",
        affectedField: "personalInfo.lastName",
        bureau,
        legalBasis: "FCRA Section 611 - Right to dispute incomplete information",
      });
    }

    // Check against known personal info
    if (knownInfo) {
      if (
        knownInfo.firstName &&
        pi.firstName &&
        knownInfo.firstName.toLowerCase() !== pi.firstName.toLowerCase()
      ) {
        errors.push({
          type: "name_mismatch",
          severity: "critical",
          description: `First name mismatch: report shows "${pi.firstName}" but expected "${knownInfo.firstName}"`,
          suggestedAction: "File a dispute to correct the name on your credit report",
          affectedField: "personalInfo.firstName",
          bureau,
          legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
        });
      }

      if (
        knownInfo.lastName &&
        pi.lastName &&
        knownInfo.lastName.toLowerCase() !== pi.lastName.toLowerCase()
      ) {
        errors.push({
          type: "name_mismatch",
          severity: "critical",
          description: `Last name mismatch: report shows "${pi.lastName}" but expected "${knownInfo.lastName}"`,
          suggestedAction: "File a dispute to correct the name on your credit report",
          affectedField: "personalInfo.lastName",
          bureau,
          legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
        });
      }

      // Address state mismatch
      if (knownInfo.addresses && knownInfo.addresses.length > 0 && pi.addresses.length > 0) {
        const knownCurrent = knownInfo.addresses.find((a) => a.type === "current");
        const reportCurrent = pi.addresses.find((a) => a.type === "current");

        if (knownCurrent && reportCurrent) {
          if (knownCurrent.state.toLowerCase() !== reportCurrent.state.toLowerCase()) {
            errors.push({
              type: "address_error",
              severity: "high",
              description: `Current address state mismatch: report shows "${reportCurrent.state}" but expected "${knownCurrent.state}"`,
              suggestedAction: "File a dispute to update your current address with the bureau",
              affectedField: "personalInfo.addresses",
              bureau,
              legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
            });
          }
        }
      }

      // SSN mismatch
      if (knownInfo.ssn && pi.ssn && knownInfo.ssn !== pi.ssn) {
        errors.push({
          type: "identity_error",
          severity: "critical",
          description: "SSN on credit report does not match your known SSN",
          suggestedAction:
            "Immediately contact the bureau and consider placing a fraud alert or credit freeze",
          affectedField: "personalInfo.ssn",
          bureau,
          legalBasis: "FCRA Section 605A - Fraud alerts and active duty alerts",
        });
      }
    }

    return errors;
  }

  /**
   * Detect errors in credit accounts (balances, dates, statuses).
   */
  detectAccountErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];
    const now = new Date();

    report.accounts.forEach((account, index) => {
      // Negative balance
      if (account.balance < 0) {
        errors.push({
          type: "balance_mismatch",
          severity: "high",
          description: `Account with ${account.creditorName} shows negative balance of $${account.balance}`,
          suggestedAction: "Dispute the incorrect balance with the credit bureau",
          affectedField: `accounts[${index}].balance`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Balance exceeds credit limit by significant amount (>150%)
      if (
        account.creditLimit &&
        account.creditLimit > 0 &&
        account.balance > account.creditLimit * 1.5
      ) {
        errors.push({
          type: "balance_mismatch",
          severity: "medium",
          description: `Account with ${account.creditorName} balance ($${account.balance}) significantly exceeds credit limit ($${account.creditLimit})`,
          suggestedAction: "Verify the balance is accurate; dispute if incorrect",
          affectedField: `accounts[${index}].balance`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Payment status contradicts recent payment history
      const negativeStatuses = [
        "late_30",
        "late_60",
        "late_90",
        "late_120",
        "charge_off",
        "collection",
      ] as const;

      if (
        negativeStatuses.includes(
          account.paymentStatus as (typeof negativeStatuses)[number],
        )
      ) {
        const recentHistory = account.paymentHistory.slice(-3);
        const allRecentCurrent = recentHistory.every((h) => h.status === "current");

        if (allRecentCurrent && recentHistory.length >= 3) {
          errors.push({
            type: "incorrect_payment_status",
            severity: "high",
            description: `Account with ${account.creditorName} shows status "${account.paymentStatus}" but last 3 months of payment history are all current`,
            suggestedAction: "Dispute the incorrect payment status with the credit bureau",
            affectedField: `accounts[${index}].paymentStatus`,
            bureau,
            itemIndex: index,
            legalBasis: "FCRA Section 611 - Dispute of inaccurate payment information",
          });
        }
      }

      // Closed account with ongoing balance
      if (account.paymentStatus === "closed" && account.balance > 0) {
        errors.push({
          type: "account_discrepancy",
          severity: "medium",
          description: `Closed account with ${account.creditorName} still shows balance of $${account.balance}`,
          suggestedAction: "Verify if the balance is accurate for a closed account",
          affectedField: `accounts[${index}].balance`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Future opened date
      if (account.openedDate && new Date(account.openedDate) > now) {
        errors.push({
          type: "incorrect_date",
          severity: "high",
          description: `Account with ${account.creditorName} has a future opened date`,
          suggestedAction: "Dispute the incorrect account opening date",
          affectedField: `accounts[${index}].openedDate`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }
    });

    return errors;
  }

  /**
   * Detect errors in credit inquiries.
   */
  detectInquiryErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];
    const now = new Date();

    report.inquiries.forEach((inquiry, index) => {
      // Future inquiry date
      if (inquiry.inquiryDate && new Date(inquiry.inquiryDate) > now) {
        errors.push({
          type: "incorrect_date",
          severity: "high",
          description: `Inquiry from ${inquiry.creditorName} has a future date`,
          suggestedAction: "Dispute the inquiry with an incorrect date",
          affectedField: `inquiries[${index}].inquiryDate`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Expired hard inquiry still on report (>24 months)
      if (inquiry.inquiryType === "hard") {
        const inquiryDate = new Date(inquiry.inquiryDate);
        const ageInMonths =
          (now.getFullYear() - inquiryDate.getFullYear()) * 12 +
          (now.getMonth() - inquiryDate.getMonth());

        if (ageInMonths >= 24) {
          errors.push({
            type: "expired_inquiry",
            severity: "medium",
            description: `Hard inquiry from ${inquiry.creditorName} (${ageInMonths} months old) should have been removed after 24 months`,
            suggestedAction: "Request removal of the expired hard inquiry from the bureau",
            affectedField: `inquiries[${index}]`,
            bureau,
            itemIndex: index,
            legalBasis: "FCRA Section 605 - Inquiries must be removed after 2 years",
          });
        }
      }
    });

    return errors;
  }

  /**
   * Detect errors in public records (outdated records past 7-year reporting limit).
   */
  detectPublicRecordErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];

    report.publicRecords.forEach((record, index) => {
      if (record.filingDate) {
        const filingDate = new Date(record.filingDate);
        const ageInYears =
          (Date.now() - filingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        if (ageInYears > 7) {
          errors.push({
            type: "outdated_record",
            severity: "high",
            description: `Public record (${record.recordType}) filed ${Math.floor(ageInYears)} years ago exceeds the 7-year reporting limit`,
            suggestedAction: "Demand immediate removal citing FCRA Section 605",
            affectedField: `publicRecords[${index}]`,
            bureau,
            itemIndex: index,
            legalBasis: "FCRA Section 605 - 7-year reporting limit for negative items",
          });
        }
      }
    });

    return errors;
  }

  /**
   * Detect duplicate accounts in the report.
   */
  detectDuplicateAccounts(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];
    const seen = new Map<string, number>();

    report.accounts.forEach((account, index) => {
      const key = `${account.creditorName.toLowerCase()}|${account.accountNumber}`;
      const previousIndex = seen.get(key);

      if (previousIndex !== undefined) {
        errors.push({
          type: "duplicate_account",
          severity: "high",
          description: `Duplicate account detected: ${account.creditorName} (${account.accountNumber}) appears at positions ${previousIndex + 1} and ${index + 1}`,
          suggestedAction: "Dispute the duplicate account and request removal of one entry",
          affectedField: `accounts[${index}]`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Duplicate reporting is inaccurate",
        });
      } else {
        seen.set(key, index);
      }
    });

    return errors;
  }

  /**
   * Detect data consistency errors across a single report
   * (e.g., closed date before open date, mismatched totals).
   */
  detectDataConsistencyErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];

    report.accounts.forEach((account, index) => {
      // Closed date before opened date
      if (account.closedDate && account.openedDate) {
        const closed = new Date(account.closedDate);
        const opened = new Date(account.openedDate);
        if (closed < opened) {
          errors.push({
            type: "incorrect_date",
            severity: "high",
            description: `Account with ${account.creditorName} has a closed date before its opened date`,
            suggestedAction: "Dispute the incorrect dates with the credit bureau",
            affectedField: `accounts[${index}].closedDate`,
            bureau,
            itemIndex: index,
            legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
          });
        }
      }

      // Last payment date before opened date
      if (account.lastPaymentDate && account.openedDate) {
        const lastPayment = new Date(account.lastPaymentDate);
        const opened = new Date(account.openedDate);
        if (lastPayment < opened) {
          errors.push({
            type: "incorrect_date",
            severity: "medium",
            description: `Account with ${account.creditorName} has a last payment date before its opened date`,
            suggestedAction: "Dispute the incorrect payment date with the bureau",
            affectedField: `accounts[${index}].lastPaymentDate`,
            bureau,
            itemIndex: index,
            legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
          });
        }
      }
    });

    return errors;
  }

  // ===================================================
  // IDENTITY THEFT ASSESSMENT
  // ===================================================

  /**
   * Perform a comprehensive identity theft risk assessment.
   * Analyzes the report for multiple indicators of potential
   * identity theft and produces a risk score and action plan.
   */
  assessIdentityTheftRisk(
    report: ParsedCreditReport,
    bureau: Bureau,
    knownPersonalInfo: PersonalInfo,
    knownAccountCreditors?: string[],
  ): IdentityTheftAssessment {
    const indicators: IdentityTheftIndicator[] = [];

    // Check for name variations
    indicators.push(
      ...this.detectNameVariations(report, knownPersonalInfo, bureau),
    );

    // Check for address mismatches
    indicators.push(
      ...this.detectAddressMismatches(report, knownPersonalInfo, bureau),
    );

    // Check for SSN discrepancy
    indicators.push(
      ...this.detectSsnMismatch(report, knownPersonalInfo, bureau),
    );

    // Check for unknown accounts
    if (knownAccountCreditors && knownAccountCreditors.length > 0) {
      indicators.push(
        ...this.detectUnknownAccounts(report, knownAccountCreditors, bureau),
      );
    }

    // Check for rapid account opening
    indicators.push(
      ...this.detectRapidAccountOpening(report, bureau),
    );

    // Check for unauthorized inquiries (hard inquiries user doesn't recognize)
    indicators.push(
      ...this.detectUnauthorizedInquiries(report, knownAccountCreditors ?? [], bureau),
    );

    // Calculate risk score
    const riskScore = this.calculateIdentityTheftRiskScore(indicators);
    const riskLevel = this.classifyRiskLevel(riskScore);
    const criticalCount = indicators.filter((i) => i.severity === "critical").length;

    const recommendedActions = this.generateIdentityTheftActions(riskLevel, indicators);
    const shouldFreezeCredit = riskLevel === "critical" || riskLevel === "high";
    const shouldFilePoliceReport = riskLevel === "critical";

    return {
      riskLevel,
      riskScore,
      indicators,
      indicatorCount: indicators.length,
      criticalIndicators: criticalCount,
      recommendedActions,
      shouldFreezeCredit,
      shouldFilePoliceReport,
      assessedAt: new Date(),
      bureau,
    };
  }

  // ===================================================
  // ERROR SEVERITY SCORING
  // ===================================================

  /**
   * Calculate a weighted severity score from detected errors.
   * Higher scores indicate more serious or numerous issues.
   * Score range: 0 (no errors) to unbounded (many critical errors).
   */
  calculateSeverityScore(errors: CreditReportErrors): number {
    return errors.errors.reduce((score, error) => {
      return score + SEVERITY_WEIGHTS[error.severity];
    }, 0);
  }

  /**
   * Classify the overall severity of detected errors into a risk level.
   */
  classifyOverallSeverity(
    errors: CreditReportErrors,
  ): CreditReportErrorSeverity {
    if (errors.criticalCount > 0) return "critical";
    if (errors.highCount > 0) return "high";
    if (errors.mediumCount > 0) return "medium";
    if (errors.lowCount > 0) return "low";
    return "low";
  }

  /**
   * Generate a prioritized list of remediation actions based on detected errors.
   * Critical and high severity errors are prioritized first.
   */
  generateRemediationPlan(errors: CreditReportErrors): string[] {
    const actions: string[] = [];
    const sorted = [...errors.errors].sort((a, b) => {
      const order: Record<CreditReportErrorSeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return order[a.severity] - order[b.severity];
    });

    for (const error of sorted) {
      if (!actions.includes(error.suggestedAction)) {
        actions.push(error.suggestedAction);
      }
    }

    return actions;
  }

  // ===================================================
  // CROSS-BUREAU COMPARISON
  // ===================================================

  /**
   * Compare reports from different bureaus and detect cross-bureau
   * discrepancies. Wraps the comparison logic with additional
   * severity classification and remediation advice.
   */
  compareReports(
    reportA: ParsedCreditReport,
    bureauA: Bureau,
    reportB: ParsedCreditReport,
    bureauB: Bureau,
  ): CrossBureauDiscrepancy[] {
    const discrepancies: CrossBureauDiscrepancy[] = [];

    // Score comparison
    const scoreDiff = Math.abs(reportA.creditScore - reportB.creditScore);
    if (scoreDiff > 30) {
      discrepancies.push({
        field: "creditScore",
        bureauA,
        bureauB,
        valueA: String(reportA.creditScore),
        valueB: String(reportB.creditScore),
        severity: scoreDiff > 50 ? "high" : "medium",
        description: `Credit score differs by ${scoreDiff} points between ${bureauA} and ${bureauB}`,
      });
    }

    // Personal info comparison
    if (
      reportA.personalInfo.firstName.toLowerCase() !==
      reportB.personalInfo.firstName.toLowerCase()
    ) {
      discrepancies.push({
        field: "personalInfo.firstName",
        bureauA,
        bureauB,
        valueA: reportA.personalInfo.firstName,
        valueB: reportB.personalInfo.firstName,
        severity: "high",
        description: `First name mismatch: "${reportA.personalInfo.firstName}" vs "${reportB.personalInfo.firstName}"`,
      });
    }

    if (
      reportA.personalInfo.lastName.toLowerCase() !==
      reportB.personalInfo.lastName.toLowerCase()
    ) {
      discrepancies.push({
        field: "personalInfo.lastName",
        bureauA,
        bureauB,
        valueA: reportA.personalInfo.lastName,
        valueB: reportB.personalInfo.lastName,
        severity: "high",
        description: `Last name mismatch: "${reportA.personalInfo.lastName}" vs "${reportB.personalInfo.lastName}"`,
      });
    }

    // Account count comparison
    const accountDiff = Math.abs(
      reportA.accounts.length - reportB.accounts.length,
    );
    if (accountDiff > 2) {
      discrepancies.push({
        field: "accounts.count",
        bureauA,
        bureauB,
        valueA: String(reportA.accounts.length),
        valueB: String(reportB.accounts.length),
        severity: "medium",
        description: `Account count differs by ${accountDiff} between bureaus`,
      });
    }

    // Matching account comparison
    for (const accountA of reportA.accounts) {
      const matchingAccount = reportB.accounts.find(
        (b) =>
          b.creditorName.toLowerCase() === accountA.creditorName.toLowerCase() &&
          b.accountNumber === accountA.accountNumber,
      );

      if (matchingAccount) {
        const balanceDiff = Math.abs(accountA.balance - matchingAccount.balance);
        if (balanceDiff > 100) {
          discrepancies.push({
            field: `account.${accountA.creditorName}.balance`,
            bureauA,
            bureauB,
            valueA: String(accountA.balance),
            valueB: String(matchingAccount.balance),
            severity: balanceDiff > 1000 ? "high" : "medium",
            description: `Balance for ${accountA.creditorName} differs by $${balanceDiff.toFixed(2)}`,
          });
        }

        if (accountA.paymentStatus !== matchingAccount.paymentStatus) {
          discrepancies.push({
            field: `account.${accountA.creditorName}.paymentStatus`,
            bureauA,
            bureauB,
            valueA: accountA.paymentStatus,
            valueB: matchingAccount.paymentStatus,
            severity: "high",
            description: `Payment status differs for ${accountA.creditorName}: "${accountA.paymentStatus}" vs "${matchingAccount.paymentStatus}"`,
          });
        }
      }
    }

    return discrepancies;
  }

  // ===================================================
  // PERSISTENCE (Supabase)
  // ===================================================

  /**
   * Save detected errors to the database for historical tracking.
   */
  async saveDetectedErrors(
    userId: string,
    errors: CreditReportErrors,
  ): Promise<{ saved: number; failed: number }> {
    let saved = 0;
    let failed = 0;

    for (const error of errors.errors) {
      const record: DetectedErrorRecord = {
        user_id: userId,
        bureau: error.bureau,
        error_type: error.type,
        severity: error.severity,
        description: error.description,
        suggested_action: error.suggestedAction,
        affected_field: error.affectedField,
        legal_basis: error.legalBasis ?? null,
        status: "open",
        detected_at: new Date().toISOString(),
        resolved_at: null,
      };

      const { error: dbError } = await getSupabase()
        .from("credit_report_errors")
        .insert(record);

      if (dbError) {
        failed++;
      } else {
        saved++;
      }
    }

    return { saved, failed };
  }

  /**
   * Retrieve previously detected errors for a user.
   */
  async getDetectedErrors(
    userId: string,
    bureau?: Bureau,
    status?: DetectedErrorRecord["status"],
  ): Promise<DetectedErrorRecord[]> {
    let query = getSupabase()
      .from("credit_report_errors")
      .select("*")
      .eq("user_id", userId)
      .order("detected_at", { ascending: false });

    if (bureau) {
      query = query.eq("bureau", bureau);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve detected errors: ${error.message}`);
    }

    return (data ?? []) as DetectedErrorRecord[];
  }

  /**
   * Update the status of a detected error (e.g., mark as disputed or resolved).
   */
  async updateErrorStatus(
    errorId: string,
    status: DetectedErrorRecord["status"],
  ): Promise<void> {
    const updates: Partial<DetectedErrorRecord> = { status };
    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await getSupabase()
      .from("credit_report_errors")
      .update(updates)
      .eq("id", errorId);

    if (error) {
      throw new Error(`Failed to update error status: ${error.message}`);
    }
  }

  /**
   * Analyze error trends across multiple scans for a user.
   */
  async analyzeErrorTrends(
    userId: string,
    bureau: Bureau,
    currentErrors: CreditReportErrors,
  ): Promise<ErrorTrendAnalysis> {
    const previousErrors = await this.getDetectedErrors(userId, bureau);

    // Count occurrences of each error type
    const errorTypeCounts = new Map<
      CreditReportErrorType,
      { count: number; firstDetected: string; lastDetected: string; isResolved: boolean }
    >();

    for (const prevError of previousErrors) {
      const existing = errorTypeCounts.get(prevError.error_type);
      if (existing) {
        existing.count++;
        if (prevError.detected_at < existing.firstDetected) {
          existing.firstDetected = prevError.detected_at;
        }
        if (prevError.detected_at > existing.lastDetected) {
          existing.lastDetected = prevError.detected_at;
        }
        if (prevError.status !== "resolved") {
          existing.isResolved = false;
        }
      } else {
        errorTypeCounts.set(prevError.error_type, {
          count: 1,
          firstDetected: prevError.detected_at,
          lastDetected: prevError.detected_at,
          isResolved: prevError.status === "resolved",
        });
      }
    }

    // Determine new errors in current scan
    const previousTypes = new Set(previousErrors.map((e) => e.error_type));
    const currentTypes = new Set(currentErrors.errors.map((e) => e.type));
    const newErrors = currentErrors.errors.filter(
      (e) => !previousTypes.has(e.type),
    );

    // Determine resolved errors
    const resolvedCount = previousErrors.filter(
      (e) => e.status === "resolved" || !currentTypes.has(e.error_type),
    ).length;

    // Determine trend
    let trend: "improving" | "stable" | "worsening";
    if (currentErrors.totalCount < previousErrors.length) {
      trend = "improving";
    } else if (currentErrors.totalCount > previousErrors.length) {
      trend = "worsening";
    } else {
      trend = "stable";
    }

    const recurringErrors = Array.from(errorTypeCounts.entries()).map(
      ([errorType, data]) => ({
        errorType,
        occurrenceCount: data.count,
        firstDetected: data.firstDetected,
        lastDetected: data.lastDetected,
        isResolved: data.isResolved,
      }),
    );

    return {
      userId,
      bureau,
      totalScans: previousErrors.length > 0 ? Math.ceil(previousErrors.length / 5) + 1 : 1,
      recurringErrors,
      newErrorsThisScan: newErrors.length,
      resolvedSinceLastScan: resolvedCount,
      overallTrend: trend,
      analyzedAt: new Date(),
    };
  }

  // ===================================================
  // PRIVATE HELPERS — Identity Theft Detection
  // ===================================================

  private detectNameVariations(
    report: ParsedCreditReport,
    knownInfo: PersonalInfo,
    bureau: Bureau,
  ): IdentityTheftIndicator[] {
    const indicators: IdentityTheftIndicator[] = [];

    if (
      knownInfo.firstName &&
      report.personalInfo.firstName &&
      knownInfo.firstName.toLowerCase() !== report.personalInfo.firstName.toLowerCase()
    ) {
      indicators.push({
        type: "name_variation",
        severity: "high",
        description: `First name on report ("${report.personalInfo.firstName}") does not match known name ("${knownInfo.firstName}")`,
        evidence: `Report: ${report.personalInfo.firstName}, Known: ${knownInfo.firstName}`,
        recommendedAction: "Dispute the incorrect name and check for mixed file or identity theft",
        legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
      });
    }

    if (
      knownInfo.lastName &&
      report.personalInfo.lastName &&
      knownInfo.lastName.toLowerCase() !== report.personalInfo.lastName.toLowerCase()
    ) {
      indicators.push({
        type: "name_variation",
        severity: "high",
        description: `Last name on report ("${report.personalInfo.lastName}") does not match known name ("${knownInfo.lastName}")`,
        evidence: `Report: ${report.personalInfo.lastName}, Known: ${knownInfo.lastName}`,
        recommendedAction: "Dispute the incorrect name and investigate possible identity theft",
        legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
      });
    }

    void bureau;
    return indicators;
  }

  private detectAddressMismatches(
    report: ParsedCreditReport,
    knownInfo: PersonalInfo,
    bureau: Bureau,
  ): IdentityTheftIndicator[] {
    const indicators: IdentityTheftIndicator[] = [];

    if (knownInfo.addresses.length === 0 || report.personalInfo.addresses.length === 0) {
      return indicators;
    }

    const knownStates = new Set(
      knownInfo.addresses.map((a) => a.state.toLowerCase()),
    );

    // Check if report has addresses in states never associated with the consumer
    for (const addr of report.personalInfo.addresses) {
      if (!knownStates.has(addr.state.toLowerCase())) {
        indicators.push({
          type: "address_in_unknown_state",
          severity: "medium",
          description: `Report shows address in ${addr.state}, which is not in your known address history`,
          evidence: `Unknown state: ${addr.state}, Known states: ${[...knownStates].join(", ")}`,
          recommendedAction: "Verify this address. If unfamiliar, dispute and investigate for identity theft",
          legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
        });
      }
    }

    void bureau;
    return indicators;
  }

  private detectSsnMismatch(
    report: ParsedCreditReport,
    knownInfo: PersonalInfo,
    bureau: Bureau,
  ): IdentityTheftIndicator[] {
    const indicators: IdentityTheftIndicator[] = [];

    if (knownInfo.ssn && report.personalInfo.ssn && knownInfo.ssn !== report.personalInfo.ssn) {
      indicators.push({
        type: "ssn_mismatch",
        severity: "critical",
        description: "SSN on credit report does not match your known SSN — possible identity theft or mixed file",
        evidence: "SSN mismatch detected (details redacted for security)",
        recommendedAction:
          "Immediately place a fraud alert, freeze your credit with all three bureaus, and file a police report",
        legalBasis: "FCRA Section 605A - Fraud alerts and active duty alerts",
      });
    }

    void bureau;
    return indicators;
  }

  private detectUnknownAccounts(
    report: ParsedCreditReport,
    knownCreditors: string[],
    bureau: Bureau,
  ): IdentityTheftIndicator[] {
    const indicators: IdentityTheftIndicator[] = [];
    const knownSet = new Set(knownCreditors.map((c) => c.toLowerCase()));

    for (const account of report.accounts) {
      if (!knownSet.has(account.creditorName.toLowerCase())) {
        indicators.push({
          type: "unknown_account",
          severity: "high",
          description: `Account with "${account.creditorName}" is not recognized — possible fraudulent account`,
          evidence: `Account: ${account.creditorName}, Number: ${account.accountNumber}, Balance: $${account.balance}`,
          recommendedAction:
            "If you did not open this account, file a fraud dispute immediately and place a fraud alert",
          legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
        });
      }
    }

    void bureau;
    return indicators;
  }

  private detectRapidAccountOpening(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): IdentityTheftIndicator[] {
    const indicators: IdentityTheftIndicator[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RAPID_ACCOUNT_WINDOW_DAYS);

    const recentAccounts = report.accounts.filter((account) => {
      const opened = new Date(account.openedDate);
      return opened >= cutoff;
    });

    if (recentAccounts.length >= RAPID_ACCOUNT_THRESHOLD) {
      indicators.push({
        type: "rapid_account_opening",
        severity: "high",
        description: `${recentAccounts.length} accounts opened in the last ${RAPID_ACCOUNT_WINDOW_DAYS} days — possible identity theft pattern`,
        evidence: `Recent accounts: ${recentAccounts.map((a) => a.creditorName).join(", ")}`,
        recommendedAction:
          "If you did not open these accounts, freeze your credit immediately and file fraud disputes",
        legalBasis: "FCRA Section 605A - Fraud alerts and active duty alerts",
      });
    }

    void bureau;
    return indicators;
  }

  private detectUnauthorizedInquiries(
    report: ParsedCreditReport,
    knownCreditors: string[],
    bureau: Bureau,
  ): IdentityTheftIndicator[] {
    const indicators: IdentityTheftIndicator[] = [];
    const knownSet = new Set(knownCreditors.map((c) => c.toLowerCase()));

    for (const inquiry of report.inquiries) {
      if (
        inquiry.inquiryType === "hard" &&
        !knownSet.has(inquiry.creditorName.toLowerCase())
      ) {
        indicators.push({
          type: "unauthorized_inquiry",
          severity: "medium",
          description: `Hard inquiry from "${inquiry.creditorName}" was not authorized by you`,
          evidence: `Creditor: ${inquiry.creditorName}, Date: ${inquiry.inquiryDate instanceof Date ? inquiry.inquiryDate.toISOString().split("T")[0] : String(inquiry.inquiryDate)}`,
          recommendedAction:
            "Dispute the unauthorized inquiry with the bureau and contact the creditor to verify",
          legalBasis: "FCRA Section 604 - Permissible purposes of consumer reports",
        });
      }
    }

    void bureau;
    return indicators;
  }

  // ===================================================
  // PRIVATE HELPERS — Scoring and Classification
  // ===================================================

  private calculateIdentityTheftRiskScore(
    indicators: IdentityTheftIndicator[],
  ): number {
    if (indicators.length === 0) return 0;

    const rawScore = indicators.reduce((score, indicator) => {
      return score + (INDICATOR_WEIGHTS[indicator.type] ?? 10);
    }, 0);

    // Cap at 100
    return Math.min(rawScore, 100);
  }

  private classifyRiskLevel(riskScore: number): IdentityTheftRiskLevel {
    if (riskScore === 0) return "none";
    if (riskScore <= 15) return "low";
    if (riskScore <= 40) return "moderate";
    if (riskScore <= 70) return "high";
    return "critical";
  }

  private generateIdentityTheftActions(
    riskLevel: IdentityTheftRiskLevel,
    indicators: IdentityTheftIndicator[],
  ): string[] {
    const actions: string[] = [];

    if (riskLevel === "critical") {
      actions.push("URGENT: Place a credit freeze with all three bureaus immediately");
      actions.push("File a police report for identity theft");
      actions.push("File an identity theft report with the FTC at IdentityTheft.gov");
      actions.push("Contact all creditors listed on fraudulent accounts");
    } else if (riskLevel === "high") {
      actions.push("Place a fraud alert with all three bureaus");
      actions.push("Review all accounts carefully for unauthorized activity");
      actions.push("Consider placing a credit freeze");
    } else if (riskLevel === "moderate") {
      actions.push("Monitor your credit reports closely for the next 6 months");
      actions.push("Dispute any unrecognized items with the relevant bureau");
    } else if (riskLevel === "low") {
      actions.push("Review flagged items and dispute if necessary");
    }

    // Add unique remediation actions from indicators
    const uniqueActions = new Set(actions);
    for (const indicator of indicators) {
      if (!uniqueActions.has(indicator.recommendedAction)) {
        uniqueActions.add(indicator.recommendedAction);
        actions.push(indicator.recommendedAction);
      }
    }

    return actions;
  }

  // ===================================================
  // PRIVATE HELPERS — Error Summary Builder
  // ===================================================

  private buildErrorSummary(
    errors: CreditReportError[],
    bureau: Bureau,
  ): CreditReportErrors {
    const criticalCount = errors.filter((e) => e.severity === "critical").length;
    const highCount = errors.filter((e) => e.severity === "high").length;
    const mediumCount = errors.filter((e) => e.severity === "medium").length;
    const lowCount = errors.filter((e) => e.severity === "low").length;

    const bureauBreakdown: Record<Bureau, number> = {
      experian: 0,
      equifax: 0,
      transunion: 0,
    };
    bureauBreakdown[bureau] = errors.length;

    return {
      errors,
      totalCount: errors.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      bureauBreakdown,
      scanDate: new Date(),
    };
  }
}

// Export singleton instance
export const creditErrorDetector = new CreditErrorDetector();
export default creditErrorDetector;
