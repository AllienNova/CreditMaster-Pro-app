/**
 * @jest-environment node
 *
 * GET /api/experts — the verified expert directory.
 *
 * This route exposes a feature that was built and unreachable:
 * expert-sessions-service.ts has 46 database calls and no randomness, and its
 * getExperts reads the `experts` table filtered to status = "verified".
 * Nothing under src/app could reach it, so /experts rendered MOCK_EXPERTS —
 * invented advisers with invented CFP and ChFC credentials.
 *
 * These tests drive the REAL withAuth guard (only jwt-validation and
 * resolve-role are mocked), so they prove the route is genuinely
 * authenticated. The sessions service is mocked to control the data.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetExperts = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/services/expert-sessions-service", () => ({
  getExpertSessionsService: () => ({
    getExperts: (...args: unknown[]) => mockGetExperts(...args),
  }),
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function authenticate(userId = "user-experts-1"): void {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: userId, email: "caller@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

function makeRequest(url = "http://localhost:3000/api/experts"): NextRequest {
  return new NextRequest(url);
}

const EXPERT = {
  id: "e1",
  firstName: "Ada",
  lastName: "Nwosu",
  headline: "Fee-only planner",
  hourlyRate: 180,
  averageRating: 4.6,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/experts", () => {
  it("returns the experts the service provides", async () => {
    authenticate();
    mockGetExperts.mockResolvedValue([EXPERT]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.experts).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it("rejects an unauthenticated caller", async () => {
    mockValidate.mockResolvedValue({ valid: false });

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockGetExperts).not.toHaveBeenCalled();
  });

  it("passes no filters when none were asked for", async () => {
    authenticate();
    mockGetExperts.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockGetExperts).toHaveBeenCalledWith({
      specialties: undefined,
      minRating: undefined,
      maxRate: undefined,
    });
  });

  it("forwards specialty, minRating and maxRate", async () => {
    authenticate();
    mockGetExperts.mockResolvedValue([]);

    await GET(
      makeRequest(
        "http://localhost:3000/api/experts?specialty=Retirement&specialty=Tax&minRating=4&maxRate=250",
      ),
    );

    expect(mockGetExperts).toHaveBeenCalledWith({
      specialties: ["Retirement", "Tax"],
      minRating: 4,
      maxRate: 250,
    });
  });

  it.each(["0", "-5", "abc", ""])(
    "ignores a nonsensical minRating of %p rather than widening the query",
    async (raw) => {
      authenticate();
      mockGetExperts.mockResolvedValue([]);

      await GET(
        makeRequest(
          `http://localhost:3000/api/experts?minRating=${encodeURIComponent(raw)}`,
        ),
      );

      expect(mockGetExperts).toHaveBeenCalledWith(
        expect.objectContaining({ minRating: undefined }),
      );
    },
  );

  it("returns an empty directory rather than an error", async () => {
    authenticate();
    mockGetExperts.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.experts).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("surfaces a 500 rather than fabricating an adviser", async () => {
    authenticate();
    mockGetExperts.mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest());
    const body = await res.json();

    // An empty directory and a broken backend must never look the same.
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });
});
