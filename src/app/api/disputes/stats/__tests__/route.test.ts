/**
 * @jest-environment node
 *
 * Negative-auth tests for /api/disputes/stats (TASK-AUTH-03f, TASK-CRD-3).
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetUserDisputeStats = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/disputes/dispute-service-db", () => ({
  disputeServiceDB: {
    getUserDisputeStats: (...args: unknown[]) =>
      mockGetUserDisputeStats(...args),
  },
}));

import { GET } from "../route";

function makeRequest(): NextRequest {
  const url = "http://localhost:3000/api/disputes/stats";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when not authenticated", async () => {
    expect((await GET(makeRequest())).status).toBe(401);
  });
});

describe("authenticated – /api/disputes/stats GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 200 with stats data when service succeeds", async () => {
    mockGetUserDisputeStats.mockResolvedValue({
      total: 5,
      active: 2,
      resolved: 3,
      successRate: 60,
      averageResolutionDays: 14,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(5);
    expect(body.data.active).toBe(2);
    expect(body.data.resolved).toBe(3);
    expect(body.data.successRate).toBe(60);
    expect(body.data.avgResolutionDays).toBe(14);
  });

  it("returns 500 when service throws", async () => {
    mockGetUserDisputeStats.mockRejectedValue(new Error("DB unavailable"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to get dispute statistics");
  });
});
