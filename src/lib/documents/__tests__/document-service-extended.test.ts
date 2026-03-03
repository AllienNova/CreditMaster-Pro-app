/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── S3 mocks ──────────────────────────────────────────────────────────────────

const mockS3Send = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
  GetObjectCommand: jest.fn().mockImplementation((params) => params),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => params),
  ListObjectsV2Command: jest.fn().mockImplementation((params) => params),
}));

const mockGetSignedUrl = jest
  .fn()
  .mockResolvedValue("https://signed-url.example.com/doc");

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { documentService } from "../document-service";
import type { Document, DocumentType } from "../document-service";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Direct access to the in-memory document store. */
function getStore(): Map<string, Document> {
  return (documentService as any).documents;
}

/** Direct access to the in-memory share link store. */
function getShareStore(): Map<string, any> {
  return (documentService as any).shareLinks;
}

/** Seed a document directly into the in-memory store. */
function seedDocument(overrides: Partial<Document> = {}): Document {
  const doc: Document = {
    id: overrides.id ?? `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    userId: overrides.userId ?? "user-1",
    type: overrides.type ?? "credit_report",
    name: overrides.name ?? "Test Document",
    originalName: overrides.originalName ?? "sample.pdf",
    size: overrides.size ?? 1024,
    mimeType: overrides.mimeType ?? "application/pdf",
    url: overrides.url ?? "https://example.com/sample.pdf",
    s3Key: overrides.s3Key ?? "users/user-1/credit_report/sample.pdf",
    uploadedAt: overrides.uploadedAt ?? new Date(),
    metadata: overrides.metadata,
    tags: overrides.tags,
    expiresAt: overrides.expiresAt,
  };

  getStore().set(doc.id, doc);
  return doc;
}

// ── Reset between tests ───────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  getStore().clear();
  getShareStore().clear();
  mockS3Send.mockResolvedValue({});
  mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com/doc");
});

// ═══════════════════════════════════════════════════════════════════════════════
// uploadDocument
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.uploadDocument", () => {
  const userId = "user-1";
  const file = Buffer.from("pdf-content");
  const fileName = "report.pdf";
  const mimeType = "application/pdf";
  const docType: DocumentType = "credit_report";

  it("uploads to S3 and stores document in memory", async () => {
    const result = await documentService.uploadDocument(
      userId,
      file,
      fileName,
      mimeType,
      docType,
    );

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);

    expect(result.id).toMatch(/^doc_/);
    expect(result.userId).toBe(userId);
    expect(result.type).toBe(docType);
    expect(result.originalName).toBe(fileName);
    expect(result.mimeType).toBe(mimeType);
    expect(result.size).toBe(file.length);
    expect(result.url).toBe("https://signed-url.example.com/doc");
    expect(result.s3Key).toContain(`users/${userId}/${docType}/`);
    expect(result.uploadedAt).toBeInstanceOf(Date);

    // Verify it's in the store
    expect(getStore().has(result.id)).toBe(true);
  });

  it("includes optional metadata in the upload", async () => {
    const metadata = { source: "manual", version: "2" };
    const result = await documentService.uploadDocument(
      userId,
      file,
      fileName,
      mimeType,
      docType,
      metadata,
    );

    expect(result.metadata).toEqual(metadata);
  });

  it("generates unique IDs for each upload", async () => {
    const result1 = await documentService.uploadDocument(
      userId,
      file,
      fileName,
      mimeType,
      docType,
    );
    const result2 = await documentService.uploadDocument(
      userId,
      file,
      fileName,
      mimeType,
      docType,
    );

    expect(result1.id).not.toBe(result2.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDocument
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.getDocument", () => {
  it("retrieves a document from the store", async () => {
    const doc = seedDocument({ id: "get-test-1" });
    const result = await documentService.getDocument("get-test-1");

    expect(result).toBeDefined();
    expect(result!.id).toBe(doc.id);
    expect(result!.userId).toBe(doc.userId);
  });

  it("returns undefined for a nonexistent document", async () => {
    const result = await documentService.getDocument("nonexistent");
    expect(result).toBeUndefined();
  });

  it("refreshes URL when document is older than 6 days", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 7);

    seedDocument({
      id: "old-doc",
      url: "https://old-url.example.com/doc",
      uploadedAt: oldDate,
    });

    mockGetSignedUrl.mockResolvedValueOnce("https://refreshed-url.example.com/doc");

    const result = await documentService.getDocument("old-doc");

    expect(result).toBeDefined();
    expect(result!.url).toBe("https://refreshed-url.example.com/doc");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("does NOT refresh URL when document is recent (< 6 days)", async () => {
    seedDocument({ id: "fresh-doc" }); // uploadedAt defaults to now

    const result = await documentService.getDocument("fresh-doc");

    expect(result).toBeDefined();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getUserDocuments
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.getUserDocuments", () => {
  it("returns all documents for a given user", () => {
    seedDocument({ id: "u1-doc1", userId: "user-1" });
    seedDocument({ id: "u1-doc2", userId: "user-1" });
    seedDocument({ id: "u2-doc1", userId: "user-2" });

    const result = documentService.getUserDocuments("user-1");

    expect(result).toHaveLength(2);
    expect(result.every((d) => d.userId === "user-1")).toBe(true);
  });

  it("filters by type when provided", () => {
    seedDocument({ id: "cr-1", userId: "user-1", type: "credit_report" });
    seedDocument({ id: "ev-1", userId: "user-1", type: "evidence" });
    seedDocument({ id: "cr-2", userId: "user-1", type: "credit_report" });

    const result = documentService.getUserDocuments("user-1", "credit_report");

    expect(result).toHaveLength(2);
    expect(result.every((d) => d.type === "credit_report")).toBe(true);
  });

  it("returns empty array when user has no documents", () => {
    const result = documentService.getUserDocuments("no-docs-user");
    expect(result).toEqual([]);
  });

  it("sorts documents newest first when no type filter", () => {
    const older = new Date("2025-01-01");
    const newer = new Date("2025-06-01");

    seedDocument({ id: "older", userId: "user-1", uploadedAt: older });
    seedDocument({ id: "newer", userId: "user-1", uploadedAt: newer });

    const result = documentService.getUserDocuments("user-1");

    expect(result[0].id).toBe("newer");
    expect(result[1].id).toBe("older");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deleteDocument
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.deleteDocument", () => {
  it("deletes from S3 and the in-memory store", async () => {
    seedDocument({ id: "del-1" });

    const result = await documentService.deleteDocument("del-1");

    expect(result).toBe(true);
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(getStore().has("del-1")).toBe(false);
  });

  it("returns false for a nonexistent document", async () => {
    const result = await documentService.deleteDocument("nonexistent");
    expect(result).toBe(false);
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it("returns false and keeps the doc if S3 deletion fails", async () => {
    seedDocument({ id: "del-fail" });
    mockS3Send.mockRejectedValueOnce(new Error("S3 failure"));

    const result = await documentService.deleteDocument("del-fail");

    expect(result).toBe(false);
    // The in-memory version does NOT delete from the map on S3 failure
    expect(getStore().has("del-fail")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// updateDocumentMetadata
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.updateDocumentMetadata", () => {
  it("merges new metadata into existing", () => {
    seedDocument({
      id: "meta-1",
      metadata: { existing: "value" },
    });

    const result = documentService.updateDocumentMetadata("meta-1", {
      newField: "added",
    });

    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual({
      existing: "value",
      newField: "added",
    });
  });

  it("creates metadata when none exists", () => {
    seedDocument({ id: "meta-2" }); // no metadata

    const result = documentService.updateDocumentMetadata("meta-2", {
      first: "field",
    });

    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual({ first: "field" });
  });

  it("overwrites existing keys", () => {
    seedDocument({
      id: "meta-3",
      metadata: { key: "old" },
    });

    const result = documentService.updateDocumentMetadata("meta-3", {
      key: "new",
    });

    expect(result!.metadata!.key).toBe("new");
  });

  it("returns null for nonexistent document", () => {
    const result = documentService.updateDocumentMetadata("nonexistent", {
      a: 1,
    });
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// addTags
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.addTags", () => {
  it("adds tags to a document without existing tags", () => {
    seedDocument({ id: "tag-1" });

    const result = documentService.addTags("tag-1", ["urgent", "review"]);

    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["urgent", "review"]);
  });

  it("appends to existing tags", () => {
    seedDocument({ id: "tag-2", tags: ["existing"] });

    const result = documentService.addTags("tag-2", ["new"]);

    expect(result!.tags).toContain("existing");
    expect(result!.tags).toContain("new");
  });

  it("deduplicates tags", () => {
    seedDocument({ id: "tag-3", tags: ["dup"] });

    const result = documentService.addTags("tag-3", ["dup", "dup", "unique"]);

    expect(result!.tags).toEqual(["dup", "unique"]);
  });

  it("returns null for nonexistent document", () => {
    const result = documentService.addTags("nonexistent", ["tag"]);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// searchByTags
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.searchByTags", () => {
  it("finds documents matching any of the given tags", () => {
    seedDocument({ id: "s1", userId: "user-1", tags: ["important", "review"] });
    seedDocument({ id: "s2", userId: "user-1", tags: ["archive"] });
    seedDocument({ id: "s3", userId: "user-1", tags: ["review"] });

    const result = documentService.searchByTags("user-1", ["review"]);

    expect(result).toHaveLength(2);
    const ids = result.map((d) => d.id);
    expect(ids).toContain("s1");
    expect(ids).toContain("s3");
  });

  it("excludes documents without tags", () => {
    seedDocument({ id: "no-tags", userId: "user-1" }); // no tags
    seedDocument({ id: "has-tags", userId: "user-1", tags: ["match"] });

    const result = documentService.searchByTags("user-1", ["match"]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("has-tags");
  });

  it("returns empty when no documents match", () => {
    seedDocument({ id: "miss", userId: "user-1", tags: ["other"] });

    const result = documentService.searchByTags("user-1", ["nomatch"]);
    expect(result).toEqual([]);
  });

  it("scopes search to the specified user", () => {
    seedDocument({ id: "u1", userId: "user-1", tags: ["shared-tag"] });
    seedDocument({ id: "u2", userId: "user-2", tags: ["shared-tag"] });

    const result = documentService.searchByTags("user-1", ["shared-tag"]);

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDocumentStats
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.getDocumentStats", () => {
  it("returns total, byType, and totalSize", () => {
    seedDocument({ id: "st1", userId: "user-1", type: "credit_report", size: 1000 });
    seedDocument({ id: "st2", userId: "user-1", type: "credit_report", size: 2000 });
    seedDocument({ id: "st3", userId: "user-1", type: "evidence", size: 500 });

    const stats = documentService.getDocumentStats("user-1");

    expect(stats.total).toBe(3);
    expect(stats.totalSize).toBe(3500);
    expect(stats.byType.credit_report).toBe(2);
    expect(stats.byType.evidence).toBe(1);
  });

  it("returns zeros for user with no documents", () => {
    const stats = documentService.getDocumentStats("empty-user");

    expect(stats.total).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.byType).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateUploadUrl
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.generateUploadUrl", () => {
  it("returns a presigned URL, documentId, and s3Key", async () => {
    const result = await documentService.generateUploadUrl(
      "user-1",
      "report.pdf",
      "application/pdf",
      "credit_report",
    );

    expect(result.uploadUrl).toBe("https://signed-url.example.com/doc");
    expect(result.documentId).toMatch(/^doc_/);
    expect(result.s3Key).toContain("users/user-1/credit_report/");
    expect(result.s3Key).toMatch(/\.pdf$/);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("generates unique document IDs per call", async () => {
    const r1 = await documentService.generateUploadUrl(
      "user-1",
      "a.pdf",
      "application/pdf",
      "credit_report",
    );
    const r2 = await documentService.generateUploadUrl(
      "user-1",
      "b.pdf",
      "application/pdf",
      "credit_report",
    );

    expect(r1.documentId).not.toBe(r2.documentId);
    expect(r1.s3Key).not.toBe(r2.s3Key);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// confirmUpload
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.confirmUpload", () => {
  it("creates and stores a document record", () => {
    const result = documentService.confirmUpload(
      "doc-confirm-1",
      "user-1",
      "users/user-1/credit_report/doc-confirm-1.pdf",
      "report.pdf",
      2048,
      "application/pdf",
      "credit_report",
    );

    expect(result.id).toBe("doc-confirm-1");
    expect(result.userId).toBe("user-1");
    expect(result.size).toBe(2048);
    expect(result.originalName).toBe("report.pdf");
    expect(result.url).toContain("fynvita-documents");
    expect(getStore().has("doc-confirm-1")).toBe(true);
  });

  it("includes optional metadata", () => {
    const result = documentService.confirmUpload(
      "doc-confirm-2",
      "user-1",
      "s3key",
      "file.pdf",
      100,
      "application/pdf",
      "credit_report",
      { source: "api" },
    );

    expect(result.metadata).toEqual({ source: "api" });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDocumentsByDateRange
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.getDocumentsByDateRange", () => {
  it("returns documents within the date range", () => {
    seedDocument({
      id: "dr-1",
      userId: "user-1",
      uploadedAt: new Date("2025-03-15"),
    });
    seedDocument({
      id: "dr-2",
      userId: "user-1",
      uploadedAt: new Date("2025-04-15"),
    });
    seedDocument({
      id: "dr-3",
      userId: "user-1",
      uploadedAt: new Date("2025-06-15"),
    });

    const result = documentService.getDocumentsByDateRange(
      "user-1",
      new Date("2025-03-01"),
      new Date("2025-05-01"),
    );

    expect(result).toHaveLength(2);
    const ids = result.map((d) => d.id);
    expect(ids).toContain("dr-1");
    expect(ids).toContain("dr-2");
  });

  it("includes documents on the exact boundary dates", () => {
    const exactDate = new Date("2025-04-01T00:00:00.000Z");
    seedDocument({
      id: "boundary",
      userId: "user-1",
      uploadedAt: exactDate,
    });

    const result = documentService.getDocumentsByDateRange(
      "user-1",
      exactDate,
      exactDate,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("boundary");
  });

  it("returns empty when no documents in range", () => {
    seedDocument({
      id: "outside",
      userId: "user-1",
      uploadedAt: new Date("2025-01-01"),
    });

    const result = documentService.getDocumentsByDateRange(
      "user-1",
      new Date("2025-06-01"),
      new Date("2025-12-31"),
    );

    expect(result).toEqual([]);
  });

  it("scopes to the specified user", () => {
    const date = new Date("2025-05-01");
    seedDocument({ id: "u1", userId: "user-1", uploadedAt: date });
    seedDocument({ id: "u2", userId: "user-2", uploadedAt: date });

    const result = documentService.getDocumentsByDateRange(
      "user-1",
      new Date("2025-01-01"),
      new Date("2025-12-31"),
    );

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateFileType
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.validateFileType", () => {
  it("accepts PDF for credit_report", () => {
    expect(documentService.validateFileType("application/pdf", "credit_report")).toBe(
      true,
    );
  });

  it("accepts PNG for identity_document", () => {
    expect(documentService.validateFileType("image/png", "identity_document")).toBe(
      true,
    );
  });

  it("accepts Word docs for dispute_letter", () => {
    expect(
      documentService.validateFileType("application/msword", "dispute_letter"),
    ).toBe(true);
    expect(
      documentService.validateFileType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "dispute_letter",
      ),
    ).toBe(true);
  });

  it("accepts image/jpg for evidence", () => {
    expect(documentService.validateFileType("image/jpg", "evidence")).toBe(true);
  });

  it("accepts broad types for other", () => {
    expect(documentService.validateFileType("application/pdf", "other")).toBe(true);
    expect(documentService.validateFileType("image/jpg", "other")).toBe(true);
    expect(
      documentService.validateFileType("application/msword", "other"),
    ).toBe(true);
  });

  it("rejects unsupported mime type", () => {
    expect(documentService.validateFileType("application/zip", "credit_report")).toBe(
      false,
    );
  });

  it("rejects text/plain for all standard types", () => {
    expect(documentService.validateFileType("text/plain", "credit_report")).toBe(false);
    expect(documentService.validateFileType("text/plain", "dispute_letter")).toBe(
      false,
    );
    expect(documentService.validateFileType("text/plain", "evidence")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateFileSize
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.validateFileSize", () => {
  it("accepts files at exactly 10MB", () => {
    const tenMB = 10 * 1024 * 1024;
    expect(documentService.validateFileSize(tenMB)).toBe(true);
  });

  it("accepts small files", () => {
    expect(documentService.validateFileSize(512)).toBe(true);
  });

  it("rejects files over 10MB", () => {
    expect(documentService.validateFileSize(10 * 1024 * 1024 + 1)).toBe(false);
  });

  it("accepts zero-byte files", () => {
    expect(documentService.validateFileSize(0)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getShareLink (expiration logic)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentService.getShareLink expiration", () => {
  it("returns the link when it has not expired", () => {
    seedDocument({ id: "shared-doc", userId: "user-1" });

    const link = documentService.createShareLink(
      "shared-doc",
      "user-1",
      ["viewer@example.com"],
      "view",
      24, // 24 hours
    );

    const retrieved = documentService.getShareLink(link.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(link.id);
  });

  it("returns undefined and cleans up expired links", () => {
    seedDocument({ id: "expired-doc", userId: "user-1" });

    // Create a link that has already expired
    const link = documentService.createShareLink(
      "expired-doc",
      "user-1",
      ["viewer@example.com"],
      "view",
      0, // expires immediately (0 hours)
    );

    // Manually set expiresAt to the past to ensure expiration
    const store = getShareStore();
    const storedLink = store.get(link.id);
    if (storedLink) {
      storedLink.expiresAt = new Date(Date.now() - 1000); // 1 second ago
    }

    const retrieved = documentService.getShareLink(link.id);
    expect(retrieved).toBeUndefined();

    // Link should have been removed from the store
    expect(store.has(link.id)).toBe(false);
  });

  it("returns undefined for nonexistent share link", () => {
    const result = documentService.getShareLink("nonexistent-share");
    expect(result).toBeUndefined();
  });
});
