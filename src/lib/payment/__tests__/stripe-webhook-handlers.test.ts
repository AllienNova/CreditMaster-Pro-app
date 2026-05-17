/** @jest-environment node */

/**
 * WBH-04: Webhook handler rethrow + idempotent side-effect ordering
 *
 * FND-014: handleInvoicePaid swallows errors → Stripe never retries
 * FND-015: handleInvoicePaymentFailed swallows errors → Stripe never retries
 *
 * These tests target the private webhook handler methods via the public
 * handleWebhookEvent dispatcher. Every handler must THROW on downstream
 * failure so the route layer returns 4xx and Stripe retries.
 */

// ─── Module mocks (must be declared before imports) ──────────────────────────

const mockGetCustomer = jest.fn();
const mockSendPaymentSuccessEmail = jest.fn();
const mockSendPaymentFailedEmail = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockResetCreditsForTier = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSubscriptionServiceCreated = jest.fn();
const mockSubscriptionServiceUpdated = jest.fn();
const mockSubscriptionServiceDeleted = jest.fn();

// Mock Stripe constructor so the lazy getStripe() returns a usable instance.
// The `customers.retrieve` method on the instance is spied on separately
// after import via stripeService.getCustomer spy (see below).
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    customers: { retrieve: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  }));
});

jest.mock("@/lib/notifications/notification-service", () => ({
  notificationService: {
    sendPaymentSuccessEmail: mockSendPaymentSuccessEmail,
    sendPaymentFailedEmail: mockSendPaymentFailedEmail,
  },
}));

jest.mock("@/lib/monitoring/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

jest.mock("@/lib/credits/credit-reset", () => ({
  resetCreditsForTier: mockResetCreditsForTier,
}));

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

jest.mock("@/lib/subscriptions/subscription-service", () => ({
  subscriptionService: {
    handleSubscriptionCreated: mockSubscriptionServiceCreated,
    handleSubscriptionUpdated: mockSubscriptionServiceUpdated,
    handleSubscriptionDeleted: mockSubscriptionServiceDeleted,
  },
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

// stripe-service imports Stripe lazily; set the env var so getStripe() works
process.env.STRIPE_SECRET_KEY = "sk_test_fake";

import { stripeService } from "../stripe-service";
import type Stripe from "stripe";

// Spy on the public getCustomer method so all handlers can be tested without
// coupling to the Stripe SDK's Proxy-based lazy init internals.
let getCustomerSpy: jest.SpyInstance;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_test_123",
    object: "invoice",
    customer: "cus_test_123",
    amount_paid: 9999,
    amount_due: 9999,
    currency: "usd",
    parent: {
      type: "subscription_details",
      subscription_details: {
        subscription: "sub_test_123",
      },
    },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

function makePaymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {},
): Stripe.PaymentIntent {
  return {
    id: "pi_test_123",
    object: "payment_intent",
    amount: 2999,
    currency: "usd",
    customer: "cus_test_123",
    metadata: {},
    last_payment_error: null,
    ...overrides,
  } as unknown as Stripe.PaymentIntent;
}

function makeSubscriptionEvent(
  type: Stripe.Event["type"],
  data: object,
): Stripe.Event {
  return {
    id: "evt_test_sub",
    type,
    data: { object: data },
  } as unknown as Stripe.Event;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("wbh-phase2: stripe-service webhook handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Wire mockGetCustomer through the public method so the Proxy-based lazy
    // Stripe init does not need to be satisfied in every test.
    getCustomerSpy = jest
      .spyOn(stripeService, "getCustomer")
      .mockImplementation(mockGetCustomer);
  });

  afterEach(() => {
    getCustomerSpy.mockRestore();
  });

  // ── handleInvoicePaid ──────────────────────────────────────────────────────

  describe("handleInvoicePaid", () => {
    it("succeeds: logs payment, resets credits, then sends email", async () => {
      // DB returns a subscription record with a known price ID
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "user_1", stripe_price_id: "price_free" },
            error: null,
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockResetCreditsForTier.mockResolvedValue(undefined);
      mockSendPaymentSuccessEmail.mockResolvedValue(undefined);

      const invoice = makeInvoice();
      await stripeService.handleWebhookEvent({
        id: "evt_1",
        type: "invoice.paid",
        data: { object: invoice },
      } as unknown as Stripe.Event);

      // DB work happens first (credit reset logged)
      expect(mockResetCreditsForTier).toHaveBeenCalledWith("user_1", "free");
      // Email sent last
      expect(mockSendPaymentSuccessEmail).toHaveBeenCalledWith(
        "user@example.com",
        "Test User",
        expect.any(Number),
        "in_test_123",
      );
    });

    it("succeeds: skips credit reset when invoice has no subscription details", async () => {
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Customer",
      });
      mockSendPaymentSuccessEmail.mockResolvedValue(undefined);

      const invoice = makeInvoice({ parent: null as unknown as undefined });
      await stripeService.handleWebhookEvent({
        id: "evt_2",
        type: "invoice.paid",
        data: { object: invoice },
      } as unknown as Stripe.Event);

      expect(mockResetCreditsForTier).not.toHaveBeenCalled();
      expect(mockSendPaymentSuccessEmail).toHaveBeenCalled();
    });

    it("succeeds: skips email when customer has no email address", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "user_2", stripe_price_id: "price_free" },
            error: null,
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: null,
        name: "No Email User",
      });
      mockResetCreditsForTier.mockResolvedValue(undefined);

      await stripeService.handleWebhookEvent({
        id: "evt_3",
        type: "invoice.paid",
        data: { object: makeInvoice() },
      } as unknown as Stripe.Event);

      expect(mockSendPaymentSuccessEmail).not.toHaveBeenCalled();
      expect(mockResetCreditsForTier).toHaveBeenCalled();
    });

    it("throws when getCustomer fails (FND-014: was silently swallowed)", async () => {
      mockGetCustomer.mockRejectedValue(new Error("Stripe network error"));

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_4",
          type: "invoice.paid",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow("Stripe network error");

      // Email must NOT have been sent — the error happened before email
      expect(mockSendPaymentSuccessEmail).not.toHaveBeenCalled();
    });

    it("throws when resetCreditsForTier fails — and email is NOT sent (idempotency ordering)", async () => {
      // Credit reset (DB work) is ordered BEFORE email send. When reset throws,
      // the email is never sent. On Stripe retry, reset runs again (idempotent)
      // without re-sending the email.
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "user_3", stripe_price_id: "price_free" },
            error: null,
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockResetCreditsForTier.mockRejectedValue(
        new Error("DB connection timeout"),
      );

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_5",
          type: "invoice.paid",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow("DB connection timeout");

      // The critical ordering invariant: email must NOT have been sent.
      // If it had been sent before the throw, a Stripe retry would double-send.
      expect(mockSendPaymentSuccessEmail).not.toHaveBeenCalled();
    });

    it("throws when sendPaymentSuccessEmail fails (FND-014: was silently swallowed)", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "user_4", stripe_price_id: "price_free" },
            error: null,
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect });
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockResetCreditsForTier.mockResolvedValue(undefined);
      mockSendPaymentSuccessEmail.mockRejectedValue(
        new Error("Resend API down"),
      );

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_6",
          type: "invoice.paid",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow("Resend API down");

      // Credit reset already completed — no data loss on retry
      expect(mockResetCreditsForTier).toHaveBeenCalled();
    });

    it("logs the error with event ID and type before rethrowing", async () => {
      mockGetCustomer.mockRejectedValue(new Error("network timeout"));

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_log_test",
          type: "invoice.paid",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining("invoice.paid"),
        expect.any(Error),
        expect.objectContaining({ eventId: "evt_log_test" }),
      );
    });
  });

  // ── handleInvoicePaymentFailed ─────────────────────────────────────────────

  describe("handleInvoicePaymentFailed", () => {
    it("succeeds: logs the failure and sends the failure email", async () => {
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockSendPaymentFailedEmail.mockResolvedValue(undefined);

      await stripeService.handleWebhookEvent({
        id: "evt_7",
        type: "invoice.payment_failed",
        data: { object: makeInvoice() },
      } as unknown as Stripe.Event);

      expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.any(Number),
        expect.stringContaining("in_test_123"),
      );
      expect(mockLoggerWarn).toHaveBeenCalled();
    });

    it("succeeds: skips email when customer has no email", async () => {
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: null,
        name: "No Email",
      });

      await stripeService.handleWebhookEvent({
        id: "evt_8",
        type: "invoice.payment_failed",
        data: { object: makeInvoice() },
      } as unknown as Stripe.Event);

      expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled();
    });

    it("throws when getCustomer fails (FND-015: was silently swallowed)", async () => {
      mockGetCustomer.mockRejectedValue(new Error("Stripe API error"));

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_9",
          type: "invoice.payment_failed",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow("Stripe API error");
    });

    it("throws when sendPaymentFailedEmail fails (FND-015: was silently swallowed)", async () => {
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockSendPaymentFailedEmail.mockRejectedValue(
        new Error("email service unavailable"),
      );

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_10",
          type: "invoice.payment_failed",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow("email service unavailable");
    });

    it("logs error with event ID and type before rethrowing", async () => {
      mockGetCustomer.mockRejectedValue(new Error("Stripe API error"));

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_log_fail",
          type: "invoice.payment_failed",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining("invoice.payment_failed"),
        expect.any(Error),
        expect.objectContaining({ eventId: "evt_log_fail" }),
      );
    });
  });

  // ── handlePaymentIntentFailed ──────────────────────────────────────────────

  describe("handlePaymentIntentFailed", () => {
    it("succeeds: logs the payment intent failure", async () => {
      const pi = makePaymentIntent({
        last_payment_error: { message: "card declined" } as unknown as Stripe.PaymentIntent["last_payment_error"],
      });

      await stripeService.handleWebhookEvent({
        id: "evt_11",
        type: "payment_intent.payment_failed",
        data: { object: pi },
      } as unknown as Stripe.Event);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining("Payment intent failed"),
        expect.any(Error),
        expect.objectContaining({ paymentIntentId: "pi_test_123" }),
      );
    });

    it("throws when the logger import itself throws (was silently swallowed)", async () => {
      // Simulate a secondary logger failure by making logger.error throw.
      // The outer catch used to silently swallow this — it must now rethrow.
      mockLoggerError.mockImplementation(() => {
        throw new Error("logger failure");
      });

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_12",
          type: "payment_intent.payment_failed",
          data: { object: makePaymentIntent() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow("logger failure");
    });
  });

  // ── subscription handlers ──────────────────────────────────────────────────

  describe("subscription handlers (via subscriptionService delegation)", () => {
    it("handleSubscriptionCreated: throws when subscriptionService throws", async () => {
      mockSubscriptionServiceCreated.mockRejectedValue(
        new Error("DB insert error"),
      );

      await expect(
        stripeService.handleWebhookEvent(
          makeSubscriptionEvent("customer.subscription.created", {
            id: "sub_1",
            metadata: { userId: "user_1" },
            items: { data: [{ price: { id: "price_free" } }] },
          }),
        ),
      ).rejects.toThrow("DB insert error");
    });

    it("handleSubscriptionCreated: succeeds when subscriptionService succeeds", async () => {
      mockSubscriptionServiceCreated.mockResolvedValue(undefined);

      await expect(
        stripeService.handleWebhookEvent(
          makeSubscriptionEvent("customer.subscription.created", {
            id: "sub_2",
            metadata: { userId: "user_2" },
            items: { data: [{ price: { id: "price_free" } }] },
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it("handleSubscriptionUpdated: throws when subscriptionService throws", async () => {
      mockSubscriptionServiceUpdated.mockRejectedValue(
        new Error("DB update error"),
      );

      await expect(
        stripeService.handleWebhookEvent(
          makeSubscriptionEvent("customer.subscription.updated", {
            id: "sub_3",
            items: { data: [{ price: { id: "price_free" } }] },
          }),
        ),
      ).rejects.toThrow("DB update error");
    });

    it("handleSubscriptionUpdated: succeeds when subscriptionService succeeds", async () => {
      mockSubscriptionServiceUpdated.mockResolvedValue(undefined);

      await expect(
        stripeService.handleWebhookEvent(
          makeSubscriptionEvent("customer.subscription.updated", {
            id: "sub_4",
            items: { data: [{ price: { id: "price_free" } }] },
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it("handleSubscriptionDeleted: throws when subscriptionService throws", async () => {
      mockSubscriptionServiceDeleted.mockRejectedValue(
        new Error("DB delete error"),
      );

      await expect(
        stripeService.handleWebhookEvent(
          makeSubscriptionEvent("customer.subscription.deleted", {
            id: "sub_5",
            items: { data: [{ price: { id: "price_free" } }] },
          }),
        ),
      ).rejects.toThrow("DB delete error");
    });

    it("handleSubscriptionDeleted: succeeds when subscriptionService succeeds", async () => {
      mockSubscriptionServiceDeleted.mockResolvedValue(undefined);

      await expect(
        stripeService.handleWebhookEvent(
          makeSubscriptionEvent("customer.subscription.deleted", {
            id: "sub_6",
            items: { data: [{ price: { id: "price_free" } }] },
          }),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
