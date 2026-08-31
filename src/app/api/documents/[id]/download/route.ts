/**
 * A download link for one of the caller's own documents.
 *
 * GET /api/documents/[id]/download -> { url, expiresAt, fileName }
 *
 * The route did not exist, so userApi.getDownloadUrl(documentId) 404'd and the
 * document screen's download control did nothing.
 *
 * It returns a URL rather than proxying the bytes: the file lives in S3, and
 * streaming it through a serverless function would double the transfer for no
 * benefit. The link is minted fresh with a five-minute life
 * (documentServiceDB.createDownloadUrl), NOT the seven-day URL cached in
 * `s3_url` and handed out by /api/documents/[id] — a week-long bearer
 * credential to a tax return has no business being the thing a download button
 * produces.
 *
 * Ownership is enforced inside the service: getDocument filters on id AND
 * user_id, so another user's document simply is not found, and this answers 404
 * without confirming it exists.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { documentServiceDB } from "@/lib/documents/document-service-db";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The document id from the path.
 *
 * withAuth does not forward Next's route `params`, so the id comes from the
 * pathname. It is the SECOND-to-last segment, because the path ends in
 * /download.
 */
function documentIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 2] ?? "";
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const id = documentIdFrom(request);

  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  try {
    const link = await documentServiceDB.createDownloadUrl(id, user.id);

    if (!link) {
      // 404 for "no such document" and "not yours" alike.
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(link);
  } catch (error) {
    // Never answer with a URL-shaped success on failure: the client would try
    // to download from undefined and report a broken file rather than a
    // failed request.
    console.error("[documents/:id/download] failed to sign url", error);
    return NextResponse.json(
      { error: "Could not create a download link" },
      { status: 500 },
    );
  }
});
