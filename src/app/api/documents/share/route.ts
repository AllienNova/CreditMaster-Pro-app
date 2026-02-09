import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/documents/document-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { notificationService } from '@/lib/notifications/notification-service';
import auditLogger from '@/lib/security/audit-logging';

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const document = await documentService.getDocument(documentId);
    if (!document || document.userId !== validation.user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const links = documentService.listShareLinks(documentId, validation.user.id);
    return NextResponse.json({ links });
  } catch (_error) {
    // DocumentShareRoute error: Failed to list share links
    void _error;
    return NextResponse.json({ error: 'Failed to list share links' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!rbac.hasPermission(validation.user, 'documents:share')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { documentId, recipients, permissions, expiresInHours } = await request.json();
    if (!documentId || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'documentId and at least one recipient are required' },
        { status: 400 }
      );
    }

    const document = await documentService.getDocument(documentId);
    if (!document || document.userId !== validation.user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const normalizedRecipients = recipients
      .map((email: string) => email.toLowerCase().trim())
      .filter(Boolean);

    const link = documentService.createShareLink(
      documentId,
      validation.user.id,
      normalizedRecipients,
      permissions === 'download' ? 'download' : 'view',
      expiresInHours && Number.isFinite(expiresInHours) ? Math.max(1, Math.min(168, expiresInHours)) : 24
    );

    const ownerEmail = (validation.user as { email?: string }).email;
    await notificationService.notifyDocumentShareLink({
      ownerUserId: validation.user.id,
      ownerEmail,
      documentName: document.originalName,
      recipients: normalizedRecipients,
      shareUrl: link.url,
      expiresAt: link.expiresAt,
    });

    await auditLogger.logAPIRequest('POST', '/api/documents/share', validation.user.id, 200);

    return NextResponse.json({ link });
  } catch (_error) {
    // DocumentShareRoute error: Failed to create share link
    const message = _error instanceof Error ? _error.message : 'Failed to create share link';
    const status = message === 'Document not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
    }

    const revoked = documentService.revokeShareLink(shareId, validation.user.id);
    if (!revoked) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    await auditLogger.logAPIRequest('DELETE', '/api/documents/share', validation.user.id, 200);
    return NextResponse.json({ success: true });
  } catch (_error) {
    // DocumentShareRoute error: Failed to revoke share link
    void _error;
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
