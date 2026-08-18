/**
 * flattenConnectionsToAccounts and toMobileAccountType
 *
 * The mobile UI models five account types; Plaid has a different five, and
 * splits `depository` by subtype. Getting that mapping wrong is not cosmetic —
 * a loan filed as "checking" is counted as an asset by every balance sum in
 * the app, so the user's net worth goes up when they take on debt.
 *
 * The flattening exists so that institutionName and isConnected come from the
 * CONNECTION. Neither is answerable from an account row: financial_accounts
 * .institution_name held the ACCOUNT's name until the sync path was fixed, and
 * nothing on an account says whether its bank connection is healthy.
 */

import {
  flattenConnectionsToAccounts,
  toMobileAccountType,
  type BankConnection,
} from "../financial";

function connection(overrides: Partial<BankConnection> = {}): BankConnection {
  return {
    id: "conn-1",
    provider: "plaid",
    institutionId: "ins_109508",
    institutionName: "First Platypus Bank",
    status: "active",
    errorCode: null,
    errorMessage: null,
    consentExpiresAt: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    accounts: [],
    ...overrides,
  };
}

function account(overrides: Partial<BankConnection["accounts"][number]> = {}) {
  return {
    id: "acc-1",
    accountName: "Plaid Checking",
    accountType: "depository",
    accountSubtype: "checking",
    mask: "0000",
    currentBalance: 110,
    currency: "USD",
    lastSynced: "2026-08-17T09:00:00.000Z",
    ...overrides,
  };
}

describe("toMobileAccountType", () => {
  it.each([
    ["depository", "checking", "checking"],
    ["depository", "savings", "savings"],
    ["depository", "cd", "checking"],
    ["depository", "", "checking"],
    ["credit", "credit card", "credit"],
    ["loan", "student", "loan"],
    ["investment", "401k", "investment"],
  ])("maps %s/%s to %s", (type, subtype, expected) => {
    expect(toMobileAccountType(type, subtype)).toBe(expected);
  });

  it.each(["other", "brokerage", "", "DEPOSITORY"])(
    "maps the unrecognised %j to other rather than guessing",
    (type) => {
      // Rounding an unknown type into one of the five would silently file it
      // as an asset or a liability. "other" is excluded from both.
      expect(toMobileAccountType(type, "")).toBe("other");
    },
  );
});

describe("flattenConnectionsToAccounts", () => {
  it("returns nothing for no connections", () => {
    expect(flattenConnectionsToAccounts([])).toEqual([]);
  });

  it("returns nothing for a connection whose accounts have not synced", () => {
    expect(flattenConnectionsToAccounts([connection()])).toEqual([]);
  });

  it("flattens accounts across every connection, in order", () => {
    const result = flattenConnectionsToAccounts([
      connection({ accounts: [account({ id: "a" }), account({ id: "b" })] }),
      connection({ id: "conn-2", accounts: [account({ id: "c" })] }),
    ]);
    expect(result.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("takes institutionName from the connection", () => {
    const [mapped] = flattenConnectionsToAccounts([
      connection({
        institutionName: "Chase",
        accounts: [account({ accountName: "Plaid Checking" })],
      }),
    ]);
    expect(mapped.institutionName).toBe("Chase");
    expect(mapped.accountName).toBe("Plaid Checking");
  });

  it("uses an empty institution name when the connection has none", () => {
    // Null is what the route sends when Plaid could not resolve the
    // institution. Empty is the honest render; a plausible bank name is not.
    const [mapped] = flattenConnectionsToAccounts([
      connection({ institutionName: null, accounts: [account()] }),
    ]);
    expect(mapped.institutionName).toBe("");
  });

  it("derives isConnected from the connection's status", () => {
    const [healthy] = flattenConnectionsToAccounts([
      connection({ accounts: [account()] }),
    ]);
    const [broken] = flattenConnectionsToAccounts([
      connection({ status: "needs_attention", accounts: [account()] }),
    ]);
    expect(healthy.isConnected).toBe(true);
    expect(broken.isConnected).toBe(false);
  });

  it("carries the real balance and sync time through unchanged", () => {
    const [mapped] = flattenConnectionsToAccounts([
      connection({
        accounts: [
          account({ currentBalance: 1234.56, lastSynced: "2026-08-16T00:00:00.000Z" }),
        ],
      }),
    ]);
    expect(mapped.balance).toBe(1234.56);
    expect(mapped.lastSynced).toBe("2026-08-16T00:00:00.000Z");
  });

  it("fills both the field and its alias, which the UI reads interchangeably", () => {
    const [mapped] = flattenConnectionsToAccounts([
      connection({
        accounts: [
          account({ accountName: "Savings", accountSubtype: "savings" }),
        ],
      }),
    ]);
    expect(mapped.name).toBe(mapped.accountName);
    expect(mapped.type).toBe(mapped.accountType);
    expect(mapped.type).toBe("savings");
  });
});
