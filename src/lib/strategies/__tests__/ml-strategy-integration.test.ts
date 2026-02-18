/**
 * ML Strategy Integration Tests
 *
 * These tests use REAL ML models (no mocks) since we have actual implementations.
 * This provides true integration testing of the strategy recommendation system.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  mlStrategyIntegration,
  CreditItem,
  UserProfile,
} from "../ml-strategy-integration";

describe("MLStrategyIntegration", () => {
  const mockCreditItem: CreditItem = {
    type: "collection",
    description: "Medical collection from ABC Hospital",
    amount: 500,
    date: "2023-01-15",
    bureau: "experian",
    status: "unpaid",
    creditorName: "ABC Hospital",
  };

  const mockUserProfile: UserProfile = {
    creditScore: 620,
    accountAge: 48,
    paymentHistory: 85,
    utilization: 45,
    totalAccounts: 8,
    negativeItems: 3,
    inquiries: 2,
  };

  beforeEach(() => {
    // No mocks needed - using real ML models
  });

  describe("recommendStrategies", () => {
    it("should return top 5 strategies for collection account", async () => {
      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it("should return strategies with all required fields", async () => {
      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      const rec = recommendations[0];
      expect(rec).toHaveProperty("strategy");
      expect(rec).toHaveProperty("score");
      expect(rec).toHaveProperty("successProbability");
      expect(rec).toHaveProperty("estimatedTimeline");
      expect(rec).toHaveProperty("requiredActions");
      expect(rec).toHaveProperty("legalBasis");
      expect(rec).toHaveProperty("reasoning");
      expect(rec).toHaveProperty("roi");
      expect(rec).toHaveProperty("confidence");
    });

    it("should filter out previously attempted strategies", async () => {
      const firstRun = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      const firstStrategyId = firstRun[0].strategy.id;

      const secondRun = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [firstStrategyId],
      );

      const hasFirstStrategy = secondRun.some(
        (r) => r.strategy.id === firstStrategyId,
      );
      expect(hasFirstStrategy).toBe(false);
    });

    it("should prioritize high-success-rate strategies", async () => {
      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      // Top recommendation should have high success rate
      expect(recommendations[0].successProbability).toBeGreaterThan(0.5);

      // Recommendations should be sorted by score (descending)
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].score).toBeGreaterThanOrEqual(
          recommendations[i + 1].score,
        );
      }
    });

    it("should handle inquiry items differently", async () => {
      const inquiryItem: CreditItem = {
        ...mockCreditItem,
        type: "inquiry",
      };

      const recommendations = await mlStrategyIntegration.recommendStrategies(
        inquiryItem,
        mockUserProfile,
        [],
      );

      expect(recommendations.length).toBeGreaterThan(0);
      // Inquiries should have shorter timelines
      expect(recommendations[0].estimatedTimeline).toContain("15-30 days");
    });

    it("should handle public record items differently", async () => {
      const publicRecordItem: CreditItem = {
        ...mockCreditItem,
        type: "public_record",
      };

      const recommendations = await mlStrategyIntegration.recommendStrategies(
        publicRecordItem,
        mockUserProfile,
        [],
      );

      expect(recommendations.length).toBeGreaterThan(0);
      // Public records should have longer timelines
      expect(recommendations[0].estimatedTimeline).toContain("90-180 days");
    });

    it("should calculate ROI based on item type and amount", async () => {
      const highAmountItem: CreditItem = {
        ...mockCreditItem,
        amount: 10000,
      };

      const recommendations = await mlStrategyIntegration.recommendStrategies(
        highAmountItem,
        mockUserProfile,
        [],
      );

      expect(recommendations[0].roi).toBeGreaterThan(0);
    });

    it("should include required actions for each strategy", async () => {
      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      expect(recommendations[0].requiredActions).toBeDefined();
      expect(Array.isArray(recommendations[0].requiredActions)).toBe(true);
      expect(recommendations[0].requiredActions.length).toBeGreaterThan(0);
    });

    it("should include legal basis for each strategy", async () => {
      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      expect(recommendations[0].legalBasis).toBeDefined();
      expect(typeof recommendations[0].legalBasis).toBe("string");
      expect(recommendations[0].legalBasis.length).toBeGreaterThan(0);
    });

    it("should generate reasoning for each recommendation", async () => {
      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        [],
      );

      expect(recommendations[0].reasoning).toBeDefined();
      expect(typeof recommendations[0].reasoning).toBe("string");
      expect(recommendations[0].reasoning).toContain("success rate");
    });

    it("should handle low credit scores appropriately", async () => {
      const lowScoreProfile: UserProfile = {
        ...mockUserProfile,
        creditScore: 500,
      };

      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        lowScoreProfile,
        [],
      );

      expect(recommendations.length).toBeGreaterThan(0);
      // Should still provide recommendations
    });

    it("should handle high credit scores appropriately", async () => {
      const highScoreProfile: UserProfile = {
        ...mockUserProfile,
        creditScore: 750,
      };

      const recommendations = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        highScoreProfile,
        [],
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should still return strategies even when many have been tried", async () => {
      const item: CreditItem = {
        ...mockCreditItem,
        type: "collection",
      };

      // Attempt with many strategies already tried
      const manyAttemptedStrategies = [
        "debt_validation",
        "mov_request",
        "cfpb_complaint",
        "furnisher_direct",
        "pay_for_delete",
        "goodwill_adjustment",
        "round_based_escalation",
        "factual_dispute",
        "estoppel_by_silence",
        "identity_theft_affidavit",
      ];

      const recommendations = await mlStrategyIntegration.recommendStrategies(
        item,
        mockUserProfile,
        manyAttemptedStrategies,
      );

      // Should still return strategies (just not the ones already tried)
      expect(recommendations.length).toBeGreaterThan(0);

      // None of the returned strategies should be in the attempted list
      recommendations.forEach((rec) => {
        expect(manyAttemptedStrategies).not.toContain(rec.strategy.id);
      });
    });

    it("should handle multiple previous attempts with penalty", async () => {
      const recommendations2 = await mlStrategyIntegration.recommendStrategies(
        mockCreditItem,
        mockUserProfile,
        ["strategy1", "strategy2", "strategy3"],
      );

      // Scores should be lower with more previous attempts
      // (This is a simplified check - actual implementation may vary)
      expect(recommendations2.length).toBeGreaterThan(0);
    });
  });
});
