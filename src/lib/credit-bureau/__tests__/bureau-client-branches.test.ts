/**
 * Bureau Client Branch Coverage Tests
 *
 * Covers mapping methods and success paths for all 3 bureau clients:
 *   - mapAccountType (all bureau-specific codes)
 *   - mapPaymentStatus (all status variants)
 *   - mapRecordType (all record type codes)
 *   - mapRecordStatus (all status strings)
 *   - Dispute success path (disputeId extraction)
 *   - getCreditReport success with full response data
 *   - Experian cached token path
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () =>
    new Proxy({} as Record<string, unknown>, {
      get: () =>
        jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
    }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { ExperianClient } from "../experian-client";
import { EquifaxClient } from "../equifax-client";
import { TransUnionClient } from "../transunion-client";
import type {
  CreditReportRequest,
  DisputeSubmission,
  UserPII,
} from "../types";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TEST_USER_PII: UserPII = {
  firstName: "Test",
  lastName: "User",
  ssn: "000-00-0000",
  dateOfBirth: "1990-01-01",
  addresses: [
    {
      streetAddress: "1 Test Ave",
      city: "Testville",
      state: "TX",
      zipCode: "75001",
    },
  ],
};

const USER_PII_NO_ADDRESS: UserPII = {
  firstName: "Test",
  lastName: "User",
  ssn: "000-00-0000",
  dateOfBirth: "1990-01-01",
  addresses: [],
};

const CREDIT_REPORT_REQUEST: CreditReportRequest = {
  user_id: "user-1",
  bureau: "experian",
  report_type: "full",
  consumer_consent: true,
  permissible_purpose: "ACCOUNT_REVIEW",
};

function makeOkJsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =========================================================================
// TransUnion Client — Branch Coverage
// =========================================================================

describe("TransUnionClient — branch coverage", () => {
  let client: TransUnionClient;

  beforeEach(() => {
    client = new TransUnionClient("sub-123", "tu-api-key", "test");
  });

  describe("getCreditReport success with all mapping branches", () => {
    it("should transform tradelines with all account types", async () => {
      const tuResponse = {
        riskModel: { score: 720 },
        creditReport: {
          score: 710,
          tradelines: [
            { accountNumber: "A1", accountType: "18", creditorName: "Chase", balance: 5000, creditLimit: 10000, paymentStatus: "0", dateOpened: "2020-01-01" },
            { accountNumber: "A2", accountType: "26", subscriberName: "Wells Fargo", balance: 200000, highCredit: 300000, paymentStatus: "C", dateOpened: "2018-06-01" },
            { accountNumber: "A3", accountType: "37", creditorName: "Ford Credit", balance: 15000, paymentStatus: "1", dateOpened: "2021-03-01" },
            { accountNumber: "A4", accountType: "93", creditorName: "Sallie Mae", balance: 30000, paymentStatus: "2", dateOpened: "2016-09-01" },
            { accountNumber: "A5", accountType: "48", creditorName: "LendingClub", balance: 8000, paymentStatus: "9", dateOpened: "2019-11-01" },
            { accountNumber: "A6", accountType: "99", creditorName: "Unknown Corp", balance: 1000, paymentStatus: "COL", dateOpened: "2022-01-01" },
            { accountNumber: "A7", accountType: undefined, creditorName: undefined, subscriberName: undefined, balance: 0, paymentStatus: "CLS", dateOpened: "2017-05-01", lastPaymentDate: "2023-01-01" },
            { accountNumber: undefined, balance: undefined, creditLimit: undefined, paymentStatus: undefined, dateOpened: undefined },
          ],
          inquiries: [
            { inquiryDate: "2024-01-15", subscriberName: "Chase", inquiryType: "1" },
            { inquiryDate: "2024-06-01", subscriberName: "Capital One", inquiryType: "2" },
            { subscriberName: undefined, inquiryType: undefined },
          ],
          publicRecords: [
            { recordType: "BK", filingDate: "2020-01-01", status: "DISCHARGED", amount: 50000, courtName: "County Court" },
            { recordType: "TL", filingDate: "2019-06-01", status: "SATISFIED", amount: 10000 },
            { recordType: "JD", filingDate: "2021-03-01", status: "DISMISSED" },
            { recordType: "FC", status: "active" },
            { recordType: undefined, filingDate: undefined, status: undefined },
          ],
        },
        responseControlOptions: { trackingNumber: "TU-TRACK-123" },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse(tuResponse),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);

      expect(result.success).toBe(true);
      expect(result.bureau).toBe("transunion");
      expect(result.reference_id).toBe("TU-TRACK-123");
      expect(result.data).toBeDefined();

      const report = result.data!;
      expect(report.credit_score).toBe(720);
      expect(report.bureau).toBe("transunion");
      expect(report.user_id).toBe("user-1");

      // Account type mappings
      const accounts = report.accounts!;
      expect(accounts).toHaveLength(8);
      expect(accounts[0].account_type).toBe("credit_card"); // "18"
      expect(accounts[1].account_type).toBe("mortgage");     // "26"
      expect(accounts[2].account_type).toBe("auto_loan");    // "37"
      expect(accounts[3].account_type).toBe("student_loan"); // "93"
      expect(accounts[4].account_type).toBe("personal_loan"); // "48"
      expect(accounts[5].account_type).toBe("other");        // "99" (unknown)
      expect(accounts[6].account_type).toBe("other");        // undefined

      // Payment status mappings
      expect(accounts[0].payment_status).toBe("current");    // "0"
      expect(accounts[1].payment_status).toBe("current");    // "C"
      expect(accounts[2].payment_status).toBe("late");       // "1"
      expect(accounts[3].payment_status).toBe("late");       // "2"
      expect(accounts[4].payment_status).toBe("charged_off"); // "9"
      expect(accounts[5].payment_status).toBe("collection"); // "COL"
      expect(accounts[6].payment_status).toBe("closed");     // "CLS"
      expect(accounts[7].payment_status).toBe("current");    // undefined → fallback

      // Creditor name fallbacks
      expect(accounts[0].creditor_name).toBe("Chase");
      expect(accounts[1].creditor_name).toBe("Wells Fargo"); // Falls back to subscriberName
      expect(accounts[6].creditor_name).toBe("Unknown Creditor"); // No names

      // Last payment date
      expect(accounts[6].last_payment_date).toBe("2023-01-01");
      expect(accounts[0].last_payment_date).toBeUndefined();

      // Credit limit / highCredit fallback
      expect(accounts[0].credit_limit).toBe(10000);
      expect(accounts[1].credit_limit).toBe(300000); // highCredit

      // Inquiry mappings
      const inquiries = report.inquiries!;
      expect(inquiries).toHaveLength(3);
      expect(inquiries[0].inquiry_type).toBe("hard");  // "1"
      expect(inquiries[0].creditor_name).toBe("Chase");
      expect(inquiries[1].inquiry_type).toBe("soft");  // "2"
      expect(inquiries[2].inquiry_type).toBe("soft");  // undefined
      expect(inquiries[2].creditor_name).toBe("Unknown Creditor");

      // Public record mappings
      const records = report.public_records!;
      expect(records).toHaveLength(5);
      expect(records[0].record_type).toBe("bankruptcy");   // "BK"
      expect(records[0].status).toBe("discharged");
      expect(records[0].amount).toBe(50000);
      expect(records[0].court_name).toBe("County Court");
      expect(records[1].record_type).toBe("tax_lien");     // "TL"
      expect(records[1].status).toBe("satisfied");
      expect(records[2].record_type).toBe("judgment");     // "JD"
      expect(records[2].status).toBe("dismissed");
      expect(records[3].record_type).toBe("foreclosure");  // "FC"
      expect(records[3].status).toBe("filed");             // "active" → default
      expect(records[4].record_type).toBe("judgment");     // undefined → default
      expect(records[4].status).toBe("filed");             // undefined → default
    });

    it("should use creditReport.score when riskModel is absent", async () => {
      const tuResponse = {
        creditReport: {
          score: 680,
          tradelines: [],
          inquiries: [],
          publicRecords: [],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse(tuResponse),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.data!.credit_score).toBe(680);
    });

    it("should default score to 0 when both riskModel and creditReport.score are absent", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ creditReport: {} }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.data!.credit_score).toBe(0);
    });

    it("should handle missing address in userPII", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ creditReport: { tradelines: [], inquiries: [], publicRecords: [] } }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, USER_PII_NO_ADDRESS);
      expect(result.success).toBe(true);

      // Verify the request payload had undefined address
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.subject.subjectRecord.indicative.address).toBeUndefined();
    });
  });

  describe("submitDispute success", () => {
    it("should return success with disputeId from response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "TU-DISP-456", status: "submitted" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "transunion",
        credit_item_id: "item-abc",
        dispute_reason: "not_mine",
        dispute_method: "online",
        consumer_statement: "This is not my account",
        supporting_documents: ["doc1.pdf"],
      };

      const result = await client.submitDispute(dispute, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.bureau).toBe("transunion");
      expect(result.reference_id).toBe("TU-DISP-456");
    });

    it("should map all dispute reason codes", async () => {
      const reasons = [
        "not_mine", "incorrect_balance", "incorrect_payment_history",
        "account_closed", "paid_in_full", "duplicate", "fraud",
        "identity_theft", "unknown_reason",
      ];

      for (const reason of reasons) {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          makeOkJsonResponse({ disputeId: `disp-${reason}` }),
        );

        const dispute: DisputeSubmission = {
          bureau: "transunion",
          credit_item_id: "item-abc",
          dispute_reason: reason,
          dispute_method: "online",
        };

        const result = await client.submitDispute(dispute, TEST_USER_PII);
        expect(result.success).toBe(true);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[
          (global.fetch as jest.Mock).mock.calls.length - 1
        ];
        const payload = JSON.parse(fetchCall[1].body);
        const expectedCodes: Record<string, string> = {
          not_mine: "01", incorrect_balance: "02", incorrect_payment_history: "03",
          account_closed: "04", paid_in_full: "05", duplicate: "06",
          fraud: "07", identity_theft: "08", unknown_reason: "99",
        };
        expect(payload.dispute.reasonCode).toBe(expectedCodes[reason]);
      }
    });

    it("should handle dispute without supporting documents", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "TU-DISP-789" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "transunion",
        credit_item_id: "item-xyz",
        dispute_reason: "fraud",
        dispute_method: "online",
      };

      const result = await client.submitDispute(dispute, TEST_USER_PII);
      expect(result.success).toBe(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.dispute.documents).toEqual([]);
    });
  });

  describe("production endpoint", () => {
    it("should use production URLs when environment is production", async () => {
      const prodClient = new TransUnionClient("sub-123", "tu-api-key", "production");

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ creditReport: { tradelines: [], inquiries: [], publicRecords: [] } }),
      );

      await prodClient.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("netaccess.transunion.com");
      expect(fetchCall[0]).not.toContain("test");
    });
  });
});

// =========================================================================
// Equifax Client — Branch Coverage
// =========================================================================

describe("EquifaxClient — branch coverage", () => {
  let client: EquifaxClient;

  beforeEach(() => {
    client = new EquifaxClient("eqf-api-key", "eqf-client-id", "sandbox");
  });

  describe("getCreditReport success with all mapping branches", () => {
    it("should transform response with all account types and statuses", async () => {
      const eqfResponse = {
        reportId: "EQF-RPT-001",
        consumers: [
          {
            creditScore: { score: 745 },
            tradelines: [
              { accountNumber: "B1", accountType: "CC", creditorName: "Amex", balance: 3000, creditLimit: 15000, paymentStatus: "C", dateOpened: "2019-01-01" },
              { accountNumber: "B2", accountType: "MT", businessName: "BofA Mortgage", balance: 250000, highCredit: 350000, paymentStatus: "CURRENT", dateOpened: "2017-01-01" },
              { accountNumber: "B3", accountType: "AL", creditorName: "Toyota Financial", balance: 20000, paymentStatus: "L", dateOpened: "2022-06-01" },
              { accountNumber: "B4", accountType: "SL", creditorName: "Navient", balance: 45000, paymentStatus: "LATE", dateOpened: "2015-09-01" },
              { accountNumber: "B5", accountType: "PL", creditorName: "Prosper", balance: 5000, paymentStatus: "CO", dateOpened: "2020-03-01" },
              { accountType: "XX", balance: 2000, paymentStatus: "CHARGEOFF" },
              { balance: 500, paymentStatus: "COL" },
              { balance: 800, paymentStatus: "COLLECTION" },
              { balance: 0, paymentStatus: "CLS" },
              { balance: 0, paymentStatus: "CLOSED", lastPaymentDate: "2024-01-01" },
              { balance: 100, paymentStatus: "UNKNOWN_STATUS" },
            ],
            inquiries: [
              { inquiryDate: "2024-03-01", businessName: "Chase", inquiryType: "h" },
              { inquiryDate: "2024-04-01", businessName: "Discover", inquiryType: "hard" },
              { inquiryDate: "2024-05-01", businessName: "Experian", inquiryType: "soft" },
              { businessName: undefined, inquiryType: undefined },
            ],
            publicRecords: [
              { recordType: "BANKRUPTCY", filingDate: "2019-01-01", status: "DISCHARGED", amount: 75000, courtName: "District Court" },
              { recordType: "TAX_LIEN", filingDate: "2020-06-01", status: "SATISFIED", amount: 15000 },
              { recordType: "JUDGMENT", status: "DISMISSED" },
              { recordType: "FORECLOSURE", status: "PENDING" },
              { recordType: undefined, status: undefined },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse(eqfResponse),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);

      expect(result.success).toBe(true);
      expect(result.bureau).toBe("equifax");
      expect(result.reference_id).toBe("EQF-RPT-001");
      expect(result.data).toBeDefined();

      const report = result.data!;
      expect(report.credit_score).toBe(745);

      // Account type mappings
      const accounts = report.accounts!;
      expect(accounts).toHaveLength(11);
      expect(accounts[0].account_type).toBe("credit_card");   // "CC"
      expect(accounts[1].account_type).toBe("mortgage");       // "MT"
      expect(accounts[2].account_type).toBe("auto_loan");      // "AL"
      expect(accounts[3].account_type).toBe("student_loan");   // "SL"
      expect(accounts[4].account_type).toBe("personal_loan");  // "PL"
      expect(accounts[5].account_type).toBe("other");          // "XX"
      expect(accounts[6].account_type).toBe("other");          // undefined

      // Payment status mappings
      expect(accounts[0].payment_status).toBe("current");      // "C"
      expect(accounts[1].payment_status).toBe("current");      // "CURRENT"
      expect(accounts[2].payment_status).toBe("late");         // "L"
      expect(accounts[3].payment_status).toBe("late");         // "LATE"
      expect(accounts[4].payment_status).toBe("charged_off");  // "CO"
      expect(accounts[5].payment_status).toBe("charged_off");  // "CHARGEOFF"
      expect(accounts[6].payment_status).toBe("collection");   // "COL"
      expect(accounts[7].payment_status).toBe("collection");   // "COLLECTION"
      expect(accounts[8].payment_status).toBe("closed");       // "CLS"
      expect(accounts[9].payment_status).toBe("closed");       // "CLOSED"
      expect(accounts[10].payment_status).toBe("current");     // unknown → fallback

      // Creditor name fallbacks
      expect(accounts[0].creditor_name).toBe("Amex");
      expect(accounts[1].creditor_name).toBe("BofA Mortgage"); // businessName
      expect(accounts[6].creditor_name).toBe("Unknown Creditor");

      // Inquiry mappings
      const inquiries = report.inquiries!;
      expect(inquiries).toHaveLength(4);
      expect(inquiries[0].inquiry_type).toBe("hard");  // "h"
      expect(inquiries[1].inquiry_type).toBe("hard");  // "hard"
      expect(inquiries[2].inquiry_type).toBe("soft");  // "soft"
      expect(inquiries[3].inquiry_type).toBe("soft");  // undefined → soft
      expect(inquiries[3].creditor_name).toBe("Unknown Creditor");

      // Public record mappings
      const records = report.public_records!;
      expect(records).toHaveLength(5);
      expect(records[0].record_type).toBe("bankruptcy");
      expect(records[0].status).toBe("discharged");
      expect(records[1].record_type).toBe("tax_lien");
      expect(records[1].status).toBe("satisfied");
      expect(records[2].record_type).toBe("judgment");
      expect(records[2].status).toBe("dismissed");
      expect(records[3].record_type).toBe("foreclosure");
      expect(records[3].status).toBe("filed");           // "PENDING" → default
      expect(records[4].record_type).toBe("judgment");    // undefined → default
      expect(records[4].status).toBe("filed");
    });

    it("should use top-level creditScore when consumer creditScore is absent", async () => {
      const eqfResponse = {
        reportId: "EQF-RPT-002",
        creditScore: { score: 690 },
        consumers: [
          {
            tradelines: [],
            inquiries: [],
            publicRecords: [],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse(eqfResponse),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.data!.credit_score).toBe(690);
    });

    it("should default score to 0 when no creditScore is present", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ consumers: [{}] }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.data!.credit_score).toBe(0);
    });

    it("should handle empty consumers array", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ consumers: [] }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.data!.credit_score).toBe(0);
    });
  });

  describe("submitDispute success", () => {
    it("should return success with disputeId", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "EQF-DISP-123", status: "submitted" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "equifax",
        credit_item_id: "item-abc",
        dispute_reason: "incorrect_balance",
        dispute_method: "online",
        consumer_statement: "Balance is wrong",
        supporting_documents: ["statement.pdf"],
      };

      const result = await client.submitDispute(dispute, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.bureau).toBe("equifax");
      expect(result.reference_id).toBe("EQF-DISP-123");
    });

    it("should map all Equifax dispute reason codes", async () => {
      const reasons = [
        "not_mine", "incorrect_balance", "incorrect_payment_history",
        "account_closed", "paid_in_full", "duplicate", "fraud",
        "identity_theft", "some_other_reason",
      ];

      for (const reason of reasons) {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          makeOkJsonResponse({ disputeId: `disp-${reason}` }),
        );

        const dispute: DisputeSubmission = {
          bureau: "equifax",
          credit_item_id: "item-abc",
          dispute_reason: reason,
          dispute_method: "online",
        };

        const result = await client.submitDispute(dispute, TEST_USER_PII);
        expect(result.success).toBe(true);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[
          (global.fetch as jest.Mock).mock.calls.length - 1
        ];
        const payload = JSON.parse(fetchCall[1].body);
        const expectedCodes: Record<string, string> = {
          not_mine: "NM", incorrect_balance: "IB", incorrect_payment_history: "IPH",
          account_closed: "AC", paid_in_full: "PIF", duplicate: "DUP",
          fraud: "FR", identity_theft: "IT", some_other_reason: "OTH",
        };
        expect(payload.dispute.reasonCode).toBe(expectedCodes[reason]);
      }
    });

    it("should handle dispute without supporting documents", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "EQF-DISP-789" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "equifax",
        credit_item_id: "item-xyz",
        dispute_reason: "paid_in_full",
        dispute_method: "online",
      };

      const result = await client.submitDispute(dispute, TEST_USER_PII);
      expect(result.success).toBe(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.dispute.supportingDocuments).toEqual([]);
    });
  });

  describe("production endpoint", () => {
    it("should use production URLs when environment is production", async () => {
      const prodClient = new EquifaxClient("key", "id", "production");

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ consumers: [{}] }),
      );

      await prodClient.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("api.equifax.com");
      expect(fetchCall[0]).not.toContain("sandbox");
    });

    it("should use production dispute URL", async () => {
      const prodClient = new EquifaxClient("key", "id", "production");

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "x" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "equifax",
        credit_item_id: "item-abc",
        dispute_reason: "fraud",
        dispute_method: "online",
      };

      await prodClient.submitDispute(dispute, TEST_USER_PII);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("api.equifax.com");
      expect(fetchCall[0]).not.toContain("sandbox");
    });
  });
});

// =========================================================================
// Experian Client — Branch Coverage
// =========================================================================

describe("ExperianClient — branch coverage", () => {
  let client: ExperianClient;

  beforeEach(() => {
    client = new ExperianClient("exp-client-id", "exp-secret", true);
  });

  describe("getCreditReport success with all mapping branches", () => {
    it("should transform response with all account types and statuses", async () => {
      // Token fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok-abc", expires_in: 3600 }),
      );

      const expResponse = {
        requestId: "EXP-REQ-001",
        riskModel: { score: 760 },
        tradelines: [
          { accountNumber: "C1", accountType: "R", creditorName: "Visa", balance: 2000, creditLimit: 8000, paymentStatus: "C", dateOpened: "2018-01-01" },
          { accountNumber: "C2", accountType: "I", subscriberName: "Bank Mortgage", balance: 180000, creditLimit: 250000, paymentStatus: "0", dateOpened: "2016-01-01" },
          { accountNumber: "C3", accountType: "M", creditorName: "Mortgage Co", balance: 300000, paymentStatus: "L", dateOpened: "2015-06-01" },
          { accountNumber: "C4", accountType: "O", creditorName: "Auto Lender", balance: 18000, paymentStatus: "1", dateOpened: "2021-01-01" },
          { accountNumber: "C5", accountType: "C", creditorName: "Store Credit", balance: 500, paymentStatus: "CO", dateOpened: "2020-06-01" },
          { accountType: "Z", balance: 100, paymentStatus: "CLS" },
          { balance: 0, paymentStatus: undefined, lastPaymentDate: "2024-06-01" },
        ],
        inquiries: [
          { inquiryDate: "2024-01-01", subscriberName: "Amex", inquiryType: "hard" },
          { inquiryDate: "2024-02-01", subscriberName: "Capital One", inquiryType: "soft" },
          { subscriberName: undefined, inquiryType: undefined },
        ],
        publicRecords: [
          { recordType: "BK", filingDate: "2018-01-01", status: "DISCHARGED", amount: 60000, courtName: "Fed Court" },
          { recordType: "TL", filingDate: "2019-06-01", status: "SATISFIED" },
          { recordType: "JD", status: "DISMISSED" },
          { recordType: "FC", status: "OPEN" },
          { recordType: "XX", status: undefined },
          { recordType: undefined },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse(expResponse),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);

      expect(result.success).toBe(true);
      expect(result.bureau).toBe("experian");
      expect(result.reference_id).toBe("EXP-REQ-001");

      const report = result.data!;
      expect(report.credit_score).toBe(760);

      // Account type mappings
      const accounts = report.accounts!;
      expect(accounts).toHaveLength(7);
      expect(accounts[0].account_type).toBe("credit_card");  // "R"
      expect(accounts[1].account_type).toBe("mortgage");      // "I"
      expect(accounts[2].account_type).toBe("mortgage");      // "M"
      expect(accounts[3].account_type).toBe("auto_loan");     // "O"
      expect(accounts[4].account_type).toBe("credit_card");   // "C"
      expect(accounts[5].account_type).toBe("other");         // "Z"
      expect(accounts[6].account_type).toBe("other");         // undefined

      // Payment status mappings
      expect(accounts[0].payment_status).toBe("current");     // "C"
      expect(accounts[1].payment_status).toBe("current");     // "0"
      expect(accounts[2].payment_status).toBe("late");        // "L"
      expect(accounts[3].payment_status).toBe("late");        // "1"
      expect(accounts[4].payment_status).toBe("charged_off"); // "CO"
      expect(accounts[5].payment_status).toBe("closed");      // "CLS"
      expect(accounts[6].payment_status).toBe("current");     // undefined → fallback

      // Creditor fallback
      expect(accounts[1].creditor_name).toBe("Bank Mortgage"); // subscriberName

      // Inquiry mappings
      const inquiries = report.inquiries!;
      expect(inquiries).toHaveLength(3);
      expect(inquiries[0].inquiry_type).toBe("hard");
      expect(inquiries[1].inquiry_type).toBe("soft");
      expect(inquiries[2].inquiry_type).toBe("soft");  // undefined → soft
      expect(inquiries[2].creditor_name).toBe("Unknown Creditor");

      // Public record mappings
      const records = report.public_records!;
      expect(records).toHaveLength(6);
      expect(records[0].record_type).toBe("bankruptcy");
      expect(records[0].status).toBe("discharged");
      expect(records[1].record_type).toBe("tax_lien");
      expect(records[1].status).toBe("satisfied");
      expect(records[2].record_type).toBe("judgment");
      expect(records[2].status).toBe("dismissed");
      expect(records[3].record_type).toBe("foreclosure");
      expect(records[3].status).toBe("filed");           // "OPEN" → default
      expect(records[4].record_type).toBe("judgment");    // "XX" → default
      expect(records[5].record_type).toBe("judgment");    // undefined → default
    });

    it("should use creditScore when riskModel is absent", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ creditScore: { score: 710 }, tradelines: [], inquiries: [], publicRecords: [] }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.data!.credit_score).toBe(710);
    });

    it("should default score to 0 when no scores present", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({}),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.data!.credit_score).toBe(0);
    });
  });

  describe("cached token", () => {
    it("should reuse cached token on second getCreditReport call", async () => {
      // First call: token + report
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "cached-tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ tradelines: [], inquiries: [], publicRecords: [] }),
      );

      const result1 = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result1.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + report

      // Second call: only report (cached token)
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ tradelines: [], inquiries: [], publicRecords: [] }),
      );

      const result2 = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result2.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3); // no new token call

      // Verify the report request used the cached token
      const lastCall = (global.fetch as jest.Mock).mock.calls[2];
      expect(lastCall[1].headers.Authorization).toBe("Bearer cached-tok");
    });
  });

  describe("submitDispute success", () => {
    it("should return success with disputeId", async () => {
      // Token fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok-disp", expires_in: 3600 }),
      );
      // Dispute submission
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "EXP-DISP-001", status: "submitted" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "experian",
        credit_item_id: "item-123",
        dispute_reason: "not_mine",
        dispute_method: "online",
        consumer_statement: "Not my account",
        supporting_documents: ["proof.pdf"],
      };

      const result = await client.submitDispute(dispute, TEST_USER_PII);
      expect(result.success).toBe(true);
      expect(result.bureau).toBe("experian");
      expect(result.reference_id).toBe("EXP-DISP-001");
    });

    it("should handle dispute without documents or statement", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "EXP-DISP-002" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "experian",
        credit_item_id: "item-xyz",
        dispute_reason: "fraud",
        dispute_method: "online",
      };

      const result = await client.submitDispute(dispute, TEST_USER_PII);
      expect(result.success).toBe(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[1];
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.dispute.documents).toEqual([]);
    });
  });

  describe("production endpoint", () => {
    it("should use production URLs when sandbox is false", async () => {
      const prodClient = new ExperianClient("id", "secret", false);

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "prod-tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ tradelines: [], inquiries: [], publicRecords: [] }),
      );

      await prodClient.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);

      // Token endpoint should be production
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("us-api.experian.com");
      expect((global.fetch as jest.Mock).mock.calls[0][0]).not.toContain("sandbox");

      // Report endpoint should be production
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain("us-api.experian.com");
      expect((global.fetch as jest.Mock).mock.calls[1][0]).not.toContain("sandbox");
    });

    it("should use production dispute URL", async () => {
      const prodClient = new ExperianClient("id", "secret", false);

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ disputeId: "x" }),
      );

      const dispute: DisputeSubmission = {
        bureau: "experian",
        credit_item_id: "item-abc",
        dispute_reason: "fraud",
        dispute_method: "online",
      };

      await prodClient.submitDispute(dispute, TEST_USER_PII);

      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain("us-api.experian.com");
      expect((global.fetch as jest.Mock).mock.calls[1][0]).not.toContain("sandbox");
    });
  });

  describe("token error handling", () => {
    it("should handle token response with no access_token field", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ token_type: "Bearer", expires_in: 3600 }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, TEST_USER_PII);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to obtain Experian access token");
    });
  });

  describe("no address in userPII", () => {
    it("should handle empty addresses array", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        makeOkJsonResponse({ tradelines: [], inquiries: [], publicRecords: [] }),
      );

      const result = await client.getCreditReport(CREDIT_REPORT_REQUEST, USER_PII_NO_ADDRESS);
      expect(result.success).toBe(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[1];
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.consumerPii.primaryApplicant.currentAddress).toBeUndefined();
    });
  });
});
