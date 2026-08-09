/**
 * Credit Error Detector — Unit Tests
 *
 * Comprehensive tests for CreditErrorDetector: error detection across all
 * categories, identity theft assessment, severity scoring, cross-bureau
 * comparison, and Supabase persistence.
 *
 * All Supabase interactions are mocked via the standard chainable mock pattern.
 */

// ---------------------------------------------------------------------------
// Mocks — declared before module imports
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => {
  let defaultResolution: { data: unknown; error: unknown } = { data: [], error: null };

  const mock: Record<string, jest.Mock | ((v: { data: unknown; error: unknown }) => void)> = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    limit: jest.fn(),
    then: jest.fn((resolve: (v: unknown) => void) => resolve(defaultResolution)),
    __setDefaultResolution(val: { data: unknown; error: unknown }) {
      defaultResolution = val;
      (mock.then as jest.Mock).mockImplementation((resolve: (v: unknown) => void) => resolve(val));
    },
  };

  (mock.from as jest.Mock).mockReturnValue(mock);
  (mock.select as jest.Mock).mockReturnValue(mock);
  (mock.insert as jest.Mock).mockReturnValue(mock);
  (mock.update as jest.Mock).mockReturnValue(mock);
  (mock.delete as jest.Mock).mockReturnValue(mock);
  (mock.eq as jest.Mock).mockReturnValue(mock);
  (mock.order as jest.Mock).mockReturnValue(mock);
  (mock.gte as jest.Mock).mockReturnValue(mock);
  (mock.lte as jest.Mock).mockReturnValue(mock);
  (mock.limit as jest.Mock).mockReturnValue(mock);
  (mock.single as jest.Mock).mockResolvedValue({ data: null, error: null });

  return { getSupabase: () => mock };
});

import { getSupabase } from "@/lib/supabase/client";
import {
  CreditErrorDetector,
  creditErrorDetector,
} from "../credit-error-detector";
import type {
  IdentityTheftAssessment,
  DetectedErrorRecord,
} from "../credit-error-detector";
import type { ParsedCreditReport, PersonalInfo, Bureau } from "@/types/credit-bureau";
import type { CreditReportErrors } from "../credit-report-parser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase = getSupabase() as any;

// ---------------------------------------------------------------------------
// Helpers — build mock credit report data
// ---------------------------------------------------------------------------

function buildMockReport(overrides?: Partial<ParsedCreditReport>): ParsedCreditReport {
  return {
    personalInfo: {
      firstName: "Jane",
      lastName: "Doe",
      ssn: "6789",
      addresses: [
        {
          street: "123 Main St",
          city: "Springfield",
          state: "IL",
          zipCode: "62704",
          type: "current" as const,
        },
      ],
    },
    creditScore: 720,
    scoreFactors: ["Good payment history", "Low utilization"],
    accounts: [
      {
        accountType: "credit_card",
        accountNumber: "****1234",
        creditorName: "Chase Bank",
        balance: 1500,
        creditLimit: 10000,
        paymentStatus: "current",
        openedDate: new Date("2020-01-15"),
        paymentHistory: [
          { month: "2025-12", status: "current" },
          { month: "2025-11", status: "current" },
          { month: "2025-10", status: "current" },
        ],
        isDisputed: false,
      },
      {
        accountType: "auto_loan",
        accountNumber: "****5678",
        creditorName: "Capital One",
        balance: 12000,
        paymentStatus: "current",
        openedDate: new Date("2021-06-01"),
        paymentHistory: [
          { month: "2025-12", status: "current" },
          { month: "2025-11", status: "current" },
        ],
        isDisputed: false,
      },
    ],
    inquiries: [
      {
        inquiryType: "hard",
        creditorName: "Wells Fargo",
        inquiryDate: new Date("2025-06-15"),
        isDisputed: false,
      },
      {
        inquiryType: "soft",
        creditorName: "Credit Karma",
        inquiryDate: new Date("2025-12-01"),
        isDisputed: false,
      },
    ],
    publicRecords: [],
    ...overrides,
  };
}

function buildKnownPersonalInfo(overrides?: Partial<PersonalInfo>): PersonalInfo {
  return {
    firstName: "Jane",
    lastName: "Doe",
    ssn: "6789",
    addresses: [
      {
        street: "123 Main St",
        city: "Springfield",
        state: "IL",
        zipCode: "62704",
        type: "current" as const,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Re-establish the chainable return values after clearAllMocks wipes them
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.delete.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.gte.mockReturnValue(mockSupabase);
  mockSupabase.lte.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
  mockSupabase.single.mockResolvedValue({ data: null, error: null });

  mockSupabase.__setDefaultResolution({ data: [], error: null });
});

// ===========================================================================
// TESTS
// ===========================================================================

describe("CreditErrorDetector", () => {
  // -----------------------------------------------------------------------
  // Construction & Singleton
  // -----------------------------------------------------------------------

  describe("singleton and construction", () => {
    it("exports a singleton instance", () => {
      expect(creditErrorDetector).toBeInstanceOf(CreditErrorDetector);
    });

    it("can be instantiated independently", () => {
      const detector = new CreditErrorDetector();
      expect(detector).toBeInstanceOf(CreditErrorDetector);
    });
  });

  // -----------------------------------------------------------------------
  // detectAllErrors
  // -----------------------------------------------------------------------

  describe("detectAllErrors", () => {
    it("returns zero errors for a clean report", () => {
      const report = buildMockReport();
      const result = creditErrorDetector.detectAllErrors(report, "experian");

      expect(result.totalCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(0);
      expect(result.mediumCount).toBe(0);
      expect(result.lowCount).toBe(0);
    });

    it("aggregates errors from all categories", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "",
          lastName: "Doe",
          addresses: [],
        },
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: -100,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const result = creditErrorDetector.detectAllErrors(report, "equifax");

      // Should find: missing firstName (high) + negative balance (high)
      expect(result.totalCount).toBeGreaterThanOrEqual(2);
      expect(result.highCount).toBeGreaterThanOrEqual(2);
    });

    it("includes bureau breakdown", () => {
      const report = buildMockReport();
      const result = creditErrorDetector.detectAllErrors(report, "transunion");

      expect(result.bureauBreakdown.transunion).toBeDefined();
      expect(result.bureauBreakdown.experian).toBe(0);
      expect(result.bureauBreakdown.equifax).toBe(0);
    });

    it("includes scan date", () => {
      const report = buildMockReport();
      const result = creditErrorDetector.detectAllErrors(report, "experian");
      expect(result.scanDate).toBeInstanceOf(Date);
    });
  });

  // -----------------------------------------------------------------------
  // detectPersonalInfoErrors
  // -----------------------------------------------------------------------

  describe("detectPersonalInfoErrors", () => {
    it("detects missing first name", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "",
          lastName: "Doe",
          addresses: [],
        },
      });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "experian");
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("missing_data");
      expect(errors[0].severity).toBe("high");
      expect(errors[0].affectedField).toBe("personalInfo.firstName");
    });

    it("detects missing last name", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "Jane",
          lastName: "",
          addresses: [],
        },
      });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "experian");
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("missing_data");
      expect(errors[0].affectedField).toBe("personalInfo.lastName");
    });

    it("detects first name mismatch against known info", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ firstName: "Janet" });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "experian", knownInfo);
      const nameMismatch = errors.find(
        (e) => e.type === "name_mismatch" && e.affectedField === "personalInfo.firstName",
      );
      expect(nameMismatch).toBeDefined();
      expect(nameMismatch!.severity).toBe("critical");
    });

    it("detects last name mismatch against known info", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ lastName: "Smith" });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "experian", knownInfo);
      const nameMismatch = errors.find(
        (e) => e.type === "name_mismatch" && e.affectedField === "personalInfo.lastName",
      );
      expect(nameMismatch).toBeDefined();
      expect(nameMismatch!.severity).toBe("critical");
    });

    it("detects address state mismatch", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({
        addresses: [
          {
            street: "123 Main St",
            city: "Springfield",
            state: "CA",
            zipCode: "90210",
            type: "current" as const,
          },
        ],
      });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "equifax", knownInfo);
      const addrError = errors.find((e) => e.type === "address_error");
      expect(addrError).toBeDefined();
      expect(addrError!.severity).toBe("high");
    });

    it("detects SSN mismatch", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ ssn: "9999" });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "transunion", knownInfo);
      const ssnError = errors.find((e) => e.type === "identity_error");
      expect(ssnError).toBeDefined();
      expect(ssnError!.severity).toBe("critical");
      expect(ssnError!.legalBasis).toContain("605A");
    });

    it("returns no errors when names match (case-insensitive)", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ firstName: "jane", lastName: "doe" });

      const errors = creditErrorDetector.detectPersonalInfoErrors(report, "experian", knownInfo);
      expect(errors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // detectAccountErrors
  // -----------------------------------------------------------------------

  describe("detectAccountErrors", () => {
    it("detects negative balance", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1111",
            creditorName: "Discover",
            balance: -500,
            paymentStatus: "current",
            openedDate: new Date("2019-05-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "balance_mismatch" && e.description.includes("-500"))).toBe(true);
    });

    it("detects balance exceeding 150% of credit limit", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****2222",
            creditorName: "Amex",
            balance: 16000,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2020-03-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "balance_mismatch" && e.description.includes("exceeds"))).toBe(true);
    });

    it("does not flag balance at exactly 150% of credit limit", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****2222",
            creditorName: "Amex",
            balance: 15000,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2020-03-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "balance_mismatch" && e.description.includes("exceeds"))).toBe(false);
    });

    it("detects payment status contradicting recent history", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****3333",
            creditorName: "Citi",
            balance: 500,
            paymentStatus: "late_60",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [
              { month: "2025-12", status: "current" },
              { month: "2025-11", status: "current" },
              { month: "2025-10", status: "current" },
            ],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "incorrect_payment_status")).toBe(true);
    });

    it("does not flag status contradiction with fewer than 3 recent payments", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****3333",
            creditorName: "Citi",
            balance: 500,
            paymentStatus: "late_60",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [
              { month: "2025-12", status: "current" },
              { month: "2025-11", status: "current" },
            ],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "incorrect_payment_status")).toBe(false);
    });

    it("detects closed account with ongoing balance", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****4444",
            creditorName: "BofA",
            balance: 200,
            paymentStatus: "closed",
            openedDate: new Date("2018-01-01"),
            closedDate: new Date("2024-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "account_discrepancy")).toBe(true);
    });

    it("detects future opened date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****5555",
            creditorName: "US Bank",
            balance: 0,
            paymentStatus: "current",
            openedDate: futureDate,
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectAccountErrors(report, "experian");
      expect(errors.some((e) => e.type === "incorrect_date" && e.description.includes("future"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // detectInquiryErrors
  // -----------------------------------------------------------------------

  describe("detectInquiryErrors", () => {
    it("detects future inquiry date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "FutureBank",
            inquiryDate: futureDate,
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectInquiryErrors(report, "experian");
      expect(errors.some((e) => e.type === "incorrect_date")).toBe(true);
    });

    it("detects expired hard inquiry over 24 months", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 25);

      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "OldBank",
            inquiryDate: oldDate,
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectInquiryErrors(report, "experian");
      expect(errors.some((e) => e.type === "expired_inquiry")).toBe(true);
      expect(errors[0].legalBasis).toContain("605");
    });

    it("does not flag a hard inquiry under 24 months", () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 12);

      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "RecentBank",
            inquiryDate: recentDate,
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectInquiryErrors(report, "experian");
      expect(errors.some((e) => e.type === "expired_inquiry")).toBe(false);
    });

    it("does not flag soft inquiries as expired", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 30);

      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "soft",
            creditorName: "SoftCheck",
            inquiryDate: oldDate,
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectInquiryErrors(report, "experian");
      expect(errors.some((e) => e.type === "expired_inquiry")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // detectPublicRecordErrors
  // -----------------------------------------------------------------------

  describe("detectPublicRecordErrors", () => {
    it("detects public records older than 7 years", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);

      const report = buildMockReport({
        publicRecords: [
          {
            recordType: "judgment",
            filingDate: oldDate,
            status: "released",
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectPublicRecordErrors(report, "experian");
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("outdated_record");
      expect(errors[0].severity).toBe("high");
      expect(errors[0].legalBasis).toContain("605");
    });

    it("does not flag records within 7 years", () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 5);

      const report = buildMockReport({
        publicRecords: [
          {
            recordType: "tax_lien",
            filingDate: recentDate,
            status: "active",
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectPublicRecordErrors(report, "experian");
      expect(errors).toHaveLength(0);
    });

    it("handles records without filing date", () => {
      const report = buildMockReport({
        publicRecords: [
          {
            recordType: "bankruptcy",
            status: "discharged",
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectPublicRecordErrors(report, "experian");
      expect(errors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // detectDuplicateAccounts
  // -----------------------------------------------------------------------

  describe("detectDuplicateAccounts", () => {
    it("detects duplicate accounts by creditor name and account number", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 1500,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 1500,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectDuplicateAccounts(report, "experian");
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("duplicate_account");
    });

    it("does not flag accounts with different account numbers", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 1500,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****5678",
            creditorName: "Chase Bank",
            balance: 2000,
            paymentStatus: "current",
            openedDate: new Date("2021-03-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectDuplicateAccounts(report, "experian");
      expect(errors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // detectDataConsistencyErrors
  // -----------------------------------------------------------------------

  describe("detectDataConsistencyErrors", () => {
    it("detects closed date before opened date", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****9999",
            creditorName: "Test Bank",
            balance: 0,
            paymentStatus: "closed",
            openedDate: new Date("2022-06-01"),
            closedDate: new Date("2021-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectDataConsistencyErrors(report, "experian");
      expect(errors.some((e) => e.description.includes("closed date before"))).toBe(true);
    });

    it("detects last payment date before opened date", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "auto_loan",
            accountNumber: "****8888",
            creditorName: "Auto Lender",
            balance: 5000,
            paymentStatus: "current",
            openedDate: new Date("2023-01-15"),
            lastPaymentDate: new Date("2022-06-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectDataConsistencyErrors(report, "experian");
      expect(errors.some((e) => e.description.includes("last payment date before"))).toBe(true);
    });

    it("returns no errors for consistent dates", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****7777",
            creditorName: "Good Bank",
            balance: 0,
            paymentStatus: "closed",
            openedDate: new Date("2020-01-01"),
            closedDate: new Date("2024-01-01"),
            lastPaymentDate: new Date("2023-12-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const errors = creditErrorDetector.detectDataConsistencyErrors(report, "experian");
      expect(errors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // assessIdentityTheftRisk
  // -----------------------------------------------------------------------

  describe("assessIdentityTheftRisk", () => {
    it("returns none risk for matching personal info and known accounts", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo();
      const knownCreditors = ["Chase Bank", "Capital One", "Wells Fargo"];

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        knownInfo,
        knownCreditors,
      );

      expect(result.riskLevel).toBe("none");
      expect(result.riskScore).toBe(0);
      expect(result.indicators).toHaveLength(0);
      expect(result.shouldFreezeCredit).toBe(false);
      expect(result.shouldFilePoliceReport).toBe(false);
    });

    it("detects name variation as identity theft indicator", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ firstName: "Janet" });

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        knownInfo,
      );

      expect(result.indicators.some((i) => i.type === "name_variation")).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it("detects SSN mismatch as critical identity theft indicator", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ ssn: "1111" });

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        knownInfo,
      );

      expect(result.indicators.some((i) => i.type === "ssn_mismatch")).toBe(true);
      expect(result.criticalIndicators).toBeGreaterThanOrEqual(1);
    });

    it("detects unknown accounts when known creditors provided", () => {
      const report = buildMockReport();
      // Only know about Chase, Capital One will be flagged
      const knownCreditors = ["Chase Bank"];

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        buildKnownPersonalInfo(),
        knownCreditors,
      );

      expect(result.indicators.some((i) => i.type === "unknown_account")).toBe(true);
    });

    it("detects address in unknown state", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "Jane",
          lastName: "Doe",
          addresses: [
            { street: "123 Main", city: "Springfield", state: "IL", zipCode: "62704", type: "current" as const },
            { street: "456 Oak", city: "Dallas", state: "TX", zipCode: "75201", type: "previous" as const },
          ],
        },
      });

      const knownInfo = buildKnownPersonalInfo({
        addresses: [
          { street: "123 Main", city: "Springfield", state: "IL", zipCode: "62704", type: "current" as const },
        ],
      });

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        knownInfo,
      );

      expect(result.indicators.some((i) => i.type === "address_in_unknown_state")).toBe(true);
    });

    it("detects rapid account opening (3+ in 90 days)", () => {
      const now = new Date();
      const recentDate1 = new Date(now);
      recentDate1.setDate(recentDate1.getDate() - 10);
      const recentDate2 = new Date(now);
      recentDate2.setDate(recentDate2.getDate() - 30);
      const recentDate3 = new Date(now);
      recentDate3.setDate(recentDate3.getDate() - 60);

      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1111",
            creditorName: "Bank A",
            balance: 0,
            paymentStatus: "current",
            openedDate: recentDate1,
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****2222",
            creditorName: "Bank B",
            balance: 0,
            paymentStatus: "current",
            openedDate: recentDate2,
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "personal_loan",
            accountNumber: "****3333",
            creditorName: "Bank C",
            balance: 5000,
            paymentStatus: "current",
            openedDate: recentDate3,
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        buildKnownPersonalInfo(),
      );

      expect(result.indicators.some((i) => i.type === "rapid_account_opening")).toBe(true);
    });

    it("detects unauthorized inquiries (hard inquiries from unknown creditors)", () => {
      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "Unknown Lender",
            inquiryDate: new Date("2025-11-01"),
            isDisputed: false,
          },
        ],
      });

      const knownCreditors = ["Chase Bank", "Capital One"];

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        buildKnownPersonalInfo(),
        knownCreditors,
      );

      expect(result.indicators.some((i) => i.type === "unauthorized_inquiry")).toBe(true);
    });

    it("recommends credit freeze for high risk", () => {
      const report = buildMockReport();
      const knownInfo = buildKnownPersonalInfo({ ssn: "1111", firstName: "NotJane" });

      const result = creditErrorDetector.assessIdentityTheftRisk(
        report,
        "experian",
        knownInfo,
      );

      // SSN mismatch (30) + name variation (15) + name variation (maybe) should push to high/critical
      expect(result.shouldFreezeCredit).toBe(true);
    });

    it("includes assessed bureau in result", () => {
      const result = creditErrorDetector.assessIdentityTheftRisk(
        buildMockReport(),
        "transunion",
        buildKnownPersonalInfo(),
      );
      expect(result.bureau).toBe("transunion");
    });

    it("includes assessedAt timestamp", () => {
      const result = creditErrorDetector.assessIdentityTheftRisk(
        buildMockReport(),
        "experian",
        buildKnownPersonalInfo(),
      );
      expect(result.assessedAt).toBeInstanceOf(Date);
    });
  });

  // -----------------------------------------------------------------------
  // calculateSeverityScore
  // -----------------------------------------------------------------------

  describe("calculateSeverityScore", () => {
    it("returns 0 for no errors", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      expect(creditErrorDetector.calculateSeverityScore(errors)).toBe(0);
    });

    it("weights critical errors at 25 points", () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "identity_error",
            severity: "critical",
            description: "SSN mismatch",
            suggestedAction: "Contact bureau",
            affectedField: "personalInfo.ssn",
            bureau: "experian",
          },
        ],
        totalCount: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 1, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      expect(creditErrorDetector.calculateSeverityScore(errors)).toBe(25);
    });

    it("sums weights across multiple errors", () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "identity_error",
            severity: "critical",
            description: "SSN mismatch",
            suggestedAction: "Contact bureau",
            affectedField: "ssn",
            bureau: "experian",
          },
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Negative balance",
            suggestedAction: "Dispute",
            affectedField: "balance",
            bureau: "experian",
          },
          {
            type: "expired_inquiry",
            severity: "medium",
            description: "Old inquiry",
            suggestedAction: "Request removal",
            affectedField: "inquiry",
            bureau: "experian",
          },
          {
            type: "missing_data",
            severity: "low",
            description: "Missing field",
            suggestedAction: "Update info",
            affectedField: "field",
            bureau: "experian",
          },
        ],
        totalCount: 4,
        criticalCount: 1,
        highCount: 1,
        mediumCount: 1,
        lowCount: 1,
        bureauBreakdown: { experian: 4, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      // 25 + 15 + 8 + 3 = 51
      expect(creditErrorDetector.calculateSeverityScore(errors)).toBe(51);
    });
  });

  // -----------------------------------------------------------------------
  // classifyOverallSeverity
  // -----------------------------------------------------------------------

  describe("classifyOverallSeverity", () => {
    it("returns critical when criticalCount > 0", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };
      expect(creditErrorDetector.classifyOverallSeverity(errors)).toBe("critical");
    });

    it("returns high when highCount > 0 and no critical", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };
      expect(creditErrorDetector.classifyOverallSeverity(errors)).toBe("high");
    });

    it("returns medium when mediumCount > 0 and no higher", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 1,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 1,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };
      expect(creditErrorDetector.classifyOverallSeverity(errors)).toBe("medium");
    });

    it("returns low when only lowCount > 0", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 1,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 1,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };
      expect(creditErrorDetector.classifyOverallSeverity(errors)).toBe("low");
    });

    it("returns low when no errors", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };
      expect(creditErrorDetector.classifyOverallSeverity(errors)).toBe("low");
    });
  });

  // -----------------------------------------------------------------------
  // generateRemediationPlan
  // -----------------------------------------------------------------------

  describe("generateRemediationPlan", () => {
    it("returns empty array for no errors", () => {
      const errors: CreditReportErrors = {
        errors: [],
        totalCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      expect(creditErrorDetector.generateRemediationPlan(errors)).toEqual([]);
    });

    it("sorts actions by severity (critical first)", () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "missing_data",
            severity: "low",
            description: "Missing middle name",
            suggestedAction: "Update personal info",
            affectedField: "name",
            bureau: "experian",
          },
          {
            type: "identity_error",
            severity: "critical",
            description: "SSN mismatch",
            suggestedAction: "Contact bureau immediately",
            affectedField: "ssn",
            bureau: "experian",
          },
        ],
        totalCount: 2,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 1,
        bureauBreakdown: { experian: 2, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const actions = creditErrorDetector.generateRemediationPlan(errors);
      expect(actions[0]).toBe("Contact bureau immediately");
      expect(actions[1]).toBe("Update personal info");
    });

    it("deduplicates identical actions", () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Error 1",
            suggestedAction: "Dispute the balance",
            affectedField: "balance1",
            bureau: "experian",
          },
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Error 2",
            suggestedAction: "Dispute the balance",
            affectedField: "balance2",
            bureau: "experian",
          },
        ],
        totalCount: 2,
        criticalCount: 0,
        highCount: 2,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 2, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const actions = creditErrorDetector.generateRemediationPlan(errors);
      expect(actions).toHaveLength(1);
      expect(actions[0]).toBe("Dispute the balance");
    });
  });

  // -----------------------------------------------------------------------
  // compareReports (Cross-Bureau)
  // -----------------------------------------------------------------------

  describe("compareReports", () => {
    it("detects credit score discrepancy > 30 points", () => {
      const reportA = buildMockReport({ creditScore: 720 });
      const reportB = buildMockReport({ creditScore: 680 });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );

      expect(discrepancies.some((d) => d.field === "creditScore")).toBe(true);
    });

    it("flags high severity for score difference > 50", () => {
      const reportA = buildMockReport({ creditScore: 750 });
      const reportB = buildMockReport({ creditScore: 680 });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );

      const scoreDisc = discrepancies.find((d) => d.field === "creditScore");
      expect(scoreDisc?.severity).toBe("high");
    });

    it("does not flag score difference <= 30", () => {
      const reportA = buildMockReport({ creditScore: 720 });
      const reportB = buildMockReport({ creditScore: 710 });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );

      expect(discrepancies.some((d) => d.field === "creditScore")).toBe(false);
    });

    it("detects first name mismatch between bureaus", () => {
      const reportA = buildMockReport({
        personalInfo: {
          firstName: "Jane",
          lastName: "Doe",
          addresses: [],
        },
      });
      const reportB = buildMockReport({
        personalInfo: {
          firstName: "Janet",
          lastName: "Doe",
          addresses: [],
        },
      });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "transunion",
      );

      expect(discrepancies.some((d) => d.field === "personalInfo.firstName")).toBe(true);
    });

    it("detects last name mismatch between bureaus", () => {
      const reportA = buildMockReport({
        personalInfo: { firstName: "Jane", lastName: "Doe", addresses: [] },
      });
      const reportB = buildMockReport({
        personalInfo: { firstName: "Jane", lastName: "Smith", addresses: [] },
      });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );

      expect(discrepancies.some((d) => d.field === "personalInfo.lastName")).toBe(true);
    });

    it("detects account count discrepancy > 2", () => {
      const reportA = buildMockReport();
      const reportB = buildMockReport({ accounts: [] });

      // reportA has 2 accounts, reportB has 0 — diff of 2 is not > 2, need 3+
      // Let's make reportA have 4 accounts
      const manyAccounts = [
        ...buildMockReport().accounts,
        {
          accountType: "personal_loan" as const,
          accountNumber: "****AAAA",
          creditorName: "Lender X",
          balance: 3000,
          paymentStatus: "current" as const,
          openedDate: new Date("2022-01-01"),
          paymentHistory: [],
          isDisputed: false,
        },
        {
          accountType: "student_loan" as const,
          accountNumber: "****BBBB",
          creditorName: "Lender Y",
          balance: 10000,
          paymentStatus: "current" as const,
          openedDate: new Date("2019-01-01"),
          paymentHistory: [],
          isDisputed: false,
        },
      ];
      const reportABig = buildMockReport({ accounts: manyAccounts });

      const discrepancies = creditErrorDetector.compareReports(
        reportABig,
        "experian",
        reportB,
        "equifax",
      );

      expect(discrepancies.some((d) => d.field === "accounts.count")).toBe(true);
    });

    it("detects balance discrepancy for matching accounts", () => {
      const reportA = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 1500,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const reportB = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 3000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );

      expect(discrepancies.some((d) => d.field.includes("Chase Bank") && d.field.includes("balance"))).toBe(true);
    });

    it("detects payment status discrepancy for matching accounts", () => {
      const reportA = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 1500,
            paymentStatus: "current",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const reportB = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 1500,
            paymentStatus: "late_30",
            openedDate: new Date("2020-01-15"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });

      const discrepancies = creditErrorDetector.compareReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );

      expect(discrepancies.some((d) => d.field.includes("paymentStatus"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — saveDetectedErrors
  // -----------------------------------------------------------------------

  describe("saveDetectedErrors", () => {
    it("saves each error as a separate record", async () => {
      mockSupabase.insert.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) => resolve({ error: null })),
      });

      const errors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Negative balance",
            suggestedAction: "Dispute",
            affectedField: "balance",
            bureau: "experian",
            legalBasis: "FCRA 611",
          },
          {
            type: "missing_data",
            severity: "low",
            description: "Missing field",
            suggestedAction: "Update",
            affectedField: "name",
            bureau: "experian",
          },
        ],
        totalCount: 2,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 1,
        bureauBreakdown: { experian: 2, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const result = await creditErrorDetector.saveDetectedErrors("user-123", errors);
      expect(result.saved).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockSupabase.from).toHaveBeenCalledWith("credit_report_errors");
    });

    it("tracks failures when insert fails", async () => {
      mockSupabase.insert.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: { message: "DB error" } }),
        ),
      });

      const errors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Error",
            suggestedAction: "Fix",
            affectedField: "balance",
            bureau: "experian",
          },
        ],
        totalCount: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 1, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const result = await creditErrorDetector.saveDetectedErrors("user-123", errors);
      expect(result.saved).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — getDetectedErrors
  // -----------------------------------------------------------------------

  describe("getDetectedErrors", () => {
    it("retrieves errors for a user", async () => {
      const mockRecords: DetectedErrorRecord[] = [
        {
          id: "err-1",
          user_id: "user-123",
          bureau: "experian",
          error_type: "balance_mismatch",
          severity: "high",
          description: "Negative balance",
          suggested_action: "Dispute",
          affected_field: "balance",
          legal_basis: "FCRA 611",
          status: "open",
          detected_at: "2025-12-01T00:00:00Z",
          resolved_at: null,
        },
      ];

      mockSupabase.__setDefaultResolution({ data: mockRecords, error: null });

      const result = await creditErrorDetector.getDetectedErrors("user-123");
      expect(result).toEqual(mockRecords);
      expect(mockSupabase.from).toHaveBeenCalledWith("credit_report_errors");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("filters by bureau when provided", async () => {
      mockSupabase.__setDefaultResolution({ data: [], error: null });

      await creditErrorDetector.getDetectedErrors("user-123", "equifax");
      expect(mockSupabase.eq).toHaveBeenCalledWith("bureau", "equifax");
    });

    it("filters by status when provided", async () => {
      mockSupabase.__setDefaultResolution({ data: [], error: null });

      await creditErrorDetector.getDetectedErrors("user-123", undefined, "disputed");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "disputed");
    });

    it("throws on database error", async () => {
      mockSupabase.__setDefaultResolution({
        data: null,
        error: { message: "Connection failed" },
      });

      await expect(
        creditErrorDetector.getDetectedErrors("user-123"),
      ).rejects.toThrow("Failed to retrieve detected errors");
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — updateErrorStatus
  // -----------------------------------------------------------------------

  describe("updateErrorStatus", () => {
    it("updates status to disputed", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.__setDefaultResolution({ data: null, error: null });
      // Make the chain return resolved (no error)
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await creditErrorDetector.updateErrorStatus("err-1", "disputed");
      expect(mockSupabase.from).toHaveBeenCalledWith("credit_report_errors");
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("sets resolved_at when status is resolved", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      });

      await creditErrorDetector.updateErrorStatus("err-2", "resolved");
      const updateArg = mockSupabase.update.mock.calls[0][0];
      expect(updateArg.status).toBe("resolved");
      expect(updateArg.resolved_at).toBeDefined();
    });

    it("throws on database error", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        then: jest.fn((resolve: (v: unknown) => void) =>
          resolve({ error: { message: "Update failed" } }),
        ),
      });

      await expect(
        creditErrorDetector.updateErrorStatus("err-1", "dismissed"),
      ).rejects.toThrow("Failed to update error status");
    });
  });

  // -----------------------------------------------------------------------
  // Persistence — analyzeErrorTrends
  // -----------------------------------------------------------------------

  describe("analyzeErrorTrends", () => {
    it("returns improving trend when current errors < previous", async () => {
      const previousErrors: DetectedErrorRecord[] = [
        {
          id: "e1",
          user_id: "user-1",
          bureau: "experian",
          error_type: "balance_mismatch",
          severity: "high",
          description: "Error 1",
          suggested_action: "Fix",
          affected_field: "balance",
          legal_basis: null,
          status: "open",
          detected_at: "2025-11-01T00:00:00Z",
          resolved_at: null,
        },
        {
          id: "e2",
          user_id: "user-1",
          bureau: "experian",
          error_type: "missing_data",
          severity: "low",
          description: "Error 2",
          suggested_action: "Fix",
          affected_field: "name",
          legal_basis: null,
          status: "resolved",
          detected_at: "2025-11-01T00:00:00Z",
          resolved_at: "2025-12-01T00:00:00Z",
        },
      ];

      mockSupabase.__setDefaultResolution({ data: previousErrors, error: null });

      const currentErrors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Error 1",
            suggestedAction: "Fix",
            affectedField: "balance",
            bureau: "experian",
          },
        ],
        totalCount: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 1, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const result = await creditErrorDetector.analyzeErrorTrends(
        "user-1",
        "experian",
        currentErrors,
      );

      expect(result.overallTrend).toBe("improving");
      expect(result.userId).toBe("user-1");
      expect(result.bureau).toBe("experian");
    });

    it("returns worsening trend when current errors > previous", async () => {
      mockSupabase.__setDefaultResolution({ data: [], error: null });

      const currentErrors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "New Error",
            suggestedAction: "Fix",
            affectedField: "balance",
            bureau: "experian",
          },
        ],
        totalCount: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 1, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const result = await creditErrorDetector.analyzeErrorTrends(
        "user-1",
        "experian",
        currentErrors,
      );

      expect(result.overallTrend).toBe("worsening");
      expect(result.newErrorsThisScan).toBe(1);
    });

    it("returns stable trend when error count is the same", async () => {
      const previousErrors: DetectedErrorRecord[] = [
        {
          id: "e1",
          user_id: "user-1",
          bureau: "experian",
          error_type: "balance_mismatch",
          severity: "high",
          description: "Same",
          suggested_action: "Fix",
          affected_field: "balance",
          legal_basis: null,
          status: "open",
          detected_at: "2025-11-01T00:00:00Z",
          resolved_at: null,
        },
      ];

      mockSupabase.__setDefaultResolution({ data: previousErrors, error: null });

      const currentErrors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Same",
            suggestedAction: "Fix",
            affectedField: "balance",
            bureau: "experian",
          },
        ],
        totalCount: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 1, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const result = await creditErrorDetector.analyzeErrorTrends(
        "user-1",
        "experian",
        currentErrors,
      );

      expect(result.overallTrend).toBe("stable");
    });

    it("includes recurring error information", async () => {
      const previousErrors: DetectedErrorRecord[] = [
        {
          id: "e1",
          user_id: "user-1",
          bureau: "experian",
          error_type: "balance_mismatch",
          severity: "high",
          description: "Recurring",
          suggested_action: "Fix",
          affected_field: "balance",
          legal_basis: null,
          status: "open",
          detected_at: "2025-10-01T00:00:00Z",
          resolved_at: null,
        },
        {
          id: "e2",
          user_id: "user-1",
          bureau: "experian",
          error_type: "balance_mismatch",
          severity: "high",
          description: "Recurring again",
          suggested_action: "Fix",
          affected_field: "balance",
          legal_basis: null,
          status: "open",
          detected_at: "2025-11-01T00:00:00Z",
          resolved_at: null,
        },
      ];

      mockSupabase.__setDefaultResolution({ data: previousErrors, error: null });

      const currentErrors: CreditReportErrors = {
        errors: [],
        totalCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const result = await creditErrorDetector.analyzeErrorTrends(
        "user-1",
        "experian",
        currentErrors,
      );

      expect(result.recurringErrors).toHaveLength(1);
      expect(result.recurringErrors[0].errorType).toBe("balance_mismatch");
      expect(result.recurringErrors[0].occurrenceCount).toBe(2);
    });
  });
});
