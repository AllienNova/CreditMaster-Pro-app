/**
 * @jest-environment node
 */

/**
 * normalizeAccountType — SF-14
 *
 * This mapping decides which side of the balance sheet an account lands on.
 * The version it replaces validated Plaid's `account_type` against a list that
 * did not contain `depository` — the value Plaid actually sends, and the one
 * financial_accounts stores per the column comment in 20260731000006. Every
 * checking and savings account therefore normalised to "other", and since
 * fetchAccounts buckets by the normalised value, `checking` and `savings` were
 * always empty and totalAssets counted investments alone.
 *
 * Credit and loan mapped correctly, so totalLiabilities stayed right. That is
 * what made the bug quiet and one-directional: every user's net worth was
 * understated by their whole bank balance, and nothing looked obviously broken.
 */

import { normalizeAccountType } from "../financial-aggregation-service";

describe("normalizeAccountType", () => {
  describe("depository splits by subtype", () => {
    it("maps a savings subtype to savings", () => {
      expect(normalizeAccountType("depository", "savings")).toBe("savings");
    });

    it.each(["checking", "cd", "money market", "", "prepaid"])(
      "maps every other depository subtype (%j) to checking",
      (subtype) => {
        // Only "savings" is treated as savings. Everything else in a
        // depository account is spendable, so checking is the safe bucket —
        // and both are assets either way, so a misfile here cannot flip the
        // sign of net worth.
        expect(normalizeAccountType("depository", subtype)).toBe("checking");
      },
    );

    it("does NOT map depository to other, which is the whole bug", () => {
      expect(normalizeAccountType("depository", "checking")).not.toBe("other");
    });
  });

  describe("the types that always mapped correctly", () => {
    it.each([
      ["credit", "credit card"],
      ["loan", "student"],
      ["investment", "401k"],
    ])("maps %s through unchanged", (type, subtype) => {
      expect(normalizeAccountType(type, subtype)).toBe(type);
    });
  });

  describe("already-normalised names survive a round trip", () => {
    it.each(["checking", "savings"])(
      "keeps %j rather than demoting it to other",
      (type) => {
        expect(normalizeAccountType(type, "")).toBe(type);
      },
    );
  });

  describe("anything unrecognised stays other", () => {
    it.each(["other", "brokerage", "", "DEPOSITORY", "crypto"])(
      "maps %j to other",
      (type) => {
        // Deliberately NOT rounded into the nearest bucket. An unknown account
        // filed as checking would be counted as an asset; filed as loan, a
        // liability. "other" is excluded from both totals, which is the only
        // answer that cannot be wrong.
        expect(normalizeAccountType(type, "checking")).toBe("other");
      },
    );
  });

  it("agrees with the mobile mapping on every Plaid type", () => {
    // mobile-app/src/services/api/financial.ts:toMobileAccountType describes
    // the same rows for the same user. If these two drift, the phone and the
    // dashboard disagree about what the user owns.
    const cases: Array<[string, string, string]> = [
      ["depository", "checking", "checking"],
      ["depository", "savings", "savings"],
      ["credit", "credit card", "credit"],
      ["loan", "mortgage", "loan"],
      ["investment", "ira", "investment"],
      ["other", "", "other"],
    ];
    for (const [type, subtype, expected] of cases) {
      expect(normalizeAccountType(type, subtype)).toBe(expected);
    }
  });
});
