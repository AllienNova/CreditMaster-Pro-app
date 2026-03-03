/**
 * SmartAlertService — Unit Tests
 *
 * Tests intelligent notification delivery pipeline including quiet hours,
 * batching, priority overrides, weekly digest generation, and alert queries.
 */

import {
  smartAlertService,
  isInQuietHours,
  getNextDeliveryTime,
  type QuietHoursConfig,
  type AlertCategory,
  type AlertPriority,
} from "../smart-alert-service";

// ---------------------------------------------------------------------------
// Fresh service factory (avoids singleton state leaking between tests)
// ---------------------------------------------------------------------------

// We re-import the class by importing the module file and extracting via default export
// But the singleton is shared — so we need to test carefully with unique user IDs.
let userCounter = 0;
function uniqueUserId(): string {
  return `smart-alert-test-user-${++userCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// isInQuietHours (exported helper)
// ---------------------------------------------------------------------------

describe("isInQuietHours", () => {
  const baseConfig: QuietHoursConfig = {
    enabled: true,
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
    timezone: "UTC",
  };

  it("should return false when quiet hours are disabled", () => {
    const config = { ...baseConfig, enabled: false };
    expect(isInQuietHours(config)).toBe(false);
  });

  it("should detect cross-midnight quiet hours (23:00 is within 22:00–08:00)", () => {
    const now = new Date("2026-03-01T23:00:00Z");
    expect(isInQuietHours(baseConfig, now)).toBe(true);
  });

  it("should detect early morning as within cross-midnight quiet hours", () => {
    const now = new Date("2026-03-01T05:00:00Z");
    expect(isInQuietHours(baseConfig, now)).toBe(true);
  });

  it("should detect 12:00 as outside cross-midnight quiet hours", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    expect(isInQuietHours(baseConfig, now)).toBe(false);
  });

  it("should handle same-day ranges (08:00–18:00)", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      startHour: 8,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      timezone: "UTC",
    };
    const duringQuiet = new Date("2026-03-01T10:00:00Z");
    const outsideQuiet = new Date("2026-03-01T20:00:00Z");

    expect(isInQuietHours(config, duringQuiet)).toBe(true);
    expect(isInQuietHours(config, outsideQuiet)).toBe(false);
  });

  it("should handle start minute and end minute precisely", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      startHour: 22,
      startMinute: 30,
      endHour: 6,
      endMinute: 30,
      timezone: "UTC",
    };
    // 22:29 should be outside (before start)
    const before = new Date("2026-03-01T22:29:00Z");
    expect(isInQuietHours(config, before)).toBe(false);

    // 22:31 should be inside
    const after = new Date("2026-03-01T22:31:00Z");
    expect(isInQuietHours(config, after)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getNextDeliveryTime (exported helper)
// ---------------------------------------------------------------------------

describe("getNextDeliveryTime", () => {
  const config: QuietHoursConfig = {
    enabled: true,
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
    timezone: "UTC",
  };

  it("should return null when quiet hours are disabled", () => {
    const disabled = { ...config, enabled: false };
    expect(getNextDeliveryTime(disabled)).toBeNull();
  });

  it("should return null when not currently in quiet hours", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    expect(getNextDeliveryTime(config, now)).toBeNull();
  });

  it("should return next morning when called during quiet hours at night", () => {
    const now = new Date("2026-03-01T23:00:00Z");
    const result = getNextDeliveryTime(config, now);
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(8);
    expect(result!.getMinutes()).toBe(0);
  });

  it("should return same-day end time when called in early morning", () => {
    const now = new Date("2026-03-01T03:00:00Z");
    const result = getNextDeliveryTime(config, now);
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(8);
    expect(result!.getMinutes()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SmartAlertService — Preferences
// ---------------------------------------------------------------------------

describe("SmartAlertService", () => {
  describe("preferences", () => {
    it("should return default preferences for a new user", () => {
      const userId = uniqueUserId();
      const prefs = smartAlertService.getPreferences(userId);

      expect(prefs.userId).toBe(userId);
      expect(prefs.batchingEnabled).toBe(true);
      expect(prefs.batchIntervalMinutes).toBe(15);
      expect(prefs.weeklyDigestEnabled).toBe(true);
      expect(prefs.weeklyDigestDay).toBe(1);
      expect(prefs.weeklyDigestHour).toBe(9);
      expect(prefs.quietHours.enabled).toBe(false);
    });

    it("should return cached preferences on subsequent calls", () => {
      const userId = uniqueUserId();
      const first = smartAlertService.getPreferences(userId);
      const second = smartAlertService.getPreferences(userId);
      expect(first).toBe(second); // same reference
    });

    it("should update preferences with partial overrides", () => {
      const userId = uniqueUserId();
      const updated = smartAlertService.updatePreferences(userId, {
        batchIntervalMinutes: 30,
        weeklyDigestDay: 5,
      });

      expect(updated.batchIntervalMinutes).toBe(30);
      expect(updated.weeklyDigestDay).toBe(5);
      // Other fields preserved
      expect(updated.batchingEnabled).toBe(true);
    });

    it("should merge quiet hours config instead of replacing", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, {
        quietHours: { enabled: true, startHour: 21 } as QuietHoursConfig,
      });

      const prefs = smartAlertService.getPreferences(userId);
      expect(prefs.quietHours.enabled).toBe(true);
      expect(prefs.quietHours.startHour).toBe(21);
      // Other quiet hours fields preserved from defaults
      expect(prefs.quietHours.endHour).toBe(8);
    });

    it("should merge priority overrides instead of replacing", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, {
        priorityOverrides: { trading: "urgent" } as Record<AlertCategory, AlertPriority>,
      });

      const prefs = smartAlertService.getPreferences(userId);
      expect(prefs.priorityOverrides.trading).toBe("urgent");
      // Other overrides preserved
      expect(prefs.priorityOverrides.security).toBe("urgent");
    });
  });

  // -------------------------------------------------------------------------
  // Alert Delivery Pipeline
  // -------------------------------------------------------------------------

  describe("processAlert", () => {
    it("should deliver urgent alerts immediately", () => {
      const userId = uniqueUserId();
      const result = smartAlertService.processAlert(
        userId,
        "Security breach",
        "Unusual login detected",
        "security",
        "urgent",
      );

      expect(result.delivered).toBe(true);
      expect(result.deferred).toBe(false);
      expect(result.alertId).toMatch(/^alert_/);
    });

    it("should deliver high priority alerts immediately when batching is enabled", () => {
      const userId = uniqueUserId();
      // Default preferences have batching enabled
      const result = smartAlertService.processAlert(
        userId,
        "Payment due",
        "Credit card payment is due",
        "payment",
        "high",
      );

      expect(result.delivered).toBe(true);
      expect(result.deferred).toBe(false);
    });

    it("should batch normal priority alerts when batching is enabled", () => {
      const userId = uniqueUserId();
      const result = smartAlertService.processAlert(
        userId,
        "Savings update",
        "You saved $50 this week",
        "savings",
        "normal",
      );

      expect(result.delivered).toBe(false);
      expect(result.deferred).toBe(false);
      expect(result.batchId).toBeTruthy();
      expect(result.reason).toContain("Batched");
    });

    it("should batch low priority alerts when batching is enabled", () => {
      const userId = uniqueUserId();
      const result = smartAlertService.processAlert(
        userId,
        "Goal progress",
        "You're 50% to your savings goal",
        "goal",
        "low",
      );

      expect(result.delivered).toBe(false);
      expect(result.batchId).toBeTruthy();
    });

    it("should deliver immediately when batching is disabled", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, { batchingEnabled: false });

      const result = smartAlertService.processAlert(
        userId,
        "Budget alert",
        "You exceeded grocery budget",
        "budget",
        "normal",
      );

      expect(result.delivered).toBe(true);
      expect(result.deferred).toBe(false);
    });

    it("should defer non-urgent alerts during quiet hours", () => {
      const userId = uniqueUserId();
      // Enable quiet hours that are always active for testing
      smartAlertService.updatePreferences(userId, {
        quietHours: {
          enabled: true,
          startHour: 0,
          startMinute: 0,
          endHour: 23,
          endMinute: 59,
          timezone: "UTC",
        },
      });

      const result = smartAlertService.processAlert(
        userId,
        "Savings update",
        "Monthly savings report",
        "savings",
        "normal",
      );

      expect(result.delivered).toBe(false);
      expect(result.deferred).toBe(true);
      expect(result.reason).toContain("Deferred");
    });

    it("should deliver urgent alerts even during quiet hours", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, {
        quietHours: {
          enabled: true,
          startHour: 0,
          startMinute: 0,
          endHour: 23,
          endMinute: 59,
          timezone: "UTC",
        },
      });

      const result = smartAlertService.processAlert(
        userId,
        "Fraud alert",
        "Suspicious activity detected",
        "security",
        "urgent",
      );

      expect(result.delivered).toBe(true);
      expect(result.deferred).toBe(false);
    });

    it("should use priority override when user override is higher", () => {
      const userId = uniqueUserId();
      // Security default override is "urgent", so even a "low" security alert should deliver
      const result = smartAlertService.processAlert(
        userId,
        "Security notice",
        "Password changed",
        "security",
        "low",
      );

      // effective priority = max(low=1, urgent=4) = urgent → immediate delivery
      expect(result.delivered).toBe(true);
    });

    it("should store alert data when provided", () => {
      const userId = uniqueUserId();
      const data = { actionUrl: "/dashboard", amount: 100 };
      const result = smartAlertService.processAlert(
        userId,
        "Test alert",
        "Test message",
        "system",
        "urgent",
        data,
      );

      const alert = smartAlertService.getAlertById(result.alertId);
      expect(alert).not.toBeNull();
      expect(alert!.data).toEqual(data);
    });
  });

  // -------------------------------------------------------------------------
  // Batching
  // -------------------------------------------------------------------------

  describe("batching", () => {
    it("should track pending batch count", () => {
      const userId = uniqueUserId();

      smartAlertService.processAlert(userId, "A1", "M1", "savings", "normal");
      smartAlertService.processAlert(userId, "A2", "M2", "savings", "normal");
      smartAlertService.processAlert(userId, "A3", "M3", "budget", "normal");

      expect(smartAlertService.getPendingBatchCount(userId)).toBe(3);
    });

    it("should return 0 pending batches for user with no alerts", () => {
      expect(smartAlertService.getPendingBatchCount(uniqueUserId())).toBe(0);
    });

    it("should flush batches and deliver all alerts", () => {
      const userId = uniqueUserId();

      smartAlertService.processAlert(userId, "A1", "M1", "savings", "normal");
      smartAlertService.processAlert(userId, "A2", "M2", "savings", "normal");
      smartAlertService.processAlert(userId, "A3", "M3", "budget", "normal");

      const flushed = smartAlertService.flushBatches(userId);

      expect(flushed).toHaveLength(2); // two categories: savings and budget
      expect(smartAlertService.getPendingBatchCount(userId)).toBe(0);

      // All alerts should be delivered
      const savingsBatch = flushed.find((b) => b.category === "savings");
      expect(savingsBatch).toBeDefined();
      expect(savingsBatch!.alerts).toHaveLength(2);
      expect(savingsBatch!.deliveredAt).toBeDefined();
    });

    it("should return empty array when flushing with no pending batches", () => {
      const userId = uniqueUserId();
      const flushed = smartAlertService.flushBatches(userId);
      expect(flushed).toEqual([]);
    });

    it("should store flushed batches for retrieval", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "A1", "M1", "trading", "normal");

      const flushed = smartAlertService.flushBatches(userId);
      expect(flushed).toHaveLength(1);

      const batch = smartAlertService.getBatch(flushed[0].id);
      expect(batch).not.toBeNull();
      expect(batch!.category).toBe("trading");
    });
  });

  // -------------------------------------------------------------------------
  // Weekly Digest
  // -------------------------------------------------------------------------

  describe("generateWeeklyDigest", () => {
    it("should return null when weekly digest is disabled", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, { weeklyDigestEnabled: false });

      const digest = smartAlertService.generateWeeklyDigest(userId);
      expect(digest).toBeNull();
    });

    it("should return an empty digest when there are no alerts", () => {
      const userId = uniqueUserId();
      const digest = smartAlertService.generateWeeklyDigest(userId);

      expect(digest).not.toBeNull();
      expect(digest!.sections).toHaveLength(0);
    });

    it("should group alerts by category", () => {
      const userId = uniqueUserId();

      // Create alerts (urgent ones deliver immediately, which adds to alerts store)
      smartAlertService.processAlert(userId, "Score up", "750", "credit_score", "urgent");
      smartAlertService.processAlert(userId, "Score down", "740", "credit_score", "urgent");
      smartAlertService.processAlert(userId, "Trade executed", "AAPL", "trading", "urgent");

      const digest = smartAlertService.generateWeeklyDigest(userId);
      expect(digest).not.toBeNull();
      expect(digest!.sections.length).toBeGreaterThanOrEqual(2);

      const creditSection = digest!.sections.find((s) => s.category === "credit_score");
      expect(creditSection).toBeDefined();
      expect(creditSection!.items).toHaveLength(2);
      expect(creditSection!.summary).toBe("2 alerts this week");
    });

    it("should sort sections by alert count descending", () => {
      const userId = uniqueUserId();

      // 3 security alerts
      smartAlertService.processAlert(userId, "S1", "M1", "security", "urgent");
      smartAlertService.processAlert(userId, "S2", "M2", "security", "urgent");
      smartAlertService.processAlert(userId, "S3", "M3", "security", "urgent");
      // 1 payment alert
      smartAlertService.processAlert(userId, "P1", "M1", "payment", "urgent");

      const digest = smartAlertService.generateWeeklyDigest(userId);
      expect(digest!.sections[0].category).toBe("security");
    });

    it("should include correct date range", () => {
      const userId = uniqueUserId();
      const now = new Date("2026-03-01T12:00:00Z");
      const digest = smartAlertService.generateWeeklyDigest(userId, now);

      expect(digest!.weekEnd).toEqual(now);
      const diffDays = (digest!.weekEnd.getTime() - digest!.weekStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it("should use singular 'alert' for single-item sections", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "One alert", "Single", "bill", "urgent");

      const digest = smartAlertService.generateWeeklyDigest(userId);
      const billSection = digest!.sections.find((s) => s.category === "bill");
      expect(billSection!.summary).toBe("1 alert this week");
    });
  });

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  describe("query", () => {
    it("should get all alerts for a user", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "A1", "M1", "security", "urgent");
      smartAlertService.processAlert(userId, "A2", "M2", "payment", "urgent");

      const alerts = smartAlertService.getAlerts(userId);
      expect(alerts).toHaveLength(2);
    });

    it("should filter alerts by category", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "A1", "M1", "security", "urgent");
      smartAlertService.processAlert(userId, "A2", "M2", "payment", "urgent");

      const alerts = smartAlertService.getAlerts(userId, { category: "security" });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].category).toBe("security");
    });

    it("should filter alerts by status", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "Delivered", "M1", "security", "urgent");
      smartAlertService.processAlert(userId, "Batched", "M2", "savings", "normal");

      const delivered = smartAlertService.getAlerts(userId, { status: "delivered" });
      expect(delivered).toHaveLength(1);
      expect(delivered[0].title).toBe("Delivered");
    });

    it("should filter alerts by since date", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "A1", "M1", "security", "urgent");

      const futureDate = new Date(Date.now() + 100000);
      const alerts = smartAlertService.getAlerts(userId, { since: futureDate });
      expect(alerts).toHaveLength(0);
    });

    it("should limit alerts returned", () => {
      const userId = uniqueUserId();
      for (let i = 0; i < 5; i++) {
        smartAlertService.processAlert(userId, `A${i}`, `M${i}`, "security", "urgent");
      }

      const alerts = smartAlertService.getAlerts(userId, { limit: 2 });
      expect(alerts).toHaveLength(2);
    });

    it("should sort alerts newest first", () => {
      const userId = uniqueUserId();
      smartAlertService.processAlert(userId, "First", "M1", "security", "urgent");

      // Manually adjust createdAt to ensure different timestamps
      const userAlerts = smartAlertService.getAlerts(userId);
      (userAlerts[0] as { createdAt: Date }).createdAt = new Date("2026-01-01");

      smartAlertService.processAlert(userId, "Second", "M2", "security", "urgent");

      const alerts = smartAlertService.getAlerts(userId);
      expect(alerts[0].title).toBe("Second");
      expect(alerts[1].title).toBe("First");
    });

    it("should return empty array for unknown user", () => {
      const alerts = smartAlertService.getAlerts("nonexistent-user");
      expect(alerts).toEqual([]);
    });

    it("should get alert by ID", () => {
      const userId = uniqueUserId();
      const result = smartAlertService.processAlert(userId, "Test", "Msg", "system", "urgent");

      const alert = smartAlertService.getAlertById(result.alertId);
      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Test");
    });

    it("should return null for unknown alert ID", () => {
      expect(smartAlertService.getAlertById("nonexistent")).toBeNull();
    });

    it("should return null for unknown batch ID", () => {
      expect(smartAlertService.getBatch("nonexistent")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Deferred Alerts
  // -------------------------------------------------------------------------

  describe("deferred alerts", () => {
    it("should find deferred alerts ready for delivery", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, {
        quietHours: {
          enabled: true,
          startHour: 0,
          startMinute: 0,
          endHour: 23,
          endMinute: 59,
          timezone: "UTC",
        },
      });

      smartAlertService.processAlert(userId, "Deferred", "M1", "savings", "normal");

      // Check future time when quiet hours would be over
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const ready = smartAlertService.getDeferredAlertsReady(userId, futureTime);
      expect(ready.length).toBeGreaterThanOrEqual(1);
    });

    it("should deliver a deferred alert", () => {
      const userId = uniqueUserId();
      smartAlertService.updatePreferences(userId, {
        quietHours: {
          enabled: true,
          startHour: 0,
          startMinute: 0,
          endHour: 23,
          endMinute: 59,
          timezone: "UTC",
        },
      });

      const result = smartAlertService.processAlert(userId, "Deferred", "Msg", "payment", "normal");
      expect(result.deferred).toBe(true);

      const delivered = smartAlertService.deliverDeferredAlert(result.alertId);
      expect(delivered).toBe(true);

      const alert = smartAlertService.getAlertById(result.alertId);
      expect(alert!.status).toBe("delivered");
      expect(alert!.deliveredAt).toBeDefined();
    });

    it("should return false when delivering non-deferred alert", () => {
      const userId = uniqueUserId();
      const result = smartAlertService.processAlert(userId, "Urgent", "Msg", "security", "urgent");

      expect(smartAlertService.deliverDeferredAlert(result.alertId)).toBe(false);
    });

    it("should return false for unknown alert ID", () => {
      expect(smartAlertService.deliverDeferredAlert("nonexistent")).toBe(false);
    });

    it("should return empty when no deferred alerts exist", () => {
      const userId = uniqueUserId();
      expect(smartAlertService.getDeferredAlertsReady(userId)).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  describe("getAlertStats", () => {
    it("should return zeroed stats for new user", () => {
      const userId = uniqueUserId();
      const stats = smartAlertService.getAlertStats(userId);

      expect(stats.total).toBe(0);
      expect(stats.delivered).toBe(0);
      expect(stats.deferred).toBe(0);
      expect(stats.batched).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.byCategory).toEqual({});
    });

    it("should count alerts by status and category", () => {
      const userId = uniqueUserId();

      smartAlertService.processAlert(userId, "U1", "M1", "security", "urgent"); // delivered
      smartAlertService.processAlert(userId, "U2", "M2", "security", "urgent"); // delivered
      smartAlertService.processAlert(userId, "N1", "M3", "savings", "normal");  // batched

      const stats = smartAlertService.getAlertStats(userId);
      expect(stats.total).toBe(3);
      expect(stats.delivered).toBe(2);
      expect(stats.batched).toBe(1);
      expect(stats.byCategory.security).toBe(2);
      expect(stats.byCategory.savings).toBe(1);
    });
  });
});
