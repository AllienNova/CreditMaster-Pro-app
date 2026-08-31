/**
 * Tests for /api/financial/tax/retirement
 *
 * Regression coverage for the `tax_accounts` phantom-table bug: that table
 * was never migrated (confirmed against the live schema — see
 * `\d+ tax_profiles`), so the route queried a relation that does not exist,
 * the error was destructured away without even being read, and the route
 * silently returned `accounts: []` as if every user had zero retirement
 * accounts. These tests prove the route:
 *   1. never queries "tax_accounts" any more,
 *   2. sources YTD 401k/IRA/HSA contributions directly off the real
 *      `tax_profiles` row (the only place they exist),
 *   3. surfaces the missing account-level data explicitly via
 *      `accountLevelDataAvailable: false` instead of a silent empty array,
 *   4. still 404s (not a false-success) when the profile itself can't be
 *      read.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
// Auto-mocked, plus an explicit supabaseAdmin: this route's local copies of
// fetchTaxProfile / mapDatabaseToProfile were deleted in favour of the shared
// tax-profile-repository, which reads through supabaseAdmin because the
// cookie-scoped client returned nothing for bearer-token callers under RLS.
// The assertions below are unchanged — including the phantom tax_accounts
// regression, which must hold whichever client performs the read.
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  supabaseAdmin: { from: jest.fn() },
}));

import { GET, POST } from "../route";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";

const mockUser = { id: "user-123", email: "test@example.com" };

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body ?? {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

// The real `tax_profiles` row shape (verified live: `\d+ tax_profiles`).
// Notably absent vs. what the route used to assume: any per-account table,
// `dependents_data`, `mortgage_interest`, and many other fields the mapper
// still reads defensively — out of scope for this fix, but this fixture is
// deliberately limited to columns that genuinely exist.
const mockTaxProfileRow = {
  id: "profile-1",
  user_id: "user-123",
  tax_year: 2026,
  filing_status: "single",
  state_of_residence: "CA",
  gross_income: 120000,
  w2_income: 120000,
  self_employment_income: 0,
  investment_income: 0,
  capital_gains_long_term: 0,
  capital_gains_short_term: 0,
  dependents_count: 0,
  is_self_employed: false,
  has_hdhp: true,
  ytd_401k_contribution: 10000,
  ytd_ira_contribution: 2000,
  ytd_hsa_contribution: 1000,
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
 * Builds a Supabase client double that branches on the table name, exactly
 * like the real PostgREST client would: `tax_profiles` resolves via
 * `.select().eq().eq().single()`, and — to prove the fix — a call against
 * "tax_accounts" resolves the way Postgres actually responds to a query
 * against a relation that was never migrated (`42P01 undefined_table`)
 * rather than a happy-path empty array. Pre-fix code destructured that error
 * away and produced `accounts: []`; post-fix code never issues this call.
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

describe("/api/financial/tax/retirement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const response = await GET(
        createMockRequest("http://localhost:3000/api/financial/tax/retirement"),
      );

      expect(response.status).toBe(401);
    });

    it("returns 404 when no tax profile exists for the user", async () => {
      mockValidateFromHeaders.mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      const client = buildMockClient({
        data: null,
        error: { message: "no rows", code: "PGRST116" },
      });
      (createClient as jest.Mock).mockResolvedValue(client);
      (supabaseAdmin.from as jest.Mock).mockImplementation(client.from);

      const response = await GET(
        createMockRequest("http://localhost:3000/api/financial/tax/retirement"),
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it("never queries the phantom tax_accounts table and reports account data as unavailable", async () => {
      mockValidateFromHeaders.mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      const client = buildMockClient({ data: mockTaxProfileRow, error: null });
      (createClient as jest.Mock).mockResolvedValue(client);
      (supabaseAdmin.from as jest.Mock).mockImplementation(client.from);

      const response = await GET(
        createMockRequest("http://localhost:3000/api/financial/tax/retirement"),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(client.from).toHaveBeenCalledWith("tax_profiles");
      expect(client.from).not.toHaveBeenCalledWith("tax_accounts");
      expect(body.metadata.accountLevelDataAvailable).toBe(false);

      // YTD 401k/IRA/HSA contributions must come from the tax_profiles row
      // directly (10000 + 2000 + 0 Roth + 1000 HSA), never from a fabricated
      // account balance.
      expect(body.data.totalYtdContributions).toBe(13000);
      expect(body.data.totalRetirementBalance).toBe(0);
    });
  });

  describe("POST", () => {
    it("returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const response = await POST(
        createMockRequest("http://localhost:3000/api/financial/tax/retirement", {
          method: "POST",
          body: { grossIncome: 100000, filingStatus: "single" },
        }),
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 when grossIncome is missing", async () => {
      mockValidateFromHeaders.mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (createClient as jest.Mock).mockResolvedValue(
        buildMockClient({ data: null, error: { message: "no rows" } }),
      );

      const response = await POST(
        createMockRequest("http://localhost:3000/api/financial/tax/retirement", {
          method: "POST",
          body: { filingStatus: "single" },
        }),
      );

      expect(response.status).toBe(400);
    });

    it("never queries tax_accounts when merging with a stored profile", async () => {
      mockValidateFromHeaders.mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      const client = buildMockClient({ data: mockTaxProfileRow, error: null });
      (createClient as jest.Mock).mockResolvedValue(client);
      (supabaseAdmin.from as jest.Mock).mockImplementation(client.from);

      const response = await POST(
        createMockRequest("http://localhost:3000/api/financial/tax/retirement", {
          method: "POST",
          body: { grossIncome: 130000, filingStatus: "single", age: 45 },
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(client.from).not.toHaveBeenCalledWith("tax_accounts");
      expect(body.metadata.profileSource).toBe("merged");
      expect(body.metadata.accountLevelDataAvailable).toBe(false);
    });
  });
});
