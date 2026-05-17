/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Database } from "../../supabase/types";

// ── S3 mocks ──────────────────────────────────────────────────────────────────

const mockS3Send = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
  GetObjectCommand: jest.fn().mockImplementation((params) => params),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => params),
}));

const mockGetSignedUrl = jest
  .fn()
  .mockResolvedValue("https://signed-url.example.com/doc");

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
//
// The Supabase PostgREST query builder chains methods and is then awaited.
// We create a chainable mock where every method returns the chain object,
// and the chain is thenable (has `.then`). Tests configure `queryResult`
// to control what the chain resolves to. For `.single()`, we use a separate
// queue so it can be called multiple times with different results.

let queryResult: { data: any; error: any } = { data: null, error: null };
const singleResults: Array<{ data: any; error: any }> = [];

const mockSupabaseChain: Record<string, jest.Mock> = {};

// Methods that always return the chain for further chaining
const chainMethods = [
  "insert",
  "select",
  "eq",
  "order",
  "limit",
  "update",
  "delete",
];

for (const method of chainMethods) {
  mockSupabaseChain[method] = jest.fn(() => mockSupabaseChain);
}

// `.single()` pops from the singleResults queue
mockSupabaseChain.single = jest.fn(() => {
  if (singleResults.length > 0) {
    return Promise.resolve(singleResults.shift());
  }
  return Promise.resolve(queryResult);
});

// Make the chain thenable so `await query` works (for list queries)
(mockSupabaseChain as any).then = function (
  resolve: (v: any) => any,
  reject: (e: any) => any,
) {
  return Promise.resolve(queryResult).then(resolve, reject);
};

jest.mock("../../supabase/client", () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => mockSupabaseChain),
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { documentServiceDB } from "../document-service-db";
import type { DocumentType } from "../document-service-db";
import { getSupabase } from "../../supabase/client";

const mockedGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

// ── Helpers ───────────────────────────────────────────────────────────────────

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

function makeDocumentRow(
  overrides: Partial<DocumentRow> = {},
): DocumentRow {
  return {
    id: "doc-abc-123",
    user_id: "user-1",
    type: "credit_report",
    name: "credit_report_1700000000000",
    original_name: "report.pdf",
    size: 2048,
    mime_type: "application/pdf",
    s3_key: "users/user-1/credit_report/1700000000000.pdf",
    s3_url: "https://signed-url.example.com/doc",
    uploaded_at: new Date().toISOString(),
    metadata: null,
    tags: null,
    ...overrides,
  };
}

// ── Reset mocks between tests ─────────────────────────────────────────────────

beforeEach(() => {
  // Clear call counts but NOT implementations
  for (const method of [...chainMethods, "single"]) {
    mockSupabaseChain[method].mockClear();
  }
  mockS3Send.mockClear();
  mockGetSignedUrl.mockClear();

  // Re-establish chain returns (in case a test overrode them)
  for (const method of chainMethods) {
    mockSupabaseChain[method].mockImplementation(() => mockSupabaseChain);
  }
  mockSupabaseChain.single.mockImplementation(() => {
    if (singleResults.length > 0) {
      return Promise.resolve(singleResults.shift());
    }
    return Promise.resolve(queryResult);
  });

  // Re-establish getSupabase (jest.clearAllMocks would wipe it)
  mockedGetSupabase.mockReturnValue({
    from: jest.fn(() => mockSupabaseChain),
  } as any);

  // Reset defaults
  queryResult = { data: null, error: null };
  singleResults.length = 0;
  mockS3Send.mockResolvedValue({});
  mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com/doc");
});

// ═══════════════════════════════════════════════════════════════════════════════
// uploadDocument
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.uploadDocument", () => {
  const userId = "user-1";
  const file = Buffer.from("pdf-content");
  const fileName = "report.pdf";
  const mimeType = "application/pdf";
  const docType: DocumentType = "credit_report";

  it("uploads to S3 and saves metadata to Supabase", async () => {
    const row = makeDocumentRow({ size: file.length });
    singleResults.push({ data: row, error: null });

    const result = await documentServiceDB.uploadDocument(
      userId,
      file,
      fileName,
      mimeType,
      docType,
    );

    // S3 put was called
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    // Presigned URL generated
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    // Supabase insert chain exercised
    expect(mockSupabaseChain.insert).toHaveBeenCalled();
    expect(mockSupabaseChain.select).toHaveBeenCalled();
    expect(mockSupabaseChain.single).toHaveBeenCalled();

    // Returned document is mapped correctly
    expect(result.id).toBe(row.id);
    expect(result.userId).toBe(row.user_id);
    expect(result.type).toBe(row.type);
    expect(result.originalName).toBe(row.original_name);
    expect(result.mimeType).toBe(row.mime_type);
    expect(result.url).toBe(row.s3_url);
    expect(result.s3Key).toBe(row.s3_key);
    expect(result.uploadedAt).toBeInstanceOf(Date);
  });

  it("throws when Supabase insert fails", async () => {
    singleResults.push({
      data: null,
      error: { message: "insert failed", code: "23505" },
    });

    await expect(
      documentServiceDB.uploadDocument(userId, file, fileName, mimeType, docType),
    ).rejects.toThrow("Failed to save document metadata: insert failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDocument
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.getDocument", () => {
  it("returns a document with a fresh URL", async () => {
    const row = makeDocumentRow();
    singleResults.push({ data: row, error: null });

    const result = await documentServiceDB.getDocument("doc-abc-123", "user-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("doc-abc-123");
    expect(result!.url).toBe(row.s3_url);
  });

  it("returns null when document is not found (PGRST116)", async () => {
    singleResults.push({
      data: null,
      error: { message: "not found", code: "PGRST116" },
    });

    const result = await documentServiceDB.getDocument("nonexistent", "user-1");
    expect(result).toBeNull();
  });

  it("throws on non-PGRST116 Supabase errors", async () => {
    singleResults.push({
      data: null,
      error: { message: "db connection error", code: "XXXXX" },
    });

    await expect(
      documentServiceDB.getDocument("doc-abc-123", "user-1"),
    ).rejects.toThrow("Failed to fetch document: db connection error");
  });

  it("refreshes URL when document is older than 6 days", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 7); // 7 days ago

    const row = makeDocumentRow({
      uploaded_at: oldDate.toISOString(),
      s3_url: "https://old-url.example.com/doc",
    });

    singleResults.push({ data: row, error: null });
    mockGetSignedUrl.mockResolvedValueOnce("https://refreshed-url.example.com/doc");

    const result = await documentServiceDB.getDocument("doc-abc-123", "user-1");

    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://refreshed-url.example.com/doc");
    // getSignedUrl called for URL refresh
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    // update() was called to persist the new URL
    expect(mockSupabaseChain.update).toHaveBeenCalled();
  });

  it("refreshes URL when s3_url is null", async () => {
    const row = makeDocumentRow({ s3_url: null as any });
    singleResults.push({ data: row, error: null });
    mockGetSignedUrl.mockResolvedValueOnce("https://new-url.example.com/doc");

    const result = await documentServiceDB.getDocument("doc-abc-123", "user-1");

    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://new-url.example.com/doc");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getUserDocuments
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.getUserDocuments", () => {
  it("returns all documents for a user", async () => {
    const rows = [
      makeDocumentRow({ id: "doc-1" }),
      makeDocumentRow({ id: "doc-2", type: "id" }),
    ];

    queryResult = { data: rows, error: null };

    const result = await documentServiceDB.getUserDocuments("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("doc-1");
    expect(result[1].id).toBe("doc-2");
  });

  it("filters by document type when specified", async () => {
    const rows = [makeDocumentRow({ id: "doc-1", type: "credit_report" })];

    queryResult = { data: rows, error: null };

    const result = await documentServiceDB.getUserDocuments(
      "user-1",
      "credit_report",
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("credit_report");
    // Verify .eq was called with "type" argument
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith("type", "credit_report");
  });

  it("returns empty array when user has no documents", async () => {
    queryResult = { data: [], error: null };

    const result = await documentServiceDB.getUserDocuments("no-docs-user");
    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    queryResult = { data: null, error: null };

    const result = await documentServiceDB.getUserDocuments("user-1");
    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    queryResult = { data: null, error: { message: "query failed" } };

    await expect(
      documentServiceDB.getUserDocuments("user-1"),
    ).rejects.toThrow("Failed to fetch user documents: query failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deleteDocument
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.deleteDocument", () => {
  it("deletes from S3 and database and returns true", async () => {
    const row = makeDocumentRow();
    // Fetch document via .single()
    singleResults.push({ data: row, error: null });
    // DB delete chain resolves via thenable
    queryResult = { data: null, error: null };

    const result = await documentServiceDB.deleteDocument("doc-abc-123", "user-1");

    expect(result).toBe(true);
    expect(mockS3Send).toHaveBeenCalledTimes(1); // DeleteObjectCommand
    expect(mockSupabaseChain.delete).toHaveBeenCalled();
  });

  it("returns false when document is not found", async () => {
    singleResults.push({
      data: null,
      error: { message: "not found", code: "PGRST116" },
    });

    const result = await documentServiceDB.deleteDocument("nonexistent", "user-1");
    expect(result).toBe(false);
  });

  it("continues DB deletion even if S3 delete fails", async () => {
    const row = makeDocumentRow();
    singleResults.push({ data: row, error: null });
    mockS3Send.mockRejectedValueOnce(new Error("S3 failure"));
    queryResult = { data: null, error: null };

    const result = await documentServiceDB.deleteDocument("doc-abc-123", "user-1");

    // Should still return true because DB deletion succeeded
    expect(result).toBe(true);
  });

  it("returns false when database deletion fails", async () => {
    const row = makeDocumentRow();
    singleResults.push({ data: row, error: null });
    queryResult = { data: null, error: { message: "db delete failed" } };

    const result = await documentServiceDB.deleteDocument("doc-abc-123", "user-1");
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDocumentStats
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.getDocumentStats", () => {
  it("aggregates total, byType, and totalSize", async () => {
    const rows = [
      makeDocumentRow({ id: "d1", type: "credit_report", size: 1000 }),
      makeDocumentRow({ id: "d2", type: "credit_report", size: 2000 }),
      makeDocumentRow({ id: "d3", type: "id", size: 500 }),
    ];

    queryResult = { data: rows, error: null };

    const stats = await documentServiceDB.getDocumentStats("user-1");

    expect(stats.total).toBe(3);
    expect(stats.totalSize).toBe(3500);
    expect(stats.byType.credit_report).toBe(2);
    expect(stats.byType.id).toBe(1);
  });

  it("returns zeros when user has no documents", async () => {
    queryResult = { data: [], error: null };

    const stats = await documentServiceDB.getDocumentStats("empty-user");

    expect(stats.total).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.byType).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateUploadUrl
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.generateUploadUrl", () => {
  it("returns presigned URL, documentId, and s3Key", async () => {
    const row = makeDocumentRow({ id: "new-doc-id", size: 0, s3_url: null as any });
    singleResults.push({ data: row, error: null });

    const result = await documentServiceDB.generateUploadUrl(
      "user-1",
      "report.pdf",
      "application/pdf",
      "credit_report",
    );

    expect(result.uploadUrl).toBe("https://signed-url.example.com/doc");
    expect(result.documentId).toBe("new-doc-id");
    expect(result.s3Key).toContain("users/user-1/credit_report/");
    expect(result.s3Key).toMatch(/\.pdf$/);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("throws when database insert fails", async () => {
    singleResults.push({
      data: null,
      error: { message: "insert error" },
    });

    await expect(
      documentServiceDB.generateUploadUrl(
        "user-1",
        "report.pdf",
        "application/pdf",
        "credit_report",
      ),
    ).rejects.toThrow("Failed to create document record: insert error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// confirmUpload
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.confirmUpload", () => {
  it("updates document with size and URL and returns mapped Document", async () => {
    const pendingRow = makeDocumentRow({ size: 0, s3_url: null as any });
    const updatedRow = makeDocumentRow({ size: 4096 });

    // First .single() call: fetch document
    // Second .single() call: update returns updated row
    singleResults.push({ data: pendingRow, error: null });
    singleResults.push({ data: updatedRow, error: null });

    const result = await documentServiceDB.confirmUpload(
      "doc-abc-123",
      "user-1",
      4096,
    );

    expect(result.id).toBe(updatedRow.id);
    expect(result.size).toBe(4096);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("throws when document is not found", async () => {
    singleResults.push({
      data: null,
      error: { message: "not found", code: "PGRST116" },
    });

    await expect(
      documentServiceDB.confirmUpload("nonexistent", "user-1", 1024),
    ).rejects.toThrow("Document not found");
  });

  it("throws when update fails", async () => {
    const pendingRow = makeDocumentRow({ size: 0 });
    singleResults.push({ data: pendingRow, error: null });
    singleResults.push({ data: null, error: { message: "update failed" } });

    await expect(
      documentServiceDB.confirmUpload("doc-abc-123", "user-1", 4096),
    ).rejects.toThrow("Failed to confirm upload: update failed");
  });

  it("idor: user B cannot confirm user A pending upload", async () => {
    // Simulate the fetch returning null for a mismatched user_id (IDOR defence).
    // The .eq("user_id", userId) filter means Supabase returns PGRST116 for
    // a document that belongs to a different user.
    singleResults.push({
      data: null,
      error: { message: "not found", code: "PGRST116" },
    });

    await expect(
      documentServiceDB.confirmUpload(
        "user-a-doc-id",
        "user-b",  // user B tries to confirm user A's document
        4096,
      ),
    ).rejects.toThrow("Document not found");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateFileType
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.validateFileType", () => {
  it("accepts PDF for credit_report", () => {
    expect(
      documentServiceDB.validateFileType("application/pdf", "credit_report"),
    ).toBe(true);
  });

  it("accepts PNG for id", () => {
    expect(
      documentServiceDB.validateFileType("image/png", "id"),
    ).toBe(true);
  });

  it("accepts JPEG for proof_of_address", () => {
    expect(
      documentServiceDB.validateFileType("image/jpeg", "proof_of_address"),
    ).toBe(true);
  });

  it("accepts Word documents for supporting_doc", () => {
    expect(
      documentServiceDB.validateFileType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "supporting_doc",
      ),
    ).toBe(true);
  });

  it("accepts application/msword for supporting_doc", () => {
    expect(
      documentServiceDB.validateFileType("application/msword", "supporting_doc"),
    ).toBe(true);
  });

  it("accepts image/jpg for supporting_doc", () => {
    expect(
      documentServiceDB.validateFileType("image/jpg", "supporting_doc"),
    ).toBe(true);
  });

  it("rejects unsupported mime type", () => {
    expect(
      documentServiceDB.validateFileType("application/zip", "credit_report"),
    ).toBe(false);
  });

  it("rejects Word doc for credit_report", () => {
    expect(
      documentServiceDB.validateFileType("application/msword", "credit_report"),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateFileSize
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentServiceDB.validateFileSize", () => {
  it("accepts files at exactly 10MB", () => {
    const tenMB = 10 * 1024 * 1024;
    expect(documentServiceDB.validateFileSize(tenMB)).toBe(true);
  });

  it("accepts files smaller than 10MB", () => {
    expect(documentServiceDB.validateFileSize(1024)).toBe(true);
  });

  it("rejects files larger than 10MB", () => {
    const overLimit = 10 * 1024 * 1024 + 1;
    expect(documentServiceDB.validateFileSize(overLimit)).toBe(false);
  });

  it("accepts zero-byte files", () => {
    expect(documentServiceDB.validateFileSize(0)).toBe(true);
  });
});
