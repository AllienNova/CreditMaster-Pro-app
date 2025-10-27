import { NextRequest, NextResponse } from 'next/server';
import { disputeService } from '@/lib/disputes/dispute-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const disputeId = searchParams.get('disputeId');
    const status = searchParams.get('status') as any;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    if (disputeId) {
      const dispute = disputeService.getDispute(disputeId);
      if (!dispute || dispute.userId !== userId) {
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
    const body = await request.json();
    const { 
      userId, 
      bureau, 
      itemType, 
      itemDescription, 
      reason, 
      letterContent,
      evidence 
    } = body;
    
    if (!userId || !bureau || !itemType || !itemDescription || !reason || !letterContent) {
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
    console.error('Update dispute error:', error);
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
    console.error('Delete dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dispute' },
      { status: 500 }
    );
  }
}

