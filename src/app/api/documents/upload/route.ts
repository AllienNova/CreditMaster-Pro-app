import { NextRequest, NextResponse } from "next/server";
import { documentService } from "@/lib/documents/document-service";
import type { DocumentType } from "@/lib/documents/document-service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const documentType = formData.get("documentType") as string as DocumentType;
    const metadataStr = formData.get("metadata") as string;

    if (!file || !userId || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields: file, userId, documentType" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!documentService.validateFileType(file.type, documentType)) {
      return NextResponse.json(
        { error: `Invalid file type for ${documentType}` },
        { status: 400 },
      );
    }

    // Validate file size
    if (!documentService.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse metadata if provided
    const metadata = metadataStr ? JSON.parse(metadataStr) : undefined;

    // Upload document
    const document = await documentService.uploadDocument(
      userId,
      buffer,
      file.name,
      file.type,
      documentType,
      metadata,
    );

    return NextResponse.json({ document });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 },
    );
  }
}

// Generate presigned upload URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const fileName = searchParams.get("fileName");
    const mimeType = searchParams.get("mimeType");
    const documentType = searchParams.get("documentType") as string as DocumentType;

    if (!userId || !fileName || !mimeType || !documentType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const { uploadUrl, documentId, s3Key } =
      await documentService.generateUploadUrl(
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
}
