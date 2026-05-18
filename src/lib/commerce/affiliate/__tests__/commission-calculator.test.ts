/**
 * Commission Calculator Service Tests
 *
 * Tests for commission calculation, payout processing, commission rules, and reporting.
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

const mockStripe = {
  transfers: {
    create: jest.fn<any, any[]>(),
  },
};

const mockStripeConstructor = jest.fn<any, any[]>();

jest.mock("stripe", () => ({
  __esModule: true,
  // Must be a regular function (not arrow) so `new stripe.default(...)` works
  default: function StripeMock(...args: any[]) {
    return mockStripeConstructor(...args);
  },
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

  // Re-establish Stripe constructor mock (stripped by resetMocks)
  mockStripeConstructor.mockReturnValue(mockStripe);
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

    it("should return 0 when partner not found", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await commissionCalculator.calculateCommission(
        "nonexistent",
        "signup",
        100,
      );

      expect(result).toBe(0);
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
  // initiatePayout
  // -------------------------------------------------------------------------

  describe("initiatePayout", () => {
    const payoutRequest = {
      partnerId: "partner-1",
      amount: 55,
      conversionIds: ["c1", "c2"],
      paymentMethod: "stripe" as const,
      stripeAccountId: "acct_stripe_1",
    };

    it("should create payout and process Stripe transfer", async () => {
      // getPendingPayout -> conversions
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { id: "c1", commission_earned: 30 },
            { id: "c2", commission_earned: 25 },
          ],
          error: null,
        }),
      );
      // getPendingPayout -> getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });
      // Insert payout record
      mockBuilder.single.mockResolvedValueOnce({
        data: { id: "payout-1", partner_id: "partner-1", amount: 55, status: "pending" },
        error: null,
      });
      // Stripe transfer
      mockStripe.transfers.create.mockResolvedValueOnce({ id: "tr_abc123" });
      // await supabase.from("affiliate_payouts").update(...).eq() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );
      // await supabase.from("affiliate_conversions").update(...).in() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await commissionCalculator.initiatePayout(payoutRequest);

      expect(result.status).toBe("completed");
      expect(result.transactionId).toBe("tr_abc123");
      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        {
          amount: 5500, // 55 * 100 cents
          currency: "usd",
          destination: "acct_stripe_1",
          description: "Fynvita affiliate commission payout",
        },
        expect.objectContaining({ idempotencyKey: expect.stringContaining("payout-1") }),
      );
    });

    it("should throw when not eligible for payout", async () => {
      // getPendingPayout -> low amount
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: "c1", commission_earned: 10 }], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });

      await expect(
        commissionCalculator.initiatePayout({ ...payoutRequest, amount: 10 }),
      ).rejects.toThrow("Minimum payout of $50 not reached");
    });

    it("should throw when requested amount exceeds available", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: "c1", commission_earned: 60 }],
          error: null,
        }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });

      await expect(
        commissionCalculator.initiatePayout({ ...payoutRequest, amount: 100 }),
      ).rejects.toThrow("Requested payout $100 exceeds available $60");
    });

    it("should mark payout as failed when Stripe transfer fails", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { id: "c1", commission_earned: 30 },
            { id: "c2", commission_earned: 25 },
          ],
          error: null,
        }),
      );
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, min_payout: 50 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: "payout-1", partner_id: "partner-1", amount: 55, status: "pending" },
          error: null,
        });

      mockStripe.transfers.create.mockRejectedValueOnce(
        new Error("Stripe transfer failed"),
      );
      // catch: await supabase.from("affiliate_payouts").update({status:"failed",...}).eq() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await commissionCalculator.initiatePayout(payoutRequest);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Stripe transfer failed");
    });

    it("should pass idempotencyKey derived from payout id to stripe.transfers.create (FND-026)", async () => {
      const payoutId = "payout-idemp-comm-1";
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { id: "c1", commission_earned: 30 },
            { id: "c2", commission_earned: 25 },
          ],
          error: null,
        }),
      );
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, min_payout: 50 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: payoutId, partner_id: "partner-1", amount: 55, status: "pending" },
          error: null,
        });
      mockStripe.transfers.create.mockResolvedValueOnce({ id: "tr_idemp_comm" });
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      await commissionCalculator.initiatePayout(payoutRequest);

      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5500,
          currency: "usd",
          destination: "acct_stripe_1",
        }),
        expect.objectContaining({
          idempotencyKey: expect.stringContaining(payoutId),
        }),
      );
    });

    it("should handle bank transfer payout method", async () => {
      const bankRequest = {
        partnerId: "partner-1",
        amount: 55,
        conversionIds: ["c1", "c2"],
        paymentMethod: "bank_transfer" as const,
        bankDetails: {
          accountName: "John Doe",
          accountNumber: "1234567890",
          routingNumber: "021000021",
          bankName: "Chase",
        },
      };

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { id: "c1", commission_earned: 30 },
            { id: "c2", commission_earned: 25 },
          ],
          error: null,
        }),
      );
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, min_payout: 50 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: "payout-1", partner_id: "partner-1", amount: 55, status: "pending" },
          error: null,
        });
      // processBankTransfer -> await supabase.from("pending_bank_transfers").insert() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );
      // await supabase.from("affiliate_payouts").update(...).eq() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );
      // await supabase.from("affiliate_conversions").update(...).in() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await commissionCalculator.initiatePayout(bankRequest);

      expect(result.status).toBe("completed");
      expect(result.transactionId).toBeDefined();
      // Should have inserted a pending_bank_transfers record
      expect(mockSupabase.from).toHaveBeenCalledWith("pending_bank_transfers");
    });

    it("should throw when payout record insert fails", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { id: "c1", commission_earned: 30 },
            { id: "c2", commission_earned: 25 },
          ],
          error: null,
        }),
      );
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { ...partnerRow, min_payout: 50 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "insert payout failed" },
        });

      await expect(
        commissionCalculator.initiatePayout(payoutRequest),
      ).rejects.toThrow("Failed to create payout: insert payout failed");
    });
  });

  // -------------------------------------------------------------------------
  // processScheduledPayouts
  // -------------------------------------------------------------------------

  describe("processScheduledPayouts", () => {
    it("should process payouts for eligible partners", async () => {
      // Get active partners
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: "p1",
              payout_frequency: "monthly",
              payment_method: "stripe",
              stripe_account_id: "acct_1",
            },
          ],
          error: null,
        }),
      );
      // isPayoutDue -> last payout
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });
      // getPendingPayout -> conversions
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: "c1", commission_earned: 60 }],
          error: null,
        }),
      );
      // getPendingPayout -> getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });
      // Get eligible conversion IDs
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: "c1" }], error: null }),
      );
      // initiatePayout -> getPendingPayout (re-check) -> conversions
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: "c1", commission_earned: 60 }],
          error: null,
        }),
      );
      // initiatePayout -> getPendingPayout -> getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });
      // initiatePayout -> insert payout
      mockBuilder.single.mockResolvedValueOnce({
        data: { id: "payout-1", partner_id: "p1", amount: 60, status: "pending" },
        error: null,
      });
      // Stripe transfer
      mockStripe.transfers.create.mockResolvedValueOnce({ id: "tr_sched_1" });
      // initiatePayout -> await supabase.from("affiliate_payouts").update(...).eq() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );
      // initiatePayout -> await supabase.from("affiliate_conversions").update(...).in() — thenable
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const results = await commissionCalculator.processScheduledPayouts();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("completed");
    });

    it("should skip partners not due for payout", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: "p1",
              payout_frequency: "monthly",
              payment_method: "stripe",
              stripe_account_id: "acct_1",
            },
          ],
          error: null,
        }),
      );
      // isPayoutDue -> recent payout
      mockBuilder.single.mockResolvedValueOnce({
        data: { processed_at: recentDate.toISOString() },
        error: null,
      });

      const results = await commissionCalculator.processScheduledPayouts();

      expect(results).toHaveLength(0);
    });

    it("should throw on partner query error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "partner fetch fail" } }),
      );

      await expect(
        commissionCalculator.processScheduledPayouts(),
      ).rejects.toThrow("Failed to get partners: partner fetch fail");
    });

    it("should skip partners below minimum payout", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: "p1",
              payout_frequency: "monthly",
              payment_method: "stripe",
              stripe_account_id: "acct_1",
            },
          ],
          error: null,
        }),
      );
      // isPayoutDue -> never paid
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });
      // getPendingPayout -> conversions (low amount)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: "c1", commission_earned: 5 }],
          error: null,
        }),
      );
      // getPendingPayout -> getPartner
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...partnerRow, min_payout: 50 },
        error: null,
      });

      const results = await commissionCalculator.processScheduledPayouts();

      expect(results).toHaveLength(0);
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

    it("should return null on unexpected error (graceful fallback)", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "OTHER", message: "unexpected" },
      });

      const result = await commissionCalculator.getCommissionRule(
        "partner-1",
        "purchase",
        100,
      );

      expect(result).toBeNull();
    });
  });
});
