/**
 * A single document, addressed by path segment.
 *
 * The collection route already serves both of these through a QUERY parameter —
 * `GET /api/documents?documentId=…` and `DELETE /api/documents?documentId=…`.
 * The mobile client asks for them RESTfully instead
 * (mobile-app/src/services/api/user.ts:916 and :991), so both 404'd: opening a
 * document showed nothing and deleting one did nothing.
 *
 * This is a path-segment wrapper over the same service calls, not a second
 * implementation. documentServiceDB.getDocument and .deleteDocument each take
 * (documentId, userId) and filter on both, so ownership is enforced in the
 * service and cannot drift between the two spellings of the same request.
 *
 * The query-parameter form on the collection is left alone: the web client uses
 * it, and changing a working contract to tidy up the shape of a URL would break
 * that for no user-visible gain.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { documentServiceDB } from "@/lib/documents/document-service-db";

/** The guard does not forward Next's route params; the id is the last segment. */
function documentIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() ?? "";
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const documentId = documentIdFrom(request);
    if (!documentId) {
      return NextResponse.json(
        { error: "Document id required" },
        { status: 400 },
      );
    }

    // getDocument filters on id AND user_id, so another user's document returns
    // null and is reported as not found — the same answer as a document that
    // does not exist, so the response leaks nothing either way.
    const document = await documentServiceDB.getDocument(documentId, user.id);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Same envelope as the collection's by-id branch, so a client can read
    // either spelling without a second parser.
    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const documentId = documentIdFrom(request);
      if (!documentId) {
        return NextResponse.json(
          { error: "Document id required" },
          { status: 400 },
        );
      }

      const success = await documentServiceDB.deleteDocument(
        documentId,
        user.id,
      );

      if (!success) {
        // The service reports only true/false, so this cannot tell "no such
        // document" from a storage failure. Reported as a failure rather than a
        // success, because answering 200 to a delete that removed nothing tells
        // someone their document is gone when it may not be.
        return NextResponse.json(
          { error: "Could not delete that document" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 },
      );
    }
  },
);
