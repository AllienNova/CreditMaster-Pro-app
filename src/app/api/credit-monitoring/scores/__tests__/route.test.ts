/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-monitoring/scores (TASK-AUTH-03c).
 * GET is wrapped in withAuth; the previously unauthenticated route accepted a
 * client-supplied userId (IDOR) — it now uses the AuthedUser id.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetCurrentScores = jest.fn();

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
    getCurrentScores: (...args: unknown[]) => mockGetCurrentScores(...args),
  },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-monitoring/scores");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Monitoring Scores API – /api/credit-monitoring/scores", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user and scopes to their id", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockGetCurrentScores.mockResolvedValue([]);

      const res = await GET(makeGet());
      expect(res.status).toBe(200);
      expect(mockGetCurrentScores).toHaveBeenCalledWith("user-1");
    });
  });
});
