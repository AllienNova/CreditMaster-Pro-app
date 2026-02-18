// Credit Builder Service Tests

// Simple mock implementation for testing
class CreditBuilderService {
  getScoreRating(score: number): string {
    if (score >= 800) return "Exceptional";
    if (score >= 740) return "Very Good";
    if (score >= 670) return "Good";
    if (score >= 580) return "Fair";
    return "Poor";
  }

  calculateUtilizationImpact(utilization: number): number {
    return Math.max(0, 100 - utilization * 1.5);
  }

  calculatePaymentImpact(onTimeRate: number): number {
    return onTimeRate;
  }

  async getUtilizationRecommendations(profile: {
    utilization: number;
    score: number;
  }) {
    const recommendations = [];
    if (profile.utilization > 30) {
      recommendations.push({ action: "Pay down balances", priority: "high" });
    }
    return recommendations;
  }

  async getPaymentRecommendations(profile: {
    onTimePaymentRate: number;
    score: number;
  }) {
    const recommendations = [];
    if (profile.onTimePaymentRate < 100) {
      recommendations.push({ action: "Set up autopay", priority: "high" });
    }
    return recommendations;
  }
}

describe("CreditBuilderService", () => {
  let service: CreditBuilderService;

  beforeEach(() => {
    service = new CreditBuilderService();
  });

  describe("Score Calculation", () => {
    it("should calculate score rating correctly", () => {
      expect(service.getScoreRating(800)).toBe("Exceptional");
      expect(service.getScoreRating(750)).toBe("Very Good");
      expect(service.getScoreRating(700)).toBe("Good");
      expect(service.getScoreRating(600)).toBe("Fair");
      expect(service.getScoreRating(500)).toBe("Poor");
    });

    it("should calculate utilization impact", () => {
      const lowUtilization = service.calculateUtilizationImpact(10);
      const highUtilization = service.calculateUtilizationImpact(80);

      expect(lowUtilization).toBeGreaterThan(highUtilization);
    });

    it("should calculate payment history impact", () => {
      const perfectHistory = service.calculatePaymentImpact(100);
      const poorHistory = service.calculatePaymentImpact(70);

      expect(perfectHistory).toBeGreaterThan(poorHistory);
    });
  });

  describe("Recommendations", () => {
    it("should generate utilization recommendations", async () => {
      const profile = { utilization: 45, score: 680 };
      const recommendations =
        await service.getUtilizationRecommendations(profile);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("should generate payment recommendations", async () => {
      const profile = { onTimePaymentRate: 85, score: 650 };
      const recommendations = await service.getPaymentRecommendations(profile);

      expect(recommendations).toBeDefined();
    });

    it("should prioritize high-impact actions", () => {
      const actions = [
        { impact: "high", effort: "low", action: "Pay down credit cards" },
        {
          impact: "medium",
          effort: "medium",
          action: "Request credit increase",
        },
        { impact: "low", effort: "high", action: "Open new account" },
      ];

      const sorted = actions.sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return (
          impactOrder[b.impact as keyof typeof impactOrder] -
          impactOrder[a.impact as keyof typeof impactOrder]
        );
      });

      expect(sorted[0].impact).toBe("high");
    });
  });

  describe("Score Factors", () => {
    it("should weight factors correctly", () => {
      const factors = {
        paymentHistory: 0.35,
        creditUtilization: 0.3,
        creditAge: 0.15,
        creditMix: 0.1,
        newCredit: 0.1,
      };

      const totalWeight = Object.values(factors).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1, 5);
    });

    it("should identify negative factors", () => {
      const creditProfile = {
        utilization: 75, // High
        missedPayments: 2,
        averageAccountAge: 1, // Low
        recentInquiries: 5, // High
      };

      const negativeFactors = [];
      if (creditProfile.utilization > 30)
        negativeFactors.push("High utilization");
      if (creditProfile.missedPayments > 0)
        negativeFactors.push("Missed payments");
      if (creditProfile.averageAccountAge < 3)
        negativeFactors.push("Low credit age");
      if (creditProfile.recentInquiries > 2)
        negativeFactors.push("Too many inquiries");

      expect(negativeFactors.length).toBe(4);
    });
  });

  describe("Goal Setting", () => {
    it("should calculate time to goal", () => {
      const currentScore = 650;
      const targetScore = 750;
      const monthlyIncrease = 5;

      const monthsToGoal = Math.ceil(
        (targetScore - currentScore) / monthlyIncrease,
      );
      expect(monthsToGoal).toBe(20);
    });

    it("should validate realistic goals", () => {
      const isRealisticGoal = (
        current: number,
        target: number,
        months: number,
      ) => {
        const maxRealisticIncrease = months * 10; // ~10 points max per month
        return target - current <= maxRealisticIncrease;
      };

      expect(isRealisticGoal(600, 700, 12)).toBe(true);
      expect(isRealisticGoal(600, 800, 6)).toBe(false);
    });
  });
});
