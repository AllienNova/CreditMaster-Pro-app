import { NextRequest, NextResponse } from 'next/server';
import { disputeService, DisputeStatus } from '@/lib/disputes/dispute-service';
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
    if (!rbac.hasPermission(validation.user, 'disputes:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const { searchParams } = new URL(request.url);
    const disputeId = searchParams.get('disputeId');
    const statusParam = searchParams.get('status');
    const allowedStatuses: DisputeStatus[] = [
      'draft',
      'sent',
      'under_review',
      'resolved',
      'rejected',
      'escalated',
    ];
    const status = statusParam && allowedStatuses.includes(statusParam as DisputeStatus)
      ? (statusParam as DisputeStatus)
      : undefined;

    if (disputeId) {
      const dispute = disputeService.getDispute(disputeId);

      // Verify resource ownership
      if (!dispute || !rbac.canAccessResource(validation.user, dispute.userId)) {
        return NextResponse.json(
          { error: 'Dispute not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ dispute });
    }

    const disputes = disputeService.getUserDisputes(userId, status);
    const stats = disputeService.getUserDisputeStats(userId);

    return NextResponse.json({ disputes, stats });
  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { error: 'Failed to get disputes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'disputes:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const body = await request.json();
    const {
      bureau,
      itemType,
      itemDescription,
      reason,
      letterContent,
      evidence
    } = body;

    if (!bureau || !itemType || !itemDescription || !reason || !letterContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const dispute = disputeService.createDispute(
      userId,
      bureau,
      itemType,
      itemDescription,
      reason,
      letterContent,
      evidence
    );

    return NextResponse.json({ dispute });
  } catch (error) {
    console.error('Create dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to create dispute' },
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
    if (!rbac.hasPermission(validation.user, 'disputes:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { disputeId, action, status, outcome, note, evidenceUrl, description } = body;

    if (!disputeId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify resource ownership before update
    const existingDispute = disputeService.getDispute(disputeId);
    if (!existingDispute || !rbac.canAccessResource(validation.user, existingDispute.userId)) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    let dispute;

    switch (action) {
      case 'send':
        dispute = disputeService.sendDispute(disputeId);
        break;
      case 'update_status':
        if (!status) {
          return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        }
        dispute = disputeService.updateDisputeStatus(disputeId, status, description);
        break;
      case 'resolve':
        if (!outcome) {
          return NextResponse.json({ error: 'Missing outcome' }, { status: 400 });
        }
        dispute = disputeService.resolveDispute(disputeId, outcome, note);
        break;
      case 'add_note':
        if (!note) {
          return NextResponse.json({ error: 'Missing note' }, { status: 400 });
        }
        dispute = disputeService.addNote(disputeId, note);
        break;
      case 'add_evidence':
        if (!evidenceUrl) {
          return NextResponse.json({ error: 'Missing evidenceUrl' }, { status: 400 });
        }
        dispute = disputeService.addEvidence(disputeId, evidenceUrl);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    return NextResponse.json({ dispute });
  } catch (error) {
    console.error('Update dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to update dispute' },
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

    // Check permissions (delete requires premium role)
    if (!rbac.hasPermission(validation.user, 'disputes:delete')) {
      return NextResponse.json({ error: 'Forbidden - Premium subscription required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const disputeId = searchParams.get('disputeId');

    if (!disputeId) {
      return NextResponse.json(
        { error: 'Missing disputeId parameter' },
        { status: 400 }
      );
    }

    // Verify resource ownership before delete
    const existingDispute = disputeService.getDispute(disputeId);
    if (!existingDispute || !rbac.canAccessResource(validation.user, existingDispute.userId)) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const success = disputeService.deleteDispute(disputeId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Delete dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dispute' },
      { status: 500 }
    );
  }
}

