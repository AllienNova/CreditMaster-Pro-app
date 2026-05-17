/**
 * @jest-environment node
 *
 * Tests for /api/documents (TASK-CRD-4).
 *
 * GET and DELETE are re-wired to documentServiceDB (DB-backed, user-scoped).
 * PATCH (metadata/tags) still uses the in-memory documentService — the DB
 * schema has no metadata or tags columns.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockGetDocument = jest.fn();
const mockGetUserDocuments = jest.fn();
const mockGetDocumentStats = jest.fn();
const mockDeleteDocument = jest.fn();
const mockUpdateDocumentMetadata = jest.fn();
const mockAddTags = jest.fn();
const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/documents/document-service-db", () => ({
  documentServiceDB: {
    getDocument: (...args: unknown[]) => mockGetDocument(...args),
    getUserDocuments: (...args: unknown[]) => mockGetUserDocuments(...args),
    getDocumentStats: (...args: unknown[]) => mockGetDocumentStats(...args),
    deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  },
}));
jest.mock("@/lib/documents/document-service", () => ({
  documentService: {
    updateDocumentMetadata: (...args: unknown[]) =>
      mockUpdateDocumentMetadata(...args),
    addTags: (...args: unknown[]) => mockAddTags(...args),
  },
}));
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));

// Import AFTER mocks
import { GET, DELETE, PATCH } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
) {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  const headers: Record<string, string> = {};
  if (options?.headers) Object.assign(headers, options.headers);
  if (options?.body) {
    init.method = options.method || "POST";
    init.body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  init.headers = headers;
  return new NextRequest(absoluteUrl, init as never);
}

const sampleDocument = {
  id: "doc_123",
  userId: "user-1",
  type: "credit_report",
  name: "credit_report_doc_123",
  originalName: "report.pdf",
  size: 1024,
  mimeType: "application/pdf",
  url: "https://s3.example.com/file.pdf",
  s3Key: "users/user-1/credit_report/doc_123.pdf",
  uploadedAt: new Date(),
};

const sampleStats = {
  total: 3,
  byType: { credit_report: 2, supporting_doc: 1 },
  totalSize: 5120,
};

// ── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated as user-1.
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "user-1@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/documents
// ═══════════════════════════════════════════════════════════════════════════════
describe("Documents API – GET /api/documents", () => {
  it("returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
    const req = makeRequest("http://localhost:3000/api/documents");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("should return a single document when documentId is provided", async () => {
    mockGetDocument.mockResolvedValue(sampleDocument);

    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=doc_123",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.document.id).toBe("doc_123");
    // DB service is called with both documentId AND userId (IDOR defence).
    expect(mockGetDocument).toHaveBeenCalledWith("doc_123", "user-1");
  });

  it("should return 404 when document does not exist or belongs to another user", async () => {
    // DB service returns null for wrong owner (no existence leak).
    mockGetDocument.mockResolvedValue(null);

    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=nonexistent",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Document not found");
  });

  it("should return user documents list and stats when no documentId", async () => {
    const docs = [sampleDocument];
    mockGetUserDocuments.mockResolvedValue(docs);
    mockGetDocumentStats.mockResolvedValue(sampleStats);

    const req = makeRequest(
      "http://localhost:3000/api/documents",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.documents).toEqual(docs);
    expect(body.stats).toEqual(sampleStats);
    expect(mockGetUserDocuments).toHaveBeenCalledWith("user-1", undefined);
    expect(mockGetDocumentStats).toHaveBeenCalledWith("user-1");
  });

  it("should pass type filter to getUserDocuments", async () => {
    mockGetUserDocuments.mockResolvedValue([]);
    mockGetDocumentStats.mockResolvedValue(sampleStats);

    const req = makeRequest(
      "http://localhost:3000/api/documents?type=supporting_doc",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetUserDocuments).toHaveBeenCalledWith("user-1", "supporting_doc");
  });

  it("should return 500 when an unexpected error occurs", async () => {
    mockGetUserDocuments.mockRejectedValue(new Error("DB connection failed"));

    const req = makeRequest(
      "http://localhost:3000/api/documents",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to get documents");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/documents
// ═══════════════════════════════════════════════════════════════════════════════
describe("Documents API – DELETE /api/documents", () => {
  it("should return 400 when documentId is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/documents", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing documentId parameter");
  });

  it("should delete document and return success", async () => {
    mockDeleteDocument.mockResolvedValue(true);

    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=doc_123",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // DB service called with both documentId AND userId (IDOR defence).
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc_123", "user-1");
  });

  it("should return success=false when document not found or wrong owner", async () => {
    // DB service returns false for wrong owner (IDOR safe — no 403/404 existence leak).
    mockDeleteDocument.mockResolvedValue(false);

    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=nonexistent",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
  });

  it("should return 500 when an unexpected error occurs", async () => {
    mockDeleteDocument.mockRejectedValue(new Error("S3 error"));

    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=doc_123",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete document");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PATCH /api/documents
// ═══════════════════════════════════════════════════════════════════════════════
describe("Documents API – PATCH /api/documents", () => {
  describe("Validation", () => {
    it("should return 400 when documentId is missing", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
        body: { action: "update_metadata", metadata: { key: "val" } },
      });
      req.json = jest
        .fn()
        .mockResolvedValue({
          action: "update_metadata",
          metadata: { key: "val" },
        });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing required fields");
    });

    it("should return 400 when action is missing", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
        body: { documentId: "doc_123" },
      });
      req.json = jest.fn().mockResolvedValue({ documentId: "doc_123" });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing required fields");
    });

    it("should return 400 for invalid action", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
        body: { documentId: "doc_123", action: "unknown_action" },
      });
      req.json = jest
        .fn()
        .mockResolvedValue({ documentId: "doc_123", action: "unknown_action" });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid action");
    });
  });

  describe("update_metadata action", () => {
    it("should update metadata and return document", async () => {
      const updatedDoc = {
        ...sampleDocument,
        metadata: { source: "equifax", verified: true },
      };
      mockUpdateDocumentMetadata.mockReturnValue(updatedDoc);

      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "doc_123",
        action: "update_metadata",
        metadata: { verified: true },
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.document).toBeDefined();
      expect(mockUpdateDocumentMetadata).toHaveBeenCalledWith("doc_123", {
        verified: true,
      });
    });

    it("should return 400 when metadata is missing for update_metadata", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "doc_123",
        action: "update_metadata",
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing metadata");
    });

    it("should return 404 when document not found for update_metadata", async () => {
      mockUpdateDocumentMetadata.mockReturnValue(null);

      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "nonexistent",
        action: "update_metadata",
        metadata: { key: "val" },
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Document not found");
    });
  });

  describe("add_tags action", () => {
    it("should add tags and return document", async () => {
      const updatedDoc = {
        ...sampleDocument,
        tags: ["credit", "important"],
      };
      mockAddTags.mockReturnValue(updatedDoc);

      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "doc_123",
        action: "add_tags",
        tags: ["important"],
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.document.tags).toContain("important");
      expect(mockAddTags).toHaveBeenCalledWith("doc_123", ["important"]);
    });

    it("should return 400 when tags is missing for add_tags", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "doc_123",
        action: "add_tags",
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing or invalid tags");
    });

    it("should return 400 when tags is not an array", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "doc_123",
        action: "add_tags",
        tags: "not-an-array",
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing or invalid tags");
    });

    it("should return 404 when document not found for add_tags", async () => {
      mockAddTags.mockReturnValue(null);

      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest.fn().mockResolvedValue({
        documentId: "nonexistent",
        action: "add_tags",
        tags: ["tag1"],
      });
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Document not found");
    });
  });

  describe("Error handling", () => {
    it("should return 500 when request.json() throws", async () => {
      const req = makeRequest("http://localhost:3000/api/documents", {
        method: "PATCH",
      });
      req.json = jest
        .fn()
        .mockRejectedValue(new Error("Invalid JSON"));
      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to update document");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  negative-auth – /api/documents (withAuth on GET, DELETE, PATCH)
// ═══════════════════════════════════════════════════════════════════════════════
describe("negative-auth – /api/documents", () => {
  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
    const req = makeRequest("http://localhost:3000/api/documents?documentId=d1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
    const req = makeRequest("http://localhost:3000/api/documents", {
      method: "PATCH",
      body: { documentId: "d1", action: "add_tags", tags: ["x"] },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("GET returns 404 (IDOR) when reading another user's document", async () => {
    // DB service returns null for wrong owner — route cannot distinguish
    // "not found" from "belongs to other user" (intentional, no existence leak).
    mockGetDocument.mockResolvedValue(null);
    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=doc_other",
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
    expect(mockGetDocument).toHaveBeenCalledWith("doc_other", "user-1");
  });

  it("DELETE returns success=false (IDOR) when deleting another user's document", async () => {
    // DB service returns false for wrong owner.
    mockDeleteDocument.mockResolvedValue(false);
    const req = makeRequest(
      "http://localhost:3000/api/documents?documentId=doc_other",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc_other", "user-1");
  });
});
