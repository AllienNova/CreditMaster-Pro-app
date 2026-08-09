/**
 * @jest-environment node
 *
 * Tests for billing-data.ts (TASK-WBH-03 / FND-016, FND-017)
 *
 * getBillingData sources ALL data from the real Stripe API.
 * No fabricated card numbers. No fabricated invoices.
 */

// ── Module mocks (before imports) ────────────────────────────────────────────

const mockPaymentMethodsList = jest.fn();
const mockInvoicesList = jest.fn();

jest.mock("@/lib/payment/stripe-service", () => ({
  stripeService: {
    listPaymentMethods: (...args: unknown[]) => mockPaymentMethodsList(...args),
    listInvoices: (...args: unknown[]) => mockInvoicesList(...args),
  },
  SUBSCRIPTION_PLANS: [
    {
      id: "free",
      name: "Free",
      priceId: "price_free",
      price: 0,
      interval: "month",
      features: [],
    },
    {
      id: "pro",
      name: "Pro",
      priceId: "price_pro_test",
      price: 99.99,
      interval: "month",
      features: [],
    },
  ],
}));

// Use a shared mutable registry so the mock factory closure picks up per-test
// overrides. The factory runs once; the closure holds a reference to this
// registry object, not a snapshot of it.
const dbRegistry: { current: ReturnType<typeof buildDbMock> | null } = {
  current: null,
};

type DbMock = {
  from: (table: string) => { select: jest.Mock };
};

function buildDbMock(
  profileResult: { data: unknown; error: unknown },
  subscriptionResult: { data: unknown; error: unknown },
): DbMock {
  const profileSingle = jest.fn().mockResolvedValue(profileResult);
  const profileEq = jest.fn().mockReturnValue({ single: profileSingle });
  const profileSelect = jest.fn().mockReturnValue({ eq: profileEq });

  const subSingle = jest.fn().mockResolvedValue(subscriptionResult);
  const subLimit = jest.fn().mockReturnValue({ single: subSingle });
  const subOrder = jest.fn().mockReturnValue({ limit: subLimit });
  const subIn = jest.fn().mockReturnValue({ order: subOrder });
  const subEq = jest.fn().mockReturnValue({ in: subIn });
  const subSelect = jest.fn().mockReturnValue({ eq: subEq });

  return {
    from: (table: string) => {
      if (table === "profiles") return { select: profileSelect };
      if (table === "subscriptions") return { select: subSelect };
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => dbRegistry.current,
}));

import { getBillingData } from "../billing-data";

// ── Fixture helpers ───────────────────────────────────────────────────────────

type SubRow = {
  stripe_price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function setupDb(stripeCustomerId: string | null, subRow: SubRow | null): void {
  const profileResult = stripeCustomerId
    ? { data: { stripe_customer_id: stripeCustomerId }, error: null }
    : { data: null, error: { code: "PGRST116", message: "not found" } };

  const subResult = subRow
    ? { data: subRow, error: null }
    : { data: null, error: { code: "PGRST116", message: "not found" } };

  dbRegistry.current = buildDbMock(profileResult, subResult);
}

function makeStripeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "pm_test_001",
    type: "card",
    card: {
      brand: "visa",
      last4: "1234",
      exp_month: 12,
      exp_year: 2029,
    },
    ...overrides,
  };
}

function makeSubRow(overrides: Partial<SubRow> = {}): SubRow {
  return {
    stripe_price_id: "price_pro_test",
    status: "active",
    current_period_start: new Date("2026-01-01").toISOString(),
    current_period_end: new Date("2026-02-01").toISOString(),
    cancel_at_period_end: false,
    ...overrides,
  };
}

function makeStripeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "in_test_001",
    amount_paid: 9999,
    status: "paid",
    created: 1700000000,
    due_date: null,
    invoice_pdf: "https://stripe.com/invoice.pdf",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getBillingData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbRegistry.current = null;
  });

  describe("user with a Stripe customer and active subscription", () => {
    const CUSTOMER_ID = "cus_real_001";
    const USER_ID = "user-abc";

    beforeEach(() => {
      setupDb(CUSTOMER_ID, makeSubRow());
      mockPaymentMethodsList.mockResolvedValue([makeStripeCard()]);
      mockInvoicesList.mockResolvedValue([makeStripeInvoice()]);
    });

    it("returns payment methods sourced from Stripe (no fabricated card)", async () => {
      const data = await getBillingData(USER_ID);

      expect(mockPaymentMethodsList).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(data.paymentMethods).toHaveLength(1);
      expect(data.paymentMethods[0].last4).toBe("1234");
      // Critically: must NOT be the fabricated 4242 card
      expect(data.paymentMethods[0].last4).not.toBe("4242");
      expect(data.paymentMethods[0].brand).toBe("visa");
      expect(data.paymentMethods[0].id).toBe("pm_test_001");
    });

    it("returns plan info sourced from Stripe subscription status", async () => {
      const data = await getBillingData(USER_ID);

      expect(data.subscription.planId).toBe("pro");
      expect(data.subscription.status).toBe("active");
      expect(data.subscription.cancelAtPeriodEnd).toBe(false);
      expect(data.subscription.currentPeriodStart).toBeInstanceOf(Date);
      expect(data.subscription.currentPeriodEnd).toBeInstanceOf(Date);
    });

    it("returns invoices sourced from Stripe (no fabricated invoices)", async () => {
      const data = await getBillingData(USER_ID);

      expect(mockInvoicesList).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(data.invoices).toHaveLength(1);
      expect(data.invoices[0].id).toBe("in_test_001");
      expect(data.invoices[0].amount).toBe(99.99); // cents → dollars
      expect(data.invoices[0].status).toBe("paid");
      expect(data.invoices[0].pdfUrl).toBe("https://stripe.com/invoice.pdf");
    });

    it("calls listPaymentMethods and listInvoices with the resolved customer id", async () => {
      await getBillingData(USER_ID);

      expect(mockPaymentMethodsList).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(mockInvoicesList).toHaveBeenCalledWith(CUSTOMER_ID);
    });
  });

  describe("user with no Stripe customer (new free user)", () => {
    const USER_ID = "user-new-free";

    beforeEach(() => {
      setupDb(null, null);
    });

    it("returns empty payment methods", async () => {
      const data = await getBillingData(USER_ID);
      expect(data.paymentMethods).toEqual([]);
    });

    it("returns free plan", async () => {
      const data = await getBillingData(USER_ID);
      expect(data.subscription.planId).toBe("free");
    });

    it("returns empty invoices", async () => {
      const data = await getBillingData(USER_ID);
      expect(data.invoices).toEqual([]);
    });

    it("does NOT call listPaymentMethods when no customer", async () => {
      await getBillingData(USER_ID);
      expect(mockPaymentMethodsList).not.toHaveBeenCalled();
    });

    it("does NOT call listInvoices when no customer", async () => {
      await getBillingData(USER_ID);
      expect(mockInvoicesList).not.toHaveBeenCalled();
    });
  });

  describe("user with Stripe customer but no active subscription", () => {
    const CUSTOMER_ID = "cus_no_sub";
    const USER_ID = "user-no-sub";

    beforeEach(() => {
      setupDb(CUSTOMER_ID, null);
      mockPaymentMethodsList.mockResolvedValue([makeStripeCard()]);
      mockInvoicesList.mockResolvedValue([makeStripeInvoice()]);
    });

    it("returns free plan when no active subscription found", async () => {
      const data = await getBillingData(USER_ID);
      expect(data.subscription.planId).toBe("free");
    });

    it("still returns payment methods for customers without active sub", async () => {
      const data = await getBillingData(USER_ID);
      expect(data.paymentMethods).toHaveLength(1);
    });
  });

  describe("BillingData shape contract", () => {
    const CUSTOMER_ID = "cus_shape_001";
    const USER_ID = "user-shape";

    beforeEach(() => {
      setupDb(CUSTOMER_ID, makeSubRow());
      mockPaymentMethodsList.mockResolvedValue([makeStripeCard()]);
    });

    it("maps invoice due_date when present", async () => {
      mockInvoicesList.mockResolvedValue([
        makeStripeInvoice({ due_date: 1702678400 }),
      ]);
      const data = await getBillingData(USER_ID);
      expect(data.invoices[0].dueDate).toBeInstanceOf(Date);
    });

    it("invoice dueDate is undefined when due_date is null", async () => {
      mockInvoicesList.mockResolvedValue([makeStripeInvoice({ due_date: null })]);
      const data = await getBillingData(USER_ID);
      expect(data.invoices[0].dueDate).toBeUndefined();
    });
  });
});
