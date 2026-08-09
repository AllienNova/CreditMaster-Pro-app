import {
  CREDIT_COSTS,
  CREDIT_PACKS,
  ADDON_BUNDLES,
  TIER_CREDITS,
  getActionCost,
  estimateCost,
} from "../credit-costs";
import type { CreditAction } from "../types";

describe("credit-costs", () => {
  describe("getActionCost", () => {
    it("returns correct cost for signal_analysis", () => {
      expect(getActionCost("signal_analysis")).toBe(50);
    });

    it("returns correct cost for trade_execution", () => {
      expect(getActionCost("trade_execution")).toBe(2);
    });

    it("returns correct cost for chat_message", () => {
      expect(getActionCost("chat_message")).toBe(15);
    });

    it("returns 0 for free actions", () => {
      expect(getActionCost("monthly_reset")).toBe(0);
      expect(getActionCost("credit_purchase")).toBe(0);
      expect(getActionCost("addon_credit")).toBe(0);
    });

    it("returns correct cost for all defined actions", () => {
      const expectedCosts: Record<CreditAction, number> = {
        signal_analysis: 50,
        trade_execution: 2,
        backtest_standard: 60,
        backtest_ai: 500,
        chat_message: 15,
        dispute_letter_single: 50,
        dispute_letter_all: 150,
        credit_analysis: 12,
        monthly_reset: 0,
        credit_purchase: 0,
        addon_credit: 0,
      };

      for (const [action, cost] of Object.entries(expectedCosts)) {
        expect(getActionCost(action as CreditAction)).toBe(cost);
      }
    });
  });

  describe("estimateCost", () => {
    it("sums costs for multiple actions", () => {
      const actions: CreditAction[] = [
        "signal_analysis",
        "chat_message",
        "trade_execution",
      ];
      expect(estimateCost(actions)).toBe(50 + 15 + 2);
    });

    it("returns 0 for empty array", () => {
      expect(estimateCost([])).toBe(0);
    });

    it("handles duplicate actions", () => {
      const actions: CreditAction[] = ["chat_message", "chat_message"];
      expect(estimateCost(actions)).toBe(30);
    });

    it("handles free actions in the mix", () => {
      const actions: CreditAction[] = [
        "signal_analysis",
        "monthly_reset",
        "credit_purchase",
      ];
      expect(estimateCost(actions)).toBe(50);
    });
  });

  describe("CREDIT_PACKS", () => {
    it("has exactly 3 packs", () => {
      expect(CREDIT_PACKS).toHaveLength(3);
    });

    it("has starter, value, and power types", () => {
      const types = CREDIT_PACKS.map((p) => p.type);
      expect(types).toEqual(["starter", "value", "power"]);
    });

    it("each pack has positive credits and price", () => {
      for (const pack of CREDIT_PACKS) {
        expect(pack.credits).toBeGreaterThan(0);
        expect(pack.priceUsd).toBeGreaterThan(0);
        expect(pack.priceCents).toBeGreaterThan(0);
        expect(pack.perCredit).toBeGreaterThan(0);
      }
    });

    it("priceCents matches priceUsd", () => {
      for (const pack of CREDIT_PACKS) {
        expect(pack.priceCents).toBe(Math.round(pack.priceUsd * 100));
      }
    });
  });

  describe("ADDON_BUNDLES", () => {
    it("has exactly 3 bundles", () => {
      expect(ADDON_BUNDLES).toHaveLength(3);
    });

    it("each bundle has a name, description, price, and credits", () => {
      for (const bundle of ADDON_BUNDLES) {
        expect(bundle.name).toBeTruthy();
        expect(bundle.description).toBeTruthy();
        expect(bundle.priceUsd).toBeGreaterThan(0);
        expect(bundle.creditsPerPeriod).toBeGreaterThan(0);
      }
    });
  });

  describe("TIER_CREDITS", () => {
    it("maps all 6 tiers", () => {
      expect(Object.keys(TIER_CREDITS)).toHaveLength(6);
    });

    it("has correct values for each tier", () => {
      expect(TIER_CREDITS.free).toBe(500);
      expect(TIER_CREDITS.standard).toBe(5000);
      expect(TIER_CREDITS.pro).toBe(15000);
      expect(TIER_CREDITS["family-duo"]).toBe(25000);
      expect(TIER_CREDITS.family).toBe(35000);
      expect(TIER_CREDITS["family-plus"]).toBe(50000);
    });

    it("tiers increase in credits as price increases", () => {
      const orderedTiers = [
        "free",
        "standard",
        "pro",
        "family-duo",
        "family",
        "family-plus",
      ];
      for (let i = 1; i < orderedTiers.length; i++) {
        expect(TIER_CREDITS[orderedTiers[i]]).toBeGreaterThan(
          TIER_CREDITS[orderedTiers[i - 1]],
        );
      }
    });
  });

  describe("CREDIT_COSTS consistency", () => {
    it("all actions in type have a cost defined", () => {
      const allActions: CreditAction[] = [
        "signal_analysis",
        "trade_execution",
        "backtest_standard",
        "backtest_ai",
        "chat_message",
        "dispute_letter_single",
        "dispute_letter_all",
        "credit_analysis",
        "monthly_reset",
        "credit_purchase",
        "addon_credit",
      ];

      for (const action of allActions) {
        expect(CREDIT_COSTS[action]).toBeDefined();
        expect(typeof CREDIT_COSTS[action]).toBe("number");
      }
    });
  });
});
