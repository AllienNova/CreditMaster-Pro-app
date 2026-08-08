/**
 * @jest-environment node
 */

/**
 * Tests for InquiriesDbService
 *
 * Covers: user-scoped inquiry reads, type filtering, pagination, bureau
 * resolution from the embedded parent report (object / array / null shapes),
 * null-field mapping, stats aggregation, and error handling.
 * Requires mocking: @/lib/supabase/client
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

function sb() {
  return require("@/lib/supabase/service-role").getServiceRoleClient();
}

function chainMock(result: { data: unknown; error: unknown; count?: number }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "is",
    "in",
    "not",
    "order",
    "limit",
    "range",
    "gte",
    "lte",
    "ilike",
    "single",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) =>
    Promise.resolve({ ...result, count: result.count ?? 0 }).then(
      resolve,
      reject,
    );
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown; count?: number }) {
  const mock = chainMock(result);
  sb().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { inquiriesDbService } from "../inquiries-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const hardRow = {
  id: "inq-1",
  user_id: "u-1",
  report_id: "rep-1",
  inquiry_type: "hard",
  creditor_name: "Chase Bank",
  inquiry_date: "2024-11-15",
  is_disputed: false,
  dispute_id: null,
  created_at: now,
  credit_reports: { bureau: "experian" },
};

const softRow = {
  ...hardRow,
  id: "inq-2",
  inquiry_type: "soft",
  creditor_name: "Capital One",
  inquiry_date: "2024-10-20",
  is_disputed: true,
  dispute_id: "dsp-9",
  // embed returned as a single-element array (alternate PostgREST shape)
  credit_reports: [{ bureau: "transunion" }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InquiriesDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getInquiriesByUser", () => {
    it("scopes the query to the user and orders by inquiry_date desc", async () => {
      const mock = mockFrom({ data: [hardRow], error: null });

      const result = await inquiriesDbService.getInquiriesByUser("u-1");

      expect(sb().from).toHaveBeenCalledWith("credit_inquiries");
      expect(mock.eq).toHaveBeenCalledWith("user_id", "u-1");
      expect(mock.order).toHaveBeenCalledWith("inquiry_date", {
        ascending: false,
      });
      expect(result).toHaveLength(1);
    });

    it("maps a hard-inquiry row (object bureau embed) to the app shape", async () => {
      mockFrom({ data: [hardRow], error: null });

      const [inq] = await inquiriesDbService.getInquiriesByUser("u-1");

      expect(inq.id).toBe("inq-1");
      expect(inq.userId).toBe("u-1");
      expect(inq.reportId).toBe("rep-1");
      expect(inq.inquiryType).toBe("hard");
      expect(inq.creditorName).toBe("Chase Bank");
      expect(inq.inquiryDate).toBeInstanceOf(Date);
      expect(inq.bureau).toBe("experian");
      expect(inq.isDisputed).toBe(false);
      expect(inq.disputeId).toBeUndefined();
      expect(inq.createdAt).toBeInstanceOf(Date);
    });

    it("resolves bureau from an array-shaped embed and maps disputed fields", async () => {
      mockFrom({ data: [softRow], error: null });

      const [inq] = await inquiriesDbService.getInquiriesByUser("u-1");

      expect(inq.inquiryType).toBe("soft");
      expect(inq.bureau).toBe("transunion");
      expect(inq.isDisputed).toBe(true);
      expect(inq.disputeId).toBe("dsp-9");
    });

    it("reports bureau as undefined when the embed is null", async () => {
      mockFrom({
        data: [{ ...hardRow, credit_reports: null }],
        error: null,
      });

      const [inq] = await inquiriesDbService.getInquiriesByUser("u-1");
      expect(inq.bureau).toBeUndefined();
    });

    it("reports bureau as undefined when the embed carries a null bureau", async () => {
      mockFrom({
        data: [{ ...hardRow, credit_reports: { bureau: null } }],
        error: null,
      });

      const [inq] = await inquiriesDbService.getInquiriesByUser("u-1");
      expect(inq.bureau).toBeUndefined();
    });

    it("reports bureau as undefined when the embed is an empty array", async () => {
      mockFrom({
        data: [{ ...hardRow, credit_reports: [] }],
        error: null,
      });

      const [inq] = await inquiriesDbService.getInquiriesByUser("u-1");
      expect(inq.bureau).toBeUndefined();
    });

    it("defaults is_disputed to false when null", async () => {
      mockFrom({
        data: [{ ...hardRow, is_disputed: null }],
        error: null,
      });

      const [inq] = await inquiriesDbService.getInquiriesByUser("u-1");
      expect(inq.isDisputed).toBe(false);
    });

    it("applies the inquiry-type filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await inquiriesDbService.getInquiriesByUser("u-1", { type: "hard" });
      expect(mock.eq).toHaveBeenCalledWith("inquiry_type", "hard");
    });

    it("applies limit when provided without offset", async () => {
      const mock = mockFrom({ data: [], error: null });

      await inquiriesDbService.getInquiriesByUser("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("applies range when offset is provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await inquiriesDbService.getInquiriesByUser("u-1", {
        offset: 10,
        limit: 5,
      });
      expect(mock.range).toHaveBeenCalledWith(10, 14);
    });

    it("uses default limit of 50 when offset provided without limit", async () => {
      const mock = mockFrom({ data: [], error: null });

      await inquiriesDbService.getInquiriesByUser("u-1", { offset: 0 });
      expect(mock.range).toHaveBeenCalledWith(0, 49);
    });

    it("returns an empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result = await inquiriesDbService.getInquiriesByUser("u-1");
      expect(result).toEqual([]);
    });

    it("throws on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        inquiriesDbService.getInquiriesByUser("u-1"),
      ).rejects.toThrow("Failed to get inquiries");
    });
  });

  describe("getInquiryStats", () => {
    it("aggregates totals by type and disputed flag", async () => {
      mockFrom({ data: [hardRow, softRow], error: null });

      const stats = await inquiriesDbService.getInquiryStats("u-1");

      expect(stats.total).toBe(2);
      expect(stats.hard).toBe(1);
      expect(stats.soft).toBe(1);
      expect(stats.disputed).toBe(1); // only softRow is disputed
    });

    it("returns zeros when the user has no inquiries", async () => {
      mockFrom({ data: [], error: null });

      const stats = await inquiriesDbService.getInquiryStats("u-1");
      expect(stats).toEqual({ total: 0, hard: 0, soft: 0, disputed: 0 });
    });

    it("throws on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        inquiriesDbService.getInquiryStats("u-1"),
      ).rejects.toThrow("Failed to get inquiry stats");
    });
  });
});
