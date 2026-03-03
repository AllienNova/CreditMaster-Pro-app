/**
 * @jest-environment node
 */

/**
 * Tests for DisputesDbService
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
  // Override single to resolve
  obj.single = jest.fn().mockResolvedValue(result);
  // Thenable for list queries (no .single())
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

import { disputesDbService } from "../disputes-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const sampleDisputeRow = {
  id: "d-1",
  user_id: "u-1",
  item_type: "account",
  item_description: "Incorrect balance on Chase card",
  creditor_name: "Chase Bank",
  account_number: "1234",
  balance: 500,
  inaccuracy_type: "incorrect_balance",
  strategy: "basic_dispute" as const,
  letter_content: "Dear Bureau...",
  status: "draft" as const,
  bureau: "experian" as const,
  sent_at: null,
  response_received_at: null,
  outcome: null,
  notes: null,
  created_at: now,
  updated_at: now,
};

const sampleDisputeRow2 = {
  ...sampleDisputeRow,
  id: "d-2",
  bureau: "equifax" as const,
  status: "resolved" as const,
  outcome: "removed" as const,
  strategy: "identity_theft" as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DisputesDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // createDispute
  // --------------------------------------------------------------------------

  describe("createDispute", () => {
    it("should create a dispute and return mapped result", async () => {
      mockFrom({ data: sampleDisputeRow, error: null });

      const result = await disputesDbService.createDispute({
        userId: "u-1",
        itemType: "account",
        itemDescription: "Incorrect balance on Chase card",
        creditorName: "Chase Bank",
        accountNumber: "1234",
        balance: 500,
        inaccuracyType: "incorrect_balance",
        strategy: "basic_dispute",
        letterContent: "Dear Bureau...",
        bureau: "experian",
      });

      expect(result.id).toBe("d-1");
      expect(result.userId).toBe("u-1");
      expect(result.itemType).toBe("account");
      expect(result.bureau).toBe("experian");
      expect(result.strategy).toBe("basic_dispute");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(sb().from).toHaveBeenCalledWith("disputes");
    });

    it("should default status to draft when not provided", async () => {
      const mock = mockFrom({ data: sampleDisputeRow, error: null });

      await disputesDbService.createDispute({
        userId: "u-1",
        itemType: "account",
        itemDescription: "Test",
        inaccuracyType: "incorrect_balance",
        strategy: "basic_dispute",
        bureau: "experian",
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft" }),
      );
    });

    it("should use provided status when given", async () => {
      const mock = mockFrom({
        data: { ...sampleDisputeRow, status: "sent" },
        error: null,
      });

      await disputesDbService.createDispute({
        userId: "u-1",
        itemType: "account",
        itemDescription: "Test",
        inaccuracyType: "incorrect_balance",
        strategy: "basic_dispute",
        bureau: "experian",
        status: "sent",
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "sent" }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        disputesDbService.createDispute({
          userId: "u-1",
          itemType: "account",
          itemDescription: "Test",
          inaccuracyType: "incorrect_balance",
          strategy: "basic_dispute",
          bureau: "experian",
        }),
      ).rejects.toThrow("Failed to create dispute");
    });
  });

  // --------------------------------------------------------------------------
  // getDispute
  // --------------------------------------------------------------------------

  describe("getDispute", () => {
    it("should return mapped dispute when found", async () => {
      mockFrom({ data: sampleDisputeRow, error: null });

      const result = await disputesDbService.getDispute("d-1", "u-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("d-1");
      expect(result!.creditorName).toBe("Chase Bank");
    });

    it("should return null when dispute not found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await disputesDbService.getDispute("nonexistent", "u-1");
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "Connection lost" } });

      await expect(
        disputesDbService.getDispute("d-1", "u-1"),
      ).rejects.toThrow("Failed to get dispute");
    });

    it("should return null when data is null without error", async () => {
      const mock = chainMock({ data: null, error: null });
      mock.single = jest.fn().mockResolvedValue({ data: null, error: null });
      sb().from.mockReturnValue(mock);

      // The service checks: if error -> check PGRST116. Then: return data ? mapped : null
      // With single resolving {data: null, error: null}, the destructured {data, error} means data=null, error=null
      // So it returns null
      const innerMock = mockFrom({ data: null, error: null });
      // Override single to return {data: null, error: null}
      innerMock.single = jest.fn().mockResolvedValue({ data: null, error: null });

      const result = await disputesDbService.getDispute("d-1", "u-1");
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // getDisputesByUser
  // --------------------------------------------------------------------------

  describe("getDisputesByUser", () => {
    it("should return disputes array and total count", async () => {
      mockFrom({
        data: [sampleDisputeRow, sampleDisputeRow2],
        error: null,
        count: 2,
      });

      const result = await disputesDbService.getDisputesByUser("u-1");
      expect(result.disputes).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.disputes[0].id).toBe("d-1");
      expect(result.disputes[1].id).toBe("d-2");
    });

    it("should return empty array when no disputes found", async () => {
      mockFrom({ data: [], error: null, count: 0 });

      const result = await disputesDbService.getDisputesByUser("u-1");
      expect(result.disputes).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should apply status filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await disputesDbService.getDisputesByUser("u-1", { status: "draft" });
      // eq should be called for user_id and status
      expect(mock.eq).toHaveBeenCalledWith("user_id", "u-1");
      expect(mock.eq).toHaveBeenCalledWith("status", "draft");
    });

    it("should apply bureau filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await disputesDbService.getDisputesByUser("u-1", { bureau: "equifax" });
      expect(mock.eq).toHaveBeenCalledWith("bureau", "equifax");
    });

    it("should apply strategy filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await disputesDbService.getDisputesByUser("u-1", {
        strategy: "identity_theft",
      });
      expect(mock.eq).toHaveBeenCalledWith("strategy", "identity_theft");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await disputesDbService.getDisputesByUser("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should apply offset with range when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await disputesDbService.getDisputesByUser("u-1", {
        offset: 10,
        limit: 5,
      });
      expect(mock.range).toHaveBeenCalledWith(10, 14);
    });

    it("should use default limit of 10 for range calculation when limit not set", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await disputesDbService.getDisputesByUser("u-1", { offset: 5 });
      expect(mock.range).toHaveBeenCalledWith(5, 14);
    });

    it("should handle null data gracefully", async () => {
      mockFrom({ data: null, error: null, count: 0 });

      const result = await disputesDbService.getDisputesByUser("u-1");
      expect(result.disputes).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        disputesDbService.getDisputesByUser("u-1"),
      ).rejects.toThrow("Failed to get disputes");
    });
  });

  // --------------------------------------------------------------------------
  // getDisputesByStatus
  // --------------------------------------------------------------------------

  describe("getDisputesByStatus", () => {
    it("should return disputes filtered by status", async () => {
      mockFrom({ data: [sampleDisputeRow], error: null });

      const result = await disputesDbService.getDisputesByStatus(
        "u-1",
        "draft",
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("draft");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await disputesDbService.getDisputesByStatus("u-1", "sent", 3);
      expect(mock.limit).toHaveBeenCalledWith(3);
    });

    it("should return empty array when no disputes match", async () => {
      mockFrom({ data: [], error: null });

      const result = await disputesDbService.getDisputesByStatus(
        "u-1",
        "resolved",
      );
      expect(result).toHaveLength(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        disputesDbService.getDisputesByStatus("u-1", "draft"),
      ).rejects.toThrow("Failed to get disputes by status");
    });
  });

  // --------------------------------------------------------------------------
  // getDisputesByBureau
  // --------------------------------------------------------------------------

  describe("getDisputesByBureau", () => {
    it("should return disputes filtered by bureau", async () => {
      mockFrom({ data: [sampleDisputeRow], error: null });

      const result = await disputesDbService.getDisputesByBureau(
        "u-1",
        "experian",
      );
      expect(result).toHaveLength(1);
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await disputesDbService.getDisputesByBureau("u-1", "equifax", 5);
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        disputesDbService.getDisputesByBureau("u-1", "transunion"),
      ).rejects.toThrow("Failed to get disputes by bureau");
    });
  });

  // --------------------------------------------------------------------------
  // updateDispute
  // --------------------------------------------------------------------------

  describe("updateDispute", () => {
    it("should update a dispute and return mapped result", async () => {
      const updatedRow = { ...sampleDisputeRow, status: "sent" as const };
      mockFrom({ data: updatedRow, error: null });

      const result = await disputesDbService.updateDispute("d-1", "u-1", {
        status: "sent",
      });

      expect(result.status).toBe("sent");
      expect(result.id).toBe("d-1");
    });

    it("should map all update fields correctly", async () => {
      const mock = mockFrom({ data: sampleDisputeRow, error: null });
      const sentDate = new Date("2026-01-15");
      const responseDate = new Date("2026-02-15");

      await disputesDbService.updateDispute("d-1", "u-1", {
        itemType: "inquiry",
        itemDescription: "Updated desc",
        creditorName: "New Creditor",
        accountNumber: "5678",
        balance: 1000,
        inaccuracyType: "duplicate",
        strategy: "method_of_verification",
        letterContent: "Updated letter",
        status: "resolved",
        bureau: "transunion",
        sentAt: sentDate,
        responseReceivedAt: responseDate,
        outcome: "removed",
        notes: "Test notes",
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          item_type: "inquiry",
          item_description: "Updated desc",
          creditor_name: "New Creditor",
          account_number: "5678",
          balance: 1000,
          inaccuracy_type: "duplicate",
          strategy: "method_of_verification",
          letter_content: "Updated letter",
          status: "resolved",
          bureau: "transunion",
          sent_at: sentDate.toISOString(),
          response_received_at: responseDate.toISOString(),
          outcome: "removed",
          notes: "Test notes",
        }),
      );
    });

    it("should perform optimistic locking when expectedUpdatedAt is provided", async () => {
      const expectedDate = new Date(now);
      // First call: the check query returns matching updated_at
      // Second call: the update query returns the updated row
      const checkMock = chainMock({
        data: { updated_at: now },
        error: null,
      });
      const updateMock = chainMock({
        data: { ...sampleDisputeRow, status: "sent" },
        error: null,
      });

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? checkMock : updateMock;
      });

      const result = await disputesDbService.updateDispute(
        "d-1",
        "u-1",
        { status: "sent" },
        expectedDate,
      );

      expect(result.id).toBe("d-1");
      expect(sb().from).toHaveBeenCalledTimes(2);
    });

    it("should throw when optimistic lock fails (concurrent modification)", async () => {
      const expectedDate = new Date("2026-01-01T00:00:00.000Z");
      const differentDate = new Date("2026-01-02T00:00:00.000Z").toISOString();

      mockFrom({ data: { updated_at: differentDate }, error: null });

      await expect(
        disputesDbService.updateDispute(
          "d-1",
          "u-1",
          { status: "sent" },
          expectedDate,
        ),
      ).rejects.toThrow("Dispute has been modified by another process");
    });

    it("should throw when optimistic lock check query fails", async () => {
      mockFrom({
        data: null,
        error: { message: "Check failed" },
      });

      await expect(
        disputesDbService.updateDispute(
          "d-1",
          "u-1",
          { status: "sent" },
          new Date(),
        ),
      ).rejects.toThrow("Failed to update dispute");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Update failed" } });

      await expect(
        disputesDbService.updateDispute("d-1", "u-1", { status: "sent" }),
      ).rejects.toThrow("Failed to update dispute");
    });
  });

  // --------------------------------------------------------------------------
  // deleteDispute
  // --------------------------------------------------------------------------

  describe("deleteDispute", () => {
    it("should delete a dispute and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await disputesDbService.deleteDispute("d-1", "u-1");
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("disputes");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        disputesDbService.deleteDispute("d-1", "u-1"),
      ).rejects.toThrow("Failed to delete dispute");
    });
  });

  // --------------------------------------------------------------------------
  // getDisputeStats
  // --------------------------------------------------------------------------

  describe("getDisputeStats", () => {
    it("should compute stats from dispute data", async () => {
      const disputes = [
        { ...sampleDisputeRow, status: "draft" as const },
        {
          ...sampleDisputeRow,
          id: "d-2",
          status: "resolved" as const,
          outcome: "removed" as const,
          bureau: "equifax" as const,
          strategy: "identity_theft" as const,
        },
        {
          ...sampleDisputeRow,
          id: "d-3",
          status: "resolved" as const,
          outcome: "verified" as const,
          bureau: "transunion" as const,
          strategy: "method_of_verification" as const,
        },
      ];
      mockFrom({ data: disputes, error: null });

      const result = await disputesDbService.getDisputeStats("u-1");

      expect(result.total).toBe(3);
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.resolved).toBe(2);
      expect(result.byBureau.experian).toBe(1);
      expect(result.byBureau.equifax).toBe(1);
      expect(result.byBureau.transunion).toBe(1);
      expect(result.byStrategy.basic_dispute).toBe(1);
      expect(result.byStrategy.identity_theft).toBe(1);
      // successRate: 1 removed out of 2 resolved = 50%
      expect(result.successRate).toBe(50);
    });

    it("should return zero success rate when no resolved disputes", async () => {
      mockFrom({
        data: [{ ...sampleDisputeRow, status: "draft" }],
        error: null,
      });

      const result = await disputesDbService.getDisputeStats("u-1");
      expect(result.successRate).toBe(0);
    });

    it("should return 100% success rate when all resolved disputes are successful", async () => {
      mockFrom({
        data: [
          {
            ...sampleDisputeRow,
            status: "resolved",
            outcome: "removed",
          },
          {
            ...sampleDisputeRow,
            id: "d-2",
            status: "resolved",
            outcome: "updated",
          },
        ],
        error: null,
      });

      const result = await disputesDbService.getDisputeStats("u-1");
      expect(result.successRate).toBe(100);
    });

    it("should handle empty dispute list", async () => {
      mockFrom({ data: [], error: null });

      const result = await disputesDbService.getDisputeStats("u-1");
      expect(result.total).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Stats query failed" } });

      await expect(
        disputesDbService.getDisputeStats("u-1"),
      ).rejects.toThrow("Failed to get dispute stats");
    });
  });

  // --------------------------------------------------------------------------
  // bulkUpdateDisputeStatus
  // --------------------------------------------------------------------------

  describe("bulkUpdateDisputeStatus", () => {
    it("should bulk update dispute status and return count", async () => {
      const mock = mockFrom({ data: null, error: null, count: 3 });

      const result = await disputesDbService.bulkUpdateDisputeStatus(
        ["d-1", "d-2", "d-3"],
        "u-1",
        "sent",
      );

      expect(result).toBe(3);
      expect(mock.update).toHaveBeenCalledWith({ status: "sent" });
      expect(mock.in).toHaveBeenCalledWith("id", ["d-1", "d-2", "d-3"]);
      expect(mock.eq).toHaveBeenCalledWith("user_id", "u-1");
    });

    it("should return 0 when no records matched", async () => {
      mockFrom({ data: null, error: null, count: 0 });

      const result = await disputesDbService.bulkUpdateDisputeStatus(
        ["nonexistent"],
        "u-1",
        "sent",
      );

      expect(result).toBe(0);
    });

    it("should throw on database error", async () => {
      mockFrom({
        data: null,
        error: { message: "Bulk update failed" },
      });

      await expect(
        disputesDbService.bulkUpdateDisputeStatus(["d-1"], "u-1", "sent"),
      ).rejects.toThrow("Failed to bulk update dispute status");
    });
  });
});
