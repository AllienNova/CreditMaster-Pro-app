/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// --- Environment setup (before imports that read env) ---

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";

// --- Mocks ---

const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn().mockResolvedValue({} as never);

jest.mock("web-push", () => ({
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

// --- Import under test (after mocks and env setup) ---

import {
  webPushService,
  type PushSubscription,
  type PushNotificationPayload,
} from "../web-push-service";

// --- Helpers ---

const makeSub = (overrides?: Partial<PushSubscription>): PushSubscription => ({
  id: "sub-1",
  userId: "user-1",
  endpoint: "https://push.example.com/sub1",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
  userAgent: "TestBrowser/1.0",
  createdAt: new Date("2026-01-01"),
  lastUsed: new Date("2026-02-01"),
  isActive: true,
  ...overrides,
});

const samplePayload: PushNotificationPayload = {
  type: "general",
  title: "Test Title",
  body: "Test body",
};

// --- Tests ---

describe("WebPushService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification.mockResolvedValue({} as never);
  });

  // ---------------------------------------------------------------
  // getPublicKey
  // ---------------------------------------------------------------
  describe("getPublicKey", () => {
    it("returns the VAPID public key from environment", () => {
      const key = webPushService.getPublicKey();
      expect(key).toBe("test-public-key");
    });
  });

  // ---------------------------------------------------------------
  // isEnabled
  // ---------------------------------------------------------------
  describe("isEnabled", () => {
    it("returns true when VAPID keys are configured", () => {
      expect(webPushService.isEnabled()).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // sendNotification
  // ---------------------------------------------------------------
  describe("sendNotification", () => {
    it("sends a push notification and returns success", async () => {
      const sub = makeSub();
      const result = await webPushService.sendNotification(sub, samplePayload);

      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      const [pushSub, payloadStr] = mockSendNotification.mock.calls[0] as [
        any,
        string,
      ];
      expect(pushSub).toEqual({
        endpoint: sub.endpoint,
        keys: sub.keys,
      });

      const parsed = JSON.parse(payloadStr);
      expect(parsed.title).toBe("Test Title");
      expect(parsed.body).toBe("Test body");
      expect(parsed.icon).toBe("/icons/icon-192x192.png");
      expect(parsed.badge).toBe("/icons/badge-72x72.png");
      expect(parsed.timestamp).toBeDefined();

      expect(result).toEqual({
        success: true,
        subscriptionId: "sub-1",
      });
    });

    it("uses payload icon/badge when provided", async () => {
      const sub = makeSub();
      const payload: PushNotificationPayload = {
        ...samplePayload,
        icon: "/custom-icon.png",
        badge: "/custom-badge.png",
      };

      await webPushService.sendNotification(sub, payload);

      const payloadStr = mockSendNotification.mock.calls[0][1] as string;
      const parsed = JSON.parse(payloadStr);
      expect(parsed.icon).toBe("/custom-icon.png");
      expect(parsed.badge).toBe("/custom-badge.png");
    });

    it("returns failure with error message on send error", async () => {
      mockSendNotification.mockRejectedValueOnce(
        new Error("Network error") as never,
      );

      const sub = makeSub();
      const result = await webPushService.sendNotification(sub, samplePayload);

      expect(result).toEqual({
        success: false,
        subscriptionId: "sub-1",
        error: "Network error",
      });
    });

    it("returns subscription_expired error for expired subscriptions", async () => {
      const expiredError = new Error("Push subscription expired");
      mockSendNotification.mockRejectedValueOnce(expiredError as never);

      const sub = makeSub();
      const result = await webPushService.sendNotification(sub, samplePayload);

      expect(result).toEqual({
        success: false,
        subscriptionId: "sub-1",
        error: "subscription_expired",
      });
    });

    it("returns subscription_expired for unsubscribed error", async () => {
      const error = new Error("Endpoint unsubscribed");
      mockSendNotification.mockRejectedValueOnce(error as never);

      const sub = makeSub();
      const result = await webPushService.sendNotification(sub, samplePayload);

      expect(result.error).toBe("subscription_expired");
    });

    it("returns subscription_expired for 410 status code", async () => {
      const error: any = new Error("Gone");
      error.statusCode = 410;
      mockSendNotification.mockRejectedValueOnce(error as never);

      const sub = makeSub();
      const result = await webPushService.sendNotification(sub, samplePayload);

      expect(result.error).toBe("subscription_expired");
    });

    it("returns Unknown error for non-Error throw", async () => {
      mockSendNotification.mockRejectedValueOnce("string-error" as never);

      const sub = makeSub();
      const result = await webPushService.sendNotification(sub, samplePayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("returns failure when VAPID keys are not configured", async () => {
      // Use isolateModules to get a fresh module instance without VAPID keys
      const envBackup = { ...process.env };
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      let unconfiguredService: any;
      jest.isolateModules(() => {
        // Re-require to pick up empty env vars
        unconfiguredService = require("../web-push-service").webPushService;
      });

      const sub = makeSub();
      const result = await unconfiguredService.sendNotification(sub, samplePayload);

      expect(result).toEqual({
        success: false,
        subscriptionId: "sub-1",
        error: "Web Push not configured",
      });

      // Restore env
      process.env = envBackup;
    });
  });

  // ---------------------------------------------------------------
  // sendToMultiple
  // ---------------------------------------------------------------
  describe("sendToMultiple", () => {
    it("sends to all subscriptions and returns results array", async () => {
      const sub1 = makeSub({ id: "sub-1" });
      const sub2 = makeSub({ id: "sub-2", endpoint: "https://push.example.com/sub2" });

      const results = await webPushService.sendToMultiple(
        [sub1, sub2],
        samplePayload,
      );

      expect(mockSendNotification).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].subscriptionId).toBe("sub-1");
      expect(results[1].success).toBe(true);
      expect(results[1].subscriptionId).toBe("sub-2");
    });

    it("returns empty array for empty subscriptions", async () => {
      const results = await webPushService.sendToMultiple([], samplePayload);

      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it("includes failures alongside successes", async () => {
      mockSendNotification
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error("fail") as never);

      const sub1 = makeSub({ id: "sub-1" });
      const sub2 = makeSub({ id: "sub-2" });

      const results = await webPushService.sendToMultiple(
        [sub1, sub2],
        samplePayload,
      );

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // sendToUser
  // ---------------------------------------------------------------
  describe("sendToUser", () => {
    it("returns sent/failed/expiredSubscriptions summary", async () => {
      mockSendNotification
        .mockResolvedValueOnce({} as never) // sub-1 succeeds
        .mockRejectedValueOnce(new Error("expired") as never) // sub-2 expires
        .mockRejectedValueOnce(new Error("network failure") as never); // sub-3 fails

      const subs = [
        makeSub({ id: "sub-1" }),
        makeSub({ id: "sub-2" }),
        makeSub({ id: "sub-3" }),
      ];

      const result = await webPushService.sendToUser(subs, samplePayload);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.expiredSubscriptions).toContain("sub-2");
      expect(result.expiredSubscriptions).not.toContain("sub-3");
    });

    it("returns all zeros for empty subscriptions", async () => {
      const result = await webPushService.sendToUser([], samplePayload);

      expect(result).toEqual({
        sent: 0,
        failed: 0,
        expiredSubscriptions: [],
      });
    });

    it("returns all sent when everything succeeds", async () => {
      const subs = [makeSub({ id: "sub-1" }), makeSub({ id: "sub-2" })];
      const result = await webPushService.sendToUser(subs, samplePayload);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.expiredSubscriptions).toEqual([]);
    });
  });

  // ---------------------------------------------------------------
  // createCreditScoreNotification
  // ---------------------------------------------------------------
  describe("createCreditScoreNotification", () => {
    it("creates increase notification with correct title and body", () => {
      const payload = webPushService.createCreditScoreNotification(700, 720);

      expect(payload.type).toBe("credit_score_change");
      expect(payload.title).toBe("Credit Score Up 20 Points!");
      expect(payload.body).toContain("increased to 720");
      expect(payload.requireInteraction).toBe(true);
      expect(payload.tag).toBe("credit-score");
      expect(payload.url).toBe("/dashboard");
      expect(payload.data).toEqual({ oldScore: 700, newScore: 720, bureau: undefined });
    });

    it("creates decrease notification with correct title and body", () => {
      const payload = webPushService.createCreditScoreNotification(720, 700);

      expect(payload.title).toBe("Credit Score Update");
      expect(payload.body).toContain("now 700");
      expect(payload.body).toContain("-20 points");
      expect(payload.requireInteraction).toBe(false);
    });

    it("includes bureau name when provided", () => {
      const payload = webPushService.createCreditScoreNotification(
        700,
        730,
        "Experian",
      );

      expect(payload.body).toContain("Experian");
      expect(payload.data).toEqual({
        oldScore: 700,
        newScore: 730,
        bureau: "Experian",
      });
    });

    it("uses 'credit' as default when no bureau specified", () => {
      const payload = webPushService.createCreditScoreNotification(700, 650);

      expect(payload.body).toContain("credit");
    });

    it("handles zero change", () => {
      const payload = webPushService.createCreditScoreNotification(700, 700);

      expect(payload.title).toBe("Credit Score Update");
      expect(payload.body).toContain("0 points");
    });
  });

  // ---------------------------------------------------------------
  // createDisputeNotification
  // ---------------------------------------------------------------
  describe("createDisputeNotification", () => {
    it("creates 'sent' status notification", () => {
      const payload = webPushService.createDisputeNotification(
        "disp-1",
        "sent",
        "Late payment",
      );

      expect(payload.type).toBe("dispute_update");
      expect(payload.title).toBe("Dispute Sent");
      expect(payload.body).toContain("Late payment");
      expect(payload.body).toContain("has been sent");
      expect(payload.url).toBe("/disputes/disp-1");
      expect(payload.tag).toBe("dispute-disp-1");
      expect(payload.data).toEqual({ disputeId: "disp-1", status: "sent" });
      expect(payload.actions).toEqual([
        { action: "view", title: "View Details" },
        { action: "dismiss", title: "Dismiss" },
      ]);
    });

    it("creates 'under_review' status notification", () => {
      const payload = webPushService.createDisputeNotification(
        "disp-2",
        "under_review",
        "Collection account",
      );

      expect(payload.title).toBe("Dispute Under Review");
      expect(payload.body).toContain("reviewing");
      expect(payload.body).toContain("Collection account");
    });

    it("creates 'resolved' status notification", () => {
      const payload = webPushService.createDisputeNotification(
        "disp-3",
        "resolved",
        "Wrong balance",
      );

      expect(payload.title).toBe("Dispute Resolved!");
      expect(payload.body).toContain("resolved");
      expect(payload.body).toContain("Wrong balance");
    });

    it("creates 'rejected' status notification", () => {
      const payload = webPushService.createDisputeNotification(
        "disp-4",
        "rejected",
        "Identity theft",
      );

      expect(payload.title).toBe("Dispute Update");
      expect(payload.body).toContain("requires attention");
    });

    it("creates fallback notification for unknown status", () => {
      const payload = webPushService.createDisputeNotification(
        "disp-5",
        "custom_status",
        "Some item",
      );

      expect(payload.title).toBe("Dispute Update");
      expect(payload.body).toContain("custom_status");
    });
  });

  // ---------------------------------------------------------------
  // createPaymentReminderNotification
  // ---------------------------------------------------------------
  describe("createPaymentReminderNotification", () => {
    it("creates payment reminder with bill name", () => {
      const payload = webPushService.createPaymentReminderNotification(
        49.99,
        "2026-03-01",
        "Netflix",
      );

      expect(payload.type).toBe("payment_reminder");
      expect(payload.title).toBe("Payment Due Soon");
      expect(payload.body).toContain("Netflix");
      expect(payload.body).toContain("$49.99");
      expect(payload.body).toContain("2026-03-01");
      expect(payload.url).toBe("/financial/bills");
      expect(payload.tag).toBe("payment-reminder");
      expect(payload.data).toEqual({
        amount: 49.99,
        dueDate: "2026-03-01",
        billName: "Netflix",
      });
      expect(payload.actions).toEqual([
        { action: "pay", title: "Pay Now" },
        { action: "snooze", title: "Remind Later" },
      ]);
    });

    it("creates payment reminder without bill name", () => {
      const payload = webPushService.createPaymentReminderNotification(
        100.0,
        "2026-04-15",
      );

      expect(payload.body).toContain("$100.00");
      expect(payload.body).toContain("2026-04-15");
      expect(payload.body).not.toContain("undefined");
    });
  });

  // ---------------------------------------------------------------
  // createSecurityAlertNotification
  // ---------------------------------------------------------------
  describe("createSecurityAlertNotification", () => {
    it("creates security alert notification", () => {
      const payload = webPushService.createSecurityAlertNotification(
        "suspicious_login",
        "Unusual login detected from new device",
      );

      expect(payload.type).toBe("security_alert");
      expect(payload.title).toBe("Security Alert");
      expect(payload.body).toBe("Unusual login detected from new device");
      expect(payload.url).toBe("/settings/security");
      expect(payload.tag).toBe("security-alert");
      expect(payload.data).toEqual({ alertType: "suspicious_login" });
      expect(payload.requireInteraction).toBe(true);
      expect(payload.actions).toEqual([
        { action: "review", title: "Review" },
        { action: "dismiss", title: "Dismiss" },
      ]);
    });
  });

  // ---------------------------------------------------------------
  // createGeneralNotification
  // ---------------------------------------------------------------
  describe("createGeneralNotification", () => {
    it("creates general notification with defaults", () => {
      const payload = webPushService.createGeneralNotification(
        "Hello",
        "World",
      );

      expect(payload.type).toBe("general");
      expect(payload.title).toBe("Hello");
      expect(payload.body).toBe("World");
      expect(payload.url).toBe("/dashboard");
    });

    it("uses custom url when provided", () => {
      const payload = webPushService.createGeneralNotification(
        "Title",
        "Body",
        "/custom-page",
      );

      expect(payload.url).toBe("/custom-page");
    });

    it("merges additional options", () => {
      const payload = webPushService.createGeneralNotification(
        "Title",
        "Body",
        "/page",
        {
          tag: "custom-tag",
          requireInteraction: true,
          silent: true,
        },
      );

      expect(payload.tag).toBe("custom-tag");
      expect(payload.requireInteraction).toBe(true);
      expect(payload.silent).toBe(true);
      // type, title, body should still be set
      expect(payload.type).toBe("general");
      expect(payload.title).toBe("Title");
      expect(payload.body).toBe("Body");
    });

    it("options can override type", () => {
      const payload = webPushService.createGeneralNotification(
        "Title",
        "Body",
        undefined,
        { type: "security_alert" },
      );

      expect(payload.type).toBe("security_alert");
    });
  });
});
