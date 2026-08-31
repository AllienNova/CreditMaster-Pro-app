import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/documents/document-service';
import type { DocumentType } from '@/lib/documents/document-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

const DOCUMENT_TYPES: DocumentType[] = [
  'credit_report',
  'dispute_letter',
  'evidence',
  'identity_document',
  'proof_of_address',
  'income_verification',
  'other'
];

const isValidDocumentType = (value: string): value is DocumentType =>
  DOCUMENT_TYPES.includes(value as DocumentType);

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'documents:upload')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentTypeValue = formData.get('documentType');
    const metadataStr = formData.get('metadata') as string | null;

    if (!file || typeof documentTypeValue !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields: file, documentType' },
        { status: 400 }
      );
    }

    if (!isValidDocumentType(documentTypeValue)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }
    const documentType = documentTypeValue as DocumentType;

    // Validate file type
    if (!documentService.validateFileType(file.type, documentType)) {
      return NextResponse.json(
        { error: `Invalid file type for ${documentType}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (!documentService.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
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
      metadata
    );

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// Generate presigned upload URL
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'documents:upload')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const mimeType = searchParams.get('mimeType');
    const documentTypeParam = searchParams.get('documentType');

    if (!fileName || !mimeType || !documentTypeParam) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    if (!isValidDocumentType(documentTypeParam)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    const { uploadUrl, documentId, s3Key } = await documentService.generateUploadUrl(
      userId,
      fileName,
      mimeType,
      documentTypeParam as DocumentType
    );

    return NextResponse.json({ uploadUrl, documentId, s3Key });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

