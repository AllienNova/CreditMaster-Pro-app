/**
 * Credit Score Simulator Service
 *
 * Simulates credit score changes based on hypothetical actions:
 * - Paying down debt
 * - Opening new accounts
 * - Closing accounts
 * - Hard inquiries
 * - Payment history changes
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CreditProfile {
  currentScore: number;
  totalCreditLimit: number;
  totalBalance: number;
  numberOfAccounts: number;
  oldestAccountAgeMonths: number;
  averageAccountAgeMonths: number;
  hardInquiriesLast12Months: number;
  latePaymentsLast24Months: number;
  collectionsCount: number;
  bankruptcyOnRecord: boolean;
  utilizationPercentage: number;
}

export type SimulationAction =
  | { type: "pay_down_debt"; amount: number; accountId?: string }
  | { type: "pay_off_card"; accountId: string }
  | { type: "open_new_card"; creditLimit: number }
  | {
      type: "close_account";
      accountId: string;
      creditLimit: number;
      balance: number;
      ageMonths: number;
    }
  | { type: "hard_inquiry" }
  | { type: "become_authorized_user"; creditLimit: number; ageMonths: number }
  | { type: "remove_late_payment" }
  | { type: "pay_collection"; amount: number }
  | { type: "wait_months"; months: number }
  | { type: "increase_credit_limit"; amount: number };

export interface SimulationResult {
  currentScore: number;
  projectedScore: number;
  scoreChange: number;
  changeBreakdown: {
    factor: string;
    impact: number;
    explanation: string;
  }[];
  confidenceLevel: "high" | "medium" | "low";
  timeToReflect: string;
  recommendations: string[];
}

export interface ScoreFactorWeights {
  paymentHistory: number; // 35%
  creditUtilization: number; // 30%
  creditAge: number; // 15%
  creditMix: number; // 10%
  newCredit: number; // 10%
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FICO_WEIGHTS: ScoreFactorWeights = {
  paymentHistory: 0.35,
  creditUtilization: 0.3,
  creditAge: 0.15,
  creditMix: 0.1,
  newCredit: 0.1,
};

const UTILIZATION_THRESHOLDS = [
  { max: 1, impact: 50 }, // 0-1% = Excellent
  { max: 10, impact: 40 }, // 1-10% = Very Good
  { max: 30, impact: 20 }, // 10-30% = Good
  { max: 50, impact: 0 }, // 30-50% = Fair
  { max: 75, impact: -30 }, // 50-75% = Poor
  { max: 100, impact: -60 }, // 75-100% = Very Poor
];

const INQUIRY_IMPACT = -5; // Per inquiry
const LATE_PAYMENT_IMPACT = -50; // Major impact
const COLLECTION_IMPACT = -100; // Severe impact
const NEW_ACCOUNT_AGE_IMPACT = -10; // Temporary dip

// ============================================================================
// CREDIT SCORE SIMULATOR CLASS
// ============================================================================

export class CreditScoreSimulator {
  private weights: ScoreFactorWeights;

  constructor(weights: ScoreFactorWeights = FICO_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Simulate score change for a single action
   */
  simulateAction(
    profile: CreditProfile,
    action: SimulationAction,
  ): SimulationResult {
    return this.simulateActions(profile, [action]);
  }

  /**
   * Simulate score changes for multiple actions
   */
  simulateActions(
    profile: CreditProfile,
    actions: SimulationAction[],
  ): SimulationResult {
    const breakdown: SimulationResult["changeBreakdown"] = [];
    let projectedProfile = { ...profile };
    let totalImpact = 0;

    for (const action of actions) {
      const { impact, explanation, factor, updatedProfile } =
        this.processAction(projectedProfile, action);

      if (impact !== 0) {
        breakdown.push({ factor, impact, explanation });
        totalImpact += impact;
      }

      projectedProfile = updatedProfile;
    }

    // Apply caps to prevent unrealistic scores
    const projectedScore = Math.min(
      850,
      Math.max(300, profile.currentScore + totalImpact),
    );
    const scoreChange = projectedScore - profile.currentScore;

    return {
      currentScore: profile.currentScore,
      projectedScore,
      scoreChange,
      changeBreakdown: breakdown,
      confidenceLevel: this.calculateConfidence(actions),
      timeToReflect: this.estimateTimeToReflect(actions),
      recommendations: this.generateRecommendations(
        profile,
        projectedProfile,
        actions,
      ),
    };
  }

  /**
   * Get optimal actions to reach a target score
   */
  getOptimalPath(
    profile: CreditProfile,
    targetScore: number,
  ): { actions: SimulationAction[]; projectedResult: SimulationResult } {
    const actions: SimulationAction[] = [];
    const currentProfile = { ...profile };

    // Priority 1: Pay down high utilization
    if (currentProfile.utilizationPercentage > 30) {
      const targetUtilization = 0.1; // Aim for 10%
      const targetBalance = currentProfile.totalCreditLimit * targetUtilization;
      const paydownAmount = currentProfile.totalBalance - targetBalance;

      if (paydownAmount > 0) {
        actions.push({ type: "pay_down_debt", amount: paydownAmount });
      }
    }

    // Priority 2: Request credit limit increase if utilization high
    if (
      currentProfile.utilizationPercentage > 30 &&
      currentProfile.totalBalance > 0
    ) {
      const neededLimit =
        currentProfile.totalBalance / 0.1 - currentProfile.totalCreditLimit;
      if (neededLimit > 0) {
        actions.push({ type: "increase_credit_limit", amount: neededLimit });
      }
    }

    // Priority 3: Address collections
    if (currentProfile.collectionsCount > 0) {
      actions.push({ type: "pay_collection", amount: 0 }); // Amount would need to be specified
    }

    // Priority 4: Wait for inquiries to age off
    if (currentProfile.hardInquiriesLast12Months > 2) {
      const monthsToWait = Math.min(
        12,
        currentProfile.hardInquiriesLast12Months * 2,
      );
      actions.push({ type: "wait_months", months: monthsToWait });
    }

    const projectedResult = this.simulateActions(profile, actions);

    return { actions, projectedResult };
  }

  /**
   * Simulate "what if I pay off this card" scenario
   */
  simulatePayOffCard(
    profile: CreditProfile,
    cardBalance: number,
    cardLimit: number,
  ): SimulationResult {
    const newTotalBalance = profile.totalBalance - cardBalance;
    const newUtilization = (newTotalBalance / profile.totalCreditLimit) * 100;

    const utilizationImpact = this.calculateUtilizationImpact(
      profile.utilizationPercentage,
      newUtilization,
    );

    return {
      currentScore: profile.currentScore,
      projectedScore: Math.min(850, profile.currentScore + utilizationImpact),
      scoreChange: utilizationImpact,
      changeBreakdown: [
        {
          factor: "Credit Utilization",
          impact: utilizationImpact,
          explanation: `Utilization drops from ${profile.utilizationPercentage.toFixed(1)}% to ${newUtilization.toFixed(1)}%`,
        },
      ],
      confidenceLevel: "high",
      timeToReflect: "1-2 billing cycles",
      recommendations: this.getUtilizationRecommendations(newUtilization),
    };
  }

  /**
   * Simulate opening a new credit card
   */
  simulateNewCard(
    profile: CreditProfile,
    newCardLimit: number,
  ): SimulationResult {
    const breakdown: SimulationResult["changeBreakdown"] = [];
    let totalImpact = 0;

    // Hard inquiry impact
    const inquiryImpact = INQUIRY_IMPACT;
    breakdown.push({
      factor: "New Credit (Inquiry)",
      impact: inquiryImpact,
      explanation: "Hard inquiry temporarily lowers score",
    });
    totalImpact += inquiryImpact;

    // New account age impact
    const ageImpact = NEW_ACCOUNT_AGE_IMPACT;
    breakdown.push({
      factor: "Credit Age",
      impact: ageImpact,
      explanation: "New account lowers average account age",
    });
    totalImpact += ageImpact;

    // Utilization improvement
    const newTotalLimit = profile.totalCreditLimit + newCardLimit;
    const newUtilization = (profile.totalBalance / newTotalLimit) * 100;
    const utilizationImpact = this.calculateUtilizationImpact(
      profile.utilizationPercentage,
      newUtilization,
    );

    if (utilizationImpact > 0) {
      breakdown.push({
        factor: "Credit Utilization",
        impact: utilizationImpact,
        explanation: `Higher total limit reduces utilization to ${newUtilization.toFixed(1)}%`,
      });
      totalImpact += utilizationImpact;
    }

    return {
      currentScore: profile.currentScore,
      projectedScore: Math.min(
        850,
        Math.max(300, profile.currentScore + totalImpact),
      ),
      scoreChange: totalImpact,
      changeBreakdown: breakdown,
      confidenceLevel: "medium",
      timeToReflect: "Immediate inquiry impact, 1-3 months for full effect",
      recommendations: [
        "Wait at least 6 months before applying for more credit",
        "Keep the new card utilization below 30%",
        "Set up autopay to ensure on-time payments",
      ],
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private processAction(
    profile: CreditProfile,
    action: SimulationAction,
  ): {
    impact: number;
    explanation: string;
    factor: string;
    updatedProfile: CreditProfile;
  } {
    const updatedProfile = { ...profile };

    switch (action.type) {
      case "pay_down_debt": {
        const newBalance = Math.max(0, profile.totalBalance - action.amount);
        const newUtilization =
          profile.totalCreditLimit > 0
            ? (newBalance / profile.totalCreditLimit) * 100
            : 0;

        const impact = this.calculateUtilizationImpact(
          profile.utilizationPercentage,
          newUtilization,
        );

        updatedProfile.totalBalance = newBalance;
        updatedProfile.utilizationPercentage = newUtilization;

        return {
          impact,
          explanation: `Paying $${action.amount.toLocaleString()} reduces utilization from ${profile.utilizationPercentage.toFixed(1)}% to ${newUtilization.toFixed(1)}%`,
          factor: "Credit Utilization",
          updatedProfile,
        };
      }

      case "pay_off_card": {
        // Simplified - would need more card-specific data in real implementation
        const impact = 15; // Estimate
        return {
          impact,
          explanation: "Paying off a card in full improves utilization",
          factor: "Credit Utilization",
          updatedProfile,
        };
      }

      case "open_new_card": {
        updatedProfile.numberOfAccounts += 1;
        updatedProfile.totalCreditLimit += action.creditLimit;
        updatedProfile.hardInquiriesLast12Months += 1;

        const newUtilization =
          (profile.totalBalance / updatedProfile.totalCreditLimit) * 100;
        updatedProfile.utilizationPercentage = newUtilization;

        // New account lowers average age
        updatedProfile.averageAccountAgeMonths =
          (profile.averageAccountAgeMonths * profile.numberOfAccounts) /
          (profile.numberOfAccounts + 1);

        const inquiryImpact = INQUIRY_IMPACT;
        const ageImpact = NEW_ACCOUNT_AGE_IMPACT;
        const utilizationImpact = this.calculateUtilizationImpact(
          profile.utilizationPercentage,
          newUtilization,
        );

        return {
          impact: inquiryImpact + ageImpact + utilizationImpact,
          explanation: `New card: inquiry (${inquiryImpact}), age impact (${ageImpact}), utilization (${utilizationImpact > 0 ? "+" : ""}${utilizationImpact})`,
          factor: "Multiple Factors",
          updatedProfile,
        };
      }

      case "close_account": {
        updatedProfile.numberOfAccounts -= 1;
        updatedProfile.totalCreditLimit -= action.creditLimit;

        const newUtilization =
          updatedProfile.totalCreditLimit > 0
            ? ((profile.totalBalance - action.balance) /
                updatedProfile.totalCreditLimit) *
              100
            : 0;
        updatedProfile.utilizationPercentage = newUtilization;

        const utilizationImpact = this.calculateUtilizationImpact(
          profile.utilizationPercentage,
          newUtilization,
        );

        // Closing old accounts can hurt
        const ageImpact =
          action.ageMonths > profile.averageAccountAgeMonths ? -5 : 0;

        return {
          impact: utilizationImpact + ageImpact,
          explanation: `Closing account affects utilization and credit age`,
          factor: "Multiple Factors",
          updatedProfile,
        };
      }

      case "hard_inquiry": {
        updatedProfile.hardInquiriesLast12Months += 1;
        return {
          impact: INQUIRY_IMPACT,
          explanation: "Hard inquiry temporarily lowers score",
          factor: "New Credit",
          updatedProfile,
        };
      }

      case "become_authorized_user": {
        updatedProfile.totalCreditLimit += action.creditLimit;
        const newUtilization =
          (profile.totalBalance / updatedProfile.totalCreditLimit) * 100;
        updatedProfile.utilizationPercentage = newUtilization;

        // Can help with age if old account
        const ageBoost =
          action.ageMonths > profile.averageAccountAgeMonths ? 10 : 0;
        const utilizationImpact = this.calculateUtilizationImpact(
          profile.utilizationPercentage,
          newUtilization,
        );

        return {
          impact: utilizationImpact + ageBoost,
          explanation:
            "Becoming an authorized user can boost credit limit and age",
          factor: "Multiple Factors",
          updatedProfile,
        };
      }

      case "remove_late_payment": {
        updatedProfile.latePaymentsLast24Months = Math.max(
          0,
          profile.latePaymentsLast24Months - 1,
        );
        return {
          impact: 30, // Significant positive impact
          explanation: "Removing a late payment improves payment history",
          factor: "Payment History",
          updatedProfile,
        };
      }

      case "pay_collection": {
        // Paying collections has varying impact depending on scoring model
        updatedProfile.collectionsCount = Math.max(
          0,
          profile.collectionsCount - 1,
        );
        return {
          impact: 20, // FICO 9 and VantageScore 3.0+ ignore paid collections
          explanation:
            "Paying collection account (impact varies by scoring model)",
          factor: "Payment History",
          updatedProfile,
        };
      }

      case "wait_months": {
        // Inquiries age off
        const inquiriesAged = Math.floor(action.months / 12);
        updatedProfile.hardInquiriesLast12Months = Math.max(
          0,
          profile.hardInquiriesLast12Months - inquiriesAged,
        );

        // Age improves
        updatedProfile.oldestAccountAgeMonths += action.months;
        updatedProfile.averageAccountAgeMonths += action.months;

        const ageImpact = Math.min(10, Math.floor(action.months / 6) * 2);
        const inquiryImpact = inquiriesAged * Math.abs(INQUIRY_IMPACT);

        return {
          impact: ageImpact + inquiryImpact,
          explanation: `Waiting ${action.months} months: accounts age, inquiries drop off`,
          factor: "Credit Age & New Credit",
          updatedProfile,
        };
      }

      case "increase_credit_limit": {
        updatedProfile.totalCreditLimit += action.amount;
        const newUtilization =
          (profile.totalBalance / updatedProfile.totalCreditLimit) * 100;
        updatedProfile.utilizationPercentage = newUtilization;

        const impact = this.calculateUtilizationImpact(
          profile.utilizationPercentage,
          newUtilization,
        );

        return {
          impact,
          explanation: `Credit limit increase reduces utilization to ${newUtilization.toFixed(1)}%`,
          factor: "Credit Utilization",
          updatedProfile,
        };
      }

      default:
        return {
          impact: 0,
          explanation: "Unknown action",
          factor: "Unknown",
          updatedProfile,
        };
    }
  }

  private calculateUtilizationImpact(
    currentUtil: number,
    newUtil: number,
  ): number {
    const currentTier =
      UTILIZATION_THRESHOLDS.find((t) => currentUtil <= t.max) ||
      UTILIZATION_THRESHOLDS[UTILIZATION_THRESHOLDS.length - 1];
    const newTier =
      UTILIZATION_THRESHOLDS.find((t) => newUtil <= t.max) ||
      UTILIZATION_THRESHOLDS[UTILIZATION_THRESHOLDS.length - 1];

    return newTier.impact - currentTier.impact;
  }

  private calculateConfidence(
    actions: SimulationAction[],
  ): "high" | "medium" | "low" {
    // Simple actions have higher confidence
    const simpleActions = [
      "pay_down_debt",
      "increase_credit_limit",
      "hard_inquiry",
    ];
    const allSimple = actions.every((a) => simpleActions.includes(a.type));

    if (allSimple && actions.length <= 2) return "high";
    if (actions.length <= 4) return "medium";
    return "low";
  }

  private estimateTimeToReflect(actions: SimulationAction[]): string {
    const hasWait = actions.some((a) => a.type === "wait_months");
    const hasPayment = actions.some(
      (a) => a.type === "pay_down_debt" || a.type === "pay_off_card",
    );
    const hasNewAccount = actions.some((a) => a.type === "open_new_card");

    if (hasWait) {
      const waitAction = actions.find((a) => a.type === "wait_months") as {
        type: "wait_months";
        months: number;
      };
      return `${waitAction.months} months`;
    }
    if (hasNewAccount) return "1-3 months";
    if (hasPayment) return "1-2 billing cycles (30-60 days)";
    return "30-45 days";
  }

  private generateRecommendations(
    originalProfile: CreditProfile,
    projectedProfile: CreditProfile,
    actions: SimulationAction[],
  ): string[] {
    const recommendations: string[] = [];

    if (projectedProfile.utilizationPercentage > 30) {
      recommendations.push(
        "Consider paying down more debt to get utilization below 30%",
      );
    }

    if (projectedProfile.utilizationPercentage > 10) {
      recommendations.push("For the best score, aim for under 10% utilization");
    }

    if (projectedProfile.hardInquiriesLast12Months >= 3) {
      recommendations.push("Avoid new credit applications for 6-12 months");
    }

    if (originalProfile.latePaymentsLast24Months > 0) {
      recommendations.push(
        "Focus on making all payments on time going forward",
      );
    }

    if (actions.some((a) => a.type === "open_new_card")) {
      recommendations.push(
        "Wait at least 6 months before applying for more credit",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Continue making on-time payments to maintain your score",
      );
    }

    return recommendations;
  }

  private getUtilizationRecommendations(utilization: number): string[] {
    if (utilization <= 1) {
      return ["Excellent utilization! Keep a small balance to show activity."];
    }
    if (utilization <= 10) {
      return ["Great utilization! This is optimal for your credit score."];
    }
    if (utilization <= 30) {
      return [
        "Good utilization. Consider paying down a bit more for maximum benefit.",
      ];
    }
    return [
      "Your utilization is above the recommended 30% threshold",
      "Consider requesting a credit limit increase",
      "Focus on paying down balances before the statement closing date",
    ];
  }
}

// Export singleton instance
export const creditScoreSimulator = new CreditScoreSimulator();
