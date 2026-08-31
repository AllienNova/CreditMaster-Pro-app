/**
 * GET and DELETE /api/documents/[id]
 *
 * The collection already served both through `?documentId=`; the mobile client
 * asks for them RESTfully (user.ts:916, :991), so both 404'd — opening a
 * document showed nothing and deleting one did nothing.
 *
 * These are wrappers over documentServiceDB, which takes (documentId, userId)
 * and filters on both. The tests pin that the AUTHENTICATED id is what reaches
 * the service, since a wrapper that passed a client-supplied id would be an
 * IDOR with the service none the wiser.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetDocument = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/documents/document-service-db", () => ({
  documentServiceDB: {
    getDocument: (...args: unknown[]) => mockGetDocument(...args),
    deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  },
}));

import { GET, DELETE } from "../route";

const OWNER = "user-1";
const DOC = "doc-123";

function req(method: string, documentId = DOC): NextRequest {
  const url = `http://localhost:3000/api/documents/${documentId}`;
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("/api/documents/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockGetDocument.mockResolvedValue({ id: DOC, name: "statement.pdf" });
    mockDeleteDocument.mockResolvedValue(true);
  });

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await GET(req("GET"))).status).toBe(401);
    });

    it("passes the AUTHENTICATED user id to the service", async () => {
      await GET(req("GET"));
      expect(mockGetDocument).toHaveBeenCalledWith(DOC, OWNER);
    });

    it("returns the document in the same envelope as the collection", async () => {
      const body = await (await GET(req("GET"))).json();
      expect(body.document.id).toBe(DOC);
    });

    it("returns 404 when the service finds nothing", async () => {
      // getDocument returns null both for a missing document and for one
      // belonging to someone else, so this is also the no-existence-leak case.
      mockGetDocument.mockResolvedValue(null);
      expect((await GET(req("GET"))).status).toBe(404);
    });

    it("returns 500 rather than an empty document when the service throws", async () => {
      mockGetDocument.mockRejectedValue(new Error("db down"));
      const res = await GET(req("GET"));
      expect(res.status).toBe(500);
      expect((await res.json()).document).toBeUndefined();
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      expect((await DELETE(req("DELETE"))).status).toBe(401);
    });

    it("passes the AUTHENTICATED user id to the service", async () => {
      await DELETE(req("DELETE"));
      expect(mockDeleteDocument).toHaveBeenCalledWith(DOC, OWNER);
    });

    it("reports success when the service deleted the row", async () => {
      const res = await DELETE(req("DELETE"));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it("does NOT report success when the service deleted nothing", async () => {
      // Answering 200 here would tell someone their document is gone when it
      // may still be there — including when the id was never theirs.
      mockDeleteDocument.mockResolvedValue(false);
      const res = await DELETE(req("DELETE"));
      expect(res.status).toBe(500);
      expect((await res.json()).success).toBeUndefined();
    });

    it("returns 500 when the service throws", async () => {
      mockDeleteDocument.mockRejectedValue(new Error("storage down"));
      expect((await DELETE(req("DELETE"))).status).toBe(500);
    });
  });
});
