// Mock @supabase/supabase-js before any import
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
  SupabaseClient: class {},
}));

import { createClient } from "@supabase/supabase-js";
import { RentReportingIntegrationService } from "../RentReportingService";

const mockCreateClient = createClient as jest.Mock;

// ============================================================================
// Mock client factory — rebuilt fresh each test
// ============================================================================

function makeChain(overrides: {
  singleResult?: { data: unknown; error: unknown };
  orderResult?: { data: unknown[] | null; error: unknown };
} = {}) {
  const chain: Record<string, jest.Mock> = {};
  const singleResult = overrides.singleResult ?? { data: null, error: null };
  const orderResult = overrides.orderResult ?? { data: [], error: null };

  chain.single = jest.fn().mockResolvedValue(singleResult);
  chain.order = jest.fn().mockResolvedValue(orderResult);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);

  return chain;
}

// ============================================================================
// DB account row builder
// ============================================================================

function makeDbAccount(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "acc-1",
    user_id: "user-1",
    provider: "boom",
    status: "reporting",
    landlord_name: "Test Landlord",
    landlord_email: null,
    landlord_phone: null,
    property_address: "123 Main St",
    monthly_rent: 1500,
    lease_start_date: "2024-01-01T00:00:00.000Z",
    lease_end_date: null,
    verification_status: "verified",
    verification_method: "bank",
    verified_at: null,
    reporting_start_date: null,
    historical_months_reported: 0,
    total_payments_reported: 12,
    on_time_payments: 12,
    late_payments: 0,
    missed_payments: 0,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("RentReportingIntegrationService", () => {
  let svc: RentReportingIntegrationService;
  let chain: ReturnType<typeof makeChain>;

  beforeEach(() => {
    chain = makeChain();
    mockCreateClient.mockReturnValue(chain);
    svc = new RentReportingIntegrationService("http://localhost", "anon-key");
  });

  // --------------------------------------------------------------------------
  // getAllServices
  // --------------------------------------------------------------------------

  describe("getAllServices", () => {
    it("returns a non-empty array", () => {
      expect(svc.getAllServices().length).toBeGreaterThan(0);
    });

    it("every service has a provider field", () => {
      svc.getAllServices().forEach((s) => expect(s.provider).toBeDefined());
    });
  });

  // --------------------------------------------------------------------------
  // getServiceByProvider
  // --------------------------------------------------------------------------

  describe("getServiceByProvider", () => {
    it("returns the service for a known provider", () => {
      const service = svc.getServiceByProvider("boom");
      expect(service).toBeDefined();
      expect(service!.provider).toBe("boom");
    });

    it("returns undefined for an unknown provider", () => {
      expect(svc.getServiceByProvider("piñata")).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getFreeServices
  // --------------------------------------------------------------------------

  describe("getFreeServices", () => {
    it("returns only services with monthlyFee === 0", () => {
      const free = svc.getFreeServices();
      expect(free.length).toBeGreaterThan(0);
      free.forEach((s) => expect(s.monthlyFee).toBe(0));
    });

    it("experian_boost is in the free list", () => {
      const free = svc.getFreeServices();
      const providers = free.map((s) => s.provider);
      expect(providers).toContain("experian_boost");
    });
  });

  // --------------------------------------------------------------------------
  // getRecommendations
  // --------------------------------------------------------------------------

  describe("getRecommendations", () => {
    it("filters out services above budget", () => {
      const recs = svc.getRecommendations(1500, 0, false, false);
      recs.forEach((r) => expect(r.estimatedMonthlyCost).toBe(0));
    });

    it("includes services at exactly the budget limit", () => {
      const recs = svc.getRecommendations(1500, 2, false, false);
      const boom = recs.find((r) => r.service.provider === "boom");
      expect(boom).toBeDefined();
    });

    it("returns results sorted descending by matchScore", () => {
      const recs = svc.getRecommendations(1500, 100, true, true);
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].matchScore).toBeGreaterThanOrEqual(recs[i].matchScore);
      }
    });

    it("matchScore is capped at 100", () => {
      const recs = svc.getRecommendations(1500, 100, true, true);
      recs.forEach((r) => expect(r.matchScore).toBeLessThanOrEqual(100));
    });

    it("returns empty array when no services fit budget", () => {
      const recs = svc.getRecommendations(1500, -1, false, false);
      expect(recs).toHaveLength(0);
    });

    it("boom gets +25 bureau bonus (3 bureaus) and +10 no-landlord bonus", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      const boom = recs.find((r) => r.service.provider === "boom");
      // 50 base + 25 (3 bureaus) + 10 (no landlord) = 85
      expect(boom!.matchScore).toBe(85);
    });

    it("rent_reporters gets +15 bureau bonus (2 bureaus)", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      const rr = recs.find((r) => r.service.provider === "rent_reporters");
      if (rr) {
        // 50 base + 15 (2 bureaus) + 10 (no landlord) = 75
        expect(rr.matchScore).toBe(75);
      }
    });

    it("historical bonus +20 applied when wantHistorical=true", () => {
      const withHist = svc.getRecommendations(1500, 100, true, false);
      const withoutHist = svc.getRecommendations(1500, 100, false, false);
      const boomWith = withHist.find((r) => r.service.provider === "boom");
      const boomWithout = withoutHist.find((r) => r.service.provider === "boom");
      expect(boomWith!.matchScore).toBeGreaterThan(boomWithout!.matchScore);
    });

    it("no historical bonus when wantHistorical=false", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      const boom = recs.find((r) => r.service.provider === "boom");
      expect(boom!.matchScore).toBe(85);
    });

    it("free service gets +20 cost bonus when prioritizeCost=true", () => {
      const priority = svc.getRecommendations(1500, 100, false, true);
      const noPriority = svc.getRecommendations(1500, 100, false, false);
      const expPriority = priority.find((r) => r.service.provider === "experian_boost");
      const expNoPriority = noPriority.find((r) => r.service.provider === "experian_boost");
      expect(expPriority!.matchScore).toBeGreaterThan(expNoPriority!.matchScore);
    });

    it("low-fee service (<=5) gets +10 cost bonus when prioritizeCost=true", () => {
      const priority = svc.getRecommendations(1500, 100, false, true);
      const noPriority = svc.getRecommendations(1500, 100, false, false);
      const boomPriority = priority.find((r) => r.service.provider === "boom");
      const boomNoPriority = noPriority.find((r) => r.service.provider === "boom");
      expect(boomPriority!.matchScore).toBeGreaterThan(boomNoPriority!.matchScore);
    });

    it("no-landlord service scores higher than landlord-required service", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      const boom = recs.find((r) => r.service.provider === "boom");
      const kharma = recs.find((r) => r.service.provider === "rental_kharma");
      if (boom && kharma) {
        expect(boom.matchScore).toBeGreaterThan(kharma.matchScore);
      }
    });

    it("historicalReportingValue is defined for services with historicalReporting=true", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      const boom = recs.find((r) => r.service.provider === "boom");
      expect(boom!.historicalReportingValue).toBeDefined();
    });

    it("historicalReportingValue is undefined for services with historicalReporting=false", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      const selfRent = recs.find((r) => r.service.provider === "self_rent");
      if (selfRent) {
        expect(selfRent.historicalReportingValue).toBeUndefined();
      }
    });

    it("estimatedScoreImpact equals average of min and max", () => {
      const recs = svc.getRecommendations(1500, 100, false, false);
      recs.forEach((r) => {
        const expected =
          (r.service.estimatedScoreImpact.min + r.service.estimatedScoreImpact.max) / 2;
        expect(r.estimatedScoreImpact).toBe(expected);
      });
    });
  });

  // --------------------------------------------------------------------------
  // getReportingStats
  // --------------------------------------------------------------------------

  describe("getReportingStats", () => {
    it("returns zero stats when user has no accounts", async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null });
      const stats = await svc.getReportingStats("user-1");
      expect(stats.totalPaymentsReported).toBe(0);
      expect(stats.onTimePercentage).toBe(0);
      expect(stats.monthsReporting).toBe(0);
      expect(stats.bureausCovered).toHaveLength(0);
    });

    it("calculates onTimePercentage correctly from account data", async () => {
      const account = makeDbAccount({ total_payments_reported: 10, on_time_payments: 8 });
      chain.order.mockResolvedValueOnce({ data: [account], error: null });
      const stats = await svc.getReportingStats("user-1");
      expect(stats.onTimePercentage).toBe(80);
    });

    it("adds +10 to estimatedScoreImpact when 100% on-time payments", async () => {
      // 1 month of reporting so base = min(50, 1*2) = 2; +10 for 100%; 1 bureau (experian) → no +10
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const account = makeDbAccount({
        provider: "experian_boost",
        total_payments_reported: 5,
        on_time_payments: 5,
        reporting_start_date: oneMonthAgo,
      });
      chain.order.mockResolvedValueOnce({ data: [account], error: null });
      const stats = await svc.getReportingStats("user-1");
      expect(stats.estimatedScoreImpact).toBe(12);
    });

    it("adds +10 to estimatedScoreImpact when 3 bureaus covered", async () => {
      // boom reports to all 3 bureaus; 0 months (no start date) → 0 base; 0% on-time → no +10
      const account = makeDbAccount({
        provider: "boom",
        total_payments_reported: 0,
        on_time_payments: 0,
        reporting_start_date: null,
      });
      chain.order.mockResolvedValueOnce({ data: [account], error: null });
      const stats = await svc.getReportingStats("user-1");
      expect(stats.estimatedScoreImpact).toBe(10);
      expect(stats.bureausCovered).toHaveLength(3);
    });

    it("monthsReporting is 0 when no reportingStartDate is set", async () => {
      const account = makeDbAccount({ reporting_start_date: null });
      chain.order.mockResolvedValueOnce({ data: [account], error: null });
      const stats = await svc.getReportingStats("user-1");
      expect(stats.monthsReporting).toBe(0);
    });

    it("caps estimatedScoreImpact base at 50 for long-running accounts", async () => {
      // 60 months → min(50, 120) = 50; +10 (100%); +10 (3 bureaus) = 70
      const sixtyMonthsAgo = new Date(
        Date.now() - 60 * 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const account = makeDbAccount({
        provider: "boom",
        reporting_start_date: sixtyMonthsAgo,
        total_payments_reported: 60,
        on_time_payments: 60,
      });
      chain.order.mockResolvedValueOnce({ data: [account], error: null });
      const stats = await svc.getReportingStats("user-1");
      expect(stats.estimatedScoreImpact).toBe(70);
    });
  });

  // --------------------------------------------------------------------------
  // createAccount (DB path)
  // --------------------------------------------------------------------------

  describe("createAccount", () => {
    it("throws when supabase returns an error", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
      await expect(
        svc.createAccount({
          userId: "u1",
          provider: "boom",
          status: "pending",
          landlordName: "Landlord",
          propertyAddress: "123 Main",
          monthlyRent: 1500,
          leaseStartDate: new Date(),
          verificationStatus: "pending",
          verificationMethod: "bank",
          historicalMonthsReported: 0,
          totalPaymentsReported: 0,
          onTimePayments: 0,
          latePayments: 0,
          missedPayments: 0,
        }),
      ).rejects.toMatchObject({ message: "db error" });
    });
  });

  // --------------------------------------------------------------------------
  // updateAccount (DB path)
  // --------------------------------------------------------------------------

  describe("updateAccount", () => {
    it("throws when supabase returns an error", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: "update error" } });
      await expect(
        svc.updateAccount("acc-id", { status: "reporting" }),
      ).rejects.toMatchObject({ message: "update error" });
    });
  });

  // --------------------------------------------------------------------------
  // getUserAccounts (DB path)
  // --------------------------------------------------------------------------

  describe("getUserAccounts", () => {
    it("returns empty array when no data", async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null });
      const result = await svc.getUserAccounts("user-1");
      expect(result).toEqual([]);
    });

    it("throws when supabase returns an error", async () => {
      chain.order.mockResolvedValueOnce({ data: null, error: { message: "list error" } });
      await expect(svc.getUserAccounts("user-1")).rejects.toMatchObject({
        message: "list error",
      });
    });
  });

  // --------------------------------------------------------------------------
  // recordPayment (DB path)
  // --------------------------------------------------------------------------

  describe("recordPayment", () => {
    it("throws when supabase returns an error", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: "payment error" } });
      await expect(
        svc.recordPayment({
          accountId: "acc-1",
          userId: "u1",
          amount: 1500,
          dueDate: new Date(),
          status: "on_time",
          reportedToCredit: false,
          bureausReported: [],
        }),
      ).rejects.toMatchObject({ message: "payment error" });
    });
  });

  // --------------------------------------------------------------------------
  // getPaymentHistory (DB path)
  // --------------------------------------------------------------------------

  describe("getPaymentHistory", () => {
    it("returns empty array when no payments", async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null });
      const result = await svc.getPaymentHistory("acc-1");
      expect(result).toEqual([]);
    });

    it("throws when supabase returns an error", async () => {
      chain.order.mockResolvedValueOnce({ data: null, error: { message: "history error" } });
      await expect(svc.getPaymentHistory("acc-1")).rejects.toMatchObject({
        message: "history error",
      });
    });
  });
});
