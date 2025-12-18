import { NextRequest, NextResponse } from 'next/server';
import { plaidService } from '@/lib/financial/plaid-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:link_accounts')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const linkToken = await plaidService.createLinkToken(userId);

    return NextResponse.json({
      success: true,
      data: linkToken,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}

