/** @jest-environment node */

/**
 * WBH-04: Webhook handler rethrow + idempotent side-effect ordering
 * WBH-01b: claim-after-success idempotency wired into handleWebhookEvent (FND-022)
 *
 * FND-014: handleInvoicePaid swallows errors → Stripe never retries
 * FND-015: handleInvoicePaymentFailed swallows errors → Stripe never retries
 * FND-022: no replay guard on handleWebhookEvent → duplicate side-effects on Stripe retry
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
const mockIsWebhookEventProcessed = jest.fn();
const mockMarkWebhookEventProcessed = jest.fn();

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

jest.mock("@/lib/payment/webhook-idempotency", () => ({
  isWebhookEventProcessed: mockIsWebhookEventProcessed,
  markWebhookEventProcessed: mockMarkWebhookEventProcessed,
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

/**
 * Point the Supabase double at the right shape per table.
 *
 * handleInvoicePaid touches two tables: `subscriptions` (select→eq→single, to
 * resolve the user for the credit reset) and `payments` (upsert, the revenue
 * ledger). A single mockReturnValue can only model one of them, so tests that
 * care about the subscription lookup pass their own select mock here and get a
 * working ledger stub for free.
 */
function wireSupabaseTables(mockSelect: jest.Mock): jest.Mock {
  const mockUpsert = jest.fn().mockResolvedValue({ error: null });
  mockSupabaseFrom.mockImplementation((table: string) =>
    table === "subscription_invoices" ? { upsert: mockUpsert } : { select: mockSelect },
  );
  return mockUpsert;
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
    // Default: event not yet processed; mark succeeds.
    mockIsWebhookEventProcessed.mockResolvedValue(false);
    mockMarkWebhookEventProcessed.mockResolvedValue(undefined);
    // Default DB double. handleInvoicePaid now always writes the revenue
    // ledger, including for one-off invoices with no subscription, so `from()`
    // must return something usable even in tests that never opt into wiring it.
    wireSupabaseTables(
      jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    );
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
      wireSupabaseTables(mockSelect);
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
      wireSupabaseTables(mockSelect);
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
      wireSupabaseTables(mockSelect);
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
      wireSupabaseTables(mockSelect);
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

    it("resolves without calling getCustomer when invoice has no customer (customerless skip)", async () => {
      const invoice = makeInvoice({ customer: null as unknown as string });

      await stripeService.handleWebhookEvent({
        id: "evt_paid_no_cust",
        type: "invoice.paid",
        data: { object: invoice },
      } as unknown as Stripe.Event);

      expect(getCustomerSpy).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("no customerId"),
        expect.objectContaining({ invoiceId: "in_test_123", eventId: "evt_paid_no_cust" }),
      );
    });

    it("warns and defaults to free tier when stripe_price_id has no matching plan", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "user_5", stripe_price_id: "price_unknown_xyz" },
            error: null,
          }),
        }),
      });
      wireSupabaseTables(mockSelect);
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockResetCreditsForTier.mockResolvedValue(undefined);
      mockSendPaymentSuccessEmail.mockResolvedValue(undefined);

      await stripeService.handleWebhookEvent({
        id: "evt_unknown_tier",
        type: "invoice.paid",
        data: { object: makeInvoice() },
      } as unknown as Stripe.Event);

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("no plan for stripe_price_id"),
        expect.objectContaining({ stripePriceId: "price_unknown_xyz", eventId: "evt_unknown_tier" }),
      );
      // Defaults to free tier — does not throw
      expect(mockResetCreditsForTier).toHaveBeenCalledWith("user_5", "free");
    });
  });

  // ── Revenue ledger (payments table) ───────────────────────────────────────
  //
  // Before this suite existed, NOTHING in the codebase recorded a payment.
  // handleInvoicePaid touched only `subscriptions` (credit-allowance reset), so
  // every paid invoice left no financial record. /api/admin/metrics then read a
  // `payments` table that no migration created, and collapsed the resulting
  // PostgREST error to `|| 0` — making admin revenue structurally incapable of
  // being non-zero.
  //
  // See supabase/migrations/20260731000020_payments_revenue_ledger.sql.

  describe("handleInvoicePaid: revenue ledger", () => {
    function wireLedger(
      upsertResult: { error: { message: string } | null } = { error: null },
    ) {
      const mockUpsert = jest.fn().mockResolvedValue(upsertResult);
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "subscription_invoices") return { upsert: mockUpsert };
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { user_id: "user_1", stripe_price_id: "price_free" },
                error: null,
              }),
            }),
          }),
        };
      });
      return mockUpsert;
    }

    beforeEach(() => {
      mockGetCustomer.mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
        name: "Test User",
      });
      mockResetCreditsForTier.mockResolvedValue(undefined);
      mockSendPaymentSuccessEmail.mockResolvedValue(undefined);
    });

    it("records the payment in the revenue ledger", async () => {
      const mockUpsert = wireLedger();

      await stripeService.handleWebhookEvent({
        id: "evt_ledger_1",
        type: "invoice.paid",
        data: { object: makeInvoice() },
      } as unknown as Stripe.Event);

      expect(mockSupabaseFrom).toHaveBeenCalledWith("subscription_invoices");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_invoice_id: "in_test_123",
          stripe_customer_id: "cus_test_123",
          stripe_subscription_id: "sub_test_123",
          stripe_event_id: "evt_ledger_1",
          user_id: "user_1",
          currency: "usd",
        }),
        expect.objectContaining({
          onConflict: "stripe_invoice_id",
          ignoreDuplicates: true,
        }),
      );
    });

    it("stores amount_paid verbatim as integer cents, with no unit conversion", async () => {
      // Regression guard for the dollar/cent bug class that has already shipped
      // twice on live money paths (FND-024 payout, B1 calculateFees). Stripe
      // sends MINOR UNITS; 9999 must land as 9999, never 99.99 and never
      // 999900.
      const mockUpsert = wireLedger();

      await stripeService.handleWebhookEvent({
        id: "evt_ledger_units",
        type: "invoice.paid",
        data: { object: makeInvoice({ amount_paid: 9999 }) },
      } as unknown as Stripe.Event);

      const row = mockUpsert.mock.calls[0][0] as { amount_cents: number };
      expect(row.amount_cents).toBe(9999);
      expect(Number.isInteger(row.amount_cents)).toBe(true);
    });

    it("throws when the ledger write fails so Stripe retries", async () => {
      // A payment that Stripe took but we failed to record must NOT return 2xx.
      // Swallowing here would lose the revenue record permanently.
      wireLedger({ error: { message: "relation payments does not exist" } });

      await expect(
        stripeService.handleWebhookEvent({
          id: "evt_ledger_fail",
          type: "invoice.paid",
          data: { object: makeInvoice() },
        } as unknown as Stripe.Event),
      ).rejects.toThrow(/payments/i);
    });

    it("records the payment BEFORE sending the confirmation email", async () => {
      // Mirrors the handler's documented "DB work FIRST, email LAST" ordering:
      // a failed ledger write must not have already emailed the customer.
      const order: string[] = [];
      const mockUpsert = jest.fn().mockImplementation(async () => {
        order.push("ledger");
        return { error: null };
      });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "subscription_invoices") return { upsert: mockUpsert };
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { user_id: "user_1", stripe_price_id: "price_free" },
                error: null,
              }),
            }),
          }),
        };
      });
      mockSendPaymentSuccessEmail.mockImplementation(async () => {
        order.push("email");
      });

      await stripeService.handleWebhookEvent({
        id: "evt_ledger_order",
        type: "invoice.paid",
        data: { object: makeInvoice() },
      } as unknown as Stripe.Event);

      expect(order).toEqual(["ledger", "email"]);
    });

    it("still records the payment when the invoice has no subscription", async () => {
      // A one-off invoice has no subscription to resolve a user from. The
      // payment is money the business received either way — record it
      // unattributed rather than dropping it.
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "subscription_invoices") return { upsert: mockUpsert };
        return { select: jest.fn() };
      });

      await stripeService.handleWebhookEvent({
        id: "evt_ledger_oneoff",
        type: "invoice.paid",
        data: {
          object: makeInvoice({ parent: null as unknown as undefined }),
        },
      } as unknown as Stripe.Event);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_invoice_id: "in_test_123",
          user_id: null,
          stripe_subscription_id: null,
        }),
        expect.anything(),
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

    it("resolves without calling getCustomer when invoice has no customer (customerless skip)", async () => {
      const invoice = makeInvoice({ customer: null as unknown as string });

      await stripeService.handleWebhookEvent({
        id: "evt_failed_no_cust",
        type: "invoice.payment_failed",
        data: { object: invoice },
      } as unknown as Stripe.Event);

      expect(getCustomerSpy).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("no customerId"),
        expect.objectContaining({ invoiceId: "in_test_123", eventId: "evt_failed_no_cust" }),
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

  // ── WBH-01b: claim-after-success idempotency (FND-022) ────────────────────

  describe("wbh-phase2: webhook idempotency (FND-022)", () => {
    function makeCheckoutEvent(eventId: string): Stripe.Event {
      return {
        id: eventId,
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_abc",
            object: "checkout.session",
            customer: "cus_test_123",
            subscription: "sub_test_new",
            mode: "subscription",
          },
        },
      } as unknown as Stripe.Event;
    }

    it("replay: same event delivered 100 times → side-effect runs exactly once", async () => {
      // First delivery: not processed → runs handler → marks
      // Deliveries 2–100: already processed → no-op
      mockIsWebhookEventProcessed
        .mockResolvedValueOnce(false) // delivery 1 → run handler
        .mockResolvedValue(true); // deliveries 2–100 → skip

      const event = makeCheckoutEvent("evt_idempotency_replay");

      for (let i = 0; i < 100; i++) {
        await stripeService.handleWebhookEvent(event);
      }

      // isWebhookEventProcessed called 100 times
      expect(mockIsWebhookEventProcessed).toHaveBeenCalledTimes(100);
      expect(mockIsWebhookEventProcessed).toHaveBeenCalledWith("stripe", "evt_idempotency_replay");

      // markWebhookEventProcessed called ONCE — only after the first successful dispatch
      expect(mockMarkWebhookEventProcessed).toHaveBeenCalledTimes(1);
      expect(mockMarkWebhookEventProcessed).toHaveBeenCalledWith("stripe", "evt_idempotency_replay");

      // The logger was called with checkout info exactly once (first delivery only)
      expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
    });

    it("lost-event guard: handler throws on delivery 1 → sentinel NOT marked → delivery 2 succeeds", async () => {
      // This test PROVES claim-after-success semantics. A claim-BEFORE-dispatch design
      // would mark the sentinel before the handler runs, causing delivery 2 to skip the
      // handler permanently — losing the event. This test must FAIL if the implementation
      // marks before dispatch.
      //
      // Delivery 1: not processed, handler throws → sentinel must NOT be marked
      // Delivery 2: not processed (sentinel was never marked), handler succeeds → sentinel marked

      // Both deliveries start as "not processed" because delivery 1 never marked it.
      mockIsWebhookEventProcessed.mockResolvedValue(false);

      // Delivery 1: handler will throw (simulated via loggerInfo, which is called inside
      // handleCheckoutSessionCompleted — we make it throw on first call only)
      mockLoggerInfo
        .mockImplementationOnce(() => {
          throw new Error("transient failure on delivery 1");
        })
        .mockResolvedValue(undefined);

      const event = makeCheckoutEvent("evt_lost_event_guard");

      // Delivery 1: should throw and NOT mark sentinel
      await expect(stripeService.handleWebhookEvent(event)).rejects.toThrow(
        "transient failure on delivery 1",
      );

      // Sentinel must NOT have been marked because the handler threw
      expect(mockMarkWebhookEventProcessed).not.toHaveBeenCalled();

      // Delivery 2: not processed (sentinel never set) → handler runs and succeeds
      await stripeService.handleWebhookEvent(event);

      // Now the sentinel is marked after successful delivery
      expect(mockMarkWebhookEventProcessed).toHaveBeenCalledTimes(1);
      expect(mockMarkWebhookEventProcessed).toHaveBeenCalledWith("stripe", "evt_lost_event_guard");
    });

    it("returns immediately (no dispatch) when event is already processed", async () => {
      mockIsWebhookEventProcessed.mockResolvedValue(true);

      const event = makeCheckoutEvent("evt_already_done");
      await stripeService.handleWebhookEvent(event);

      // No side-effects: not marked again, no handler work
      expect(mockMarkWebhookEventProcessed).not.toHaveBeenCalled();
      expect(mockLoggerInfo).not.toHaveBeenCalled();
    });

    it("isWebhookEventProcessed check uses provider='stripe' and the event.id", async () => {
      mockIsWebhookEventProcessed.mockResolvedValue(true);

      await stripeService.handleWebhookEvent(makeCheckoutEvent("evt_check_args"));

      expect(mockIsWebhookEventProcessed).toHaveBeenCalledWith("stripe", "evt_check_args");
    });

    it("propagates throw from isWebhookEventProcessed (ambiguous check → route 400 → retry)", async () => {
      mockIsWebhookEventProcessed.mockRejectedValue(
        new Error("RPC is_webhook_event_processed failed"),
      );

      await expect(
        stripeService.handleWebhookEvent(makeCheckoutEvent("evt_check_fails")),
      ).rejects.toThrow("RPC is_webhook_event_processed failed");

      expect(mockMarkWebhookEventProcessed).not.toHaveBeenCalled();
    });

    it("propagates throw from markWebhookEventProcessed (sentinel write fail → route 400 → retry)", async () => {
      mockIsWebhookEventProcessed.mockResolvedValue(false);
      mockMarkWebhookEventProcessed.mockRejectedValue(
        new Error("RPC mark_webhook_event_processed failed"),
      );

      await expect(
        stripeService.handleWebhookEvent(makeCheckoutEvent("evt_mark_fails")),
      ).rejects.toThrow("RPC mark_webhook_event_processed failed");
    });

    it("default branch: unhandled event type resolves without throwing and does NOT mark sentinel", async () => {
      // Covers the default: return; branch. An unknown Stripe event type must not
      // be marked as processed — a handler added later must be able to receive a
      // manual Stripe dashboard replay of the event.
      const unhandledEvent = {
        id: "evt_unhandled_radar",
        type: "radar.early_fraud_warning.created",
        data: { object: {} },
      } as unknown as Stripe.Event;

      await expect(
        stripeService.handleWebhookEvent(unhandledEvent),
      ).resolves.toBeUndefined();

      expect(mockMarkWebhookEventProcessed).not.toHaveBeenCalled();
    });
  });

  // ── checkout.session.completed ────────────────────────────────────────────

  describe("wbh-phase2: checkout.session.completed handler", () => {
    function makeCheckoutSessionEvent(overrides: Record<string, unknown> = {}): Stripe.Event {
      return {
        id: "evt_checkout_1",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_live_abc",
            object: "checkout.session",
            customer: "cus_checkout_123",
            subscription: "sub_new_123",
            mode: "subscription",
            ...overrides,
          },
        },
      } as unknown as Stripe.Event;
    }

    it("succeeds: logs the completed checkout session with structured context", async () => {
      await stripeService.handleWebhookEvent(makeCheckoutSessionEvent());

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("checkout.session.completed"),
        expect.objectContaining({
          sessionId: "cs_live_abc",
          customerId: "cus_checkout_123",
          subscriptionId: "sub_new_123",
          mode: "subscription",
        }),
      );
      expect(mockMarkWebhookEventProcessed).toHaveBeenCalledWith("stripe", "evt_checkout_1");
    });

    it("succeeds: handles session with no subscription (one-time payment mode)", async () => {
      await stripeService.handleWebhookEvent(
        makeCheckoutSessionEvent({ subscription: null, mode: "payment" }),
      );

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("checkout.session.completed"),
        expect.objectContaining({
          sessionId: "cs_live_abc",
          mode: "payment",
        }),
      );
    });

    it("throws when handler throws → sentinel NOT marked", async () => {
      // Make the logger throw to simulate a handler failure
      mockLoggerInfo.mockImplementationOnce(() => {
        throw new Error("handler failure");
      });

      await expect(
        stripeService.handleWebhookEvent(makeCheckoutSessionEvent()),
      ).rejects.toThrow("handler failure");

      // Claim-after-success: sentinel not marked when handler threw
      expect(mockMarkWebhookEventProcessed).not.toHaveBeenCalled();
    });
  });
});
