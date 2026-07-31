/**
 * GDPRComplianceService.exportUserData — honest-failure coverage (Art. 15/20)
 *
 * exportUserData aggregates 5 independent queries (profile, credit reports,
 * disputes, AI interactions, audit logs). Before this fix every private
 * helper swallowed a genuine DB error and returned null/[] — indistinguishable
 * from "the user has no data." For a right-of-access export that is a
 * compliance-relevant misstatement, not just a bug: a transient permission or
 * connection failure on any one query would silently omit that category from
 * the user's own data export while still returning `success`.
 *
 * This file had zero prior coverage of exportUserData or its 5 private
 * helpers — confirmed by repo-wide grep before writing these tests.
 */

import { GDPRComplianceService, type DbClient } from "../gdpr-ccpa";

// Prevent supabaseAdmin import from crashing at module load (tests pass an
// explicit `db` to the constructor and never touch the singleton).
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { admin: { deleteUser: jest.fn() } },
  },
}));

type TableResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

/**
 * One thenable chain per table so exportUserData's two distinct call shapes
 * both resolve correctly off the same builder: profiles ends in `.single()`;
 * credit_reports/disputes/ai_interactions/audit_logs are awaited directly
 * after `.eq()` with no terminal call. See
 * feedback_thenable-mock-chain-for-postgrest.md.
 */
function makeThenableChain(result: TableResult): Record<string, unknown> {
  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    then: (
      onResolve: (v: TableResult) => unknown,
      onReject?: (r: unknown) => unknown,
    ) => Promise.resolve(result).then(onResolve, onReject),
  };
  return chain;
}

const DEFAULT_TABLES: Record<string, TableResult> = {
  profiles: {
    data: {
      id: "u1",
      email: "u1@test.com",
      name: "U1",
      phone: null,
      address: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    error: null,
  },
  credit_reports: { data: [], error: null },
  disputes: { data: [], error: null },
  ai_interactions: { data: [], error: null },
  audit_logs: { data: [], error: null },
};

function buildMockDb(overrides?: Record<string, TableResult>): DbClient {
  const tables: Record<string, TableResult> = { ...DEFAULT_TABLES, ...overrides };
  return {
    from: jest.fn((table: string) => makeThenableChain(tables[table])),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } },
  } as unknown as DbClient;
}

describe("GDPRComplianceService.exportUserData — Art. 15/20 honest failure", () => {
  it("aggregates all 5 categories on the happy path", async () => {
    const db = buildMockDb();
    const svc = new GDPRComplianceService(db);

    const result = await svc.exportUserData("u1", "json");

    expect(result.userId).toBe("u1");
    expect(result.data.profile).not.toBeNull();
    expect(result.data.profile?.email).toBe("u1@test.com");
    expect(result.data.creditReports).toEqual([]);
    expect(result.data.disputes).toEqual([]);
    expect(result.data.aiInteractions).toEqual([]);
    expect(result.data.logs).toEqual([]);
  });

  it("profiles PGRST116 (no row) resolves to a null profile, not a throw", async () => {
    const db = buildMockDb({
      profiles: { data: null, error: { code: "PGRST116", message: "no rows" } },
    });
    const svc = new GDPRComplianceService(db);

    const result = await svc.exportUserData("u1");
    expect(result.data.profile).toBeNull();
  });

  it("profiles resolving null data with no error also reports a null profile", async () => {
    // Defensive branch: `{ data: null, error: null }` shouldn't happen per the
    // postgrest-js contract for .single(), but if it ever does, it must still
    // be treated as "no profile" rather than crash the whole export.
    const db = buildMockDb({ profiles: { data: null, error: null } });
    const svc = new GDPRComplianceService(db);

    const result = await svc.exportUserData("u1");
    expect(result.data.profile).toBeNull();
  });

  it("a genuine profile query error throws instead of reporting no profile", async () => {
    const db = buildMockDb({
      profiles: {
        data: null,
        error: { code: "42501", message: "permission denied" },
      },
    });
    const svc = new GDPRComplianceService(db);

    await expect(svc.exportUserData("u1")).rejects.toThrow(
      "Failed to load profile for export: permission denied",
    );
  });

  it("a genuine credit_reports query error throws instead of reporting zero reports", async () => {
    const db = buildMockDb({
      credit_reports: { data: null, error: { message: "connection reset" } },
    });
    const svc = new GDPRComplianceService(db);

    await expect(svc.exportUserData("u1")).rejects.toThrow(
      "Failed to load credit reports for export: connection reset",
    );
  });

  it("a genuine disputes query error throws instead of reporting zero disputes", async () => {
    const db = buildMockDb({
      disputes: { data: null, error: { message: "timeout" } },
    });
    const svc = new GDPRComplianceService(db);

    await expect(svc.exportUserData("u1")).rejects.toThrow(
      "Failed to load disputes for export: timeout",
    );
  });

  it("a genuine ai_interactions query error throws instead of reporting zero interactions", async () => {
    const db = buildMockDb({
      ai_interactions: { data: null, error: { message: "relation missing" } },
    });
    const svc = new GDPRComplianceService(db);

    await expect(svc.exportUserData("u1")).rejects.toThrow(
      "Failed to load AI interactions for export: relation missing",
    );
  });

  it("a genuine audit_logs query error throws instead of reporting zero logs", async () => {
    const db = buildMockDb({
      audit_logs: { data: null, error: { message: "rate limited" } },
    });
    const svc = new GDPRComplianceService(db);

    await expect(svc.exportUserData("u1")).rejects.toThrow(
      "Failed to load audit logs for export: rate limited",
    );
  });
});
