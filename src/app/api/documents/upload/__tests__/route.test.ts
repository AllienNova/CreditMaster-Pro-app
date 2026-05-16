/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/documents/upload (TASK-AUTH-03c).
 * GET and POST are wrapped in withAuth; the previously unauthenticated route
 * accepted a client-supplied userId (IDOR) — it now uses the AuthedUser id.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGenerateUploadUrl = jest.fn();

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
    validateFileType: jest.fn().mockReturnValue(true),
    validateFileSize: jest.fn().mockReturnValue(true),
    uploadDocument: jest.fn(),
    generateUploadUrl: (...args: unknown[]) => mockGenerateUploadUrl(...args),
  },
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

function makeGet(query = ""): NextRequest {
  return {
    url: `http://localhost:3000/api/documents/upload${query}`,
    method: "GET",
    headers: new Headers(),
  } as unknown as NextRequest;
}
function makePost(): NextRequest {
  return {
    url: "http://localhost:3000/api/documents/upload",
    method: "POST",
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Documents Upload API – /api/documents/upload", () => {
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

    it("GET scopes the presigned URL to the authenticated user", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      mockGenerateUploadUrl.mockResolvedValue({
        uploadUrl: "https://s3/x",
        documentId: "d1",
        s3Key: "k1",
      });

      const res = await GET(
        makeGet(
          "?userId=attacker&fileName=f.pdf&mimeType=application/pdf&documentType=credit_report",
        ),
      );
      expect(res.status).toBe(200);
      expect(mockGenerateUploadUrl).toHaveBeenCalledWith(
        "user-1",
        "f.pdf",
        "application/pdf",
        "credit_report",
      );
    });
  });
});
