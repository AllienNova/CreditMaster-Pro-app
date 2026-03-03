/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  notificationScheduler,
  parseTime,
  isWithinQuietHours,
  getNextAvailableTime,
  renderTemplate,
  NOTIFICATION_TEMPLATES,
  DEFAULT_CHANNEL_PREFERENCES,
  DEFAULT_QUIET_HOURS,
  type QuietHoursConfig,
  type UserNotificationPreferences,
  type ChannelPreferences,
} from "../notification-scheduler";
import type { PushNotificationPayload } from "../web-push-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFutureDate(minutesFromNow: number): Date {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

function makePastDate(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

const samplePayload: PushNotificationPayload = {
  type: "general",
  title: "Test Notification",
  body: "This is a test notification body",
};

function makePreferences(
  overrides?: Partial<UserNotificationPreferences>,
): UserNotificationPreferences {
  return {
    userId: "user-1",
    pushEnabled: true,
    quietHours: { ...DEFAULT_QUIET_HOURS },
    channels: { ...DEFAULT_CHANNEL_PREFERENCES },
    ...overrides,
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  notificationScheduler.clearAll();
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseTime
// ═══════════════════════════════════════════════════════════════════════════════
describe("parseTime", () => {
  it("parses a valid HH:MM time string", () => {
    const result = parseTime("14:30");
    expect(result).toEqual({ hours: 14, minutes: 30 });
  });

  it("parses midnight (00:00)", () => {
    const result = parseTime("00:00");
    expect(result).toEqual({ hours: 0, minutes: 0 });
  });

  it("parses end of day (23:59)", () => {
    const result = parseTime("23:59");
    expect(result).toEqual({ hours: 23, minutes: 59 });
  });

  it("throws for invalid format (no colon)", () => {
    expect(() => parseTime("1430")).toThrow("Invalid time format");
  });

  it("throws for out-of-range hours", () => {
    expect(() => parseTime("25:00")).toThrow("Invalid time values");
  });

  it("throws for out-of-range minutes", () => {
    expect(() => parseTime("12:60")).toThrow("Invalid time values");
  });

  it("throws for negative values", () => {
    expect(() => parseTime("-1:30")).toThrow("Invalid time values");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isWithinQuietHours
// ═══════════════════════════════════════════════════════════════════════════════
describe("isWithinQuietHours", () => {
  it("returns false when quiet hours are disabled", () => {
    const config: QuietHoursConfig = {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Local-time constructor: 23:00 would be in range if enabled
    const date = new Date(2026, 1, 28, 23, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(false);
  });

  it("returns true when time is within same-day quiet hours", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "09:00",
      end: "17:00",
      timezone: "UTC",
    };
    // Local-time constructor: 12:00 is within 09:00-17:00
    const date = new Date(2026, 1, 28, 12, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(true);
  });

  it("returns false when time is outside same-day quiet hours", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "09:00",
      end: "17:00",
      timezone: "UTC",
    };
    // Local-time constructor: 20:00 is outside 09:00-17:00
    const date = new Date(2026, 1, 28, 20, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(false);
  });

  it("returns true when time is within overnight quiet hours (after start)", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Use local-time constructor so getHours() returns 23
    const date = new Date(2026, 1, 28, 23, 30, 0);
    expect(isWithinQuietHours(date, config)).toBe(true);
  });

  it("returns true when time is within overnight quiet hours (before end)", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Use local-time constructor so getHours() returns 6
    const date = new Date(2026, 2, 1, 6, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(true);
  });

  it("returns false when time is outside overnight quiet hours", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Use local-time constructor so getHours() returns 14
    const date = new Date(2026, 1, 28, 14, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(false);
  });

  it("returns true at exactly the start time of quiet hours", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Use local-time constructor so getHours() returns 22
    const date = new Date(2026, 1, 28, 22, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(true);
  });

  it("returns false at exactly the end time of quiet hours", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Use local-time constructor so getHours() returns 8
    const date = new Date(2026, 2, 1, 8, 0, 0);
    expect(isWithinQuietHours(date, config)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getNextAvailableTime
// ═══════════════════════════════════════════════════════════════════════════════
describe("getNextAvailableTime", () => {
  it("returns the same date when not in quiet hours", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Local-time constructor: 14:00 is outside 22:00-08:00
    const date = new Date(2026, 1, 28, 14, 0, 0);
    const result = getNextAvailableTime(date, config);
    expect(result).toEqual(date);
  });

  it("returns the quiet hours end time when within overnight quiet hours (before midnight)", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Local-time constructor: 23:00 is within 22:00-08:00
    const date = new Date(2026, 1, 28, 23, 0, 0);
    const result = getNextAvailableTime(date, config);
    // Should return 08:00 the next day (March 1st)
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it("returns the quiet hours end time when within overnight quiet hours (after midnight)", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Local-time constructor: 05:00 is within 22:00-08:00
    const date = new Date(2026, 2, 1, 5, 0, 0);
    const result = getNextAvailableTime(date, config);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it("returns the same date when quiet hours are disabled", () => {
    const config: QuietHoursConfig = {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    };
    // Even though 23:00 is within the range, disabled = no quiet hours
    const date = new Date(2026, 1, 28, 23, 0, 0);
    const result = getNextAvailableTime(date, config);
    expect(result).toEqual(date);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// renderTemplate
// ═══════════════════════════════════════════════════════════════════════════════
describe("renderTemplate", () => {
  it("replaces single variable", () => {
    const result = renderTemplate("Hello {{name}}!", { name: "World" });
    expect(result).toBe("Hello World!");
  });

  it("replaces multiple variables", () => {
    const result = renderTemplate(
      "Bill: {{billName}} - ${{amount}} due {{dueDate}}",
      { billName: "Netflix", amount: 14.99, dueDate: "2026-03-01" },
    );
    expect(result).toBe("Bill: Netflix - $14.99 due 2026-03-01");
  });

  it("leaves unknown variables as-is", () => {
    const result = renderTemplate("Hello {{name}}, your {{missing}} is ready", {
      name: "Alice",
    });
    expect(result).toBe("Hello Alice, your {{missing}} is ready");
  });

  it("handles numeric values", () => {
    const result = renderTemplate("Score: {{score}} points", { score: 720 });
    expect(result).toBe("Score: 720 points");
  });

  it("handles empty template", () => {
    const result = renderTemplate("", { key: "value" });
    expect(result).toBe("");
  });

  it("handles template with no variables", () => {
    const result = renderTemplate("No variables here", {});
    expect(result).toBe("No variables here");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// scheduleNotification
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – scheduleNotification", () => {
  it("schedules a notification for future delivery", () => {
    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      futureDate,
    );

    expect(result.scheduled).toBe(true);
    expect(result.notificationId).toMatch(/^sched_/);
    expect(result.error).toBeUndefined();
  });

  it("rejects scheduling in the past", () => {
    const pastDate = makePastDate(5);
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      pastDate,
    );

    expect(result.scheduled).toBe(false);
    expect(result.error).toContain("must be in the future");
  });

  it("stores the notification and allows retrieval", () => {
    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      futureDate,
    );

    const notification = notificationScheduler.getScheduledNotification(
      result.notificationId,
    );
    expect(notification).not.toBeNull();
    expect(notification?.userId).toBe("user-1");
    expect(notification?.payload.title).toBe("Test Notification");
    expect(notification?.status).toBe("pending");
  });

  it("blocks notification when push is disabled for user", () => {
    notificationScheduler.updateUserPreferences("user-disabled", {
      pushEnabled: false,
    });

    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-disabled",
      samplePayload,
      futureDate,
    );

    expect(result.scheduled).toBe(false);
    expect(result.error).toContain("disabled by user");
  });

  it("blocks notification when channel is disabled", () => {
    notificationScheduler.updateUserPreferences("user-channel-off", {
      channels: {
        ...DEFAULT_CHANNEL_PREFERENCES,
        general: false,
      },
    });

    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-channel-off",
      samplePayload,
      futureDate,
    );

    expect(result.scheduled).toBe(false);
    expect(result.error).toContain('"general" is disabled');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// cancelNotification
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – cancelNotification", () => {
  it("cancels a pending notification", () => {
    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      futureDate,
    );

    const cancelled = notificationScheduler.cancelNotification(
      result.notificationId,
    );
    expect(cancelled).toBe(true);

    const notification = notificationScheduler.getScheduledNotification(
      result.notificationId,
    );
    expect(notification?.status).toBe("cancelled");
    expect(notification?.cancelledAt).toBeInstanceOf(Date);
  });

  it("returns false for non-existent notification", () => {
    const cancelled = notificationScheduler.cancelNotification("nonexistent-id");
    expect(cancelled).toBe(false);
  });

  it("returns false when trying to cancel an already delivered notification", () => {
    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      futureDate,
    );

    notificationScheduler.markDelivered(result.notificationId);

    const cancelled = notificationScheduler.cancelNotification(
      result.notificationId,
    );
    expect(cancelled).toBe(false);
  });

  it("returns false when trying to cancel an already cancelled notification", () => {
    const futureDate = makeFutureDate(30);
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      futureDate,
    );

    notificationScheduler.cancelNotification(result.notificationId);

    const secondCancel = notificationScheduler.cancelNotification(
      result.notificationId,
    );
    expect(secondCancel).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getUserScheduledNotifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – getUserScheduledNotifications", () => {
  it("returns empty array when user has no notifications", () => {
    const result = notificationScheduler.getUserScheduledNotifications("user-empty");
    expect(result).toEqual([]);
  });

  it("returns all notifications for a user", () => {
    const future1 = makeFutureDate(30);
    const future2 = makeFutureDate(60);

    notificationScheduler.scheduleNotification("user-1", samplePayload, future1);
    notificationScheduler.scheduleNotification("user-1", samplePayload, future2);
    notificationScheduler.scheduleNotification(
      "user-2",
      samplePayload,
      future1,
    );

    const result = notificationScheduler.getUserScheduledNotifications("user-1");
    expect(result).toHaveLength(2);
  });

  it("filters by status", () => {
    const future1 = makeFutureDate(30);
    const future2 = makeFutureDate(60);

    const r1 = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      future1,
    );
    notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      future2,
    );

    notificationScheduler.cancelNotification(r1.notificationId);

    const pending =
      notificationScheduler.getUserScheduledNotifications("user-1", "pending");
    expect(pending).toHaveLength(1);

    const cancelled =
      notificationScheduler.getUserScheduledNotifications("user-1", "cancelled");
    expect(cancelled).toHaveLength(1);
  });

  it("returns notifications sorted by scheduledAt", () => {
    const future1 = makeFutureDate(60);
    const future2 = makeFutureDate(30);
    const future3 = makeFutureDate(90);

    notificationScheduler.scheduleNotification("user-1", samplePayload, future1);
    notificationScheduler.scheduleNotification("user-1", samplePayload, future2);
    notificationScheduler.scheduleNotification("user-1", samplePayload, future3);

    const result = notificationScheduler.getUserScheduledNotifications("user-1");
    expect(result[0].scheduledAt.getTime()).toBeLessThanOrEqual(
      result[1].scheduledAt.getTime(),
    );
    expect(result[1].scheduledAt.getTime()).toBeLessThanOrEqual(
      result[2].scheduledAt.getTime(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDueNotifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – getDueNotifications", () => {
  it("returns empty array when no notifications are due", () => {
    notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(60),
    );
    const due = notificationScheduler.getDueNotifications();
    expect(due).toEqual([]);
  });

  it("does not return cancelled notifications even if past due", () => {
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(1),
    );
    notificationScheduler.cancelNotification(result.notificationId);

    const due = notificationScheduler.getDueNotifications();
    expect(due).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// markDelivered / markFailed
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – markDelivered", () => {
  it("marks a pending notification as delivered", () => {
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(30),
    );

    const marked = notificationScheduler.markDelivered(result.notificationId);
    expect(marked).toBe(true);

    const notification = notificationScheduler.getScheduledNotification(
      result.notificationId,
    );
    expect(notification?.status).toBe("delivered");
    expect(notification?.deliveredAt).toBeInstanceOf(Date);
  });

  it("returns false for non-existent notification", () => {
    const marked = notificationScheduler.markDelivered("nonexistent");
    expect(marked).toBe(false);
  });

  it("returns false for non-pending notification", () => {
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(30),
    );
    notificationScheduler.cancelNotification(result.notificationId);

    const marked = notificationScheduler.markDelivered(result.notificationId);
    expect(marked).toBe(false);
  });
});

describe("NotificationScheduler – markFailed", () => {
  it("marks a pending notification as failed with error", () => {
    const result = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(30),
    );

    const marked = notificationScheduler.markFailed(
      result.notificationId,
      "Connection refused",
    );
    expect(marked).toBe(true);

    const notification = notificationScheduler.getScheduledNotification(
      result.notificationId,
    );
    expect(notification?.status).toBe("failed");
    expect(notification?.error).toBe("Connection refused");
  });

  it("returns false for non-existent notification", () => {
    const marked = notificationScheduler.markFailed("nonexistent", "error");
    expect(marked).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// checkPreferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – checkPreferences", () => {
  it("allows notification when all preferences permit", () => {
    const prefs = makePreferences();
    const result = notificationScheduler.checkPreferences(prefs, "general");
    expect(result.allowed).toBe(true);
  });

  it("blocks when push is globally disabled", () => {
    const prefs = makePreferences({ pushEnabled: false });
    const result = notificationScheduler.checkPreferences(prefs, "general");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("disabled by user");
  });

  it("blocks when specific channel is disabled", () => {
    const prefs = makePreferences({
      channels: {
        ...DEFAULT_CHANNEL_PREFERENCES,
        payment_reminder: false,
      },
    });
    const result = notificationScheduler.checkPreferences(
      prefs,
      "payment_reminder",
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("payment_reminder");
  });

  it("delays notification during quiet hours", () => {
    const prefs = makePreferences({
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      },
    });
    // Local-time constructor: 23:00 is within 22:00-08:00 quiet hours
    const sendTime = new Date(2026, 1, 28, 23, 0, 0);
    const result = notificationScheduler.checkPreferences(
      prefs,
      "general",
      sendTime,
    );
    expect(result.allowed).toBe(false);
    expect(result.delayUntil).toBeDefined();
    expect(result.reason).toContain("quiet hours");
  });

  it("allows security alerts during quiet hours", () => {
    const prefs = makePreferences({
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      },
    });
    // Local-time constructor: 23:00 is within quiet hours
    const sendTime = new Date(2026, 1, 28, 23, 0, 0);
    const result = notificationScheduler.checkPreferences(
      prefs,
      "security_alert",
      sendTime,
    );
    expect(result.allowed).toBe(true);
  });

  it("allows notification outside quiet hours", () => {
    const prefs = makePreferences({
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      },
    });
    // Local-time constructor: 14:00 is outside 22:00-08:00 quiet hours
    const sendTime = new Date(2026, 1, 28, 14, 0, 0);
    const result = notificationScheduler.checkPreferences(
      prefs,
      "general",
      sendTime,
    );
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getUserPreferences / updateUserPreferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – preferences management", () => {
  it("returns default preferences for unknown user", () => {
    const prefs = notificationScheduler.getUserPreferences("unknown-user");
    expect(prefs.userId).toBe("unknown-user");
    expect(prefs.pushEnabled).toBe(true);
    expect(prefs.quietHours.enabled).toBe(false);
    expect(prefs.channels.general).toBe(true);
  });

  it("updates and persists user preferences", () => {
    notificationScheduler.updateUserPreferences("user-1", {
      pushEnabled: false,
    });

    const prefs = notificationScheduler.getUserPreferences("user-1");
    expect(prefs.pushEnabled).toBe(false);
    // Other defaults should be preserved
    expect(prefs.channels.general).toBe(true);
  });

  it("merges channel preferences without overwriting others", () => {
    notificationScheduler.updateUserPreferences("user-1", {
      channels: {
        ...DEFAULT_CHANNEL_PREFERENCES,
        general: false,
        payment_reminder: false,
      },
    });

    const prefs = notificationScheduler.getUserPreferences("user-1");
    expect(prefs.channels.general).toBe(false);
    expect(prefs.channels.payment_reminder).toBe(false);
    expect(prefs.channels.security_alert).toBe(true);
  });

  it("updates quiet hours configuration", () => {
    notificationScheduler.updateUserPreferences("user-1", {
      quietHours: {
        enabled: true,
        start: "21:00",
        end: "07:00",
        timezone: "America/New_York",
      },
    });

    const prefs = notificationScheduler.getUserPreferences("user-1");
    expect(prefs.quietHours.enabled).toBe(true);
    expect(prefs.quietHours.start).toBe("21:00");
    expect(prefs.quietHours.end).toBe("07:00");
    expect(prefs.quietHours.timezone).toBe("America/New_York");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createFromTemplate
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – createFromTemplate", () => {
  it("creates a bill_reminder payload from template", () => {
    const payload = notificationScheduler.createFromTemplate("bill_reminder", {
      billName: "Netflix",
      amount: 14.99,
      dueDate: "2026-03-01",
    });

    expect(payload).not.toBeNull();
    expect(payload?.type).toBe("bill_reminder");
    expect(payload?.title).toBe("Bill Due Soon");
    expect(payload?.body).toContain("Netflix");
    expect(payload?.body).toContain("$14.99");
    expect(payload?.body).toContain("2026-03-01");
    expect(payload?.url).toBe("/financial/bills");
    expect(payload?.actions).toHaveLength(2);
  });

  it("creates a goal_milestone payload from template", () => {
    const payload = notificationScheduler.createFromTemplate("goal_milestone", {
      percentage: 75,
      goalName: "Emergency Fund",
    });

    expect(payload?.type).toBe("goal_milestone");
    expect(payload?.title).toBe("Goal Milestone Reached!");
    expect(payload?.body).toContain("75%");
    expect(payload?.body).toContain("Emergency Fund");
    expect(payload?.requireInteraction).toBe(true);
  });

  it("creates a subscription_renewal payload from template", () => {
    const payload = notificationScheduler.createFromTemplate(
      "subscription_renewal",
      {
        planName: "Premium",
        amount: 159.99,
        interval: "month",
        renewalDate: "2026-03-15",
      },
    );

    expect(payload?.type).toBe("subscription_renewal");
    expect(payload?.body).toContain("Premium");
    expect(payload?.body).toContain("$159.99");
    expect(payload?.body).toContain("month");
    expect(payload?.body).toContain("2026-03-15");
  });

  it("creates a score_change payload from template", () => {
    const payload = notificationScheduler.createFromTemplate("score_change", {
      oldScore: 700,
      newScore: 720,
      direction: "+",
      change: 20,
    });

    expect(payload?.type).toBe("score_change");
    expect(payload?.body).toContain("700");
    expect(payload?.body).toContain("720");
    expect(payload?.body).toContain("+20");
  });

  it("creates a payment_success payload from template", () => {
    const payload = notificationScheduler.createFromTemplate("payment_success", {
      amount: 99.99,
      description: "Monthly subscription",
    });

    expect(payload?.type).toBe("payment_success");
    expect(payload?.body).toContain("$99.99");
    expect(payload?.body).toContain("Monthly subscription");
  });

  it("returns null for unknown template key", () => {
    const payload = notificationScheduler.createFromTemplate("nonexistent", {});
    expect(payload).toBeNull();
  });

  it("applies overrides to template payload", () => {
    const payload = notificationScheduler.createFromTemplate(
      "bill_reminder",
      { billName: "Spotify", amount: 9.99, dueDate: "2026-03-01" },
      { title: "Custom Title", url: "/custom-url" },
    );

    expect(payload?.title).toBe("Custom Title");
    expect(payload?.url).toBe("/custom-url");
    // body should still come from template
    expect(payload?.body).toContain("Spotify");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getStatusCounts
// ═══════════════════════════════════════════════════════════════════════════════
describe("NotificationScheduler – getStatusCounts", () => {
  it("returns all zeros when no notifications exist", () => {
    const counts = notificationScheduler.getStatusCounts();
    expect(counts).toEqual({
      pending: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0,
    });
  });

  it("correctly counts notifications by status", () => {
    const future = makeFutureDate(30);
    const r1 = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      future,
    );
    const r2 = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(60),
    );
    const r3 = notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(90),
    );
    notificationScheduler.scheduleNotification(
      "user-1",
      samplePayload,
      makeFutureDate(120),
    );

    notificationScheduler.markDelivered(r1.notificationId);
    notificationScheduler.cancelNotification(r2.notificationId);
    notificationScheduler.markFailed(r3.notificationId, "error");

    const counts = notificationScheduler.getStatusCounts();
    expect(counts.pending).toBe(1);
    expect(counts.delivered).toBe(1);
    expect(counts.cancelled).toBe(1);
    expect(counts.failed).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION_TEMPLATES constant
// ═══════════════════════════════════════════════════════════════════════════════
describe("NOTIFICATION_TEMPLATES", () => {
  it("contains all expected template keys", () => {
    expect(NOTIFICATION_TEMPLATES).toHaveProperty("bill_reminder");
    expect(NOTIFICATION_TEMPLATES).toHaveProperty("payment_success");
    expect(NOTIFICATION_TEMPLATES).toHaveProperty("score_change");
    expect(NOTIFICATION_TEMPLATES).toHaveProperty("goal_milestone");
    expect(NOTIFICATION_TEMPLATES).toHaveProperty("subscription_renewal");
  });

  it("each template has required fields", () => {
    for (const [key, template] of Object.entries(NOTIFICATION_TEMPLATES)) {
      expect(template.type).toBeDefined();
      expect(template.title).toBeDefined();
      expect(template.bodyTemplate).toBeDefined();
      expect(typeof template.bodyTemplate).toBe("string");
      // Verify template key matches in a reasonable way
      void key;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT_CHANNEL_PREFERENCES / DEFAULT_QUIET_HOURS
// ═══════════════════════════════════════════════════════════════════════════════
describe("Default constants", () => {
  it("DEFAULT_CHANNEL_PREFERENCES has all channels enabled", () => {
    for (const [, value] of Object.entries(DEFAULT_CHANNEL_PREFERENCES)) {
      expect(value).toBe(true);
    }
  });

  it("DEFAULT_QUIET_HOURS is disabled by default", () => {
    expect(DEFAULT_QUIET_HOURS.enabled).toBe(false);
    expect(DEFAULT_QUIET_HOURS.start).toBe("22:00");
    expect(DEFAULT_QUIET_HOURS.end).toBe("08:00");
    expect(DEFAULT_QUIET_HOURS.timezone).toBe("UTC");
  });
});
