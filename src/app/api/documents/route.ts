import { NextRequest, NextResponse } from "next/server";
import { documentServiceDB } from "@/lib/documents/document-service-db";
import type { DocumentType } from "@/lib/documents/document-service-db";
import { documentService } from "@/lib/documents/document-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;
    const documentId = searchParams.get("documentId");
    const type = searchParams.get("type") as DocumentType | null;

    if (documentId) {
      // getDocument is user-scoped: returns null for wrong owner (no existence leak).
      const document = await documentServiceDB.getDocument(documentId, userId);
      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ document });
    }

    const documents = await documentServiceDB.getUserDocuments(userId, type ?? undefined);
    const stats = await documentServiceDB.getDocumentStats(userId);

    return NextResponse.json({ documents, stats });
  } catch (_error) {
    // DocumentsRoute error: Failed to get documents
    void _error;
    return NextResponse.json(
      { error: "Failed to get documents" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Missing documentId parameter" },
        { status: 400 },
      );
    }

    // deleteDocument is user-scoped: returns false for wrong owner (IDOR safe).
    const success = await documentServiceDB.deleteDocument(documentId, user.id);
    return NextResponse.json({ success });
  } catch (_error) {
    // DocumentsRoute error: Failed to delete document
    void _error;
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const body = await request.json();
    const { documentId, action, metadata, tags } = body;

    if (!documentId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let document;

    switch (action) {
      case "update_metadata":
        if (!metadata) {
          return NextResponse.json(
            { error: "Missing metadata" },
            { status: 400 },
          );
        }
        document = documentService.updateDocumentMetadata(documentId, metadata);
        break;
      case "add_tags":
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json(
            { error: "Missing or invalid tags" },
            { status: 400 },
          );
        }
        document = documentService.addTags(documentId, tags);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ document });
  } catch (_error) {
    // DocumentsRoute error: Failed to update document
    void _error;
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
});
