/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/documents/upload (TASK-AUTH-03c, TASK-CRD-4).
 * GET and POST are wrapped in withAuth; the previously unauthenticated route
 * accepted a client-supplied userId (IDOR) — it now uses the AuthedUser id.
 * Routes are re-wired to documentServiceDB (TASK-CRD-4).
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGenerateUploadUrl = jest.fn();
const mockValidateFileType = jest.fn();
const mockValidateFileSize = jest.fn();
const mockUploadDocument = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/documents/document-service-db", () => ({
  documentServiceDB: {
    validateFileType: (...args: unknown[]) => mockValidateFileType(...args),
    validateFileSize: (...args: unknown[]) => mockValidateFileSize(...args),
    uploadDocument: (...args: unknown[]) => mockUploadDocument(...args),
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

function makePost(formDataEntries: Record<string, unknown> = {}): NextRequest {
  const map = new Map(Object.entries(formDataEntries));
  return {
    url: "http://localhost:3000/api/documents/upload",
    method: "POST",
    formData: jest.fn().mockResolvedValue(map),
    headers: new Headers(),
  } as unknown as NextRequest;
}

function authedValidate() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "user@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
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
      authedValidate();
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
      // Must be called with the authed user-1 id, NOT the attacker param.
      expect(mockGenerateUploadUrl).toHaveBeenCalledWith(
        "user-1",
        "f.pdf",
        "application/pdf",
        "credit_report",
      );
    });
  });

  describe("POST – upload document", () => {
    const sampleFile = {
      type: "application/pdf",
      size: 1024,
      name: "report.pdf",
      arrayBuffer: async () => new ArrayBuffer(1024),
    };

    it("returns 400 when file is missing", async () => {
      authedValidate();
      const res = await POST(makePost({ documentType: "credit_report" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Missing required fields/);
    });

    it("returns 400 when documentType is missing", async () => {
      authedValidate();
      const res = await POST(makePost({ file: sampleFile }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Missing required fields/);
    });

    it("returns 400 when file type is invalid", async () => {
      authedValidate();
      mockValidateFileType.mockReturnValue(false);
      const res = await POST(
        makePost({ file: sampleFile, documentType: "credit_report" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid file type/);
    });

    it("returns 400 when file size exceeds limit", async () => {
      authedValidate();
      mockValidateFileType.mockReturnValue(true);
      mockValidateFileSize.mockReturnValue(false);
      const res = await POST(
        makePost({ file: sampleFile, documentType: "credit_report" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/File size exceeds/);
    });

    it("uploads document and returns it on success", async () => {
      authedValidate();
      mockValidateFileType.mockReturnValue(true);
      mockValidateFileSize.mockReturnValue(true);
      const fakeDoc = { id: "doc-1", userId: "user-1", fileName: "report.pdf" };
      mockUploadDocument.mockResolvedValue(fakeDoc);

      const res = await POST(
        makePost({ file: sampleFile, documentType: "credit_report" }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.document).toEqual(fakeDoc);
      // Must be called with the authed user, not client-supplied id
      expect(mockUploadDocument).toHaveBeenCalledWith(
        "user-1",
        expect.any(Buffer),
        "report.pdf",
        "application/pdf",
        "credit_report",
      );
    });
  });

  describe("GET – generate presigned URL", () => {
    it("returns 400 when required params are missing", async () => {
      authedValidate();
      const res = await GET(makeGet("?fileName=f.pdf"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Missing required parameters/);
    });

    it("returns presigned URL on success", async () => {
      authedValidate();
      mockGenerateUploadUrl.mockResolvedValue({
        uploadUrl: "https://s3/presigned",
        documentId: "doc-2",
        s3Key: "key/doc-2",
      });

      const res = await GET(
        makeGet("?fileName=f.pdf&mimeType=application/pdf&documentType=id"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.uploadUrl).toBe("https://s3/presigned");
      expect(body.documentId).toBe("doc-2");
      expect(body.s3Key).toBe("key/doc-2");
    });
  });
});
