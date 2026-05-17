/** @jest-environment node */

/**
 * WBH-02 / WBH-04 changed-line coverage
 *
 * Covers the six executable changed lines in subscription-service.ts:
 *  - WBH-02: tierFromPriceId() call sites in createSubscription (line 138),
 *             changeSubscriptionPlan (line 373), handleSubscriptionCreated (line 525)
 *  - WBH-04: throw new Error(...) in handleSubscriptionCreated on insert error (line 521)
 *
 * Strategy: jest.isolateModules + jest.doMock so each test group loads a fresh
 * singleton with its own Supabase chain and stripe mock — matching the pattern
 * used in credit-builder-service.test.ts.
 */

// ── Stripe mock (must be at top, hoisted before any import) ──────────────────

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    customers: { retrieve: jest.fn() },
    subscriptions: { create: jest.fn(), update: jest.fn() },
  })),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

type Chain = Record<string, jest.Mock>;

/**
 * Build a minimal Supabase fluent chain.
 * `singleResults` is a queue of { data, error } objects; each call to
 * `.single()` pops the next one. Useful when a test method calls `.single()`
 * more than once (e.g. getUserProfile then getSubscriptionByStripeId).
 *
 * `insertResult` is what `.insert()` resolves to (for handlers that don't
 * chain `.select().single()` after insert).
 */
function makeChain(opts: {
  singleResults?: Array<{ data: unknown; error: unknown }>;
  insertResult?: { data?: unknown; error: unknown };
  updateResult?: { data?: unknown; error: unknown };
} = {}): Chain {
  const singleQueue = opts.singleResults ?? [{ data: null, error: null }];
  let singleIdx = 0;

  const chain: Chain = {};

  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest
    .fn()
    .mockReturnValue(
      opts.insertResult !== undefined ? Promise.resolve(opts.insertResult) : chain,
    );
  chain.update = jest.fn().mockReturnValue(chain);
  chain.upsert = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockImplementation(() => {
    const result = singleQueue[Math.min(singleIdx++, singleQueue.length - 1)];
    return Promise.resolve(result);
  });

  // Allow `await chain` (when update/insert is awaited directly)
  chain.then = jest.fn((resolve: (v: unknown) => unknown) =>
    Promise.resolve(opts.updateResult ?? { data: null, error: null }).then(resolve),
  );

  return chain;
}

/** Load a fresh SubscriptionService singleton with supplied mocks. */
async function loadSvc(opts: {
  supabaseChain: Chain;
  mockStripeService?: Record<string, jest.Mock>;
  mockTierFromPriceId?: jest.Mock;
}) {
  let svc!: typeof import("../subscription-service")["subscriptionService"];

  jest.isolateModules(() => {
    // Mock Supabase client
    jest.doMock("@/lib/supabase/client", () => ({
      getSupabase: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(opts.supabaseChain) }),
    }));

    // Mock tier-mapping
    const tierFn =
      opts.mockTierFromPriceId ??
      jest.fn().mockImplementation((priceId: string) => {
        const map: Record<string, string> = {
          price_pro: "pro",
          price_standard: "standard",
          price_free: "free",
        };
        if (!map[priceId]) throw new Error(`Unknown price ID "${priceId}"`);
        return map[priceId];
      });
    jest.doMock("@/lib/payment/tier-mapping", () => ({
      tierFromPriceId: tierFn,
    }));

    // Mock stripe-service
    const stripeDefaults: Record<string, jest.Mock> = {
      createCustomer: jest.fn().mockResolvedValue({ id: "cus_test" }),
      createSubscription: jest.fn().mockResolvedValue({
        id: "sub_stripe_1",
        status: "active",
        cancel_at_period_end: false,
        latest_invoice: null,
        items: { data: [{ price: { id: "price_pro" }, current_period_start: 0, current_period_end: 0 }] },
      }),
      updateSubscription: jest.fn().mockResolvedValue({
        id: "sub_stripe_1",
        status: "active",
        cancel_at_period_end: false,
        items: { data: [{ price: { id: "price_pro" } }] },
      }),
      cancelSubscription: jest.fn(),
    };
    jest.doMock("@/lib/payment/stripe-service", () => ({
      stripeService: { ...stripeDefaults, ...(opts.mockStripeService ?? {}) },
      SUBSCRIPTION_PLANS: [],
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    svc = require("../subscription-service").subscriptionService;
  });

  return svc;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROFILE_ROW = {
  id: "user-1",
  full_name: "Test User",
  subscription_tier: "pro",
  subscription_status: "active",
  stripe_customer_id: "cus_existing",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SUBSCRIPTION_ROW = {
  id: "sub-db-1",
  user_id: "user-1",
  stripe_subscription_id: "sub_stripe_1",
  stripe_price_id: "price_pro",
  status: "active",
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function makeStripeSubscription(priceId = "price_pro") {
  return {
    id: "sub_stripe_1",
    status: "active" as const,
    cancel_at_period_end: false,
    metadata: { userId: "user-1" },
    latest_invoice: null,
    items: {
      data: [
        {
          price: { id: priceId },
          current_period_start: 1700000000,
          current_period_end: 1702678400,
        },
      ],
    },
  };
}

// ── WBH-02: tierFromPriceId call in createSubscription (line 138) ─────────────

describe("SubscriptionService › createSubscription — WBH-02 tierFromPriceId call", () => {
  it("calls tierFromPriceId with the priceId and uses the returned tier to update the profile", async () => {
    const mockTierFromPriceId = jest.fn().mockReturnValue("pro");

    // Queue: first single() = getUserProfile (profile exists with stripeCustomerId)
    //        second single() = subscriptions().insert().select().single() = subscription row
    const chain = makeChain({
      singleResults: [
        { data: PROFILE_ROW, error: null },   // getUserProfile
        { data: SUBSCRIPTION_ROW, error: null }, // insert().select().single()
      ],
      updateResult: { error: null },           // updateProfileSubscriptionTier
    });

    const svc = await loadSvc({ supabaseChain: chain, mockTierFromPriceId });

    const result = await svc.createSubscription("user-1", "price_pro");

    // tierFromPriceId must have been called with the correct priceId (WBH-02 line 138)
    expect(mockTierFromPriceId).toHaveBeenCalledWith("price_pro");
    expect(result.subscription).toBeDefined();
    expect(result.subscription.userId).toBe("user-1");
  });

  it("propagates TierMappingError when priceId is unknown", async () => {
    const mockTierFromPriceId = jest.fn().mockImplementation((id: string) => {
      throw new Error(`Unknown price ID "${id}"`);
    });

    const chain = makeChain({
      singleResults: [
        { data: PROFILE_ROW, error: null },
        { data: SUBSCRIPTION_ROW, error: null },
      ],
      updateResult: { error: null },
    });

    const svc = await loadSvc({ supabaseChain: chain, mockTierFromPriceId });

    await expect(svc.createSubscription("user-1", "price_unknown")).rejects.toThrow(
      'Unknown price ID "price_unknown"',
    );
  });
});

// ── WBH-02: tierFromPriceId call in changeSubscriptionPlan (line 373) ─────────

describe("SubscriptionService › changeSubscriptionPlan — WBH-02 tierFromPriceId call", () => {
  it("calls tierFromPriceId with the newPriceId and uses the returned tier to update the profile", async () => {
    const mockTierFromPriceId = jest.fn().mockReturnValue("standard");

    // Queue: getUserSubscription → active subscription row
    //        subscriptions().update().eq().select().single() → updated row
    const chain = makeChain({
      singleResults: [
        { data: SUBSCRIPTION_ROW, error: null },   // getUserSubscription
        { data: { ...SUBSCRIPTION_ROW, stripe_price_id: "price_standard" }, error: null }, // update result
      ],
      updateResult: { error: null }, // updateProfileSubscriptionTier
    });

    const svc = await loadSvc({ supabaseChain: chain, mockTierFromPriceId });

    const result = await svc.changeSubscriptionPlan("user-1", "price_standard");

    // tierFromPriceId must have been called with the new priceId (WBH-02 line 373)
    expect(mockTierFromPriceId).toHaveBeenCalledWith("price_standard");
    expect(result).toBeDefined();
    expect(result.stripeSubscriptionId).toBe("sub_stripe_1");
  });
});

// ── WBH-04: throw in handleSubscriptionCreated on insert error (line 521) ─────

describe("SubscriptionService › handleSubscriptionCreated — WBH-04 throw on insert error", () => {
  it("throws when the Supabase insert fails (was silent return before WBH-04)", async () => {
    // getSubscriptionByStripeId → PGRST116 (not found) so it returns null
    // Then insert → returns an error object (simulating a DB constraint violation)
    const chain = makeChain({
      singleResults: [
        { data: null, error: { code: "PGRST116", message: "no rows" } }, // getSubscriptionByStripeId → null
      ],
      insertResult: { error: { message: "duplicate key value" } },
    });

    const svc = await loadSvc({ supabaseChain: chain });
    const stripeSub = makeStripeSubscription("price_pro");

    await expect(svc.handleSubscriptionCreated(stripeSub as never)).rejects.toThrow(
      "Failed to save subscription from webhook: duplicate key value",
    );
  });

  // WBH-02 line 525: tierFromPriceId called in the success path
  it("calls tierFromPriceId with the item priceId on successful insert", async () => {
    const mockTierFromPriceId = jest.fn().mockReturnValue("pro");

    // getSubscriptionByStripeId → null (new subscription)
    // insert → no error (success)
    // updateProfileSubscriptionTier → profiles().update().eq() → no error
    const chain = makeChain({
      singleResults: [
        { data: null, error: { code: "PGRST116", message: "no rows" } }, // getSubscriptionByStripeId
      ],
      insertResult: { error: null }, // insert succeeds
      updateResult: { error: null }, // updateProfileSubscriptionTier
    });

    const svc = await loadSvc({ supabaseChain: chain, mockTierFromPriceId });
    const stripeSub = makeStripeSubscription("price_pro");

    await svc.handleSubscriptionCreated(stripeSub as never);

    // Line 525: tierFromPriceId must have been called with the item's price ID
    expect(mockTierFromPriceId).toHaveBeenCalledWith("price_pro");
  });

  it("returns early without throwing when userId is missing from metadata", async () => {
    const chain = makeChain();
    const svc = await loadSvc({ supabaseChain: chain });
    const stripeSub = { ...makeStripeSubscription(), metadata: {} };

    // Should resolve without throwing (early return guard)
    await expect(svc.handleSubscriptionCreated(stripeSub as never)).resolves.toBeUndefined();
  });

  it("returns early when the subscription already exists in the database", async () => {
    const mockTierFromPriceId = jest.fn();

    // getSubscriptionByStripeId → returns existing subscription (not null)
    const chain = makeChain({
      singleResults: [
        { data: SUBSCRIPTION_ROW, error: null }, // existing record found
      ],
    });

    const svc = await loadSvc({ supabaseChain: chain, mockTierFromPriceId });
    const stripeSub = makeStripeSubscription("price_pro");

    await svc.handleSubscriptionCreated(stripeSub as never);

    // tierFromPriceId must NOT be called — we returned early
    expect(mockTierFromPriceId).not.toHaveBeenCalled();
  });
});
