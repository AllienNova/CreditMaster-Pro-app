/**
 * @jest-environment node
 *
 * GET /api/goals/shared — the shared savings goals the caller belongs to.
 *
 * This route exposes shared-goals-service, which has 33 database calls and was
 * called by nothing. /goals/shared rendered an invented "Dream Home Down
 * Payment" instead.
 *
 * It also slipped past audit:reachable-services, whose reachability is
 * module-level: routes import @/lib/gamification for two OTHER services, so
 * the barrel's whole subtree counted as reached (task #104).
 *
 * The IDOR tests matter more here than on a personal resource. A shared goal
 * carries other people's names and contribution totals, so returning the wrong
 * user's goals would leak third parties, not just the caller.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetUserGoals = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/gamification/shared-goals-service", () => ({
  getSharedGoalsService: () => ({
    getUserGoals: (...args: unknown[]) => mockGetUserGoals(...args),
  }),
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function authenticate(userId = "user-goals-1"): void {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: userId, email: "member@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

function makeRequest(
  url = "http://localhost:3000/api/goals/shared",
): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/goals/shared", () => {
  it("returns the caller's shared goals", async () => {
    authenticate();
    mockGetUserGoals.mockResolvedValue([
      { id: "g1", name: "Kitchen renovation", targetAmount: 10_000 },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.goals).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it("scopes the query to the authenticated user", async () => {
    authenticate("user-goals-2");
    mockGetUserGoals.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockGetUserGoals).toHaveBeenCalledWith("user-goals-2");
  });

  it("ignores a userId supplied in the query string", async () => {
    authenticate("user-goals-3");
    mockGetUserGoals.mockResolvedValue([]);

    await GET(
      makeRequest(
        "http://localhost:3000/api/goals/shared?userId=someone-else",
      ),
    );

    // A shared goal carries other members' names and contribution totals, so
    // this would leak third parties, not only the caller.
    expect(mockGetUserGoals).toHaveBeenCalledWith("user-goals-3");
    expect(mockGetUserGoals).not.toHaveBeenCalledWith("someone-else");
  });

  it("rejects an unauthenticated caller", async () => {
    mockValidate.mockResolvedValue({ valid: false });

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockGetUserGoals).not.toHaveBeenCalled();
  });

  it("returns an empty list for a caller in no shared goal", async () => {
    authenticate();
    mockGetUserGoals.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.goals).toEqual([]);
  });

  it("surfaces a 500 rather than fabricating a goal", async () => {
    authenticate();
    mockGetUserGoals.mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });
});
