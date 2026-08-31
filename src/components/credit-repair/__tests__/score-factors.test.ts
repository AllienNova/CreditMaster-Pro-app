/**
 * The boundary between GET /api/credit-repair/score and the dashboard.
 *
 * /credit-repair rendered "Application error: a client-side exception has
 * occurred" — `t.factors.map is not a function`. The dashboard did
 * `setScore(scoreData.data)`, an unchecked cast, then mapped `score.factors`.
 *
 * It is not an array. The route reduces the service's ScoreFactor[] through
 * toFactorRecord before WRITING the row (route.ts:50 and :108), then returns
 * the saved row. The fixture below is the response captured from a real signed-
 * in request against a live database, not a shape assumed from the type.
 *
 * The service layer IS tested — credit-repair-service.test.ts asserts the
 * array, and asserts `impact` is 40. That is exactly why this survived: the
 * tested contract and the delivered one are different objects.
 */

import { parseScoreFactors } from "../score-factors";

/** Captured verbatim from GET /api/credit-repair/score, signed in. */
const LIVE_FACTORS = {
  building: 100,
  disputes: 70,
  utilization: 66.28983529870382,
  negotiations: 55,
};

describe("parseScoreFactors", () => {
  it("reads the RECORD the route actually returns", () => {
    expect(parseScoreFactors(LIVE_FACTORS)).toEqual([
      { category: "building", currentScore: 100 },
      { category: "disputes", currentScore: 70 },
      { category: "utilization", currentScore: 66.28983529870382 },
      { category: "negotiations", currentScore: 55 },
    ]);
  });

  it("still reads the ARRAY the service produces", () => {
    // A row written before the record conversion, or a route that stops
    // flattening, must not crash the page a second time.
    expect(
      parseScoreFactors([
        { category: "disputes", currentScore: 80, impact: 40, weight: 40 },
        { category: "building", currentScore: 100, impact: 0, weight: 20 },
      ]),
    ).toEqual([
      { category: "disputes", currentScore: 80 },
      { category: "building", currentScore: 100 },
    ]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "disputes"],
    ["a number", 4],
  ])("returns an empty list for %s rather than throwing", (_d, input) => {
    // The original failure in one line: anything non-mappable took the whole
    // page down. An empty grid is a far better outcome.
    expect(parseScoreFactors(input)).toEqual([]);
  });

  it("drops record entries whose value is not a real number", () => {
    expect(
      parseScoreFactors({ disputes: 70, utilization: null, building: "100" }),
    ).toEqual([{ category: "disputes", currentScore: 70 }]);
  });

  it("drops array entries missing a category or score", () => {
    expect(
      parseScoreFactors([
        { category: "disputes", currentScore: 70 },
        { currentScore: 50 },
        { category: "building" },
        null,
      ]),
    ).toEqual([{ category: "disputes", currentScore: 70 }]);
  });

  it("keeps a real zero, which is a meaningful score", () => {
    expect(parseScoreFactors({ disputes: 0 })).toEqual([
      { category: "disputes", currentScore: 0 },
    ]);
  });

  it("rejects NaN and Infinity, which render as text in a width style", () => {
    expect(parseScoreFactors({ a: NaN, b: Infinity, c: 10 })).toEqual([
      { category: "c", currentScore: 10 },
    ]);
  });
});
