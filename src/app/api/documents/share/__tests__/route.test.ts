/**
 * @jest-environment node
 *
 * Tests for /api/documents/share (TASK-CRD-4 + TASK-AUTH-03c).
 *
 * Covers:
 * - Negative auth (401 / 403)
 * - Persistence: verify DB methods called with correct args
 * - IDOR: verify userId comes from the auth wrapper, never from client-supplied body/query
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetDocument = jest.fn();
const mockListShareLinks = jest.fn();
const mockCreateShareLink = jest.fn();
const mockRevokeShareLink = jest.fn();

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
    getDocument: (...args: unknown[]) => mockGetDocument(...args),
    listShareLinks: (...args: unknown[]) => mockListShareLinks(...args),
    createShareLink: (...args: unknown[]) => mockCreateShareLink(...args),
    revokeShareLink: (...args: unknown[]) => mockRevokeShareLink(...args),
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeUser = { id: "user-1", email: "user@example.com" };

const fakeDocument = {
  id: "doc-1",
  userId: fakeUser.id,
  originalName: "my-doc.pdf",
  type: "credit_report",
  name: "credit_report_123",
  size: 1024,
  mimeType: "application/pdf",
  url: "https://s3.example.com/doc-1",
  s3Key: "users/user-1/credit_report/123.pdf",
  uploadedAt: new Date(),
};

const fakeShareLink = {
  id: "share-1",
  documentId: "doc-1",
  userId: fakeUser.id,
  recipients: ["recipient@example.com"],
  permissions: "view" as const,
  url: "http://localhost:3000/shared/share-1",
  expiresAt: new Date(Date.now() + 86400_000),
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// Request factories
// ---------------------------------------------------------------------------

function makeGet(documentId = "doc-1"): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/documents/share?documentId=${documentId}`,
  );
}

function makePost(body: Record<string, unknown> = {}): NextRequest {
  return {
    url: "http://localhost:3000/api/documents/share",
    method: "POST",
    json: jest.fn().mockResolvedValue({
      documentId: "doc-1",
      recipients: ["recipient@example.com"],
      permissions: "view",
      expiresInHours: 24,
      ...body,
    }),
    headers: new Headers(),
  } as unknown as NextRequest;
}

function makeDelete(shareId = "share-1"): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/documents/share?shareId=${shareId}`,
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function authAs(user = fakeUser, role = "premium") {
  mockValidate.mockResolvedValue({ valid: true, user });
  mockResolveRole.mockResolvedValue(role);
}

function unauthenticated() {
  mockValidate.mockResolvedValue({ valid: false, user: null });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalConsoleError: typeof console.error;

beforeAll(() => {
  originalConsoleError = console.error;
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default: DB methods succeed
  mockGetDocument.mockResolvedValue(fakeDocument);
  mockListShareLinks.mockResolvedValue([fakeShareLink]);
  mockCreateShareLink.mockResolvedValue(fakeShareLink);
  mockRevokeShareLink.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Documents Share API – /api/documents/share", () => {
  // -------------------------------------------------------------------------
  // Negative auth
  // -------------------------------------------------------------------------
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      unauthenticated();
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      unauthenticated();
      const res = await POST(makePost());
      expect(res.status).toBe(401);
    });

    it("DELETE returns 401 when the request is not authenticated", async () => {
      unauthenticated();
      const res = await DELETE(makeDelete());
      expect(res.status).toBe(401);
    });

    it("POST returns 403 when the user lacks documents:share permission", async () => {
      authAs(fakeUser, "user");
      const res = await POST(makePost());
      expect(res.status).toBe(403);
    });

    it("POST admits a premium user holding documents:share (empty body → 400)", async () => {
      authAs(fakeUser, "premium");
      const req = {
        url: "http://localhost:3000/api/documents/share",
        method: "POST",
        json: jest.fn().mockResolvedValue({}),
        headers: new Headers(),
      } as unknown as NextRequest;
      const res = await POST(req);
      // Passes auth + perms but fails validation because documentId is missing
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET — happy path + persistence
  // -------------------------------------------------------------------------
  describe("GET", () => {
    it("returns 200 with share links for the document owner", async () => {
      authAs();
      const res = await GET(makeGet("doc-1"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.links).toHaveLength(1);
      expect(body.links[0].id).toBe("share-1");
    });

    it("calls getDocument with (documentId, userId) from auth", async () => {
      authAs();
      await GET(makeGet("doc-1"));
      expect(mockGetDocument).toHaveBeenCalledWith("doc-1", fakeUser.id);
    });

    it("calls listShareLinks with (documentId, userId) from auth", async () => {
      authAs();
      await GET(makeGet("doc-1"));
      expect(mockListShareLinks).toHaveBeenCalledWith("doc-1", fakeUser.id);
    });

    it("returns 400 when documentId is missing from query", async () => {
      authAs();
      const res = await GET(
        new NextRequest("http://localhost:3000/api/documents/share"),
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when getDocument returns null (wrong owner or missing)", async () => {
      authAs();
      mockGetDocument.mockResolvedValue(null);
      const res = await GET(makeGet("doc-999"));
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET — IDOR
  // -------------------------------------------------------------------------
  describe("GET – IDOR", () => {
    it("uses userId from auth, not from a client-injected query param", async () => {
      // Even if an adversary appends &userId=victim, the handler ignores it.
      authAs(fakeUser);
      const req = new NextRequest(
        "http://localhost:3000/api/documents/share?documentId=doc-1&userId=victim-user-id",
      );
      await GET(req);
      // First arg = documentId, second arg = userId from auth
      expect(mockGetDocument.mock.calls[0][1]).toBe(fakeUser.id);
      expect(mockGetDocument.mock.calls[0][1]).not.toBe("victim-user-id");
    });

    it("returns 404 (not 403) when document belongs to a different user (no existence leak)", async () => {
      authAs(fakeUser);
      mockGetDocument.mockResolvedValue(null);
      const res = await GET(makeGet("doc-owned-by-victim"));
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST — happy path + persistence
  // -------------------------------------------------------------------------
  describe("POST", () => {
    it("returns 200 and the created share link", async () => {
      authAs();
      const res = await POST(makePost());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.link.id).toBe("share-1");
    });

    it("calls getDocument with (documentId, userId) from auth", async () => {
      authAs();
      await POST(makePost());
      expect(mockGetDocument).toHaveBeenCalledWith("doc-1", fakeUser.id);
    });

    it("calls createShareLink with (documentId, userId) from auth and normalised recipients", async () => {
      authAs();
      await POST(
        makePost({
          recipients: ["  Recipient@Example.COM  "],
          permissions: "download",
          expiresInHours: 48,
        }),
      );
      expect(mockCreateShareLink).toHaveBeenCalledWith(
        "doc-1",
        fakeUser.id,
        ["recipient@example.com"],
        "download",
        48,
      );
    });

    it("clamps expiresInHours between 1 and 168", async () => {
      authAs();
      await POST(makePost({ expiresInHours: 9999 }));
      const calledHours = mockCreateShareLink.mock.calls[0][4];
      expect(calledHours).toBe(168);
    });

    it("defaults expiresInHours to 24 when not supplied", async () => {
      authAs();
      await POST(makePost({ expiresInHours: undefined }));
      const calledHours = mockCreateShareLink.mock.calls[0][4];
      expect(calledHours).toBe(24);
    });

    it("defaults permissions to view when an invalid value is supplied", async () => {
      authAs();
      await POST(makePost({ permissions: "edit" }));
      const calledPermissions = mockCreateShareLink.mock.calls[0][3];
      expect(calledPermissions).toBe("view");
    });

    it("returns 400 when documentId is missing", async () => {
      authAs();
      const req = {
        url: "http://localhost:3000/api/documents/share",
        method: "POST",
        json: jest.fn().mockResolvedValue({
          recipients: ["a@b.com"],
        }),
        headers: new Headers(),
      } as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when recipients is empty", async () => {
      authAs();
      const req = {
        url: "http://localhost:3000/api/documents/share",
        method: "POST",
        json: jest.fn().mockResolvedValue({
          documentId: "doc-1",
          recipients: [],
        }),
        headers: new Headers(),
      } as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when document is not found / wrong owner", async () => {
      authAs();
      mockGetDocument.mockResolvedValue(null);
      const res = await POST(makePost({ documentId: "doc-999" }));
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST — IDOR
  // -------------------------------------------------------------------------
  describe("POST – IDOR", () => {
    it("uses userId from auth wrapper, not client-supplied userId in body", async () => {
      authAs(fakeUser);
      await POST(
        makePost({ userId: "victim-user-id" }),
      );
      // Second arg to getDocument must be fakeUser.id
      expect(mockGetDocument.mock.calls[0][1]).toBe(fakeUser.id);
      expect(mockGetDocument.mock.calls[0][1]).not.toBe("victim-user-id");
    });

    it("passes userId from auth wrapper to createShareLink, not body userId", async () => {
      authAs(fakeUser);
      await POST(makePost({ userId: "victim-user-id" }));
      // Second arg to createShareLink must be fakeUser.id
      expect(mockCreateShareLink.mock.calls[0][1]).toBe(fakeUser.id);
      expect(mockCreateShareLink.mock.calls[0][1]).not.toBe("victim-user-id");
    });
  });

  // -------------------------------------------------------------------------
  // DELETE — happy path + persistence
  // -------------------------------------------------------------------------
  describe("DELETE", () => {
    it("returns 200 with success: true when share link is revoked", async () => {
      authAs();
      const res = await DELETE(makeDelete("share-1"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("calls revokeShareLink with (shareId, userId) from auth", async () => {
      authAs();
      await DELETE(makeDelete("share-1"));
      expect(mockRevokeShareLink).toHaveBeenCalledWith("share-1", fakeUser.id);
    });

    it("returns 400 when shareId is missing", async () => {
      authAs();
      const res = await DELETE(
        new NextRequest("http://localhost:3000/api/documents/share", {
          method: "DELETE",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when revokeShareLink returns false (wrong owner or missing)", async () => {
      authAs();
      mockRevokeShareLink.mockResolvedValue(false);
      const res = await DELETE(makeDelete("share-999"));
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE — IDOR
  // -------------------------------------------------------------------------
  describe("DELETE – IDOR", () => {
    it("uses userId from auth wrapper, not a client-injected query param", async () => {
      authAs(fakeUser);
      const req = new NextRequest(
        "http://localhost:3000/api/documents/share?shareId=share-1&userId=victim-user-id",
        { method: "DELETE" },
      );
      await DELETE(req);
      // Second arg must be fakeUser.id
      expect(mockRevokeShareLink.mock.calls[0][1]).toBe(fakeUser.id);
      expect(mockRevokeShareLink.mock.calls[0][1]).not.toBe("victim-user-id");
    });

    it("returns 404 (not 403) when link belongs to a different user (no existence leak)", async () => {
      authAs(fakeUser);
      mockRevokeShareLink.mockResolvedValue(false);
      const res = await DELETE(makeDelete("share-owned-by-victim"));
      expect(res.status).toBe(404);
    });
  });
});
