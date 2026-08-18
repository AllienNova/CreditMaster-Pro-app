/**
 * @jest-environment node
 *
 * GET /api/financial/crypto — the caller's own crypto wallets and summary.
 *
 * This route exists to expose a feature that was already built and
 * unreachable: `crypto_wallets` has existed since migration
 * 20260731000082_crypto_wallet_tracking and crypto-wallet-service.ts makes 33
 * database calls against it, but nothing imported that service except a barrel
 * file and its own test. /financial/crypto rendered a hardcoded $45,230
 * Coinbase wallet instead.
 *
 * These tests drive the REAL withAuth guard (only its two dependencies —
 * jwt-validation and resolve-role — are mocked), so they prove the route is
 * genuinely authenticated and user-scoped, not merely that a fake guard was
 * injected. The wallet service is mocked to control the data.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetUserWallets = jest.fn();
const mockGetPortfolioSummary = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/financial/crypto-wallet-service", () => ({
  getCryptoWalletService: () => ({
    getUserWallets: (...args: unknown[]) => mockGetUserWallets(...args),
    getPortfolioSummary: (...args: unknown[]) =>
      mockGetPortfolioSummary(...args),
  }),
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

const AUTHED_USER_ID = "user-crypto-1";

function authenticate(userId: string = AUTHED_USER_ID): void {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: userId, email: "owner@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

function makeRequest(
  url = "http://localhost:3000/api/financial/crypto",
): NextRequest {
  return new NextRequest(url);
}

const SUMMARY = {
  totalValue: 12_400,
  totalCostBasis: 10_000,
  unrealizedGainLoss: 2_400,
  unrealizedGainLossPercent: 24,
  totalWallets: 1,
  totalAssets: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/financial/crypto", () => {
  it("returns the caller's wallets and summary", async () => {
    authenticate();
    mockGetUserWallets.mockResolvedValue([
      { id: "w1", name: "Ledger", type: "cold", totalValueUsd: 12_400 },
    ]);
    mockGetPortfolioSummary.mockResolvedValue(SUMMARY);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.wallets).toHaveLength(1);
    expect(body.data.summary).toEqual(SUMMARY);
  });

  it("scopes both service calls to the authenticated user", async () => {
    authenticate("user-crypto-2");
    mockGetUserWallets.mockResolvedValue([]);
    mockGetPortfolioSummary.mockResolvedValue(SUMMARY);

    await GET(makeRequest());

    // IDOR: the id comes from the guard, never the request.
    expect(mockGetUserWallets).toHaveBeenCalledWith("user-crypto-2");
    expect(mockGetPortfolioSummary).toHaveBeenCalledWith("user-crypto-2");
  });

  it("ignores a userId supplied in the query string", async () => {
    authenticate("user-crypto-3");
    mockGetUserWallets.mockResolvedValue([]);
    mockGetPortfolioSummary.mockResolvedValue(SUMMARY);

    await GET(
      makeRequest(
        "http://localhost:3000/api/financial/crypto?userId=someone-else",
      ),
    );

    expect(mockGetUserWallets).toHaveBeenCalledWith("user-crypto-3");
    expect(mockGetUserWallets).not.toHaveBeenCalledWith("someone-else");
  });

  it("rejects an unauthenticated caller", async () => {
    mockValidate.mockResolvedValue({ valid: false });

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockGetUserWallets).not.toHaveBeenCalled();
  });

  it("returns an empty list for a caller with no wallets, not an error", async () => {
    authenticate();
    mockGetUserWallets.mockResolvedValue([]);
    mockGetPortfolioSummary.mockResolvedValue({
      ...SUMMARY,
      totalValue: 0,
      totalWallets: 0,
      totalAssets: 0,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.wallets).toEqual([]);
  });

  it("surfaces a 500 rather than fabricating a wallet", async () => {
    authenticate();
    mockGetUserWallets.mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest());
    const body = await res.json();

    // An empty account and a broken backend must never look the same.
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });
});
