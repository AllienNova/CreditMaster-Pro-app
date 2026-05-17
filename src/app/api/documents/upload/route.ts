import { NextRequest, NextResponse } from "next/server";
import { documentServiceDB } from "@/lib/documents/document-service-db";
import type { DocumentType } from "@/lib/documents/document-service-db";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;
    const documentType = formData.get("documentType") as string as DocumentType;
    const metadataStr = formData.get("metadata") as string;

    if (!file || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields: file, documentType" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!documentServiceDB.validateFileType(file.type, documentType)) {
      return NextResponse.json(
        { error: `Invalid file type for ${documentType}` },
        { status: 400 },
      );
    }

    // Validate file size
    if (!documentServiceDB.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse metadata if provided (ignored by DB service — no metadata column)
    void metadataStr;

    // Upload document
    const document = await documentServiceDB.uploadDocument(
      userId,
      buffer,
      file.name,
      file.type,
      documentType,
    );

    return NextResponse.json({ document });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 },
    );
  }
});

// Generate presigned upload URL
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    // userId is the authenticated user — never trust a client-supplied id (IDOR).
    const userId = user.id;
    const fileName = searchParams.get("fileName");
    const mimeType = searchParams.get("mimeType");
    const documentType = searchParams.get("documentType") as string as DocumentType;

    if (!fileName || !mimeType || !documentType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const { uploadUrl, documentId, s3Key } =
      await documentServiceDB.generateUploadUrl(
        userId,
        fileName,
        mimeType,
        documentType,
      );

    return NextResponse.json({ uploadUrl, documentId, s3Key });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
});
