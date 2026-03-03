/**
 * MockCreditBureauAdapter — Unit Tests
 *
 * Verifies the mock adapter generates realistic credit reports and disputes,
 * supports configurable options (score, latency, errors), and implements
 * the CreditBureauAdapter interface correctly.
 */

import {
  MockCreditBureauAdapter,
  type MockAdapterOptions,
} from "../mock-credit-bureau-adapter";
import type {
  CreditReportRequest,
  UserPII,
  DisputeSubmission,
  Bureau,
} from "../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRequest(
  bureau: Bureau = "experian",
): CreditReportRequest {
  return {
    user_id: "test-user-123",
    bureau,
    report_type: "full",
    consumer_consent: true,
    permissible_purpose: "ACCOUNT_REVIEW",
  };
}

function makeUserPII(): UserPII {
  return {
    firstName: "Jane",
    lastName: "Doe",
    ssn: "123-45-6789",
    dateOfBirth: "1990-01-15",
    addresses: [
      {
        streetAddress: "123 Main St",
        city: "Springfield",
        state: "IL",
        zipCode: "62704",
      },
    ],
  };
}

function makeDispute(bureau: Bureau = "experian"): DisputeSubmission {
  return {
    bureau,
    credit_item_id: "item-123",
    dispute_reason: "not_mine",
    dispute_method: "online",
    consumer_statement: "This account does not belong to me",
  };
}

// =========================================================================
// Tests
// =========================================================================

describe("MockCreditBureauAdapter", () => {
  describe("constructor", () => {
    it("should create an adapter with default options", () => {
      const adapter = new MockCreditBureauAdapter();
      expect(adapter.bureau).toBe("mock");
    });

    it("should accept custom options", () => {
      const options: MockAdapterOptions = {
        simulatedBureau: "equifax",
        baseScore: 750,
        accountCount: 3,
        inquiryCount: 2,
        publicRecordCount: 1,
        latencyMs: 100,
      };
      const adapter = new MockCreditBureauAdapter(options);
      expect(adapter.bureau).toBe("mock");
    });
  });

  describe("getCreditReport", () => {
    it("should return a successful response with default options", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.bureau).toBe("experian");
      expect(response.timestamp).toBeTruthy();
      expect(response.reference_id).toMatch(/^mock_ref_/);
    });

    it("should return a report with the correct user_id", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.data?.user_id).toBe("test-user-123");
    });

    it("should generate a score around the base score (default 720)", async () => {
      const adapter = new MockCreditBureauAdapter({ baseScore: 720 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      const score = response.data?.credit_score ?? 0;
      expect(score).toBeGreaterThanOrEqual(300);
      expect(score).toBeLessThanOrEqual(850);
      // With +/- 20 variance from 720
      expect(score).toBeGreaterThanOrEqual(700);
      expect(score).toBeLessThanOrEqual(740);
    });

    it("should clamp score to 300–850 range even with extreme baseScore", async () => {
      const lowAdapter = new MockCreditBureauAdapter({ baseScore: 300 });
      const lowResponse = await lowAdapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );
      expect(lowResponse.data?.credit_score).toBeGreaterThanOrEqual(300);

      const highAdapter = new MockCreditBureauAdapter({ baseScore: 850 });
      const highResponse = await highAdapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );
      expect(highResponse.data?.credit_score).toBeLessThanOrEqual(850);
    });

    it("should generate the configured number of accounts", async () => {
      const adapter = new MockCreditBureauAdapter({ accountCount: 8 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.data?.accounts).toHaveLength(8);
    });

    it("should generate the configured number of inquiries", async () => {
      const adapter = new MockCreditBureauAdapter({ inquiryCount: 5 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.data?.inquiries).toHaveLength(5);
    });

    it("should generate the configured number of public records", async () => {
      const adapter = new MockCreditBureauAdapter({ publicRecordCount: 2 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.data?.public_records).toHaveLength(2);
    });

    it("should generate 0 public records when publicRecordCount is 0", async () => {
      const adapter = new MockCreditBureauAdapter({ publicRecordCount: 0 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.data?.public_records).toHaveLength(0);
    });

    it("should use the simulated bureau in the response", async () => {
      const adapter = new MockCreditBureauAdapter({
        simulatedBureau: "transunion",
      });
      const response = await adapter.getCreditReport(
        makeRequest("equifax"),
        makeUserPII(),
      );

      expect(response.bureau).toBe("transunion");
      expect(response.data?.bureau).toBe("transunion");
    });

    it("should use the request bureau when simulatedBureau is not set", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.getCreditReport(
        makeRequest("equifax"),
        makeUserPII(),
      );

      expect(response.bureau).toBe("equifax");
      expect(response.data?.bureau).toBe("equifax");
    });

    it("should simulate latency when latencyMs is set", async () => {
      const adapter = new MockCreditBureauAdapter({ latencyMs: 50 });
      const start = Date.now();
      await adapter.getCreditReport(makeRequest(), makeUserPII());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow 10ms tolerance
    });

    it("should return an error response when forceError is set", async () => {
      const adapter = new MockCreditBureauAdapter({
        forceError: "Simulated API failure",
      });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe("Simulated API failure");
      expect(response.data).toBeUndefined();
    });

    it("should generate accounts with valid payment history entries", async () => {
      const adapter = new MockCreditBureauAdapter({ accountCount: 1 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      const account = response.data?.accounts?.[0];
      expect(account).toBeDefined();
      expect(account?.payment_history).toHaveLength(12);
      for (const entry of account?.payment_history ?? []) {
        expect(entry.month).toMatch(/^2025-\d{2}$/);
        expect(["OK", "30", "60", "90", "120", "CO", "NA"]).toContain(
          entry.status,
        );
      }
    });

    it("should generate accounts with valid account types", async () => {
      const adapter = new MockCreditBureauAdapter({ accountCount: 10 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      const validTypes = new Set([
        "credit_card",
        "mortgage",
        "auto_loan",
        "student_loan",
        "personal_loan",
        "other",
      ]);
      for (const account of response.data?.accounts ?? []) {
        expect(validTypes.has(account.account_type)).toBe(true);
      }
    });

    it("should generate inquiries with valid inquiry types", async () => {
      const adapter = new MockCreditBureauAdapter({ inquiryCount: 10 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      for (const inquiry of response.data?.inquiries ?? []) {
        expect(["hard", "soft"]).toContain(inquiry.inquiry_type);
      }
    });

    it("should generate public records with valid record types", async () => {
      const adapter = new MockCreditBureauAdapter({ publicRecordCount: 5 });
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      const validTypes = new Set([
        "bankruptcy",
        "tax_lien",
        "judgment",
        "foreclosure",
      ]);
      for (const record of response.data?.public_records ?? []) {
        expect(validTypes.has(record.record_type)).toBe(true);
      }
    });

    it("should include raw_data indicating mock source", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.getCreditReport(
        makeRequest(),
        makeUserPII(),
      );

      expect(response.data?.raw_data).toEqual(
        expect.objectContaining({ source: "mock_adapter" }),
      );
    });

    it("should generate unique report IDs", async () => {
      const adapter = new MockCreditBureauAdapter();
      const ids = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const response = await adapter.getCreditReport(
          makeRequest(),
          makeUserPII(),
        );
        if (response.data?.id) {
          ids.add(response.data.id);
        }
      }

      expect(ids.size).toBe(5);
    });
  });

  describe("submitDispute", () => {
    it("should return a successful dispute response", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.submitDispute(
        makeDispute(),
        makeUserPII(),
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      const data = response.data as Record<string, unknown>;
      expect(data.disputeId).toMatch(/^mock_dispute_/);
      expect(data.status).toBe("submitted");
      expect(data.estimatedResolutionDate).toBeTruthy();
    });

    it("should use the simulated bureau in the dispute response", async () => {
      const adapter = new MockCreditBureauAdapter({
        simulatedBureau: "equifax",
      });
      const response = await adapter.submitDispute(
        makeDispute("transunion"),
        makeUserPII(),
      );

      expect(response.bureau).toBe("equifax");
    });

    it("should use the dispute bureau when simulatedBureau is not set", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.submitDispute(
        makeDispute("transunion"),
        makeUserPII(),
      );

      expect(response.bureau).toBe("transunion");
    });

    it("should return an error response when forceError is set", async () => {
      const adapter = new MockCreditBureauAdapter({
        forceError: "Bureau unavailable",
      });
      const response = await adapter.submitDispute(
        makeDispute(),
        makeUserPII(),
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe("Bureau unavailable");
    });

    it("should simulate latency when latencyMs is set", async () => {
      const adapter = new MockCreditBureauAdapter({ latencyMs: 50 });
      const start = Date.now();
      await adapter.submitDispute(makeDispute(), makeUserPII());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    it("should include reference_id in successful dispute response", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.submitDispute(
        makeDispute(),
        makeUserPII(),
      );

      expect(response.reference_id).toMatch(/^mock_disp_ref_/);
    });

    it("should set estimated resolution date ~30 days in the future", async () => {
      const adapter = new MockCreditBureauAdapter();
      const response = await adapter.submitDispute(
        makeDispute(),
        makeUserPII(),
      );

      const data = response.data as Record<string, unknown>;
      const resolutionDate = new Date(data.estimatedResolutionDate as string);
      const now = new Date();
      const diffDays =
        (resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(31);
    });
  });
});
