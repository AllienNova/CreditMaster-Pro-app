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

// Tracks the terminal response for each Supabase chain.
// Each call to getServiceRoleClient().from() produces a fresh thenable chain.
// When any point in the chain is awaited, it resolves with `mockTerminalResult`.
let mockTerminalResult: any;

function createChain(): any {
  const chain: any = {};

  // Make the chain thenable (like Supabase query builders).
  // When awaited at any chaining point, resolves to `mockTerminalResult`.
  chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) => {
    return Promise.resolve(mockTerminalResult).then(resolve, reject);
  };

  // All chaining methods return `chain` itself (which is thenable).
  chain.insert = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.single = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);

  return chain;
}

// Captures the chain created for each from() call so tests can assert on it.
let lastChain: any;

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(),
}));

// --- Import under test (after mocks) ---

import {
  notificationServiceDB,
  type Notification,
  type NotificationType,
} from "../notification-service-db";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const mockGetSupabase = getServiceRoleClient as jest.Mock;

// --- Helpers ---

const sampleRow = {
  id: "notif-1",
  user_id: "user-1",
  type: "dispute_update" as NotificationType,
  title: "Test Title",
  message: "Test message body",
  read: false,
  created_at: "2026-02-23T12:00:00.000Z",
};

const expectedNotification: Notification = {
  id: "notif-1",
  userId: "user-1",
  type: "dispute_update",
  title: "Test Title",
  message: "Test message body",
  read: false,
  createdAt: new Date("2026-02-23T12:00:00.000Z"),
};

// --- Tests ---

describe("NotificationServiceDB", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockTerminalResult = undefined;
    // Re-establish getServiceRoleClient mock (clearAllMocks would wipe it)
    mockGetSupabase.mockImplementation(() => ({
      from: jest.fn(() => {
        lastChain = createChain();
        return lastChain;
      }),
    }));
  });

  // ---------------------------------------------------------------
  // sendEmail
  // ---------------------------------------------------------------
  describe("sendEmail", () => {
    it("sends an email via Resend with default from address", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationServiceDB.sendEmail(
        "user@example.com",
        "Subject",
        "<p>Body</p>",
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Subject",
          html: "<p>Body</p>",
        }),
      );
    });

    it("sends an email with a custom from address", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationServiceDB.sendEmail(
        "user@example.com",
        "Subject",
        "<p>Body</p>",
        "Custom <custom@example.com>",
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Custom <custom@example.com>",
        }),
      );
    });

    it("throws when Resend fails", async () => {
      const resendError = new Error("Resend API error");
      mockSend.mockRejectedValueOnce(resendError);

      await expect(
        notificationServiceDB.sendEmail(
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
    it("inserts a notification and returns mapped object", async () => {
      mockTerminalResult = { data: sampleRow, error: null };

      const result = await notificationServiceDB.createNotification(
        "user-1",
        "dispute_update",
        "Test Title",
        "Test message body",
      );

      expect(lastChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          type: "dispute_update",
          title: "Test Title",
          message: "Test message body",
          read: false,
        }),
      );
      expect(lastChain.select).toHaveBeenCalled();
      expect(lastChain.single).toHaveBeenCalled();
      expect(result).toEqual(expectedNotification);
    });

    it("throws when Supabase insert fails", async () => {
      mockTerminalResult = {
        data: null,
        error: { message: "Insert failed" },
      };

      await expect(
        notificationServiceDB.createNotification(
          "user-1",
          "tip",
          "Title",
          "Body",
        ),
      ).rejects.toThrow("Failed to create notification: Insert failed");
    });
  });

  // ---------------------------------------------------------------
  // getUserNotifications
  // ---------------------------------------------------------------
  describe("getUserNotifications", () => {
    it("queries notifications with default limit and returns mapped array", async () => {
      mockTerminalResult = { data: [sampleRow], error: null };

      const result =
        await notificationServiceDB.getUserNotifications("user-1");

      expect(lastChain.select).toHaveBeenCalledWith("*");
      expect(lastChain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(lastChain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(lastChain.limit).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedNotification);
    });

    it("uses custom limit when provided", async () => {
      mockTerminalResult = { data: [], error: null };

      await notificationServiceDB.getUserNotifications("user-1", 10);

      expect(lastChain.limit).toHaveBeenCalledWith(10);
    });

    it("returns empty array when data is null", async () => {
      mockTerminalResult = { data: null, error: null };

      const result =
        await notificationServiceDB.getUserNotifications("user-1");

      expect(result).toEqual([]);
    });

    it("throws when Supabase query fails", async () => {
      mockTerminalResult = {
        data: null,
        error: { message: "Query error" },
      };

      await expect(
        notificationServiceDB.getUserNotifications("user-1"),
      ).rejects.toThrow("Failed to fetch notifications: Query error");
    });
  });

  // ---------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------
  describe("markAsRead", () => {
    it("updates read to true and returns true on success", async () => {
      mockTerminalResult = { error: null };

      const result = await notificationServiceDB.markAsRead("notif-1", "user-1");

      expect(lastChain.update).toHaveBeenCalledWith({ read: true });
      expect(lastChain.eq).toHaveBeenCalledWith("id", "notif-1");
      expect(lastChain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(result).toBe(true);
    });

    it("returns false when Supabase update fails", async () => {
      mockTerminalResult = { error: { message: "Update failed" } };

      const result = await notificationServiceDB.markAsRead("notif-1", "user-1");

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // markAllAsRead
  // ---------------------------------------------------------------
  describe("markAllAsRead", () => {
    it("updates all unread notifications and returns count", async () => {
      mockTerminalResult = {
        data: [sampleRow, { ...sampleRow, id: "notif-2" }],
        error: null,
      };

      const result = await notificationServiceDB.markAllAsRead("user-1");

      expect(lastChain.update).toHaveBeenCalledWith({ read: true });
      expect(result).toBe(2);
    });

    it("returns 0 when Supabase update fails", async () => {
      mockTerminalResult = {
        data: null,
        error: { message: "Update failed" },
      };

      const result = await notificationServiceDB.markAllAsRead("user-1");

      expect(result).toBe(0);
    });

    it("returns 0 when data is null", async () => {
      mockTerminalResult = { data: null, error: null };

      const result = await notificationServiceDB.markAllAsRead("user-1");

      expect(result).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // deleteNotification
  // ---------------------------------------------------------------
  describe("deleteNotification", () => {
    it("deletes and returns true on success", async () => {
      mockTerminalResult = { error: null };

      const result =
        await notificationServiceDB.deleteNotification("notif-1", "user-1");

      expect(lastChain.delete).toHaveBeenCalled();
      expect(lastChain.eq).toHaveBeenCalledWith("id", "notif-1");
      expect(lastChain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(result).toBe(true);
    });

    it("returns false when Supabase delete fails", async () => {
      mockTerminalResult = { error: { message: "Delete failed" } };

      const result =
        await notificationServiceDB.deleteNotification("notif-1", "user-1");

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------
  describe("getUnreadCount", () => {
    it("returns the unread count", async () => {
      mockTerminalResult = { count: 5, error: null };

      const result = await notificationServiceDB.getUnreadCount("user-1");

      expect(lastChain.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });
      expect(result).toBe(5);
    });

    it("returns 0 when count is null", async () => {
      mockTerminalResult = { count: null, error: null };

      const result = await notificationServiceDB.getUnreadCount("user-1");

      expect(result).toBe(0);
    });

    it("returns 0 when Supabase query fails", async () => {
      mockTerminalResult = {
        count: null,
        error: { message: "Count error" },
      };

      const result = await notificationServiceDB.getUnreadCount("user-1");

      expect(result).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // sendWelcomeEmail
  // ---------------------------------------------------------------
  describe("sendWelcomeEmail", () => {
    it("sends a welcome email with the user name in the HTML", async () => {
      mockSend.mockResolvedValueOnce({});

      await notificationServiceDB.sendWelcomeEmail(
        "user@example.com",
        "Jane",
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as any;
      expect(callArg.to).toBe("user@example.com");
      expect(callArg.subject).toBe("Welcome to Fynvita!");
      expect(callArg.html).toContain("Jane");
      expect(callArg.html).toContain("Welcome to Fynvita!");
    });
  });

  // ---------------------------------------------------------------
  // notifyDisputeCreated
  // ---------------------------------------------------------------
  describe("notifyDisputeCreated", () => {
    it("creates an in-app notification and sends an email", async () => {
      // createNotification resolves via thenable chain
      mockTerminalResult = {
        data: { ...sampleRow, type: "dispute_update" },
        error: null,
      };
      // sendEmail via Resend
      mockSend.mockResolvedValueOnce({});

      await notificationServiceDB.notifyDisputeCreated(
        "user-1",
        "user@example.com",
        "dispute-123",
        "Experian",
      );

      // Verify in-app notification was created
      expect(lastChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          type: "dispute_update",
          title: "Dispute Letter Created",
        }),
      );

      // Verify email was sent
      expect(mockSend).toHaveBeenCalledTimes(1);
      const emailArg = mockSend.mock.calls[0][0] as any;
      expect(emailArg.to).toBe("user@example.com");
      expect(emailArg.subject).toBe("Your Dispute Letter is Ready");
      expect(emailArg.html).toContain("Experian");
      expect(emailArg.html).toContain("dispute-123");
    });
  });

  // ---------------------------------------------------------------
  // notifyPaymentSuccess
  // ---------------------------------------------------------------
  describe("notifyPaymentSuccess", () => {
    it("creates an in-app notification and sends an email", async () => {
      mockTerminalResult = {
        data: { ...sampleRow, type: "payment_success" },
        error: null,
      };
      mockSend.mockResolvedValueOnce({});

      await notificationServiceDB.notifyPaymentSuccess(
        "user-1",
        "user@example.com",
        79,
        "Premium",
      );

      expect(lastChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          type: "payment_success",
          title: "Payment Successful",
        }),
      );

      const insertArg = lastChain.insert.mock.calls[0][0] as any;
      expect(insertArg.message).toContain("$79");
      expect(insertArg.message).toContain("Premium");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const emailArg = mockSend.mock.calls[0][0] as any;
      expect(emailArg.subject).toBe("Payment Received - Thank You!");
      expect(emailArg.html).toContain("Premium");
      expect(emailArg.html).toContain("79");
    });
  });

  // ---------------------------------------------------------------
  // notifyDocumentUploaded
  // ---------------------------------------------------------------
  describe("notifyDocumentUploaded", () => {
    it("creates an in-app notification only (no email)", async () => {
      mockTerminalResult = {
        data: { ...sampleRow, type: "document_uploaded" },
        error: null,
      };

      await notificationServiceDB.notifyDocumentUploaded(
        "user-1",
        "report.pdf",
        "credit_report",
      );

      expect(lastChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          type: "document_uploaded",
          title: "Document Uploaded",
        }),
      );

      const insertArg = lastChain.insert.mock.calls[0][0] as any;
      expect(insertArg.message).toContain("report.pdf");
      expect(insertArg.message).toContain("credit_report");

      // No email should be sent
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
