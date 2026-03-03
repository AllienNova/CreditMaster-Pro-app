/**
 * Credit Report Parser — Comprehensive Tests
 *
 * Tests for:
 * - Bureau-specific parsing (Experian, Equifax, TransUnion)
 * - Error detection algorithm (name mismatches, address errors, account discrepancies, balance mismatches)
 * - Hard inquiry removal automation
 * - Dispute submission integration
 * - Validation and analytics
 * - Cross-bureau comparison
 */

import type {
  ParsedCreditReport,
  Bureau,
  PersonalInfo,
  CreditBureauRawPayload,
} from "@/types/credit-bureau";
import {
  CreditReportParser,
  creditReportParser,
} from "../credit-report-parser";
import type {
  CreditReportErrors,
  CreditReportErrorType,
  ExpiredInquiry,
  InquiryRemovalRequest,
  DisputeSubmissionResult,
} from "../credit-report-parser";

// =====================================================
// TEST FIXTURES
// =====================================================

function buildMockReport(overrides?: Partial<ParsedCreditReport>): ParsedCreditReport {
  return {
    personalInfo: {
      firstName: "John",
      lastName: "Doe",
      middleName: "A",
      dateOfBirth: new Date("1985-06-15"),
      ssn: "***-**-1234",
      addresses: [
        {
          street: "123 Main St",
          city: "Springfield",
          state: "IL",
          zipCode: "62704",
          type: "current",
          reportedDate: new Date("2024-01-01"),
        },
      ],
    },
    creditScore: 720,
    scoreFactors: ["Low credit utilization", "Long credit history"],
    accounts: [
      {
        accountType: "credit_card",
        accountNumber: "****1234",
        creditorName: "Chase Bank",
        balance: 2500,
        creditLimit: 10000,
        paymentStatus: "current",
        openedDate: new Date("2018-03-01"),
        lastPaymentDate: new Date("2025-12-15"),
        paymentHistory: [
          { month: "2025-12", status: "current", amount: 150 },
          { month: "2025-11", status: "current", amount: 150 },
          { month: "2025-10", status: "current", amount: 150 },
        ],
        isDisputed: false,
      },
      {
        accountType: "auto_loan",
        accountNumber: "****5678",
        creditorName: "Wells Fargo",
        balance: 15000,
        paymentStatus: "current",
        openedDate: new Date("2020-01-01"),
        lastPaymentDate: new Date("2025-12-01"),
        paymentHistory: [
          { month: "2025-12", status: "current", amount: 400 },
          { month: "2025-11", status: "current", amount: 400 },
        ],
        isDisputed: false,
      },
    ],
    inquiries: [
      {
        inquiryType: "hard",
        creditorName: "Capital One",
        inquiryDate: new Date("2025-06-01"),
        isDisputed: false,
      },
      {
        inquiryType: "soft",
        creditorName: "Discover",
        inquiryDate: new Date("2025-09-01"),
        isDisputed: false,
      },
    ],
    publicRecords: [],
    ...overrides,
  };
}

function buildExperianPayload(
  overrides?: Record<string, unknown>,
): CreditBureauRawPayload {
  return {
    CreditProfile: {
      consumer: {
        firstName: "Jane",
        lastName: "Smith",
        ssn: "***-**-9876",
        dateOfBirth: "1990-04-22",
        addresses: [
          {
            street: "456 Oak Ave",
            city: "Chicago",
            state: "IL",
            zipCode: "60601",
            type: "current",
          },
        ],
      },
      riskModel: {
        score: 745,
        factors: ["Low utilization", "Excellent payment history"],
      },
      tradelines: [
        {
          creditorName: "Citibank",
          accountNumber: "****3456",
          accountType: "credit_card",
          balance: 1200,
          creditLimit: 8000,
          paymentStatus: "current",
          openedDate: "2019-05-01",
          paymentHistory: [
            { month: "2025-12", status: "current", amount: 100 },
          ],
          isDisputed: false,
        },
      ],
      inquiries: [
        {
          creditorName: "Bank of America",
          inquiryType: "hard",
          inquiryDate: "2025-03-15",
          isDisputed: false,
        },
      ],
      publicRecords: [],
    },
    ...overrides,
  };
}

function buildEquifaxPayload(
  overrides?: Record<string, unknown>,
): CreditBureauRawPayload {
  return {
    equifaxCreditReport: {
      subject: {
        firstName: "Jane",
        lastName: "Smith",
        ssn: "***-**-9876",
        dob: "1990-04-22",
        addresses: [
          {
            street: "456 Oak Ave",
            city: "Chicago",
            state: "IL",
            zipCode: "60601",
            type: "current",
          },
        ],
      },
      score: {
        value: 738,
        factors: ["Low utilization"],
      },
      trades: [
        {
          creditor_name: "Citibank",
          account_number: "****3456",
          account_type: "credit_card",
          balance: 1200,
          credit_limit: 8000,
          payment_status: "current",
          opened_date: "2019-05-01",
          paymentHistory: [
            { month: "2025-12", status: "current", amount: 100 },
          ],
          is_disputed: false,
        },
      ],
      inquiries: [
        {
          creditor_name: "Capital One",
          inquiry_type: "hard",
          inquiry_date: "2025-01-10",
          is_disputed: false,
        },
      ],
      publicRecords: [],
    },
    ...overrides,
  };
}

function buildTransUnionPayload(
  overrides?: Record<string, unknown>,
): CreditBureauRawPayload {
  return {
    TransUnionReport: {
      borrower: {
        firstName: "Jane",
        lastName: "Smith",
        ssn: "***-**-9876",
        dateOfBirth: "1990-04-22",
        addresses: [
          {
            streetAddress: "456 Oak Ave",
            city: "Chicago",
            state: "IL",
            postalCode: "60601",
            type: "current",
          },
        ],
      },
      creditScore: {
        score: 740,
        factors: ["Low utilization", "Long history"],
      },
      tradeLines: [
        {
          name: "Citibank",
          maskedAccountNumber: "****3456",
          type: "creditcard",
          currentBalance: 1200,
          highCredit: 8000,
          status: "current",
          dateOpened: "2019-05-01",
          payment_history: [
            { month: "2025-12", status: "current", amount: 100 },
          ],
          isDisputed: false,
        },
      ],
      inquiries: [
        {
          name: "Discover",
          type: "hard",
          date: "2025-02-20",
          isDisputed: false,
        },
      ],
      publicRecords: [],
    },
    ...overrides,
  };
}

// =====================================================
// TESTS
// =====================================================

describe("CreditReportParser", () => {
  let parser: CreditReportParser;

  beforeEach(() => {
    parser = new CreditReportParser();
  });

  // -------------------------------------------------
  // Singleton export
  // -------------------------------------------------
  describe("singleton export", () => {
    it("exports a singleton instance", () => {
      expect(creditReportParser).toBeInstanceOf(CreditReportParser);
    });
  });

  // -------------------------------------------------
  // parseReport
  // -------------------------------------------------
  describe("parseReport", () => {
    it("throws when rawData is falsy", async () => {
      await expect(
        parser.parseReport(null as unknown as CreditBureauRawPayload, "experian"),
      ).rejects.toThrow("Raw data is required");
    });

    it("throws when bureau is falsy", async () => {
      await expect(
        parser.parseReport({} as CreditBureauRawPayload, "" as Bureau),
      ).rejects.toThrow("Bureau is required");
    });

    it("returns already-parsed report unchanged", async () => {
      const parsed = buildMockReport();
      const result = await parser.parseReport(parsed, "experian");
      expect(result).toBe(parsed);
    });

    it("parses mock report from raw data", async () => {
      const raw: CreditBureauRawPayload = {
        isMock: true,
        creditScore: 700,
        accountCount: 3,
        inquiryCount: 1,
        publicRecordCount: 0,
        includeNegativeItems: false,
      };
      const result = await parser.parseReport(raw, "equifax");
      expect(result.creditScore).toBe(700);
      expect(result.accounts.length).toBe(3);
      expect(result.inquiries.length).toBe(1);
      expect(result.personalInfo.firstName).toBeTruthy();
    });

    it("detects mock format with personalInfo + accounts", async () => {
      const raw = buildMockReport() as unknown as CreditBureauRawPayload;
      const result = await parser.parseReport(raw, "experian");
      expect(result.personalInfo.firstName).toBe("John");
    });

    it("throws for Plaid format", async () => {
      const raw: CreditBureauRawPayload = { credit_report: {} };
      await expect(parser.parseReport(raw, "experian")).rejects.toThrow(
        "Plaid format parsing requires API integration",
      );
    });
  });

  // -------------------------------------------------
  // Experian parsing
  // -------------------------------------------------
  describe("parseReport — Experian format", () => {
    it("parses Experian CreditProfile payload", async () => {
      const payload = buildExperianPayload();
      const result = await parser.parseReport(payload, "experian");

      expect(result.personalInfo.firstName).toBe("Jane");
      expect(result.personalInfo.lastName).toBe("Smith");
      expect(result.creditScore).toBe(745);
      expect(result.accounts.length).toBe(1);
      expect(result.accounts[0].creditorName).toBe("Citibank");
      expect(result.accounts[0].accountType).toBe("credit_card");
      expect(result.accounts[0].balance).toBe(1200);
      expect(result.inquiries.length).toBe(1);
      expect(result.inquiries[0].creditorName).toBe("Bank of America");
    });

    it("parses Experian with experianData key", async () => {
      const payload: CreditBureauRawPayload = {
        experianData: {
          consumer: { firstName: "Bob", lastName: "Jones", creditScore: 680 },
          tradelines: [],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "experian");
      expect(result.personalInfo.firstName).toBe("Bob");
      expect(result.creditScore).toBe(680);
    });

    it("throws on invalid Experian payload (missing root key)", async () => {
      // Force Experian format detection without valid data
      const payload: CreditBureauRawPayload = {
        CreditProfile: null,
      };
      await expect(parser.parseReport(payload, "experian")).rejects.toThrow(
        "Invalid Experian payload",
      );
    });
  });

  // -------------------------------------------------
  // Equifax parsing
  // -------------------------------------------------
  describe("parseReport — Equifax format", () => {
    it("parses Equifax equifaxCreditReport payload", async () => {
      const payload = buildEquifaxPayload();
      const result = await parser.parseReport(payload, "equifax");

      expect(result.personalInfo.firstName).toBe("Jane");
      expect(result.personalInfo.lastName).toBe("Smith");
      expect(result.creditScore).toBe(738);
      expect(result.accounts.length).toBe(1);
      expect(result.accounts[0].creditorName).toBe("Citibank");
      expect(result.inquiries.length).toBe(1);
      expect(result.inquiries[0].creditorName).toBe("Capital One");
    });

    it("parses Equifax with EFXReport key", async () => {
      const payload: CreditBureauRawPayload = {
        EFXReport: {
          consumer: { firstName: "Alice", lastName: "Brown", creditScore: 790 },
          accounts: [],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "equifax");
      expect(result.personalInfo.firstName).toBe("Alice");
      expect(result.creditScore).toBe(790);
    });

    it("throws on invalid Equifax payload", async () => {
      const payload: CreditBureauRawPayload = {
        equifaxCreditReport: null,
      };
      await expect(parser.parseReport(payload, "equifax")).rejects.toThrow(
        "Invalid Equifax payload",
      );
    });
  });

  // -------------------------------------------------
  // TransUnion parsing
  // -------------------------------------------------
  describe("parseReport — TransUnion format", () => {
    it("parses TransUnion TransUnionReport payload", async () => {
      const payload = buildTransUnionPayload();
      const result = await parser.parseReport(payload, "transunion");

      expect(result.personalInfo.firstName).toBe("Jane");
      expect(result.personalInfo.lastName).toBe("Smith");
      expect(result.creditScore).toBe(740);
      expect(result.accounts.length).toBe(1);
      expect(result.accounts[0].creditorName).toBe("Citibank");
      expect(result.accounts[0].creditLimit).toBe(8000);
      expect(result.inquiries.length).toBe(1);
      expect(result.inquiries[0].creditorName).toBe("Discover");
    });

    it("parses TransUnion with TUReport key", async () => {
      const payload: CreditBureauRawPayload = {
        TUReport: {
          borrower: { first_name: "Tom", last_name: "Wilson", creditScore: 710 },
          tradelines: [],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "transunion");
      expect(result.personalInfo.firstName).toBe("Tom");
      expect(result.personalInfo.lastName).toBe("Wilson");
      expect(result.creditScore).toBe(710);
    });

    it("throws on invalid TransUnion payload", async () => {
      const payload: CreditBureauRawPayload = {
        TransUnionReport: null,
      };
      await expect(parser.parseReport(payload, "transunion")).rejects.toThrow(
        "Invalid TransUnion payload",
      );
    });
  });

  // -------------------------------------------------
  // Error Detection
  // -------------------------------------------------
  describe("detectErrors", () => {
    it("returns zero errors for a clean report", () => {
      const report = buildMockReport();
      const result = parser.detectErrors(report, "experian");
      expect(result.totalCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.criticalCount).toBe(0);
    });

    it("detects missing first name", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "",
          lastName: "Doe",
          addresses: [
            { street: "123 Main", city: "Springfield", state: "IL", zipCode: "62704", type: "current" },
          ],
        },
      });
      const result = parser.detectErrors(report, "experian");
      const nameErrors = result.errors.filter((e) => e.type === "missing_data");
      expect(nameErrors.length).toBeGreaterThanOrEqual(1);
      expect(nameErrors[0].affectedField).toBe("personalInfo.firstName");
    });

    it("detects missing last name", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "John",
          lastName: "",
          addresses: [],
        },
      });
      const result = parser.detectErrors(report, "equifax");
      const nameErrors = result.errors.filter((e) => e.type === "missing_data");
      expect(nameErrors.length).toBeGreaterThanOrEqual(1);
    });

    it("detects name mismatch against known personal info", () => {
      const report = buildMockReport();
      const knownInfo: Partial<PersonalInfo> = {
        firstName: "Jonathan",
        lastName: "Doe",
        addresses: [],
      };
      const result = parser.detectErrors(report, "experian", knownInfo);
      const nameMismatches = result.errors.filter(
        (e) => e.type === "name_mismatch",
      );
      expect(nameMismatches.length).toBe(1);
      expect(nameMismatches[0].severity).toBe("critical");
      expect(nameMismatches[0].description).toContain("Jonathan");
    });

    it("detects last name mismatch against known personal info", () => {
      const report = buildMockReport();
      const knownInfo: Partial<PersonalInfo> = {
        firstName: "John",
        lastName: "Smith",
        addresses: [],
      };
      const result = parser.detectErrors(report, "experian", knownInfo);
      const nameMismatches = result.errors.filter(
        (e) => e.type === "name_mismatch",
      );
      expect(nameMismatches.length).toBe(1);
      expect(nameMismatches[0].description).toContain("Smith");
    });

    it("detects address state mismatch", () => {
      const report = buildMockReport();
      const knownInfo: Partial<PersonalInfo> = {
        firstName: "John",
        lastName: "Doe",
        addresses: [
          { street: "123 Main St", city: "Springfield", state: "NY", zipCode: "10001", type: "current" },
        ],
      };
      const result = parser.detectErrors(report, "equifax", knownInfo);
      const addressErrors = result.errors.filter(
        (e) => e.type === "address_error",
      );
      expect(addressErrors.length).toBe(1);
      expect(addressErrors[0].severity).toBe("high");
    });

    it("detects negative balance", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1111",
            creditorName: "Bad Bank",
            balance: -500,
            creditLimit: 5000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "transunion");
      const balanceErrors = result.errors.filter(
        (e) => e.type === "balance_mismatch",
      );
      expect(balanceErrors.length).toBe(1);
      expect(balanceErrors[0].severity).toBe("high");
    });

    it("detects balance significantly exceeding credit limit", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****2222",
            creditorName: "Over Bank",
            balance: 16000,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "experian");
      const balanceErrors = result.errors.filter(
        (e) => e.type === "balance_mismatch",
      );
      expect(balanceErrors.length).toBe(1);
      expect(balanceErrors[0].severity).toBe("medium");
    });

    it("detects incorrect payment status contradicted by history", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****3333",
            creditorName: "Inconsistent Bank",
            balance: 1000,
            creditLimit: 5000,
            paymentStatus: "late_60",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [
              { month: "2025-12", status: "current", amount: 100 },
              { month: "2025-11", status: "current", amount: 100 },
              { month: "2025-10", status: "current", amount: 100 },
            ],
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "equifax");
      const statusErrors = result.errors.filter(
        (e) => e.type === "incorrect_payment_status",
      );
      expect(statusErrors.length).toBe(1);
      expect(statusErrors[0].severity).toBe("high");
    });

    it("detects closed account with balance", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****4444",
            creditorName: "Closed Bank",
            balance: 500,
            creditLimit: 3000,
            paymentStatus: "closed",
            openedDate: new Date("2018-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "transunion");
      const discrepancyErrors = result.errors.filter(
        (e) => e.type === "account_discrepancy",
      );
      expect(discrepancyErrors.length).toBe(1);
    });

    it("detects future opened date on account", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****5555",
            creditorName: "Future Bank",
            balance: 0,
            creditLimit: 5000,
            paymentStatus: "current",
            openedDate: futureDate,
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "experian");
      const dateErrors = result.errors.filter(
        (e) => e.type === "incorrect_date",
      );
      expect(dateErrors.length).toBe(1);
    });

    it("detects duplicate accounts", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 2500,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2018-03-01"),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 2500,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2018-03-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "experian");
      const duplicates = result.errors.filter(
        (e) => e.type === "duplicate_account",
      );
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].severity).toBe("high");
    });

    it("detects expired hard inquiries", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 30);
      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "Old Lender",
            inquiryDate: oldDate,
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "equifax");
      const expiredErrors = result.errors.filter(
        (e) => e.type === "expired_inquiry",
      );
      expect(expiredErrors.length).toBe(1);
      expect(expiredErrors[0].legalBasis).toContain("Section 605");
    });

    it("detects future inquiry date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "Future Lender",
            inquiryDate: futureDate,
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "transunion");
      const dateErrors = result.errors.filter(
        (e) => e.type === "incorrect_date",
      );
      expect(dateErrors.length).toBe(1);
    });

    it("detects outdated public records beyond 7-year limit", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);
      const report = buildMockReport({
        publicRecords: [
          {
            recordType: "judgment",
            filingDate: oldDate,
            status: "filed",
            amount: 5000,
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "experian");
      const outdated = result.errors.filter(
        (e) => e.type === "outdated_record",
      );
      expect(outdated.length).toBe(1);
      expect(outdated[0].legalBasis).toContain("Section 605");
    });

    it("correctly computes severity breakdown", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);
      const report = buildMockReport({
        personalInfo: {
          firstName: "John",
          lastName: "Doe",
          addresses: [
            { street: "123 Main", city: "Springfield", state: "IL", zipCode: "62704", type: "current" },
          ],
        },
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****0001",
            creditorName: "Bank A",
            balance: -100,
            creditLimit: 5000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
        publicRecords: [
          {
            recordType: "judgment",
            filingDate: oldDate,
            status: "filed",
            isDisputed: false,
          },
        ],
      });
      const knownInfo: Partial<PersonalInfo> = {
        firstName: "Jonathan",
        lastName: "Doe",
        addresses: [],
      };
      const result = parser.detectErrors(report, "experian", knownInfo);
      expect(result.totalCount).toBeGreaterThanOrEqual(3);
      expect(result.criticalCount).toBeGreaterThanOrEqual(1); // name mismatch
      expect(result.highCount).toBeGreaterThanOrEqual(1); // negative balance or outdated
      expect(result.bureauBreakdown.experian).toBe(result.totalCount);
    });

    it("includes legal basis on all errors", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);
      const report = buildMockReport({
        publicRecords: [
          {
            recordType: "tax_lien",
            filingDate: oldDate,
            status: "filed",
            isDisputed: false,
          },
        ],
      });
      const result = parser.detectErrors(report, "experian");
      for (const error of result.errors) {
        expect(error.legalBasis).toBeTruthy();
        expect(error.legalBasis).toContain("FCRA");
      }
    });
  });

  // -------------------------------------------------
  // Hard Inquiry Removal
  // -------------------------------------------------
  describe("identifyExpiredInquiries", () => {
    it("returns empty array when no expired hard inquiries exist", () => {
      const report = buildMockReport();
      const result = parser.identifyExpiredInquiries(report, "experian");
      expect(result).toEqual([]);
    });

    it("identifies hard inquiries older than 24 months", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 30);
      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "Expired Lender",
            inquiryDate: oldDate,
            isDisputed: false,
          },
          {
            inquiryType: "hard",
            creditorName: "Recent Lender",
            inquiryDate: new Date(),
            isDisputed: false,
          },
        ],
      });
      const result = parser.identifyExpiredInquiries(report, "equifax");
      expect(result.length).toBe(1);
      expect(result[0].creditorName).toBe("Expired Lender");
      expect(result[0].ageInMonths).toBeGreaterThanOrEqual(30);
      expect(result[0].bureau).toBe("equifax");
    });

    it("skips soft inquiries", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 30);
      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "soft",
            creditorName: "Soft Lender",
            inquiryDate: oldDate,
            isDisputed: false,
          },
        ],
      });
      const result = parser.identifyExpiredInquiries(report, "transunion");
      expect(result.length).toBe(0);
    });

    it("generates removal request with letter template", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 26);
      const report = buildMockReport({
        inquiries: [
          {
            inquiryType: "hard",
            creditorName: "Old Bank",
            inquiryDate: oldDate,
            isDisputed: false,
          },
        ],
      });
      const result = parser.identifyExpiredInquiries(report, "experian");
      expect(result.length).toBe(1);
      const req = result[0].removalRequest;
      expect(req.bureau).toBe("experian");
      expect(req.creditorName).toBe("Old Bank");
      expect(req.legalBasis).toContain("FCRA Section 605");
      expect(req.letterTemplate).toContain("Old Bank");
      expect(req.letterTemplate).toContain("Experian");
      expect(req.letterTemplate).toContain("24 months");
    });
  });

  describe("generateBulkInquiryRemovalRequests", () => {
    it("generates requests for all expired hard inquiries", () => {
      const oldDate1 = new Date();
      oldDate1.setMonth(oldDate1.getMonth() - 25);
      const oldDate2 = new Date();
      oldDate2.setMonth(oldDate2.getMonth() - 36);

      const report = buildMockReport({
        inquiries: [
          { inquiryType: "hard", creditorName: "Bank A", inquiryDate: oldDate1, isDisputed: false },
          { inquiryType: "hard", creditorName: "Bank B", inquiryDate: oldDate2, isDisputed: false },
          { inquiryType: "hard", creditorName: "Bank C", inquiryDate: new Date(), isDisputed: false },
        ],
      });
      const requests = parser.generateBulkInquiryRemovalRequests(report, "equifax");
      expect(requests.length).toBe(2);
      expect(requests[0].creditorName).toBe("Bank A");
      expect(requests[1].creditorName).toBe("Bank B");
    });
  });

  // -------------------------------------------------
  // Dispute Submission Integration
  // -------------------------------------------------
  describe("submitErrorDisputes", () => {
    it("submits disputes for critical and high severity errors", async () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "name_mismatch",
            severity: "critical",
            description: "Name mismatch",
            suggestedAction: "Dispute",
            affectedField: "personalInfo.firstName",
            bureau: "experian",
            legalBasis: "FCRA Section 611",
          },
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Negative balance",
            suggestedAction: "Dispute",
            affectedField: "accounts[0].balance",
            bureau: "experian",
            legalBasis: "FCRA Section 611",
          },
          {
            type: "account_discrepancy",
            severity: "medium",
            description: "Closed account with balance",
            suggestedAction: "Verify",
            affectedField: "accounts[1].balance",
            bureau: "experian",
            legalBasis: "FCRA Section 611",
          },
        ],
        totalCount: 3,
        criticalCount: 1,
        highCount: 1,
        mediumCount: 1,
        lowCount: 0,
        bureauBreakdown: { experian: 3, equifax: 0, transunion: 0 },
        scanDate: new Date(),
      };

      const mockSubmit = jest.fn().mockResolvedValue({
        success: true,
        disputeId: "dispute-123",
      });

      const results = await parser.submitErrorDisputes(
        errors,
        "user-1",
        mockSubmit,
      );

      // Only critical + high = 2 disputes
      expect(results.length).toBe(2);
      expect(mockSubmit).toHaveBeenCalledTimes(2);
      expect(results[0].success).toBe(true);
      expect(results[0].disputeId).toBe("dispute-123");
      expect(results[0].bureau).toBe("experian");
      expect(results[1].success).toBe(true);
    });

    it("handles submission failures gracefully", async () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "name_mismatch",
            severity: "critical",
            description: "Name mismatch",
            suggestedAction: "Dispute",
            affectedField: "personalInfo.firstName",
            bureau: "equifax",
            legalBasis: "FCRA Section 611",
          },
        ],
        totalCount: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        bureauBreakdown: { experian: 0, equifax: 1, transunion: 0 },
        scanDate: new Date(),
      };

      const mockSubmit = jest.fn().mockRejectedValue(new Error("Network error"));

      const results = await parser.submitErrorDisputes(
        errors,
        "user-1",
        mockSubmit,
      );

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Network error");
    });

    it("does not submit disputes for low/medium severity errors", async () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "account_discrepancy",
            severity: "medium",
            description: "Minor issue",
            suggestedAction: "Verify",
            affectedField: "accounts[0]",
            bureau: "transunion",
            legalBasis: "FCRA Section 611",
          },
          {
            type: "expired_inquiry",
            severity: "low",
            description: "Old inquiry",
            suggestedAction: "Request removal",
            affectedField: "inquiries[0]",
            bureau: "transunion",
            legalBasis: "FCRA Section 605",
          },
        ],
        totalCount: 2,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 1,
        lowCount: 1,
        bureauBreakdown: { experian: 0, equifax: 0, transunion: 2 },
        scanDate: new Date(),
      };

      const mockSubmit = jest.fn();
      const results = await parser.submitErrorDisputes(
        errors,
        "user-1",
        mockSubmit,
      );

      expect(results.length).toBe(0);
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("returns estimated resolution for submitted disputes", async () => {
      const errors: CreditReportErrors = {
        errors: [
          {
            type: "balance_mismatch",
            severity: "high",
            description: "Wrong balance",
            suggestedAction: "Dispute",
            affectedField: "accounts[0].balance",
            bureau: "experian",
            legalBasis: "FCRA Section 611",
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

      const mockSubmit = jest.fn().mockResolvedValue({
        success: true,
        disputeId: "d-456",
      });

      const results = await parser.submitErrorDisputes(
        errors,
        "user-1",
        mockSubmit,
      );

      expect(results[0].estimatedResolution).toBe("30-45 days");
      expect(results[0].submittedAt).toBeInstanceOf(Date);
    });
  });

  // -------------------------------------------------
  // Cross-Bureau Comparison
  // -------------------------------------------------
  describe("compareBureauReports", () => {
    it("returns empty array when reports are consistent", () => {
      const reportA = buildMockReport({ creditScore: 720 });
      const reportB = buildMockReport({ creditScore: 725 });
      const result = parser.compareBureauReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );
      // Score diff is 5, under threshold
      const scoreDiscrepancies = result.filter(
        (d) => d.field === "creditScore",
      );
      expect(scoreDiscrepancies.length).toBe(0);
    });

    it("detects significant credit score differences", () => {
      const reportA = buildMockReport({ creditScore: 720 });
      const reportB = buildMockReport({ creditScore: 660 });
      const result = parser.compareBureauReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );
      const scoreDisc = result.find((d) => d.field === "creditScore");
      expect(scoreDisc).toBeTruthy();
      expect(scoreDisc!.severity).toBe("high");
      expect(scoreDisc!.description).toContain("60");
    });

    it("detects first name mismatch between bureaus", () => {
      const reportA = buildMockReport();
      const reportB = buildMockReport({
        personalInfo: {
          ...buildMockReport().personalInfo,
          firstName: "Jonathan",
        },
      });
      const result = parser.compareBureauReports(
        reportA,
        "experian",
        reportB,
        "transunion",
      );
      const nameDisc = result.find(
        (d) => d.field === "personalInfo.firstName",
      );
      expect(nameDisc).toBeTruthy();
      expect(nameDisc!.severity).toBe("high");
    });

    it("detects last name mismatch between bureaus", () => {
      const reportA = buildMockReport();
      const reportB = buildMockReport({
        personalInfo: {
          ...buildMockReport().personalInfo,
          lastName: "Smith",
        },
      });
      const result = parser.compareBureauReports(
        reportA,
        "equifax",
        reportB,
        "transunion",
      );
      const nameDisc = result.find(
        (d) => d.field === "personalInfo.lastName",
      );
      expect(nameDisc).toBeTruthy();
    });

    it("detects balance discrepancy for matching accounts", () => {
      const reportA = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 5000,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-01"),
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
            balance: 2000,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.compareBureauReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );
      const balanceDisc = result.find((d) =>
        d.field.includes("balance"),
      );
      expect(balanceDisc).toBeTruthy();
      expect(balanceDisc!.description).toContain("3000");
    });

    it("detects payment status discrepancy for matching accounts", () => {
      const reportA = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Chase Bank",
            balance: 2500,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date("2020-01-01"),
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
            balance: 2500,
            creditLimit: 10000,
            paymentStatus: "late_30",
            openedDate: new Date("2020-01-01"),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.compareBureauReports(
        reportA,
        "experian",
        reportB,
        "transunion",
      );
      const statusDisc = result.find((d) =>
        d.field.includes("paymentStatus"),
      );
      expect(statusDisc).toBeTruthy();
      expect(statusDisc!.severity).toBe("high");
    });
  });

  // -------------------------------------------------
  // validateReport
  // -------------------------------------------------
  describe("validateReport", () => {
    it("validates a correct report as valid", () => {
      const report = buildMockReport();
      const result = parser.validateReport(report);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("catches missing first name", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "",
          lastName: "Doe",
          addresses: [],
        },
      });
      const result = parser.validateReport(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("First name is required");
    });

    it("catches missing last name", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "John",
          lastName: "",
          addresses: [],
        },
      });
      const result = parser.validateReport(report);
      expect(result.isValid).toBe(false);
    });

    it("warns on no addresses", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "John",
          lastName: "Doe",
          addresses: [],
        },
      });
      const result = parser.validateReport(report);
      expect(result.warnings).toContain("No addresses found");
    });

    it("catches invalid credit score", () => {
      const report = buildMockReport({ creditScore: 200 });
      const result = parser.validateReport(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Credit score must be between 300 and 850",
      );
    });

    it("catches negative balance", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Bank",
            balance: -100,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.validateReport(report);
      expect(result.isValid).toBe(false);
    });

    it("warns on empty accounts", () => {
      const report = buildMockReport({ accounts: [] });
      const result = parser.validateReport(report);
      expect(result.warnings).toContain("No credit accounts found");
    });

    it("warns on balance exceeding credit limit", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1234",
            creditorName: "Bank",
            balance: 6000,
            creditLimit: 5000,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const result = parser.validateReport(report);
      expect(result.warnings.some((w) => w.includes("Balance exceeds"))).toBe(true);
    });
  });

  // -------------------------------------------------
  // Analytics
  // -------------------------------------------------
  describe("calculateUtilization", () => {
    it("calculates utilization for revolving accounts", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1",
            creditorName: "A",
            balance: 2500,
            creditLimit: 10000,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "revolving",
            accountNumber: "****2",
            creditorName: "B",
            balance: 500,
            creditLimit: 5000,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "auto_loan",
            accountNumber: "****3",
            creditorName: "C",
            balance: 15000,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const utilization = parser.calculateUtilization(report);
      // (2500 + 500) / (10000 + 5000) * 100 = 20%
      expect(utilization).toBe(20);
    });

    it("returns 0 when no revolving accounts", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "auto_loan",
            accountNumber: "****1",
            creditorName: "A",
            balance: 15000,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      expect(parser.calculateUtilization(report)).toBe(0);
    });
  });

  describe("calculateAverageAccountAge", () => {
    it("returns 0 for empty accounts", () => {
      const report = buildMockReport({ accounts: [] });
      expect(parser.calculateAverageAccountAge(report)).toBe(0);
    });

    it("calculates average age in months", () => {
      const now = new Date();
      const twoYearsAgo = new Date(
        now.getFullYear() - 2,
        now.getMonth(),
        1,
      );
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1",
            creditorName: "A",
            balance: 0,
            paymentStatus: "current",
            openedDate: twoYearsAgo,
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const age = parser.calculateAverageAccountAge(report);
      expect(age).toBe(24);
    });
  });

  describe("countNegativeItems", () => {
    it("counts late payments and public records", () => {
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1",
            creditorName: "A",
            balance: 1000,
            paymentStatus: "late_30",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****2",
            creditorName: "B",
            balance: 500,
            paymentStatus: "charge_off",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****3",
            creditorName: "C",
            balance: 200,
            paymentStatus: "current",
            openedDate: new Date(),
            paymentHistory: [],
            isDisputed: false,
          },
        ],
        publicRecords: [
          {
            recordType: "judgment",
            filingDate: new Date(),
            status: "filed",
            isDisputed: false,
          },
        ],
      });
      expect(parser.countNegativeItems(report)).toBe(3); // 2 late + 1 public record
    });
  });

  describe("getOldestAccountAge", () => {
    it("returns 0 for empty accounts", () => {
      const report = buildMockReport({ accounts: [] });
      expect(parser.getOldestAccountAge(report)).toBe(0);
    });

    it("returns the age of the oldest account", () => {
      const now = new Date();
      const fiveYearsAgo = new Date(
        now.getFullYear() - 5,
        now.getMonth(),
        1,
      );
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        1,
      );
      const report = buildMockReport({
        accounts: [
          {
            accountType: "credit_card",
            accountNumber: "****1",
            creditorName: "A",
            balance: 0,
            paymentStatus: "current",
            openedDate: fiveYearsAgo,
            paymentHistory: [],
            isDisputed: false,
          },
          {
            accountType: "credit_card",
            accountNumber: "****2",
            creditorName: "B",
            balance: 0,
            paymentStatus: "current",
            openedDate: oneYearAgo,
            paymentHistory: [],
            isDisputed: false,
          },
        ],
      });
      const age = parser.getOldestAccountAge(report);
      expect(age).toBe(60); // 5 years * 12 months
    });
  });

  // -------------------------------------------------
  // Bureau-specific format normalization
  // -------------------------------------------------
  describe("account type normalization", () => {
    it("normalizes various account type strings via Experian parsing", async () => {
      const payload: CreditBureauRawPayload = {
        CreditProfile: {
          consumer: { firstName: "Test", lastName: "User" },
          riskModel: { score: 700 },
          tradelines: [
            { creditorName: "A", accountType: "mortgage", balance: 200000, paymentStatus: "current", openedDate: "2015-01-01", paymentHistory: [] },
            { creditorName: "B", accountType: "automobile", balance: 15000, paymentStatus: "current", openedDate: "2020-01-01", paymentHistory: [] },
            { creditorName: "C", accountType: "education", balance: 30000, paymentStatus: "current", openedDate: "2018-01-01", paymentHistory: [] },
            { creditorName: "D", accountType: "unknown_type", balance: 5000, paymentStatus: "current", openedDate: "2021-01-01", paymentHistory: [] },
          ],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "experian");
      expect(result.accounts[0].accountType).toBe("mortgage");
      expect(result.accounts[1].accountType).toBe("auto_loan");
      expect(result.accounts[2].accountType).toBe("student_loan");
      expect(result.accounts[3].accountType).toBe("other");
    });
  });

  describe("payment status normalization", () => {
    it("normalizes various payment status strings", async () => {
      const payload: CreditBureauRawPayload = {
        equifaxCreditReport: {
          subject: { firstName: "Test", lastName: "User" },
          score: { value: 650 },
          trades: [
            { creditor_name: "A", account_type: "credit_card", balance: 1000, payment_status: "OK", opened_date: "2020-01-01", paymentHistory: [] },
            { creditor_name: "B", account_type: "credit_card", balance: 2000, payment_status: "30DaysLate", opened_date: "2020-01-01", paymentHistory: [] },
            { creditor_name: "C", account_type: "credit_card", balance: 3000, payment_status: "ChargeOff", opened_date: "2020-01-01", paymentHistory: [] },
            { creditor_name: "D", account_type: "credit_card", balance: 4000, payment_status: "Collections", opened_date: "2020-01-01", paymentHistory: [] },
          ],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "equifax");
      expect(result.accounts[0].paymentStatus).toBe("current");
      expect(result.accounts[1].paymentStatus).toBe("late_30");
      expect(result.accounts[2].paymentStatus).toBe("charge_off");
      expect(result.accounts[3].paymentStatus).toBe("collection");
    });
  });

  describe("inquiry type normalization", () => {
    it("normalizes soft inquiry variants", async () => {
      const payload: CreditBureauRawPayload = {
        TransUnionReport: {
          borrower: { firstName: "Test", lastName: "User" },
          creditScore: { score: 700 },
          tradeLines: [],
          inquiries: [
            { name: "A", type: "soft", date: "2025-01-01" },
            { name: "B", type: "promotional", date: "2025-02-01" },
            { name: "C", type: "hard", date: "2025-03-01" },
          ],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "transunion");
      expect(result.inquiries[0].inquiryType).toBe("soft");
      expect(result.inquiries[1].inquiryType).toBe("soft");
      expect(result.inquiries[2].inquiryType).toBe("hard");
    });
  });

  describe("public record type normalization", () => {
    it("normalizes public record types via TransUnion parsing", async () => {
      const payload: CreditBureauRawPayload = {
        TUReport: {
          borrower: { firstName: "Test", lastName: "User" },
          score: { value: 600 },
          tradelines: [],
          inquiries: [],
          publicRecords: [
            { type: "chapter7", filing_date: "2020-01-01", status: "discharged" },
            { type: "tax_lien", filing_date: "2019-06-01", status: "filed" },
            { type: "foreclosure", filing_date: "2018-01-01", status: "filed" },
          ],
        },
      };
      const result = await parser.parseReport(payload, "transunion");
      expect(result.publicRecords[0].recordType).toBe("bankruptcy");
      expect(result.publicRecords[1].recordType).toBe("tax_lien");
      expect(result.publicRecords[2].recordType).toBe("foreclosure");
    });
  });

  // -------------------------------------------------
  // Edge cases
  // -------------------------------------------------
  describe("edge cases", () => {
    it("handles report with empty accounts, inquiries, and public records", () => {
      const report = buildMockReport({
        accounts: [],
        inquiries: [],
        publicRecords: [],
      });
      const result = parser.detectErrors(report, "experian");
      expect(result.totalCount).toBe(0);
    });

    it("handles personal info with undefined optional fields", () => {
      const report = buildMockReport({
        personalInfo: {
          firstName: "Test",
          lastName: "User",
          addresses: [],
        },
      });
      const result = parser.detectErrors(report, "experian");
      // Should not throw
      expect(result).toBeTruthy();
    });

    it("handles cross-bureau comparison with zero accounts", () => {
      const reportA = buildMockReport({ accounts: [] });
      const reportB = buildMockReport({ accounts: [] });
      const discrepancies = parser.compareBureauReports(
        reportA,
        "experian",
        reportB,
        "equifax",
      );
      // No account-level discrepancies expected (may have score diff)
      const accountDisc = discrepancies.filter((d) =>
        d.field.includes("account"),
      );
      expect(accountDisc.length).toBe(0);
    });

    it("parsing handles missing consumer in Experian payload", async () => {
      const payload: CreditBureauRawPayload = {
        CreditProfile: {
          tradelines: [],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "experian");
      // Should return empty personal info rather than throwing
      expect(result.personalInfo.firstName).toBe("");
      expect(result.personalInfo.lastName).toBe("");
    });

    it("parsing handles address with different key names", async () => {
      const payload: CreditBureauRawPayload = {
        TransUnionReport: {
          borrower: {
            firstName: "Test",
            lastName: "User",
            addresses: [
              {
                address_line: "789 Elm St",
                city: "Dallas",
                state: "TX",
                zip: "75001",
                type: "previous",
              },
            ],
          },
          creditScore: { score: 700 },
          tradeLines: [],
          inquiries: [],
          publicRecords: [],
        },
      };
      const result = await parser.parseReport(payload, "transunion");
      expect(result.personalInfo.addresses.length).toBe(1);
      expect(result.personalInfo.addresses[0].street).toBe("789 Elm St");
      expect(result.personalInfo.addresses[0].zipCode).toBe("75001");
      expect(result.personalInfo.addresses[0].type).toBe("previous");
    });
  });
});
