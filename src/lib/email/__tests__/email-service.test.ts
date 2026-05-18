/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// --- Mocks ---

const mockSend = jest
  .fn()
  .mockResolvedValue({ data: { id: "email-123" }, error: null } as never);

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));

jest.mock("react-dom/server", () => ({
  renderToStaticMarkup: jest.fn().mockReturnValue("<html>test</html>"),
}));

jest.mock("@/emails/WelcomeEmail", () => jest.fn(() => null));
jest.mock("@/emails/DisputeStatusEmail", () => jest.fn(() => null));
jest.mock("@/emails/ScoreChangeEmail", () => jest.fn(() => null));
jest.mock("@/emails/PaymentReceiptEmail", () => jest.fn(() => null));

// --- Import under test (after mocks) ---

import {
  sendWelcomeEmail,
  sendDisputeStatusEmail,
  sendScoreChangeEmail,
  sendPaymentReceiptEmail,
} from "../email-service";

import { Resend } from "resend";
import { renderToStaticMarkup } from "react-dom/server";
import WelcomeEmail from "@/emails/WelcomeEmail";
import DisputeStatusEmail from "@/emails/DisputeStatusEmail";
import ScoreChangeEmail from "@/emails/ScoreChangeEmail";
import PaymentReceiptEmail from "@/emails/PaymentReceiptEmail";

// --- Tests ---

describe("email-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // resetMocks:true wipes the Resend constructor impl — re-apply each test.
    (Resend as jest.MockedClass<typeof Resend>).mockImplementation(
      () => ({ emails: { send: mockSend } }) as never,
    );
    mockSend.mockResolvedValue({
      data: { id: "email-123" },
      error: null,
    } as never);
    (renderToStaticMarkup as jest.Mock).mockReturnValue(
      "<html>test</html>" as never,
    );
  });

  // ---------------------------------------------------------------
  // sendWelcomeEmail
  // ---------------------------------------------------------------
  describe("sendWelcomeEmail", () => {
    it("renders the WelcomeEmail component and sends via Resend", async () => {
      const result = await sendWelcomeEmail("user@example.com", "Jane");

      expect(WelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane",
          loginUrl: expect.stringContaining("/login"),
        }),
      );
      expect(renderToStaticMarkup).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Welcome to Fynvita! ",
          html: "<html>test</html>",
        }),
      );
      expect(result).toEqual({ success: true, id: "email-123" });
    });

    it("returns error result when Resend returns an error", async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Bad request" },
      } as never);

      const result = await sendWelcomeEmail("bad@example.com", "Jane");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns error result when Resend throws", async () => {
      mockSend.mockRejectedValueOnce(new Error("Network failure") as never);

      const result = await sendWelcomeEmail("user@example.com", "Jane");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network failure");
    });

    it("returns error result when renderToStaticMarkup throws", async () => {
      (renderToStaticMarkup as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Render error");
      });

      const result = await sendWelcomeEmail("user@example.com", "Jane");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Render error");
    });
  });

  // ---------------------------------------------------------------
  // sendDisputeStatusEmail
  // ---------------------------------------------------------------
  describe("sendDisputeStatusEmail", () => {
    const baseParams = {
      name: "Jane",
      disputeId: "disp-1",
      bureau: "Experian",
      itemDescription: "Late payment",
    };

    it("sends 'submitted' status email with correct subject", async () => {
      const result = await sendDisputeStatusEmail("user@example.com", {
        ...baseParams,
        status: "submitted" as const,
      });

      expect(DisputeStatusEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane",
          disputeId: "disp-1",
          status: "submitted",
          bureau: "Experian",
          itemDescription: "Late payment",
          dashboardUrl: expect.stringContaining("/dashboard/disputes/disp-1"),
        }),
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Dispute Submitted",
        }),
      );
      expect(result).toEqual({ success: true, id: "email-123" });
    });

    it("sends 'in_review' status email with correct subject", async () => {
      await sendDisputeStatusEmail("user@example.com", {
        ...baseParams,
        status: "in_review" as const,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Dispute Under Review",
        }),
      );
    });

    it("sends 'resolved' status email with correct subject", async () => {
      await sendDisputeStatusEmail("user@example.com", {
        ...baseParams,
        status: "resolved" as const,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Dispute Resolved! ",
        }),
      );
    });

    it("sends 'rejected' status email with correct subject", async () => {
      await sendDisputeStatusEmail("user@example.com", {
        ...baseParams,
        status: "rejected" as const,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Dispute Update",
        }),
      );
    });

    it("returns error result on failure", async () => {
      mockSend.mockRejectedValueOnce(new Error("Send failed") as never);

      const result = await sendDisputeStatusEmail("user@example.com", {
        ...baseParams,
        status: "submitted" as const,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Send failed");
    });
  });

  // ---------------------------------------------------------------
  // sendScoreChangeEmail
  // ---------------------------------------------------------------
  describe("sendScoreChangeEmail", () => {
    const baseParams = {
      name: "Jane",
      changeDate: "2026-02-20",
    };

    it("sends email with positive change in subject", async () => {
      const result = await sendScoreChangeEmail("user@example.com", {
        ...baseParams,
        previousScore: 700,
        newScore: 720,
      });

      expect(ScoreChangeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane",
          previousScore: 700,
          newScore: 720,
          changeDate: "2026-02-20",
          dashboardUrl: expect.stringContaining("/dashboard"),
        }),
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("+20"),
        }),
      );
      expect(result).toEqual({ success: true, id: "email-123" });
    });

    it("sends email with negative change in subject", async () => {
      await sendScoreChangeEmail("user@example.com", {
        ...baseParams,
        previousScore: 720,
        newScore: 700,
      });

      const subject = (mockSend.mock.calls[0][0] as any).subject;
      expect(subject).toContain("-20");
      // Should NOT have a + prefix for negative
      expect(subject).not.toContain("+-");
    });

    it("handles zero change", async () => {
      await sendScoreChangeEmail("user@example.com", {
        ...baseParams,
        previousScore: 700,
        newScore: 700,
      });

      const subject = (mockSend.mock.calls[0][0] as any).subject;
      expect(subject).toContain("0 points");
    });

    it("returns error result on failure", async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid recipient" },
      } as never);

      const result = await sendScoreChangeEmail("bad@example.com", {
        ...baseParams,
        previousScore: 700,
        newScore: 720,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns error result when rendering throws", async () => {
      (renderToStaticMarkup as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Component render failed");
      });

      const result = await sendScoreChangeEmail("user@example.com", {
        ...baseParams,
        previousScore: 700,
        newScore: 720,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Component render failed");
    });
  });

  // ---------------------------------------------------------------
  // sendPaymentReceiptEmail
  // ---------------------------------------------------------------
  describe("sendPaymentReceiptEmail", () => {
    const baseParams = {
      name: "Jane",
      plan: "Premium",
      amount: 79,
      currency: "USD",
      invoiceNumber: "INV-001",
      paymentDate: "2026-02-20",
      nextBillingDate: "2026-03-20",
    };

    it("sends payment receipt with plan name in subject", async () => {
      const result = await sendPaymentReceiptEmail(
        "user@example.com",
        baseParams,
      );

      expect(PaymentReceiptEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane",
          plan: "Premium",
          amount: 79,
          currency: "USD",
          invoiceNumber: "INV-001",
          paymentDate: "2026-02-20",
          nextBillingDate: "2026-03-20",
          dashboardUrl: expect.any(String),
        }),
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Payment Receipt - Premium Plan",
        }),
      );
      expect(result).toEqual({ success: true, id: "email-123" });
    });

    it("includes correct subject for different plan names", async () => {
      await sendPaymentReceiptEmail("user@example.com", {
        ...baseParams,
        plan: "Enterprise",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Payment Receipt - Enterprise Plan",
        }),
      );
    });

    it("returns error result on send failure", async () => {
      mockSend.mockRejectedValueOnce(new Error("Payment email failed") as never);

      const result = await sendPaymentReceiptEmail(
        "user@example.com",
        baseParams,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment email failed");
    });

    it("returns error result when Resend returns an error object", async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Rate limited" },
      } as never);

      const result = await sendPaymentReceiptEmail(
        "user@example.com",
        baseParams,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
