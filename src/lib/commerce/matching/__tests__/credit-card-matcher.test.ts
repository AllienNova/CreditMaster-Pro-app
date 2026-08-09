/**
 * Credit Card Matcher Tests
 *
 * Tests for card recommendations, comparisons, value calculation, and spending analysis.
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

const mockOfferService = {
  matchOffers: jest.fn<any, any[]>(),
  getOffer: jest.fn<any, any[]>(),
  calculateMatchScore: jest.fn<any, any[]>(),
  checkEligibility: jest.fn<any, any[]>(),
  listOffers: jest.fn<any, any[]>(),
};

jest.mock("../../offers", () => ({
  offerService: mockOfferService,
}));

// Must configure mockCreateClient BEFORE import so module-level
// `const supabase = createClient(...)` captures mockSupabase.
mockCreateClient.mockReturnValue(mockSupabase as any);

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { creditCardMatcher } from "../credit-card-matcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOffer(overrides: Record<string, any> = {}) {
  return {
    id: "offer-1",
    partnerId: "partner-1",
    partnerName: "Test Bank",
    category: "credit_card",
    name: "Test Cashback Card",
    headline: "Get 2% cashback",
    description: "A great card",
    destinationUrl: "https://bank.com/apply",
    apr: { type: "variable", min: 18.99, max: 24.99 },
    fees: { annual: 0, foreignTransaction: 0 },
    rewards: {
      type: "cashback",
      earnRate: 1.5,
      signupBonus: 200,
      signupBonusSpend: 500,
      signupBonusPeriodMonths: 3,
      categories: [
        { category: "grocery", rate: 3 },
        { category: "dining", rate: 2 },
      ],
    },
    minCreditScore: 670,
    minIncome: 30000,
    commissionType: "cpa",
    commissionValue: 50,
    rank: 1,
    featured: true,
    tags: [],
    disclosureId: "disc-1",
    sponsoredContent: false,
    status: "active",
    regions: ["US"],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMatchResult(offerOverrides: Record<string, any> = {}) {
  return {
    offer: makeOffer(offerOverrides),
    matchScore: 75,
    eligibility: "eligible" as const,
    eligibilityReasons: ["You meet all eligibility requirements"],
    highlights: ["2% cashback on groceries"],
    disclosures: [],
  };
}

const defaultInput = {
  userId: "user-1",
  creditScore: 720,
  income: 75000,
  spending: {
    monthlySpend: {
      total: 3000,
      categories: {
        groceries: 500,
        dining: 300,
        travel: 200,
        gas: 150,
      },
    },
    travelFrequency: "occasional" as const,
    internationalSpend: false,
    balanceCarrying: false,
  },
  preferences: {
    primaryGoal: "cashback" as const,
    wantSignupBonus: true,
    noAnnualFee: true,
  },
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

describe("CreditCardMatcher", () => {
  // -------------------------------------------------------------------------
  // getRecommendations
  // -------------------------------------------------------------------------

  describe("getRecommendations", () => {
    it("should return card recommendations sorted by annual value for cashback goal", async () => {
      const matchResults = [
        makeMatchResult({ name: "Card A", rewards: { type: "cashback", earnRate: 2, categories: [], signupBonus: 100 } }),
        makeMatchResult({ name: "Card B", rewards: { type: "cashback", earnRate: 3, categories: [], signupBonus: 200 } }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result).toHaveLength(2);
      // Should be sorted by annualValue descending
      expect(result[0].annualValue).toBeGreaterThanOrEqual(result[1].annualValue);
    });

    it("should build correct user profile from input", async () => {
      mockOfferService.matchOffers.mockResolvedValueOnce([]);

      await creditCardMatcher.getRecommendations(defaultInput);

      expect(mockOfferService.matchOffers).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          category: "credit_card",
          profile: expect.objectContaining({
            creditScore: 720,
            income: 75000,
            preferences: expect.objectContaining({
              rewardsType: "cashback",
              noAnnualFee: true,
              signupBonus: true,
            }),
          }),
          limit: 50,
          includeSponsored: true,
        }),
      );
    });

    it("should map travel goal to miles rewards preference", async () => {
      const travelInput = {
        ...defaultInput,
        preferences: { ...defaultInput.preferences, primaryGoal: "travel" as const },
      };

      mockOfferService.matchOffers.mockResolvedValueOnce([]);

      await creditCardMatcher.getRecommendations(travelInput);

      expect(mockOfferService.matchOffers).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            preferences: expect.objectContaining({
              rewardsType: "miles",
            }),
          }),
        }),
      );
    });

    it("should set lowApr preference for balance_transfer goal", async () => {
      const btInput = {
        ...defaultInput,
        preferences: { ...defaultInput.preferences, primaryGoal: "balance_transfer" as const },
      };

      mockOfferService.matchOffers.mockResolvedValueOnce([]);

      await creditCardMatcher.getRecommendations(btInput);

      expect(mockOfferService.matchOffers).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            preferences: expect.objectContaining({
              lowApr: true,
            }),
          }),
        }),
      );
    });

    it("should sort by matchScore for build_credit goal", async () => {
      const buildCreditInput = {
        ...defaultInput,
        preferences: { ...defaultInput.preferences, primaryGoal: "build_credit" as const },
      };

      const matchResults = [
        makeMatchResult({ name: "Card Low Score" }),
        { ...makeMatchResult({ name: "Card High Score" }), matchScore: 95 },
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(buildCreditInput);

      expect(result[0].matchScore).toBeGreaterThanOrEqual(result[1].matchScore);
    });

    it("should sort by lowest APR for balance_transfer goal", async () => {
      const btInput = {
        ...defaultInput,
        preferences: { ...defaultInput.preferences, primaryGoal: "balance_transfer" as const },
      };

      const matchResults = [
        makeMatchResult({ name: "High APR", apr: { type: "variable", min: 22 } }),
        makeMatchResult({ name: "Low APR", apr: { type: "variable", min: 12 } }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(btInput);

      // Lower APR should come first
      expect(result[0]!.offer.apr!.min).toBeLessThanOrEqual(result[1]!.offer.apr!.min);
    });

    it("should respect limit parameter", async () => {
      const manyMatches = Array.from({ length: 20 }, (_, i) =>
        makeMatchResult({ name: `Card ${i}`, id: `offer-${i}` }),
      );

      mockOfferService.matchOffers.mockResolvedValueOnce(manyMatches);

      const result = await creditCardMatcher.getRecommendations({
        ...defaultInput,
        limit: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should add comparison data to results", async () => {
      const matchResults = [
        makeMatchResult({ name: "Card A", rewards: { type: "cashback", earnRate: 3, categories: [], signupBonus: 0 } }),
        makeMatchResult({ name: "Card B", rewards: { type: "cashback", earnRate: 1, categories: [], signupBonus: 0 } }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      // Card with higher value should have the other in betterThan
      const betterCard = result[0];
      const worseCard = result[1];
      expect(betterCard.comparisons.betterThan).toContain(worseCard.offer.name);
      expect(worseCard.comparisons.worseThan).toContain(betterCard.offer.name);
    });

    it("should return empty array when no matches found", async () => {
      mockOfferService.matchOffers.mockResolvedValueOnce([]);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result).toEqual([]);
    });

    it("should exclude specified cards", async () => {
      mockOfferService.matchOffers.mockResolvedValueOnce([]);

      await creditCardMatcher.getRecommendations({
        ...defaultInput,
        excludeCards: ["partner-x"],
      });

      expect(mockOfferService.matchOffers).toHaveBeenCalledWith(
        expect.objectContaining({
          excludePartners: ["partner-x"],
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getTopCardForCategory
  // -------------------------------------------------------------------------

  describe("getTopCardForCategory", () => {
    it("should return the card with the highest reward rate for a category", async () => {
      const matchResults = [
        makeMatchResult({
          name: "Low Grocery Card",
          rewards: { type: "cashback", earnRate: 1, categories: [{ category: "grocery", rate: 2 }], signupBonus: 0 },
        }),
        makeMatchResult({
          name: "High Grocery Card",
          rewards: { type: "cashback", earnRate: 1, categories: [{ category: "grocery", rate: 5 }], signupBonus: 0 },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getTopCardForCategory(
        "groceries",
        defaultInput,
      );

      expect(result).not.toBeNull();
      expect(result!.offer.name).toBe("High Grocery Card");
    });

    it("should return null when no recommendations found", async () => {
      mockOfferService.matchOffers.mockResolvedValueOnce([]);

      const result = await creditCardMatcher.getTopCardForCategory(
        "groceries",
        defaultInput,
      );

      expect(result).toBeNull();
    });

    it("should fall back to base earn rate when no category bonus", async () => {
      const matchResults = [
        makeMatchResult({
          name: "Base Rate Card",
          rewards: { type: "cashback", earnRate: 2, categories: [], signupBonus: 0 },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getTopCardForCategory(
        "utilities",
        defaultInput,
      );

      expect(result).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // compareCards
  // -------------------------------------------------------------------------

  describe("compareCards", () => {
    it("should compare two cards and determine a winner", async () => {
      const offer1 = makeOffer({
        id: "card-1",
        name: "Premium Card",
        fees: { annual: 95 },
        rewards: { type: "cashback", earnRate: 2, signupBonus: 500, categories: [] },
        apr: { type: "variable", min: 18 },
      });
      const offer2 = makeOffer({
        id: "card-2",
        name: "No Fee Card",
        fees: { annual: 0 },
        rewards: { type: "cashback", earnRate: 1.5, signupBonus: 200, categories: [] },
        apr: { type: "variable", min: 15 },
      });

      mockOfferService.getOffer
        .mockResolvedValueOnce(offer1)
        .mockResolvedValueOnce(offer2);

      mockOfferService.calculateMatchScore
        .mockReturnValueOnce(80)
        .mockReturnValueOnce(70);

      mockOfferService.checkEligibility
        .mockReturnValue({ result: "eligible", reasons: ["Eligible"] });

      const result = await creditCardMatcher.compareCards(
        "card-1",
        "card-2",
        defaultInput,
      );

      expect(result.card1).toBeDefined();
      expect(result.card2).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(result.comparison).toHaveLength(6);

      // Verify comparison metrics
      const metricNames = result.comparison.map((c) => c.metric);
      expect(metricNames).toContain("Annual Value");
      expect(metricNames).toContain("First Year Value");
      expect(metricNames).toContain("Annual Fee");
      expect(metricNames).toContain("Signup Bonus");
      expect(metricNames).toContain("Base Rewards Rate");
      expect(metricNames).toContain("Regular APR");
    });

    it("should throw when one card is not found", async () => {
      mockOfferService.getOffer
        .mockResolvedValueOnce(makeOffer())
        .mockResolvedValueOnce(null);

      await expect(
        creditCardMatcher.compareCards("card-1", "card-2", defaultInput),
      ).rejects.toThrow("One or both cards not found");
    });

    it("should throw when both cards are not found", async () => {
      mockOfferService.getOffer
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        creditCardMatcher.compareCards("bad-1", "bad-2", defaultInput),
      ).rejects.toThrow("One or both cards not found");
    });

    it("should determine winner based on majority of comparison metrics", async () => {
      const offer1 = makeOffer({
        id: "card-1",
        fees: { annual: 0 },
        rewards: { type: "cashback", earnRate: 3, signupBonus: 500, categories: [] },
        apr: { type: "variable", min: 14 },
      });
      const offer2 = makeOffer({
        id: "card-2",
        fees: { annual: 500 },
        rewards: { type: "cashback", earnRate: 1, signupBonus: 100, categories: [] },
        apr: { type: "variable", min: 25 },
      });

      mockOfferService.getOffer
        .mockResolvedValueOnce(offer1)
        .mockResolvedValueOnce(offer2);

      mockOfferService.calculateMatchScore
        .mockReturnValueOnce(85)
        .mockReturnValueOnce(40);

      mockOfferService.checkEligibility
        .mockReturnValue({ result: "eligible", reasons: ["OK"] });

      const result = await creditCardMatcher.compareCards(
        "card-1",
        "card-2",
        defaultInput,
      );

      // card-1 should be the winner in most categories
      expect(result.winner).toBe("card-1");
    });
  });

  // -------------------------------------------------------------------------
  // Card Value Calculation (tested indirectly via getRecommendations)
  // -------------------------------------------------------------------------

  describe("calculateCardValue (via getRecommendations)", () => {
    it("should calculate category-specific rewards", async () => {
      const matchResults = [
        makeMatchResult({
          rewards: {
            type: "cashback",
            earnRate: 1,
            signupBonus: 0,
            categories: [
              { category: "grocery", rate: 5 },
              { category: "restaurant", rate: 3 },
            ],
          },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result[0].spendingOptimization.length).toBeGreaterThan(0);
      // Grocery category should have 5% rate
      const groceryOpt = result[0].spendingOptimization.find(
        (s) => s.category === "groceries",
      );
      expect(groceryOpt).toBeDefined();
      expect(groceryOpt!.rewardRate).toBe(5);
    });

    it("should calculate signup bonus value for cashback cards", async () => {
      const matchResults = [
        makeMatchResult({
          rewards: { type: "cashback", earnRate: 1, signupBonus: 200, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result[0].valueBreakdown.signupBonus).toBe(200);
      expect(result[0].firstYearValue).toBe(
        result[0].annualValue + 200,
      );
    });

    it("should calculate signup bonus value for points cards (1 cent per point)", async () => {
      const matchResults = [
        makeMatchResult({
          rewards: { type: "points", earnRate: 1, signupBonus: 50000, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result[0].valueBreakdown.signupBonus).toBe(500); // 50000 * 0.01
    });

    it("should calculate signup bonus value for miles cards (1.2 cents per mile)", async () => {
      const matchResults = [
        makeMatchResult({
          rewards: { type: "miles", earnRate: 1, signupBonus: 50000, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result[0].valueBreakdown.signupBonus).toBe(600); // 50000 * 0.012
    });

    it("should subtract annual fee from annual value", async () => {
      const matchResults = [
        makeMatchResult({
          fees: { annual: 95 },
          rewards: { type: "cashback", earnRate: 1, signupBonus: 0, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      expect(result[0].valueBreakdown.annualFee).toBe(95);
    });

    it("should compute rewards for uncategorized spending", async () => {
      // Total spend 3000, categorized: 500+300+200+150 = 1150
      // Uncategorized: 3000 - 1150 = 1850
      const matchResults = [
        makeMatchResult({
          rewards: { type: "cashback", earnRate: 1.5, signupBonus: 0, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(defaultInput);

      const otherOpt = result[0].spendingOptimization.find(
        (s) => s.category === "other",
      );
      expect(otherOpt).toBeDefined();
      expect(otherOpt!.currentSpend).toBe(1850 * 12);
      expect(otherOpt!.rewardRate).toBe(1.5);
    });

    it("should add foreign transaction fee savings for international spenders", async () => {
      const internationalInput = {
        ...defaultInput,
        spending: {
          ...defaultInput.spending,
          internationalSpend: true,
        },
      };

      const matchResults = [
        makeMatchResult({
          fees: { annual: 0, foreignTransaction: 0 },
          rewards: { type: "cashback", earnRate: 1, signupBonus: 0, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(internationalInput);

      // perksValue should include foreign tx savings
      expect(result[0].valueBreakdown.perksValue).toBeGreaterThan(0);
    });

    it("should add travel perks for travel-focused users", async () => {
      const travelInput = {
        ...defaultInput,
        spending: {
          ...defaultInput.spending,
          travelFrequency: "frequent" as const,
        },
        preferences: {
          ...defaultInput.preferences,
          primaryGoal: "travel" as const,
        },
      };

      const matchResults = [
        makeMatchResult({
          tags: ["lounge_access", "tsa_precheck_credit", "hotel_status"],
          rewards: { type: "miles", earnRate: 1, signupBonus: 0, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(travelInput);

      // lounge (6 * 35=210) + TSA (17) + hotel (100) = 327
      expect(result[0].valueBreakdown.perksValue).toBeGreaterThanOrEqual(300);
    });

    it("should add premium perks when user wants them", async () => {
      const premiumInput = {
        ...defaultInput,
        preferences: {
          ...defaultInput.preferences,
          wantPremiumPerks: true,
        },
      };

      const matchResults = [
        makeMatchResult({
          tags: ["concierge", "travel_insurance", "purchase_protection"],
          rewards: { type: "cashback", earnRate: 1, signupBonus: 0, categories: [] },
        }),
      ];

      mockOfferService.matchOffers.mockResolvedValueOnce(matchResults);

      const result = await creditCardMatcher.getRecommendations(premiumInput);

      // concierge(50) + travel_insurance(75) + purchase_protection(50) = 175
      expect(result[0].valueBreakdown.perksValue).toBe(175);
    });
  });

  // -------------------------------------------------------------------------
  // analyzeSpending
  // -------------------------------------------------------------------------

  describe("analyzeSpending", () => {
    it("should build spending profile from user transactions", async () => {
      const transactions = [
        { amount: -150, category: "Grocery", merchant_name: "Walmart" },
        { amount: -50, category: "Restaurant", merchant_name: "Chipotle" },
        { amount: -200, category: "Airline", merchant_name: "Delta" },
        { amount: -40, category: "Gas Station", merchant_name: "Shell" },
        { amount: -15, category: "Streaming", merchant_name: "Netflix" },
        { amount: -80, category: "Retail Shopping", merchant_name: "Target" },
        { amount: -100, category: "Utility Bill", merchant_name: "Con Edison" },
        { amount: -25, category: "Other", merchant_name: "Random" },
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: transactions, error: null }),
      );

      const result = await creditCardMatcher.analyzeSpending("user-1");

      expect(result.monthlySpend.total).toBeGreaterThan(0);
      // Total is summed from 3-month data / 3
      const rawTotal = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
      expect(result.monthlySpend.total).toBeCloseTo(rawTotal / 3);

      expect(result.monthlySpend.categories.groceries).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.dining).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.travel).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.gas).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.entertainment).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.shopping).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.utilities).toBeGreaterThan(0);
      expect(result.monthlySpend.categories.other).toBeGreaterThan(0);
    });

    it("should return empty profile when no transactions", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      const result = await creditCardMatcher.analyzeSpending("user-1");

      expect(result.monthlySpend.total).toBe(0);
      expect(result.monthlySpend.categories).toEqual({});
    });

    it("should return empty profile when data is null", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null }),
      );

      const result = await creditCardMatcher.analyzeSpending("user-1");

      expect(result.monthlySpend.total).toBe(0);
    });

    it("should query transactions from the last 3 months", async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null }),
      );

      await creditCardMatcher.analyzeSpending("user-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("transactions");
      expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockBuilder.eq).toHaveBeenCalledWith("type", "expense");
      expect(mockBuilder.gte).toHaveBeenCalled();
    });

    it("should use absolute values for amounts", async () => {
      const transactions = [
        { amount: -500, category: "Grocery", merchant_name: "Store" },
        { amount: 500, category: "Grocery", merchant_name: "Store" }, // refund, still counted
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: transactions, error: null }),
      );

      const result = await creditCardMatcher.analyzeSpending("user-1");

      // Both should be counted as absolute: 500 + 500 = 1000
      expect(result.monthlySpend.total).toBeCloseTo(1000 / 3);
    });

    it("should categorize by merchant name when category is not specific", async () => {
      const transactions = [
        { amount: -100, category: "General", merchant_name: "Walmart Supercenter" },
        { amount: -50, category: "General", merchant_name: "Kroger" },
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: transactions, error: null }),
      );

      const result = await creditCardMatcher.analyzeSpending("user-1");

      // Walmart and Kroger should be categorized as groceries
      expect(result.monthlySpend.categories.groceries).toBeGreaterThan(0);
    });

    it("should categorize unknown transactions as other", async () => {
      const transactions = [
        { amount: -100, category: "Unknown", merchant_name: "Random Store" },
      ];

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: transactions, error: null }),
      );

      const result = await creditCardMatcher.analyzeSpending("user-1");

      expect(result.monthlySpend.categories.other).toBeGreaterThan(0);
    });
  });
});
