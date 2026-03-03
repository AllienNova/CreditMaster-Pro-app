/**
 * Offer Service Tests
 *
 * Tests for financial product offer management including CRUD, matching,
 * eligibility, comparison, tracking, and disclosure retrieval.
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

jest.mock("../../affiliate/tracking-service", () => ({
  trackingService: {
    trackClick: jest.fn<any, any[]>(),
    trackConversion: jest.fn<any, any[]>(),
  },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { offerService } from "../offer-service";
import { trackingService } from "../../affiliate/tracking-service";
import type { Offer, UserProfile } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date("2026-02-23T12:00:00Z");

function makeOfferRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer-1",
    partner_id: "partner-1",
    partner_name: "Test Partner",
    category: "credit_card",
    name: "Test Card",
    headline: "Best card ever",
    description: "A great credit card",
    image_url: "https://example.com/img.png",
    destination_url: "https://example.com/apply",
    apr: { type: "variable", min: 14.99, max: 24.99 },
    fees: { annual: 0, noFees: true, foreignTransaction: 0 },
    rewards: {
      type: "cashback",
      earnRate: 2.0,
      signupBonus: 200,
      signupBonusSpend: 1000,
    },
    credit_limit: { min: 500, max: 10000, prequalification: true },
    loan_amount: null,
    min_credit_score: 670,
    max_credit_score: 850,
    min_income: 30000,
    residency_requirements: ["US"],
    age_requirement: { min: 18 },
    affiliate_offer_id: "aff-123",
    commission_type: "cpa",
    commission_value: 50,
    rank: 10,
    featured: true,
    badge: "Editor's Pick",
    tags: ["cashback", "no-fee"],
    disclosure_id: "disc-1",
    legal_disclaimer: "Terms apply.",
    sponsored_content: false,
    status: "active",
    start_date: null,
    end_date: null,
    regions: ["US"],
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    metadata: null,
    ...overrides,
  };
}

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-1",
    partnerId: "partner-1",
    partnerName: "Test Partner",
    category: "credit_card",
    name: "Test Card",
    headline: "Best card ever",
    description: "A great credit card",
    imageUrl: "https://example.com/img.png",
    destinationUrl: "https://example.com/apply",
    apr: { type: "variable", min: 14.99, max: 24.99 },
    fees: { annual: 0, noFees: true, foreignTransaction: 0 },
    rewards: {
      type: "cashback",
      earnRate: 2.0,
      signupBonus: 200,
      signupBonusSpend: 1000,
    },
    creditLimit: { min: 500, max: 10000, prequalification: true },
    minCreditScore: 670,
    maxCreditScore: 850,
    minIncome: 30000,
    residencyRequirements: ["US"],
    ageRequirement: { min: 18 },
    affiliateOfferId: "aff-123",
    commissionType: "cpa",
    commissionValue: 50,
    rank: 10,
    featured: true,
    badge: "Editor's Pick",
    tags: ["cashback", "no-fee"],
    disclosureId: "disc-1",
    legalDisclaimer: "Terms apply.",
    sponsoredContent: false,
    status: "active",
    regions: ["US"],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    creditScore: 720,
    income: 60000,
    age: 30,
    residency: "US",
    preferences: {
      rewardsType: "cashback",
      noAnnualFee: true,
      lowApr: true,
      signupBonus: true,
    },
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

describe("OfferService", () => {
  // =========================================================================
  // createOffer
  // =========================================================================

  describe("createOffer", () => {
    it("should look up partner name and create offer", async () => {
      // First query: get partner name
      mockBuilder.single.mockResolvedValueOnce({
        data: { name: "Acme Bank" },
        error: null,
      });
      // Second query: insert offer
      mockBuilder.single.mockResolvedValueOnce({
        data: makeOfferRow({ partner_name: "Acme Bank" }),
        error: null,
      });

      const result = await offerService.createOffer({
        partnerId: "partner-1",
        category: "credit_card",
        name: "Test Card",
        headline: "Best card",
        description: "Great card",
        destinationUrl: "https://example.com/apply",
        commissionType: "cpa",
        commissionValue: 50,
        disclosureId: "disc-1",
      });

      expect(result.partnerName).toBe("Acme Bank");
      expect(mockBuilder.insert).toHaveBeenCalled();
    });

    it("should use 'Unknown Partner' when partner not found", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockBuilder.single.mockResolvedValueOnce({
        data: makeOfferRow({ partner_name: "Unknown Partner" }),
        error: null,
      });

      const result = await offerService.createOffer({
        partnerId: "missing-partner",
        category: "credit_card",
        name: "Test",
        headline: "h",
        description: "d",
        destinationUrl: "https://example.com",
        commissionType: "cpa",
        commissionValue: 10,
        disclosureId: "disc-1",
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.partner_name).toBe("Unknown Partner");
    });

    it("should throw when insert fails", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { name: "Partner" },
        error: null,
      });
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: "insert error" },
      });

      await expect(
        offerService.createOffer({
          partnerId: "p-1",
          category: "credit_card",
          name: "T",
          headline: "h",
          description: "d",
          destinationUrl: "https://example.com",
          commissionType: "cpa",
          commissionValue: 10,
          disclosureId: "disc-1",
        }),
      ).rejects.toThrow("Failed to create offer: insert error");
    });

    it("should set defaults for rank, featured, sponsoredContent, regions", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { name: "P" },
        error: null,
      });
      mockBuilder.single.mockResolvedValueOnce({
        data: makeOfferRow(),
        error: null,
      });

      await offerService.createOffer({
        partnerId: "p-1",
        category: "credit_card",
        name: "T",
        headline: "h",
        description: "d",
        destinationUrl: "https://example.com",
        commissionType: "cpa",
        commissionValue: 10,
        disclosureId: "disc-1",
      });

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg.rank).toBe(100);
      expect(insertArg.featured).toBe(false);
      expect(insertArg.sponsored_content).toBe(false);
      expect(insertArg.regions).toEqual(["US"]);
      expect(insertArg.status).toBe("active");
    });
  });

  // =========================================================================
  // updateOffer
  // =========================================================================

  describe("updateOffer", () => {
    it("should update only provided fields", async () => {
      mockBuilder.single.mockResolvedValue({
        data: makeOfferRow({ name: "Updated Name" }),
        error: null,
      });

      const result = await offerService.updateOffer("offer-1", {
        name: "Updated Name",
      });

      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.name).toBe("Updated Name");
      expect(updateArg.updated_at).toBeDefined();
      expect(result.name).toBe("Updated Name");
    });

    it("should throw on error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "update failed" },
      });

      await expect(
        offerService.updateOffer("offer-1", { name: "x" }),
      ).rejects.toThrow("Failed to update offer: update failed");
    });
  });

  // =========================================================================
  // getOffer
  // =========================================================================

  describe("getOffer", () => {
    it("should return mapped offer", async () => {
      mockBuilder.single.mockResolvedValue({
        data: makeOfferRow(),
        error: null,
      });

      const result = await offerService.getOffer("offer-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("offer-1");
      expect(result!.category).toBe("credit_card");
    });

    it("should return null when not found (PGRST116)", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await offerService.getOffer("missing");
      expect(result).toBeNull();
    });

    it("should throw on other errors", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });

      await expect(offerService.getOffer("offer-1")).rejects.toThrow(
        "Failed to get offer: db error",
      );
    });
  });

  // =========================================================================
  // listOffers
  // =========================================================================

  describe("listOffers", () => {
    it("should list all offers with default ordering", async () => {
      const rows = [makeOfferRow(), makeOfferRow({ id: "offer-2" })];
      // The chain ends with an awaited query after .order()
      // listOffers ends with `const { data, error } = await query;`
      // So we need the last chained method to resolve
      mockBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await offerService.listOffers();

      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(mockBuilder.order).toHaveBeenCalledWith("rank", {
        ascending: true,
      });
      expect(result).toHaveLength(2);
    });

    it("should apply category filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ category: "mortgage" });

      expect(mockBuilder.eq).toHaveBeenCalledWith("category", "mortgage");
    });

    it("should apply status filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ status: "active" });

      expect(mockBuilder.eq).toHaveBeenCalledWith("status", "active");
    });

    it("should apply partnerId filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ partnerId: "p-1" });

      expect(mockBuilder.eq).toHaveBeenCalledWith("partner_id", "p-1");
    });

    it("should apply featured filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ featured: true });

      expect(mockBuilder.eq).toHaveBeenCalledWith("featured", true);
    });

    it("should apply region filter", async () => {
      mockBuilder.order.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ region: "CA" });

      expect(mockBuilder.contains).toHaveBeenCalledWith("regions", ["CA"]);
    });

    it("should apply limit", async () => {
      mockBuilder.limit.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ limit: 5 });

      expect(mockBuilder.limit).toHaveBeenCalledWith(5);
    });

    it("should apply offset with range", async () => {
      mockBuilder.range.mockResolvedValue({ data: [], error: null });

      await offerService.listOffers({ offset: 10, limit: 5 });

      expect(mockBuilder.range).toHaveBeenCalledWith(10, 14);
    });

    it("should throw on error", async () => {
      mockBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "list error" },
      });

      await expect(offerService.listOffers()).rejects.toThrow(
        "Failed to list offers: list error",
      );
    });

    it("should return empty array when data is null", async () => {
      mockBuilder.order.mockResolvedValue({ data: null, error: null });

      const result = await offerService.listOffers();
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // archiveOffer
  // =========================================================================

  describe("archiveOffer", () => {
    it("should update offer status to archived", async () => {
      mockBuilder.single.mockResolvedValue({
        data: makeOfferRow({ status: "archived" }),
        error: null,
      });

      await offerService.archiveOffer("offer-1");

      const updateArg = mockBuilder.update.mock.calls[0][0];
      expect(updateArg.status).toBe("archived");
    });
  });

  // =========================================================================
  // checkEligibility (pure method)
  // =========================================================================

  describe("checkEligibility", () => {
    it("should return eligible when all requirements met", () => {
      const offer = makeOffer({ minCreditScore: 670, minIncome: 30000 });
      const profile = makeProfile({ creditScore: 750, income: 60000 });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("eligible");
      expect(reasons).toContain("You meet all eligibility requirements");
    });

    it("should return ineligible when credit score is below minimum", () => {
      const offer = makeOffer({ minCreditScore: 700 });
      const profile = makeProfile({ creditScore: 650 });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("ineligible");
      expect(reasons.some((r) => r.includes("Minimum credit score"))).toBe(true);
    });

    it("should return ineligible when credit score exceeds maximum", () => {
      const offer = makeOffer({ maxCreditScore: 700 });
      const profile = makeProfile({ creditScore: 750 });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("ineligible");
      expect(reasons.some((r) => r.includes("Maximum credit score"))).toBe(true);
    });

    it("should return ineligible when income is below minimum", () => {
      const offer = makeOffer({ minIncome: 50000 });
      const profile = makeProfile({ income: 30000 });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("ineligible");
      expect(reasons.some((r) => r.includes("Minimum income"))).toBe(true);
    });

    it("should return ineligible when age is below minimum", () => {
      const offer = makeOffer({ ageRequirement: { min: 21 } });
      const profile = makeProfile({ age: 18 });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("ineligible");
      expect(reasons.some((r) => r.includes("Minimum age"))).toBe(true);
    });

    it("should return ineligible when age exceeds maximum", () => {
      const offer = makeOffer({ ageRequirement: { min: 18, max: 65 } });
      const profile = makeProfile({ age: 70 });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("ineligible");
      expect(reasons.some((r) => r.includes("Maximum age"))).toBe(true);
    });

    it("should return ineligible when residency requirement not met", () => {
      const offer = makeOffer({ residencyRequirements: ["US", "CA"] });
      const profile = makeProfile({ residency: "UK" });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("ineligible");
      expect(reasons.some((r) => r.includes("Not available"))).toBe(true);
    });

    it("should return needs_review when credit score is missing but required", () => {
      const offer = makeOffer({ minCreditScore: 670 });
      const profile = makeProfile({ creditScore: undefined });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("needs_review");
      expect(reasons.some((r) => r.includes("Credit score needed"))).toBe(true);
    });

    it("should return needs_review when income is missing but required", () => {
      const offer = makeOffer({ minIncome: 30000, minCreditScore: undefined });
      const profile = makeProfile({ income: undefined, creditScore: undefined });

      const { result, reasons } = offerService.checkEligibility(offer, profile);

      expect(result).toBe("needs_review");
      expect(reasons.some((r) => r.includes("Income verification"))).toBe(true);
    });

    it("should be eligible with no restrictions and no profile data", () => {
      const offer = makeOffer({
        minCreditScore: undefined,
        maxCreditScore: undefined,
        minIncome: undefined,
        ageRequirement: undefined,
        residencyRequirements: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        age: undefined,
        residency: undefined,
      });

      const { result } = offerService.checkEligibility(offer, profile);
      expect(result).toBe("eligible");
    });
  });

  // =========================================================================
  // calculateMatchScore (pure method)
  // =========================================================================

  describe("calculateMatchScore", () => {
    it("should start at base score of 50", () => {
      const offer = makeOffer({
        minCreditScore: undefined,
        minIncome: undefined,
        featured: false,
        rewards: undefined,
        fees: undefined,
        apr: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: undefined,
      });

      const score = offerService.calculateMatchScore(offer, profile);
      expect(score).toBe(50);
    });

    it("should add 15 points for 50+ credit score buffer", () => {
      const offer = makeOffer({ minCreditScore: 650, featured: false });
      const profile = makeProfile({
        creditScore: 720,
        income: undefined,
        preferences: undefined,
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 15 (70 buffer) = 65
      expect(score).toBe(65);
    });

    it("should subtract 20 points when below minimum credit score", () => {
      const offer = makeOffer({ minCreditScore: 750, minIncome: undefined, featured: false });
      const profile = makeProfile({
        creditScore: 700,
        income: undefined,
        preferences: undefined,
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 - 20 = 30
      expect(score).toBe(30);
    });

    it("should add 10 points for income 2x minimum", () => {
      const offer = makeOffer({
        minIncome: 30000,
        minCreditScore: undefined,
        featured: false,
      });
      const profile = makeProfile({
        income: 60000,
        creditScore: undefined,
        preferences: undefined,
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 10 = 60
      expect(score).toBe(60);
    });

    it("should add points for matching rewards preference", () => {
      const offer = makeOffer({
        rewards: { type: "cashback", earnRate: 2.0 },
        minCreditScore: undefined,
        minIncome: undefined,
        featured: false,
        fees: undefined,
        apr: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: { rewardsType: "cashback" },
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 10 (rewards match) = 60
      expect(score).toBe(60);
    });

    it("should add 8 points for no annual fee when preferred", () => {
      const offer = makeOffer({
        fees: { noFees: true, annual: 0 },
        minCreditScore: undefined,
        minIncome: undefined,
        featured: false,
        rewards: undefined,
        apr: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: { noAnnualFee: true },
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 8 = 58
      expect(score).toBe(58);
    });

    it("should subtract 10 points for high annual fee when no-fee preferred", () => {
      const offer = makeOffer({
        fees: { annual: 150 },
        minCreditScore: undefined,
        minIncome: undefined,
        featured: false,
        rewards: undefined,
        apr: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: { noAnnualFee: true },
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 - 10 = 40
      expect(score).toBe(40);
    });

    it("should add 5 points for featured offers", () => {
      const offer = makeOffer({
        featured: true,
        minCreditScore: undefined,
        minIncome: undefined,
        rewards: undefined,
        fees: undefined,
        apr: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: undefined,
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 5 = 55
      expect(score).toBe(55);
    });

    it("should clamp score to 0-100 range", () => {
      // Force a very low score
      const offer = makeOffer({
        minCreditScore: 800,
        minIncome: 200000,
        featured: false,
        fees: { annual: 500 },
      });
      const profile = makeProfile({
        creditScore: 500,
        income: 20000,
        preferences: { noAnnualFee: true },
      });

      const score = offerService.calculateMatchScore(offer, profile);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should add points for low APR preference", () => {
      const offer = makeOffer({
        apr: { type: "fixed", min: 12.99 },
        minCreditScore: undefined,
        minIncome: undefined,
        featured: false,
        rewards: undefined,
        fees: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: { lowApr: true },
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 8 (APR < 15) = 58
      expect(score).toBe(58);
    });

    it("should add points for signup bonus preference", () => {
      const offer = makeOffer({
        rewards: { type: "cashback", earnRate: 1.0, signupBonus: 500 },
        minCreditScore: undefined,
        minIncome: undefined,
        featured: false,
        fees: undefined,
        apr: undefined,
      });
      const profile = makeProfile({
        creditScore: undefined,
        income: undefined,
        preferences: { signupBonus: true },
      });

      const score = offerService.calculateMatchScore(offer, profile);
      // 50 + 10 (signup >= 500) = 60
      expect(score).toBe(60);
    });
  });

  // =========================================================================
  // generateHighlights (pure method)
  // =========================================================================

  describe("generateHighlights", () => {
    it("should highlight intro APR", () => {
      const offer = makeOffer({
        apr: { type: "variable", min: 14.99, introRate: 0, introPeriodMonths: 15 },
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);

      expect(highlights.some((h) => h.includes("0% intro APR for 15 months"))).toBe(
        true,
      );
    });

    it("should highlight low APR", () => {
      const offer = makeOffer({
        apr: { type: "fixed", min: 12.99 },
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights.some((h) => h.includes("Low 12.99% APR"))).toBe(true);
    });

    it("should highlight signup bonus", () => {
      const offer = makeOffer({
        rewards: {
          type: "cashback",
          earnRate: 2.0,
          signupBonus: 300,
          signupBonusSpend: 3000,
        },
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights.some((h) => h.includes("300 bonus"))).toBe(true);
    });

    it("should highlight high earn rate", () => {
      const offer = makeOffer({
        rewards: { type: "cashback", earnRate: 3.0 },
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights.some((h) => h.includes("3% cashback"))).toBe(true);
    });

    it("should highlight no annual fee", () => {
      const offer = makeOffer({
        fees: { annual: 0, noFees: true },
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights).toContain("No annual fee");
    });

    it("should highlight no foreign transaction fees", () => {
      const offer = makeOffer({
        fees: { foreignTransaction: 0 },
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights).toContain("No foreign transaction fees");
    });

    it("should highlight loan amount", () => {
      const offer = makeOffer({
        loanAmount: { min: 5000, max: 50000, termMonths: [36, 60] },
        // Remove defaults that produce highlights so loanAmount isn't sliced off
        apr: undefined,
        rewards: undefined,
        fees: undefined,
        creditLimit: undefined,
        badge: undefined,
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(
        highlights.some((h) => h.includes("Borrow up to")),
      ).toBe(true);
    });

    it("should highlight prequalification", () => {
      const offer = makeOffer({
        creditLimit: { prequalification: true },
        // Remove defaults that produce highlights so prequalification isn't sliced off
        apr: undefined,
        rewards: undefined,
        fees: undefined,
        badge: undefined,
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(
        highlights.some((h) => h.includes("without affecting credit score")),
      ).toBe(true);
    });

    it("should highlight badge", () => {
      const offer = makeOffer({
        badge: "Best Overall",
        // Remove defaults that produce highlights so badge isn't sliced off
        apr: undefined,
        rewards: undefined,
        fees: undefined,
        creditLimit: undefined,
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights).toContain("Best Overall");
    });

    it("should limit to 4 highlights", () => {
      const offer = makeOffer({
        apr: { type: "variable", min: 12.99, introRate: 0, introPeriodMonths: 15 },
        rewards: {
          type: "cashback",
          earnRate: 3.0,
          signupBonus: 500,
          signupBonusSpend: 3000,
        },
        fees: { annual: 0, noFees: true, foreignTransaction: 0 },
        creditLimit: { prequalification: true },
        loanAmount: { min: 1000, max: 50000, termMonths: [36] },
        badge: "Top Pick",
      });
      const profile = makeProfile();

      const highlights = offerService.generateHighlights(offer, profile);
      expect(highlights.length).toBeLessThanOrEqual(4);
    });
  });

  // =========================================================================
  // matchOffers
  // =========================================================================

  describe("matchOffers", () => {
    it("should query active offers for category and return scored results", async () => {
      const offerRow = makeOfferRow();
      // matchOffers chain: from().select().eq(category).eq(status).eq(sponsored)...order() -> resolves
      mockBuilder.order.mockResolvedValueOnce({
        data: [offerRow],
        error: null,
      });
      // getOfferDisclosures resolves via mockBuilder.data (chain ends with .eq())
      mockBuilder.data = [];

      const result = await offerService.matchOffers({
        category: "credit_card",
        profile: makeProfile(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].offer.id).toBe("offer-1");
      expect(result[0].matchScore).toBeGreaterThan(0);
      expect(result[0].eligibility).toBeDefined();
      expect(result[0].highlights).toBeDefined();
    });

    it("should apply limit to results", async () => {
      const rows = [
        makeOfferRow({ id: "o-1", rank: 1 }),
        makeOfferRow({ id: "o-2", rank: 2 }),
        makeOfferRow({ id: "o-3", rank: 3 }),
      ];
      mockBuilder.order.mockResolvedValueOnce({ data: rows, error: null });
      // getOfferDisclosures resolves via mockBuilder.data (chain ends with .eq())
      mockBuilder.data = [];

      const result = await offerService.matchOffers({
        category: "credit_card",
        profile: makeProfile(),
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });

    it("should apply region filter", async () => {
      mockBuilder.order.mockResolvedValueOnce({ data: [], error: null });

      await offerService.matchOffers({
        category: "credit_card",
        profile: makeProfile(),
        region: "CA",
      });

      expect(mockBuilder.contains).toHaveBeenCalledWith("regions", ["CA"]);
    });

    it("should exclude sponsors when includeSponsored is falsy", async () => {
      mockBuilder.order.mockResolvedValueOnce({ data: [], error: null });

      await offerService.matchOffers({
        category: "credit_card",
        profile: makeProfile(),
      });

      expect(mockBuilder.eq).toHaveBeenCalledWith("sponsored_content", false);
    });

    it("should throw on error", async () => {
      mockBuilder.order.mockResolvedValueOnce({
        data: null,
        error: { message: "match error" },
      });

      await expect(
        offerService.matchOffers({
          category: "credit_card",
          profile: makeProfile(),
        }),
      ).rejects.toThrow("Failed to match offers: match error");
    });

    it("should sort results by matchScore descending", async () => {
      // Two offers with different credit score fit
      const rows = [
        makeOfferRow({ id: "low-match", min_credit_score: 750 }),
        makeOfferRow({ id: "high-match", min_credit_score: 600 }),
      ];
      mockBuilder.order.mockResolvedValueOnce({ data: rows, error: null });
      // getOfferDisclosures resolves via mockBuilder.data (chain ends with .eq())
      mockBuilder.data = [];

      const result = await offerService.matchOffers({
        category: "credit_card",
        profile: makeProfile({ creditScore: 720 }),
      });

      expect(result[0].matchScore).toBeGreaterThanOrEqual(
        result[1].matchScore,
      );
    });
  });

  // =========================================================================
  // compareOffers
  // =========================================================================

  describe("compareOffers", () => {
    it("should compare multiple offers and return winner", async () => {
      // getOffer is called for each id
      mockBuilder.single
        .mockResolvedValueOnce({
          data: makeOfferRow({
            id: "o-1",
            name: "Card A",
            apr: { type: "fixed", min: 14.99 },
            fees: { annual: 0 },
            rewards: { type: "cashback", earnRate: 2.0, signupBonus: 200 },
          }),
          error: null,
        })
        .mockResolvedValueOnce({
          data: makeOfferRow({
            id: "o-2",
            name: "Card B",
            apr: { type: "fixed", min: 19.99 },
            fees: { annual: 95 },
            rewards: { type: "cashback", earnRate: 3.0, signupBonus: 500 },
          }),
          error: null,
        });

      const result = await offerService.compareOffers(["o-1", "o-2"]);

      expect(result.offers).toHaveLength(2);
      expect(result.fields.length).toBeGreaterThan(0);
      expect(result.values).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(result.winner!.reason).toBeDefined();
    });

    it("should throw when no valid offers found", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(
        offerService.compareOffers(["missing-1", "missing-2"]),
      ).rejects.toThrow("No valid offers found for comparison");
    });

    it("should use category-specific comparison fields for personal_loan", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: makeOfferRow({
          id: "o-1",
          category: "personal_loan",
          loan_amount: { min: 1000, max: 50000, termMonths: [36] },
        }),
        error: null,
      });

      const result = await offerService.compareOffers(["o-1"]);

      const fieldKeys = result.fields.map((f) => f.key);
      expect(fieldKeys).toContain("maxAmount");
    });
  });

  // =========================================================================
  // trackImpression
  // =========================================================================

  describe("trackImpression", () => {
    it("should insert impression and return mapped data", async () => {
      mockBuilder.single.mockResolvedValue({
        data: {
          id: "imp-1",
          offer_id: "offer-1",
          user_id: "user-1",
          session_id: "sess-1",
          page: "home",
          position: 1,
          impressed_at: now.toISOString(),
        },
        error: null,
      });

      const result = await offerService.trackImpression(
        "offer-1",
        "home",
        1,
        "user-1",
        "sess-1",
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("offer_impressions");
      expect(result.id).toBe("imp-1");
      expect(result.offerId).toBe("offer-1");
      expect(result.page).toBe("home");
      expect(result.position).toBe(1);
    });

    it("should throw on error", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "impression error" },
      });

      await expect(
        offerService.trackImpression("offer-1", "home", 1),
      ).rejects.toThrow("Failed to track impression: impression error");
    });
  });

  // =========================================================================
  // trackClick
  // =========================================================================

  describe("trackClick", () => {
    it("should track click through affiliate system and record in DB", async () => {
      // getOffer call
      mockBuilder.single.mockResolvedValueOnce({
        data: makeOfferRow(),
        error: null,
      });

      (trackingService.trackClick as jest.Mock).mockResolvedValue({
        clickId: "clk-123",
      });

      // Insert into offer_clicks (no .single())
      mockBuilder.insert.mockResolvedValueOnce({ data: null, error: null });

      const result = await offerService.trackClick(
        "offer-1",
        "home",
        "user-1",
        "sess-1",
        "Mozilla/5.0",
        "127.0.0.1",
      );

      expect(trackingService.trackClick).toHaveBeenCalledWith(
        expect.objectContaining({
          offerId: "offer-1",
          sourcePage: "home",
          userId: "user-1",
        }),
      );
      expect(result.clickId).toBe("clk-123");
      expect(result.destinationUrl).toContain("fynvita_click=clk-123");
    });

    it("should throw when offer not found", async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      await expect(
        offerService.trackClick("missing", "home"),
      ).rejects.toThrow("Offer not found: missing");
    });
  });

  // =========================================================================
  // getOfferDisclosures
  // =========================================================================

  describe("getOfferDisclosures", () => {
    it("should return mapped disclosure list", async () => {
      mockBuilder.eq.mockResolvedValue({
        data: [
          {
            offer_id: "offer-1",
            disclosure_id: "disc-1",
            must_display: true,
            display_location: "bottom",
            disclosures: {
              type: "advertiser_disclosure",
              short_text: "Short",
              full_text: "Full",
            },
          },
        ],
        error: null,
      });

      const result = await offerService.getOfferDisclosures("offer-1");

      expect(result).toHaveLength(1);
      expect(result[0].offerId).toBe("offer-1");
      expect(result[0].disclosureType).toBe("advertiser_disclosure");
      expect(result[0].mustDisplay).toBe(true);
    });

    it("should return empty array when no disclosures", async () => {
      mockBuilder.eq.mockResolvedValue({ data: [], error: null });

      const result = await offerService.getOfferDisclosures("offer-1");
      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      mockBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: "disclosure error" },
      });

      await expect(
        offerService.getOfferDisclosures("offer-1"),
      ).rejects.toThrow("Failed to get disclosures: disclosure error");
    });
  });

  // =========================================================================
  // getAdvertiserDisclosure
  // =========================================================================

  describe("getAdvertiserDisclosure", () => {
    it("should return full text from DB", async () => {
      mockBuilder.single.mockResolvedValue({
        data: { full_text: "Custom advertiser disclosure text." },
        error: null,
      });

      const result = await offerService.getAdvertiserDisclosure();
      expect(result).toBe("Custom advertiser disclosure text.");
    });

    it("should return default text when no data", async () => {
      mockBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await offerService.getAdvertiserDisclosure();
      expect(result).toContain("We may receive compensation");
    });
  });
});
