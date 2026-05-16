/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit/analyze (TASK-AUTH-03c).
 * GET and POST are wrapped in withAuth; the route was previously
 * unauthenticated.
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
jest.mock("@/lib/ai-orchestrator", () => ({
  getAIOrchestrator: () => ({
    analyzeCreditReport: jest.fn().mockResolvedValue({}),
  }),
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit/analyze");
}
function makePost(): NextRequest {
  return {
    url: "http://localhost:3000/api/credit/analyze",
    method: "POST",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Analyze API – /api/credit/analyze", () => {
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

    it("GET admits an authenticated user (no role gate)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });
  });
});
