/**
 * Credit Report Parser Service
 *
 * Parses credit reports from different bureaus (Experian, Equifax, TransUnion)
 * and normalizes them into a consistent format. Includes error detection,
 * hard inquiry removal automation, and dispute submission integration.
 *
 * Supports:
 * - Mock credit reports (for development)
 * - Experian CreditProfile format
 * - Equifax EFX/equifaxCreditReport format
 * - TransUnion TUReport/TransUnionReport format
 * - Plaid credit report format (future)
 */

import {
  Bureau,
  ParsedCreditReport,
  PersonalInfo,
  Address,
  ValidationResult,
  MockCreditReportOptions,
  CreditBureauRawPayload,
  PaymentStatus,
  AccountType,
  InquiryType,
  PublicRecordType,
} from "@/types/credit-bureau";
import { generateMockCreditReport } from "./mock-credit-report-generator";

// =====================================================
// ERROR DETECTION TYPES
// =====================================================

/** Severity levels for detected credit report errors */
export type CreditReportErrorSeverity = "critical" | "high" | "medium" | "low";

/** Categories of credit report errors */
export type CreditReportErrorType =
  | "name_mismatch"
  | "address_error"
  | "account_discrepancy"
  | "balance_mismatch"
  | "duplicate_account"
  | "incorrect_payment_status"
  | "incorrect_date"
  | "unauthorized_inquiry"
  | "expired_inquiry"
  | "outdated_record"
  | "mixed_file"
  | "missing_data"
  | "identity_error";

/** A single detected error in a credit report */
export interface CreditReportError {
  type: CreditReportErrorType;
  severity: CreditReportErrorSeverity;
  description: string;
  suggestedAction: string;
  affectedField: string;
  bureau: Bureau;
  /** Optional reference to the account/inquiry/record index */
  itemIndex?: number;
  /** FCRA section relevant to this error */
  legalBasis?: string;
}

/** Collection of all errors found in a credit report */
export interface CreditReportErrors {
  errors: CreditReportError[];
  totalCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  bureauBreakdown: Record<Bureau, number>;
  scanDate: Date;
}

/** Hard inquiry that is eligible for removal */
export interface ExpiredInquiry {
  inquiryIndex: number;
  creditorName: string;
  inquiryDate: Date;
  ageInMonths: number;
  bureau: Bureau;
  removalReason: string;
  removalRequest: InquiryRemovalRequest;
}

/** Request structure for removing a hard inquiry */
export interface InquiryRemovalRequest {
  bureau: Bureau;
  creditorName: string;
  inquiryDate: string;
  reason: string;
  legalBasis: string;
  letterTemplate: string;
}

/** Result of a dispute submission */
export interface DisputeSubmissionResult {
  success: boolean;
  disputeId?: string;
  bureau: Bureau;
  errorType: CreditReportErrorType;
  submittedAt: Date;
  estimatedResolution?: string;
  error?: string;
}

/** Result of comparing two credit reports */
export interface CrossBureauDiscrepancy {
  field: string;
  bureauA: Bureau;
  bureauB: Bureau;
  valueA: string;
  valueB: string;
  severity: CreditReportErrorSeverity;
  description: string;
}

type CreditReportFormat =
  | "mock"
  | "plaid"
  | "experian"
  | "equifax"
  | "transunion";

/** Threshold in months after which hard inquiries are eligible for removal */
const HARD_INQUIRY_EXPIRY_MONTHS = 24;

/** Threshold in years after which negative items should be removed (FCRA Section 605) */
const NEGATIVE_ITEM_REPORTING_YEARS = 7;

// =====================================================
// MAIN PARSER CLASS
// =====================================================

/**
 * Credit Report Parser Class
 *
 * Parses, validates, and detects errors in credit reports
 * from all three major bureaus.
 */
export class CreditReportParser {
  // ===================================================
  // PARSING
  // ===================================================

  /**
   * Parse a credit report from raw data
   */
  async parseReport(
    rawData: CreditBureauRawPayload | ParsedCreditReport,
    bureau: Bureau,
    reportDate?: Date,
  ): Promise<ParsedCreditReport> {
    if (!rawData) {
      throw new Error("Raw data is required");
    }

    if (!bureau) {
      throw new Error("Bureau is required");
    }

    if (this.isParsedReport(rawData)) {
      return rawData;
    }

    void reportDate;

    const format = this.detectFormat(rawData as CreditBureauRawPayload);

    switch (format) {
      case "mock":
        return this.parseMockReport(rawData, bureau);
      case "plaid":
        return this.parsePlaidReport(rawData, bureau);
      case "experian":
        return this.parseExperianReport(rawData);
      case "equifax":
        return this.parseEquifaxReport(rawData);
      case "transunion":
        return this.parseTransUnionReport(rawData);
      default:
        throw new Error(`Unsupported credit report format: ${format}`);
    }
  }

  // ===================================================
  // ERROR DETECTION
  // ===================================================

  /**
   * Detect errors in a parsed credit report.
   * Returns structured errors with severity, type, and suggested actions.
   */
  detectErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
    knownPersonalInfo?: Partial<PersonalInfo>,
  ): CreditReportErrors {
    const errors: CreditReportError[] = [];

    // Check personal information errors
    errors.push(...this.detectPersonalInfoErrors(report, bureau, knownPersonalInfo));

    // Check account discrepancies
    errors.push(...this.detectAccountErrors(report, bureau));

    // Check inquiry issues
    errors.push(...this.detectInquiryErrors(report, bureau));

    // Check public record issues
    errors.push(...this.detectPublicRecordErrors(report, bureau));

    // Check for duplicate accounts
    errors.push(...this.detectDuplicateAccounts(report, bureau));

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

  /**
   * Compare two credit reports from different bureaus and find discrepancies.
   */
  compareBureauReports(
    reportA: ParsedCreditReport,
    bureauA: Bureau,
    reportB: ParsedCreditReport,
    bureauB: Bureau,
  ): CrossBureauDiscrepancy[] {
    const discrepancies: CrossBureauDiscrepancy[] = [];

    // Compare credit scores (difference > 30 points is notable)
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

    // Compare personal info
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

    // Compare account counts
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

    // Compare matching accounts by creditor name for balance discrepancies
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
  // HARD INQUIRY REMOVAL
  // ===================================================

  /**
   * Identify hard inquiries older than 2 years that are eligible for removal.
   * Generates removal request structures for each eligible inquiry.
   */
  identifyExpiredInquiries(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): ExpiredInquiry[] {
    const expired: ExpiredInquiry[] = [];
    const now = new Date();

    for (let i = 0; i < report.inquiries.length; i++) {
      const inquiry = report.inquiries[i];

      if (inquiry.inquiryType !== "hard") {
        continue;
      }

      const inquiryDate = new Date(inquiry.inquiryDate);
      const ageInMonths =
        (now.getFullYear() - inquiryDate.getFullYear()) * 12 +
        (now.getMonth() - inquiryDate.getMonth());

      if (ageInMonths >= HARD_INQUIRY_EXPIRY_MONTHS) {
        const removalRequest = this.generateInquiryRemovalRequest(
          inquiry.creditorName,
          inquiryDate,
          bureau,
        );

        expired.push({
          inquiryIndex: i,
          creditorName: inquiry.creditorName,
          inquiryDate,
          ageInMonths,
          bureau,
          removalReason: `Hard inquiry is ${ageInMonths} months old (exceeds ${HARD_INQUIRY_EXPIRY_MONTHS}-month threshold)`,
          removalRequest,
        });
      }
    }

    return expired;
  }

  /**
   * Generate all removal requests for expired hard inquiries in a report.
   */
  generateBulkInquiryRemovalRequests(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): InquiryRemovalRequest[] {
    const expired = this.identifyExpiredInquiries(report, bureau);
    return expired.map((e) => e.removalRequest);
  }

  // ===================================================
  // DISPUTE SUBMISSION INTEGRATION
  // ===================================================

  /**
   * Submit disputes for detected errors to the dispute service.
   * Converts detected errors into dispute items and sends them.
   */
  async submitErrorDisputes(
    errors: CreditReportErrors,
    userId: string,
    disputeServiceFn: (
      bureau: Bureau,
      errorType: CreditReportErrorType,
      description: string,
      userId: string,
    ) => Promise<{ success: boolean; disputeId?: string; error?: string }>,
  ): Promise<DisputeSubmissionResult[]> {
    const results: DisputeSubmissionResult[] = [];

    // Only submit critical and high severity errors as disputes
    const disputeErrors = errors.errors.filter(
      (e) => e.severity === "critical" || e.severity === "high",
    );

    for (const error of disputeErrors) {
      try {
        const result = await disputeServiceFn(
          error.bureau,
          error.type,
          error.description,
          userId,
        );

        results.push({
          success: result.success,
          disputeId: result.disputeId,
          bureau: error.bureau,
          errorType: error.type,
          submittedAt: new Date(),
          estimatedResolution: "30-45 days",
          error: result.error,
        });
      } catch (submitError: unknown) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Unknown submission error";
        results.push({
          success: false,
          bureau: error.bureau,
          errorType: error.type,
          submittedAt: new Date(),
          error: message,
        });
      }
    }

    return results;
  }

  // ===================================================
  // VALIDATION
  // ===================================================

  /**
   * Validate a parsed credit report
   */
  validateReport(report: ParsedCreditReport): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate personal info
    if (!report.personalInfo) {
      errors.push("Personal information is required");
    } else {
      if (!report.personalInfo.firstName) {
        errors.push("First name is required");
      }
      if (!report.personalInfo.lastName) {
        errors.push("Last name is required");
      }
      if (
        !report.personalInfo.addresses ||
        report.personalInfo.addresses.length === 0
      ) {
        warnings.push("No addresses found");
      }
    }

    // Validate credit score
    if (!report.creditScore) {
      errors.push("Credit score is required");
    } else if (report.creditScore < 300 || report.creditScore > 850) {
      errors.push("Credit score must be between 300 and 850");
    }

    // Validate accounts
    if (!report.accounts || report.accounts.length === 0) {
      warnings.push("No credit accounts found");
    } else {
      report.accounts.forEach((account, index) => {
        if (!account.creditorName) {
          errors.push(`Account ${index + 1}: Creditor name is required`);
        }
        if (!account.accountType) {
          errors.push(`Account ${index + 1}: Account type is required`);
        }
        if (account.balance < 0) {
          errors.push(`Account ${index + 1}: Balance cannot be negative`);
        }
        if (account.creditLimit && account.creditLimit < account.balance) {
          warnings.push(`Account ${index + 1}: Balance exceeds credit limit`);
        }
      });
    }

    // Validate inquiries
    if (report.inquiries) {
      report.inquiries.forEach((inquiry, index) => {
        if (!inquiry.creditorName) {
          errors.push(`Inquiry ${index + 1}: Creditor name is required`);
        }
        if (!inquiry.inquiryDate) {
          errors.push(`Inquiry ${index + 1}: Inquiry date is required`);
        }
      });
    }

    // Validate public records
    if (report.publicRecords) {
      report.publicRecords.forEach((record, index) => {
        if (!record.recordType) {
          errors.push(`Public record ${index + 1}: Record type is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ===================================================
  // ANALYTICS
  // ===================================================

  /**
   * Calculate credit utilization
   */
  calculateUtilization(report: ParsedCreditReport): number {
    const revolvingAccounts = report.accounts.filter(
      (account) =>
        account.accountType === "credit_card" ||
        account.accountType === "revolving",
    );

    const totalBalance = revolvingAccounts.reduce(
      (sum, account) => sum + account.balance,
      0,
    );
    const totalLimit = revolvingAccounts.reduce(
      (sum, account) => sum + (account.creditLimit || 0),
      0,
    );

    if (totalLimit === 0) return 0;
    return (totalBalance / totalLimit) * 100;
  }

  /**
   * Calculate average account age in months
   */
  calculateAverageAccountAge(report: ParsedCreditReport): number {
    if (report.accounts.length === 0) return 0;

    const now = new Date();
    const totalMonths = report.accounts.reduce((sum, account) => {
      const openedDate = new Date(account.openedDate);
      const months =
        (now.getFullYear() - openedDate.getFullYear()) * 12 +
        (now.getMonth() - openedDate.getMonth());
      return sum + months;
    }, 0);

    return Math.round(totalMonths / report.accounts.length);
  }

  /**
   * Count negative items
   */
  countNegativeItems(report: ParsedCreditReport): number {
    let count = 0;

    count += report.accounts.filter((account) =>
      [
        "late_30",
        "late_60",
        "late_90",
        "late_120",
        "charge_off",
        "collection",
      ].includes(account.paymentStatus),
    ).length;

    count += report.publicRecords.length;

    return count;
  }

  /**
   * Get oldest account age in months
   */
  getOldestAccountAge(report: ParsedCreditReport): number {
    if (report.accounts.length === 0) return 0;

    const now = new Date();
    const oldestAccount = report.accounts.reduce((oldest, account) => {
      const accountDate = new Date(account.openedDate);
      const oldestDate = new Date(oldest.openedDate);
      return accountDate < oldestDate ? account : oldest;
    });

    const openedDate = new Date(oldestAccount.openedDate);
    return (
      (now.getFullYear() - openedDate.getFullYear()) * 12 +
      (now.getMonth() - openedDate.getMonth())
    );
  }

  // ===================================================
  // FORMAT DETECTION
  // ===================================================

  /**
   * Detect the format of the credit report
   */
  private detectFormat(rawData: CreditBureauRawPayload): CreditReportFormat {
    const formatFlag = this.getString(rawData, "format");
    const isMock = this.getBoolean(rawData, "isMock");
    if (formatFlag === "mock" || isMock === true) {
      return "mock";
    }

    // Check for mock format (has both personalInfo and accounts)
    if (
      this.hasProperty(rawData, "personalInfo") &&
      this.hasProperty(rawData, "accounts")
    ) {
      return "mock";
    }

    // Check for Experian format
    if (
      this.hasProperty(rawData, "CreditProfile") ||
      this.hasProperty(rawData, "experianData")
    ) {
      return "experian";
    }

    // Check for Equifax format
    if (
      this.hasProperty(rawData, "equifaxCreditReport") ||
      this.hasProperty(rawData, "EFXReport")
    ) {
      return "equifax";
    }

    // Check for TransUnion format
    if (
      this.hasProperty(rawData, "TransUnionReport") ||
      this.hasProperty(rawData, "TUReport")
    ) {
      return "transunion";
    }

    // Check for Plaid format
    if (this.hasProperty(rawData, "credit_report")) {
      return "plaid";
    }

    // Default to mock for development
    return "mock";
  }

  // ===================================================
  // BUREAU-SPECIFIC PARSERS
  // ===================================================

  /**
   * Parse mock credit report
   */
  private parseMockReport(
    rawData: CreditBureauRawPayload,
    bureau: Bureau,
  ): ParsedCreditReport {
    const candidate = rawData as Partial<ParsedCreditReport>;
    if (candidate.personalInfo && candidate.accounts) {
      return candidate as ParsedCreditReport;
    }

    const options: MockCreditReportOptions = {
      bureau,
      creditScore: this.getNumber(rawData, "creditScore"),
      accountCount: this.getNumber(rawData, "accountCount"),
      inquiryCount: this.getNumber(rawData, "inquiryCount"),
      publicRecordCount: this.getNumber(rawData, "publicRecordCount"),
      includeNegativeItems: this.getBoolean(rawData, "includeNegativeItems"),
    };

    return generateMockCreditReport(options);
  }

  /**
   * Parse Plaid credit report
   * https://plaid.com/docs/api/products/credit/
   */
  private parsePlaidReport(
    rawData: CreditBureauRawPayload,
    bureau: Bureau,
  ): ParsedCreditReport {
    void rawData;
    void bureau;
    throw new Error(
      "Plaid format parsing requires API integration - configure PLAID_CLIENT_ID and PLAID_SECRET",
    );
  }

  /**
   * Parse Experian credit report.
   *
   * Expects a payload with a `CreditProfile` or `experianData` key containing
   * consumer, tradeline (account), inquiry, and public record data in
   * Experian's Connect API format.
   */
  private parseExperianReport(
    rawData: CreditBureauRawPayload,
  ): ParsedCreditReport {
    const root = (rawData.CreditProfile ?? rawData.experianData) as
      | Record<string, unknown>
      | undefined;

    if (!root) {
      throw new Error(
        "Invalid Experian payload: missing CreditProfile or experianData",
      );
    }

    const consumer = this.safeRecord(root.consumer);
    const tradelines = this.safeArray(root.tradelines ?? root.tradeLines);
    const inquiriesRaw = this.safeArray(root.inquiries);
    const publicRecordsRaw = this.safeArray(root.publicRecords);
    const riskModel = this.safeRecord(root.riskModel);

    const personalInfo = this.parseExperianPersonalInfo(consumer);
    const creditScore =
      this.safeNumber(riskModel?.score ?? consumer?.creditScore) ?? 0;
    const scoreFactors = this.safeStringArray(
      riskModel?.factors ?? consumer?.scoreFactors,
    );

    const accounts = tradelines.map((t, idx) =>
      this.normalizeAccount(t, idx),
    );
    const inquiries = inquiriesRaw.map((inq, idx) =>
      this.normalizeInquiry(inq, idx),
    );
    const publicRecords = publicRecordsRaw.map((rec, idx) =>
      this.normalizePublicRecord(rec, idx),
    );

    return {
      personalInfo,
      creditScore,
      scoreFactors,
      accounts,
      inquiries,
      publicRecords,
    };
  }

  /**
   * Parse Equifax credit report.
   *
   * Expects a payload with `equifaxCreditReport` or `EFXReport` key.
   */
  private parseEquifaxReport(
    rawData: CreditBureauRawPayload,
  ): ParsedCreditReport {
    const root = (rawData.equifaxCreditReport ?? rawData.EFXReport) as
      | Record<string, unknown>
      | undefined;

    if (!root) {
      throw new Error(
        "Invalid Equifax payload: missing equifaxCreditReport or EFXReport",
      );
    }

    const subject = this.safeRecord(root.subject ?? root.consumer);
    const tradeAccounts = this.safeArray(
      root.trades ?? root.tradeAccounts ?? root.accounts,
    );
    const inquiriesRaw = this.safeArray(root.inquiries);
    const publicRecordsRaw = this.safeArray(root.publicRecords);
    const scoreData = this.safeRecord(root.score ?? root.scoreModel);

    const personalInfo = this.parseEquifaxPersonalInfo(subject);
    const creditScore =
      this.safeNumber(scoreData?.value ?? scoreData?.score ?? subject?.creditScore) ?? 0;
    const scoreFactors = this.safeStringArray(
      scoreData?.factors ?? subject?.scoreFactors,
    );

    const accounts = tradeAccounts.map((t, idx) =>
      this.normalizeAccount(t, idx),
    );
    const inquiries = inquiriesRaw.map((inq, idx) =>
      this.normalizeInquiry(inq, idx),
    );
    const publicRecords = publicRecordsRaw.map((rec, idx) =>
      this.normalizePublicRecord(rec, idx),
    );

    return {
      personalInfo,
      creditScore,
      scoreFactors,
      accounts,
      inquiries,
      publicRecords,
    };
  }

  /**
   * Parse TransUnion credit report.
   *
   * Expects a payload with `TransUnionReport` or `TUReport` key.
   */
  private parseTransUnionReport(
    rawData: CreditBureauRawPayload,
  ): ParsedCreditReport {
    const root = (rawData.TransUnionReport ?? rawData.TUReport) as
      | Record<string, unknown>
      | undefined;

    if (!root) {
      throw new Error(
        "Invalid TransUnion payload: missing TransUnionReport or TUReport",
      );
    }

    const borrower = this.safeRecord(root.borrower ?? root.consumer);
    const tradeLines = this.safeArray(
      root.tradeLines ?? root.tradelines ?? root.accounts,
    );
    const inquiriesRaw = this.safeArray(root.inquiries);
    const publicRecordsRaw = this.safeArray(root.publicRecords);
    const creditScoreData = this.safeRecord(root.creditScore ?? root.score);

    const personalInfo = this.parseTransUnionPersonalInfo(borrower);
    const creditScore =
      this.safeNumber(
        creditScoreData?.score ?? creditScoreData?.value ?? borrower?.creditScore,
      ) ?? 0;
    const scoreFactors = this.safeStringArray(
      creditScoreData?.factors ?? borrower?.scoreFactors,
    );

    const accounts = tradeLines.map((t, idx) =>
      this.normalizeAccount(t, idx),
    );
    const inquiries = inquiriesRaw.map((inq, idx) =>
      this.normalizeInquiry(inq, idx),
    );
    const publicRecords = publicRecordsRaw.map((rec, idx) =>
      this.normalizePublicRecord(rec, idx),
    );

    return {
      personalInfo,
      creditScore,
      scoreFactors,
      accounts,
      inquiries,
      publicRecords,
    };
  }

  // ===================================================
  // PERSONAL INFO PARSERS (per bureau)
  // ===================================================

  private parseExperianPersonalInfo(
    consumer: Record<string, unknown> | undefined,
  ): PersonalInfo {
    if (!consumer) {
      return this.emptyPersonalInfo();
    }

    return {
      firstName: this.safeString(consumer.firstName ?? consumer.first_name) ?? "",
      lastName: this.safeString(consumer.lastName ?? consumer.last_name) ?? "",
      middleName: this.safeString(consumer.middleName ?? consumer.middle_name),
      dateOfBirth: this.safeDate(consumer.dateOfBirth ?? consumer.dob),
      ssn: this.safeString(consumer.ssn ?? consumer.ssnLastFour),
      addresses: this.parseAddresses(consumer.addresses),
      employers: undefined,
    };
  }

  private parseEquifaxPersonalInfo(
    subject: Record<string, unknown> | undefined,
  ): PersonalInfo {
    if (!subject) {
      return this.emptyPersonalInfo();
    }

    return {
      firstName: this.safeString(subject.firstName ?? subject.first_name) ?? "",
      lastName: this.safeString(subject.lastName ?? subject.last_name) ?? "",
      middleName: this.safeString(subject.middleName ?? subject.middle_name),
      dateOfBirth: this.safeDate(subject.dateOfBirth ?? subject.dob),
      ssn: this.safeString(subject.ssn ?? subject.ssnLastFour),
      addresses: this.parseAddresses(subject.addresses),
      employers: undefined,
    };
  }

  private parseTransUnionPersonalInfo(
    borrower: Record<string, unknown> | undefined,
  ): PersonalInfo {
    if (!borrower) {
      return this.emptyPersonalInfo();
    }

    return {
      firstName: this.safeString(borrower.firstName ?? borrower.first_name) ?? "",
      lastName: this.safeString(borrower.lastName ?? borrower.last_name) ?? "",
      middleName: this.safeString(borrower.middleName ?? borrower.middle_name),
      dateOfBirth: this.safeDate(borrower.dateOfBirth ?? borrower.dob),
      ssn: this.safeString(borrower.ssn ?? borrower.ssnLastFour),
      addresses: this.parseAddresses(borrower.addresses),
      employers: undefined,
    };
  }

  private emptyPersonalInfo(): PersonalInfo {
    return {
      firstName: "",
      lastName: "",
      addresses: [],
    };
  }

  private parseAddresses(raw: unknown): Address[] {
    const arr = this.safeArray(raw);
    return arr.map((a) => {
      const addr = a as Record<string, unknown>;
      return {
        street: this.safeString(addr.street ?? addr.streetAddress ?? addr.address_line) ?? "",
        city: this.safeString(addr.city) ?? "",
        state: this.safeString(addr.state) ?? "",
        zipCode: this.safeString(addr.zipCode ?? addr.zip ?? addr.postalCode) ?? "",
        type: (this.safeString(addr.type) === "previous" ? "previous" : "current") as
          | "current"
          | "previous",
        reportedDate: this.safeDate(addr.reportedDate),
      };
    });
  }

  // ===================================================
  // NORMALIZERS (raw -> typed)
  // ===================================================

  private normalizeAccount(
    raw: unknown,
    _index: number,
  ): Omit<
    import("@/types/credit-bureau").CreditAccount,
    "id" | "reportId" | "userId" | "createdAt" | "updatedAt"
  > {
    const obj = raw as Record<string, unknown>;
    return {
      accountType: this.normalizeAccountType(
        this.safeString(obj.accountType ?? obj.account_type ?? obj.type),
      ),
      accountNumber:
        this.safeString(
          obj.accountNumber ?? obj.account_number ?? obj.maskedAccountNumber,
        ) ?? "****0000",
      creditorName:
        this.safeString(obj.creditorName ?? obj.creditor_name ?? obj.name) ?? "Unknown",
      balance: this.safeNumber(obj.balance ?? obj.currentBalance ?? obj.current_balance) ?? 0,
      creditLimit: this.safeNumber(obj.creditLimit ?? obj.credit_limit ?? obj.highCredit),
      paymentStatus: this.normalizePaymentStatus(
        this.safeString(obj.paymentStatus ?? obj.payment_status ?? obj.status),
      ),
      openedDate:
        this.safeDate(obj.openedDate ?? obj.opened_date ?? obj.dateOpened) ??
        new Date(),
      closedDate: this.safeDate(obj.closedDate ?? obj.closed_date ?? obj.dateClosed),
      lastPaymentDate: this.safeDate(
        obj.lastPaymentDate ?? obj.last_payment_date ?? obj.dateLastPayment,
      ),
      paymentHistory: this.normalizePaymentHistory(obj.paymentHistory ?? obj.payment_history),
      isDisputed:
        typeof obj.isDisputed === "boolean"
          ? obj.isDisputed
          : typeof obj.is_disputed === "boolean"
            ? (obj.is_disputed as boolean)
            : false,
    };
  }

  private normalizeInquiry(
    raw: unknown,
    _index: number,
  ): Omit<
    import("@/types/credit-bureau").CreditInquiry,
    "id" | "reportId" | "userId" | "createdAt"
  > {
    const obj = raw as Record<string, unknown>;
    return {
      inquiryType: this.normalizeInquiryType(
        this.safeString(obj.inquiryType ?? obj.inquiry_type ?? obj.type),
      ),
      creditorName:
        this.safeString(obj.creditorName ?? obj.creditor_name ?? obj.name) ?? "Unknown",
      inquiryDate:
        this.safeDate(obj.inquiryDate ?? obj.inquiry_date ?? obj.date) ?? new Date(),
      isDisputed:
        typeof obj.isDisputed === "boolean"
          ? obj.isDisputed
          : typeof obj.is_disputed === "boolean"
            ? (obj.is_disputed as boolean)
            : false,
    };
  }

  private normalizePublicRecord(
    raw: unknown,
    _index: number,
  ): Omit<
    import("@/types/credit-bureau").PublicRecord,
    "id" | "reportId" | "userId" | "createdAt"
  > {
    const obj = raw as Record<string, unknown>;
    return {
      recordType: this.normalizePublicRecordType(
        this.safeString(obj.recordType ?? obj.record_type ?? obj.type),
      ),
      filingDate: this.safeDate(obj.filingDate ?? obj.filing_date ?? obj.dateFiled),
      status:
        this.safeString(obj.status) ?? "filed",
      amount: this.safeNumber(obj.amount),
      courtName: this.safeString(obj.courtName ?? obj.court_name),
      caseNumber: this.safeString(obj.caseNumber ?? obj.case_number),
      isDisputed:
        typeof obj.isDisputed === "boolean"
          ? obj.isDisputed
          : typeof obj.is_disputed === "boolean"
            ? (obj.is_disputed as boolean)
            : false,
    };
  }

  // ===================================================
  // ERROR DETECTION (private helpers)
  // ===================================================

  private detectPersonalInfoErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
    knownInfo?: Partial<PersonalInfo>,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];
    const pi = report.personalInfo;

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
          suggestedAction:
            "File a dispute to correct the name on your credit report",
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
          suggestedAction:
            "File a dispute to correct the name on your credit report",
          affectedField: "personalInfo.lastName",
          bureau,
          legalBasis: "FCRA Section 611 - Right to dispute inaccurate information",
        });
      }

      // Check address mismatch
      if (knownInfo.addresses && knownInfo.addresses.length > 0 && pi.addresses.length > 0) {
        const knownCurrentAddr = knownInfo.addresses.find(
          (a) => a.type === "current",
        );
        const reportCurrentAddr = pi.addresses.find(
          (a) => a.type === "current",
        );

        if (knownCurrentAddr && reportCurrentAddr) {
          if (
            knownCurrentAddr.state.toLowerCase() !==
            reportCurrentAddr.state.toLowerCase()
          ) {
            errors.push({
              type: "address_error",
              severity: "high",
              description: `Current address state mismatch: report shows "${reportCurrentAddr.state}" but expected "${knownCurrentAddr.state}"`,
              suggestedAction:
                "File a dispute to update your current address with the bureau",
              affectedField: "personalInfo.addresses",
              bureau,
              legalBasis:
                "FCRA Section 611 - Right to dispute inaccurate information",
            });
          }
        }
      }
    }

    return errors;
  }

  private detectAccountErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];

    report.accounts.forEach((account, index) => {
      // Negative balance detection
      if (account.balance < 0) {
        errors.push({
          type: "balance_mismatch",
          severity: "high",
          description: `Account with ${account.creditorName} shows negative balance of $${account.balance}`,
          suggestedAction:
            "Dispute the incorrect balance with the credit bureau",
          affectedField: `accounts[${index}].balance`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Balance exceeds credit limit by significant amount
      if (
        account.creditLimit &&
        account.creditLimit > 0 &&
        account.balance > account.creditLimit * 1.5
      ) {
        errors.push({
          type: "balance_mismatch",
          severity: "medium",
          description: `Account with ${account.creditorName} balance ($${account.balance}) significantly exceeds credit limit ($${account.creditLimit})`,
          suggestedAction:
            "Verify the balance is accurate; dispute if incorrect",
          affectedField: `accounts[${index}].balance`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Account shows as late but payment status inconsistent with payment history
      const negativeStatuses: PaymentStatus[] = [
        "late_30",
        "late_60",
        "late_90",
        "late_120",
        "charge_off",
        "collection",
      ];

      if (negativeStatuses.includes(account.paymentStatus)) {
        // Check if the last N months of payment history contradict the status
        const recentHistory = account.paymentHistory.slice(-3);
        const allRecentCurrent = recentHistory.every(
          (h) => h.status === "current",
        );

        if (allRecentCurrent && recentHistory.length >= 3) {
          errors.push({
            type: "incorrect_payment_status",
            severity: "high",
            description: `Account with ${account.creditorName} shows status "${account.paymentStatus}" but last 3 months of payment history are all current`,
            suggestedAction:
              "Dispute the incorrect payment status with the credit bureau",
            affectedField: `accounts[${index}].paymentStatus`,
            bureau,
            itemIndex: index,
            legalBasis:
              "FCRA Section 611 - Dispute of inaccurate payment information",
          });
        }
      }

      // Closed account with ongoing balance (potential error)
      if (account.paymentStatus === "closed" && account.balance > 0) {
        errors.push({
          type: "account_discrepancy",
          severity: "medium",
          description: `Closed account with ${account.creditorName} still shows balance of $${account.balance}`,
          suggestedAction:
            "Verify if the balance is accurate for a closed account",
          affectedField: `accounts[${index}].balance`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Future opened date
      if (account.openedDate && new Date(account.openedDate) > new Date()) {
        errors.push({
          type: "incorrect_date",
          severity: "high",
          description: `Account with ${account.creditorName} has a future opened date`,
          suggestedAction:
            "Dispute the incorrect account opening date",
          affectedField: `accounts[${index}].openedDate`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }
    });

    return errors;
  }

  private detectInquiryErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];

    report.inquiries.forEach((inquiry, index) => {
      // Future inquiry date
      if (inquiry.inquiryDate && new Date(inquiry.inquiryDate) > new Date()) {
        errors.push({
          type: "incorrect_date",
          severity: "high",
          description: `Inquiry from ${inquiry.creditorName} has a future date`,
          suggestedAction:
            "Dispute the inquiry with an incorrect date",
          affectedField: `inquiries[${index}].inquiryDate`,
          bureau,
          itemIndex: index,
          legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        });
      }

      // Expired hard inquiry still on report
      if (inquiry.inquiryType === "hard") {
        const inquiryDate = new Date(inquiry.inquiryDate);
        const ageInMonths =
          (new Date().getFullYear() - inquiryDate.getFullYear()) * 12 +
          (new Date().getMonth() - inquiryDate.getMonth());

        if (ageInMonths >= HARD_INQUIRY_EXPIRY_MONTHS) {
          errors.push({
            type: "expired_inquiry",
            severity: "medium",
            description: `Hard inquiry from ${inquiry.creditorName} (${ageInMonths} months old) should have been removed after ${HARD_INQUIRY_EXPIRY_MONTHS} months`,
            suggestedAction:
              "Request removal of the expired hard inquiry from the bureau",
            affectedField: `inquiries[${index}]`,
            bureau,
            itemIndex: index,
            legalBasis:
              "FCRA Section 605 - Inquiries must be removed after 2 years",
          });
        }
      }
    });

    return errors;
  }

  private detectPublicRecordErrors(
    report: ParsedCreditReport,
    bureau: Bureau,
  ): CreditReportError[] {
    const errors: CreditReportError[] = [];

    report.publicRecords.forEach((record, index) => {
      // Check for records past the 7-year reporting limit
      if (record.filingDate) {
        const filingDate = new Date(record.filingDate);
        const ageInYears =
          (Date.now() - filingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        if (ageInYears > NEGATIVE_ITEM_REPORTING_YEARS) {
          errors.push({
            type: "outdated_record",
            severity: "high",
            description: `Public record (${record.recordType}) filed ${Math.floor(ageInYears)} years ago exceeds the ${NEGATIVE_ITEM_REPORTING_YEARS}-year reporting limit`,
            suggestedAction:
              "Demand immediate removal citing FCRA Section 605",
            affectedField: `publicRecords[${index}]`,
            bureau,
            itemIndex: index,
            legalBasis:
              "FCRA Section 605 - 7-year reporting limit for negative items",
          });
        }
      }
    });

    return errors;
  }

  private detectDuplicateAccounts(
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
          suggestedAction:
            "Dispute the duplicate account and request removal of one entry",
          affectedField: `accounts[${index}]`,
          bureau,
          itemIndex: index,
          legalBasis:
            "FCRA Section 611 - Duplicate reporting is inaccurate",
        });
      } else {
        seen.set(key, index);
      }
    });

    return errors;
  }

  // ===================================================
  // INQUIRY REMOVAL REQUEST GENERATOR
  // ===================================================

  private generateInquiryRemovalRequest(
    creditorName: string,
    inquiryDate: Date,
    bureau: Bureau,
  ): InquiryRemovalRequest {
    const dateStr = inquiryDate.toISOString().split("T")[0];
    const bureauName =
      bureau === "experian"
        ? "Experian"
        : bureau === "equifax"
          ? "Equifax"
          : "TransUnion";

    return {
      bureau,
      creditorName,
      inquiryDate: dateStr,
      reason: `Hard inquiry from ${creditorName} dated ${dateStr} is older than 2 years and should be removed per FCRA Section 605`,
      legalBasis:
        "FCRA Section 605 - Hard inquiries must be removed after 2 years",
      letterTemplate: [
        `To: ${bureauName}`,
        ``,
        `Re: Removal of Expired Hard Inquiry`,
        ``,
        `I am writing to request the removal of the following expired hard inquiry from my credit report:`,
        ``,
        `Creditor: ${creditorName}`,
        `Inquiry Date: ${dateStr}`,
        ``,
        `This inquiry is more than 2 years old and should have been automatically removed per the Fair Credit Reporting Act (FCRA) Section 605, which states that hard inquiries must be removed after 24 months.`,
        ``,
        `I request that this inquiry be removed immediately. Please send me written confirmation of the removal within 30 days.`,
        ``,
        `Sincerely,`,
        `[Consumer Name]`,
      ].join("\n"),
    };
  }

  // ===================================================
  // TYPE NORMALIZATION HELPERS
  // ===================================================

  private normalizeAccountType(raw: string | undefined): AccountType {
    if (!raw) return "other";
    const lower = raw.toLowerCase().replace(/[\s_-]/g, "");
    const mapping: Record<string, AccountType> = {
      creditcard: "credit_card",
      credit_card: "credit_card",
      revolving: "revolving",
      mortgage: "mortgage",
      autoloan: "auto_loan",
      auto_loan: "auto_loan",
      automobile: "auto_loan",
      studentloan: "student_loan",
      student_loan: "student_loan",
      education: "student_loan",
      personalloan: "personal_loan",
      personal_loan: "personal_loan",
      installment: "installment",
    };
    return mapping[lower] ?? "other";
  }

  private normalizePaymentStatus(raw: string | undefined): PaymentStatus {
    if (!raw) return "current";
    const lower = raw.toLowerCase().replace(/[\s_-]/g, "");
    const mapping: Record<string, PaymentStatus> = {
      current: "current",
      ok: "current",
      paid: "current",
      asagreed: "current",
      late30: "late_30",
      "30dayslate": "late_30",
      late_30: "late_30",
      late60: "late_60",
      "60dayslate": "late_60",
      late_60: "late_60",
      late90: "late_90",
      "90dayslate": "late_90",
      late_90: "late_90",
      late120: "late_120",
      "120dayslate": "late_120",
      late_120: "late_120",
      chargeoff: "charge_off",
      charge_off: "charge_off",
      chargedoff: "charge_off",
      collection: "collection",
      collections: "collection",
      closed: "closed",
    };
    return mapping[lower] ?? "current";
  }

  private normalizeInquiryType(raw: string | undefined): InquiryType {
    if (!raw) return "hard";
    const lower = raw.toLowerCase();
    if (lower === "soft" || lower === "promotional" || lower === "account_review") {
      return "soft";
    }
    return "hard";
  }

  private normalizePublicRecordType(raw: string | undefined): PublicRecordType {
    if (!raw) return "judgment";
    const lower = raw.toLowerCase().replace(/[\s_-]/g, "");
    const mapping: Record<string, PublicRecordType> = {
      bankruptcy: "bankruptcy",
      chapter7: "bankruptcy",
      chapter13: "bankruptcy",
      judgment: "judgment",
      taxlien: "tax_lien",
      tax_lien: "tax_lien",
      foreclosure: "foreclosure",
      repossession: "repossession",
    };
    return mapping[lower] ?? "judgment";
  }

  private normalizePaymentHistory(
    raw: unknown,
  ): Array<{ month: string; status: PaymentStatus; amount?: number }> {
    const arr = this.safeArray(raw);
    if (arr.length === 0) return [];

    return arr.map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        month: this.safeString(obj.month ?? obj.date) ?? "0000-00",
        status: this.normalizePaymentStatus(
          this.safeString(obj.status ?? obj.paymentStatus),
        ),
        amount: this.safeNumber(obj.amount),
      };
    });
  }

  // ===================================================
  // SAFE EXTRACTION HELPERS
  // ===================================================

  private isParsedReport(value: unknown): value is ParsedCreditReport {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as Partial<ParsedCreditReport>;
    return Boolean(candidate.personalInfo) && Array.isArray(candidate.accounts);
  }

  private getString(
    payload: CreditBureauRawPayload,
    key: string,
  ): string | undefined {
    const value = payload[key];
    return typeof value === "string" ? value : undefined;
  }

  private getNumber(
    payload: CreditBureauRawPayload,
    key: string,
  ): number | undefined {
    const value = payload[key];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private getBoolean(
    payload: CreditBureauRawPayload,
    key: string,
  ): boolean | undefined {
    const value = payload[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return undefined;
  }

  private hasProperty(payload: CreditBureauRawPayload, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(payload, key);
  }

  private safeRecord(
    value: unknown,
  ): Record<string, unknown> | undefined {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  }

  private safeArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private safeString(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return undefined;
  }

  private safeNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }

  private safeDate(value: unknown): Date | undefined {
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  }

  private safeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
        .map(String);
    }
    return [];
  }
}

// Export singleton instance
export const creditReportParser = new CreditReportParser();
export default creditReportParser;
