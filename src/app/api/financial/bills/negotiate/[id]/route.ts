/**
 * Individual Bill Negotiation API
 *
 * GET /api/financial/bills/negotiate/[id] - Get a specific negotiation
 * PATCH /api/financial/bills/negotiate/[id] - Update a negotiation
 * POST /api/financial/bills/negotiate/[id]/attempt - Add an attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { billNegotiationService } from '@/lib/financial/bill-negotiation-service';
import type {
  NegotiationUpdateInput,
  NegotiationAttemptInput,
} from '@/lib/financial/types/bill-negotiation.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = validation.user.id;

    const negotiation = await billNegotiationService.getNegotiation(id, userId);
    if (!negotiation) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    return NextResponse.json({ negotiation });
  } catch (error) {
    console.error('Negotiation GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get negotiation' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = validation.user.id;
    const body = await request.json();

    const input: NegotiationUpdateInput = {};
    if (body.status) input.status = body.status;
    if (body.outcome) input.outcome = body.outcome;
    if (body.actualSavings !== undefined) input.actualSavings = body.actualSavings;
    if (body.notes) input.notes = body.notes;
    if (body.targetAmount) input.targetAmount = body.targetAmount;

    const negotiation = await billNegotiationService.updateNegotiation(id, userId, input);

    return NextResponse.json({ negotiation });
  } catch (error) {
    console.error('Negotiation PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update negotiation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = validation.user.id;
    const body = await request.json();

    // Validate required fields for attempt
    if (!body.method || !body.outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: method, outcome' },
        { status: 400 }
      );
    }

    const attemptInput: NegotiationAttemptInput = {
      method: body.method,
      contactName: body.contactName,
      outcome: body.outcome,
      offeredAmount: body.offeredAmount,
      notes: body.notes,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
    };

    const negotiation = await billNegotiationService.addAttempt(id, userId, attemptInput);

    return NextResponse.json({ negotiation });
  } catch (error) {
    console.error('Negotiation attempt POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add attempt' },
      { status: 500 }
    );
  }
}

