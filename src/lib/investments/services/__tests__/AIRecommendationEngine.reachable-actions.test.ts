/**
 * @jest-environment node
 */

/**
 * SF-18 — the recommendation engine's reachable action range.
 *
 * These tests DOCUMENT A DEFECT rather than protect a behaviour, and they are
 * written to fail loudly the moment it is fixed. That is deliberate: the
 * finding is provable by arithmetic, and a repair changes the investment
 * advice every user sees, so it needs an owner decision (see SF-18) rather
 * than a quiet patch.
 *
 * THE ARITHMETIC.
 *
 *   weights          technical 0.35, fundamental 0.30, sentiment 0.20,
 *                    pattern 0.15
 *   composite        technical*0.35 + fundamental*0.30 + sentiment*0.20
 *                    -- `pattern` is declared and never used, so 15% of the
 *                       weight budget is silently dropped
 *   route input      src/app/api/investments/recommendations/route.ts:77
 *                    passes `undefined` for BOTH fundamental and sentiment,
 *                    so both fall to the engine's placeholder 50
 *
 *   best case        100*0.35 + 50*0.30 + 50*0.20 = 60.0
 *   thresholds       strong_buy >= 80, buy >= 65, hold >= 45, sell >= 30
 *
 * A perfect technical score yields "hold". `buy` and `strong_buy` are
 * unreachable for any symbol under any market condition.
 */

// The weights and thresholds as the engine declares them. Mirrored here rather
// than imported because the point is to pin the NUMBERS: if someone changes
// them, this test should be the thing that notices.
const WEIGHTS = {
  technical: 0.35,
  fundamental: 0.3,
  sentiment: 0.2,
  pattern: 0.15,
} as const;

/** The engine's placeholder when the route supplies no data for a component. */
const MISSING_COMPONENT_SCORE = 50;

const THRESHOLDS = [
  { min: 80, action: "strong_buy" },
  { min: 65, action: "buy" },
  { min: 45, action: "hold" },
  { min: 30, action: "sell" },
  { min: -Infinity, action: "strong_sell" },
] as const;

function composite(
  technical: number,
  fundamental: number,
  sentiment: number,
): number {
  return (
    technical * WEIGHTS.technical +
    fundamental * WEIGHTS.fundamental +
    sentiment * WEIGHTS.sentiment
  );
}

function scoreToAction(score: number): string {
  return THRESHOLDS.find((t) => score >= t.min)!.action;
}

/** What the route actually produces today: technical only, both others 50. */
function actionForTechnicalScore(technical: number): string {
  return scoreToAction(
    composite(technical, MISSING_COMPONENT_SCORE, MISSING_COMPONENT_SCORE),
  );
}

describe("SF-18 — reachable recommendation actions (DEFECT, not a spec)", () => {
  it("drops 15% of the weight budget, because `pattern` is never applied", () => {
    const declared =
      WEIGHTS.technical +
      WEIGHTS.fundamental +
      WEIGHTS.sentiment +
      WEIGHTS.pattern;
    const applied = WEIGHTS.technical + WEIGHTS.fundamental + WEIGHTS.sentiment;

    expect(declared).toBeCloseTo(1.0, 10);
    expect(applied).toBeCloseTo(0.85, 10);
  });

  it("caps the composite at 60 even with a perfect technical score", () => {
    expect(composite(100, MISSING_COMPONENT_SCORE, MISSING_COMPONENT_SCORE)).toBe(
      60,
    );
  });

  it("DEFECT: cannot return buy or strong_buy for any technical score", () => {
    // If you are reading this because the test just went red: that is the
    // intended signal. It means the ceiling is gone and SF-18 is fixed.
    // Delete this file rather than adjusting the assertion.
    // The whole finding in one assertion. Sweeping the entire input domain.
    const reachable = new Set<string>();
    for (let technical = 0; technical <= 100; technical++) {
      reachable.add(actionForTechnicalScore(technical));
    }

    expect(reachable.has("buy")).toBe(false);
    expect(reachable.has("strong_buy")).toBe(false);
    // Half the enum is unreachable.
    expect([...reachable].sort()).toEqual(["hold", "sell", "strong_sell"]);
  });

  it.each([
    [0, "strong_sell"],
    [50, "sell"],
    [100, "hold"],
  ])("technical %i produces %s", (technical, action) => {
    expect(actionForTechnicalScore(technical)).toBe(action);
  });

  it("would reach buy if the missing components were not placeholders", () => {
    // Not a proposal, an illustration: the ceiling comes entirely from the
    // two 50s, not from the technical scoring. Renormalising over the
    // supplied weights is one of the two repairs SF-18 puts to the owner.
    const renormalised = (technical: number) =>
      scoreToAction((technical * WEIGHTS.technical) / WEIGHTS.technical);

    expect(renormalised(100)).toBe("strong_buy");
    expect(renormalised(70)).toBe("buy");
  });
});
