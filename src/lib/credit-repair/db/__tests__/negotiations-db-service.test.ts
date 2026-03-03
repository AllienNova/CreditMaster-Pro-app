/**
 * @jest-environment node
 */

/**
 * Tests for NegotiationsDbService
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

import { negotiationsDbService } from "../negotiations-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const sampleNegotiationRow = {
  id: "n-1",
  user_id: "u-1",
  collection_agency: "ABC Collections",
  original_creditor: "Chase Bank",
  account_number: "1234",
  original_balance: 5000,
  current_balance: 4500,
  settlement_percentage: 40,
  settlement_amount: 1800,
  scripts: { phone: "Hello...", email: "Dear..." },
  status: "pending" as const,
  agreed_at: null,
  paid_at: null,
  deletion_confirmed_at: null,
  notes: null,
  created_at: now,
  updated_at: now,
};

const sampleNegotiationRow2 = {
  ...sampleNegotiationRow,
  id: "n-2",
  collection_agency: "XYZ Collections",
  status: "completed" as const,
  settlement_amount: 2000,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NegotiationsDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // createNegotiation
  // --------------------------------------------------------------------------

  describe("createNegotiation", () => {
    it("should create a negotiation and return mapped result", async () => {
      mockFrom({ data: sampleNegotiationRow, error: null });

      const result = await negotiationsDbService.createNegotiation({
        userId: "u-1",
        collectionAgency: "ABC Collections",
        originalCreditor: "Chase Bank",
        accountNumber: "1234",
        originalBalance: 5000,
        currentBalance: 4500,
        settlementPercentage: 40,
        settlementAmount: 1800,
        scripts: { phone: "Hello...", email: "Dear..." },
      });

      expect(result.id).toBe("n-1");
      expect(result.userId).toBe("u-1");
      expect(result.collectionAgency).toBe("ABC Collections");
      expect(result.originalBalance).toBe(5000);
      expect(result.currentBalance).toBe(4500);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(sb().from).toHaveBeenCalledWith("negotiations");
    });

    it("should default status to pending when not provided", async () => {
      const mock = mockFrom({ data: sampleNegotiationRow, error: null });

      await negotiationsDbService.createNegotiation({
        userId: "u-1",
        collectionAgency: "ABC Collections",
        originalBalance: 5000,
        currentBalance: 4500,
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    it("should use provided status when given", async () => {
      const mock = mockFrom({
        data: { ...sampleNegotiationRow, status: "negotiating" },
        error: null,
      });

      await negotiationsDbService.createNegotiation({
        userId: "u-1",
        collectionAgency: "ABC Collections",
        originalBalance: 5000,
        currentBalance: 4500,
        status: "negotiating",
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "negotiating" }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        negotiationsDbService.createNegotiation({
          userId: "u-1",
          collectionAgency: "ABC Collections",
          originalBalance: 5000,
          currentBalance: 4500,
        }),
      ).rejects.toThrow("Failed to create negotiation");
    });
  });

  // --------------------------------------------------------------------------
  // getNegotiation
  // --------------------------------------------------------------------------

  describe("getNegotiation", () => {
    it("should return mapped negotiation when found", async () => {
      mockFrom({ data: sampleNegotiationRow, error: null });

      const result = await negotiationsDbService.getNegotiation("n-1", "u-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("n-1");
      expect(result!.collectionAgency).toBe("ABC Collections");
      expect(result!.scripts).toEqual({ phone: "Hello...", email: "Dear..." });
    });

    it("should return null when not found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await negotiationsDbService.getNegotiation(
        "nonexistent",
        "u-1",
      );
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "Connection lost" } });

      await expect(
        negotiationsDbService.getNegotiation("n-1", "u-1"),
      ).rejects.toThrow("Failed to get negotiation");
    });

    it("should return null when data is null without error", async () => {
      mockFrom({ data: null, error: null });

      const result = await negotiationsDbService.getNegotiation("n-1", "u-1");
      expect(result).toBeNull();
    });

    it("should map date fields when present", async () => {
      const rowWithDates = {
        ...sampleNegotiationRow,
        agreed_at: "2026-01-15T00:00:00.000Z",
        paid_at: "2026-02-01T00:00:00.000Z",
        deletion_confirmed_at: "2026-02-15T00:00:00.000Z",
      };
      mockFrom({ data: rowWithDates, error: null });

      const result = await negotiationsDbService.getNegotiation("n-1", "u-1");
      expect(result!.agreedAt).toBeInstanceOf(Date);
      expect(result!.paidAt).toBeInstanceOf(Date);
      expect(result!.deletionConfirmedAt).toBeInstanceOf(Date);
    });

    it("should return undefined for null optional fields", async () => {
      mockFrom({ data: sampleNegotiationRow, error: null });

      const result = await negotiationsDbService.getNegotiation("n-1", "u-1");
      expect(result!.agreedAt).toBeUndefined();
      expect(result!.paidAt).toBeUndefined();
      expect(result!.deletionConfirmedAt).toBeUndefined();
      expect(result!.notes).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getNegotiationsByUser
  // --------------------------------------------------------------------------

  describe("getNegotiationsByUser", () => {
    it("should return negotiations array and total count", async () => {
      mockFrom({
        data: [sampleNegotiationRow, sampleNegotiationRow2],
        error: null,
        count: 2,
      });

      const result = await negotiationsDbService.getNegotiationsByUser("u-1");
      expect(result.negotiations).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should return empty array when no negotiations found", async () => {
      mockFrom({ data: [], error: null, count: 0 });

      const result = await negotiationsDbService.getNegotiationsByUser("u-1");
      expect(result.negotiations).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should apply status filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await negotiationsDbService.getNegotiationsByUser("u-1", {
        status: "negotiating",
      });
      expect(mock.eq).toHaveBeenCalledWith("status", "negotiating");
    });

    it("should apply collectionAgency filter using ilike", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await negotiationsDbService.getNegotiationsByUser("u-1", {
        collectionAgency: "ABC",
      });
      expect(mock.ilike).toHaveBeenCalledWith("collection_agency", "%ABC%");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await negotiationsDbService.getNegotiationsByUser("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should apply offset with range when provided", async () => {
      const mock = mockFrom({ data: [], error: null, count: 0 });

      await negotiationsDbService.getNegotiationsByUser("u-1", {
        offset: 10,
        limit: 5,
      });
      expect(mock.range).toHaveBeenCalledWith(10, 14);
    });

    it("should handle null data gracefully", async () => {
      mockFrom({ data: null, error: null, count: 0 });

      const result = await negotiationsDbService.getNegotiationsByUser("u-1");
      expect(result.negotiations).toHaveLength(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        negotiationsDbService.getNegotiationsByUser("u-1"),
      ).rejects.toThrow("Failed to get negotiations");
    });
  });

  // --------------------------------------------------------------------------
  // getNegotiationsByStatus
  // --------------------------------------------------------------------------

  describe("getNegotiationsByStatus", () => {
    it("should return negotiations filtered by status", async () => {
      mockFrom({ data: [sampleNegotiationRow], error: null });

      const result = await negotiationsDbService.getNegotiationsByStatus(
        "u-1",
        "pending",
      );
      expect(result).toHaveLength(1);
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await negotiationsDbService.getNegotiationsByStatus(
        "u-1",
        "negotiating",
        3,
      );
      expect(mock.limit).toHaveBeenCalledWith(3);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        negotiationsDbService.getNegotiationsByStatus("u-1", "pending"),
      ).rejects.toThrow("Failed to get negotiations by status");
    });
  });

  // --------------------------------------------------------------------------
  // updateNegotiation
  // --------------------------------------------------------------------------

  describe("updateNegotiation", () => {
    it("should update a negotiation and return mapped result", async () => {
      const updatedRow = {
        ...sampleNegotiationRow,
        status: "negotiating" as const,
      };
      mockFrom({ data: updatedRow, error: null });

      const result = await negotiationsDbService.updateNegotiation(
        "n-1",
        "u-1",
        { status: "negotiating" },
      );

      expect(result.status).toBe("negotiating");
    });

    it("should map all update fields correctly", async () => {
      const mock = mockFrom({ data: sampleNegotiationRow, error: null });
      const agreedDate = new Date("2026-01-15");
      const paidDate = new Date("2026-02-01");
      const deletionDate = new Date("2026-02-15");

      await negotiationsDbService.updateNegotiation("n-1", "u-1", {
        collectionAgency: "New Agency",
        originalCreditor: "New Creditor",
        accountNumber: "5678",
        originalBalance: 6000,
        currentBalance: 5500,
        settlementPercentage: 35,
        settlementAmount: 1925,
        scripts: { phone: "Updated..." },
        status: "completed",
        agreedAt: agreedDate,
        paidAt: paidDate,
        deletionConfirmedAt: deletionDate,
        notes: "Updated notes",
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_agency: "New Agency",
          original_creditor: "New Creditor",
          account_number: "5678",
          original_balance: 6000,
          current_balance: 5500,
          settlement_percentage: 35,
          settlement_amount: 1925,
          scripts: { phone: "Updated..." },
          status: "completed",
          agreed_at: agreedDate.toISOString(),
          paid_at: paidDate.toISOString(),
          deletion_confirmed_at: deletionDate.toISOString(),
          notes: "Updated notes",
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Update failed" } });

      await expect(
        negotiationsDbService.updateNegotiation("n-1", "u-1", {
          status: "failed",
        }),
      ).rejects.toThrow("Failed to update negotiation");
    });
  });

  // --------------------------------------------------------------------------
  // deleteNegotiation
  // --------------------------------------------------------------------------

  describe("deleteNegotiation", () => {
    it("should delete a negotiation and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await negotiationsDbService.deleteNegotiation(
        "n-1",
        "u-1",
      );
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("negotiations");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        negotiationsDbService.deleteNegotiation("n-1", "u-1"),
      ).rejects.toThrow("Failed to delete negotiation");
    });
  });

  // --------------------------------------------------------------------------
  // getNegotiationStats
  // --------------------------------------------------------------------------

  describe("getNegotiationStats", () => {
    it("should compute stats from negotiation data", async () => {
      const negotiations = [
        {
          ...sampleNegotiationRow,
          status: "pending" as const,
          original_balance: 5000,
          settlement_amount: 2000,
        },
        {
          ...sampleNegotiationRow,
          id: "n-2",
          status: "completed" as const,
          original_balance: 3000,
          settlement_amount: 1200,
        },
        {
          ...sampleNegotiationRow,
          id: "n-3",
          status: "failed" as const,
          original_balance: 2000,
          settlement_amount: null,
        },
      ];
      mockFrom({ data: negotiations, error: null });

      const result = await negotiationsDbService.getNegotiationStats("u-1");

      expect(result.total).toBe(3);
      expect(result.byStatus.pending).toBe(1);
      expect(result.byStatus.completed).toBe(1);
      expect(result.byStatus.failed).toBe(1);
      expect(result.totalOriginalBalance).toBe(10000);
      expect(result.totalSettlementAmount).toBe(3200);
      // averageSavings: (10000 - 3200) / 10000 * 100 = 68%
      expect(result.averageSavings).toBe(68);
      // successRate: 1 completed out of 2 (completed + failed) = 50%
      expect(result.successRate).toBe(50);
    });

    it("should return zero averageSavings when totalOriginalBalance is 0", async () => {
      mockFrom({ data: [], error: null });

      const result = await negotiationsDbService.getNegotiationStats("u-1");
      expect(result.averageSavings).toBe(0);
      expect(result.totalOriginalBalance).toBe(0);
    });

    it("should return zero success rate when no completed or failed negotiations", async () => {
      mockFrom({
        data: [
          {
            ...sampleNegotiationRow,
            status: "pending",
            original_balance: 1000,
            settlement_amount: null,
          },
        ],
        error: null,
      });

      const result = await negotiationsDbService.getNegotiationStats("u-1");
      expect(result.successRate).toBe(0);
    });

    it("should return 100% success rate when all terminal negotiations are completed", async () => {
      mockFrom({
        data: [
          {
            ...sampleNegotiationRow,
            status: "completed",
            original_balance: 5000,
            settlement_amount: 2000,
          },
        ],
        error: null,
      });

      const result = await negotiationsDbService.getNegotiationStats("u-1");
      expect(result.successRate).toBe(100);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Stats failed" } });

      await expect(
        negotiationsDbService.getNegotiationStats("u-1"),
      ).rejects.toThrow("Failed to get negotiation stats");
    });
  });
});
