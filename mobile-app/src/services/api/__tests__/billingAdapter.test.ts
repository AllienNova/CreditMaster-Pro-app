/**
 * mapWebBilling — web -> mobile billing-overview adapter (PARITY-P2).
 *
 * The real web route GET /api/payment/billing (Stripe-backed) returns
 * plans + subscription + payment methods + invoices in one un-wrapped payload
 * with ISO-string dates. This adapter reduces it to the BillingOverview
 * view-model the billing overview screen renders. Getting it wrong ships a wrong
 * plan/price, a fabricated card, or a fabricated invoice — the exact FND-016 risk
 * this wiring removes. These tests prove: plan name/price resolve from the plan
 * catalog by planId, the default payment method is chosen honestly, invoices are
 * mapped and capped at 3, and a user with no Stripe presence yields null card +
 * empty invoices (never a fabricated card or invoice).
 */

// Stub the module's side-effecting imports so user.ts loads in isolation. The
// client's `api.get` is mockable so the getBillingOverview wiring can be exercised.
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock("../client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));
jest.mock("../../offline-sync", () => ({ offlineSyncService: {} }));

import {
  mapWebBilling,
  mapWebInvoices,
  mapWebSubscription,
  subscriptionApi,
  type WebBillingResponse,
} from "../user";

const PLANS = [
  { id: "free", name: "Free", price: 0, interval: "month" },
  { id: "standard", name: "Standard", price: 29.99, interval: "month" },
  { id: "pro", name: "Pro", price: 99.99, interval: "month" },
];

function response(over: Partial<WebBillingResponse> = {}): WebBillingResponse {
  return {
    plans: PLANS,
    subscription: {
      planId: "standard",
      status: "active",
      currentPeriodStart: "2027-01-15T00:00:00.000Z",
      currentPeriodEnd: "2027-02-15T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    },
    paymentMethods: [
      {
        id: "pm_1",
        brand: "mastercard",
        last4: "5100",
        expMonth: 8,
        expYear: 2027,
        isDefault: true,
      },
    ],
    invoices: [
      {
        id: "in_1001",
        amount: 29.99,
        status: "paid",
        created: "2027-01-15T00:00:00.000Z",
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("subscriptionApi.getBillingOverview", () => {
  it("fetches GET /payment/billing and returns the mapped overview", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: response() });
    const res = await subscriptionApi.getBillingOverview();
    expect(mockApiGet).toHaveBeenCalledWith("/payment/billing");
    expect(res.success).toBe(true);
    expect(res.data?.planName).toBe("Standard");
    expect(res.data?.paymentMethod?.last4).toBe("5100");
    expect(res.data?.recentInvoices[0]?.id).toBe("in_1001");
  });

  it("propagates the error without fabricating data when the fetch fails", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });
    const res = await subscriptionApi.getBillingOverview();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.code).toBe("HTTP_401");
  });
});

describe("mapWebBilling", () => {
  it("resolves plan name, price, and interval from the plan catalog by planId", () => {
    const vm = mapWebBilling(response());
    expect(vm.planName).toBe("Standard");
    expect(vm.price).toBe(29.99);
    expect(vm.interval).toBe("month");
    expect(vm.status).toBe("active");
  });

  it("formats the next-billing date from currentPeriodEnd (YYYY-MM-DD)", () => {
    expect(mapWebBilling(response()).nextBilling).toBe("2027-02-15");
  });

  it("returns null next-billing when the subscription has no period end (free plan)", () => {
    const vm = mapWebBilling(
      response({
        subscription: {
          planId: "free",
          status: "active",
          cancelAtPeriodEnd: false,
        },
      }),
    );
    expect(vm.nextBilling).toBeNull();
    expect(vm.planName).toBe("Free");
    expect(vm.price).toBe(0);
  });

  it("reduces the default payment method to brand/last4/expiry — chosen by isDefault", () => {
    const vm = mapWebBilling(
      response({
        paymentMethods: [
          {
            id: "pm_a",
            brand: "visa",
            last4: "1881",
            expMonth: 1,
            expYear: 2029,
            isDefault: false,
          },
          {
            id: "pm_b",
            brand: "amex",
            last4: "0005",
            expMonth: 6,
            expYear: 2030,
            isDefault: true,
          },
        ],
      }),
    );
    expect(vm.paymentMethod).toEqual({
      brand: "amex",
      last4: "0005",
      expMonth: 6,
      expYear: 2030,
    });
  });

  it("falls back to the first payment method when none is flagged default", () => {
    const vm = mapWebBilling(
      response({
        paymentMethods: [
          {
            id: "pm_a",
            brand: "visa",
            last4: "1881",
            expMonth: 1,
            expYear: 2029,
            isDefault: false,
          },
        ],
      }),
    );
    expect(vm.paymentMethod?.last4).toBe("1881");
  });

  it("yields a null payment method (never a fabricated card) when the user has none", () => {
    const vm = mapWebBilling(response({ paymentMethods: [] }));
    expect(vm.paymentMethod).toBeNull();
  });

  it("maps invoices (date from created) and caps the list at 3", () => {
    const vm = mapWebBilling(
      response({
        invoices: [
          { id: "in_5", amount: 5, status: "paid", created: "2027-05-01T00:00:00.000Z" },
          { id: "in_4", amount: 4, status: "paid", created: "2027-04-01T00:00:00.000Z" },
          { id: "in_3", amount: 3, status: "open", created: "2027-03-01T00:00:00.000Z" },
          { id: "in_2", amount: 2, status: "paid", created: "2027-02-01T00:00:00.000Z" },
        ],
      }),
    );
    expect(vm.recentInvoices).toHaveLength(3);
    expect(vm.recentInvoices[0]).toEqual({
      id: "in_5",
      date: "2027-05-01",
      amount: 5,
      status: "paid",
    });
    expect(vm.recentInvoices.map((i) => i.id)).toEqual(["in_5", "in_4", "in_3"]);
  });

  it("yields an empty invoice list (never a fabricated invoice) when the user has none", () => {
    expect(mapWebBilling(response({ invoices: [] })).recentInvoices).toEqual([]);
  });

  it("defaults planName/price to the free tier when planId is not in the catalog", () => {
    const vm = mapWebBilling(
      response({
        plans: [],
        subscription: {
          planId: "unknown",
          status: "active",
          cancelAtPeriodEnd: false,
        },
      }),
    );
    expect(vm.planName).toBe("Free");
    expect(vm.price).toBe(0);
    expect(vm.interval).toBe("month");
  });

  it("preserves cancelAtPeriodEnd from the subscription", () => {
    const vm = mapWebBilling(
      response({
        subscription: {
          planId: "standard",
          status: "active",
          currentPeriodEnd: "2027-02-15T00:00:00.000Z",
          cancelAtPeriodEnd: true,
        },
      }),
    );
    expect(vm.cancelAtPeriodEnd).toBe(true);
  });
});

describe("subscriptionApi.getSubscriptionDetail", () => {
  it("fetches GET /payment/billing and returns the mapped subscription detail", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: response() });
    const res = await subscriptionApi.getSubscriptionDetail();
    expect(mockApiGet).toHaveBeenCalledWith("/payment/billing");
    expect(res.success).toBe(true);
    expect(res.data?.plans).toHaveLength(PLANS.length);
    expect(res.data?.currentPlanId).toBe("standard");
    expect(res.data?.plans.find((p) => p.id === "standard")?.isCurrent).toBe(
      true,
    );
  });

  it("propagates the error without fabricating data when the fetch fails", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });
    const res = await subscriptionApi.getSubscriptionDetail();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.code).toBe("HTTP_401");
  });
});

describe("mapWebSubscription", () => {
  it("maps the full catalog and marks the active plan by subscription.planId", () => {
    const vm = mapWebSubscription(response());
    expect(vm.plans.map((p) => p.id)).toEqual(["free", "standard", "pro"]);
    expect(vm.plans.find((p) => p.id === "standard")?.isCurrent).toBe(true);
    expect(vm.plans.find((p) => p.id === "pro")?.isCurrent).toBe(false);
    expect(vm.currentPlanId).toBe("standard");
    expect(vm.status).toBe("active");
    expect(vm.nextBilling).toBe("2027-02-15");
    expect(vm.cancelAtPeriodEnd).toBe(false);
  });

  it("carries each plan's features through, defaulting to an empty list when absent", () => {
    const vm = mapWebSubscription(
      response({
        plans: [
          {
            id: "pro",
            name: "Pro",
            price: 99.99,
            interval: "month",
            features: ["Unlimited disputes", "24/7 AI coach"],
          },
          // No `features` on this plan — must map to [] rather than undefined.
          { id: "free", name: "Free", price: 0, interval: "month" },
        ],
        subscription: {
          planId: "pro",
          status: "active",
          cancelAtPeriodEnd: false,
        },
      }),
    );
    expect(vm.plans[0]?.features).toEqual([
      "Unlimited disputes",
      "24/7 AI coach",
    ]);
    expect(vm.plans[1]?.features).toEqual([]);
  });

  it("returns null next-billing when the subscription has no period end", () => {
    const vm = mapWebSubscription(
      response({
        subscription: {
          planId: "free",
          status: "active",
          cancelAtPeriodEnd: false,
        },
      }),
    );
    expect(vm.nextBilling).toBeNull();
  });

  it("preserves cancelAtPeriodEnd from the subscription", () => {
    const vm = mapWebSubscription(
      response({
        subscription: {
          planId: "standard",
          status: "active",
          currentPeriodEnd: "2027-02-15T00:00:00.000Z",
          cancelAtPeriodEnd: true,
        },
      }),
    );
    expect(vm.cancelAtPeriodEnd).toBe(true);
  });

  it("marks nothing current when the active planId is not in the catalog", () => {
    const vm = mapWebSubscription(
      response({
        subscription: {
          planId: "ghost",
          status: "active",
          cancelAtPeriodEnd: false,
        },
      }),
    );
    expect(vm.plans.every((p) => !p.isCurrent)).toBe(true);
    expect(vm.currentPlanId).toBe("ghost");
  });
});

describe("subscriptionApi.updatePlan / cancelPlan", () => {
  it("posts the planId to the real plan-change route", async () => {
    mockApiPost.mockResolvedValue({
      success: true,
      data: { status: "updated" },
    });
    const res = await subscriptionApi.updatePlan("pro");
    expect(mockApiPost).toHaveBeenCalledWith("/payment/billing/plan", {
      planId: "pro",
    });
    expect(res.data?.status).toBe("updated");
  });

  it("returns the checkout redirect for a new subscription", async () => {
    mockApiPost.mockResolvedValue({
      success: true,
      data: {
        status: "redirect",
        checkoutUrl: "https://checkout.stripe.com/c/pay/x",
      },
    });
    const res = await subscriptionApi.updatePlan("pro");
    expect(res.data?.status).toBe("redirect");
    expect(res.data?.checkoutUrl).toBe("https://checkout.stripe.com/c/pay/x");
  });

  it("cancels by posting cancelSubscription: true (never fabricates success)", async () => {
    mockApiPost.mockResolvedValue({
      success: true,
      data: { status: "updated" },
    });
    await subscriptionApi.cancelPlan();
    expect(mockApiPost).toHaveBeenCalledWith("/payment/billing/plan", {
      cancelSubscription: true,
    });
  });

  it("propagates a plan-change failure without fabricating a result", async () => {
    mockApiPost.mockResolvedValue({
      success: false,
      error: { code: "HTTP_500", message: "Stripe unavailable" },
    });
    const res = await subscriptionApi.updatePlan("pro");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("HTTP_500");
  });
});

describe("subscriptionApi.getInvoices", () => {
  it("fetches GET /payment/billing and returns the mapped invoice list", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: response() });
    const res = await subscriptionApi.getInvoices();
    expect(mockApiGet).toHaveBeenCalledWith("/payment/billing");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([
      { id: "in_1001", date: "2027-01-15", amount: 29.99, status: "paid" },
    ]);
  });

  it("propagates the error without fabricating data when the fetch fails", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });
    const res = await subscriptionApi.getInvoices();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.code).toBe("HTTP_401");
  });
});

describe("mapWebInvoices", () => {
  it("maps id, amount, and date (from created) for each invoice", () => {
    const vm = mapWebInvoices(
      response({
        invoices: [
          {
            id: "in_9",
            amount: 99.99,
            status: "paid",
            created: "2027-06-01T12:00:00.000Z",
          },
        ],
      }),
    );
    expect(vm).toEqual([
      { id: "in_9", date: "2027-06-01", amount: 99.99, status: "paid" },
    ]);
  });

  it("maps every invoice (uncapped, unlike the 3-item overview) in server order", () => {
    const vm = mapWebInvoices(
      response({
        invoices: [
          { id: "i5", amount: 5, status: "paid", created: "2027-05-01T00:00:00.000Z" },
          { id: "i4", amount: 4, status: "paid", created: "2027-04-01T00:00:00.000Z" },
          { id: "i3", amount: 3, status: "open", created: "2027-03-01T00:00:00.000Z" },
          { id: "i2", amount: 2, status: "paid", created: "2027-02-01T00:00:00.000Z" },
        ],
      }),
    );
    expect(vm.map((i) => i.id)).toEqual(["i5", "i4", "i3", "i2"]);
  });

  it("remaps the full Stripe status vocabulary to paid | pending | failed", () => {
    const vm = mapWebInvoices(
      response({
        invoices: [
          { id: "a", amount: 1, status: "paid", created: "2027-01-01T00:00:00.000Z" },
          { id: "b", amount: 1, status: "open", created: "2027-01-01T00:00:00.000Z" },
          { id: "c", amount: 1, status: "draft", created: "2027-01-01T00:00:00.000Z" },
          { id: "d", amount: 1, status: "void", created: "2027-01-01T00:00:00.000Z" },
          {
            id: "e",
            amount: 1,
            status: "uncollectible",
            created: "2027-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(vm.map((i) => i.status)).toEqual([
      "paid",
      "pending",
      "pending",
      "failed",
      "failed",
    ]);
  });

  it("maps an unknown status to pending (honest floor — never a false 'paid')", () => {
    const vm = mapWebInvoices(
      response({
        invoices: [
          {
            id: "x",
            amount: 1,
            status: "some_future_status",
            created: "2027-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(vm[0]?.status).toBe("pending");
  });

  it("carries a real pdfUrl through when present and omits it when absent", () => {
    const vm = mapWebInvoices(
      response({
        invoices: [
          {
            id: "with_pdf",
            amount: 1,
            status: "paid",
            created: "2027-01-01T00:00:00.000Z",
            pdfUrl: "https://files.stripe.com/invoice.pdf",
          },
          {
            id: "no_pdf",
            amount: 1,
            status: "paid",
            created: "2027-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(vm[0]?.pdfUrl).toBe("https://files.stripe.com/invoice.pdf");
    expect(vm[1]?.pdfUrl).toBeUndefined();
  });

  it("degrades a malformed row honestly — absent amount -> 0, invalid/absent date -> ''", () => {
    // The server types amount as a number and created as a string; guard the JSON
    // boundary anyway so a malformed row never fabricates a value or throws.
    const malformed = {
      ...response(),
      invoices: [
        { id: "no_amount", status: "paid", created: "not-a-real-date" },
        { id: "empty_date", amount: 12.5, status: "paid", created: "" },
      ],
    } as unknown as WebBillingResponse;
    const vm = mapWebInvoices(malformed);
    expect(vm[0]).toEqual({ id: "no_amount", date: "", amount: 0, status: "paid" });
    expect(vm[1]?.date).toBe("");
    expect(vm[1]?.amount).toBe(12.5);
  });

  it("yields an empty list (never a fabricated invoice) when the user has none", () => {
    expect(mapWebInvoices(response({ invoices: [] }))).toEqual([]);
  });

  it("yields an empty list when invoices is not an array (defensive JSON boundary)", () => {
    const malformed = {
      ...response(),
      invoices: undefined,
    } as unknown as WebBillingResponse;
    expect(mapWebInvoices(malformed)).toEqual([]);
  });
});
