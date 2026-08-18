/**
 * The contract two marketplace pages read `features` through.
 *
 * These exist because the first monitoring rewrite treated the column as a
 * string array (`features?.includes("alerts")`) and crashed on the real jsonb
 * object. The fixtures below are copied from the seeded rows in migration
 * 20251218000000, not from an assumption about what the column ought to hold.
 */

import {
  PRICE_CADENCE,
  humanizeKey,
  describeFeature,
  readFeatures,
  listFeatures,
  readBureaus,
} from "../product-features";

/** migration 20251218000000:366 — 'Credit Repair Basic'. */
const CREDIT_REPAIR = {
  disputes_per_month: 5,
  bureaus: ["Experian", "Equifax", "TransUnion"],
  support: "email",
};

/** migration 20251218000000:426 — 'Credit Mastery Course'. */
const EDUCATION = {
  modules: 12,
  hours: 24,
  certificate: true,
  lifetime_access: true,
};

describe("readFeatures — the column default must not blow anything up", () => {
  it.each([
    ["the column default", {}],
    ["null", null],
    ["undefined", undefined],
    ["an array, which is not a feature object", ["alerts"]],
    ["a scalar", 7],
    ["a string", "alerts"],
  ])("returns an object for %s", (_label, raw) => {
    expect(readFeatures(raw)).toEqual(expect.any(Object));
    expect(Array.isArray(readFeatures(raw))).toBe(false);
  });

  it("passes a real object through", () => {
    expect(readFeatures(EDUCATION)).toEqual(EDUCATION);
  });
});

describe("humanizeKey", () => {
  it.each([
    ["disputes_per_month", "Disputes per month"],
    ["lifetime_access", "Lifetime access"],
    ["ai-letters", "Ai letters"],
    ["certificate", "Certificate"],
  ])("turns %s into %s", (key, expected) => {
    expect(humanizeKey(key)).toBe(expected);
  });
});

describe("describeFeature — absent is not false", () => {
  it("renders a true boolean as the bare label", () => {
    expect(describeFeature("certificate", true)).toBe("Certificate");
  });

  it("drops a false boolean rather than listing it as included", () => {
    // "Certificate: No" under a heading called Included reads as the opposite.
    expect(describeFeature("certificate", false)).toBeNull();
  });

  it.each([
    ["modules", 12, "Modules: 12"],
    ["support", "email", "Support: email"],
    ["disputes_per_month", "unlimited", "Disputes per month: unlimited"],
  ])("renders scalar %s", (key, value, expected) => {
    expect(describeFeature(key, value)).toBe(expected);
  });

  it("joins an array", () => {
    expect(describeFeature("bureaus", ["Experian", "Equifax"])).toBe(
      "Bureaus: Experian, Equifax",
    );
  });

  it.each([
    ["an empty array", []],
    ["an empty string", ""],
    ["a whitespace string", "   "],
    ["null", null],
    ["a nested object we cannot flatten honestly", { a: 1 }],
  ])("says nothing for %s", (_label, value) => {
    expect(describeFeature("thing", value)).toBeNull();
  });

  it("keeps a zero, which is a real declared quantity", () => {
    expect(describeFeature("disputes_per_month", 0)).toBe(
      "Disputes per month: 0",
    );
  });
});

describe("listFeatures", () => {
  it("lists what an education product declares", () => {
    expect(listFeatures(EDUCATION)).toEqual([
      "Modules: 12",
      "Hours: 24",
      "Certificate",
      "Lifetime access",
    ]);
  });

  it("omits keys the caller renders in its own column", () => {
    expect(listFeatures(CREDIT_REPAIR, { omit: ["bureaus"] })).toEqual([
      "Disputes per month: 5",
      "Support: email",
    ]);
  });

  it("returns an empty list for the column default", () => {
    expect(listFeatures({})).toEqual([]);
  });
});

describe("readBureaus — names, not a count", () => {
  it("reads the array the row actually stores", () => {
    expect(readBureaus(CREDIT_REPAIR)).toEqual([
      "Experian",
      "Equifax",
      "TransUnion",
    ]);
  });

  it.each([
    ["absent", EDUCATION],
    ["the column default", {}],
    ["an empty array", { bureaus: [] }],
    ["a number, which is not a list of names", { bureaus: 3 }],
  ])("returns null when bureaus is %s", (_label, raw) => {
    expect(readBureaus(raw)).toBeNull();
  });
});

describe("PRICE_CADENCE", () => {
  it("covers every price_type the CHECK constraint allows", () => {
    // migration 20251218000000:48 — CHECK (price_type IN (...))
    for (const type of ["one_time", "monthly", "yearly"]) {
      expect(PRICE_CADENCE[type]).toBeTruthy();
    }
  });
});
