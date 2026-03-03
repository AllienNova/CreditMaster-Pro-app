/**
 * Credit Score Simulator Tests
 *
 * Comprehensive unit tests for the CreditScoreSimulator class covering:
 * - Single and multi-action simulations
 * - All 10 action types (pay_down_debt, pay_off_card, open_new_card,
 *   close_account, hard_inquiry, become_authorized_user, remove_late_payment,
 *   pay_collection, wait_months, increase_credit_limit)
 * - Optimal path generation
 * - simulatePayOffCard and simulateNewCard convenience methods
 * - Secured card recommendations
 * - Credit mix optimization analysis
 * - Student loan optimization (consolidation vs forgiveness)
 * - What-if scenario comparison
 * - Edge cases: empty history, invalid scores, boundary conditions
 */

import {
  CreditScoreSimulator,
  creditScoreSimulator,
  type CreditProfile,
  type SimulationAction,
  type CreditMixDetails,
  type StudentLoanDetails,
} from "../CreditScoreSimulator";

// ============================================================================
// HELPERS
// ============================================================================

function createDefaultProfile(
  overrides?: Partial<CreditProfile>,
): CreditProfile {
  return {
    currentScore: 680,
    totalCreditLimit: 10000,
    totalBalance: 4000,
    numberOfAccounts: 4,
    oldestAccountAgeMonths: 60,
    averageAccountAgeMonths: 36,
    hardInquiriesLast12Months: 1,
    latePaymentsLast24Months: 0,
    collectionsCount: 0,
    bankruptcyOnRecord: false,
    utilizationPercentage: 40,
    ...overrides,
  };
}

function createCreditMixProfile(
  profileOverrides?: Partial<CreditProfile>,
  mixDetails?: Partial<CreditMixDetails["accountTypes"]>,
): CreditProfile & CreditMixDetails {
  return {
    ...createDefaultProfile(profileOverrides),
    accountTypes: {
      revolving: 2,
      installment: 1,
      mortgage: 0,
      ...mixDetails,
    },
  };
}

function createStudentLoans(
  overrides?: Partial<StudentLoanDetails>[],
): StudentLoanDetails[] {
  const defaults: StudentLoanDetails[] = [
    {
      id: "loan-1",
      name: "Federal Subsidized",
      balance: 20000,
      interestRate: 5.0,
      monthlyPayment: 250,
      type: "federal",
      servicer: "FedLoan",
    },
    {
      id: "loan-2",
      name: "Federal Unsubsidized",
      balance: 15000,
      interestRate: 6.0,
      monthlyPayment: 200,
      type: "federal",
      servicer: "FedLoan",
    },
  ];

  if (overrides) {
    return defaults.map((loan, i) =>
      overrides[i] ? { ...loan, ...overrides[i] } : loan,
    );
  }
  return defaults;
}

// ============================================================================
// CONSTRUCTOR & SINGLETON
// ============================================================================

describe("CreditScoreSimulator", () => {
  describe("constructor and singleton", () => {
    it("should create instance with default FICO weights", () => {
      const simulator = new CreditScoreSimulator();
      expect(simulator).toBeInstanceOf(CreditScoreSimulator);
    });

    it("should create instance with custom weights", () => {
      const customWeights = {
        paymentHistory: 0.4,
        creditUtilization: 0.25,
        creditAge: 0.15,
        creditMix: 0.1,
        newCredit: 0.1,
      };
      const simulator = new CreditScoreSimulator(customWeights);
      expect(simulator).toBeInstanceOf(CreditScoreSimulator);
    });

    it("should export a singleton instance", () => {
      expect(creditScoreSimulator).toBeInstanceOf(CreditScoreSimulator);
    });
  });

  // ============================================================================
  // SIMULATE ACTION (single)
  // ============================================================================

  describe("simulateAction", () => {
    it("should delegate to simulateActions with a single-element array", () => {
      const profile = createDefaultProfile();
      const action: SimulationAction = { type: "hard_inquiry" };
      const result = creditScoreSimulator.simulateAction(profile, action);

      expect(result.currentScore).toBe(680);
      expect(result.projectedScore).toBeLessThan(680);
      expect(result.scoreChange).toBeLessThan(0);
      expect(result.changeBreakdown.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SIMULATE ACTIONS (multiple)
  // ============================================================================

  describe("simulateActions", () => {
    it("should return correct structure for empty actions array", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, []);

      expect(result.currentScore).toBe(680);
      expect(result.projectedScore).toBe(680);
      expect(result.scoreChange).toBe(0);
      expect(result.changeBreakdown).toEqual([]);
      expect(result.confidenceLevel).toBe("high");
      expect(result.timeToReflect).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("should simulate pay_down_debt action", () => {
      const profile = createDefaultProfile({
        totalBalance: 5000,
        totalCreditLimit: 10000,
        utilizationPercentage: 50,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 4000 },
      ]);

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.changeBreakdown[0].factor).toBe("Credit Utilization");
      expect(result.changeBreakdown[0].explanation).toContain("Paying");
    });

    it("should handle pay_down_debt when credit limit is 0", () => {
      const profile = createDefaultProfile({
        totalCreditLimit: 0,
        totalBalance: 1000,
        utilizationPercentage: 100,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 500 },
      ]);

      // With 0 credit limit, utilization goes to 0% from 100%
      expect(result).toBeDefined();
      expect(result.currentScore).toBe(profile.currentScore);
    });

    it("should simulate pay_off_card action", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_off_card", accountId: "card-1" },
      ]);

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.changeBreakdown[0].factor).toBe("Credit Utilization");
      expect(result.changeBreakdown[0].impact).toBe(15);
    });

    it("should simulate open_new_card action", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 60,
        totalBalance: 6000,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "open_new_card", creditLimit: 5000 },
      ]);

      expect(result.changeBreakdown.length).toBeGreaterThanOrEqual(1);
      expect(result.changeBreakdown[0].factor).toBe("Multiple Factors");
      // Should include inquiry + age impacts
      expect(result.changeBreakdown[0].explanation).toContain("New card");
    });

    it("should simulate close_account action", () => {
      const profile = createDefaultProfile({
        numberOfAccounts: 5,
        totalCreditLimit: 20000,
        totalBalance: 3000,
        utilizationPercentage: 15,
        averageAccountAgeMonths: 36,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        {
          type: "close_account",
          accountId: "acc-1",
          creditLimit: 5000,
          balance: 0,
          ageMonths: 60,
        },
      ]);

      // Closing an old account should hurt
      expect(result.changeBreakdown.length).toBeGreaterThan(0);
      expect(result.changeBreakdown[0].factor).toBe("Multiple Factors");
    });

    it("should simulate close_account with zero remaining credit limit", () => {
      const profile = createDefaultProfile({
        numberOfAccounts: 1,
        totalCreditLimit: 5000,
        totalBalance: 2000,
        utilizationPercentage: 40,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        {
          type: "close_account",
          accountId: "acc-1",
          creditLimit: 5000,
          balance: 2000,
          ageMonths: 10,
        },
      ]);

      // Utilization should go to 0 when limit becomes 0
      expect(result).toBeDefined();
    });

    it("should simulate hard_inquiry action", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "hard_inquiry" },
      ]);

      expect(result.projectedScore).toBeLessThan(profile.currentScore);
      expect(result.scoreChange).toBe(-5);
      expect(result.changeBreakdown[0].factor).toBe("New Credit");
    });

    it("should simulate become_authorized_user with age boost", () => {
      const profile = createDefaultProfile({
        averageAccountAgeMonths: 24,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "become_authorized_user", creditLimit: 10000, ageMonths: 60 },
      ]);

      // Should get age boost since 60 > 24
      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
    });

    it("should simulate become_authorized_user without age boost", () => {
      const profile = createDefaultProfile({
        averageAccountAgeMonths: 120,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "become_authorized_user", creditLimit: 500, ageMonths: 12 },
      ]);

      // No age boost since 12 < 120
      expect(result).toBeDefined();
    });

    it("should simulate remove_late_payment action", () => {
      const profile = createDefaultProfile({
        latePaymentsLast24Months: 2,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "remove_late_payment" },
      ]);

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.scoreChange).toBe(30);
      expect(result.changeBreakdown[0].factor).toBe("Payment History");
    });

    it("should simulate remove_late_payment when count is already 0", () => {
      const profile = createDefaultProfile({
        latePaymentsLast24Months: 0,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "remove_late_payment" },
      ]);

      // Impact is still 30 (the scoring model impact), but late payments don't go below 0
      expect(result.scoreChange).toBe(30);
    });

    it("should simulate pay_collection action", () => {
      const profile = createDefaultProfile({
        collectionsCount: 2,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_collection", amount: 500 },
      ]);

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.scoreChange).toBe(20);
      expect(result.changeBreakdown[0].factor).toBe("Payment History");
    });

    it("should simulate pay_collection when count is already 0", () => {
      const profile = createDefaultProfile({
        collectionsCount: 0,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_collection", amount: 100 },
      ]);

      // Impact still 20, but collectionsCount stays at 0
      expect(result.scoreChange).toBe(20);
    });

    it("should simulate wait_months action with inquiry aging", () => {
      const profile = createDefaultProfile({
        hardInquiriesLast12Months: 3,
        oldestAccountAgeMonths: 24,
        averageAccountAgeMonths: 12,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "wait_months", months: 24 },
      ]);

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.changeBreakdown[0].factor).toBe("Credit Age & New Credit");
      expect(result.changeBreakdown[0].explanation).toContain("Waiting 24 months");
    });

    it("should simulate wait_months with short wait", () => {
      const profile = createDefaultProfile({
        hardInquiriesLast12Months: 1,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "wait_months", months: 3 },
      ]);

      // Short wait: age impact = min(10, floor(3/6)*2) = 0, inquiry impact = 0
      // This results in 0 total impact, so no breakdown entry
      expect(result.scoreChange).toBe(0);
    });

    it("should simulate increase_credit_limit action", () => {
      const profile = createDefaultProfile({
        totalBalance: 5000,
        totalCreditLimit: 10000,
        utilizationPercentage: 50,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "increase_credit_limit", amount: 10000 },
      ]);

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.changeBreakdown[0].factor).toBe("Credit Utilization");
    });

    it("should handle multiple actions in sequence", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 60,
        totalBalance: 6000,
        totalCreditLimit: 10000,
        latePaymentsLast24Months: 1,
        collectionsCount: 1,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 4000 },
        { type: "remove_late_payment" },
        { type: "pay_collection", amount: 500 },
      ]);

      expect(result.changeBreakdown.length).toBe(3);
      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
    });

    it("should cap projected score at 850", () => {
      const profile = createDefaultProfile({
        currentScore: 840,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "remove_late_payment" },
        { type: "remove_late_payment" },
      ]);

      expect(result.projectedScore).toBeLessThanOrEqual(850);
    });

    it("should not drop below 300", () => {
      const profile = createDefaultProfile({
        currentScore: 310,
      });

      // Many negative actions
      const actions: SimulationAction[] = [
        { type: "hard_inquiry" },
        { type: "hard_inquiry" },
        { type: "hard_inquiry" },
        { type: "hard_inquiry" },
        { type: "hard_inquiry" },
      ];

      const result = creditScoreSimulator.simulateActions(profile, actions);
      expect(result.projectedScore).toBeGreaterThanOrEqual(300);
    });

    it("should skip breakdown entries with zero impact", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 5,
        totalBalance: 500,
        totalCreditLimit: 10000,
      });

      // Pay down a small amount that stays in the same utilization tier
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 100 },
      ]);

      // 4% to 4% - same tier = 0 impact, so no breakdown entry
      expect(
        result.changeBreakdown.filter((b) => b.factor === "Credit Utilization"),
      ).toHaveLength(0);
    });
  });

  // ============================================================================
  // CONFIDENCE LEVELS
  // ============================================================================

  describe("confidence levels", () => {
    it("should return high confidence for simple actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 1000 },
      ]);
      expect(result.confidenceLevel).toBe("high");
    });

    it("should return high confidence for 2 simple actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 1000 },
        { type: "increase_credit_limit", amount: 5000 },
      ]);
      expect(result.confidenceLevel).toBe("high");
    });

    it("should return medium confidence for complex actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "open_new_card", creditLimit: 5000 },
        { type: "remove_late_payment" },
      ]);
      expect(result.confidenceLevel).toBe("medium");
    });

    it("should return low confidence for many actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "open_new_card", creditLimit: 5000 },
        { type: "remove_late_payment" },
        { type: "pay_collection", amount: 100 },
        { type: "hard_inquiry" },
        { type: "wait_months", months: 6 },
      ]);
      expect(result.confidenceLevel).toBe("low");
    });
  });

  // ============================================================================
  // TIME TO REFLECT
  // ============================================================================

  describe("time to reflect estimation", () => {
    it("should return months for wait_months action", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "wait_months", months: 6 },
      ]);
      expect(result.timeToReflect).toBe("6 months");
    });

    it("should return 1-3 months for new card", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "open_new_card", creditLimit: 5000 },
      ]);
      expect(result.timeToReflect).toBe("1-3 months");
    });

    it("should return billing cycles for payment actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 1000 },
      ]);
      expect(result.timeToReflect).toBe("1-2 billing cycles (30-60 days)");
    });

    it("should return billing cycles for pay_off_card", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_off_card", accountId: "card-1" },
      ]);
      expect(result.timeToReflect).toBe("1-2 billing cycles (30-60 days)");
    });

    it("should return default time for other actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "hard_inquiry" },
      ]);
      expect(result.timeToReflect).toBe("30-45 days");
    });

    it("should prioritize wait_months over other actions", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 1000 },
        { type: "wait_months", months: 12 },
        { type: "open_new_card", creditLimit: 5000 },
      ]);
      expect(result.timeToReflect).toBe("12 months");
    });
  });

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  describe("recommendations", () => {
    it("should recommend reducing utilization above 30%", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 45,
        totalBalance: 4500,
        totalCreditLimit: 10000,
      });

      // Action that doesn't reduce utilization enough
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 500 },
      ]);

      expect(
        result.recommendations.some((r) => r.includes("below 30%")),
      ).toBe(true);
    });

    it("should recommend under 10% utilization", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 20,
        totalBalance: 2000,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 500 },
      ]);

      expect(
        result.recommendations.some((r) => r.includes("under 10%")),
      ).toBe(true);
    });

    it("should recommend avoiding new credit with many inquiries", () => {
      const profile = createDefaultProfile({
        hardInquiriesLast12Months: 3,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "hard_inquiry" },
      ]);

      expect(
        result.recommendations.some((r) =>
          r.includes("Avoid new credit applications"),
        ),
      ).toBe(true);
    });

    it("should recommend on-time payments when late payments exist", () => {
      const profile = createDefaultProfile({
        latePaymentsLast24Months: 2,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "remove_late_payment" },
      ]);

      expect(
        result.recommendations.some((r) =>
          r.includes("payments on time"),
        ),
      ).toBe(true);
    });

    it("should recommend waiting after opening new card", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "open_new_card", creditLimit: 5000 },
      ]);

      expect(
        result.recommendations.some((r) =>
          r.includes("Wait at least 6 months"),
        ),
      ).toBe(true);
    });

    it("should provide default recommendation when no issues", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 5,
        totalBalance: 500,
        totalCreditLimit: 10000,
        hardInquiriesLast12Months: 0,
        latePaymentsLast24Months: 0,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 400 },
      ]);

      expect(
        result.recommendations.some((r) =>
          r.includes("Continue making on-time payments"),
        ),
      ).toBe(true);
    });
  });

  // ============================================================================
  // GET OPTIMAL PATH
  // ============================================================================

  describe("getOptimalPath", () => {
    it("should suggest paying down debt for high utilization", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 60,
        totalBalance: 6000,
        totalCreditLimit: 10000,
      });

      const { actions, projectedResult } =
        creditScoreSimulator.getOptimalPath(profile, 750);

      expect(actions.some((a) => a.type === "pay_down_debt")).toBe(true);
      expect(projectedResult.projectedScore).toBeGreaterThan(
        profile.currentScore,
      );
    });

    it("should suggest credit limit increase for high utilization with balance", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 50,
        totalBalance: 5000,
        totalCreditLimit: 10000,
      });

      const { actions } = creditScoreSimulator.getOptimalPath(profile, 750);

      expect(actions.some((a) => a.type === "increase_credit_limit")).toBe(
        true,
      );
    });

    it("should suggest paying collections when collections exist", () => {
      const profile = createDefaultProfile({
        collectionsCount: 2,
        utilizationPercentage: 20,
      });

      const { actions } = creditScoreSimulator.getOptimalPath(profile, 750);

      expect(actions.some((a) => a.type === "pay_collection")).toBe(true);
    });

    it("should suggest waiting when many inquiries exist", () => {
      const profile = createDefaultProfile({
        hardInquiriesLast12Months: 5,
        utilizationPercentage: 20,
      });

      const { actions } = creditScoreSimulator.getOptimalPath(profile, 750);

      expect(actions.some((a) => a.type === "wait_months")).toBe(true);
    });

    it("should return no actions for already-optimal profile", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 5,
        collectionsCount: 0,
        hardInquiriesLast12Months: 0,
      });

      const { actions, projectedResult } =
        creditScoreSimulator.getOptimalPath(profile, 700);

      expect(actions).toHaveLength(0);
      expect(projectedResult.scoreChange).toBe(0);
    });

    it("should not suggest credit limit increase when utilization is fine", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 20,
        totalBalance: 2000,
        totalCreditLimit: 10000,
        hardInquiriesLast12Months: 0,
        collectionsCount: 0,
      });

      const { actions } = creditScoreSimulator.getOptimalPath(profile, 750);

      expect(actions.some((a) => a.type === "increase_credit_limit")).toBe(
        false,
      );
    });
  });

  // ============================================================================
  // SIMULATE PAY OFF CARD
  // ============================================================================

  describe("simulatePayOffCard", () => {
    it("should show utilization improvement", () => {
      const profile = createDefaultProfile({
        totalBalance: 5000,
        totalCreditLimit: 10000,
        utilizationPercentage: 50,
      });

      const result = creditScoreSimulator.simulatePayOffCard(
        profile,
        3000,
        5000,
      );

      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
      expect(result.changeBreakdown[0].factor).toBe("Credit Utilization");
      expect(result.changeBreakdown[0].explanation).toContain("Utilization drops");
      expect(result.confidenceLevel).toBe("high");
      expect(result.timeToReflect).toBe("1-2 billing cycles");
    });

    it("should cap projected score at 850", () => {
      const profile = createDefaultProfile({
        currentScore: 845,
        totalBalance: 5000,
        totalCreditLimit: 10000,
        utilizationPercentage: 50,
      });

      const result = creditScoreSimulator.simulatePayOffCard(
        profile,
        4500,
        5000,
      );

      expect(result.projectedScore).toBeLessThanOrEqual(850);
    });

    it("should return utilization recommendations", () => {
      const profile = createDefaultProfile({
        totalBalance: 3000,
        totalCreditLimit: 10000,
        utilizationPercentage: 30,
      });

      const result = creditScoreSimulator.simulatePayOffCard(
        profile,
        2000,
        5000,
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // UTILIZATION RECOMMENDATIONS
  // ============================================================================

  describe("utilization recommendations (via simulatePayOffCard)", () => {
    it("should return excellent message for <= 1%", () => {
      const profile = createDefaultProfile({
        totalBalance: 100,
        totalCreditLimit: 10000,
        utilizationPercentage: 1,
      });

      const result = creditScoreSimulator.simulatePayOffCard(profile, 100, 5000);
      // After paying off 100, utilization = 0/10000 = 0%
      expect(result.recommendations[0]).toContain("Excellent utilization");
    });

    it("should return great message for <= 10%", () => {
      const profile = createDefaultProfile({
        totalBalance: 1500,
        totalCreditLimit: 10000,
        utilizationPercentage: 15,
      });

      const result = creditScoreSimulator.simulatePayOffCard(
        profile,
        800,
        5000,
      );
      // After paying off 800, utilization = 700/10000 = 7%
      expect(result.recommendations[0]).toContain("Great utilization");
    });

    it("should return good message for <= 30%", () => {
      const profile = createDefaultProfile({
        totalBalance: 3000,
        totalCreditLimit: 10000,
        utilizationPercentage: 30,
      });

      const result = creditScoreSimulator.simulatePayOffCard(
        profile,
        1000,
        5000,
      );
      // After paying off 1000, utilization = 2000/10000 = 20%
      expect(result.recommendations[0]).toContain("Good utilization");
    });

    it("should return warning messages for > 30%", () => {
      const profile = createDefaultProfile({
        totalBalance: 5000,
        totalCreditLimit: 10000,
        utilizationPercentage: 50,
      });

      const result = creditScoreSimulator.simulatePayOffCard(
        profile,
        1000,
        5000,
      );
      // After paying off 1000, utilization = 4000/10000 = 40%
      expect(result.recommendations.length).toBe(3);
      expect(result.recommendations[0]).toContain("above the recommended 30%");
    });
  });

  // ============================================================================
  // SIMULATE NEW CARD
  // ============================================================================

  describe("simulateNewCard", () => {
    it("should show inquiry and age impacts", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.simulateNewCard(profile, 5000);

      expect(result.changeBreakdown.length).toBeGreaterThanOrEqual(2);
      expect(
        result.changeBreakdown.some((b) =>
          b.factor.includes("New Credit"),
        ),
      ).toBe(true);
      expect(
        result.changeBreakdown.some((b) => b.factor.includes("Credit Age")),
      ).toBe(true);
    });

    it("should show utilization improvement for high-util profiles", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 70,
        totalBalance: 7000,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.simulateNewCard(profile, 10000);

      expect(
        result.changeBreakdown.some((b) =>
          b.factor.includes("Credit Utilization"),
        ),
      ).toBe(true);
    });

    it("should not include utilization breakdown when no improvement", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 5,
        totalBalance: 500,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.simulateNewCard(profile, 1000);

      // Utilization stays in same tier (1-10%), so no utilization breakdown
      expect(
        result.changeBreakdown.filter((b) =>
          b.factor.includes("Credit Utilization"),
        ),
      ).toHaveLength(0);
    });

    it("should return medium confidence", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateNewCard(profile, 5000);
      expect(result.confidenceLevel).toBe("medium");
    });

    it("should cap score between 300 and 850", () => {
      const profile = createDefaultProfile({ currentScore: 310 });
      const result = creditScoreSimulator.simulateNewCard(profile, 1000);
      expect(result.projectedScore).toBeGreaterThanOrEqual(300);
      expect(result.projectedScore).toBeLessThanOrEqual(850);
    });

    it("should include standard recommendations", () => {
      const profile = createDefaultProfile();
      const result = creditScoreSimulator.simulateNewCard(profile, 5000);
      expect(result.recommendations).toContain(
        "Wait at least 6 months before applying for more credit",
      );
      expect(result.recommendations).toContain(
        "Set up autopay to ensure on-time payments",
      );
    });
  });

  // ============================================================================
  // SECURED CARD RECOMMENDATIONS
  // ============================================================================

  describe("getSecuredCardRecommendations", () => {
    it("should recommend basic secured card for low score", () => {
      const profile = createDefaultProfile({
        currentScore: 520,
        numberOfAccounts: 1,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(
        recommendations.some((r) => r.cardType === "basic_secured"),
      ).toBe(true);
    });

    it("should recommend basic secured card for thin file", () => {
      const profile = createDefaultProfile({
        currentScore: 650,
        numberOfAccounts: 1,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      expect(
        recommendations.some((r) => r.cardType === "basic_secured"),
      ).toBe(true);
    });

    it("should recommend rewards secured card for moderate score", () => {
      const profile = createDefaultProfile({
        currentScore: 600,
        numberOfAccounts: 3,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      expect(
        recommendations.some((r) => r.cardType === "rewards_secured"),
      ).toBe(true);
    });

    it("should recommend limit boost secured card for high utilization", () => {
      const profile = createDefaultProfile({
        currentScore: 650,
        numberOfAccounts: 4,
        utilizationPercentage: 60,
        totalBalance: 6000,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      expect(
        recommendations.some((r) => r.cardType === "limit_boost_secured"),
      ).toBe(true);
    });

    it("should recommend post-bankruptcy secured card", () => {
      const profile = createDefaultProfile({
        currentScore: 500,
        bankruptcyOnRecord: true,
        numberOfAccounts: 1,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      expect(
        recommendations.some((r) => r.cardType === "post_bankruptcy_secured"),
      ).toBe(true);
    });

    it("should return empty array for good profile", () => {
      const profile = createDefaultProfile({
        currentScore: 720,
        numberOfAccounts: 5,
        utilizationPercentage: 20,
        bankruptcyOnRecord: false,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      expect(recommendations).toHaveLength(0);
    });

    it("should sort recommendations by priority", () => {
      const profile = createDefaultProfile({
        currentScore: 550,
        numberOfAccounts: 1,
        utilizationPercentage: 60,
        totalBalance: 6000,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      // All high-priority recommendations should come before medium
      const highIdx = recommendations.findIndex((r) => r.priority === "high");
      const medIdx = recommendations.findIndex((r) => r.priority === "medium");

      if (highIdx >= 0 && medIdx >= 0) {
        expect(highIdx).toBeLessThan(medIdx);
      }
    });

    it("should include expected fields in each recommendation", () => {
      const profile = createDefaultProfile({
        currentScore: 520,
        numberOfAccounts: 1,
      });

      const recommendations =
        creditScoreSimulator.getSecuredCardRecommendations(profile);

      for (const rec of recommendations) {
        expect(rec).toHaveProperty("cardType");
        expect(rec).toHaveProperty("reason");
        expect(rec).toHaveProperty("suggestedDeposit");
        expect(rec).toHaveProperty("expectedScoreImpact");
        expect(rec).toHaveProperty("timeToGraduation");
        expect(rec).toHaveProperty("features");
        expect(rec).toHaveProperty("priority");
        expect(rec.features.length).toBeGreaterThan(0);
        expect(rec.suggestedDeposit).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // CREDIT MIX ANALYSIS
  // ============================================================================

  describe("analyzeCreditMix", () => {
    it("should rate excellent mix with all account types", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 3,
        installment: 2,
        mortgage: 1,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(analysis.mixRating).toBe("excellent");
      expect(analysis.scoreImpact).toBe(10);
    });

    it("should rate good mix with 2 account types", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 2,
        installment: 1,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(analysis.mixRating).toBe("good");
      expect(analysis.scoreImpact).toBe(5);
    });

    it("should rate fair mix with 1 account type", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 3,
        installment: 0,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(analysis.mixRating).toBe("fair");
      expect(analysis.scoreImpact).toBe(0);
    });

    it("should rate poor mix with no accounts", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 0,
        installment: 0,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(analysis.mixRating).toBe("poor");
      expect(analysis.scoreImpact).toBe(-10);
    });

    it("should suggest adding revolving when missing", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 0,
        installment: 1,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(
        analysis.suggestions.some((s) =>
          s.includes("revolving"),
        ),
      ).toBe(true);
    });

    it("should suggest adding installment when missing", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 2,
        installment: 0,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(
        analysis.suggestions.some((s) =>
          s.includes("installment"),
        ),
      ).toBe(true);
    });

    it("should warn about too many revolving accounts", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 8,
        installment: 1,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(
        analysis.suggestions.some((s) =>
          s.includes("many revolving"),
        ),
      ).toBe(true);
    });

    it("should suggest maintenance for well-diversified mix", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 3,
        installment: 2,
        mortgage: 1,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(
        analysis.suggestions.some((s) =>
          s.includes("well-diversified"),
        ),
      ).toBe(true);
    });

    it("should provide optimal mix recommendations", () => {
      const profile = createCreditMixProfile(undefined, {
        revolving: 1,
        installment: 0,
        mortgage: 0,
      });

      const analysis = creditScoreSimulator.analyzeCreditMix(profile);

      expect(analysis.optimalMix.revolving).toBeGreaterThanOrEqual(2);
      expect(analysis.optimalMix.installment).toBeGreaterThanOrEqual(1);
      expect(analysis.optimalMix.mortgage).toBe(0); // Can't recommend a mortgage
    });
  });

  // ============================================================================
  // STUDENT LOAN OPTIMIZATION
  // ============================================================================

  describe("analyzeStudentLoanOptimization", () => {
    it("should return consolidation analysis for multiple loans", () => {
      const loans = createStudentLoans();
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      expect(result.totalBalance).toBe(35000);
      expect(result.weightedAverageRate).toBeGreaterThan(0);
      expect(result.consolidation).toBeDefined();
      expect(result.consolidation.pros.length).toBeGreaterThan(0);
      expect(result.consolidation.cons.length).toBeGreaterThan(0);
    });

    it("should calculate weighted average rate correctly", () => {
      const loans = createStudentLoans();
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      // (20000*5 + 15000*6) / 35000 = 5.428...
      expect(result.weightedAverageRate).toBeCloseTo(5.4286, 3);
    });

    it("should recommend PSLF for public service employees", () => {
      const loans = createStudentLoans([
        {
          type: "federal",
          employerType: "public_service",
          qualifyingPaymentsMade: 80,
        },
      ]);
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      expect(
        result.forgivenessOptions.some((o) => o.program.includes("PSLF")),
      ).toBe(true);
    });

    it("should recommend forgiveness when PSLF and over 60 payments made", () => {
      const loans = createStudentLoans([
        {
          type: "federal",
          employerType: "public_service",
          qualifyingPaymentsMade: 80,
        },
      ]);
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      expect(result.recommendation).toBe("forgiveness");
    });

    it("should recommend IDR forgiveness for high debt-to-income", () => {
      const loans = createStudentLoans([
        { balance: 80000, type: "federal" },
        { balance: 60000, type: "federal" },
      ]);
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        50000,
      );

      // debt-to-income = 140000/50000 = 2.8 > 1.5
      expect(
        result.forgivenessOptions.some((o) =>
          o.program.includes("Income-Driven"),
        ),
      ).toBe(true);
    });

    it("should recommend consolidation when savings are significant", () => {
      const loans = createStudentLoans([
        { balance: 30000, interestRate: 8.0, monthlyPayment: 400 },
        { balance: 20000, interestRate: 7.0, monthlyPayment: 300 },
      ]);
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      // With high rates, consolidation may offer savings
      expect(result.consolidation).toBeDefined();
      expect(result.consolidation.estimatedRate).toBeLessThanOrEqual(
        result.weightedAverageRate,
      );
    });

    it("should recommend maintain_current for low-rate loans", () => {
      const loans = createStudentLoans([
        { balance: 5000, interestRate: 3.0, monthlyPayment: 100, type: "private" },
        { balance: 3000, interestRate: 3.5, monthlyPayment: 80, type: "private" },
      ]);
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        80000,
      );

      // Low debt-to-income, private loans don't qualify for forgiveness
      expect(result.forgivenessOptions).toHaveLength(0);
      // Consolidation may not save much with low rates
      expect(result.recommendation).toBe("maintain_current");
    });

    it("should handle single loan", () => {
      const loans: StudentLoanDetails[] = [
        {
          id: "loan-1",
          name: "Federal Loan",
          balance: 10000,
          interestRate: 5.0,
          monthlyPayment: 200,
          type: "federal",
          servicer: "FedLoan",
        },
      ];
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      expect(result.totalBalance).toBe(10000);
      expect(result.consolidation.recommended).toBe(false); // Single loan
      expect(result.currentLoans).toHaveLength(1);
      expect(result.currentLoans[0].remainingMonths).toBeGreaterThan(0);
    });

    it("should handle zero balance loans", () => {
      const loans: StudentLoanDetails[] = [
        {
          id: "loan-1",
          name: "Paid Off Loan",
          balance: 0,
          interestRate: 5.0,
          monthlyPayment: 0,
          type: "federal",
          servicer: "FedLoan",
        },
      ];
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      expect(result.totalBalance).toBe(0);
      expect(result.monthlyPayment).toBe(0);
      expect(result.currentLoans[0].remainingMonths).toBe(0);
    });

    it("should handle zero income gracefully", () => {
      const loans = createStudentLoans();
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        0,
      );

      // Should not throw - debt-to-income ratio will be 0
      expect(result).toBeDefined();
      expect(result.totalBalance).toBe(35000);
    });

    it("should include credit score impact for each option", () => {
      const loans = createStudentLoans();
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.analyzeStudentLoanOptimization(
        loans,
        profile,
        60000,
      );

      expect(result.creditScoreImpact).toHaveProperty("consolidation");
      expect(result.creditScoreImpact).toHaveProperty("forgiveness");
      expect(result.creditScoreImpact).toHaveProperty("maintaining");
    });
  });

  // ============================================================================
  // SCENARIO COMPARISON (WHAT-IF)
  // ============================================================================

  describe("compareScenarios", () => {
    it("should compare multiple scenarios", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 50,
        totalBalance: 5000,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.compareScenarios(profile, [
        {
          name: "Pay down debt",
          actions: [{ type: "pay_down_debt", amount: 3000 }],
        },
        {
          name: "Open new card",
          actions: [{ type: "open_new_card", creditLimit: 5000 }],
        },
        {
          name: "Do nothing",
          actions: [],
        },
      ]);

      expect(result.baselineScore).toBe(680);
      expect(result.scenarios).toHaveLength(3);
      expect(result.bestScenario).toBeDefined();
      expect(result.worstScenario).toBeDefined();
      expect(result.scoreRange.max).toBeGreaterThanOrEqual(
        result.scoreRange.min,
      );
    });

    it("should identify best and worst scenarios", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 50,
        totalBalance: 5000,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.compareScenarios(profile, [
        {
          name: "Aggressive paydown",
          actions: [{ type: "pay_down_debt", amount: 4000 }],
        },
        {
          name: "Multiple inquiries",
          actions: [
            { type: "hard_inquiry" },
            { type: "hard_inquiry" },
            { type: "hard_inquiry" },
          ],
        },
      ]);

      expect(result.bestScenario.name).toBe("Aggressive paydown");
      expect(result.worstScenario.name).toBe("Multiple inquiries");
      expect(result.bestScenario.projectedScore).toBeGreaterThan(
        result.worstScenario.projectedScore,
      );
    });

    it("should handle empty scenarios", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.compareScenarios(profile, []);

      expect(result.scenarios).toHaveLength(0);
      expect(result.bestScenario.name).toBe("none");
      expect(result.worstScenario.name).toBe("none");
      expect(result.scoreRange.min).toBe(profile.currentScore);
      expect(result.scoreRange.max).toBe(profile.currentScore);
    });

    it("should handle single scenario", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.compareScenarios(profile, [
        {
          name: "Pay debt",
          actions: [{ type: "pay_down_debt", amount: 1000 }],
        },
      ]);

      expect(result.scenarios).toHaveLength(1);
      expect(result.bestScenario.name).toBe("Pay debt");
      expect(result.worstScenario.name).toBe("Pay debt");
    });

    it("should include detailed results for each scenario", () => {
      const profile = createDefaultProfile();

      const result = creditScoreSimulator.compareScenarios(profile, [
        {
          name: "Test",
          actions: [{ type: "hard_inquiry" }],
        },
      ]);

      const scenario = result.scenarios[0];
      expect(scenario.name).toBe("Test");
      expect(scenario.actions).toHaveLength(1);
      expect(scenario.result).toHaveProperty("currentScore");
      expect(scenario.result).toHaveProperty("projectedScore");
      expect(scenario.result).toHaveProperty("scoreChange");
      expect(scenario.result).toHaveProperty("changeBreakdown");
      expect(scenario.result).toHaveProperty("confidenceLevel");
      expect(scenario.result).toHaveProperty("timeToReflect");
      expect(scenario.result).toHaveProperty("recommendations");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("should handle profile with minimum score (300)", () => {
      const profile = createDefaultProfile({ currentScore: 300 });

      const result = creditScoreSimulator.simulateAction(profile, {
        type: "hard_inquiry",
      });

      expect(result.projectedScore).toBe(300);
      expect(result.scoreChange).toBe(0);
    });

    it("should handle profile with maximum score (850)", () => {
      const profile = createDefaultProfile({ currentScore: 850 });

      const result = creditScoreSimulator.simulateAction(profile, {
        type: "remove_late_payment",
      });

      expect(result.projectedScore).toBe(850);
      expect(result.scoreChange).toBe(0);
    });

    it("should handle zero credit limit", () => {
      const profile = createDefaultProfile({
        totalCreditLimit: 0,
        totalBalance: 0,
        utilizationPercentage: 0,
      });

      const result = creditScoreSimulator.simulateAction(profile, {
        type: "pay_down_debt",
        amount: 0,
      });

      expect(result).toBeDefined();
    });

    it("should handle negative balance gracefully", () => {
      const profile = createDefaultProfile({
        totalBalance: 100,
      });

      // Paying more than balance
      const result = creditScoreSimulator.simulateActions(profile, [
        { type: "pay_down_debt", amount: 500 },
      ]);

      // Balance should be clamped to 0
      expect(result).toBeDefined();
    });

    it("should handle extremely high utilization", () => {
      const profile = createDefaultProfile({
        utilizationPercentage: 150,
        totalBalance: 15000,
        totalCreditLimit: 10000,
      });

      const result = creditScoreSimulator.simulateAction(profile, {
        type: "pay_down_debt",
        amount: 10000,
      });

      expect(result).toBeDefined();
      expect(result.projectedScore).toBeGreaterThan(profile.currentScore);
    });

    it("should handle profile with all zeros", () => {
      const profile: CreditProfile = {
        currentScore: 500,
        totalCreditLimit: 0,
        totalBalance: 0,
        numberOfAccounts: 0,
        oldestAccountAgeMonths: 0,
        averageAccountAgeMonths: 0,
        hardInquiriesLast12Months: 0,
        latePaymentsLast24Months: 0,
        collectionsCount: 0,
        bankruptcyOnRecord: false,
        utilizationPercentage: 0,
      };

      const result = creditScoreSimulator.simulateAction(profile, {
        type: "open_new_card",
        creditLimit: 1000,
      });

      expect(result).toBeDefined();
      expect(result.currentScore).toBe(500);
    });

    it("should handle closing account with ageMonths less than average", () => {
      const profile = createDefaultProfile({
        numberOfAccounts: 5,
        averageAccountAgeMonths: 60,
        totalCreditLimit: 20000,
      });

      const result = creditScoreSimulator.simulateActions(profile, [
        {
          type: "close_account",
          accountId: "acc-1",
          creditLimit: 3000,
          balance: 0,
          ageMonths: 12, // Less than average
        },
      ]);

      // Should not incur age penalty since account is younger than average
      expect(result).toBeDefined();
    });
  });
});
