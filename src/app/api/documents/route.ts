import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/documents/document-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const documentId = searchParams.get('documentId');
    const type = searchParams.get('type') as any;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    if (documentId) {
      const document = await documentService.getDocument(documentId);
      if (!document || document.userId !== userId) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ document });
    }
    
    const documents = documentService.getUserDocuments(userId, type);
    const stats = documentService.getDocumentStats(userId);
    
    return NextResponse.json({ documents, stats });
  } catch (_error) {
    // DocumentsRoute error: Failed to get documents
    void _error;
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId parameter' },
        { status: 400 }
      );
    }
    
    const success = await documentService.deleteDocument(documentId);
    return NextResponse.json({ success });
  } catch (_error) {
    // DocumentsRoute error: Failed to delete document
    void _error;
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, action, metadata, tags } = body;
    
    if (!documentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
  } catch (_error) {
    // DocumentsRoute error: Failed to update document
    void _error;
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

