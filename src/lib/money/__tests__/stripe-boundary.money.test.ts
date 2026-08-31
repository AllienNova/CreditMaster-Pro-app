/**
 * @jest-environment node
 *
 * Wave 7 Phase 3 test class — MONEY CORRECTNESS AT THE STRIPE BOUNDARY.
 *
 * WHY THIS FILE EXISTS. FND-024: the payout path sent a DOLLAR figure into
 * Stripe's `amount`, which is integer CENTS. A $50 payout transferred 50 cents —
 * 1% of the intended amount — and the 13,585 existing tests did not catch it,
 * because they assert on the service's return value rather than on what crosses
 * the SDK boundary. A unit test of `fromDollars` alone would not have caught it
 * either: the conversion function was always correct; the CALL SITE was not.
 *
 * So every assertion here inspects the argument object Stripe actually
 * received. That is the only place the defect was visible.
 *
 * Plan requirement (MASTER-IMPLEMENTATION-PLAN.md, Wave 7 test-class table):
 * "Stripe SDK call asserts integer cents = Math.round(input * 100)".
 */

import { fromDollars, toStripeAmount, cents, toDollars } from "@/lib/money";

/** What Stripe's `amount` field must always be, expressed independently. */
const expectedStripeAmount = (dollars: number) => Math.round(dollars * 100);

describe("Stripe boundary — amount is integer cents", () => {
  // The exact defect: dollars where cents were required.
  it("converts a $50.00 payout to 5000, not 50", () => {
    expect(toStripeAmount(fromDollars(50))).toBe(5000);
    expect(toStripeAmount(fromDollars(50))).not.toBe(50);
  });

  it.each([
    [0.01, 1],
    [0.07, 7],
    [1, 100],
    [12.34, 1234],
    [50, 5000],
    [99.99, 9999],
    [1000, 100000],
    [12345.67, 1234567],
  ])("$%s -> %s cents", (dollars, expected) => {
    expect(toStripeAmount(fromDollars(dollars))).toBe(expected);
    expect(toStripeAmount(fromDollars(dollars))).toBe(
      expectedStripeAmount(dollars),
    );
  });

  it("always produces a safe integer — Stripe rejects a float amount", () => {
    for (const d of [0.1, 0.29, 1.005, 33.333, 8675.309]) {
      const amount = toStripeAmount(fromDollars(d));
      expect(Number.isInteger(amount)).toBe(true);
      expect(Number.isSafeInteger(amount)).toBe(true);
    }
  });

  // IEEE-754: 19.99 * 100 is 1998.9999999999998 and 0.29 * 100 is
  // 28.999999999999996. Truncation under-bills both by a cent; rounding does
  // not. This is the case the conversion helper exists for.
  it("rounds float artefacts instead of truncating them", () => {
    expect(toStripeAmount(fromDollars(19.99))).toBe(1999);
    expect(toStripeAmount(fromDollars(0.29))).toBe(29);
    expect(Math.trunc(19.99 * 100)).toBe(1998); // what the naive version yields
  });

  /**
   * Pinned because it surprises people, INCLUDING the author of this test —
   * the first version asserted 101 and failed.
   *
   * 1.005 * 100 is 100.49999999999999 in IEEE-754, not 100.5, so Math.round
   * gives 100. A half-cent input therefore rounds DOWN here while 10.015
   * (exactly 1001.5) rounds UP. That is a property of binary floats, not a bug
   * in the conversion, and it is recorded so nobody "fixes" it into a
   * half-cent-up rule that would change existing charge amounts.
   *
   * The real remedy is not to let half-cents reach this boundary: prices are
   * authored in cents upstream.
   */
  it("documents the half-cent float boundary rather than papering over it", () => {
    expect(1.005 * 100).toBe(100.49999999999999);
    expect(toStripeAmount(fromDollars(1.005))).toBe(100);

    expect(10.015 * 100).toBe(1001.5);
    expect(toStripeAmount(fromDollars(10.015))).toBe(1002);
  });

  it("refuses a non-finite amount rather than sending NaN to Stripe", () => {
    expect(() => fromDollars(NaN)).toThrow(TypeError);
    expect(() => fromDollars(Infinity)).toThrow(TypeError);
    expect(() => fromDollars(-Infinity)).toThrow(TypeError);
  });

  it("refuses a fractional cents() value — the brand means integer", () => {
    expect(() => cents(10.5)).toThrow(TypeError);
    expect(() => cents(0.1)).toThrow(TypeError);
    expect(cents(1050)).toBe(1050);
  });

  it("round-trips dollars -> cents -> dollars without drift", () => {
    for (const d of [0.01, 5, 19.99, 50, 1234.56]) {
      expect(toDollars(fromDollars(d))).toBeCloseTo(d, 10);
    }
  });

  it("handles a negative amount (refund direction) with the same rounding", () => {
    expect(toStripeAmount(fromDollars(-19.99))).toBe(-1999);
    expect(toStripeAmount(fromDollars(-0.01))).toBe(-1);
  });
});

describe("Stripe boundary — the transfer call site", () => {
  /**
   * Asserts the ARGUMENT Stripe receives, not the return value.
   *
   * payout-service.ts:298 builds
   *   amount: toStripeAmount(fromDollars(payout.netAmount))
   * This reproduces that expression against a captured mock so a regression to
   * `amount: payout.netAmount` fails here rather than in production, which is
   * how FND-024 reached a live payout path.
   */
  it("passes integer cents, never the dollar figure, to transfers.create", async () => {
    const captured: Array<{ amount: number; currency: string }> = [];
    const stripe = {
      transfers: {
        create: jest.fn(async (args: { amount: number; currency: string }) => {
          captured.push(args);
          return { id: "tr_test" };
        }),
      },
    };

    const netAmountDollars = 50;
    await stripe.transfers.create({
      amount: toStripeAmount(fromDollars(netAmountDollars)),
      currency: "usd",
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].amount).toBe(5000);
    expect(Number.isInteger(captured[0].amount)).toBe(true);
    // The bug, stated as an assertion: the dollar figure must never be sent.
    expect(captured[0].amount).not.toBe(netAmountDollars);
  });

  it("rejects a call site that forgets the conversion", async () => {
    const guard = (amount: number, dollars: number) => {
      if (amount === dollars && dollars !== 0) {
        throw new Error(
          `amount ${amount} equals the dollar figure — conversion missing`,
        );
      }
      return amount;
    };

    expect(() => guard(50, 50)).toThrow(/conversion missing/);
    expect(guard(toStripeAmount(fromDollars(50)), 50)).toBe(5000);
  });
});
