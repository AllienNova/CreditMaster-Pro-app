/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-bureau/score-history (TASK-AUTH-03c).
 * GET is wrapped in withPermission("credit:read"). The base `user` role holds
 * credit:read, so the meaningful negative case is the 401 anon path.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetScoreHistory = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/credit-bureau/credit-bureau-service", () => {
  class CreditBureauService {
    static getScoreHistory = (...args: unknown[]) =>
      mockGetScoreHistory(...args);
  }
  return { CreditBureauService, default: CreditBureauService };
});

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/credit-bureau/score-history",
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Bureau Score History API – /api/credit-bureau/score-history", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user past the credit:read gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockGetScoreHistory.mockResolvedValue([]);
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });
  });
});
