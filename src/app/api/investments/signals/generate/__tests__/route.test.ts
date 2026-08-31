/**
 * POST /api/investments/signals/generate
 *
 * This route did not exist. The page has always POSTed here, and the call fell
 * through to signals/[id] with id="generate" — GET and PATCH only — so Next.js
 * answered 405 and every attempt showed "Failed to generate signal".
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGenerateSignal = jest.fn();
const mockCheck = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/security/redis-rate-limiting", () => ({
  rateLimit: () => ({ check: (...args: unknown[]) => mockCheck(...args) }),
}));
jest.mock("@/lib/investments/signal-generator", () => ({
  SignalGenerator: jest.fn(),
}));

import { POST } from "../route";
import { SignalGenerator } from "@/lib/investments/signal-generator";
import { AnalysisType } from "@/lib/investments/types/trading-signals.types";

// jest.config sets resetMocks: true, so a mockImplementation declared in the
// factory above is cleared before each test. Re-attach it in beforeEach.
const MockedGenerator = SignalGenerator as jest.MockedClass<
  typeof SignalGenerator
>;

const USER = "user-1";

function req(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/investments/signals/generate";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/investments/signals/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedGenerator.mockImplementation(
      () =>
        ({
          generateSignal: (...args: unknown[]) => mockGenerateSignal(...args),
        }) as unknown as SignalGenerator,
    );
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: USER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockCheck.mockResolvedValue(undefined);
    mockGenerateSignal.mockResolvedValue({ id: "sig-1", symbol: "AAPL" });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req({ symbol: "AAPL" }))).status).toBe(401);
  });

  it("returns 429 when the generation budget is spent", async () => {
    mockCheck.mockRejectedValue(new Error("limit"));
    const res = await POST(req({ symbol: "AAPL" }));
    expect(res.status).toBe(429);
    // The whole point of the limit is that no analysis runs.
    expect(mockGenerateSignal).not.toHaveBeenCalled();
  });

  it("uses a tighter budget than the 100/hour the read routes use", async () => {
    await POST(req({ symbol: "AAPL" }));
    expect(mockCheck).toHaveBeenCalledWith(30, USER);
  });

  describe("validation", () => {
    it.each<[unknown, string]>([
      [{}, "no symbol"],
      [{ symbol: "" }, "empty symbol"],
      [{ symbol: "   " }, "whitespace symbol"],
      [{ symbol: "AAPL; DROP TABLE" }, "non-ticker characters"],
      [{ symbol: "A".repeat(13) }, "symbol too long"],
      [{ symbol: "AAPL", assetType: "houses" }, "unknown asset type"],
      [{ symbol: "AAPL", timeframe: "1y" }, "unknown timeframe"],
      [{ symbol: "AAPL", analysisTypes: ["astrology"] }, "unknown analysis type"],
      [{ symbol: "AAPL", analysisTypes: [] }, "empty analysis list"],
    ])("rejects %j — %s", async (body, _why) => {
      const res = await POST(req(body));
      expect(res.status).toBe(400);
      expect(mockGenerateSignal).not.toHaveBeenCalled();
    });
  });

  describe("generation", () => {
    it("returns 201 with the signal", async () => {
      const res = await POST(req({ symbol: "AAPL" }));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("sig-1");
    });

    it("generates for the AUTHENTICATED user, never an id from the body", async () => {
      await POST(req({ symbol: "AAPL", userId: "someone-else" }));
      expect(mockGenerateSignal).toHaveBeenCalledWith(
        USER,
        "AAPL",
        "stock",
        undefined,
        "1d",
      );
    });

    it("upper-cases the symbol and applies the documented defaults", async () => {
      await POST(req({ symbol: " aapl " }));
      expect(mockGenerateSignal).toHaveBeenCalledWith(
        USER,
        "AAPL",
        "stock",
        undefined,
        "1d",
      );
    });

    it("passes through an explicit analysis set and timeframe", async () => {
      await POST(
        req({
          symbol: "BTC",
          assetType: "crypto",
          analysisTypes: [AnalysisType.TECHNICAL, AnalysisType.SENTIMENT],
          timeframe: "4h",
        }),
      );
      expect(mockGenerateSignal).toHaveBeenCalledWith(
        USER,
        "BTC",
        "crypto",
        [AnalysisType.TECHNICAL, AnalysisType.SENTIMENT],
        "4h",
      );
    });

    it("returns 500 without inventing a signal when generation fails", async () => {
      mockGenerateSignal.mockRejectedValue(new Error("provider down"));
      const res = await POST(req({ symbol: "AAPL" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      // A fabricated buy/sell recommendation would be the worst possible
      // fallback here, so assert there is no signal in the failure payload.
      expect(body.data).toBeUndefined();
      expect(body.success).toBeUndefined();
    });
  });
});
