/**
 * @jest-environment node
 */
describe("Score Simulator", () => {
  describe("Action Impact Calculation", () => {
    interface ScoreAction {
      type: string;
      value: number;
      currentScore: number;
    }

    interface ImpactResult {
      impact: number;
      currentScore: number;
      projectedScore: number;
      timeline: string;
    }

    const calculateImpact = (action: ScoreAction): ImpactResult => {
      const impacts: Record<string, (value: number, score: number) => number> =
        {
          pay_down_balance: (value) => {
            // Paying down balance improves score
            const utilizationDrop = value;
            return Math.min(50, Math.round(utilizationDrop * 0.5));
          },
          remove_collection: () => 25,
          remove_late_payment: () => 15,
          add_authorized_user: (value) => Math.min(20, value * 2),
          increase_credit_limit: (value) =>
            Math.min(15, Math.round(value / 500)),
          open_new_account: () => -5, // Initial drop due to hard inquiry
        };

      const impactFn = impacts[action.type];
      const impact = impactFn ? impactFn(action.value, action.currentScore) : 0;
      const newScore = Math.max(
        300,
        Math.min(850, action.currentScore + impact),
      );

      return {
        impact,
        currentScore: action.currentScore,
        projectedScore: newScore,
        timeline:
          action.type === "remove_collection"
            ? "30-45 days"
            : "1-2 billing cycles",
      };
    };

    it("should calculate impact of paying down balance", () => {
      const result = calculateImpact({
        type: "pay_down_balance",
        value: 40,
        currentScore: 650,
      });
      expect(result.impact).toBe(20);
      expect(result.projectedScore).toBe(670);
    });

    it("should calculate impact of removing collection", () => {
      const result = calculateImpact({
        type: "remove_collection",
        value: 0,
        currentScore: 580,
      });
      expect(result.impact).toBe(25);
      expect(result.projectedScore).toBe(605);
      expect(result.timeline).toBe("30-45 days");
    });

    it("should cap score at 850", () => {
      const result = calculateImpact({
        type: "remove_collection",
        value: 0,
        currentScore: 840,
      });
      expect(result.projectedScore).toBe(850);
    });

    it("should not go below 300", () => {
      const result = calculateImpact({
        type: "open_new_account",
        value: 0,
        currentScore: 302,
      });
      expect(result.projectedScore).toBe(300);
    });
  });

  describe("Multi-Action Simulation", () => {
    const simulateActions = (currentScore: number, actions: string[]) => {
      const actionImpacts: Record<string, number> = {
        pay_off_collection: 30,
        dispute_inquiry: 5,
        pay_down_cards: 20,
        become_authorized_user: 15,
        consolidate_debt: 10,
      };

      let score = currentScore;
      const steps: Array<{ action: string; score: number }> = [];

      for (const action of actions) {
        const impact = actionImpacts[action] || 0;
        score = Math.min(850, score + impact);
        steps.push({ action, score });
      }

      return {
        startingScore: currentScore,
        finalScore: score,
        totalGain: score - currentScore,
        steps,
      };
    };

    it("should simulate multiple actions", () => {
      const result = simulateActions(580, [
        "pay_off_collection",
        "pay_down_cards",
        "become_authorized_user",
      ]);
      expect(result.finalScore).toBe(645);
      expect(result.totalGain).toBe(65);
      expect(result.steps.length).toBe(3);
    });

    it("should track progression through steps", () => {
      const result = simulateActions(600, [
        "pay_off_collection",
        "dispute_inquiry",
      ]);
      expect(result.steps[0].score).toBe(630);
      expect(result.steps[1].score).toBe(635);
    });
  });

  describe("Score Range Classification", () => {
    const classifyScore = (score: number) => {
      if (score >= 800)
        return { rating: "Exceptional", color: "emerald", tier: 1 };
      if (score >= 740) return { rating: "Very Good", color: "green", tier: 2 };
      if (score >= 670) return { rating: "Good", color: "blue", tier: 3 };
      if (score >= 580) return { rating: "Fair", color: "yellow", tier: 4 };
      return { rating: "Poor", color: "red", tier: 5 };
    };

    it.each([
      [850, "Exceptional", 1],
      [800, "Exceptional", 1],
      [780, "Very Good", 2],
      [740, "Very Good", 2],
      [700, "Good", 3],
      [670, "Good", 3],
      [620, "Fair", 4],
      [580, "Fair", 4],
      [550, "Poor", 5],
      [300, "Poor", 5],
    ])("should classify score %i as %s (tier %i)", (score, rating, tier) => {
      const result = classifyScore(score);
      expect(result.rating).toBe(rating);
      expect(result.tier).toBe(tier);
    });
  });

  describe("Timeline Estimation", () => {
    const estimateTimeline = (currentScore: number, targetScore: number) => {
      const gap = targetScore - currentScore;

      if (gap <= 0) return { months: 0, achievable: true };
      if (gap > 200) return { months: 24, achievable: false };

      // Estimate ~10-15 points per month with active repair
      const monthsNeeded = Math.ceil(gap / 12);

      return {
        months: monthsNeeded,
        achievable: true,
        milestone: Math.round(currentScore + gap / 2),
      };
    };

    it("should return 0 months if already at target", () => {
      const result = estimateTimeline(700, 650);
      expect(result.months).toBe(0);
    });

    it("should estimate timeline for achievable goal", () => {
      const result = estimateTimeline(600, 720);
      expect(result.months).toBe(10);
      expect(result.achievable).toBe(true);
    });

    it("should mark unrealistic goals", () => {
      const result = estimateTimeline(400, 800);
      expect(result.achievable).toBe(false);
    });
  });

  describe("Factor Weighting", () => {
    const scoreFactorWeights = {
      paymentHistory: 35,
      creditUtilization: 30,
      creditAge: 15,
      creditMix: 10,
      newCredit: 10,
    };

    it("should have weights summing to 100", () => {
      const total = Object.values(scoreFactorWeights).reduce(
        (a, b) => a + b,
        0,
      );
      expect(total).toBe(100);
    });

    it("should prioritize payment history", () => {
      expect(scoreFactorWeights.paymentHistory).toBeGreaterThan(
        scoreFactorWeights.creditUtilization,
      );
    });

    it("should have utilization as second most important", () => {
      const sorted = Object.entries(scoreFactorWeights).sort(
        (a, b) => b[1] - a[1],
      );
      expect(sorted[1][0]).toBe("creditUtilization");
    });
  });
});
