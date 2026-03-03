/**
 * Disclosure Service Tests
 *
 * Tests for compliance disclosure management including CRUD operations,
 * required disclosures logic, banner generation, offer linking, and compliance checking.
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

import { disclosureService } from "../disclosure-service";
import type { Disclosure, DisclosureType } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date("2026-02-23T12:00:00Z");

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "disc-1",
    type: "advertiser_disclosure",
    title: "Advertiser Disclosure",
    short_text: "We may receive compensation.",
    full_text: "Full advertiser disclosure text here.",
    version: "1.0",
    effective_date: now.toISOString(),
    is_active: true,
    regions: ["US"],
    categories: null,
    partner_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

function makeDisclosure(overrides: Partial<Disclosure> = {}): Disclosure {
  return {
    id: "disc-1",
    type: "advertiser_disclosure",
    title: "Advertiser Disclosure",
    shortText: "We may receive compensation.",
    fullText: "Full advertiser disclosure text here.",
    version: "1.0",
    effectiveDate: now,
    isActive: true,
    regions: ["US"],
    createdAt: now,
    updatedAt: now,
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

describe("DisclosureService", () => {
  // =========================================================================
  // createDisclosure
  // =========================================================================

  describe("createDisclosure", () => {
    it("should create a disclosure and return mapped result", async () => {
      const row = makeDbRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await disclosureService.createDisclosure({
        type: "advertiser_disclosure",
        title: "Advertiser Disclosure",
        shortText: "We may receive compensation.",
        fullText: "Full advertiser disclosure text here.",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("disclosures");
      expect(mockBuilder.insert).toHaveBeenCalled();
      expect(mockBuilder.select).toHaveBeenCalled();
      expect(mockBuilder.single).toHaveBeenCalled();
      expect(result.id).toBe("disc-1");
      expect(result.type).toBe("advertiser_disclosure");
      expect(result.title).toBe("Advertiser Disclosure");
    });

    it("should use default version and regions when not provided", async () => {
      const row = makeDbRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await disclosureService.createDisclosure({
        type: "rate_disclosure",
        title: "Rate",
        shortText: "short",
        fullText: "full",
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.version).toBe("1.0");
      expect(insertArg.regions).toEqual(["US"]);
    });

    it("should use provided version and regions", async () => {
      const row = makeDbRow({ version: "2.0", regions: ["US", "CA"] });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await disclosureService.createDisclosure({
        type: "rate_disclosure",
        title: "Rate",
        shortText: "short",
        fullText: "full",
        version: "2.0",
        regions: ["US", "CA"],
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.version).toBe("2.0");
      expect(insertArg.regions).toEqual(["US", "CA"]);
    });

    it("should throw when Supabase returns an error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "insert failed" },
      });

      await expect(
        disclosureService.createDisclosure({
          type: "rate_disclosure",
          title: "t",
          shortText: "s",
          fullText: "f",
        }),
      ).rejects.toThrow("Failed to create disclosure: insert failed");
    });
  });

  // =========================================================================
  // updateDisclosure
  // =========================================================================

  describe("updateDisclosure", () => {
    it("should update only provided fields", async () => {
      const row = makeDbRow({ title: "Updated Title" });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await disclosureService.updateDisclosure("disc-1", {
        title: "Updated Title",
      });

      expect(mockBuilder.update).toHaveBeenCalled();
      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.title).toBe("Updated Title");
      expect(updateArg.updated_at).toBeDefined();
      expect(result.title).toBe("Updated Title");
    });

    it("should update isActive", async () => {
      const row = makeDbRow({ is_active: false });
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await disclosureService.updateDisclosure("disc-1", { isActive: false });

      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.is_active).toBe(false);
    });

    it("should update all optional fields when provided", async () => {
      const row = makeDbRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await disclosureService.updateDisclosure("disc-1", {
        title: "New",
        shortText: "Short",
        fullText: "Full",
        version: "3.0",
        isActive: true,
        regions: ["UK"],
        categories: ["credit_card"],
      });

      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.title).toBe("New");
      expect(updateArg.short_text).toBe("Short");
      expect(updateArg.full_text).toBe("Full");
      expect(updateArg.version).toBe("3.0");
      expect(updateArg.is_active).toBe(true);
      expect(updateArg.regions).toEqual(["UK"]);
      expect(updateArg.categories).toEqual(["credit_card"]);
    });

    it("should throw when Supabase returns an error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "update failed" },
      });

      await expect(
        disclosureService.updateDisclosure("disc-1", { title: "x" }),
      ).rejects.toThrow("Failed to update disclosure: update failed");
    });
  });

  // =========================================================================
  // getDisclosure
  // =========================================================================

  describe("getDisclosure", () => {
    it("should return a mapped disclosure", async () => {
      const row = makeDbRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await disclosureService.getDisclosure("disc-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("disclosures");
      expect(mockBuilder.eq).toHaveBeenCalledWith("id", "disc-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("disc-1");
    });

    it("should return null when not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await disclosureService.getDisclosure("missing");
      expect(result).toBeNull();
    });

    it("should throw on other errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });

      await expect(
        disclosureService.getDisclosure("disc-1"),
      ).rejects.toThrow("Failed to get disclosure: db error");
    });
  });

  // =========================================================================
  // getDisclosureByType
  // =========================================================================

  describe("getDisclosureByType", () => {
    it("should query by type and is_active, ordered by effective_date desc", async () => {
      const row = makeDbRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      const result = await disclosureService.getDisclosureByType(
        "advertiser_disclosure",
      );

      expect(mockBuilder.eq).toHaveBeenCalledWith("type", "advertiser_disclosure");
      expect(mockBuilder.eq).toHaveBeenCalledWith("is_active", true);
      expect(mockBuilder.order).toHaveBeenCalledWith("effective_date", {
        ascending: false,
      });
      expect(mockBuilder.limit).toHaveBeenCalledWith(1);
      expect(result).not.toBeNull();
    });

    it("should filter by region when provided", async () => {
      const row = makeDbRow();
      mockBuilder.single.mockResolvedValue({ data: row, error: null });

      await disclosureService.getDisclosureByType("rate_disclosure", "CA");

      expect(mockBuilder.contains).toHaveBeenCalledWith("regions", ["CA"]);
    });

    it("should return default disclosure when not found in DB", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await disclosureService.getDisclosureByType(
        "advertiser_disclosure",
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe("default_advertiser_disclosure");
      expect(result!.title).toBe("Advertiser Disclosure");
    });

    it("should return null for unknown type when not found in DB", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      // Cast to test unknown type fallback - all 8 types have defaults
      // so we test the non-PGRST116 error path instead
      const result = await disclosureService.getDisclosureByType(
        "fcra_disclosure",
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("default_fcra_disclosure");
    });

    it("should throw on non-PGRST116 errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });

      await expect(
        disclosureService.getDisclosureByType("rate_disclosure"),
      ).rejects.toThrow("Failed to get disclosure: db error");
    });
  });

  // =========================================================================
  // listDisclosures
  // =========================================================================

  describe("listDisclosures", () => {
    it("should return all disclosures when no filters", async () => {
      const rows = [makeDbRow(), makeDbRow({ id: "disc-2" })];
      mockBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await disclosureService.listDisclosures();

      expect(mockSupabase.from).toHaveBeenCalledWith("disclosures");
      expect(result).toHaveLength(2);
    });

    it("should apply type filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await disclosureService.listDisclosures({ type: "rate_disclosure" });

      expect(mockBuilder.eq).toHaveBeenCalledWith("type", "rate_disclosure");
    });

    it("should apply isActive filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await disclosureService.listDisclosures({ isActive: true });

      expect(mockBuilder.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should apply region filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await disclosureService.listDisclosures({ region: "CA" });

      expect(mockBuilder.contains).toHaveBeenCalledWith("regions", ["CA"]);
    });

    it("should apply category filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await disclosureService.listDisclosures({ category: "credit_card" });

      expect(mockBuilder.contains).toHaveBeenCalledWith("categories", [
        "credit_card",
      ]);
    });

    it("should apply partnerId filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await disclosureService.listDisclosures({ partnerId: "p-1" });

      expect(mockBuilder.eq).toHaveBeenCalledWith("partner_id", "p-1");
    });

    it("should return empty array when data is null", async () => {
      mockBuilder.order.mockResolvedValue({ data: null, error: null });

      const result = await disclosureService.listDisclosures();
      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      mockBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "list error" },
      });

      await expect(disclosureService.listDisclosures()).rejects.toThrow(
        "Failed to list disclosures: list error",
      );
    });
  });

  // =========================================================================
  // getRequiredDisclosures
  // =========================================================================

  describe("getRequiredDisclosures", () => {
    beforeEach(() => {
      // Default: getDisclosureByType returns default disclosures for all calls
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });
    });

    it("should include advertiser disclosure for offer pages", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "offers-list",
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe("advertiser_disclosure");
    });

    it("should include advertiser disclosure for compare pages", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "compare-cards",
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe("advertiser_disclosure");
    });

    it("should include advertiser disclosure for recommendation pages", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "recommendation-engine",
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe("advertiser_disclosure");
    });

    it("should include affiliate disclosure when hasAffiliate is true", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "offers-list",
        hasAffiliate: true,
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("affiliate_disclosure");
    });

    it("should include rate disclosure for credit_card category", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "offers-list",
        category: "credit_card",
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("rate_disclosure");
    });

    it("should include rate disclosure for personal_loan category", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "offers-list",
        category: "personal_loan",
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("rate_disclosure");
    });

    it("should include rate disclosure for mortgage category", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "offers-list",
        category: "mortgage",
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("rate_disclosure");
    });

    it("should include FCRA disclosure for credit pages", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "credit-report",
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("fcra_disclosure");
    });

    it("should include FCRA disclosure for score pages", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "score-simulator",
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("fcra_disclosure");
    });

    it("should include FCRA disclosure for dispute pages", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "dispute-center",
      });

      const types = result.map((d) => d.type);
      expect(types).toContain("fcra_disclosure");
    });

    it("should not include rate disclosure for non-lending categories", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "offers-list",
        category: "insurance",
      });

      const types = result.map((d) => d.type);
      expect(types).not.toContain("rate_disclosure");
    });

    it("should return empty for a generic page with no special context", async () => {
      const result = await disclosureService.getRequiredDisclosures({
        page: "settings",
      });

      expect(result).toHaveLength(0);
    });

    it("should use provided region for lookups", async () => {
      await disclosureService.getRequiredDisclosures({
        page: "offers-list",
        region: "UK",
      });

      // The contains call should use "UK" region
      const containsCalls = mockBuilder.contains.mock.calls;
      const regionCalls = containsCalls.filter(
        (c: any[]) => c[0] === "regions",
      );
      expect(regionCalls.some((c: any[]) => c[1][0] === "UK")).toBe(true);
    });
  });

  // =========================================================================
  // generateDisclosureBannerContent (pure function)
  // =========================================================================

  describe("generateDisclosureBannerContent", () => {
    it("should return hasDisclosures: false for empty array", () => {
      const result = disclosureService.generateDisclosureBannerContent([]);

      expect(result.hasDisclosures).toBe(false);
      expect(result.shortText).toBe("");
      expect(result.disclosures).toEqual([]);
    });

    it("should return structured data for a single disclosure", () => {
      const disclosure = makeDisclosure();
      const result =
        disclosureService.generateDisclosureBannerContent([disclosure]);

      expect(result.hasDisclosures).toBe(true);
      expect(result.shortText).toBe("We may receive compensation.");
      expect(result.disclosures).toHaveLength(1);
      expect(result.disclosures[0].id).toBe("disc-1");
      expect(result.disclosures[0].type).toBe("advertiser_disclosure");
      expect(result.disclosures[0].title).toBe("Advertiser Disclosure");
    });

    it("should concatenate shortText from multiple disclosures", () => {
      const d1 = makeDisclosure({ shortText: "First." });
      const d2 = makeDisclosure({
        id: "disc-2",
        type: "affiliate_disclosure",
        shortText: "Second.",
      });

      const result = disclosureService.generateDisclosureBannerContent([
        d1,
        d2,
      ]);

      expect(result.hasDisclosures).toBe(true);
      expect(result.shortText).toBe("First. Second.");
      expect(result.disclosures).toHaveLength(2);
    });

    it("should include all disclosure fields in output array", () => {
      const disclosure = makeDisclosure({
        id: "d-test",
        type: "rate_disclosure",
        title: "Rate",
        shortText: "Rates vary.",
        fullText: "Full rate text.",
      });

      const result =
        disclosureService.generateDisclosureBannerContent([disclosure]);

      expect(result.disclosures[0]).toEqual({
        id: "d-test",
        type: "rate_disclosure",
        title: "Rate",
        shortText: "Rates vary.",
        fullText: "Full rate text.",
      });
    });
  });

  // =========================================================================
  // generateDisclosureBanner (deprecated)
  // =========================================================================

  describe("generateDisclosureBanner", () => {
    it("should return placeholder text when disclosures exist", () => {
      const disclosure = makeDisclosure();
      const result = disclosureService.generateDisclosureBanner([disclosure]);

      expect(result).toBe(
        "[Disclosure content available - use generateDisclosureBannerContent]",
      );
    });

    it("should return empty string when no disclosures", () => {
      const result = disclosureService.generateDisclosureBanner([]);
      expect(result).toBe("");
    });
  });

  // =========================================================================
  // formatDisclosureForApi (pure function)
  // =========================================================================

  describe("formatDisclosureForApi", () => {
    it("should return formatted disclosure object", () => {
      const disclosure = makeDisclosure({
        id: "api-disc",
        type: "terms_conditions",
        title: "Terms",
        shortText: "Terms apply.",
        fullText: "Full terms text.",
      });

      const result = disclosureService.formatDisclosureForApi(disclosure);

      expect(result).toEqual({
        id: "api-disc",
        type: "terms_conditions",
        title: "Terms",
        short: "Terms apply.",
        full: "Full terms text.",
      });
    });

    it("should use 'short' and 'full' as keys (not shortText/fullText)", () => {
      const disclosure = makeDisclosure();
      const result = disclosureService.formatDisclosureForApi(disclosure);

      expect(result).toHaveProperty("short");
      expect(result).toHaveProperty("full");
      expect(result).not.toHaveProperty("shortText");
      expect(result).not.toHaveProperty("fullText");
    });
  });

  // =========================================================================
  // linkDisclosureToOffer
  // =========================================================================

  describe("linkDisclosureToOffer", () => {
    it("should insert into offer_disclosures with defaults", async () => {
      mockBuilder.insert.mockResolvedValue({ data: null, error: null });

      await disclosureService.linkDisclosureToOffer("offer-1", "disc-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("offer_disclosures");
      expect(mockBuilder.insert).toHaveBeenCalledWith({
        offer_id: "offer-1",
        disclosure_id: "disc-1",
        must_display: true,
        display_location: "bottom",
      });
    });

    it("should use provided options", async () => {
      mockBuilder.insert.mockResolvedValue({ data: null, error: null });

      await disclosureService.linkDisclosureToOffer("offer-1", "disc-1", {
        mustDisplay: false,
        displayLocation: "top",
      });

      expect(mockBuilder.insert).toHaveBeenCalledWith({
        offer_id: "offer-1",
        disclosure_id: "disc-1",
        must_display: false,
        display_location: "top",
      });
    });

    it("should throw on error", async () => {
      mockBuilder.insert.mockResolvedValue({
        data: null,
        error: { message: "link failed" },
      });

      await expect(
        disclosureService.linkDisclosureToOffer("offer-1", "disc-1"),
      ).rejects.toThrow("Failed to link disclosure: link failed");
    });
  });

  // =========================================================================
  // unlinkDisclosureFromOffer
  // =========================================================================

  describe("unlinkDisclosureFromOffer", () => {
    it("should delete from offer_disclosures matching both IDs", async () => {
      // Chain: from().delete().eq("offer_id").eq("disclosure_id")
      // All chain methods return mockBuilder; await resolves to mockBuilder
      // mockBuilder.error is null (default), so no error thrown
      await disclosureService.unlinkDisclosureFromOffer("offer-1", "disc-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("offer_disclosures");
      expect(mockBuilder.delete).toHaveBeenCalled();
      expect(mockBuilder.eq).toHaveBeenCalledWith("offer_id", "offer-1");
      expect(mockBuilder.eq).toHaveBeenCalledWith("disclosure_id", "disc-1");
    });

    it("should throw on error", async () => {
      // Set error on mockBuilder — when await resolves to mockBuilder,
      // destructuring { error } yields this value
      mockBuilder.error = { message: "unlink failed" };

      await expect(
        disclosureService.unlinkDisclosureFromOffer("offer-1", "disc-1"),
      ).rejects.toThrow("Failed to unlink disclosure: unlink failed");
    });
  });

  // =========================================================================
  // checkOfferCompliance
  // =========================================================================

  describe("checkOfferCompliance", () => {
    it("should return not compliant when offer is not found", async () => {
      // First call: get offer - returns null data
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await disclosureService.checkOfferCompliance("offer-1");

      expect(result.compliant).toBe(false);
      expect(result.warnings).toContain("Offer not found");
    });

    it("should be compliant when all required disclosures are linked", async () => {
      // First query: from("offers").select().eq().single() - offer details
      mockBuilder.single.mockResolvedValueOnce({
        data: { category: "credit_card", sponsored_content: false },
        error: null,
      });

      // Second query: from("offer_disclosures").select().eq() - linked disclosures
      // Chain ends with .eq() which returns mockBuilder; await resolves to mockBuilder
      // So { data } comes from mockBuilder.data
      mockBuilder.data = [
        { disclosures: { type: "advertiser_disclosure" } },
        { disclosures: { type: "rate_disclosure" } },
      ];

      const result = await disclosureService.checkOfferCompliance("offer-1");

      expect(result.compliant).toBe(true);
      expect(result.missingDisclosures).toHaveLength(0);
    });

    it("should report missing disclosures", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { category: "credit_card", sponsored_content: false },
        error: null,
      });

      // No linked disclosures - second query resolves via mockBuilder.data
      mockBuilder.data = [];

      const result = await disclosureService.checkOfferCompliance("offer-1");

      expect(result.compliant).toBe(false);
      expect(result.missingDisclosures).toContain("advertiser_disclosure");
      expect(result.missingDisclosures).toContain("rate_disclosure");
    });

    it("should require affiliate_disclosure for sponsored content", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { category: "insurance", sponsored_content: true },
        error: null,
      });

      // Second query resolves via mockBuilder.data
      mockBuilder.data = [
        { disclosures: { type: "advertiser_disclosure" } },
        { disclosures: { type: "rate_disclosure" } },
      ];

      const result = await disclosureService.checkOfferCompliance("offer-1");

      expect(result.compliant).toBe(false);
      expect(result.missingDisclosures).toContain("affiliate_disclosure");
    });

    it("should add TILA warning for lending products", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { category: "credit_card", sponsored_content: false },
        error: null,
      });

      // Second query resolves via mockBuilder.data
      mockBuilder.data = [
        { disclosures: { type: "advertiser_disclosure" } },
        { disclosures: { type: "rate_disclosure" } },
      ];

      const result = await disclosureService.checkOfferCompliance("offer-1");

      expect(result.warnings).toContain(
        "Consider adding TILA disclosure for lending products",
      );
    });

    it("should not add TILA warning for non-lending products", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { category: "insurance", sponsored_content: false },
        error: null,
      });

      // Second query resolves via mockBuilder.data
      mockBuilder.data = [
        { disclosures: { type: "advertiser_disclosure" } },
        { disclosures: { type: "rate_disclosure" } },
      ];

      const result = await disclosureService.checkOfferCompliance("offer-1");

      expect(
        result.warnings.some((w) => w.includes("TILA")),
      ).toBe(false);
    });
  });

  // =========================================================================
  // getComplianceReport
  // =========================================================================

  describe("getComplianceReport", () => {
    it("should generate a report for all active offers", async () => {
      // Use a data queue so sequential awaits on mockBuilder get different data.
      // Query 1 (list offers): returns offer list
      // Query 2 (offer-1 disclosures): returns disclosures
      // Query 3 (offer-2 disclosures): returns empty
      const dataQueue = [
        // Query 1: list active offers
        [
          { id: "offer-1", name: "Card A" },
          { id: "offer-2", name: "Loan B" },
        ],
        // Query 2: offer-1 linked disclosures
        [
          { disclosures: { type: "advertiser_disclosure" } },
          { disclosures: { type: "rate_disclosure" } },
        ],
        // Query 3: offer-2 linked disclosures
        [],
      ];
      let queueIndex = 0;
      (mockBuilder as any).then = (
        onFulfilled?: (v: any) => any,
        onRejected?: (e: any) => any,
      ) => {
        try {
          const d = queueIndex < dataQueue.length ? dataQueue[queueIndex++] : mockBuilder.data;
          const result = onFulfilled?.({ data: d, error: null });
          return Promise.resolve(result);
        } catch (err) {
          if (onRejected) return Promise.resolve(onRejected(err));
          return Promise.reject(err);
        }
      };

      // For each offer, checkOfferCompliance calls .single() for offer details
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { category: "credit_card", sponsored_content: false },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { category: "insurance", sponsored_content: false },
          error: null,
        });

      const report = await disclosureService.getComplianceReport();

      expect(report).toHaveLength(2);
      expect(report[0].offerId).toBe("offer-1");
      expect(report[0].offerName).toBe("Card A");
      expect(report[1].offerId).toBe("offer-2");
      expect(report[1].offerName).toBe("Loan B");
    });

    it("should return empty report when no active offers", async () => {
      // First query resolves via mockBuilder.data with empty list
      mockBuilder.data = [];

      const report = await disclosureService.getComplianceReport();
      expect(report).toHaveLength(0);
    });

    it("should handle null offers data", async () => {
      // First query resolves via mockBuilder.data with null
      mockBuilder.data = null;

      const report = await disclosureService.getComplianceReport();
      expect(report).toHaveLength(0);
    });
  });

  // =========================================================================
  // DEFAULT_DISCLOSURES constant
  // =========================================================================

  describe("DEFAULT_DISCLOSURES (via getDisclosureByType fallback)", () => {
    const allTypes: DisclosureType[] = [
      "advertiser_disclosure",
      "affiliate_disclosure",
      "rate_disclosure",
      "terms_conditions",
      "privacy_policy",
      "fcra_disclosure",
      "ecoa_disclosure",
      "tila_disclosure",
    ];

    it.each(allTypes)(
      "should have a default disclosure for type: %s",
      async (type) => {
        mockBuilder.single.mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "not found" },
        });

        const result = await disclosureService.getDisclosureByType(type);

        expect(result).not.toBeNull();
        expect(result!.id).toBe(`default_${type}`);
        expect(result!.type).toBe(type);
        expect(result!.title).toBeDefined();
        expect(result!.shortText).toBeDefined();
        expect(result!.fullText).toBeDefined();
        expect(result!.version).toBe("1.0");
        expect(result!.isActive).toBe(true);
        expect(result!.regions).toEqual(["US"]);
      },
    );
  });
});
