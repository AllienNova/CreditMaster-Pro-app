/**
 * Tax tip mapping.
 *
 * The optimizer screen calls them tips; the server computes recommendations.
 * There is no /tax/tips route and never has been, so getTips() 404'd and the
 * screen rendered five hardcoded tips with invented savings instead. This maps
 * the one real shape onto the screen's rather than adding a second route.
 *
 * The point of these tests is that nothing is invented. Where the server has
 * no answer — a recommendation that arrived without its joined strategy — the
 * field comes back undefined and the screen omits the chip, rather than
 * defaulting to a plausible "medium" the user would read as a measurement.
 */

import { toTaxTipView, toTaxTipViews } from "../taxTipAdapter";

const full = {
  id: "rec-1",
  title: "Maximize employer 401(k) match",
  description: "You may be leaving the employer match on the table.",
  summary: "Short version",
  estimatedTaxSavings: 3200,
  actionSteps: [
    { stepNumber: 1, title: "Check your contribution rate" },
    { stepNumber: 2, title: "Review the matching policy" },
  ],
  strategy: { category: "Retirement", complexity: "basic" },
};

describe("toTaxTipView", () => {
  it("carries the identifying fields across unchanged", () => {
    const tip = toTaxTipView(full);
    expect(tip.id).toBe("rec-1");
    expect(tip.title).toBe("Maximize employer 401(k) match");
  });

  it("maps estimatedTaxSavings onto potentialSavings", () => {
    expect(toTaxTipView(full).potentialSavings).toBe(3200);
  });

  it("prefers the full description over the summary", () => {
    expect(toTaxTipView(full).description).toBe(
      "You may be leaving the employer match on the table.",
    );
  });

  it("falls back to the summary when there is no description", () => {
    const { description: _omitted, ...withoutDescription } = full;
    expect(toTaxTipView(withoutDescription).description).toBe("Short version");
  });

  it("flattens action steps to their titles, in order", () => {
    expect(toTaxTipView(full).actionSteps).toEqual([
      "Check your contribution rate",
      "Review the matching policy",
    ]);
  });

  it("uses a step's description when it has no title", () => {
    const tip = toTaxTipView({
      ...full,
      actionSteps: [{ stepNumber: 1, description: "Open the HR portal" }],
    });
    expect(tip.actionSteps).toEqual(["Open the HR portal"]);
  });

  it("drops steps that would render as an empty bullet", () => {
    const tip = toTaxTipView({
      ...full,
      actionSteps: [{ stepNumber: 1, title: "   " }, { stepNumber: 2 }],
    });
    expect(tip.actionSteps).toEqual([]);
  });

  describe("difficulty", () => {
    it.each([
      ["basic", "easy"],
      ["intermediate", "medium"],
      ["advanced", "hard"],
      // Four complexity levels collapse onto three difficulties. Expert goes to
      // hard, the only direction that does not understate the work.
      ["expert", "hard"],
    ])("maps complexity %s to %s", (complexity, expected) => {
      const tip = toTaxTipView({ ...full, strategy: { complexity } });
      expect(tip.difficulty).toBe(expected);
    });

    it("is case-insensitive about the complexity value", () => {
      const tip = toTaxTipView({ ...full, strategy: { complexity: "BASIC" } });
      expect(tip.difficulty).toBe("easy");
    });

    it("is undefined — not a guess — when the strategy did not come back", () => {
      const { strategy: _omitted, ...withoutStrategy } = full;
      const tip = toTaxTipView(withoutStrategy);
      expect(tip.difficulty).toBeUndefined();
      expect(tip.category).toBeUndefined();
    });

    it("is undefined for a complexity value we do not recognise", () => {
      const tip = toTaxTipView({ ...full, strategy: { complexity: "wizard" } });
      expect(tip.difficulty).toBeUndefined();
    });
  });

  it("treats a missing savings figure as 0 rather than guessing", () => {
    const { estimatedTaxSavings: _omitted, ...withoutSavings } = full;
    expect(toTaxTipView(withoutSavings).potentialSavings).toBe(0);
  });

  it("returns no steps when the server sent none", () => {
    const { actionSteps: _omitted, ...withoutSteps } = full;
    expect(toTaxTipView(withoutSteps).actionSteps).toEqual([]);
  });
});

describe("toTaxTipViews", () => {
  it("maps a list", () => {
    expect(toTaxTipViews([full, { ...full, id: "rec-2" }])).toHaveLength(2);
  });

  it.each([null, undefined, "not a list"])(
    "returns an empty list for %j instead of throwing",
    (input) => {
      expect(toTaxTipViews(input as never)).toEqual([]);
    },
  );

  it("skips entries with no id, which cannot be dismissed or keyed", () => {
    const result = toTaxTipViews([full, { title: "orphan" } as never]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rec-1");
  });
});
