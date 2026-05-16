/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-bureau/connect (TASK-AUTH-03c).
 * GET is wrapped in withPermission("credit:read"), POST in
 * withPermission("credit:write"). The base `user` role holds both, so the
 * meaningful negative case is the 401 anon path.
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
jest.mock("@/lib/credit-bureau/credit-bureau-service", () => ({
  CreditBureauService: {
    getBureauConnectionStatuses: jest.fn().mockResolvedValue([]),
    connectBureau: jest.fn(),
    disconnectBureau: jest.fn(),
  },
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/connect");
}
function makePost(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-bureau/connect", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Bureau Connect API – /api/credit-bureau/connect", () => {
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

    it("GET admits an authenticated user past the credit:read gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });

    it("POST admits an authenticated user past the credit:write gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      // Missing bureau -> 400, proving the request passed auth + perms.
      const res = await POST(makePost());
      expect(res.status).toBe(400);
    });
  });
});
