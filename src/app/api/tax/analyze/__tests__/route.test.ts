/**
 * Tests for /api/tax/analyze
 *
 * Includes negative-auth coverage (TASK-AUTH-03f) plus regression coverage
 * for the `tax_accounts` phantom-table bug: that table was never migrated
 * (confirmed against the live schema — see `\d+ tax_profiles`), so the route
 * queried a relation that does not exist and silently swallowed the error
 * into `accounts: []`. These tests prove the route no longer queries
 * "tax_accounts" and surfaces the missing account-level data explicitly via
 * `accountLevelDataAvailable: false`.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
// supabaseAdmin as well as createClient. fetchTaxProfile moved off the
// cookie-scoped client — it 404'd/emptied for every bearer-token caller under
// RLS — so the profile read now goes through supabaseAdmin. The assertion these
// tests exist for is unchanged and still enforced: tax_accounts is a phantom
// table and must never be queried, whichever client does the querying.
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  supabaseAdmin: { from: jest.fn() },
}));
jest.mock("@/lib/tax", () => ({
  taxOptimizationEngine: {
    analyzeAndRecommend: jest.fn(),
    getDisclaimers: jest.fn(),
  },
}));

import { POST } from "../route";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";
import { taxOptimizationEngine } from "@/lib/tax";

const mockUser = { id: "user-123", email: "test@example.com" };

function createMockRequest(body?: Record<string, unknown>): NextRequest {
  const url = "http://localhost:3000/api/tax/analyze";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

// The real `tax_profiles` row shape (verified live: `\d+ tax_profiles`).
const mockTaxProfileRow = {
  id: "profile-1",
  user_id: "user-123",
  tax_year: 2026,
  filing_status: "single",
  state_of_residence: "CA",
  gross_income: 90000,
  w2_income: 90000,
  self_employment_income: 0,
  investment_income: 0,
  capital_gains_long_term: 0,
  capital_gains_short_term: 0,
  dependents_count: 0,
  is_self_employed: false,
  has_hdhp: false,
  ytd_401k_contribution: 5000,
  ytd_ira_contribution: 0,
  ytd_hsa_contribution: 0,
  optimization_goal: "balanced",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

interface QueryResult {
  data: unknown;
  error: unknown;
}

interface MockSupabaseClient {
  from: jest.Mock;
}

/**
 * Branches on table name exactly like the real PostgREST client: a call
 * against "tax_accounts" resolves the way Postgres actually responds to a
 * query against a relation that was never migrated (`42P01
 * undefined_table`), rather than a happy-path empty array. Pre-fix code
 * destructured that error away and produced `accounts: []`; post-fix code
 * never issues this call at all.
 */
function buildMockClient(profileResult: QueryResult): MockSupabaseClient {
  const profileChain = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn().mockResolvedValue(profileResult),
  };
  profileChain.select.mockReturnValue(profileChain);
  profileChain.eq.mockReturnValue(profileChain);

  const accountsChain = {
    select: jest.fn(),
    eq: jest.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'relation "public.tax_accounts" does not exist',
        code: "42P01",
      },
    }),
  };
  accountsChain.select.mockReturnValue(accountsChain);

  const from = jest.fn((table: string) =>
    table === "tax_accounts" ? accountsChain : profileChain,
  );

  return { from };
}

describe("negative-auth – /api/tax/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    const res = await POST(createMockRequest());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/tax/analyze – tax_accounts regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    (taxOptimizationEngine.analyzeAndRecommend as jest.Mock).mockResolvedValue(
      { recommendations: [] },
    );
    (taxOptimizationEngine.getDisclaimers as jest.Mock).mockReturnValue([
      "Informational only.",
    ]);
  });

  it("never queries the phantom tax_accounts table for a stored profile", async () => {
    const client = buildMockClient({ data: mockTaxProfileRow, error: null });
    (createClient as jest.Mock).mockResolvedValue(client);
    (supabaseAdmin.from as jest.Mock).mockImplementation(client.from);

    const response = await POST(createMockRequest({ taxYear: 2026 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith("tax_profiles");
    expect(client.from).not.toHaveBeenCalledWith("tax_accounts");
    expect(body.metadata.accountLevelDataAvailable).toBe(false);
    expect(body.metadata.profileComplete).toBe(false);

    const [, profileArg] = (
      taxOptimizationEngine.analyzeAndRecommend as jest.Mock
    ).mock.calls[0];
    expect(profileArg.accounts).toEqual([]);
    expect(profileArg.ytd401kContribution).toBe(5000);
  });

  it("never queries tax_accounts when no stored profile exists", async () => {
    const client = buildMockClient({
      data: null,
      error: { message: "no rows", code: "PGRST116" },
    });
    (createClient as jest.Mock).mockResolvedValue(client);
    (supabaseAdmin.from as jest.Mock).mockImplementation(client.from);

    const response = await POST(
      createMockRequest({ taxYear: 2026, grossIncome: 80000 }),
    );

    expect(response.status).toBe(200);
    expect(client.from).not.toHaveBeenCalledWith("tax_accounts");
  });
});
