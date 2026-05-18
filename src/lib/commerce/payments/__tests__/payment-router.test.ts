/**
 * Payment Router Tests
 *
 * Tests for unified payment routing across Stripe and TrueLayer providers.
 */

// =============================================================================
// Mocks — must be declared before any import that touches the source module
// =============================================================================

const mockSupabase = {
  from: jest.fn<any, any[]>(),
  rpc: jest.fn<any, any[]>(),
  auth: {
    admin: {
      getUserById: jest.fn<any, any[]>(),
    },
  },
};

const mockBuilder = {
  select: jest.fn<any, any[]>(),
  insert: jest.fn<any, any[]>(),
  update: jest.fn<any, any[]>(),
  delete: jest.fn<any, any[]>(),
  eq: jest.fn<any, any[]>(),
  neq: jest.fn<any, any[]>(),
  gt: jest.fn<any, any[]>(),
  gte: jest.fn<any, any[]>(),
  lt: jest.fn<any, any[]>(),
  lte: jest.fn<any, any[]>(),
  in: jest.fn<any, any[]>(),
  is: jest.fn<any, any[]>(),
  ilike: jest.fn<any, any[]>(),
  like: jest.fn<any, any[]>(),
  or: jest.fn<any, any[]>(),
  order: jest.fn<any, any[]>(),
  limit: jest.fn<any, any[]>(),
  range: jest.fn<any, any[]>(),
  single: jest.fn<any, any[]>(),
  maybeSingle: jest.fn<any, any[]>(),
  match: jest.fn<any, any[]>(),
  contains: jest.fn<any, any[]>(),
  textSearch: jest.fn<any, any[]>(),
  filter: jest.fn<any, any[]>(),
  not: jest.fn<any, any[]>(),
  then: jest.fn<any, any[]>(),
  count: jest.fn<any, any[]>(),
  sum: jest.fn<any, any[]>(),
};

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabase,
}));

const mockStripe = {
  paymentIntents: {
    create: jest.fn<any, any[]>(),
    retrieve: jest.fn<any, any[]>(),
    cancel: jest.fn<any, any[]>(),
  },
  refunds: {
    create: jest.fn<any, any[]>(),
  },
  subscriptions: {
    create: jest.fn<any, any[]>(),
    retrieve: jest.fn<any, any[]>(),
    cancel: jest.fn<any, any[]>(),
  },
  webhooks: {
    constructEvent: jest.fn<any, any[]>(),
  },
  customers: {
    create: jest.fn<any, any[]>(),
    retrieve: jest.fn<any, any[]>(),
  },
};

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockStripe),
}));

const mockTrueLayerConnector = {
  createPayment: jest.fn<any, any[]>(),
  getPayment: jest.fn<any, any[]>(),
  createRefund: jest.fn<any, any[]>(),
  getMerchantAccounts: jest.fn<any, any[]>(),
  createPayout: jest.fn<any, any[]>(),
  verifyWebhookSignature: jest.fn<any, any[]>(),
  parseWebhookEvent: jest.fn<any, any[]>(),
};

jest.mock("../../../connectors/payments", () => ({
  TrueLayerPaymentsConnector: jest.fn(),
  createTrueLayerPaymentsConnector: () => mockTrueLayerConnector,
}));

// =============================================================================
// Import under test — AFTER all jest.mock() calls
// =============================================================================

import Stripe from "stripe";
import {
  PaymentRouter,
  UnifiedPaymentRequest,
} from "../payment-router";

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(
  overrides: Partial<UnifiedPaymentRequest> = {},
): UnifiedPaymentRequest {
  return {
    amount: 5000,
    currency: "USD",
    type: "one_time",
    region: "US",
    userId: "user-123",
    ...overrides,
  };
}

// =============================================================================
// Setup
// =============================================================================

let router: PaymentRouter;

beforeEach(() => {
  jest.clearAllMocks();

  // resetMocks:true wipes the Stripe constructor impl — re-apply so the lazy
  // Stripe Proxy in payment-router returns mockStripe on first access.
  (Stripe as unknown as jest.MockedClass<typeof Stripe>).mockImplementation(
    () => mockStripe as unknown as Stripe,
  );

  // Reset chainable builder — exclude 'then' to avoid infinite thenable loop
  Object.keys(mockBuilder).forEach((key) => {
    if (key !== "then") {
      (mockBuilder as any)[key].mockReturnValue(mockBuilder);
    }
  });
  // Default: await on the builder resolves to { data: null, error: null }
  mockBuilder.then.mockImplementation((resolve: any) =>
    resolve({ data: null, error: null }),
  );
  mockSupabase.from.mockReturnValue(mockBuilder);
  mockSupabase.rpc.mockReturnValue(mockBuilder);

  // Instantiate a fresh router for each test
  router = new PaymentRouter();
});

// =============================================================================
// Tests
// =============================================================================

describe("PaymentRouter", () => {
  // ===========================================================================
  // selectProvider
  // ===========================================================================

  describe("selectProvider", () => {
    it("should select TrueLayer for open_banking in GB", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "GB", method: "open_banking" }),
      );
      expect(selection.provider).toBe("truelayer");
      expect(selection.reason).toContain("Open Banking");
    });

    it("should select TrueLayer for bank_transfer in EU", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "EU", method: "bank_transfer" }),
      );
      expect(selection.provider).toBe("truelayer");
    });

    it("should select TrueLayer for open_banking in Eurozone country (DE)", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "DE", method: "open_banking" }),
      );
      expect(selection.provider).toBe("truelayer");
    });

    it("should select TrueLayer for bank_transfer in France (FR)", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "FR", method: "bank_transfer" }),
      );
      expect(selection.provider).toBe("truelayer");
    });

    it("should select Stripe for card payments", () => {
      const selection = router.selectProvider(
        makeRequest({ method: "card" }),
      );
      expect(selection.provider).toBe("stripe");
      expect(selection.reason).toContain("Card payment");
    });

    it("should select Stripe when no method is specified (default)", () => {
      const selection = router.selectProvider(
        makeRequest({ method: undefined }),
      );
      expect(selection.provider).toBe("stripe");
    });

    it("should select TrueLayer for SEPA in EU", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "EU", method: "sepa", currency: "EUR" }),
      );
      expect(selection.provider).toBe("truelayer");
      expect(selection.reason).toContain("SEPA");
    });

    it("should select TrueLayer for SEPA in Eurozone (NL)", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "NL", method: "sepa", currency: "EUR" }),
      );
      expect(selection.provider).toBe("truelayer");
    });

    it("should select Stripe for ACH in US", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "US", method: "ach", currency: "USD" }),
      );
      expect(selection.provider).toBe("stripe");
      expect(selection.reason).toContain("ACH");
      expect(selection.fees.fixed).toBe(0);
      expect(selection.fees.percentage).toBe(0.8);
    });

    it("should default to Stripe for unrecognized method/region combos", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "JP", method: "sepa" }),
      );
      expect(selection.provider).toBe("stripe");
      expect(selection.reason).toBe("Default payment provider");
    });

    it("should calculate correct TrueLayer fee estimates", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "GB", method: "open_banking", amount: 10000 }),
      );
      expect(selection.fees.fixed).toBe(20);
      expect(selection.fees.percentage).toBe(0.2);
      expect(selection.fees.estimatedTotal).toBe(20 + (10000 * 0.2) / 100);
    });

    it("should calculate correct Stripe card fee estimates", () => {
      const selection = router.selectProvider(
        makeRequest({ method: "card", amount: 10000 }),
      );
      expect(selection.fees.fixed).toBe(30);
      expect(selection.fees.percentage).toBe(2.9);
      expect(selection.fees.estimatedTotal).toBe(30 + (10000 * 2.9) / 100);
    });

    it("should calculate correct ACH fee estimates (no fixed fee)", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "US", method: "ach", amount: 10000 }),
      );
      expect(selection.fees.fixed).toBe(0);
      expect(selection.fees.estimatedTotal).toBe((10000 * 0.8) / 100);
    });

    it("should return estimated time for TrueLayer", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "GB", method: "open_banking" }),
      );
      expect(selection.estimatedTime).toBe("Instant to 2 hours");
    });

    it("should return estimated time for Stripe card", () => {
      const selection = router.selectProvider(
        makeRequest({ method: "card" }),
      );
      expect(selection.estimatedTime).toBe("Instant");
    });

    it("should return estimated time for SEPA", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "EU", method: "sepa" }),
      );
      expect(selection.estimatedTime).toBe("1-2 business days");
    });

    it("should return estimated time for ACH", () => {
      const selection = router.selectProvider(
        makeRequest({ region: "US", method: "ach" }),
      );
      expect(selection.estimatedTime).toBe("3-5 business days");
    });
  });

  // ===========================================================================
  // processPayment
  // ===========================================================================

  describe("processPayment", () => {
    beforeEach(() => {
      // Default: createPaymentRecord returns an id
      mockBuilder.single.mockResolvedValue({
        data: { id: "pay-001" },
        error: null,
      });

      // Default: getOrCreateStripeCustomer flow
      setupStripeCustomerMock("cus-existing-123");
    });

    it("should route to Stripe for a card payment and return UnifiedPayment", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_abc",
        status: "requires_payment_method",
        client_secret: "secret_123",
      } as any);

      const result = await router.processPayment(makeRequest({ method: "card" }));

      expect(result.provider).toBe("stripe");
      expect(result.providerPaymentId).toBe("pi_abc");
      expect(result.status).toBe("pending");
      expect(result.clientSecret).toBe("secret_123");
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    });

    it("should route to TrueLayer for open_banking in GB", async () => {
      mockTrueLayerConnector.createPayment.mockResolvedValue({
        paymentId: "tl-pay-001",
        authUri: "https://truelayer.com/auth",
        resourceToken: "rt-abc",
        expiresAt: new Date(),
      });

      const result = await router.processPayment(
        makeRequest({ region: "GB", method: "open_banking", currency: "GBP" }),
      );

      expect(result.provider).toBe("truelayer");
      expect(result.providerPaymentId).toBe("tl-pay-001");
      expect(result.authUrl).toBe("https://truelayer.com/auth");
      expect(result.method).toBe("open_banking");
      expect(mockTrueLayerConnector.createPayment).toHaveBeenCalledTimes(1);
    });

    it("should create a payment record in DB before processing", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_xyz",
        status: "succeeded",
        client_secret: null,
      } as any);

      await router.processPayment(makeRequest());

      // insert was called (via from -> insert -> select -> single chain)
      expect(mockSupabase.from).toHaveBeenCalledWith("payments");
      expect(mockBuilder.insert).toHaveBeenCalledTimes(1);
    });

    it("should update DB record on success", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_xyz",
        status: "succeeded",
        client_secret: null,
      } as any);

      await router.processPayment(makeRequest());

      // update was called for the payment record
      expect(mockBuilder.update).toHaveBeenCalled();
    });

    it("should update DB record with failed status on provider error and rethrow", async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error("Stripe card declined"),
      );

      await expect(
        router.processPayment(makeRequest({ method: "card" })),
      ).rejects.toThrow("Stripe card declined");

      // Should still update the DB with failure
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
    });

    it("should throw when createPaymentRecord fails", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "DB insert failed" },
      });

      await expect(
        router.processPayment(makeRequest()),
      ).rejects.toThrow("Failed to create payment record");
    });

    it("should pass correct metadata to Stripe PaymentIntent", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_meta",
        status: "succeeded",
        client_secret: null,
      } as any);

      await router.processPayment(
        makeRequest({ metadata: { order_id: "ord-99" } }),
      );

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            user_id: "user-123",
            order_id: "ord-99",
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // processStripePayment (via processPayment with card)
  // ===========================================================================

  describe("processStripePayment", () => {
    beforeEach(() => {
      mockBuilder.single.mockResolvedValue({
        data: { id: "pay-stripe-001" },
        error: null,
      });
      setupStripeCustomerMock("cus-abc");
    });

    it("should create a PaymentIntent with the correct amount and currency", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_100",
        status: "requires_payment_method",
        client_secret: "cs_100",
      } as any);

      await router.processPayment(
        makeRequest({ amount: 9900, currency: "EUR", method: "card" }),
      );

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9900,
          currency: "eur",
          customer: "cus-abc",
        }),
      );
    });

    it("should confirm immediately when paymentMethodId is provided", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_pm",
        status: "succeeded",
        client_secret: null,
      } as any);

      await router.processPayment(
        makeRequest({ method: "card", paymentMethodId: "pm_visa" }),
      );

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: "pm_visa",
          confirm: true,
        }),
      );
    });

    it("should enable automatic_payment_methods when no paymentMethodId", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_auto",
        status: "requires_payment_method",
        client_secret: "cs_auto",
      } as any);

      await router.processPayment(makeRequest({ method: "card" }));

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          automatic_payment_methods: { enabled: true },
          confirm: false,
        }),
      );
    });

    it("should map Stripe status 'succeeded' to 'succeeded'", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_s",
        status: "succeeded",
        client_secret: null,
      } as any);

      const result = await router.processPayment(makeRequest({ method: "card" }));
      expect(result.status).toBe("succeeded");
    });

    it("should map Stripe status 'processing' to 'processing'", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_p",
        status: "processing",
        client_secret: null,
      } as any);

      const result = await router.processPayment(makeRequest({ method: "card" }));
      expect(result.status).toBe("processing");
    });

    it("should map Stripe status 'canceled' to 'canceled'", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_c",
        status: "canceled",
        client_secret: null,
      } as any);

      const result = await router.processPayment(makeRequest({ method: "card" }));
      expect(result.status).toBe("canceled");
    });

    it("should map Stripe status 'requires_action' to 'pending'", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_ra",
        status: "requires_action",
        client_secret: "cs_3ds",
      } as any);

      const result = await router.processPayment(makeRequest({ method: "card" }));
      expect(result.status).toBe("pending");
    });
  });

  // ===========================================================================
  // processStripeSubscription
  // ===========================================================================

  describe("processStripeSubscription", () => {
    beforeEach(() => {
      mockBuilder.single.mockResolvedValue({
        data: { id: "pay-sub-001" },
        error: null,
      });
      setupStripeCustomerMock("cus-sub-abc");
    });

    it("should create a Stripe Subscription when type is subscription", async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: "sub_123",
        status: "incomplete",
        latest_invoice: {
          payment_intent: {
            client_secret: "cs_sub_secret",
          },
        },
      } as any);

      const result = await router.processPayment(
        makeRequest({
          type: "subscription",
          priceId: "price_monthly",
          method: "card",
        }),
      );

      expect(result.provider).toBe("stripe");
      expect(result.providerPaymentId).toBe("sub_123");
      expect(result.type).toBe("subscription");
      expect(result.clientSecret).toBe("cs_sub_secret");
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus-sub-abc",
          items: [{ price: "price_monthly" }],
          payment_behavior: "default_incomplete",
        }),
      );
    });

    it("should map subscription status 'active' to 'succeeded'", async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: "sub_active",
        status: "active",
        latest_invoice: { payment_intent: null },
      } as any);

      const result = await router.processPayment(
        makeRequest({ type: "subscription", priceId: "price_test" }),
      );
      expect(result.status).toBe("succeeded");
    });

    it("should map subscription status 'incomplete' to 'pending'", async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: "sub_inc",
        status: "incomplete",
        latest_invoice: { payment_intent: null },
      } as any);

      const result = await router.processPayment(
        makeRequest({ type: "subscription", priceId: "price_test" }),
      );
      expect(result.status).toBe("pending");
    });

    it("should map subscription status 'canceled' to 'canceled'", async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: "sub_can",
        status: "canceled",
        latest_invoice: { payment_intent: null },
      } as any);

      const result = await router.processPayment(
        makeRequest({ type: "subscription", priceId: "price_test" }),
      );
      expect(result.status).toBe("canceled");
    });

    it("should handle missing client_secret when payment_intent is not an object", async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: "sub_no_pi",
        status: "active",
        latest_invoice: { payment_intent: "pi_string_ref" },
      } as any);

      const result = await router.processPayment(
        makeRequest({ type: "subscription", priceId: "price_test" }),
      );
      expect(result.clientSecret).toBeUndefined();
    });
  });

  // ===========================================================================
  // processTrueLayerPayment
  // ===========================================================================

  describe("processTrueLayerPayment", () => {
    beforeEach(() => {
      mockBuilder.single.mockResolvedValue({
        data: { id: "pay-tl-001" },
        error: null,
      });
    });

    it("should call truelayerConnector.createPayment with correct payload", async () => {
      mockTrueLayerConnector.createPayment.mockResolvedValue({
        paymentId: "tl-id-001",
        authUri: "https://truelayer.com/auth/001",
        resourceToken: "rt-001",
        expiresAt: new Date(),
      });

      await router.processPayment(
        makeRequest({
          region: "GB",
          method: "open_banking",
          currency: "GBP",
          amount: 7500,
        }),
      );

      expect(mockTrueLayerConnector.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: { currency: "GBP", value: 7500 },
          reference: expect.stringContaining("FYN-"),
        }),
      );
    });

    it("should use external_account beneficiary when beneficiary details provided", async () => {
      mockTrueLayerConnector.createPayment.mockResolvedValue({
        paymentId: "tl-ext-001",
        authUri: "https://truelayer.com/auth/ext",
        resourceToken: "rt-ext",
        expiresAt: new Date(),
      });

      await router.processPayment(
        makeRequest({
          region: "GB",
          method: "open_banking",
          currency: "GBP",
          beneficiary: {
            name: "John Doe",
            iban: "GB82WEST12345698765432",
          },
        }),
      );

      expect(mockTrueLayerConnector.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiary: expect.objectContaining({
            type: "external_account",
            accountHolderName: "John Doe",
            accountIdentifier: { type: "iban", iban: "GB82WEST12345698765432" },
          }),
        }),
      );
    });

    it("should use sort_code_account_number when no IBAN", async () => {
      mockTrueLayerConnector.createPayment.mockResolvedValue({
        paymentId: "tl-sc-001",
        authUri: "https://truelayer.com/auth/sc",
        resourceToken: "rt-sc",
        expiresAt: new Date(),
      });

      await router.processPayment(
        makeRequest({
          region: "GB",
          method: "open_banking",
          currency: "GBP",
          beneficiary: {
            name: "Jane Doe",
            sortCode: "123456",
            accountNumber: "12345678",
          },
        }),
      );

      expect(mockTrueLayerConnector.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiary: expect.objectContaining({
            accountIdentifier: {
              type: "sort_code_account_number",
              sortCode: "123456",
              accountNumber: "12345678",
            },
          }),
        }),
      );
    });

    it("should use merchant_account beneficiary when no beneficiary provided", async () => {
      mockTrueLayerConnector.createPayment.mockResolvedValue({
        paymentId: "tl-merch-001",
        authUri: "https://truelayer.com/auth/merch",
        resourceToken: "rt-merch",
        expiresAt: new Date(),
      });

      await router.processPayment(
        makeRequest({ region: "GB", method: "open_banking", currency: "GBP" }),
      );

      expect(mockTrueLayerConnector.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiary: expect.objectContaining({
            type: "merchant_account",
          }),
        }),
      );
    });

    it("should use custom reference when provided", async () => {
      mockTrueLayerConnector.createPayment.mockResolvedValue({
        paymentId: "tl-ref-001",
        authUri: "https://truelayer.com/auth/ref",
        resourceToken: "rt-ref",
        expiresAt: new Date(),
      });

      await router.processPayment(
        makeRequest({
          region: "GB",
          method: "open_banking",
          currency: "GBP",
          reference: "CUSTOM-REF-42",
        }),
      );

      expect(mockTrueLayerConnector.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ reference: "CUSTOM-REF-42" }),
      );
    });
  });

  // ===========================================================================
  // getPaymentStatus
  // ===========================================================================

  describe("getPaymentStatus", () => {
    it("should return mapped payment from DB", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-100",
          provider: "stripe",
          provider_payment_id: "pi_100",
          status: "succeeded",
          amount: 5000,
          currency: "USD",
          type: "one_time",
          method: "card",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      const result = await router.getPaymentStatus("pay-100");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("pay-100");
      expect(result!.provider).toBe("stripe");
      expect(result!.status).toBe("succeeded");
    });

    it("should return null when payment not found", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await router.getPaymentStatus("nonexistent");
      expect(result).toBeNull();
    });

    it("should refresh status from Stripe when payment is pending", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-pending",
          provider: "stripe",
          provider_payment_id: "pi_pending",
          status: "pending",
          amount: 5000,
          currency: "USD",
          type: "one_time",
          method: "card",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: "pi_pending",
        status: "succeeded",
      } as any);

      const result = await router.getPaymentStatus("pay-pending");

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_pending");
      expect(result!.status).toBe("succeeded");
    });

    it("should refresh status from TrueLayer when payment is processing", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-tl-proc",
          provider: "truelayer",
          provider_payment_id: "tl-proc-001",
          status: "processing",
          amount: 3000,
          currency: "GBP",
          type: "one_time",
          method: "open_banking",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockTrueLayerConnector.getPayment.mockResolvedValue({
        id: "tl-proc-001",
        status: "executed",
      });

      const result = await router.getPaymentStatus("pay-tl-proc");

      expect(mockTrueLayerConnector.getPayment).toHaveBeenCalledWith("tl-proc-001");
      expect(result!.status).toBe("succeeded");
    });

    it("should not refresh when status is already terminal (succeeded)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-done",
          provider: "stripe",
          provider_payment_id: "pi_done",
          status: "succeeded",
          amount: 5000,
          currency: "USD",
          type: "one_time",
          method: "card",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      await router.getPaymentStatus("pay-done");

      expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
      expect(mockTrueLayerConnector.getPayment).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // createRefund
  // ===========================================================================

  describe("createRefund", () => {
    it("should create a Stripe refund for a Stripe payment", async () => {
      // getPaymentStatus returns a Stripe payment
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-ref-1",
          provider: "stripe",
          provider_payment_id: "pi_refundable",
          status: "succeeded",
          amount: 5000,
          currency: "USD",
          type: "one_time",
          method: "card",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockStripe.refunds.create.mockResolvedValue({
        id: "re_abc",
        status: "succeeded",
        amount: 5000,
      } as any);

      const result = await router.createRefund("pay-ref-1");

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: "pi_refundable",
          amount: 5000,
        }),
      );
      expect(result.id).toBe("re_abc");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(5000);
    });

    it("should create a partial Stripe refund when amount specified", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-ref-2",
          provider: "stripe",
          provider_payment_id: "pi_partial",
          status: "succeeded",
          amount: 10000,
          currency: "USD",
          type: "one_time",
          method: "card",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockStripe.refunds.create.mockResolvedValue({
        id: "re_partial",
        status: "pending",
        amount: 3000,
      } as any);

      const result = await router.createRefund("pay-ref-2", 3000, "requested_by_customer");

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3000,
          reason: "requested_by_customer",
        }),
      );
      expect(result.status).toBe("pending");
      expect(result.amount).toBe(3000);
    });

    it("should create a TrueLayer refund for a TrueLayer payment", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-tl-ref",
          provider: "truelayer",
          provider_payment_id: "tl-refundable",
          status: "succeeded",
          amount: 7000,
          currency: "GBP",
          type: "one_time",
          method: "open_banking",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockTrueLayerConnector.createRefund.mockResolvedValue({
        id: "tlref-001",
        status: "executed",
        amount: { currency: "GBP", value: 7000 },
      });

      const result = await router.createRefund("pay-tl-ref");

      expect(mockTrueLayerConnector.createRefund).toHaveBeenCalledWith(
        "tl-refundable",
        { currency: "GBP", value: 7000 },
        "Refund for pay-tl-ref",
      );
      expect(result.id).toBe("tlref-001");
      expect(result.status).toBe("succeeded");
    });

    it("should return pending for TrueLayer refund that is not yet executed", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-tl-ref2",
          provider: "truelayer",
          provider_payment_id: "tl-refund-pending",
          status: "succeeded",
          amount: 4000,
          currency: "EUR",
          type: "one_time",
          method: "open_banking",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockTrueLayerConnector.createRefund.mockResolvedValue({
        id: "tlref-pending",
        status: "pending",
      });

      const result = await router.createRefund("pay-tl-ref2");
      expect(result.status).toBe("pending");
    });

    it("should throw when payment not found", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      await expect(router.createRefund("nonexistent")).rejects.toThrow(
        "Payment not found: nonexistent",
      );
    });
  });

  // ===========================================================================
  // handleStripeWebhook
  // ===========================================================================

  describe("handleStripeWebhook", () => {
    it("should update payment to succeeded on payment_intent.succeeded", async () => {
      const event = {
        type: "payment_intent.succeeded",
        data: {
          object: { id: "pi_webhook_success" },
        },
      } as any;

      await router.handleStripeWebhook(event);

      expect(mockSupabase.from).toHaveBeenCalledWith("payments");
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "succeeded" }),
      );
      expect(mockBuilder.eq).toHaveBeenCalledWith("provider", "stripe");
      expect(mockBuilder.eq).toHaveBeenCalledWith(
        "provider_payment_id",
        "pi_webhook_success",
      );
    });

    it("should update payment to failed on payment_intent.payment_failed", async () => {
      const event = {
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_webhook_fail",
            last_payment_error: { message: "Card was declined" },
          },
        },
      } as any;

      await router.handleStripeWebhook(event);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          metadata: { error: "Card was declined" },
        }),
      );
    });

    it("should handle payment_failed with no error message", async () => {
      const event = {
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_webhook_fail2",
            last_payment_error: null,
          },
        },
      } as any;

      await router.handleStripeWebhook(event);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          metadata: undefined,
        }),
      );
    });

    it("should ignore unhandled event types without throwing", async () => {
      const event = {
        type: "charge.updated",
        data: { object: { id: "ch_xxx" } },
      } as any;

      await expect(router.handleStripeWebhook(event)).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // handleTrueLayerWebhook
  // ===========================================================================

  describe("handleTrueLayerWebhook", () => {
    it("should update payment to succeeded on payment_executed", async () => {
      mockTrueLayerConnector.verifyWebhookSignature.mockReturnValue(true);
      mockTrueLayerConnector.parseWebhookEvent.mockReturnValue({
        type: "payment_executed",
        paymentId: "tl-wh-001",
        status: "executed",
        data: {},
      });

      await router.handleTrueLayerWebhook('{"type":"payment_executed"}', "sig-abc");

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "succeeded" }),
      );
      expect(mockBuilder.eq).toHaveBeenCalledWith("provider", "truelayer");
      expect(mockBuilder.eq).toHaveBeenCalledWith(
        "provider_payment_id",
        "tl-wh-001",
      );
    });

    it("should update payment to succeeded on payment_settled", async () => {
      mockTrueLayerConnector.verifyWebhookSignature.mockReturnValue(true);
      mockTrueLayerConnector.parseWebhookEvent.mockReturnValue({
        type: "payment_settled",
        paymentId: "tl-settled-001",
        status: "settled",
        data: {},
      });

      await router.handleTrueLayerWebhook('{"type":"payment_settled"}', "sig-xyz");

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "succeeded" }),
      );
    });

    it("should update payment to failed on payment_failed", async () => {
      mockTrueLayerConnector.verifyWebhookSignature.mockReturnValue(true);
      mockTrueLayerConnector.parseWebhookEvent.mockReturnValue({
        type: "payment_failed",
        paymentId: "tl-fail-001",
        status: "failed",
        data: {},
      });

      await router.handleTrueLayerWebhook('{"type":"payment_failed"}', "sig-fail");

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
    });

    it("should throw on invalid webhook signature", async () => {
      mockTrueLayerConnector.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        router.handleTrueLayerWebhook("bad-payload", "bad-sig"),
      ).rejects.toThrow("Invalid webhook signature");
    });

    it("should not update when paymentId is missing", async () => {
      mockTrueLayerConnector.verifyWebhookSignature.mockReturnValue(true);
      mockTrueLayerConnector.parseWebhookEvent.mockReturnValue({
        type: "payment_executed",
        paymentId: undefined,
        status: "executed",
        data: {},
      });

      await router.handleTrueLayerWebhook("{}", "sig-no-id");

      // Should not attempt DB update since paymentId is missing
      expect(mockBuilder.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getOrCreateStripeCustomer (tested through processPayment)
  // ===========================================================================

  describe("getOrCreateStripeCustomer", () => {
    beforeEach(() => {
      mockBuilder.single.mockResolvedValue({
        data: { id: "pay-cust-test" },
        error: null,
      });
    });

    it("should return existing customer ID from profiles", async () => {
      // First call: from("profiles").select().eq().single() -> has stripe_customer_id
      let callCount = 0;
      mockBuilder.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // createPaymentRecord
          return Promise.resolve({ data: { id: "pay-cust-01" }, error: null });
        }
        if (callCount === 2) {
          // getOrCreateStripeCustomer -> profiles lookup
          return Promise.resolve({
            data: { stripe_customer_id: "cus-existing", full_name: "Test User" },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_cust",
        status: "succeeded",
        client_secret: null,
      } as any);

      await router.processPayment(makeRequest({ method: "card" }));

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus-existing" }),
      );
      // Should NOT create a new customer
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it("should create new Stripe customer when none exists", async () => {
      let callCount = 0;
      mockBuilder.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // createPaymentRecord
          return Promise.resolve({ data: { id: "pay-new-cust" }, error: null });
        }
        if (callCount === 2) {
          // getOrCreateStripeCustomer -> profiles lookup -> no stripe_customer_id
          return Promise.resolve({
            data: { stripe_customer_id: null, full_name: "New User" },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { email: "new@example.com" } },
      } as any);

      mockStripe.customers.create.mockResolvedValue({
        id: "cus-brand-new",
      } as any);

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_new_cust",
        status: "succeeded",
        client_secret: null,
      } as any);

      await router.processPayment(makeRequest({ method: "card" }));

      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@example.com",
          name: "New User",
          metadata: { user_id: "user-123" },
        }),
      );
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("error handling", () => {
    beforeEach(() => {
      mockBuilder.single.mockResolvedValue({
        data: { id: "pay-err-001" },
        error: null,
      });
      setupStripeCustomerMock("cus-err");
    });

    it("should propagate Stripe API errors", async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error("Your card has insufficient funds"),
      );

      await expect(
        router.processPayment(makeRequest({ method: "card" })),
      ).rejects.toThrow("Your card has insufficient funds");
    });

    it("should propagate TrueLayer API errors", async () => {
      mockTrueLayerConnector.createPayment.mockRejectedValue(
        new Error("TrueLayer API error: 503 - Service unavailable"),
      );

      await expect(
        router.processPayment(
          makeRequest({ region: "GB", method: "open_banking", currency: "GBP" }),
        ),
      ).rejects.toThrow("TrueLayer API error");
    });

    it("should propagate refund errors from Stripe", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "pay-refund-err",
          provider: "stripe",
          provider_payment_id: "pi_refund_err",
          status: "succeeded",
          amount: 5000,
          currency: "USD",
          type: "one_time",
          method: "card",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      mockStripe.refunds.create.mockRejectedValue(
        new Error("Charge has already been refunded"),
      );

      await expect(
        router.createRefund("pay-refund-err"),
      ).rejects.toThrow("Charge has already been refunded");
    });
  });
});

// =============================================================================
// Helper: set up the Stripe customer mock chain
// =============================================================================

function setupStripeCustomerMock(customerId: string): void {
  // The getOrCreateStripeCustomer method queries profiles.stripe_customer_id
  // We handle this via the chainable mockBuilder; the second .single() call
  // in processPayment is the profiles lookup.
  let singleCallCount = 0;
  mockBuilder.single.mockImplementation(() => {
    singleCallCount++;
    if (singleCallCount === 1) {
      // createPaymentRecord
      return Promise.resolve({ data: { id: "pay-auto-id" }, error: null });
    }
    // getOrCreateStripeCustomer -> profiles lookup
    return Promise.resolve({
      data: { stripe_customer_id: customerId, full_name: "Mock User" },
      error: null,
    });
  });
}
