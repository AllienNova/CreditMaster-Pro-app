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
