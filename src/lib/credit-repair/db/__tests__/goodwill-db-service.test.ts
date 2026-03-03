/**
 * @jest-environment node
 */

/**
 * Tests for GoodwillDbService
 *
 * Requires mocking: @/lib/supabase/client
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

function sb() {
  return require("@/lib/supabase/client").getSupabase();
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

import { goodwillDbService } from "../goodwill-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const sampleLetterRow = {
  id: "gl-1",
  user_id: "u-1",
  creditor_name: "Chase Bank",
  account_number: "1234",
  late_payment_date: "2025-06-15",
  reason: "Medical emergency caused temporary hardship",
  letter_content: "Dear Chase Bank, I am writing to request...",
  status: "draft" as const,
  sent_at: null,
  response_received_at: null,
  outcome: null,
  notes: null,
  created_at: now,
  updated_at: now,
};

const sampleLetterRow2 = {
  ...sampleLetterRow,
  id: "gl-2",
  creditor_name: "Citi Bank",
  status: "approved" as const,
  outcome: "removed" as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GoodwillDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // createGoodwillLetter
  // --------------------------------------------------------------------------

  describe("createGoodwillLetter", () => {
    it("should create a goodwill letter and return mapped result", async () => {
      mockFrom({ data: sampleLetterRow, error: null });

      const result = await goodwillDbService.createGoodwillLetter({
        userId: "u-1",
        creditorName: "Chase Bank",
        accountNumber: "1234",
        latePaymentDate: new Date("2025-06-15"),
        reason: "Medical emergency caused temporary hardship",
        letterContent: "Dear Chase Bank, I am writing to request...",
      });

      expect(result.id).toBe("gl-1");
      expect(result.userId).toBe("u-1");
      expect(result.creditorName).toBe("Chase Bank");
      expect(result.latePaymentDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(sb().from).toHaveBeenCalledWith("goodwill_letters");
    });

    it("should default status to draft when not provided", async () => {
      const mock = mockFrom({ data: sampleLetterRow, error: null });

      await goodwillDbService.createGoodwillLetter({
        userId: "u-1",
        creditorName: "Chase Bank",
        latePaymentDate: new Date("2025-06-15"),
        reason: "Hardship",
        letterContent: "Letter",
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft" }),
      );
    });

    it("should convert latePaymentDate to date-only string", async () => {
      const mock = mockFrom({ data: sampleLetterRow, error: null });

      await goodwillDbService.createGoodwillLetter({
        userId: "u-1",
        creditorName: "Chase Bank",
        latePaymentDate: new Date("2025-06-15T14:30:00Z"),
        reason: "Hardship",
        letterContent: "Letter",
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ late_payment_date: "2025-06-15" }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        goodwillDbService.createGoodwillLetter({
          userId: "u-1",
          creditorName: "Chase Bank",
          latePaymentDate: new Date("2025-06-15"),
          reason: "Hardship",
          letterContent: "Letter",
        }),
      ).rejects.toThrow("Failed to create goodwill letter");
    });
  });

  // --------------------------------------------------------------------------
  // getGoodwillLetter
  // --------------------------------------------------------------------------

  describe("getGoodwillLetter", () => {
    it("should return mapped letter when found", async () => {
      mockFrom({ data: sampleLetterRow, error: null });

      const result = await goodwillDbService.getGoodwillLetter("gl-1", "u-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("gl-1");
      expect(result!.creditorName).toBe("Chase Bank");
    });

    it("should return null when letter not found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await goodwillDbService.getGoodwillLetter(
        "nonexistent",
        "u-1",
      );
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "Connection lost" } });

      await expect(
        goodwillDbService.getGoodwillLetter("gl-1", "u-1"),
      ).rejects.toThrow("Failed to get goodwill letter");
    });

    it("should return null when data is null without error", async () => {
      mockFrom({ data: null, error: null });

      const result = await goodwillDbService.getGoodwillLetter("gl-1", "u-1");
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // getGoodwillLettersByUser
  // --------------------------------------------------------------------------

  describe("getGoodwillLettersByUser", () => {
    it("should return letters array and total count", async () => {
      mockFrom({
        data: [sampleLetterRow, sampleLetterRow2],
        error: null,
        count: 2,
      });

      const result = await goodwillDbService.getGoodwillLettersByUser("u-1");
      expect(result.letters).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should return empty array when no letters found", async () => {
      mockFrom({ data: [], error: null, count: 0 });

      const result = await goodwillDbService.getGoodwillLettersByUser("u-1");
      expect(result.letters).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should apply status filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await goodwillDbService.getGoodwillLettersByUser("u-1", {
        status: "sent",
      });
      expect(mock.eq).toHaveBeenCalledWith("status", "sent");
    });

    it("should apply creditorName filter using ilike", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await goodwillDbService.getGoodwillLettersByUser("u-1", {
        creditorName: "Chase",
      });
      expect(mock.ilike).toHaveBeenCalledWith("creditor_name", "%Chase%");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await goodwillDbService.getGoodwillLettersByUser("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should apply offset with range when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await goodwillDbService.getGoodwillLettersByUser("u-1", {
        offset: 10,
        limit: 5,
      });
      expect(mock.range).toHaveBeenCalledWith(10, 14);
    });

    it("should handle null data gracefully", async () => {
      mockFrom({ data: null, error: null, count: 0 });

      const result = await goodwillDbService.getGoodwillLettersByUser("u-1");
      expect(result.letters).toHaveLength(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        goodwillDbService.getGoodwillLettersByUser("u-1"),
      ).rejects.toThrow("Failed to get goodwill letters");
    });
  });

  // --------------------------------------------------------------------------
  // getGoodwillLettersByStatus
  // --------------------------------------------------------------------------

  describe("getGoodwillLettersByStatus", () => {
    it("should return letters filtered by status", async () => {
      mockFrom({ data: [sampleLetterRow], error: null });

      const result = await goodwillDbService.getGoodwillLettersByStatus(
        "u-1",
        "draft",
      );
      expect(result).toHaveLength(1);
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await goodwillDbService.getGoodwillLettersByStatus("u-1", "sent", 3);
      expect(mock.limit).toHaveBeenCalledWith(3);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        goodwillDbService.getGoodwillLettersByStatus("u-1", "draft"),
      ).rejects.toThrow("Failed to get goodwill letters by status");
    });
  });

  // --------------------------------------------------------------------------
  // updateGoodwillLetter
  // --------------------------------------------------------------------------

  describe("updateGoodwillLetter", () => {
    it("should update a letter and return mapped result", async () => {
      const updatedRow = { ...sampleLetterRow, status: "sent" as const };
      mockFrom({ data: updatedRow, error: null });

      const result = await goodwillDbService.updateGoodwillLetter(
        "gl-1",
        "u-1",
        { status: "sent" },
      );

      expect(result.status).toBe("sent");
    });

    it("should map all update fields correctly", async () => {
      const mock = mockFrom({ data: sampleLetterRow, error: null });
      const sentDate = new Date("2026-01-15");
      const responseDate = new Date("2026-02-15");

      await goodwillDbService.updateGoodwillLetter("gl-1", "u-1", {
        creditorName: "New Creditor",
        accountNumber: "5678",
        latePaymentDate: new Date("2025-08-01T00:00:00Z"),
        reason: "Updated reason",
        letterContent: "Updated letter",
        status: "response_received",
        sentAt: sentDate,
        responseReceivedAt: responseDate,
        outcome: "removed",
        notes: "Follow up notes",
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          creditor_name: "New Creditor",
          account_number: "5678",
          late_payment_date: "2025-08-01",
          reason: "Updated reason",
          letter_content: "Updated letter",
          status: "response_received",
          sent_at: sentDate.toISOString(),
          response_received_at: responseDate.toISOString(),
          outcome: "removed",
          notes: "Follow up notes",
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Update failed" } });

      await expect(
        goodwillDbService.updateGoodwillLetter("gl-1", "u-1", {
          status: "sent",
        }),
      ).rejects.toThrow("Failed to update goodwill letter");
    });
  });

  // --------------------------------------------------------------------------
  // deleteGoodwillLetter
  // --------------------------------------------------------------------------

  describe("deleteGoodwillLetter", () => {
    it("should delete a letter and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await goodwillDbService.deleteGoodwillLetter(
        "gl-1",
        "u-1",
      );
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("goodwill_letters");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        goodwillDbService.deleteGoodwillLetter("gl-1", "u-1"),
      ).rejects.toThrow("Failed to delete goodwill letter");
    });
  });

  // --------------------------------------------------------------------------
  // getGoodwillLetterStats
  // --------------------------------------------------------------------------

  describe("getGoodwillLetterStats", () => {
    it("should compute stats from letter data", async () => {
      const letters = [
        { ...sampleLetterRow, status: "draft" as const },
        { ...sampleLetterRow, id: "gl-2", status: "sent" as const },
        { ...sampleLetterRow, id: "gl-3", status: "approved" as const },
        { ...sampleLetterRow, id: "gl-4", status: "denied" as const },
      ];
      mockFrom({ data: letters, error: null });

      const result = await goodwillDbService.getGoodwillLetterStats("u-1");

      expect(result.total).toBe(4);
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.sent).toBe(1);
      expect(result.byStatus.approved).toBe(1);
      expect(result.byStatus.denied).toBe(1);
      // successRate: 1 approved out of 2 (approved+denied) = 50%
      expect(result.successRate).toBe(50);
    });

    it("should return zero success rate when no responded letters", async () => {
      mockFrom({
        data: [
          { ...sampleLetterRow, status: "draft" },
          { ...sampleLetterRow, id: "gl-2", status: "sent" },
        ],
        error: null,
      });

      const result = await goodwillDbService.getGoodwillLetterStats("u-1");
      expect(result.successRate).toBe(0);
    });

    it("should return 100% when all responded letters are approved", async () => {
      mockFrom({
        data: [
          { ...sampleLetterRow, status: "approved" },
          { ...sampleLetterRow, id: "gl-2", status: "approved" },
        ],
        error: null,
      });

      const result = await goodwillDbService.getGoodwillLetterStats("u-1");
      expect(result.successRate).toBe(100);
    });

    it("should handle empty data", async () => {
      mockFrom({ data: [], error: null });

      const result = await goodwillDbService.getGoodwillLetterStats("u-1");
      expect(result.total).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Stats failed" } });

      await expect(
        goodwillDbService.getGoodwillLetterStats("u-1"),
      ).rejects.toThrow("Failed to get goodwill letter stats");
    });
  });
});
