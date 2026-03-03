/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockGetDocument = jest.fn();
const mockGetUserDocuments = jest.fn();
const mockGetDocumentStats = jest.fn();
const mockDeleteDocument = jest.fn();
const mockUpdateDocumentMetadata = jest.fn();
const mockAddTags = jest.fn();

jest.mock("@/lib/documents/document-service", () => ({
  documentService: {
    getDocument: mockGetDocument,
    getUserDocuments: mockGetUserDocuments,
    getDocumentStats: mockGetDocumentStats,
    deleteDocument: mockDeleteDocument,
    updateDocumentMetadata: mockUpdateDocumentMetadata,
    addTags: mockAddTags,
  },
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
  metadata: { source: "equifax" },
  tags: ["credit"],
};

const sampleStats = {
  total: 3,
  byType: { credit_report: 2, evidence: 1 },
  totalSize: 5120,
};

// ── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/documents
// ═══════════════════════════════════════════════════════════════════════════════
describe("Documents API – GET /api/documents", () => {
  it("should return 400 when userId is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/documents");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing userId parameter");
  });

  it("should return a single document when documentId is provided", async () => {
    mockGetDocument.mockResolvedValue(sampleDocument);

    const req = makeRequest(
      "http://localhost:3000/api/documents?userId=user-1&documentId=doc_123",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.document.id).toBe("doc_123");
    expect(mockGetDocument).toHaveBeenCalledWith("doc_123");
  });

  it("should return 404 when document does not exist", async () => {
    mockGetDocument.mockResolvedValue(undefined);

    const req = makeRequest(
      "http://localhost:3000/api/documents?userId=user-1&documentId=nonexistent",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Document not found");
  });

  it("should return 404 when document belongs to different user", async () => {
    mockGetDocument.mockResolvedValue({
      ...sampleDocument,
      userId: "other-user",
    });

    const req = makeRequest(
      "http://localhost:3000/api/documents?userId=user-1&documentId=doc_123",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Document not found");
  });

  it("should return user documents list and stats when no documentId", async () => {
    const docs = [sampleDocument];
    mockGetUserDocuments.mockReturnValue(docs);
    mockGetDocumentStats.mockReturnValue(sampleStats);

    const req = makeRequest(
      "http://localhost:3000/api/documents?userId=user-1",
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
    mockGetUserDocuments.mockReturnValue([]);
    mockGetDocumentStats.mockReturnValue(sampleStats);

    const req = makeRequest(
      "http://localhost:3000/api/documents?userId=user-1&type=evidence",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetUserDocuments).toHaveBeenCalledWith("user-1", "evidence");
  });

  it("should return 500 when an unexpected error occurs", async () => {
    mockGetUserDocuments.mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const req = makeRequest(
      "http://localhost:3000/api/documents?userId=user-1",
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
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc_123");
  });

  it("should return success=false when document not found in S3", async () => {
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
