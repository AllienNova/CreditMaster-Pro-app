/** @jest-environment node */

/**
 * Daily financial snapshot producer.
 *
 * Five trend tables had no writer at all, so the charts they feed could never
 * show a line. These tests pin the three properties that make the producer
 * trustworthy rather than merely present:
 *
 *   1. it upserts on the day key, so re-running does not duplicate a point
 *   2. a failed READ aborts that user's snapshot instead of writing a zero —
 *      a fabricated data point in a chart is worse than a missing one
 *   3. one user's failure does not cost every later user their snapshot, and
 *      the run reports 207 instead of a clean 200
 */

const mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// The real comparison runs. Mocking timingSafeEqual to return true meant these
// tests never exercised the auth path — and once the gate stopped being skipped
// outside production, all five 401'd, which is how the mock's uselessness
// surfaced. A test that mocks the gate it depends on proves nothing about it.
const CRON_SECRET = "test-cron-secret-value";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.CRON_SECRET = CRON_SECRET;

import { GET } from "../financial-snapshots/route";
import { createClient } from "@supabase/supabase-js";

/** Thenable chain: resolves to `result` however the query is terminated. */
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte", "range", "upsert"]) {
    c[m] = jest.fn(() => c);
  }
  c.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(ok, bad);
  return c;
}

const NO_ROWS = { data: [], error: null };

interface TableOverrides {
  [table: string]: { data: unknown; error: unknown };
}

/** One profile by default, so exactly one user is snapshotted. */
function wire(overrides: TableOverrides = {}, profiles = [{ id: "u1" }]) {
  const upserts: Record<string, jest.Mock> = {};

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      // Second page empty so the batch loop terminates.
      const c = chain({ data: profiles, error: null });
      (c.range as jest.Mock).mockImplementationOnce(() => c);
      return c;
    }
    const c = chain(overrides[table] ?? NO_ROWS);
    upserts[table] = c.upsert as jest.Mock;
    return c;
  });

  return upserts;
}

function req(authorization = `Bearer ${CRON_SECRET}`) {
  return new Request("http://localhost:3000/api/cron/financial-snapshots", {
    headers: { authorization },
  });
}

describe("cron: financial snapshots", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReset();
    // jest.config sets resetMocks, which wipes a factory mock's
    // implementation between tests — createClient would return undefined and
    // the route would 500 for a reason that has nothing to do with the code
    // under test. Re-applied here; this is the codebase's established idiom
    // for that gotcha.
    (createClient as jest.Mock).mockImplementation(() => ({ from: mockFrom }));
  });

  it("writes all five trend series for a user", async () => {
    const upserts = wire();

    const res = await GET(req());
    expect(res.status).toBe(200);

    for (const table of [
      "net_worth_history",
      "savings_history",
      "debt_history",
      "investment_history",
      "monthly_summaries",
    ]) {
      expect(upserts[table]).toHaveBeenCalled();
    }
  });

  it("upserts on the day key so a re-run cannot duplicate a point", async () => {
    // The whole series is only meaningful if one day maps to one row. Without
    // an onConflict target, a retried cron silently corrupts the chart.
    const upserts = wire();
    await GET(req());

    expect(upserts.net_worth_history).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1" }),
      { onConflict: "user_id,date" },
    );
    expect(upserts.monthly_summaries).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1" }),
      { onConflict: "user_id,month" },
    );
  });

  it("computes net worth as assets plus investments minus liabilities", async () => {
    const upserts = wire({
      financial_accounts: {
        data: [
          { current_balance: 1000, account_type: "depository" },
          { current_balance: 500, account_type: "credit" },
        ],
        error: null,
      },
      debt_accounts: { data: [{ balance: 400 }], error: null },
      investment_holdings: { data: [{ current_value: 250 }], error: null },
    });

    await GET(req());

    expect(upserts.net_worth_history).toHaveBeenCalledWith(
      expect.objectContaining({
        total_assets: 1750, // 1000 + 500 + 250
        total_liabilities: 400,
        net_worth: 1350,
      }),
      expect.anything(),
    );
    // savings is depository only — not every asset, or the series would just
    // duplicate net worth.
    expect(upserts.savings_history).toHaveBeenCalledWith(
      expect.objectContaining({ total_saved: 1000 }),
      expect.anything(),
    );
  });

  it("does NOT write a fabricated zero when a source read fails", async () => {
    // The failure mode this whole wave exists to remove: a broken query
    // resolving to 0 and being persisted as a real data point.
    wire({
      debt_accounts: { data: null, error: { message: "permission denied" } },
    });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(207);
    expect(body.failures).toBe(1);
    expect(body.snapshots).toBe(0);

    // Assert the history table was never REQUESTED. Checking an upsert spy
    // would be meaningless here: the spy only comes into existence when
    // mockFrom is called for that table, so a table that was correctly never
    // touched has no spy to assert against.
    const tablesTouched = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesTouched).not.toContain("net_worth_history");
    expect(tablesTouched).not.toContain("debt_history");
  });

  it("keeps going after one user fails, and reports 207 rather than a clean 200", async () => {
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        const c = chain({ data: [{ id: "u1" }, { id: "u2" }], error: null });
        (c.range as jest.Mock).mockImplementationOnce(() => c);
        return c;
      }
      if (table === "financial_accounts") {
        call++;
        // First user's read fails; the second user's succeeds.
        return chain(
          call === 1
            ? { data: null, error: { message: "transient" } }
            : NO_ROWS,
        );
      }
      return chain(NO_ROWS);
    });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(207);
    expect(body.users).toBe(2);
    expect(body.snapshots).toBe(1);
    expect(body.failures).toBe(1);
    expect(body.success).toBe(false);
    expect(body.errors[0].userId).toBe("u1");
  });

  describe("authorization", () => {
    // The gate used to run only when NODE_ENV === "production", so every
    // non-production deploy served this route to anyone. These assert the gate
    // holds in the test environment, which is the point of removing that guard.
    it("rejects a request with no authorization header", async () => {
      wire();
      expect((await GET(req(""))).status).toBe(401);
    });

    it("rejects a wrong secret", async () => {
      wire();
      expect((await GET(req("Bearer not-the-secret"))).status).toBe(401);
    });

    it("rejects 'Bearer undefined' — the string an unset CRON_SECRET produced", async () => {
      wire();
      expect((await GET(req("Bearer undefined"))).status).toBe(401);
    });

    it("rejects every caller when CRON_SECRET is unset, rather than opening up", async () => {
      wire();
      delete process.env.CRON_SECRET;
      try {
        expect((await GET(req("Bearer undefined"))).status).toBe(401);
      } finally {
        process.env.CRON_SECRET = CRON_SECRET;
      }
    });

    it("does not touch the database when authorization fails", async () => {
      wire();
      await GET(req("Bearer not-the-secret"));
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
