/**
 * GET /api/financial/accounts/[accountId]
 *
 * The route did not exist — the `[accountId]` directory held only the `sync`
 * child — so opening an account from the mobile list (financial.ts:673) showed
 * nothing.
 *
 * The assertion that matters most is the IDOR one: this reads with the service
 * role, because financial_accounts has no `authenticated` grant, so the
 * user_id filter is the ONLY thing standing between a guessed accountId and
 * somebody else's bank account.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...a: unknown[]) => {
          mockEq(...a);
          return {
            eq: (...b: unknown[]) => {
              mockEq(...b);
              return { maybeSingle: () => mockMaybeSingle() };
            },
          };
        },
      }),
    }),
  }),
}));

import { GET } from "../route";

const OWNER = "user-1";
const ACCOUNT = "acct-123";

function req(accountId = ACCOUNT): NextRequest {
  const url = `http://localhost:3000/api/financial/accounts/${accountId}`;
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/financial/accounts/[accountId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockMaybeSingle.mockResolvedValue({
      data: { id: ACCOUNT, user_id: OWNER, account_name: "Checking" },
      error: null,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  it("filters by the AUTHENTICATED user id as well as the account id", async () => {
    // financial_accounts has no `authenticated` grant, so this read runs with
    // the service role. The user_id filter is the only IDOR barrier there is.
    await GET(req());
    expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    expect(mockEq).toHaveBeenCalledWith("id", ACCOUNT);
  });

  it("returns the account", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).data.id).toBe(ACCOUNT);
  });

  it("returns 404 when no row matches", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await GET(req("acct-someone-else"))).status).toBe(404);
  });

  it("does not distinguish 'not yours' from 'does not exist'", async () => {
    // Both are 404 with the same body, so a caller cannot probe for the
    // existence of accounts belonging to other users.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const missing = await (await GET(req("acct-nonexistent"))).json();
    const foreign = await (await GET(req("acct-someone-else"))).json();
    expect(missing).toEqual(foreign);
  });

  it("returns 500 on a read error rather than an empty account", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).data).toBeUndefined();
  });
});
