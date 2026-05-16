/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/documents/share (TASK-AUTH-03c).
 * GET and DELETE are wrapped in withAuth; POST in
 * withPermission("documents:share") — a premium-tier permission the base
 * `user` role does not hold. Ownership checks are preserved in the handlers.
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
jest.mock("@/lib/documents/document-service", () => ({
  documentService: {
    getDocument: jest.fn(),
    listShareLinks: jest.fn().mockReturnValue([]),
    createShareLink: jest.fn(),
    revokeShareLink: jest.fn(),
  },
}));
jest.mock("@/lib/notifications/notification-service", () => ({
  notificationService: { notifyDocumentShareLink: jest.fn() },
}));
jest.mock("@/lib/security/audit-logging", () => ({
  __esModule: true,
  default: { logAPIRequest: jest.fn() },
}));

import { GET, POST, DELETE } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/documents/share?documentId=d1",
  );
}
function makePost(): NextRequest {
  return {
    url: "http://localhost:3000/api/documents/share",
    method: "POST",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
  } as unknown as NextRequest;
}
function makeDelete(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/documents/share?shareId=s1",
    { method: "DELETE" },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Documents Share API – /api/documents/share", () => {
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

    it("DELETE returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await DELETE(makeDelete());
      expect(res.status).toBe(401);
    });

    it("POST returns 403 when the user lacks documents:share permission", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await POST(makePost());
      expect(res.status).toBe(403);
    });

    it("POST admits a premium user holding documents:share", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("premium");
      // Empty body -> 400, proving the request passed auth + perms.
      const res = await POST(makePost());
      expect(res.status).toBe(400);
    });
  });
});
