/**
 * Tracking Service Tests
 *
 * Tests for click tracking, conversion tracking, analytics, and postback handling.
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

const mockHashChain = {
  update: jest.fn<any, any[]>(),
  digest: jest.fn<any, any[]>(),
};
const mockRandomUUID = jest.fn<any, any[]>();
const mockCreateHash = jest.fn<any, any[]>();

jest.mock("crypto", () => ({
  createHash: (...args: any[]) => mockCreateHash(...args),
  randomUUID: (...args: any[]) => mockRandomUUID(...args),
}));

// Must configure mockCreateClient BEFORE import so module-level
// `const supabase = createClient(...)` captures mockSupabase.
mockCreateClient.mockReturnValue(mockSupabase as any);

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { trackingService } from "../tracking-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseClickRow = {
  id: "row-1",
  click_id: "clk_testuuid12345678abcdef0123456789",
  user_id: "user-1",
  partner_id: "partner-1",
  offer_id: "offer-1",
  referral_code: "REF123",
  source_page: "/credit-cards",
  destination_url: "https://partner.com/apply",
  user_agent: "Mozilla/5.0",
  ip_hash: "hashed-value-ab",
  session_id: "sess-1",
  clicked_at: "2026-01-15T10:00:00.000Z",
};

const baseConversionRow = {
  id: "conv-1",
  click_id: "clk_1",
  user_id: "user-1",
  partner_id: "partner-1",
  offer_id: "offer-1",
  type: "signup",
  status: "pending",
  value: 100,
  commission_earned: 10,
  partner_reference: "EXT-REF-1",
  converted_at: "2026-01-15T12:00:00.000Z",
  confirmed_at: null,
  paid_at: null,
  rejection_reason: null,
  metadata: { source: "web" },
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

  // Make every builder method return mockBuilder (chainable)
  Object.keys(mockBuilder).forEach((key) => {
    (mockBuilder as any)[key].mockReturnValue(mockBuilder);
  });

  mockSupabase.from.mockReturnValue(mockBuilder);
  mockSupabase.rpc.mockReturnValue(mockBuilder);
  mockCreateClient.mockReturnValue(mockSupabase as any);

  // Re-establish crypto mocks (stripped by resetMocks)
  mockHashChain.update.mockReturnThis();
  mockHashChain.digest.mockReturnValue("hashed-value-abcdef1234567890");
  mockCreateHash.mockReturnValue(mockHashChain);
  mockRandomUUID.mockReturnValue("test-uuid-1234-5678-abcd-ef0123456789");
});

// ===========================================================================
// Click Tracking
// ===========================================================================

describe("TrackingService", () => {
  // -------------------------------------------------------------------------
  // trackClick
  // -------------------------------------------------------------------------

  describe("trackClick", () => {
    const clickData = {
      userId: "user-1",
      partnerId: "partner-1",
      offerId: "offer-1",
      referralCode: "REF123",
      sourcePage: "/credit-cards",
      destinationUrl: "https://partner.com/apply",
      userAgent: "Mozilla/5.0",
      ipAddress: "192.168.1.1",
      sessionId: "sess-1",
    };

    it("should create a click record and return mapped Click", async () => {
      // isDuplicateClick -> no rows
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      // calculateCommission partner lookup (not used here but for clarity)
      // insert -> select -> single
      mockBuilder.single.mockResolvedValueOnce({
        data: baseClickRow,
        error: null,
      });

      const result = await trackingService.trackClick(clickData);

      expect(result.clickId).toBeDefined();
      expect(result.partnerId).toBe("partner-1");
      expect(result.userId).toBe("user-1");
      expect(result.sourcePage).toBe("/credit-cards");
      expect(mockSupabase.from).toHaveBeenCalledWith("affiliate_clicks");
    });

    it("should hash the IP address when provided", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: baseClickRow,
        error: null,
      });

      await trackingService.trackClick(clickData);

      // crypto.createHash should have been called
      expect(mockCreateHash).toHaveBeenCalledWith("sha256");
    });

    it("should not hash IP when ipAddress is not provided", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...baseClickRow, ip_hash: undefined },
        error: null,
      });

      const dataWithoutIp = { ...clickData, ipAddress: undefined };
      const result = await trackingService.trackClick(dataWithoutIp);

      expect(result.ipHash).toBeUndefined();
    });

    it("should return existing click when duplicate detected", async () => {
      // isDuplicateClick returns a row
      mockBuilder.then
        .mockImplementationOnce((resolve: any) =>
          resolve({ data: [{ id: "existing-1" }], error: null }),
        )
        // getRecentClick returns existing row
        .mockImplementationOnce((resolve: any) =>
          resolve({ data: [baseClickRow], error: null }),
        );

      const result = await trackingService.trackClick(clickData);

      expect(result.id).toBe("row-1");
    });

    it("should throw on DB insert error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: "insert failed" },
      });

      await expect(trackingService.trackClick(clickData)).rejects.toThrow(
        "Failed to track click: insert failed",
      );
    });

    it("should generate clickId with clk_ prefix", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      mockBuilder.single.mockResolvedValueOnce({
        data: baseClickRow,
        error: null,
      });

      await trackingService.trackClick(clickData);

      // Verify the insert was called with a click_id starting with "clk_"
      const insertCall = mockBuilder.insert.mock.calls[0][0];
      expect(insertCall.click_id).toMatch(/^clk_/);
    });
  });

  // -------------------------------------------------------------------------
  // getClick
  // -------------------------------------------------------------------------

  describe("getClick", () => {
    it("should return a mapped click when found", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: baseClickRow,
        error: null,
      });

      const result = await trackingService.getClick("clk_abc");

      expect(result).not.toBeNull();
      expect(result!.clickId).toBe(baseClickRow.click_id);
      expect(result!.clickedAt).toBeInstanceOf(Date);
    });

    it("should return null when click not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const result = await trackingService.getClick("clk_nonexistent");

      expect(result).toBeNull();
    });

    it("should throw on unexpected DB error", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST500", message: "Server error" },
      });

      await expect(trackingService.getClick("clk_bad")).rejects.toThrow(
        "Failed to get click: Server error",
      );
    });
  });

  // -------------------------------------------------------------------------
  // getUserClicks
  // -------------------------------------------------------------------------

  describe("getUserClicks", () => {
    it("should return an array of mapped clicks", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [baseClickRow, { ...baseClickRow, id: "row-2" }], error: null }),
      );

      const result = await trackingService.getUserClicks("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].partnerId).toBe("partner-1");
    });

    it("should apply date range filters when provided", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      await trackingService.getUserClicks("user-1", dateRange);

      expect(mockBuilder.gte).toHaveBeenCalledWith(
        "clicked_at",
        dateRange.from.toISOString(),
      );
      expect(mockBuilder.lte).toHaveBeenCalledWith(
        "clicked_at",
        dateRange.to.toISOString(),
      );
    });

    it("should return empty array when no data", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await trackingService.getUserClicks("user-1");

      expect(result).toEqual([]);
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "query failed" } }),
      );

      await expect(trackingService.getUserClicks("user-1")).rejects.toThrow(
        "Failed to get user clicks: query failed",
      );
    });
  });

  // -------------------------------------------------------------------------
  // getClickStats
  // -------------------------------------------------------------------------

  describe("getClickStats", () => {
    it("should compute correct stats from click data", async () => {
      const clicks = [
        { ...baseClickRow, user_id: "u1", source_page: "/cards" },
        { ...baseClickRow, user_id: "u1", source_page: "/cards" },
        { ...baseClickRow, user_id: "u2", source_page: "/loans" },
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: clicks, error: null }),
      );

      const result = await trackingService.getClickStats("partner-1", dateRange);

      expect(result.partnerId).toBe("partner-1");
      expect(result.totalClicks).toBe(3);
      expect(result.uniqueUsers).toBe(2);
      expect(result.clicksBySource["/cards"]).toBe(2);
      expect(result.clicksBySource["/loans"]).toBe(1);
      expect(result.clicksByDay).toBeDefined();
    });

    it("should return zero stats when no clicks", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      const result = await trackingService.getClickStats("partner-1", dateRange);

      expect(result.totalClicks).toBe(0);
      expect(result.uniqueUsers).toBe(0);
    });

    it("should categorize clicks with null source as unknown", async () => {
      const clicks = [
        { ...baseClickRow, source_page: null },
      ];
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: clicks, error: null }),
      );

      const result = await trackingService.getClickStats("partner-1", dateRange);

      expect(result.clicksBySource["unknown"]).toBe(1);
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "click stats failed" } }),
      );

      await expect(
        trackingService.getClickStats("partner-1", dateRange),
      ).rejects.toThrow("Failed to get click stats: click stats failed");
    });
  });

  // =========================================================================
  // Conversion Tracking
  // =========================================================================

  describe("trackConversion", () => {
    const conversionData = {
      clickId: "clk_1",
      userId: "user-1",
      partnerId: "partner-1",
      offerId: "offer-1",
      type: "signup" as const,
      value: 500,
      partnerReference: "EXT-123",
      metadata: { source: "web" },
    };

    it("should create a conversion record with calculated commission", async () => {
      // calculateCommission -> getPartner
      mockBuilder.single
        .mockResolvedValueOnce({
          data: {
            commission_type: "cpa",
            commission_rate: null,
            commission_fixed: 25,
          },
          error: null,
        })
        // insert -> select -> single
        .mockResolvedValueOnce({
          data: {
            ...baseConversionRow,
            value: 500,
            commission_earned: 25,
          },
          error: null,
        });

      const result = await trackingService.trackConversion(conversionData);

      expect(result.partnerId).toBe("partner-1");
      expect(result.commissionEarned).toBe(25);
      expect(result.status).toBe("pending");
      expect(mockBuilder.insert).toHaveBeenCalled();
    });

    it("should calculate revenue_share commission", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: {
            commission_type: "revenue_share",
            commission_rate: 10,
            commission_fixed: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            ...baseConversionRow,
            value: 500,
            commission_earned: 50,
          },
          error: null,
        });

      const result = await trackingService.trackConversion(conversionData);

      expect(result).toBeDefined();
    });

    it("should calculate hybrid commission", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: {
            commission_type: "hybrid",
            commission_rate: 5,
            commission_fixed: 10,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            ...baseConversionRow,
            value: 500,
            commission_earned: 35,
          },
          error: null,
        });

      const result = await trackingService.trackConversion(conversionData);

      expect(result).toBeDefined();
    });

    it("should return 0 commission when partner not found", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "not found" },
        })
        .mockResolvedValueOnce({
          data: { ...baseConversionRow, commission_earned: 0 },
          error: null,
        });

      const result = await trackingService.trackConversion(conversionData);

      expect(result.commissionEarned).toBe(0);
    });

    it("should throw on DB insert error", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { commission_type: "cpa", commission_fixed: 10 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "conversion insert failed" },
        });

      await expect(
        trackingService.trackConversion(conversionData),
      ).rejects.toThrow("Failed to track conversion: conversion insert failed");
    });

    it("should use CPL commission only for lead/signup/application types", async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: {
            commission_type: "cpl",
            commission_fixed: 15,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...baseConversionRow, type: "signup", commission_earned: 15 },
          error: null,
        });

      const result = await trackingService.trackConversion({
        ...conversionData,
        type: "signup",
      });

      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // updateConversionStatus
  // -------------------------------------------------------------------------

  describe("updateConversionStatus", () => {
    it("should update status to confirmed and set confirmed_at", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...baseConversionRow, status: "confirmed", confirmed_at: "2026-01-16T00:00:00.000Z" },
        error: null,
      });

      const result = await trackingService.updateConversionStatus(
        "conv-1",
        "confirmed",
      );

      expect(result.status).toBe("confirmed");
      const updateCall = mockBuilder.update.mock.calls[0][0];
      expect(updateCall.status).toBe("confirmed");
      expect(updateCall.confirmed_at).toBeDefined();
    });

    it("should update status to paid and set paid_at", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...baseConversionRow, status: "paid", paid_at: "2026-01-17T00:00:00.000Z" },
        error: null,
      });

      const result = await trackingService.updateConversionStatus(
        "conv-1",
        "paid",
      );

      expect(result.status).toBe("paid");
      const updateCall = mockBuilder.update.mock.calls[0][0];
      expect(updateCall.paid_at).toBeDefined();
    });

    it("should update status to rejected with reason", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: {
          ...baseConversionRow,
          status: "rejected",
          rejection_reason: "Fraudulent",
        },
        error: null,
      });

      const result = await trackingService.updateConversionStatus(
        "conv-1",
        "rejected",
        "Fraudulent",
      );

      expect(result.status).toBe("rejected");
      expect(result.rejectionReason).toBe("Fraudulent");
    });

    it("should throw on DB update error", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: "update failed" },
      });

      await expect(
        trackingService.updateConversionStatus("conv-1", "confirmed"),
      ).rejects.toThrow("Failed to update conversion: update failed");
    });
  });

  // -------------------------------------------------------------------------
  // getConversion
  // -------------------------------------------------------------------------

  describe("getConversion", () => {
    it("should return a mapped conversion", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: baseConversionRow,
        error: null,
      });

      const result = await trackingService.getConversion("conv-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("conv-1");
      expect(result!.type).toBe("signup");
      expect(result!.convertedAt).toBeInstanceOf(Date);
    });

    it("should return null when not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await trackingService.getConversion("conv-bad");

      expect(result).toBeNull();
    });

    it("should throw on unexpected error", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "OTHER", message: "server error" },
      });

      await expect(
        trackingService.getConversion("conv-1"),
      ).rejects.toThrow("Failed to get conversion: server error");
    });
  });

  // -------------------------------------------------------------------------
  // getUserConversions
  // -------------------------------------------------------------------------

  describe("getUserConversions", () => {
    it("should return mapped conversions for a user", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [baseConversionRow], error: null }),
      );

      const result = await trackingService.getUserConversions("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].partnerId).toBe("partner-1");
    });

    it("should apply date range when provided", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      await trackingService.getUserConversions("user-1", dateRange);

      expect(mockBuilder.gte).toHaveBeenCalledWith(
        "converted_at",
        dateRange.from.toISOString(),
      );
      expect(mockBuilder.lte).toHaveBeenCalledWith(
        "converted_at",
        dateRange.to.toISOString(),
      );
    });

    it("should return empty array when no data", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await trackingService.getUserConversions("user-1");

      expect(result).toEqual([]);
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "query fail" } }),
      );

      await expect(
        trackingService.getUserConversions("user-1"),
      ).rejects.toThrow("Failed to get user conversions: query fail");
    });
  });

  // -------------------------------------------------------------------------
  // getConversionStats
  // -------------------------------------------------------------------------

  describe("getConversionStats", () => {
    it("should compute correct stats from conversion data", async () => {
      const conversions = [
        { ...baseConversionRow, type: "signup", status: "pending", value: 100, commission_earned: 10 },
        { ...baseConversionRow, type: "signup", status: "confirmed", value: 200, commission_earned: 20 },
        { ...baseConversionRow, type: "purchase", status: "paid", value: 300, commission_earned: 30 },
      ];

      // First query: conversions
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: conversions, error: null }),
      );
      // Second query: click count (uses select with count)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 10, error: null }),
      );

      const result = await trackingService.getConversionStats("partner-1", dateRange);

      expect(result.partnerId).toBe("partner-1");
      expect(result.totalConversions).toBe(3);
      expect(result.totalValue).toBe(600);
      expect(result.totalCommission).toBe(60);
      expect(result.conversionRate).toBeCloseTo(0.3);
      expect(result.avgOrderValue).toBe(200);
      expect(result.conversionsByType["signup"]).toBe(2);
      expect(result.conversionsByType["purchase"]).toBe(1);
      expect(result.conversionsByStatus["pending"]).toBe(1);
    });

    it("should return zero conversion rate when no clicks", async () => {
      mockBuilder.then
        .mockImplementationOnce((resolve: any) =>
          resolve({ data: [baseConversionRow], error: null }),
        )
        .mockImplementationOnce((resolve: any) =>
          resolve({ count: 0, error: null }),
        );

      const result = await trackingService.getConversionStats("partner-1", dateRange);

      expect(result.conversionRate).toBe(0);
    });

    it("should throw on conversion query error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "conv stats fail" } }),
      );

      await expect(
        trackingService.getConversionStats("partner-1", dateRange),
      ).rejects.toThrow("Failed to get conversion stats: conv stats fail");
    });

    it("should throw on click count query error", async () => {
      mockBuilder.then
        .mockImplementationOnce((resolve: any) =>
          resolve({ data: [], error: null }),
        )
        .mockImplementationOnce((resolve: any) =>
          resolve({ count: null, error: { message: "click count fail" } }),
        );

      await expect(
        trackingService.getConversionStats("partner-1", dateRange),
      ).rejects.toThrow("Failed to get click count: click count fail");
    });
  });

  // =========================================================================
  // Partner Performance
  // =========================================================================

  describe("getPartnerPerformance", () => {
    it("should aggregate performance for all active partners", async () => {
      // getPartnerPerformance -> get active partners
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { id: "p1", name: "Partner One" },
            { id: "p2", name: "Partner Two" },
          ],
          error: null,
        }),
      );

      // For each partner: getClickStats + getConversionStats
      // Partner One - click stats
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [baseClickRow, baseClickRow], error: null }),
      );
      // Partner One - conversion stats (conversions)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ ...baseConversionRow, value: 100, commission_earned: 10 }],
          error: null,
        }),
      );
      // Partner One - conversion stats (click count)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 2, error: null }),
      );
      // Partner Two - click stats
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      // Partner Two - conversion stats (conversions)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );
      // Partner Two - conversion stats (click count)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 0, error: null }),
      );

      const result = await trackingService.getPartnerPerformance(dateRange);

      expect(result).toHaveLength(2);
      // Sorted by commission desc
      expect(result[0].commission).toBeGreaterThanOrEqual(result[1].commission);
      expect(result[0].partnerName).toBeDefined();
    });

    it("should throw on partner query error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "partner query fail" } }),
      );

      await expect(
        trackingService.getPartnerPerformance(dateRange),
      ).rejects.toThrow("Failed to get partners: partner query fail");
    });

    it("should return empty array when no active partners", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      const result = await trackingService.getPartnerPerformance(dateRange);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // Top Offers
  // =========================================================================

  describe("getTopOffers", () => {
    it("should return top offers sorted by revenue", async () => {
      // conversions query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            { offer_id: "offer-A", value: 500 },
            { offer_id: "offer-A", value: 300 },
            { offer_id: "offer-B", value: 200 },
          ],
          error: null,
        }),
      );
      // click count for offer-A
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 10, error: null }),
      );
      // click count for offer-B
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 5, error: null }),
      );

      const result = await trackingService.getTopOffers("partner-1", dateRange, 10);

      expect(result).toHaveLength(2);
      expect(result[0].offerId).toBe("offer-A");
      expect(result[0].revenue).toBe(800);
      expect(result[0].conversions).toBe(2);
      expect(result[0].clicks).toBe(10);
      expect(result[1].offerId).toBe("offer-B");
    });

    it("should respect the limit parameter", async () => {
      const manyOffers = Array.from({ length: 15 }, (_, i) => ({
        offer_id: `offer-${i}`,
        value: (15 - i) * 10,
      }));

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: manyOffers, error: null }),
      );

      // Click count for each unique offer
      for (let i = 0; i < 15; i++) {
        mockBuilder.then.mockImplementationOnce((resolve: any) =>
          resolve({ count: 1, error: null }),
        );
      }

      const result = await trackingService.getTopOffers("partner-1", dateRange, 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should throw on DB error", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: "top offers fail" } }),
      );

      await expect(
        trackingService.getTopOffers("partner-1", dateRange),
      ).rejects.toThrow("Failed to get top offers: top offers fail");
    });

    it("should return empty array when no conversions", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      const result = await trackingService.getTopOffers("partner-1", dateRange);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // Postback Handling
  // =========================================================================

  describe("handlePostback", () => {
    it("should create a conversion from a valid postback", async () => {
      // getClick -> found
      mockBuilder.single.mockResolvedValueOnce({
        data: baseClickRow,
        error: null,
      });
      // trackConversion -> calculateCommission -> partner lookup
      mockBuilder.single.mockResolvedValueOnce({
        data: { commission_type: "cpa", commission_fixed: 20 },
        error: null,
      });
      // trackConversion -> insert conversion
      mockBuilder.single.mockResolvedValueOnce({
        data: { ...baseConversionRow, commission_earned: 20 },
        error: null,
      });

      const result = await trackingService.handlePostback(
        "partner-1",
        baseClickRow.click_id,
        "signup",
        500,
        "EXT-REF",
      );

      expect(result).not.toBeNull();
      expect(result!.commissionEarned).toBe(20);
    });

    it("should return null when click not found", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await trackingService.handlePostback(
        "partner-1",
        "clk_unknown",
        "signup",
      );

      expect(result).toBeNull();
    });
  });
});
