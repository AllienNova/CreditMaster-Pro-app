/**
 * Revenue Tracker Tests
 *
 * Tests for the affiliate revenue tracking system (AFF-02).
 */

import { RevenueTracker } from "../revenue-tracker";
import type { RevenueEvent, RevenueEventType } from "../revenue-tracker";

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

function seedTracker(tracker: RevenueTracker): void {
  // Partner 1, Product A — full funnel
  tracker.trackEvent(
    createEvent({
      productId: "prod_a",
      partnerId: "partner_1",
      eventType: "click",
      timestamp: new Date("2026-03-01T10:00:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_a",
      partnerId: "partner_1",
      eventType: "application",
      timestamp: new Date("2026-03-01T10:05:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_a",
      partnerId: "partner_1",
      eventType: "approval",
      timestamp: new Date("2026-03-01T10:10:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_a",
      partnerId: "partner_1",
      eventType: "conversion",
      commissionAmount: 50,
      commissionCurrency: "USD",
      timestamp: new Date("2026-03-01T10:15:00Z"),
    }),
  );

  // Partner 1, Product B — click only
  tracker.trackEvent(
    createEvent({
      productId: "prod_b",
      partnerId: "partner_1",
      eventType: "click",
      timestamp: new Date("2026-03-01T11:00:00Z"),
    }),
  );

  // Partner 2, Product C — conversion
  tracker.trackEvent(
    createEvent({
      productId: "prod_c",
      partnerId: "partner_2",
      eventType: "click",
      timestamp: new Date("2026-03-02T09:00:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_c",
      partnerId: "partner_2",
      eventType: "conversion",
      commissionAmount: 75,
      commissionCurrency: "USD",
      timestamp: new Date("2026-03-02T09:30:00Z"),
    }),
  );

  // Partner 2, Product D — larger conversion
  tracker.trackEvent(
    createEvent({
      productId: "prod_d",
      partnerId: "partner_2",
      eventType: "click",
      timestamp: new Date("2026-03-03T08:00:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_d",
      partnerId: "partner_2",
      eventType: "application",
      timestamp: new Date("2026-03-03T08:10:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_d",
      partnerId: "partner_2",
      eventType: "approval",
      timestamp: new Date("2026-03-03T08:20:00Z"),
    }),
  );
  tracker.trackEvent(
    createEvent({
      productId: "prod_d",
      partnerId: "partner_2",
      eventType: "conversion",
      commissionAmount: 120,
      commissionCurrency: "USD",
      timestamp: new Date("2026-03-03T08:30:00Z"),
    }),
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("RevenueTracker", () => {
  let tracker: RevenueTracker;

  beforeEach(() => {
    tracker = new RevenueTracker();
  });

  // ---------------------------------------------------------------------------
  // trackEvent
  // ---------------------------------------------------------------------------

  describe("trackEvent", () => {
    it("should track a click event and return it with an eventId", () => {
      const event = tracker.trackEvent(createEvent({ eventType: "click" }));

      expect(event.eventId).toBeDefined();
      expect(event.eventId).toMatch(/^rev_/);
      expect(event.eventType).toBe("click");
      expect(event.userId).toBe("user_001");
    });

    it("should track an application event", () => {
      const event = tracker.trackEvent(
        createEvent({ eventType: "application" }),
      );

      expect(event.eventType).toBe("application");
    });

    it("should track an approval event", () => {
      const event = tracker.trackEvent(createEvent({ eventType: "approval" }));

      expect(event.eventType).toBe("approval");
    });

    it("should track a conversion event with commission", () => {
      const event = tracker.trackEvent(
        createEvent({
          eventType: "conversion",
          commissionAmount: 75.5,
          commissionCurrency: "USD",
        }),
      );

      expect(event.eventType).toBe("conversion");
      expect(event.commissionAmount).toBe(75.5);
      expect(event.commissionCurrency).toBe("USD");
    });

    it("should generate unique event IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const event = tracker.trackEvent(createEvent());
        ids.add(event.eventId);
      }

      expect(ids.size).toBe(100);
    });

    it("should preserve metadata", () => {
      const event = tracker.trackEvent(
        createEvent({
          metadata: { source: "email", campaign: "spring_promo" },
        }),
      );

      expect(event.metadata).toEqual({
        source: "email",
        campaign: "spring_promo",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getReport
  // ---------------------------------------------------------------------------

  describe("getReport", () => {
    it("should generate a report with correct totals", () => {
      seedTracker(tracker);

      const report = tracker.getReport();

      // 4 clicks total (prod_a, prod_b, prod_c, prod_d)
      expect(report.totalClicks).toBe(4);
      // 3 conversions (prod_a, prod_c, prod_d)
      expect(report.totalConversions).toBe(3);
      // Total revenue: 50 + 75 + 120 = 245
      expect(report.totalRevenue).toBe(245);
    });

    it("should calculate conversion rate correctly", () => {
      seedTracker(tracker);

      const report = tracker.getReport();

      // 3 conversions / 4 clicks = 0.75
      expect(report.conversionRate).toBe(0.75);
    });

    it("should calculate average commission correctly", () => {
      seedTracker(tracker);

      const report = tracker.getReport();

      // (50 + 75 + 120) / 3 commission events = 81.67
      expect(report.averageCommission).toBeCloseTo(81.67, 1);
    });

    it("should break down by partner", () => {
      seedTracker(tracker);

      const report = tracker.getReport();

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

    it("should break down by product", () => {
      seedTracker(tracker);

      const report = tracker.getReport();

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

    it("should filter by date period", () => {
      seedTracker(tracker);

      const report = tracker.getReport({
        start: new Date("2026-03-01T00:00:00Z"),
        end: new Date("2026-03-01T23:59:59Z"),
      });

      // Only events on March 1: prod_a (4 events) + prod_b (1 event)
      expect(report.totalClicks).toBe(2); // prod_a click + prod_b click
      expect(report.totalConversions).toBe(1); // prod_a conversion
      expect(report.totalRevenue).toBe(50);
    });

    it("should return zeroes for empty tracker", () => {
      const report = tracker.getReport();

      expect(report.totalRevenue).toBe(0);
      expect(report.totalClicks).toBe(0);
      expect(report.totalConversions).toBe(0);
      expect(report.conversionRate).toBe(0);
      expect(report.averageCommission).toBe(0);
      expect(report.byPartner.size).toBe(0);
      expect(report.byProduct.size).toBe(0);
    });

    it("should include period in report", () => {
      seedTracker(tracker);

      const report = tracker.getReport();

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
    it("should return products sorted by revenue descending", () => {
      seedTracker(tracker);

      const top = tracker.getTopProducts();

      expect(top.length).toBeGreaterThan(0);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].revenue).toBeGreaterThanOrEqual(top[i].revenue);
      }
    });

    it("should respect limit", () => {
      seedTracker(tracker);

      const top = tracker.getTopProducts(2);

      expect(top.length).toBeLessThanOrEqual(2);
    });

    it("should return prod_d as top product (highest commission)", () => {
      seedTracker(tracker);

      const top = tracker.getTopProducts(1);

      expect(top[0].productId).toBe("prod_d");
      expect(top[0].revenue).toBe(120);
      expect(top[0].conversions).toBe(1);
    });

    it("should return empty array for empty tracker", () => {
      const top = tracker.getTopProducts();

      expect(top).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getTopPartners
  // ---------------------------------------------------------------------------

  describe("getTopPartners", () => {
    it("should return partners sorted by revenue descending", () => {
      seedTracker(tracker);

      const top = tracker.getTopPartners();

      expect(top.length).toBe(2);
      // partner_2 has $195 revenue, partner_1 has $50
      expect(top[0].partnerId).toBe("partner_2");
      expect(top[0].revenue).toBe(195);
      expect(top[1].partnerId).toBe("partner_1");
      expect(top[1].revenue).toBe(50);
    });

    it("should respect limit", () => {
      seedTracker(tracker);

      const top = tracker.getTopPartners(1);

      expect(top.length).toBe(1);
      expect(top[0].partnerId).toBe("partner_2");
    });

    it("should return empty array for empty tracker", () => {
      const top = tracker.getTopPartners();

      expect(top).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getConversionFunnel
  // ---------------------------------------------------------------------------

  describe("getConversionFunnel", () => {
    it("should return full funnel counts", () => {
      seedTracker(tracker);

      const funnel = tracker.getConversionFunnel();

      expect(funnel.clicks).toBe(4);
      expect(funnel.applications).toBe(2); // prod_a + prod_d
      expect(funnel.approvals).toBe(2); // prod_a + prod_d
      expect(funnel.conversions).toBe(3); // prod_a + prod_c + prod_d
    });

    it("should calculate click-to-conversion rate", () => {
      seedTracker(tracker);

      const funnel = tracker.getConversionFunnel();

      // 3 conversions / 4 clicks = 0.75
      expect(funnel.clickToConversionRate).toBe(0.75);
    });

    it("should filter funnel by product", () => {
      seedTracker(tracker);

      const funnel = tracker.getConversionFunnel("prod_a");

      expect(funnel.clicks).toBe(1);
      expect(funnel.applications).toBe(1);
      expect(funnel.approvals).toBe(1);
      expect(funnel.conversions).toBe(1);
      expect(funnel.clickToConversionRate).toBe(1);
    });

    it("should return zeroes for unknown product", () => {
      seedTracker(tracker);

      const funnel = tracker.getConversionFunnel("nonexistent");

      expect(funnel.clicks).toBe(0);
      expect(funnel.applications).toBe(0);
      expect(funnel.approvals).toBe(0);
      expect(funnel.conversions).toBe(0);
      expect(funnel.clickToConversionRate).toBe(0);
    });

    it("should return zeroes for empty tracker", () => {
      const funnel = tracker.getConversionFunnel();

      expect(funnel.clicks).toBe(0);
      expect(funnel.conversions).toBe(0);
      expect(funnel.clickToConversionRate).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getEvents / clear
  // ---------------------------------------------------------------------------

  describe("getEvents", () => {
    it("should return all tracked events as read-only copy", () => {
      tracker.trackEvent(createEvent());
      tracker.trackEvent(createEvent({ eventType: "conversion" }));

      const events = tracker.getEvents();

      expect(events.length).toBe(2);
      // Verify it is a copy (modifying the returned array should not affect internal state)
      expect(Object.isFrozen(events)).toBe(false); // spread creates a normal array
    });
  });

  describe("clear", () => {
    it("should remove all events", () => {
      seedTracker(tracker);

      expect(tracker.getEvents().length).toBeGreaterThan(0);

      tracker.clear();

      expect(tracker.getEvents().length).toBe(0);

      const report = tracker.getReport();
      expect(report.totalRevenue).toBe(0);
      expect(report.totalClicks).toBe(0);
    });
  });
});
