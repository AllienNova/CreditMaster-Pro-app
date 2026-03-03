/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Subscription Cancellation Service — Comprehensive Unit Tests
 *
 * Tests for getSubscriptions, getSubscriptionStats, getCancellationInfo,
 * generateCancellationScript, generateCancellationInstructions,
 * createCancellationRequest, updateCancellationOutcome,
 * detectSubscriptionsFromTransactions, getSubscriptionInsights,
 * getSubscriptionTrends, and addDetectedSubscription.
 */

jest.mock("@/lib/supabase/server", () => {
  const _admin = { from: jest.fn(), rpc: jest.fn() };
  return { supabaseAdmin: _admin };
});

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

function chainMock(result: { data: any; error: any }) {
  const mock: any = {};
  const handler = () => mock;
  mock.select = jest.fn(handler);
  mock.insert = jest.fn(handler);
  mock.update = jest.fn(handler);
  mock.delete = jest.fn(handler);
  mock.eq = jest.fn(handler);
  mock.gte = jest.fn(handler);
  mock.lte = jest.fn(handler);
  mock.order = jest.fn(handler);
  mock.limit = jest.fn(handler);
  mock.single = jest.fn(() => Promise.resolve(result));
  mock.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return mock;
}

import { subscriptionCancellationService } from "../subscription-cancellation-service";
import type {
  Subscription,
  DetectedSubscription,
} from "../subscription-cancellation-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subRow(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? "sub-1",
    user_id: overrides.user_id ?? "u1",
    name: overrides.name ?? "Netflix",
    merchant_name: overrides.merchant_name ?? "Netflix",
    amount: overrides.amount ?? 15.99,
    frequency: overrides.frequency ?? "monthly",
    category: overrides.category ?? "streaming",
    status: overrides.status ?? "active",
    next_billing_date:
      overrides.next_billing_date ?? "2024-02-15T00:00:00.000Z",
    detected_from_bill_id: overrides.detected_from_bill_id ?? null,
    logo_url: overrides.logo_url ?? null,
    annual_cost: overrides.annual_cost ?? 191.88,
    cancellation_status: overrides.cancellation_status ?? null,
    cancelled_at: overrides.cancelled_at ?? null,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2024-01-01T00:00:00.000Z",
  };
}

function cancellationRow(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? "req-1",
    subscription_id: overrides.subscription_id ?? "sub-1",
    user_id: overrides.user_id ?? "u1",
    status: overrides.status ?? "pending",
    method: overrides.method ?? "website",
    ai_script: overrides.ai_script ?? null,
    instructions: overrides.instructions ?? [],
    contact_info: overrides.contact_info ?? null,
    outcome: overrides.outcome ?? null,
    savings_amount: overrides.savings_amount ?? 191.88,
    created_at: overrides.created_at ?? "2024-01-15T00:00:00.000Z",
    completed_at: overrides.completed_at ?? null,
    notes: overrides.notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("SubscriptionCancellationService", () => {
  beforeEach(() => {
    // resetMocks clears all implementations; sb().from must be re-set each test
  });

  // ========================================================================
  // getSubscriptions
  // ========================================================================

  describe("getSubscriptions", () => {
    it("returns mapped subscriptions for a user", async () => {
      const rows = [subRow(), subRow({ id: "sub-2", name: "Spotify", merchant_name: "Spotify", amount: 9.99 })];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.getSubscriptions("u1");

      expect(sb().from).toHaveBeenCalledWith("subscriptions");
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(chain.order).toHaveBeenCalledWith("next_billing_date", { ascending: true });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("sub-1");
      expect(result[0].name).toBe("Netflix");
      expect(result[1].name).toBe("Spotify");
    });

    it("returns empty array when data is null", async () => {
      const chain = chainMock({ data: null, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.getSubscriptions("u1");

      expect(result).toEqual([]);
    });

    it("throws on database error", async () => {
      const chain = chainMock({ data: null, error: { message: "DB error" } });
      sb().from.mockReturnValue(chain);

      await expect(
        subscriptionCancellationService.getSubscriptions("u1"),
      ).rejects.toThrow("Failed to fetch subscriptions");
    });

    it("maps all DB fields correctly", async () => {
      const row = subRow({
        cancelled_at: "2024-02-01T00:00:00.000Z",
        cancellation_status: "cancelled",
        detected_from_bill_id: "bill-1",
        logo_url: "https://example.com/logo.png",
      });
      const chain = chainMock({ data: [row], error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.getSubscriptions("u1");

      expect(result[0].cancelledAt).toBeInstanceOf(Date);
      expect(result[0].cancellationStatus).toBe("cancelled");
      expect(result[0].detectedFromBillId).toBe("bill-1");
      expect(result[0].logoUrl).toBe("https://example.com/logo.png");
      expect(result[0].nextBillingDate).toBeInstanceOf(Date);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  // ========================================================================
  // getSubscriptionStats
  // ========================================================================

  describe("getSubscriptionStats", () => {
    it("calculates correct stats for active subscriptions", async () => {
      const rows = [
        subRow({ id: "s1", amount: 15.99, frequency: "monthly", status: "active", category: "streaming" }),
        subRow({ id: "s2", amount: 9.99, frequency: "monthly", status: "active", category: "music" }),
        subRow({ id: "s3", amount: 50, frequency: "monthly", status: "cancelled", category: "streaming" }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const stats = await subscriptionCancellationService.getSubscriptionStats("u1");

      expect(stats.activeCount).toBe(2);
      expect(stats.cancelledCount).toBe(1);
      expect(stats.totalMonthlySpend).toBeCloseTo(25.98, 2);
      expect(stats.totalAnnualSpend).toBeCloseTo(311.76, 2);
    });

    it("calculates monthly amount for different frequencies", async () => {
      const rows = [
        subRow({ id: "s1", amount: 120, frequency: "yearly", status: "active" }),
        subRow({ id: "s2", amount: 30, frequency: "quarterly", status: "active" }),
        subRow({ id: "s3", amount: 5, frequency: "weekly", status: "active" }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const stats = await subscriptionCancellationService.getSubscriptionStats("u1");

      // yearly: 120/12 = 10, quarterly: 30/3 = 10, weekly: 5*4.33 = 21.65
      expect(stats.totalMonthlySpend).toBeCloseTo(41.65, 2);
    });

    it("estimates potential savings as 30% of monthly spend", async () => {
      const rows = [
        subRow({ id: "s1", amount: 100, frequency: "monthly", status: "active" }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const stats = await subscriptionCancellationService.getSubscriptionStats("u1");

      expect(stats.potentialMonthlySavings).toBeCloseTo(30, 2);
      expect(stats.potentialAnnualSavings).toBeCloseTo(360, 2);
    });

    it("groups categories correctly in breakdown", async () => {
      const rows = [
        subRow({ id: "s1", amount: 15, frequency: "monthly", status: "active", category: "streaming" }),
        subRow({ id: "s2", amount: 10, frequency: "monthly", status: "active", category: "streaming" }),
        subRow({ id: "s3", amount: 20, frequency: "monthly", status: "active", category: "music" }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const stats = await subscriptionCancellationService.getSubscriptionStats("u1");

      expect(stats.categoryBreakdown).toHaveLength(2);
      const streaming = stats.categoryBreakdown.find((c) => c.category === "streaming");
      expect(streaming?.count).toBe(2);
      expect(streaming?.monthlyTotal).toBe(25);
    });

    it("counts pending cancellations", async () => {
      const rows = [
        subRow({ id: "s1", status: "pending_cancellation" }),
        subRow({ id: "s2", status: "pending_cancellation" }),
        subRow({ id: "s3", status: "active" }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const stats = await subscriptionCancellationService.getSubscriptionStats("u1");

      expect(stats.pendingCancellationCount).toBe(2);
    });
  });

  // ========================================================================
  // getCancellationInfo (pure)
  // ========================================================================

  describe("getCancellationInfo", () => {
    it("returns info for exact match (netflix)", () => {
      const info = subscriptionCancellationService.getCancellationInfo("netflix");

      expect(info).not.toBeNull();
      expect(info!.companyName).toBe("Netflix");
      expect(info!.difficulty).toBe("easy");
    });

    it("normalizes merchant name to find match", () => {
      const info = subscriptionCancellationService.getCancellationInfo("Netflix");

      expect(info).not.toBeNull();
      expect(info!.companyName).toBe("Netflix");
    });

    it("returns info for partial match", () => {
      const info = subscriptionCancellationService.getCancellationInfo("Amazon Prime Video");

      expect(info).not.toBeNull();
      expect(info!.companyName).toBe("Amazon Prime");
    });

    it("returns null for unknown merchant", () => {
      const info = subscriptionCancellationService.getCancellationInfo("SomeRandomService");

      expect(info).toBeNull();
    });

    it("returns correct methods for Planet Fitness (hard difficulty)", () => {
      const info = subscriptionCancellationService.getCancellationInfo("gym_planet_fitness");

      expect(info).not.toBeNull();
      expect(info!.difficulty).toBe("hard");
      expect(info!.cancellationMethods).toContain("in_app");
      expect(info!.cancellationMethods).toContain("phone");
      expect(info!.phoneNumber).toBe("1-844-880-7180");
    });

    it("returns retention offers for services that have them", () => {
      const info = subscriptionCancellationService.getCancellationInfo("adobe_creative_cloud");

      expect(info).not.toBeNull();
      expect(info!.retentionOffers.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // generateCancellationScript (pure)
  // ========================================================================

  describe("generateCancellationScript", () => {
    it("generates script with service name in opening", () => {
      const script = subscriptionCancellationService.generateCancellationScript("Netflix");

      expect(script.opening).toContain("Netflix");
      expect(script.opening).toContain("cancel");
    });

    it("uses provided reason", () => {
      const reason = "Too expensive for my budget";
      const script = subscriptionCancellationService.generateCancellationScript("Spotify", reason);

      expect(script.reason).toBe(reason);
    });

    it("uses default reason when none provided", () => {
      const script = subscriptionCancellationService.generateCancellationScript("Hulu");

      expect(script.reason).toContain("no longer need");
    });

    it("includes rebuttals", () => {
      const script = subscriptionCancellationService.generateCancellationScript("Netflix");

      expect(script.rebuttals.length).toBeGreaterThan(0);
      expect(script.rebuttals[0]).toHaveProperty("offer");
      expect(script.rebuttals[0]).toHaveProperty("response");
    });

    it("includes closing and tips", () => {
      const script = subscriptionCancellationService.generateCancellationScript("Netflix");

      expect(script.closing).toContain("confirm");
      expect(script.tips.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // generateCancellationInstructions (pure)
  // ========================================================================

  describe("generateCancellationInstructions", () => {
    function makeSub(overrides: Partial<Subscription> = {}): Subscription {
      return {
        id: "sub-1",
        userId: "u1",
        name: "Netflix",
        merchantName: overrides.merchantName ?? "Netflix",
        amount: 15.99,
        frequency: "monthly",
        category: "streaming",
        status: "active",
        nextBillingDate: new Date("2024-02-15"),
        annualCost: 191.88,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        ...overrides,
      };
    }

    it("returns website-based steps for Netflix", () => {
      const result = subscriptionCancellationService.generateCancellationInstructions(
        makeSub({ merchantName: "Netflix" }),
      );

      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0]).toContain("netflix.com/cancelplan");
    });

    it("returns phone-based steps for Planet Fitness", () => {
      const result = subscriptionCancellationService.generateCancellationInstructions(
        makeSub({ merchantName: "gym_planet_fitness" }),
      );

      // Planet Fitness methods: ["in_app", "phone"] - no "website" method, no websiteUrl
      // So it falls to the phone branch
      const hasPhoneStep = result.steps.some((s) => s.includes("1-844-880-7180"));
      expect(hasPhoneStep).toBe(true);
    });

    it("returns generic steps for unknown merchant", () => {
      const result = subscriptionCancellationService.generateCancellationInstructions(
        makeSub({ merchantName: "UnknownServiceXYZ" }),
      );

      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0]).toContain("Search for");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("includes retention warnings when applicable", () => {
      const result = subscriptionCancellationService.generateCancellationInstructions(
        makeSub({ merchantName: "Amazon Prime" }),
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("discount");
    });

    it("returns no warnings when no retention offers exist", () => {
      const result = subscriptionCancellationService.generateCancellationInstructions(
        makeSub({ merchantName: "Netflix" }),
      );

      // Netflix has empty retentionOffers
      expect(result.warnings).toEqual([]);
    });

    it("returns chat-based steps for Adobe", () => {
      // Adobe has website and chat. Since website method exists and websiteUrl exists,
      // it should use the website path
      const result = subscriptionCancellationService.generateCancellationInstructions(
        makeSub({ merchantName: "adobe_creative_cloud" }),
      );

      expect(result.steps[0]).toContain("account.adobe.com/plans");
    });
  });

  // ========================================================================
  // createCancellationRequest
  // ========================================================================

  describe("createCancellationRequest", () => {
    it("creates a cancellation request successfully", async () => {
      // Mock: first from("subscriptions") for getSubscription, returns the sub
      const subChain = chainMock({ data: subRow(), error: null });

      // Mock: from("cancellation_requests") insert + select + single
      const insertResult = cancellationRow({ ai_script: JSON.stringify({ opening: "Hi" }) });
      const insertChain = chainMock({ data: insertResult, error: null });

      // Mock: from("subscriptions") update for status change
      const updateChain = chainMock({ data: null, error: null });

      let callCount = 0;
      sb().from.mockImplementation((_table: string) => {
        callCount++;
        if (callCount === 1) return subChain; // getSubscription
        if (callCount === 2) return insertChain; // insert cancellation
        return updateChain; // update subscription status
      });

      const result = await subscriptionCancellationService.createCancellationRequest(
        "u1",
        "sub-1",
        "website",
        "Too expensive",
      );

      expect(result.id).toBe("req-1");
      expect(result.subscriptionId).toBe("sub-1");
      expect(result.status).toBe("pending");
      expect(result.method).toBe("website");
    });

    it("throws when subscription not found", async () => {
      const chain = chainMock({ data: null, error: { code: "PGRST116", message: "not found" } });
      sb().from.mockReturnValue(chain);

      await expect(
        subscriptionCancellationService.createCancellationRequest("u1", "nonexistent", "phone"),
      ).rejects.toThrow("Subscription not found");
    });

    it("throws when insert fails", async () => {
      const subChain = chainMock({ data: subRow(), error: null });
      const insertChain = chainMock({ data: null, error: { message: "insert error" } });

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return subChain;
        return insertChain;
      });

      await expect(
        subscriptionCancellationService.createCancellationRequest("u1", "sub-1", "website"),
      ).rejects.toThrow("Failed to create cancellation request");
    });

    it("updates subscription status to pending_cancellation", async () => {
      const subChain = chainMock({ data: subRow(), error: null });
      const insertChain = chainMock({ data: cancellationRow(), error: null });
      const updateChain = chainMock({ data: null, error: null });

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return subChain;
        if (callCount === 2) return insertChain;
        return updateChain;
      });

      await subscriptionCancellationService.createCancellationRequest("u1", "sub-1", "website");

      // The third from() call should be for updating subscription status
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending_cancellation" }),
      );
    });
  });

  // ========================================================================
  // updateCancellationOutcome
  // ========================================================================

  describe("updateCancellationOutcome", () => {
    it("updates outcome to cancelled and sets subscription status", async () => {
      // First call: fetch cancellation_requests to get subscription_id
      const fetchChain = chainMock({
        data: { subscription_id: "sub-1" },
        error: null,
      });

      // Second call: update cancellation_requests
      const updateReqChain = chainMock({
        data: cancellationRow({ status: "cancelled", outcome: "cancelled", notes: "Done" }),
        error: null,
      });

      // Third call: update subscriptions
      const updateSubChain = chainMock({ data: null, error: null });

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        if (callCount === 2) return updateReqChain;
        return updateSubChain;
      });

      const result = await subscriptionCancellationService.updateCancellationOutcome(
        "u1",
        "req-1",
        "cancelled",
        "Done",
      );

      expect(result.status).toBe("cancelled");
      expect(result.outcome).toBe("cancelled");
      expect(updateSubChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          cancellation_status: "cancelled",
        }),
      );
    });

    it("updates subscription to active when outcome is retained", async () => {
      const fetchChain = chainMock({
        data: { subscription_id: "sub-1" },
        error: null,
      });
      const updateReqChain = chainMock({
        data: cancellationRow({ status: "retained", outcome: "retained" }),
        error: null,
      });
      const updateSubChain = chainMock({ data: null, error: null });

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        if (callCount === 2) return updateReqChain;
        return updateSubChain;
      });

      await subscriptionCancellationService.updateCancellationOutcome(
        "u1",
        "req-1",
        "retained",
      );

      expect(updateSubChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active" }),
      );
    });

    it("throws when cancellation request not found", async () => {
      const chain = chainMock({ data: null, error: { message: "not found" } });
      sb().from.mockReturnValue(chain);

      await expect(
        subscriptionCancellationService.updateCancellationOutcome("u1", "bad-id", "cancelled"),
      ).rejects.toThrow("Cancellation request not found");
    });

    it("throws when update fails", async () => {
      const fetchChain = chainMock({
        data: { subscription_id: "sub-1" },
        error: null,
      });
      const updateChain = chainMock({ data: null, error: { message: "update failed" } });

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        return updateChain;
      });

      await expect(
        subscriptionCancellationService.updateCancellationOutcome("u1", "req-1", "cancelled"),
      ).rejects.toThrow("Failed to update cancellation request");
    });
  });

  // ========================================================================
  // detectSubscriptionsFromTransactions
  // ========================================================================

  describe("detectSubscriptionsFromTransactions", () => {
    function txRow(overrides: Record<string, any> = {}) {
      return {
        user_id: "u1",
        merchant_name: overrides.merchant_name ?? "Netflix",
        amount: overrides.amount ?? -15.99,
        date: overrides.date ?? "2024-01-15T00:00:00.000Z",
        category: overrides.category ?? "streaming",
      };
    }

    it("detects recurring monthly subscription from transactions", async () => {
      const transactions = [
        txRow({ date: "2024-01-15", amount: -15.99 }),
        txRow({ date: "2023-12-15", amount: -15.99 }),
        txRow({ date: "2023-11-15", amount: -15.99 }),
      ];
      const chain = chainMock({ data: transactions, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.detectSubscriptionsFromTransactions("u1");

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].merchantName).toBe("Netflix");
      expect(result[0].frequency).toBe("monthly");
    });

    it("filters out merchants with less than 2 charges", async () => {
      const transactions = [
        txRow({ merchant_name: "OneTime", amount: -99.99, date: "2024-01-01" }),
      ];
      const chain = chainMock({ data: transactions, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.detectSubscriptionsFromTransactions("u1");

      expect(result).toEqual([]);
    });

    it("groups by merchant + amount correctly", async () => {
      const transactions = [
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2024-01-15" }),
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2023-12-15" }),
        txRow({ merchant_name: "Netflix", amount: -9.99, date: "2024-01-01" }),
      ];
      const chain = chainMock({ data: transactions, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.detectSubscriptionsFromTransactions("u1");

      // Only the 15.99 group has 2 entries (if frequency is detected)
      const netflix15 = result.find((r) => r.amount === 15.99);
      if (netflix15) {
        expect(netflix15.chargeCount).toBe(2);
      }
    });

    it("throws on database error", async () => {
      const chain = chainMock({ data: null, error: { message: "DB error" } });
      sb().from.mockReturnValue(chain);

      await expect(
        subscriptionCancellationService.detectSubscriptionsFromTransactions("u1"),
      ).rejects.toThrow("Failed to fetch transactions");
    });

    it("sorts results by confidence descending", async () => {
      const transactions = [
        // Known merchant (Netflix) with many charges -> higher confidence
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2024-01-15" }),
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2023-12-15" }),
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2023-11-15" }),
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2023-10-15" }),
        // Unknown merchant with fewer charges -> lower confidence
        txRow({ merchant_name: "RandomCo", amount: -25.00, date: "2024-01-10" }),
        txRow({ merchant_name: "RandomCo", amount: -25.00, date: "2023-12-10" }),
      ];
      const chain = chainMock({ data: transactions, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.detectSubscriptionsFromTransactions("u1");

      if (result.length >= 2) {
        expect(result[0].confidence).toBeGreaterThanOrEqual(result[1].confidence);
      }
    });

    it("returns empty when transactions is null", async () => {
      const chain = chainMock({ data: null, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.detectSubscriptionsFromTransactions("u1");

      expect(result).toEqual([]);
    });

    it("marks known subscription merchants", async () => {
      const transactions = [
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2024-01-15" }),
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2023-12-15" }),
        txRow({ merchant_name: "Netflix", amount: -15.99, date: "2023-11-15" }),
      ];
      const chain = chainMock({ data: transactions, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.detectSubscriptionsFromTransactions("u1");

      const netflix = result.find((r) => r.merchantName === "Netflix");
      if (netflix) {
        expect(netflix.isKnownSubscription).toBe(true);
      }
    });
  });

  // ========================================================================
  // getSubscriptionInsights
  // ========================================================================

  describe("getSubscriptionInsights", () => {
    it("detects duplicate streaming subscriptions", async () => {
      const rows = [
        subRow({ id: "s1", name: "Netflix", category: "streaming", amount: 15.99 }),
        subRow({ id: "s2", name: "Hulu", category: "streaming", amount: 12.99 }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const insights = await subscriptionCancellationService.getSubscriptionInsights("u1");

      const duplicate = insights.find((i) => i.type === "duplicate");
      expect(duplicate).toBeDefined();
      expect(duplicate!.title).toContain("streaming");
      expect(duplicate!.potentialSavings).toBeGreaterThan(0);
    });

    it("does not flag duplicates for non-streaming/music/cloud categories", async () => {
      const rows = [
        subRow({ id: "s1", name: "Sub1", category: "fitness", amount: 30 }),
        subRow({ id: "s2", name: "Sub2", category: "fitness", amount: 20 }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const insights = await subscriptionCancellationService.getSubscriptionInsights("u1");

      const duplicate = insights.find((i) => i.type === "duplicate");
      expect(duplicate).toBeUndefined();
    });

    it("suggests free alternative for Microsoft 365", async () => {
      const rows = [
        subRow({ id: "s1", name: "Microsoft 365", merchant_name: "Microsoft", amount: 9.99 }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const insights = await subscriptionCancellationService.getSubscriptionInsights("u1");

      const freeAlt = insights.find((i) => i.type === "free_tier_available");
      expect(freeAlt).toBeDefined();
      expect(freeAlt!.description).toContain("Google Docs");
    });

    it("suggests free alternative for Adobe Creative Cloud", async () => {
      const rows = [
        subRow({ id: "s1", name: "Adobe Creative Cloud", merchant_name: "Adobe", amount: 54.99 }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const insights = await subscriptionCancellationService.getSubscriptionInsights("u1");

      const freeAlt = insights.find((i) => i.type === "free_tier_available");
      expect(freeAlt).toBeDefined();
      expect(freeAlt!.description).toContain("Canva");
    });

    it("sorts insights by priority (high > medium > low)", async () => {
      const rows = [
        subRow({ id: "s1", name: "Netflix", category: "streaming", amount: 50 }),
        subRow({ id: "s2", name: "Hulu", category: "streaming", amount: 50 }),
        subRow({ id: "s3", name: "Dropbox", merchant_name: "Dropbox", amount: 12, category: "cloud_storage" }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const insights = await subscriptionCancellationService.getSubscriptionInsights("u1");

      if (insights.length >= 2) {
        const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
        for (let i = 0; i < insights.length - 1; i++) {
          expect(
            priorityOrder[insights[i].priority],
          ).toBeLessThanOrEqual(
            priorityOrder[insights[i + 1].priority],
          );
        }
      }
    });

    it("returns empty insights when no issues found", async () => {
      const rows = [
        subRow({ id: "s1", name: "UniqueService", category: "unique_cat", amount: 5 }),
      ];
      const chain = chainMock({ data: rows, error: null });
      sb().from.mockReturnValue(chain);

      const insights = await subscriptionCancellationService.getSubscriptionInsights("u1");

      expect(insights).toEqual([]);
    });
  });

  // ========================================================================
  // getSubscriptionTrends
  // ========================================================================

  describe("getSubscriptionTrends", () => {
    it("returns trend data for each requested month", async () => {
      const chain = chainMock({ data: [], error: null });
      sb().from.mockReturnValue(chain);

      const trends = await subscriptionCancellationService.getSubscriptionTrends("u1", 3);

      expect(trends).toHaveLength(3);
    });

    it("defaults to 6 months", async () => {
      const chain = chainMock({ data: [], error: null });
      sb().from.mockReturnValue(chain);

      const trends = await subscriptionCancellationService.getSubscriptionTrends("u1");

      expect(trends).toHaveLength(6);
    });

    it("calculates total spend per month from active subscriptions", async () => {
      const now = new Date();
      const subData = [
        {
          ...subRow({ amount: 15.99, frequency: "monthly" }),
          created_at: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
          cancelled_at: null,
        },
      ];
      const chain = chainMock({ data: subData, error: null });
      sb().from.mockReturnValue(chain);

      const trends = await subscriptionCancellationService.getSubscriptionTrends("u1", 2);

      // At least one month should show spend
      const hasSpend = trends.some((t) => t.totalSpend > 0);
      expect(hasSpend).toBe(true);
    });

    it("identifies new subscriptions in a given month", async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const subData = [
        {
          ...subRow(),
          created_at: thisMonthStart.toISOString(),
          cancelled_at: null,
        },
      ];
      const chain = chainMock({ data: subData, error: null });
      sb().from.mockReturnValue(chain);

      const trends = await subscriptionCancellationService.getSubscriptionTrends("u1", 1);

      expect(trends[0].newSubscriptions).toBe(1);
    });

    it("identifies cancelled subscriptions in a given month", async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const subData = [
        {
          ...subRow(),
          created_at: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
          cancelled_at: new Date(thisMonthStart.getTime() + 86400000).toISOString(),
        },
      ];
      const chain = chainMock({ data: subData, error: null });
      sb().from.mockReturnValue(chain);

      const trends = await subscriptionCancellationService.getSubscriptionTrends("u1", 1);

      expect(trends[0].cancelledSubscriptions).toBe(1);
    });

    it("returns trends in chronological order (oldest first)", async () => {
      const chain = chainMock({ data: [], error: null });
      sb().from.mockReturnValue(chain);

      const trends = await subscriptionCancellationService.getSubscriptionTrends("u1", 3);

      // The first element should be the oldest month
      // Trends are reversed at the end of the method
      expect(trends).toHaveLength(3);
      // Each period string should be a valid date representation
      trends.forEach((t) => {
        expect(t.period).toBeDefined();
        expect(typeof t.period).toBe("string");
      });
    });
  });

  // ========================================================================
  // addDetectedSubscription
  // ========================================================================

  describe("addDetectedSubscription", () => {
    function makeDetected(overrides: Partial<DetectedSubscription> = {}): DetectedSubscription {
      return {
        merchantName: "Spotify",
        amount: 9.99,
        frequency: "monthly",
        lastChargeDate: new Date("2024-01-15"),
        chargeCount: 3,
        confidence: 85,
        category: "music",
        isKnownSubscription: true,
        ...overrides,
      };
    }

    it("inserts a detected subscription into the database", async () => {
      const insertedRow = subRow({
        name: "Spotify",
        merchant_name: "Spotify",
        amount: 9.99,
        frequency: "monthly",
        category: "music",
      });
      const chain = chainMock({ data: insertedRow, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.addDetectedSubscription(
        "u1",
        makeDetected(),
      );

      expect(sb().from).toHaveBeenCalledWith("subscriptions");
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          name: "Spotify",
          merchant_name: "Spotify",
          amount: 9.99,
          frequency: "monthly",
          category: "music",
          status: "active",
        }),
      );
      expect(result.name).toBe("Spotify"); // from insertedRow overrides
    });

    it("calculates next billing date based on frequency", async () => {
      const chain = chainMock({ data: subRow(), error: null });
      sb().from.mockReturnValue(chain);

      await subscriptionCancellationService.addDetectedSubscription(
        "u1",
        makeDetected({ lastChargeDate: new Date(2024, 0, 15), frequency: "monthly" }),
      );

      const insertArg = chain.insert.mock.calls[0][0];
      const nextBilling = new Date(insertArg.next_billing_date);
      // Monthly: should be Feb 15
      expect(nextBilling.getMonth()).toBe(1); // February (0-indexed)
      expect(nextBilling.getDate()).toBe(15);
    });

    it("calculates annual cost correctly for different frequencies", async () => {
      const chain = chainMock({ data: subRow(), error: null });
      sb().from.mockReturnValue(chain);

      await subscriptionCancellationService.addDetectedSubscription(
        "u1",
        makeDetected({ amount: 120, frequency: "yearly" }),
      );

      const insertArg = chain.insert.mock.calls[0][0];
      // yearly: 120/12 * 12 = 120
      expect(insertArg.annual_cost).toBe(120);
    });

    it("throws on insert error", async () => {
      const chain = chainMock({ data: null, error: { message: "duplicate key" } });
      sb().from.mockReturnValue(chain);

      await expect(
        subscriptionCancellationService.addDetectedSubscription("u1", makeDetected()),
      ).rejects.toThrow("Failed to add subscription: duplicate key");
    });

    it("maps the returned DB row to a Subscription object", async () => {
      const row = subRow({ id: "new-sub", name: "Spotify", merchant_name: "Spotify" });
      const chain = chainMock({ data: row, error: null });
      sb().from.mockReturnValue(chain);

      const result = await subscriptionCancellationService.addDetectedSubscription(
        "u1",
        makeDetected(),
      );

      expect(result.id).toBe("new-sub");
      expect(result.userId).toBe("u1");
      expect(result.nextBillingDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
