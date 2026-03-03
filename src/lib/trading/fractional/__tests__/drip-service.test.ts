/**
 * DripService — Comprehensive Test Suite
 *
 * Tests DRIP enrollment, unenrollment, dividend processing,
 * reinvestment history, and edge cases. FractionalOrderService is mocked.
 */

import {
  DripService,
  DripError,
  createDripService,
} from "../drip-service";
import type { DividendEvent, DripEnrollmentParams } from "../drip-service";
import type { FractionalOrderService, FractionalOrderResult } from "../fractional-order-service";

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockFractionalService(
  overrides: Partial<FractionalOrderService> = {},
): FractionalOrderService {
  return {
    placeDollarOrder: jest.fn().mockResolvedValue({
      success: true,
      sharesOrdered: 0.5,
      estimatedCost: 75,
    } satisfies FractionalOrderResult),
    placeShareOrder: jest.fn(),
    splitIntoLots: jest.fn(),
    calculateShareQuantity: jest.fn(),
    validateFractionalOrder: jest.fn(),
    ...overrides,
  } as unknown as FractionalOrderService;
}

function defaultEnrollmentParams(
  overrides: Partial<DripEnrollmentParams> = {},
): DripEnrollmentParams {
  return {
    userId: "user-1",
    symbol: "AAPL",
    enabled: true,
    ...overrides,
  };
}

function defaultDividendEvent(
  overrides: Partial<DividendEvent> = {},
): DividendEvent {
  return {
    symbol: "AAPL",
    userId: "user-1",
    amount: 25.5,
    exDate: new Date("2026-03-01"),
    payDate: new Date("2026-03-15"),
    sharesHeld: 10,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("DripService", () => {
  let service: DripService;
  let mockFractional: FractionalOrderService;

  beforeEach(() => {
    mockFractional = createMockFractionalService();
    service = new DripService(mockFractional);
  });

  // ==========================================================================
  // FACTORY
  // ==========================================================================

  describe("createDripService", () => {
    it("creates a DripService instance", () => {
      const svc = createDripService(mockFractional);
      expect(svc).toBeInstanceOf(DripService);
    });
  });

  // ==========================================================================
  // enrollDrip
  // ==========================================================================

  describe("enrollDrip", () => {
    it("creates a new enrollment", () => {
      const enrollment = service.enrollDrip(defaultEnrollmentParams());

      expect(enrollment.id).toMatch(/^DRIP-/);
      expect(enrollment.userId).toBe("user-1");
      expect(enrollment.symbol).toBe("AAPL");
      expect(enrollment.enabled).toBe(true);
      expect(enrollment.totalReinvested).toBe(0);
      expect(enrollment.totalSharesAcquired).toBe(0);
      expect(enrollment.createdAt).toBeInstanceOf(Date);
    });

    it("normalizes symbol to uppercase", () => {
      const enrollment = service.enrollDrip(
        defaultEnrollmentParams({ symbol: "aapl" }),
      );

      expect(enrollment.symbol).toBe("AAPL");
    });

    it("updates existing enrollment for same user+symbol", () => {
      const first = service.enrollDrip(
        defaultEnrollmentParams({ enabled: true }),
      );
      const second = service.enrollDrip(
        defaultEnrollmentParams({ enabled: false }),
      );

      expect(second.id).toBe(first.id);
      expect(second.enabled).toBe(false);
    });

    it("stores broker preference", () => {
      const enrollment = service.enrollDrip(
        defaultEnrollmentParams({
          brokerPreference: { preferredBroker: "alpaca" },
        }),
      );

      expect(enrollment.brokerPreference).toEqual({ preferredBroker: "alpaca" });
    });

    it("throws for empty userId", () => {
      expect(() =>
        service.enrollDrip(defaultEnrollmentParams({ userId: "" })),
      ).toThrow(DripError);
      expect(() =>
        service.enrollDrip(defaultEnrollmentParams({ userId: "" })),
      ).toThrow("User ID is required");
    });

    it("throws for empty symbol", () => {
      expect(() =>
        service.enrollDrip(defaultEnrollmentParams({ symbol: "" })),
      ).toThrow("Symbol is required");
    });

    it("throws for whitespace-only userId", () => {
      expect(() =>
        service.enrollDrip(defaultEnrollmentParams({ userId: "   " })),
      ).toThrow(DripError);
    });

    it("throws for whitespace-only symbol", () => {
      expect(() =>
        service.enrollDrip(defaultEnrollmentParams({ symbol: "   " })),
      ).toThrow(DripError);
    });

    it("allows multiple symbols per user", () => {
      service.enrollDrip(defaultEnrollmentParams({ symbol: "AAPL" }));
      service.enrollDrip(defaultEnrollmentParams({ symbol: "MSFT" }));

      const enrollments = service.getEnrollments("user-1");
      expect(enrollments).toHaveLength(2);
    });

    it("allows same symbol for different users", () => {
      service.enrollDrip(defaultEnrollmentParams({ userId: "user-1", symbol: "AAPL" }));
      service.enrollDrip(defaultEnrollmentParams({ userId: "user-2", symbol: "AAPL" }));

      expect(service.getEnrollments("user-1")).toHaveLength(1);
      expect(service.getEnrollments("user-2")).toHaveLength(1);
    });
  });

  // ==========================================================================
  // unenrollDrip
  // ==========================================================================

  describe("unenrollDrip", () => {
    it("removes an enrollment", () => {
      const enrollment = service.enrollDrip(defaultEnrollmentParams());
      service.unenrollDrip(enrollment.id);

      const enrollments = service.getEnrollments("user-1");
      expect(enrollments).toHaveLength(0);
    });

    it("throws for non-existent enrollment", () => {
      expect(() => service.unenrollDrip("bad-id")).toThrow(
        'Enrollment "bad-id" not found',
      );
    });

    it("throws DripError specifically", () => {
      expect(() => service.unenrollDrip("bad-id")).toThrow(DripError);
    });
  });

  // ==========================================================================
  // getEnrollments
  // ==========================================================================

  describe("getEnrollments", () => {
    it("returns all enrollments for a user", () => {
      service.enrollDrip(defaultEnrollmentParams({ symbol: "AAPL" }));
      service.enrollDrip(defaultEnrollmentParams({ symbol: "MSFT" }));
      service.enrollDrip(
        defaultEnrollmentParams({ userId: "user-2", symbol: "GOOGL" }),
      );

      const enrollments = service.getEnrollments("user-1");
      expect(enrollments).toHaveLength(2);
    });

    it("returns empty array for unknown user", () => {
      expect(service.getEnrollments("nobody")).toEqual([]);
    });

    it("returns copies, not references", () => {
      service.enrollDrip(defaultEnrollmentParams());
      const [enrollment] = service.getEnrollments("user-1");
      enrollment.enabled = false;

      const [fresh] = service.getEnrollments("user-1");
      expect(fresh.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // getEnrollment
  // ==========================================================================

  describe("getEnrollment", () => {
    it("returns an enrollment by ID", () => {
      const created = service.enrollDrip(defaultEnrollmentParams());
      const found = service.getEnrollment(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it("returns undefined for non-existent ID", () => {
      expect(service.getEnrollment("nonexistent")).toBeUndefined();
    });
  });

  // ==========================================================================
  // processDividend
  // ==========================================================================

  describe("processDividend", () => {
    it("reinvests dividend for enrolled position", async () => {
      service.enrollDrip(defaultEnrollmentParams());

      const reinvestment = await service.processDividend(defaultDividendEvent());

      expect(reinvestment).not.toBeNull();
      expect(reinvestment?.success).toBe(true);
      expect(reinvestment?.dividendAmount).toBe(25.5);
      expect(reinvestment?.sharesAcquired).toBe(0.5);
      expect(reinvestment?.pricePerShare).toBe(150); // 75 / 0.5
      expect(reinvestment?.enrollmentId).toBeDefined();
    });

    it("calls placeDollarOrder with correct params", async () => {
      service.enrollDrip(
        defaultEnrollmentParams({
          brokerPreference: { preferredBroker: "drivewealth" },
        }),
      );

      await service.processDividend(defaultDividendEvent({ amount: 50 }));

      expect(mockFractional.placeDollarOrder).toHaveBeenCalledWith({
        symbol: "AAPL",
        dollarAmount: 50,
        side: "buy",
        brokerPreference: { preferredBroker: "drivewealth" },
        userId: "user-1",
      });
    });

    it("updates enrollment totals on success", async () => {
      const enrollment = service.enrollDrip(defaultEnrollmentParams());
      await service.processDividend(defaultDividendEvent({ amount: 25.5 }));

      const updated = service.getEnrollment(enrollment.id);
      expect(updated?.totalReinvested).toBe(25.5);
      expect(updated?.totalSharesAcquired).toBe(0.5);
      expect(updated?.lastReinvestedAt).toBeInstanceOf(Date);
    });

    it("accumulates totals across multiple dividends", async () => {
      const enrollment = service.enrollDrip(defaultEnrollmentParams());

      await service.processDividend(defaultDividendEvent({ amount: 25 }));
      await service.processDividend(defaultDividendEvent({ amount: 30 }));

      const updated = service.getEnrollment(enrollment.id);
      expect(updated?.totalReinvested).toBe(55);
      expect(updated?.totalSharesAcquired).toBe(1);
    });

    it("returns null when user is not enrolled", async () => {
      const result = await service.processDividend(defaultDividendEvent());

      expect(result).toBeNull();
      expect(mockFractional.placeDollarOrder).not.toHaveBeenCalled();
    });

    it("returns null when enrollment is disabled", async () => {
      service.enrollDrip(defaultEnrollmentParams({ enabled: false }));

      const result = await service.processDividend(defaultDividendEvent());

      expect(result).toBeNull();
    });

    it("records failure when order fails", async () => {
      (mockFractional.placeDollarOrder as jest.Mock).mockResolvedValue({
        success: false,
        error: "Market closed",
      } satisfies FractionalOrderResult);

      const enrollment = service.enrollDrip(defaultEnrollmentParams());
      const reinvestment = await service.processDividend(defaultDividendEvent());

      expect(reinvestment?.success).toBe(false);
      expect(reinvestment?.error).toBe("Market closed");
      expect(reinvestment?.sharesAcquired).toBe(0);

      // Enrollment totals should NOT be updated on failure
      const updated = service.getEnrollment(enrollment.id);
      expect(updated?.totalReinvested).toBe(0);
      expect(updated?.totalSharesAcquired).toBe(0);
    });

    it("throws for zero dividend amount", async () => {
      service.enrollDrip(defaultEnrollmentParams());

      await expect(
        service.processDividend(defaultDividendEvent({ amount: 0 })),
      ).rejects.toThrow("Dividend amount must be greater than 0");
    });

    it("throws for negative dividend amount", async () => {
      service.enrollDrip(defaultEnrollmentParams());

      await expect(
        service.processDividend(defaultDividendEvent({ amount: -10 })),
      ).rejects.toThrow(DripError);
    });

    it("throws for zero shares held", async () => {
      service.enrollDrip(defaultEnrollmentParams());

      await expect(
        service.processDividend(defaultDividendEvent({ sharesHeld: 0 })),
      ).rejects.toThrow("Shares held must be greater than 0");
    });

    it("matches enrollment case-insensitively on symbol", async () => {
      service.enrollDrip(defaultEnrollmentParams({ symbol: "aapl" }));

      const result = await service.processDividend(
        defaultDividendEvent({ symbol: "AAPL" }),
      );

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });
  });

  // ==========================================================================
  // getDripHistory
  // ==========================================================================

  describe("getDripHistory", () => {
    it("returns reinvestment history for a user", async () => {
      service.enrollDrip(defaultEnrollmentParams());

      await service.processDividend(defaultDividendEvent({ amount: 25 }));
      await service.processDividend(defaultDividendEvent({ amount: 30 }));

      const history = service.getDripHistory("user-1");
      expect(history).toHaveLength(2);
      expect(history[0].dividendAmount).toBe(25);
      expect(history[1].dividendAmount).toBe(30);
    });

    it("filters by symbol", async () => {
      service.enrollDrip(defaultEnrollmentParams({ symbol: "AAPL" }));
      service.enrollDrip(defaultEnrollmentParams({ symbol: "MSFT" }));

      await service.processDividend(
        defaultDividendEvent({ symbol: "AAPL", amount: 10 }),
      );
      await service.processDividend(
        defaultDividendEvent({ symbol: "MSFT", amount: 20 }),
      );

      const aaplHistory = service.getDripHistory("user-1", "AAPL");
      expect(aaplHistory).toHaveLength(1);
      expect(aaplHistory[0].dividendAmount).toBe(10);

      const msftHistory = service.getDripHistory("user-1", "MSFT");
      expect(msftHistory).toHaveLength(1);
      expect(msftHistory[0].dividendAmount).toBe(20);
    });

    it("returns empty array for user with no history", () => {
      expect(service.getDripHistory("nobody")).toEqual([]);
    });

    it("returns empty array for user with enrollments but no dividends", () => {
      service.enrollDrip(defaultEnrollmentParams());
      expect(service.getDripHistory("user-1")).toEqual([]);
    });

    it("returns copies, not references", async () => {
      service.enrollDrip(defaultEnrollmentParams());
      await service.processDividend(defaultDividendEvent());

      const [reinvestment] = service.getDripHistory("user-1");
      reinvestment.dividendAmount = 999;

      const [fresh] = service.getDripHistory("user-1");
      expect(fresh.dividendAmount).toBe(25.5);
    });

    it("includes failed reinvestments in history", async () => {
      (mockFractional.placeDollarOrder as jest.Mock).mockResolvedValue({
        success: false,
        error: "Failed",
      } satisfies FractionalOrderResult);

      service.enrollDrip(defaultEnrollmentParams());
      await service.processDividend(defaultDividendEvent());

      const history = service.getDripHistory("user-1");
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    it("handles enrollment, unenrollment, and re-enrollment", () => {
      const enrollment = service.enrollDrip(defaultEnrollmentParams());
      service.unenrollDrip(enrollment.id);

      // Re-enroll should create a new enrollment
      const reEnrollment = service.enrollDrip(defaultEnrollmentParams());
      expect(reEnrollment.id).not.toBe(enrollment.id);
    });

    it("handles concurrent dividends for different symbols", async () => {
      service.enrollDrip(defaultEnrollmentParams({ symbol: "AAPL" }));
      service.enrollDrip(defaultEnrollmentParams({ symbol: "MSFT" }));

      const [aaplResult, msftResult] = await Promise.all([
        service.processDividend(
          defaultDividendEvent({ symbol: "AAPL", amount: 10 }),
        ),
        service.processDividend(
          defaultDividendEvent({ symbol: "MSFT", amount: 20 }),
        ),
      ]);

      expect(aaplResult?.success).toBe(true);
      expect(msftResult?.success).toBe(true);
    });

    it("reinvestment has correct ID format", async () => {
      service.enrollDrip(defaultEnrollmentParams());
      const reinvestment = await service.processDividend(defaultDividendEvent());

      expect(reinvestment?.id).toMatch(/^REINV-/);
    });

    it("reinvestment pricePerShare is 0 when no shares acquired", async () => {
      (mockFractional.placeDollarOrder as jest.Mock).mockResolvedValue({
        success: true,
        sharesOrdered: 0,
        estimatedCost: 0,
      } satisfies FractionalOrderResult);

      service.enrollDrip(defaultEnrollmentParams());
      const reinvestment = await service.processDividend(defaultDividendEvent());

      expect(reinvestment?.pricePerShare).toBe(0);
    });
  });
});
