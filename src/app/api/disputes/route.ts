import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { disputeService } from '@/lib/disputes/dispute-service';

export async function GET(request: NextRequest) {
  try {
    // Support both JWT auth (mobile) and query param (legacy web)
    const validation = await jwtValidation.validateFromHeaders(request);
    const { searchParams } = new URL(request.url);
    
    let userId: string;
    if (validation.valid && validation.user?.id) {
      userId = validation.user.id;
    } else {
      // Fallback to query param for legacy support
      const queryUserId = searchParams.get('userId');
      if (!queryUserId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = queryUserId;
    }
    
    const statusParam = searchParams.get('status');
    const bureau = searchParams.get('bureau');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Cast status to expected type - service will handle invalid values
    const disputes = disputeService.getUserDisputes(
      userId, 
      statusParam as Parameters<typeof disputeService.getUserDisputes>[1]
    );
    
    // Filter by bureau if specified
    const filteredDisputes = bureau 
      ? disputes.filter(d => d.bureau === bureau)
      : disputes;
    
    // Paginate
    const startIdx = (page - 1) * limit;
    const paginatedDisputes = filteredDisputes.slice(startIdx, startIdx + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        items: paginatedDisputes,
        total: filteredDisputes.length,
        page,
        limit,
        totalPages: Math.ceil(filteredDisputes.length / limit),
      },
    });
  } catch (error) {
    // Error handled - returning 500
    return NextResponse.json(
      { success: false, error: 'Failed to get disputes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Support both JWT auth (mobile) and body userId (legacy)
    const validation = await jwtValidation.validateFromHeaders(request);
    const body = await request.json();
    
    let userId: string;
    if (validation.valid && validation.user?.id) {
      userId = validation.user.id;
    } else if (body.userId) {
      userId = body.userId;
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { 
      bureau, 
      itemType, 
      itemDescription,
      creditorName,
      accountNumber,
      disputeReason,
      reason, 
      letterContent,
      documents,
      evidence 
    } = body;
    
    // Support both old and new field names
    const finalItemType = itemType || 'general';
    const finalDescription = itemDescription || creditorName || '';
    const finalReason = reason || disputeReason || '';
    const finalEvidence = evidence || documents || [];
    
    if (!bureau || !finalDescription || !finalReason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bureau, description, and reason are required' },
        { status: 400 }
      );
    }
    
    const dispute = disputeService.createDispute(
      userId,
      bureau,
      finalItemType,
      finalDescription,
      finalReason,
      letterContent || '',
      finalEvidence
    );
    
    return NextResponse.json({ success: true, data: dispute });
  } catch (error) {
    // Error handled - returning 500
    return NextResponse.json(
      { success: false, error: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { disputeId, action, status, outcome, note, evidenceUrl, description } = body;
    
    if (!disputeId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
    // Error handled - returning 500
    return NextResponse.json(
      { error: 'Failed to update dispute' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const disputeId = searchParams.get('disputeId');
    
    if (!disputeId) {
      return NextResponse.json(
        { error: 'Missing disputeId parameter' },
        { status: 400 }
      );
    }
    
    const success = disputeService.deleteDispute(disputeId);
    return NextResponse.json({ success });
  } catch (error) {
    // Error handled - returning 500
    return NextResponse.json(
      { error: 'Failed to delete dispute' },
      { status: 500 }
    );
  }
}

