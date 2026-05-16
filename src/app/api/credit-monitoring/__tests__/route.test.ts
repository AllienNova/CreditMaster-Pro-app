/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-monitoring (TASK-AUTH-03c).
 * GET and POST are wrapped in withAuth; the previously unauthenticated route
 * accepted a client-supplied userId (IDOR) — it now uses the AuthedUser id.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetDashboard = jest.fn();
const mockAddScore = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/credit-monitoring/credit-monitoring-service", () => ({
  creditMonitoringService: {
    getMonitoringDashboard: (...args: unknown[]) => mockGetDashboard(...args),
    addCreditScore: (...args: unknown[]) => mockAddScore(...args),
  },
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-monitoring");
}
function makePost(body: object = {}): NextRequest {
  return {
    url: "http://localhost:3000/api/credit-monitoring",
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Monitoring API – /api/credit-monitoring", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await POST(makePost());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user and scopes to their id", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockGetDashboard.mockResolvedValue({});

      const res = await GET(makeGet());
      expect(res.status).toBe(200);
      expect(mockGetDashboard).toHaveBeenCalledWith("user-1");
    });

    it("POST scopes the credit score to the authenticated user", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockAddScore.mockResolvedValue({ id: "s1" });

      const res = await POST(
        makePost({ userId: "attacker", bureau: "experian", score: 700 }),
      );
      expect(res.status).toBe(200);
      expect(mockAddScore).toHaveBeenCalledWith(
        "user-1",
        "experian",
        700,
        [],
      );
    });
  });
});
