// Mock @supabase/supabase-js before any import
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
  SupabaseClient: class {},
}));

import { createClient } from "@supabase/supabase-js";
import {
  CreditBuilderLoanService,
  type UserLoanProfile,
} from "../CreditBuilderLoanService";

const mockCreateClient = createClient as jest.Mock;

// ============================================================================
// Mock client factory — rebuilt fresh each test
// ============================================================================

function makeChain(overrides: {
  singleResult?: { data: unknown; error: unknown };
  orderResult?: { data: unknown[]; error: unknown };
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
// Builders
// ============================================================================

function makeProfile(overrides: Partial<UserLoanProfile> = {}): UserLoanProfile {
  return {
    userId: "user-1",
    monthlyIncome: 5_000,
    availableMonthlyPayment: 100,
    creditScore: 620,
    hasBankAccount: true,
    bankAccountAgeMonths: 12,
    hasBankruptcy: false,
    primaryGoal: "build_credit",
    preferredTerm: 12,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("CreditBuilderLoanService", () => {
  let svc: CreditBuilderLoanService;
  let chain: ReturnType<typeof makeChain>;

  beforeEach(() => {
    chain = makeChain();
    mockCreateClient.mockReturnValue(chain);
    svc = new CreditBuilderLoanService("http://localhost", "anon-key");
  });

  // --------------------------------------------------------------------------
  // getAllLoans
  // --------------------------------------------------------------------------

  describe("getAllLoans", () => {
    it("returns a non-empty array of loans", () => {
      expect(svc.getAllLoans().length).toBeGreaterThan(0);
    });

    it("returns loans with required fields", () => {
      const loans = svc.getAllLoans();
      expect(loans[0]).toHaveProperty("id");
      expect(loans[0]).toHaveProperty("provider");
      expect(loans[0]).toHaveProperty("reportsToBureaus");
    });
  });

  // --------------------------------------------------------------------------
  // getLoanById
  // --------------------------------------------------------------------------

  describe("getLoanById", () => {
    it("returns the loan when id matches", () => {
      const loan = svc.getLoanById("self-credit-builder");
      expect(loan).toBeDefined();
      expect(loan!.provider).toBe("self");
    });

    it("returns undefined for unknown id", () => {
      expect(svc.getLoanById("does-not-exist")).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getLoansByProvider
  // --------------------------------------------------------------------------

  describe("getLoansByProvider", () => {
    it("returns matching loans for known provider", () => {
      const loans = svc.getLoansByProvider("self");
      expect(loans.length).toBeGreaterThan(0);
      loans.forEach((l) => expect(l.provider).toBe("self"));
    });

    it("returns empty array for provider with no loans", () => {
      expect(svc.getLoansByProvider("dave")).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // getRecommendations — matchScore / filtering
  // --------------------------------------------------------------------------

  describe("getRecommendations", () => {
    it("returns array sorted descending by matchScore", async () => {
      const recs = await svc.getRecommendations(makeProfile());
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].matchScore).toBeGreaterThanOrEqual(recs[i].matchScore);
      }
    });

    it("filters out moneylion for bankrupt profile (noBankruptcy + hasBankruptcy → <30)", async () => {
      const recs = await svc.getRecommendations(
        makeProfile({ hasBankruptcy: true }),
      );
      const ml = recs.find((r) => r.loan.id === "moneylion-credit-builder");
      expect(ml).toBeUndefined();
    });

    it("gives +20 bonus when monthly payment is affordable", async () => {
      const recs = await svc.getRecommendations(makeProfile({ availableMonthlyPayment: 100 }));
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      expect(self!.matchScore).toBeGreaterThan(50);
    });

    it("self-credit-builder reaches 100 score for strong profile", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: 600 }));
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      // 50 base + 20 afford + 15 all-bureaus + 10 noHardPull + 10 noFee = 105 → capped 100
      expect(self!.matchScore).toBe(100);
    });

    it("noHardPull bonus does not apply when creditScore >= 650", async () => {
      const highRecs = await svc.getRecommendations(makeProfile({ creditScore: 700 }));
      const lowRecs = await svc.getRecommendations(makeProfile({ creditScore: 600 }));
      const selfHigh = highRecs.find((r) => r.loan.id === "self-credit-builder");
      const selfLow = lowRecs.find((r) => r.loan.id === "self-credit-builder");
      expect(selfHigh!.matchScore).toBeLessThan(selfLow!.matchScore);
    });

    it("build_savings goal raises score vs build_credit for savings-component loan (credit-strong)", async () => {
      // credit-strong: savingsComponent=true. With build_savings → +15 bonus
      // Use creditScore=700 so noHardPull bonus doesn't apply to self, making credit-strong comparable
      const savingsRecs = await svc.getRecommendations(
        makeProfile({ primaryGoal: "build_savings", creditScore: 700 }),
      );
      const creditRecs = await svc.getRecommendations(
        makeProfile({ primaryGoal: "build_credit", creditScore: 700 }),
      );
      const csSavings = savingsRecs.find((r) => r.loan.id === "credit-strong-builder");
      const csCredit = creditRecs.find((r) => r.loan.id === "credit-strong-builder");
      expect(csSavings!.matchScore).toBeGreaterThan(csCredit!.matchScore);
    });

    it("deducts monthly fee from score for loan with fees", async () => {
      const recs = await svc.getRecommendations(makeProfile({ availableMonthlyPayment: 200 }));
      const ml = recs.find((r) => r.loan.id === "moneylion-credit-builder");
      if (ml) {
        // monthlyFee=19.99 → -9.995 deduction, should be < 100
        expect(ml.matchScore).toBeLessThan(100);
      }
    });

    it("caps matchScore at 100", async () => {
      const recs = await svc.getRecommendations(makeProfile());
      recs.forEach((r) => expect(r.matchScore).toBeLessThanOrEqual(100));
    });

    it("matchScore is never negative", async () => {
      const recs = await svc.getRecommendations(
        makeProfile({ hasBankruptcy: true, availableMonthlyPayment: 0 }),
      );
      recs.forEach((r) => expect(r.matchScore).toBeGreaterThanOrEqual(0));
    });

    it("includes savingsAtEnd for loans with payoutAtEnd=true", async () => {
      const recs = await svc.getRecommendations(makeProfile());
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      expect(self!.savingsAtEnd).toBeDefined();
      expect(self!.savingsAtEnd).toBeGreaterThan(0);
    });

    it("savingsAtEnd is undefined for loans with payoutAtEnd=false", async () => {
      const recs = await svc.getRecommendations(makeProfile({ availableMonthlyPayment: 1000 }));
      const chime = recs.find((r) => r.loan.id === "chime-credit-builder");
      if (chime) {
        expect(chime.savingsAtEnd).toBeUndefined();
      }
    });
  });

  // --------------------------------------------------------------------------
  // approvalLikelihood (via getRecommendations)
  // --------------------------------------------------------------------------

  describe("approvalLikelihood", () => {
    it("returns high for noHardPull loans regardless of credit score", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: undefined }));
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      expect(self!.approvalLikelihood).toBe("high");
    });

    it("returns high when creditScore >= 580 for non-noHardPull loan", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: 620 }));
      const cu = recs.find((r) => r.loan.id === "local-cu-share-secured");
      if (cu) {
        expect(cu.approvalLikelihood).toBe("high");
      }
    });

    it("returns medium when hasBankAccount+bankAccountAge>=3 and no creditScore", async () => {
      const recs = await svc.getRecommendations(
        makeProfile({ creditScore: undefined, hasBankAccount: true, bankAccountAgeMonths: 6 }),
      );
      const cu = recs.find((r) => r.loan.id === "local-cu-share-secured");
      if (cu) {
        expect(cu.approvalLikelihood).toBe("medium");
      }
    });

    it("returns low when no creditScore and bank account age < 3 months", async () => {
      const recs = await svc.getRecommendations(
        makeProfile({ creditScore: undefined, hasBankAccount: true, bankAccountAgeMonths: 1 }),
      );
      const cu = recs.find((r) => r.loan.id === "local-cu-share-secured");
      if (cu) {
        expect(cu.approvalLikelihood).toBe("low");
      }
    });
  });

  // --------------------------------------------------------------------------
  // projectedScoreImpact (via getRecommendations)
  // --------------------------------------------------------------------------

  describe("projectedScoreImpact", () => {
    it("base impact is at least 20", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: 700 }));
      recs.forEach((r) => expect(r.projectedScoreImpact).toBeGreaterThanOrEqual(20));
    });

    it("adds 5 per bureau: 3 bureaus → impact = 35 for high credit score", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: 700 }));
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      // 20 + 3*5 = 35
      expect(self!.projectedScoreImpact).toBe(35);
    });

    it("adds 15 bonus for credit score < 600", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: 550 }));
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      // 20 + 15 + 15 = 50
      expect(self!.projectedScoreImpact).toBe(50);
    });

    it("adds 15 bonus when creditScore is undefined", async () => {
      const recs = await svc.getRecommendations(makeProfile({ creditScore: undefined }));
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      expect(self!.projectedScoreImpact).toBe(50);
    });
  });

  // --------------------------------------------------------------------------
  // totalCost (via getRecommendations)
  // --------------------------------------------------------------------------

  describe("totalCost", () => {
    it("is 0 for revolving loans (term=0)", async () => {
      const recs = await svc.getRecommendations(makeProfile({ availableMonthlyPayment: 1000 }));
      const chime = recs.find((r) => r.loan.id === "chime-credit-builder");
      if (chime) {
        expect(chime.totalCost).toBe(0);
      }
    });

    it("is non-negative for self-credit-builder (payoutAtEnd offsets principal)", async () => {
      const recs = await svc.getRecommendations(makeProfile());
      const self = recs.find((r) => r.loan.id === "self-credit-builder");
      expect(self!.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // trackApplication (DB path)
  // --------------------------------------------------------------------------

  describe("trackApplication", () => {
    it("throws when supabase insert returns an error", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
      await expect(
        svc.trackApplication({
          userId: "u1",
          loanId: "self-credit-builder",
          provider: "self",
          status: "started",
          appliedDate: new Date(),
          paymentsMade: 0,
          paymentsRemaining: 12,
          onTimePayments: 0,
        }),
      ).rejects.toMatchObject({ message: "db error" });
    });
  });

  // --------------------------------------------------------------------------
  // updateApplication (DB path)
  // --------------------------------------------------------------------------

  describe("updateApplication", () => {
    it("throws when supabase update returns an error", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: "update error" } });
      await expect(
        svc.updateApplication("app-id", "user-1", { status: "approved" }),
      ).rejects.toMatchObject({ message: "update error" });
    });
  });

  // --------------------------------------------------------------------------
  // getUserApplications (DB path)
  // --------------------------------------------------------------------------

  describe("getUserApplications", () => {
    it("throws when supabase returns an error", async () => {
      chain.order.mockResolvedValueOnce({ data: null, error: { message: "list error" } });
      await expect(svc.getUserApplications("user-1")).rejects.toMatchObject({
        message: "list error",
      });
    });

    it("returns empty array when data is empty", async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null });
      const result = await svc.getUserApplications("user-1");
      expect(result).toEqual([]);
    });
  });
});
