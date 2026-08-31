/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * plaidService.listConnections and .removeConnection
 *
 * Disconnecting a bank is the one operation in this app where doing half of it
 * and reporting success is worse than failing outright, so these tests are
 * mostly about ORDER and about what is NOT done.
 *
 * The rule: Plaid's /item/remove is what actually ends the consent; deleting
 * our rows only ends our knowledge of it. So the remote call goes first, and
 * local deletion happens only when the consent is provably gone. If Plaid
 * refuses and we deleted anyway, the user would believe their bank was
 * disconnected while the connection kept running — and we would have thrown
 * away the credential needed to ever revoke it.
 *
 * The single exception is Plaid's documented INVALID_ACCESS_TOKEN
 * (https://plaid.com/docs/errors/invalid-input/ — "could not find matching
 * access token"), which means the Item is already gone. /item/remove documents
 * no error codes and says nothing about being called twice, so that is the
 * only code we are entitled to read as "already revoked".
 */

process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";
process.env.BANK_TOKEN_ENCRYPTION_KEY = "k".repeat(48);

// ---------------------------------------------------------------------------
// Supabase mock — records every operation in call order so the tests can
// assert that the Plaid call happened before any delete.
// ---------------------------------------------------------------------------
const trace: string[] = [];

/** Per-table queued results, consumed in order. */
let results: Record<string, Array<{ data: any; error: any }>> = {};
/** Filters recorded per table, so ownership scoping is assertable. */
let filters: Record<string, Array<Record<string, unknown>>> = {};

function makeChain(table: string) {
  const applied: Record<string, unknown> = {};
  let verb = "select";

  const settle = () => {
    const queue = results[table] ?? [];
    return queue.shift() ?? { data: null, error: null };
  };

  const chain: any = {
    select: (..._a: unknown[]) => chain,
    update: (..._a: unknown[]) => {
      verb = "update";
      return chain;
    },
    delete: () => {
      verb = "delete";
      trace.push(`delete:${table}`);
      return chain;
    },
    eq: (column: string, value: unknown) => {
      applied[column] = value;
      return chain;
    },
    order: () => chain,
    maybeSingle: async () => {
      filters[table] = [...(filters[table] ?? []), { ...applied }];
      trace.push(`${verb}:${table}`);
      return settle();
    },
    single: async () => {
      filters[table] = [...(filters[table] ?? []), { ...applied }];
      trace.push(`${verb}:${table}`);
      return settle();
    },
    then: (resolve: any) => {
      filters[table] = [...(filters[table] ?? []), { ...applied }];
      if (verb !== "delete") trace.push(`${verb}:${table}`);
      return resolve(settle());
    },
  };
  return chain;
}

const mockRpc = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ from: (t: string) => makeChain(t) }),
}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (t: string) => makeChain(t),
    rpc: (...a: unknown[]) => mockRpc(...a),
  }),
}));

const mockItemRemove = jest.fn();
jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({ itemRemove: mockItemRemove }),
}));

import { plaidService } from "../plaid-service";

const USER = "user-a";
const CONNECTION = "conn-1";
const ITEM = "item-abc";

/** An axios-shaped Plaid API error, which is how the SDK surfaces one. */
function plaidApiError(code: string) {
  return Object.assign(new Error(`Request failed with status code 400`), {
    response: { status: 400, data: { error_code: code, error_type: "INVALID_INPUT" } },
  });
}

const CONNECTION_ROW = {
  id: CONNECTION,
  provider: "plaid",
  item_id: ITEM,
  institution_id: "ins_109508",
  institution_name: "First Platypus Bank",
  error_code: null,
  error_message: null,
  consent_expiration_time: null,
  created_at: "2026-08-01T10:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  trace.length = 0;
  results = {};
  filters = {};
  mockRpc.mockResolvedValue({ data: "access-token-live", error: null });
  mockItemRemove.mockResolvedValue({ data: { request_id: "req-1" } });
});

describe("listConnections", () => {
  it("returns an empty list, and asks for no accounts, when nothing is linked", async () => {
    results = { bank_connections: [{ data: [], error: null }] };
    await expect(plaidService.listConnections(USER)).resolves.toEqual([]);
    expect(trace).not.toContain("select:financial_accounts");
  });

  it("scopes both queries to the caller", async () => {
    results = {
      bank_connections: [{ data: [CONNECTION_ROW], error: null }],
      financial_accounts: [{ data: [], error: null }],
    };
    await plaidService.listConnections(USER);
    expect(filters.bank_connections[0]).toEqual({ user_id: USER });
    expect(filters.financial_accounts[0]).toEqual({ user_id: USER });
  });

  it("groups accounts under the connection they came from", async () => {
    const other = { ...CONNECTION_ROW, id: "conn-2", item_id: "item-xyz" };
    results = {
      bank_connections: [{ data: [CONNECTION_ROW, other], error: null }],
      financial_accounts: [
        {
          data: [
            account("acc-1", ITEM, "Plaid Checking"),
            account("acc-2", "item-xyz", "Other Savings"),
            account("acc-3", ITEM, "Plaid Saving"),
          ],
          error: null,
        },
      ],
    };

    const [first, second] = await plaidService.listConnections(USER);
    expect(first.accounts.map((a) => a.id)).toEqual(["acc-1", "acc-3"]);
    expect(second.accounts.map((a) => a.id)).toEqual(["acc-2"]);
  });

  it("carries the real last_synced through, never a relative guess", async () => {
    results = {
      bank_connections: [{ data: [CONNECTION_ROW], error: null }],
      financial_accounts: [
        { data: [account("acc-1", ITEM, "Plaid Checking")], error: null },
      ],
    };
    const [connection] = await plaidService.listConnections(USER);
    expect(connection.accounts[0].lastSynced).toBe("2026-08-17T09:00:00.000Z");
  });

  it("reports a connection with no webhook complaints as active", async () => {
    results = {
      bank_connections: [{ data: [CONNECTION_ROW], error: null }],
      financial_accounts: [{ data: [], error: null }],
    };
    const [connection] = await plaidService.listConnections(USER);
    expect(connection.status).toBe("active");
    expect(connection.errorCode).toBeNull();
  });

  it.each([
    ["error_code", "ITEM_LOGIN_REQUIRED"],
    ["consent_expiration_time", "2026-09-01T00:00:00.000Z"],
  ])(
    "reports needs_attention when Plaid set %s",
    async (column, value) => {
      results = {
        bank_connections: [
          { data: [{ ...CONNECTION_ROW, [column]: value }], error: null },
        ],
        financial_accounts: [{ data: [], error: null }],
      };
      const [connection] = await plaidService.listConnections(USER);
      expect(connection.status).toBe("needs_attention");
    },
  );

  it("leaves an unresolved institution null rather than naming a bank", async () => {
    results = {
      bank_connections: [
        {
          data: [
            { ...CONNECTION_ROW, institution_id: null, institution_name: null },
          ],
          error: null,
        },
      ],
      financial_accounts: [{ data: [], error: null }],
    };
    const [connection] = await plaidService.listConnections(USER);
    expect(connection.institutionName).toBeNull();
    expect(connection.institutionId).toBeNull();
  });

  it("throws rather than returning a plausible empty list on a db error", async () => {
    results = {
      bank_connections: [{ data: null, error: { message: "db down" } }],
    };
    await expect(plaidService.listConnections(USER)).rejects.toThrow(
      /Failed to fetch bank connections/,
    );
  });
});

describe("removeConnection", () => {
  /** Queue: connection lookup hit, accounts delete ok, connection delete ok. */
  function happyPath() {
    results = {
      bank_connections: [
        { data: CONNECTION_ROW, error: null },
        { data: null, error: null },
      ],
      financial_accounts: [{ data: null, error: null }],
    };
  }

  it("looks the connection up scoped to BOTH the id and the caller", async () => {
    happyPath();
    await plaidService.removeConnection(CONNECTION, USER);
    expect(filters.bank_connections[0]).toEqual({
      id: CONNECTION,
      user_id: USER,
    });
  });

  describe("when the connection is not the caller's", () => {
    beforeEach(() => {
      results = { bank_connections: [{ data: null, error: null }] };
    });

    it("reports not_found, which the route turns into 404 rather than 403", async () => {
      await expect(
        plaidService.removeConnection(CONNECTION, USER),
      ).resolves.toEqual({ outcome: "not_found" });
    });

    it("never decrypts a credential or calls Plaid", async () => {
      await plaidService.removeConnection(CONNECTION, USER);
      expect(mockRpc).not.toHaveBeenCalled();
      expect(mockItemRemove).not.toHaveBeenCalled();
    });
  });

  it("revokes at Plaid BEFORE deleting anything locally", async () => {
    happyPath();
    await plaidService.removeConnection(CONNECTION, USER);

    // The whole design in one assertion: nothing local is destroyed until the
    // consent is provably gone.
    expect(trace).toEqual([
      "select:bank_connections",
      "delete:financial_accounts",
      "delete:bank_connections",
    ]);
    expect(mockItemRemove).toHaveBeenCalledWith({
      access_token: "access-token-live",
    });
  });

  it("deletes accounts before the connection", async () => {
    happyPath();
    await plaidService.removeConnection(CONNECTION, USER);
    // Reverse order would strand accounts whose connection row is gone —
    // visible forever, with nothing left to delete them by.
    expect(trace.indexOf("delete:financial_accounts")).toBeLessThan(
      trace.indexOf("delete:bank_connections"),
    );
  });

  it("deletes exactly the accounts of that connection, for that user", async () => {
    happyPath();
    await plaidService.removeConnection(CONNECTION, USER);
    expect(filters.financial_accounts[0]).toEqual({
      user_id: USER,
      provider: "plaid",
      item_id: ITEM,
    });
  });

  it("returns removed on success", async () => {
    happyPath();
    await expect(
      plaidService.removeConnection(CONNECTION, USER),
    ).resolves.toEqual({ outcome: "removed" });
  });

  describe("when Plaid refuses", () => {
    beforeEach(() => {
      happyPath();
      mockItemRemove.mockRejectedValue(plaidApiError("PLANNED_MAINTENANCE"));
    });

    it("deletes NOTHING", async () => {
      await plaidService.removeConnection(CONNECTION, USER);
      expect(trace).toEqual(["select:bank_connections"]);
    });

    it("reports provider_error so the caller can retry", async () => {
      const result = await plaidService.removeConnection(CONNECTION, USER);
      expect(result.outcome).toBe("provider_error");
    });
  });

  describe("when a transport failure gives no Plaid error body", () => {
    beforeEach(() => {
      happyPath();
      mockItemRemove.mockRejectedValue(new Error("ETIMEDOUT"));
    });

    it("is treated as a live connection, not a revoked one", async () => {
      // A timeout tells us nothing about whether Plaid processed the removal.
      // Assuming success here is how a live consent gets orphaned.
      const result = await plaidService.removeConnection(CONNECTION, USER);
      expect(result.outcome).toBe("provider_error");
      expect(trace).toEqual(["select:bank_connections"]);
    });
  });

  describe("when the credential cannot be decrypted", () => {
    beforeEach(() => {
      happyPath();
      mockRpc.mockResolvedValue({ data: null, error: { message: "binding mismatch" } });
    });

    it("deletes NOTHING and never calls Plaid", async () => {
      // A decrypt failure cannot tell "this ciphertext is corrupt" apart from
      // "BANK_TOKEN_ENCRYPTION_KEY is mis-set right now". The second fails for
      // every connection at once, so deleting on it would wipe every user's
      // bank linkage over one wrong environment variable.
      await plaidService.removeConnection(CONNECTION, USER);
      expect(trace).toEqual(["select:bank_connections"]);
      expect(mockItemRemove).not.toHaveBeenCalled();
    });

    it("is reported as credential_error, not provider_error", async () => {
      // The route turns provider_error into "please try again". Retrying will
      // never fix a missing credential, so the two must not collapse.
      const result = await plaidService.removeConnection(CONNECTION, USER);
      expect(result.outcome).toBe("credential_error");
    });
  });

  describe("when Plaid says the token matches no Item", () => {
    beforeEach(() => {
      happyPath();
      mockItemRemove.mockRejectedValue(plaidApiError("INVALID_ACCESS_TOKEN"));
    });

    it("finishes the local cleanup, because the consent is already gone", async () => {
      const result = await plaidService.removeConnection(CONNECTION, USER);
      expect(result).toEqual({ outcome: "removed" });
      expect(trace).toEqual([
        "select:bank_connections",
        "delete:financial_accounts",
        "delete:bank_connections",
      ]);
    });
  });

  it("refuses to report success when the consent is gone but cleanup failed", async () => {
    // Divergent state. Saying "removed" would leave accounts on screen for a
    // bank that is no longer connected, and nothing would ever explain it.
    results = {
      bank_connections: [{ data: CONNECTION_ROW, error: null }],
      financial_accounts: [{ data: null, error: { message: "deadlock" } }],
    };
    await expect(
      plaidService.removeConnection(CONNECTION, USER),
    ).rejects.toThrow(/revoked at the provider/);
  });
});

function account(id: string, itemId: string, name: string) {
  return {
    id,
    provider: "plaid",
    item_id: itemId,
    account_name: name,
    account_type: "depository",
    account_subtype: "checking",
    mask: "0000",
    current_balance: 110,
    currency: "USD",
    last_synced: "2026-08-17T09:00:00.000Z",
  };
}
