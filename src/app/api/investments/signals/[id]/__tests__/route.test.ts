/**
 * Tests for /api/investments/signals/[id] (TASK-AUTH-03e)
 *
 * - negative-auth: unauthenticated callers are rejected with 401.
 * - IDOR regression: PATCH must verify the signal belongs to the caller
 *   before mutating its outcome (AUTH-03e review HIGH #6).
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

const SIGNAL_ID = "11111111-1111-1111-1111-111111111111";

const mockSignalGenerator = {
  getSignalHistory: jest.fn(),
  evaluateSignalStrength: jest.fn(),
  trackSignalOutcome: jest.fn(),
};

jest.mock("@/lib/investments/signal-generator", () => ({
  SignalGenerator: jest.fn(() => mockSignalGenerator),
}));
jest.mock("@/lib/security/redis-rate-limiting", () => ({
  rateLimit: jest.fn(() => ({ check: jest.fn() })),
}));

import { GET, PATCH } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({
      entryPrice: 100,
      status: "executed",
    }),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const URL_PATH = `http://localhost:3000/api/investments/signals/${SIGNAL_ID}`;

describe("negative-auth – /api/investments/signals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(createMockRequest(URL_PATH));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await PATCH(createMockRequest(URL_PATH, "PATCH"));
    expect(res.status).toBe(401);
  });
});

describe("IDOR – /api/investments/signals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Authenticate as user-B. getSignalHistory(user.id) returns only the
    // caller's signals — the target signal is NOT among them.
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-B", email: "user-b@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockSignalGenerator.getSignalHistory.mockResolvedValue([]);
    mockSignalGenerator.trackSignalOutcome.mockResolvedValue({ id: SIGNAL_ID });
  });

  it("PATCH of a signal owned by another user returns 404, not a mutation (AUTH-03e HIGH #6)", async () => {
    const res = await PATCH(createMockRequest(URL_PATH, "PATCH"));
    expect(res.status).toBe(404);
    expect(mockSignalGenerator.trackSignalOutcome).not.toHaveBeenCalled();
  });

  it("PATCH of the caller's own signal succeeds", async () => {
    mockSignalGenerator.getSignalHistory.mockResolvedValue([{ id: SIGNAL_ID }]);
    const res = await PATCH(createMockRequest(URL_PATH, "PATCH"));
    expect(res.status).toBe(200);
    expect(mockSignalGenerator.trackSignalOutcome).toHaveBeenCalledWith(
      SIGNAL_ID,
      expect.objectContaining({ status: "executed" }),
    );
  });
});
