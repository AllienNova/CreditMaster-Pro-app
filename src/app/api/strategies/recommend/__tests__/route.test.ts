/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/strategies/recommend (TASK-AUTH-03d, FND-006).
 * Both GET and POST are wrapped in withAuth; the guard resolves auth via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb. withAuth admits any
 * authenticated user, so there is no role/permission gate to assert 403 on.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/strategies/ml-strategy-integration", () => ({
  mlStrategyIntegration: {
    recommendStrategies: jest.fn().mockResolvedValue([]),
  },
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/strategies/recommend");
}

function makePostRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/strategies/recommend", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Strategy Recommendation API – /api/strategies/recommend", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await POST(makePostRequest());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user (no role gate)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
    });

    it("POST admits an authenticated user (no role gate)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      // Body is empty, so the handler proceeds past auth and returns 400
      // (missing required fields) — proving the guard let the request through.
      const res = await POST(makePostRequest());
      expect(res.status).toBe(400);
    });
  });
});
