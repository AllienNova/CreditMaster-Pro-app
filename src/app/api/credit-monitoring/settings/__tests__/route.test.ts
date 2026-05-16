/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit-monitoring/settings (TASK-AUTH-03c).
 * GET is wrapped in withPermission("credit:read"), PUT in
 * withPermission("credit:update_settings"). The base `user` role holds both,
 * so the meaningful negative case is the 401 anon path.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetSettings = jest.fn();
const mockUpdateSettings = jest.fn();

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
    getMonitoringSettings: (...args: unknown[]) => mockGetSettings(...args),
    updateMonitoringSettings: (...args: unknown[]) =>
      mockUpdateSettings(...args),
  },
}));

import { GET, PUT } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/credit-monitoring/settings",
  );
}
function makePut(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit-monitoring/settings", {
    method: "PUT",
    body: JSON.stringify({ emailAlerts: true }),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Monitoring Settings API – /api/credit-monitoring/settings", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("PUT returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await PUT(makePut());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user past the credit:read gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockGetSettings.mockResolvedValue({});
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });

    it("PUT admits an authenticated user past the credit:update_settings gate", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockUpdateSettings.mockResolvedValue(true);
      const res = await PUT(makePut());
      expect(res.status).toBe(200);
    });
  });
});
