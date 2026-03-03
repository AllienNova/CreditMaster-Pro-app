/**
 * AutoInvestScheduler — Comprehensive Test Suite
 *
 * Tests schedule creation, updates, cancellation, frequency calculation,
 * and automated execution of recurring investment plans.
 * FractionalOrderService is mocked.
 */

import {
  AutoInvestScheduler,
  AutoInvestError,
  createAutoInvestScheduler,
} from "../auto-invest-scheduler";
import type {
  AutoInvestScheduleParams,
  PortfolioAllocation,
} from "../auto-invest-scheduler";
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
      sharesOrdered: 1,
      estimatedCost: 100,
    } satisfies FractionalOrderResult),
    placeShareOrder: jest.fn(),
    splitIntoLots: jest.fn(),
    calculateShareQuantity: jest.fn(),
    validateFractionalOrder: jest.fn(),
    ...overrides,
  } as unknown as FractionalOrderService;
}

function defaultAllocations(): PortfolioAllocation[] {
  return [
    { symbol: "AAPL", percentage: 50 },
    { symbol: "MSFT", percentage: 30 },
    { symbol: "GOOGL", percentage: 20 },
  ];
}

function defaultParams(overrides: Partial<AutoInvestScheduleParams> = {}): AutoInvestScheduleParams {
  return {
    userId: "user-1",
    allocations: defaultAllocations(),
    totalAmount: 500,
    frequency: "weekly",
    startDate: new Date("2026-03-01T10:00:00Z"),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("AutoInvestScheduler", () => {
  let scheduler: AutoInvestScheduler;
  let mockService: FractionalOrderService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-01T09:00:00Z"));
    mockService = createMockFractionalService();
    scheduler = new AutoInvestScheduler(mockService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // FACTORY
  // ==========================================================================

  describe("createAutoInvestScheduler", () => {
    it("creates a scheduler instance", () => {
      const s = createAutoInvestScheduler(mockService);
      expect(s).toBeInstanceOf(AutoInvestScheduler);
    });
  });

  // ==========================================================================
  // createSchedule
  // ==========================================================================

  describe("createSchedule", () => {
    it("creates a schedule with valid params", () => {
      const schedule = scheduler.createSchedule(defaultParams());

      expect(schedule.id).toMatch(/^SCHED-/);
      expect(schedule.userId).toBe("user-1");
      expect(schedule.totalAmount).toBe(500);
      expect(schedule.frequency).toBe("weekly");
      expect(schedule.status).toBe("active");
      expect(schedule.executionCount).toBe(0);
      expect(schedule.allocations).toHaveLength(3);
    });

    it("sets nextExecution to startDate", () => {
      const startDate = new Date("2026-04-01T12:00:00Z");
      const schedule = scheduler.createSchedule(defaultParams({ startDate }));

      expect(schedule.nextExecution.getTime()).toBe(startDate.getTime());
    });

    it("throws for empty userId", () => {
      expect(() =>
        scheduler.createSchedule(defaultParams({ userId: "" })),
      ).toThrow(AutoInvestError);
    });

    it("throws for zero totalAmount", () => {
      expect(() =>
        scheduler.createSchedule(defaultParams({ totalAmount: 0 })),
      ).toThrow("Total amount must be greater than 0");
    });

    it("throws for negative totalAmount", () => {
      expect(() =>
        scheduler.createSchedule(defaultParams({ totalAmount: -100 })),
      ).toThrow(AutoInvestError);
    });

    it("throws for empty allocations", () => {
      expect(() =>
        scheduler.createSchedule(defaultParams({ allocations: [] })),
      ).toThrow("At least one allocation is required");
    });

    it("throws when allocations do not sum to 100%", () => {
      expect(() =>
        scheduler.createSchedule(
          defaultParams({
            allocations: [
              { symbol: "AAPL", percentage: 50 },
              { symbol: "MSFT", percentage: 30 },
            ],
          }),
        ),
      ).toThrow("must sum to 100%");
    });

    it("throws for allocation with empty symbol", () => {
      expect(() =>
        scheduler.createSchedule(
          defaultParams({
            allocations: [{ symbol: "", percentage: 100 }],
          }),
        ),
      ).toThrow("must have a symbol");
    });

    it("throws for allocation with zero percentage", () => {
      expect(() =>
        scheduler.createSchedule(
          defaultParams({
            allocations: [
              { symbol: "AAPL", percentage: 0 },
              { symbol: "MSFT", percentage: 100 },
            ],
          }),
        ),
      ).toThrow("must be greater than 0");
    });

    it("throws for allocation with percentage over 100", () => {
      expect(() =>
        scheduler.createSchedule(
          defaultParams({
            allocations: [{ symbol: "AAPL", percentage: 150 }],
          }),
        ),
      ).toThrow("sum to 100%");
    });

    it("throws for duplicate symbols in allocations", () => {
      expect(() =>
        scheduler.createSchedule(
          defaultParams({
            allocations: [
              { symbol: "AAPL", percentage: 50 },
              { symbol: "AAPL", percentage: 50 },
            ],
          }),
        ),
      ).toThrow("Duplicate symbols");
    });

    it("throws for invalid start date", () => {
      expect(() =>
        scheduler.createSchedule(
          defaultParams({ startDate: new Date("invalid") }),
        ),
      ).toThrow("Valid start date is required");
    });

    it("supports all frequency types", () => {
      const frequencies = ["daily", "weekly", "biweekly", "monthly"] as const;
      for (const frequency of frequencies) {
        const schedule = scheduler.createSchedule(defaultParams({ frequency }));
        expect(schedule.frequency).toBe(frequency);
      }
    });
  });

  // ==========================================================================
  // updateSchedule
  // ==========================================================================

  describe("updateSchedule", () => {
    it("updates totalAmount", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      const updated = scheduler.updateSchedule(schedule.id, { totalAmount: 1000 });

      expect(updated.totalAmount).toBe(1000);
    });

    it("updates allocations", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      const newAllocations = [{ symbol: "VTI", percentage: 100 }];
      const updated = scheduler.updateSchedule(schedule.id, {
        allocations: newAllocations,
      });

      expect(updated.allocations).toEqual(newAllocations);
    });

    it("updates frequency and recalculates nextExecution", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      const updated = scheduler.updateSchedule(schedule.id, { frequency: "daily" });

      expect(updated.frequency).toBe("daily");
    });

    it("updates status to paused", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      const updated = scheduler.updateSchedule(schedule.id, { status: "paused" });

      expect(updated.status).toBe("paused");
    });

    it("throws for non-existent schedule", () => {
      expect(() =>
        scheduler.updateSchedule("nonexistent-id", { totalAmount: 100 }),
      ).toThrow('Schedule "nonexistent-id" not found');
    });

    it("throws for canceled schedule", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      scheduler.cancelSchedule(schedule.id);

      expect(() =>
        scheduler.updateSchedule(schedule.id, { totalAmount: 100 }),
      ).toThrow("Cannot update canceled schedule");
    });

    it("throws for zero totalAmount update", () => {
      const schedule = scheduler.createSchedule(defaultParams());

      expect(() =>
        scheduler.updateSchedule(schedule.id, { totalAmount: 0 }),
      ).toThrow("Total amount must be greater than 0");
    });

    it("throws for invalid allocations update", () => {
      const schedule = scheduler.createSchedule(defaultParams());

      expect(() =>
        scheduler.updateSchedule(schedule.id, {
          allocations: [{ symbol: "AAPL", percentage: 50 }],
        }),
      ).toThrow("must sum to 100%");
    });
  });

  // ==========================================================================
  // cancelSchedule
  // ==========================================================================

  describe("cancelSchedule", () => {
    it("cancels an active schedule", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      scheduler.cancelSchedule(schedule.id);

      const found = scheduler.getSchedule(schedule.id);
      expect(found?.status).toBe("canceled");
    });

    it("throws for non-existent schedule", () => {
      expect(() => scheduler.cancelSchedule("bad-id")).toThrow(
        'Schedule "bad-id" not found',
      );
    });

    it("throws for already canceled schedule", () => {
      const schedule = scheduler.createSchedule(defaultParams());
      scheduler.cancelSchedule(schedule.id);

      expect(() => scheduler.cancelSchedule(schedule.id)).toThrow(
        "is already canceled",
      );
    });
  });

  // ==========================================================================
  // getSchedules
  // ==========================================================================

  describe("getSchedules", () => {
    it("returns all schedules for a user", () => {
      scheduler.createSchedule(defaultParams({ userId: "user-1" }));
      scheduler.createSchedule(defaultParams({ userId: "user-1" }));
      scheduler.createSchedule(defaultParams({ userId: "user-2" }));

      const results = scheduler.getSchedules("user-1");
      expect(results).toHaveLength(2);
    });

    it("filters by status", () => {
      const s1 = scheduler.createSchedule(defaultParams());
      scheduler.createSchedule(defaultParams());
      scheduler.cancelSchedule(s1.id);

      const active = scheduler.getSchedules("user-1", "active");
      expect(active).toHaveLength(1);

      const canceled = scheduler.getSchedules("user-1", "canceled");
      expect(canceled).toHaveLength(1);
    });

    it("returns empty array for unknown user", () => {
      const results = scheduler.getSchedules("unknown-user");
      expect(results).toEqual([]);
    });

    it("returns copies, not references", () => {
      scheduler.createSchedule(defaultParams());
      const [schedule] = scheduler.getSchedules("user-1");
      schedule.totalAmount = 999;

      const [fresh] = scheduler.getSchedules("user-1");
      expect(fresh.totalAmount).toBe(500);
    });
  });

  // ==========================================================================
  // getNextExecutionDate
  // ==========================================================================

  describe("getNextExecutionDate", () => {
    it("adds 1 day for daily frequency", () => {
      const base = new Date("2026-03-01T10:00:00Z");
      const next = scheduler.getNextExecutionDate({
        frequency: "daily",
        nextExecution: base,
        lastExecutedAt: base,
      });

      expect(next.toISOString()).toBe("2026-03-02T10:00:00.000Z");
    });

    it("adds 7 days for weekly frequency", () => {
      const base = new Date("2026-03-01T10:00:00Z");
      const next = scheduler.getNextExecutionDate({
        frequency: "weekly",
        nextExecution: base,
        lastExecutedAt: base,
      });

      const diffDays = (next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
      // Allow small tolerance for DST transitions
      expect(Math.round(diffDays)).toBe(7);
    });

    it("adds 14 days for biweekly frequency", () => {
      const base = new Date("2026-03-01T10:00:00Z");
      const next = scheduler.getNextExecutionDate({
        frequency: "biweekly",
        nextExecution: base,
        lastExecutedAt: base,
      });

      const diffDays = (next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(14);
    });

    it("adds 1 month for monthly frequency", () => {
      const base = new Date("2026-03-01T10:00:00Z");
      const next = scheduler.getNextExecutionDate({
        frequency: "monthly",
        nextExecution: base,
        lastExecutedAt: base,
      });

      // Should advance to next month
      expect(next.getMonth()).toBe(base.getMonth() + 1);
      expect(next.getDate()).toBe(base.getDate());
    });

    it("uses nextExecution when lastExecutedAt is undefined", () => {
      const nextExec = new Date("2026-03-01T10:00:00Z");
      const next = scheduler.getNextExecutionDate({
        frequency: "daily",
        nextExecution: nextExec,
      });

      const diffDays = (next.getTime() - nextExec.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(1);
    });

    it("uses lastExecutedAt when provided", () => {
      const lastExec = new Date("2026-03-05T10:00:00Z");
      const next = scheduler.getNextExecutionDate({
        frequency: "weekly",
        nextExecution: new Date("2026-03-01T10:00:00Z"),
        lastExecutedAt: lastExec,
      });

      const diffDays = (next.getTime() - lastExec.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(7);
    });
  });

  // ==========================================================================
  // executeScheduledOrders
  // ==========================================================================

  describe("executeScheduledOrders", () => {
    it("executes a due schedule", async () => {
      scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-01T08:00:00Z"),
        }),
      );

      const now = new Date("2026-03-01T10:00:00Z");
      const results = await scheduler.executeScheduledOrders(now);

      expect(results).toHaveLength(1);
      expect(results[0].successCount).toBe(3);
      expect(results[0].failureCount).toBe(0);
    });

    it("does not execute schedules that are not yet due", async () => {
      scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-15T10:00:00Z"),
        }),
      );

      const now = new Date("2026-03-01T10:00:00Z");
      const results = await scheduler.executeScheduledOrders(now);

      expect(results).toHaveLength(0);
    });

    it("does not execute paused schedules", async () => {
      const schedule = scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-01T08:00:00Z"),
        }),
      );
      scheduler.updateSchedule(schedule.id, { status: "paused" });

      const results = await scheduler.executeScheduledOrders(
        new Date("2026-03-01T10:00:00Z"),
      );

      expect(results).toHaveLength(0);
    });

    it("does not execute canceled schedules", async () => {
      const schedule = scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-01T08:00:00Z"),
        }),
      );
      scheduler.cancelSchedule(schedule.id);

      const results = await scheduler.executeScheduledOrders(
        new Date("2026-03-01T10:00:00Z"),
      );

      expect(results).toHaveLength(0);
    });

    it("places dollar orders for each allocation", async () => {
      scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-01T08:00:00Z"),
          totalAmount: 1000,
          allocations: [
            { symbol: "AAPL", percentage: 50 },
            { symbol: "MSFT", percentage: 50 },
          ],
        }),
      );

      await scheduler.executeScheduledOrders(new Date("2026-03-01T10:00:00Z"));

      expect(mockService.placeDollarOrder).toHaveBeenCalledTimes(2);

      const calls = (mockService.placeDollarOrder as jest.Mock).mock.calls;
      expect(calls[0][0].dollarAmount).toBe(500);
      expect(calls[0][0].symbol).toBe("AAPL");
      expect(calls[1][0].dollarAmount).toBe(500);
      expect(calls[1][0].symbol).toBe("MSFT");
    });

    it("advances nextExecution after execution", async () => {
      const schedule = scheduler.createSchedule(
        defaultParams({
          frequency: "weekly",
          startDate: new Date("2026-03-01T08:00:00Z"),
        }),
      );

      await scheduler.executeScheduledOrders(new Date("2026-03-01T10:00:00Z"));

      const updated = scheduler.getSchedule(schedule.id);
      expect(updated?.executionCount).toBe(1);
      expect(updated?.lastExecutedAt).toBeDefined();
      // Next execution should be ~7 days later
      expect(updated?.nextExecution.getTime()).toBeGreaterThan(
        new Date("2026-03-01T10:00:00Z").getTime(),
      );
    });

    it("reports failures for allocations below minimum", async () => {
      scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-01T08:00:00Z"),
          totalAmount: 1, // Only $1 total
          allocations: [
            { symbol: "AAPL", percentage: 50 },
            { symbol: "MSFT", percentage: 50 },
          ],
        }),
      );

      const results = await scheduler.executeScheduledOrders(
        new Date("2026-03-01T10:00:00Z"),
      );

      // Each allocation gets $0.50, which is below the $1 minimum
      expect(results[0].failureCount).toBe(2);
      expect(results[0].successCount).toBe(0);
    });

    it("handles mixed success and failure", async () => {
      (mockService.placeDollarOrder as jest.Mock)
        .mockResolvedValueOnce({ success: true, sharesOrdered: 1, estimatedCost: 250 })
        .mockResolvedValueOnce({ success: false, error: "Insufficient funds" });

      scheduler.createSchedule(
        defaultParams({
          startDate: new Date("2026-03-01T08:00:00Z"),
          totalAmount: 100,
          allocations: [
            { symbol: "AAPL", percentage: 50 },
            { symbol: "MSFT", percentage: 50 },
          ],
        }),
      );

      const results = await scheduler.executeScheduledOrders(
        new Date("2026-03-01T10:00:00Z"),
      );

      expect(results[0].successCount).toBe(1);
      expect(results[0].failureCount).toBe(1);
    });

    it("executes multiple due schedules", async () => {
      scheduler.createSchedule(
        defaultParams({
          userId: "user-1",
          startDate: new Date("2026-03-01T08:00:00Z"),
          allocations: [{ symbol: "AAPL", percentage: 100 }],
        }),
      );
      scheduler.createSchedule(
        defaultParams({
          userId: "user-2",
          startDate: new Date("2026-03-01T08:00:00Z"),
          allocations: [{ symbol: "MSFT", percentage: 100 }],
        }),
      );

      const results = await scheduler.executeScheduledOrders(
        new Date("2026-03-01T10:00:00Z"),
      );

      expect(results).toHaveLength(2);
    });
  });
});
