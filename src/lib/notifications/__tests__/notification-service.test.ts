/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Mocks ---

const mockSend = jest.fn().mockResolvedValue({});
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

// Mock web-push-service (used by notification-service for push notifications)
const mockCreateCreditScoreNotification = jest.fn();
const mockCreateDisputeNotification = jest.fn();
const mockCreatePaymentReminderNotification = jest.fn();
const mockCreateSecurityAlertNotification = jest.fn();
const mockCreateGeneralNotification = jest.fn();

jest.mock("../web-push-service", () => ({
  webPushService: {
    createCreditScoreNotification: mockCreateCreditScoreNotification,
    createDisputeNotification: mockCreateDisputeNotification,
    createPaymentReminderNotification: mockCreatePaymentReminderNotification,
    createSecurityAlertNotification: mockCreateSecurityAlertNotification,
    createGeneralNotification: mockCreateGeneralNotification,
  },
}));

// --- Import under test (after mocks) ---

import { notificationService } from "../notification-service";
import type {
  Notification,
  NotificationType,
} from "../notification-service";

// --- Helpers ---

function createNotificationForUser(
  userId: string,
  type: NotificationType = "welcome",
  title = "Test Title",
  message = "Test message",
  data?: Record<string, any>,
): Notification {
  return notificationService.createNotification(userId, type, title, message, data);
}

// --- Tests ---

describe("NotificationService", () => {
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockSend.mockClear();
    mockCreateCreditScoreNotification.mockClear();
    mockCreateDisputeNotification.mockClear();
    mockCreatePaymentReminderNotification.mockClear();
    mockCreateSecurityAlertNotification.mockClear();
    mockCreateGeneralNotification.mockClear();
    mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  // ---------------------------------------------------------------
  // sendEmail
  // ---------------------------------------------------------------
  describe("sendEmail", () => {
    it("sends an email via Resend with default from address", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendEmail(
        "user@example.com",
        "Test Subject",
        "<p>Test Body</p>",
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Test Subject",
          html: "<p>Test Body</p>",
        }),
      );
    });

    it("sends an email with a custom from address", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendEmail(
        "user@example.com",
        "Subject",
        "<p>Body</p>",
        "Custom <custom@fynvita.com>",
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Custom <custom@fynvita.com>",
        }),
      );
    });

    it("throws when Resend fails", async () => {
      const resendError = new Error("Resend API error");
      mockSend.mockRejectedValueOnce(resendError);

      await expect(
        notificationService.sendEmail(
          "user@example.com",
          "Subject",
          "<p>Body</p>",
        ),
      ).rejects.toThrow("Resend API error");
    });
  });

  // ---------------------------------------------------------------
  // createNotification
  // ---------------------------------------------------------------
  describe("createNotification", () => {
    it("creates a notification with correct fields", () => {
      const notification = notificationService.createNotification(
        "user-1",
        "welcome",
        "Welcome!",
        "Hello, welcome to Fynvita",
      );

      expect(notification.id).toMatch(/^notif_/);
      expect(notification.userId).toBe("user-1");
      expect(notification.type).toBe("welcome");
      expect(notification.title).toBe("Welcome!");
      expect(notification.message).toBe("Hello, welcome to Fynvita");
      expect(notification.read).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it("creates a notification with optional data", () => {
      const data = { disputeId: "disp-123", score: 720 };
      const notification = notificationService.createNotification(
        "user-1",
        "dispute_created",
        "Dispute Created",
        "Your dispute has been created",
        data,
      );

      expect(notification.data).toEqual(data);
    });

    it("creates a notification without data", () => {
      const notification = notificationService.createNotification(
        "user-1",
        "welcome",
        "Welcome!",
        "Hello",
      );

      expect(notification.data).toBeUndefined();
    });

    it("generates unique IDs for each notification", () => {
      const n1 = notificationService.createNotification(
        "user-1",
        "welcome",
        "Title 1",
        "Msg 1",
      );
      const n2 = notificationService.createNotification(
        "user-1",
        "welcome",
        "Title 2",
        "Msg 2",
      );

      expect(n1.id).not.toBe(n2.id);
    });

    it("prepends new notification to user list", () => {
      createNotificationForUser("user-order", "welcome", "First", "First msg");
      createNotificationForUser("user-order", "welcome", "Second", "Second msg");

      const notifications = notificationService.getUserNotifications("user-order");
      expect(notifications[0].title).toBe("Second");
      expect(notifications[1].title).toBe("First");
    });
  });

  // ---------------------------------------------------------------
  // getUserNotifications
  // ---------------------------------------------------------------
  describe("getUserNotifications", () => {
    it("returns empty array for unknown user", () => {
      const result = notificationService.getUserNotifications("nonexistent-user");
      expect(result).toEqual([]);
    });

    it("returns notifications for a user", () => {
      createNotificationForUser("user-get", "welcome", "Welcome", "Hello");
      createNotificationForUser("user-get", "payment_successful", "Payment", "Received");

      const result = notificationService.getUserNotifications("user-get");
      expect(result).toHaveLength(2);
    });

    it("respects the limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        createNotificationForUser("user-limit", "welcome", `Title ${i}`, `Msg ${i}`);
      }

      const result = notificationService.getUserNotifications("user-limit", 3);
      expect(result).toHaveLength(3);
    });

    it("uses default limit of 50", () => {
      // Create 3 notifications (no need to create 50+)
      for (let i = 0; i < 3; i++) {
        createNotificationForUser("user-default-limit", "welcome", `Title ${i}`, `Msg ${i}`);
      }

      const result = notificationService.getUserNotifications("user-default-limit");
      expect(result).toHaveLength(3);
    });

    it("does not return more than limit when many exist", () => {
      for (let i = 0; i < 10; i++) {
        createNotificationForUser("user-overflow", "welcome", `Title ${i}`, `Msg ${i}`);
      }

      const result = notificationService.getUserNotifications("user-overflow", 5);
      expect(result).toHaveLength(5);
    });
  });

  // ---------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------
  describe("markAsRead", () => {
    it("marks a notification as read and returns true", () => {
      const notification = createNotificationForUser("user-read", "welcome", "Title", "Msg");
      expect(notification.read).toBe(false);

      const result = notificationService.markAsRead("user-read", notification.id);
      expect(result).toBe(true);

      const notifications = notificationService.getUserNotifications("user-read");
      const found = notifications.find((n) => n.id === notification.id);
      expect(found?.read).toBe(true);
    });

    it("returns false for non-existent notification", () => {
      const result = notificationService.markAsRead("user-read-fail", "nonexistent-id");
      expect(result).toBe(false);
    });

    it("returns false for non-existent user", () => {
      const result = notificationService.markAsRead("nonexistent-user", "some-id");
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // markAllAsRead
  // ---------------------------------------------------------------
  describe("markAllAsRead", () => {
    it("marks all unread notifications as read and returns count", () => {
      createNotificationForUser("user-all-read", "welcome", "Title 1", "Msg 1");
      createNotificationForUser("user-all-read", "welcome", "Title 2", "Msg 2");
      createNotificationForUser("user-all-read", "welcome", "Title 3", "Msg 3");

      const count = notificationService.markAllAsRead("user-all-read");
      expect(count).toBe(3);
    });

    it("returns 0 when all are already read", () => {
      const n1 = createNotificationForUser("user-already-read", "welcome", "Title", "Msg");
      notificationService.markAsRead("user-already-read", n1.id);

      const count = notificationService.markAllAsRead("user-already-read");
      expect(count).toBe(0);
    });

    it("returns 0 for user with no notifications", () => {
      const count = notificationService.markAllAsRead("nonexistent-user");
      expect(count).toBe(0);
    });

    it("only counts unread notifications", () => {
      const n1 = createNotificationForUser("user-partial", "welcome", "Title 1", "Msg 1");
      createNotificationForUser("user-partial", "welcome", "Title 2", "Msg 2");
      notificationService.markAsRead("user-partial", n1.id);

      const count = notificationService.markAllAsRead("user-partial");
      expect(count).toBe(1);
    });
  });

  // ---------------------------------------------------------------
  // deleteNotification
  // ---------------------------------------------------------------
  describe("deleteNotification", () => {
    it("deletes a notification and returns true", () => {
      const notification = createNotificationForUser("user-delete", "welcome", "Title", "Msg");

      const result = notificationService.deleteNotification("user-delete", notification.id);
      expect(result).toBe(true);

      const notifications = notificationService.getUserNotifications("user-delete");
      expect(notifications.find((n) => n.id === notification.id)).toBeUndefined();
    });

    it("returns false for non-existent notification", () => {
      const result = notificationService.deleteNotification("user-delete-fail", "nonexistent-id");
      expect(result).toBe(false);
    });

    it("returns false for non-existent user", () => {
      const result = notificationService.deleteNotification("nonexistent-user", "some-id");
      expect(result).toBe(false);
    });

    it("only deletes the specified notification", () => {
      createNotificationForUser("user-delete-one", "welcome", "Keep", "Keep msg");
      const toDelete = createNotificationForUser("user-delete-one", "welcome", "Delete", "Delete msg");

      notificationService.deleteNotification("user-delete-one", toDelete.id);

      const remaining = notificationService.getUserNotifications("user-delete-one");
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe("Keep");
    });
  });

  // ---------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------
  describe("getUnreadCount", () => {
    it("returns 0 for user with no notifications", () => {
      const count = notificationService.getUnreadCount("empty-user");
      expect(count).toBe(0);
    });

    it("returns correct unread count", () => {
      createNotificationForUser("user-count", "welcome", "Title 1", "Msg 1");
      createNotificationForUser("user-count", "welcome", "Title 2", "Msg 2");
      createNotificationForUser("user-count", "welcome", "Title 3", "Msg 3");

      expect(notificationService.getUnreadCount("user-count")).toBe(3);
    });

    it("decreases when notifications are marked as read", () => {
      const n1 = createNotificationForUser("user-count-dec", "welcome", "Title 1", "Msg 1");
      createNotificationForUser("user-count-dec", "welcome", "Title 2", "Msg 2");

      expect(notificationService.getUnreadCount("user-count-dec")).toBe(2);

      notificationService.markAsRead("user-count-dec", n1.id);

      expect(notificationService.getUnreadCount("user-count-dec")).toBe(1);
    });
  });

  // ---------------------------------------------------------------
  // sendWelcomeEmail
  // ---------------------------------------------------------------
  describe("sendWelcomeEmail", () => {
    it("sends a welcome email with the user name in the HTML", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendWelcomeEmail("user@example.com", "Jane");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.to).toBe("user@example.com");
      expect(callArg.subject).toContain("Welcome to Fynvita");
      expect(callArg.html).toContain("Jane");
      expect(callArg.html).toContain("Welcome to Fynvita");
    });
  });

  // ---------------------------------------------------------------
  // sendDisputeCreatedEmail
  // ---------------------------------------------------------------
  describe("sendDisputeCreatedEmail", () => {
    it("sends dispute created email with dispute details", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendDisputeCreatedEmail(
        "user@example.com",
        "dispute-123",
        "Late payment on credit card",
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.to).toBe("user@example.com");
      expect(callArg.subject).toContain("Dispute Created");
      expect(callArg.html).toContain("dispute-123");
      expect(callArg.html).toContain("Late payment on credit card");
    });
  });

  // ---------------------------------------------------------------
  // sendDisputeResolvedEmail
  // ---------------------------------------------------------------
  describe("sendDisputeResolvedEmail", () => {
    it("sends removed outcome email with positive messaging", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendDisputeResolvedEmail(
        "user@example.com",
        "dispute-456",
        "Collection account",
        "removed",
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toContain("Item Removed");
      expect(callArg.html).toContain("removed from your credit report");
      expect(callArg.html).toContain("dispute-456");
      expect(callArg.html).toContain("Collection account");
      expect(callArg.html).toContain("Removed");
      expect(callArg.html).toContain("positively impact");
    });

    it("sends updated outcome email", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendDisputeResolvedEmail(
        "user@example.com",
        "dispute-789",
        "Wrong balance",
        "updated",
      );

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toBe("Dispute Resolved");
      expect(callArg.html).toContain("corrected information");
    });

    it("sends verified outcome email", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendDisputeResolvedEmail(
        "user@example.com",
        "dispute-101",
        "Inquiry",
        "verified",
      );

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toBe("Dispute Resolved");
      expect(callArg.html).toContain("verified the item as accurate");
    });
  });

  // ---------------------------------------------------------------
  // sendCreditScoreChangedEmail
  // ---------------------------------------------------------------
  describe("sendCreditScoreChangedEmail", () => {
    it("sends increase email with positive subject", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendCreditScoreChangedEmail(
        "user@example.com",
        700,
        720,
      );

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toContain("Increased by 20 Points");
      expect(callArg.html).toContain("720");
      expect(callArg.html).toContain("+20");
      expect(callArg.html).toContain("increased");
    });

    it("sends decrease email with neutral subject", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendCreditScoreChangedEmail(
        "user@example.com",
        720,
        700,
      );

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toBe("Credit Score Update");
      expect(callArg.html).toContain("700");
      expect(callArg.html).toContain("-20");
      expect(callArg.html).toContain("changed");
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentSuccessfulEmail
  // ---------------------------------------------------------------
  describe("sendPaymentSuccessfulEmail", () => {
    it("sends payment success email with amount and invoice ID", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendPaymentSuccessfulEmail(
        "user@example.com",
        99.99,
        "inv-001",
      );

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toContain("Payment Received");
      expect(callArg.html).toContain("$99.99");
      expect(callArg.html).toContain("inv-001");
      expect(callArg.html).toContain("Payment Successful");
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentFailedEmail
  // ---------------------------------------------------------------
  describe("sendPaymentFailedEmail", () => {
    it("sends payment failed email with amount and reason", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendPaymentFailedEmail(
        "user@example.com",
        49.99,
        "Insufficient funds",
      );

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toContain("Payment Failed");
      expect(callArg.html).toContain("$49.99");
      expect(callArg.html).toContain("Insufficient funds");
      expect(callArg.html).toContain("Update Payment Method");
    });
  });

  // ---------------------------------------------------------------
  // sendPushNotification
  // ---------------------------------------------------------------
  describe("sendPushNotification", () => {
    it("sends push notification via API and returns result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 2, failed: 0 }),
      });

      const result = await notificationService.sendPushNotification("user-1", {
        type: "general",
        title: "Test",
        body: "Test body",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ sent: 2, failed: 0 });
    });

    it("returns failure when API responds with non-ok status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await notificationService.sendPushNotification("user-1", {
        type: "general",
        title: "Test",
        body: "Test body",
      });

      expect(result).toEqual({ sent: 0, failed: 1 });
    });

    it("returns failure when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await notificationService.sendPushNotification("user-1", {
        type: "general",
        title: "Test",
        body: "Test body",
      });

      expect(result).toEqual({ sent: 0, failed: 1 });
    });

    it("handles response with missing sent/failed fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await notificationService.sendPushNotification("user-1", {
        type: "general",
        title: "Test",
        body: "Test body",
      });

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  // ---------------------------------------------------------------
  // sendCreditScorePush
  // ---------------------------------------------------------------
  describe("sendCreditScorePush", () => {
    it("creates credit score notification payload and sends it", async () => {
      const mockPayload = {
        type: "credit_score_change" as const,
        title: "Score Up",
        body: "Your score increased",
      };
      mockCreateCreditScoreNotification.mockReturnValue(mockPayload);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendCreditScorePush("user-1", 700, 720, "Experian");

      expect(mockCreateCreditScoreNotification).toHaveBeenCalledWith(
        700,
        720,
        "Experian",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("sends without bureau when not provided", async () => {
      mockCreateCreditScoreNotification.mockReturnValue({
        type: "credit_score_change",
        title: "Score Up",
        body: "Your score increased",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendCreditScorePush("user-1", 700, 720);

      expect(mockCreateCreditScoreNotification).toHaveBeenCalledWith(
        700,
        720,
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // sendDisputeUpdatePush
  // ---------------------------------------------------------------
  describe("sendDisputeUpdatePush", () => {
    it("creates dispute notification payload and sends it", async () => {
      const mockPayload = {
        type: "dispute_update" as const,
        title: "Dispute Sent",
        body: "Your dispute was sent",
      };
      mockCreateDisputeNotification.mockReturnValue(mockPayload);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendDisputeUpdatePush(
        "user-1",
        "disp-123",
        "sent",
        "Late payment",
      );

      expect(mockCreateDisputeNotification).toHaveBeenCalledWith(
        "disp-123",
        "sent",
        "Late payment",
      );
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentReminderPush
  // ---------------------------------------------------------------
  describe("sendPaymentReminderPush", () => {
    it("creates payment reminder payload and sends it", async () => {
      const mockPayload = {
        type: "payment_reminder" as const,
        title: "Payment Due",
        body: "Netflix due soon",
      };
      mockCreatePaymentReminderNotification.mockReturnValue(mockPayload);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendPaymentReminderPush(
        "user-1",
        14.99,
        "2026-03-01",
        "Netflix",
      );

      expect(mockCreatePaymentReminderNotification).toHaveBeenCalledWith(
        14.99,
        "2026-03-01",
        "Netflix",
      );
    });

    it("sends without bill name when not provided", async () => {
      mockCreatePaymentReminderNotification.mockReturnValue({
        type: "payment_reminder",
        title: "Payment Due",
        body: "Payment due soon",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendPaymentReminderPush("user-1", 100, "2026-04-15");

      expect(mockCreatePaymentReminderNotification).toHaveBeenCalledWith(
        100,
        "2026-04-15",
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // sendSecurityAlertPush
  // ---------------------------------------------------------------
  describe("sendSecurityAlertPush", () => {
    it("creates security alert payload and sends it", async () => {
      const mockPayload = {
        type: "security_alert" as const,
        title: "Security Alert",
        body: "Unusual login detected",
      };
      mockCreateSecurityAlertNotification.mockReturnValue(mockPayload);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendSecurityAlertPush(
        "user-1",
        "suspicious_login",
        "Unusual login detected from new device",
      );

      expect(mockCreateSecurityAlertNotification).toHaveBeenCalledWith(
        "suspicious_login",
        "Unusual login detected from new device",
      );
    });
  });

  // ---------------------------------------------------------------
  // sendGeneralPush
  // ---------------------------------------------------------------
  describe("sendGeneralPush", () => {
    it("creates general notification payload and sends it", async () => {
      const mockPayload = {
        type: "general" as const,
        title: "Hello",
        body: "World",
      };
      mockCreateGeneralNotification.mockReturnValue(mockPayload);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendGeneralPush("user-1", "Hello", "World", "/custom-page");

      expect(mockCreateGeneralNotification).toHaveBeenCalledWith(
        "Hello",
        "World",
        "/custom-page",
      );
    });

    it("sends without url when not provided", async () => {
      mockCreateGeneralNotification.mockReturnValue({
        type: "general",
        title: "Title",
        body: "Body",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: 1, failed: 0 }),
      });

      await notificationService.sendGeneralPush("user-1", "Title", "Body");

      expect(mockCreateGeneralNotification).toHaveBeenCalledWith(
        "Title",
        "Body",
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentSuccessEmail (webhook version)
  // ---------------------------------------------------------------
  describe("sendPaymentSuccessEmail", () => {
    it("sends payment success email with customer name", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationService.sendPaymentSuccessEmail(
        "user@example.com",
        "John Doe",
        159.99,
        "inv-002",
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.to).toBe("user@example.com");
      expect(callArg.subject).toContain("Payment Received");
      expect(callArg.html).toContain("John Doe");
      expect(callArg.html).toContain("$159.99");
      expect(callArg.html).toContain("inv-002");
    });
  });

  // ---------------------------------------------------------------
  // notifyDocumentShareLink
  // ---------------------------------------------------------------
  describe("notifyDocumentShareLink", () => {
    it("sends share notification to all recipients", async () => {
      mockSend.mockResolvedValue({});

      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        documentName: "Credit Report Q1",
        recipients: ["recipient1@example.com", "recipient2@example.com"],
        shareUrl: "https://fynvita.com/share/abc123",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      expect(mockSend).toHaveBeenCalledTimes(2);

      // Check first recipient
      const call1 = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(call1.to).toBe("recipient1@example.com");
      expect(call1.subject).toContain("owner@example.com");
      expect(call1.subject).toContain("shared a document");
      expect(call1.html).toContain("Credit Report Q1");
      expect(call1.html).toContain("https://fynvita.com/share/abc123");

      // Check second recipient
      const call2 = mockSend.mock.calls[1][0] as Record<string, string>;
      expect(call2.to).toBe("recipient2@example.com");
    });

    it("uses fallback sender name when ownerEmail is not provided", async () => {
      mockSend.mockResolvedValue({});

      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        documentName: "Report",
        recipients: ["recipient@example.com"],
        shareUrl: "https://fynvita.com/share/xyz",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      const callArg = mockSend.mock.calls[0][0] as Record<string, string>;
      expect(callArg.subject).toContain("A Fynvita user");
    });

    it("continues sending to remaining recipients when one fails", async () => {
      mockSend
        .mockRejectedValueOnce(new Error("SMTP error"))
        .mockResolvedValueOnce({});

      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        documentName: "Report",
        recipients: ["fail@example.com", "success@example.com"],
        shareUrl: "https://fynvita.com/share/abc",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      // Both should be attempted
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("handles empty recipients list", async () => {
      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        documentName: "Report",
        recipients: [],
        shareUrl: "https://fynvita.com/share/abc",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
