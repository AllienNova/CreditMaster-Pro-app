/**
 * A portfolio with too few holdings is a normal account state, not a 500.
 *
 * GET /api/investments/analytics/correlation answered
 * `500 "Failed to calculate correlation matrix"` for any portfolio with fewer
 * than two holdings. The route did have handling for expected conditions — but
 * it matched error message SUBSTRINGS ("not found", "no holdings",
 * "insufficient data"), and the thrown message was
 * "…needs at least 2 holdings for correlation analysis", which contains none of
 * them. So the normal case fell through to the generic 500.
 *
 * Found by a browser sweep, not by a test: every test in this area mocks the
 * layer that throws.
 */

import { InsufficientHoldingsError } from "../portfolio-analytics";

describe("InsufficientHoldingsError", () => {
  const err = new InsufficientHoldingsError("pf-1", 2, 1, "correlation analysis");

  it("is an Error, so existing catch blocks still see it", () => {
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(InsufficientHoldingsError);
  });

  it("carries the numbers the caller needs to explain itself", () => {
    // The route returns these so the page can say "1 of 2" rather than a
    // generic apology.
    expect(err.portfolioId).toBe("pf-1");
    expect(err.required).toBe(2);
    expect(err.actual).toBe(1);
  });

  it("names itself, so logs identify it without parsing the message", () => {
    expect(err.name).toBe("InsufficientHoldingsError");
  });

  it("states both the requirement and the reality in the message", () => {
    expect(err.message).toContain("at least 2 holdings");
    expect(err.message).toContain("has 1");
  });

  it("is distinguishable by TYPE, not by prose", () => {
    // The whole point. The old route asked whether the message contained
    // "no holdings"; this message does not, and rewording it must never
    // silently turn a 422 back into a 500.
    expect(err.message).not.toContain("no holdings");
    expect(err.message).not.toContain("not found");
    expect(err.message).not.toContain("insufficient data");
    expect(err instanceof InsufficientHoldingsError).toBe(true);
  });

  it("reports the analysis it was raised for", () => {
    const risk = new InsufficientHoldingsError("pf-2", 3, 0, "risk analysis");
    expect(risk.message).toContain("risk analysis");
    expect(risk.actual).toBe(0);
  });
});
