/**
 * The boundary between GET /api/credits/balance and the component that renders it.
 *
 * This existed as an unchecked cast — `setData(await res.json())` against a
 * five-field interface — and the shapes had never matched. The route answers
 * `{ balance: CreditBalance, usage: { thisMonth, total } }`; the component read
 * `creditBalance` off the top level, got undefined, called `.toLocaleString()`
 * on it, and took the whole of /settings/credits down with
 * "Application error: a client-side exception has occurred".
 *
 * The route was not untested — it has negative-auth tests and a
 * db-was-called test. Neither reads the response, so neither could see this.
 * A real browser found it in one visit.
 *
 * The fixture below is the route's ACTUAL shape, built the way the route builds
 * it, so a change on either side breaks this rather than production.
 */

import { parseBalance } from "../CreditBalance";

/** Exactly what src/app/api/credits/balance/route.ts returns, post-JSON. */
function routeResponse(over: Record<string, unknown> = {}) {
  return {
    balance: {
      userId: "user-1",
      creditBalance: 1250,
      subscriptionAllowance: 1000,
      purchasedCredits: 250,
      usedThisPeriod: 300,
      // Date on the server, ISO string over the wire.
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T00:00:00.000Z",
      ...over,
    },
    usage: { thisMonth: 300, total: 4820 },
  };
}

describe("parseBalance", () => {
  it("reads the route's real nested shape", () => {
    expect(parseBalance(routeResponse())).toEqual({
      creditBalance: 1250,
      subscriptionAllowance: 1000,
      purchasedCredits: 250,
      usedThisPeriod: 300,
      periodEnd: "2026-08-31T00:00:00.000Z",
    });
  });

  it("rejects the FLAT shape the component used to assume", () => {
    // The original bug in one assertion: these fields at the top level are not
    // what the route sends, and reading them there yields undefined.
    expect(
      parseBalance({
        creditBalance: 1250,
        subscriptionAllowance: 1000,
        purchasedCredits: 250,
        usedThisPeriod: 300,
        periodEnd: "2026-08-31T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("keeps a real zero balance rather than discarding it", () => {
    const parsed = parseBalance(routeResponse({ creditBalance: 0 }));
    expect(parsed?.creditBalance).toBe(0);
  });

  it.each([
    ["creditBalance", { creditBalance: undefined }],
    ["subscriptionAllowance", { subscriptionAllowance: undefined }],
    ["purchasedCredits", { purchasedCredits: undefined }],
    ["usedThisPeriod", { usedThisPeriod: undefined }],
  ])("returns null when %s is missing, instead of rendering undefined", (_f, over) => {
    // Every one of these was a `.toLocaleString()` call site on a value the
    // component had not checked.
    expect(parseBalance(routeResponse(over))).toBeNull();
  });

  it.each([
    ["a string", { creditBalance: "1250" }],
    ["NaN", { creditBalance: NaN }],
    ["Infinity", { creditBalance: Infinity }],
    ["null", { creditBalance: null }],
  ])("returns null when creditBalance is %s", (_d, over) => {
    expect(parseBalance(routeResponse(over))).toBeNull();
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "nope"],
    ["an array", []],
    ["an error envelope", { error: "Failed to fetch credit balance" }],
    ["balance as a number", { balance: 5 }],
  ])("returns null for %s", (_d, input) => {
    expect(parseBalance(input)).toBeNull();
  });

  it("tolerates a missing periodEnd, which nothing renders yet", () => {
    const parsed = parseBalance(routeResponse({ periodEnd: undefined }));
    expect(parsed).not.toBeNull();
    expect(parsed?.periodEnd).toBe("");
  });
});
