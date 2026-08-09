/**
 * Affiliate Service Tests
 *
 * Tests for affiliate partner management, referral code generation/validation,
 * user attribution tracking, and referrer lookup.
 */

// ---------------------------------------------------------------------------
// Mocks (must be declared before any imports that trigger module evaluation)
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
  upsert: jest.fn<any, any[]>(),
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
  // `data` and `error` are resolved when mockBuilder is awaited
  data: null as any,
  error: null as any,
};

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => {
    mockCreateClient(...args);
    return mockSupabase;
  },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { affiliateService } from "../affiliate-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date("2026-02-23T12:00:00Z");
const future = new Date("2027-12-31T12:00:00Z");
const past = new Date("2025-12-01T12:00:00Z");

function makePartnerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "partner-1",
    name: "Test Partner",
    slug: "test-partner",
    type: "credit_card",
    description: "A test partner",
    logo_url: "https://example.com/logo.png",
    website_url: "https://example.com",
    api_endpoint: "https://api.example.com",
    commission_type: "cpa",
    commission_rate: 10,
    commission_fixed: 25,
    min_payout: 50,
    payout_frequency: "monthly",
    payment_method: "stripe",
    stripe_account_id: "acct_123",
    regions: ["US"],
    is_active: true,
    metadata: { tier: "gold" },
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

function makeReferralCodeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ref-1",
    code: "ABCD1234",
    user_id: "user-1",
    partner_id: "partner-1",
    campaign_id: "campaign-1",
    uses_count: 0,
    max_uses: 100,
    expires_at: future.toISOString(),
    is_active: true,
    created_at: now.toISOString(),
    ...overrides,
  };
}

function makeAttributionRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "user-2",
    referral_code: "ABCD1234",
    referrer_id: "user-1",
    partner_id: "partner-1",
    campaign_id: "campaign-1",
    first_click_id: "click-1",
    last_click_id: "click-1",
    attributed_at: now.toISOString(),
    expires_at: future.toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Reset data/error properties (used when mockBuilder is awaited)
  mockBuilder.data = null;
  mockBuilder.error = null;

  // Make all builder methods return mockBuilder for chaining
  Object.keys(mockBuilder).forEach((key) => {
    if (typeof (mockBuilder as any)[key]?.mockReturnValue === "function") {
      (mockBuilder as any)[key].mockReturnValue(mockBuilder);
    }
  });

  // Make mockBuilder properly thenable: await resolves with {data, error}
  (mockBuilder as any).then = (
    onFulfilled?: (v: any) => any,
    onRejected?: (e: any) => any,
  ) => {
    try {
      const result = onFulfilled?.({ data: mockBuilder.data, error: mockBuilder.error });
      return Promise.resolve(result);
    } catch (err) {
      if (onRejected) return Promise.resolve(onRejected(err));
      return Promise.reject(err);
    }
  };

  mockSupabase.from.mockReturnValue(mockBuilder);
  mockSupabase.rpc.mockReturnValue(mockBuilder);
  mockCreateClient.mockReturnValue(mockSupabase as any);
});

// ===========================================================================
// Tests
// ===========================================================================

describe("AffiliateService", () => {
  // =========================================================================
  // createPartner
  // =========================================================================

  describe("createPartner", () => {
    it("should create a partner and return mapped result", async () => {
      const row = makePartnerRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.createPartner({
        name: "Test Partner",
        slug: "test-partner",
        type: "credit_card",
        commissionType: "cpa",
        commissionRate: 10,
        commissionFixed: 25,
        description: "A test partner",
        logoUrl: "https://example.com/logo.png",
        websiteUrl: "https://example.com",
        apiEndpoint: "https://api.example.com",
        stripeAccountId: "acct_123",
        metadata: { tier: "gold" },
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("affiliate_partners");
      expect(mockBuilder.insert).toHaveBeenCalled();
      expect(mockBuilder.select).toHaveBeenCalled();
      expect(mockBuilder.single).toHaveBeenCalled();
      expect(result.id).toBe("partner-1");
      expect(result.name).toBe("Test Partner");
      expect(result.slug).toBe("test-partner");
      expect(result.type).toBe("credit_card");
      expect(result.commissionType).toBe("cpa");
      expect(result.isActive).toBe(true);
    });

    it("should use default values for optional fields", async () => {
      const row = makePartnerRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await affiliateService.createPartner({
        name: "Minimal Partner",
        slug: "minimal",
        type: "bank",
        commissionType: "revenue_share",
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.min_payout).toBe(50);
      expect(insertArg.payout_frequency).toBe("monthly");
      expect(insertArg.payment_method).toBe("stripe");
      expect(insertArg.regions).toEqual(["US"]);
      expect(insertArg.is_active).toBe(true);
    });

    it("should use provided optional values when given", async () => {
      const row = makePartnerRow({
        min_payout: 100,
        payout_frequency: "weekly",
        payment_method: "bank_transfer",
        regions: ["US", "CA"],
      });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await affiliateService.createPartner({
        name: "Full Partner",
        slug: "full",
        type: "broker",
        commissionType: "hybrid",
        minPayout: 100,
        payoutFrequency: "weekly",
        paymentMethod: "bank_transfer",
        regions: ["US", "CA"],
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.min_payout).toBe(100);
      expect(insertArg.payout_frequency).toBe("weekly");
      expect(insertArg.payment_method).toBe("bank_transfer");
      expect(insertArg.regions).toEqual(["US", "CA"]);
    });

    it("should throw when Supabase returns an error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "insert failed" },
      });

      await expect(
        affiliateService.createPartner({
          name: "Bad Partner",
          slug: "bad",
          type: "other",
          commissionType: "cpa",
        }),
      ).rejects.toThrow("Failed to create partner: insert failed");
    });
  });

  // =========================================================================
  // updatePartner
  // =========================================================================

  describe("updatePartner", () => {
    it("should update only provided fields", async () => {
      const row = makePartnerRow({ name: "Updated Name" });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.updatePartner("partner-1", {
        name: "Updated Name",
      });

      expect(mockBuilder.update).toHaveBeenCalled();
      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.name).toBe("Updated Name");
      expect(updateArg.updated_at).toBeDefined();
      expect(result.name).toBe("Updated Name");
    });

    it("should update all optional fields when provided", async () => {
      const row = makePartnerRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await affiliateService.updatePartner("partner-1", {
        name: "New Name",
        description: "New desc",
        logoUrl: "https://new-logo.png",
        websiteUrl: "https://new-site.com",
        apiEndpoint: "https://new-api.com",
        commissionType: "revenue_share",
        commissionRate: 15,
        commissionFixed: 30,
        minPayout: 75,
        payoutFrequency: "biweekly",
        paymentMethod: "check",
        stripeAccountId: "acct_new",
        regions: ["US", "UK"],
        isActive: false,
        metadata: { tier: "platinum" },
      });

      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.name).toBe("New Name");
      expect(updateArg.description).toBe("New desc");
      expect(updateArg.logo_url).toBe("https://new-logo.png");
      expect(updateArg.website_url).toBe("https://new-site.com");
      expect(updateArg.api_endpoint).toBe("https://new-api.com");
      expect(updateArg.commission_type).toBe("revenue_share");
      expect(updateArg.commission_rate).toBe(15);
      expect(updateArg.commission_fixed).toBe(30);
      expect(updateArg.min_payout).toBe(75);
      expect(updateArg.payout_frequency).toBe("biweekly");
      expect(updateArg.payment_method).toBe("check");
      expect(updateArg.stripe_account_id).toBe("acct_new");
      expect(updateArg.regions).toEqual(["US", "UK"]);
      expect(updateArg.is_active).toBe(false);
      expect(updateArg.metadata).toEqual({ tier: "platinum" });
    });

    it("should throw when Supabase returns an error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "update failed" },
      });

      await expect(
        affiliateService.updatePartner("partner-1", { name: "x" }),
      ).rejects.toThrow("Failed to update partner: update failed");
    });
  });

  // =========================================================================
  // getPartner
  // =========================================================================

  describe("getPartner", () => {
    it("should return a mapped partner", async () => {
      const row = makePartnerRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.getPartner("partner-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("affiliate_partners");
      expect(mockBuilder.eq).toHaveBeenCalledWith("id", "partner-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("partner-1");
      expect(result!.name).toBe("Test Partner");
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it("should return null when not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await affiliateService.getPartner("missing");
      expect(result).toBeNull();
    });

    it("should throw on other errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });

      await expect(
        affiliateService.getPartner("partner-1"),
      ).rejects.toThrow("Failed to get partner: db error");
    });
  });

  // =========================================================================
  // getPartnerBySlug
  // =========================================================================

  describe("getPartnerBySlug", () => {
    it("should query by slug and return mapped partner", async () => {
      const row = makePartnerRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.getPartnerBySlug("test-partner");

      expect(mockBuilder.eq).toHaveBeenCalledWith("slug", "test-partner");
      expect(result).not.toBeNull();
      expect(result!.slug).toBe("test-partner");
    });

    it("should return null when not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await affiliateService.getPartnerBySlug("missing-slug");
      expect(result).toBeNull();
    });

    it("should throw on other errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });

      await expect(
        affiliateService.getPartnerBySlug("test"),
      ).rejects.toThrow("Failed to get partner: db error");
    });
  });

  // =========================================================================
  // listPartners
  // =========================================================================

  describe("listPartners", () => {
    it("should return all partners when no filters", async () => {
      const rows = [makePartnerRow(), makePartnerRow({ id: "partner-2", name: "Partner 2" })];
      mockBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await affiliateService.listPartners();

      expect(mockSupabase.from).toHaveBeenCalledWith("affiliate_partners");
      expect(mockBuilder.order).toHaveBeenCalledWith("name");
      expect(result).toHaveLength(2);
    });

    it("should apply type filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await affiliateService.listPartners({ type: "credit_card" });

      expect(mockBuilder.eq).toHaveBeenCalledWith("type", "credit_card");
    });

    it("should apply isActive filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await affiliateService.listPartners({ isActive: true });

      expect(mockBuilder.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should apply region filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await affiliateService.listPartners({ region: "CA" });

      expect(mockBuilder.contains).toHaveBeenCalledWith("regions", ["CA"]);
    });

    it("should return empty array when data is null", async () => {
      mockBuilder.order.mockResolvedValue({ data: null, error: null });

      const result = await affiliateService.listPartners();
      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      mockBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "list error" },
      });

      await expect(affiliateService.listPartners()).rejects.toThrow(
        "Failed to list partners: list error",
      );
    });
  });

  // =========================================================================
  // deletePartner
  // =========================================================================

  describe("deletePartner", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const row = makePartnerRow({ is_active: false });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await affiliateService.deletePartner("partner-1");

      expect(mockBuilder.update).toHaveBeenCalled();
      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.is_active).toBe(false);
    });

    it("should throw when update fails", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "delete failed" },
      });

      await expect(
        affiliateService.deletePartner("partner-1"),
      ).rejects.toThrow("Failed to update partner: delete failed");
    });
  });

  // =========================================================================
  // generateReferralCode
  // =========================================================================

  describe("generateReferralCode", () => {
    it("should create a referral code with custom code", async () => {
      const row = makeReferralCodeRow({ code: "CUSTOM99" });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.generateReferralCode({
        userId: "user-1",
        partnerId: "partner-1",
        campaignId: "campaign-1",
        customCode: "CUSTOM99",
        maxUses: 100,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("referral_codes");
      expect(mockBuilder.insert).toHaveBeenCalled();
      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.code).toBe("CUSTOM99");
      expect(insertArg.user_id).toBe("user-1");
      expect(insertArg.partner_id).toBe("partner-1");
      expect(insertArg.campaign_id).toBe("campaign-1");
      expect(insertArg.uses_count).toBe(0);
      expect(insertArg.max_uses).toBe(100);
      expect(insertArg.is_active).toBe(true);
      expect(result.code).toBe("CUSTOM99");
    });

    it("should generate a random code when customCode is not provided", async () => {
      const row = makeReferralCodeRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await affiliateService.generateReferralCode({
        userId: "user-1",
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      // Code should be 8 characters from the allowed charset
      expect(insertArg.code).toHaveLength(8);
      expect(insertArg.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    });

    it("should use provided expiresAt", async () => {
      const customExpiry = new Date("2027-01-01T00:00:00Z");
      const row = makeReferralCodeRow({ expires_at: customExpiry.toISOString() });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await affiliateService.generateReferralCode({
        userId: "user-1",
        expiresAt: customExpiry,
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.expires_at).toBe(customExpiry.toISOString());
    });

    it("should use default expiration (30 days) when not provided", async () => {
      const row = makeReferralCodeRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const before = Date.now();
      await affiliateService.generateReferralCode({
        userId: "user-1",
      });
      const after = Date.now();

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      const expiresMs = new Date(insertArg.expires_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      // Should be approximately 30 days from now
      expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs + 1000);
    });

    it("should retry with new code on duplicate error (23505)", async () => {
      // First call: duplicate error
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      // Second call (retry): success
      const row = makeReferralCodeRow();
      mockBuilder.single.mockResolvedValueOnce({ data: row, error: null });

      const result = await affiliateService.generateReferralCode({
        userId: "user-1",
        customCode: "DUPE_CODE",
      });

      // insert called twice
      expect(mockBuilder.insert).toHaveBeenCalledTimes(2);
      // Second insert should have a random code (not the original custom code)
      const secondInsertArg = mockBuilder.insert.mock.calls[1][0];
      expect(secondInsertArg.code).toHaveLength(8);
      expect(result.id).toBe("ref-1");
    });

    it("should throw on non-duplicate errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "insert failed" },
      });

      await expect(
        affiliateService.generateReferralCode({ userId: "user-1" }),
      ).rejects.toThrow("Failed to create referral code: insert failed");
    });

    it("should map the returned row to ReferralCode type", async () => {
      const row = makeReferralCodeRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.generateReferralCode({
        userId: "user-1",
      });

      expect(result.id).toBe("ref-1");
      expect(result.code).toBe("ABCD1234");
      expect(result.userId).toBe("user-1");
      expect(result.partnerId).toBe("partner-1");
      expect(result.campaignId).toBe("campaign-1");
      expect(result.usesCount).toBe(0);
      expect(result.maxUses).toBe(100);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // validateReferralCode
  // =========================================================================

  describe("validateReferralCode", () => {
    it("should return valid for an active, non-expired code with uses remaining", async () => {
      const row = makeReferralCodeRow();
      mockBuilder.data = row;

      const result = await affiliateService.validateReferralCode("abcd1234");

      expect(mockBuilder.eq).toHaveBeenCalledWith("code", "ABCD1234");
      expect(result.valid).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code!.code).toBe("ABCD1234");
    });

    it("should uppercase the code before querying", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "not found" },
      });

      await affiliateService.validateReferralCode("lowercase");

      expect(mockBuilder.eq).toHaveBeenCalledWith("code", "LOWERCASE");
    });

    it("should return invalid when code is not found (error)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "not found" },
      });

      const result = await affiliateService.validateReferralCode("INVALID");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid referral code");
    });

    it("should return invalid when code is not found (null data)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await affiliateService.validateReferralCode("NODATA");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid referral code");
    });

    it("should return invalid when code is inactive", async () => {
      const row = makeReferralCodeRow({ is_active: false });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.validateReferralCode("ABCD1234");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referral code is no longer active");
    });

    it("should return invalid when code has expired", async () => {
      const row = makeReferralCodeRow({ expires_at: past.toISOString() });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.validateReferralCode("ABCD1234");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referral code has expired");
    });

    it("should return invalid when max uses reached", async () => {
      const row = makeReferralCodeRow({ uses_count: 100, max_uses: 100 });
      mockBuilder.data = row;
      mockBuilder.error = null;

      const result = await affiliateService.validateReferralCode("ABCD1234");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referral code has reached maximum uses");
    });

    it("should be valid when max_uses is null (unlimited)", async () => {
      const row = makeReferralCodeRow({ max_uses: null, uses_count: 999 });
      mockBuilder.data = row;
      mockBuilder.error = null;

      const result = await affiliateService.validateReferralCode("ABCD1234");

      expect(result.valid).toBe(true);
    });

    it("should be valid when expires_at is null (no expiration)", async () => {
      const row = makeReferralCodeRow({ expires_at: null });
      mockBuilder.data = row;
      mockBuilder.error = null;

      const result = await affiliateService.validateReferralCode("ABCD1234");

      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // applyReferralCode
  // =========================================================================

  describe("applyReferralCode", () => {
    it("should call increment_referral_use RPC and create attribution for valid code", async () => {
      const codeRow = makeReferralCodeRow({ uses_count: 5, user_id: "owner-1" });
      // validateReferralCode → .single()
      mockBuilder.single.mockResolvedValueOnce({ data: codeRow, error: null });
      // increment_referral_use RPC → applied
      mockSupabase.rpc.mockResolvedValue({ data: "applied", error: null });
      // createAttribution → .single()
      mockBuilder.single.mockResolvedValueOnce({ data: makeAttributionRow({ user_id: "new-user" }), error: null });

      await affiliateService.applyReferralCode("new-user", "abcd1234");

      // Verify RPC called with correct args (atomic increment — no .update({ uses_count }))
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "increment_referral_use",
        { p_code: "ABCD1234", p_user_id: "new-user" },
      );
      expect(mockBuilder.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ uses_count: expect.anything() }),
      );
      // Verify upsert was called for attribution
      expect(mockBuilder.upsert).toHaveBeenCalled();
      const upsertArg = mockBuilder.upsert.mock.calls[0][0];
      expect(upsertArg.user_id).toBe("new-user");
      expect(upsertArg.referral_code).toBe("ABCD1234");
      expect(upsertArg.referrer_id).toBe("owner-1");
      expect(upsertArg.partner_id).toBe("partner-1");
      expect(upsertArg.campaign_id).toBe("campaign-1");
    });

    it("should throw when validation fails", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "not found" },
      });

      await expect(
        affiliateService.applyReferralCode("user-2", "INVALID"),
      ).rejects.toThrow("Invalid referral code");
    });

    it("should throw for expired code", async () => {
      const row = makeReferralCodeRow({ expires_at: past.toISOString() });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await expect(
        affiliateService.applyReferralCode("user-2", "ABCD1234"),
      ).rejects.toThrow("Referral code has expired");
    });

    // MNY-3: self-referral guard
    it("should reject self-referral at the service layer", async () => {
      // code owner is "user-1"; caller is also "user-1"
      const row = makeReferralCodeRow({ user_id: "user-1" });
      mockBuilder.single.mockResolvedValueOnce({ data: row, error: null });

      await expect(
        affiliateService.applyReferralCode("user-1", "ABCD1234"),
      ).rejects.toThrow("Cannot apply your own referral code");
    });

    // MNY-3: null-cap code must succeed (guards NULL-comparison regression)
    it("should apply a code with null max_uses (unlimited cap)", async () => {
      // max_uses null means unlimited — must not be rejected as cap_reached
      const row = makeReferralCodeRow({ max_uses: null, uses_count: 999, user_id: "owner-1" });
      // validateReferralCode → .single() first call
      mockBuilder.single.mockResolvedValueOnce({ data: row, error: null });
      // createAttribution → .single() second call
      mockBuilder.single.mockResolvedValueOnce({ data: makeAttributionRow({ user_id: "user-2" }), error: null });
      // increment_referral_use RPC → returns "applied"
      mockSupabase.rpc.mockResolvedValue({ data: "applied", error: null });

      await expect(
        affiliateService.applyReferralCode("user-2", "ABCD1234"),
      ).resolves.toBeUndefined();

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "increment_referral_use",
        { p_code: "ABCD1234", p_user_id: "user-2" },
      );
    });

    // MNY-3: concurrent cap enforcement — RPC returning cap_reached must throw
    it("should throw when RPC returns cap_reached (concurrent exhaustion)", async () => {
      const row = makeReferralCodeRow({ max_uses: 1, uses_count: 0, user_id: "owner-1" });
      // validateReferralCode passes (uses_count=0 < max_uses=1), but RPC then reports cap_reached
      mockBuilder.single.mockResolvedValueOnce({ data: row, error: null });
      mockSupabase.rpc.mockResolvedValue({ data: "cap_reached", error: null });

      await expect(
        affiliateService.applyReferralCode("user-2", "ABCD1234"),
      ).rejects.toThrow("Referral code has reached maximum uses");
    });
  });

  // =========================================================================
  // getUserReferralCodes
  // =========================================================================

  describe("getUserReferralCodes", () => {
    it("should return active referral codes for a user", async () => {
      const rows = [
        makeReferralCodeRow(),
        makeReferralCodeRow({ id: "ref-2", code: "WXYZ5678" }),
      ];
      mockBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await affiliateService.getUserReferralCodes("user-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("referral_codes");
      expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockBuilder.eq).toHaveBeenCalledWith("is_active", true);
      expect(mockBuilder.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("ABCD1234");
      expect(result[1].code).toBe("WXYZ5678");
    });

    it("should return empty array when no codes found", async () => {
      mockBuilder.order.mockResolvedValue({ data: null, error: null });

      const result = await affiliateService.getUserReferralCodes("user-1");
      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      mockBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "query failed" },
      });

      await expect(
        affiliateService.getUserReferralCodes("user-1"),
      ).rejects.toThrow("Failed to get referral codes: query failed");
    });
  });

  // =========================================================================
  // deactivateReferralCode
  // =========================================================================

  describe("deactivateReferralCode", () => {
    it("should set is_active to false for the given code", async () => {
      mockBuilder.eq.mockResolvedValueOnce({ data: null, error: null });

      await affiliateService.deactivateReferralCode("abcd1234");

      expect(mockSupabase.from).toHaveBeenCalledWith("referral_codes");
      expect(mockBuilder.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockBuilder.eq).toHaveBeenCalledWith("code", "ABCD1234");
    });

    it("should uppercase the code before updating", async () => {
      mockBuilder.eq.mockResolvedValueOnce({ data: null, error: null });

      await affiliateService.deactivateReferralCode("lowercase");

      expect(mockBuilder.eq).toHaveBeenCalledWith("code", "LOWERCASE");
    });

    it("should throw on error", async () => {
      mockBuilder.eq.mockResolvedValueOnce({
        data: null,
        error: { message: "deactivation failed" },
      });

      await expect(
        affiliateService.deactivateReferralCode("ABCD1234"),
      ).rejects.toThrow(
        "Failed to deactivate referral code: deactivation failed",
      );
    });
  });

  // =========================================================================
  // createAttribution
  // =========================================================================

  describe("createAttribution", () => {
    it("should upsert an attribution record", async () => {
      const row = makeAttributionRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.createAttribution({
        userId: "user-2",
        referralCode: "ABCD1234",
        referrerId: "user-1",
        partnerId: "partner-1",
        campaignId: "campaign-1",
        clickId: "click-1",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("user_attributions");
      expect(mockBuilder.upsert).toHaveBeenCalled();
      const upsertArg = mockBuilder.upsert.mock.calls[0][0];
      expect(upsertArg.user_id).toBe("user-2");
      expect(upsertArg.referral_code).toBe("ABCD1234");
      expect(upsertArg.referrer_id).toBe("user-1");
      expect(upsertArg.partner_id).toBe("partner-1");
      expect(upsertArg.campaign_id).toBe("campaign-1");
      expect(upsertArg.first_click_id).toBe("click-1");
      expect(upsertArg.last_click_id).toBe("click-1");

      const upsertOptions = mockBuilder.upsert.mock.calls[0][1];
      expect(upsertOptions.onConflict).toBe("user_id");
      expect(upsertOptions.ignoreDuplicates).toBe(false);

      expect(result.userId).toBe("user-2");
      expect(result.referralCode).toBe("ABCD1234");
      expect(result.referrerId).toBe("user-1");
      expect(result.attributedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("should set expires_at to 30 days from now", async () => {
      const row = makeAttributionRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const before = Date.now();
      await affiliateService.createAttribution({ userId: "user-2" });
      const after = Date.now();

      const upsertArg = mockBuilder.upsert.mock.calls[0][0];
      const expiresMs = new Date(upsertArg.expires_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs + 1000);
    });

    it("should throw on error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "upsert failed" },
      });

      await expect(
        affiliateService.createAttribution({ userId: "user-2" }),
      ).rejects.toThrow("Failed to create attribution: upsert failed");
    });
  });

  // =========================================================================
  // getUserAttribution
  // =========================================================================

  describe("getUserAttribution", () => {
    it("should return a mapped attribution", async () => {
      const row = makeAttributionRow();
      mockBuilder.data = row;
      mockBuilder.error = null;

      const result = await affiliateService.getUserAttribution("user-2");

      expect(mockSupabase.from).toHaveBeenCalledWith("user_attributions");
      expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-2");
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-2");
      expect(result!.referralCode).toBe("ABCD1234");
      expect(result!.firstClickId).toBe("click-1");
      expect(result!.lastClickId).toBe("click-1");
    });

    it("should return null when not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await affiliateService.getUserAttribution("missing");
      expect(result).toBeNull();
    });

    it("should return null when attribution has expired", async () => {
      const row = makeAttributionRow({ expires_at: past.toISOString() });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.getUserAttribution("user-2");
      expect(result).toBeNull();
    });

    it("should return attribution when expires_at is null (no expiration)", async () => {
      const row = makeAttributionRow({ expires_at: null });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.getUserAttribution("user-2");
      expect(result).not.toBeNull();
      expect(result!.expiresAt).toBeUndefined();
    });

    it("should throw on other errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });

      await expect(
        affiliateService.getUserAttribution("user-2"),
      ).rejects.toThrow("Failed to get attribution: db error");
    });
  });

  // =========================================================================
  // updateLastClick
  // =========================================================================

  describe("updateLastClick", () => {
    it("should update the last_click_id for the user", async () => {
      mockBuilder.eq.mockResolvedValueOnce({ data: null, error: null });

      await affiliateService.updateLastClick("user-2", "click-99");

      expect(mockSupabase.from).toHaveBeenCalledWith("user_attributions");
      expect(mockBuilder.update).toHaveBeenCalledWith({
        last_click_id: "click-99",
      });
      expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-2");
    });

    it("should silently swallow errors", async () => {
      mockBuilder.eq.mockResolvedValueOnce({
        data: null,
        error: { message: "update failed" },
      });

      // Should not throw
      await expect(
        affiliateService.updateLastClick("user-2", "click-99"),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // getReferrer
  // =========================================================================

  describe("getReferrer", () => {
    it("should return the referrerId from user attribution", async () => {
      const row = makeAttributionRow({ referrer_id: "referrer-abc" });
      mockBuilder.data = row;
      mockBuilder.error = null;

      const result = await affiliateService.getReferrer("user-2");

      expect(result).toBe("referrer-abc");
    });

    it("should return null when no attribution exists", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await affiliateService.getReferrer("user-2");
      expect(result).toBeNull();
    });

    it("should return null when attribution has expired", async () => {
      const row = makeAttributionRow({ expires_at: past.toISOString() });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.getReferrer("user-2");
      expect(result).toBeNull();
    });

    it("should return null when referrerId is undefined", async () => {
      const row = makeAttributionRow({ referrer_id: undefined });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await affiliateService.getReferrer("user-2");
      expect(result).toBeNull();
    });
  });
});
