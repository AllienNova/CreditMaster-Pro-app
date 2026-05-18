/**
 * @jest-environment node
 *
 * NTF-5 / FND-045: Verify that user-controlled values are HTML-escaped in
 * email templates before interpolation.
 *
 * Each test builds a known-XSS payload, calls the template method, and asserts
 * the rendered HTML contains the escaped form — never an unescaped live tag.
 */

// --- Mocks ---

const mockSend = jest.fn().mockResolvedValue({});
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock("../web-push-service", () => ({
  webPushService: {
    createCreditScoreNotification: jest.fn(),
    createDisputeNotification: jest.fn(),
    createPaymentReminderNotification: jest.fn(),
    createSecurityAlertNotification: jest.fn(),
    createGeneralNotification: jest.fn(),
  },
}));

// --- Import under test (after mocks) ---

import { notificationService } from "../notification-service";

// --- Helpers ---

/** Returns the html string from the most recent mockSend call. */
function captureHtml(): string {
  const call = mockSend.mock.calls[mockSend.mock.calls.length - 1][0] as Record<
    string,
    string
  >;
  return call.html;
}

// --- Tests ---

describe("NotificationService — HTML escaping (FND-045 / NTF-5)", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockSend.mockResolvedValue({});
  });

  // ---------------------------------------------------------------
  // sendWelcomeEmail — name
  // ---------------------------------------------------------------
  describe("sendWelcomeEmail", () => {
    it("escapes <script> in user name", async () => {
      await notificationService.sendWelcomeEmail(
        "user@example.com",
        '<script>alert("xss")</script>',
      );

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes <img onerror=…> in user name", async () => {
      await notificationService.sendWelcomeEmail(
        "user@example.com",
        '<img src=x onerror=alert(1)>',
      );

      const html = captureHtml();
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });
  });

  // ---------------------------------------------------------------
  // sendDisputeCreatedEmail — itemDescription
  // ---------------------------------------------------------------
  describe("sendDisputeCreatedEmail", () => {
    it("escapes <script> in itemDescription", async () => {
      await notificationService.sendDisputeCreatedEmail(
        "user@example.com",
        "dispute-abc",
        '<script>document.cookie</script>',
      );

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes <img onerror=…> in itemDescription", async () => {
      await notificationService.sendDisputeCreatedEmail(
        "user@example.com",
        "dispute-abc",
        '<img src=x onerror=alert(1)>',
      );

      const html = captureHtml();
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });
  });

  // ---------------------------------------------------------------
  // sendDisputeResolvedEmail — itemDescription
  // ---------------------------------------------------------------
  describe("sendDisputeResolvedEmail", () => {
    it("escapes <script> in itemDescription (removed outcome)", async () => {
      await notificationService.sendDisputeResolvedEmail(
        "user@example.com",
        "dispute-abc",
        '<script>alert("xss")</script>',
        "removed",
      );

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes <img onerror=…> in itemDescription (updated outcome)", async () => {
      await notificationService.sendDisputeResolvedEmail(
        "user@example.com",
        "dispute-abc",
        '<img src=x onerror=alert(1)>',
        "updated",
      );

      const html = captureHtml();
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentFailedEmail — reason
  // ---------------------------------------------------------------
  describe("sendPaymentFailedEmail", () => {
    it("escapes <script> in payment failure reason", async () => {
      await notificationService.sendPaymentFailedEmail(
        "user@example.com",
        49.99,
        '<script>alert("xss")</script>',
      );

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes <img onerror=…> in payment failure reason", async () => {
      await notificationService.sendPaymentFailedEmail(
        "user@example.com",
        49.99,
        '<img src=x onerror=alert(1)>',
      );

      const html = captureHtml();
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentSuccessEmail — customerName
  // ---------------------------------------------------------------
  describe("sendPaymentSuccessEmail", () => {
    it("escapes <script> in customerName", async () => {
      await notificationService.sendPaymentSuccessEmail(
        "user@example.com",
        '<script>alert("xss")</script>',
        99.99,
        "inv-001",
      );

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes <img onerror=…> in customerName", async () => {
      await notificationService.sendPaymentSuccessEmail(
        "user@example.com",
        '<img src=x onerror=alert(1)>',
        99.99,
        "inv-001",
      );

      const html = captureHtml();
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });
  });

  // ---------------------------------------------------------------
  // notifyDocumentShareLink — documentName and senderName
  // ---------------------------------------------------------------
  describe("notifyDocumentShareLink", () => {
    it("escapes <script> in documentName", async () => {
      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        documentName: '<script>alert("xss")</script>',
        recipients: ["recipient@example.com"],
        shareUrl: "https://fynvita.com/share/abc",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes <img onerror=…> in documentName", async () => {
      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        documentName: '<img src=x onerror=alert(1)>',
        recipients: ["recipient@example.com"],
        shareUrl: "https://fynvita.com/share/abc",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      const html = captureHtml();
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });

    it("escapes <script> in senderName (ownerEmail)", async () => {
      await notificationService.notifyDocumentShareLink({
        ownerUserId: "owner-1",
        ownerEmail: '<script>alert(1)</script>@evil.com',
        documentName: "My Report",
        recipients: ["recipient@example.com"],
        shareUrl: "https://fynvita.com/share/abc",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      });

      const html = captureHtml();
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });
});
