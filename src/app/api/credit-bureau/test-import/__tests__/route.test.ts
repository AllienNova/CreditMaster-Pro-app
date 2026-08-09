/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-bureau/test-import (TASK-AUTH-03c).
 * GET and POST are wrapped in withAuth; the previously unauthenticated route
 * accepted a client-supplied userId (IDOR) — it now uses the AuthedUser id.
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
jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ from: jest.fn() }),
}));
jest.mock("@/lib/credit-bureau/mock-credit-report-generator", () => ({
  generateMockCreditReport: jest.fn(),
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/test-import");
}
function makePost(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/test-import", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Bureau Test Import API – /api/credit-bureau/test-import", () => {
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
  });
});
