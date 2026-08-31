import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/documents/document-service';
import type { DocumentType } from '@/lib/documents/document-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'documents:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const typeParam = searchParams.get('type');
    const validDocumentTypes: DocumentType[] = [
      'credit_report',
      'dispute_letter',
      'evidence',
      'identity_document',
      'proof_of_address',
      'income_verification',
      'other'
    ];
    let documentType: DocumentType | undefined;
    if (typeParam) {
      if (!validDocumentTypes.includes(typeParam as DocumentType)) {
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
      }
      documentType = typeParam as DocumentType;
    }

    if (documentId) {
      const document = await documentService.getDocument(documentId);

      // Verify resource ownership
      if (!document || !rbac.canAccessResource(validation.user, document.userId)) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ document });
    }

    const documents = documentService.getUserDocuments(userId, documentType);
    const stats = documentService.getDocumentStats(userId);

    return NextResponse.json({ documents, stats });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'documents:delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId parameter' },
        { status: 400 }
      );
    }

    // Verify resource ownership before delete
    const existingDocument = await documentService.getDocument(documentId);
    if (!existingDocument || !rbac.canAccessResource(validation.user, existingDocument.userId)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const success = await documentService.deleteDocument(documentId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { documentId, action, metadata, tags } = body;

    if (!documentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify resource ownership before update
    const existingDocument = await documentService.getDocument(documentId);
    if (!existingDocument || !rbac.canAccessResource(validation.user, existingDocument.userId)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let document;

    switch (action) {
      case 'update_metadata':
        if (!metadata) {
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }
        document = documentService.updateDocumentMetadata(documentId, metadata);
        break;
      case 'add_tags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: 'Missing or invalid tags' }, { status: 400 });
        }
        document = documentService.addTags(documentId, tags);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

