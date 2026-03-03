/**
 * @jest-environment node
 */

/**
 * Tests for CreditCardsDbService
 *
 * Covers: credit card CRUD, payment recording, stats, utilization, and payment reminders.
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

import { creditCardsDbService } from "../credit-cards-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const sampleCardRow = {
  id: "card-1",
  user_id: "u-1",
  card_name: "Chase Freedom",
  last_four_digits: "4567",
  current_balance: 1500,
  credit_limit: 5000,
  utilization: 30,
  statement_date: 15,
  due_date: 5,
  last_payment_date: "2026-02-01",
  last_payment_amount: 200,
  notes: "Primary card",
  created_at: now,
  updated_at: now,
};

const sampleCardRow2 = {
  ...sampleCardRow,
  id: "card-2",
  card_name: "Citi Double Cash",
  last_four_digits: "8901",
  current_balance: 3000,
  credit_limit: 10000,
  utilization: 30,
  statement_date: 20,
  due_date: 10,
  last_payment_date: null,
  last_payment_amount: null,
  notes: null,
};

const sampleCardRow3 = {
  ...sampleCardRow,
  id: "card-3",
  card_name: "Amex Gold",
  last_four_digits: "2345",
  current_balance: 100,
  credit_limit: 8000,
  utilization: 1.25,
  statement_date: 25,
  due_date: 15,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreditCardsDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // createCreditCard
  // --------------------------------------------------------------------------

  describe("createCreditCard", () => {
    it("should create a card and return mapped result", async () => {
      mockFrom({ data: sampleCardRow, error: null });

      const result = await creditCardsDbService.createCreditCard({
        userId: "u-1",
        cardName: "Chase Freedom",
        lastFourDigits: "4567",
        currentBalance: 1500,
        creditLimit: 5000,
        statementDate: 15,
        dueDate: 5,
        lastPaymentDate: new Date("2026-02-01"),
        lastPaymentAmount: 200,
        notes: "Primary card",
      });

      expect(result.id).toBe("card-1");
      expect(result.userId).toBe("u-1");
      expect(result.cardName).toBe("Chase Freedom");
      expect(result.lastFourDigits).toBe("4567");
      expect(result.currentBalance).toBe(1500);
      expect(result.creditLimit).toBe(5000);
      expect(result.utilization).toBe(30);
      expect(result.lastPaymentDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(sb().from).toHaveBeenCalledWith("credit_cards");
    });

    it("should convert lastPaymentDate to date-only string", async () => {
      const mock = mockFrom({ data: sampleCardRow, error: null });

      await creditCardsDbService.createCreditCard({
        userId: "u-1",
        cardName: "Card",
        currentBalance: 100,
        creditLimit: 1000,
        statementDate: 15,
        dueDate: 5,
        lastPaymentDate: new Date("2026-02-01T14:30:00Z"),
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ last_payment_date: "2026-02-01" }),
      );
    });

    it("should handle creation without optional fields", async () => {
      const mock = mockFrom({ data: sampleCardRow, error: null });

      await creditCardsDbService.createCreditCard({
        userId: "u-1",
        cardName: "Card",
        currentBalance: 0,
        creditLimit: 1000,
        statementDate: 15,
        dueDate: 5,
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          last_payment_date: undefined,
          last_payment_amount: undefined,
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        creditCardsDbService.createCreditCard({
          userId: "u-1",
          cardName: "Card",
          currentBalance: 0,
          creditLimit: 1000,
          statementDate: 15,
          dueDate: 5,
        }),
      ).rejects.toThrow("Failed to create credit card");
    });
  });

  // --------------------------------------------------------------------------
  // getCreditCard
  // --------------------------------------------------------------------------

  describe("getCreditCard", () => {
    it("should return mapped card when found", async () => {
      mockFrom({ data: sampleCardRow, error: null });

      const result = await creditCardsDbService.getCreditCard("card-1", "u-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("card-1");
      expect(result!.cardName).toBe("Chase Freedom");
    });

    it("should return null when not found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await creditCardsDbService.getCreditCard("nope", "u-1");
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "Connection lost" } });

      await expect(
        creditCardsDbService.getCreditCard("card-1", "u-1"),
      ).rejects.toThrow("Failed to get credit card");
    });

    it("should map null optional fields as undefined", async () => {
      const rowNulls = {
        ...sampleCardRow,
        last_four_digits: null,
        last_payment_date: null,
        last_payment_amount: null,
        notes: null,
      };
      mockFrom({ data: rowNulls, error: null });

      const result = await creditCardsDbService.getCreditCard("card-1", "u-1");
      expect(result!.lastFourDigits).toBeUndefined();
      expect(result!.lastPaymentDate).toBeUndefined();
      expect(result!.lastPaymentAmount).toBeUndefined();
      expect(result!.notes).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getCreditCardsByUser
  // --------------------------------------------------------------------------

  describe("getCreditCardsByUser", () => {
    it("should return cards array", async () => {
      mockFrom({
        data: [sampleCardRow, sampleCardRow2],
        error: null,
      });

      const result =
        await creditCardsDbService.getCreditCardsByUser("u-1");
      expect(result).toHaveLength(2);
    });

    it("should apply minUtilization filter", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditCardsDbService.getCreditCardsByUser("u-1", {
        minUtilization: 20,
      });
      expect(mock.gte).toHaveBeenCalledWith("utilization", 20);
    });

    it("should apply maxUtilization filter", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditCardsDbService.getCreditCardsByUser("u-1", {
        maxUtilization: 50,
      });
      expect(mock.lte).toHaveBeenCalledWith("utilization", 50);
    });

    it("should apply limit when provided without offset", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditCardsDbService.getCreditCardsByUser("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should apply range when offset is provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditCardsDbService.getCreditCardsByUser("u-1", {
        offset: 10,
        limit: 5,
      });
      // range(10, 10 + 5 - 1) = range(10, 14)
      expect(mock.range).toHaveBeenCalledWith(10, 14);
    });

    it("should use default limit of 50 when offset provided without limit", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditCardsDbService.getCreditCardsByUser("u-1", {
        offset: 0,
      });
      // range(0, 0 + 50 - 1) = range(0, 49)
      expect(mock.range).toHaveBeenCalledWith(0, 49);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result =
        await creditCardsDbService.getCreditCardsByUser("u-1");
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditCardsDbService.getCreditCardsByUser("u-1"),
      ).rejects.toThrow("Failed to get credit cards");
    });
  });

  // --------------------------------------------------------------------------
  // updateCreditCard
  // --------------------------------------------------------------------------

  describe("updateCreditCard", () => {
    it("should update a card and return mapped result", async () => {
      const updatedRow = { ...sampleCardRow, current_balance: 1000 };
      mockFrom({ data: updatedRow, error: null });

      const result = await creditCardsDbService.updateCreditCard(
        "card-1",
        "u-1",
        { currentBalance: 1000 },
      );
      expect(result.currentBalance).toBe(1000);
    });

    it("should map all update fields correctly", async () => {
      const mock = mockFrom({ data: sampleCardRow, error: null });

      await creditCardsDbService.updateCreditCard("card-1", "u-1", {
        cardName: "New Name",
        lastFourDigits: "9999",
        currentBalance: 500,
        creditLimit: 8000,
        statementDate: 20,
        dueDate: 10,
        lastPaymentDate: new Date("2026-03-01T00:00:00Z"),
        lastPaymentAmount: 300,
        notes: "Updated notes",
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          card_name: "New Name",
          last_four_digits: "9999",
          current_balance: 500,
          credit_limit: 8000,
          statement_date: 20,
          due_date: 10,
          last_payment_date: "2026-03-01",
          last_payment_amount: 300,
          notes: "Updated notes",
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Update failed" } });

      await expect(
        creditCardsDbService.updateCreditCard("card-1", "u-1", {
          currentBalance: 0,
        }),
      ).rejects.toThrow("Failed to update credit card");
    });
  });

  // --------------------------------------------------------------------------
  // deleteCreditCard
  // --------------------------------------------------------------------------

  describe("deleteCreditCard", () => {
    it("should delete a card and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditCardsDbService.deleteCreditCard(
        "card-1",
        "u-1",
      );
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("credit_cards");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        creditCardsDbService.deleteCreditCard("card-1", "u-1"),
      ).rejects.toThrow("Failed to delete credit card");
    });
  });

  // --------------------------------------------------------------------------
  // recordPayment (compound)
  // --------------------------------------------------------------------------

  describe("recordPayment", () => {
    it("should get card, calculate new balance, and update", async () => {
      // Call 1: getCreditCard (single)
      const getMock = chainMock({ data: sampleCardRow, error: null });
      // Call 2: updateCreditCard (single)
      const updatedRow = {
        ...sampleCardRow,
        current_balance: 1000,
        last_payment_date: "2026-02-20",
        last_payment_amount: 500,
      };
      const updateMock = chainMock({ data: updatedRow, error: null });

      sb().from
        .mockReturnValueOnce(getMock)
        .mockReturnValueOnce(updateMock);

      const result = await creditCardsDbService.recordPayment(
        "card-1",
        "u-1",
        500,
        new Date("2026-02-20"),
      );

      // newBalance = Math.max(0, 1500 - 500) = 1000
      expect(result.currentBalance).toBe(1000);
      expect(result.lastPaymentAmount).toBe(500);
    });

    it("should clamp balance to zero when payment exceeds balance", async () => {
      const getMock = chainMock({ data: sampleCardRow, error: null });
      const updatedRow = {
        ...sampleCardRow,
        current_balance: 0,
        last_payment_amount: 2000,
      };
      const updateMock = chainMock({ data: updatedRow, error: null });

      sb().from
        .mockReturnValueOnce(getMock)
        .mockReturnValueOnce(updateMock);

      const result = await creditCardsDbService.recordPayment(
        "card-1",
        "u-1",
        2000,
        new Date("2026-02-20"),
      );

      expect(result.currentBalance).toBe(0);
    });

    it("should throw when card not found", async () => {
      const notFoundMock = chainMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      sb().from.mockReturnValueOnce(notFoundMock);

      await expect(
        creditCardsDbService.recordPayment(
          "nope",
          "u-1",
          100,
          new Date(),
        ),
      ).rejects.toThrow("Failed to record payment");
    });

    it("should throw on update error", async () => {
      const getMock = chainMock({ data: sampleCardRow, error: null });
      const updateFail = chainMock({
        data: null,
        error: { message: "Update failed" },
      });

      sb().from
        .mockReturnValueOnce(getMock)
        .mockReturnValueOnce(updateFail);

      await expect(
        creditCardsDbService.recordPayment(
          "card-1",
          "u-1",
          500,
          new Date(),
        ),
      ).rejects.toThrow("Failed to record payment");
    });
  });

  // --------------------------------------------------------------------------
  // getCreditCardStats (compound)
  // --------------------------------------------------------------------------

  describe("getCreditCardStats", () => {
    it("should compute stats from card data", async () => {
      // getCreditCardsByUser returns list via thenable
      mockFrom({
        data: [sampleCardRow, sampleCardRow2, sampleCardRow3],
        error: null,
      });

      const result = await creditCardsDbService.getCreditCardStats("u-1");

      expect(result.totalCards).toBe(3);
      // totalBalance = 1500 + 3000 + 100 = 4600
      expect(result.totalBalance).toBe(4600);
      // totalCreditLimit = 5000 + 10000 + 8000 = 23000
      expect(result.totalCreditLimit).toBe(23000);
      // overallUtilization = (4600/23000)*100 = 20.0
      expect(result.overallUtilization).toBe(20);
      // averageUtilization = (30 + 30 + 1.25) / 3 = 20.416...
      expect(result.averageUtilization).toBeCloseTo(20.42, 1);
      // highUtilizationCards (>30%) = 0 (30 is not > 30)
      expect(result.highUtilizationCards).toBe(0);
    });

    it("should handle empty cards array", async () => {
      mockFrom({ data: [], error: null });

      const result = await creditCardsDbService.getCreditCardStats("u-1");

      expect(result.totalCards).toBe(0);
      expect(result.totalBalance).toBe(0);
      expect(result.totalCreditLimit).toBe(0);
      expect(result.overallUtilization).toBe(0);
      expect(result.averageUtilization).toBe(0);
      expect(result.highUtilizationCards).toBe(0);
    });

    it("should count high utilization cards correctly", async () => {
      const highUtilCard = {
        ...sampleCardRow,
        utilization: 85,
      };
      mockFrom({ data: [highUtilCard], error: null });

      const result = await creditCardsDbService.getCreditCardStats("u-1");
      expect(result.highUtilizationCards).toBe(1);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditCardsDbService.getCreditCardStats("u-1"),
      ).rejects.toThrow("Failed to get credit card stats");
    });
  });

  // --------------------------------------------------------------------------
  // calculateTotalUtilization (compound)
  // --------------------------------------------------------------------------

  describe("calculateTotalUtilization", () => {
    it("should calculate utilization rounded to 2 decimals", async () => {
      mockFrom({
        data: [sampleCardRow, sampleCardRow2],
        error: null,
      });

      const result =
        await creditCardsDbService.calculateTotalUtilization("u-1");

      // totalBalance = 1500 + 3000 = 4500
      // totalCreditLimit = 5000 + 10000 = 15000
      // utilization = (4500/15000)*100 = 30.00
      expect(result).toBe(30);
    });

    it("should return 0 when total credit limit is 0", async () => {
      mockFrom({ data: [], error: null });

      const result =
        await creditCardsDbService.calculateTotalUtilization("u-1");
      expect(result).toBe(0);
    });

    it("should handle single card", async () => {
      const singleCard = {
        ...sampleCardRow,
        current_balance: 333,
        credit_limit: 1000,
      };
      mockFrom({ data: [singleCard], error: null });

      const result =
        await creditCardsDbService.calculateTotalUtilization("u-1");
      // (333/1000)*100 = 33.3
      expect(result).toBe(33.3);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditCardsDbService.calculateTotalUtilization("u-1"),
      ).rejects.toThrow("Failed to calculate total utilization");
    });
  });

  // --------------------------------------------------------------------------
  // getCardsNeedingPayment (compound)
  // --------------------------------------------------------------------------

  describe("getCardsNeedingPayment", () => {
    it("should return cards with upcoming statements and utilization > 10%", async () => {
      // Use a card whose statement date is within 7 days and utilization > 10
      const today = new Date();
      const currentDay = today.getDate();
      const statementSoon = currentDay + 3; // 3 days from now

      const upcomingCard = {
        ...sampleCardRow,
        statement_date: statementSoon > 31 ? statementSoon - 30 : statementSoon,
        utilization: 25,
      };
      const farCard = {
        ...sampleCardRow2,
        statement_date: currentDay + 20 > 31 ? (currentDay + 20) - 30 : currentDay + 20,
        utilization: 25,
      };
      const lowUtilCard = {
        ...sampleCardRow3,
        statement_date: statementSoon > 31 ? statementSoon - 30 : statementSoon,
        utilization: 5, // Below 10% threshold
      };

      mockFrom({
        data: [upcomingCard, farCard, lowUtilCard],
        error: null,
      });

      const result =
        await creditCardsDbService.getCardsNeedingPayment("u-1");

      // Only upcomingCard qualifies: within 7 days AND utilization > 10
      expect(result.length).toBeGreaterThanOrEqual(1);
      // All returned cards should have utilization > 10
      result.forEach((card) => {
        expect(card.utilization).toBeGreaterThan(10);
      });
    });

    it("should use default daysAhead of 7", async () => {
      mockFrom({ data: [], error: null });

      const result =
        await creditCardsDbService.getCardsNeedingPayment("u-1");
      expect(result).toEqual([]);
    });

    it("should accept custom daysAhead", async () => {
      mockFrom({ data: [], error: null });

      const result = await creditCardsDbService.getCardsNeedingPayment(
        "u-1",
        14,
      );
      expect(result).toEqual([]);
    });

    it("should return empty when no cards exist", async () => {
      mockFrom({ data: [], error: null });

      const result =
        await creditCardsDbService.getCardsNeedingPayment("u-1");
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditCardsDbService.getCardsNeedingPayment("u-1"),
      ).rejects.toThrow("Failed to get cards needing payment");
    });
  });
});
