/**
 * GET /api/documents/[id]/download
 *
 * The route did not exist, so userApi.getDownloadUrl(documentId) 404'd and the
 * download control did nothing.
 *
 * Two things worth pinning beyond the happy path:
 *
 *  1. The id is read from the SECOND-to-last path segment. Taking the last one
 *     would ask for a document literally called "download".
 *  2. A failure must not produce a URL-shaped success. A body with an undefined
 *     `url` makes the client download from nowhere and report a broken file
 *     rather than a failed request.
 *
 * Ownership lives in documentServiceDB.getDocument, which filters on id AND
 * user_id; createDownloadUrl returns null when it finds nothing, and that is
 * what becomes the 404 here.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockCreateDownloadUrl = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/documents/document-service-db", () => ({
  documentServiceDB: {
    createDownloadUrl: (...a: unknown[]) => mockCreateDownloadUrl(...a),
  },
}));

import { GET } from "../route";

const OWNER = "user-1";
const DOC = "3a289fa1-857e-443d-be92-45c01968eca8";

const LINK = {
  url: "https://s3.example.com/users/user-1/tax/2026.pdf?X-Amz-Signature=abc",
  expiresAt: "2026-08-17T14:05:00.000Z",
  fileName: "2026-return.pdf",
};

function req(id = DOC): NextRequest {
  const url = `http://localhost:3000/api/documents/${id}/download`;
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/documents/[id]/download", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockCreateDownloadUrl.mockResolvedValue(LINK);
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  describe("id validation", () => {
    it.each(["not-a-uuid", "1", "download"])(
      "rejects %j before reaching the service",
      async (id) => {
        expect((await GET(req(id))).status).toBe(400);
        expect(mockCreateDownloadUrl).not.toHaveBeenCalled();
      },
    );
  });

  it("reads the id from the second-to-last segment, not the last", async () => {
    // The path ends in /download; taking the last segment would ask for a
    // document called "download".
    await GET(req());
    expect(mockCreateDownloadUrl).toHaveBeenCalledWith(DOC, OWNER);
  });

  it("asks on behalf of the AUTHENTICATED user", async () => {
    await GET(req());
    expect(mockCreateDownloadUrl).toHaveBeenCalledWith(
      expect.any(String),
      OWNER,
    );
  });

  it("returns the link, when it expires and the file name", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(LINK);
  });

  describe("when the document is not the caller's", () => {
    beforeEach(() => mockCreateDownloadUrl.mockResolvedValue(null));

    it("returns 404 rather than 403, so ids cannot be probed", async () => {
      expect((await GET(req())).status).toBe(404);
    });

    it("returns no url at all", async () => {
      // A body carrying an undefined url would have the client download from
      // nowhere and blame the file.
      const body = await (await GET(req())).json();
      expect(body.url).toBeUndefined();
    });
  });

  it("returns 500 without a url when signing fails", async () => {
    mockCreateDownloadUrl.mockRejectedValue(new Error("S3 unreachable"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).url).toBeUndefined();
  });
});
