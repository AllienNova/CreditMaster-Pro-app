/**
 * Commission Calculator Service Tests
 *
 * Tests for commission calculation, commission rules, and reporting.
 *
 * Payout EXECUTION (Stripe/bank transfers, scheduled runs) is NOT tested here —
 * that logic lives exclusively in payout-service.test.ts. A second payout rail
 * in this file (initiatePayout/processScheduledPayouts) was removed to close
 * the FND-026 double-pay gap; do not reintroduce it.
 */

// ---------------------------------------------------------------------------
// Mocks (must precede the import of the module under test)
// ---------------------------------------------------------------------------

const mockCreateClient = jest.fn<any, any[]>();

const mockSupabase = {
  from: jest.fn<any, any[]>(),
  rpc: jest.fn<any, any[]>(),
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
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

// Must configure mockCreateClient BEFORE import so module-level
// `const supabase = createClient(...)` captures mockSupabase.
mockCreateClient.mockReturnValue(mockSupabase as any);

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { commissionCalculator } from "../commission-calculator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const partnerRow = {
  id: "partner-1",
  name: "Test Partner",
  slug: "test-partner",
  type: "credit_card",
  description: "A test partner",
  logo_url: null,
  website_url: "https://partner.com",
  api_endpoint: null,
  commission_type: "cpa",
  commission_rate: 10,
  commission_fixed: 25,
  min_payout: 50,
  payout_frequency: "monthly",
  payment_method: "stripe",
  stripe_account_id: "acct_stripe_1",
  regions: ["US"],
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  metadata: null,
};

const conversionRow = {
  id: "conv-1",
  click_id: "clk_1",
  user_id: "user-1",
  partner_id: "partner-1",
  offer_id: "offer-1",
  type: "signup",
  status: "pending",
  value: 500,
  commission_earned: 25,
  partner_reference: "EXT-1",
  converted_at: "2026-01-15T12:00:00.000Z",
  confirmed_at: null,
  paid_at: null,
};

const dateRange = {
  from: new Date("2026-01-01"),
  to: new Date("2026-01-31"),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  Object.keys(mockBuilder).forEach((key) => {
    (mockBuilder as any)[key].mockReturnValue(mockBuilder);
  });

  mockSupabase.from.mockReturnValue(mockBuilder);
  mockSupabase.rpc.mockReturnValue(mockBuilder);
  mockCreateClient.mockReturnValue(mockSupabase as any);
});

// ===========================================================================
// Tests
// ===========================================================================

describe("CommissionCalculatorService", () => {
  // -------------------------------------------------------------------------
  // calculateCommission
  // -------------------------------------------------------------------------

  describe("calculateCommission", () => {
    it("should calculate CPA commission (fixed amount)", async () => {
      // getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, commission_type: "cpa", commission_fixed: 25 },
        error: null,
      });
      // getCommissionRule -> no custom rule
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "signup",
        500,
      );

      expect(result).toBe(25);
    });

    it("should calculate CPL commission for lead types only", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "cpl", commission_fixed: 15 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "lead",
        0,
      );

      expect(result).toBe(15);
    });

    it("should return 0 CPL commission for non-lead types", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "cpl", commission_fixed: 15 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "purchase",
        100,
      );

      expect(result).toBe(0);
    });

    it("should calculate revenue_share commission", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "revenue_share", commission_rate: 10 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "purchase",
        1000,
      );

      expect(result).toBe(100);
    });

    it("should calculate hybrid commission (fixed + percentage)", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: {
            ...partnerRow,
            commission_type: "hybrid",
            commission_fixed: 10,
            commission_rate: 5,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "purchase",
        200,
      );

      // 10 + (200 * 5 / 100) = 10 + 10 = 20
      expect(result).toBe(20);
    });

    it("should throw when partner not found (never silently record $0 commission)", async () => {
      // FND: a missing/errored partner lookup previously fell through to
      // `return 0`, which the affiliate webhook then persisted as a real
      // revenue_events.commission_amount_cents value. A commission that
      // cannot be resolved must fail loudly instead of recording a fake $0.
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });

      await expect(
        commissionCalculator.calculateCommission("nonexistent", "signup", 100),
      ).rejects.toThrow(/partner/i);
    });

    it("should throw when the partner lookup errors for a reason other than not-found", async () => {
      // A missing table (PostgREST "could not find the table in the schema
      // cache") or any other DB error must never be silently treated the
      // same as "not found" -> $0. This is the exact chain that produced the
      // live bug: affiliate_partners didn't exist, every lookup errored, and
      // the error was swallowed into a $0 commission.
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST205",
          message:
            "Could not find the table 'public.affiliate_partners' in the schema cache",
        },
      });

      await expect(
        commissionCalculator.calculateCommission("partner-1", "signup", 100),
      ).rejects.toThrow(/partner/i);
    });

    it("should apply custom commission rule when available", async () => {
      // getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, commission_type: "cpa", commission_fixed: 25 },
        error: null,
      });
      // getCommissionRule -> found custom rule
      mockBuilder.single.mockResolvedValueOnce({
        data: {
          partner_id: "partner-1",
          conversion_type: "signup",
          commission_type: "revenue_share",
          commission_rate: 15,
          commission_fixed: null,
          bonus_rate: null,
          bonus_threshold: null,
          min_value: null,
          max_value: null,
        },
        error: null,
      });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "signup",
        200,
      );

      // Custom rule: revenue_share at 15% of 200 = 30
      expect(result).toBe(30);
    });

    it("should apply bonus when value exceeds threshold", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "cpa", commission_fixed: 20 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            partner_id: "partner-1",
            conversion_type: "signup",
            commission_type: "cpa",
            commission_rate: null,
            commission_fixed: 20,
            bonus_rate: 5,
            bonus_threshold: 100,
            min_value: null,
            max_value: null,
          },
          error: null,
        });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "signup",
        200,
      );

      // CPA 20 + bonus (200 * 5 / 100 = 10) = 30
      expect(result).toBe(30);
    });

    it("should round commission to 2 decimal places", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "revenue_share", commission_rate: 7 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateCommission(
        "partner-1",
        "purchase",
        33.33,
      );

      // 33.33 * 7 / 100 = 2.3331 -> rounded to 2.33
      expect(result).toBe(2.33);
    });
  });

  // -------------------------------------------------------------------------
  // calculateTieredCommission
  // -------------------------------------------------------------------------

  describe("calculateTieredCommission", () => {
    it("should apply tier multiplier based on monthly volume", async () => {
      // getCommissionTiers
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { min_volume: 0, multiplier: 1.0 },
            { min_volume: 10, multiplier: 1.25 },
            { min_volume: 50, multiplier: 1.5 },
          ],
          error: null,
        }),
      );
      // getPartner for calculateCommission
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, commission_type: "cpa", commission_fixed: 20 },
        error: null,
      });
      // getCommissionRule
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await commissionCalculator.calculateTieredCommission(
        "partner-1",
        "signup",
        100,
        25, // monthly volume 25 -> tier 1.25
      );

      // base commission 20 * 1.25 = 25
      expect(result).toBe(25);
    });

    it("should use highest applicable tier", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { min_volume: 0, multiplier: 1.0 },
            { min_volume: 10, multiplier: 1.2 },
            { min_volume: 100, multiplier: 2.0 },
          ],
          error: null,
        }),
      );
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "cpa", commission_fixed: 10 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateTieredCommission(
        "partner-1",
        "signup",
        100,
        150, // 150 >= 100 -> multiplier 2.0
      );

      expect(result).toBe(20);
    });

    it("should use default tier when no tiers configured", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, commission_type: "cpa", commission_fixed: 10 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await commissionCalculator.calculateTieredCommission(
        "partner-1",
        "signup",
        100,
        5,
      );

      // No tiers: appliedTier is undefined, multiplier defaults to 1
      expect(result).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // recalculateCommission
  // -------------------------------------------------------------------------

  describe("recalculateCommission", () => {
    it("should recalculate and update commission for a conversion", async () => {
      // Get conversion
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...conversionRow, value: 500 },
        error: null,
      });
      // getPartner (via calculateCommission)
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, commission_type: "revenue_share", commission_rate: 10 },
        error: null,
      });
      // getCommissionRule
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });
      // await supabase.from().update().eq() — thenable (no .single())
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await commissionCalculator.recalculateCommission("conv-1");

      // 500 * 10% = 50
      expect(result).toBe(50);
      // Verify update was called
      expect(mockBuilder.update).toHaveBeenCalledWith({ commission_earned: 50 });
    });

    it("should throw when conversion not found", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(
        commissionCalculator.recalculateCommission("conv-bad"),
      ).rejects.toThrow("Conversion not found: conv-bad");
    });
  });

  // -------------------------------------------------------------------------
  // getCommissionReport
  // -------------------------------------------------------------------------

  describe("getCommissionReport", () => {
    it("should generate a report grouped by commission status", async () => {
      const conversions = [
        { ...conversionRow, status: "pending", commission_earned: 10 },
        { ...conversionRow, status: "confirmed", commission_earned: 20 },
        { ...conversionRow, status: "qualified", commission_earned: 15 },
        { ...conversionRow, status: "paid", commission_earned: 30 },
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: conversions, error: null }),
      );

      const result = await commissionCalculator.getCommissionReport(
        "partner-1",
        dateRange,
      );

      expect(result.partnerId).toBe("partner-1");
      expect(result.pendingCommission).toBe(10);
      expect(result.confirmedCommission).toBe(35); // confirmed + qualified
      expect(result.paidCommission).toBe(30);
      expect(result.totalCommission).toBe(75);
      expect(result.conversions).toHaveLength(4);
    });

    it("should handle empty conversions", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      const result = await commissionCalculator.getCommissionReport(
        "partner-1",
        dateRange,
      );

      expect(result.totalCommission).toBe(0);
      expect(result.conversions).toEqual([]);
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "report fail" } }),
      );

      await expect(
        commissionCalculator.getCommissionReport("partner-1", dateRange),
      ).rejects.toThrow("Failed to get commission report: report fail");
    });

    it("FND-029: accumulates 1000 × $0.07 commissions with no float drift (exact total $70)", async () => {
      // IEEE-754 proof: 0 + 0.07 repeated 1000× yields 69.9999...966, not 70.
      // Integer-cents accumulation (7 cents × 1000 = 7000 cents = $70) is exact.
      const conversions = Array.from({ length: 1000 }, (_, i) => ({
        ...conversionRow,
        id: `conv-drift-${i}`,
        status: "pending",
        commission_earned: 0.07, // $0.07 each
      }));

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: conversions, error: null }),
      );

      const result = await commissionCalculator.getCommissionReport(
        "partner-1",
        dateRange,
      );

      // Must be exactly 70, not 69.99999999999966
      expect(result.pendingCommission).toBe(70);
      expect(result.totalCommission).toBe(70);
    });
  });

  // -------------------------------------------------------------------------
  // getPendingPayout
  // -------------------------------------------------------------------------

  describe("getPendingPayout", () => {
    it("should sum pending commissions and check eligibility", async () => {
      const conversions = [
        { id: "c1", commission_earned: 30 },
        { id: "c2", commission_earned: 25 },
      ];

      // Get confirmed conversions
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: conversions, error: null }),
      );
      // getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });

      const result = await commissionCalculator.getPendingPayout("partner-1");

      expect(result.amount).toBe(55);
      expect(result.conversionsCount).toBe(2);
      expect(result.eligibleForPayout).toBe(true);
      expect(result.minPayoutRequired).toBe(50);
    });

    it("should return ineligible when below min payout", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: "c1", commission_earned: 10 }], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });

      const result = await commissionCalculator.getPendingPayout("partner-1");

      expect(result.amount).toBe(10);
      expect(result.eligibleForPayout).toBe(false);
    });

    it("should default to $50 min payout when partner not found", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await commissionCalculator.getPendingPayout("partner-1");

      expect(result.minPayoutRequired).toBe(50);
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "payout fail" } }),
      );

      await expect(
        commissionCalculator.getPendingPayout("partner-1"),
      ).rejects.toThrow("Failed to get pending payout: payout fail");
    });
  });

  // -------------------------------------------------------------------------
  // getPayoutHistory
  // -------------------------------------------------------------------------

  describe("getPayoutHistory", () => {
    it("should return mapped payout results", async () => {
      const payouts = [
        {
          id: "payout-1",
          partner_id: "partner-1",
          amount: 100,
          status: "completed",
          payment_method: "stripe",
          transaction_id: "tr_123",
          processed_at: "2026-01-20T00:00:00.000Z",
          error: null,
        },
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: payouts, error: null }),
      );

      const result = await commissionCalculator.getPayoutHistory("partner-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("payout-1");
      expect(result[0].status).toBe("completed");
      expect(result[0].processedAt).toBeInstanceOf(Date);
    });

    it("should apply date range filter when provided", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      await commissionCalculator.getPayoutHistory("partner-1", dateRange);

      expect(mockBuilder.gte).toHaveBeenCalledWith(
        "created_at",
        dateRange.from.toISOString(),
      );
      expect(mockBuilder.lte).toHaveBeenCalledWith(
        "created_at",
        dateRange.to.toISOString(),
      );
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "history fail" } }),
      );

      await expect(
        commissionCalculator.getPayoutHistory("partner-1"),
      ).rejects.toThrow("Failed to get payout history: history fail");
    });

    it("should handle payout with no processed_at", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: "payout-2",
              partner_id: "partner-1",
              amount: 50,
              status: "pending",
              payment_method: "bank_transfer",
              transaction_id: null,
              processed_at: null,
              error: null,
            },
          ],
          error: null,
        }),
      );

      const result = await commissionCalculator.getPayoutHistory("partner-1");

      expect(result[0].processedAt).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Commission Rules
  // -------------------------------------------------------------------------

  describe("createCommissionRule", () => {
    it("should create and return a commission rule", async () => {
      const rule = {
        partnerId: "partner-1",
        conversionType: "signup" as const,
        commissionType: "cpa" as const,
        commissionFixed: 30,
      };

      mockBuilder.single.mockResolvedValueOnce({
        data: {
          partner_id: "partner-1",
          conversion_type: "signup",
          commission_type: "cpa",
          commission_fixed: 30,
          commission_rate: null,
          min_value: null,
          max_value: null,
          bonus_rate: null,
          bonus_threshold: null,
        },
        error: null,
      });

      const result = await commissionCalculator.createCommissionRule(rule);

      expect(result.partnerId).toBe("partner-1");
      expect(result.commissionType).toBe("cpa");
      expect(result.commissionFixed).toBe(30);
    });

    it("should throw on DB error", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: "rule insert fail" },
      });

      await expect(
        commissionCalculator.createCommissionRule({
          partnerId: "p1",
          conversionType: "signup",
          commissionType: "cpa",
        }),
      ).rejects.toThrow("Failed to create commission rule: rule insert fail");
    });
  });

  describe("getCommissionRule", () => {
    it("should return a matching commission rule", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: {
          partner_id: "partner-1",
          conversion_type: "signup",
          commission_type: "revenue_share",
          commission_rate: 12,
          commission_fixed: null,
          min_value: null,
          max_value: null,
          bonus_rate: null,
          bonus_threshold: null,
        },
        error: null,
      });

      const result = await commissionCalculator.getCommissionRule(
        "partner-1",
        "signup",
        100,
      );

      expect(result).not.toBeNull();
      expect(result!.commissionType).toBe("revenue_share");
    });

    it("should return null when no matching rule (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });

      const result = await commissionCalculator.getCommissionRule(
        "partner-1",
        "purchase",
        100,
      );

      expect(result).toBeNull();
    });

    it("should throw on unexpected (non-PGRST116) error instead of silently returning null", async () => {
      // A table-missing or connection error must not be indistinguishable
      // from "no custom rule for this partner", which is a legitimate null.
      // Pre-fix, this code path fell through to a bare `return null` for
      // every error code, masking real failures as "no custom rule".
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "OTHER", message: "unexpected" },
      });

      await expect(
        commissionCalculator.getCommissionRule("partner-1", "purchase", 100),
      ).rejects.toThrow(/commission rule/i);
    });
  });
});
