/**
 * Revenue Tracker Tests
 *
 * Tests for the affiliate revenue tracking system (AFF-02).
 * Updated for TASK-MNY-05: tracker now writes through to Supabase revenue_events table.
 */

// =============================================================================
// Mocks — must precede the import of the module under test
// =============================================================================

const mockCreateClient = jest.fn<ReturnType<typeof import("@supabase/supabase-js").createClient>, Parameters<typeof import("@supabase/supabase-js").createClient>>();

// A chainable query builder mock. Each method returns `mockBuilder` so the
// fluent Supabase API works: supabase.from(...).insert(...).select(...)
const mockBuilder: Record<string, jest.Mock> = {};
const builderMethods = [
  "select", "insert", "update", "delete", "eq", "neq", "gt", "gte", "lt",
  "lte", "in", "is", "ilike", "or", "order", "limit", "range", "single",
  "maybeSingle", "gte", "lte", "not", "filter", "match", "contains",
  "textSearch", "then",
];
for (const method of builderMethods) {
  mockBuilder[method] = jest.fn();
}
// By default every method returns the builder itself (chainable).
for (const method of builderMethods) {
  mockBuilder[method].mockReturnValue(mockBuilder);
}

const mockSupabase = {
  from: jest.fn(() => mockBuilder),
};

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args as Parameters<typeof import("@supabase/supabase-js").createClient>),
}));

// Configure mockCreateClient BEFORE import so module-level
// `const supabase = createClient(...)` captures mockSupabase.
mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>);

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { RevenueTracker } from "../revenue-tracker";
import type { RevenueEvent } from "../revenue-tracker";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a Supabase-row representation of a RevenueEvent for use in mock returns.
 * commission_amount_cents is stored as integer cents; the tracker converts back to dollars.
 */
function eventToRow(event: RevenueEvent): Record<string, unknown> {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    event_id: event.eventId,
    user_id: event.userId,
    product_id: event.productId,
    partner_id: event.partnerId,
    event_type: event.eventType,
    commission_amount_cents:
      event.commissionAmount !== undefined
        ? Math.round(event.commissionAmount * 100)
        : null,
    commission_currency: event.commissionCurrency ?? null,
    metadata: event.metadata ?? null,
    created_at: event.timestamp.toISOString(),
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createEvent(
  overrides: Partial<Omit<RevenueEvent, "eventId">> = {},
): Omit<RevenueEvent, "eventId"> {
  return {
    userId: "user_001",
    productId: "prod_001",
    partnerId: "partner_001",
    eventType: "click",
    timestamp: new Date("2026-03-01T12:00:00Z"),
    ...overrides,
  };
}

/** Raw events that seedTracker inserts — used to configure mock returns. */
const SEED_EVENTS: Array<Omit<RevenueEvent, "eventId">> = [
  // Partner 1, Product A — full funnel
  { userId: "user_001", productId: "prod_a", partnerId: "partner_1", eventType: "click",       timestamp: new Date("2026-03-01T10:00:00Z") },
  { userId: "user_001", productId: "prod_a", partnerId: "partner_1", eventType: "application", timestamp: new Date("2026-03-01T10:05:00Z") },
  { userId: "user_001", productId: "prod_a", partnerId: "partner_1", eventType: "approval",    timestamp: new Date("2026-03-01T10:10:00Z") },
  { userId: "user_001", productId: "prod_a", partnerId: "partner_1", eventType: "conversion",  commissionAmount: 50, commissionCurrency: "USD", timestamp: new Date("2026-03-01T10:15:00Z") },
  // Partner 1, Product B — click only
  { userId: "user_001", productId: "prod_b", partnerId: "partner_1", eventType: "click",       timestamp: new Date("2026-03-01T11:00:00Z") },
  // Partner 2, Product C — conversion
  { userId: "user_001", productId: "prod_c", partnerId: "partner_2", eventType: "click",       timestamp: new Date("2026-03-02T09:00:00Z") },
  { userId: "user_001", productId: "prod_c", partnerId: "partner_2", eventType: "conversion",  commissionAmount: 75, commissionCurrency: "USD", timestamp: new Date("2026-03-02T09:30:00Z") },
  // Partner 2, Product D — larger conversion
  { userId: "user_001", productId: "prod_d", partnerId: "partner_2", eventType: "click",       timestamp: new Date("2026-03-03T08:00:00Z") },
  { userId: "user_001", productId: "prod_d", partnerId: "partner_2", eventType: "application", timestamp: new Date("2026-03-03T08:10:00Z") },
  { userId: "user_001", productId: "prod_d", partnerId: "partner_2", eventType: "approval",    timestamp: new Date("2026-03-03T08:20:00Z") },
  { userId: "user_001", productId: "prod_d", partnerId: "partner_2", eventType: "conversion",  commissionAmount: 120, commissionCurrency: "USD", timestamp: new Date("2026-03-03T08:30:00Z") },
];

/**
 * Configure supabase mock to return `rows` for the next `.select()` terminal call,
 * then insert all seed events into the tracker.
 */
async function seedTracker(tracker: RevenueTracker, rows: ReturnType<typeof eventToRow>[]): Promise<void> {
  // The `.select()` call at the end of the insert chain returns the inserted row.
  // We configure it once; individual trackEvent calls will each resolve to the first row
  // in their respective chain (not inspected in seeding tests, only counts matter).
  for (const event of SEED_EVENTS) {
    // Mock the insert→select chain to succeed (returns a single row; the exact row
    // content isn't used by trackEvent — it just checks for errors).
    const fakeRow = { ...eventToRow({ ...event, eventId: `rev_mock` }) };
    mockBuilder.select.mockResolvedValueOnce({ data: [fakeRow], error: null });
    await tracker.trackEvent(event);
  }

  // Configure getReport / getTopProducts / getTopPartners / getConversionFunnel
  // to see all rows when called after seeding.
  mockBuilder.select.mockResolvedValue({ data: rows, error: null });
}

// =============================================================================
// Tests
// =============================================================================

describe("RevenueTracker", () => {
  let tracker: RevenueTracker;

  beforeEach(() => {
    tracker = new RevenueTracker();
    jest.clearAllMocks();
    // resetMocks:true wipes mockCreateClient's return value — re-apply so the
    // lazy getSupabase() inside revenue-tracker returns mockSupabase.
    mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>);
    // Re-establish chainable defaults after clearAllMocks.
    for (const method of builderMethods) {
      mockBuilder[method].mockReturnValue(mockBuilder);
    }
    // Default terminal resolution — callers override per-test as needed.
    mockBuilder.select.mockResolvedValue({ data: [], error: null });
    mockSupabase.from.mockReturnValue(mockBuilder);
  });

  // ---------------------------------------------------------------------------
  // Cold-start survival (FND-025 regression)
  // ---------------------------------------------------------------------------

  describe("cold-start survival", () => {
    it("should persist a recorded event so a fresh tracker instance reads it back", async () => {
      // Arrange: tracker A records an event.
      const insertedRow = eventToRow({
        eventId: "rev_coldstart",
        userId: "user_cold",
        productId: "prod_cold",
        partnerId: "partner_cold",
        eventType: "conversion",
        commissionAmount: 99,
        commissionCurrency: "USD",
        timestamp: new Date("2026-04-01T00:00:00Z"),
      });
      mockBuilder.select.mockResolvedValueOnce({ data: [insertedRow], error: null });

      const trackerA = new RevenueTracker();
      await trackerA.trackEvent({
        userId: "user_cold",
        productId: "prod_cold",
        partnerId: "partner_cold",
        eventType: "conversion",
        commissionAmount: 99,
        commissionCurrency: "USD",
        timestamp: new Date("2026-04-01T00:00:00Z"),
      });

      // Act: a FRESH tracker (simulates cold start) reads the event back.
      const trackerB = new RevenueTracker();
      mockBuilder.select.mockResolvedValueOnce({ data: [insertedRow], error: null });
      const report = await trackerB.getReport();

      // Assert: the cold-start tracker sees the persisted event.
      expect(report.totalRevenue).toBe(99);
      expect(report.totalConversions).toBe(1);
    });

    it("should persist events so getTopProducts on a fresh tracker reflects them", async () => {
      const row = eventToRow({
        eventId: "rev_tp",
        userId: "user_001",
        productId: "prod_persist",
        partnerId: "partner_001",
        eventType: "conversion",
        commissionAmount: 42,
        commissionCurrency: "USD",
        timestamp: new Date("2026-04-01T00:00:00Z"),
      });

      mockBuilder.select.mockResolvedValueOnce({ data: [row], error: null });
      const trackerA = new RevenueTracker();
      await trackerA.trackEvent({
        userId: "user_001",
        productId: "prod_persist",
        partnerId: "partner_001",
        eventType: "conversion",
        commissionAmount: 42,
        commissionCurrency: "USD",
        timestamp: new Date("2026-04-01T00:00:00Z"),
      });

      // Fresh tracker reads back.
      const trackerB = new RevenueTracker();
      mockBuilder.select.mockResolvedValueOnce({ data: [row], error: null });
      const top = await trackerB.getTopProducts(1);

      expect(top.length).toBe(1);
      expect(top[0].productId).toBe("prod_persist");
      expect(top[0].revenue).toBe(42);
    });
  });

  // ---------------------------------------------------------------------------
  // trackEvent
  // ---------------------------------------------------------------------------

  describe("trackEvent", () => {
    it("should track a click event and return it with an eventId", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      const event = await tracker.trackEvent(createEvent({ eventType: "click" }));

      expect(event.eventId).toBeDefined();
      expect(event.eventId).toMatch(/^rev_/);
      expect(event.eventType).toBe("click");
      expect(event.userId).toBe("user_001");
    });

    it("should track an application event", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      const event = await tracker.trackEvent(
        createEvent({ eventType: "application" }),
      );

      expect(event.eventType).toBe("application");
    });

    it("should track an approval event", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      const event = await tracker.trackEvent(createEvent({ eventType: "approval" }));

      expect(event.eventType).toBe("approval");
    });

    it("should track a conversion event with commission", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      const event = await tracker.trackEvent(
        createEvent({
          eventType: "conversion",
          commissionAmount: 75.5,
          commissionCurrency: "USD",
        }),
      );

      expect(event.eventType).toBe("conversion");
      // The returned event carries the original dollar value.
      expect(event.commissionAmount).toBe(75.5);
      expect(event.commissionCurrency).toBe("USD");
    });

    it("should generate unique event IDs", async () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
        const event = await tracker.trackEvent(createEvent());
        ids.add(event.eventId);
      }

      expect(ids.size).toBe(100);
    });

    it("should preserve metadata", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      const event = await tracker.trackEvent(
        createEvent({
          metadata: { source: "email", campaign: "spring_promo" },
        }),
      );

      expect(event.metadata).toEqual({
        source: "email",
        campaign: "spring_promo",
      });
    });

    it("should write commission_amount_cents as integer cents to Supabase", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      await tracker.trackEvent(
        createEvent({ eventType: "conversion", commissionAmount: 12.34, commissionCurrency: "USD" }),
      );

      // Verify the insert was called with cents, not dollars.
      const insertCall = mockBuilder.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertCall.commission_amount_cents).toBe(1234); // $12.34 → 1234 cents
    });

    it("should throw when the Supabase insert returns an error", async () => {
      mockBuilder.select.mockResolvedValueOnce({
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      });

      await expect(tracker.trackEvent(createEvent())).rejects.toThrow(
        "revenue_events insert failed: duplicate key value violates unique constraint",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getReport
  // ---------------------------------------------------------------------------

  describe("getReport", () => {
    function makeSeedRows(): ReturnType<typeof eventToRow>[] {
      return SEED_EVENTS.map((e, i) =>
        eventToRow({ ...e, eventId: `rev_seed_${i}` }),
      );
    }

    it("should generate a report with correct totals", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const report = await tracker.getReport();

      // 4 clicks total (prod_a, prod_b, prod_c, prod_d)
      expect(report.totalClicks).toBe(4);
      // 3 conversions (prod_a, prod_c, prod_d)
      expect(report.totalConversions).toBe(3);
      // Total revenue: 50 + 75 + 120 = 245
      expect(report.totalRevenue).toBe(245);
    });

    it("should calculate conversion rate correctly", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const report = await tracker.getReport();

      // 3 conversions / 4 clicks = 0.75
      expect(report.conversionRate).toBe(0.75);
    });

    it("should calculate average commission correctly", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const report = await tracker.getReport();

      // (50 + 75 + 120) / 3 commission events = 81.67
      expect(report.averageCommission).toBeCloseTo(81.67, 1);
    });

    it("should break down by partner", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const report = await tracker.getReport();

      const p1 = report.byPartner.get("partner_1");
      expect(p1).toBeDefined();
      expect(p1!.clicks).toBe(2); // prod_a click + prod_b click
      expect(p1!.conversions).toBe(1); // prod_a conversion
      expect(p1!.revenue).toBe(50);

      const p2 = report.byPartner.get("partner_2");
      expect(p2).toBeDefined();
      expect(p2!.clicks).toBe(2); // prod_c click + prod_d click
      expect(p2!.conversions).toBe(2); // prod_c + prod_d conversions
      expect(p2!.revenue).toBe(195); // 75 + 120
    });

    it("should break down by product", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const report = await tracker.getReport();

      const prodA = report.byProduct.get("prod_a");
      expect(prodA).toBeDefined();
      expect(prodA!.clicks).toBe(1);
      expect(prodA!.conversions).toBe(1);
      expect(prodA!.revenue).toBe(50);

      const prodB = report.byProduct.get("prod_b");
      expect(prodB).toBeDefined();
      expect(prodB!.clicks).toBe(1);
      expect(prodB!.conversions).toBe(0);
      expect(prodB!.revenue).toBe(0);
    });

    it("should filter by date period", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);

      // Return only March 1 events (prod_a 4 events + prod_b 1 event).
      const march1Rows = rows.filter((r) => {
        const t = new Date(r.created_at as string).getTime();
        return (
          t >= new Date("2026-03-01T00:00:00Z").getTime() &&
          t <= new Date("2026-03-01T23:59:59Z").getTime()
        );
      });
      // fetchRows with a period chains: select("*").gte(...).lte(...)
      // select must stay chainable; lte is the terminal resolver.
      mockBuilder.select.mockReturnValueOnce(mockBuilder);
      mockBuilder.lte.mockResolvedValueOnce({ data: march1Rows, error: null });

      const report = await tracker.getReport({
        start: new Date("2026-03-01T00:00:00Z"),
        end: new Date("2026-03-01T23:59:59Z"),
      });

      // Only events on March 1: prod_a (4 events) + prod_b (1 event)
      expect(report.totalClicks).toBe(2); // prod_a click + prod_b click
      expect(report.totalConversions).toBe(1); // prod_a conversion
      expect(report.totalRevenue).toBe(50);
    });

    it("should return zeroes for empty tracker", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });

      const report = await tracker.getReport();

      expect(report.totalRevenue).toBe(0);
      expect(report.totalClicks).toBe(0);
      expect(report.totalConversions).toBe(0);
      expect(report.conversionRate).toBe(0);
      expect(report.averageCommission).toBe(0);
      expect(report.byPartner.size).toBe(0);
      expect(report.byProduct.size).toBe(0);
    });

    it("should include period in report", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const report = await tracker.getReport();

      expect(report.period.start).toBeInstanceOf(Date);
      expect(report.period.end).toBeInstanceOf(Date);
      expect(report.period.end.getTime()).toBeGreaterThanOrEqual(
        report.period.start.getTime(),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getTopProducts
  // ---------------------------------------------------------------------------

  describe("getTopProducts", () => {
    function makeSeedRows(): ReturnType<typeof eventToRow>[] {
      return SEED_EVENTS.map((e, i) =>
        eventToRow({ ...e, eventId: `rev_seed_${i}` }),
      );
    }

    it("should return products sorted by revenue descending", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      // getTopProducts calls getReport which calls select.
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const top = await tracker.getTopProducts();

      expect(top.length).toBeGreaterThan(0);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].revenue).toBeGreaterThanOrEqual(top[i].revenue);
      }
    });

    it("should respect limit", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const top = await tracker.getTopProducts(2);

      expect(top.length).toBeLessThanOrEqual(2);
    });

    it("should return prod_d as top product (highest commission)", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const top = await tracker.getTopProducts(1);

      expect(top[0].productId).toBe("prod_d");
      expect(top[0].revenue).toBe(120);
      expect(top[0].conversions).toBe(1);
    });

    it("should return empty array for empty tracker", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });

      const top = await tracker.getTopProducts();

      expect(top).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getTopPartners
  // ---------------------------------------------------------------------------

  describe("getTopPartners", () => {
    function makeSeedRows(): ReturnType<typeof eventToRow>[] {
      return SEED_EVENTS.map((e, i) =>
        eventToRow({ ...e, eventId: `rev_seed_${i}` }),
      );
    }

    it("should return partners sorted by revenue descending", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const top = await tracker.getTopPartners();

      expect(top.length).toBe(2);
      // partner_2 has $195 revenue, partner_1 has $50
      expect(top[0].partnerId).toBe("partner_2");
      expect(top[0].revenue).toBe(195);
      expect(top[1].partnerId).toBe("partner_1");
      expect(top[1].revenue).toBe(50);
    });

    it("should respect limit", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const top = await tracker.getTopPartners(1);

      expect(top.length).toBe(1);
      expect(top[0].partnerId).toBe("partner_2");
    });

    it("should return empty array for empty tracker", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });

      const top = await tracker.getTopPartners();

      expect(top).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getConversionFunnel
  // ---------------------------------------------------------------------------

  describe("getConversionFunnel", () => {
    function makeSeedRows(): ReturnType<typeof eventToRow>[] {
      return SEED_EVENTS.map((e, i) =>
        eventToRow({ ...e, eventId: `rev_seed_${i}` }),
      );
    }

    it("should return full funnel counts", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const funnel = await tracker.getConversionFunnel();

      expect(funnel.clicks).toBe(4);
      expect(funnel.applications).toBe(2); // prod_a + prod_d
      expect(funnel.approvals).toBe(2); // prod_a + prod_d
      expect(funnel.conversions).toBe(3); // prod_a + prod_c + prod_d
    });

    it("should calculate click-to-conversion rate", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });

      const funnel = await tracker.getConversionFunnel();

      // 3 conversions / 4 clicks = 0.75
      expect(funnel.clickToConversionRate).toBe(0.75);
    });

    it("should filter funnel by product", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      const prodARows = rows.filter((r) => r.product_id === "prod_a");
      // fetchRows with productId chains: select("*").eq("product_id", productId)
      // select must stay chainable; eq is the terminal resolver.
      mockBuilder.select.mockReturnValueOnce(mockBuilder);
      mockBuilder.eq.mockResolvedValueOnce({ data: prodARows, error: null });

      const funnel = await tracker.getConversionFunnel("prod_a");

      expect(funnel.clicks).toBe(1);
      expect(funnel.applications).toBe(1);
      expect(funnel.approvals).toBe(1);
      expect(funnel.conversions).toBe(1);
      expect(funnel.clickToConversionRate).toBe(1);
    });

    it("should return zeroes for unknown product", async () => {
      const rows = makeSeedRows();
      await seedTracker(tracker, rows);
      // fetchRows with productId chains: select("*").eq("product_id", productId)
      // select must stay chainable; eq is the terminal resolver.
      mockBuilder.select.mockReturnValueOnce(mockBuilder);
      mockBuilder.eq.mockResolvedValueOnce({ data: [], error: null });

      const funnel = await tracker.getConversionFunnel("nonexistent");

      expect(funnel.clicks).toBe(0);
      expect(funnel.applications).toBe(0);
      expect(funnel.approvals).toBe(0);
      expect(funnel.conversions).toBe(0);
      expect(funnel.clickToConversionRate).toBe(0);
    });

    it("should return zeroes for empty tracker", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });

      const funnel = await tracker.getConversionFunnel();

      expect(funnel.clicks).toBe(0);
      expect(funnel.conversions).toBe(0);
      expect(funnel.clickToConversionRate).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getEvents / clear
  // ---------------------------------------------------------------------------

  describe("getEvents", () => {
    it("should return all tracked events as read-only copy", async () => {
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      await tracker.trackEvent(createEvent());
      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      await tracker.trackEvent(createEvent({ eventType: "conversion" }));

      const rows = [
        eventToRow({ eventId: "rev_1", ...createEvent() }),
        eventToRow({ eventId: "rev_2", ...createEvent({ eventType: "conversion" }) }),
      ];
      mockBuilder.select.mockResolvedValueOnce({ data: rows, error: null });
      const events = await tracker.getEvents();

      expect(events.length).toBe(2);
    });
  });

  describe("clear", () => {
    it("should remove all events from the DB", async () => {
      const rows = SEED_EVENTS.map((e, i) =>
        eventToRow({ ...e, eventId: `rev_seed_${i}` }),
      );
      await seedTracker(tracker, rows);

      // clear() chains: from(...).delete().not("id", "is", null)
      // not() is the terminal method — must resolve to break the thenable loop.
      mockBuilder.not.mockResolvedValueOnce({ data: null, error: null });

      await tracker.clear();

      mockBuilder.select.mockResolvedValueOnce({ data: [], error: null });
      const report = await tracker.getReport();
      expect(report.totalRevenue).toBe(0);
      expect(report.totalClicks).toBe(0);
    });
  });
});
